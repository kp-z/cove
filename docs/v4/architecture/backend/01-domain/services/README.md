# Domain Services (领域服务)

> **版本**: v4.0  
> **日期**: 2026-05-08

Domain Services 封装不属于任何单一实体的领域逻辑。

## 什么是 Domain Service？

Domain Service 是领域层的一部分，用于处理：
1. **跨实体的业务规则** - 涉及多个聚合根的领域逻辑
2. **领域计算** - 复杂的业务计算和算法
3. **领域策略** - 可替换的业务策略（如任务分配策略）

---

## Domain Service vs Application Service

### Domain Service（领域服务）
- ✅ 纯领域逻辑，不依赖基础设施
- ✅ 无状态，只包含业务规则
- ✅ 可以在单元测试中独立测试
- ✅ 不涉及事务、持久化、外部调用

**示例**：
```python
class TaskAssignmentPolicy:
    """任务分配策略（领域服务）"""
    
    def find_best_agent(
        self,
        task: TaskEntity,
        available_agents: List[AgentEntity]
    ) -> Optional[AgentEntity]:
        """
        根据领域规则找到最适合的 Agent
        
        规则：
        1. Agent 必须有执行该任务的能力
        2. Agent 当前负载不能超过阈值
        3. 优先选择专长匹配度最高的 Agent
        """
        # 纯领域逻辑，不涉及数据库或外部调用
        ...
```

### Application Service（应用服务）
- ✅ 业务流程编排
- ✅ 调用 Domain Services 和 Repositories
- ✅ 管理事务边界
- ✅ 依赖基础设施（数据库、Runtime、外部服务）

**示例**：
```python
class TaskService:
    """任务管理应用服务"""
    
    def assign_task_to_best_agent(
        self,
        task_id: str
    ) -> Result[TaskEntity, Error]:
        """
        将任务分配给最合适的 Agent
        
        流程：
        1. 从数据库加载任务
        2. 从数据库查询可用 Agent
        3. 调用 Domain Service 找到最佳 Agent
        4. 更新任务状态
        5. 保存到数据库
        6. 通知 Runtime
        """
        # 编排领域逻辑和基础设施调用
        task = self.task_repository.find_by_id(task_id)
        agents = self.agent_repository.find_available()
        
        # 调用 Domain Service
        best_agent = self.assignment_policy.find_best_agent(task, agents)
        
        # 更新状态并持久化
        task.assign_to(best_agent.id)
        self.task_repository.save(task)
        
        # 通知 Runtime
        self.channel_runtime.notify_task_assigned(task)
        
        return Ok(task)
```

---

## 何时需要 Domain Service？

### ✅ 需要 Domain Service 的场景

1. **跨聚合根的业务规则**
   - 示例：任务分配需要同时考虑 Task 和 Agent 的状态
   - 不适合放在 TaskEntity 或 AgentEntity 中

2. **复杂的领域计算**
   - 示例：OKR 进度计算需要汇总多个 KR 的完成度
   - 计算逻辑复杂，独立成服务更清晰

3. **可替换的业务策略**
   - 示例：不同项目可能有不同的任务优先级算法
   - 使用策略模式，Domain Service 作为策略接口

4. **领域事件处理**
   - 示例：当任务完成时，需要更新相关 OKR 的进度
   - 事件处理逻辑属于领域层

### ❌ 不需要 Domain Service 的场景

1. **单一实体的业务规则**
   - 应该放在实体方法中
   - 示例：`task.claim(user_id)` 应该是 TaskEntity 的方法

2. **数据访问和持久化**
   - 应该放在 Repository 中
   - 示例：查询任务列表应该用 TaskRepository

3. **业务流程编排**
   - 应该放在 Application Service 中
   - 示例：创建任务并通知频道应该在 TaskService 中

4. **技术实现细节**
   - 应该放在 Infrastructure 层
   - 示例：发送 WebSocket 通知应该在 Infrastructure 中

---

## 当前可能需要的 Domain Services

以下是一些可能需要的 Domain Services，但不急于实现（按需创建）：

### 1. TaskAssignmentPolicy
**职责**: 任务分配策略

**场景**: 
- 自动分配任务给最合适的 Agent
- 考虑 Agent 能力、负载、专长匹配度

**为什么是 Domain Service**:
- 涉及 Task 和 Agent 两个聚合根
- 包含复杂的匹配算法（领域逻辑）
- 不依赖基础设施，可以独立测试

---

### 2. OKRProgressCalculator
**职责**: OKR 进度计算

**场景**:
- 根据多个 KR 的完成度计算 Objective 的进度
- 考虑 KR 的权重和依赖关系

**为什么是 Domain Service**:
- 涉及 OKR 和 Workflow 两个聚合根
- 包含复杂的计算逻辑（领域规则）
- 不依赖基础设施

---

### 3. WorkflowDependencyValidator
**职责**: 工作流依赖验证

**场景**:
- 检查工作流定义是否有循环依赖
- 验证步骤之间的依赖关系是否合法

