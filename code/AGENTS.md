# Cove 代码库 · AI 辅助开发规范

> 适用范围：本文件位于 `code/` 目录下，对 `code/` 及其所有子目录（`local/`、`cloud/backend/`、`cloud/frontend/` 等）生效。
> 无论使用 Cursor 还是 Claude Code 进行开发，本规范都会被自动纳入上下文（详见文末"本文件如何被自动加载"）。
> 本文件基于对本仓库当前真实代码结构的实际调研撰写，所有目录/文件示例均为仓库中确实存在的路径，如与代码现状不符，请以代码为准并回来更新本文件。

## 零、写在前面

Cove 由三个子项目组成：

- `code/local`：本地设备端（Node.js，负责在用户设备上运行 Agent、对接 LLM CLI/API）。
- `code/cloud/backend`：云端后端（tRPC + Prisma，负责业务编排、持久化、与设备端通信）。
- `code/cloud/frontend`：云端前端（React + Vite，负责用户界面）。

三个子项目各自独立管理依赖（各自的 `package.json`、`tsconfig.json`），但共享同一套开发哲学和目录组织逻辑。本文件对三者都适用；涉及具体子项目差异的地方会分节说明。

---

## 一、核心开发哲学

### 1. 若无必要勿增实体（Occam's Razor / YAGNI）

**应该怎么做：**

- 新增文件/模块/依赖前，先用搜索工具确认代码库里没有已存在的等价实现。三个子项目里都有大量按领域划分的目录（如 `domain/`、`application/services/`、`features/`），新需求大概率已有可挂靠的位置。
- 只在"当前任务真实需要"时引入抽象（接口、工厂、策略类），不要为"将来可能的扩展"预先设计。
- 配置项、环境变量、npm 依赖，能不加就不加；已有的技术选型（backend 用 tRPC + Prisma，frontend 用 Zustand + TanStack Query + Radix，local 用原生 WebSocket/tRPC client）不要在没有强理由的情况下引入平行方案。

**本仓库中的真实反例（新代码引以为戒，看到时顺手清理而不是效仿）：**

- `code/cloud/backend/src/infrastructure/trpc/routers/file-system.router.ts` 与 `.../filesystem.router.ts` 是两个功能重叠的路由文件，但 `routers/index.ts` 中只注册了后者（`createFileSystemRouter`），前者是无人引用的死代码。新增路由前应检查 `routers/index.ts` 的注册列表，确认没有同名/同职责的路由已存在。
- `code/local/src/claude-code-cli-adapter.ts`（一个仅有十几行的环境变量配置读取函数）与 `code/local/src/infrastructure/adapters/llm/claude-code-cli-adapter.ts`（真正的 LLM 适配器实现，700+ 行）同名但职责完全不同。这种"同名不同职责"的文件极易被误认为重复实现或被误改错文件，新文件命名前务必全局搜索一次同名文件。

### 2. 高内聚低耦合

**应该怎么做：**

- **模块内聚**：一个领域目录（如 `domain/agent-runtime/`、`features/channel/`）内部处理自己的实体、状态和逻辑，不把无关职责塞进同一个目录。
- **依赖单向**：分层之间的依赖方向必须是 `infrastructure → application → domain`（backend）或 `infrastructure → domain`（local），即外层依赖内层，内层不依赖外层的具体实现。
- **允许的例外（已是本仓库的既定模式，请延续）**：`domain/` 中的文件可以 `import type` 引用 `infrastructure/**/*.interface.ts` 中定义的接口类型（例如 `code/local/src/domain/device-lifecycle/device-lifecycle-manager.ts` 引用 `infrastructure/gateway/backend-gateway.interface.ts`），因为这只是类型声明、不产生运行时耦合，符合依赖倒置。**但禁止**在 `domain/` 中 `import` 任何 `infrastructure/` 下的具体实现类或运行时代码。
- **前端 features 边界**：调研确认目前 `code/cloud/frontend/src/features/*` 之间**没有任何一处**互相导入对方内部实现——这是一个已经被良好遵守的约定，新代码必须继续保持。若两个 feature 需要共享逻辑，应把公共部分上提到 `shared/` 或 `core/`，而不是从 `features/other-feature/xxx` 深层路径直接 import。

