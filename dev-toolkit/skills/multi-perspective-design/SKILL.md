---
name: multi-perspective-design
description: >
  3つの設計視点（理想設計・現実設計・ドメイン設計）で並列に設計案を生成し、統合して最適な実装設計書を作成するオーケストレーター。
argument-hint: "[影響分析書パス or 要求仕様書パス or 要件テキスト]"
disable-model-invocation: true
---

# マルチパースペクティブ実装設計書の作成

3つの設計視点（Greenfield / Brownfield / Domain-first）で並列に設計案を生成し、統合して最適な実装設計書を作成する。

## 3つの設計視点

| エージェント | 視点 | 統合での役割 |
|-------------|------|-------------|
| `greenfield-architect` | 移行コスト度外視の理想設計 | **目標** — 目指すべき設計の方向性 |
| `brownfield-architect` | 既存コード最大活用の現実設計 | **制約** — 既存との整合性・移行リスク |
| `domain-first-architect` | ドメインモデル最優先の概念設計 | **基盤** — 概念名・境界・不変条件 |

## ワークフロー概要

### パスA: 影響分析書あり（推奨）

```
入力（影響分析書パス）
  │
  ├─ Phase 1: 初期化                          ← 影響分析書 + 要求仕様書を読み込み
  │     └─ Research スキップ
  │
  ├─ Phase 2: Goal（セクション1: ゴール）     ← メインエージェント
  │
  ├─ Phase 3: 並列Design（セクション2-6 × 3案）
  │     ├─ greenfield-architect   → *-greenfield.md に保存
  │     ├─ brownfield-architect   → *-brownfield.md に保存
  │     └─ domain-first-architect → *-domain.md に保存
  │
  ├─ Phase 4: 統合（3案 → 最適案）
  │     └─ design-synthesizer + synthesis-prompt
  │
  ├─ Phase 5: Review（ユーザー確認＆部分再設計）
  │
  ├─ Phase 6: Planning（セクション7: 実装フェーズ）
  │
  成果物: .claude/tmp/{dir}/implementation-design.md
  参考:   .claude/tmp/{dir}/implementation-design-{greenfield,brownfield,domain}.md
```

### パスB: 要求仕様書 or テキスト（小規模向け）

```
入力（要求仕様書 or テキスト）
  │
  ├─ Phase 1: 初期化 + Research（コード調査）  ← codebase-investigator
  │
  ├─ Phase 2〜7: パスAと同じ
  │
  成果物: .claude/tmp/{dir}/implementation-design.md
  参考:   .claude/tmp/{dir}/implementation-design-{greenfield,brownfield,domain}.md
```

## 制約

- **ファイル操作の責務分離**: メインエージェントのみがファイルの作成・保存を行う。各プロンプトテンプレートに「出力方法」セクションとしてファイル書き込み禁止の指示が含まれている — プロンプトを組み立てる際にこのセクションを省略・改変しないこと
- Design エージェントには `references/design-prompt.md` のプロンプトを使用する
- Synthesis エージェントには `references/synthesis-prompt.md` のプロンプトを使用する
- Revision エージェントには `references/revision-prompt.md` のプロンプトを使用する
- Planning エージェントには `references/planning-prompt.md` のプロンプトを使用する

## Phase 1: 初期化

### 1.1 入力の判定

`$ARGUMENTS` の内容から入力種別を判定する:

| 入力 | 判定方法 | パス |
|------|---------|------|
| 影響分析書 | ファイルパスが `impact-analysis.md` で終わる | パスA |
| 要求仕様書 | ファイルパスが上記以外の `.md` | パスB |
| テキスト | ファイルパスでない文字列 | パスB |
| 空 | — | AskUserQuestion で入力を求める |

### 1.2 パスA: 影響分析書からの初期化

1. 影響分析書を読み込む
2. 影響分析書の冒頭から `対象要求仕様書` のパスを取得し、要求仕様書を読み込む
3. **設計対象の単位を確認**: 影響分析書のセクション5（推奨設計単位）に複数の単位がある場合、どの単位を設計するか AskUserQuestion で確認する
4. 成果物パス: 影響分析書と同じディレクトリに `implementation-design.md`
   - 影響分析書に複数の設計単位がある場合: `implementation-design-{単位名}.md`
