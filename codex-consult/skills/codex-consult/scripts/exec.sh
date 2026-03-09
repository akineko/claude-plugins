#!/bin/bash
# codex-consult: codex exec を実行する（対話なし）
# Usage: exec.sh <work_dir> <prompt_file> [-s sandbox] [-m model] [-C dir]
# 出力: codexの応答テキスト（stdout）
# 副作用: work_dir/output.txt に応答を保存
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

codex exec ${opts[@]+"${opts[@]}"} -o "$work_dir/output.txt" - < "$prompt_file" >/dev/null 2>/dev/null

cat "$work_dir/output.txt"
