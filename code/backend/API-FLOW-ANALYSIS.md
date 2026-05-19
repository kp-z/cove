# Cove 用户工作流程 API 分析

## 用户工作流程

```
1. 注册 (auth.register) ✅
   ↓
2. 登录 (auth.login) ✅
   ↓
3. 创建 Server (server.create) ✅
   或 加入 Server (需要邀请机制) ⚠️
   ↓
4. 加入 Channel (member.joinChannel) ✅
   ↓
5. 开始工作 (发送消息、创建任务等) ✅
```

## API 支持情况

### ✅ 已支持的 API

#### 1. 用户认证
- `auth.register` - 用户注册（刚实现）
- `auth.login` - 用户登录
- `auth.verifyToken` - 验证 token
- `auth.me` - 获取当前用户信息

#### 2. Server 管理
- `server.create` - 创建 Server（公开端点）
  - 输入：`{ name, displayName, description, ownerId, visibility }`
  - 创建者自动成为 owner
  - 返回：Server 信息

- `server.list` - 获取 Server 列表
  - 可按 ownerId 或 status 过滤
  
- `server.getById` - 获取单个 Server
- `server.update` - 更新 Server
- `server.archive` - 归档 Server
- `server.activate` - 激活 Server
- `server.delete` - 删除 Server

#### 3. Channel 成员管理
- `member.joinChannel` - 加入频道
  - 输入：`{ channelId, userId, userType, role, invitedBy }`
  - 自动创建 ChannelMember

### ⚠️ 可能缺失的 API

#### Server 成员管理
当前 **没有发现** 以下 API：
- ❌ `server.addMember` - 添加成员到 Server
- ❌ `server.removeMember` - 从 Server 移除成员
- ❌ `server.inviteMember` - 邀请成员加入 Server
- ❌ `server.listMembers` - 获取 Server 成员列表
- ❌ `server.updateMemberRole` - 更新成员角色

**注意**：
- 存在 `ServerMemberEntity` 领域模型（定义了 owner/admin/member/guest 角色）
- 存在 `ChannelMember` 管理（MemberService）
- 但 **没有找到 ServerMember 的 Service 和 Router**

## 当前工作流程分析

### 场景 1：用户创建自己的 Server
```typescript
// 1. 注册
const { user, token } = await trpc.auth.register.mutate({
  username: 'alice',
  email: 'alice@example.com',
  password: 'SecurePass123!',
  displayName: 'Alice'
});

// 2. 创建 Server（自动成为 owner）
const server = await trpc.server.create.mutate({
  name: 'alice-workspace',
  displayName: 'Alice的工作空间',
  ownerId: user.user_id,
  visibility: 'private'
});

// 3. 创建 Channel（需要 channel.create API）
const channel = await trpc.channel.create.mutate({
  serverId: server.server_id,
  name: 'general',
  displayName: '通用频道'
});

// 4. 加入 Channel
await trpc.member.joinChannel.mutate({
  channelId: channel.channel_id,
  userId: user.user_id
});

// 5. 发送消息
await trpc.message.send.mutate({
  channelId: channel.channel_id,
  content: 'Hello World!'
});
```

### 场景 2：用户加入现有 Server（需要补充）
```typescript
// 当前缺失的流程：
// 1. 用户 B 注册
// 2. 用户 A（Server owner）邀请用户 B
//    ❌ 缺少 server.inviteMember API
// 3. 用户 B 接受邀请
//    ❌ 缺少 server.acceptInvite API
// 4. 用户 B 成为 ServerMember
//    ❌ 缺少 ServerMember 管理逻辑
```

## 结论

### ✅ 当前 API 已经支持的流程
**用户注册 → 登录 → 创建自己的 Server → 创建 Channel → 加入 Channel → 工作**

这个流程是完整的，用户可以：
1. 注册账号
2. 登录获取 token
3. 创建自己的 Server（自动成为 owner）
4. 在 Server 中创建 Channel
5. 加入 Channel 开始工作

### ⚠️ 可能需要补充的功能（未来）
- Server 成员邀请机制
- Server 成员管理（添加、移除、角色管理）
- Server 成员列表查询
- 邀请链接/邀请码系统

### 📝 建议
当前的注册 API 实现是正确的，用户注册后：
1. 可以立即登录
2. 可以创建自己的 Server
3. 可以在 Server 中工作

**不需要在注册时自动创建 Server**，因为：
- 用户可能想加入现有 Server 而不是创建新的
- Server 创建是一个独立的业务操作
- 保持注册流程简单和灵活
