# Backend API Layer (基础设施层)

> **版本**: v4.0  
> **日期**: 2026-05-05  
> **关键词**: `FastAPI`, `GraphQL`, `WebSocket`, `REST API`, `数据库设计`, `飞书集成`, `State Export/Import`, `Server管理`, `消息路由`, `任务管理`, `OKR管理`, `工作流引擎`, `执行日志`, `权限控制`, `并发控制`

**本文档包含**:
- Backend 层的完整架构设计（REST + GraphQL + WebSocket）
- Entity、Runtime、Backend Service 的映射关系
- 10+ 个核心 Service 的职责和 API 设计
- 数据库表设计（PostgreSQL schema）
- 飞书集成的 4 张表设计（feishu_tenants、feishu_tokens、feishu_sync_log、feishu_user_mappings）
- State Export/Import API 实现
- Server 管理 API（创建、启动、停止、删除）
- 消息路由和分发机制
- 任务状态流转和权限控制
- WebSocket 实时推送规范

**适用场景**:
- 需要了解 Backend API 的整体架构
- 查找特定 Entity 对应的 Service 和 API
- 设计数据库表结构或查询优化
- 实现飞书集成或其他第三方集成
- 处理 State Export/Import 需求
- 实现 Server 生命周期管理
- 设计消息路由或任务管理逻辑

**相关文档**:
- [Domain Layer](../01-domain/models/README.md) - Backend Service 对应的实体定义
- [Application Layer](../02-application/runtime/design/runtime-layer.md) - Backend 调用的 Runtime 组件
- [Presentation Layer](../../frontend/04-presentation/frontend-layer.md) - 调用 Backend API 的前端实现

---

## 三、Backend（基础设施层）

Backend 层负责业务逻辑实现、数据持久化、API 服务。采用**完全隔离架构**：Backend 和 Agent Runtime 通过 REST API 通信，不共享数据和存储。

### 3.1 Entity、Runtime、Backend 映射关系

下表明确了每个 Entity、对应的 Runtime（如果有）、以及负责的 Backend Service：

| Entity | Runtime | Backend Service | 说明 |
|--------|---------|-----------------|------|
| **AgentEntity** | AgentDaemon | AgentRuntimeService | Agent 生命周期管理、消息队列、触发器、插件 |
| **ProjectEntity** | - | ProjectService | 项目配置管理（无需 Runtime，静态配置） |
| **UserEntity** | - | UserService | 用户管理（无需 Runtime，静态配置） |
| **DeviceEntity** | - | DeviceService | 设备管理（无需 Runtime，静态配置） |
| **ChannelEntity** | ChannelRuntime | ChannelService | 频道管理、成员在线状态、消息流 |
| **MessageEntity** | ChannelRuntime | MessageService | 消息 CRUD、@mention、附件（通过 ChannelRuntime 管理实时状态） |
| **TaskEntity** | ChannelRuntime | TaskService | 任务 CRUD、状态流转（通过 ChannelRuntime 管理实时状态） |
| **OKREntity** | - | OKRService | OKR 管理（无需 Runtime，数据型实体） |
| **WorkflowEntity** | WorkflowRuntime | WorkflowService | 工作流定义、步骤编排、条件分支 |
| **ExecutionEntity** | ExecutionRuntime | ExecutionService | 执行记录、日志流、Token 统计 |

**设计原则**：

1. **配置型 Entity**（Project、User、Device）：只需要 CRUD 操作，无需 Runtime
2. **数据型 Entity**（Message、Task、OKR）：通过父级 Runtime（ChannelRuntime）管理实时状态
3. **运行型 Entity**（Agent、Workflow、Execution）：需要独立的 Runtime 管理生命周期和实时状态

---

### 3.2 完全隔离架构设计

**核心原则**：Backend 和 Agent Runtime 完全隔离，通过 REST API 通信，不共享数据和存储。

```
┌─────────────────────────────────────────────────────────────┐
│                        Presentation Layer                    │
│  (React + TypeScript + Tailwind CSS)                        │
└─────────────────────────────────────────────────────────────┘
                              ↓ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────┐
│                      Backend API Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ REST API     │  │ GraphQL API  │  │ WebSocket    │      │
│  │ (FastAPI)    │  │ (Strawberry) │  │ (Socket.IO)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Business Logic Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Project      │  │ OKR          │  │ Task         │      │
│  │ Service      │  │ Service      │  │ Service      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Channel      │  │ Message      │  │ Workflow     │      │
│  │ Service      │  │ Service      │  │ Service      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Data Persistence Layer                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ PostgreSQL   │  │ Redis        │  │ File System  │      │
│  │ (结构化数据)  │  │ (缓存/队列)   │  │ (附件存储)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘

                              ↕ REST API (完全隔离)

┌─────────────────────────────────────────────────────────────┐
│                  Agent Runtime A (示例)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Agent        │  │ Execution    │  │ Message      │      │
│  │ Daemon       │  │ Runtime      │  │ Queue        │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
│  独立数据存储: YAML/JSON 文件系统                            │
└─────────────────────────────────────────────────────────────┘

                              ↕ REST API (完全隔离)

┌─────────────────────────────────────────────────────────────┐
│                  Agent Runtime B (示例)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Agent        │  │ Execution    │  │ Message      │      │
│  │ Daemon       │  │ Runtime      │  │ Queue        │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
│  独立数据存储: 自定义存储方案                                 │
└─────────────────────────────────────────────────────────────┘
```

---

### 3.3 Backend 与 Runtime 通信机制

#### 3.3.1 通信方式

**Backend → Runtime**（事件推送）:
- 通过 WebHook 推送事件通知
- Runtime 注册 WebHook URL
- Backend 在事件发生时调用 WebHook

**Runtime → Backend**（数据拉取）:
- Runtime 通过 REST API 读取数据
- 使用标准的 HTTP 认证（JWT Token）
- 支持分页、过滤、排序

#### 3.3.2 WebHook 事件类型

Backend 支持以下 WebHook 事件：

| 事件类型 | 触发时机 | Payload |
|---------|---------|---------|
| `message.created` | 新消息创建 | 消息对象 + 频道信息 |
| `message.mentioned` | Agent 被 @mention | 消息对象 + 被提及的 Agent ID |
| `task.created` | 新任务创建 | 任务对象 |
| `task.assigned` | 任务分配给 Agent | 任务对象 + Agent ID |
| `channel.member_added` | Agent 加入频道 | 频道 ID + Agent ID |

#### 3.3.3 API 端点设计

**消息相关 API**:
```
GET    /api/v1/channels/{channel_id}/messages       # 读取消息列表
POST   /api/v1/channels/{channel_id}/messages       # 发送消息
GET    /api/v1/messages/{message_id}                # 读取单条消息
PUT    /api/v1/messages/{message_id}                # 更新消息
DELETE /api/v1/messages/{message_id}                # 删除消息
```

**任务相关 API**:
```
GET    /api/v1/tasks                                # 读取任务列表
POST   /api/v1/tasks                                # 创建任务
GET    /api/v1/tasks/{task_id}                      # 读取单个任务
PUT    /api/v1/tasks/{task_id}                      # 更新任务
POST   /api/v1/tasks/{task_id}/claim                # 认领任务
POST   /api/v1/tasks/{task_id}/unclaim              # 取消认领
```

**Agent 相关 API**:
```
GET    /api/v1/agents                               # 读取 Agent 列表
GET    /api/v1/agents/{agent_id}                    # 读取 Agent 信息
PUT    /api/v1/agents/{agent_id}/status             # 更新 Agent 状态
```

#### 3.3.4 数据流示例

**发送消息流程**:
```
1. 用户在前端发送消息
   ↓
2. Frontend 调用 Backend API: POST /channels/{id}/messages
   ↓
3. Backend 保存消息到 PostgreSQL
   ↓
4. Backend 通过 WebSocket 推送给在线用户
   ↓
5. Backend 检查是否有 @mention
   ↓
6. 如果有 @mention，Backend 调用 Runtime WebHook
   ↓
7. Runtime 收到 WebHook，决定是否唤醒 Agent
   ↓
8. Agent 通过 API 读取消息: GET /messages/{id}
   ↓
9. Agent 生成回复，调用 API: POST /channels/{id}/messages
   ↓
10. Backend 保存回复并推送
```

**Agent 认领任务流程**:
```
1. Backend 创建新任务
   ↓
2. Backend 调用 Runtime WebHook: task.created
   ↓
3. Runtime 通知 Agent 有新任务
   ↓
4. Agent 调用 API 认领任务: POST /tasks/{id}/claim
   ↓
5. Backend 更新任务状态为 in_progress
   ↓
6. Backend 通过 WebSocket 推送状态变更
```

---

### 3.4 完全隔离架构的优势

#### 3.4.1 稳定性
- ✅ Backend 和 Runtime 独立部署、独立升级
- ✅ 一个系统故障不影响另一个系统
- ✅ 没有数据同步延迟和不一致问题
- ✅ 减少故障点（无需同步基础设施）

#### 3.4.2 简洁性
- ✅ 架构清晰，职责明确
- ✅ 代码量减少（无需同步逻辑）
- ✅ 测试简单（无需测试同步）
- ✅ 文档简单（无需解释同步机制）

#### 3.4.3 灵活性
- ✅ 支持多种 Agent Runtime（可插拔设计）
- ✅ 每个 Runtime 可以选择最适合的存储方案
- ✅ 可以独立扩展和优化
- ✅ 新增 Runtime 不影响现有系统

#### 3.4.4 可维护性
- ✅ 职责清晰：Backend 管数据，Runtime 管执行
- ✅ 问题定位简单（通过 API 日志追踪）
- ✅ 测试简单（Mock API 即可）
- ✅ 监控简单（API 调用统计）

---
### 3.4 认证授权设计

#### 3.3.1 认证机制（JWT + OAuth2）

**认证流程**：

```
1. 用户登录 → 验证凭证 → 生成 JWT Token
2. 前端存储 Token（localStorage）
3. 每次 API 请求携带 Token（Authorization: Bearer <token>）
4. Backend 验证 Token → 解析用户身份 → 执行业务逻辑
```

**JWT Token 结构**：

```json
{
  "sub": "user-uuid-123",
  "name": "kp-user",
  "role": "admin",
  "permissions": ["project:read", "project:write", "agent:manage"],
  "exp": 1735689600,
  "iat": 1735603200
}
```

**实现代码**：

```python
# backend/auth/jwt_manager.py

from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext

SECRET_KEY = "your-secret-key-here"  # 从环境变量读取
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 小时

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class JWTManager:
    """JWT 管理器"""
    
    @staticmethod
    def create_access_token(user_id: str, user_name: str, role: str, permissions: List[str]) -> str:
        """创建 Access Token"""
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode = {
            "sub": user_id,
            "name": user_name,
            "role": role,
            "permissions": permissions,
            "exp": expire,
            "iat": datetime.utcnow()
        }
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def verify_token(token: str) -> dict:
        """验证 Token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid token")
    
    @staticmethod
    def hash_password(password: str) -> str:
        """密码哈希"""
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """验证密码"""
        return pwd_context.verify(plain_password, hashed_password)
```

**认证中间件**：

```python
# backend/middleware/auth_middleware.py

from fastapi import Request, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """获取当前用户"""
    token = credentials.credentials
    payload = JWTManager.verify_token(token)
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # 从数据库加载用户信息
    user = await UserService.get_user(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user
```

---

#### 3.3.2 授权机制（RBAC）

**角色定义**：

| 角色 | 权限 | 说明 |
|------|------|------|
| **admin** | 所有权限 | 系统管理员，可以管理所有资源 |
| **project_owner** | project:*, okr:*, task:*, agent:read | 项目所有者，可以管理项目内所有资源 |
| **developer** | project:read, task:*, agent:read | 开发者，可以管理任务，查看项目和 Agent |
| **viewer** | project:read, okr:read, task:read | 只读用户，只能查看资源 |

**权限检查装饰器**：

```python
# backend/auth/permissions.py

from functools import wraps
from fastapi import HTTPException

def require_permission(permission: str):
    """权限检查装饰器"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user: User = Depends(get_current_user), **kwargs):
            # 检查用户是否有该权限
            if permission not in current_user.permissions:
                raise HTTPException(
                    status_code=403,
                    detail=f"Permission denied: {permission} required"
                )
            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator

# 使用示例
@app.post("/api/v1/projects")
@require_permission("project:write")
async def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user)
):
    """创建项目（需要 project:write 权限）"""
    return await ProjectService.create_project(project_data, current_user.id)
```

---

#### 3.4.3 数据库表设计

**users 表**：

```sql
-- 用户表
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    avatar_url TEXT,
    role VARCHAR(50) NOT NULL DEFAULT 'viewer',
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    
    CONSTRAINT users_role_check CHECK (role IN ('admin', 'project_owner', 'developer', 'viewer')),
    CONSTRAINT users_username_length CHECK (char_length(username) >= 3),
    CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- 索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active) WHERE is_active = true;
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_users_metadata ON users USING gin(metadata);

-- 触发器：自动更新 updated_at
CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 注释
COMMENT ON TABLE users IS '用户表：存储系统用户的基本信息和认证凭证';
COMMENT ON COLUMN users.user_id IS '用户唯一标识符';
COMMENT ON COLUMN users.username IS '用户名（唯一，用于登录）';
COMMENT ON COLUMN users.email IS '邮箱地址（唯一，用于登录和通知）';
COMMENT ON COLUMN users.password_hash IS 'bcrypt 哈希后的密码';
COMMENT ON COLUMN users.display_name IS '显示名称（用于 UI 展示）';
COMMENT ON COLUMN users.avatar_url IS '头像 URL';
COMMENT ON COLUMN users.role IS '用户角色：admin, project_owner, developer, viewer';
COMMENT ON COLUMN users.is_active IS '账户是否激活';
COMMENT ON COLUMN users.is_verified IS '邮箱是否已验证';
COMMENT ON COLUMN users.last_login_at IS '最后登录时间';
COMMENT ON COLUMN users.metadata IS '扩展元数据（JSONB）：preferences, settings, etc.';
```

**role_permissions 表**：

```sql
-- 角色权限映射表
CREATE TABLE role_permissions (
    role VARCHAR(50) NOT NULL,
    permission VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (role, permission),
    CONSTRAINT role_permissions_role_check CHECK (role IN ('admin', 'project_owner', 'developer', 'viewer'))
);

-- 索引
CREATE INDEX idx_role_permissions_role ON role_permissions(role);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission);

-- 注释
COMMENT ON TABLE role_permissions IS '角色权限映射表：定义每个角色拥有的权限';
COMMENT ON COLUMN role_permissions.role IS '角色名称';
COMMENT ON COLUMN role_permissions.permission IS '权限标识符（格式：resource:action，如 project:write）';
COMMENT ON COLUMN role_permissions.description IS '权限描述';

-- 初始化默认权限
INSERT INTO role_permissions (role, permission, description) VALUES
    -- admin: 所有权限
    ('admin', 'project:read', '查看项目'),
    ('admin', 'project:write', '创建/编辑项目'),
    ('admin', 'project:delete', '删除项目'),
    ('admin', 'okr:read', '查看 OKR'),
    ('admin', 'okr:write', '创建/编辑 OKR'),
    ('admin', 'okr:delete', '删除 OKR'),
    ('admin', 'task:read', '查看任务'),
    ('admin', 'task:write', '创建/编辑任务'),
    ('admin', 'task:delete', '删除任务'),
    ('admin', 'agent:read', '查看 Agent'),
    ('admin', 'agent:manage', '管理 Agent（启动/停止/配置）'),
    ('admin', 'user:manage', '管理用户'),
    ('admin', 'system:admin', '系统管理'),
    
    -- project_owner: 项目内所有资源
    ('project_owner', 'project:read', '查看项目'),
    ('project_owner', 'project:write', '创建/编辑项目'),
    ('project_owner', 'okr:read', '查看 OKR'),
    ('project_owner', 'okr:write', '创建/编辑 OKR'),
    ('project_owner', 'okr:delete', '删除 OKR'),
    ('project_owner', 'task:read', '查看任务'),
    ('project_owner', 'task:write', '创建/编辑任务'),
    ('project_owner', 'task:delete', '删除任务'),
    ('project_owner', 'agent:read', '查看 Agent'),
    
    -- developer: 任务管理 + 只读项目/Agent
    ('developer', 'project:read', '查看项目'),
    ('developer', 'task:read', '查看任务'),
    ('developer', 'task:write', '创建/编辑任务'),
    ('developer', 'agent:read', '查看 Agent'),
    
    -- viewer: 只读权限
    ('viewer', 'project:read', '查看项目'),
    ('viewer', 'okr:read', '查看 OKR'),
    ('viewer', 'task:read', '查看任务');
```

**user_sessions 表**（可选，用于 Token 撤销和会话管理）：

```sql
-- 用户会话表
CREATE TABLE user_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token_jti VARCHAR(255) UNIQUE NOT NULL,
    refresh_token_hash VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_revoked BOOLEAN NOT NULL DEFAULT false,
    
    CONSTRAINT user_sessions_expires_check CHECK (expires_at > created_at)
);

-- 索引
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token_jti ON user_sessions(token_jti);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at) WHERE is_revoked = false;
CREATE INDEX idx_user_sessions_is_revoked ON user_sessions(is_revoked) WHERE is_revoked = false;

-- 注释
COMMENT ON TABLE user_sessions IS '用户会话表：用于 Token 撤销和会话管理';
COMMENT ON COLUMN user_sessions.session_id IS '会话唯一标识符';
COMMENT ON COLUMN user_sessions.user_id IS '关联的用户 ID';
COMMENT ON COLUMN user_sessions.token_jti IS 'JWT Token ID（用于撤销）';
COMMENT ON COLUMN user_sessions.refresh_token_hash IS 'Refresh Token 哈希值';
COMMENT ON COLUMN user_sessions.ip_address IS '客户端 IP 地址';
COMMENT ON COLUMN user_sessions.user_agent IS '客户端 User-Agent';
COMMENT ON COLUMN user_sessions.expires_at IS 'Token 过期时间';
COMMENT ON COLUMN user_sessions.last_activity_at IS '最后活动时间';
COMMENT ON COLUMN user_sessions.is_revoked IS '是否已撤销';

-- 自动清理过期会话（定时任务）
CREATE INDEX idx_user_sessions_cleanup ON user_sessions(expires_at) 
    WHERE is_revoked = false AND expires_at < NOW();
```

**OAuth2 集成表**（可选，用于第三方登录）：

```sql
-- OAuth2 提供商配置表
CREATE TABLE oauth_providers (
    provider_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name VARCHAR(50) UNIQUE NOT NULL,
    client_id VARCHAR(255) NOT NULL,
    client_secret_encrypted TEXT NOT NULL,
    authorization_url TEXT NOT NULL,
    token_url TEXT NOT NULL,
    user_info_url TEXT NOT NULL,
    scopes TEXT[] DEFAULT ARRAY['openid', 'profile', 'email'],
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT oauth_providers_name_check CHECK (provider_name IN ('github', 'google', 'feishu', 'gitlab'))
);

-- OAuth2 用户绑定表
CREATE TABLE oauth_user_bindings (
    binding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES oauth_providers(provider_id) ON DELETE CASCADE,
    provider_user_id VARCHAR(255) NOT NULL,
    provider_username VARCHAR(255),
    provider_email VARCHAR(255),
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE (provider_id, provider_user_id)
);

-- 索引
CREATE INDEX idx_oauth_user_bindings_user_id ON oauth_user_bindings(user_id);
CREATE INDEX idx_oauth_user_bindings_provider_id ON oauth_user_bindings(provider_id);
CREATE UNIQUE INDEX idx_oauth_user_bindings_provider_user ON oauth_user_bindings(provider_id, provider_user_id);

-- 注释
COMMENT ON TABLE oauth_providers IS 'OAuth2 提供商配置表';
COMMENT ON TABLE oauth_user_bindings IS 'OAuth2 用户绑定表：关联系统用户与第三方账户';
```

**权限查询优化**：

```sql
-- 创建视图：用户完整权限（包含角色继承）
CREATE OR REPLACE VIEW user_permissions AS
SELECT 
    u.user_id,
    u.username,
    u.role,
    rp.permission,
    rp.description
FROM users u
JOIN role_permissions rp ON u.role = rp.role
WHERE u.is_active = true;

-- 注释
COMMENT ON VIEW user_permissions IS '用户完整权限视图：用于快速查询用户的所有权限';

-- 查询示例
-- SELECT permission FROM user_permissions WHERE user_id = 'xxx';
```

---

### 3.4 事务管理设计

#### 3.4.1 跨 Service 事务（Saga 模式）

**问题**：创建 OKR 时需要同时创建 Channel、Task，如何保证原子性？

**解决方案**：使用 **Saga 模式**（补偿事务）

```python
# backend/transactions/saga.py

class SagaOrchestrator:
    """Saga 编排器"""
    
    async def create_okr_with_channel(
        self,
        okr_data: OKRCreate,
        user_id: str
    ) -> OKR:
        """创建 OKR + Channel（Saga 模式）"""
        
        # Step 1: 创建 OKR
        okr = None
        channel = None
        tasks = []
        
        try:
            # 步骤 1：创建 OKR
            okr = await OKRService.create_okr(okr_data, user_id)
            
            # 步骤 2：创建默认 Channel
            channel = await ChannelService.create_channel(
                name=f"okr-{okr.okr_id}",
                type="public",
                project_id=okr.project_id
            )
            
            # 步骤 3：创建默认 Task
            for kr in okr.key_results:
                task = await TaskService.create_task(
                    title=f"Complete {kr.title}",
                    channel_id=channel.id,
                    kr_id=kr.kr_id
                )
                tasks.append(task)
            
            return okr
            
        except Exception as e:
            # 补偿事务：回滚所有已创建的资源
            logger.error(f"Saga failed: {e}, rolling back...")
            
            # 回滚步骤 3：删除已创建的 Task
            for task in tasks:
                await TaskService.delete_task(task.id)
            
            # 回滚步骤 2：删除 Channel
            if channel:
                await ChannelService.delete_channel(channel.id)
            
            # 回滚步骤 1：删除 OKR
            if okr:
                await OKRService.delete_okr(okr.id)
            
            raise HTTPException(status_code=500, detail="Failed to create OKR")
```

