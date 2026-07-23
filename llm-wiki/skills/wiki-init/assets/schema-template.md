---
type: Wiki Schema
title: LLM Wiki スキーマ
description: この Wiki の構造・命名・運用規約を定義するスキーマ（プロデューサー規約）。
timestamp: {初期化時に date -u +%Y-%m-%dT%H:%M:%SZ で設定}
---

このファイルは LLM Wiki の **スキーマ**（運用規約）です。Wiki に対して何かを書き込む / 読み込む LLM は、まずこのファイルを読み、ここに書かれた規約に従って動作してください。

> 本ファイルは Claude Code が自動読込する `CLAUDE.md`、または汎用エージェント向けの `AGENTS.md` として配置されます。
>
> このスキーマは **育てるもの** です。運用していて気づいた規則・好みは末尾の「拡張」セクションに追記してください。
>
> **本スキーマは "不変条件" の規定** に専念し、操作の詳細手順は記載しません。詳細手順は `/llm-wiki:wiki-ingest` `/llm-wiki:wiki-query` `/llm-wiki:wiki-lint` `/llm-wiki:wiki-schema` の各スキルが担います。

---

# OKF 準拠宣言

この Wiki は [Open Knowledge Format (OKF)](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) **v0.1** に準拠する Knowledge Bundle である。バージョンはルート `index.md` の frontmatter（`okf_version`）で宣言する。

- **OKF が定義する事項**（ページ形式・予約ファイル・リンク・log の体裁）は OKF に従う。本スキーマには仕様を再掲せず、本 Wiki としての選択と差分だけを記す
- **OKF が自由に委ねる事項**（配置・命名・ワークフロー）は、以下の各セクションが本 Wiki の **プロデューサー規約** として定める
- OKF より厳しい規約（例: 空ページの禁止）は本 Wiki の品質規約であり、破っても OKF 非準拠にはならないが、この Wiki では守ること

---

# 目的

> この Wiki は **{ユーザーが入力した目的}** のために運用する。

---

# 三層構造

| レイヤー | 役割 | 編集権 |
|---|---|---|
| 生ソース | 元のドキュメント（記事・PDF・トランスクリプト等） | 不変。LLM は読むだけ |
| Wiki（OKF バンドル） | 相互リンクされたマークダウンの集合体 | LLM が完全に所有して書き換える |
| スキーマ（このファイル） | Wiki の構造・ワークフローを定義 | 人間と LLM の合議で更新 |

新しい知識は **生ソース → Wiki への要約 → 関連ページの相互更新** の順で流れる。生ソースを毎回読み返すのではなく、Wiki に書き込んだ内容を一次情報源として参照する。

---

# ディレクトリ構成

フラット配置を採用する（OKF はディレクトリ構成を規定しない。以下は本 Wiki の選択）。

```
{wiki-root}/                # OKF Knowledge Bundle のルート
├── CLAUDE.md               # このスキーマ（type: Wiki Schema）
├── index.md                # 予約ファイル: ページカタログ。okf_version を宣言
├── log.md                  # 予約ファイル: 更新履歴
├── README.md               # （任意）人間向けの導入
└── *.md                    # concept ドキュメント（Wiki ページ本体）
```

- ページ数が増えてカテゴリ単位の整理が必要になったら、OKF イディオムのタイプ別サブディレクトリ（各ディレクトリに `index.md`）への移行を `/llm-wiki:wiki-schema` で計画する
- `attachments/` は画像や PDF を貼り付けるときに作成する（`.md` 以外のファイルは OKF の対象外）
- `index.md` / `log.md` 以外のすべての `.md` は frontmatter（`type` 必須）を持つ。lint レポートやマイグレーション計画などの運用ドキュメントを Wiki 内に置く場合も同様

---

# ページの命名規約

すべて kebab-case の `.md` ファイル。プレフィックスでページタイプを示す（フラット配置における、OKF のタイプ別サブディレクトリの等価物）。

| プレフィックス | type | 用途 | 例 |
|---|---|---|---|
| `source-` | `Source` | 生ソースの要約ページ（1 ソースに 1 つ） | `source-attention-is-all-you-need.md` |
| `concept-` | `Concept` | 概念・用語ページ | `concept-self-attention.md` |
| `person-` | `Person` | 著者・研究者・関係者 | `person-vaswani.md` |
| `topic-` | `Topic` | 横断的なテーマ・分野 | `topic-llm-architecture.md` |

> 用途に応じてここを増減させる。例: 個人運用なら `goal-` / `metric-`、プロジェクトなら `decision-` / `incident-`。`type` の値は OKF の流儀（記述的・自己説明的な Title Case）で付ける。

---

# ページのフロントマター

OKF §4.1 が定義するフィールドのみを使う。独自フィールドは追加しない（必要になったら `/llm-wiki:wiki-schema` で拡張を検討する）。

```yaml
---
type: Source | Concept | Person | Topic   # 必須（OKF）。上記の統制語彙から選ぶ
title: ページの正式な題名                   # 推奨。本文にタイトルの H1 は書かない
description: ページ内容の 1 文サマリ         # 推奨。index.md のエントリはこれを転記する
resource: https://...                     # type: Source で元ソースの URI があるときのみ
tags: [tag1, tag2]                        # 任意。自然に付かなければフィールドごと省略
timestamp: 2026-07-24T09:00:00Z           # ISO 8601。実体的な更新があったときのみ更新
---
```

