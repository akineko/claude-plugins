---
name: prompt-engineer
description: AI向け指示文書（CLAUDE.md / AGENTS.md / .claude/rules/*.md / SKILL.md / サブエージェント定義 / システムプロンプト等）を新規作成またはレビューして改善するスキル。Anthropic公式のプロンプトエンジニアリング原則に基づき、曖昧さの除去・具体性・適切な構造化・サイズの最適化を行う。ユーザーが「CLAUDE.md を作って」「AGENTS.md を書いて」「このルールファイルをレビュー」「エージェントのシステムプロンプトを改善」「プロンプトを最適化」「指示が効いてない」と言ったとき、あるいは CLAUDE.md / AGENTS.md / .claude/agents/*.md / .claude/skills/*/SKILL.md / .claude/rules/*.md / .cursorrules / .windsurfrules / Claude.ai プロジェクト指示など、AI に読ませる目的の文書ファイルの作成・編集・レビューを依頼されたときに使う。
---

# Prompt Engineer

AI（特に Claude）に向けて書かれる指示文書を、プロフェッショナルとして作成・レビューする。

## 1. 対象ファイルと判断基準

ユーザーの依頼を受けたら、まず**どのファイルタイプか**を確定する。種類によって「何を含めるべきか」「サイズの目安」「配置」が異なる。

| ファイル | 場所 | 主な目的 | 読み手 |
|---|---|---|---|
| `CLAUDE.md` | プロジェクトルート / `~/.claude/` / 親ディレクトリ | プロジェクトまたはユーザーの永続指示。毎セッションフルロード | Claude Code |
| `CLAUDE.local.md` | プロジェクトルート（`.gitignore` 推奨） | 個人のプロジェクト固有指示 | Claude Code |
| `AGENTS.md` | プロジェクトルート | コーディングエージェント共通指示（業界標準） | Claude Code, Codex, Cursor, Windsurf 等 |
| `.claude/rules/*.md` | プロジェクト内 | `paths:` フロントマターでスコープ可能なルール | Claude Code |
| `.claude/skills/<name>/SKILL.md` | プロジェクト / `~/.claude/skills/` / プラグイン | オンデマンドでロードされる手順・知識 | Claude Code |
| `.claude/agents/<name>.md` | プロジェクト / `~/.claude/agents/` | サブエージェントのシステムプロンプト | Claude Code（サブエージェント呼出時） |
| Claude.ai プロジェクト指示 | Claude.ai 上 | チャット内で毎回挿入されるカスタム指示 | Claude.ai |
| API システムプロンプト | コード内 | API 経由の対話の全前提 | API 経由の Claude |

不明な場合はユーザーに確認するか、リポジトリの構成（`ls -la`、`.claude/` の中身、既存の `CLAUDE.md` の有無等）を見て推測する。

## 2. 中核原則（Anthropic 公式に基づく）

すべての種類に共通する 8 原則。新規作成でもレビューでもこの観点で判断する。

### 2.1 Be clear and direct

> **Golden rule**: 同僚にプロンプトを見せて、追加説明なしで実行できるか聞く。混乱するなら Claude も混乱する。

- 抽象的な「適切に整形」より具体的な「2 スペースインデント」
- 順序や網羅性が重要な手順は番号付きリストか箇条書きで
- 「Claude を、優秀だが背景知識のない新人として扱う」発想で書く

### 2.2 Add context — なぜを説明する

Claude は理由を渡すと、未知のエッジケースにも応用できる。一方、理由のない禁止は機械的にしか効かない。

- ❌ `NEVER use ellipses`
- ✅ `Your response will be read aloud by a TTS engine, so never use ellipses since the engine will not know how to pronounce them.`

レビュー時は「この指示の根拠は文書に書かれているか？」を確認する。

### 2.3 Tell what to do, not what not to do

否定形より肯定形のほうが安定して効く。

- ❌ `Do not use markdown`
- ✅ `Write in smoothly flowing prose paragraphs`

### 2.4 Examples are the strongest steer

出力形式・トーン・構造を制御したいなら例を入れる。

- **3〜5 個が目安**。Anthropic も Google も同水準を推奨
- **多すぎは逆効果**（"over-prompting"）。学術的にも、例を 10 個以上に増やすと一部のタスクでむしろ精度が落ちる現象が観測されている。迷ったら少なめ
- **数より質**：形式・粒度・難度がそろった高品質な例を厳選するほうが、似た例を量産するより効く
- 実際のユースケースに近く、エッジケースを含めて多様に
- 各例を `<example>` タグで囲み、複数なら `<examples>` でラップ
- すべての例で入出力フォーマット（フィールド名・順序・記号）を完全に統一する。形式の揺れは Claude を惑わせる

### 2.5 Structure with XML tags or Markdown

- **API/システムプロンプト**: 指示・コンテキスト・例・入力を XML タグ（`<instructions>`, `<context>`, `<examples>`, `<input>`）で分離。ネストして良い
- **CLAUDE.md / SKILL.md / AGENTS.md など人間も読む文書**: Markdown 見出しと箇条書き
- 長文コンテキスト（20k+ トークン）を渡す場合は「データを上、指示を下」に置くと精度が最大 30% 改善する

### 2.6 Scope explicitly — Opus 4.7+ はリテラルに従う

Opus 4.7 は指示を字義通り解釈し、勝手な一般化をしない。広く適用してほしいなら範囲を明示する。

- ❌ `Apply this formatting`
- ✅ `Apply this formatting to every section, not just the first one`

### 2.7 Avoid overtriggering language

Claude Opus 4.5+ は強い言葉に過敏に反応する。`CRITICAL: You MUST...` のような語気は過剰トリガー・過剰実行を招く。普通の指示で書く。

- ❌ `CRITICAL: You MUST use this tool when ...`
- ✅ `Use this tool when ...`
- 例外: 本当に違反したら重大事故になる箇所（`NEVER push --force to main` 等）のみ強調語を使う

### 2.8 Be ruthless about size

長いほど守られない。`「この行を消したら Claude がミスをするか？」を全行に問う` ことで剪定する。

| ファイル | 目安 |
|---|---|
| CLAUDE.md | 200 行以下 |
| SKILL.md（本体） | 500 行以下、超える内容は `references/` に分割 |
| AGENTS.md | 一般に 200 行以下 |
| サブエージェント定義 | 200 行以下 |

## 3. ファイルタイプ別の具体ガイダンス

### 3.1 CLAUDE.md

**含めるべき**

- Claude が推測できないビルド・テストコマンド（`pnpm test:integration` 等）
- 言語の標準と異なる独自規約（"semicolons なし"、"named export 禁止" 等）
- リポジトリの作法（branch 命名規則、PR タイトル形式、コミット形式）
- 環境固有の癖（必須環境変数、起動順序、ローカル DB の前提）
- 自明でない罠（"X を変更したら Y も更新"）

**含めるべきでない**

- コードを読めば分かること（ファイル配置、関数の責務、ライブラリの使い方）
- 言語の標準的な慣行（"clean code を書く" 等）
- 詳細な API ドキュメント（URL でリンクする）
- 頻繁に変わる情報（チケット番号、人名、進行中のタスク）
- 自明な実践（"テストを書く"）

**配置の判断**

- チーム共有: `./CLAUDE.md`（git にコミット）
- 個人かつプロジェクト固有: `./CLAUDE.local.md`（`.gitignore` 推奨）
- 個人かつ全プロジェクト: `~/.claude/CLAUDE.md`
- 大規模プロジェクトで部位ごとに分けたい: `.claude/rules/*.md`（`paths:` でスコープ）

**AGENTS.md との関係**

リポジトリに既に AGENTS.md がある場合、CLAUDE.md は次のように書く：

```markdown
@AGENTS.md

## Claude Code 固有
- plan モードを `src/billing/` 配下の変更で使う
```

`@AGENTS.md` で内容を import し、Claude 固有指示だけ追記する。重複させない。

**Markdown 構造化のコツ**

見出しと箇条書きで分割。"# Build", "# Test", "# Code style", "# Workflow" のような topical な分割が読みやすい。

### 3.2 AGENTS.md

複数のコーディングエージェント（Claude Code, Codex, Cursor, Windsurf 等）が共通で読む業界標準。形式は自由（標準 Markdown）。

**推奨セクション**

1. プロジェクト概要 / 技術スタック
2. Setup / Build commands
3. Test commands と CI 観点
4. Code style
5. PR / Commit 規約
6. Security 考慮事項

**例**

```markdown
# AGENTS.md

## Setup
- Install: `pnpm install`
- Dev: `pnpm dev`

## Testing
- Unit: `pnpm test`
- Integration: `pnpm test:int`（ローカル Redis が必要）

## Code style
- TypeScript strict
- single quotes, no semicolons

## PR
- Title: `[<scope>] <summary>`
- 全 CI を通過させる
```

モノレポではパッケージごとに `AGENTS.md` を置ける。最も近いファイルが優先される。

### 3.3 .claude/rules/*.md

YAML frontmatter で `paths:` を指定すると、マッチするファイルを Claude が読むときだけロードされる。CLAUDE.md が肥大化したときの分割先。

```markdown
---
paths:
  - "src/api/**/*.ts"
