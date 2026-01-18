#!/bin/bash
# 动态添加 Docker 实例脚本
# 用法: ./add-docker-instance.sh [prefix]
# 如果不提供 prefix，将自动生成随机前缀（16位）

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

# 确保配置文件存在
mkdir -p "$CONFIG_DIR"
if [ ! -f "$INSTANCES_FILE" ]; then
  echo '{"instances": [], "nextPort": 5174, "themePool": ["#3b82f6", "#10b981", "#ef4444", "#f59e0b", "#8b5cf6"]}' > "$INSTANCES_FILE"
fi

# 生成随机前缀或使用提供的
PREFIX=$1
if [ -z "$PREFIX" ]; then
  echo -e "${BLUE}生成随机前缀...${NC}"
  PREFIX=$("$SCRIPT_DIR/generate-prefix.sh" 16)
  echo -e "${GREEN}✓ 生成前缀: ${PREFIX}${NC}"
fi

# 验证前缀格式（仅小写字母和数字，长度>=8）
if ! [[ "$PREFIX" =~ ^[a-z0-9]{8,}$ ]]; then
  echo -e "${RED}错误: 前缀格式无效（必须是小写字母和数字，至少8位）${NC}" >&2
  exit 1
fi

# 检查前缀是否已存在
if command -v jq >/dev/null 2>&1; then
  if jq -e ".instances[]? | select(.prefix == \"$PREFIX\")" "$INSTANCES_FILE" > /dev/null 2>&1; then
    echo -e "${RED}错误: 前缀 $PREFIX 已存在${NC}" >&2
    exit 1
  fi
else
  if grep -q "\"prefix\":\"$PREFIX\"" "$INSTANCES_FILE" 2>/dev/null; then
    echo -e "${RED}错误: 前缀 $PREFIX 已存在${NC}" >&2
    exit 1
  fi
fi

# 自动分配端口
if command -v jq >/dev/null 2>&1; then
  # 查找已使用的最大端口
  MAX_PORT=$(jq -r '[.instances[]?.port // empty] | max // 5173' "$INSTANCES_FILE")
  PORT=$((MAX_PORT + 1))
  
  # 检查端口是否被占用
  while lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; do
    PORT=$((PORT + 1))
  done
else
  # 备用方案：从 5174 开始查找
  PORT=5174
  while lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; do
    PORT=$((PORT + 1))
  done
fi

echo -e "${BLUE}分配端口: $PORT${NC}"

# 获取主题颜色（循环使用）
INSTANCE_COUNT=$(jq -r '.instances | length' "$INSTANCES_FILE" 2>/dev/null || echo "0")
THEME_INDEX=$((INSTANCE_COUNT % 5))
THEME_COLORS=("#3b82f6" "#10b981" "#ef4444" "#f59e0b" "#8b5cf6")
PRIMARY_COLOR=${THEME_COLORS[$THEME_INDEX]}

# 创建实例配置
CONTAINER_NAME="render-monitor-app-$PREFIX"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# 更新 .instances.json
if command -v jq >/dev/null 2>&1; then
  TEMP_FILE=$(mktemp)
  jq ".instances += [{
    \"prefix\": \"$PREFIX\",
    \"port\": $PORT,
    \"containerName\": \"$CONTAINER_NAME\",
    \"status\": \"stopped\",
    \"createdAt\": \"$TIMESTAMP\",
    \"theme\": {
      \"primaryColor\": \"$PRIMARY_COLOR\"
    }
  }]" "$INSTANCES_FILE" > "$TEMP_FILE"
  mv "$TEMP_FILE" "$INSTANCES_FILE"
else
  echo -e "${YELLOW}警告: 未安装 jq，无法自动更新 JSON 文件${NC}" >&2
  exit 1
fi

echo -e "${GREEN}✓ 已更新 .instances.json${NC}"

# 更新代理服务器配置
if [ ! -f "$PROXY_CONFIG_FILE" ]; then
  echo "{\"routes\": {}, \"updatedAt\": \"$TIMESTAMP\"}" > "$PROXY_CONFIG_FILE"
fi

