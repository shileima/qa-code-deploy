#!/bin/bash
# 一键配置子域名访问

# sudo 密码（用于配置 hosts 文件）
PASSWORD="1111"

echo "=========================================="
echo "  配置子域名访问"
echo "=========================================="
echo ""

# 检查并添加 hosts 配置
HOSTS_FILE="/etc/hosts"
ENTRY_1="127.0.0.1   mttf3dq7wrg9on.localhost"
ENTRY_2="127.0.0.1   mteyg1wky8uqgs.localhost"

# 检查是否已存在
if grep -q "mttf3dq7wrg9on.localhost" "$HOSTS_FILE" 2>/dev/null; then
    echo "✓ hosts 配置已存在: mttf3dq7wrg9on.localhost"
else
    echo "添加 hosts 配置..."
    echo "$PASSWORD" | sudo -S bash -c "echo '$ENTRY_1' >> $HOSTS_FILE" 2>/dev/null && echo "✓ 已添加: $ENTRY_1"
fi

if grep -q "mteyg1wky8uqgs.localhost" "$HOSTS_FILE" 2>/dev/null; then
    echo "✓ hosts 配置已存在: mteyg1wky8uqgs.localhost"
else
    echo "添加 hosts 配置..."
    echo "$PASSWORD" | sudo -S bash -c "echo '$ENTRY_2' >> $HOSTS_FILE" 2>/dev/null && echo "✓ 已添加: $ENTRY_2"
fi

echo ""
echo "=========================================="
echo "  配置完成"
echo "=========================================="
echo ""
echo "现在可以通过以下方式访问："
echo ""
echo "方式 1: 使用代理服务器（推荐）"
echo "  1. 启动代理服务器:"
echo "     node scripts/subdomain-proxy.js"
echo "  2. 访问:"
echo "     http://mttf3dq7wrg9on.localhost"
echo "     http://mteyg1wky8uqgs.localhost"
echo ""
echo "方式 2: 直接访问（需要指定端口）"
echo "     http://mttf3dq7wrg9on.localhost:5174"
echo "     http://mteyg1wky8uqgs.localhost:5175"
echo ""
