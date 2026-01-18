#!/bin/bash
# 开发环境启动脚本（带服务器端路由）
# 自动启动 Nginx 和多个 Vite 应用实例

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  启动开发环境（服务器端路由）${NC}"
echo -e "${BLUE}========================================${NC}"

# 检查依赖
check_dependencies() {
    local missing_deps=()
    
    if ! command -v pnpm &> /dev/null; then
        missing_deps+=("pnpm")
    fi
    
    if ! command -v nginx &> /dev/null && ! command -v docker &> /dev/null; then
        missing_deps+=("nginx 或 docker")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        echo -e "${RED}错误: 缺少以下依赖:${NC}"
        printf '%s\n' "${missing_deps[@]}"
        exit 1
    fi
}

# 检查端口是否可用
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${YELLOW}警告: 端口 $port 已被占用${NC}"
        return 1
    fi
    return 0
}

# 创建必要的目录
create_directories() {
    echo -e "${BLUE}创建必要的目录...${NC}"
    mkdir -p "$PROJECT_ROOT/nginx/logs"
    mkdir -p "$PROJECT_ROOT/nginx/cache"
    mkdir -p "$PROJECT_ROOT/.instances"
}

# 启动 Nginx（使用 Docker）
start_nginx_docker() {
    echo -e "${GREEN}启动 Nginx（Docker）...${NC}"
    
    # 检查 Nginx 容器是否已存在
    if docker ps -a | grep -q "render-monitor-nginx"; then
        echo -e "${YELLOW}Nginx 容器已存在，尝试启动...${NC}"
        docker start render-monitor-nginx || true
    else
        echo -e "${GREEN}创建并启动 Nginx 容器...${NC}"
        docker run -d \
            --name render-monitor-nginx \
            --network host \
            -v "$PROJECT_ROOT/nginx/dev/nginx.conf:/etc/nginx/nginx.conf:ro" \
            -v "$PROJECT_ROOT/nginx/logs:/var/log/nginx" \
            -v "$PROJECT_ROOT/nginx/cache:/var/cache/nginx" \
            nginx:alpine
    fi
    
    # 等待 Nginx 启动
    sleep 2
    
    if docker ps | grep -q "render-monitor-nginx"; then
        echo -e "${GREEN}✓ Nginx 已启动${NC}"
    else
        echo -e "${RED}✗ Nginx 启动失败${NC}"
        exit 1
    fi
}

# 启动 Nginx（本地）
start_nginx_local() {
    echo -e "${GREEN}启动 Nginx（本地）...${NC}"
    
    if ! check_port 80; then
        echo -e "${YELLOW}端口 80 已被占用，跳过 Nginx 启动${NC}"
        echo -e "${YELLOW}请确保手动配置 Nginx 或使用 Docker${NC}"
        return
    fi
    
    # 检查 Nginx 配置
    if ! nginx -t -c "$PROJECT_ROOT/nginx/dev/nginx.conf" 2>/dev/null; then
        echo -e "${RED}Nginx 配置错误${NC}"
        exit 1
    fi
    
    # 启动 Nginx
    nginx -c "$PROJECT_ROOT/nginx/dev/nginx.conf" || {
        echo -e "${RED}Nginx 启动失败${NC}"
        exit 1
    }
    
    echo -e "${GREEN}✓ Nginx 已启动${NC}"
}

# 初始化默认实例
init_default_instances() {
    echo -e "${BLUE}初始化默认实例...${NC}"
    
    # 检查实例文件
    if [ ! -f "$PROJECT_ROOT/.instances.json" ]; then
        echo '{"instances": []}' > "$PROJECT_ROOT/.instances.json"
    fi
    
    # 添加默认实例（如果不存在）
    if ! jq -e '.instances[] | select(.prefix == "mttf3dq7wrg9on")' "$PROJECT_ROOT/.instances.json" > /dev/null 2>&1; then
        "$SCRIPT_DIR/manage-instances.sh" add mttf3dq7wrg9on 5174
    fi
    
    if ! jq -e '.instances[] | select(.prefix == "mteyg1wky8uqgs")' "$PROJECT_ROOT/.instances.json" > /dev/null 2>&1; then
        "$SCRIPT_DIR/manage-instances.sh" add mteyg1wky8uqgs 5175
    fi
}

# 启动 Vite 实例
start_vite_instances() {
    echo -e "${BLUE}启动 Vite 应用实例...${NC}"
    
    # 读取实例列表
    local instances=$(jq -r '.instances[] | "\(.prefix) \(.port)"' "$PROJECT_ROOT/.instances.json" 2>/dev/null)
    
    if [ -z "$instances" ]; then
        echo -e "${YELLOW}没有找到实例配置${NC}"
        return
    fi
    
    while IFS=' ' read -r prefix port; do
        if [ -z "$prefix" ] || [ -z "$port" ]; then
            continue
        fi
        
        echo -e "${GREEN}启动实例: $prefix (端口: $port)${NC}"
        
        if check_port "$port"; then
            # 使用 manage-instances.sh 启动实例
            "$SCRIPT_DIR/manage-instances.sh" start "$prefix" || {
                echo -e "${YELLOW}警告: 实例 $prefix 启动失败${NC}"
            }
        else
            echo -e "${YELLOW}警告: 实例 $prefix 端口 $port 被占用，跳过${NC}"
        fi
    done <<< "$instances"
}

