# Application Layer 示例文件

本目录包含 `02-runtime-layer.md` 中提到的所有运行时配置文件的完整示例。

## 目录结构

```
02-runtime-layer-examples/
├── README.md                       # 本文件
├── daemon.yaml                     # AgentDaemon 运行时状态配置示例
├── daemon-yaml.md                  # daemon.yaml 详细说明文档
├── channel-runtime.yaml            # ChannelRuntime 运行时状态配置示例
├── channel-runtime-yaml.md         # channel-runtime.yaml 详细说明文档
├── workflow-runtime.yaml           # WorkflowRuntime 运行时状态配置示例
├── workflow-runtime-yaml.md        # workflow-runtime.yaml 详细说明文档
├── execution-runtime.yaml          # ExecutionRuntime 运行时状态配置示例
├── execution-runtime-yaml.md       # execution-runtime.yaml 详细说明文档
├── startup.yaml                    # AgentDaemon 启动配置示例
├── startup-yaml.md                 # startup.yaml 详细说明文档
├── gateway.yaml                    # GatewayRuntime（Agent Runtime 网关）配置示例
├── gateway-yaml.md                 # gateway.yaml 详细说明文档
├── execution.jsonl                 # 执行日志示例（JSONL 格式）
└── execution-jsonl.md              # execution.jsonl 详细说明文档
```

## 文件说明

每个配置文件都有对应的 `.md` 说明文档，详细描述文件路径、用途、字段说明、与 Entity 层的对应关系。

### 1. daemon.yaml
**路径**: `runtime/agent_daemon/{agent_id}/daemon.yaml`

AgentDaemon 运行时状态文件，记录守护进程的实时状态、组件状态、资源使用情况。

**详细说明**: 见 [daemon-yaml.md](./daemon-yaml.md)

### 2. channel-runtime.yaml
**路径**: `runtime/channel_runtime/{channel_id}/runtime.yaml`

ChannelRuntime 运行时状态文件，记录频道的实时状态、成员在线状态、消息流。

**详细说明**: 见 [channel-runtime-yaml.md](./channel-runtime-yaml.md)

### 3. workflow-runtime.yaml
**路径**: `runtime/workflow_runtime/{workflow_id}/runtime.yaml`

WorkflowRuntime 运行时状态文件，记录工作流的执行状态、步骤调度、状态机。

**详细说明**: 见 [workflow-runtime-yaml.md](./workflow-runtime-yaml.md)

### 4. execution-runtime.yaml
**路径**: `runtime/execution_runtime/{execution_id}/runtime.yaml`

ExecutionRuntime 运行时状态文件，记录单次执行的实时状态、工具调用、日志流。

**详细说明**: 见 [execution-runtime-yaml.md](./execution-runtime-yaml.md)

### 5. startup.yaml
**路径**: `runtime/agent_daemon/startup.yaml`（全局启动配置）

AgentDaemon 启动配置文件，定义启动超时、依赖检查、重试策略、Skills 加载配置。

**详细说明**: 见 [startup-yaml.md](./startup-yaml.md)

### 6. gateway.yaml
**路径**: `runtime/agent_daemon/{agent_id}/gateway.yaml`

GatewayRuntime 配置文件，定义与 Agent Runtime Gateway 的连接参数、同步策略、API 调用策略。

**详细说明**: 见 [gateway-yaml.md](./gateway-yaml.md)

### 7. execution.jsonl
**路径**: `runtime/agent_daemon/{agent_id}/executions/{execution_id}/execution.jsonl`

执行日志文件，以 JSONL 格式存储（每行一个 JSON 对象），记录执行过程中的每个操作、工具调用和状态变更。

**详细说明**: 见 [execution-jsonl.md](./execution-jsonl.md)

## 与 Entity 层的对应关系

Runtime 层的配置文件与 Entity 层的配置文件有明确的对应关系：

| Runtime 层文件 | Entity 层对应 | 说明 |
|---|---|---|
| `runtime/agent_daemon/{id}/daemon.yaml` | `agents/{id}/runtime.yaml` | daemon.yaml 是运行时状态，runtime.yaml 是静态配置 |
| `trigger_manager.triggers[].trigger_type` | `config/triggers.yaml[].trigger_type` | 字段名保持一致 |
| `plugin_manager.plugins[].features` | `config/plugins.yaml[].features` | 字段结构保持一致 |
| `runtime/agent_daemon/{id}/memory/` | `agents/{id}/memory/` | Memory 目录对应关系 |

## 命名规范

遵循 Entity 层的命名规范：

- **ID 字段**: `{entity}_id` 格式（如 `daemon_id`, `trigger_id`, `plugin_id`）
- **名称字段**: `name` 使用 kebab-case（如 `"daily-architecture-review"`），`display_name` 使用人类可读名称
- **类型字段**: `trigger_type`（非 `type`），`log_type`（非 `type`）
- **状态字段**: `status` 使用小写字符串（如 `"running"`, `"active"`）
- **时间字段**: ISO 8601 格式（如 `"2026-05-04T10:00:00Z"`）

## 参考

完整的 Application Layer 设计文档见: `docs/v4/architecture/02-runtime-layer.md`

Domain Layer 示例文件见: `docs/v4/architecture/entities/{entity-name}/examples/`
