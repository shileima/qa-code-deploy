#!/bin/bash
# 停止所有服务脚本

# sudo 密码（用于停止 root 用户启动的服务）
PASSWORD="1111"

echo "=========================================="
echo "  停止所有服务"
echo "=========================================="
echo ""

# 停止 Docker 容器（如果运行）
echo "0. 检查并停止 Docker 容器..."
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
INSTANCES_FILE="$PROJECT_ROOT/.instances.json"

if command -v docker &> /dev/null && docker ps &> /dev/null 2>&1; then
    # 首先使用 docker compose down 停止所有 compose 管理的容器
    if [ -f "$PROJECT_ROOT/docker-compose.yml" ]; then
        cd "$PROJECT_ROOT"
        RUNNING_SERVICES=$(docker compose ps --services --filter "status=running" 2>/dev/null | wc -l | tr -d ' ')
        
        if [ "$RUNNING_SERVICES" -gt 0 ]; then
            echo "  发现运行中的 Docker Compose 服务，正在停止..."
            docker compose down 2>/dev/null && echo "  ✓ Docker Compose 容器已停止" || echo "  ⚠ Docker Compose 容器停止失败"
        fi
    fi
    
    # 检查并停止所有动态添加的容器（基于 .instances.json）
    if [ -f "$INSTANCES_FILE" ] && command -v jq >/dev/null 2>&1; then
        CONTAINERS=$(jq -r '.instances[]?.containerName // empty' "$INSTANCES_FILE" 2>/dev/null | tr '\n' ' ')
        if [ -n "$CONTAINERS" ]; then
            for container in $CONTAINERS; do
                if docker ps -a --filter "name=$container" --format "{{.Names}}" | grep -q "$container"; then
                    echo "  停止容器: $container"
                    docker stop "$container" 2>/dev/null || true
                    docker rm "$container" 2>/dev/null || true
                fi
            done
            echo "  ✓ 动态容器已清理"
        fi
    fi
    
    # 最终检查：清理所有 render-monitor-app- 前缀的容器
    REMAINING_CONTAINERS=$(docker ps -a --filter "name=render-monitor-app-" --format "{{.Names}}" 2>/dev/null || true)
    if [ -n "$REMAINING_CONTAINERS" ]; then
        echo "  发现遗留容器，正在清理..."
        echo "$REMAINING_CONTAINERS" | while read container; do
            if [ -n "$container" ]; then
                docker stop "$container" 2>/dev/null || true
                docker rm "$container" 2>/dev/null || true
            fi
        done
        echo "  ✓ 遗留容器已清理"
    else
        echo "  ✓ 没有运行中的 Docker 容器"
    fi
else
    echo "  ✓ Docker 未运行或未安装"
fi
echo ""

# 停止端口上的进程
echo "1. 检查并停止端口上的进程 (5174, 5175, 80, 8080)..."
for port in 5174 5175 80 8080; do
    # 使用 netstat 和 lsof 两种方式检查端口
    LISTENING=false
    
    # 检查是否有监听该端口的进程
    if netstat -an | grep -q "LISTEN.*[:.]$port[^0-9]"; then
        LISTENING=true
    fi
    
    if [ "$LISTENING" = true ]; then
        # 尝试使用 lsof 获取 PID（可能需要 sudo）
        PIDS=$(echo "$PASSWORD" | sudo -S lsof -ti :$port 2>/dev/null || true)
        if [ -n "$PIDS" ]; then
            echo "  发现端口 $port 被占用，PID: $PIDS"
            echo "  停止进程（使用密码）..."
            echo "$PIDS" | xargs -I {} echo "$PASSWORD" | sudo -S kill -9 {} 2>/dev/null || {
                echo "  ⚠ 停止失败，进程可能需要更高权限"
            }
        else
            echo "  ⚠ 端口 $port 被占用，但无法获取 PID"
        fi
    else
        echo "  ✓ 端口 $port 未被占用"
    fi
done
sleep 1

# 停止所有 Vite 和代理服务器进程
echo "2. 停止所有 Vite 和代理服务器进程..."
PIDS=$(ps aux | grep -E "vite|subdomain-proxy" | grep -v grep | awk '{print $2}' | tr '\n' ' ')
if [ -n "$PIDS" ]; then
    echo "  找到进程: $PIDS"
    echo "  停止进程（使用密码）..."
    for pid in $PIDS; do
        echo "$PASSWORD" | sudo -S kill -9 $pid 2>/dev/null || true
    done
    echo "  ✓ 已尝试停止所有进程"
else
    echo "  ✓ 未找到相关进程"
fi
sleep 1

# 验证
echo ""
echo "3. 验证服务是否已停止..."
REMAINING=$(ps aux | grep -E "vite|subdomain-proxy" | grep -v grep || true)
if [ -z "$REMAINING" ]; then
    echo "  ✓ 所有服务已停止"
else
    echo "  ⚠ 仍有进程运行:"
    echo "$REMAINING" | awk '{print "    PID", $2, $11, $12, $13}'
fi

# 检查端口
echo ""
echo "4. 检查端口占用..."
PORTS_OCCUPIED=false
for port in 5174 5175 80 8080; do
    if echo "$PASSWORD" | sudo -S lsof -i :$port -sTCP:LISTEN > /dev/null 2>&1; then
        echo "  ⚠ 端口 $port 仍被占用"
        PORTS_OCCUPIED=true
    fi
done

if [ "$PORTS_OCCUPIED" = false ]; then
    echo "  ✓ 所有端口已释放"
fi

# 最终验证
echo ""
echo "5. 最终验证..."
REMAINING_PIDS=$(ps aux | grep -E "vite|subdomain-proxy" | grep -v grep | awk '{print $2}' | tr '\n' ' ')
if [ -n "$REMAINING_PIDS" ]; then
    echo "  ⚠ 仍有进程残留（需要 sudo 权限停止）："
    ps aux | grep -E "vite|subdomain-proxy" | grep -v grep | awk '{printf "    PID %-8s USER: %-10s CMD: %s\n", $2, $1, substr($0, index($0,$11))}'
    echo ""
    echo "  请在终端中手动执行："
    echo "    sudo kill -9 $REMAINING_PIDS"
    echo ""
    echo "  或执行："
    echo "    sudo pkill -f 'vite|subdomain-proxy'"
    echo ""
else
    echo "  ✓ 所有进程已停止"
fi

echo ""
echo "=========================================="
echo "  停止完成"
echo "=========================================="
echo ""
