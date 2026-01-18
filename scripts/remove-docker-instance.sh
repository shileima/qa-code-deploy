#!/bin/bash
# 删除 Docker 实例脚本
# 用法: ./remove-docker-instance.sh <prefix>

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
CONFIG_DIR="$PROJECT_ROOT/config"
PROXY_CONFIG_FILE="$CONFIG_DIR/subdomain-proxy.json"
HOSTS_FILE="/etc/hosts"
PASSWORD="1111"

# 检查参数
PREFIX=$1
if [ -z "$PREFIX" ]; then
  echo -e "${RED}错误: 请提供子域名前缀${NC}" >&2
  echo "用法: $0 <prefix>"
  exit 1
fi

# 检查实例是否存在
if [ ! -f "$INSTANCES_FILE" ]; then
  echo -e "${RED}错误: 实例配置文件不存在${NC}" >&2
  exit 1
fi

if command -v jq >/dev/null 2>&1; then
  INSTANCE=$(jq -r ".instances[] | select(.prefix == \"$PREFIX\")" "$INSTANCES_FILE")
  if [ -z "$INSTANCE" ] || [ "$INSTANCE" = "null" ]; then
    echo -e "${RED}错误: 实例 $PREFIX 不存在${NC}" >&2
    exit 1
  fi
  
  CONTAINER_NAME=$(echo "$INSTANCE" | jq -r '.containerName // "render-monitor-app-'$PREFIX'"')
else
  if ! grep -q "\"prefix\":\"$PREFIX\"" "$INSTANCES_FILE" 2>/dev/null; then
    echo -e "${RED}错误: 实例 $PREFIX 不存在${NC}" >&2
    exit 1
  fi
  CONTAINER_NAME="render-monitor-app-$PREFIX"
fi

echo -e "${BLUE}正在删除实例: $PREFIX${NC}"

# 停止并删除 Docker 容器
if docker ps -a --filter "name=$CONTAINER_NAME" --format "{{.Names}}" | grep -q "$CONTAINER_NAME"; then
  echo -e "${BLUE}停止容器...${NC}"
  docker stop "$CONTAINER_NAME" 2>/dev/null || true
  echo -e "${BLUE}删除容器...${NC}"
  docker rm "$CONTAINER_NAME" 2>/dev/null || true
  echo -e "${GREEN}✓ 容器已删除${NC}"
fi

# 从 .instances.json 移除
if command -v jq >/dev/null 2>&1; then
  TEMP_FILE=$(mktemp)
  jq "del(.instances[] | select(.prefix == \"$PREFIX\"))" "$INSTANCES_FILE" > "$TEMP_FILE"
  mv "$TEMP_FILE" "$INSTANCES_FILE"
  echo -e "${GREEN}✓ 已从 .instances.json 移除${NC}"
else
  echo -e "${YELLOW}警告: 无法自动更新 JSON 文件（需要 jq）${NC}"
fi

# 从代理服务器配置移除
if [ -f "$PROXY_CONFIG_FILE" ] && command -v jq >/dev/null 2>&1; then
  TEMP_FILE=$(mktemp)
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  jq "del(.routes[\"$PREFIX\"]) | .updatedAt = \"$TIMESTAMP\"" "$PROXY_CONFIG_FILE" > "$TEMP_FILE"
  mv "$TEMP_FILE" "$PROXY_CONFIG_FILE"
  echo -e "${GREEN}✓ 已更新代理服务器配置${NC}"
fi

# 从 hosts 文件移除（可选，提示用户手动删除）
if grep -q "${PREFIX}.localhost" "$HOSTS_FILE" 2>/dev/null; then
  echo -e "${YELLOW}提示: 请手动从 hosts 文件删除以下行:${NC}"
  echo "  127.0.0.1   ${PREFIX}.localhost"
  echo ""
  echo -e "${BLUE}或使用以下命令自动删除:${NC}"
  echo "  echo '$PASSWORD' | sudo -S sed -i '' '/${PREFIX}.localhost/d' $HOSTS_FILE"
fi

# 重新生成 Docker Compose 配置
echo -e "${BLUE}重新生成 Docker Compose 配置...${NC}"
node "$SCRIPT_DIR/generate-docker-compose.js" 2>/dev/null && \
  echo -e "${GREEN}✓ 已重新生成 docker-compose.yml${NC}" || \
  echo -e "${YELLOW}警告: 无法重新生成 Docker Compose 配置${NC}"

# 重新生成应用配置
echo -e "${BLUE}重新生成应用配置...${NC}"
node "$SCRIPT_DIR/generate-app-config.js" 2>/dev/null && \
  echo -e "${GREEN}✓ 已更新 urlConfig.js${NC}" || \
  echo -e "${YELLOW}警告: 无法重新生成应用配置${NC}"

# 重载代理服务器（如果正在运行）
PROXY_PID=$(pgrep -f "subdomain-proxy.js" | head -n 1)
if [ -n "$PROXY_PID" ]; then
  echo -e "${BLUE}重载代理服务器配置...${NC}"
  kill -HUP "$PROXY_PID" 2>/dev/null && \
    echo -e "${GREEN}✓ 已发送重载信号到代理服务器 (PID: $PROXY_PID)${NC}" || \
    echo -e "${YELLOW}警告: 无法重载代理服务器${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  实例已删除: $PREFIX${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