**本仓库中的真实反例：**

- `code/cloud/backend/src/domain/services/` 下的子目录使用了 `message_mention`、`okr_progress`、`permission_evaluation`、`task_assignment`、`workflow_validation`（snake_case），而同级的 `domain/adapter-manager`、`domain/device-lifecycle`、`domain/feature-flag`、`domain/message-orchestrator`（kebab-case）风格不一致。这是命名规范不统一导致的耦合成本（工程师需要记住两套规则）。**新增 domain service 目录一律使用 kebab-case**，不要模仿 `domain/services/` 下这几个历史命名。

### 3. 代码简洁优雅

**应该怎么做：**

- 单个函数聚焦一件事，控制在合理长度内（团队约定不超过 50 行），超长函数拆分为多个私有辅助函数。
- 避免过长的位置参数列表，超过 3 个参数时改用带命名字段的 options 对象（backend 中的 service 构造函数已普遍这样做，例如 `RouterDependencies` 接口）。
- 避免过度技巧化的写法（链式调用嵌套过深、隐晦的三元表达式嵌套等），可读性优先于"聪明"。
- 命名要能自解释：变量/函数名描述其内容或行为，不用 `data1`、`temp`、`handleXxx2` 这类含糊命名。

### 4. 架构简洁直接、稳定

**应该怎么做：**

- `code/README.md` 中已经写明了 backend 的 `domain / application / infrastructure` 三层架构和 frontend 的 `features / shared / core` 组织方式，这是本仓库当前确定的目标架构。新增代码应该落在这套既定分层里，**不要新建平行的顶层目录**（例如不要在 backend `src/` 下新增 `services/` 与已有的 `application/services/` 并存）。
- 架构演进要克制：只有当现有分层确实无法承载新需求时，才考虑调整分层，并且要同步更新 `code/README.md`，避免文档与代码结构脱节。
- 不要为了"未来可能用到"预先搭建复杂结构（多级抽象工厂、通用插件系统等），除非当前确实有 ≥2 个具体场景需要复用。

### 5. 项目目录的规范和优雅

详见下一章"目录结构规范"，按子项目给出具体的落地规则。

---

## 二、目录结构规范

### 2.1 Local 设备端（`code/local/src`）

现状分层（继续遵循）：

```
src/
├── domain/                    # 领域逻辑，按子领域分子目录
│   ├── agent-runtime/         # Agent 执行编排、去重、后处理器
│   ├── agent-sync/            # Agent 元数据与云端同步
│   ├── configuration/         # 配置领域服务
│   ├── device-lifecycle/      # 设备连接/健康监控/错误恢复
│   ├── execution-mode/
│   └── feature-flag/
├── infrastructure/            # 基础设施实现，供 domain 通过接口调用
│   ├── adapters/llm/          # LLM 适配器实现（claude-code-cli-adapter.ts 等）
│   ├── gateway/                # 与云端 backend 通信的网关实现
│   ├── logger/
│   └── storage/
├── common/                    # 极少量、真正跨层共享的工具（如 channel-ref.ts）
└── deprecated/                # 待清理的废弃代码隔离区
```

**具体规则：**

- 新的领域逻辑放进 `domain/<子领域>/`，新的基础设施实现放进 `infrastructure/<类别>/`。**不要继续往 `src/` 根目录堆放新文件**——`src/` 根目录下仍有部分早期未完成迁移的历史文件（如 `adapter-executor.ts`、`config.ts`、`device-client.ts` 等），是本仓库尚待改进项，而非应该效仿的模式。新代码必须直接进入正确的分层子目录。
- 确认某个能力是否已经存在时，先看 `domain/` 和 `infrastructure/adapters/`、`infrastructure/gateway/` 下是否已有同类实现，避免出现前文提到的 `claude-code-cli-adapter.ts` 命名冲突问题。
- 废弃代码应删除或移入专门的废弃隔离区，不要让新旧实现同时留在同一目录下用文件名区分版本（如 `xxx.v1.ts`、`xxx-old.ts`）。

