# layouts — ディレクトリ構成と配置判断

シングルレポとモノレポのディレクトリ構成、カテゴリ採用の判断指針、構成モード（minimum / standard）、モノレポでの配置ルールをまとめる。

## カテゴリ採用の判断指針

| カテゴリ | 種別 | 採用すべきとき | 採用しないとき |
|---|---|---|---|
| `adr/` | コア | 複数人で開発する／設計上の選択肢がある | 自明な決定しかない極小規模で、判断を残す必要を感じないとき |
| `design/` | コア | 1 機能の中に複数の関係する判断・抽象がある | 機能が CRUD だけで設計上の論点がほぼ無いとき |
| `research/` | コア | 技術選定・バージョンアップ影響・問題調査など、調査結果を設計書から分離して残したい場面がある | 調査して残す価値のある事象がほぼ発生しない極小規模・短期プロジェクト |
| `architecture/` | コア | エラー処理・ログ・命名など全体規約を作る | コードベースが小さく規約を作る前段階のとき |
| `glossary.md` | 任意 | ドメイン用語・略語が多い／用語のブレを実感している | 一般的な用語しか使わないアプリ |
| `runbook/` | 任意 | 本番運用がある／手作業の手順が複数ある | ローカル/個人開発のみ／自動化で十分なとき |
| `postmortem/` | 任意 | 運用フェーズにあり、インシデントから学ぶ仕組みを作りたい | まだリリース前／インシデントが発生していない |

判断に迷ったときの原則: **「今すぐ書く見込みがないものは作らない」**。未使用のディレクトリは心理的負債になる。後から追加するのは容易なので、必要になってからこのスキルを再実行して追加する選択肢を残しておく。

## カテゴリ分類

カテゴリは「ファイルがどう増えていくか」で 3 種類に分かれる。これが構成モードの差を生む。

| 種別 | カテゴリ | 増え方 | ファイル名の傾向 |
|---|---|---|---|
| 累積系 | `adr/`, `research/`, `postmortem/` | 連番・時系列で確実に増える | `0001-...md`, `YYYY-MM-DD-...md` |
| 主題系 | `architecture`, `design`, `runbook` | 主題ごとに少しずつ増える。初期は数件 | `error-handling.md`, `audit-log.md`, `deploy.md` |
| 単発系 | `glossary` | 1 ファイル運用 | `glossary.md` |

## 構成モード

`docs/` 配下の構成は、プロジェクトの規模・状態に応じて 2 モードを使い分ける。

### minimum モード（新規・小規模向けの推奨デフォルト）

**累積系のみサブディレクトリ + README、主題系は `docs/` 直下にフラット配置 + `_guide-<category>.md` をガイドとして並べる**。

特徴:

- 初期のディレクトリ数を最小化し、未使用ディレクトリの心理的負債を減らす
- 主題系の書き方ガイドは `_guide-<category>.md` として `docs/` 直下に置き、ファイル一覧の先頭に集まる（アンダースコアプレフィックス）
- `_guide-<category>.md` の内容は standard モードの `<category>/README.md` と完全に同一。将来の分割は `mv` だけで済む

### standard モード

**全カテゴリで `<category>/README.md` を作る現行構成**。既存に `docs/<category>/` 構造があるプロジェクト、ファイル数が既に多いプロジェクト、最初から構造を固定したいチーム向け。

### モード選択の判断

- **新規プロジェクト・空の `docs/`** → minimum
- **既存に `docs/<category>/` 構造がある** → standard でその構造に合わせて追記
- **ユーザーが明示的に指定** → それに従う
- **判断が付かない** → minimum で始めて、必要時に再実行で分割

### minimum → standard の分割タイミングと手順

主題系カテゴリのファイルが次のいずれかになったら分割を検討:

- 同じ主題系カテゴリのファイルが 5 つ以上溜まった
- 別カテゴリのファイルと取り違えやすくなった
- カテゴリ内でさらに分類したくなった

分割は機械的に行える:

```bash
mkdir docs/architecture
mv docs/_guide-architecture.md docs/architecture/README.md
mv docs/error-handling.md docs/architecture/    # 該当する主題ファイルをすべて移動
mv docs/logging.md docs/architecture/
# docs/README.md のリンクと「将来の分割計画」セクションを更新
```

