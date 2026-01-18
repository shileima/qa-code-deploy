#!/bin/bash
# Docker Desktop 安装脚本（macOS）

echo "=========================================="
echo "  安装 Docker Desktop (macOS)"
echo "=========================================="
echo ""

# 检查是否已安装 Docker
if command -v docker &> /dev/null; then
    echo "✓ Docker 已安装"
    docker --version
    echo ""
    
    # 检查 Docker 是否运行
    if docker ps &> /dev/null; then
        echo "✓ Docker 正在运行"
    else
        echo "⚠ Docker 未运行，正在启动..."
        open -a Docker
        
        echo ""
        echo "等待 Docker 启动（可能需要 10-30 秒）..."
        for i in {1..30}; do
            sleep 1
            if docker ps &> /dev/null; then
                echo "✓ Docker 已启动"
                break
            fi
            echo -n "."
        done
        echo ""
    fi
    
    echo ""
    echo "=========================================="
    echo "  安装完成"
    echo "=========================================="
    exit 0
fi

# 检查 Homebrew
if ! command -v brew &> /dev/null; then
    echo "✗ 错误: 未安装 Homebrew"
    echo ""
    echo "请先安装 Homebrew："
    echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    echo ""
    exit 1
fi

echo "✓ 检测到 Homebrew"
echo ""

# 检查系统架构
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
    echo "✓ 系统架构: Apple Silicon (arm64)"
    DOCKER_TYPE="Apple Silicon"
else
    echo "✓ 系统架构: Intel (x86_64)"
    DOCKER_TYPE="Intel"
fi
echo ""

# 安装 Docker Desktop
echo "开始安装 Docker Desktop..."
echo ""
echo "注意："
echo "  - 这可能需要几分钟时间（取决于网络速度）"
echo "  - 安装完成后需要手动启动 Docker Desktop"
echo "  - 首次启动可能需要输入密码"
echo ""

read -p "是否继续安装? [Y/n] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]] && [[ $REPLY != "" ]]; then
    echo "已取消安装"
    exit 0
fi

echo ""
echo "正在安装 Docker Desktop..."
brew install --cask docker

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "  ✓ Docker Desktop 安装成功"
    echo "=========================================="
    echo ""
    echo "下一步操作："
    echo "  1. 启动 Docker Desktop："
    echo "     open -a Docker"
    echo ""
    echo "  2. 等待 Docker 启动完成（菜单栏会显示 Docker 图标）"
    echo ""
    echo "  3. 验证安装："
    echo "     docker --version"
    echo "     docker run hello-world"
    echo ""
    echo "  4. 安装完成后，可以运行："
    echo "     ./start-docker.sh"
    echo ""
    
    # 询问是否立即启动
    read -p "是否现在启动 Docker Desktop? [Y/n] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]] || [[ $REPLY == "" ]]; then
        echo ""
        echo "正在启动 Docker Desktop..."
        open -a Docker
        
        echo ""
        echo "等待 Docker 启动（可能需要 10-30 秒）..."
        for i in {1..30}; do
            sleep 1
            if docker ps &> /dev/null 2>&1; then
                echo ""
                echo "✓ Docker 已启动并运行"
                docker --version
                echo ""
                echo "测试运行："
                docker run hello-world
                break
            fi
            echo -n "."
        done
        echo ""
    fi
else
    echo ""
    echo "✗ 安装失败"
    echo ""
    echo "请检查："
    echo "  1. 网络连接是否正常"
    echo "  2. Homebrew 是否正常工作"
    echo "  3. 查看错误信息并手动安装"
    echo ""
    echo "手动安装方式："
    echo "  1. 访问 https://www.docker.com/products/docker-desktop/"
    echo "  2. 下载适合您系统的 Docker Desktop"
    echo "  3. 双击安装文件并按照提示安装"
    echo ""
    exit 1
fi
