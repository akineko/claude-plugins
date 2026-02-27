# Claude Code Plugins

Claude Codeの自作のスキルやエージェントなどをプラグイン化しマーケットプレイスとして管理する為のリポジトリです。

## リポジトリ構成

```
.
├── .claude-plugin/
│   └── marketplace.json        # マーケットプレイス定義
├── plugin-a/
│   ├── .claude-plugin/
│   │   └── plugin.json         # プラグインメタデータ
│   ├── commands/               # スラッシュコマンド等
│   ├── agents/
│   ├── skills/
│   ├── hooks/
│   ├── .mcp.json
│   └── README.md
└── README.md                   # 本ファイル
```

リポジトリルートの `marketplace.json` がマーケットプレイス全体のカタログで、配布するプラグインの一覧を管理します。各プラグインディレクトリ内の `plugin.json` がそのプラグイン自身のメタデータです。それぞれの書き方は「プラグインの追加方法」を参照してください。

## インストール方法

以降で紹介する `/plugin` コマンドの操作は、引数なしで起動する TUI 上でも同様の操作を行って頂いても大丈夫です。

### マーケットプレイスの追加とプラグインのインストール

```bash
# マーケットプレイスを追加
/plugin marketplace add akineko/claude-plugins

# プラグインをインストール
/plugin install plugin-a@akineko-plugins
```

## プラグインのアップデート方法

```bash
# 特定のプラグインを更新
/plugin update plugin-a@akineko-plugins
```

アップデートが反映されない場合は、キャッシュの問題が原因の可能性があります（[Issue #19197](https://github.com/anthropics/claude-code/issues/19197)）。その場合はアンインストール→再インストールで解決できます。

```bash
/plugin uninstall plugin-a@akineko-plugins
/plugin install plugin-a@akineko-plugins
```

## プラグインの追加方法

[CONTRIBUTING.md](./CONTRIBUTING.md) を参照

## 参考リンク

- [Plugins（プラグイン作成ガイド）](https://code.claude.com/docs/en/plugins)
- [Plugins reference（技術仕様）](https://code.claude.com/docs/en/plugins-reference)
- [Plugin marketplaces（マーケットプレイス管理）](https://code.claude.com/docs/en/plugin-marketplaces)
- [Skills](https://code.claude.com/docs/en/skills)
- [Subagents](https://code.claude.com/docs/en/sub-agents)
- [Hooks](https://code.claude.com/docs/en/hooks)
- [MCP](https://code.claude.com/docs/en/mcp)
