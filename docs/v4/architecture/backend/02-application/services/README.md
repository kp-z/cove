# Application Services (应用服务层)

> **版本**: v4.0  
> **日期**: 2026-05-08

Application Services 负责业务逻辑编排，协调领域对象完成业务用例。

## 职责定义

### Application Services 的职责

**核心职责**：
1. **业务流程编排** - 协调多个领域对象完成业务用例
2. **事务管理** - 确保业务操作的原子性和一致性
3. **权限验证** - 检查用户是否有权执行操作
4. **数据转换** - 在领域对象和 DTO 之间转换
5. **调用 Runtime** - 与 Runtime 层交互，管理运行时状态

**不应包含的内容**：
- ❌ HTTP 请求处理（属于 Infrastructure API 层）
- ❌ 数据库访问（属于 Infrastructure Database 层）
- ❌ 领域业务规则（属于 Domain 层）
- ❌ 运行时状态管理（属于 Application Runtime 层）

### 与其他层的关系

```
Infrastructure API Layer (HTTP/WebSocket)
    ↓ 调用
Application Services Layer (业务逻辑编排)
    ↓ 使用
Domain Layer (领域模型和业务规则)
    ↓ 操作
Application Runtime Layer (运行时状态管理)
```

---

## 核心 Services

### 1. ProjectService
**职责**: 项目管理业务逻辑

**核心用例**:
- 创建项目（验证权限、初始化配置、创建默认频道）
- 更新项目配置（验证配置有效性、通知相关成员）
- 归档项目（检查依赖、清理资源、通知成员）

**依赖**:
- Domain: ProjectEntity, ChannelEntity
- Runtime: 无（项目是配置型实体）

---

### 2. AgentService
**职责**: Agent 管理业务逻辑

**核心用例**:
- 创建 Agent（验证配置、初始化 Memory、创建工作区）
- 启动 Agent（检查资源、启动 Daemon、注册到频道）
- 停止 Agent（保存状态、清理资源、通知频道）
- 分配任务给 Agent（检查能力匹配、更新任务状态）

**依赖**:
- Domain: AgentEntity, TaskEntity
- Runtime: AgentDaemon

---

### 3. ChannelService
**职责**: 频道管理业务逻辑

**核心用例**:
- 创建频道（验证权限、初始化配置、添加创建者为成员）
- 添加成员（验证权限、检查成员限制、发送邀请通知）
- 移除成员（验证权限、清理成员数据、通知其他成员）
- 归档频道（检查活跃任务、保存历史、通知成员）

**依赖**:
- Domain: ChannelEntity, MemberEntity
- Runtime: ChannelRuntime

---

### 4. MessageService
**职责**: 消息管理业务逻辑

**核心用例**:
- 发送消息（验证权限、处理 @mention、触发通知）
- 编辑消息（验证权限、记录历史、通知订阅者）
- 删除消息（验证权限、清理附件、更新引用）
- 添加反应（验证权限、更新计数、通知作者）

**依赖**:
- Domain: MessageEntity, AttachmentEntity, ReactionEntity
- Runtime: ChannelRuntime

---

### 5. TaskService
**职责**: 任务管理业务逻辑

**核心用例**:
- 创建任务（验证权限、初始化状态、通知频道）
- 认领任务（检查冲突、更新状态、通知创建者）
- 更新任务状态（验证状态流转、检查权限、触发工作流）
- 完成任务（验证完成条件、更新统计、通知相关人）

**依赖**:
- Domain: TaskEntity, ExecutionEntity
- Runtime: ChannelRuntime

---

### 6. OKRService
**职责**: OKR 管理业务逻辑

**核心用例**:
- 创建 OKR（验证权限、初始化 KR、关联项目）
- 更新进度（验证数据、计算完成度、触发通知）
- 关联工作流（验证关联、更新依赖、同步状态）
- 归档 OKR（检查完成度、生成报告、通知团队）

**依赖**:
- Domain: OKREntity, WorkflowEntity
- Runtime: 无（OKR 是数据型实体）

---

### 7. WorkflowService
**职责**: 工作流管理业务逻辑

**核心用例**:
- 创建工作流（验证定义、检查循环依赖、初始化状态）
- 启动工作流（验证条件、创建执行实例、调度第一步）
- 执行步骤（检查前置条件、调用 Agent、记录结果）
- 完成工作流（汇总结果、更新 OKR、通知相关人）

**依赖**:
- Domain: WorkflowEntity, ExecutionEntity
- Runtime: WorkflowRuntime