5. **先行設計書の検出**: 影響分析書のセクション4（依存関係分析）とセクション5（設計単位間の実施順序）から、選択した設計単位が依存する先行単位を特定する。同じディレクトリに先行単位の設計書（`implementation-design-*.md`）が存在するか確認する。ただし `-greenfield.md` / `-brownfield.md` / `-domain.md` で終わるファイルは個別視点の設計案であり、先行設計書ではないため除外する
   - **先行設計書が存在する場合**: セクション1-3のみ読み込み、Design エージェントに `{先行設計書}` として渡す（セクション4以降は不要。整合性確認に必要なのは設計判断・データ構造・API仕様のみ）
   - **先行設計書が存在しない場合**: 依存する先行単位があるなら、先にその単位を設計すべきことを AskUserQuestion でユーザーに案内する。ユーザーが続行を選択した場合はそのまま設計を進める
6. **Researchはスキップ** — 影響分析書のセクション2（影響範囲）とセクション3（設計制約）がResearch結果を代替する

### 1.3 パスB: 要求仕様書/テキストからの初期化

1. **入力の読み込み**
   - ファイルパス → 読み込む
   - テキスト → そのまま要件として使用
2. **成果物パスの決定**
   - ファイルパスが入力の場合: 同ディレクトリに `implementation-design.md`
   - テキストが入力の場合: `.claude/tmp/{適切な名前}/implementation-design.md`
3. **規模の判定**（Research の並列化判断に使用）
   - 要件から影響するサービス/レイヤーを推定する
   - 2つ以上のサービス（例: backend + frontend）に跨る → 並列Research
   - 単一サービス内 → 単一Research
4. **Research実行** — `codebase-investigator` エージェントに調査を依頼する

#### 単一Researchの場合

```
Agent(
  subagent_type="codebase-investigator",
  prompt=下記のResearchプロンプト
)
```

#### 並列Researchの場合

影響するサービス/レイヤーごとにエージェントを並列起動する。

```
// 例: バックエンド調査とフロントエンド調査を並列
Agent(name="research-backend", subagent_type="codebase-investigator", prompt=...)
Agent(name="research-frontend", subagent_type="codebase-investigator", prompt=...)
```

#### Researchプロンプト

```
以下の要件を実現するために、コードベースを調査せよ。

## 要件
{要求仕様書の内容 or テキスト}

## 調査対象
{サービス/レイヤーの指定。並列の場合は担当範囲を明記}

## 出力形式

以下の3カテゴリに分類して報告せよ。各ファイルにつき1行の説明を付ける。

### 変更が必要なファイル
変更理由を1行で付記する。

### 参考にすべき既存パターン
類似の実装がある場合、そのファイルパスとパターンの概要を示す。

### 技術的制約・注意点
調査で判明した制約（既存のバリデーション、リレーション、命名規則等）を列挙する。
```

## Phase 2: Goal（ゴール記述）

メインエージェント自身が、要求仕様書からセクション1（ゴール）を記述する。
パスAの場合も要求仕様書を参照する（影響分析書ではなく）。

### 記述ルール

- 「この実装が完了したとき、ユーザーやシステムにとって何が変わるか」を1-3文で書く
- 要求仕様の項目を並べるのではなく、達成される価値を述べる
- 技術的手段（API追加、カラム追加等）には言及しない

### 出力形式

```markdown
# 実装設計書: {タイトル}

## 1. ゴール

{ゴール文}
```

ファイルに保存する。

## Phase 3: 並列Design（3視点の設計案生成）

`references/design-prompt.md` を読み込み、変数を埋めたプロンプトを3つのエージェントに**並列で**渡す。

### パスA（影響分析書あり）の場合

