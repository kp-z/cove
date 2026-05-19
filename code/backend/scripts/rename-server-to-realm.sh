#!/bin/bash

# rename-server-to-realm.sh
# 将 Server 概念全面改名为 Realm
# 支持 dry-run、备份、回滚

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/.rename-backup-$(date +%Y%m%d-%H%M%S)"

# 参数
DRY_RUN=false
NO_BACKUP=false
NO_TEST=false
ROLLBACK=false

# 统计
FILES_TO_MODIFY=0
FILES_TO_RENAME=0
DIRS_TO_RENAME=0

# 帮助信息
show_help() {
    cat << EOF
用法: $0 [选项]

将业务层的 Server 概念全面改名为 Realm

选项:
    --dry-run       预览模式，不实际执行
    --no-backup     不创建备份（不推荐）
    --no-test       跳过测试验证
    --rollback      回滚到最近的备份
    -h, --help      显示此帮助信息

示例:
    $0 --dry-run              # 预览将要执行的操作
    $0                        # 执行改名
    $0 --rollback             # 回滚到备份
EOF
}

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --no-backup)
            NO_BACKUP=true
            shift
            ;;
        --no-test)
            NO_TEST=true
            shift
            ;;
        --rollback)
            ROLLBACK=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}未知选项: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 回滚函数
rollback() {
    log_info "查找最近的备份..."

    LATEST_BACKUP=$(find "$PROJECT_ROOT" -maxdepth 1 -type d -name ".rename-backup-*" | sort -r | head -n 1)

    if [ -z "$LATEST_BACKUP" ]; then
        log_error "未找到备份目录"
        exit 1
    fi

    log_info "找到备份: $LATEST_BACKUP"
    log_warning "即将恢复备份，这将覆盖当前文件！"
    read -p "确认继续? (yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
        log_info "取消回滚"
        exit 0
    fi

    log_info "恢复备份中..."
    rsync -av --delete "$LATEST_BACKUP/" "$PROJECT_ROOT/"

    log_success "回滚完成！"
    log_info "备份目录保留在: $LATEST_BACKUP"
    exit 0
}

# 如果是回滚模式
if [ "$ROLLBACK" = true ]; then
    rollback
fi

# 检查 git 状态
check_git_status() {
    log_info "检查 git 状态..."

    cd "$PROJECT_ROOT"

    if ! git diff-index --quiet HEAD --; then
        log_error "工作目录有未提交的更改，请先提交或暂存"
        exit 1
    fi

    CURRENT_BRANCH=$(git branch --show-current)
    if [ "$CURRENT_BRANCH" != "refactor/server-to-realm" ]; then
        log_warning "当前分支不是 refactor/server-to-realm，而是 $CURRENT_BRANCH"
        read -p "继续? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            exit 0
        fi
    fi

    log_success "Git 状态检查通过"
}

# 创建备份
create_backup() {
    if [ "$NO_BACKUP" = true ]; then
        log_warning "跳过备份（--no-backup）"
        return
    fi

    log_info "创建备份到: $BACKUP_DIR"

    mkdir -p "$BACKUP_DIR"

    # 只备份 src/ tests/ prisma/ 目录
    rsync -av --exclude='node_modules' --exclude='dist' --exclude='.git' \
        "$PROJECT_ROOT/src" \
        "$PROJECT_ROOT/tests" \
        "$PROJECT_ROOT/prisma" \
        "$BACKUP_DIR/"

    log_success "备份完成"
}

