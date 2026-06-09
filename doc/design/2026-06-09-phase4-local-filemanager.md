# Phase 4 设计：Local File Manager —— DB 作为 Agent 内容真源（路线 A）

- 日期：2026-06-09
- 阶段：Phase 4（职责下沉重构第 4 步）
- 路线：A（DB 为内容真源 + Prisma 迁移 + 扩展 agentSync 承载完整内容 + Backend 移除 agent 目录文件读写）
- 状态：实施中（采用 expand/contract 两个 Increment，保证全程不破坏正在运行的系统）

## 1. 背景与目标

### 现状
Cove 在本地模式下，Backend（控制面 + UI）与 Local Device（执行面）运行在同一台机器，
都指向 `~/.cove`。Agent 的"内容"（描述、能力、persona、runtime、skills/tools/triggers）
当前由 Backend 的 `HybridAgentRepository` 以**目录结构**直接读写：

```
~/.cove/storage/agents/{agentId}/
  agent.md            # frontmatter + 正文（description/capabilities/tags）
  persona.yaml
  runtime.yaml
  config/{skills,tools,triggers}.yaml
  memory/ workspace/ assets/
```

涉及 Backend 文件读写的位置：
- `infrastructure/repositories/hybrid-agent.repository.ts`
  - `saveEntity/updateEntity`：写 agent.md + 各 yaml
  - `findEntityById/loadEntities`：读目录还原 `AgentEntity`
  - `IAgentConfigStore`（getRuntime/updateRuntime/getPersona/...）：直接读写 yaml
- `infrastructure/database/built-in-agents-initializer.ts`：内置 agent 落盘
- `infrastructure/repositories/filesystem-agent.repository.ts`：未接线的旧纯文件实现

### 目标（路线 A 终态）
- **Backend 仅持有 DB 元数据**：内容存入 `Agent.contentJson`，Backend 不再读写 agent 目录文件。
- **Local 接管文件读写**：Local 是 `~/.cove/storage/agents/*` 的唯一读写方（执行所需）。
- UI 读取 agent 详情/persona/runtime 时，Backend 从 DB（`contentJson`）返回，不碰文件系统。

## 2. 关键约束

1. 系统正在运行（`npm run dev`，tsx watch），且 `~/.cove/database/cove.db` 有真实数据。
2. 本地模式下 Backend 与 Local 共享文件系统；云端模式下二者分离 —— 设计必须对两种部署都成立。
3. 不可逆操作（DB schema 迁移）必须门控，避免 drift / 数据丢失。

## 3. 实施策略：Expand / Contract

为保证每一步系统都可用，拆为两个 Increment。

### Increment 1（本次）—— Expand：让 DB 成为内容真源
1. **Prisma**：`Agent` 新增可空列 `contentJson String?`（加列为加性、非破坏；SQLite `ALTER TABLE ADD COLUMN` 安全）。`prisma generate` 更新类型。
2. **HybridAgentRepository**：
   - 读：优先从 `contentJson` 还原内容；为空时回退读目录文件（便于灰度/回填）。
   - 写：dual-write —— 同时写 `contentJson`（新真源）与目录文件（过渡 shim，供 Local 执行）。
   - `IAgentConfigStore` get/update*：以 `contentJson` 为准读写，同时保留文件 shim。
3. **agentSync 契约扩展**（Local → Backend）：
   - Local `AgentScanner` 除 frontmatter 外，解析 persona.yaml / runtime.yaml / config/*.yaml 及 agent.md 正文，组装完整内容。
   - Local DTO（`AgentMetadataDto`）与 Backend zod schema 增加内容字段。
   - `AgentDiscoveryService.create/updateAgent` 将内容写入 `contentJson`。
4. **门控**：`prisma migrate`（写库）在用户停掉 dev server 后执行；`prisma generate`（仅类型，不碰库）可随时执行。

### Increment 2（后续）—— Contract：物化下沉 + 去除 Backend 文件写
1. Local 新增"文件物化"能力：从 Backend 同步下来的内容（或本地已存在内容）写出/校正 `~/.cove/storage/agents/*`，成为唯一写方。
2. 内置 agent 落盘从 `built-in-agents-initializer` 迁出（Backend 仅写 `contentJson`），由 Local 物化。
3. 移除 `HybridAgentRepository` 的目录文件读写与 `filesystem-agent.repository.ts` 死实现。
4. 回归后删除 dual-write shim。

## 4. contentJson 数据形状

序列化自 `HybridAgentRepository.AgentContent`：

```jsonc
{
  "description": "string?",
  "capabilities": ["string"],
  "tags": ["string"],
  "runtimeConfig": { /* AgentRuntimeConfig */ },
  "persona": { /* PersonaConfig */ },
  "skills": { /* SkillsConfig */ },
  "tools": { /* ToolsConfig */ },
  "triggers": { /* TriggersConfig */ },
  "createdBy": "string"
}
```

## 5. 迁移命令（门控执行）

```bash
# 1) 编辑 schema 后（仅类型，安全，可随时执行）
cd code/cloud/backend && npx prisma generate

# 2) 写库迁移（需先停掉 dev server，避免 watch 重启/drift）
cd code/cloud/backend && npx prisma migrate dev --name add_agent_content_json
```

回退：列为可空且仅新增，回滚只需删除该列的迁移；代码侧读路径对 `contentJson` 为空有回退逻辑。

## 6. 验证

- `tsc --noEmit`（backend + local）干净。
- Local：`agent-scanner` 单测覆盖内容解析；现有 orchestrator 单测保持绿。
- Backend：repository 读取以 contentJson 为准的单测（contentJson 命中 / 回退文件 两条路径）。
- 端到端：用户停服务 → 应用迁移 → 重启 → 创建/编辑 agent、UI 查看 persona/runtime 正常。
