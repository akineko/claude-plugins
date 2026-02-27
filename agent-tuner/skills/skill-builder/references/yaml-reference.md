# YAMLフロントマター リファレンス

## フィールド一覧

| フィールド | 必須 | 説明 |
|-----------|------|------|
| `name` | 必須 | 表示名。省略時はディレクトリ名を使用するが、明示的に指定すること |
| `description` | 必須 | スキルの説明。Claudeが自動起動の判断に使用 |
| `argument-hint` | 任意 | オートコンプリート時に表示する引数ヒント |
| `disable-model-invocation` | 任意 | `true` でClaude自動起動を無効化。デフォルト: `false` |
| `user-invocable` | 任意 | `false` で `/` メニューから非表示。デフォルト: `true` |
| `allowed-tools` | 任意 | スキル実行中に確認なしで使えるツール |
| `model` | 任意 | スキル実行時のモデル指定 |
| `context` | 任意 | `fork` でサブエージェント実行 |
| `agent` | 任意 | `context: fork` 時のサブエージェントタイプ |
| `hooks` | 任意 | スキルのライフサイクルにスコープされたフック |
| `license` | 任意 | ライセンス |
| `compatibility` | 任意 | 環境要件（1〜500文字） |
| `metadata` | 任意 | カスタムのキー・バリューペア |

## 基本フィールド

### name（必須）

公式仕様上は任意（省略時はディレクトリ名を使用）だが、起動トリガーの明確化のため必ず指定する。

制約：
- 小文字・数値・ハイフンのみ（kebab-case）
- 最大64文字
- 「claude」「anthropic」を含めない（予約済み）

```yaml
# ✅ 正しい例
name: sprint-planner
name: data-processor
name: notion-project-setup

# ❌ 誤った例
name: My Cool Skill      # スペースと大文字
name: sprint_planner      # アンダースコア
name: SprintPlanner       # キャメルケース
name: claude-helper       # 「claude」を含む
```

### description（必須）

Claudeがスキルの自動起動を判断するために使用する。公式仕様上は推奨（省略時は本文の最初の段落を使用）だが、トリガー精度に直結するため必ず指定する。

以下の2つを必ず含める：
1. スキルが**何をするか**（WHAT）
2. **いつ使うか**（WHEN）— トリガー条件

制限事項：
- 1024文字以内
- XMLタグ（`<` `>`）— フロントマターはシステムプロンプトに表示されるため、インジェクションリスクがある
- ユーザーが実際に言いそうなフレーズを含める
- 関連するファイルタイプがあれば明記する

#### 良い例

```yaml
# ✅ 具体的かつ実行可能
description: Figmaデザインファイルを解析し、開発者向けハンドオフドキュメントを生成する。ユーザーが.figファイルをアップロードしたとき、「デザインスペック」「コンポーネントドキュメント」を求めたときに使用する。

# ✅ トリガーフレーズを含む
description: Linearプロジェクトのワークフロー管理。ユーザーが「スプリント」「Linearタスク」「チケットを作成」と言ったときに使用する。

# ✅ ネガティブトリガーを含む（オーバートリガー対策）
description: CSVファイルの高度なデータ分析。統計モデリング、回帰分析に使用する。単純なデータ探索には使用しない（data-vizスキルを代わりに使用）。
```

#### 悪い例

```yaml
# ❌ 曖昧すぎる
description: プロジェクトを手伝います。

# ❌ トリガーがない
description: 高度なマルチページドキュメントシステムを作成します。

# ❌ 技術的すぎてユーザートリガーがない
description: 階層的リレーションシップを持つProjectエンティティモデルを実装します。

# ❌ 範囲が広すぎる
description: ドキュメントを処理します。
```

### argument-hint（任意）

オートコンプリート時にユーザーに表示する引数のヒント。

```yaml
argument-hint: "[issue-number]"
argument-hint: "[filename] [format]"
```

## 起動制御フィールド

### disable-model-invocation（任意）

`true` でClaudeの自動起動を無効化し、ユーザーの `/name` 実行でのみ起動する。デフォルト: `false`。

副作用のあるワークフロー（デプロイ、コミット、メッセージ送信など）に使用する。

```yaml
disable-model-invocation: true
```

### user-invocable（任意）

`false` で `/` メニューから非表示にし、ユーザーが直接起動できなくなる。Claudeのみが自動起動可能。デフォルト: `true`。

ユーザーが直接起動しても意味のないバックグラウンド知識に使用する。

```yaml
user-invocable: false
```

### 起動制御の組み合わせ

| フロントマター | ユーザー起動 | Claude起動 | コンテキスト読み込み |
|---------------|-------------|------------|-------------------|
| （デフォルト） | ○ | ○ | descriptionが常時コンテキスト内、起動時にフル読込 |
| `disable-model-invocation: true` | ○ | ✗ | descriptionもコンテキスト外、ユーザー起動時にフル読込 |
| `user-invocable: false` | ✗ | ○ | descriptionが常時コンテキスト内、起動時にフル読込 |

