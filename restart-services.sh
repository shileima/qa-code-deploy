#!/bin/bash
# 重启所有服务的脚本

# sudo 密码（用于配置 hosts 文件）
PASSWORD="1111"

echo "=========================================="
echo "  重启所有服务"
echo "=========================================="
echo ""

# 停止所有服务
echo "1. 停止所有服务..."
lsof -ti :5174,5175,80,8080 2>/dev/null | xargs kill -9 2>/dev/null
ps aux | grep -E "vite|subdomain-proxy" | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null
sleep 1
echo "✓ 所有服务已停止"
echo ""

# 配置 hosts 文件
echo "2. 配置 hosts 文件..."
echo "$PASSWORD" | sudo -S bash -c 'grep -q "mttf3dq7wrg9on.localhost" /etc/hosts || echo "127.0.0.1   mttf3dq7wrg9on.localhost" >> /etc/hosts' 2>/dev/null
echo "$PASSWORD" | sudo -S bash -c 'grep -q "mteyg1wky8uqgs.localhost" /etc/hosts || echo "127.0.0.1   mteyg1wky8uqgs.localhost" >> /etc/hosts' 2>/dev/null
echo "✓ hosts 文件配置完成"
echo ""

PASSWORD="1111"

# 获取项目根目录（确保路径正确）
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

# 启动 Vite 实例 1
echo "3. 启动 Vite 实例 1 (mttf3dq7wrg9on:5174)..."
cd "$PROJECT_ROOT/packages/demo-app"
export SUBDOMAIN_PREFIX=mttf3dq7wrg9on
export PORT=5174
export HOST=localhost
nohup pnpm dev --port 5174 --host localhost > /tmp/vite-mttf3dq7wrg9on.log 2>&1 &
echo $! > /tmp/vite-mttf3dq7wrg9on.pid
sleep 3
echo "✓ 实例 1 已启动"
echo ""

# 启动 Vite 实例 2
echo "4. 启动 Vite 实例 2 (mteyg1wky8uqgs:5175)..."
cd "$PROJECT_ROOT/packages/demo-app"
export SUBDOMAIN_PREFIX=mteyg1wky8uqgs
export PORT=5175
export HOST=localhost
nohup pnpm dev --port 5175 --host localhost > /tmp/vite-mteyg1wky8uqgs.log 2>&1 &
echo $! > /tmp/vite-mteyg1wky8uqgs.pid
sleep 3
echo "✓ 实例 2 已启动"
echo ""

# 启动代理服务器
echo "5. 启动代理服务器 (端口 80)..."
# 确保回到项目根目录（使用之前定义的变量）
cd "$PROJECT_ROOT"
PROXY_SCRIPT="$PROJECT_ROOT/scripts/subdomain-proxy.js"

# 检查脚本文件是否存在
if [ ! -f "$PROXY_SCRIPT" ]; then
    echo "✗ 错误: 找不到代理服务器脚本: $PROXY_SCRIPT"
    exit 1
fi

# 检查端口 80 是否被占用（检查监听状态）
if sudo lsof -i :80 -sTCP:LISTEN > /dev/null 2>&1; then
    echo "⚠ 警告: 端口 80 已被占用，使用 8080 端口"
    cd "$SCRIPT_DIR"
    PROXY_PORT=8080 nohup node "$PROXY_SCRIPT" > /tmp/subdomain-proxy.log 2>&1 &
    PROXY_PORT_USED=8080
else
    echo "使用 sudo 启动代理服务器（端口 80 需要管理员权限）..."
    echo "⚠ 注意: 需要输入 sudo 密码"
    cd "$SCRIPT_DIR"
    sudo -b PROXY_PORT=80 nohup node "$PROXY_SCRIPT" > /tmp/subdomain-proxy.log 2>&1 &
    PROXY_PORT_USED=80
fi
sleep 3

# 验证代理服务器是否启动成功
if [ "$PROXY_PORT_USED" = "80" ]; then
    if sudo lsof -i :80 -sTCP:LISTEN > /dev/null 2>&1; then
        echo "✓ 代理服务器已启动（端口 80）"
    else
        echo "⚠ 警告: 代理服务器可能未成功启动，检查日志: tail -f /tmp/subdomain-proxy.log"
        echo "  如果失败，将尝试使用 8080 端口..."
        sudo lsof -ti :80 2>/dev/null | xargs sudo kill -9 2>/dev/null || true
        cd "$SCRIPT_DIR"
        PROXY_PORT=8080 nohup node "$PROXY_SCRIPT" > /tmp/subdomain-proxy.log 2>&1 &
        PROXY_PORT_USED=8080
        sleep 2
        echo "✓ 代理服务器已启动（端口 8080）"
    fi
else
    if lsof -i :8080 -sTCP:LISTEN > /dev/null 2>&1; then
        echo "✓ 代理服务器已启动（端口 8080）"
    else
        echo "✗ 错误: 代理服务器启动失败，查看日志: tail -f /tmp/subdomain-proxy.log"
    fi
fi
echo ""

echo "=========================================="
echo "  所有服务已启动"
echo "=========================================="
echo ""
echo "访问地址："
if [ "$PROXY_PORT_USED" = "80" ]; then
    echo "  http://mttf3dq7wrg9on.localhost"
    echo "  http://mteyg1wky8uqgs.localhost"
else
    echo "  http://mttf3dq7wrg9on.localhost:8080"
    echo "  http://mteyg1wky8uqgs.localhost:8080"
fi
echo ""
