---
name: add-plugin
description: マーケットプレイスに新しいプラグインを追加するスキル。プラグインディレクトリと plugin.json の作成、marketplace.json への登録を自動化する。ユーザーが「プラグインを追加して」「新しいプラグインを作って」と依頼した時、または /add-plugin で手動起動した時に使用する。
---

# Add Plugin

新しいプラグインのディレクトリ構造を初期化し、マーケットプレイスに登録する。

## ワークフロー

1. ユーザーからプラグイン名と説明を受け取る
2. プラグイン名が小文字 kebab-case でない場合、kebab-case に変換してユーザーに確認する（例: `MyPlugin` → `my-plugin`, `my_plugin` → `my-plugin`）
3. バリデーション:
   - `<plugin-name>/` ディレクトリが既に存在しないか Glob で確認
   - `.claude-plugin/marketplace.json` を Read で読み、同名プラグインが登録されていないか確認
4. Write ツールで `<plugin-name>/.claude-plugin/plugin.json` を作成:
   ```json
   {
     "name": "<plugin-name>",
     "version": "0.1.0",
     "description": "<description>"
   }
   ```
5. Edit ツールで `.claude-plugin/marketplace.json` の `plugins` 配列末尾にエントリを追加:
   ```json
   {
     "name": "<plugin-name>",
     "source": "./<plugin-name>"
   }
   ```
6. 結果を確認して完了を報告する

## 注意事項

- ファイル作成前に、ユーザーからプラグイン名と説明を確認すること
- バージョンは `0.1.0` で初期化する
- 追加の構成（commands/, agents/, skills/, hooks/, .mcp.json）はプラグインの用途に応じて後から追加する