---

# API ルール
- 入力バリデーション必須
- エラーレスポンスは標準形式
```

`paths:` を省略すると `.claude/CLAUDE.md` と同じ優先度で常時ロードされる。

### 3.4 SKILL.md

オンデマンドでロードされる手順・知識を入れる。Claude は description で関連性を判断するため description が要。

**frontmatter（最低限）**

```yaml
---
name: my-skill              # 省略時はディレクトリ名
description: 何をして、いつ使うか。トリガーフレーズを含める。1536 文字以内推奨
---
```

**description の書き方**

- 「何をするか」と「いつ使うか（トリガーフレーズ）」を両方含める
- 主要ユースケースを冒頭に置く（先頭が切り詰めに耐える）
- トリガーフレーズは実ユーザーが書きそうな表現を複数並べる
- アンダートリガーが多いので、やや「pushy」に書く（"Use this skill whenever ..." 等）

**本体の書き方**

- 500 行以下を目安に
- 詳細なリファレンスは `references/<topic>.md` に分割し、本体から「いつ読むか」を指示
- 一度ロードされた本体は会話の最後まで残るため、毎ターン課金されると思って簡潔に

**任意フィールド**

- `disable-model-invocation: true` — 自動起動禁止（`/commit` `/deploy` のように副作用ある手順）
- `user-invocable: false` — Slash メニューから隠す（背景知識のみ）
- `allowed-tools: Bash(git *)` — そのスキル発動中に承認なしで使えるツール
- `paths:` — マッチするファイル操作時のみ自動ロード

### 3.5 サブエージェント定義（.claude/agents/*.md）

別コンテキストで走るサブエージェントのシステムプロンプト。

```markdown
---
name: security-reviewer
description: コードのセキュリティ脆弱性をレビューする。ユーザーが「セキュリティ観点で見て」と言ったときに使う
tools: Read, Grep, Glob, Bash
model: opus
---

