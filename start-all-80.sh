#!/bin/bash
# 使用 80 端口启动所有服务（自动输入密码）

PASSWORD="1111"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

echo "=========================================="
echo "  启动所有服务（使用 80 端口）"
echo "=========================================="
echo ""

# 停止所有服务
echo "1. 停止所有现有服务..."
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

# 启动 Vite 实例 1
echo "3. 启动 Vite 实例 1 (mttf3dq7wrg9on:5174)..."
cd "$PROJECT_ROOT/packages/demo-app"
export SUBDOMAIN_PREFIX=mttf3dq7wrg9on
export PORT=5174
export HOST=localhost
nohup pnpm dev --port 5174 --host localhost > /tmp/vite-mttf3dq7wrg9on.log 2>&1 &
echo $! > /tmp/vite-mttf3dq7wrg9on.pid
sleep 3
if lsof -i :5174 > /dev/null 2>&1; then
    echo "✓ 实例 1 已启动（端口 5174）"
else
    echo "⚠ 实例 1 可能未成功启动，检查日志: tail -f /tmp/vite-mttf3dq7wrg9on.log"
fi
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
if lsof -i :5175 > /dev/null 2>&1; then
    echo "✓ 实例 2 已启动（端口 5175）"
else
    echo "⚠ 实例 2 可能未成功启动，检查日志: tail -f /tmp/vite-mteyg1wky8uqgs.log"
fi
echo ""

# 启动代理服务器（80 端口）
echo "5. 启动代理服务器（端口 80）..."
cd "$PROJECT_ROOT"
PROXY_SCRIPT="$PROJECT_ROOT/scripts/subdomain-proxy.js"

# 检查脚本文件
if [ ! -f "$PROXY_SCRIPT" ]; then
    echo "✗ 错误: 找不到代理服务器脚本: $PROXY_SCRIPT"
    exit 1
fi

# 检查端口 80 是否被占用
if echo "$PASSWORD" | sudo -S lsof -i :80 -sTCP:LISTEN > /dev/null 2>&1; then
    echo "⚠ 警告: 端口 80 已被占用，停止占用进程..."
    echo "$PASSWORD" | sudo -S lsof -ti :80 -sTCP:LISTEN 2>/dev/null | xargs sudo -S kill -9 2>/dev/null
    sleep 1
fi

# 启动代理服务器
echo "正在启动代理服务器（需要 sudo 权限）..."
cd "$PROJECT_ROOT"
echo "$PASSWORD" | sudo -S PROXY_PORT=80 nohup node "$PROXY_SCRIPT" > /tmp/subdomain-proxy.log 2>&1 &

# 等待启动
sleep 3

# 验证启动
if echo "$PASSWORD" | sudo -S lsof -i :80 -sTCP:LISTEN > /dev/null 2>&1; then
    echo "✓ 代理服务器已成功启动（端口 80）"
    PROXY_PORT_USED=80
else
    echo "⚠ 80 端口启动失败，尝试使用 8080 端口..."
    PROXY_PORT=8080 nohup node "$PROXY_SCRIPT" > /tmp/subdomain-proxy.log 2>&1 &
    sleep 2
    if lsof -i :8080 -sTCP:LISTEN > /dev/null 2>&1; then
        echo "✓ 代理服务器已启动（端口 8080）"
        PROXY_PORT_USED=8080
    else
        echo "✗ 代理服务器启动失败，查看日志: tail -f /tmp/subdomain-proxy.log"
        PROXY_PORT_USED=""
    fi
fi
echo ""

echo "=========================================="
echo "  所有服务已启动"
echo "=========================================="
echo ""

# 显示访问地址
if [ "$PROXY_PORT_USED" = "80" ]; then
    echo "访问地址（无需端口号）："
    echo "  http://mttf3dq7wrg9on.localhost"
    echo "  http://mteyg1wky8uqgs.localhost"
elif [ "$PROXY_PORT_USED" = "8080" ]; then
    echo "访问地址（8080 端口）："
    echo "  http://mttf3dq7wrg9on.localhost:8080"
    echo "  http://mteyg1wky8uqgs.localhost:8080"
else
    echo "直接访问 Vite 实例："
    echo "  http://localhost:5174"
    echo "  http://localhost:5175"
fi

echo ""
echo "查看日志："
echo "  tail -f /tmp/subdomain-proxy.log"
echo "  tail -f /tmp/vite-mttf3dq7wrg9on.log"
echo "  tail -f /tmp/vite-mteyg1wky8uqgs.log"
echo ""
