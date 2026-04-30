# project-bootstrap

新規 Web サービスのプロジェクト立ち上げ期に、AI と協働して開発を進めるための土台ドキュメントを対話的に作成する Claude Code プラグイン。

## 想定する利用シーン

- 小中規模の PoC または受託開発
- 限定公開（契約会社・受託元のみ利用）の Web サービス
- 機能設計・実装に入る前に、技術選定・アーキテクチャ・運用方針などを AI と整理しておきたい場合

## スキル一覧

| スキル | 用途 |
|---|---|
| `/project-bootstrap:project-overview` | プロジェクト概要書（目的・利用者・スコープ・機能要件・非機能要件）を対話的に作成 |
| `/project-bootstrap:architecture-design` | システムアーキテクチャ設計書を対話的に作成 |
| `/project-bootstrap:security-design` | セキュリティ設計書を対話的に作成 |
| `/project-bootstrap:infra-design` | インフラ・デプロイ設計書を対話的に作成 |
| `/project-bootstrap:repository-environment` | リポジトリ・開発環境設計書を対話的に作成 |
| `/project-bootstrap:directory-structure` | パッケージ単位でディレクトリ構成設計書を作成 |
| `/project-bootstrap:test-strategy` | テスト戦略書を対話的に作成 |
| `/project-bootstrap:adr` | ADR の初期生成・追加・更新を行う |

## 推奨フロー

```
1. project-overview        プロジェクト概要書（全体の起点）
        ↓
2. architecture-design     アーキテクチャ
        ↓
3. security-design         セキュリティ
4. infra-design            インフラ・デプロイ
5. repository-environment  リポジトリ・開発環境
        ↓
6. directory-structure     ディレクトリ構成（パッケージ単位、必要な数だけ）
        ↓
7. test-strategy           テスト戦略
        ↓
8. adr                     ADR の初期生成（以降は随時追加）
```

各スキルは上流ドキュメントを自動検出し、整合性を確認しながら増分的に更新する。途中で保留・再開できる設計。

## ドキュメント配置例

各設計書は `docs/` 配下に作成される（具体的なパスは各スキル内で決定）。

```
docs/
├── project-overview.md
├── architecture.md
├── security.md
├── infrastructure.md
├── repository-environment.md
├── directory/
│   ├── web.md
│   └── api.md
├── test-strategy.md
└── adr/
    ├── README.md
    ├── 0001-use-nextjs.md
    └── 0002-...
```

## 設計方針

- **TDD 前提**: 実装段階で AI と TDD で進めることを想定し、テスト戦略では「なぜテストするか」を言語化する
- **PoC 適性**: 小中規模・限定公開という前提を反映し、過剰な設計は避ける（IaC 必須化しない、DR を扱わない、E2E は厳選 等）
- **ADR と連動**: 各設計書で技術選定の主要決定を「付録: ADR候補」として収集し、ADR スキルで一括切り出し
- **責務分離**: ドキュメント間で重複しないよう、各設計書のスコープを明確に切り分ける（例: シークレット保管方針はセキュリティ書、保管先の具体名はインフラ書、ローカル運用はリポジトリ書）
