# 05 - Agent 管理（P1）

> **前置**：必须先完成 [01](./01-message-channel.md) / [02](./02-thread.md) / [03](./03-websocket.md)。
> Task 模块可选，与本模块独立。

---

实现 Agent CRUD + 配置管理 + 生命周期。**严格遵循总纲约束**。

## 需求范围

### Domain Layer

- **AgentEntity 主体** + 子配置实体（`RuntimeConfig`, `Persona`, `Permissions`, `Skills`, `Tools`, `Triggers`, `Plugins`）
- **业务规则**：
  - `Agent.update_runtime(new_config)` —— 校验 `model` / `temperature` 合法范围
  - `Agent.can_be_started()` —— 校验配置完整性
  - `Agent.assign_skill(skill_id)` —— 校验 skill 存在

### Application Service Layer

- **AgentService**：CRUD + 子配置的独立更新方法
- **AgentRuntimeService**：`start_agent / stop_agent / get_status`
  - 通过 `ports/runtime_adapter.py` 中的 **RuntimeAdapter Protocol** 委托
  - **不直接耦合具体 Runtime 实现**

### Infrastructure Layer

- **agents 表** + 子配置表（或 JSONB 字段）
- **adapters/runtime/** 目录下放具体 Adapter 实现
- **REST API**：
  ```
  POST   /api/v1/agents
  GET    /api/v1/agents
  GET    /api/v1/agents/{id}
  PUT    /api/v1/agents/{id}/runtime
  PUT    /api/v1/agents/{id}/persona
  PUT    /api/v1/agents/{id}/skills
  PUT    /api/v1/agents/{id}/tools
  PUT    /api/v1/agents/{id}/triggers
  POST   /api/v1/agents/{id}/start
  POST   /api/v1/agents/{id}/stop
  GET    /api/v1/agents/{id}/status
  ```

## 关键约束

- `AgentRuntimeService` **严格只依赖 RuntimeAdapter Protocol**
- 一个 Agent 的子配置可以**独立更新**（不需要传整个 Agent）
- **启动/停止是异步操作**：返回 `202 Accepted` + 通过 WebSocket 推送 `agent_status_changed` 事件

---

**先输出文件清单和依赖图。**
