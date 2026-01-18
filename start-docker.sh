#!/bin/bash
# 使用 Docker Compose 启动两个实例

# sudo 密码（用于配置 hosts 文件）
PASSWORD="1111"

echo "=========================================="
echo "  使用 Docker 启动服务"
echo "=========================================="
echo ""

# 检查 Docker 和 Docker Compose
if ! command -v docker &> /dev/null; then
    echo "✗ 错误: 未安装 Docker"
    echo "请访问 https://docs.docker.com/get-docker/ 安装 Docker"
    exit 1
fi

if ! docker ps &> /dev/null; then
    echo "✗ 错误: Docker 未运行"
    echo "请启动 Docker Desktop 或 Docker 服务"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "✗ 错误: 未安装 Docker Compose"
    exit 1
fi

# 使用 docker compose (v2) 或 docker-compose (v1)
DOCKER_COMPOSE_CMD="docker-compose"
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
fi

echo "使用命令: $DOCKER_COMPOSE_CMD"
echo ""

# 配置 hosts 文件
echo "1. 配置 hosts 文件..."
echo "$PASSWORD" | sudo -S bash -c 'grep -q "mttf3dq7wrg9on.localhost" /etc/hosts || echo "127.0.0.1   mttf3dq7wrg9on.localhost" >> /etc/hosts' 2>/dev/null
echo "$PASSWORD" | sudo -S bash -c 'grep -q "mteyg1wky8uqgs.localhost" /etc/hosts || echo "127.0.0.1   mteyg1wky8uqgs.localhost" >> /etc/hosts' 2>/dev/null
echo "✓ hosts 文件配置完成"
echo ""

# 停止现有容器（如果有）
echo "2. 停止现有容器..."
$DOCKER_COMPOSE_CMD down 2>/dev/null || true
echo "✓ 已停止现有容器"
echo ""

# 构建和启动容器
echo "3. 构建并启动 Docker 容器..."
cd "$(dirname "$0")"
$DOCKER_COMPOSE_CMD up -d --build

if [ $? -eq 0 ]; then
    echo "✓ Docker 容器已启动"
else
    echo "✗ Docker 容器启动失败"
    exit 1
fi

# 等待服务启动
echo ""
echo "4. 等待服务启动..."
sleep 5

# 检查服务状态
echo ""
echo "5. 检查服务状态..."
$DOCKER_COMPOSE_CMD ps

echo ""
echo "=========================================="
echo "  服务启动完成"
echo "=========================================="
echo ""
echo "访问地址："
echo "  实例 1 (绿色主题): http://mteyg1wky8uqgs.localhost/"
echo "  实例 2 (蓝色主题): http://mttf3dq7wrg9on.localhost/"
echo ""
echo "注意：需要通过代理服务器路由到不同的端口"
echo "  实例 1 -> localhost:5174"
echo "  实例 2 -> localhost:5175"
echo ""
echo "查看日志："
echo "  $DOCKER_COMPOSE_CMD logs -f"
echo ""
echo "停止服务："
echo "  $DOCKER_COMPOSE_CMD down"
echo ""