### 2.2 Cloud Backend（`code/cloud/backend/src`）

现状分层（与 `code/README.md` 中的 v4 架构规划一致，继续遵循）：

```
src/
├── domain/
│   ├── models/<entity>/       # 领域实体：agent, channel, device, message, project, task, thread, user, workflow, realm, adapter, okr ...
│   ├── services/<domain-service>/  # 跨实体业务规则（例：permission-evaluation, task-assignment）
│   ├── adapter-manager/ device-lifecycle/ feature-flag/ message-orchestrator/  # 独立领域子系统
│   └── types/
├── application/
│   ├── services/<feature>/    # 应用服务，编排业务流程（agent, channel, message, task, workflow, user, realm, device ...）
│   ├── interfaces/            # repositories / services 的接口定义
│   └── context/               # 应用上下文（如 realm-context）
├── infrastructure/
│   ├── repositories/          # Prisma/混合存储的仓储实现（*.repository.ts）
│   ├── trpc/routers/          # tRPC 路由（*.router.ts），统一在 routers/index.ts 注册
│   ├── database/ persistence/ storage/ events/ websocket/ device/
└── common/errors/             # 统一错误定义
```

**具体规则：**

- 新增实体先放 `domain/models/<entity>/`，跨实体规则放 `domain/services/<name>/`（**用 kebab-case**，不要用 snake_case，见第一章反例）。
- 新增业务流程放 `application/services/<feature>/`，只做流程编排、调用 domain 与 repositories，不直接写持久化细节。
- 新增 tRPC 接口：在 `infrastructure/trpc/routers/` 下新建 `<name>.router.ts`，并**务必**在 `infrastructure/trpc/routers/index.ts` 里注册它——新增路由前先打开这个文件确认没有同名/同职责路由已存在，避免重蹈 `file-system.router.ts` 死代码的覆辙。
- 跨目录引用优先使用 `tsconfig.json` 中已配置好的路径别名 `@domain/*`、`@application/*`、`@infrastructure/*`，而不是 `../../../` 这种深层相对路径。
- 错误处理统一走 `common/errors/`：新增错误类型继承 `base.errors.ts` 中的 `AppError` 抽象基类，按来源归类到 `business.errors.ts` 或 `system.errors.ts`，由 `trpc-mapper.ts` 统一转换为 tRPC 错误返回给前端。不要在业务代码里直接 `throw new Error(...)` 或返回裸字符串错误码。

### 2.3 Cloud Frontend（`code/cloud/frontend/src`）

现状分层（继续遵循）：

```
src/
├── features/<feature>/        # 按业务功能域组织：agent, auth, channel, chat, dashboard, file-editor,
│   ├── components/            #   history, okr, project, realm, settings, task, terminal, workflow ...
│   ├── domain/models/         # 功能域内部的领域模型（例：features/channel/domain/models/Message.ts）
│   ├── hooks/
│   ├── stores/
│   ├── types/
│   └── api/
├── core/                      # 应用级基础设施：auth, config, i18n, router, services, stores
├── shared/                    # 与具体业务无关、可跨 feature 复用的 UI/hooks/utils
│   ├── components/{ui,display,layout,charts}/
│   ├── hooks/ lib/ stores/ types/ utils/
└── lib/trpc/                  # tRPC client 封装
```

**具体规则：**

- `core/` 只放"应用启动即需要、与具体业务功能无关"的基础设施（鉴权、路由、i18n、全局 config/services/stores）。**不要**把某个 feature 专属的逻辑放进 `core/`。
- `shared/` 只放"不带业务语义、纯技术复用"的组件/hooks/工具（按钮、卡片、loading 动画、日期格式化等）。一旦某个组件开始包含具体业务概念（如 Channel、Task），就应该放回对应的 `features/<feature>/components/`，而不是塞进 `shared/`。
- 新业务功能一律新建 `features/<feature>/`，内部再按 `components/hooks/stores/types` 组织；模型/领域逻辑较重的功能可以参考 `features/channel/domain/` 的模式单独建 `domain/` 子目录。
- **严禁 feature 之间互相 import 对方内部实现**（当前代码库已完全遵守此约束，务必保持）。需要共享时，把公共部分上提到 `shared/` 或 `core/`。
- 组件迭代产生的旧版本文件应直接删除或依赖 git 历史回溯，不要用文件名后缀区分版本长期共存于同一目录（真实反例：`features/channel/components/sections/ChannelBasicInfoSection.v1.tsx` 与同目录下的 `ChannelBasicInfoSection.tsx` 长期并存，容易被误引用）。

