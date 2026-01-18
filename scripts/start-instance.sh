#!/bin/bash
# 启动单个 Vite 应用实例
# 用法: ./start-instance.sh <subdomain-prefix> [port]

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查参数
if [ -z "$1" ]; then
    echo -e "${RED}错误: 请提供子域名前缀${NC}"
    echo "用法: $0 <subdomain-prefix> [port]"
    echo "示例: $0 mttf3dq7wrg9on 5174"
    exit 1
fi

SUBDOMAIN_PREFIX=$1
PORT=${2:-5174}

# 检查端口是否被占用
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}警告: 端口 $PORT 已被占用${NC}"
    echo "请选择其他端口或停止占用该端口的进程"
    exit 1
fi

# 设置环境变量
export SUBDOMAIN_PREFIX=$SUBDOMAIN_PREFIX
export PORT=$PORT
export HOST=${HOST:-localhost}
export VITE_APP_PREFIX=$SUBDOMAIN_PREFIX

echo -e "${GREEN}启动 Vite 应用实例...${NC}"
echo "子域名前缀: $SUBDOMAIN_PREFIX"
echo "端口: $PORT"
echo "主机: $HOST"

# 切换到应用目录
cd "$(dirname "$0")/../packages/demo-app" || exit 1

# 启动开发服务器
echo -e "${GREEN}正在启动开发服务器...${NC}"
pnpm dev --port $PORT --host $HOST