- `timestamp` は `date -u +%Y-%m-%dT%H:%M:%SZ` で取得する。typo 修正では更新しない
- 作成日のフィールドは持たない（git 履歴が担う）
- `description` を変えたら `index.md` の該当エントリも同じ文に更新する（両者の乖離は `/llm-wiki:wiki-lint` が検出する）

---

# 相互リンク

標準 Markdown の **相対リンク**（OKF §5.2）を使う。

```markdown
このアーキテクチャは [自己注意機構](./concept-self-attention.md) に基づいており、[Vaswani](./person-vaswani.md) らによって提案された。
```

- OKF はバンドルルート絶対リンク（`/concept.md`）を推奨するが、本 Wiki はフラット配置であり、GitHub / Obsidian 上でのレンダリング互換を優先して相対リンクを採用する。サブディレクトリ化する際に再検討する
- 未執筆ページへのリンクは張ってよい（OKF ではリンク切れは「まだ書かれていない知識」の表明として有効）。ただし **リンクを通すためだけの空ページを作るのは禁止**。未執筆リンクは `/llm-wiki:wiki-lint` が「作成候補」として集計する
- ページ末尾には「`# 関連`」セクションを置き、関連ページへのリンクのアンカーにする

---

# 本文の体裁

- 本文にタイトルの H1 を書かない。タイトルは frontmatter の `title` に一元化する（OKF のイディオム）
- セクション見出しは H1 を使う（`# 主張`、`# 関連` など）
- 外部出典は OKF 慣例の `# Citations` セクションに `[1] [題名](URL)` の番号付きで列挙する（OKF §8）
- 散文より構造的なマークダウン（見出し・リスト・表・コードブロック）を優先する（OKF §4.2）

---

# index.md

Wiki 内の知識ページをすべて列挙するカタログ（OKF §6 の予約ファイル）。

- LLM はクエリを受けたら **まず index.md を読む**
- エントリは `* [title](./file.md) - 説明` の形式。説明はリンク先 frontmatter の `description` をそのまま転記する
- 新規ページの追加・`description` の変更を行ったら必ず index.md も更新する
- カタログに載せるのは知識ページのみ。運用ドキュメント（`type` が `Wiki Schema` / `Lint Report` / `Migration Plan` のもの）は載せない
- ルート index.md の frontmatter で `okf_version` を宣言する（OKF §11。index.md に frontmatter が許される唯一のケース）

形式例:

```markdown
---
okf_version: "0.1"
---

# 概念

* [自己注意機構](./concept-self-attention.md) - 入力系列の各要素に対する重み付き集約の機構
* [位置エンコーディング](./concept-positional-encoding.md) - 位置情報を埋め込みに加える手法

# ソース要約

* [Attention Is All You Need](./source-attention-is-all-you-need.md) - Transformer の原典論文（2017）
```

---

# log.md

Wiki への操作の更新履歴（OKF §7 の予約ファイル）。日付見出し（`## YYYY-MM-DD`）でグループ化し、**新しい日付が上**。

```markdown
# Directory Update Log

## 2026-07-24

* **Ingest**: [Attention Is All You Need](./source-attention-is-all-you-need.md) を取り込み。concept 2 件を新規作成、既存 3 ページを更新
```

エントリ行頭の太字カテゴリは以下の語彙を使う:

| カテゴリ | 意味 |
|---|---|
| `Init` | Wiki 初期化 |
| `Ingest` | 新ソース取り込み |
| `Query` | 価値あるクエリと回答（Wiki に還元したもの） |
| `Lint` | 健全性チェックの結果 |
| `Schema` | スキーマ変更 |
| `Note` | その他特記事項 |

- 追記は該当する日付見出しの下に行う。その日の見出しが無ければ H1 直後（ファイル先頭側）に新設する
- 過去のエントリは書き換えない（追記専用）
- 矛盾検出など詳細が必要なときのみ、エントリの下にネストした箇条書きを添える

---

# ワークフロー（不変条件）

ingest / query / lint / schema 各操作は対応するスキル（`/llm-wiki:wiki-*`）が手順を持つ。本スキーマは **どの手順を踏んでも守るべき不変条件** だけを規定する。

## ingest（取り込み）の不変条件

- 1 つの生ソースに対して **必ず 1 つ** の `source-*.md` を作る（複数 source を 1 ファイルに混ぜない）
- 取り込み実行ごとに `index.md` と `log.md` を **必ず更新** する
- 既存ページの記述と矛盾するソースを取り込んだ場合、**既存記述を消さず並置** する

## query（問い合わせ）の不変条件

- 回答は Wiki 内のページから組み立てる。Wiki に無い情報を補った場合は **その旨を明示** する
- 主張の根拠は `source-*` ページまで遡れる形で引用する
- 価値ある回答（新しい横断的知見）は **必ず Wiki に書き戻す**（書き戻す/書き戻さないの判定基準はスキルが持つ）

## lint（健全性チェック）の不変条件

- **検出のみ行い、自動修正はしない**（ファイル削除・リンク削除・矛盾の片寄せを LLM 単独で実行しない）
- レポートと log エントリを残し、修正は人間 / 別スキル / 後続 ingest に委ねる

## schema（スキーマ変更）の不変条件

- 既存ページに影響する変更（命名規則変更等）は **マイグレーション計画を分離** してから実施する
- スキーマ変更は `log.md` に `Schema` カテゴリで **必ず記録** する

---

# 拡張

> 運用しながら気づいた追加ルールはここに書く。

（まだルールはありません）
