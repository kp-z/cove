# Cove 数据目录

统一的数据存储目录，包含所有运行时数据、配置和元数据。

## 目录结构

```
.cove/
├── agents/          # Agent 配置和工作空间
├── opp/             # OKR、计划、进度跟踪
├── config/          # 项目配置文件
├── database/        # SQLite 数据库
│   └── cove.db
├── storage/         # 实体内容存储（JSON）
│   ├── channels/    # 频道数据
│   ├── messages/    # 消息数据
│   ├── projects/    # 项目数据
│   └── users/       # 用户数据
├── cache/           # 缓存文件
├── logs/            # 日志文件
├── temp/            # 临时文件
└── metadata/        # 元数据
```

## 路径配置

Backend 服务通过以下方式定位 `.cove` 目录：

1. **环境变量**（可选）：
   ```bash
   export COVE_PROJECT_ROOT=/Users/kp/项目/Proj/cove
   ```

2. **自动解析**（默认）：
   从 `backend/` 目录向上两级到达项目根目录：
   ```typescript
   const projectRoot = path.resolve(__dirname, '../../');
   ```

## 数据库连接

Prisma 配置：
```prisma
datasource db {
  provider = "sqlite"
  url      = "file:../../../.cove/database/cove.db"
}
```

相对路径从 `backend/prisma/` 到项目根目录的 `.cove/database/`。

## 备份

创建完整备份：
```bash
cd /Users/kp/项目/Proj/cove
tar -czf cove-backup-$(date +%Y%m%d).tar.gz .cove/
```

恢复备份：
```bash
tar -xzf cove-backup-YYYYMMDD.tar.gz
```

## 迁移历史

- **2026-05-14**: 统一三个分散的 `.cove` 目录到项目根目录
  - 从 `code/.cove/` 迁移配置和目录结构
  - 从 `code/backend/.cove/` 迁移数据库和存储文件
  - 更新代码路径配置以支持新位置
