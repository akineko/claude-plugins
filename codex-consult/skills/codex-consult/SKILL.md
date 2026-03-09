---
name: codex-consult
description: |
  Codex CLIをヘッドレス（TUIなし）で実行し、レビューや設計相談を行う。
  ユーザーが「codexに」「codexと」「codexで」など、codexを明示的に指定してレビュー・設計相談・議論を依頼した場合にのみ使用する。
  単に「レビューして」「設計して」とだけ言われた場合は使用しない — codexへの言及が必要。
  対話なしの単発依頼と、対話ありのマルチターン相談の両方に対応する。
  Claude Code自身がcodexと自律的に議論して結論を持ち帰るパターンにも対応する。
---

# Codex Consult

Codex CLIを `codex exec` でヘッドレス実行し、レビューや設計相談を行うためのナレッジスキル。
すべてのcodex操作は `scripts/` 配下のシェルスクリプト経由で実行する。
詳細なCLIリファレンスは `references/cli-reference.md` を参照。

## スクリプト一覧

| スクリプト | 用途 |
|---|---|
| `scripts/init.sh` | 作業ディレクトリ作成（パスをstdoutに出力） |
| `scripts/exec.sh` | codex exec 実行（対話なし） |
| `scripts/review.sh` | codex exec review 実行 |
| `scripts/session-start.sh` | 対話ありセッション開始 |
| `scripts/session-resume.sh` | 対話ありセッション継続 |

## 基本ワークフロー

すべてのパターンで共通する手順：

1. **作業ディレクトリを初期化**する
```bash
<skill-dir>/scripts/init.sh
```
出力されたパス（例: `.claude/tmp/codex-AbCdEf`）を以降の `<work_dir>` として使う。

2. **プロンプトをファイルに書き出す** — Write ツールで `<work_dir>/prompt.txt` にプロンプトを書き出す。

3. **適切なスクリプトを実行**する（パターンごとに後述）。

プロンプトをファイル経由で渡すことで、複数行やコメント記号を含むプロンプトでも問題なく実行できる。

## パターン判定

ユーザーの依頼を以下のパターンに分類して対応する。

| パターン | 判定基準 | 使うスクリプト |
|---|---|---|
| レビュー | 「codexにレビューして」などレビュー依頼 | `review.sh` または `exec.sh` |
| 設計相談 | 「codexに設計を聞いて」など設計依頼 | `exec.sh` |
| 自律相談 | 「codexと相談して詰めて」「codexと議論して合意案を作って」 | `session-start.sh` → `session-resume.sh`（複数ターン） |

### 対話形式の確認

自律相談以外（レビュー・設計相談）では、実行前に必ず AskUserQuestion ツールでユーザーに対話形式で進めるかどうかを確認する。
ユーザーが明示的に「対話なしで」「結果だけ教えて」と言わない限り確認を省略しない。

- **対話なし** → パターン1/2の手順で実行
- **対話あり** → パターン3の手順で実行

## パターン1: 対話なしレビュー

### `codex exec review` を使う場合（レビュー観点の指定なし）

```bash
# uncommitedな変更
<skill-dir>/scripts/review.sh <work_dir> --uncommitted

# ブランチ差分
<skill-dir>/scripts/review.sh <work_dir> --base main

# 特定コミット
<skill-dir>/scripts/review.sh <work_dir> --commit <SHA>
```

**制約**: `codex exec review` の `--uncommitted`, `--base`, `--commit` はプロンプト引数と同時に使えない。

### レビュー観点やファイル指定がある場合

レビュー観点の指定や特定ファイル/ディレクトリのレビューには `exec.sh` を使う：

1. Write ツールで `<work_dir>/prompt.txt` にプロンプトを書き出す
   例: `以下のファイルをセキュリティの観点でレビューしてください: src/auth.ts`
2. スクリプトを実行する
```bash
<skill-dir>/scripts/exec.sh <work_dir> <work_dir>/prompt.txt -s read-only
```

ユーザーがレビュー対象を明示していない場合は確認する。対象の指定方法：
- ファイルやディレクトリ → `exec.sh` を使い、プロンプトでパスを指定
- uncommitedな変更 → `review.sh --uncommitted`
- ブランチ差分 → `review.sh --base <BRANCH>`
- 特定コミット → `review.sh --commit <SHA>`

結果はスクリプトのstdoutに出力されるので、そのままユーザーに表示する。

## パターン2: 対話なし設計相談

1. Write ツールで `<work_dir>/prompt.txt` にプロンプトを書き出す
2. スクリプトを実行する
```bash
<skill-dir>/scripts/exec.sh <work_dir> <work_dir>/prompt.txt -s read-only
```

コードベースの文脈が必要な場合は、プロンプトに関連ファイルパスや背景情報を含める。

## パターン3: 対話ありレビュー/設計相談

ユーザーがcodexの応答に返答したい場合に使う。

### 手順

1. **初回メッセージの送信**

Write ツールで `<work_dir>/prompt.txt` にプロンプトを書き出してからスクリプトを実行する。

```bash
<skill-dir>/scripts/session-start.sh <work_dir> <work_dir>/prompt.txt -s read-only
```

出力の1行目が `thread_id`、2行目以降がcodexの応答テキスト。
`thread_id` は `<work_dir>/thread_id` にも保存される。

2. **応答をユーザーに表示**し、ユーザーの返答を受け取る

3. **セッション継続**

Write ツールで `<work_dir>/prompt.txt` にユーザーの返答を書き出してからスクリプトを実行する。

```bash
<skill-dir>/scripts/session-resume.sh <work_dir> <work_dir>/prompt.txt
```

`thread_id` は `<work_dir>/thread_id` から自動で読み込まれる。

4. 2-3を繰り返す。ユーザーが満足したら終了。

## パターン4: 自律相談

Claude Codeがcodexと複数ターン議論し、合意した結論をユーザーに報告する。

### 手順

1. ユーザーの依頼内容を整理し、codexへの初回プロンプトを組み立てる
2. パターン3と同じ要領で `session-start.sh` → `session-resume.sh` を繰り返す
3. 各ターンでcodexの応答を読み、自分（Claude Code）の見解や疑問点を返答として送る
4. 合意に達したら、議論の結論をまとめてユーザーに報告する

自律相談ではターン数が増えるとトークンコストが膨らむ。3-5ターン程度を目安とし、収束しなければユーザーに中間報告して方針を確認する。

## スクリプトの共通オプション

| オプション | 対応スクリプト | 説明 |
|---|---|---|
| `-s <sandbox>` | exec.sh, session-start.sh | サンドボックスモード（レビュー・設計では `read-only` を指定） |
| `-m <model>` | exec.sh, review.sh, session-start.sh, session-resume.sh | モデル指定（ユーザーが指定した場合のみ） |
| `-C <dir>` | exec.sh, session-start.sh | 作業ディレクトリ指定 |

## エラーハンドリング

- 各スクリプトは失敗時にstderrにエラーメッセージを出力する
- `session-resume.sh` は `turn.completed` イベントの有無で成否を判定する（`codex exec resume` は正常応答でも exit code 1 を返すことがある）
- 失敗時はエラーメッセージをユーザーに伝えて対処を相談する

CLIの詳細オプションやJSONLイベント形式については `references/cli-reference.md` を参照。