### 2.4 测试文件组织规范（三个子项目通用约定）

调研确认的一致模式：

- **单元测试**：与被测源文件同目录、同名 + `.test.ts`/`.test.tsx` 后缀（例：`channel-ref.ts` ↔ `channel-ref.test.ts`）。这是主要模式，新测试优先遵循。
- **模块测试较多时**：在该模块目录下建 `__tests__/` 子目录集中存放（例：`domain/agent-sync/__tests__/`、`infrastructure/repositories/__tests__/`）。
- **跨模块的集成/端到端/性能测试**：放在子项目根目录的 `tests/`（local、backend 均有 `tests/integration/`、`tests/e2e/`）或前端的 `e2e/`（Playwright）下，不要把这类测试混进 `src/`。

新增测试请套用以上二级模式（同目录 `.test.ts` 或模块 `__tests__/` + 根级 `tests/`/`e2e/`），不要在项目里发明第三种组织方式。

### 2.5 文档存放规范

仓库已有约定：说明性文档应存放在仓库根目录 `doc/` 下，按类型（如 `design/`、`release/`）和时间归类命名。

**本仓库中曾出现的反例（已清理，不要再引入）：**

- `code/`、`code/cloud/backend/`、`code/cloud/frontend/` 根目录下曾散落大量阶段性总结文档（`*_SUMMARY.md`、`*_ANALYSIS.md`、`*_FIXES.md`、`SUCCESS_REPORT.md` 等）。
- 前端曾用 `ChannelBasicInfoSection.v1.tsx` 与正式组件长期并存。

这些文件是开发过程中的一次性总结/旧版本，散落在代码目录里既不便查找也会随时间失去时效性。**正确做法**：新的设计说明/总结类文档一律放入仓库根目录 `doc/` 对应分类下（例如 `doc/design/`），不要在 `code/` 或任何子项目根目录下新建这类游离 md 文件。少量与代码强绑定、帮助理解某个具体模块的 `README.md`（例如 `features/channel/components/ChannelPanel/README.md`）可以保留在模块内，但篇幅较长的项目级总结/进度报告不属于此类。

开发调试请使用 `./code/dev/start.sh` 与本文「六、AI 调试指南」，不要再依赖已删除的一次性脚本（如旧的 `create-admin-kp.ts` / `init-basic-data.ts`）。

---

## 三、代码风格与工程实践要点

- **TypeScript 严格模式**：三个子项目的 `tsconfig.json` 均已开启 `strict: true`，backend 还额外开启了 `noUnusedLocals`、`noUnusedParameters`、`noUncheckedIndexedAccess`。新代码不要绕过这些检查（如用 `// @ts-ignore` 掩盖类型错误）。
- **避免 `any`**：代码库中历史遗留了不少 `: any` 用法（多集中在早期编写的服务/组件中），这是技术债而非可效仿的写法。新代码禁止新增 `any`；确实无法确定类型时使用 `unknown` 并做类型收窄，或定义具体的接口/类型别名。顺手修改到历史 `any` 代码时，能替换为具体类型就替换。
- **统一错误处理**：backend 参照 `common/errors/`（`AppError` 基类 + `business.errors.ts`/`system.errors.ts` 分类 + `trpc-mapper.ts` 统一映射）；local 与 frontend 新增错误类型时也应遵循"定义具名错误类型 + 在边界层统一转换"的思路，不要在业务逻辑深处直接 `throw new Error('字符串')`。
- **模块依赖方向**：见第一章"高内聚低耦合"中的分层依赖规则与 `import type` 例外。新增代码前先确认自己写的文件属于哪一层，再决定可以 import 什么。
- **路径引用**：backend 已配置 `@domain/*`、`@application/*`、`@infrastructure/*` 别名，新代码优先使用别名；local 和 frontend 暂未配置类似别名，保持现有相对路径风格即可，不要仅为了"美观"引入新的别名配置（若无必要勿增实体）。
- **命名一致性**：目录/文件名统一使用 kebab-case（backend/local）或与现有 feature 目录一致的风格（frontend）；React 组件文件用 PascalCase（如 `ChannelListItem.tsx`），hooks 用 `use` 前缀 + camelCase（如 `useChannelPin.ts`）。发现历史命名不一致（如 `domain/services/` 下的 snake_case 子目录）不要模仿，新增内容按当前规则来。

