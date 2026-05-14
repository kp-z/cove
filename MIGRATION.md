# .cove 目录统一迁移记录

## 迁移日期
2026-05-14

## 迁移目标
将三个分散的 `.cove` 目录统一到项目根目录，实现单一数据源管理。

## 迁移前状态

### 1. 根目录 `.cove/` (180K)
- **用途**: Agent 配置、OKR/规划文档
- **内容**: `agents/`, `opp/`

### 2. Code 目录 `code/.cove/` (24K)
- **用途**: 配置模板和目录结构
- **内容**: `config/`, `database/`, `storage/`, `cache/`, `logs/`, `temp/`, `metadata/`
- **状态**: `storage/` 目录为空，仅作为模板

### 3. Backend 目录 `code/backend/.cove/` (424K)
- **用途**: 运行时数据存储
- **内容**: `database/cove.db` (216K), `storage/` (52个JSON文件，208K)
- **状态**: 活跃使用中

## 迁移后状态

### 统一目录结构
```
cove/
└── .cove/                    # 唯一数据目录
    ├── agents/              # Agent 配置（来自根目录）
    ├── opp/                 # OKR/规划（来自根目录）
    ├── config/              # 配置文件（来自 code/.cove/）
    ├── database/            # 数据库（来自 backend/.cove/）
    │   └── cove.db (216K)
    ├── storage/             # 存储文件（来自 backend/.cove/）
    │   ├── channels/ (8 files)
    │   ├── messages/ (17 files)
    │   ├── projects/ (17 files)
    │   └── users/ (10 files)
    ├── cache/               # 缓存（来自 code/.cove/）
    ├── logs/                # 日志（来自 code/.cove/）
    ├── temp/                # 临时文件（来自 code/.cove/）
    └── metadata/            # 元数据（来自 code/.cove/）
```

## 代码修改

### 1. Prisma 配置 (`code/backend/prisma/schema.prisma`)
```prisma
datasource db {
  provider = "sqlite"
  url      = "file:../../../.cove/database/cove.db"
}
```

### 2. 主入口文件 (`code/backend/src/main.ts`)
```typescript
// 从 backend/src/ 向上三级到达项目根目录
const projectRoot = process.env.COVE_PROJECT_ROOT || path.resolve(__dirname, '../../../');
```

### 3. 环境变量 (`code/backend/.env`)
```bash
# 可选：显式指定 .cove 数据目录
COVE_PROJECT_ROOT=/Users/kp/项目/Proj/cove
```

## 验证结果

### 数据完整性
- ✅ 数据库文件: 216K
- ✅ 存储文件: 52 个 JSON 文件
  - channels: 8 files
  - messages: 17 files
  - projects: 17 files
  - users: 10 files

### 服务测试
- ✅ Backend 服务启动成功
- ✅ API 端点正常工作
  - user.list: 10 users
  - project.list: 2 projects
  - channel.list: 2 channels
- ✅ 数据库连接正常
- ✅ 文件存储读写正常

### 清理完成
- ✅ `code/.cove/` 已删除
- ✅ `code/backend/.cove/` 已删除
- ✅ `.gitignore` 已更新
- ✅ 文档已更新

## 备份文件
- 位置: `/Users/kp/项目/Proj/cove/.cove-backup-20260514-105608.tar.gz`
- 大小: 56K
- 内容: 迁移前的所有三个 `.cove` 目录

## 回滚方案

如需回滚到迁移前状态：

```bash
cd /Users/kp/项目/Proj/cove

# 1. 停止服务
pkill -f "node.*backend"

# 2. 恢复备份
tar -xzf .cove-backup-20260514-105608.tar.gz

# 3. 恢复代码修改
git checkout code/backend/src/main.ts
git checkout code/backend/prisma/schema.prisma

# 4. 重启服务
cd code/backend
npm start
```

## 关键经验

### 路径解析问题
初始实现使用 `path.resolve(__dirname, '../../')`，但在使用 tsx 运行时，`__dirname` 指向 `backend/src/`，向上两级只到 `code/` 目录。

**解决方案**: 改为 `path.resolve(__dirname, '../../../')` 以正确到达项目根目录。

### 混合存储架构
Cove 使用混合存储策略：
- **数据库**: 存储索引字段（快速查询）
- **文件系统**: 存储完整实体 JSON（灵活扩展）

迁移时必须同时迁移数据库和存储文件，并确保路径配置一致。

## 后续优化建议

1. **环境变量优先**: 在生产环境中使用 `COVE_PROJECT_ROOT` 环境变量明确指定路径
2. **路径验证**: 在服务启动时验证 `.cove` 目录是否存在且可访问
3. **健康检查**: 添加健康检查端点，验证数据库和存储文件的连接状态
4. **自动备份**: 实现定期自动备份脚本
5. **迁移工具**: 开发数据迁移工具，支持未来的目录结构调整