あなたはシニアセキュリティエンジニアです。コードを次の観点でレビューしてください。

- インジェクション脆弱性（SQL, XSS, コマンド）
- 認証・認可の不備
- ハードコードされたシークレット
- 安全でないデータ処理

報告は次の形式で行ってください。
- ファイル:行番号
- 深刻度（high / medium / low）
- 具体的な修正案
```

**ポイント**

- 役割（"You are a ..."）を最初に明確化
- ツール制約を frontmatter で明示
- 出力形式を例示
- 何を report するかと「しないか」を分けて書く

**ロール定義の効きどころと限界**

`You are a senior security engineer` のような専門家ペルソナは、**トーン制御・出力スタイルの統一・複数エージェント間の責務分担**には効く。一方、純粋な事実性向上や推論精度の向上には効果が限定的、ときに逆効果という研究結果が複数出ている（Mollick らの "Playing Pretend"、"When 'A Helpful Assistant' Is Not Really Helpful" 等）。

このため、ロール定義は次のように扱う。

- **使う**: トーン（厳しめ／柔らかめ）、出力フォーマットの選択、責務範囲の宣言（「あなたはレビュアーであり実装者ではない」）
- **使うべきでない**: 「専門家っぽさで賢くする」狙い。代わりに **期待する観点リスト・判断基準・出力フォーマット** を直接書くほうが効果が大きい
- **書くなら 1〜2 文で十分**。長いペルソナ説明は context を消費するわりにリターンが薄い

**セルフチェックを組み込む**

定型ミスを減らす低コストのテクニックとして、出力直前のセルフチェック指示が有効。指示文書の末尾に 1 文だけ入れる：

> 報告を出力する前に、検出した High 指摘がそれぞれ `ファイル名:行番号` と具体的な修正案を持っているか確認する。満たさないものは Medium に降格するか除去する。

これは CoT より軽量で、サブエージェント定義・システムプロンプトに直接組み込みやすい。

### 3.6 汎用システムプロンプト（API / Claude.ai プロジェクト）

API システムプロンプトや Claude.ai のカスタム指示は、構造化が効く。

**推奨セクション**

1. **役割**（Role）— "You are a ..."。§3.5 のロール定義の効きどころ／限界をふまえて短く
2. **タスクと文脈**（Task & Context）— 何のためか、誰のためか
3. **制約・トーン**（Constraints, Tone）
4. **出力形式**（Output format）— XML タグや例で示す
5. **例**（Examples）— 複雑な場合は 3〜5 個（§2.4 の "over-prompting" 注意つき）

長文を渡すなら「データを上、指示を下」に置く。複数ドキュメントは `<documents><document index="1"><source>...<document_content>...` でラップして、回答前に関連箇所を `<quotes>` に引用させると精度が上がる。

**Chain-of-Thought（CoT）を明示するか**

Anthropic Claude 4.6 / 4.7 は adaptive thinking を内蔵しており、推論タスクで `Let's think step by step` を明示的に書かなくても適切に思考量を調整する。**adaptive thinking が動いている文脈で CoT を強制すると、不要な思考を誘発してトークンを浪費する**ことがあるため、Claude 向けの普通のプロンプトでは基本的に書かない。