---

## 四、AI 辅助开发时的具体行为准则

1. **新增文件前先搜索是否已有可复用模块**：用 grep/glob 搜索相关关键词、类名、路由名，确认没有同名或同职责的实现。特别注意本仓库已出现过"同名不同职责"（`claude-code-cli-adapter.ts`）和"同职责不同名导致的死代码"（`file-system.router.ts` vs `filesystem.router.ts`）两类问题，新建文件前必须两个方向都排查一遍。
2. **不要为单一用途创建过度抽象的接口**：只有当前确实存在 ≥2 个实现或明确的可测试性需求（如需要 mock）时才引入 interface/抽象基类；否则直接写具体实现。
3. **修改前先理解现有分层再落笔**：动手改代码前，先确认目标文件属于 `domain`/`application`/`infrastructure`（backend）、`domain`/`infrastructure`（local）还是 `features`/`shared`/`core`（frontend）中的哪一层，新增内容要放在与同类文件一致的位置，参照第二章的目录映射表。
4. **避免大范围无理由重构**：除非用户明确要求，不要因为看到命名不一致或历史遗留代码就顺手做大范围重命名/挪动文件，这类问题应该指出并交给用户决定是否处理，或在改动范围极小、风险可控时顺手清理（例如：新增同类文件时顺便修正明显的死代码，而不是批量重构整个目录）。
5. **清理而不是并存**：替换旧实现（组件、路由、适配器等）时，删除被替换的旧文件或将其移入既有的 `deprecated/` 区域（local 已有此约定），不要用 `xxx.v1.tsx`、`xxx-new.ts` 这类文件名让新旧版本长期共存。
6. **文档产出遵守既定位置**：如果任务需要生成说明性/总结性文档，放入仓库根目录 `doc/` 对应分类，不要在 `code/` 或子项目根目录新建游离 md 文件（参见 2.5 节反例）。
7. **不确定目录归属时，参照已有事实而非直觉**：优先查阅 `code/README.md`（已规划的 v4 架构说明）和本文件第二章的目录映射表，而不是凭经验模式创建新的顶层目录。

---

## 五、变更前自查清单

- [ ] 是否搜索过现有代码，确认没有可复用/同名的模块？
- [ ] 新文件/目录是否落在本文件第二章描述的既定分层里？
- [ ] 是否引入了当前任务不需要的抽象、依赖或配置项？
- [ ] 依赖方向是否单向（domain 不反向依赖 infrastructure 的具体实现，仅可 `import type` 接口）？
- [ ] frontend 改动是否跨 feature 直接引用了其他 feature 的内部实现？
- [ ] 新增/修改的错误处理是否走了统一的错误类型体系，而不是裸 `throw new Error`？
- [ ] 文档类产出是否放进了仓库根目录 `doc/`，而不是散落在 `code/` 下？
- [ ] 是否清理了被替换的旧代码，而不是留下 `.v1`/`-old` 之类的并存版本？

---

## 六、AI 调试指南（尤其是前端 UI 问题）

> 本节基于对本仓库当前真实代码/配置的实际调研撰写（截至 2026-07），目的是让任何第一次接触本仓库的 AI agent 不需要反复摸索，就能跑起本地全栈环境、拿到可用的测试账号、并用浏览器 MCP 工具完成"改代码 → 截图验证"的闭环。如与代码现状不符，请以代码为准并回来更新本节。

### 6.1 一分钟起本地全栈环境

