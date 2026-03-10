# Codex CLI ヘッドレス（TUIなし）利用ガイド

> 調査時点のバージョン: codex-cli 0.111.0 (2026-03-06)

## 概要

Codex CLI はTUI（対話的UI）を起動せずに、以下のサブコマンドで非インタラクティブに利用できる。

| サブコマンド | 用途 | 対話継続 |
|---|---|---|
| `codex exec` | 汎用の非インタラクティブ実行 | `exec resume` で可能 |
| `codex exec review` | exec内のコードレビュー（`codex review`と同等だが `--json`, `-o` が使える） | 不可 |
| `codex review` | コードレビュー専用（簡易版） | 不可 |

---

## 1. `codex exec` — 非インタラクティブ実行

### 基本構文

```bash
codex exec [OPTIONS] [PROMPT]
```

プロンプトは引数として渡すか、`-`を指定して stdin から読み取る。

```bash
# 引数で渡す
codex exec "このコードの問題点を指摘してください"

# stdinで渡す
echo "設計について相談したい" | codex exec -

# ヒアドキュメントで複数行プロンプト
codex exec - <<'EOF'
以下のコードをレビューしてください。
セキュリティとパフォーマンスの観点で。
EOF
```

### 主要オプション

| オプション | 説明 |
|---|---|
| `--json` | イベントをJSONL形式でstdoutに出力（後述） |
| `-o, --output-last-message <FILE>` | エージェントの最終メッセージをファイルに書き出す |
| `--output-schema <FILE>` | JSON Schemaファイルを指定し、レスポンスの形状を制約する |
| `-m, --model <MODEL>` | 使用するモデルを指定 |
| `-s, --sandbox <MODE>` | `read-only` / `workspace-write` / `danger-full-access` |
| `--full-auto` | `-a on-request --sandbox workspace-write` のエイリアス |
| `-C, --cd <DIR>` | 作業ディレクトリを指定 |
| `--add-dir <DIR>` | 追加の書き込み可能ディレクトリ |
| `--ephemeral` | セッションファイルをディスクに保存しない |
| `--skip-git-repo-check` | Gitリポジトリ外でも実行を許可 |
| `-i, --image <FILE>...` | 画像ファイルを添付 |
| `-c, --config <key=value>` | config.toml の値をオーバーライド |
| `--color <COLOR>` | `always` / `never` / `auto`（デフォルト: `auto`） |

### 出力の取得方法

#### 方法1: `-o` で最終メッセージをファイルに保存

```bash
codex exec -o /tmp/result.txt "このコードの改善点は？"
cat /tmp/result.txt
```

出力はプレーンテキスト（Markdown形式のエージェント応答がそのまま書き出される）。

#### 方法2: `--json` でJSONLイベントストリームを取得

```bash
codex exec --json "hello"
```

パースしやすく、プログラムからの利用に最適。詳細は「JSONLイベント形式」セクションを参照。

#### 方法3: 標準出力をそのままキャプチャ

```bash
result=$(codex exec "hello" 2>/dev/null)
```

`--json`なしの場合、プレーンテキストがstdoutに出力される。stderrにはプログレス等が出る場合があるので `2>/dev/null` で抑制する。

---

## 2. `codex exec resume` — セッションを継続して対話

**対話（マルチターン）を実現する唯一の方法。**

### 基本構文

```bash
codex exec resume [OPTIONS] [SESSION_ID] [PROMPT]
```

### 対話フロー

```bash
# ステップ1: 初回の質問（--jsonでthread_idを取得）
codex exec --json "この設計パターンについてどう思いますか？" 2>/dev/null

# → 出力の最初の行からthread_idを取得:
# {"type":"thread.started","thread_id":"019cc2cd-ed2b-7810-b689-90621821e40c"}

# ステップ2: セッションを継続（直前のセッション）
codex exec resume --last "その点についてもう少し詳しく教えて"

# ステップ2': セッションIDを指定して継続
codex exec resume "019cc2cd-ed2b-7810-b689-90621821e40c" "別の観点から意見をください"
```

### resumeのオプション

`-s` (sandbox) は受け付けない。サンドボックス設定は初回 `codex exec` 時の指定が引き継がれる。

| オプション | 説明 |
|---|---|
| `--last` | 直近のセッションを自動選択（SESSION_ID不要） |
| `--all` | CWDフィルタリングを無効化して全セッションを表示 |
| `--json` | JSONL形式で出力 |
| `-o, --output-last-message <FILE>` | 最終メッセージをファイルに出力 |
| `-m, --model <MODEL>` | モデルを指定 |
| `--ephemeral` | セッションを保存しない |
| `-i, --image <FILE>` | 画像を添付 |

### セッション管理の注意点