**Saga 状态机**：

```python
# backend/transactions/saga_state_machine.py

class SagaState(Enum):
    PENDING = "pending"
    STEP_1_COMPLETED = "step_1_completed"
    STEP_2_COMPLETED = "step_2_completed"
    STEP_3_COMPLETED = "step_3_completed"
    COMPLETED = "completed"
    COMPENSATING = "compensating"
    FAILED = "failed"

class SagaStateMachine:
    """Saga 状态机"""
    
    def __init__(self, saga_id: str):
        self.saga_id = saga_id
        self.state = SagaState.PENDING
        self.steps_completed = []
        self.compensation_steps = []
    
    async def execute_step(self, step_name: str, step_func, compensation_func):
        """执行步骤"""
        try:
            result = await step_func()
            self.steps_completed.append(step_name)
            self.compensation_steps.insert(0, compensation_func)  # 逆序补偿
            return result
        except Exception as e:
            # 执行补偿
            await self.compensate()
            raise e
    
    async def compensate(self):
        """执行补偿"""
        self.state = SagaState.COMPENSATING
        for compensation_func in self.compensation_steps:
            try:
                await compensation_func()
            except Exception as e:
                logger.error(f"Compensation failed: {e}")
        self.state = SagaState.FAILED
```

---

#### 3.4.2 数据库事务（PostgreSQL）

**单 Service 内的事务**：

```python
# backend/services/base_service.py

class BaseService:
    """基础服务"""
    
    async def with_transaction(self, func):
        """事务包装器"""
        async with self.db.transaction() as tx:
            try:
                result = await func(tx)
                await tx.commit()
                return result
            except Exception as e:
                await tx.rollback()
                raise e

# 使用示例
class TaskService(BaseService):
    async def update_task_status(self, task_id: str, new_status: str):
        """更新任务状态（事务保证）"""
        async def _update(tx):
            # 更新任务状态
            await tx.execute(
                "UPDATE tasks SET status = $1, updated_at = NOW() WHERE task_id = $2",
                new_status, task_id
            )
            
            # 更新 KR 进度
            task = await tx.fetch_one("SELECT kr_id FROM tasks WHERE task_id = $1", task_id)
            if task.kr_id:
                await tx.execute(
                    "UPDATE key_results SET current_value = current_value + 1 WHERE kr_id = $1",
                    task.kr_id
                )
            
            return task
        
        return await self.with_transaction(_update)
```

---

### 3.5 API 版本控制

**版本控制策略**：使用 **URL 版本控制**（`/api/v1/`, `/api/v2/`）

**API 路由设计**：

```python
# backend/api/v1/router.py

from fastapi import APIRouter

api_v1_router = APIRouter(prefix="/api/v1")

# Projects
api_v1_router.include_router(projects_router, prefix="/projects", tags=["projects"])

# OKRs
api_v1_router.include_router(okrs_router, prefix="/okrs", tags=["okrs"])

# Tasks
api_v1_router.include_router(tasks_router, prefix="/tasks", tags=["tasks"])

# Channels
api_v1_router.include_router(channels_router, prefix="/channels", tags=["channels"])

# Messages
api_v1_router.include_router(messages_router, prefix="/messages", tags=["messages"])

# Agents
api_v1_router.include_router(agents_router, prefix="/agents", tags=["agents"])

# Workflows
api_v1_router.include_router(workflows_router, prefix="/workflows", tags=["workflows"])

# Executions
api_v1_router.include_router(executions_router, prefix="/executions", tags=["executions"])
```

**完整 API 端点列表**：

```python
# backend/api/v1/projects.py

@api_v1_router.get("/projects")
@require_permission("project:read")
async def list_projects(current_user: User = Depends(get_current_user)):
    """获取项目列表"""
    return await ProjectService.list_projects(current_user.id)

@api_v1_router.post("/projects")
@require_permission("project:write")
async def create_project(
    project: ProjectCreate,
    current_user: User = Depends(get_current_user)
):
    """创建项目"""
    return await ProjectService.create_project(project, current_user.id)

@api_v1_router.get("/projects/{project_id}")
@require_permission("project:read")
async def get_project(project_id: str):
    """获取项目详情"""
    return await ProjectService.get_project(project_id)

@api_v1_router.put("/projects/{project_id}")
@require_permission("project:write")
async def update_project(project_id: str, project: ProjectUpdate):
    """更新项目"""
    return await ProjectService.update_project(project_id, project)

@api_v1_router.delete("/projects/{project_id}")
@require_permission("project:delete")
async def delete_project(project_id: str):
    """删除项目"""
    return await ProjectService.delete_project(project_id)

@api_v1_router.get("/projects/{project_id}/okrs")
@require_permission("project:read")
async def get_project_okrs(project_id: str):
    """获取项目的所有 OKR"""
    return await OKRService.list_okrs_by_project(project_id)
```

**API 响应格式统一**：

```python
# backend/api/response.py

from pydantic import BaseModel
from typing import Optional, Any

class APIResponse(BaseModel):
    """统一 API 响应格式"""
    ok: bool
    data: Optional[Any] = None
    error: Optional[dict] = None
    meta: Optional[dict] = None

# 成功响应
def success_response(data: Any, meta: dict = None):
    return APIResponse(ok=True, data=data, meta=meta)

# 错误响应
def error_response(code: str, message: str, details: dict = None):
    return APIResponse(
        ok=False,
        error={
            "code": code,
            "message": message,
            "details": details or {}
        }
    )

# 使用示例
@api_v1_router.get("/projects/{project_id}")
async def get_project(project_id: str):
    try:
        project = await ProjectService.get_project(project_id)
        return success_response(project)
    except ProjectNotFound:
        return error_response("PROJECT_NOT_FOUND", f"Project {project_id} not found")
```

---

### 3.6 核心服务（Services）

#### 3.3.1 ProjectService（项目服务）

**对应 Entity**: `ProjectEntity`  
**对应 Runtime**: 无（配置型实体，无需 Runtime）  
**职责**: 项目的 CRUD、项目配置管理、项目成员管理

```python
# backend/services/project_service.py

class ProjectService:
    """项目服务"""
    
    async def create_project(
        self,
        name: str,
        path: str,
        git_repo: Optional[str] = None,
        owner_id: str,
        **kwargs
    ) -> Project:
        """创建项目"""
        project = Project(
            project_id=generate_uuid(),
            name=name,
            path=path,
            git_repo=git_repo,
            status="active",
            created_by=owner_id,
            created_at=datetime.utcnow()
        )
        
        # 保存到数据库
        await self.db.projects.insert_one(project.dict())
        
        # 创建项目文件结构
        await self.file_system.create_project_structure(project.project_id)
        
        # 创建默认频道
        await self.channel_service.create_default_channels(project.project_id)
        
        return project
    
    async def get_project(self, project_id: str) -> Optional[Project]:
        """获取项目"""
        data = await self.db.projects.find_one({"project_id": project_id})
        return Project(**data) if data else None
    
    async def update_project(self, project_id: str, updates: dict) -> Project:
        """更新项目"""
        await self.db.projects.update_one(
            {"project_id": project_id},
            {"$set": updates}
        )
        return await self.get_project(project_id)
    
    async def list_projects(
        self,
        user_id: str,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Project]:
        """列出项目"""
        query = {"members.member_id": user_id}
        if status:
            query["status"] = status
        
        cursor = self.db.projects.find(query).skip(offset).limit(limit)
        return [Project(**doc) async for doc in cursor]
```

---

#### 3.3.2 OKRService（OKR 服务）

**对应 Entity**: `OKREntity`  
**对应 Runtime**: 无（数据型实体，无需 Runtime）  
**职责**: OKR 的 CRUD、进度计算、KR 关联管理

```python
# backend/services/okr_service.py

class OKRService:
    """OKR 服务"""
    
    async def create_okr(
        self,
        project_id: str,
        objective: str,
        quarter: str,
        key_results: List[dict],
        owner_id: str
    ) -> OKR:
        """创建 OKR"""
        okr = OKR(
            okr_id=generate_uuid(),
            project_id=project_id,
            quarter=quarter,
            objective={"title": objective, "owner_id": owner_id},
            key_results=[],
            created_at=datetime.utcnow()
        )
        
        # 创建 Key Results
        for kr_data in key_results:
            kr = KeyResult(
                kr_id=generate_uuid(),
                title=kr_data["title"],
                target_value=kr_data["target_value"],
                current_value=0,
                unit=kr_data.get("unit", "percent"),
                status="not_started"
            )
            okr.key_results.append(kr)
        
        # 保存到数据库
        await self.db.okrs.insert_one(okr.dict())
        
        # 创建 OKR 文件
        await self.file_system.write_okr_file(okr)
        
        return okr
    
    async def update_kr_progress(
        self,
        okr_id: str,
        kr_id: str,
        current_value: float
    ) -> OKR:
        """更新 KR 进度"""
        okr = await self.get_okr(okr_id)
        
        for kr in okr.key_results:
            if kr.kr_id == kr_id:
                kr.current_value = current_value
                kr.progress = (current_value / kr.target_value) * 100
                
                # 更新状态
                if kr.progress >= 100:
                    kr.status = "completed"
                elif kr.progress >= 70:
                    kr.status = "on_track"
                elif kr.progress >= 30:
                    kr.status = "at_risk"
                else:
                    kr.status = "behind"
                break
        
        # 重新计算 OKR 总体进度
        okr.progress = self._calculate_okr_progress(okr)
        
        # 保存到数据库
        await self.db.okrs.update_one(
            {"okr_id": okr_id},
            {"$set": okr.dict()}
        )
        
        return okr
    
    def _calculate_okr_progress(self, okr: OKR) -> float:
        """计算 OKR 总体进度"""
        if not okr.key_results:
            return 0.0
        
        total_progress = sum(kr.progress for kr in okr.key_results)
        return total_progress / len(okr.key_results)
```

---

#### 3.3.3 TaskService（任务服务）

**对应 Entity**: `TaskEntity`  
**对应 Runtime**: `ChannelRuntime`（通过 ChannelRuntime 管理任务的实时状态）  
**职责**: 任务的 CRUD、状态流转、任务分配

**职责**: 任务的 CRUD、任务分配、状态流转、依赖管理

```python
# backend/services/task_service.py

class TaskService:
    """任务服务"""
    
    async def create_task(
        self,
        channel_id: str,
        title: str,
        description: str,
        task_type: str = "single_agent",
        priority: str = "P2",
        kr_id: Optional[str] = None,
        depends_on: Optional[List[str]] = None,
        creator_id: str
    ) -> Task:
        """创建任务"""
        # 获取任务编号（频道内递增）
        task_number = await self._get_next_task_number(channel_id)
        
        task = Task(
            task_id=generate_uuid(),
            task_number=task_number,
            channel_id=channel_id,
            title=title,
            description=description,
            task_type=task_type,
            priority=priority,
            status="todo",
            kr_id=kr_id,
            depends_on=depends_on or [],
            created_by=creator_id,
            created_at=datetime.utcnow()
        )
        
        # 保存到数据库
        await self.db.tasks.insert_one(task.dict())
        
        # 创建任务文件
        await self.file_system.write_task_file(task)
        
        # 发送任务创建通知
        await self.notification_service.notify_task_created(task)
        
        return task
    
    async def claim_task(
        self,
        task_id: str,
        assignee_id: str,
        assignee_type: str
    ) -> Task:
        """认领任务"""
        task = await self.get_task(task_id)
        
        # 检查任务是否已被认领
        if task.assignee:
            raise TaskAlreadyClaimedException(
                f"Task {task_id} is already claimed by {task.assignee.assignee_name}"
            )
        
        # 检查依赖任务是否完成
        if not await self._check_dependencies_completed(task):
            raise TaskBlockedException(
                f"Task {task_id} is blocked by uncompleted dependencies"
            )
        
        # 更新任务
        task.assignee = Assignee(
            assignee_id=assignee_id,
            assignee_type=assignee_type,
            assigned_at=datetime.utcnow()
        )
        task.status = "in_progress"
        task.started_at = datetime.utcnow()
        
        await self.db.tasks.update_one(
            {"task_id": task_id},
            {"$set": task.dict()}
        )
        
        # 发送任务认领通知
        await self.notification_service.notify_task_claimed(task)
        
        return task
    
    async def update_task_status(
        self,
        task_id: str,
        status: str,
        updater_id: str
    ) -> Task:
        """更新任务状态"""
        task = await self.get_task(task_id)
        
        # 验证状态流转
        if not self._is_valid_status_transition(task.status, status):
            raise InvalidStatusTransitionException(
                f"Cannot transition from {task.status} to {status}"
            )
        
        task.status = status
        task.updated_by = updater_id
        task.updated_at = datetime.utcnow()
        
        if status == "done":
            task.completed_at = datetime.utcnow()
            task.actual_duration_minutes = self._calculate_duration(
                task.started_at, task.completed_at
            )
        
        await self.db.tasks.update_one(
            {"task_id": task_id},
            {"$set": task.dict()}
        )
        
        # 更新关联的 KR 进度
        if task.kr_id and status == "done":
            await self.okr_service.update_kr_progress_from_task(task)
        
        # 发送任务状态更新通知
        await self.notification_service.notify_task_status_changed(task)
        
        return task
    
    def _is_valid_status_transition(self, from_status: str, to_status: str) -> bool:
        """验证状态流转是否合法"""
        valid_transitions = {
            "todo": ["in_progress", "cancelled"],
            "in_progress": ["blocked", "in_review", "cancelled"],
            "blocked": ["in_progress", "cancelled"],
            "in_review": ["in_progress", "done", "cancelled"],
            "done": [],
            "cancelled": []
        }
        return to_status in valid_transitions.get(from_status, [])
```

---

#### 3.3.4 ChannelService（频道服务）

**对应 Entity**: `ChannelEntity`  
**对应 Runtime**: `ChannelRuntime`（管理频道的实时状态、成员在线状态、消息流）  
**职责**: 频道的 CRUD、成员管理、权限控制

**职责**: 频道的 CRUD、成员管理、消息路由

```python
# backend/services/channel_service.py

class ChannelService:
    """频道服务"""
    
    async def create_channel(
        self,
        project_id: str,
        name: str,
        channel_type: str = "public",
        description: Optional[str] = None,
        creator_id: str
    ) -> Channel:
        """创建频道"""
        channel = Channel(
            channel_id=generate_uuid(),
            name=name,
            type=channel_type,
            project_id=project_id,
            description=description,
            members=[],
            created_by=creator_id,
            created_at=datetime.utcnow()
        )
        
        # 添加创建者为频道成员
        await self.add_member(
            channel.channel_id,
            creator_id,
            "human",
            "owner"
        )
        
        # 保存到数据库
        await self.db.channels.insert_one(channel.dict())
        
        # 创建频道文件结构
        await self.file_system.create_channel_structure(channel.channel_id)
        
        return channel
    
    async def add_member(
        self,
        channel_id: str,
        member_id: str,
        member_type: str,
        role: str = "member"
    ) -> Channel:
        """添加频道成员"""
        member = ChannelMember(
            member_id=member_id,
            member_type=member_type,
            role=role,
            joined_at=datetime.utcnow()
        )
        
        await self.db.channels.update_one(
            {"channel_id": channel_id},
            {"$push": {"members": member.dict()}}
        )
        
        return await self.get_channel(channel_id)
    
    async def get_channel_members(
        self,
        channel_id: str
    ) -> List[ChannelMember]:
        """获取频道成员列表"""
        channel = await self.get_channel(channel_id)
        return channel.members if channel else []
```

---

#### 3.3.5 MessageService（消息服务）

**对应 Entity**: `MessageEntity`  
**对应 Runtime**: `ChannelRuntime`（通过 ChannelRuntime 管理消息的实时分发和路由）  
**职责**: 消息的 CRUD、@mention 解析、附件管理、消息搜索

**职责**: 消息的 CRUD、消息路由、@mention 处理、消息搜索

```python
# backend/services/message_service.py

class MessageService:
    """消息服务"""
    
    async def send_message(
        self,
        channel_id: str,
        sender_id: str,
        sender_type: str,
        content: str,
        content_type: str = "text",
        attachments: Optional[List[dict]] = None,
        parent_message_id: Optional[str] = None
    ) -> Message:
        """发送消息"""
        message = Message(
            message_id=generate_uuid(),
            msg_short_id=generate_short_id(),
            channel_id=channel_id,
            sender_id=sender_id,
            sender_type=sender_type,
            content=content,
            content_type=content_type,
            attachments=attachments or [],
            parent_message_id=parent_message_id,
            status="sent",
            created_at=datetime.utcnow()
        )
        
        # 解析 @mentions
        message.mentions = self._parse_mentions(content)
        
        # 解析引用（task #N, #channel, etc.）
        message.references = self._parse_references(content)
        
        # 保存到数据库
        await self.db.messages.insert_one(message.dict())
        
        # 保存消息文件
        await self.file_system.write_message_file(message)
        
        # 通过 WebSocket 实时推送消息
        await self.websocket_service.broadcast_message(channel_id, message)
        
        # 处理 @mentions 通知
        await self._handle_mentions(message)
        
        return message
    
    def _parse_mentions(self, content: str) -> List[Mention]:
        """解析 @mentions"""
        mentions = []
        pattern = r'@(\w+)'
        
        for match in re.finditer(pattern, content):
            mention_name = match.group(1)
            mention_position = match.start()
            
            # 查找被 mention 的对象（agent 或 user）
            entity = await self._find_entity_by_name(mention_name)
            if entity:
                mentions.append(Mention(
                    mention_type=entity.type,
                    mention_id=entity.id,
                    mention_name=mention_name,
                    mention_position=mention_position
                ))
        
        return mentions
    
    async def _handle_mentions(self, message: Message):
        """处理 @mentions 通知"""
        for mention in message.mentions:
            if mention.mention_type == "agent":
                # 唤醒 Agent
                await self.agent_service.wake_agent(
                    mention.mention_id,
                    message.message_id
                )
            elif mention.mention_type == "user":
                # 发送通知给用户
                await self.notification_service.notify_user_mentioned(
                    mention.mention_id,
                    message
                )
```

---

#### 3.3.6 WorkflowService（工作流服务）

**对应 Entity**: `WorkflowEntity`  
**对应 Runtime**: `WorkflowRuntime`（管理工作流的执行状态、步骤调度、状态机）  
**职责**: 工作流的 CRUD、步骤编排、条件分支、并行执行

```python
# backend/services/workflow_service.py

class WorkflowService:
    """工作流服务"""
    
    async def create_workflow(
        self,
        kr_id: str,
        name: str,
        steps: List[dict],
        owner_id: str
    ) -> Workflow:
        """创建工作流"""
        workflow = Workflow(
            workflow_id=generate_uuid(),
            kr_id=kr_id,
            name=name,
            steps=steps,
            status="draft",
            created_by=owner_id,
            created_at=datetime.utcnow()
        )
        
        # 保存到数据库
        await self.db.workflows.insert_one(workflow.dict())
        
        return workflow
    
    async def start_workflow(self, workflow_id: str) -> WorkflowRuntime:
        """启动工作流"""
        workflow = await self.get_workflow(workflow_id)
        
        # 创建 WorkflowRuntime
        runtime = WorkflowRuntime(
            runtime_id=generate_uuid(),
            workflow_id=workflow_id,
            status="running",
            current_step_index=0,
            started_at=datetime.utcnow()
        )
        
        # 保存 Runtime 状态
        await self.db.workflow_runtimes.insert_one(runtime.dict())
        
        # 执行第一步
        await self._execute_step(runtime, 0)
        
        return runtime
    
    async def _execute_step(self, runtime: WorkflowRuntime, step_index: int):
        """执行工作流步骤"""
        workflow = await self.get_workflow(runtime.workflow_id)
        step = workflow.steps[step_index]
        
        # 根据步骤类型执行
        if step["type"] == "agent_task":
            # 分配任务给 Agent
            await self.agent_service.assign_task(
                agent_id=step["agent_id"],
                task_description=step["description"]
            )
        elif step["type"] == "conditional":
            # 评估条件分支
            result = await self._evaluate_condition(step["condition"])
            next_step = step["true_branch"] if result else step["false_branch"]
            await self._execute_step(runtime, next_step)
        elif step["type"] == "parallel":
            # 并行执行多个步骤
            await self._execute_parallel_steps(runtime, step["parallel_steps"])
```

---

#### 3.3.7 ExecutionService（执行服务）

**对应 Entity**: `ExecutionEntity`  
**对应 Runtime**: `ExecutionRuntime`（管理单次执行的实时状态、工具调用、日志流）  
**职责**: 执行记录的 CRUD、日志流管理、Token 统计、成本计算

