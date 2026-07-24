---
name: pr
description: >
  カレントブランチから GitHub の Pull Request を作成するスキル。
  コミット履歴と差分を分析し、Conventional Commits 形式のタイトルと構造化された本文を生成して `gh pr create` で作成する。
  「PRを作って」「プルリクを作成」「PR出して」「このブランチでPR上げて」「マージリクエスト作って」のような依頼で使用する。
  push はユーザーが事前に行う前提のため、未push の場合は作成せず push を依頼する。
argument-hint: "[マージ先ブランチや追加指示（省略可）]"
context: fork
background: false
---

# Create PR

カレントブランチのコミット履歴と差分を分析し、Conventional Commits 形式のタイトルと構造化された本文を生成して GitHub の Pull Request を作成する。

push はユーザーが事前に行う前提なので、このスキルは push しない。未push を検知したら作成を中止して push を依頼する。

## ワークフロー

### Step 1: 前提条件の確認

以下を順に確認し、満たさない場合は **PR を作成せず** 理由を添えて終了する。

1. **カレントブランチの取得** — `git rev-parse --abbrev-ref HEAD`
   - デフォルトブランチ（main 等）上にいる場合、PR の head にできない。別ブランチへの切り替えを促して終了する。

2. **push 状態の確認**（このスキルの要）— カレントブランチがリモートに push 済みで、ローカルの未push コミットが無いことを確認する。

   ```bash
   branch=$(git rev-parse --abbrev-ref HEAD)
   # upstream の remote 名を解決（無ければ origin を仮定）
   remote=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null | cut -d/ -f1)
   remote=${remote:-origin}
   # リモート上のブランチ先端と、未push コミットの有無
   git ls-remote --heads "$remote" "$branch"
   git rev-list --count "$remote/$branch..HEAD" 2>/dev/null
   ```

   - リモートにブランチが存在しない、または未push コミットがある（`rev-list --count` が 0 でない）場合 → **push を依頼して終了する**。実行すべきコマンド（例: `git push -u origin <branch>`）を添える。自分では push しない。

### Step 2: マージ先（base）ブランチの決定

- ユーザーが base を明示した場合 → それに従う。
- 省略時 → GitHub に設定されたデフォルトブランチを使う。
  ```bash
  gh repo view --json defaultBranchRef -q .defaultBranchRef.name
  ```
  これにより、デフォルトブランチが main から変更されているリポジトリでも正しい base になる。
- head（カレントブランチ）と base が同一なら作成できない。その旨を伝えて終了する。

### Step 3: 既存 PR の確認

カレントブランチに対する open な PR が既にあれば、**重複作成せず** その URL を案内して終了する。

```bash
gh pr list --head "$branch" --state open --json number,url,title
```

### Step 4: 変更内容の分析と本文生成

base からの差分を分析する。GitHub の PR 画面に表示される差分と揃えるため、コミット履歴は `base..HEAD`、ファイル差分は `base...HEAD`（マージベース起点）で見る。

```bash
git log --no-merges <base>..HEAD --pretty='%s%n%b'   # コミット履歴
git diff <base>...HEAD --stat                          # 変更ファイル一覧
```

必要に応じて差分本体も確認し、変更の意図と全体像を把握する。

#### PR テンプレートの尊重

`.github/PULL_REQUEST_TEMPLATE.md`（または `.github/pull_request_template.md`、`.github/PULL_REQUEST_TEMPLATE/` 配下、リポジトリルートや `docs/` の同名ファイル）が存在する場合は、**そのテンプレートの構造を骨子として本文を埋める**。テンプレートのチェックリストやコメント（`<!-- -->`）の指示にも従う。テンプレートがある場合、以下の既定フォーマットより優先する。

#### タイトル

Conventional Commits 形式（`<type>(<scope>): <summary>`）で、**PR 全体の主目的**を表現する。