# 替换文件内容
replace_in_file() {
    local file=$1
    local dry_run=$2

    # 跳过 node_modules, dist, .git
    if [[ "$file" == *"node_modules"* ]] || [[ "$file" == *"dist"* ]] || [[ "$file" == *".git"* ]]; then
        return
    fi

    # 检查文件是否包含需要替换的内容
    if ! grep -q -E "(Server|server|SERVER)" "$file" 2>/dev/null; then
        return
    fi

    # 检查是否需要替换（排除不应该替换的情况）
    local needs_replacement=false

    # 检查是否包含业务相关的 Server 术语
    if grep -q -E "(ServerEntity|ServerService|ServerContext|IServerRepository|serverId|server_id)" "$file" 2>/dev/null; then
        needs_replacement=true
    fi

    if [ "$needs_replacement" = false ]; then
        return
    fi

    FILES_TO_MODIFY=$((FILES_TO_MODIFY + 1))

    if [ "$dry_run" = true ]; then
        echo "  [MODIFY] $file"
        return
    fi

    # 执行替换
    # 使用 perl 进行替换，保持大小写
    perl -i -pe '
        # 复合词替换 - Server
        s/ServerEntity/RealmEntity/g;
        s/ServerService/RealmService/g;
        s/ServerContext/RealmContext/g;
        s/IServerRepository/IRealmRepository/g;
        s/HybridServerRepository/HybridRealmRepository/g;
        s/ServerNotFoundError/RealmNotFoundError/g;
        s/ServerConflictError/RealmConflictError/g;
        s/ServerValidationError/RealmValidationError/g;
        s/ServerAuthorizationError/RealmAuthorizationError/g;
        s/CreateServerDTO/CreateRealmDTO/g;
        s/UpdateServerDTO/UpdateRealmDTO/g;
        s/ServerEntityProps/RealmEntityProps/g;
        s/ServerEntityJSON/RealmEntityJSON/g;

        # 复合词替换 - ServerMember
        s/ServerMemberEntity/RealmMemberEntity/g;
        s/ServerMemberService/RealmMemberService/g;
        s/IServerMemberRepository/IRealmMemberRepository/g;
        s/HybridServerMemberRepository/HybridRealmMemberRepository/g;
        s/ServerMemberNotFoundError/RealmMemberNotFoundError/g;
        s/CreateServerMemberDTO/CreateRealmMemberDTO/g;
        s/UpdateServerMemberDTO/UpdateRealmMemberDTO/g;
        s/ServerMemberEntityProps/RealmMemberEntityProps/g;
        s/ServerMemberEntityJSON/RealmMemberEntityJSON/g;

        # 方法名替换（必须在字段名替换之前）
        s/createServer/createRealm/g;
        s/getServerById/getRealmById/g;
        s/getServersByOwner/getRealmsByOwner/g;
        s/getServersByStatus/getRealmsByStatus/g;
        s/getAllServers/getAllRealms/g;
        s/updateServer/updateRealm/g;
        s/archiveServer/archiveRealm/g;
        s/unarchiveServer/unarchiveRealm/g;
        s/deleteServer/deleteRealm/g;
        s/getServerContext/getRealmContext/g;

        # Router 相关替换
        s/serverRouter/realmRouter/g;
        s/serverService/realmService/g;

        # 返回对象字段名
        s/servers:/realms:/g;

        # 字段名替换
        s/serverId/realmId/g;
        s/server_id/realm_id/g;
        s/serverName/realmName/g;
        s/server_name/realm_name/g;
        s/serverMemberId/realmMemberId/g;
        s/server_member_id/realm_member_id/g;
        s/serverMemberships/realmMemberships/g;

        # 目录路径替换
        s/\/server\//\/realm\//g;
        s/\/server-member\//\/realm-member\//g;
        s/models\/server/models\/realm/g;
        s/models\/server-member/models\/realm-member/g;
        s/services\/server/services\/realm/g;

        # 文件名替换（在 import 中）
        s/server\.entity/realm.entity/g;
        s/server\.service/realm.service/g;
        s/server\.errors/realm.errors/g;
        s/server\.router/realm.router/g;
        s/server-context/realm-context/g;
        s/server-member\.entity/realm-member.entity/g;
        s/server-member\.service/realm-member.service/g;
        s/server-member\.errors/realm-member.errors/g;
        s/hybrid-server/hybrid-realm/g;
        s/hybrid-server-member/hybrid-realm-member/g;

        # 注释中的替换
        s/Server（工作空间）/Realm（工作空间）/g;
        s/Server 实体/Realm 实体/g;
        s/Server 服务/Realm 服务/g;
        s/ServerMember 实体/RealmMember 实体/g;
        s/ServerMember 服务/RealmMember 服务/g;

        # 存储路径替换
        s/storage\/servers/storage\/realms/g;
        s/\.cove\/storage\/servers/\.cove\/storage\/realms/g;

        # 错误码替换
        s/SERVER_NOT_FOUND/REALM_NOT_FOUND/g;
        s/SERVER_NAME_EXISTS/REALM_NAME_EXISTS/g;
        s/SERVER_NOT_ACTIVE/REALM_NOT_ACTIVE/g;
        s/SERVER_ALREADY_ARCHIVED/REALM_ALREADY_ARCHIVED/g;
        s/SERVER_NOT_ARCHIVED/REALM_NOT_ARCHIVED/g;
        s/UNAUTHORIZED_SERVER_ACCESS/UNAUTHORIZED_REALM_ACCESS/g;

        # Prisma 特定替换
        s/model Server/model Realm/g;
        s/model ServerMember/model RealmMember/g;
        s/@@map\("server_members"\)/@@map("realm_members")/g;
        s/server Server/realm Realm/g;
    ' "$file"

    log_info "已修改: $file"
}

