#!/bin/bash
# codex-consult: codex exec review を実行する
# Usage: review.sh <work_dir> [--uncommitted | --base <branch> | --commit <sha>] [-m model]
# 出力: レビュー結果テキスト（stdout）
# 副作用: work_dir/review.jsonl, work_dir/output.txt にレビュー結果を保存
set -e

work_dir="$1"
shift

opts=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --uncommitted) opts+=("$1"); shift ;;
    --base|--commit|-m) opts+=("$1" "$2"); shift 2 ;;
    *) echo "Error: Unknown option: $1" >&2; exit 1 ;;
  esac
done

# codex exec review は -o がヘッドレスで空になるため --json で取得する
codex exec review --json ${opts[@]+"${opts[@]}"} 2>/dev/null > "$work_dir/review.jsonl"

# 最後の agent_message を抽出して保存
response=$(jq -r 'select(.type == "item.completed" and .item.type == "agent_message") | .item.text' "$work_dir/review.jsonl")
echo "$response" > "$work_dir/output.txt"

echo "$response"
