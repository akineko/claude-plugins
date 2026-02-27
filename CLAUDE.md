# CLAUDE.md

## リポジトリ概要

自作の Claude Code プラグインマーケットプレイスリポジトリ。リポジトリルートの `.claude-plugin/marketplace.json` がカタログとして全プラグインを管理し、各プラグインはサブディレクトリとして配置される。

## アーキテクチャ

- **マーケットプレイス定義**: `.claude-plugin/marketplace.json` — プラグイン一覧を `plugins` 配列で管理
- **各プラグイン**: `<plugin-name>/` ディレクトリ配下に以下を配置
  - `.claude-plugin/plugin.json` — メタデータ（`name`, `version` 必須）
  - `commands/`, `agents/`, `skills/`, `hooks/`, `.mcp.json` — 必要に応じて追加

## プラグイン追加・更新ワークフロー

1. `<plugin-name>/.claude-plugin/plugin.json` を作成（`name` と `version` を記載）
2. ルートの `.claude-plugin/marketplace.json` の `plugins` 配列にエントリ追加
3. 更新時は `plugin.json` の `version` をセマンティックバージョニングで上げる（更新検知に必要）

## ファイル操作の対象スコープ（重要）

このリポジトリはプラグインを**開発する**リポジトリであり、開発支援にも Claude Code のスキル・エージェントを利用している。同名・類似名のファイルが以下の3レイヤーに存在しうる。

| レイヤー | パス | 役割 |
|---------|------|------|
| 開発対象 | `<plugin-name>/skills/`, `<plugin-name>/agents/` | 開発中のプラグイン成果物 |
| プロジェクト | `.claude/skills/`, `.claude/agents/` | 開発支援用ツール |
| ユーザー | `~/.claude/skills/`, `~/.claude/agents/` | 個人の汎用ツール |

- プラグイン名が指示に含まれている場合、`<plugin-name>/` 配下のみを対象とする
- 複数レイヤーに該当ファイルがある場合、どのレイヤーが対象か確認してから作業する
- プロジェクト・ユーザーレベルのファイルは明示指定がない限り編集しない
- 参照元と編集先のレイヤーを混同しない

