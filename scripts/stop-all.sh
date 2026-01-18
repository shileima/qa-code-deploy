#!/bin/bash
# 停止所有服务脚本
# 停止 Nginx 和所有 Vite 应用实例

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
echo -e "${BLUE}  停止所有服务${NC}"
echo -e "${BLUE}========================================${NC}"

# 停止 Nginx（Docker）
stop_nginx_docker() {
    echo -e "${BLUE}停止 Nginx（Docker）...${NC}"
    
    if docker ps | grep -q "render-monitor-nginx"; then
        docker stop render-monitor-nginx
        echo -e "${GREEN}✓ Nginx 已停止${NC}"
    else
        echo -e "${YELLOW}Nginx 容器未运行${NC}"
    fi
    
    # 可选：删除容器
    read -p "是否删除 Nginx 容器? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker rm render-monitor-nginx 2>/dev/null || true
        echo -e "${GREEN}✓ Nginx 容器已删除${NC}"
    fi
}

# 停止 Nginx（本地）
stop_nginx_local() {
    echo -e "${BLUE}停止 Nginx（本地）...${NC}"
    
    # 查找 Nginx 主进程
    local nginx_pid=$(pgrep -f "nginx.*nginx.conf" | head -1)
    
    if [ -n "$nginx_pid" ]; then
        # 优雅停止
        nginx -s quit -c "$PROJECT_ROOT/nginx/dev/nginx.conf" 2>/dev/null || {
            # 强制停止
            kill "$nginx_pid" 2>/dev/null || true
        }
        echo -e "${GREEN}✓ Nginx 已停止${NC}"
    else
        echo -e "${YELLOW}Nginx 未运行${NC}"
    fi
}

# 停止所有 Vite 实例
stop_vite_instances() {
    echo -e "${BLUE}停止所有 Vite 应用实例...${NC}"
    
    if [ ! -f "$PROJECT_ROOT/.instances.json" ]; then
        echo -e "${YELLOW}实例配置文件不存在${NC}"
        return
    fi
    
    # 获取所有运行中的实例
    local running_instances=$(jq -r '.instances[] | select(.status == "running") | .prefix' "$PROJECT_ROOT/.instances.json" 2>/dev/null)
    
    if [ -z "$running_instances" ]; then
        echo -e "${YELLOW}没有运行中的实例${NC}"
        return
    fi
    
    while IFS= read -r prefix; do
        if [ -z "$prefix" ]; then
            continue
        fi
        
        echo -e "${BLUE}停止实例: $prefix${NC}"
        "$SCRIPT_DIR/manage-instances.sh" stop "$prefix" 2>/dev/null || {
            echo -e "${YELLOW}警告: 无法停止实例 $prefix${NC}"
        }
    done <<< "$running_instances"
}

# 停止所有相关的进程
stop_all_processes() {
    echo -e "${BLUE}清理残留进程...${NC}"
    
    # 停止所有 Vite 开发服务器进程（基于端口）
    for port in 5174 5175 5176 5177 5178; do
        local pid=$(lsof -ti :$port 2>/dev/null || true)
        if [ -n "$pid" ]; then
            echo -e "${YELLOW}停止端口 $port 上的进程 (PID: $pid)${NC}"
            kill "$pid" 2>/dev/null || true
        fi
    done
    
    # 等待进程退出
    sleep 1
}

# 主函数
main() {
    cd "$PROJECT_ROOT"
    
    stop_vite_instances
    stop_all_processes
    
    # 停止 Nginx
    if command -v docker &> /dev/null && docker ps | grep -q "render-monitor-nginx"; then
        stop_nginx_docker
    else
        stop_nginx_local
    fi
    
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  所有服务已停止${NC}"
    echo -e "${GREEN}========================================${NC}"
}

main "$@"
