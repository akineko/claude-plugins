# spec-toolkit

要求・要望の整理から実装までを、5段のパイプラインで進める Claude Code プラグイン。各段は独立したスキルとして提供され、要求仕様書 → 機能設計書 → 影響分析書 → 実装設計書 → 実装、の順に成果物を積み上げる。

## パイプライン全体図

```
[1] request-spec          → docs/plans/<機能名>/request-spec.md (要求仕様書)
[2] feature-options       → 同 feature-options.md (機能設計書)
[3] impact-analysis       → 同 impact-analysis.md (影響分析書)
[4] implementation-design → 同 implementation-design-<バッチスラッグ>.md (実装設計書)
[5] phase-implementation  → コード + テスト
```

各段は前段の成果物だけを入力とし、後段の存在が前段の「やらないこと」を規定する([1]はHowに踏み込まない、[2]は実装目線に踏み込まない、[3]は詳細なHowを決めない、[4]は契約レベルで止める、等)。原則・フォーマット・進め方の詳細は各スキルの SKILL.md を参照。

成果物は機能ごとに1ディレクトリへ集約される。[4] はバッチ数だけファイルが並ぶ点に注意([5] の成果物はこのディレクトリではなくコードベース側のコードとテストに現れる):

```
docs/plans/<機能名>/
├── request-spec.md
├── feature-options.md
├── impact-analysis.md
├── implementation-design-<バッチスラッグ1>.md
├── implementation-design-<バッチスラッグ2>.md
└── ...(設計バッチの数だけ)
```

## 軽量版: quick-design

小規模な機能追加・修正(振る舞いのまとまりが1〜2個、設計バッチ1個相当)は、[1]〜[4] 相当を1実行に集約した quick-design で進められる。成果物は `docs/plans/<機能名>.md` の1ファイルで、`## 2`〜`## 5` が実装設計書と同一構造のため、そのまま [5] phase-implementation に渡せる。規模が目安を超えると判定した場合は完走せず、request-spec からのフルパイプラインを案内する(基準は quick-design の SKILL.md「入口ガード」参照)。

## スキル一覧

| スキル | 何をするか | 入力 | 実行回数 |
|---|---|---|---|
| request-spec | 要望・議事録を要求仕様書(What/Why/具体度ラベル付き)に構造化する | 要望・議事録のテキストまたはパス | 機能につき1回 |
| feature-options | 要求仕様書からユーザー目線での機能の実現方法の選択肢を洗い出し選定し、機能設計書にまとめる | request-spec.md | 機能につき1回 |
| impact-analysis | 機能設計書から変更点・影響範囲・コードベース上の関連箇所・設計トピック・設計バッチを整理し、影響分析書にまとめる | feature-options.md | 機能につき1回 |
| implementation-design | 影響分析書の設計バッチを、骨格設計→詳細設計の2段階で実装設計書に落とす | impact-analysis.md | 設計バッチ数だけ繰り返す(1実行=1バッチ) |
| phase-implementation | 実装設計書の実装計画をフェーズ単位で実装し、独立した検証まで行う | implementation-design-*.md + 対象フェーズ番号 | フェーズ数だけ繰り返す(1実行=1フェーズ) |
| quick-design | 小規模な機能追加・修正向けに、要求整理〜実装設計([1]〜[4]相当)を1実行・1ファイルで完結させる軽量版 | 要望のテキストまたはパス | 機能につき1回 |

## 使い方

全スキルは `disable-model-invocation` により自動起動しない設計。`/spec-toolkit:<スキル名> <引数>` のように手動で起動する。各スキルの引数の形式・既定値は補完時の argument-hint に表示される。起動例:

```
/spec-toolkit:request-spec docs/notes/meeting-2024-06.md
/spec-toolkit:feature-options docs/plans/favorite-products/request-spec.md
/spec-toolkit:impact-analysis docs/plans/favorite-products/feature-options.md
/spec-toolkit:implementation-design docs/plans/favorite-products/impact-analysis.md
/spec-toolkit:phase-implementation docs/plans/favorite-products/implementation-design-persistence.md 1
/spec-toolkit:quick-design "商品一覧カードに在庫数を表示したい"
```

