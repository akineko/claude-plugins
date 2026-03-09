# Codex CLI ヘッドレス リファレンス

## コマンド一覧

| コマンド | 用途 | 対話継続 |
|---|---|---|
| `codex exec [PROMPT]` | 汎用の非インタラクティブ実行 | `exec resume` で可能 |
| `codex exec review [PROMPT]` | コードレビュー（`--json`, `-o` 対応） | 不可 |
| `codex exec resume [SESSION_ID] [PROMPT]` | セッション継続（マルチターン） | — |

## `codex exec` オプション

| オプション | 説明 |
|---|---|
| `--json` | JSONL形式でstdoutに出力 |
| `-o, --output-last-message <FILE>` | 最終メッセージをファイルに書き出す |
| `--output-schema <FILE>` | JSON Schemaでレスポンス形状を制約 |
| `-m, --model <MODEL>` | モデル指定 |
| `-s, --sandbox <MODE>` | `read-only` / `workspace-write` / `danger-full-access` |
| `--full-auto` | `-a on-request --sandbox workspace-write` のエイリアス |
| `-C, --cd <DIR>` | 作業ディレクトリ指定 |
| `--add-dir <DIR>` | 追加の書き込み可能ディレクトリ |
| `--ephemeral` | セッションをディスクに保存しない（resumeできなくなる） |
| `--skip-git-repo-check` | Gitリポジトリ外でも実行を許可 |
| `-i, --image <FILE>...` | 画像ファイルを添付 |
| `-c, --config <key=value>` | config.toml の値をオーバーライド |
| `-p, --profile <PROFILE>` | 設定プロファイル指定 |
| `--color <COLOR>` | `always` / `never` / `auto` |

## `codex exec resume` オプション

`-s` (sandbox) は受け付けない。サンドボックス設定は初回 `codex exec` 時の指定が引き継がれる。

| オプション | 説明 |
|---|---|
| `--last` | 直近のセッションを自動選択 |
| `--all` | CWDフィルタリングを無効化 |
| `--json` | JSONL形式で出力 |
| `-o, --output-last-message <FILE>` | 最終メッセージをファイルに出力 |
| `-m, --model <MODEL>` | モデル指定 |
| `--ephemeral` | セッションを保存しない |
| `-i, --image <FILE>` | 画像を添付 |

## `codex exec review` オプション

| オプション | 説明 |
|---|---|
| `--uncommitted` | ステージ済み・未ステージ・未追跡の変更をレビュー |
| `--base <BRANCH>` | 指定ブランチとの差分をレビュー |
| `--commit <SHA>` | 特定コミットの変更をレビュー |
| `--title <TITLE>` | レビューサマリーに表示するタイトル |
| `-m, --model <MODEL>` | モデル指定 |
| `--json` | JSONL形式で出力 |
| `-o, --output-last-message <FILE>` | 最終メッセージをファイルに出力 |
| `--ephemeral` | セッションを保存しない |

## プロンプトの渡し方

```bash
# 引数
codex exec "質問内容"

# stdin
echo "質問内容" | codex exec -

# ヒアドキュメント
codex exec - <<'EOF'
複数行の
質問内容
EOF
```

## JSONLイベント形式

`--json` 指定時、stdoutに1行1JSONで出力される。

### イベントシーケンス

```
thread.started     → セッションID取得
turn.started       → ターン開始
item.completed     → エージェントのメッセージ（0回以上）
item.started       → コマンド実行開始（0回以上）
item.completed     → コマンド実行完了
item.completed     → エージェントの最終メッセージ
turn.completed     → ターン完了（トークン使用量）
```

### 各イベントの構造

**thread.started**
```json
{"type":"thread.started","thread_id":"019cc2cd-ed2b-7810-b689-90621821e40c"}
```

**item.completed (agent_message)**
```json
{"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"応答テキスト"}}
```

**item.started (command_execution)**
```json
{"type":"item.started","item":{"id":"item_1","type":"command_execution","command":"/bin/zsh -lc 'ls'","aggregated_output":"","exit_code":null,"status":"in_progress"}}
```

**item.completed (command_execution)**
```json
{"type":"item.completed","item":{"id":"item_1","type":"command_execution","command":"/bin/zsh -lc 'ls'","aggregated_output":"file1\nfile2\n","exit_code":0,"status":"completed"}}
```

**turn.completed**
```json
{"type":"turn.completed","usage":{"input_tokens":15418,"cached_input_tokens":14336,"output_tokens":137}}
```

### jq での解析例

JSONL内のテキストに改行を含む場合があるため、変数経由（`echo "$output" | jq`）ではパースエラーが起きる。必ずファイル経由で解析する。

```bash
# ファイルに出力
codex exec --json "質問" 2>/dev/null > /tmp/codex-output.jsonl

# thread_id取得
head -1 /tmp/codex-output.jsonl | jq -r '.thread_id'

# 最終agent_message取得
jq -r 'select(.type == "item.completed" and .item.type == "agent_message") | .item.text' /tmp/codex-output.jsonl | tail -1

# トークン使用量
jq -r 'select(.type == "turn.completed") | .usage' /tmp/codex-output.jsonl
```

## エラーハンドリング

| 状況 | 対処 |
|---|---|
| 終了コード非ゼロ | コマンド失敗。stderr（`2>/tmp/codex-error.log`）を確認 |
| タイムアウト | `timeout 120 codex exec ...` を使用。終了コード124=タイムアウト |
| 存在しないthread_id | エラーにならず新規セッションが作成される。thread_idの一貫性は自分で管理 |
| `--ephemeral` 使用後 | セッションが保存されないため `resume` できない |

## 注意事項

- `codex resume`（トップレベル）はTUIを起動する。ヘッドレスでは必ず `codex exec resume` を使う
- `codex exec review` の `--uncommitted`, `--base`, `--commit` はプロンプト引数と同時に使えない
- `codex exec resume` は `-s` (sandbox) オプションを受け付けない。初回セッションの設定が引き継がれる
- セッションはCWDごとにフィルタリングされる。`--last` は現在のCWDの直近セッションを選択する
- stderrにプログレス等が出るため、プログラム的利用時は `2>/dev/null` で抑制する
- JSONL出力を解析する際は変数経由ではなくファイル経由で行う（改行文字によるjqパースエラー回避）