# 重命名文件
rename_file() {
    local old_path=$1
    local new_path=$2
    local dry_run=$3

    FILES_TO_RENAME=$((FILES_TO_RENAME + 1))

    if [ "$dry_run" = true ]; then
        echo "  [RENAME] $old_path -> $new_path"
        return
    fi

    mv "$old_path" "$new_path"
    log_info "已重命名: $old_path -> $new_path"
}

# 重命名目录
rename_directory() {
    local old_path=$1
    local new_path=$2
    local dry_run=$3

    DIRS_TO_RENAME=$((DIRS_TO_RENAME + 1))

    if [ "$dry_run" = true ]; then
        echo "  [RENAME DIR] $old_path -> $new_path"
        return
    fi

    mv "$old_path" "$new_path"
    log_info "已重命名目录: $old_path -> $new_path"
}

# 扫描并替换文件内容
scan_and_replace() {
    local dry_run=$1

    log_info "扫描并替换文件内容..."

    # 查找所有 TypeScript 文件（后端）
    find "$PROJECT_ROOT/src" "$PROJECT_ROOT/tests" -type f \( -name "*.ts" -o -name "*.tsx" \) | while read -r file; do
        replace_in_file "$file" "$dry_run"
    done

    # 处理 Prisma Schema
    if [ -f "$PROJECT_ROOT/prisma/schema.prisma" ]; then
        replace_in_file "$PROJECT_ROOT/prisma/schema.prisma" "$dry_run"
    fi

    # 处理前端代码（如果存在）
    FRONTEND_DIR="$(cd "$PROJECT_ROOT/../frontend" 2>/dev/null && pwd)"
    if [ -d "$FRONTEND_DIR/src" ]; then
        log_info "检测到前端代码，同步处理..."
        find "$FRONTEND_DIR/src" -type f \( -name "*.ts" -o -name "*.tsx" \) | while read -r file; do
            replace_in_file "$file" "$dry_run"
        done
    fi

    log_success "文件内容扫描完成"
}

