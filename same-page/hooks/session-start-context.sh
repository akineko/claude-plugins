#!/usr/bin/env bash
# SessionStart フック: same-page のセッションコンテキストを注入する。
# 1. 常時: 開発依頼で readback スキルを起動する旨のリマインダー（スキル一覧の
#    照合に依存しない起動経路。プロセス系スキルは description だけでは不発になりやすい）
# 2. 合意があれば: 作業中（status: active）の作業合意の一覧と復元指示
# 出力は hookSpecificOutput.additionalContext の JSON 形式。
set -u
shopt -s nullglob

msg="[same-page] same-page プラグインが有効です。"
msg+=$'\n'"- 開発作業の依頼（実装・追加・修正・変更・リファクタリング等、コードの新規作成・変更を求める依頼）を受けたら、コードを書き始める前に same-page:readback スキルを起動し、解釈の復唱から始めること。依頼が小さくても省略しない（軽量判定なら数行の解釈宣言だけで即着手できる）。"
msg+=$'\n'"- 実装の完了検証は same-page:signoff、セッションの区切りでは same-page:handoff に従う。"

root=$(git rev-parse --show-toplevel 2>/dev/null) || root=$PWD
dir="$root/docs/agreements"

lines=()
if [ -d "$dir" ]; then
  for f in "$dir"/*.md; do
    # frontmatter（先頭10行以内）の status: active だけを見る
    if head -10 "$f" | grep -q '^status:[[:space:]]*active'; then
      title=$(grep -m1 '^# ' "$f" | sed 's/^# *//')
      lines+=("- ${f#"$root"/}: ${title:-（無題）}")
    fi
  done
fi

if ((${#lines[@]})); then
  msg+=$'\n'"作業中の作業合意があります:"
  for line in "${lines[@]}"; do
    msg+=$'\n'"$line"
  done
  msg+=$'\n'"継続作業の依頼を受けたら、該当ファイルの「現在地」を読んで文脈を復元してから着手する（次の一手・ハマりどころが記録されている）。無関係な新規依頼なら無視してよい。"
fi

# 外部依存なしの JSON エスケープ（順序が重要: \ を最初に。制御文字は CR 除去・タブ変換・改行変換）
esc=${msg//\\/\\\\}
esc=${esc//\"/\\\"}
esc=${esc//$'\r'/}
esc=${esc//$'\t'/\\t}
esc=${esc//$'\n'/\\n}

printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' "$esc"
exit 0