```
// 3エージェントを並列起動
Agent(name="design-greenfield", subagent_type="greenfield-architect",
  prompt=design-prompt.md の変数を埋めたもの)
Agent(name="design-brownfield", subagent_type="brownfield-architect",
  prompt=design-prompt.md の変数を埋めたもの)
Agent(name="design-domain", subagent_type="domain-first-architect",
  prompt=design-prompt.md の変数を埋めたもの)
```

変数の埋め方:
- `{要求仕様}`: 要求仕様書の内容
- `{ゴール}`: Phase 2 で記述したゴール文
- `{影響分析書}`: 影響分析書の全文（セクション1-5）
- `{設計対象の単位}`: Phase 1.2 で確認した設計単位の名称と含む変更ID
- `{先行設計書}`: Phase 1.2 で検出した先行設計書のセクション1-3。なければ空
- `{関連コード調査結果}` は空にする

### パスB（Research結果あり）の場合

```
// 3エージェントを並列起動
Agent(name="design-greenfield", subagent_type="greenfield-architect",
  prompt=design-prompt.md の変数を埋めたもの)
Agent(name="design-brownfield", subagent_type="brownfield-architect",
  prompt=design-prompt.md の変数を埋めたもの)
Agent(name="design-domain", subagent_type="domain-first-architect",
  prompt=design-prompt.md の変数を埋めたもの)
```

変数の埋め方:
- `{要求仕様}`: 要求仕様書の内容またはテキスト
- `{ゴール}`: Phase 2 で記述したゴール文
- `{影響分析書}` と `{設計対象の単位}` と `{先行設計書}` は空にする
- `{関連コード調査結果}`: Research結果

### 3エージェント共通

3エージェントとも同じプロンプトを受け取る。各エージェントの設計哲学（エージェント定義）が出力の違いを生む。

### 設計案の保存

3エージェントの出力が揃ったら、各設計案を個別ファイルとして保存する。ファイル名は成果物パスの `.md` の前に接尾辞を付与する。

| エージェント | 接尾辞 | ファイル名例 |
|-------------|--------|-------------|
| greenfield-architect | `-greenfield` | `implementation-design-greenfield.md` |
| brownfield-architect | `-brownfield` | `implementation-design-brownfield.md` |
| domain-first-architect | `-domain` | `implementation-design-domain.md` |

成果物パスが `implementation-design-{単位名}.md` の場合は `implementation-design-{単位名}-greenfield.md` のようになる。

各ファイルにはセクション1（ゴール、Phase 2 で記述済み）とエージェント出力（セクション2-6）を含める。ヘッダーにどの視点の設計案かを明記する:

```markdown
# 実装設計書: {タイトル}（Greenfield案）

## 1. ゴール

{Phase 2 で記述したゴール文}

{エージェントの出力（セクション2-6）}
```

## Phase 4: 統合（3案から最適案を生成）

3つの設計案が出揃ったら、`references/synthesis-prompt.md` を読み込み、変数を埋めて `design-synthesizer` に統合を依頼する。

```
Agent(
  subagent_type="design-synthesizer",
  prompt=synthesis-prompt.md の
    {greenfield_design} と {brownfield_design} と {domain_first_design} と
    {ゴール} と {要求仕様} を埋めたもの
)
```

- `{greenfield_design}`: Phase 3 の greenfield-architect の出力
- `{brownfield_design}`: Phase 3 の brownfield-architect の出力
- `{domain_first_design}`: Phase 3 の domain-first-architect の出力

統合エージェントの出力（セクション2-6）を `implementation-design.md` の末尾に追記する。

## Phase 5: Review（ユーザー確認＆部分再設計）

設計書（セクション1-6）の完成後、ユーザーに確認を求めるループ。

### 5.1 設計書の提示

設計書の主要ポイントを簡潔に提示する:

- 設計判断（セクション2）の各項目タイトルと選択内容を箇条書き
- データ構造（セクション3）の変更概要
- **統合時の判断**: Greenfield案から調整した箇所とその理由（synthesis-prompt のトレードオフ出力から抜粋）

提示後、`AskUserQuestion` で確認を求める:

