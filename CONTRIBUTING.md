# プラグインの追加方法

インストールはプラグイン単位なので、関連のあるものだけをまとめた単位で作成する。

> **Tip:** Claude Code 上で `/add-plugin` コマンドを実行すると、手順 1〜2（プラグインディレクトリの作成と `marketplace.json` への登録）を対話的に自動で行える。

## 1. プラグインディレクトリの作成

リポジトリルートにプラグイン名のディレクトリを作成し、`.claude-plugin/plugin.json` を配置します。

```bash
mkdir -p my-new-plugin/.claude-plugin
```

`plugin.json` の必須フィールドは `name` のみだが、アップデート検知に `version` が使われるため必ず記載する。

```json
{
  "name": "my-new-plugin",
  "description": "プラグインの説明",
  "version": "1.0.0"
}
```

その後、必要に応じて `commands/`, `agents/`, `skills/`, `hooks/`, `.mcp.json` を追加する。詳細は[公式ドキュメント](https://code.claude.com/docs/en/plugins-reference)を参照。

プラグインディレクトリ内の `README.md` は Claude Code では処理されないが、環境変数の設定方法などセットアップ手順がある場合は作成しておく。

## 2. `marketplace.json` への登録

ルートの `.claude-plugin/marketplace.json` の `plugins` 配列に新しいプラグインのエントリを追加する。

```json
{
  "name": "akineko-plugins",
  "owner": { "name": "akineko" },
  "plugins": [
    {
      "name": "plugin-a",
      "source": "./plugin-a"
    },
    {
      "name": "my-new-plugin",
      "source": "./my-new-plugin"
    }
  ]
}
```

## 3. プラグイン更新時の `version` の更新

プラグインの内容を変更したら、`plugin.json` の `version` をセマンティックバージョニングに従って更新する。

```json
{
  "name": "my-new-plugin",
  "description": "プラグインの説明",
  "version": "1.1.0"
}
```

`version` を更新しないとアップデートが検知されなかったりキャッシュが更新されない場合がある。

## ローカルでのテスト方法

### 開発中のテスト

`--plugin-dir` フラグを使うとインストールせずにプラグインをロードできる。

```bash
claude --plugin-dir ./my-new-plugin
```

### マーケットプレイス経由のテスト

マーケットプレイスに登録した状態でテストする場合は、ローカルパスでマーケットプレイスを追加する。

```bash
/plugin marketplace add ./path/to/akineko/claude-plugins
/plugin install my-new-plugin@akineko-plugins
```

変更を反映するにはアンインストール→再インストールが必要。

```bash
/plugin uninstall my-new-plugin@akineko-plugins
/plugin install my-new-plugin@akineko-plugins
```