```python
# backend/services/execution_service.py

class ExecutionService:
    """执行服务"""
    
    async def create_execution(
        self,
        agent_id: str,
        task_id: str,
        input_message_id: str
    ) -> Execution:
        """创建执行记录"""
        execution = Execution(
            execution_id=generate_uuid(),
            agent_id=agent_id,
            task_id=task_id,
            input_message_id=input_message_id,
            status="pending",
            created_at=datetime.utcnow()
        )
        
        # 保存到数据库
        await self.db.executions.insert_one(execution.dict())
        
        # 创建 ExecutionRuntime
        runtime = ExecutionRuntime(
            runtime_id=generate_uuid(),
            execution_id=execution.execution_id,
            status="pending"
        )
        await self.db.execution_runtimes.insert_one(runtime.dict())
        
        return execution
    
    async def start_execution(self, execution_id: str):
        """启动执行"""
        execution = await self.get_execution(execution_id)
        
        # 更新状态
        await self.db.executions.update_one(
            {"execution_id": execution_id},
            {"$set": {"status": "running", "started_at": datetime.utcnow()}}
        )
        
        # 更新 Runtime 状态
        await self.db.execution_runtimes.update_one(
            {"execution_id": execution_id},
            {"$set": {"status": "running"}}
        )
        
        # 通过 AgentDaemon 执行任务
        await self.agent_daemon_adapter.execute_task(
            agent_id=execution.agent_id,
            execution_id=execution_id
        )
    
    async def log_tool_call(
        self,
        execution_id: str,
        tool_name: str,
        parameters: dict,
        result: dict
    ):
        """记录工具调用"""
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "tool_name": tool_name,
            "parameters": parameters,
            "result": result
        }
        
        # 追加到日志文件
        await self.file_system.append_to_log(execution_id, log_entry)
        
        # 更新 Runtime 状态
        await self.db.execution_runtimes.update_one(
            {"execution_id": execution_id},
            {"$inc": {"tool_calls." + tool_name: 1}}
        )
    
    async def update_token_usage(
        self,
        execution_id: str,
        input_tokens: int,
        output_tokens: int,
        thinking_tokens: int
    ):
        """更新 Token 使用统计"""
        await self.db.executions.update_one(
            {"execution_id": execution_id},
            {
                "$inc": {
                    "token_usage.input_tokens": input_tokens,
                    "token_usage.output_tokens": output_tokens,
                    "token_usage.thinking_tokens": thinking_tokens
                }
            }
        )
        
        # 计算成本
        cost = self._calculate_cost(input_tokens, output_tokens, thinking_tokens)
        await self.db.executions.update_one(
            {"execution_id": execution_id},
            {"$inc": {"cost.total_cost_usd": cost}}
        )
```

---

#### 3.3.8 AgentRuntimeService（Agent 运行时服务）

**对应 Entity**: `AgentEntity`  
**对应 Runtime**: `AgentDaemon`（管理 Agent 的生命周期、消息队列、触发器、插件）  
**职责**: Agent 的启动/停止、状态监控、消息路由、触发器管理

```python
# backend/services/agent_runtime_service.py

class AgentRuntimeService:
    """Agent 运行时服务"""
    
    async def start_agent(self, agent_id: str) -> AgentDaemon:
        """启动 Agent"""
        agent = await self.agent_service.get_agent(agent_id)
        
        # 通过 AgentDaemon 适配器启动
        daemon = await self.agent_daemon_adapter.start_agent(
            agent_id=agent_id,
            config=agent.config
        )
        
        # 启动触发器
        await self._start_triggers(agent_id, agent.triggers)
        
        # 加载插件
        await self._load_plugins(agent_id, agent.plugins)
        
        return daemon
    
    async def stop_agent(self, agent_id: str):
        """停止 Agent"""
        daemon = await self.get_agent_daemon(agent_id)
        
        # 停止触发器
        await self._stop_triggers(agent_id)
        
        # 卸载插件
        await self._unload_plugins(agent_id)
        
        # 通过适配器停止 Agent
        await self.agent_daemon_adapter.stop_agent(daemon.daemon_id)
        
        # 更新状态
        await self.db.agent_daemons.update_one(
            {"agent_id": agent_id},
            {"$set": {"status": "stopped"}}
        )
    
    async def send_message_to_agent(
        self,
        agent_id: str,
        message: Message
    ):
        """发送消息给 Agent"""
        daemon = await self.get_agent_daemon(agent_id)
        
        # 将消息放入 Agent 的 inbox 队列
        await self.agent_daemon_adapter.enqueue_message(
            daemon.daemon_id,
            message
        )
    
    async def get_agent_status(self, agent_id: str) -> dict:
        """获取 Agent 状态"""
        daemon = await self.get_agent_daemon(agent_id)
        runtime = await self.db.agent_daemons.find_one({"agent_id": agent_id})
        
        return {
            "agent_id": agent_id,
            "status": daemon.status,
            "uptime_seconds": runtime.get("statistics", {}).get("uptime_seconds", 0),
            "total_executions": runtime.get("statistics", {}).get("total_executions", 0),
            "pending_messages": runtime.get("components", {}).get("message_inbox_thread", {}).get("pending_messages", 0)
        }
    
    async def export_agent_state(
        self,
        agent_id: str,
        force: bool = False
    ) -> AgentStateExport:
        """导出 Agent 状态（config/memory/executions/skills）
        
        用于 Agent 迁移、备份或框架切换（如从 claude_code 迁移到 runtime）。
        force=True 时即使 Agent 正在运行也强制导出（会短暂暂停执行）。
        """
        agent = await self.agent_service.get_agent(agent_id)
        daemon = await self.get_agent_daemon(agent_id)
        
        # 如果 Agent 正在运行且非强制，先暂停
        was_running = daemon.status == "running"
        if was_running and not force:
            raise AgentStateError(
                f"Agent {agent_id} is running. Use force=True to export while running."
            )
        if was_running and force:
            await self.agent_daemon_adapter.pause_agent(daemon.daemon_id)
        
        try:
            # 从 Runtime Gateway 导出运行时状态
            runtime_state = await self.agent_daemon_adapter.export_runtime_state(
                daemon.daemon_id
            )
            
            # 从数据库读取持久化数据
            executions = await self.db.executions.find(
                {"agent_id": agent_id},
                sort=[("created_at", -1)],
                limit=100  # 最近 100 条执行记录
            ).to_list()
            
            export = AgentStateExport(
                export_id=generate_uuid(),
                agent_id=agent_id,
                framework=agent.framework,
                exported_at=datetime.utcnow(),
                config=agent.config.dict(),
                memory=runtime_state.get("memory", {}),
                skills=runtime_state.get("loaded_skills", []),
                recent_executions=[e["execution_id"] for e in executions],
                metadata={
                    "export_version": "1.0",
                    "source_framework": agent.framework,
                    "agent_name": agent.name,
                }
            )
            
            # 持久化导出记录
            await self.db.agent_state_exports.insert_one(export.dict())
            
            return export
        finally:
            # 恢复运行状态
            if was_running and force:
                await self.agent_daemon_adapter.resume_agent(daemon.daemon_id)
    
    async def import_agent_state(
        self,
        export_id: str,
        target_agent_id: Optional[str] = None,
        overwrite: bool = False
    ) -> Agent:
        """导入 Agent 状态
        
        export_id: 之前 export_agent_state 返回的 export_id
        target_agent_id: 导入到已有 Agent（None 则创建新 Agent）
        overwrite: 目标 Agent 已有状态时是否覆盖
        """
        # 读取导出记录
        export_doc = await self.db.agent_state_exports.find_one({"export_id": export_id})
        if not export_doc:
            raise NotFoundError(f"Export {export_id} not found")
        
        export = AgentStateExport(**export_doc)
        
        if target_agent_id:
            # 导入到已有 Agent
            target_agent = await self.agent_service.get_agent(target_agent_id)
            if target_agent.framework != export.framework and not overwrite:
                raise AgentStateError(
                    f"Framework mismatch: target={target_agent.framework}, "
                    f"export={export.framework}. Use overwrite=True to force."
                )
            agent = target_agent
        else:
            # 创建新 Agent
            agent = await self.agent_service.create_agent(
                name=f"{export.metadata['agent_name']}_imported",
                config=AgentConfig(**export.config),
                framework=export.framework
            )
        
        # 通过 AgentDaemon 适配器导入运行时状态
        daemon = await self.agent_daemon_adapter.start_agent(
            agent_id=agent.agent_id,
            config=AgentConfig(**export.config)
        )
        
        await self.agent_daemon_adapter.import_runtime_state(
            daemon_id=daemon.daemon_id,
            memory=export.memory,
            skills=export.skills
        )
        
        # 记录导入操作
        await self.db.agent_state_imports.insert_one({
            "import_id": generate_uuid(),
            "export_id": export_id,
            "target_agent_id": agent.agent_id,
            "imported_at": datetime.utcnow(),
            "overwrite": overwrite
        })
        
        return agent
```

---

### 3.3 AgentDaemon 适配层

**职责**: 连接业务层与 Agent Runtime，提供统一的 Agent 管理接口

```python
# backend/adapters/agent_daemon_adapter.py

class AgentDaemonAdapter:
    """AgentDaemon 适配器"""
    
    def __init__(self, runtime_client: RuntimeClient):
        self.runtime = runtime_client
    
    async def start_agent(
        self,
        agent_id: str,
        config: AgentConfig
    ) -> AgentDaemon:
        """启动 Agent"""
        # 将 AgentEntity 配置转换为 Runtime 格式
        runtime_config = self._convert_to_runtime_config(config)
        
        # 通过 Runtime 启动 Agent
        session = await self.runtime.create_session(runtime_config)
        
        # 创建 AgentDaemon 实例
        daemon = AgentDaemon(
            daemon_id=generate_uuid(),
            agent_id=agent_id,
            pid=session.pid,
            status="running",
            runtime_session_id=session.session_id
        )
        
        # 保存到数据库
        await self.db.agent_daemons.insert_one(daemon.dict())
        
        return daemon
    
    async def send_message_to_agent(
        self,
        agent_id: str,
        message: Message
    ) -> ExecutionResult:
        """向 Agent 发送消息"""
        daemon = await self._get_agent_daemon(agent_id)
        
        # 通过 Runtime 发送消息
        result = await self.runtime.send_message(
            session_id=daemon.runtime_session_id,
            content=message.content,
            metadata={
                "message_id": message.message_id,
                "channel_id": message.channel_id,
                "sender_id": message.sender_id
            }
        )
        
        return result
    
    def _convert_to_runtime_config(self, config: AgentConfig) -> dict:
        """将 AgentEntity 配置转换为 Runtime 格式"""
        return {
            "agent_id": config.agent_id,
            "model": config.model.model_name,
            "system_prompt": config.system_prompt,
            "tools": config.tools,
            "max_tokens": config.model.max_tokens,
            "temperature": config.model.temperature
        }
```

---

#### 3.3.9 State Export/Import API（状态导出导入服务）

**对应需求**: P1-2 - Runtime 集成需要完整的 State Export/Import API  
**职责**: 提供 Agent 状态的导出和导入功能，支持 Agent Runtime 的状态持久化和恢复

```python
# backend/services/state_service.py

class StateExportImportService:
    """Agent 状态导出导入服务"""
    
    async def export_agent_state(
        self,
        agent_id: str,
        include_executions: bool = True,
        include_memory: bool = True
    ) -> AgentStateExport:
        """导出 Agent 完整状态"""
        agent = await self.agent_service.get_agent(agent_id)
        daemon = await self.agent_runtime_service.get_agent_daemon(agent_id)
        
        # 1. 导出 Agent 基础配置
        state = {
            "agent_id": agent_id,
            "agent_config": agent.dict(),
            "daemon_state": daemon.dict() if daemon else None,
            "exported_at": datetime.utcnow().isoformat()
        }
        
        # 2. 导出执行历史
        if include_executions:
            executions = await self.db.executions.find(
                {"agent_id": agent_id}
            ).sort("created_at", -1).limit(100).to_list(100)
            state["executions"] = [exec.dict() for exec in executions]
        
        # 3. 导出 Memory 文件
        if include_memory:
            memory_path = f"/workspace/{agent_id}/MEMORY.md"
            if os.path.exists(memory_path):
                with open(memory_path, 'r') as f:
                    state["memory"] = f.read()
            
            # 导出 notes/ 目录
            notes_dir = f"/workspace/{agent_id}/notes/"
            if os.path.exists(notes_dir):
                state["notes"] = {}
                for filename in os.listdir(notes_dir):
                    filepath = os.path.join(notes_dir, filename)
                    if os.path.isfile(filepath):
                        with open(filepath, 'r') as f:
                            state["notes"][filename] = f.read()
        
        # 4. 导出 Agent Runtime 状态
        if daemon and daemon.runtime_session_id:
            runtime_state = await self.runtime_client.export_session_state(
                session_id=daemon.runtime_session_id
            )
            state["runtime_runtime"] = runtime_state
        
        return AgentStateExport(**state)
    
    async def import_agent_state(
        self,
        state_data: AgentStateExport,
        target_agent_id: Optional[str] = None,
        restore_executions: bool = False
    ) -> str:
        """导入 Agent 状态"""
        # 1. 创建或更新 Agent
        agent_id = target_agent_id or state_data.agent_id
        
        agent_config = state_data.agent_config
        agent_config["agent_id"] = agent_id
        
        existing_agent = await self.agent_service.get_agent(agent_id)
        if existing_agent:
            await self.agent_service.update_agent(agent_id, agent_config)
        else:
            await self.agent_service.create_agent(agent_config)
        
        # 2. 恢复 Memory 文件
        if state_data.memory:
            memory_path = f"/workspace/{agent_id}/MEMORY.md"
            os.makedirs(os.path.dirname(memory_path), exist_ok=True)
            with open(memory_path, 'w') as f:
                f.write(state_data.memory)
        
        if state_data.notes:
            notes_dir = f"/workspace/{agent_id}/notes/"
            os.makedirs(notes_dir, exist_ok=True)
            for filename, content in state_data.notes.items():
                filepath = os.path.join(notes_dir, filename)
                with open(filepath, 'w') as f:
                    f.write(content)
        
        # 3. 恢复执行历史（可选）
        if restore_executions and state_data.executions:
            for exec_data in state_data.executions:
                exec_data["agent_id"] = agent_id
                exec_data["execution_id"] = generate_uuid()  # 生成新 ID
                await self.db.executions.insert_one(exec_data)
        
        # 4. 恢复 Agent Runtime 状态
        if state_data.runtime_runtime:
            # 启动 Agent
            daemon = await self.agent_runtime_service.start_agent(agent_id)
            
            # 导入 Runtime 状态
            await self.runtime_client.import_session_state(
                session_id=daemon.runtime_session_id,
                state=state_data.runtime_runtime
            )
        
        return agent_id
    
    async def export_to_file(
        self,
        agent_id: str,
        output_path: str
    ):
        """导出 Agent 状态到文件"""
        state = await self.export_agent_state(agent_id)
        
        with open(output_path, 'w') as f:
            json.dump(state.dict(), f, indent=2)
    
    async def import_from_file(
        self,
        input_path: str,
        target_agent_id: Optional[str] = None
    ) -> str:
        """从文件导入 Agent 状态"""
        with open(input_path, 'r') as f:
            state_data = json.load(f)
        
        state = AgentStateExport(**state_data)
        return await self.import_agent_state(state, target_agent_id)
```

**REST API 端点**：

```python
# backend/api/v1/state.py

@router.post("/agents/{agent_id}/export")
async def export_agent_state(
    agent_id: str,
    include_executions: bool = Query(True),
    include_memory: bool = Query(True),
    state_service: StateExportImportService = Depends()
):
    """导出 Agent 状态"""
    state = await state_service.export_agent_state(
        agent_id=agent_id,
        include_executions=include_executions,
        include_memory=include_memory
    )
    return state

@router.post("/agents/import")
async def import_agent_state(
    state_data: AgentStateExport,
    target_agent_id: Optional[str] = Query(None),
    restore_executions: bool = Query(False),
    state_service: StateExportImportService = Depends()
):
    """导入 Agent 状态"""
    agent_id = await state_service.import_agent_state(
        state_data=state_data,
        target_agent_id=target_agent_id,
        restore_executions=restore_executions
    )
    return {"agent_id": agent_id, "status": "imported"}

@router.get("/agents/{agent_id}/export/download")
async def download_agent_state(
    agent_id: str,
    state_service: StateExportImportService = Depends()
):
    """下载 Agent 状态文件"""
    temp_file = f"/tmp/agent_{agent_id}_state.json"
    await state_service.export_to_file(agent_id, temp_file)
    
    return FileResponse(
        path=temp_file,
        filename=f"agent_{agent_id}_state.json",
        media_type="application/json"
    )
```

**数据库映射**：

State Export/Import 涉及的数据库表：
- `agents` 表：Agent 基础配置
- `agent_daemons` 表：Runtime 状态
- `executions` 表：执行历史
- `runtime_sync_log` 表：Runtime 同步日志（用于验证状态一致性）

**与 Runtime 集成**：

```python
# backend/clients/runtime_client.py

class RuntimeClient:
    """Runtime Gateway 客户端"""
    
    async def export_session_state(self, session_id: str) -> dict:
        """导出 Runtime Session 状态"""
        response = await self.http_client.get(
            f"{self.gateway_url}/sessions/{session_id}/state"
        )
        return response.json()
    
    async def import_session_state(
        self,
        session_id: str,
        state: dict
    ):
        """导入 Runtime Session 状态"""
        await self.http_client.post(
            f"{self.gateway_url}/sessions/{session_id}/state",
            json=state
        )
```

---

### 3.3.10 ServerService

**职责**: 管理 Slock Server（工作区）的生命周期，包括创建、配置、成员管理和权限控制。

```python
# backend/services/server_service.py

from typing import Optional
from uuid import UUID, uuid4
from datetime import datetime

class ServerService:
    """Server（工作区）管理服务"""
    
    def __init__(self, db: AsyncSession, cache: Redis):
        self.db = db
        self.cache = cache
    
    # ─── Server CRUD ───────────────────────────────────────────────
    
    async def create_server(
        self,
        name: str,
        description: Optional[str],
        owner_id: UUID
    ) -> ServerEntity:
        """创建新 Server"""
        server_id = uuid4()
        
        async with self.db.begin():
            # 创建 server 记录
            server = await self.db.execute(
                """
                INSERT INTO servers (server_id, name, description, created_at, updated_at)
                VALUES (:server_id, :name, :description, NOW(), NOW())
                RETURNING *
                """,
                {
                    "server_id": str(server_id),
                    "name": name,
                    "description": description,
                }
            )
            row = server.fetchone()
            
            # 将创建者加入为 owner 角色
            await self.db.execute(
                """
                INSERT INTO server_members (server_id, user_id, role, joined_at)
                VALUES (:server_id, :user_id, 'owner', NOW())
                """,
                {"server_id": str(server_id), "user_id": str(owner_id)}
            )
        
        return ServerEntity.from_row(row)
    
    async def get_server(self, server_id: UUID) -> Optional[ServerEntity]:
        """获取 Server 详情（带缓存）"""
        cache_key = f"server:{server_id}"
        
        # 先查缓存
        cached = await self.cache.get(cache_key)
        if cached:
            return ServerEntity.from_json(cached)
        
        result = await self.db.execute(
            "SELECT * FROM servers WHERE server_id = :server_id",
            {"server_id": str(server_id)}
        )
        row = result.fetchone()
        if not row:
            return None
        
        entity = ServerEntity.from_row(row)
        await self.cache.setex(cache_key, 300, entity.to_json())
        return entity
    
    async def update_server(
        self,
        server_id: UUID,
        name: Optional[str] = None,
        description: Optional[str] = None
    ) -> ServerEntity:
        """更新 Server 信息"""
        updates = {}
        if name is not None:
            updates["name"] = name
        if description is not None:
            updates["description"] = description
        
        if not updates:
            return await self.get_server(server_id)
        
        updates["updated_at"] = datetime.utcnow()
        set_clause = ", ".join(f"{k} = :{k}" for k in updates)
        updates["server_id"] = str(server_id)
        
        result = await self.db.execute(
            f"UPDATE servers SET {set_clause} WHERE server_id = :server_id RETURNING *",
            updates
        )
        row = result.fetchone()
        
        # 清除缓存
        await self.cache.delete(f"server:{server_id}")
        
        return ServerEntity.from_row(row)
    
    async def delete_server(self, server_id: UUID) -> bool:
        """删除 Server（软删除，级联归档所有 Channel）"""
        async with self.db.begin():
            # 归档所有 Channel
            await self.db.execute(
                """
                UPDATE channels
                SET is_archived = TRUE, updated_at = NOW()
                WHERE server_id = :server_id
                """,
                {"server_id": str(server_id)}
            )
            
            # 软删除 Server（标记 deleted_at）
            result = await self.db.execute(
                """
                UPDATE servers
                SET deleted_at = NOW(), updated_at = NOW()
                WHERE server_id = :server_id
                RETURNING id
                """,
                {"server_id": str(server_id)}
            )
        
        await self.cache.delete(f"server:{server_id}")
        return result.fetchone() is not None
    
    # ─── Member Management ─────────────────────────────────────────
    
    async def add_member(
        self,
        server_id: UUID,
        user_id: UUID,
        role: str = "member"
    ) -> ServerMemberEntity:
        """添加成员到 Server"""
        valid_roles = {"owner", "admin", "member"}
        if role not in valid_roles:
            raise ValueError(f"Invalid role: {role}. Must be one of {valid_roles}")
        
        result = await self.db.execute(
            """
            INSERT INTO server_members (server_id, user_id, role, joined_at)
            VALUES (:server_id, :user_id, :role, NOW())
            ON CONFLICT (server_id, user_id) DO UPDATE
                SET role = EXCLUDED.role
            RETURNING *
            """,
            {
                "server_id": str(server_id),
                "user_id": str(user_id),
                "role": role,
            }
        )
        return ServerMemberEntity.from_row(result.fetchone())
    
    async def remove_member(self, server_id: UUID, user_id: UUID) -> bool:
        """从 Server 移除成员"""
        # 不允许移除最后一个 owner
        owner_count = await self.db.execute(
            """
            SELECT COUNT(*) FROM server_members
            WHERE server_id = :server_id AND role = 'owner'
            """,
            {"server_id": str(server_id)}
        )
        count = owner_count.scalar()
        
        # 检查被移除的是否是 owner
        member = await self.db.execute(
            "SELECT role FROM server_members WHERE server_id = :server_id AND user_id = :user_id",
            {"server_id": str(server_id), "user_id": str(user_id)}
        )
        row = member.fetchone()
        if row and row["role"] == "owner" and count <= 1:
            raise ValueError("Cannot remove the last owner of a server")
        
        result = await self.db.execute(
            """
            DELETE FROM server_members
            WHERE server_id = :server_id AND user_id = :user_id
            RETURNING id
            """,
            {"server_id": str(server_id), "user_id": str(user_id)}
        )
        return result.fetchone() is not None
    
    async def list_members(
        self,
        server_id: UUID,
        role: Optional[str] = None
    ) -> list[ServerMemberEntity]:
        """列出 Server 成员"""
        query = """
            SELECT sm.*, u.display_name, u.avatar_url
            FROM server_members sm
            JOIN users u ON sm.user_id = u.user_id
            WHERE sm.server_id = :server_id
        """
        params = {"server_id": str(server_id)}
        
        if role:
            query += " AND sm.role = :role"
            params["role"] = role
        
        query += " ORDER BY sm.joined_at ASC"
        
        result = await self.db.execute(query, params)
        return [ServerMemberEntity.from_row(row) for row in result.fetchall()]
    
    async def update_member_role(
        self,
        server_id: UUID,
        user_id: UUID,
        new_role: str
    ) -> ServerMemberEntity:
        """更新成员角色"""
        result = await self.db.execute(
            """
            UPDATE server_members
            SET role = :role
            WHERE server_id = :server_id AND user_id = :user_id
            RETURNING *
            """,
            {
                "server_id": str(server_id),
                "user_id": str(user_id),
                "role": new_role,
            }
        )
        row = result.fetchone()
        if not row:
            raise ValueError(f"Member not found in server")
        return ServerMemberEntity.from_row(row)
    
    # ─── Server Configuration ──────────────────────────────────────
    
    async def get_server_config(self, server_id: UUID) -> dict:
        """获取 Server 配置"""
        result = await self.db.execute(
            "SELECT config FROM servers WHERE server_id = :server_id",
            {"server_id": str(server_id)}
        )
        row = result.fetchone()
        return row["config"] if row and row["config"] else {}
    
    async def update_server_config(
        self,
        server_id: UUID,
        config_patch: dict
    ) -> dict:
        """更新 Server 配置（合并更新，不覆盖）"""
        result = await self.db.execute(
            """
            UPDATE servers
            SET config = COALESCE(config, '{}'::jsonb) || :patch::jsonb,
                updated_at = NOW()
            WHERE server_id = :server_id
            RETURNING config
            """,
            {
                "server_id": str(server_id),
                "patch": json.dumps(config_patch),
            }
        )
        row = result.fetchone()
        await self.cache.delete(f"server:{server_id}")
        return row["config"] if row else {}
```