if command -v jq >/dev/null 2>&1; then
  TEMP_FILE=$(mktemp)
  jq ".routes[\"$PREFIX\"] = $PORT | .updatedAt = \"$TIMESTAMP\"" "$PROXY_CONFIG_FILE" > "$TEMP_FILE"
  mv "$TEMP_FILE" "$PROXY_CONFIG_FILE"
  echo -e "${GREEN}✓ 已更新代理服务器配置${NC}"
else
  echo -e "${YELLOW}警告: 无法更新代理服务器配置（需要 jq）${NC}"
fi

# 更新 hosts 文件
HOST_ENTRY="127.0.0.1   ${PREFIX}.localhost"
if ! grep -q "${PREFIX}.localhost" "$HOSTS_FILE" 2>/dev/null; then
  echo "添加 hosts 配置..."
  echo "$PASSWORD" | sudo -S bash -c "echo '$HOST_ENTRY' >> $HOSTS_FILE" && \
    echo -e "${GREEN}✓ 已添加 hosts 配置: ${PREFIX}.localhost${NC}" || \
    echo -e "${YELLOW}警告: 无法自动添加 hosts 配置，请手动添加: $HOST_ENTRY${NC}"
else
  echo -e "${GREEN}✓ hosts 配置已存在: ${PREFIX}.localhost${NC}"
fi

# 生成 Docker Compose 配置
echo -e "${BLUE}生成 Docker Compose 配置...${NC}"
node "$SCRIPT_DIR/generate-docker-compose.js" || {
  echo -e "${RED}错误: 无法生成 Docker Compose 配置${NC}" >&2
  exit 1
}
echo -e "${GREEN}✓ 已生成 docker-compose.yml${NC}"

# 生成应用配置
echo -e "${BLUE}生成应用配置...${NC}"
node "$SCRIPT_DIR/generate-app-config.js" || {
  echo -e "${YELLOW}警告: 无法生成应用配置（非致命错误）${NC}"
}
echo -e "${GREEN}✓ 已更新 urlConfig.js${NC}"

# 启动 Docker 容器
echo -e "${BLUE}启动 Docker 容器...${NC}"
cd "$PROJECT_ROOT"
# 计算服务名（索引 + 1，然后拼接）
SERVICE_INDEX=$(jq -r ".instances | to_entries | map(select(.value.prefix == \"$PREFIX\")) | .[0].key + 1" "$INSTANCES_FILE")
SERVICE_NAME="vite-app-${SERVICE_INDEX}"
docker compose up -d "$SERVICE_NAME" 2>&1 || {
  echo -e "${YELLOW}警告: 无法启动 Docker 容器，请手动运行: docker compose up -d${NC}"
}

# 更新实例状态为 running
sleep 3
if docker ps --filter "name=$CONTAINER_NAME" --format "{{.Names}}" | grep -q "$CONTAINER_NAME"; then
  if command -v jq >/dev/null 2>&1; then
    TEMP_FILE=$(mktemp)
    jq "(.instances[] | select(.prefix == \"$PREFIX\") | .status) = \"running\"" "$INSTANCES_FILE" > "$TEMP_FILE"
    mv "$TEMP_FILE" "$INSTANCES_FILE"
  fi
  echo -e "${GREEN}✓ 容器已启动${NC}"
else
  echo -e "${YELLOW}警告: 容器可能未启动，请检查日志: docker compose logs${NC}"
fi

# 重载代理服务器（如果正在运行）
PROXY_PID=$(pgrep -f "subdomain-proxy.js" | head -n 1)
if [ -n "$PROXY_PID" ]; then
  echo -e "${BLUE}重载代理服务器配置...${NC}"
  kill -HUP "$PROXY_PID" 2>/dev/null && \
    echo -e "${GREEN}✓ 已发送重载信号到代理服务器 (PID: $PROXY_PID)${NC}" || \
    echo -e "${YELLOW}警告: 无法重载代理服务器${NC}"
fi

# 输出结果
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  实例添加成功！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "前缀: ${BLUE}${PREFIX}${NC}"
echo -e "端口: ${BLUE}${PORT}${NC}"
echo -e "容器: ${BLUE}${CONTAINER_NAME}${NC}"
echo -e "访问: ${BLUE}http://${PREFIX}.localhost/${NC}"
echo ""
