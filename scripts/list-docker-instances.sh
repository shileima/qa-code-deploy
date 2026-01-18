#!/bin/bash
# 列出所有 Docker 实例脚本
# 用法: ./list-docker-instances.sh

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 路径配置
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
INSTANCES_FILE="$PROJECT_ROOT/.instances.json"

# 检查文件是否存在
if [ ! -f "$INSTANCES_FILE" ]; then
  echo -e "${YELLOW}未找到实例配置文件${NC}"
  exit 0
fi

# 使用 jq 列出实例
if command -v jq >/dev/null 2>&1; then
  INSTANCE_COUNT=$(jq -r '.instances | length' "$INSTANCES_FILE" 2>/dev/null || echo "0")
  
  if [ "$INSTANCE_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}没有找到实例${NC}"
    exit 0
  fi

  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}  Docker 实例列表${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""
  
  jq -r '.instances[] | "\(.prefix)\t\(.port)\t\(.containerName // "N/A")\t\(.status // "unknown")"' "$INSTANCES_FILE" 2>/dev/null | \
    while IFS=$'\t' read -r prefix port container status; do
      # 检查容器是否实际运行
      if docker ps --filter "name=$container" --format "{{.Names}}" | grep -q "$container"; then
        ACTUAL_STATUS="${GREEN}running${NC}"
      else
        if [ "$status" = "running" ]; then
          ACTUAL_STATUS="${YELLOW}stopped (expected running)${NC}"
        else
          ACTUAL_STATUS="${YELLOW}$status${NC}"
        fi
      fi
      
      echo -e "${GREEN}前缀:${NC} $prefix"
      echo -e "  端口: ${BLUE}$port${NC}"
      echo -e "  容器: ${BLUE}$container${NC}"
      echo -e "  状态: $ACTUAL_STATUS"
      echo -e "  访问: ${BLUE}http://${prefix}.localhost/${NC}"
      echo ""
    done
  
  echo -e "${BLUE}总计: $INSTANCE_COUNT 个实例${NC}"
else
  # 备用方案：使用 grep 和 awk
  echo -e "${YELLOW}未安装 jq，使用简单列表:${NC}"
  grep -o '"prefix":"[^"]*"' "$INSTANCES_FILE" | sed 's/"prefix":"//g' | sed 's/"//g' | \
    while read prefix; do
      echo "  - $prefix"
    done
fi
