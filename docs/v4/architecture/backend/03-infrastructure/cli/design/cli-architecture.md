# Slock CLI Architecture

> **版本**: v4.0  
> **日期**: 2026-05-08  
> **关键词**: `CLI`, `命令行工具`, `slock`, `客户端`, `API 客户端`, `消息管理`, `任务管理`, `频道管理`

**本文档包含**:
- Slock CLI 的整体架构设计
- CLI 与 Backend API 的交互方式
- 命令分类和组织结构
- 认证和会话管理
- 错误处理和用户体验设计

**适用场景**:
- 需要了解 CLI 的整体架构
- 设计新的 CLI 命令
- 理解 CLI 与 Backend 的交互机制
- 实现 CLI 客户端功能

**相关文档**:
- [Backend API](../04-backend-api.md) - CLI 调用的后端 API 接口
- [Commands Reference](../commands/) - 各个命令的详细文档
- [Examples](../examples/) - CLI 使用示例

---

## 一、CLI 概述

Slock CLI 是 Slock 系统的命令行客户端工具，为用户提供便捷的命令行界面来管理 Agent、Channel、Message、Task 等实体。

### 设计原则

1. **简洁易用** - 命令语法清晰，参数命名直观
2. **一致性** - 所有命令遵循统一的命名和参数规范
3. **可组合** - 支持管道操作和脚本自动化
4. **友好的错误提示** - 清晰的错误信息和建议
5. **离线优先** - 支持本地缓存和离线操作

### 技术栈

- **语言**: Go / Rust（待定）
- **CLI 框架**: Cobra / Clap（待定）
- **HTTP 客户端**: 标准库 / reqwest
- **配置管理**: YAML / TOML
- **认证**: JWT Token

---

## 二、架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────┐
│           Slock CLI                     │
├─────────────────────────────────────────┤
│  Command Layer                          │
│  ├── message (消息管理)                 │
│  ├── task (任务管理)                    │
│  ├── channel (频道管理)                 │
│  ├── agent (Agent 管理)                 │
│  └── ...                                │
├─────────────────────────────────────────┤
│  Core Layer                             │
│  ├── API Client (HTTP/WebSocket)       │
│  ├── Auth Manager (认证管理)            │
│  ├── Config Manager (配置管理)          │
│  └── Cache Manager (缓存管理)           │
├─────────────────────────────────────────┤
│  Output Layer                           │
│  ├── Formatter (格式化输出)             │
│  ├── Table Renderer (表格渲染)          │
│  └── Error Handler (错误处理)           │
└─────────────────────────────────────────┘
           ↓ HTTP/WebSocket
┌─────────────────────────────────────────┐
│       Backend API Server                │
└─────────────────────────────────────────┘
```

### 2.2 命令分类

| 命令组 | 说明 | 示例命令 |
|--------|------|----------|
| **message** | 消息管理 | `slock message send`, `slock message read`, `slock message search` |
| **task** | 任务管理 | `slock task list`, `slock task claim`, `slock task update` |
| **channel** | 频道管理 | `slock channel list`, `slock channel members`, `slock channel leave` |
| **thread** | 线程管理 | `slock thread unfollow` |
| **agent** | Agent 管理 | `slock agent list`, `slock agent start`, `slock agent stop` |
| **server** | 服务器管理 | `slock server info`, `slock server create` |
| **profile** | 用户配置 | `slock profile show`, `slock profile update` |
| **reminder** | 提醒管理 | `slock reminder schedule`, `slock reminder list`, `slock reminder cancel` |
| **attachment** | 附件管理 | `slock attachment upload`, `slock attachment view` |

### 2.3 命令命名规范

**格式**: `slock <resource> <action> [options]`

**示例**:
```bash
slock message send --target "#general" --content "Hello"
slock task claim --task-id 123
slock channel members --channel "#general"
```

**动词规范**:
- `list` - 列出资源
- `show` / `view` - 查看单个资源详情
- `create` - 创建资源
- `update` - 更新资源
- `delete` - 删除资源
- `send` - 发送消息
- `claim` - 认领任务
- `schedule` - 调度提醒

---

## 三、核心组件

### 3.1 API Client

**职责**: 封装与 Backend API 的 HTTP/WebSocket 通信

**功能**:
- HTTP 请求封装（GET, POST, PUT, DELETE）
- WebSocket 连接管理
- 请求重试和超时处理
- 响应解析和错误处理

**示例**:
```go
type APIClient struct {
    baseURL    string
    httpClient *http.Client
    authToken  string
}

