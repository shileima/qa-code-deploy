#!/bin/bash
# Vite 应用实例管理脚本
# 用法: ./manage-instances.sh <command> [options]

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 实例配置文件
INSTANCES_FILE="${INSTANCES_FILE:-$(dirname "$0")/../.instances.json}"
LOCK_FILE="${LOCK_FILE:-$(dirname "$0")/../.instances.lock}"

# 创建锁文件目录
mkdir -p "$(dirname "$LOCK_FILE")"

# 获取锁
acquire_lock() {
    local timeout=10
    local count=0
    while [ -f "$LOCK_FILE" ] && [ $count -lt $timeout ]; do
        sleep 1
        count=$((count + 1))
    done
    if [ -f "$LOCK_FILE" ]; then
        echo -e "${RED}错误: 无法获取锁，请稍后重试${NC}"
        exit 1
    fi
    touch "$LOCK_FILE"
}

# 释放锁
release_lock() {
    rm -f "$LOCK_FILE"
}

# 初始化实例文件
init_instances_file() {
    if [ ! -f "$INSTANCES_FILE" ]; then
        echo '{}' > "$INSTANCES_FILE"
    fi
}

# 添加实例
add_instance() {
    local prefix=$1
    local port=$2
    
    if [ -z "$prefix" ]; then
        echo -e "${RED}错误: 请提供子域名前缀${NC}"
        exit 1
    fi
    
    # 默认端口从 5174 开始递增
    if [ -z "$port" ]; then
        port=5174
        while jq -e ".instances[] | select(.port == $port)" "$INSTANCES_FILE" > /dev/null 2>&1; do
            port=$((port + 1))
        done
    fi
    
    # 检查前缀是否已存在
    if jq -e ".instances[] | select(.prefix == \"$prefix\")" "$INSTANCES_FILE" > /dev/null 2>&1; then
        echo -e "${YELLOW}警告: 前缀 $prefix 已存在${NC}"
        exit 1
    fi
    
    # 检查端口是否被占用
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${YELLOW}警告: 端口 $port 已被占用${NC}"
        exit 1
    fi
    
    # 添加实例
    local temp_file=$(mktemp)
    jq ".instances += [{\"prefix\": \"$prefix\", \"port\": $port, \"status\": \"stopped\", \"pid\": null}]" "$INSTANCES_FILE" > "$temp_file"
    mv "$temp_file" "$INSTANCES_FILE"
    
    echo -e "${GREEN}已添加实例: $prefix (端口: $port)${NC}"
}

# 删除实例
remove_instance() {
    local prefix=$1
    
    if [ -z "$prefix" ]; then
        echo -e "${RED}错误: 请提供子域名前缀${NC}"
        exit 1
    fi
    
    # 检查实例是否存在
    if ! jq -e ".instances[] | select(.prefix == \"$prefix\")" "$INSTANCES_FILE" > /dev/null 2>&1; then
        echo -e "${YELLOW}警告: 实例 $prefix 不存在${NC}"
        exit 1
    fi
    
    # 停止实例（如果在运行）
    stop_instance "$prefix" 2>/dev/null || true
    
    # 删除实例
    local temp_file=$(mktemp)
    jq "del(.instances[] | select(.prefix == \"$prefix\"))" "$INSTANCES_FILE" > "$temp_file"
    mv "$temp_file" "$INSTANCES_FILE"
    
    echo -e "${GREEN}已删除实例: $prefix${NC}"
}

# 启动实例
start_instance() {
    local prefix=$1
    
    if [ -z "$prefix" ]; then
        echo -e "${RED}错误: 请提供子域名前缀${NC}"
        exit 1
    fi
    
    # 获取实例信息
    local instance=$(jq -r ".instances[] | select(.prefix == \"$prefix\")" "$INSTANCES_FILE")
    if [ -z "$instance" ] || [ "$instance" = "null" ]; then
        echo -e "${RED}错误: 实例 $prefix 不存在${NC}"
        exit 1
    fi
    
    local port=$(echo "$instance" | jq -r '.port')
    local status=$(echo "$instance" | jq -r '.status')
    
    if [ "$status" = "running" ]; then
        echo -e "${YELLOW}警告: 实例 $prefix 已在运行${NC}"
        exit 1
    fi
    
    # 启动实例（后台运行）
    echo -e "${GREEN}正在启动实例: $prefix (端口: $port)${NC}"
    "$(dirname "$0")/start-instance.sh" "$prefix" "$port" > "/tmp/vite-$prefix.log" 2>&1 &
    local pid=$!
    
    # 更新状态
    local temp_file=$(mktemp)
    jq "(.instances[] | select(.prefix == \"$prefix\") | .status) = \"running\" | (.instances[] | select(.prefix == \"$prefix\") | .pid) = $pid" "$INSTANCES_FILE" > "$temp_file"
    mv "$temp_file" "$INSTANCES_FILE"
    
    echo -e "${GREEN}实例已启动: $prefix (PID: $pid, 端口: $port)${NC}"
    echo "日志文件: /tmp/vite-$prefix.log"
}