# 重命名文件和目录
rename_files_and_dirs() {
    local dry_run=$1

    log_info "重命名文件和目录..."

    cd "$PROJECT_ROOT"

    # 重命名目录（从深到浅）
    if [ -d "src/domain/models/server-member" ]; then
        rename_directory "src/domain/models/server-member" "src/domain/models/realm-member" "$dry_run"
    fi

    if [ -d "src/domain/models/server" ]; then
        rename_directory "src/domain/models/server" "src/domain/models/realm" "$dry_run"
    fi

    if [ -d "src/application/services/server" ]; then
        rename_directory "src/application/services/server" "src/application/services/realm" "$dry_run"
    fi

    # 重命名 context 目录中的文件
    if [ -f "src/application/context/server-context.ts" ]; then
        rename_file "src/application/context/server-context.ts" "src/application/context/realm-context.ts" "$dry_run"
    fi

    if [ -f "src/application/context/server-context-store.ts" ]; then
        rename_file "src/application/context/server-context-store.ts" "src/application/context/realm-context-store.ts" "$dry_run"
    fi

    # 重命名 repository 接口文件
    if [ -f "src/application/interfaces/repositories/server-member.repository.interface.ts" ]; then
        rename_file "src/application/interfaces/repositories/server-member.repository.interface.ts" "src/application/interfaces/repositories/realm-member.repository.interface.ts" "$dry_run"
    fi

    if [ -f "src/application/interfaces/repositories/server.repository.interface.ts" ]; then
        rename_file "src/application/interfaces/repositories/server.repository.interface.ts" "src/application/interfaces/repositories/realm.repository.interface.ts" "$dry_run"
    fi

    # 重命名 repository 实现文件
    if [ -f "src/infrastructure/repositories/hybrid-server-member.repository.ts" ]; then
        rename_file "src/infrastructure/repositories/hybrid-server-member.repository.ts" "src/infrastructure/repositories/hybrid-realm-member.repository.ts" "$dry_run"
    fi

    if [ -f "src/infrastructure/repositories/hybrid-server.repository.ts" ]; then
        rename_file "src/infrastructure/repositories/hybrid-server.repository.ts" "src/infrastructure/repositories/hybrid-realm.repository.ts" "$dry_run"
    fi

    if [ -f "src/infrastructure/repositories/server-config.repository.ts" ]; then
        rename_file "src/infrastructure/repositories/server-config.repository.ts" "src/infrastructure/repositories/realm-config.repository.ts" "$dry_run"
    fi

    # 重命名 router 文件
    if [ -f "src/infrastructure/trpc/routers/server.router.ts" ]; then
        rename_file "src/infrastructure/trpc/routers/server.router.ts" "src/infrastructure/trpc/routers/realm.router.ts" "$dry_run"
    fi

    # 重命名测试文件
    if [ -f "src/application/context/__tests__/server-context.test.ts" ]; then
        rename_file "src/application/context/__tests__/server-context.test.ts" "src/application/context/__tests__/realm-context.test.ts" "$dry_run"
    fi

    if [ -f "src/application/services/server/server.service.test.ts" ]; then
        rename_file "src/application/services/server/server.service.test.ts" "src/application/services/realm/realm.service.test.ts" "$dry_run"
    fi

    if [ -f "src/infrastructure/trpc/routers/server.router.test.ts" ]; then
        rename_file "src/infrastructure/trpc/routers/server.router.test.ts" "src/infrastructure/trpc/routers/realm.router.test.ts" "$dry_run"
    fi

    if [ -f "src/infrastructure/repositories/__tests__/server-config.repository.test.ts" ]; then
        rename_file "src/infrastructure/repositories/__tests__/server-config.repository.test.ts" "src/infrastructure/repositories/__tests__/realm-config.repository.test.ts" "$dry_run"
    fi

    # 重命名前端文件（如果存在）
    FRONTEND_DIR="$(cd "$PROJECT_ROOT/../frontend" 2>/dev/null && pwd)"
    if [ -d "$FRONTEND_DIR/src" ]; then
        if [ -f "$FRONTEND_DIR/src/lib/trpc/hooks/server.hooks.ts" ]; then
            rename_file "$FRONTEND_DIR/src/lib/trpc/hooks/server.hooks.ts" "$FRONTEND_DIR/src/lib/trpc/hooks/realm.hooks.ts" "$dry_run"
        fi
    fi

    log_success "文件和目录重命名完成"
}

