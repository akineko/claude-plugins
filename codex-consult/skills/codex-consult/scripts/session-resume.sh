#!/bin/bash
# codex-consult: 対話ありセッションを継続する
# Usage: session-resume.sh <work_dir> <prompt_file> [-m model]
# 前提: work_dir/thread_id が存在すること（session-start.sh で作成済み）
# 出力: codexの応答テキスト（stdout）
# 副作用: work_dir/response.txt, work_dir/session.jsonl を更新

work_dir="$1"
prompt_file="$2"
shift 2

opts=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    -m) opts+=("$1" "$2"); shift 2 ;;
    *) echo "Error: Unknown option: $1" >&2; exit 1 ;;
  esac
done

thread_id=$(cat "$work_dir/thread_id")

# codex exec resume は正常応答でも exit code 1 を返すことがあるため set -e を使わない
codex exec resume --json ${opts[@]+"${opts[@]}"} "$thread_id" - < "$prompt_file" 2>/dev/null > "$work_dir/session.jsonl"

# turn.completed イベントの有無で成否を判定
if ! grep -q '"type":"turn.completed"' "$work_dir/session.jsonl" 2>/dev/null && \
   ! jq -e 'select(.type == "turn.completed")' "$work_dir/session.jsonl" >/dev/null 2>&1; then
  echo "Error: セッション継続に失敗しました（turn.completed イベントなし）" >&2
  exit 1
fi

# 最後の agent_message を抽出して保存
response=$(jq -r 'select(.type == "item.completed" and .item.type == "agent_message") | .item.text' "$work_dir/session.jsonl")
echo "$response" > "$work_dir/response.txt"

echo "$response"
