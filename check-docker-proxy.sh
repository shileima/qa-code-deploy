#!/bin/bash
# 检查 Docker 代理配置脚本

echo "=========================================="
echo "  检查 Docker 代理配置"
echo "=========================================="
echo ""

# 检查 Docker 是否运行
if ! docker ps &> /dev/null; then
    echo "⚠ Docker 未运行，请先启动 Docker Desktop"
    exit 1
fi

echo "✓ Docker 正在运行"
echo ""

# 检查 Docker 代理配置（通过 docker info）
echo "1. Docker 代理配置（从 docker info）："
docker info 2>/dev/null | grep -i -A 5 "proxies" || echo "  未找到代理配置"
echo ""

# 检查系统代理设置
echo "2. 系统代理设置："

# 获取当前网络服务（通常是以太网或 Wi-Fi）
NETWORK_SERVICE=$(networksetup -listallnetworkservices | grep -E "Wi-Fi|Ethernet|USB" | head -1)

if [ -n "$NETWORK_SERVICE" ]; then
    echo "  当前网络服务: $NETWORK_SERVICE"
    echo ""
    echo "  HTTP 代理:"
    networksetup -getwebproxy "$NETWORK_SERVICE" 2>/dev/null | grep -E "Enabled|Server|Port" || echo "    未设置"
    echo ""
    echo "  HTTPS 代理:"
    networksetup -getsecurewebproxy "$NETWORK_SERVICE" 2>/dev/null | grep -E "Enabled|Server|Port" || echo "    未设置"
else
    echo "  无法检测网络服务"
fi
echo ""

# 检查环境变量
echo "3. 环境变量（代理设置）："
echo "  HTTP_PROXY: ${HTTP_PROXY:-未设置}"
echo "  HTTPS_PROXY: ${HTTPS_PROXY:-未设置}"
echo "  http_proxy: ${http_proxy:-未设置}"
echo "  https_proxy: ${https_proxy:-未设置}"
echo ""

# 检查 Docker Desktop 配置文件
echo "4. Docker Desktop 配置文件："
DOCKER_CONFIG_FILE="$HOME/Library/Group Containers/group.com.docker/settings.json"
if [ -f "$DOCKER_CONFIG_FILE" ]; then
    echo "  配置文件位置: $DOCKER_CONFIG_FILE"
    echo "  代理配置:"
    cat "$DOCKER_CONFIG_FILE" | grep -i -A 5 "proxy" 2>/dev/null || echo "    未找到代理配置"
else
    echo "  配置文件不存在: $DOCKER_CONFIG_FILE"
fi
echo ""

# 测试网络连接
echo "5. 网络连接测试："
echo "  测试连接 registry-1.docker.io:443..."
if nc -z -v -G 5 registry-1.docker.io 443 2>&1 | grep -q "succeeded"; then
    echo "  ✓ 可以连接到 Docker Hub (443 端口)"
else
    echo "  ✗ 无法连接到 Docker Hub (443 端口)"
fi
echo ""

echo "=========================================="
echo "  配置建议"
echo "=========================================="
echo ""
echo "如果未配置代理，但无法连接 Docker Hub："
echo ""
echo "方法 1: 使用 Docker Desktop GUI 配置代理"
echo "  1. 打开 Docker Desktop"
echo "  2. Settings → Resources → Proxies"
echo "  3. 配置代理并 Apply & Restart"
echo ""
echo "方法 2: 查看配置文档"
echo "  cat docs/DOCKER_PROXY_SETUP.md"
echo ""