# 验证编译
verify_compilation() {
    log_info "验证 TypeScript 编译..."

    cd "$PROJECT_ROOT"

    if ! npm run build > /dev/null 2>&1; then
        log_error "TypeScript 编译失败！"
        return 1
    fi

    log_success "TypeScript 编译通过"
    return 0
}

# 运行测试
run_tests() {
    if [ "$NO_TEST" = true ]; then
        log_warning "跳过测试（--no-test）"
        return 0
    fi

    log_info "运行测试..."

    cd "$PROJECT_ROOT"

    if ! npm test > /dev/null 2>&1; then
        log_error "测试失败！"
        return 1
    fi

    log_success "所有测试通过"
    return 0
}

# 主函数
main() {
    log_info "=========================================="
    log_info "Server → Realm 改名脚本"
    log_info "=========================================="

    if [ "$DRY_RUN" = true ]; then
        log_warning "DRY-RUN 模式：仅预览，不实际执行"
    fi

    # 检查 git 状态
    check_git_status

    # 创建备份
    if [ "$DRY_RUN" = false ]; then
        create_backup
    fi

    # 扫描并替换文件内容
    log_info "=========================================="
    log_info "阶段 1: 扫描文件"
    log_info "=========================================="
    scan_and_replace true

    # 重命名文件和目录
    log_info "=========================================="
    log_info "阶段 2: 重命名文件和目录"
    log_info "=========================================="
    rename_files_and_dirs true

    # 显示统计
    log_info "=========================================="
    log_info "统计信息"
    log_info "=========================================="
    echo "  将修改的文件数: $FILES_TO_MODIFY"
    echo "  将重命名的文件数: $FILES_TO_RENAME"
    echo "  将重命名的目录数: $DIRS_TO_RENAME"

    if [ "$DRY_RUN" = true ]; then
        log_info "=========================================="
        log_warning "这是 DRY-RUN 模式，未实际执行任何操作"
        log_info "如需执行，请运行: $0"
        exit 0
    fi

    # 确认执行
    log_info "=========================================="
    log_warning "即将执行改名操作！"
    read -p "确认继续? (yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
        log_info "取消操作"
        exit 0
    fi

    # 执行替换
    log_info "=========================================="
    log_info "执行改名..."
    log_info "=========================================="

    scan_and_replace false
    rename_files_and_dirs false

    # 验证
    log_info "=========================================="
    log_info "验证改名结果..."
    log_info "=========================================="

    if ! verify_compilation; then
        log_error "编译失败！请检查错误并手动修复"
        log_info "备份位置: $BACKUP_DIR"
        log_info "回滚命令: $0 --rollback"
        exit 1
    fi

    if ! run_tests; then
        log_warning "测试失败！但编译通过，可能需要手动修复测试"
        log_info "备份位置: $BACKUP_DIR"
    fi

    # 完成
    log_info "=========================================="
    log_success "改名完成！"
    log_info "=========================================="
    echo "  修改的文件数: $FILES_TO_MODIFY"
    echo "  重命名的文件数: $FILES_TO_RENAME"
    echo "  重命名的目录数: $DIRS_TO_RENAME"
    echo ""
    log_info "备份位置: $BACKUP_DIR"
    echo ""
    log_info "=========================================="
    log_info "下一步操作"
    log_info "=========================================="
    echo ""
    echo "1. 数据库迁移（必须）："
    echo "   cd $PROJECT_ROOT"
    echo "   npx prisma migrate dev --name rename_server_to_realm"
    echo ""
    echo "2. 存储路径迁移（如果有现有数据）："
    echo "   mkdir -p .cove/storage/realms"
    echo "   mv .cove/storage/servers/* .cove/storage/realms/ 2>/dev/null || true"
    echo ""
    echo "3. 验证前端构建（如果修改了前端）："
    echo "   cd $PROJECT_ROOT/../frontend"
    echo "   npm run build"
    echo ""
    log_warning "请检查改名结果，确认无误后提交到 git"
}

# 执行主函数
main