本项目**没有** `docker-compose`、也**不需要**外部数据库服务——backend 用的是本地 SQLite 文件（`DATABASE_URL=file:...`），首次启动会自动迁移建表并初始化默认数据。

**推荐：一条命令拉起全栈（默认单 Local）**

```bash
./code/dev/start.sh
# 只要前后端（纯 UI）：     ./code/dev/start.sh --no-local
# 需要双 Local 时再加：    ./code/dev/start.sh --dual
```

行为约定：

- 默认启动 Backend（3002）+ Frontend（5174）+ **1 个 Local**：
  - `local:nexus` → 官方 Realm（`realm-nexus`）
- `--dual` 时额外再起 `local:custom`（固定复用 Realm 名 `cove-dev-custom`）。
- 首次会自动注册开发用户 `cove_dev_stack` / `CoveDev123!`，并通过 tRPC 自动签发设备凭证；之后凭证固定复用，落在 `~/.cove/dev-stack/`（如 `nexus.config.json`），**不进 git**。
- Ctrl+C / 脚本退出时会**杀掉本脚本拉起的全部进程（含 backend/frontend）**。设备凭证与 Realm **不删**（固定复用）。
- 日志在 `~/.cove/dev-stack/logs/`。若凭证坏了（例如在别处轮换了 apiKey），删掉对应 `*.config.json` 后重跑即可重建。

相关文件：`code/dev/start.sh`、`code/dev/provision.mjs`。

**手动分步启动（不推荐，仅排查时用）**

```bash
cd code/cloud/backend && npm run dev
cd code/cloud/frontend && npm run dev
npm --prefix code/local run dev -- --config ~/.cove/dev-stack/nexus.config.json
```

**首次启动前必须配置的环境变量**（`code/cloud/backend/.env`，可从 `.env.example` 复制）：

- `DATABASE_URL`：指向本地 SQLite 文件路径（如 `file:/Users/you/.cove/database/cove.db`），首次启动会自动建表 + 初始化 Nexus realm/默认频道/内置 Agent，**不需要手动建库或跑 migrate**。
- `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`：**仅当需要 Agent 真正回复消息时才需要**。如果只是调试纯 UI/布局问题（不需要真实 AI 回复），不配置这两个 key 后端也能正常启动，只是内置 Agent 发消息时会报错/无响应——这不影响你验证 UI 结构、样式、交互状态。
- `PORT`：后端端口，默认 `3002`，与前端 `src/core/config/env.ts` 里开发环境默认的 `http://localhost:3002` / `ws://localhost:3002` 保持一致，一般不需要改。

### 6.2 测试账号：自助注册即可，不需要种子脚本

**关键结论：本项目已经具备"注册即可用"的能力，不需要额外写 seed 脚本。**

后端 `auth.register`（`code/cloud/backend/src/infrastructure/trpc/routers/auth.router.ts`）是公开的自助注册接口，注册成功会**自动加入 Nexus realm**（`AuthService.register` → `addUserToPlatformRealm`），落地后能直接看到 `#general`、`#welcome` 默认频道和内置 Agent「小张」发的欢迎消息。前端登录页（`features/auth/components/LoginPage.tsx`）本身就有"注册/登录"切换，也可以直接在浏览器里点"注册"完成，不需要用 curl。

推荐做法：**每次调试任务都注册一个新的、一次性的测试账号**，不要复用他人凭证，也不要把真实密码写进代码或文档。也可以直接用开发栈固定账号 `cove_dev_stack` / `CoveDev123!`（由 `./code/dev/start.sh` 自动注册）。示例：

```bash
curl -s -X POST 'http://localhost:3002/trpc/auth.register' \
  -H 'Content-Type: application/json' \
  -d '{"username":"ai_debug_<随便起个后缀>","email":"ai-debug@example.com","password":"AiDebug123!","displayName":"AI Debug"}'
```

密码规则（`UserEntity.validatePasswordComplexity`）：**至少 6 位，且必须同时包含大写字母、小写字母、数字、特殊字符**（例如 `AiDebug123!` 是合法密码，纯字母数字会被拒绝）。

