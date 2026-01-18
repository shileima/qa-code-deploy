#!/bin/bash
# 生成随机子域名前缀（16位字符）
# 用法: ./generate-prefix.sh [length]
# 默认长度: 16

set -e

LENGTH=${1:-16}
INSTANCES_FILE="${INSTANCES_FILE:-$(dirname "$0")/../.instances.json}"

# 生成随机字符串（小写字母 + 数字）
generate_random_string() {
  local len=$1
  # 使用 openssl 或 /dev/urandom 生成随机字符串
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex $((len / 2)) | tr '[:upper:]' '[:lower:]' | head -c $len
  else
    # 备用方案：使用 /dev/urandom
    cat /dev/urandom | tr -dc 'a-z0-9' | fold -w $len | head -n 1
  fi
}

# 检查前缀是否已存在
prefix_exists() {
  local prefix=$1
  if [ ! -f "$INSTANCES_FILE" ]; then
    return 1  # 文件不存在，前缀也不存在
  fi
  
  if command -v jq >/dev/null 2>&1; then
    jq -e ".instances[]? | select(.prefix == \"$prefix\")" "$INSTANCES_FILE" > /dev/null 2>&1
  else
    # 如果没有 jq，使用 grep
    grep -q "\"prefix\":\"$prefix\"" "$INSTANCES_FILE" 2>/dev/null
  fi
}

# 生成唯一前缀
MAX_ATTEMPTS=100
attempt=0
prefix=""

while [ $attempt -lt $MAX_ATTEMPTS ]; do
  prefix=$(generate_random_string $LENGTH)
  if ! prefix_exists "$prefix"; then
    echo "$prefix"
    exit 0
  fi
  attempt=$((attempt + 1))
done

echo "错误: 无法生成唯一前缀（尝试 $MAX_ATTEMPTS 次）" >&2
exit 1