前段の成果物が無い、または必須セクションが欠けている場合、各スキルは**入口ガード**で止まり、前段スキルを実施するようユーザーに案内する(自分で代行して埋めない)。

**途中参加**: パイプラインの前段を spec-toolkit で作らず、既存の手書きドキュメント(議事録・別ツールの設計書など)から始めたい場合も、対象スキルの `assets/` 配下テンプレートと同じフォーマット・セクション構成に整っていれば、その段からパイプラインに合流できる。

## 成果物の修正・差し戻しの運用

実装中や後段の分析で、前段の成果物に不備や前提とのズレが見つかることがある。差し戻しの入口は主に2つ:

- **phase-implementation の完了報告「契約に関する報告」**: 実装中に見つかった、実装設計書側へ反映すべき解釈・曖昧さ・逸脱
- **impact-analysis の「機能設計書の前提と現状コードの齟齬」**(`5. 後続フェーズへの引き継ぎ` 内): 機能設計書が前提にしたことと現状コードの不整合

例: phase-implementation の完了報告で「レスポンス形が実装設計書の前提と異なる解釈で実装した」と報告された場合、それが該当フィールドの型を直すだけなら軽微な修正、API 契約自体を設計し直す必要があるなら implementation-design の再実行を検討する。

見つかった事項への対応方針:

- **軽微な修正**(記述の誤り・詳細の差し替えなど、文書の構造に影響しないもの): 成果物はただの Markdown なので直接編集してよい。ただしセクション順序とフィールド名は下流スキルが機械的に走査する契約なので崩さない。確定済みの判断は消さない。
- **構造に及ぶ修正**(機能の増減・設計バッチの組み替え・骨格の変更など): 該当スキルを再実行する。既存ファイルは上書き確認されるので、保持したい確定事項があれば再実行時に指示する。
- どちらの場合も、上流を修正したら下流成果物が参照している R/F/T/B の ID や前提との整合を確認する。

修正の頻度が高くなってきた場合、差し戻し専用の仕組みを設けることを将来検討する余地がある。現時点ではこの運用で対応する。

## エージェント一覧

impact-analysis・implementation-design・phase-implementation・quick-design は、調査・設計・実装・検証をサブエージェントに委譲する。

| エージェント | 呼び出し元 | 役割 |
|---|---|---|
| impact-investigator | impact-analysis, quick-design | 焦点を絞ったコードベース/ドキュメント調査を行い、構造化された事実を返す(設計判断はしない) |
| greenfield-architect | implementation-design | 骨格設計・詳細設計+実装計画の主設計を担う(既存実装や移行コストを考慮しない、要件を満たす最もシンプルな設計) |
| brownfield-architect | implementation-design | 既存コードベースとの整合・移行コスト・障害リスク・段階導入可能性の観点で骨格を批評する(独立した代替案は出さず、局所修正提案のみ) |
| domain-first-architect | implementation-design | ドメイン概念の境界・不変条件の集中・用語の一貫性の観点で骨格を批評する(独立した代替案は出さず、局所修正提案のみ) |
| implementation-engineer | phase-implementation | 実装設計書の契約(詳細設計)に従い、TDD でコードに変換する(完了判定は行わない) |
| completion-verifier | phase-implementation | テスト実行・リグレッション確認・設計書契約との整合を、実装者から独立に検証する(コードの修正は行わない) |

批評役(brownfield-architect, domain-first-architect)と completion-verifier は編集ツールを持たない。局所修正提案・検証結果の指摘に留まり、代替設計への差し替えやコード修正はできない立て付けになっている。

## 保守者向けの注記

各スキル・エージェントの設計判断の背景(なぜその形にしたか・却下した代替案)は、並置された `RATIONALE.md` に記録している。動作確認用のテストスイートは各スキルの `evals/evals.json` にある。