```
設計書を確認してください: {成果物パス}

各視点の個別設計案も参照できます:
- Greenfield案: {成果物パス（-greenfield接尾辞）}
- Brownfield案: {成果物パス（-brownfield接尾辞）}
- Domain案: {成果物パス（-domain接尾辞）}

修正したい箇所があれば、セクション番号と修正内容を指定してください。
問題なければ「OK」と回答してください。
```

### 5.2 フィードバックの判定

フィードバック内容に「設計判断の変更」が含まれるかで分岐する。名前・値・記述の差し替えは直接編集、「〜のアプローチを変えて」「〜の方がいいのでは」は再設計。迷ったら直接編集を優先する — 不十分なら次のレビューループで再設計に回せる。

| ユーザーの回答 | 判定基準 | アクション |
|---|---|---|
| 「OK」「問題なし」「LGTM」等 | — | Phase 6 へ進む |
| 直接編集で済む修正 | 具体的な値の変更、誤字修正、名称変更、記述の追加・削除など、設計判断の変更を伴わない | メインエージェントが Edit ツールで設計書を直接修正 → 5.1 に戻る |
| 再設計が必要な修正 | 設計方針の変更、構造の見直し、トレードオフの再評価など、設計判断を伴う | 5.3 部分再設計を実行 |

### 5.3 部分再設計

1. フィードバックから修正対象セクションを特定する
2. **追加調査の要否を判定する**: 修正内容が現在のコードベース情報（影響分析書またはResearch結果）でカバーできるか確認する
   - **追加調査が必要な場合**（新たな技術領域やサービスが関係する場合）: `codebase-investigator` で調査を実行し、結果を `{コードベース情報}` に追加する
   - **不要な場合**: そのまま続行
3. `references/revision-prompt.md` を読み込み、変数を埋めて `greenfield-architect` に依頼する

```
Agent(
  subagent_type="greenfield-architect",
  prompt=revision-prompt.md の {現在の設計書} と {ユーザーのフィードバック} と {修正対象セクション} と {コードベース情報} を埋めたもの
)
```

4. Revision エージェントの出力で `implementation-design.md` の該当セクションを置換する
5. 5.1 に戻る（再度ユーザーに確認を求める）

## Phase 6: Planning（実装フェーズ分割）

`references/planning-prompt.md` を読み込み、設計書全体（セクション1-6）を入力として `implementation-planner` に依頼する。

```
Agent(
  subagent_type="implementation-planner",
  prompt=planning-prompt.md の {設計書の内容} を埋めたもの
)
```

Planning エージェントの出力（セクション7: 実装フェーズ）を `implementation-design.md` の末尾に追記する。

## Phase 7: 完了

1. 成果物のファイルパスを案内する（統合版 + 個別3案）
2. ゴールと主要な設計判断の概要を3-5行で提示する
3. **統合の要点**: どの視点の要素が採用されたかを簡潔に示す
4. 次ステップへの案内: 「内容を確認して、問題なければ実装に進みましょう」

## エラーハンドリング

### Research が失敗した場合
- エラー内容をユーザーに報告する
- 調査範囲を絞って再試行するか、手動で情報を補完するか確認する

### Design が失敗した場合（3エージェントのうち1つ以上）
- 成功したエージェントの結果は保持する
- 失敗したエージェントのエラー内容をユーザーに報告する
- **2つ以上成功している場合**: 成功した案のみで統合に進むか確認する
- **1つのみ成功の場合**: その案を単独で採用するか、失敗エージェントを再試行するか確認する

### 統合が失敗した場合
- エラー内容をユーザーに報告する
- 3案の情報量が多すぎる場合、各案のセクション2（設計判断）のみに絞って統合を再試行する
- 再試行後にセクション3-6を個別に生成する

### Revision が失敗した場合
- エラー内容をユーザーに報告する
- 修正範囲が広すぎる場合、セクション単位に分割して再試行する
- 整合性の問題が解決できない場合、該当セクション全体を再生成する

### Planning が失敗した場合
- エラー内容をユーザーに報告する
- Design の出力が十分な情報を含んでいるか確認する

### 中断からの再開
- 成果物ファイルが既に存在する場合、ユーザーに上書きするか確認する