このスキル（`setup-docs`）を再実行すれば分割支援が起動する（SKILL.md の「再実行時の動作」を参照）。

## シングルレポのレイアウト

### minimum モード

```
<repo-root>/
└── docs/
    ├── README.md                # 索引 + 簡潔ルール + 将来の分割計画
    ├── adr/                     # 累積系
    │   ├── README.md
    │   └── (ADRファイル)
    ├── research/                # 累積系
    │   ├── README.md
    │   └── (researchファイル)
    ├── postmortem/              # 任意・累積系
    │   ├── README.md
    │   └── (postmortemファイル)
    ├── _guide-architecture.md   # 主題系の書き方ガイド（先頭にまとまる）
    ├── _guide-design.md         # 同上
    ├── _guide-runbook.md        # 任意
    ├── (architecture系コンテンツ).md   # 例: error-handling.md
    ├── (design系コンテンツ).md         # 例: audit-log.md
    ├── (runbook系コンテンツ).md        # 任意: deploy.md など
    └── glossary.md              # 任意・単発系
```

- ガイドファイル（`_guide-*.md`）はソート上、アンダースコアプレフィックスでまとまって先頭に並ぶ
- コンテンツは `docs/` 直下にフラット配置（`error-handling.md`, `audit-log.md` など）
- ファイル数が増えてきたら、累積系と同様にサブディレクトリへ昇格させる

### standard モード

```
<repo-root>/
└── docs/
    ├── README.md              # ドキュメント全体のインデックス
    ├── adr/
    │   └── README.md          # ADRの書き方ガイド
    ├── design/
    │   └── README.md          # 機能設計の書き方ガイド
    ├── research/
    │   └── README.md          # 技術調査の書き方ガイド
    ├── architecture/
    │   └── README.md          # 横断的方針の書き方ガイド
    ├── glossary.md            # 任意: 用語集
    ├── runbook/               # 任意
    │   └── README.md
    └── postmortem/            # 任意
        └── README.md
```

- ルートは `docs/` で統一する（`doc/` でも構わないが、既存に合わせる）
- `glossary` は単一ファイル運用が現実的（複数ファイルにすると重複が起きる）
- `runbook` と `postmortem` はファイルが増えていくのでディレクトリ運用

## モノレポのレイアウト

### minimum モード

```
<repo-root>/
├── docs/                              # システム全体に関わるもの
│   ├── README.md
│   ├── adr/                           # 累積系
│   │   └── README.md
│   ├── _guide-architecture.md         # 主題系（全体規約）のガイド
│   ├── (architecture系コンテンツ).md  # 例: error-handling.md
│   ├── glossary.md                    # 任意・単発系
│   ├── _guide-runbook.md              # 任意
│   ├── (runbook系コンテンツ).md       # 任意
│   └── postmortem/                    # 任意・累積系
│       └── README.md
└── packages/                          # または apps/, services/, libs/ など
    └── <package-name>/
        └── docs/
            ├── README.md
            ├── research/              # 累積系（パッケージ向け）
            │   └── README.md
            ├── _guide-design.md       # 主題系（パッケージ固有設計）のガイド
            └── (design系コンテンツ).md # 例: audit-log.md
```

### standard モード

```
<repo-root>/
├── docs/                              # システム全体に関わるもの
│   ├── README.md
│   ├── adr/                           # システム全体に影響する ADR
│   │   └── README.md
│   ├── architecture/                  # 全体に効く横断的方針
│   │   └── README.md
│   ├── glossary.md                    # 任意: システム全体の用語
│   ├── runbook/                       # 任意
│   │   └── README.md
│   └── postmortem/                    # 任意
│       └── README.md
└── packages/                          # または apps/, services/, libs/ など
    ├── <package-a>/
    │   └── docs/
    │       ├── README.md
    │       ├── design/                # このパッケージ固有の機能設計
    │       │   └── README.md
    │       ├── research/              # このパッケージ向け技術調査
    │       │   └── README.md
    │       └── adr/                   # 任意: パッケージ固有のADR
    │           └── README.md
    └── <package-b>/
        └── docs/
            └── ...
```

