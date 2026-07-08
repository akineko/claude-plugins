# dev-toolkit

開発に使える汎用的なスキル・エージェントを提供する Claude Code プラグイン。

設計書を作るほどではない小規模タスクの実装、コミット・PR 作成などの開発補助、バグの根本原因調査といったスキルを提供する。

## 開発ワークフロー例

```
小規模タスクの実装     /task-development
        ↓
コミット               /commit
        ↓
PR 作成                /pr
```

各スキルは独立して使用することもできます。

## スキル一覧

### 実装

- `/task-development`
  - 要件の直接記述から実装計画を策定し、FE/BE 開発エージェントを並列実行して TDD ベースで実装する。実装設計書を作ってフェーズ単位で進める規模の開発は対象外

### 補助

- `/commit`
  - ステージング済みの変更を分析し、Conventional Commits 形式のメッセージを生成してコミットする
- `/pr`
  - push 済みのカレントブランチから、コミット履歴と差分を分析して GitHub の Pull Request を作成する（未push なら作成せず push を依頼）

### 調査

- `/debug-investigate`
  - バグ・障害の症状から対立仮説を並列検証して根本原因を特定し、修正方針まで提示する。修正の実施は行わない

## エージェント一覧

### 調査支援

- `codebase-investigator`
  - コードベースを調査し、構造・パターン・依存関係・制約などの事実情報を収集・報告する。目的を問わず調査の委譲先として使える
- `hypothesis-investigator`
  - `/debug-investigate` から仮説ごとに並列起動され、反証優先の姿勢で担当仮説を検証し、判定と証拠を構造化して返す

### タスク開発

TDD ベースの実装を担うエージェント群。`/task-development` から呼び出される。

- `td-task-designer`
  - 要件を整理し、FE/BE のタスク分割と依存関係を含む実装計画を策定する
- `td-backend-developer`
  - TDD で API・業務ロジック・永続化・認可を実装する
- `td-frontend-developer`
  - TDD でコンポーネント・画面・状態管理・データ取得を実装する
- `td-test-runner`
  - プロジェクト全体のテストを実行し、結果を構造化して報告する
- `td-requirements-reviewer`
  - 実装結果が元の要件を満たしているかを検証する