返回体里的 `token` 可以直接用于后续带 `Authorization: Bearer <token>` 的 tRPC 调用；前端浏览器里则是走登录页表单，成功后 token 会存进 `localStorage`。

**已知的一个真实 bug 及其修复**（供理解现状）：此前自助注册接口只会把新用户加入 Nexus realm 的成员表（`RealmMember`），但**不会**把用户加进 `#general`/`#welcome` 频道——因为频道自动加入逻辑是监听 `user.created` 事件触发的，而 `AuthService.register()` 走的是独立入库逻辑，从未发布过这个事件。该问题已在 `AuthService.addUserToPlatformRealm()` 里补上事件发布修复；新注册用户现在无需额外脚本即可看到默认频道。

### 6.3 用浏览器 MCP 工具做 UI 调试的具体建议

本仓库已经启用了 Cursor 的浏览器自动化 MCP（`browser_navigate` / `browser_snapshot` / `browser_take_screenshot` / `browser_cdp` 等），这是调试本项目前端 UI 问题时**应该优先使用**的手段，而不是只靠猜测代码或要求用户口头描述界面现象。建议的循环（已在本次任务中验证可行）：

1. 确认后端（3002）、前端（5174）已经在跑（`lsof -i :5174 -sTCP:LISTEN` 之类快速探测一下，避免重复起进程）。
2. 用 6.2 节的方式注册/登录一个测试账号。
3. `browser_navigate` 到 `http://localhost:5174`，用 `browser_snapshot` 先拿到语义化的 DOM 结构定位元素，只有在布局/样式/视觉类问题上才需要 `browser_take_screenshot` 截图（截图更贵，语义 snapshot 通常够用且更省 token）。
4. 复现问题后，**改代码前先截一张"问题现场"的图**，改完代码后**必须刷新页面重新截图**做前后对比，而不是仅凭代码 diff 就认为问题已解决——这正是本项目此前调试体验差的核心痛点（文字描述無法准确传达视觉状态），也是浏览器 MCP 工具存在的意义。
5. 需要看运行时报错/网络请求时，优先用 `browser_cdp` 读 console/network，而不是让用户手动复制粘贴报错信息。
6. 调试完成后，如果是临时注册的测试账号，无需清理（本地 SQLite 数据库，不影响任何人），但也不要主动删除/修改开发者本人的既有账号或数据。

### 6.4 前端单元测试（vitest）现状

**现状：`vitest` 现在可以正常跑起来**（本次任务修复）。此前 `src/test/setup.ts` 里残留了一行 `import { server } from '@/mocks/server'`，但 `@/mocks/` 整个目录在某次大的架构重组合并提交（`8b953f63` "Redesign Realm Selector UI and Fix Auto-Login Issues (#12)"）中被当作无关改动的一部分整体删除了，没人注意到这个残留 import，导致 `npx vitest run` 直接在 setup 阶段报 "Cannot find module '@/mocks/server'"，**整个前端测试套件（当时 60+ 个测试文件）完全无法运行**。

修复内容：
- 移除了 `setup.ts` 里对已不存在的 `@/mocks/server`（MSW mock server）的 import。
- 删除了同样引用了已不存在的 `@/mocks/*` 且已无任何调用方的死代码 `src/test/msw-utils.ts`（`msw` 包本身也早已不在 `package.json` 依赖里，只是 `node_modules` 里还残留着旧的安装产物）。
- 在 `setup.ts` 里增加了一个假的全局 `WebSocket` 实现：测试环境下没有真实后端，一旦某个测试间接触发了 `trpc.ts` 里 `lazy: true` 的 WS 订阅，Node 自带的真实 `WebSocket`（基于 undici）就会尝试连到 `ws://localhost:3002`，连接失败时 undici 内部会抛出一个非标准的未捕获异常，污染其他无关测试的输出（`vitest run` 结果里此前有一行 "Errors 13 errors"）。换成假实现后这类噪音已经消失。

修复后跑 `npx vitest run`（`code/cloud/frontend` 目录下）的结果：**65 个测试文件里 41 个全部通过，518 个用例里 407 个通过**，不再出现"整个套件因为 import 缺失模块直接崩溃"的情况。