# 停止实例
stop_instance() {
    local prefix=$1
    
    if [ -z "$prefix" ]; then
        echo -e "${RED}错误: 请提供子域名前缀${NC}"
        exit 1
    fi
    
    # 获取实例信息
    local instance=$(jq -r ".instances[] | select(.prefix == \"$prefix\")" "$INSTANCES_FILE")
    if [ -z "$instance" ] || [ "$instance" = "null" ]; then
        echo -e "${RED}错误: 实例 $prefix 不存在${NC}"
        exit 1
    fi
    
    local pid=$(echo "$instance" | jq -r '.pid')
    local status=$(echo "$instance" | jq -r '.status')
    
    if [ "$status" != "running" ] || [ -z "$pid" ] || [ "$pid" = "null" ]; then
        echo -e "${YELLOW}警告: 实例 $prefix 未在运行${NC}"
        exit 1
    fi
    
    # 停止进程
    if kill "$pid" 2>/dev/null; then
        echo -e "${GREEN}正在停止实例: $prefix${NC}"
        sleep 1
        
        # 更新状态
        local temp_file=$(mktemp)
        jq "(.instances[] | select(.prefix == \"$prefix\") | .status) = \"stopped\" | (.instances[] | select(.prefix == \"$prefix\") | .pid) = null" "$INSTANCES_FILE" > "$temp_file"
        mv "$temp_file" "$INSTANCES_FILE"
        
        echo -e "${GREEN}实例已停止: $prefix${NC}"
    else
        echo -e "${RED}错误: 无法停止实例 $prefix${NC}"
        exit 1
    fi
}

# 列出实例
list_instances() {
    echo -e "${BLUE}实例列表:${NC}"
    jq -r '.instances[] | "\(.prefix)\t\(.port)\t\(.status)\t\(.pid // "N/A")"' "$INSTANCES_FILE" 2>/dev/null | \
    while IFS=$'\t' read -r prefix port status pid; do
        if [ "$status" = "running" ]; then
            echo -e "${GREEN}$prefix${NC}\t端口: $port\t状态: $status\tPID: $pid"
        else
            echo -e "${YELLOW}$prefix${NC}\t端口: $port\t状态: $status\tPID: N/A"
        fi
    done
}

# 状态查询
status_instance() {
    local prefix=$1
    
    if [ -z "$prefix" ]; then
        list_instances
        exit 0
    fi
    
    local instance=$(jq -r ".instances[] | select(.prefix == \"$prefix\")" "$INSTANCES_FILE")
    if [ -z "$instance" ] || [ "$instance" = "null" ]; then
        echo -e "${RED}错误: 实例 $prefix 不存在${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}实例信息: $prefix${NC}"
    echo "$instance" | jq '.'
}

# 主函数
main() {
    local command=$1
    shift || true
    
    init_instances_file
    acquire_lock
    trap release_lock EXIT
    
    case "$command" in
        add)
            add_instance "$@"
            ;;
        remove|rm)
            remove_instance "$@"
            ;;
        start)
            start_instance "$@"
            ;;
        stop)
            stop_instance "$@"
            ;;
        list|ls)
            list_instances
            ;;
        status)
            status_instance "$@"
            ;;
        *)
            echo -e "${RED}用法: $0 <command> [options]${NC}"
            echo ""
            echo "命令:"
            echo "  add <prefix> [port]    添加实例"
            echo "  remove <prefix>        删除实例"
            echo "  start <prefix>         启动实例"
            echo "  stop <prefix>          停止实例"
            echo "  list                   列出所有实例"
            echo "  status [prefix]        查询实例状态"
            exit 1
            ;;
    esac
}

main "$@"