**为什么是 Domain Service**:
- 涉及 Workflow 和 Execution 两个聚合根
- 包含图算法（领域逻辑）
- 不依赖基础设施

---

### 4. PermissionEvaluator
**职责**: 权限评估

**场景**:
- 根据用户角色和资源所有权评估权限
- 考虑继承的权限配置

**为什么是 Domain Service**:
- 涉及 User、Project、Channel 多个聚合根
- 包含复杂的权限规则（领域逻辑）
- 不依赖基础设施（权限规则是领域知识）

---

### 5. MessageMentionResolver
**职责**: 消息 @mention 解析

**场景**:
- 解析消息中的 @mention
- 验证被 @mention 的用户是否在频道中
- 生成通知列表

**为什么是 Domain Service**:
- 涉及 Message、User、Channel 多个聚合根
- 包含 @mention 解析规则（领域逻辑）
- 不依赖基础设施

---

## 设计原则

### 1. 无状态
Domain Service 不保存状态，所有状态都在实体中。

### 2. 纯领域逻辑
Domain Service 只包含业务规则，不依赖基础设施。

### 3. 可测试性
Domain Service 应该可以在单元测试中独立测试，不需要数据库或外部服务。

### 4. 接口隔离
如果 Domain Service 有多种实现（策略模式），应该定义接口。

---

## 实现指南

### Domain Service 示例

```python
# Domain Service（纯领域逻辑）
class TaskAssignmentPolicy:
    """任务分配策略"""
    
    def find_best_agent(
        self,
        task: TaskEntity,
        available_agents: List[AgentEntity]
    ) -> Optional[AgentEntity]:
        """
        找到最适合执行任务的 Agent
        
        规则：
        1. Agent 必须有执行该任务的能力
        2. Agent 当前负载不能超过阈值
        3. 优先选择专长匹配度最高的 Agent
        """
        # 过滤：只保留有能力的 Agent
        capable_agents = [
            agent for agent in available_agents
            if self._can_handle_task(agent, task)
        ]
        
        if not capable_agents:
            return None
        
        # 过滤：只保留负载未满的 Agent
        available = [
            agent for agent in capable_agents
            if agent.current_load < agent.max_load
        ]
        
        if not available:
            return None
        
        # 排序：按专长匹配度排序
        available.sort(
            key=lambda a: self._calculate_match_score(a, task),
            reverse=True
        )
        
        return available[0]
    
    def _can_handle_task(
        self,
        agent: AgentEntity,
        task: TaskEntity
    ) -> bool:
        """检查 Agent 是否有能力执行任务"""
        # 领域规则：Agent 的能力必须包含任务所需的能力
        required_capabilities = task.required_capabilities
        agent_capabilities = agent.capabilities
        
        return all(
            cap in agent_capabilities
            for cap in required_capabilities
        )
    
    def _calculate_match_score(
        self,
        agent: AgentEntity,
        task: TaskEntity
    ) -> float:
        """计算 Agent 和任务的匹配度"""
        # 领域规则：专长匹配度 = 重叠能力数 / 任务所需能力数
        required = set(task.required_capabilities)
        agent_caps = set(agent.capabilities)
        
        overlap = required & agent_caps
        return len(overlap) / len(required) if required else 0.0
```

### 在 Application Service 中使用

```python
# Application Service（业务流程编排）
class TaskService:
    def __init__(
        self,
        task_repository: TaskRepository,
        agent_repository: AgentRepository,
        assignment_policy: TaskAssignmentPolicy,  # 注入 Domain Service
        channel_runtime: ChannelRuntime
    ):
        self.task_repository = task_repository
        self.agent_repository = agent_repository
        self.assignment_policy = assignment_policy
        self.channel_runtime = channel_runtime
    
    def auto_assign_task(
        self,
        task_id: str
    ) -> Result[TaskEntity, Error]:
        """自动分配任务"""
        # 1. 加载数据（基础设施）
        task = self.task_repository.find_by_id(task_id)
        if not task:
            return Err(TaskNotFoundError())
        
        agents = self.agent_repository.find_available()
        
        # 2. 调用 Domain Service（领域逻辑）
        best_agent = self.assignment_policy.find_best_agent(task, agents)
        if not best_agent:
            return Err(NoAvailableAgentError())
        
        # 3. 更新实体（领域逻辑）
        result = task.assign_to(best_agent.id)
        if result.is_err():
            return result
        
        # 4. 持久化（基础设施）
        self.task_repository.save(task)
        
        # 5. 通知 Runtime（基础设施）
        self.channel_runtime.notify_task_assigned(task)
        
        return Ok(task)
```

---

## 相关文档

- [Domain Models](../models/README.md) - 领域模型定义
- [Application Services](../../02-application/services/README.md) - 应用服务层
- [Domain Events](../events/README.md) - 领域事件（待创建）

---

**最后更新**: 2026-05-08 | **维护者**: @Alice