**没有修复、如实告知的已知限制**：剩余 111 个失败用例是与本次任务无关的既有测试债务，主要集中在两类：(1) 部分组件测试直接 `render()` 了内部会调用 `trpc.xxx.useQuery()` 的组件，但测试里没有包一层 tRPC/QueryClient Provider，报 "Unable to find tRPC Context"（例如 `ChannelListItem.test.tsx`、`UserMenu/index.test.tsx`）；(2) 少量组件自身逻辑与测试断言不一致（如 `Avatar.test.tsx` 期望渲染姓名首字母，但组件当前渲染的是图标）。这些需要逐个诊断具体组件/测试的意图后修，不属于"测试基础设施"范畴，本次任务未展开处理，留作后续任务。

另外，`code/cloud/frontend/package.json` 里 `"build": "tsc --noEmit && vite build"` 中的 `tsc --noEmit` 默认读取的根 `tsconfig.json`（`"files": []` + 仅 project references）实际上是空检查，不会报出任何错误；真正会检查到 `src/` 全部代码的命令是 `npx tsc --noEmit -p tsconfig.app.json`，跑这个命令目前会报出**约 977 个既有类型错误**（多数是 `../../../backend/src/...` 跨包类型引用把整个 backend 源码拉进检查范围触发的 `verbatimModuleSyntax`/`erasableSyntaxOnly` 规则冲突，以及 `AppRouter` 类型因为某个 tRPC 路由的过程名和内置方法撞名导致的一大片 `useContext`/`useUtils`/`Provider` 类型错误）。这是一个已经存在、规模较大、与本次任务无关的技术债务，本次任务未处理；如果后续要用 `tsc --noEmit -p tsconfig.app.json` 作为"确认没有引入新类型错误"的验证手段，应该采用**对比错误数量变化**而不是要求"零错误"。

### 6.5 组件级隔离预览（Storybook 等）：评估结论是暂不引入

调研了 Storybook（现行业界标准，2026 年新增了面向 AI agent 的 MCP 集成，可以让 agent 查询组件、生成 stories、跑交互测试）和 Ladle（更轻量的 Vite-native 替代品，无 AI 生态、无内置测试集成）。结论：**暂不引入**，理由：

- 本项目当前已经有一条能跑通的"本地全栈 + 自助注册测试账号 + 浏览器 MCP 截图"闭环（见 6.1-6.3），大多数 UI 问题（包括布局、样式、交互状态）可以直接在真实页面上复现和验证，不需要额外的组件隔离层。
- 本项目组件普遍直接耦合 tRPC hooks、Zustand store、路由 context（这也是当前 111 个失败单测里相当一部分的直接原因），要让 Storybook stories 正常渲染这些组件，需要为每个组件搭建对应的 mock provider，这部分前期投入不小，与当前团队规模/项目阶段不成比例。
- 如果后续真的出现"必须要看某个组件的错误态/边界数据态，但很难在真实环境里稳定复现"的场景（例如某个依赖极端后端状态的空态/异常态 UI），届时可以针对性地评估引入 Storybook（优先于 Ladle，因为其 MCP agent 集成对本项目"让 AI 高效调试 UI"的诉求更契合），而不是现在就全量铺开。

---

## 本文件如何被自动加载

- **Cursor**：Cursor 原生支持 `AGENTS.md`，且对子目录中的 `AGENTS.md` 有专门的嵌套识别机制——本文件位于 `code/AGENTS.md`，会在 Agent 处理 `code/` 目录树下的任意文件时自动纳入上下文，无需手动 `@` 引用，也无需额外的 `.cursor/rules` 规则文件。
- **Claude Code**：Claude Code 目前只原生读取 `CLAUDE.md`（尚不原生识别 `AGENTS.md`）。为避免内容重复维护，`code/CLAUDE.md` 中通过官方支持的 `@AGENTS.md` 导入语法直接引用本文件，Claude Code 启动时会自动展开加载本文件全文。

如需修改开发规范，只需编辑本文件（`code/AGENTS.md`）一处即可，两个工具都会读取到最新内容。