### モノレポの配置判断ルール

「全体に影響するか / 単一パッケージに閉じるか」で分ける。

| ドキュメントの種類 | 置き場 | 例 |
|---|---|---|
| 全パッケージに影響する決定 | ルート `docs/adr/` | 認証方式、言語/ランタイム、ログ集約、CI/CD 方針 |
| 単一パッケージに閉じる決定 | `packages/<pkg>/docs/adr/` | そのパッケージ内のライブラリ選定、内部実装パターン |
| 全体の横断規約 | ルート `docs/architecture/` | エラーハンドリング、ログフォーマット、命名規則 |
| パッケージ固有規約 | `packages/<pkg>/docs/architecture/`（必要なら） | そのパッケージ独自の設計ルール |
| 機能設計（基本は1パッケージに閉じる） | `packages/<pkg>/docs/design/` | API、UI、データ処理など |
| 複数パッケージに跨る機能設計 | ルート `docs/design/` | 認証フロー全体、複数サービスの連携シーケンス |
| 技術調査 | 調査対象パッケージの `docs/research/` か、ルート | 共通基盤の調査ならルート、特定パッケージの調査ならそこに |
| 用語集 | ルート `docs/glossary.md` 1 つ | パッケージ固有用語も同じファイルにセクション分けして入れる |
| 運用手順 | ルート `docs/runbook/` 中心 | 個別サービス特有のものはそのサービス配下も可 |
| ポストモーテム | ルート `docs/postmortem/` | 影響範囲を本文に書く |

迷ったらルートに置いて、関連パッケージから相互リンクする。**後でルートに引き上げるよりは、最初からルートに置いてリンクする方が動かしやすい**。

### モノレポでパッケージごとに `docs/` を作るか

全パッケージに自動で `docs/` を作ると、使わないディレクトリが大量に増える。次のいずれかに該当するパッケージにだけ作る：

- 既に長文の README やコメントで設計を語っている
- ユーザーから「このパッケージの設計を残したい」と明示された
- 機能規模が大きい（ファイル数や責務の多さで判断）

判断がつかない場合はユーザーに「どのパッケージに docs を作るか」を聞く。

## 命名規則

### ファイル名

- ケバブケース（小文字・ハイフン区切り）
- 連番プレフィックスを使うカテゴリ（推奨）:
  - `adr/`: `NNNN-<title>.md`（ゼロ埋め 4 桁、例: `0001-adopt-oidc-pkce.md`）。ADR は採番順序が分かりやすく、相互参照（Superseded by 0042 など）も書きやすい。日付プレフィックス `YYYY-MM-DD-<title>.md` を選ぶプロジェクトもあるが、既存に合わせる場合のみ
- 日付プレフィックスを使うカテゴリ:
  - `research/`: `YYYY-MM-DD-<topic>.md`（陳腐化判断がしやすい）
  - `postmortem/`: `YYYY-MM-DD-<event>.md`（発生日が一次情報）
- プレフィックスを使わないカテゴリ（コンテンツファイル）:
  - `design/` 配下または minimum モードでの `docs/` 直下: `<feature-name>.md`（例: `audit-log.md`, `rbac.md`）
  - `architecture/` 配下または minimum モードでの `docs/` 直下: `<topic>.md`（例: `error-handling.md`, `logging.md`）
  - `runbook/` 配下または minimum モードでの `docs/` 直下: `<operation>.md`（例: `deploy.md`, `rollback.md`）
- minimum モード専用のガイドファイル名:
  - `_guide-<category>.md`（例: `_guide-architecture.md`, `_guide-design.md`, `_guide-runbook.md`）
  - アンダースコアプレフィックスでファイル一覧の先頭にまとまり、コンテンツと視覚的に区別される
  - 中身は standard モードの `<category>/README.md` と同一にする（将来 `mv` で昇格できるよう）

### ディレクトリ名

- 既存に合わせる。新規なら本ドキュメントの名前（`adr`, `design`, ...）を使う
- 別名（`decisions`, `architecture-decisions`, `rfcs`, `specs`）が既に使われていればそれに合わせ、無理に統一しない