- type は変更の主目的で選ぶ（`feat` / `fix` / `refactor` / `docs` / `test` / `chore` / `perf` / `style` / `ci` 等）。複数の性質が混在する場合は最も中心的な目的の type を選ぶ。
- scope は次の優先で決める。
  1. ブランチのコミット群が共通の scope を持つなら、**その scope を踏襲する**。コミットが既に確立した情報を PR タイトルで捨てないため（コミットが `feat(profile):` なら PR も `feat(profile):`）。
  2. コミットに scope が無い場合は、monorepo のときのみパッケージ名を scope に付ける。
  - type と「scope が無いときの付け方」の基本は同プラグインの `commit` スキルの規約に従う。上記の踏襲（1）は PR がコミットを集約する際の追加規約。
- summary は変更の本質を簡潔に（目安 50 文字以内）。

#### 本文（既定フォーマット）

PR テンプレートが無い場合は、以下の構成で生成する。why（背景・理由）を先に置き、レビュアーが「何のための変更か」を理解してから差分に入れるようにする。

ALWAYS use this exact template（テンプレートが無い場合）:

```markdown
## 概要
<このPRが何を達成するか。1〜2文で端的に>

## 背景・理由
<なぜこの変更が必要か。解決する課題や経緯>

## 主な変更点
- <変更点1>
- <変更点2>

## 確認方法
- <動作確認の手順、またはテスト観点>
```

##### 背景・理由は原則必ず書く

背景・理由はこのフォーマットの中核で、レビュアーが最初に求める情報。差分（what）はコードを読めば分かるが、why はコードに残らない。だから変更の動機・解決する課題・経緯を**必ず**言語化する。コミットメッセージの本文、関連 Issue、ブランチ名などから why を読み取り、無ければ差分の内容から「なぜこれが必要か」を推し量って書く。

省略してよいのは、タイトルだけで why が完全に伝わる trivial な変更（typo 修正・フォーマット調整・単純な文言修正など）に限る。「実装が単純だから」「コードが自明だから」は省略の理由にならない（why は実装の単純さとは無関係）。

##### 確認方法を省略してよいケース

typo・フォーマット・ドキュメントのみの変更など、確認が不要・自明な場合は省略してよい。テストスイートを実行した結果があれば、その要約をここに書く。

本文の言語は、リポジトリの既存コミット・PR の言語に合わせる（判別できない場合は日本語）。

### Step 5: PR の作成

生成したタイトルと本文で PR を作成する。本文は HEREDOC で渡してフォーマットを保持する。

```bash
gh pr create --base <base> --head "$branch" --title "<type>(<scope>): <summary>" --body "$(cat <<'EOF'
## 概要
...

## 背景・理由
...

## 主な変更点
- ...

## 確認方法
- ...
EOF
)"
```

- ユーザーが draft を希望した場合は `--draft` を付ける。
- レビュアー・ラベル・担当者・マイルストーンは、ユーザーが明示的に指定した場合のみ付与する（`--reviewer` / `--label` / `--assignee` / `--milestone`）。

### Step 6: 結果の報告

作成後、以下をユーザーに伝える:

- 作成された PR の URL
- タイトル
- base ← head（マージ先 ← マージ元）
- 本文の要約（または全文）

## 禁止事項

- **push の実行** — 未push の場合はユーザーに依頼する。`git push` は実行しない。
- **ステージング・コミットの実行** — このスキルは push 済みの状態を前提とし、コミット履歴は変更しない。
- **PR 内容の作成前確認** — 合意フォーマットに沿って生成し、確認なしで作成する（前提条件未達による中止は内容確認とは別で、必ず行う）。
- **既存 PR がある場合の重複作成** — 既存 PR の URL を案内する。

## 使用例

```
/pr                       # カレントブランチ → デフォルトブランチへ PR 作成
/pr develop               # マージ先を develop に指定
/pr --draft               # draft PR として作成
/pr レビュアーに @foo を追加  # 追加指示
```
