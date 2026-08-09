# data.json 契約 — render への入力形式

`scripts/build.mjs render` に渡す分析結果の形式。**メインエージェントが書くのは「モデル」列のフィールドだけ**。統計・ユニットの全 diff・生成日時はスクリプトが map から充填する（コードの転記をモデルにさせないため。ポイントの `diff` 抜粋だけは分析エージェントがパッチから転記する）。

## 全体構造

```json
{
  "meta": {
    "title": "変更の一言タイトル（プレーンテキスト）",
    "target": "省略可: 対象の表示名（既定: map の label）",
    "note": "省略可: 資料先頭の注記バンド（プレーンテキスト）"
  },
  "overview": {
    "summary": "変更の全体像 3〜6 文（HTML 可）"
  },
  "units": [
    {
      "id": "u1",
      "name": "ユニット名（プレーンテキスト）",
      "tagline": "概要カード用の1文（HTML 可）",
      "goal": "このユニットは何のためか（HTML 可）",
      "flow": "処理の流れ 1〜2 文（HTML 可）",
      "order": "ポイントを読む推奨順と理由（HTML 可）",
      "files": ["リポジトリルート相対の正確なパス", "..."],
      "fileNotes": { "パス": "一部のみ担当などの注記（プレーンテキスト・省略可）" },
      "points": [
        {
          "id": "p1",
          "no": 1,
          "kind": "discretion | external | interpretation | integration | risk | complexity",
          "file": "src/foo.ts:42",
          "title": "ポイントの見出し（プレーンテキスト）",
          "what": "何をしているか 1〜3 文（HTML 可）",
          "whatPlain": "what のプレーンテキスト1行版",
          "whySource": "conversation | doc | inferred",
          "why": "なぜそうしたか（HTML 可）",
          "premises": ["検証可能な言い切りの前提（HTML 可）"],
          "checks": ["レビュアーへの問い（HTML 可）"],
          "diff": "@@ -10,4 +10,8 @@ ...\n+追加行\n 文脈行（パッチからの転記）"
        }
      ]
    }
  ],
  "noise": [
    {
      "name": "グループ名（プレーンテキスト）",
      "sub": "『4 ファイル・機能変更なし』等の副題（プレーンテキスト・省略可）",
      "reason": "分類根拠 1 行（プレーンテキスト）",
      "files": ["パス", "..."],
      "note": "補足（プレーンテキスト・省略可）"
    }
  ]
}
```

## 誰が何を書くか

| フィールド | 書き手 | 備考 |
|-----------|--------|------|
| meta.title / note, overview.summary | モデル（メイン） | 統合時に執筆 |
| meta.target / command / generated / stats | **スクリプト** | map から充填。モデルは書かない |
| units[].id, points[].id / no | モデル（メイン） | 読む順に u1../p1..、no は資料全体の通し番号 |
| units[] の記述・points[] の中身 | モデル（分析エージェント → メインが取捨） | |
| units[].fullDiff / fullDiffNote | **スクリプト** | files のパッチを自動収録（2000 行/ファイルで切り詰め） |
| noise[].files の統計・小グループへの diff 添付 | **スクリプト** | 合計 120 行以下のグループに自動添付 |

## 語彙（検証される）

- `kind`: `discretion`（裁量判断）/ `external`（外部仕様への依存）/ `interpretation`（仕様の解釈）/ `integration`（既存コードとの接続）/ `risk`（リスク集中）/ `complexity`（複雑性）
- `whySource`: `conversation`（会話に根拠）/ `doc`（設計書に根拠）/ `inferred`（コード・履歴からの推定）

表示名・配色は template.html が正準。語彙を増やす場合は template と build.mjs の両方を更新する。

## HTML とエスケープ

- **HTML 可**（エスケープされない）: summary / tagline / goal / flow / order / what / why / premises[] / checks[]。使うのは `<code>` `<b>` 程度に留める
- **プレーンテキスト**（エスケープされる）: title / whatPlain / name（unit・noise）/ sub / reason / note 類 / file / fileNotes の値

## 検証と完全性検査

render は必須フィールド・語彙・id/no の重複を検証し、エラー時は生成しない。さらに **map の全ファイルが units[].files か noise[].files のどちらかに割り当てられていないとエラー**になる（取りこぼし防止）。`--allow-uncovered` を付けた場合のみ、未割り当てファイルを「未分類の変更（自動追加）」グループとして明示した上で生成する。