**Server API 端点**:

| Method | Path | 描述 | 权限 |
|--------|------|------|------|
| `POST` | `/api/v1/servers` | 创建 Server | 已认证用户 |
| `GET` | `/api/v1/servers/{server_id}` | 获取 Server 详情 | Server 成员 |
| `PATCH` | `/api/v1/servers/{server_id}` | 更新 Server 信息 | admin/owner |
| `DELETE` | `/api/v1/servers/{server_id}` | 删除 Server | owner |
| `GET` | `/api/v1/servers/{server_id}/members` | 列出成员 | Server 成员 |
| `POST` | `/api/v1/servers/{server_id}/members` | 添加成员 | admin/owner |
| `DELETE` | `/api/v1/servers/{server_id}/members/{user_id}` | 移除成员 | admin/owner |
| `PATCH` | `/api/v1/servers/{server_id}/members/{user_id}/role` | 更新成员角色 | owner |
| `GET` | `/api/v1/servers/{server_id}/config` | 获取配置 | admin/owner |
| `PATCH` | `/api/v1/servers/{server_id}/config` | 更新配置 | owner |

**数据库支撑表**（已在 Section 3.4.1 定义）:
- `servers` — Server 基础信息
- `server_members` — 成员关系与角色（`role CHECK IN ('owner', 'admin', 'member')`）

**关键设计决策**:
1. **软删除**: Server 删除时标记 `deleted_at`，级联归档所有 Channel，保留历史数据
2. **最后 owner 保护**: 不允许移除 Server 的最后一个 owner，防止孤儿 Server
3. **配置合并更新**: 使用 `||` JSONB 操作符做 patch 更新，避免覆盖未修改的配置项
4. **缓存策略**: Server 基础信息缓存 5 分钟（TTL=300s），写操作立即失效

---

### 3.4 数据持久化

**混合存储策略**:
- **PostgreSQL**: 结构化数据（所有 Entity 的索引和查询数据，包括消息）
- **File System**: 配置文件（agent.yaml、project.yaml）、Agent 知识库（MEMORY.md、knowledge/）
- **Redis**: 缓存、消息队列、实时状态

**关键设计决策**：
1. **消息存储在 PostgreSQL**：消息是高频查询数据，需要索引和分页支持，不适合存储在文件系统
2. **配置文件存储在文件系统**：Agent/Project 配置使用 YAML 格式，便于版本控制和人工编辑
3. **双写策略**：配置型 Entity（Agent、Project）双写到数据库和文件系统，保证一致性

---

#### 3.4.1 PostgreSQL Schema 设计

**完整的数据库表结构**（10 张核心表）：

```sql
-- ============================================
-- 1. servers 表（服务器）
-- ============================================
CREATE TABLE servers (
    id BIGSERIAL PRIMARY KEY,
    server_id UUID UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_servers_server_id ON servers(server_id);

-- ============================================
-- 2. channels 表（频道）
-- ============================================
CREATE TABLE channels (
    id BIGSERIAL PRIMARY KEY,
    channel_id UUID UNIQUE NOT NULL,
    server_id BIGINT REFERENCES servers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK(type IN ('public', 'private', 'dm', 'discussion')),
    parent_channel_id BIGINT REFERENCES channels(id) ON DELETE SET NULL,
    parent_message_id BIGINT,  -- 如果是 discussion，指向父消息
    project_id UUID,
    status VARCHAR(50) DEFAULT 'active' CHECK(status IN ('active', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_channels_server ON channels(server_id);
CREATE INDEX idx_channels_parent ON channels(parent_channel_id);
CREATE INDEX idx_channels_project ON channels(project_id);
CREATE INDEX idx_channels_type ON channels(type);
CREATE INDEX idx_channels_status ON channels(status);

-- ============================================
-- 3. messages 表（消息）- 核心高频查询表
-- ============================================
CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    message_id UUID UNIQUE NOT NULL,
    msg_short_id VARCHAR(8) NOT NULL,
    channel_id BIGINT REFERENCES channels(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    sender_type VARCHAR(50) NOT NULL CHECK(sender_type IN ('human', 'agent', 'system')),
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text' CHECK(content_type IN ('text', 'markdown', 'code', 'image', 'file')),
    parent_message_id BIGINT REFERENCES messages(id) ON DELETE CASCADE,
    is_discussion_root BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'sent' CHECK(status IN ('sent', 'edited', 'deleted')),
    mentions JSONB DEFAULT '[]',  -- [{type, id, name, position}]
    references JSONB DEFAULT '[]',  -- [{type, id, text}]
    attachments JSONB DEFAULT '[]',  -- [{type, url, name, size}]
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 关键索引（性能优化）
CREATE INDEX idx_messages_channel_created ON messages(channel_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_parent ON messages(parent_message_id);
CREATE UNIQUE INDEX idx_messages_channel_short_id ON messages(channel_id, msg_short_id);
CREATE INDEX idx_messages_discussion_root ON messages(is_discussion_root) WHERE is_discussion_root = TRUE;
CREATE INDEX idx_messages_status ON messages(status) WHERE status != 'deleted';

-- GIN 索引用于 JSONB 查询
CREATE INDEX idx_messages_mentions ON messages USING GIN(mentions);
CREATE INDEX idx_messages_references ON messages USING GIN(references);

-- ============================================
-- 4. tasks 表（任务）
-- ============================================
CREATE TABLE tasks (
    id BIGSERIAL PRIMARY KEY,
    task_id UUID UNIQUE NOT NULL,
    task_number INT NOT NULL,
    channel_id BIGINT REFERENCES channels(id) ON DELETE CASCADE,
    message_id BIGINT REFERENCES messages(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL CHECK(status IN ('todo', 'in_progress', 'blocked', 'in_review', 'done', 'cancelled')),
    priority VARCHAR(10) CHECK(priority IN ('P0', 'P1', 'P2', 'P3')),
    assignee_id UUID,
    assignee_type VARCHAR(50) CHECK(assignee_type IN ('agent', 'human')),
    kr_id UUID,  -- 关联的 Key Result
    estimated_hours NUMERIC(10, 2),
    start_date TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    dependencies JSONB DEFAULT '[]',  -- [task_id1, task_id2, ...]
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_channel ON tasks(channel_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_kr ON tasks(kr_id);
CREATE UNIQUE INDEX idx_tasks_channel_number ON tasks(channel_id, task_number);
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;

-- ============================================
-- 5. agents 表（Agent 索引表）
-- ============================================
CREATE TABLE agents (
    id BIGSERIAL PRIMARY KEY,
    agent_id UUID UNIQUE NOT NULL,
    name VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    framework VARCHAR(50) NOT NULL CHECK(framework IN ('claude_code', 'runtime', 'custom')),
    agent_type VARCHAR(50) NOT NULL,
    model VARCHAR(100),
    status VARCHAR(50) NOT NULL CHECK(status IN ('active', 'idle', 'sleeping', 'terminated', 'crashed')),
    config_path TEXT NOT NULL,  -- 指向文件系统的 agent.yaml 路径
    workspace_path TEXT NOT NULL,
    server_id BIGINT REFERENCES servers(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ
);

CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_framework ON agents(framework);
CREATE INDEX idx_agents_server ON agents(server_id);
CREATE INDEX idx_agents_name ON agents(name);

-- ============================================
-- 6. agent_executions 表（执行记录）
-- ============================================
CREATE TABLE agent_executions (
    id BIGSERIAL PRIMARY KEY,
    execution_id UUID UNIQUE NOT NULL,
    agent_id BIGINT REFERENCES agents(id) ON DELETE CASCADE,
    task_id BIGINT REFERENCES tasks(id) ON DELETE SET NULL,
    workflow_id UUID,
    status VARCHAR(50) NOT NULL CHECK(status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    input_message_id BIGINT REFERENCES messages(id) ON DELETE SET NULL,
    output_message_id BIGINT REFERENCES messages(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_seconds INT,
    token_usage JSONB,  -- {input_tokens, output_tokens, total_tokens}
    cost_usd NUMERIC(10, 4),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_executions_agent ON agent_executions(agent_id);
CREATE INDEX idx_executions_task ON agent_executions(task_id);
CREATE INDEX idx_executions_status ON agent_executions(status);
CREATE INDEX idx_executions_started ON agent_executions(started_at DESC);

-- ============================================
-- 7. projects 表（项目）
-- ============================================
CREATE TABLE projects (
    id BIGSERIAL PRIMARY KEY,
    project_id UUID UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    path TEXT NOT NULL,
    git_repo VARCHAR(500),
    status VARCHAR(50) NOT NULL CHECK(status IN ('active', 'archived', 'maintenance')),
    config_path TEXT NOT NULL,  -- 指向 project.yaml
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_name ON projects(name);

-- ============================================
-- 8. okrs 表（目标与关键结果）
-- ============================================
CREATE TABLE okrs (
    id BIGSERIAL PRIMARY KEY,
    okr_id UUID UNIQUE NOT NULL,
    project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
    quarter VARCHAR(10) NOT NULL,
    objective_title VARCHAR(500) NOT NULL,
    objective_description TEXT,
    overall_progress INT DEFAULT 0 CHECK(overall_progress >= 0 AND overall_progress <= 100),
    status VARCHAR(50) DEFAULT 'in_progress' CHECK(status IN ('not_started', 'in_progress', 'at_risk', 'completed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_okrs_project ON okrs(project_id);
CREATE INDEX idx_okrs_quarter ON okrs(quarter);
CREATE INDEX idx_okrs_status ON okrs(status);

-- ============================================
-- 9. key_results 表（关键结果）
-- ============================================
CREATE TABLE key_results (
    id BIGSERIAL PRIMARY KEY,
    kr_id UUID UNIQUE NOT NULL,
    okr_id BIGINT REFERENCES okrs(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    target_value NUMERIC NOT NULL,
    current_value NUMERIC DEFAULT 0,
    unit VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK(status IN ('not_started', 'in_progress', 'at_risk', 'completed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_key_results_okr ON key_results(okr_id);
CREATE INDEX idx_key_results_status ON key_results(status);

-- ============================================
-- 10. workflows 表（工作流）
-- ============================================
CREATE TABLE workflows (
    id BIGSERIAL PRIMARY KEY,
    workflow_id UUID UNIQUE NOT NULL,
    kr_id BIGINT REFERENCES key_results(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    workflow_type VARCHAR(50) NOT NULL CHECK(workflow_type IN ('sequential', 'parallel', 'dag', 'state_machine')),
    status VARCHAR(50) NOT NULL CHECK(status IN ('draft', 'active', 'paused', 'completed', 'failed')),
    config_path TEXT NOT NULL,  -- 指向 workflow.yaml
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflows_kr ON workflows(kr_id);
CREATE INDEX idx_workflows_status ON workflows(status);

-- ============================================
-- 11. feishu_tenants 表（飞书租户）
-- ============================================
CREATE TABLE feishu_tenants (
    tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_key VARCHAR(255) UNIQUE NOT NULL,
    app_id VARCHAR(255) NOT NULL,
    app_secret_encrypted TEXT NOT NULL,
    tenant_name VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    
    CONSTRAINT feishu_tenants_tenant_key_check CHECK (char_length(tenant_key) > 0),
    CONSTRAINT feishu_tenants_app_id_check CHECK (char_length(app_id) > 0)
);

-- 索引
CREATE INDEX idx_feishu_tenants_tenant_key ON feishu_tenants(tenant_key);
CREATE INDEX idx_feishu_tenants_app_id ON feishu_tenants(app_id);
CREATE INDEX idx_feishu_tenants_is_active ON feishu_tenants(is_active) WHERE is_active = true;
CREATE INDEX idx_feishu_tenants_metadata ON feishu_tenants USING gin(metadata);

-- 注释
COMMENT ON TABLE feishu_tenants IS '飞书租户表：存储飞书企业租户的配置信息';
COMMENT ON COLUMN feishu_tenants.tenant_id IS '租户唯一标识符';
COMMENT ON COLUMN feishu_tenants.tenant_key IS '飞书租户 Key（唯一）';
COMMENT ON COLUMN feishu_tenants.app_id IS '飞书应用 ID';
COMMENT ON COLUMN feishu_tenants.app_secret_encrypted IS '加密后的飞书应用 Secret';
COMMENT ON COLUMN feishu_tenants.tenant_name IS '租户名称（用于展示）';
COMMENT ON COLUMN feishu_tenants.is_active IS '租户是否激活';
COMMENT ON COLUMN feishu_tenants.metadata IS '扩展元数据（JSONB）：webhook_url, event_subscriptions, etc.';

-- ============================================
-- 12. feishu_tokens 表（飞书访问令牌）
-- ============================================
CREATE TABLE feishu_tokens (
    token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES feishu_tenants(tenant_id) ON DELETE CASCADE,
    token_type VARCHAR(50) NOT NULL,
    access_token_encrypted TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT feishu_tokens_type_check CHECK (token_type IN ('tenant_access_token', 'app_access_token')),
    CONSTRAINT feishu_tokens_expires_check CHECK (expires_at > created_at),
    UNIQUE (tenant_id, token_type)
);

-- 索引
CREATE INDEX idx_feishu_tokens_tenant_id ON feishu_tokens(tenant_id);
CREATE INDEX idx_feishu_tokens_expires_at ON feishu_tokens(expires_at);
CREATE INDEX idx_feishu_tokens_type ON feishu_tokens(token_type);
CREATE INDEX idx_feishu_tokens_active ON feishu_tokens(tenant_id, token_type) 
    WHERE expires_at > NOW();

-- 注释
COMMENT ON TABLE feishu_tokens IS '飞书访问令牌表：存储飞书 API 访问令牌（自动刷新）';
COMMENT ON COLUMN feishu_tokens.token_id IS '令牌唯一标识符';
COMMENT ON COLUMN feishu_tokens.tenant_id IS '关联的租户 ID';
COMMENT ON COLUMN feishu_tokens.token_type IS '令牌类型：tenant_access_token（租户级）或 app_access_token（应用级）';
COMMENT ON COLUMN feishu_tokens.access_token_encrypted IS '加密后的访问令牌';
COMMENT ON COLUMN feishu_tokens.expires_at IS '令牌过期时间（通常 2 小时）';

-- ============================================
-- 13. feishu_sync_log 表（飞书同步日志）
-- ============================================
CREATE TABLE feishu_sync_log (
    log_id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES feishu_tenants(tenant_id) ON DELETE CASCADE,
    sync_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    feishu_entity_id VARCHAR(255),
    operation VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    error_message TEXT,
    request_payload JSONB,
    response_payload JSONB,
    sync_duration_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT feishu_sync_log_sync_type_check CHECK (sync_type IN ('push', 'pull', 'webhook')),
    CONSTRAINT feishu_sync_log_entity_type_check CHECK (entity_type IN ('message', 'task', 'user', 'channel')),
    CONSTRAINT feishu_sync_log_operation_check CHECK (operation IN ('create', 'update', 'delete', 'read')),
    CONSTRAINT feishu_sync_log_status_check CHECK (status IN ('pending', 'success', 'failed', 'retrying'))
);

-- 索引
CREATE INDEX idx_feishu_sync_log_tenant_id ON feishu_sync_log(tenant_id);
CREATE INDEX idx_feishu_sync_log_entity ON feishu_sync_log(entity_type, entity_id);
CREATE INDEX idx_feishu_sync_log_feishu_entity ON feishu_sync_log(feishu_entity_id);
CREATE INDEX idx_feishu_sync_log_status ON feishu_sync_log(status) WHERE status IN ('pending', 'retrying');
CREATE INDEX idx_feishu_sync_log_created_at ON feishu_sync_log(created_at DESC);
CREATE INDEX idx_feishu_sync_log_sync_type ON feishu_sync_log(sync_type);

-- 分区表（按月分区，提升查询性能）
-- 注意：需要 PostgreSQL 10+ 支持声明式分区
-- CREATE TABLE feishu_sync_log_2026_05 PARTITION OF feishu_sync_log
--     FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

-- 注释
COMMENT ON TABLE feishu_sync_log IS '飞书同步日志表：记录所有与飞书的数据同步操作（用于审计和故障排查）';
COMMENT ON COLUMN feishu_sync_log.log_id IS '日志唯一标识符（自增）';
COMMENT ON COLUMN feishu_sync_log.tenant_id IS '关联的租户 ID';
COMMENT ON COLUMN feishu_sync_log.sync_type IS '同步类型：push（推送到飞书）、pull（从飞书拉取）、webhook（飞书事件回调）';
COMMENT ON COLUMN feishu_sync_log.entity_type IS '实体类型：message, task, user, channel';
COMMENT ON COLUMN feishu_sync_log.entity_id IS '系统内部实体 ID';
COMMENT ON COLUMN feishu_sync_log.feishu_entity_id IS '飞书侧实体 ID（如 message_id, open_chat_id）';
COMMENT ON COLUMN feishu_sync_log.operation IS '操作类型：create, update, delete, read';
COMMENT ON COLUMN feishu_sync_log.status IS '同步状态：pending, success, failed, retrying';
COMMENT ON COLUMN feishu_sync_log.error_message IS '错误信息（失败时记录）';
COMMENT ON COLUMN feishu_sync_log.request_payload IS '请求数据（JSONB）';
COMMENT ON COLUMN feishu_sync_log.response_payload IS '响应数据（JSONB）';
COMMENT ON COLUMN feishu_sync_log.sync_duration_ms IS '同步耗时（毫秒）';

-- ============================================
-- 14. feishu_user_mappings 表（飞书用户映射）
-- ============================================
CREATE TABLE feishu_user_mappings (
    mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES feishu_tenants(tenant_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    feishu_open_id VARCHAR(255) NOT NULL,
    feishu_union_id VARCHAR(255),
    feishu_user_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE (tenant_id, feishu_open_id),
    UNIQUE (tenant_id, user_id)
);

-- 索引
CREATE INDEX idx_feishu_user_mappings_tenant_id ON feishu_user_mappings(tenant_id);
CREATE INDEX idx_feishu_user_mappings_user_id ON feishu_user_mappings(user_id);
CREATE INDEX idx_feishu_user_mappings_open_id ON feishu_user_mappings(feishu_open_id);
CREATE INDEX idx_feishu_user_mappings_union_id ON feishu_user_mappings(feishu_union_id);

-- 注释
COMMENT ON TABLE feishu_user_mappings IS '飞书用户映射表：关联系统用户与飞书用户';
COMMENT ON COLUMN feishu_user_mappings.mapping_id IS '映射唯一标识符';
COMMENT ON COLUMN feishu_user_mappings.tenant_id IS '关联的租户 ID';
COMMENT ON COLUMN feishu_user_mappings.user_id IS '系统用户 ID';
COMMENT ON COLUMN feishu_user_mappings.feishu_open_id IS '飞书 Open ID（应用内唯一）';
COMMENT ON COLUMN feishu_user_mappings.feishu_union_id IS '飞书 Union ID（跨应用唯一）';
COMMENT ON COLUMN feishu_user_mappings.feishu_user_id IS '飞书 User ID（企业内唯一）';
```