CoT を明示する価値があるのは次のケース：

- API で `thinking: {type: "disabled"}` の場合、または GPT 系・他社モデル向けプロンプトを書いている場合
- 「思考プロセスを外向きに見せたい」場合（教育用途・監査ログ用途）
- 多段の判断基準を `<thinking>` `<answer>` のように分けて構造化出力させたい場合

書くなら：

> Before finalizing your answer, walk through the problem step by step inside `<thinking>` tags, then output your final answer inside `<answer>` tags.

汎用の "step by step" より、**何を確認するか**（チェックリスト形式）を `<thinking>` 内で指示するほうが安定する。

## 4. ワークフロー

### 4.1 新規作成依頼の場合

1. **対象ファイルを確定**。種類が曖昧ならユーザーに確認するか、リポジトリ状況を見て推測する。
2. **入力情報を集める**。リポジトリ構造、既存ファイル、`@AGENTS.md` の有無、ユーザーが伝えた要望。
3. **ファイルタイプの判断基準を適用**して「含めるべき」「含めるべきでない」を選別する。
4. **ドラフトを書く**。中核原則 8 つを適用しながら書く。
5. **自己レビュー**：第 5 節のチェックリストを通す。
6. **出力**。判断の理由を簡潔に補足する（特に何を意図的に省いたか）。

### 4.2 レビュー依頼の場合

1. **対象ファイル + 関連レイヤー**を読む。CLAUDE.md と CLAUDE.local.md、AGENTS.md、`.claude/rules/` の重複や矛盾を確認する。
2. **チェックリスト**（第 5 節）で評価する。
3. **改善案を優先度付きで提示**する。Anthropic 原則のどれに該当するかを根拠として示す。
4. **ユーザーが「修正して」と言ったら**該当箇所を編集する。指示がない段階で勝手にファイルを書き換えない。

## 5. レビューチェックリスト

新規作成・レビューのどちらでも、最後にこれを通す。

**含有性**
- [ ] ファイルタイプの「含めるべきでない」項目（コードから読める情報、頻繁に変わる情報、自明な実践、詳細 API ドキュメント等）が混じっていないか
- [ ] 「含めるべき」項目（推測不可能なコマンド、独自規約、罠）が欠けていないか

**明確性**
- [ ] "appropriately", "properly", "good" のような曖昧語が残っていないか
- [ ] 順序や網羅性が重要な箇所がリスト化されているか
- [ ] 重要な指示で WHY（理由）が補足されているか
- [ ] 否定形（"Don't / Never"）が肯定形に書き換え可能でないか
- [ ] スコープが暗黙の指示（"every", "only", "when ..." の補足不足）が残っていないか

