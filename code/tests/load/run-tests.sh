#!/bin/bash

# Load Test Runner
#
# 运行所有压力测试脚本

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
check_dependencies() {
    log_info "检查依赖..."

    if ! command -v k6 &> /dev/null; then
        log_error "k6 未安装，请运行: brew install k6"
        exit 1
    fi

    if ! command -v artillery &> /dev/null; then
        log_error "artillery 未安装，请运行: npm install -g artillery"
        exit 1
    fi

    log_info "依赖检查通过"
}

# 运行 WebSocket 连接测试
run_websocket_test() {
    log_info "运行 WebSocket 连接压力测试..."
    log_info "目标：10,000 并发连接"

    k6 run \
        --out json=results/websocket-test-$(date +%Y%m%d-%H%M%S).json \
        websocket-load-test.js

    if [ $? -eq 0 ]; then
        log_info "WebSocket 测试完成 ✓"
    else
        log_error "WebSocket 测试失败 ✗"
        return 1
    fi
}

# 运行消息路由测试
run_message_routing_test() {
    log_info "运行消息路由压力测试..."
    log_info "目标：10,000 msg/s 吞吐量"

    artillery run \
        --output results/message-routing-test-$(date +%Y%m%d-%H%M%S).json \
        message-routing-test.yml

    if [ $? -eq 0 ]; then
        log_info "消息路由测试完成 ✓"
    else
        log_error "消息路由测试失败 ✗"
        return 1
    fi
}

# 运行配置同步测试
run_config_sync_test() {
    log_info "运行配置同步压力测试..."
    log_info "目标：缓存命中率 > 95%"

    artillery run \
        --output results/config-sync-test-$(date +%Y%m%d-%H%M%S).json \
        config-sync-test.yml

    if [ $? -eq 0 ]; then
        log_info "配置同步测试完成 ✓"
    else
        log_error "配置同步测试失败 ✗"
        return 1
    fi
}

# 生成测试报告
generate_report() {
    log_info "生成测试报告..."

    # 使用 artillery 生成 HTML 报告
    for json_file in results/*.json; do
        if [[ $json_file == *"message-routing"* ]] || [[ $json_file == *"config-sync"* ]]; then
            artillery report "$json_file" --output "${json_file%.json}.html"
        fi
    done

    log_info "测试报告已生成到 results/ 目录"
}

# 主函数
main() {
    log_info "========================================="
    log_info "LLM Adapter Migration - 压力测试"
    log_info "========================================="

    # 创建结果目录
    mkdir -p results

    # 检查依赖
    check_dependencies

    # 解析参数
    TEST_TYPE=${1:-all}

    case $TEST_TYPE in
        websocket)
            run_websocket_test
            ;;
        routing)
            run_message_routing_test
            ;;
        config)
            run_config_sync_test
            ;;
        all)
            log_info "运行所有测试..."
            run_websocket_test
            run_message_routing_test
            run_config_sync_test
            ;;
        *)
            log_error "未知的测试类型: $TEST_TYPE"
            log_info "用法: $0 [websocket|routing|config|all]"
            exit 1
            ;;
    esac

    # 生成报告
    generate_report

    log_info "========================================="
    log_info "所有测试完成！"
    log_info "========================================="
}

# 运行主函数
main "$@"