---

#### 3.4.2 触发器设计（自动维护）

```sql
-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 应用到所有表
CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON channels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_okrs_updated_at BEFORE UPDATE ON okrs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_key_results_updated_at BEFORE UPDATE ON key_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feishu_tenants_updated_at BEFORE UPDATE ON feishu_tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feishu_tokens_updated_at BEFORE UPDATE ON feishu_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feishu_user_mappings_updated_at BEFORE UPDATE ON feishu_user_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 自动生成 msg_short_id
CREATE OR REPLACE FUNCTION generate_msg_short_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.msg_short_id = SUBSTRING(NEW.message_id::TEXT FROM 1 FOR 8);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_message_short_id BEFORE INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION generate_msg_short_id();

-- 自动递增 task_number（频道内）
CREATE OR REPLACE FUNCTION generate_task_number()
RETURNS TRIGGER AS $$
BEGIN
    SELECT COALESCE(MAX(task_number), 0) + 1 INTO NEW.task_number
    FROM tasks WHERE channel_id = NEW.channel_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_task_number_trigger BEFORE INSERT ON tasks
    FOR EACH ROW WHEN (NEW.task_number IS NULL)
    EXECUTE FUNCTION generate_task_number();
```

---

#### 3.4.3 双写一致性保证

**问题**：配置型 Entity（Agent、Project）需要同时写入数据库和文件系统，如何保证一致性？

**解决方案**：使用 **Write-Ahead Log (WAL) + 异步同步** 模式

```python
# backend/storage/storage_manager.py

class StorageManager:
    """存储管理器"""
    
    def __init__(self):
        self.postgres = PostgreSQLClient()
        self.file_system = FileSystemStorage()
        self.redis = RedisClient()
        self.wal_queue = RedisQueue("storage_wal")
    
    async def save_entity(self, entity: BaseEntity):
        """保存实体（双写：数据库 + 文件系统）"""
        
        # Step 1: 写入 PostgreSQL（主数据源，事务保证）
        async with self.postgres.transaction() as tx:
            await tx.save(entity)
            
            # Step 2: 写入 WAL 队列（持久化）
            await self.wal_queue.push({
                "operation": "sync_to_filesystem",
                "entity_type": entity.__class__.__name__,
                "entity_id": entity.id,
                "entity_data": entity.dict(),
                "timestamp": datetime.utcnow().isoformat()
            })
        
        # Step 3: 异步同步到文件系统（后台任务）
        # 由独立的 WAL Worker 处理，失败会自动重试
        
        # Step 4: 更新缓存
        await self.redis.set_cache(entity.id, entity.dict())
        
        return entity
    
    async def wal_worker(self):
        """WAL Worker：异步同步数据库到文件系统"""
        while True:
            try:
                # 从 WAL 队列取出任务
                task = await self.wal_queue.pop(timeout=5)
                if not task:
                    continue
                
                # 同步到文件系统
                entity_type = task["entity_type"]
                entity_data = task["entity_data"]
                
                if entity_type == "AgentEntity":
                    await self.file_system.write_agent_yaml(entity_data)
                elif entity_type == "ProjectEntity":
                    await self.file_system.write_project_yaml(entity_data)
                
                # 标记任务完成
                await self.wal_queue.ack(task["id"])
                
            except Exception as e:
                logger.error(f"WAL Worker error: {e}")
                # 失败的任务会自动重试（Redis Streams 的 XPENDING 机制）
                await asyncio.sleep(5)
```

**一致性保证**：
1. **数据库优先**：PostgreSQL 是主数据源，所有查询从数据库读取
2. **WAL 持久化**：写入 WAL 队列后立即返回，保证不丢失
3. **异步同步**：后台 Worker 异步同步到文件系统，失败自动重试
4. **最终一致性**：文件系统可能短暂延迟，但最终会与数据库一致

---

#### 3.4.4 查询优化策略

**常见查询模式**：

```sql
-- 查询 1：获取频道最近 50 条消息（Cursor-based 分页）
SELECT * FROM messages
WHERE channel_id = $1 AND created_at < $2 AND status != 'deleted'
ORDER BY created_at DESC
LIMIT 50;

-- 查询 2：获取频道内所有待办任务
SELECT * FROM tasks
WHERE channel_id = $1 AND status = 'todo'
ORDER BY priority, created_at;

-- 查询 3：获取 Agent 最近的执行记录
SELECT * FROM agent_executions
WHERE agent_id = $1
ORDER BY started_at DESC
LIMIT 20;

-- 查询 4：获取 OKR 的所有 KR 和进度
SELECT okrs.*, 
       json_agg(key_results.*) AS key_results
FROM okrs
LEFT JOIN key_results ON key_results.okr_id = okrs.id
WHERE okrs.project_id = $1
GROUP BY okrs.id;

-- 查询 5：搜索消息（全文搜索）
SELECT * FROM messages
WHERE channel_id = $1 
  AND to_tsvector('english', content) @@ to_tsquery('english', $2)
  AND status != 'deleted'
ORDER BY created_at DESC
LIMIT 50;
```

**分页策略**：使用 **Cursor-based 分页**（性能优于 Offset-based）

```python
# Cursor-based 分页示例
async def get_messages(
    channel_id: str,
    cursor: Optional[datetime] = None,
    limit: int = 50
) -> List[Message]:
    """获取频道消息（Cursor-based 分页）"""
    query = """
        SELECT * FROM messages
        WHERE channel_id = $1 AND status != 'deleted'
    """
    
    if cursor:
        query += " AND created_at < $2"
        params = [channel_id, cursor]
    else:
        params = [channel_id]
    
    query += " ORDER BY created_at DESC LIMIT $" + str(len(params) + 1)
    params.append(limit)
    
    return await db.fetch_all(query, *params)
```

---

#### 3.4.5 数据归档策略

**问题**：消息和执行日志会无限增长，影响查询性能

**解决方案**：分区表 + 自动归档

```sql
-- 按月分区消息表
CREATE TABLE messages_2026_05 PARTITION OF messages
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE TABLE messages_2026_06 PARTITION OF messages
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

-- 自动归档旧消息（定时任务，每天执行）
CREATE OR REPLACE FUNCTION archive_old_messages()
RETURNS void AS $$
BEGIN
    -- 将 90 天前的消息标记为已删除
    UPDATE messages
    SET deleted_at = NOW(), status = 'deleted'
    WHERE created_at < NOW() - INTERVAL '90 days'
      AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- 自动清理旧执行日志（定时任务，每周执行）
CREATE OR REPLACE FUNCTION cleanup_old_executions()
RETURNS void AS $$
BEGIN
    -- 删除 30 天前的执行记录
    DELETE FROM agent_executions
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
```

---

#### 3.4.6 消息存储策略详细设计（P1-2）

**设计目标**：
1. 支持高并发写入（预计每秒 100+ 条消息）
2. 快速查询历史消息（50ms 内返回 50 条消息）
3. 支持全文搜索和复杂过滤
4. 保证数据一致性和可靠性

**存储架构**：

```
┌─────────────────────────────────────────────────────────────┐
│                     Message Write Path                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  WebSocket API   │
                    │  (FastAPI)       │
                    └──────────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
    ┌──────────────────┐        ┌──────────────────┐
    │  PostgreSQL      │        │  Redis Cache     │
    │  (Primary Store) │        │  (Hot Data)      │
    └──────────────────┘        └──────────────────┘
                │                           │
                │                           │
                ▼                           ▼
    ┌──────────────────┐        ┌──────────────────┐
    │  WAL Queue       │        │  WebSocket       │
    │  (Async Sync)    │        │  Broadcast       │
    └──────────────────┘        └──────────────────┘
```

**写入流程**：

```python
# backend/services/message_service.py

class MessageService:
    """消息服务"""
    
    def __init__(self):
        self.db = PostgreSQLClient()
        self.cache = RedisClient()
        self.ws_manager = WebSocketManager()
        self.search_indexer = SearchIndexer()
    
    async def create_message(
        self,
        channel_id: str,
        sender_id: str,
        content: str,
        **kwargs
    ) -> Message:
        """创建消息（原子操作）"""
        
        # Step 1: 数据库事务写入（主数据源）
        async with self.db.transaction() as tx:
            # 1.1 插入消息记录
            message = await tx.execute("""
                INSERT INTO messages (
                    message_id, channel_id, sender_id, sender_type,
                    content, content_type, mentions, references, attachments
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            """, [
                uuid4(), channel_id, sender_id, kwargs.get('sender_type'),
                content, kwargs.get('content_type', 'text'),
                json.dumps(kwargs.get('mentions', [])),
                json.dumps(kwargs.get('references', [])),
                json.dumps(kwargs.get('attachments', []))
            ])
            
            # 1.2 更新频道最后消息时间
            await tx.execute("""
                UPDATE channels
                SET updated_at = NOW()
                WHERE channel_id = $1
            """, [channel_id])
            
            # 1.3 如果是任务消息，同步更新 tasks 表
            if kwargs.get('is_task'):
                await tx.execute("""
                    INSERT INTO tasks (
                        task_id, channel_id, message_id, title, status
                    ) VALUES ($1, $2, $3, $4, 'todo')
                """, [uuid4(), channel_id, message['id'], content[:500]])
        
        # Step 2: 更新 Redis 缓存（热数据，TTL=1小时）
        cache_key = f"channel:{channel_id}:messages"
        await self.cache.lpush(cache_key, json.dumps(message))
        await self.cache.ltrim(cache_key, 0, 99)  # 只保留最近 100 条
        await self.cache.expire(cache_key, 3600)
        
        # Step 3: 实时广播（WebSocket）
        await self.ws_manager.broadcast_to_channel(
            channel_id,
            {
                "type": "message.created",
                "data": message
            }
        )
        
        # Step 4: 异步索引（全文搜索）
        await self.search_indexer.index_message_async(message)
        
        return Message(**message)
    
    async def get_messages(
        self,
        channel_id: str,
        cursor: Optional[datetime] = None,
        limit: int = 50
    ) -> List[Message]:
        """获取频道消息（优先从缓存读取）"""
        
        # Step 1: 尝试从 Redis 缓存读取
        if not cursor:  # 只有首次加载才从缓存读取
            cache_key = f"channel:{channel_id}:messages"
            cached = await self.cache.lrange(cache_key, 0, limit - 1)
            if cached:
                return [Message(**json.loads(m)) for m in cached]
        
        # Step 2: 缓存未命中，从数据库读取
        query = """
            SELECT * FROM messages
            WHERE channel_id = $1 AND status != 'deleted'
        """
        params = [channel_id]
        
        if cursor:
            query += " AND created_at < $2"
            params.append(cursor)
        
        query += " ORDER BY created_at DESC LIMIT $" + str(len(params) + 1)
        params.append(limit)
        
        messages = await self.db.fetch_all(query, *params)
        
        # Step 3: 回填缓存（如果是首次加载）
        if not cursor and messages:
            cache_key = f"channel:{channel_id}:messages"
            await self.cache.delete(cache_key)
            for msg in reversed(messages):  # 反向插入保持顺序
                await self.cache.lpush(cache_key, json.dumps(msg))
            await self.cache.expire(cache_key, 3600)
        
        return [Message(**m) for m in messages]
```

**全文搜索实现**：

```python
# backend/services/search_service.py

class SearchService:
    """搜索服务（基于 PostgreSQL 全文搜索）"""
    
    async def search_messages(
        self,
        channel_id: str,
        query: str,
        limit: int = 50
    ) -> List[Message]:
        """搜索消息内容"""
        
        # 使用 PostgreSQL 全文搜索（支持中英文）
        sql = """
            SELECT 
                m.*,
                ts_rank(to_tsvector('english', m.content), query) AS rank
            FROM messages m,
                 to_tsquery('english', $2) query
            WHERE m.channel_id = $1
              AND m.status != 'deleted'
              AND to_tsvector('english', m.content) @@ query
            ORDER BY rank DESC, m.created_at DESC
            LIMIT $3
        """
        
        results = await self.db.fetch_all(sql, [channel_id, query, limit])
        return [Message(**r) for r in results]
    
    async def search_by_mentions(
        self,
        channel_id: str,
        user_id: str,
        limit: int = 50
    ) -> List[Message]:
        """搜索提及某人的消息（使用 GIN 索引）"""
        
        sql = """
            SELECT * FROM messages
            WHERE channel_id = $1
              AND status != 'deleted'
              AND mentions @> $2::jsonb
            ORDER BY created_at DESC
            LIMIT $3
        """
        
        results = await self.db.fetch_all(
            sql,
            [channel_id, json.dumps([{"id": user_id}]), limit]
        )
        return [Message(**r) for r in results]
```

**性能优化策略**：

1. **索引优化**：
   - 复合索引 `(channel_id, created_at DESC)` 覆盖 90% 查询
   - GIN 索引支持 JSONB 字段高效查询
   - 部分索引 `WHERE status != 'deleted'` 减少索引大小

2. **缓存策略**：
   - Redis 缓存最近 100 条消息（命中率 >80%）
   - TTL=1小时，自动过期
   - 写入时主动更新缓存

3. **分页优化**：
   - Cursor-based 分页避免深分页性能问题
   - 使用 `created_at` 作为游标（有索引支持）

4. **批量操作**：
   - 批量插入使用 `COPY` 命令（性能提升 10x）
   - 批量更新使用 `UPDATE ... FROM` 语法

**监控指标**：

```python
# backend/monitoring/metrics.py

class MessageMetrics:
    """消息存储性能指标"""
    
    # 写入性能
    message_write_latency = Histogram(
        'message_write_latency_seconds',
        'Message write latency',
        buckets=[0.01, 0.05, 0.1, 0.5, 1.0]
    )
    
    # 查询性能
    message_query_latency = Histogram(
        'message_query_latency_seconds',
        'Message query latency',
        buckets=[0.01, 0.05, 0.1, 0.5, 1.0]
    )
    
    # 缓存命中率
    cache_hit_rate = Gauge(
        'message_cache_hit_rate',
        'Message cache hit rate'
    )
    
    # 数据库连接池
    db_pool_size = Gauge(
        'db_pool_size',
        'Database connection pool size'
    )
```

---

#### 3.4.7 数据归档机制详细设计（P1-3）

**设计目标**：
1. 自动归档历史数据，保持主表性能
2. 归档数据仍可查询（冷数据查询）
3. 支持数据恢复和审计
4. 符合数据保留政策（GDPR 等）

**分区表设计**：

```sql
-- ============================================
-- 消息表分区（按月分区）
-- ============================================

-- 1. 将现有 messages 表转换为分区表
ALTER TABLE messages RENAME TO messages_old;

CREATE TABLE messages (
    id BIGSERIAL,
    message_id UUID NOT NULL,
    msg_short_id VARCHAR(8) NOT NULL,
    channel_id BIGINT NOT NULL,
    sender_id UUID NOT NULL,
    sender_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text',
    parent_message_id BIGINT,
    is_discussion_root BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'sent',
    mentions JSONB DEFAULT '[]',
    references JSONB DEFAULT '[]',
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    PRIMARY KEY (id, created_at)  -- 分区键必须包含在主键中
) PARTITION BY RANGE (created_at);

-- 2. 创建月度分区（自动化脚本每月创建）
CREATE TABLE messages_2026_05 PARTITION OF messages
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE TABLE messages_2026_06 PARTITION OF messages
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE TABLE messages_2026_07 PARTITION OF messages
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

-- 3. 为每个分区创建索引
CREATE INDEX idx_messages_2026_05_channel_created 
    ON messages_2026_05(channel_id, created_at DESC);
CREATE INDEX idx_messages_2026_05_sender 
    ON messages_2026_05(sender_id);

-- 4. 迁移旧数据
INSERT INTO messages SELECT * FROM messages_old;
DROP TABLE messages_old;

-- ============================================
-- 执行日志表分区（按月分区）
-- ============================================

ALTER TABLE agent_executions RENAME TO agent_executions_old;

CREATE TABLE agent_executions (
    id BIGSERIAL,
    execution_id UUID NOT NULL,
    agent_id BIGINT NOT NULL,
    task_id BIGINT,
    workflow_id UUID,
    status VARCHAR(50) NOT NULL,
    input_message_id BIGINT,
    output_message_id BIGINT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_seconds INT,
    token_usage JSONB,
    cost_usd NUMERIC(10, 4),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE agent_executions_2026_05 PARTITION OF agent_executions
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE TABLE agent_executions_2026_06 PARTITION OF agent_executions
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
```

**自动归档流程**：

```python
# backend/tasks/archival_tasks.py

class ArchivalService:
    """数据归档服务"""
    
    def __init__(self):
        self.db = PostgreSQLClient()
        self.s3 = S3Client()  # 归档到 S3（可选）
        self.retention_days = 90  # 保留 90 天
    
    async def archive_old_messages(self):
        """归档旧消息（每天凌晨 2 点执行）"""
        
        cutoff_date = datetime.utcnow() - timedelta(days=self.retention_days)
        
        # Step 1: 标记为已删除（软删除）
        result = await self.db.execute("""
            UPDATE messages
            SET deleted_at = NOW(), status = 'deleted'
            WHERE created_at < $1
              AND deleted_at IS NULL
              AND status != 'deleted'
            RETURNING id, message_id, channel_id, created_at
        """, [cutoff_date])
        
        archived_count = len(result)
        logger.info(f"Archived {archived_count} messages older than {cutoff_date}")
        
        # Step 2: 导出到 S3（可选，用于长期存储）
        if archived_count > 0:
            await self._export_to_s3(result, cutoff_date)
        
        # Step 3: 物理删除（30 天后）
        physical_delete_date = datetime.utcnow() - timedelta(days=self.retention_days + 30)
        await self.db.execute("""
            DELETE FROM messages
            WHERE deleted_at < $1
        """, [physical_delete_date])
        
        return archived_count
    
    async def _export_to_s3(self, messages: List[dict], cutoff_date: datetime):
        """导出归档数据到 S3"""
        
        # 按月分组
        month_key = cutoff_date.strftime('%Y-%m')
        file_name = f"messages_archive_{month_key}.jsonl"
        
        # 生成 JSONL 文件
        lines = [json.dumps(msg) + '\n' for msg in messages]
        content = ''.join(lines)
        
        # 上传到 S3
        await self.s3.upload(
            bucket='slock-archives',
            key=f'messages/{month_key}/{file_name}',
            content=content.encode('utf-8'),
            metadata={
                'archived_at': datetime.utcnow().isoformat(),
                'record_count': str(len(messages))
            }
        )
        
        logger.info(f"Exported {len(messages)} messages to S3: {file_name}")
    
    async def cleanup_old_executions(self):
        """清理旧执行日志（每周执行）"""
        
        cutoff_date = datetime.utcnow() - timedelta(days=30)
        
        result = await self.db.execute("""
            DELETE FROM agent_executions
            WHERE created_at < $1
            RETURNING execution_id
        """, [cutoff_date])
        
        deleted_count = len(result)
        logger.info(f"Deleted {deleted_count} execution records older than {cutoff_date}")
        
        return deleted_count
    
    async def create_next_month_partition(self):
        """创建下个月的分区（每月 1 号执行）"""
        
        next_month = datetime.utcnow() + timedelta(days=32)
        next_month = next_month.replace(day=1)
        month_after = next_month + timedelta(days=32)
        month_after = month_after.replace(day=1)
        
        partition_name = f"messages_{next_month.strftime('%Y_%m')}"
        
        # 创建分区
        await self.db.execute(f"""
            CREATE TABLE {partition_name} PARTITION OF messages
                FOR VALUES FROM ('{next_month.date()}') TO ('{month_after.date()}')
        """)
        
        # 创建索引
        await self.db.execute(f"""
            CREATE INDEX idx_{partition_name}_channel_created 
                ON {partition_name}(channel_id, created_at DESC);
            CREATE INDEX idx_{partition_name}_sender 
                ON {partition_name}(sender_id);
            CREATE INDEX idx_{partition_name}_mentions 
                ON {partition_name} USING GIN(mentions);
        """)
        
        logger.info(f"Created partition: {partition_name}")
```

**定时任务配置**：

```python
# backend/scheduler/jobs.py

from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()

# 每天凌晨 2 点归档旧消息
scheduler.add_job(
    archival_service.archive_old_messages,
    'cron',
    hour=2,
    minute=0,
    id='archive_messages'
)

# 每周日凌晨 3 点清理执行日志
scheduler.add_job(
    archival_service.cleanup_old_executions,
    'cron',
    day_of_week='sun',
    hour=3,
    minute=0,
    id='cleanup_executions'
)

# 每月 1 号凌晨 1 点创建下月分区
scheduler.add_job(
    archival_service.create_next_month_partition,
    'cron',
    day=1,
    hour=1,
    minute=0,
    id='create_partition'
)

scheduler.start()
```

**冷数据查询**：

