#!/bin/bash
# codex-consult: 対話ありセッションを開始する
# Usage: session-start.sh <work_dir> <prompt_file> [-s sandbox] [-m model] [-C dir]
# 出力: 1行目=thread_id, 2行目以降=codexの応答テキスト
# 副作用: work_dir/thread_id, work_dir/response.txt, work_dir/session.jsonl を保存
set -e

work_dir="$1"
prompt_file="$2"
shift 2

opts=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    -s|-m|-C) opts+=("$1" "$2"); shift 2 ;;
    *) echo "Error: Unknown option: $1" >&2; exit 1 ;;
  esac
done

codex exec --json ${opts[@]+"${opts[@]}"} - < "$prompt_file" 2>/dev/null > "$work_dir/session.jsonl"

# thread_id を抽出して保存
thread_id=$(head -1 "$work_dir/session.jsonl" | jq -r '.thread_id')
echo "$thread_id" > "$work_dir/thread_id"

# 最後の agent_message を抽出して保存
response=$(jq -r 'select(.type == "item.completed" and .item.type == "agent_message") | .item.text' "$work_dir/session.jsonl")
echo "$response" > "$work_dir/response.txt"

# 出力: 1行目=thread_id, 2行目以降=response
echo "$thread_id"
echo "$response"
