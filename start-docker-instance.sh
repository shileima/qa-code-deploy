#!/bin/bash
# 启动单个 Docker 实例（mteyg1wky8uqgs）

# sudo 密码（用于配置 hosts 文件）
PASSWORD="1111"

echo "=========================================="
echo "  启动 Docker 实例 (mteyg1wky8uqgs)"
echo "=========================================="
echo ""

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "✗ 错误: 未安装 Docker"
    exit 1
fi

if ! docker ps &> /dev/null; then
    echo "⚠ Docker 未运行，正在启动..."
    open -a Docker
    echo "等待 Docker 启动（15-30 秒）..."
    for i in {1..30}; do
        sleep 1
        if docker ps &> /dev/null 2>&1; then
            echo "✓ Docker 已启动"
            break
        fi
        echo -n "."
    done
    echo ""
fi

# 检查 Docker Compose
DOCKER_COMPOSE_CMD="docker compose"
if ! docker compose version &> /dev/null; then
    if ! command -v docker-compose &> /dev/null; then
        echo "✗ 错误: 未安装 Docker Compose"
        exit 1
    fi
    DOCKER_COMPOSE_CMD="docker-compose"
fi

echo "使用命令: $DOCKER_COMPOSE_CMD"
echo ""

# 配置 hosts 文件
echo "1. 配置 hosts 文件..."
echo "$PASSWORD" | sudo -S bash -c 'grep -q "mteyg1wky8uqgs.localhost" /etc/hosts || echo "127.0.0.1   mteyg1wky8uqgs.localhost" >> /etc/hosts' 2>/dev/null
echo "✓ hosts 文件配置完成"
echo ""

# 启动容器（只启动 vite-app-1）
echo "2. 启动 Docker 容器 (vite-app-1)..."
cd "$(dirname "$0")"
$DOCKER_COMPOSE_CMD up -d --build vite-app-1

if [ $? -eq 0 ]; then
    echo "✓ Docker 容器已启动"
else
    echo "✗ Docker 容器启动失败"
    echo ""
    echo "可能的原因："
    echo "  1. 网络问题无法拉取镜像"
    echo "  2. 端口 5174 被占用"
    echo "  3. 查看详细日志: docker compose logs vite-app-1"
    exit 1
fi

# 等待服务启动
echo ""
echo "3. 等待服务启动（10 秒）..."
sleep 10

# 检查服务状态
echo ""
echo "4. 检查服务状态..."
$DOCKER_COMPOSE_CMD ps vite-app-1

# 检查端口
echo ""
echo "5. 检查端口..."
if lsof -i :5174 -sTCP:LISTEN > /dev/null 2>&1; then
    echo "✓ 端口 5174 正在监听"
else
    echo "⚠ 端口 5174 未监听，容器可能还在启动中"
    echo "  查看日志: docker compose logs -f vite-app-1"
fi

echo ""
echo "=========================================="
echo "  启动完成"
echo "=========================================="
echo ""
echo "访问地址："
echo "  http://mteyg1wky8uqgs.localhost/"
echo ""
echo "注意：需要启动代理服务器才能通过子域名访问"
echo ""
echo "启动代理服务器："
echo "  ./start-proxy-80.sh"
echo "  或"
echo "  PROXY_PORT=8080 node scripts/subdomain-proxy.js"
echo ""
echo "查看日志："
echo "  docker compose logs -f vite-app-1"
echo ""
echo "停止容器："
echo "  docker compose stop vite-app-1"
echo ""
