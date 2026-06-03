# Cove 项目目录整理方案

## 评估日期
2026-05-15

## 当前问题

### 1. 文档分散
- `code/docs/` - 通用开发文档（1个文件）
- `code/backend/docs/` - 后端专属文档（3个文件）
- `code/CORS-FIX.md` - 散落的修复文档
- `code/frontend/agent-two-tier-classification.md` - 前端功能文档
- `code/frontend/test-trpc-integration.md` - 测试文档

### 2. 文档重复
- `code/README.md` 和各子项目的 README.md 可能存在内容重复

### 3. 缺少统一的文档索引
- 开发者需要在多个目录中查找文档

## 整理方案

### 原则
1. **单一来源**：所有文档统一放在根目录 `docs/` 下
2. **按类型分类**：开发文档、架构文档、报告分开
3. **保留子项目 README**：各子项目保留自己的 README.md 作为快速入口
4. **避免污染 code 目录**：code/ 目录只保留代码和配置文件

### 目标目录结构

```
cove/
├── docs/
│   ├── development/              # 开发文档（新增）
│   │   ├── debugging.md          # 从 code/docs/ 移动
│   │   ├── cors-fix.md           # 从 code/CORS-FIX.md 移动并重命名
│   │   └── README.md             # 开发文档索引（新建）
│   ├── features/                 # 功能实现文档（新增）
│   │   ├── backend/
│   │   │   ├── agent-scope-design.md      # 从 code/backend/docs/ 移动
│   │   │   ├── claude-code-cli-adapter.md # 从 code/backend/docs/ 移动
│   │   │   └── optimization-summary.md    # 从 code/backend/docs/ 移动
│   │   ├── frontend/
│   │   │   ├── agent-two-tier-classification.md  # 从 code/frontend/ 移动
│   │   │   └── test-trpc-integration.md          # 从 code/frontend/ 移动
│   │   └── README.md             # 功能文档索引（新建）
│   ├── report/                   # 评估报告（已存在）
│   │   ├── alice/
│   │   └── frontend_engineer/
│   ├── superpowers/              # 超能力文档（已存在）
│   ├── v4/                       # V4 架构文档（已存在）
│   └── README.md                 # 文档总索引（新建）
├── code/
│   ├── backend/
│   │   └── README.md             # 保留：后端快速入口
│   ├── frontend/
│   │   └── README.md             # 保留：前端快速入口
│   └── README.md                 # 保留：代码目录说明
└── README.md                     # 保留：项目总入口
```

## 执行步骤

### Phase 1: 创建新目录结构
```bash
mkdir -p docs/development
mkdir -p docs/features/backend
mkdir -p docs/features/frontend
```

### Phase 2: 移动文档文件
```bash
# 开发文档
mv code/docs/debugging.md docs/development/
mv code/CORS-FIX.md docs/development/cors-fix.md

# 后端功能文档
mv code/backend/docs/AGENT_SCOPE_DESIGN.md docs/features/backend/agent-scope-design.md
mv code/backend/docs/CLAUDE_CODE_CLI_ADAPTER.md docs/features/backend/claude-code-cli-adapter.md
mv code/backend/docs/OPTIMIZATION_SUMMARY.md docs/features/backend/optimization-summary.md

# 前端功能文档
mv code/frontend/agent-two-tier-classification.md docs/features/frontend/
mv code/frontend/test-trpc-integration.md docs/features/frontend/
```

### Phase 3: 删除空目录
```bash
rmdir code/docs
rmdir code/backend/docs
```

### Phase 4: 创建文档索引
创建以下索引文件：
- `docs/README.md` - 文档总索引
- `docs/development/README.md` - 开发文档索引
- `docs/features/README.md` - 功能文档索引

### Phase 5: 更新引用
检查并更新以下文件中的文档路径引用：
- `code/README.md`
- `code/backend/README.md`
- `code/frontend/README.md`
- 根目录 `README.md`

## 文档分类说明

### development/ - 开发文档
存放开发环境配置、调试工具、问题修复等技术文档。

**当前文件**：
- `debugging.md` - Chrome DevTools + MCP 调试环境配置
- `cors-fix.md` - CORS 问题修复说明

### features/ - 功能实现文档
存放具体功能的设计文档和实现说明。

**后端功能**：
- `agent-scope-design.md` - Agent Scope 重构设计
- `claude-code-cli-adapter.md` - Claude Code CLI 适配器
- `optimization-summary.md` - 性能优化总结

**前端功能**：
- `agent-two-tier-classification.md` - Agent 页面二层分类
- `test-trpc-integration.md` - tRPC 集成测试

### report/ - 评估报告
存放架构评估、代码审查等报告。

### v4/ - V4 架构文档
存放 V4 版本的完整架构设计文档。

## 临时文件管理

### 当前状态
✅ 未发现临时文件（.log, .tmp, .cache, .DS_Store 等）

### 预防措施
建议在 `code/.gitignore` 中添加：
```gitignore
# 临时文件
*.log
*.tmp
*.cache
.DS_Store
*.swp
*.swo

# 调试文件
debug-*.md
temp-*.md
```

## 注意事项

### 保留的文件
以下文件**不移动**，保留在原位置：
- `code/README.md` - 代码目录说明
- `code/backend/README.md` - 后端快速入口
- `code/frontend/README.md` - 前端快速入口
- 根目录 `README.md` - 项目总入口

### 文档命名规范
- 使用小写字母和连字符：`agent-scope-design.md`
- 避免使用大写和下划线：~~`AGENT_SCOPE_DESIGN.md`~~
- 保持文件名简洁且描述性强

### 文档内容更新
移动后需要更新文档中的：
1. 相对路径引用
2. 文件位置说明
3. 相关文件列表

## 预期收益

1. **统一的文档入口**：所有文档从 `docs/` 开始查找
2. **清晰的分类**：开发文档、功能文档、架构文档分开
3. **干净的代码目录**：code/ 目录只包含代码和配置
4. **更好的可维护性**：新文档有明确的归属位置
5. **避免重复**：统一管理减少文档重复

## 后续建议

1. **建立文档规范**：制定文档编写和存放规范
2. **定期审查**：每月检查文档是否需要更新或归档
3. **自动化检查**：添加 CI 检查，防止在 code/ 目录创建文档文件
4. **文档版本管理**：重要设计文档考虑版本化管理