# 配置 hosts 文件（可选）
configure_hosts() {
    echo -e "${BLUE}配置 hosts 文件...${NC}"
    
    local hosts_content=""
    while IFS=' ' read -r prefix port; do
        if [ -z "$prefix" ]; then
            continue
        fi
        hosts_content+="127.0.0.1\t$prefix.localhost\n"
    done < <(jq -r '.instances[] | "\(.prefix) \(.port)"' "$PROJECT_ROOT/.instances.json" 2>/dev/null)
    
    if [ -n "$hosts_content" ]; then
        echo -e "${YELLOW}请手动添加以下内容到 /etc/hosts 文件:${NC}"
        echo -e "$hosts_content"
        echo ""
        read -p "是否自动添加到 /etc/hosts? (需要 sudo 权限) [y/N] " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo -e "$hosts_content" | sudo tee -a /etc/hosts > /dev/null
            echo -e "${GREEN}✓ hosts 文件已更新${NC}"
        fi
    fi
}

# 健康检查
health_check() {
    echo -e "${BLUE}执行健康检查...${NC}"
    sleep 3
    
    # 检查 Nginx
    if command -v docker &> /dev/null && docker ps | grep -q "render-monitor-nginx"; then
        if curl -s http://localhost/health > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Nginx 健康检查通过${NC}"
        else
            echo -e "${YELLOW}⚠ Nginx 健康检查失败${NC}"
        fi
    fi
    
    # 检查 Vite 实例
    while IFS=' ' read -r prefix port; do
        if [ -z "$prefix" ] || [ -z "$port" ]; then
            continue
        fi
        
        if curl -s "http://localhost:$port" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ 实例 $prefix (端口 $port) 运行正常${NC}"
        else
            echo -e "${YELLOW}⚠ 实例 $prefix (端口 $port) 未响应${NC}"
        fi
    done < <(jq -r '.instances[] | select(.status == "running") | "\(.prefix) \(.port)"' "$PROJECT_ROOT/.instances.json" 2>/dev/null)
}

# 显示访问信息
show_access_info() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  访问信息${NC}"
    echo -e "${BLUE}========================================${NC}"
    
    echo -e "${GREEN}通过 Nginx 访问:${NC}"
    while IFS=' ' read -r prefix port; do
        if [ -z "$prefix" ]; then
            continue
        fi
        echo -e "  ${BLUE}http://$prefix.localhost${NC} → Vite 实例 (端口: $port)"
    done < <(jq -r '.instances[] | "\(.prefix) \(.port)"' "$PROJECT_ROOT/.instances.json" 2>/dev/null)
    
    echo ""
    echo -e "${GREEN}直接访问 Vite 实例:${NC}"
    while IFS=' ' read -r prefix port; do
        if [ -z "$prefix" ]; then
            continue
        fi
        echo -e "  ${BLUE}http://localhost:$port${NC} → $prefix"
    done < <(jq -r '.instances[] | "\(.prefix) \(.port)"' "$PROJECT_ROOT/.instances.json" 2>/dev/null)
    
    echo ""
    echo -e "${YELLOW}提示:${NC}"
    echo "  - 使用 Ctrl+C 停止所有服务"
    echo "  - 查看实例状态: $SCRIPT_DIR/manage-instances.sh list"
    echo "  - 停止所有服务: $SCRIPT_DIR/stop-all.sh"
    echo ""
}

# 主函数
main() {
    cd "$PROJECT_ROOT"
    
    check_dependencies
    create_directories
    init_default_instances
    
    # 选择启动方式
    if command -v docker &> /dev/null; then
        USE_DOCKER=${USE_DOCKER:-"yes"}
        if [ "$USE_DOCKER" = "yes" ]; then
            start_nginx_docker
        else
            start_nginx_local
        fi
    else
        start_nginx_local
    fi
    
    start_vite_instances
    
    # 可选：配置 hosts
    read -p "是否配置 hosts 文件? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        configure_hosts
    fi
    
    health_check
    show_access_info
    
    # 等待信号
    echo -e "${GREEN}所有服务已启动，按 Ctrl+C 停止${NC}"
    trap 'echo -e "\n${YELLOW}正在停止服务...${NC}"; "$SCRIPT_DIR/stop-all.sh"; exit 0' INT TERM
    
    # 保持运行
    wait
}

main "$@"
