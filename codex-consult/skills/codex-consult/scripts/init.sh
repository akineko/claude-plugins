#!/bin/bash
# codex-consult: 作業ディレクトリを初期化する
# 出力: 作成したディレクトリのパス
set -e
base_dir=".claude/tmp"
mkdir -p "$base_dir"
echo "$(mktemp -d "$base_dir/codex-XXXXXX")"