## 実行環境フィールド

### allowed-tools（任意）

スキル実行中にClaudeが確認なしで使用できるツールを指定する。

```yaml
# 読み取り専用スキル
allowed-tools: Read, Grep, Glob

# 特定のBashコマンドのみ許可
allowed-tools: Bash(python *)
```

### model（任意）

スキル実行時に使用するモデルを指定する。

```yaml
model: sonnet
```

### context（任意）

`fork` に設定すると、スキルの内容がサブエージェントのプロンプトとして使用され、会話の文脈から分離して実行される。

```yaml
context: fork
```

注意：`context: fork` は明確なタスク指示を持つスキルでのみ意味がある。ガイドラインのみのスキルに設定すると、サブエージェントが指示なしで何もできなくなる。

### agent（任意）

`context: fork` 設定時に使用するサブエージェントタイプを指定する。省略時は `general-purpose`。

組み込みエージェント: `Explore`、`Plan`、`general-purpose`。カスタムエージェント: `.claude/agents/` 配下の任意のエージェント。

```yaml
context: fork
agent: Explore
```

### hooks（任意）

スキルのライフサイクルにスコープされたフックを定義する。設定形式はhooksの公式ドキュメントを参照。

## メタデータフィールド

### license（任意）

```yaml
license: MIT
license: Apache-2.0
```

### compatibility（任意）

環境要件を記述する（1〜500文字）。

```yaml
compatibility: Claude.ai、Claude Code対応。Python 3.10以上が必要。
```

### metadata（任意）

カスタムのキー・バリューペア。

```yaml
metadata:
  author: Company Name
  version: 1.0.0
  mcp-server: server-name
  category: productivity
  tags: [project-management, automation]
```

## 文字列置換

スキル本文内で使用できる動的変数。フロントマターではなくマークダウン本文内で使用する。

| 変数 | 説明 |
|-----|------|
| `$ARGUMENTS` | 起動時に渡された全引数。本文に `$ARGUMENTS` がない場合、末尾に `ARGUMENTS: <値>` として自動追加 |
| `$ARGUMENTS[N]` | 0始まりインデックスで特定の引数にアクセス。例: `$ARGUMENTS[0]` |
| `$N` | `$ARGUMENTS[N]` の短縮形。例: `$0`, `$1` |
| `${CLAUDE_SESSION_ID}` | 現在のセッションID |

使用例：
```yaml
---
name: fix-issue
description: GitHub issueを修正する
disable-model-invocation: true
argument-hint: "[issue-number]"
---

GitHub issue $ARGUMENTS を修正する。
```

位置引数の使用例：
```yaml
---
name: migrate-component
description: コンポーネントをフレームワーク間で移行する
---

$0 コンポーネントを $1 から $2 に移行する。
```

## 動的コンテキスト注入

`` !`command` `` 構文でシェルコマンドの出力をスキル本文に挿入できる。コマンドはスキル本文がClaudeに送信される前に実行され、出力で置換される。

```yaml
---
name: pr-summary
description: PRの変更を要約する
context: fork
agent: Explore
allowed-tools: Bash(gh *)
---

## PRコンテキスト
- PR差分: !`gh pr diff`
- 変更ファイル: !`gh pr diff --name-only`

## タスク
このPRの変更を要約する。
```

## 全フィールド記述例

```yaml
---
name: payment-workflow
description: >
  PayFlowの決済処理ワークフロー。トランザクション作成、コンプライアンスチェック、監査ログ生成を処理する。
  ユーザーが「決済を処理」「トランザクションを作成」と言ったときに使用する。
  一般的な財務クエリには使用しない。
argument-hint: "[transaction-id]"
disable-model-invocation: true
allowed-tools: Bash(python scripts/*)
license: MIT
compatibility: Claude Code対応。PayFlow MCPサーバーへの接続が必要。
metadata:
  author: PayFlow Inc.
  version: 2.1.0
  mcp-server: payflow
  category: fintech
  tags: [payment, compliance, audit]
---
```

## セキュリティに関する注意

### 禁止されるもの
- XMLタグ（`<` `>`）— フロントマターはシステムプロンプトに表示されるため、インジェクションリスクがある
- YAML内でのコード実行（安全なYAMLパーシングを使用）
- 「claude」「anthropic」をプレフィックスとするスキル名（予約済み）

## よくあるYAMLの間違い

```yaml
# ❌ デリミタがない
name: my-skill
description: 何かをする

# ❌ 引用符が閉じられていない
---
name: my-skill
description: "何かをする
---

# ✅ 正しい形式
---
name: my-skill
description: 何かをする。ユーザーが「〇〇して」と言ったときに使用する。
---
```

インデントの不整合（metadataの場合）：
```yaml
# ❌ インデントなし
metadata:
author: Name

# ✅ 2スペースインデント
metadata:
  author: Name
```