- セッションはデフォルトでCWD（カレントディレクトリ）ごとにフィルタリングされる
- `--last` は現在のCWDで直近のセッションを選択する
- `--all` を付けると全CWDのセッションが対象になる
- `--ephemeral` を使うとセッションが保存されないため、resumeできなくなる

---

## 3. `codex review` / `codex exec review` — コードレビュー

### `codex review`（トップレベル）

簡易版。結果はstdoutに直接出力される。

```bash
# uncommitedな変更をレビュー
codex review --uncommitted

# ブランチ差分をレビュー
codex review --base main

# 特定コミットをレビュー
codex review --commit abc1234

# タイトル付き（レビューサマリーに表示）
codex review --uncommitted --title "認証機能の追加"
```

### `codex exec review`（exec経由）

`codex review` と同じ機能に加えて、`--json` と `-o` が使える。

```bash
# JSONL出力
codex exec review --json --uncommitted

# ファイルに結果を保存
codex exec review -o /tmp/review.txt --base main
```

### reviewの制約

**`--uncommitted`, `--base`, `--commit` はプロンプト引数と同時に使えない。**

```bash
# NG: エラーになる
codex exec review --uncommitted "セキュリティの観点で"

# OK: プロンプトなしで使う
codex exec review --uncommitted
```

レビュー観点を指定したい場合は `codex exec` を使い、プロンプト内で指示する：

```bash
codex exec -s read-only -o /tmp/review.txt "uncommitedな変更をセキュリティの観点でレビューしてください" 2>/dev/null
```

### reviewのオプション

| オプション | 説明 |
|---|---|
| `--uncommitted` | ステージ済み・未ステージ・未追跡の変更をレビュー |
| `--base <BRANCH>` | 指定ブランチとの差分をレビュー |
| `--commit <SHA>` | 特定コミットの変更をレビュー |
| `--title <TITLE>` | レビューサマリーに表示するタイトル |
| `-m, --model <MODEL>` | モデルを指定 |

---

## 4. JSONLイベント形式

`--json` を指定した場合、stdoutにJSONL（1行1JSON）で以下のイベントが出力される。

### イベント一覧

#### `thread.started` — セッション開始

```json
{"type":"thread.started","thread_id":"019cc2cd-ed2b-7810-b689-90621821e40c"}
```

- `thread_id`: セッションの一意識別子（UUID）。`exec resume` でこのIDを使って継続できる

#### `turn.started` — ターン開始

```json
{"type":"turn.started"}
```

#### `item.completed` (agent_message) — エージェントのテキスト応答

```json
{"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"応答テキスト"}}
```

- `item.id`: ターン内での連番（`item_0`, `item_1`, ...）
- `item.text`: エージェントの応答本文

#### `item.started` (command_execution) — コマンド実行開始

```json
{
  "type": "item.started",
  "item": {
    "id": "item_1",
    "type": "command_execution",
    "command": "/bin/zsh -lc 'ls | head -n 3'",
    "aggregated_output": "",
    "exit_code": null,
    "status": "in_progress"
  }
}
```

#### `item.completed` (command_execution) — コマンド実行完了

```json
{
  "type": "item.completed",
  "item": {
    "id": "item_1",
    "type": "command_execution",
    "command": "/bin/zsh -lc 'ls | head -n 3'",
    "aggregated_output": "file1\nfile2\nfile3\n",
    "exit_code": 0,
    "status": "completed"
  }
}
```

- `exit_code`: コマンドの終了コード（0=成功）
- `aggregated_output`: コマンドの出力全体

#### `turn.completed` — ターン完了

```json
{
  "type": "turn.completed",
  "usage": {
    "input_tokens": 15418,
    "cached_input_tokens": 14336,
    "output_tokens": 137
  }
}
```

- `usage`: トークン使用量。コスト管理に有用

### 典型的なイベントシーケンス

```
thread.started          ← セッションID取得
turn.started            ← ターン開始
item.completed          ← エージェントのメッセージ（0回以上）
item.started            ← コマンド実行開始（0回以上）
item.completed          ← コマンド実行完了
item.completed          ← エージェントの最終メッセージ
turn.completed          ← ターン完了（トークン使用量）
```

---

## 5. スキル設計向けリファレンス

### JSONL解析の注意: ファイル経由で行うこと

JSONL内のテキストフィールドに改行文字を含む場合がある。変数に格納して `echo "$output" | jq` とするとjqのパースエラーが発生するため、**必ずファイルに出力してからjqで解析する**。

```bash
# ファイルに出力
codex exec --json "質問" 2>/dev/null > /tmp/codex-output.jsonl

# thread_id取得
head -1 /tmp/codex-output.jsonl | jq -r '.thread_id'

# 最後のagent_messageを取得
jq -r 'select(.type == "item.completed" and .item.type == "agent_message") | .item.text' /tmp/codex-output.jsonl | tail -1

# トークン使用量の取得
jq -r 'select(.type == "turn.completed") | .usage' /tmp/codex-output.jsonl
```