```python
# backend/services/archive_query_service.py

class ArchiveQueryService:
    """归档数据查询服务"""
    
    async def query_archived_messages(
        self,
        channel_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> List[Message]:
        """查询归档消息（包括已删除的）"""
        
        # Step 1: 查询数据库（软删除的数据）
        db_results = await self.db.fetch_all("""
            SELECT * FROM messages
            WHERE channel_id = $1
              AND created_at BETWEEN $2 AND $3
            ORDER BY created_at DESC
        """, [channel_id, start_date, end_date])
        
        # Step 2: 查询 S3（已物理删除的数据）
        s3_results = await self._query_s3_archives(
            channel_id, start_date, end_date
        )
        
        # Step 3: 合并结果
        all_results = db_results + s3_results
        all_results.sort(key=lambda x: x['created_at'], reverse=True)
        
        return [Message(**m) for m in all_results]
    
    async def _query_s3_archives(
        self,
        channel_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> List[dict]:
        """从 S3 查询归档数据"""
        
        results = []
        
        # 遍历时间范围内的所有月份
        current = start_date.replace(day=1)
        while current <= end_date:
            month_key = current.strftime('%Y-%m')
            file_key = f'messages/{month_key}/messages_archive_{month_key}.jsonl'
            
            try:
                # 下载 JSONL 文件
                content = await self.s3.download('slock-archives', file_key)
                
                # 解析并过滤
                for line in content.decode('utf-8').split('\n'):
                    if not line:
                        continue
                    msg = json.loads(line)
                    if msg['channel_id'] == channel_id:
                        msg_date = datetime.fromisoformat(msg['created_at'])
                        if start_date <= msg_date <= end_date:
                            results.append(msg)
            
            except Exception as e:
                logger.warning(f"Failed to query S3 archive {file_key}: {e}")
            
            # 下个月
            current = (current + timedelta(days=32)).replace(day=1)
        
        return results
```

**数据保留策略**：

| 数据类型 | 热数据（主表） | 温数据（软删除） | 冷数据（S3） | 物理删除 |
|---------|--------------|----------------|------------|---------|
| 消息 | 90 天 | 90-120 天 | 120 天+ | 永不删除（审计） |
| 执行日志 | 30 天 | - | - | 30 天后 |
| 任务记录 | 永久 | - | - | 手动删除 |
| Agent 配置 | 永久 | - | - | 手动删除 |

**监控告警**：

```python
# backend/monitoring/archival_metrics.py

class ArchivalMetrics:
    """归档监控指标"""
    
    # 归档任务执行时间
    archival_duration = Histogram(
        'archival_duration_seconds',
        'Archival task duration'
    )
    
    # 归档数据量
    archived_records = Counter(
        'archived_records_total',
        'Total archived records',
        ['table']
    )
    
    # 分区数量
    partition_count = Gauge(
        'partition_count',
        'Number of partitions',
        ['table']
    )
    
    # S3 导出失败次数
    s3_export_failures = Counter(
        's3_export_failures_total',
        'S3 export failures'
    )
```

### 3.7 API Gateway 设计

#### 3.7.1 技术选型

**推荐方案：Kong Gateway**

```yaml
# Kong 核心特性
features:
  - 高性能路由（OpenResty/Nginx）
  - 丰富的插件生态
  - 声明式配置
  - 多协议支持（HTTP/WebSocket/gRPC）
  - 云原生架构

# 替代方案
alternatives:
  - APISIX（国产、性能更高、但生态较小）
  - Traefik（容器友好、配置简单、但功能较少）
```

#### 3.7.2 路由规则

**版本路由**

```yaml
# Kong 路由配置
routes:
  - name: api-v1
    paths:
      - /api/v1
    service: backend-v1
    strip_path: true
    
  - name: api-v2
    paths:
      - /api/v2
    service: backend-v2
    strip_path: true
    
  - name: api-latest
    paths:
      - /api
    service: backend-v2  # 默认路由到最新版本
    strip_path: false
```

**服务路由**

```yaml
# 按服务类型路由
routes:
  - name: agent-service
    paths:
      - /api/v1/agents
      - /api/v1/agent-runtimes
    service: agent-service
    methods: [GET, POST, PUT, DELETE]
    
  - name: message-service
    paths:
      - /api/v1/messages
      - /api/v1/channels/*/messages
    service: message-service
    methods: [GET, POST, PUT, DELETE]
    
  - name: task-service
    paths:
      - /api/v1/tasks
    service: task-service
    methods: [GET, POST, PUT, PATCH]
```

**WebSocket 路由**

```yaml
# WebSocket 专用路由
routes:
  - name: websocket-events
    paths:
      - /ws/events
    service: websocket-service
    protocols: [http, https, ws, wss]
    strip_path: false
    
plugins:
  - name: websocket-size-limit
    config:
      max_payload_size: 1048576  # 1MB
```

#### 3.7.3 限流熔断

**令牌桶限流**

```yaml
# Kong Rate Limiting 插件
plugins:
  - name: rate-limiting
    config:
      minute: 100        # 每分钟100次
      hour: 5000         # 每小时5000次
      policy: redis      # 使用Redis存储计数器
      fault_tolerant: true
      redis_host: redis.default.svc.cluster.local
      redis_port: 6379
      redis_database: 1
```

**熔断器**

```yaml
# Kong Circuit Breaker 插件（自定义）
plugins:
  - name: circuit-breaker
    config:
      failure_threshold: 5      # 5次失败触发熔断
      success_threshold: 2      # 2次成功恢复
      timeout: 30               # 30秒超时
      half_open_requests: 3     # 半开状态允许3个请求
      window_size: 60           # 60秒滑动窗口
```

**降级策略**

```python
# backend/gateway/fallback.py

class FallbackHandler:
    """降级处理器"""
    
    @staticmethod
    async def agent_list_fallback():
        """Agent列表降级响应"""
        return {
            "data": [],
            "meta": {
                "fallback": True,
                "message": "服务暂时不可用，请稍后重试"
            }
        }
    
    @staticmethod
    async def message_send_fallback():
        """消息发送降级响应"""
        return {
            "error": "MESSAGE_SERVICE_UNAVAILABLE",
            "message": "消息服务暂时不可用，消息已缓存",
            "retry_after": 60
        }
```

#### 3.7.4 认证授权集成

**JWT 验证插件**

```yaml
# Kong JWT 插件
plugins:
  - name: jwt
    config:
      uri_param_names: [jwt]
      cookie_names: [auth_token]
      claims_to_verify: [exp, nbf]
      key_claim_name: kid
      secret_is_base64: false
      maximum_expiration: 86400  # 24小时
```

**权限检查插件**

```python
# Kong 自定义插件：kong/plugins/rbac-check/handler.py

class RBACCheckHandler:
    """RBAC权限检查插件"""
    
    def access(self, conf):
        # 1. 从JWT提取用户信息
        user_id = kong.request.get_header("X-User-ID")
        user_roles = kong.request.get_header("X-User-Roles").split(",")
        
        # 2. 获取请求路径和方法
        path = kong.request.get_path()
        method = kong.request.get_method()
        
        # 3. 查询权限规则
        required_permission = self.get_required_permission(path, method)
        
        # 4. 检查用户是否有权限
        if not self.check_permission(user_roles, required_permission):
            return kong.response.exit(403, {
                "error": "PERMISSION_DENIED",
                "message": f"需要权限: {required_permission}"
            })
    
    def get_required_permission(self, path, method):
        """获取路径所需权限"""
        rules = {
            r"/api/v1/agents": {
                "GET": "agent:read",
                "POST": "agent:create",
                "PUT": "agent:update",
                "DELETE": "agent:delete"
            },
            r"/api/v1/servers/\d+": {
                "DELETE": "server:delete"  # 高危操作
            }
        }
        # 匹配规则并返回所需权限
        ...
```

**API Key 管理**

```yaml
# Kong Key Auth 插件（用于Agent API调用）
plugins:
  - name: key-auth
    config:
      key_names: [apikey, x-api-key]
      key_in_body: false
      key_in_header: true
      key_in_query: false
      hide_credentials: true
```

#### 3.7.5 监控和日志

**请求追踪**

```yaml
# Kong Zipkin 插件
plugins:
  - name: zipkin
    config:
      http_endpoint: http://zipkin:9411/api/v2/spans
      sample_ratio: 0.1  # 10%采样率
      include_credential: false
      traceid_byte_count: 16
      spanid_byte_count: 8
```

**性能监控**

```yaml
# Kong Prometheus 插件
plugins:
  - name: prometheus
    config:
      per_consumer: true
      status_code_metrics: true
      latency_metrics: true
      bandwidth_metrics: true
      upstream_health_metrics: true
```

**审计日志**

```python
# Kong 自定义插件：kong/plugins/audit-log/handler.py

class AuditLogHandler:
    """审计日志插件"""
    
    def log(self, conf):
        # 记录高危操作
        if self.is_sensitive_operation():
            audit_entry = {
                "timestamp": time.time(),
                "user_id": kong.request.get_header("X-User-ID"),
                "ip": kong.client.get_forwarded_ip(),
                "method": kong.request.get_method(),
                "path": kong.request.get_path(),
                "status": kong.response.get_status(),
                "latency": kong.service.response.get_latency()
            }
            
            # 发送到审计日志服务
            self.send_to_audit_service(audit_entry)
    
    def is_sensitive_operation(self):
        """判断是否为敏感操作"""
        sensitive_patterns = [
            r"/api/v1/servers/\d+",  # 删除Server
            r"/api/v1/agents/\d+",   # 删除Agent
            r"/api/v1/users/\d+/roles"  # 修改用户角色
        ]
        path = kong.request.get_path()
        method = kong.request.get_method()
        
        return method in ["DELETE", "PUT"] and any(
            re.match(pattern, path) for pattern in sensitive_patterns
        )
```

---

### 3.8 数据迁移策略

#### 3.8.1 迁移工具选型

**Alembic（推荐）**

```python
# alembic.ini
[alembic]
script_location = migrations
sqlalchemy.url = postgresql://user:pass@localhost/openadventure

# 版本控制
version_locations = migrations/versions

# 自动生成迁移脚本
# alembic revision --autogenerate -m "add agent_executions table"
```

**迁移脚本结构**

```
migrations/
├── versions/
│   ├── 001_initial_schema.py
│   ├── 002_add_agent_executions.py
│   ├── 003_add_message_partitions.py
│   └── 004_add_runtime_fields.py
├── env.py
└── script.py.mako
```

#### 3.8.2 零停机迁移方案

**蓝绿部署**

```yaml
# Kubernetes 蓝绿部署配置
apiVersion: v1
kind: Service
metadata:
  name: backend-service
spec:
  selector:
    app: backend
    version: blue  # 切换到green实现零停机
  ports:
    - port: 8000
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-blue
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
      version: blue
  template:
    metadata:
      labels:
        app: backend
        version: blue
    spec:
      containers:
        - name: backend
          image: backend:v1.0.0
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-green
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
      version: green
  template:
    metadata:
      labels:
        app: backend
        version: green
    spec:
      containers:
        - name: backend
          image: backend:v2.0.0
```

**双写策略**

```python
# backend/migration/dual_write.py

class DualWriteManager:
    """双写管理器（用于数据迁移期间）"""
    
    def __init__(self, old_db, new_db):
        self.old_db = old_db
        self.new_db = new_db
        self.enabled = True
    
    async def write_message(self, message_data):
        """同时写入旧库和新库"""
        try:
            # 1. 写入新库（主）
            new_result = await self.new_db.messages.insert(message_data)
            
            # 2. 写入旧库（备）
            if self.enabled:
                try:
                    await self.old_db.messages.insert(message_data)
                except Exception as e:
                    # 旧库写入失败不影响新库
                    logger.warning(f"Old DB write failed: {e}")
            
            return new_result
            
        except Exception as e:
            # 新库写入失败，回滚到旧库
            logger.error(f"New DB write failed: {e}")
            return await self.old_db.messages.insert(message_data)
```

**灰度切流**

```python
# backend/migration/traffic_switch.py

class TrafficSwitcher:
    """流量切换器"""
    
    def __init__(self, redis_client):
        self.redis = redis_client
        self.key = "migration:traffic_ratio"
    
    async def get_traffic_ratio(self):
        """获取新库流量比例（0-100）"""
        ratio = await self.redis.get(self.key)
        return int(ratio) if ratio else 0
    
    async def set_traffic_ratio(self, ratio: int):
        """设置新库流量比例"""
        if not 0 <= ratio <= 100:
            raise ValueError("Ratio must be between 0 and 100")
        await self.redis.set(self.key, ratio)
    
    async def should_use_new_db(self):
        """判断是否使用新库"""
        ratio = await self.get_traffic_ratio()
        return random.randint(1, 100) <= ratio

# 使用示例
async def read_message(message_id):
    switcher = TrafficSwitcher(redis_client)
    
    if await switcher.should_use_new_db():
        return await new_db.messages.get(message_id)
    else:
        return await old_db.messages.get(message_id)
```

**迁移流程**

```
Phase 1: 准备阶段（1-2天）
├── 1. 部署新版本代码（包含双写逻辑）
├── 2. 运行数据库迁移脚本（Alembic upgrade head）
├── 3. 验证新表结构
└── 4. 启用双写（traffic_ratio=0，只写不读）

Phase 2: 数据同步阶段（3-7天）
├── 1. 运行历史数据迁移脚本
├── 2. 验证数据一致性（每天）
├── 3. 修复数据差异
└── 4. 等待数据完全同步

Phase 3: 灰度切流阶段（7-14天）
├── 1. 设置 traffic_ratio=10（10%流量到新库）
├── 2. 监控错误率和性能
├── 3. 逐步提升：10% → 25% → 50% → 75% → 100%
└── 4. 每次提升后观察24小时

Phase 4: 完全切换阶段（1天）
├── 1. 设置 traffic_ratio=100
├── 2. 观察24小时
├── 3. 关闭双写
└── 4. 下线旧库（保留备份30天）
```

#### 3.8.3 数据一致性验证

**校验工具**

```python
# scripts/verify_migration.py

class MigrationVerifier:
    """数据迁移校验工具"""
    
    def __init__(self, old_db, new_db):
        self.old_db = old_db
        self.new_db = new_db
    
    async def verify_table(self, table_name, sample_size=1000):
        """校验单表数据一致性"""
        print(f"Verifying {table_name}...")
        
        # 1. 比较总行数
        old_count = await self.old_db.execute(
            f"SELECT COUNT(*) FROM {table_name}"
        )
        new_count = await self.new_db.execute(
            f"SELECT COUNT(*) FROM {table_name}"
        )
        
        if old_count != new_count:
            print(f"❌ Row count mismatch: {old_count} vs {new_count}")
            return False
        
        # 2. 随机抽样比对
        sample_ids = await self.old_db.execute(
            f"SELECT id FROM {table_name} ORDER BY RANDOM() LIMIT {sample_size}"
        )
        
        mismatches = []
        for row_id in sample_ids:
            old_row = await self.old_db.fetch_one(
                f"SELECT * FROM {table_name} WHERE id = $1", row_id
            )
            new_row = await self.new_db.fetch_one(
                f"SELECT * FROM {table_name} WHERE id = $1", row_id
            )
            
            if old_row != new_row:
                mismatches.append(row_id)
        
        if mismatches:
            print(f"❌ Found {len(mismatches)} mismatches")
            return False
        
        print(f"✅ {table_name} verified successfully")
        return True
    
    async def verify_all(self):
        """校验所有表"""
        tables = [
            "servers", "channels", "messages", "tasks",
            "agents", "agent_executions", "projects", "okrs"
        ]
        
        results = {}
        for table in tables:
            results[table] = await self.verify_table(table)
        
        return all(results.values())

# 运行校验
# python scripts/verify_migration.py
```

**回滚机制**

```python
# scripts/rollback_migration.py

class MigrationRollback:
    """迁移回滚工具"""
    
    async def rollback(self, target_version):
        """回滚到指定版本"""
        print(f"Rolling back to version {target_version}...")
        
        # 1. 停止双写
        await self.disable_dual_write()
        
        # 2. 切换流量到旧库
        await self.set_traffic_ratio(0)
        
        # 3. 运行 Alembic 回滚
        subprocess.run([
            "alembic", "downgrade", target_version
        ], check=True)
        
        # 4. 验证回滚结果
        if await self.verify_rollback():
            print("✅ Rollback successful")
        else:
            print("❌ Rollback failed, manual intervention required")
    
    async def verify_rollback(self):
        """验证回滚是否成功"""
        # 检查表结构是否恢复
        # 检查数据是否完整
        ...
```

#### 3.8.4 迁移脚本规范

**命名规范**

```
格式：{version}_{description}.py
示例：
  - 001_initial_schema.py
  - 002_add_agent_executions.py
  - 003_add_message_partitions.py
  - 004_add_runtime_fields.py
```

**脚本模板**

```python
# migrations/versions/002_add_agent_executions.py

"""Add agent_executions table

Revision ID: 002
Revises: 001
Create Date: 2026-05-15 10:00:00
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None

def upgrade():
    """升级操作"""
    # 1. 创建表
    op.create_table(
        'agent_executions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('agent_id', sa.UUID(), nullable=False),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['agent_id'], ['agents.id'])
    )
    
    # 2. 创建索引
    op.create_index(
        'idx_agent_executions_agent_id',
        'agent_executions',
        ['agent_id']
    )
    
    # 3. 数据迁移（如果需要）
    # op.execute("INSERT INTO agent_executions ...")

def downgrade():
    """降级操作"""
    # 1. 删除索引
    op.drop_index('idx_agent_executions_agent_id')
    
    # 2. 删除表
    op.drop_table('agent_executions')
```

**依赖管理**

```python
# migrations/versions/004_add_runtime_fields.py

"""Add Runtime integration fields

Revision ID: 004
Revises: 003
Create Date: 2026-05-16 10:00:00
Depends on: 002  # 依赖 agent_executions 表
"""

# 明确声明依赖关系
depends_on = '002'

def upgrade():
    # 添加 Runtime 相关字段到 agents 表
    op.add_column('agents', sa.Column('runtime_enabled', sa.Boolean(), default=False))
    op.add_column('agents', sa.Column('gateway_url', sa.String(255), nullable=True))
```

**测试要求**

```python
# tests/migrations/test_002_add_agent_executions.py

import pytest
from alembic import command
from alembic.config import Config

def test_upgrade_002():
    """测试升级脚本"""
    config = Config("alembic.ini")
    
    # 1. 升级到 002
    command.upgrade(config, "002")
    
    # 2. 验证表是否创建
    assert table_exists("agent_executions")
    
    # 3. 验证索引是否创建
    assert index_exists("idx_agent_executions_agent_id")

def test_downgrade_002():
    """测试降级脚本"""
    config = Config("alembic.ini")
    
    # 1. 降级到 001
    command.downgrade(config, "001")
    
    # 2. 验证表是否删除
    assert not table_exists("agent_executions")
```

---

#### 3.8.5 迁移脚本数据库依赖说明

本节说明 Runtime 迁移脚本如何与 Dual-Write Infrastructure 的三张核心表交互，以及各脚本的数据库依赖关系。

##### 依赖表概览

| 迁移脚本 | 依赖表 | 操作类型 | 说明 |
|----------|--------|----------|------|
| `migrate_agent.py` | `runtime_sync_log` | INSERT / UPDATE | 记录单个 Agent 迁移状态 |
| `migrate_agent.py` | `dual_write_queue` | INSERT | 触发异步同步到 Runtime |
| `bulk_migrate.py` | `runtime_sync_log` | SELECT / INSERT / UPDATE | 批量查询未迁移 Agent，更新迁移进度 |
| `bulk_migrate.py` | `dual_write_queue` | INSERT (batch) | 批量入队同步任务 |
| `bulk_migrate.py` | `dual_write_dead_letter` | SELECT | 检查失败记录，决定是否跳过 |

##### migrate_agent.py — 单 Agent 迁移

`migrate_agent.py` 负责将单个 Agent 从 Agent Runtime 迁移到 Native Runtime（或反向迁移）。迁移完成后通过 `runtime_sync_log` 追踪状态，并通过 `dual_write_queue` 触发后续同步。

```python
# scripts/migrate_agent.py
"""
单 Agent 迁移脚本

数据库依赖：
  - runtime_sync_log: 记录迁移状态（INSERT + ON CONFLICT UPDATE）
  - dual_write_queue:  触发异步同步任务（INSERT）
  - agents:            更新 runtime_type 路由字段（UPDATE）

前置条件：
  - dual_write_queue 表已存在（schema-ddl.sql 已执行）
  - runtime_sync_log 表已存在
  - Runtime Gateway 可达（export_agent_state 需要）
"""

import asyncio
from uuid import UUID
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


async def migrate_agent(agent_id: UUID, target: str, db, runtime_gateway, native_runtime):
    """
    将单个 Agent 迁移到目标 Runtime。

    Args:
        agent_id:        要迁移的 Agent UUID
        target:          目标 Runtime，'native' 或 'runtime'
        db:              PostgreSQL 异步连接
        runtime_gateway: Runtime Gateway 客户端
        native_runtime:  Native Runtime 客户端

    数据库写入顺序（事务保证原子性）：
        1. runtime_sync_log  → 标记迁移开始（pending）
        2. 执行状态导出/导入
        3. runtime_sync_log  → 更新为 success / failed
        4. dual_write_queue   → 入队后续同步任务
        5. agents             → 更新 runtime_type 路由
    """
    logger.info(f"Starting migration: agent={agent_id}, target={target}")

    # Step 1: 标记迁移开始，写入 runtime_sync_log
    await db.execute("""
        INSERT INTO runtime_sync_log (entity_type, entity_id, operation, sync_status, synced_at)
        VALUES ('agent', $1, 'migrate_start', 'pending', NOW())
        ON CONFLICT (entity_type, entity_id)
        DO UPDATE SET
            operation   = 'migrate_start',
            sync_status = 'pending',
            synced_at   = NOW()
    """, agent_id)

    try:
        # Step 2: 导出当前状态
        if target == "native":
            # 从 Runtime 导出
            state = await runtime_gateway.export_agent_state(agent_id)
            # 导入到 Native Runtime
            await native_runtime.import_agent_state(agent_id, state)
        else:
            # 从 Native Runtime 导出
            state = await native_runtime.export_agent_state(agent_id)
            # 导入到 Runtime
            await runtime_gateway.import_agent_state(agent_id, state)

        # Step 3: 迁移成功，更新 runtime_sync_log
        await db.execute("""
            INSERT INTO runtime_sync_log (
                entity_type, entity_id, operation, sync_status,
                runtime_response, synced_at
            ) VALUES ('agent', $1, 'migrated_to_' || $2, 'success', $3, NOW())
            ON CONFLICT (entity_type, entity_id)
            DO UPDATE SET
                operation         = 'migrated_to_' || $2,
                sync_status       = 'success',
                runtime_response = $3,
                error_message     = NULL,
                synced_at         = NOW()
        """, agent_id, target, {"migrated_at": datetime.utcnow().isoformat()})

        # Step 4: 写入 dual_write_queue，触发后续异步同步
        # （WAL Worker 会将路由变更同步到 Runtime）
        await db.execute("""
            INSERT INTO dual_write_queue (
                entity_type, entity_id, operation, payload, status
            ) VALUES (
                'agent', $1, 'update',
                jsonb_build_object('runtime_type', $2, 'migrated_at', NOW()::text),
                'pending'
            )
        """, agent_id, target)

        # Step 5: 更新 agents 表路由字段
        await db.execute("""
            UPDATE agents
            SET runtime_type = $1, updated_at = NOW()
            WHERE agent_id = $2
        """, target, agent_id)

        logger.info(f"Migration complete: agent={agent_id} → {target}")

    except Exception as e:
        # 迁移失败：更新 runtime_sync_log 记录错误
        await db.execute("""
            INSERT INTO runtime_sync_log (
                entity_type, entity_id, operation, sync_status, error_message, synced_at
            ) VALUES ('agent', $1, 'migrate_failed', 'failed', $2, NOW())
            ON CONFLICT (entity_type, entity_id)
            DO UPDATE SET
                sync_status   = 'failed',
                error_message = $2,
                synced_at     = NOW()
        """, agent_id, str(e))

        logger.error(f"Migration failed: agent={agent_id}, error={e}")
        raise
```