---

### 8. ExecutionService
**职责**: 执行记录管理业务逻辑

**核心用例**:
- 创建执行记录（初始化日志、分配资源、启动监控）
- 记录执行日志（写入 JSONL、计算 Token、更新统计）
- 完成执行（保存结果、释放资源、通知任务）
- 查询执行历史（过滤条件、分页查询、生成报告）

**依赖**:
- Domain: ExecutionEntity, TaskEntity
- Runtime: ExecutionRuntime

---

### 9. UserService
**职责**: 用户管理业务逻辑

**核心用例**:
- 注册用户（验证信息、创建账号、初始化配置）
- 更新配置（验证权限、保存偏好、同步设备）
- 管理设备（添加设备、验证设备、撤销访问）
- 查询活动（过滤条件、分页查询、生成统计）

**依赖**:
- Domain: UserEntity, DeviceEntity
- Runtime: 无（用户是配置型实体）

---

### 10. ServerService
**职责**: 服务器管理业务逻辑

**核心用例**:
- 创建服务器（验证配置、分配资源、初始化环境）
- 启动服务器（检查依赖、启动服务、注册到集群）
- 停止服务器（迁移 Agent、保存状态、释放资源）
- 监控服务器（收集指标、检查健康、触发告警）

**依赖**:
- Domain: ServerEntity, AgentEntity
- Runtime: ServerRuntime

---

## 设计原则

### 1. 单一职责
每个 Service 只负责一个聚合根的业务逻辑。

### 2. 依赖倒置
Service 依赖于接口，而不是具体实现：
- 依赖 Repository 接口（而不是具体的数据库实现）
- 依赖 Runtime 接口（而不是具体的运行时实现）

### 3. 事务边界
每个 Service 方法是一个事务边界，确保操作的原子性。

### 4. 无状态
Service 本身不保存状态，所有状态都在 Domain 对象或 Runtime 中。

---

## 实现指南

### Service 方法签名

```python
# 示例：TaskService
class TaskService:
    def __init__(
        self,
        task_repository: TaskRepository,
        channel_runtime: ChannelRuntime,
        permission_checker: PermissionChecker
    ):
        self.task_repository = task_repository
        self.channel_runtime = channel_runtime
        self.permission_checker = permission_checker
    
    def claim_task(
        self,
        task_id: str,
        user_id: str
    ) -> Result[TaskEntity, Error]:
        """
        认领任务
        
        业务流程：
        1. 验证用户权限
        2. 检查任务状态（必须是 todo）
        3. 检查是否已被认领
        4. 更新任务状态为 in_progress
        5. 设置 assignee
        6. 通知 ChannelRuntime
        7. 返回更新后的任务
        """
        # 1. 验证权限
        if not self.permission_checker.can_claim_task(user_id, task_id):
            return Err(PermissionDeniedError())
        
        # 2. 加载任务
        task = self.task_repository.find_by_id(task_id)
        if not task:
            return Err(TaskNotFoundError())
        
        # 3. 业务规则验证（领域层）
        result = task.claim(user_id)
        if result.is_err():
            return result
        
        # 4. 保存任务
        self.task_repository.save(task)
        
        # 5. 通知 Runtime
        self.channel_runtime.notify_task_claimed(task)
        
        return Ok(task)
```

---

## 与 Infrastructure 的关系

### Application Services 负责
- ✅ 业务逻辑编排
- ✅ 事务管理
- ✅ 权限验证
- ✅ 调用 Runtime

### Infrastructure API 负责
- ✅ HTTP 请求处理
- ✅ 参数验证和转换
- ✅ 错误响应格式化
- ✅ 调用 Application Services

**示例**：
```python
# Infrastructure API Layer
@router.post("/tasks/{task_id}/claim")
async def claim_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    task_service: TaskService = Depends()
):
    # API 层只负责 HTTP 处理
    result = task_service.claim_task(task_id, current_user.id)
    
    if result.is_err():
        raise HTTPException(status_code=400, detail=str(result.error))
    
    return TaskResponse.from_entity(result.value)
```

---

## 相关文档

- [Domain Layer](../01-domain/models/README.md) - 领域模型定义
- [Application Runtime](../runtime/design/runtime-layer.md) - 运行时组件
- [Infrastructure API](../../03-infrastructure/04-backend-api.md) - API 实现
- [Infrastructure README](../../03-infrastructure/README.md) - 基础设施层概览

---

**最后更新**: 2026-05-08 | **维护者**: @Alice