### エラーハンドリング

#### 終了コード

`codex exec` は正常完了時に終了コード `0` を返す。異常時は非ゼロ。

```bash
codex exec "質問" 2>/dev/null
if [ $? -ne 0 ]; then
  echo "Codex exec failed"
fi
```

#### stderrの扱い

プログレス表示やログはstderrに出力されるため、プログラム的に利用する場合は `2>/dev/null` または `2>error.log` でリダイレクトする。

```bash
codex exec --json "質問" 2>/tmp/codex-error.log
if [ $? -ne 0 ]; then
  cat /tmp/codex-error.log
fi
```

#### タイムアウト対策

`codex exec` にはビルトインのタイムアウト機構がないため、`timeout` コマンドで制御する。

```bash
timeout 120 codex exec --json "質問" 2>/dev/null
if [ $? -eq 124 ]; then
  echo "Codex timed out"
fi
```

#### セッション継続時の注意

- `--last` でセッションが見つからない場合（初回実行時など）、新規セッションが作成される
  - 実測では存在しないSESSION_IDを指定しても新規セッションとして成功した（エラーにならない）
  - そのため、セッションの有無は `thread_id` の一致で確認する必要がある
- `--ephemeral` を使った場合はセッションが保存されないため `resume` できない

### 対話フローの実装パターン

```bash
#!/bin/bash
set -euo pipefail

SESSION_FILE="/tmp/codex-session-id"
OUTPUT_FILE="/tmp/codex-output.jsonl"

# 初回メッセージを送信し、thread_idとレスポンスを取得
# -s read-only は初回のみ指定。resumeには引き継がれる
send_initial() {
  local prompt="$1"
  codex exec --json -s read-only "$prompt" 2>/dev/null > "$OUTPUT_FILE"

  # thread_idを保存
  head -1 "$OUTPUT_FILE" | jq -r '.thread_id' > "$SESSION_FILE"

  # レスポンスを表示
  jq -r 'select(.type == "item.completed" and .item.type == "agent_message") | .item.text' "$OUTPUT_FILE"
}

# 続きのメッセージを送信
# codex exec resume は -s オプションを受け付けない
send_followup() {
  local prompt="$1"
  local thread_id
  thread_id=$(cat "$SESSION_FILE")
  codex exec resume --json "$thread_id" "$prompt" 2>/dev/null > "$OUTPUT_FILE"

  jq -r 'select(.type == "item.completed" and .item.type == "agent_message") | .item.text' "$OUTPUT_FILE"
}

# 使用例
send_initial "この設計パターンについてレビューしてください"
send_followup "もう少し具体的な改善案を教えてください"
send_followup "パフォーマンスへの影響はどうですか？"

# クリーンアップ
rm -f "$SESSION_FILE"
```

### サンドボックスモードの選択指針

| モード | 用途 |
|---|---|
| `read-only` | レビュー・設計相談（コード変更なし） |
| `workspace-write` | コード修正・ファイル生成を伴うタスク |
| `danger-full-access` | 原則使用しない |

レビューや設計相談のスキルでは `read-only` を推奨。

### config オーバーライドの例

```bash
# モデル指定
codex exec -m o3 "質問"

# config.tomlの値をオーバーライド
codex exec -c model="o3" -c 'sandbox_permissions=["disk-full-read-access"]' "質問"

# プロファイル指定（config.tomlで定義したプロファイル）
codex exec -p review "質問"
```

---

## 6. `codex review` vs `codex exec review` 比較

| 機能 | `codex review` | `codex exec review` |
|---|---|---|
| `--uncommitted` | o | o |
| `--base <BRANCH>` | o | o |
| `--commit <SHA>` | o | o |
| `--title <TITLE>` | o | o |
| `--json` | x | o |
| `-o` (出力ファイル) | x | o |
| `-m` (モデル指定) | x | o |
| `--full-auto` | x | o |
| `--ephemeral` | x | o |

スキルから利用する場合は `codex exec review` を使うことで、JSON出力やファイル出力が活用できる。

---

## 7. その他のサブコマンド（参考）

| コマンド | 説明 |
|---|---|
| `codex resume [SESSION_ID]` | **TUI版**のセッション再開（TUIが起動する） |
| `codex fork [SESSION_ID]` | セッションをフォーク（TUIが起動する） |
| `codex mcp-server` | Codex自体をMCPサーバーとして起動（stdio） |

`codex resume`（トップレベル）はTUIを起動するため、ヘッドレス利用には `codex exec resume` を使う。