##### bulk_migrate.py — 批量 Agent 迁移

`bulk_migrate.py` 批量迁移多个 Agent，通过 `runtime_sync_log` 查询未迁移记录，跳过死信队列中的失败项，并将同步任务批量写入 `dual_write_queue`。

```python
# scripts/bulk_migrate.py
"""
批量 Agent 迁移脚本

数据库依赖：
  - runtime_sync_log:    SELECT 查询未迁移 Agent；INSERT/UPDATE 更新批量进度
  - dual_write_queue:     批量 INSERT 同步任务（每批次一次写入）
  - dual_write_dead_letter: SELECT 检查失败记录，跳过已进入死信队列的 Agent
  - agents:               SELECT 获取待迁移列表；UPDATE 更新 runtime_type

使用方式：
    python scripts/bulk_migrate.py --target native --batch-size 50 --dry-run
"""

import asyncio
import argparse
import logging
from uuid import UUID
from typing import List

logger = logging.getLogger(__name__)


class BulkMigrator:
    """批量 Agent 迁移器"""

    def __init__(self, db, runtime_gateway, native_runtime,
                 batch_size: int = 50, dry_run: bool = False):
        self.db = db
        self.runtime_gateway = runtime_gateway
        self.native_runtime = native_runtime
        self.batch_size = batch_size
        self.dry_run = dry_run
        self.stats = {"total": 0, "migrated": 0, "skipped": 0, "failed": 0}

    async def get_pending_agents(self, target: str) -> List[UUID]:
        """
        查询待迁移的 Agent 列表。

        逻辑：
          1. 从 agents 表获取 runtime_type != target 的 Agent
          2. 排除 runtime_sync_log 中已成功迁移的
          3. 排除 dual_write_dead_letter 中有未解决失败记录的（避免反复失败）
        """
        rows = await self.db.fetch_all("""
            SELECT a.agent_id
            FROM agents a
            -- 排除已成功迁移
            LEFT JOIN runtime_sync_log osl
                ON osl.entity_type = 'agent'
               AND osl.entity_id   = a.agent_id
               AND osl.sync_status = 'success'
               AND osl.operation   = 'migrated_to_' || $1
            -- 排除死信队列中有未解决记录的 Agent
            LEFT JOIN dual_write_dead_letter ddl
                ON ddl.entity_type        = 'agent'
               AND ddl.entity_id          = a.agent_id
               AND ddl.resolution_status  = 'pending'
            WHERE a.runtime_type != $1
              AND osl.entity_id  IS NULL   -- 未成功迁移
              AND ddl.entity_id  IS NULL   -- 无未解决死信记录
            ORDER BY a.created_at
            LIMIT $2
        """, target, self.batch_size * 10)  # 预取更多，分批处理

        return [row["agent_id"] for row in rows]

    async def migrate_batch(self, agent_ids: List[UUID], target: str):
        """
        批量迁移一组 Agent，并将同步任务批量写入 dual_write_queue。

        写入顺序：
          1. 逐个执行状态导出/导入
          2. 批量 INSERT runtime_sync_log（减少往返次数）
          3. 批量 INSERT dual_write_queue（一次事务）
          4. 批量 UPDATE agents.runtime_type
        """
        success_ids = []
        failed_ids = []

        for agent_id in agent_ids:
            try:
                if not self.dry_run:
                    if target == "native":
                        state = await self.runtime_gateway.export_agent_state(agent_id)
                        await self.native_runtime.import_agent_state(agent_id, state)
                    else:
                        state = await self.native_runtime.export_agent_state(agent_id)
                        await self.runtime_gateway.import_agent_state(agent_id, state)
                else:
                    logger.info(f"[DRY RUN] Would migrate agent {agent_id} → {target}")

                success_ids.append(agent_id)
                self.stats["migrated"] += 1

            except Exception as e:
                logger.error(f"Failed to migrate agent {agent_id}: {e}")
                failed_ids.append((agent_id, str(e)))
                self.stats["failed"] += 1

        if self.dry_run:
            return

        # 批量更新 runtime_sync_log（成功）
        if success_ids:
            for agent_id in success_ids:
                await self.db.execute("""
                    INSERT INTO runtime_sync_log (
                        entity_type, entity_id, operation, sync_status, synced_at
                    ) VALUES ('agent', $1, 'migrated_to_' || $2, 'success', NOW())
                    ON CONFLICT (entity_type, entity_id)
                    DO UPDATE SET
                        operation   = 'migrated_to_' || $2,
                        sync_status = 'success',
                        synced_at   = NOW()
                """, agent_id, target)

            # 批量写入 dual_write_queue（一次事务）
            await self.db.execute("""
                INSERT INTO dual_write_queue (entity_type, entity_id, operation, payload, status)
                SELECT
                    'agent',
                    unnest($1::uuid[]),
                    'update',
                    jsonb_build_object('runtime_type', $2),
                    'pending'
            """, success_ids, target)

            # 批量更新 agents.runtime_type
            await self.db.execute("""
                UPDATE agents
                SET runtime_type = $1, updated_at = NOW()
                WHERE agent_id = ANY($2::uuid[])
            """, target, success_ids)

        # 批量更新 runtime_sync_log（失败）
        for agent_id, error_msg in failed_ids:
            await self.db.execute("""
                INSERT INTO runtime_sync_log (
                    entity_type, entity_id, operation, sync_status, error_message, synced_at
                ) VALUES ('agent', $1, 'migrate_failed', 'failed', $2, NOW())
                ON CONFLICT (entity_type, entity_id)
                DO UPDATE SET
                    sync_status   = 'failed',
                    error_message = $2,
                    synced_at     = NOW()
            """, agent_id, error_msg)

    async def run(self, target: str):
        """执行批量迁移"""
        logger.info(f"Starting bulk migration → {target} (batch_size={self.batch_size})")

        pending = await self.get_pending_agents(target)
        self.stats["total"] = len(pending)
        logger.info(f"Found {len(pending)} agents to migrate")

        # 分批处理
        for i in range(0, len(pending), self.batch_size):
            batch = pending[i:i + self.batch_size]
            batch_num = i // self.batch_size + 1
            total_batches = (len(pending) + self.batch_size - 1) // self.batch_size

            logger.info(f"Processing batch {batch_num}/{total_batches} ({len(batch)} agents)")
            await self.migrate_batch(batch, target)

            # 进度报告
            logger.info(
                f"Progress: migrated={self.stats['migrated']}, "
                f"failed={self.stats['failed']}, "
                f"skipped={self.stats['skipped']}"
            )

        logger.info(f"Bulk migration complete: {self.stats}")
        return self.stats
```

##### 数据库依赖关系图

```
scripts/migrate_agent.py
    │
    ├── READ   agents                  (查询 Agent 信息)
    ├── WRITE  runtime_sync_log       (记录迁移状态: pending → success/failed)
    ├── WRITE  dual_write_queue        (触发后续 WAL 同步)
    └── WRITE  agents.runtime_type     (更新路由字段)

scripts/bulk_migrate.py
    │
    ├── READ   agents                  (获取待迁移列表)
    ├── READ   runtime_sync_log       (排除已成功迁移的 Agent)
    ├── READ   dual_write_dead_letter  (排除有未解决失败记录的 Agent)
    ├── WRITE  runtime_sync_log       (批量更新迁移状态)
    ├── WRITE  dual_write_queue        (批量入队同步任务)
    └── WRITE  agents.runtime_type     (批量更新路由字段)
```

##### 迁移状态追踪查询

运维人员可通过以下 SQL 查询迁移进度：

```sql
-- 查询各迁移状态的 Agent 数量
SELECT
    osl.sync_status,
    osl.operation,
    COUNT(*) AS agent_count,
    MAX(osl.synced_at) AS last_updated
FROM runtime_sync_log osl
WHERE osl.entity_type = 'agent'
GROUP BY osl.sync_status, osl.operation
ORDER BY last_updated DESC;

-- 查询迁移失败且进入死信队列的 Agent
SELECT
    ddl.entity_id AS agent_id,
    ddl.failure_reason,
    ddl.moved_at,
    ddl.resolution_status,
    jsonb_array_length(ddl.retry_history) AS retry_count
FROM dual_write_dead_letter ddl
WHERE ddl.entity_type = 'agent'
  AND ddl.resolution_status = 'pending'
ORDER BY ddl.moved_at DESC;

-- 查询 WAL 队列中待处理的迁移任务
SELECT
    status,
    COUNT(*) AS count,
    MIN(created_at) AS oldest_task
FROM dual_write_queue
WHERE entity_type = 'agent'
  AND status IN ('pending', 'processing', 'failed')
GROUP BY status;
```

---

### 3.9 WebSocket API 规范

WebSocket API 提供实时双向通信能力，用于推送 Agent 状态变化、消息通知、任务更新等实时事件。

#### 3.9.1 连接管理

**连接端点**

```
ws://localhost:8000/ws/events
wss://api.example.com/ws/events
```

**连接认证**

WebSocket 连接必须在建立时提供有效的 JWT token：

```typescript
// 方式 1: 通过查询参数
const ws = new WebSocket('ws://localhost:8000/ws/events?token=<jwt_token>');

// 方式 2: 通过 Sec-WebSocket-Protocol header
const ws = new WebSocket('ws://localhost:8000/ws/events', ['jwt', '<jwt_token>']);
```

**连接生命周期**

```python
# backend/app/websocket/connection_manager.py

from typing import Dict, Set
from fastapi import WebSocket
import asyncio
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    """WebSocket 连接管理器"""
    
    def __init__(self):
        # user_id -> Set[WebSocket]
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # websocket -> user_id
        self.connection_users: Dict[WebSocket, str] = {}
        # 心跳间隔（秒）
        self.heartbeat_interval = 30
        # 连接超时（秒）
        self.connection_timeout = 90
    
    async def connect(self, websocket: WebSocket, user_id: str):
        """建立连接"""
        await websocket.accept()
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        
        self.active_connections[user_id].add(websocket)
        self.connection_users[websocket] = user_id
        
        logger.info(f"User {user_id} connected. Total connections: {len(self.active_connections[user_id])}")
        
        # 发送连接成功消息
        await self.send_personal_message({
            "type": "connection_established",
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat()
        }, websocket)
        
        # 启动心跳
        asyncio.create_task(self._heartbeat_loop(websocket))
    
    def disconnect(self, websocket: WebSocket):
        """断开连接"""
        user_id = self.connection_users.get(websocket)
        if user_id:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
            del self.connection_users[websocket]
            logger.info(f"User {user_id} disconnected")
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """发送消息给特定连接"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Failed to send message: {e}")
            self.disconnect(websocket)
    
    async def broadcast_to_user(self, message: dict, user_id: str):
        """广播消息给用户的所有连接"""
        if user_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Failed to broadcast to user {user_id}: {e}")
                    disconnected.append(connection)
            
            # 清理断开的连接
            for conn in disconnected:
                self.disconnect(conn)
    
    async def broadcast_to_channel(self, message: dict, channel_id: str):
        """广播消息给频道的所有成员"""
        # 查询频道成员
        member_ids = await self._get_channel_members(channel_id)
        
        for user_id in member_ids:
            await self.broadcast_to_user(message, user_id)
    
    async def _heartbeat_loop(self, websocket: WebSocket):
        """心跳循环"""
        try:
            while True:
                await asyncio.sleep(self.heartbeat_interval)
                await websocket.send_json({"type": "ping"})
        except Exception:
            self.disconnect(websocket)
    
    async def _get_channel_members(self, channel_id: str) -> List[str]:
        """获取频道成员列表"""
        # 从数据库查询频道成员
        # 实现略
        pass

# 全局连接管理器实例
manager = ConnectionManager()
```

**FastAPI WebSocket 端点**

```python
# backend/app/api/websocket.py

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from app.websocket.connection_manager import manager
from app.core.auth import verify_websocket_token
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.websocket("/ws/events")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...)
):
    """WebSocket 事件流端点"""
    
    # 1. 验证 token
    try:
        user_id = await verify_websocket_token(token)
    except Exception as e:
        await websocket.close(code=4001, reason="Invalid token")
        return
    
    # 2. 建立连接
    await manager.connect(websocket, user_id)
    
    try:
        # 3. 接收客户端消息
        while True:
            data = await websocket.receive_json()
            await handle_client_message(data, user_id, websocket)
    
    except WebSocketDisconnect:
        logger.info(f"User {user_id} disconnected normally")
        manager.disconnect(websocket)
    
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
        manager.disconnect(websocket)

async def handle_client_message(data: dict, user_id: str, websocket: WebSocket):
    """处理客户端消息"""
    msg_type = data.get("type")
    
    if msg_type == "pong":
        # 心跳响应
        pass
    
    elif msg_type == "subscribe":
        # 订阅事件
        await handle_subscribe(data, user_id, websocket)
    
    elif msg_type == "unsubscribe":
        # 取消订阅
        await handle_unsubscribe(data, user_id, websocket)
    
    else:
        await manager.send_personal_message({
            "type": "error",
            "error": "UNKNOWN_MESSAGE_TYPE",
            "message": f"Unknown message type: {msg_type}"
        }, websocket)
```

---

#### 3.9.2 消息格式定义

**基础消息格式**

所有 WebSocket 消息遵循统一的 JSON 格式：

```typescript
// 客户端 → 服务端
interface ClientMessage {
  type: string;                    // 消息类型
  payload?: any;                   // 消息负载
  request_id?: string;             // 请求 ID（用于响应匹配）
}

// 服务端 → 客户端
interface ServerMessage {
  type: string;                    // 消息类型
  payload?: any;                   // 消息负载
  timestamp: string;               // ISO 8601 时间戳
  request_id?: string;             // 对应的请求 ID
}
```

**消息类型定义**

```typescript
// 1. 连接管理消息
interface ConnectionEstablished extends ServerMessage {
  type: "connection_established";
  payload: {
    user_id: string;
    session_id: string;
  };
}

interface Ping extends ServerMessage {
  type: "ping";
}

interface Pong extends ClientMessage {
  type: "pong";
}

// 2. 订阅管理消息
interface Subscribe extends ClientMessage {
  type: "subscribe";
  payload: {
    events: string[];              // 事件类型列表
    filters?: {
      channel_id?: string;
      agent_id?: string;
      task_id?: string;
    };
  };
}

interface Unsubscribe extends ClientMessage {
  type: "unsubscribe";
  payload: {
    events: string[];
  };
}

interface SubscriptionConfirmed extends ServerMessage {
  type: "subscription_confirmed";
  payload: {
    events: string[];
    subscription_id: string;
  };
}

// 3. 实时事件消息
interface AgentStatusChanged extends ServerMessage {
  type: "agent_status_changed";
  payload: {
    agent_id: string;
    old_status: "active" | "idle" | "sleeping" | "terminated";
    new_status: "active" | "idle" | "sleeping" | "terminated";
    reason?: string;
  };
}

interface NewMessage extends ServerMessage {
  type: "new_message";
  payload: {
    message_id: string;
    channel_id: string;
    sender_id: string;
    sender_type: "human" | "agent";
    content: string;
    created_at: string;
  };
}

interface TaskUpdated extends ServerMessage {
  type: "task_updated";
  payload: {
    task_id: string;
    task_number: number;
    channel_id: string;
    old_status: string;
    new_status: string;
    assignee_id?: string;
    updated_by: string;
  };
}

interface ExecutionStatusChanged extends ServerMessage {
  type: "execution_status_changed";
  payload: {
    execution_id: string;
    agent_id: string;
    workflow_id: string;
    old_status: string;
    new_status: string;
    progress?: number;
  };
}

// 4. 错误消息
interface ErrorMessage extends ServerMessage {
  type: "error";
  payload: {
    error_code: string;
    message: string;
    details?: any;
  };
}
```

**消息示例**

```json
// 客户端订阅消息
{
  "type": "subscribe",
  "payload": {
    "events": ["new_message", "task_updated"],
    "filters": {
      "channel_id": "channel-123"
    }
  },
  "request_id": "req-001"
}

// 服务端确认订阅
{
  "type": "subscription_confirmed",
  "payload": {
    "events": ["new_message", "task_updated"],
    "subscription_id": "sub-abc123"
  },
  "timestamp": "2026-05-05T00:30:00Z",
  "request_id": "req-001"
}

// 服务端推送新消息事件
{
  "type": "new_message",
  "payload": {
    "message_id": "msg-456",
    "channel_id": "channel-123",
    "sender_id": "user-789",
    "sender_type": "human",
    "content": "Hello everyone!",
    "created_at": "2026-05-05T00:30:15Z"
  },
  "timestamp": "2026-05-05T00:30:15Z"
}
```

---

#### 3.9.3 事件类型和订阅机制

**支持的事件类型**

| 事件类型 | 描述 | 触发时机 |
|---------|------|---------|
| `agent_status_changed` | Agent 状态变化 | Agent 启动、停止、休眠、恢复 |
| `new_message` | 新消息 | 频道收到新消息 |
| `message_updated` | 消息更新 | 消息被编辑或删除 |
| `task_created` | 任务创建 | 消息转换为任务 |
| `task_updated` | 任务更新 | 任务状态、认领者变化 |
| `task_claimed` | 任务认领 | 任务被认领 |
| `execution_status_changed` | 执行状态变化 | Workflow 执行状态更新 |
| `execution_log` | 执行日志 | Workflow 执行产生新日志 |
| `channel_member_joined` | 成员加入频道 | 用户或 Agent 加入频道 |
| `channel_member_left` | 成员离开频道 | 用户或 Agent 离开频道 |

**订阅管理实现**

```python
# backend/app/websocket/subscription_manager.py

from typing import Dict, Set, List
from dataclasses import dataclass
import uuid

@dataclass
class Subscription:
    """订阅信息"""
    subscription_id: str
    user_id: str
    events: Set[str]
    filters: dict

class SubscriptionManager:
    """订阅管理器"""
    
    def __init__(self):
        # subscription_id -> Subscription
        self.subscriptions: Dict[str, Subscription] = {}
        # user_id -> Set[subscription_id]
        self.user_subscriptions: Dict[str, Set[str]] = {}
        # event_type -> Set[subscription_id]
        self.event_subscriptions: Dict[str, Set[str]] = {}
    
    def subscribe(self, user_id: str, events: List[str], filters: dict = None) -> str:
        """创建订阅"""
        subscription_id = str(uuid.uuid4())
        
        subscription = Subscription(
            subscription_id=subscription_id,
            user_id=user_id,
            events=set(events),
            filters=filters or {}
        )
        
        self.subscriptions[subscription_id] = subscription
        
        # 索引：user_id -> subscriptions
        if user_id not in self.user_subscriptions:
            self.user_subscriptions[user_id] = set()
        self.user_subscriptions[user_id].add(subscription_id)
        
        # 索引：event_type -> subscriptions
        for event in events:
            if event not in self.event_subscriptions:
                self.event_subscriptions[event] = set()
            self.event_subscriptions[event].add(subscription_id)
        
        return subscription_id
    
    def unsubscribe(self, subscription_id: str):
        """取消订阅"""
        if subscription_id not in self.subscriptions:
            return
        
        subscription = self.subscriptions[subscription_id]
        
        # 清理索引
        self.user_subscriptions[subscription.user_id].discard(subscription_id)
        for event in subscription.events:
            self.event_subscriptions[event].discard(subscription_id)
        
        del self.subscriptions[subscription_id]
    
    def get_subscribers(self, event_type: str, event_data: dict) -> Set[str]:
        """获取事件的订阅者（user_id 列表）"""
        if event_type not in self.event_subscriptions:
            return set()
        
        subscribers = set()
        
        for sub_id in self.event_subscriptions[event_type]:
            subscription = self.subscriptions[sub_id]
            
            # 检查过滤条件
            if self._matches_filters(subscription.filters, event_data):
                subscribers.add(subscription.user_id)
        
        return subscribers
    
    def _matches_filters(self, filters: dict, event_data: dict) -> bool:
        """检查事件数据是否匹配过滤条件"""
        if not filters:
            return True
        
        for key, value in filters.items():
            if key not in event_data or event_data[key] != value:
                return False
        
        return True

# 全局订阅管理器实例
subscription_manager = SubscriptionManager()
```