func (c *APIClient) SendMessage(target, content string) (*Message, error) {
    // 构造请求
    req := &SendMessageRequest{
        Target:  target,
        Content: content,
    }
    
    // 发送 HTTP POST 请求
    resp, err := c.Post("/api/v1/messages", req)
    if err != nil {
        return nil, err
    }
    
    // 解析响应
    var msg Message
    if err := json.Unmarshal(resp.Body, &msg); err != nil {
        return nil, err
    }
    
    return &msg, nil
}
```

### 3.2 Auth Manager

**职责**: 管理用户认证和会话

**功能**:
- JWT Token 存储和刷新
- 自动登录和会话恢复
- Token 过期处理

**配置文件**: `~/.slock/config.yaml`
```yaml
auth:
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  refresh_token: "..."
  expires_at: "2026-05-09T00:00:00Z"
  
server:
  url: "https://api.slock.example.com"
  
user:
  id: "user-001"
  name: "kp-user"
```

### 3.3 Config Manager

**职责**: 管理 CLI 配置

**功能**:
- 读取和写入配置文件
- 环境变量覆盖
- 默认值管理

**配置优先级**:
1. 命令行参数（最高优先级）
2. 环境变量
3. 配置文件 `~/.slock/config.yaml`
4. 默认值（最低优先级）

### 3.4 Cache Manager

**职责**: 管理本地缓存

**功能**:
- 缓存频道列表、成员列表等常用数据
- 缓存过期和刷新策略
- 离线模式支持

**缓存目录**: `~/.slock/cache/`

---

## 四、输出格式

### 4.1 标准输出格式

**成功响应**:
```
Message sent to #general. Message ID: a1b2c3d4
```

**表格输出**:
```
ID    Title                Status        Assignee
----  -------------------  ------------  ----------
#1    Fix login bug        in_progress   @alice
#2    Add dark mode        todo          -
#3    Update docs          in_review     @bob
```

**JSON 输出** (使用 `--json` 标志):
```json
{
  "ok": true,
  "data": {
    "message_id": "a1b2c3d4",
    "target": "#general",
    "content": "Hello",
    "timestamp": "2026-05-08T13:42:00Z"
  }
}
```

### 4.2 错误输出格式

**错误响应** (输出到 stderr):
```json
{
  "ok": false,
  "code": "SEND_FAILED",
  "message": "Channel not found: #general"
}
```

**退出码**:
- `0` - 成功
- `1` - 一般错误
- `2` - 参数错误
- `3` - 认证错误
- `4` - 网络错误

---

## 五、认证流程

### 5.1 初始化认证

```bash
# 用户首次使用，需要登录
$ slock login
Enter server URL: https://api.slock.example.com
Enter username: kp-user
Enter password: ********

Login successful!
Token saved to ~/.slock/config.yaml
```

### 5.2 自动认证

CLI 会自动读取 `~/.slock/config.yaml` 中的 token，无需每次登录。

### 5.3 Token 刷新

当 token 过期时，CLI 会自动使用 refresh_token 刷新，对用户透明。

---

## 六、错误处理

### 6.1 网络错误

```bash
$ slock message send --target "#general" --content "Hello"
Error: Failed to connect to server
Suggestion: Check your network connection or server URL in ~/.slock/config.yaml
```

### 6.2 认证错误

```bash
$ slock message send --target "#general" --content "Hello"
Error: Authentication failed (token expired)
Suggestion: Run 'slock login' to re-authenticate
```

### 6.3 业务错误

```bash
$ slock task claim --task-id 123
Error: Task already claimed by @alice
Suggestion: Choose a different task or wait for @alice to release it
```

---

## 七、扩展性设计

### 7.1 插件系统（未来）

支持第三方插件扩展 CLI 功能：

```bash
# 安装插件
$ slock plugin install slock-plugin-github

# 使用插件命令
$ slock github sync-issues
```

### 7.2 脚本自动化

CLI 支持管道和脚本自动化：

```bash
# 批量处理任务
$ slock task list --status todo --json | jq -r '.data[].id' | xargs -I {} slock task claim --task-id {}

# 定时发送消息
$ echo "Daily standup reminder" | slock message send --target "#general"
```

---

**最后更新**: 2026-05-08 | **维护者**: @Alice
