# AgentDaemon 启动配置 (startup.yaml)

**文件路径**: `runtime/agent_daemon/startup.yaml`（全局启动配置）

**说明**: AgentDaemon 启动配置文件，定义启动超时、依赖检查、重试策略、Skills 加载配置。此文件是全局配置，适用于所有 AgentDaemon 实例。

---

## 与 Entity 层的对应关系

| Runtime 层 | Entity 层 | 说明 |
|---|---|---|
| `startup.skills` | `agents/{id}/config/skills.yaml` | Skills 加载配置对应 Entity 层定义的 Skills |
| `dependency_checks` | `agents/{id}/runtime.yaml` | 依赖检查与 runtime.yaml 中的配置相关 |

---

## 字段说明

### 启动配置
- `startup.timeout_seconds`: 启动超时时间（秒）
- `startup.dependency_checks[]`: 依赖检查列表
  - `name`: 检查名称
  - `check_type`: 检查类型（python_version/database/message_queue）
  - `required_version`: 要求的版本（python_version 类型）
  - `connection_string`: 连接字符串（database/message_queue 类型）
  - `timeout_seconds`: 检查超时时间

### 重试策略
- `startup.retry_policy.max_retries`: 最大重试次数
- `startup.retry_policy.retry_interval_seconds`: 重试间隔（秒）
- `startup.retry_policy.exponential_backoff`: 是否使用指数退避

### Skills 加载配置
- `startup.skills.enabled`: 是否启用 Skills 加载
- `startup.skills.skills_dir`: Skills 目录路径（默认 `~/.openclaw/skills`）
- `startup.skills.fail_fast`: 遇到错误是否立即失败（false: 跳过无效 Skills; true: 立即失败）
- `startup.skills.validate_dependencies`: 是否验证依赖完整性（环境变量、npm/Python 包）
- `startup.skills.check_circular_deps`: 是否检测循环依赖
- `startup.skills.load_timeout_seconds`: Skills 加载超时时间
- `startup.skills.required_skills[]`: 必需的 Skills 列表（缺失则启动失败）

### 健康检查
- `startup.health_check.enabled`: 是否启用启动后健康检查
- `startup.health_check.initial_delay_seconds`: 初始延迟时间
- `startup.health_check.interval_seconds`: 检查间隔
- `startup.health_check.failure_threshold`: 失败阈值（连续失败多少次后标记为不健康）

---

## Skills 加载流程

1. **扫描 Skills 目录**：扫描 `~/.openclaw/skills/` 目录
2. **解析配置**：解析 `skill.yaml` 或 `SKILL.md`（frontmatter）
3. **验证依赖**：
   - 环境变量检查
   - npm 包检查（Node.js Skills）
   - Python 包检查（Python Skills）
   - Skills 依赖检查
4. **循环依赖检测**：使用 DFS 算法检测 Skills 间的循环依赖
5. **注册 Skills**：将 Skills 注册为 Agent 可用的 tools

---

## 完整示例

见 `startup.yaml` 文件。

---

## 参考

- Entity 层 Skills 配置: `agents/{agent_id}/config/skills.yaml`
- Entity 层 Runtime 配置: `agents/{agent_id}/runtime.yaml`
- Runtime 层文档: `docs/v4/architecture/02-runtime-layer.md` Section 2.5.1