**事件发布实现**

```python
# backend/app/websocket/event_publisher.py

from app.websocket.connection_manager import manager
from app.websocket.subscription_manager import subscription_manager
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class EventPublisher:
    """事件发布器"""
    
    async def publish(self, event_type: str, payload: dict):
        """发布事件给所有订阅者"""
        
        # 1. 获取订阅者列表
        subscribers = subscription_manager.get_subscribers(event_type, payload)
        
        if not subscribers:
            logger.debug(f"No subscribers for event {event_type}")
            return
        
        # 2. 构造消息
        message = {
            "type": event_type,
            "payload": payload,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # 3. 广播给所有订阅者
        for user_id in subscribers:
            await manager.broadcast_to_user(message, user_id)
        
        logger.info(f"Published {event_type} to {len(subscribers)} subscribers")

# 全局事件发布器实例
event_publisher = EventPublisher()
```

**使用示例**

```python
# backend/app/services/message_service.py

from app.websocket.event_publisher import event_publisher

class MessageService:
    async def create_message(self, channel_id: str, content: str, sender_id: str):
        """创建消息"""
        
        # 1. 保存消息到数据库
        message = await self.repository.create({
            "channel_id": channel_id,
            "content": content,
            "sender_id": sender_id
        })
        
        # 2. 发布 WebSocket 事件
        await event_publisher.publish("new_message", {
            "message_id": message.message_id,
            "channel_id": channel_id,
            "sender_id": sender_id,
            "sender_type": "human",
            "content": content,
            "created_at": message.created_at.isoformat()
        })
        
        return message
```

---

#### 3.9.4 错误处理和重连策略

**错误码定义**

| 错误码 | HTTP 状态码 | 描述 | 处理建议 |
|-------|------------|------|---------|
| `4001` | 401 | 认证失败 | 刷新 token 后重连 |
| `4003` | 403 | 权限不足 | 检查用户权限 |
| `4008` | 408 | 连接超时 | 立即重连 |
| `4029` | 429 | 请求过于频繁 | 等待后重连 |
| `5000` | 500 | 服务器内部错误 | 指数退避重连 |
| `5003` | 503 | 服务不可用 | 指数退避重连 |

**客户端重连策略**

```typescript
// frontend/src/services/websocket.ts

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectInterval = 1000; // 初始重连间隔 1 秒
  private maxReconnectInterval = 30000; // 最大重连间隔 30 秒
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private heartbeatInterval = 30000; // 30 秒心跳
  private connectionTimeout = 90000; // 90 秒连接超时
  private eventHandlers: Map<string, Set<Function>> = new Map();
  
  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
  }
  
  connect() {
    try {
      this.ws = new WebSocket(`${this.url}?token=${this.token}`);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.reconnectInterval = 1000;
        this.startHeartbeat();
        this.emit('connected', {});
      };
      
      this.ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      };
      
      this.ws.onclose = (event) => {
        console.log('WebSocket closed', event.code, event.reason);
        this.stopHeartbeat();
        this.emit('disconnected', { code: event.code, reason: event.reason });
        
        // 根据关闭码决定是否重连
        if (this.shouldReconnect(event.code)) {
          this.scheduleReconnect();
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error', error);
        this.emit('error', error);
      };
      
    } catch (error) {
      console.error('Failed to create WebSocket', error);
      this.scheduleReconnect();
    }
  }
  
  private shouldReconnect(code: number): boolean {
    // 4001 (认证失败) 和 4003 (权限不足) 不自动重连
    if (code === 4001 || code === 4003) {
      return false;
    }
    
    // 其他错误码尝试重连
    return this.reconnectAttempts < this.maxReconnectAttempts;
  }
  
  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      this.emit('reconnect_failed', {});
      return;
    }
    
    // 指数退避：每次重连间隔翻倍
    const delay = Math.min(
      this.reconnectInterval * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectInterval
    );
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
    
    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }
  
  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'pong' });
      }
    }, this.heartbeatInterval);
  }
  
  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
  
  private handleMessage(message: any) {
    const { type, payload } = message;
    
    if (type === 'ping') {
      // 响应心跳
      this.send({ type: 'pong' });
      return;
    }
    
    // 触发事件处理器
    this.emit(type, payload);
  }
  
  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent');
    }
  }
  
  subscribe(events: string[], filters?: any) {
    this.send({
      type: 'subscribe',
      payload: { events, filters }
    });
  }
  
  unsubscribe(events: string[]) {
    this.send({
      type: 'unsubscribe',
      payload: { events }
    });
  }
  
  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }
  
  off(event: string, handler: Function) {
    this.eventHandlers.get(event)?.delete(handler);
  }
  
  private emit(event: string, data: any) {
    this.eventHandlers.get(event)?.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }
  
  close() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
```

**使用示例**

```typescript
// frontend/src/hooks/useWebSocket.ts

import { useEffect, useState } from 'react';
import { WebSocketClient } from '../services/websocket';

export function useWebSocket(url: string, token: string) {
  const [client, setClient] = useState<WebSocketClient | null>(null);
  const [connected, setConnected] = useState(false);
  
  useEffect(() => {
    const ws = new WebSocketClient(url, token);
    
    ws.on('connected', () => setConnected(true));
    ws.on('disconnected', () => setConnected(false));
    
    ws.connect();
    setClient(ws);
    
    return () => {
      ws.close();
    };
  }, [url, token]);
  
  return { client, connected };
}

// 组件中使用
function ChatPage() {
  const { client, connected } = useWebSocket('ws://localhost:8000/ws/events', token);
  
  useEffect(() => {
    if (!client || !connected) return;
    
    // 订阅事件
    client.subscribe(['new_message', 'task_updated'], {
      channel_id: 'channel-123'
    });
    
    // 监听新消息
    const handleNewMessage = (payload: any) => {
      console.log('New message:', payload);
      // 更新 UI
    };
    
    client.on('new_message', handleNewMessage);
    
    return () => {
      client.off('new_message', handleNewMessage);
      client.unsubscribe(['new_message', 'task_updated']);
    };
  }, [client, connected]);
  
  return <div>Chat Page</div>;
}
```

---




---

## 五、飞书集成方案

### 5.1 集成架构

飞书集成通过 **Plugin + Trigger** 机制实现，核心组件：

1. **plugin-002 (feishu-integration)**: 飞书 API 封装插件
2. **trigger-003 (feishu-message-trigger)**: 飞书消息事件触发器
3. **Backend 适配层**: 飞书事件监听服务
4. **Frontend 组件**: 飞书消息渲染和交互

**数据流**:

```
飞书服务器 → Webhook → Backend EventListener → Trigger → Agent → Plugin → 飞书 API
```

---

### 5.2 Plugin 定义: plugin-002

**文件**: `~/.slock/agents/{agent-id}/plugins/plugin-002-feishu-integration.yaml`

```yaml
# plugin-002: 飞书集成插件
plugin_id: plugin-002
name: feishu-integration
version: 1.0.0
description: 飞书 API 集成插件，支持消息发送、接收、群组管理、文件上传等功能

# 插件类型
type: external_api

# 配置
config:
  # 飞书应用凭证
  app_id: ${FEISHU_APP_ID}
  app_secret: ${FEISHU_APP_SECRET}
  
  # API 端点
  api_base_url: https://open.feishu.cn/open-apis
  
  # Webhook 配置
  webhook:
    enabled: true
    url: https://your-domain.com/api/feishu/webhook
    verification_token: ${FEISHU_VERIFICATION_TOKEN}
    encrypt_key: ${FEISHU_ENCRYPT_KEY}
  
  # 功能开关
  features:
    message_send: true
    message_receive: true
    group_management: true
    file_upload: true
    card_message: true
    bot_mention: true

# 工具定义
tools:
  - name: send_feishu_message
    description: 发送飞书消息到指定用户或群组
    parameters:
      - name: receive_id
        type: string
        required: true
        description: 接收者 ID（用户 open_id 或群组 chat_id）
      - name: receive_id_type
        type: enum
        values: [open_id, user_id, union_id, email, chat_id]
        default: open_id
      - name: msg_type
        type: enum
        values: [text, post, image, file, audio, media, sticker, interactive, share_chat, share_user]
        default: text
      - name: content
        type: object
        required: true
        description: 消息内容（JSON 格式，根据 msg_type 不同而不同）
    returns:
      message_id: string
      send_time: string
  
  - name: reply_feishu_message
    description: 回复飞书消息
    parameters:
      - name: message_id
        type: string
        required: true
      - name: content
        type: object
        required: true
    returns:
      message_id: string
  
  - name: get_feishu_user_info
    description: 获取飞书用户信息
    parameters:
      - name: user_id
        type: string
        required: true
      - name: user_id_type
        type: enum
        values: [open_id, user_id, union_id]
        default: open_id
    returns:
      user: object
  
  - name: upload_feishu_file
    description: 上传文件到飞书
    parameters:
      - name: file_path
        type: string
        required: true
      - name: file_type
        type: enum
        values: [opus, mp4, pdf, doc, xls, ppt, stream]
        required: true
    returns:
      file_key: string
  
  - name: create_feishu_group
    description: 创建飞书群组
    parameters:
      - name: name
        type: string
        required: true
      - name: description
        type: string
      - name: user_ids
        type: array
        items: string
    returns:
      chat_id: string

# 权限要求
permissions:
  - im:message
  - im:message.group_at_msg
  - im:chat
  - im:chat:readonly
  - contact:user.base:readonly

# 依赖
dependencies:
  - requests>=2.28.0
  - pycryptodome>=3.15.0  # 用于消息加密解密

# 错误处理
error_handling:
  retry_count: 3
  retry_delay: 1000  # ms
  timeout: 30000  # ms

# 日志
logging:
  level: info
  log_file: logs/feishu-plugin.log

# 状态
status: active
created_at: 2026-05-01T10:00:00Z
updated_at: 2026-05-01T10:00:00Z
```

---

### 5.3 Trigger 定义: trigger-003

**文件**: `~/.slock/agents/{agent-id}/triggers/trigger-003-feishu-message.yaml`

```yaml
# trigger-003: 飞书消息触发器
trigger_id: trigger-003
name: feishu-message-trigger
version: 1.0.0
description: 监听飞书消息事件，触发 Agent 响应

# 触发器类型
type: webhook

# 事件源
source:
  type: feishu
  plugin_id: plugin-002
  
# 监听的事件类型
events:
  - im.message.receive_v1  # 接收消息
  - im.message.message_read_v1  # 消息已读
  - im.chat.member.bot.added_v1  # 机器人被添加到群组
  - im.chat.member.bot.deleted_v1  # 机器人被移出群组

# 过滤条件
filters:
  # 只处理 @机器人 的消息
  - field: message.mentions
    operator: contains
    value: ${BOT_OPEN_ID}
  
  # 忽略机器人自己发送的消息
  - field: sender.sender_type
    operator: not_equals
    value: app

# 触发动作
actions:
  - type: invoke_agent
    agent_id: ${AGENT_ID}
    
    # 传递给 Agent 的上下文
    context:
      event_type: "{{ event.type }}"
      message_id: "{{ event.message.message_id }}"
      chat_id: "{{ event.message.chat_id }}"
      sender_id: "{{ event.sender.sender_id.open_id }}"
      content: "{{ event.message.content }}"
      mentions: "{{ event.message.mentions }}"
      timestamp: "{{ event.message.create_time }}"
    
    # Agent 响应后的回调
    callback:
      - type: send_feishu_reply
        plugin_id: plugin-002
        tool: reply_feishu_message
        params:
          message_id: "{{ event.message.message_id }}"
          content: "{{ agent.response }}"

# 并发控制
concurrency:
  max_concurrent: 10
  queue_size: 100

# 重试策略
retry:
  enabled: true
  max_attempts: 3
  backoff: exponential
  initial_delay: 1000  # ms

# 超时
timeout: 30000  # ms

# 日志
logging:
  level: info
  log_file: logs/feishu-trigger.log

# 状态
status: active
created_at: 2026-05-01T10:00:00Z
updated_at: 2026-05-01T10:00:00Z
```

---

### 5.4 Backend 适配层

**飞书事件监听服务**:

```python
# backend/services/feishu_event_listener.py

from fastapi import APIRouter, Request, HTTPException
from typing import Dict, Any
import hashlib
import json
import logging

router = APIRouter(prefix="/api/feishu", tags=["feishu"])
logger = logging.getLogger(__name__)

class FeishuEventListener:
    def __init__(self, verification_token: str, encrypt_key: str):
        self.verification_token = verification_token
        self.encrypt_key = encrypt_key
    
    def verify_signature(self, timestamp: str, nonce: str, encrypt: str, signature: str) -> bool:
        """验证飞书 Webhook 签名"""
        content = f"{timestamp}{nonce}{self.encrypt_key}{encrypt}"
        calculated_signature = hashlib.sha256(content.encode()).hexdigest()
        return calculated_signature == signature
    
    async def handle_event(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """处理飞书事件"""
        event_type = event.get("header", {}).get("event_type")
        
        if event_type == "im.message.receive_v1":
            return await self.handle_message_receive(event)
        elif event_type == "im.chat.member.bot.added_v1":
            return await self.handle_bot_added(event)
        elif event_type == "im.chat.member.bot.deleted_v1":
            return await self.handle_bot_deleted(event)
        else:
            logger.warning(f"Unknown event type: {event_type}")
            return {"code": 0}
    
    async def handle_message_receive(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """处理接收消息事件"""
        message = event.get("event", {}).get("message", {})
        sender = event.get("event", {}).get("sender", {})
        
        # 检查是否 @机器人
        mentions = message.get("mentions", [])
        bot_mentioned = any(m.get("id", {}).get("open_id") == BOT_OPEN_ID for m in mentions)
        
        if not bot_mentioned:
            return {"code": 0}
        
        # 触发 Agent
        trigger_service = TriggerService()
        await trigger_service.trigger(
            trigger_id="trigger-003",
            context={
                "event_type": "im.message.receive_v1",
                "message_id": message.get("message_id"),
                "chat_id": message.get("chat_id"),
                "sender_id": sender.get("sender_id", {}).get("open_id"),
                "content": json.loads(message.get("content", "{}")),
                "mentions": mentions,
                "timestamp": message.get("create_time"),
            }
        )
        
        return {"code": 0}
    
    async def handle_bot_added(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """处理机器人被添加到群组事件"""
        chat_id = event.get("event", {}).get("chat_id")
        operator_id = event.get("event", {}).get("operator_id", {}).get("open_id")
        
        logger.info(f"Bot added to chat {chat_id} by {operator_id}")
        
        # 发送欢迎消息
        plugin_service = PluginService()
        await plugin_service.execute_tool(
            plugin_id="plugin-002",
            tool_name="send_feishu_message",
            params={
                "receive_id": chat_id,
                "receive_id_type": "chat_id",
                "msg_type": "text",
                "content": {"text": "你好！我是 AI 助手，很高兴加入这个群组。@我 即可开始对话。"}
            }
        )
        
        return {"code": 0}
    
    async def handle_bot_deleted(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """处理机器人被移出群组事件"""
        chat_id = event.get("event", {}).get("chat_id")
        logger.info(f"Bot removed from chat {chat_id}")
        return {"code": 0}

# FastAPI 路由
@router.post("/webhook")
async def feishu_webhook(request: Request):
    """飞书 Webhook 端点"""
    body = await request.json()
    
    # URL 验证
    if body.get("type") == "url_verification":
        return {"challenge": body.get("challenge")}
    
    # 事件处理
    listener = FeishuEventListener(
        verification_token=FEISHU_VERIFICATION_TOKEN,
        encrypt_key=FEISHU_ENCRYPT_KEY
    )
    
    # 验证签名（可选，根据飞书配置）
    # ...
    
    result = await listener.handle_event(body)
    return result
```

---

### 5.5 Frontend 集成

**飞书消息渲染组件**:

```tsx
// frontend/src/components/FeishuMessage.tsx
// 注意：使用 DOMPurify 对 HTML 内容进行清理，防止 XSS 攻击

import React from 'react';
import DOMPurify from 'dompurify';
import { Message } from '@/types';

interface FeishuMessageProps {
  message: Message;
}

export const FeishuMessage: React.FC<FeishuMessageProps> = ({ message }) => {
  const { metadata } = message;
  
  // 检查是否是飞书消息
  if (metadata?.source !== 'feishu') {
    return null;
  }
  
  const feishuData = metadata.feishu;
  
  return (
    <div className="feishu-message border-l-4 border-blue-500 pl-4">
      {/* 飞书消息头部 */}
      <div className="flex items-center gap-2 mb-2">
        <img 
          src="/icons/feishu-logo.svg" 
          alt="飞书" 
          className="w-4 h-4"
        />
        <span className="text-sm text-gray-500">来自飞书</span>
        {feishuData?.chat_name && (
          <span className="text-sm text-gray-500">
            · {feishuData.chat_name}
          </span>
        )}
      </div>
      
      {/* 消息内容 */}
      <div className="message-content">
        {renderFeishuContent(message)}
      </div>
      
      {/* 飞书操作按钮 */}
      <div className="flex gap-2 mt-2">
        <button 
          className="text-sm text-blue-600 hover:underline"
          onClick={() => openInFeishu(feishuData?.message_id)}
        >
          在飞书中打开
        </button>
      </div>
    </div>
  );
};

function renderFeishuContent(message: Message) {
  const content = message.metadata?.feishu?.content;
  const msgType = message.metadata?.feishu?.msg_type;
  
  switch (msgType) {
    case 'text':
      return <p>{content?.text}</p>;
    
    case 'post':
      // 富文本消息 - 使用 DOMPurify 清理 HTML
      const sanitizedHTML = DOMPurify.sanitize(content?.post || '');
      return <div dangerouslySetInnerHTML={{ __html: sanitizedHTML }} />;
    
    case 'image':
      return <img src={content?.image_key} alt="飞书图片" />;
    
    case 'file':
      return (
        <a href={content?.file_key} download>
          📎 {content?.file_name}
        </a>
      );
    
    default:
      return <p>{message.content}</p>;
  }
}

function openInFeishu(messageId: string) {
  window.open(`feishu://open?message_id=${messageId}`, '_blank');
}
```

---

### 5.6 三阶段实施路线图

#### Phase 1: 基础消息收发（2 周）

**目标**: 实现飞书消息的接收和发送

**任务**:
1. ✅ 创建飞书应用，获取 App ID 和 App Secret
2. ✅ 配置 Webhook 回调地址
3. ✅ 实现 plugin-002 (feishu-integration)
   - 消息发送 API
   - 消息接收 Webhook
   - 用户信息查询
4. ✅ 实现 trigger-003 (feishu-message-trigger)
   - 监听 im.message.receive_v1 事件
   - 过滤 @机器人 消息
   - 触发 Agent 响应
5. ✅ Backend 适配层
   - FeishuEventListener 服务
   - Webhook 签名验证
   - 事件路由和处理
6. ✅ Frontend 基础组件
   - FeishuMessage 消息渲染
   - 飞书消息标识（图标、来源标签）

**验收标准**:
- 用户在飞书群组中 @机器人，Agent 能收到消息并回复
- 回复消息正确显示在飞书群组中
- Frontend 能正确渲染飞书来源的消息

---

#### Phase 2: 高级功能（3 周）

**目标**: 支持富文本、文件、群组管理等高级功能

**任务**:
1. 富文本消息支持
   - 飞书 Post 格式（富文本、@提及、超链接）
   - Markdown 转飞书格式
   - 代码块语法高亮
2. 文件上传下载
   - 图片、文档、音视频上传
   - 文件预览和下载
3. 群组管理
   - 创建群组
   - 添加/移除成员
   - 群组信息查询
4. 交互式卡片消息
   - 按钮、表单、选择器
   - 卡片事件回调
5. 消息操作
   - 消息撤回
   - 消息编辑
   - 消息已读状态

**验收标准**:
- Agent 能发送富文本消息（包含 @提及、链接、代码块）
- 用户能通过 Agent 上传文件到飞书
- Agent 能创建飞书群组并邀请成员
- 交互式卡片消息能正确响应用户操作

---

#### Phase 3: 深度集成（4 周）

**目标**: 飞书与 OKR/Task 系统深度集成

**任务**:
1. OKR 同步
   - 飞书 OKR 导入到系统
   - 系统 OKR 推送到飞书
   - 进度自动同步
2. Task 同步
   - 飞书任务导入
   - 系统任务推送到飞书
   - 状态双向同步
3. 通知推送
   - OKR 进度更新通知
   - Task 状态变更通知
   - Agent 执行结果通知
4. 日历集成
   - 会议提醒
   - Deadline 提醒
   - 工作计划同步
5. 审批流程
   - OKR 审批
   - Task 审批
   - 飞书审批流程对接

**验收标准**:
- 飞书 OKR 能自动同步到系统，反之亦然
- 飞书任务状态变更能实时反映到系统
- 用户在飞书中能收到 OKR/Task 相关通知
- 飞书审批流程能触发系统内的状态变更

---

### 5.7 安全和性能考虑

**安全**:
- Webhook 签名验证（防止伪造请求）
- 消息加密传输（使用飞书 encrypt_key）
- Token 安全存储（环境变量 + 密钥管理）
- 权限最小化原则（只申请必要的 API 权限）
- HTML 内容清理（使用 DOMPurify 防止 XSS 攻击）

**性能**:
- 异步事件处理（避免阻塞 Webhook 响应）
- 消息队列缓冲（处理高并发场景）
- 限流和重试（避免 API 调用超限）
- 缓存用户信息（减少 API 调用次数）

**监控**:
- Webhook 事件日志
- API 调用统计
- 错误率监控
- 响应时间监控

---

