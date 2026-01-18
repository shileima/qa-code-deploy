#!/bin/bash
# 快速修复脚本

echo "=========================================="
echo "  快速修复子域名访问"
echo "=========================================="
echo ""

# 检查 hosts 配置
if grep -q "mttf3dq7wrg9on.localhost" /etc/hosts 2>/dev/null; then
    echo "✓ hosts 文件已配置"
else
    echo "⚠ hosts 文件未配置"
    echo ""
    echo "请执行以下命令配置 hosts 文件："
    echo "  sudo bash -c 'echo \"127.0.0.1   mttf3dq7wrg9on.localhost\" >> /etc/hosts'"
    echo "  sudo bash -c 'echo \"127.0.0.1   mteyg1wky8uqgs.localhost\" >> /etc/hosts'"
    echo ""
fi

# 检查服务状态
echo "检查服务状态..."
echo ""

if lsof -i :5174 > /dev/null 2>&1; then
    echo "✓ Vite 实例 1 (端口 5174) - 运行中"
else
    echo "✗ Vite 实例 1 (端口 5174) - 未运行"
fi

if lsof -i :5175 > /dev/null 2>&1; then
    echo "✓ Vite 实例 2 (端口 5175) - 运行中"
else
    echo "✗ Vite 实例 2 (端口 5175) - 未运行"
fi

if lsof -i :8080 > /dev/null 2>&1; then
    echo "✓ 代理服务器 (端口 8080) - 运行中"
else
    echo "✗ 代理服务器 (端口 8080) - 未运行"
    echo ""
    echo "启动代理服务器..."
    cd "$(dirname "$0")"
    PROXY_PORT=8080 nohup node scripts/subdomain-proxy.js > /tmp/subdomain-proxy.log 2>&1 &
    sleep 2
    echo "✓ 代理服务器已启动"
fi

echo ""
echo "=========================================="
echo "  访问地址"
echo "=========================================="
echo ""

if grep -q "mttf3dq7wrg9on.localhost" /etc/hosts 2>/dev/null; then
    echo "✓ 通过子域名访问："
    echo "  http://mttf3dq7wrg9on.localhost:8080"
    echo "  http://mteyg1wky8uqgs.localhost:8080"
else
    echo "⚠ 由于 hosts 未配置，请使用以下方式："
    echo ""
    echo "方式 1: 直接访问（推荐）"
    echo "  http://localhost:5174"
    echo "  http://localhost:5175"
    echo ""
    echo "方式 2: 使用查询参数"
    echo "  http://localhost:5174?prefix=mttf3dq7wrg9on"
    echo "  http://localhost:5175?prefix=mteyg1wky8uqgs"
fi

echo ""
