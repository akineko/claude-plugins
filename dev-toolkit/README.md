# dev-toolkit

開発に使える汎用的なスキル・エージェントを提供する Claude Code プラグイン。

要件定義から設計・実装・レビューまでの開発ライフサイクル全体をカバーし、各フェーズに特化したスキルとエージェントを組み合わせて使用する。

## 開発ワークフロー例

```
要求仕様書の作成       /request-spec
        ↓
影響分析書の作成       /impact-analysis
        ↓
実装設計書の作成       /implementation-design  or  /multi-perspective-design
        ↓
フェーズ単位の実装     /task-development
        ↓
コードレビュー         /code-review
        ↓
コミット               /commit
```

各スキルは独立して使用することもできます。
既に設計書がある場合は `/task-development` から直接実装を開始できる。小規模タスクでは設計書なしで `/task-development` に直接要件を渡すこともできる。

## スキル一覧

### 設計

- `/request-spec`
  - PM の要件をセクション単位で整理し、設計や影響分析の為の要求仕様書を作成する
- `/impact-analysis`
  - 要求仕様書からコードベースを調査し、影響範囲・設計制約・依存関係をまとめた影響分析書を作成する
- `/implementation-design`
  - 影響分析書や要件をもとに、選択したアーキテクト（greenfield / brownfield / domain-first）で実装設計書を作成する
- `/multi-perspective-design`
  - 3 つのアーキテクト（greenfield / brownfield / domain-first）が並列で設計案を作成し、統合した最終設計を提示する
- `/design-consultation`
  - 設計依頼の曖昧な点を明確にして `greenfield-architect` に理想設計を委譲する

### 実装

- `/task-development`
  - 設計書のフェーズ指定または直接要件から、FE/BE 開発エージェントを並列実行して TDD ベースで実装する

### レビュー

- `/code-review`
  - 正確性・設計・性能の 3 つの専門レビュアーが並列でレビューし、統合された改善リストを提示する

### 補助

- `/commit`
  - ステージング済みの変更を分析し、Conventional Commits 形式のメッセージを生成してコミットする

## エージェント一覧

### 設計アーキテクト

3 つの異なる設計哲学を持つアーキテクトエージェント。`/implementation-design` や `/multi-perspective-design` から呼び出される。

- `greenfield-architect`
  - 既存実装や移行コストを考慮せず、要件を満たす最もシンプルな設計を提案する
- `brownfield-architect`
  - 既存コードベースを最大限活かし、費用対効果の高い現実的な最善案を提案する
- `domain-first-architect`
  - ドメインモデルの明瞭さと概念境界の一貫性を最優先に設計する

### 設計支援

- `code-investigation-specialist`
  - 機能追加・リファクタリング・バグ修正の計画に向けたコードベース調査を行う
- `design-synthesizer`
  - 複数の設計案を統合し、各視点の長所を活かした最適な設計を生成する
- `implementation-planner`
  - 詳細設計を 1 コミット単位のフェーズに分割した実装計画を立案する

### コードレビュアー

3 つの品質軸に特化したレビュアーエージェント。`/code-review` から呼び出される。

- `correctness-reviewer`
  - ロジックの誤り、境界条件、例外処理、型安全性
- `architecture-reviewer`
  - 責務分離、依存関係、命名、変更容易性、既存パターンとの整合性
- `performance-reviewer`
  - 計算量、DB 効率、メモリ使用、レンダリング性能、障害時の解析性

### タスク開発

TDD ベースの実装を担うエージェント群。`/task-development` から呼び出される。

- `td-task-designer`
  - 設計書なしの小規模タスク向けに、FE/BE のタスク分割と依存関係を含む実装計画を策定する
- `td-backend-developer`
  - TDD で API・業務ロジック・永続化・認可を実装する
- `td-frontend-developer`
  - TDD でコンポーネント・画面・状態管理・データ取得を実装する
- `td-test-runner`
  - プロジェクト全体のテストを実行し、結果を構造化して報告する
- `td-requirements-reviewer`
  - 実装結果が元の要件・設計書を満たしているかを検証する
