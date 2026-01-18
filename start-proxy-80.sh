#!/bin/bash
# 启动 80 端口代理服务器脚本
# 需要 sudo 权限

echo "=========================================="
echo "  启动 80 端口代理服务器"
echo "=========================================="
echo ""

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROXY_SCRIPT="$SCRIPT_DIR/scripts/subdomain-proxy.js"

# 检查脚本文件
if [ ! -f "$PROXY_SCRIPT" ]; then
    echo "✗ 错误: 找不到代理服务器脚本: $PROXY_SCRIPT"
    exit 1
fi

# 检查端口 80 是否被占用
if sudo lsof -i :80 -sTCP:LISTEN > /dev/null 2>&1; then
    echo "⚠ 警告: 端口 80 已被占用"
    echo ""
    echo "占用端口的进程："
    sudo lsof -i :80 -sTCP:LISTEN
    echo ""
    read -p "是否要停止占用端口的进程并启动代理服务器? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo lsof -ti :80 -sTCP:LISTEN | xargs sudo kill -9 2>/dev/null
        sleep 1
    else
        echo "已取消"
        exit 0
    fi
fi

# 停止现有的代理服务器（如果存在）
if lsof -ti :80,8080 > /dev/null 2>&1; then
    echo "停止现有代理服务器..."
    lsof -ti :80,8080 | xargs kill -9 2>/dev/null
    sleep 1
fi

# 启动代理服务器
echo "启动代理服务器（端口 80）..."
cd "$SCRIPT_DIR"

# 检查是否在交互式终端
if [ -t 0 ]; then
    # 交互式终端，可以使用 sudo
    echo "正在启动（需要输入 sudo 密码）..."
    sudo PROXY_PORT=80 nohup node "$PROXY_SCRIPT" > /tmp/subdomain-proxy.log 2>&1 &
else
    # 非交互式环境，尝试使用 sudo -A 或提示用户
    echo "⚠ 警告: 当前环境无法输入密码"
    echo ""
    echo "请在交互式终端中运行此脚本，或手动执行："
    echo "  sudo PROXY_PORT=80 nohup node $PROXY_SCRIPT > /tmp/subdomain-proxy.log 2>&1 &"
    echo ""
    echo "或者使用 8080 端口（无需 sudo）："
    echo "  PROXY_PORT=8080 nohup node $PROXY_SCRIPT > /tmp/subdomain-proxy.log 2>&1 &"
    exit 1
fi

# 等待启动
sleep 3

# 验证启动
if sudo lsof -i :80 -sTCP:LISTEN > /dev/null 2>&1; then
    echo "✓ 代理服务器已成功启动（端口 80）"
    echo ""
    echo "=========================================="
    echo "  访问地址"
    echo "=========================================="
    echo ""
    echo "  http://mttf3dq7wrg9on.localhost"
    echo "  http://mteyg1wky8uqgs.localhost"
    echo ""
    echo "查看日志: tail -f /tmp/subdomain-proxy.log"
    echo ""
else
    echo "✗ 代理服务器启动失败"
    echo ""
    echo "查看日志:"
    tail -20 /tmp/subdomain-proxy.log
    echo ""
    echo "常见问题："
    echo "  1. 端口 80 需要管理员权限"
    echo "  2. 端口可能被其他服务占用"
    echo "  3. 检查日志文件了解详细错误"
    exit 1
fi