**サイズと構造**
- [ ] ファイルタイプの目安サイズに収まっているか（CLAUDE.md 200 行、SKILL.md 500 行 等）
- [ ] 「この行を消したら Claude がミスするか？」テストで残らない行がないか
- [ ] 見出し・箇条書き / XML タグで論理的に区切られているか
- [ ] CLAUDE.md と AGENTS.md・`.claude/rules/` で内容が重複していないか

**トリガー語気**
- [ ] `CRITICAL`, `ALWAYS`, `NEVER`, `MUST` の使用は最小限か（本当に重大な不可逆操作のみ）
- [ ] 過剰な強調がオーバートリガー（実行しすぎ・確認しすぎ）を起こさないか

**ファイル種別の追加チェック**

- **SKILL.md**: description にトリガーフレーズが含まれ、何をするか + いつ使うかの両方が書かれているか
- **サブエージェント定義**: 役割・ツール・出力形式が明示されているか。「専門家ペルソナで賢くなる」期待の長い persona 記述になっていないか（§3.5 の限界参照）。セルフチェック指示が末尾にあるか
- **CLAUDE.md**: AGENTS.md が併存する場合、`@AGENTS.md` 等で重複回避できているか
- **Examples を含む文書**: 例の数が 3〜5 個に収まっているか（10 個以上の "over-prompting" になっていないか）、入出力フォーマットが完全に統一されているか

## 6. 出力形式

### 新規作成

最終ファイル全体を提示する。そのあとに、簡潔な「設計メモ」を付ける。

```
[ファイル全体]

---
設計メモ:
- 〜 を意図的に省略した（標準的な言語慣行であり、CLAUDE.md に書く価値がない）
- 〜 を強調語で書いた（不可逆操作のため）
```

### レビュー

優先度付きで提示する。

```
## レビュー結果: <ファイルパス>

### 改善推奨（高）
1. [問題] <該当箇所>
   - 根拠: <Anthropic 原則 / チェック項目>
   - 改善案: <具体的な修正案>

### 検討事項（中）
...

### 良い点
- <維持すべき判断>
```

修正案は **diff か書き換え後の文** で示す。「整理しましょう」のような抽象表現は避ける。

## 7. ハマりがちな失敗パターン

これらに該当する出力を出していないか、最後に自己確認する。

- **過剰指示**: `ALWAYS / NEVER / MUST / CRITICAL` の多用 → 普通の表現に直す
- **WHY 欠落**: 機械的禁止が並ぶ → 根拠を 1 行追記
- **冗長**: コードから自明な内容を書く → 「消したらミスする？」で剪定
- **重複**: AGENTS.md と CLAUDE.md に同じ Setup を書く → 片方が import する形に
- **古い情報**: チケット番号、進行中タスク、特定の人名 → 書かない
- **スコープ曖昧**: "Apply this rule" → "Apply this rule to every API handler in `src/api/`"
- **DON'T 列挙**: 「これをするな」だけ並ぶ → 「こうする」を書く

## 8. 参考

### Anthropic 公式（一次情報。Claude 向けはここを最優先）

- Prompting best practices: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- Claude Code memory（CLAUDE.md）: https://code.claude.com/docs/en/memory
- Claude Code best practices: https://code.claude.com/docs/en/best-practices
- Claude Code skills: https://code.claude.com/docs/en/skills
- AGENTS.md（業界標準）: https://agents.md

### 業界・学術（採用判断に使った二次情報）

- OpenAI Prompt engineering guide: https://developers.openai.com/api/docs/guides/prompt-engineering
- Google Prompt Engineering Whitepaper（Lee Boonstra, 2024）
- "Playing Pretend: Expert Personas Don't Improve Factual Accuracy"（Mollick ら, SSRN）— ロール定義の効果限界
- "When 'A Helpful Assistant' Is Not Really Helpful: Personas in System Prompts Do Not Improve Performances"（arXiv 2311.10054）
- "The Few-shot Dilemma: Over-prompting Large Language Models"（arXiv 2509.13196）— 例の数の上限

これらが最新の参照点。スキル本体はこの要約だが、エッジケースに当たったら必ず原典を fetch して確認する。Anthropic 公式と業界知見が食い違うときは、**Claude 向けは公式を優先・他社モデル向けは業界知見も参照** という方針で判断する。
