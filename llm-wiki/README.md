# llm-wiki

LLM が「相互リンクされたマークダウンの集合体」として永続的なナレッジベースを段階的に構築・維持するための Claude Code プラグイン。

設計思想は Andrej Karpathy の "LLM Wiki" に基づく。生のソースから毎回検索するのではなく、LLM が一度知識を消化して Wiki に書き込み、以降は Wiki が回答の一次情報源になる。**Obsidian がエディタ、LLM がプログラマ、Wiki がコードベース**という構図。

Wiki の物理フォーマットは Google が策定した [Open Knowledge Format (OKF)](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) v0.1 に準拠する。生成される Wiki はそのまま OKF Knowledge Bundle であり、OKF を読める他のエージェント・ツールからも消費できる。

## アーキテクチャ

| レイヤー | 役割 |
|---|---|
| **生ソース** | LLM が読むだけで書き換えない不変のドキュメント（記事・PDF・トランスクリプト等） |
| **Wiki（OKF バンドル）** | LLM が完全に所有するマークダウン群。frontmatter 付きページ・index・log |
| **スキーマ** | `<wiki-root>/CLAUDE.md`（または `AGENTS.md`）。OKF が自由に委ねる部分（配置・命名・ワークフロー）をこの Wiki のプロデューサー規約として定義する設定ドキュメント |

## スキル一覧

すべて `wiki-` 接頭辞で命名されている（外部スキルとの衝突を避けるため）。

| スキル | 用途 |
|---|---|
| `/llm-wiki:wiki-init` | Wiki の初期構築。ディレクトリ・`CLAUDE.md`・`index.md`・`log.md` を作成する |
| `/llm-wiki:wiki-schema` | 用途追加・運用見直し・OKF バージョン追従のために `CLAUDE.md`（スキーマ）をカスタマイズする |
| `/llm-wiki:wiki-ingest` | 生ソースを読み込んでサマリページを作成し、index・log・関連ページを更新する |
| `/llm-wiki:wiki-query` | Wiki を検索・統合して回答する。価値ある回答は新規ページとして Wiki に還元する |
| `/llm-wiki:wiki-lint` | 矛盾・古い記述・孤立ページ・未解決リンク・OKF 準拠違反などを検出し、改善案を提示する |

## 標準的な使い方

```
1. /llm-wiki:wiki-init       … Wiki を初期化（用途を質問しスキーマを生成）
2. /llm-wiki:wiki-ingest URL … 記事や資料を取り込む（繰り返し）
3. /llm-wiki:wiki-query 質問 … Wiki に問い合わせる
4. /llm-wiki:wiki-lint       … 定期的に健全性をチェック
5. /llm-wiki:wiki-schema     … 用途を追加したくなったら呼び出す
```

## 設計上の前提

- **Wiki の編集権は LLM**: 人間は生ソースを差し入れ、質問し、レビューする。日々の cross-reference 更新や整合性維持は LLM が担う
- **OKF が定義する部分は OKF に従う**: ページ形式（frontmatter + Markdown）・予約ファイル（`index.md` / `log.md`）・リンク記法（標準 Markdown リンク）・log の体裁は OKF の定義をそのまま使う。独自拡張はしない
- **OKF が委ねる部分はスキーマで育てる**: 配置・命名・ワークフローはプロデューサー規約として `CLAUDE.md` に定義し、テンプレートからスタートして運用しながら更新していく
- **Git 前提**: Wiki ディレクトリはバージョン管理される想定。各スキルは git をクリーンに使う
- **永続性が価値**: 1 回の対話で完結させない。**問い合わせの回答も Wiki に書き戻す**ことで、知識が累積する
