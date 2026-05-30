# フレームワーク対応表

`security-audit` スキルが「どのコンポーネント種別に、どの公開フレームワーク／チェックリストを使うか」を引くための対応表と、各フレームワークの取得元カタログ。

**設計意図**: フレームワークの中身（要件・チェック項目の本文）はここに展開しない。名称・正規ソース URL・適用のコツだけを持ち、実際の要件は監査時に `framework-auditor` が URL からフェッチする。これにより本家のバージョンアップに自動追従でき、更新作業はこの表の編集だけで済む。

## 目次
- [使い方](#使い方)
- [対応表（種別 → フレームワーク）](#対応表種別--フレームワーク)
- [フレームワーク・カタログ](#フレームワークカタログ)
- [取得性の注意](#取得性の注意)

## 使い方

- **オーケストレーター（SKILL.md）**: 段階3で各コンポーネントの判定種別をこの「対応表」に照合し、`主軸` と必要なら `補助レンズ` を作業項目に割り当てる。
- **framework-auditor**: 割り当てられた 1 フレームワークについて「カタログ」の `discovery URL` で現在の構成を把握し、`raw URL パターン` で要件本文をフェッチして監査する。`適用のコツ` はそのフレームワーク固有の進め方。

主軸（準拠チェックに直結する要件・コントロール）を必ず1つ以上割り当てる。補助レンズ（リスク分類・ガイダンス）は、主軸でカバーしきれない観点を補う場合にのみ追加する（むやみに増やさない）。

## 対応表（種別 → フレームワーク）

| コンポーネント種別 | 主軸（準拠チェック） | 補助レンズ（観点補強） |
|---|---|---|
| Web アプリ / バックエンドサービス | OWASP ASVS | OWASP Top 10、OWASP Proactive Controls |
| Web API（REST/GraphQL/RPC） | OWASP API Security Top 10 ＋ ASVS（API・認証・認可章） | OWASP Top 10 |
| モバイルアプリ（iOS / Android） | OWASP MASVS | OWASP MASTG（検証手順）、OWASP Mobile Top 10 |
| LLM / 生成 AI 組込み | OWASP Top 10 for LLM Applications | OWASP AI Exchange、MITRE ATLAS |
| 機械学習パイプライン / 自前モデル | OWASP ML Security Top 10 | MITRE ATLAS、OWASP AI Exchange |
| IaC（Terraform 等）/ クラウド設定 | CIS Benchmark コントロール（Prowler compliance JSON 経由でクラウド別に取得） | OWASP IaC Security Cheat Sheet、Checkov/Trivy ルール索引（既知ミス参照） |
| コンテナ / Kubernetes マニフェスト | CIS Kubernetes Benchmark（kube-bench cfg YAML 経由） | OWASP Kubernetes Top Ten、NSA/CISA K8s Hardening |
| Dockerfile / コンテナイメージ | OWASP Docker Top 10 ＋ Trivy/Checkov の Docker ルール | OWASP Docker Security Cheat Sheet |
| CI/CD パイプライン定義 | OWASP Top 10 CI/CD Security Risks | — |
| 言語横断の汎用コード（種別が絞れない時の優先度付け） | CWE Top 25 | — |

**複数種別の合算**: 1 つのコンポーネントが複数種別に該当する場合（例: モバイルアプリ＋バックエンド API を含む）、該当する全種別の主軸を割り当てる。種別ごとに作業項目（＝サブエージェント）を分ける。1 サブエージェントには必ず 1 フレームワークだけを渡す。

**要件ベース・フレームワークの重複回避**: 同一スコープに複数の要件ベース・フレームワークを当てると守備範囲が重なる（典型は Web API の ASVS と API Security Top 10。認可・入力検証・暗号などが両方で出る）。この場合は **片方を網羅主軸、もう片方を固有項目に絞る** ことで冗長な全件パスを避ける。各フレームワークの「適用のコツ」に絞り込み方針を記載しているので従う。重複して検出された違反は段階5でマージするが、そもそも二重監査のコストを払わないのが望ましい。

## フレームワーク・カタログ

各エントリの `raw URL パターン` の `<...>` は監査時に `discovery URL`（リポジトリの index/README/ディレクトリ）から解決する。**ブランチ／タグは取り違えに注意**（リポジトリごとに `master`／`main` が異なる）。再現性が要る場合はリリースタグ固定を優先する。

### OWASP ASVS（Application Security Verification Standard）
- 対象: Web アプリ全般の検証要件（最も網羅的・要件ベース）
- 推奨バージョン: v5.0.0 系（タグ固定推奨）
- discovery: `https://github.com/OWASP/ASVS/tree/v5.0.0/5.0/en`
- raw URL パターン: `https://raw.githubusercontent.com/OWASP/ASVS/v5.0.0/5.0/en/<0xNN-VN-Topic>.md`（章単位。JSON/CSV 版も同タグ配下）
- 粒度: `V6.2.1` 形式の階層化要件 ID。各要件に検証レベル L1〜L3
- 取得性: フェッチ容易（raw md）
- 適用のコツ: 既定の目標レベルは **L2**（標準）。まず章（V1〜）単位で関連／非該当を判定し、関連章のみ要件 ID まで掘る。全要件を機械的に舐めない。

### OWASP Top 10（2021）
- 対象: Web アプリの代表的リスク（粗い粒度・優先度付け／教育向け）
- discovery: `https://github.com/OWASP/Top10/tree/master/2021/docs/en`
- raw URL パターン: `https://raw.githubusercontent.com/OWASP/Top10/master/2021/docs/en/A01_2021-Broken_Access_Control.md`（A01〜A10）
- 粒度: `A01:2021`〜`A10:2021` の 10 カテゴリ。個別要件 ID なし
- 取得性: フェッチ容易（raw md）
- 適用のコツ: 補助レンズ専用。ASVS で拾った違反のリスク分類・優先度付けに使う。単独の準拠判定には使わない。

### OWASP API Security Top 10（2023）
- 対象: Web API 固有リスク
- discovery: `https://owasp.org/API-Security/editions/2023/en/0x11-t10/`（一覧 `0x11-t10.md`）
- raw URL パターン: `https://raw.githubusercontent.com/OWASP/API-Security/master/editions/2023/en/0xa1-broken-object-level-authorization.md`（`0xa1`〜`0xaa`）
- 粒度: `API1:2023`〜`API10:2023` の 10 項目
- 取得性: フェッチ容易（raw md）
- 適用のコツ: **ASVS と併用する場合は API 固有項目に限定する**: BOLA(API1)/BOPLA(API3)/BFLA(API5) の認可崩れ、無制限なリソース消費(API4)、機微な業務フローの無制限利用(API6)、危険な上流 API 消費(API10)。汎用の入力検証・インジェクション・暗号・セッション・機密管理は ASVS が網羅するので**重複して監査しない**（冗長な全件パスを避ける）。ASVS を併用しない単独主軸の場合のみ全 10 項目を見る。

### OWASP Proactive Controls（v4）
- 対象: 開発者向けの予防コントロール
- discovery: `https://github.com/OWASP/www-project-proactive-controls/tree/master/docs/the-top-10`
- raw URL パターン: `https://raw.githubusercontent.com/OWASP/www-project-proactive-controls/master/docs/the-top-10/c1-accesscontrol.md`（`c1`〜`c10`）
- 粒度: `C1`〜`C10` のコントロール単位
- 取得性: フェッチ容易（raw md）
- 適用のコツ: 補助レンズ。「実装すべき対策が欠けているか」の観点補強に使う。

### OWASP MASVS（Mobile Application Security Verification Standard）
- 対象: iOS / Android 共通のモバイル要件標準
- 推奨バージョン: v2.1.0 系
- discovery: `https://github.com/OWASP/masvs/tree/master/controls`、`https://mas.owasp.org/MASVS/`
- raw URL パターン: `https://raw.githubusercontent.com/OWASP/masvs/master/controls/MASVS-<CATEGORY>-<n>.md`（CATEGORY: STORAGE/CRYPTO/AUTH/NETWORK/PLATFORM/CODE/RESILIENCE/PRIVACY、計約 24 件）
- 粒度: `MASVS-STORAGE-1` 形式の要件 ID（v2 系は方針レベルの粗め）
- 取得性: フェッチ容易（raw md、ブランチは `master`）
- 適用のコツ: モバイルの主軸。検証手順の詳細が必要なら補助で MASTG（`https://github.com/OWASP/mastg`、`MASTG-TEST-XXXX`）を引く。

### OWASP Mobile Top 10
- 対象: モバイル特有リスクの優先度付け
- discovery: `https://owasp.org/www-project-mobile-top-10/2023-risks/`
- raw URL パターン: `https://raw.githubusercontent.com/OWASP/www-project-mobile-top-10/master/index.md`（M1〜M10 へのリンク集中心）
- 取得性: 取得可だが整形必要（本文は個別ページ寄り）
- 適用のコツ: 補助レンズ。導入時の優先度付けに留める。

### OWASP Top 10 for LLM Applications（GenAI Security Project）
- 対象: LLM / 生成 AI アプリの運用・統合層
- 推奨バージョン: 2025 版
- discovery: `https://genai.owasp.org/llm-top-10/`、`https://github.com/OWASP/www-project-top-10-for-large-language-model-applications/tree/main/2_0_vulns`
- raw URL パターン: `https://raw.githubusercontent.com/OWASP/www-project-top-10-for-large-language-model-applications/main/2_0_vulns/LLM01_PromptInjection.md`（`LLM01`〜`LLM10`、ブランチ `main`）
- 粒度: `LLM01`〜`LLM10`。各 md に説明・防止策・攻撃例
- 取得性: フェッチ容易（raw md）
- 適用のコツ: LLM 組込みの主軸。プロンプトインジェクション・出力ハンドリング・過剰権限（excessive agency）・機微情報漏洩に集中。

### OWASP ML Security Top 10
- 対象: 機械学習パイプライン / モデル（古典 ML 寄り）
- discovery: `https://github.com/OWASP/www-project-machine-learning-security-top-10`、`https://mltop10.info`
- raw URL パターン: 同リポジトリ内 md（`ML01`〜`ML10`。構成はドラフトのため discovery で確認）
- 取得性: フェッチ容易（raw md、ただしドラフトで構成が安定しきっていない）
- 適用のコツ: 学習データ・モデル成果物を持つコンポーネントの主軸。データ汚染・モデル反転/抽出・敵対的サンプルを見る。

### OWASP AI Exchange（旧 AI Security and Privacy Guide）
- 対象: AI/ML 全般の脅威＋コントロールの包括カタログ
- discovery: `https://owaspai.org`、`https://github.com/OWASP/www-project-ai-security-and-privacy-guide`
- raw URL パターン: `https://raw.githubusercontent.com/OWASP/www-project-ai-security-and-privacy-guide/main/content/ai_exchange/content/docs/<章>.md`（ブランチ `main`、300 ページ超のため章単位で）
- 取得性: フェッチ容易（raw md、章単位フェッチ推奨）
- 適用のコツ: 補助レンズ。LLM Top 10／ML Top 10 で足りない統制・データ・ガバナンス観点を補う。

### MITRE ATLAS
- 対象: AI/ML システムへの敵対的脅威の知識ベース
- discovery: `https://atlas.mitre.org`
- raw URL パターン: `https://raw.githubusercontent.com/mitre-atlas/atlas-data/main/dist/ATLAS.yaml`（全データ単一 YAML）
- 粒度: 戦術 `AML.TA00xx` / 技術 `AML.T0xxx`（ATT&CK 相互参照）
- 取得性: フェッチ容易（構造化 YAML・最も機械可読）
- 適用のコツ: 補助レンズ。AI コンポーネントの脅威モデリング（どの攻撃技術に晒されるか）に使う。

### CIS Benchmarks（クラウド / K8s / Docker）
- 対象: クラウド・コンテナ設定の権威ベンチマーク
- **公式本文は実行時フェッチに不向き**（登録制・PDF）。以下の機械可読な代替を主軸ソースとして使う:
  - クラウド（AWS/GCP/Azure CIS Foundations）: Prowler の compliance JSON
    - discovery/raw: `https://github.com/prowler-cloud/prowler/tree/master/prowler/compliance/<aws|azure|gcp>`（`cis_*.json`）
  - Kubernetes（CIS K8s Benchmark）: kube-bench の cfg YAML
    - discovery/raw: `https://github.com/aquasecurity/kube-bench/tree/main/cfg/cis-1.20/`（`master.yaml`/`node.yaml`/`policies.yaml`、対象 K8s バージョンに合う `cis-1.x` を選ぶ）
- 粒度: 番号付きコントロール（`1.2.1` 等）
- 取得性: 代替経由でフェッチ容易（JSON/YAML）。**「CIS をツールが解釈した実装」であり公式本文の逐語ではない**点を出典に明記する。
- 適用のコツ: IaC/クラウド設定の主軸。Prowler/kube-bench から CIS コントロール ID と確認観点を取得し、それを Terraform/マニフェストの実設定に手動で突合する（スキャナを実行するのではなく、コントロールを基準に設定を読む）。

### Checkov / Trivy ルール索引
- 対象: IaC 設定ミスの既知パターン（Terraform/CFN/K8s/Dockerfile/Helm 等）
- discovery/raw: Checkov `https://raw.githubusercontent.com/bridgecrewio/checkov/main/docs/5.Policy%20Index/all.md`（カテゴリ別 md も同階層）／Trivy `https://github.com/aquasecurity/trivy-checks`
- 粒度: `CKV_AWS_*` / `AVD-AWS-0086` 形式の ID
- 取得性: フェッチ容易（raw md／Rego）
- 適用のコツ: 補助レンズ。1000+ ルールを全件舐めない。CIS で挙がった観点や対象リソース種別に関連するルールだけ既知ミス事典として参照する。

### OWASP Kubernetes Top Ten
- 対象: Kubernetes エコシステムのリスク優先度付け
- discovery/raw: `https://raw.githubusercontent.com/OWASP/www-project-kubernetes-top-ten/master/index.md`（`K01`〜`K10`、章別 md は `2025/en/src/` 配下）
- 取得性: フェッチ容易（raw md）
- 適用のコツ: 補助レンズ。CIS K8s Benchmark の設定チェックでは出にくい運用・サプライチェーン観点を補う。

### OWASP Docker Top 10
- 対象: コンテナ環境設計の 10 コントロール
- discovery/raw: `https://github.com/OWASP/Docker-Security`（`D01`〜`D10`）
- 取得性: フェッチ容易（raw md）
- 適用のコツ: Dockerfile/イメージの主軸（CIS Docker は登録制のため）。Trivy/Checkov の Docker ルールで具体的設定ミスを補う。

### OWASP Top 10 CI/CD Security Risks
- 対象: CI/CD・IaC パイプライン
- discovery/raw: `https://github.com/OWASP/www-project-top-10-ci-cd-security-risks`（`CICD-SEC-1`〜`10`）
- 取得性: フェッチ容易（raw md）
- 適用のコツ: `.github/workflows`、`.gitlab-ci.yml`、`Jenkinsfile` 等が存在する場合の主軸。

### CWE Top 25（2024）
- 対象: 言語横断の脆弱性タイプ優先度（種別が絞れない汎用コード）
- discovery: `https://cwe.mitre.org/top25/archive/2024/2024_cwe_top25.html`
- 粒度: `CWE-79` 等の CWE-ID で 25 件ランク付け
- 取得性: 取得可だが整形必要（HTML テーブル）
- 適用のコツ: 主軸が定まらないコードの足場。CWE-ID で違反を分類し優先度を付ける。単独では浅いので、種別が判明したら本来の主軸に切り替える。

## 取得性の注意

- **タグ／ブランチのピン留め**: `master`/`main` 追従は最新だが破壊的変更のリスクあり。ASVS（`v5.0.0`）など安定タグがあるものはタグを優先。`main` 追従のもの（LLM Top 10・AI Exchange・ATLAS）はディスカバリで現構成を確認してからフェッチする。
- **フェッチ失敗時のデグレード**: URL 取得に失敗した場合、`framework-auditor` は自身の学習知識で当該フレームワークの監査を試み、出典に「バージョン未確認（フェッチ失敗）」と必ず明記する。沈黙して進めない。
- **取得困難な権威文書**（CIS 公式 PDF、NIST AI RMF、Google SAIF、NSA K8s ガイド）: 直接フェッチを試みず、上表の機械可読な代替（Prowler/kube-bench 等）か補助レンズで代替する。
