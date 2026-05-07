# 路由设计（Routing Design）

> **版本**: v4.0  
> **日期**: 2026-05-07  
> **关键词**: `路由`, `权限路由`, `动态路由`, `懒加载`, `路由守卫`, `面包屑`, `路由过渡`

**本文档包含**:
- 页面路由定义和路径规范
- 权限路由保护机制
- 动态路由和参数传递
- 路由懒加载策略
- 路由守卫和导航钩子
- 面包屑导航设计
- 路由过渡动画

**适用场景**:
- 定义新的页面路由
- 实现权限控制
- 配置路由懒加载
- 设计路由过渡效果

**相关文档**:
- [Frontend Layer](./frontend-layer.md) - 前端架构设计
- [Feature Domain Organization](./05-feature-domain-organization.md) - 功能域组织规范

---

## 1. 路由技术选型

### 1.1 推荐方案：Tanstack Router

**选择理由**：
- ✅ **类型安全**：完整的 TypeScript 支持，路由参数自动推导
- ✅ **现代化**：支持 React 18 并发特性、Suspense
- ✅ **性能优化**：内置代码分割、预加载、缓存
- ✅ **开发体验**：自动生成路由类型、路由树可视化

**替代方案**：
- React Router v6：成熟稳定，但类型安全较弱
- Next.js App Router：如果使用 SSR

**安装**：
```bash
npm install @tanstack/react-router
npm install -D @tanstack/router-devtools @tanstack/router-vite-plugin
```

---

## 2. 路由结构设计

### 2.1 路由树结构

```
/                           # 根路由
├── /login                  # 登录页（公开）
├── /auth/callback          # OAuth 回调（公开）
├── /                       # 应用主布局（需要认证）
│   ├── /dashboard          # 仪表盘
│   ├── /chat               # 聊天
│   │   ├── /chat/:channelId          # 频道聊天
│   │   ├── /chat/dm/:userId          # 私聊
│   │   └── /chat/thread/:threadId    # 线程
│   ├── /tasks              # 任务
│   │   ├── /tasks                    # 任务列表
│   │   └── /tasks/:taskId            # 任务详情
│   ├── /agents             # Agent 管理
│   │   ├── /agents                   # Agent 列表
│   │   ├── /agents/:agentId          # Agent 详情
│   │   └── /agents/:agentId/logs     # Agent 日志
│   ├── /okrs               # OKR 管理
│   │   ├── /okrs                     # OKR 列表
│   │   └── /okrs/:okrId              # OKR 详情
│   ├── /workflows          # 工作流
│   │   ├── /workflows                # 工作流列表
│   │   ├── /workflows/:workflowId    # 工作流详情
│   │   └── /workflows/:workflowId/edit # 工作流编辑
│   ├── /projects           # 项目管理
│   │   ├── /projects                 # 项目列表
│   │   └── /projects/:projectId      # 项目详情
│   └── /settings           # 设置
│       ├── /settings/profile         # 个人资料
│       ├── /settings/account         # 账号设置
│       ├── /settings/feishu          # 飞书集成
│       └── /settings/preferences     # 偏好设置
└── /404                    # 404 页面
```

---

## 3. 路由定义

### 3.1 路由配置文件

```typescript
// src/router.tsx
import { createRouter, createRootRoute, createRoute } from '@tanstack/react-router';
import { RootLayout } from '@/layouts/RootLayout';
import { AuthLayout } from '@/layouts/AuthLayout';

// 根路由
const rootRoute = createRootRoute({
  component: RootLayout,
});

// 认证路由（公开）
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: () => import('@/pages/LoginPage').then(m => m.LoginPage),
});

const authCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/callback',
  component: () => import('@/pages/AuthCallbackPage').then(m => m.AuthCallbackPage),
});

// 应用主布局（需要认证）
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: AuthLayout,
  beforeLoad: async ({ context }) => {
    // 权限检查
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login' });
    }
  },
});

// 仪表盘
const dashboardRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/dashboard',
  component: () => import('@/pages/DashboardPage').then(m => m.DashboardPage),
});

// 聊天路由
const chatRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/chat',
  component: () => import('@/features/chat/components/ChatPage').then(m => m.ChatPage),
});

const chatChannelRoute = createRoute({
  getParentRoute: () => chatRoute,
  path: '/$channelId',
  component: () => import('@/features/chat/components/ChannelView').then(m => m.ChannelView),
  loader: async ({ params }) => {
    // 预加载频道数据
    return queryClient.ensureQueryData({
      queryKey: ['channel', params.channelId],
      queryFn: () => chatApi.getChannel(params.channelId),
    });
  },
});

// 任务路由
const tasksRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/tasks',
  component: () => import('@/features/task/components/TaskPage').then(m => m.TaskPage),
});

const taskDetailRoute = createRoute({
  getParentRoute: () => tasksRoute,
  path: '/$taskId',
  component: () => import('@/features/task/components/TaskDetail').then(m => m.TaskDetail),
  loader: async ({ params }) => {
    return queryClient.ensureQueryData({
      queryKey: ['task', params.taskId],
      queryFn: () => taskApi.getTask(params.taskId),
    });
  },
});

// Agent 路由
const agentsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/agents',
  component: () => import('@/features/agent/components/AgentPage').then(m => m.AgentPage),
});

const agentDetailRoute = createRoute({
  getParentRoute: () => agentsRoute,
  path: '/$agentId',
  component: () => import('@/features/agent/components/AgentDetail').then(m => m.AgentDetail),
  loader: async ({ params }) => {
    return queryClient.ensureQueryData({
      queryKey: ['agent', params.agentId],
      queryFn: () => agentApi.getAgent(params.agentId),
    });
  },
});

// 404 路由
const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/404',
  component: () => import('@/pages/NotFoundPage').then(m => m.NotFoundPage),
});

// 创建路由树
const routeTree = rootRoute.addChildren([
  loginRoute,
  authCallbackRoute,
  appRoute.addChildren([
    dashboardRoute,
    chatRoute.addChildren([chatChannelRoute]),
    tasksRoute.addChildren([taskDetailRoute]),
    agentsRoute.addChildren([agentDetailRoute]),
    // ... 其他路由
  ]),
  notFoundRoute,
]);

// 创建路由实例
export const router = createRouter({
  routeTree,
  context: {
    auth: undefined!, // 将在 App.tsx 中注入
    queryClient,
  },
  defaultPreload: 'intent', // 鼠标悬停时预加载
  defaultPreloadStaleTime: 10000, // 预加载缓存 10 秒
});

// 类型声明
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
```

---

## 4. 权限路由设计

### 4.1 权限模型

```typescript
// shared/types/auth.types.ts
export enum Permission {
  // 消息权限
  MESSAGE_READ = 'message:read',
  MESSAGE_WRITE = 'message:write',
  MESSAGE_DELETE = 'message:delete',
  
  // 任务权限
  TASK_READ = 'task:read',
  TASK_WRITE = 'task:write',
  TASK_CLAIM = 'task:claim',
  TASK_ASSIGN = 'task:assign',
  
  // Agent 权限
  AGENT_READ = 'agent:read',
  AGENT_MANAGE = 'agent:manage',
  AGENT_START_STOP = 'agent:start_stop',
  
  // OKR 权限
  OKR_READ = 'okr:read',
  OKR_WRITE = 'okr:write',
  
  // 项目权限
  PROJECT_READ = 'project:read',
  PROJECT_WRITE = 'project:write',
  PROJECT_ADMIN = 'project:admin',
  
  // 系统权限
  SYSTEM_ADMIN = 'system:admin',
}

export enum Role {
  ADMIN = 'admin',
  MEMBER = 'member',
  GUEST = 'guest',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  permissions: Permission[];
}
```

### 4.2 权限检查 Hook

```typescript
// shared/hooks/usePermission.ts
import { useAuth } from '@/lib/auth';
import { Permission } from '@/shared/types/auth.types';

export const usePermission = () => {
  const { user } = useAuth();
  
  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    return user.permissions.includes(permission);
  };
  
  const hasAnyPermission = (permissions: Permission[]): boolean => {
    if (!user) return false;
    return permissions.some(p => user.permissions.includes(p));
  };
  
  const hasAllPermissions = (permissions: Permission[]): boolean => {
    if (!user) return false;
    return permissions.every(p => user.permissions.includes(p));
  };
  
  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
};
```

### 4.3 路由守卫

```typescript
// lib/route-guards.ts
import { redirect } from '@tanstack/react-router';
import { Permission } from '@/shared/types/auth.types';

export const requireAuth = async ({ context }: { context: any }) => {
  if (!context.auth.isAuthenticated) {
    throw redirect({
      to: '/login',
      search: {
        redirect: window.location.pathname,
      },
    });
  }
};

export const requirePermission = (permission: Permission) => {
  return async ({ context }: { context: any }) => {
    await requireAuth({ context });
    
    if (!context.auth.user.permissions.includes(permission)) {
      throw redirect({
        to: '/403',
      });
    }
  };
};

export const requireRole = (role: Role) => {
  return async ({ context }: { context: any }) => {
    await requireAuth({ context });
    
    if (context.auth.user.role !== role) {
      throw redirect({
        to: '/403',
      });
    }
  };
};
```

### 4.4 使用权限路由

```typescript
// 示例：Agent 管理路由需要 AGENT_MANAGE 权限
const agentManageRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/agents/manage',
  component: () => import('@/features/agent/components/AgentManagePage').then(m => m.AgentManagePage),
  beforeLoad: requirePermission(Permission.AGENT_MANAGE),
});
```

---

## 5. 动态路由和参数

### 5.1 路径参数

```typescript
// 定义带参数的路由
const chatChannelRoute = createRoute({
  getParentRoute: () => chatRoute,
  path: '/$channelId', // $ 表示路径参数
  component: ChannelView,
});

// 在组件中使用参数
import { useParams } from '@tanstack/react-router';

export const ChannelView = () => {
  const { channelId } = useParams({ from: '/chat/$channelId' });
  // channelId 是类型安全的字符串
  
  return <div>Channel: {channelId}</div>;
};
```

### 5.2 查询参数

```typescript
// 定义带查询参数的路由
const tasksRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/tasks',
  component: TaskPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      status: (search.status as string) || 'all',
      page: Number(search.page) || 1,
      pageSize: Number(search.pageSize) || 20,
    };
  },
});

// 在组件中使用查询参数
import { useSearch } from '@tanstack/react-router';

export const TaskPage = () => {
  const { status, page, pageSize } = useSearch({ from: '/tasks' });
  // 类型安全的查询参数
  
  return <div>Status: {status}, Page: {page}</div>;
};

// 更新查询参数
import { useNavigate } from '@tanstack/react-router';

const navigate = useNavigate({ from: '/tasks' });

navigate({
  search: (prev) => ({
    ...prev,
    status: 'completed',
    page: 2,
  }),
});
```

### 5.3 Hash 参数

```typescript
// 使用 hash 参数（用于页面内锚点）
const navigate = useNavigate();

navigate({
  to: '/chat/$channelId',
  params: { channelId: 'channel-123' },
  hash: 'message-456', // 跳转到 #message-456
});
```

---

## 6. 路由懒加载

### 6.1 代码分割策略

**按功能域分割**：
```typescript
// 每个功能域独立打包
const chatRoute = createRoute({
  path: '/chat',
  component: () => import('@/features/chat/components/ChatPage').then(m => m.ChatPage),
});

const taskRoute = createRoute({
  path: '/tasks',
  component: () => import('@/features/task/components/TaskPage').then(m => m.TaskPage),
});
```

**按页面分割**：
```typescript
// 每个页面独立打包
const dashboardRoute = createRoute({
  path: '/dashboard',
  component: () => import('@/pages/DashboardPage').then(m => m.DashboardPage),
});
```

### 6.2 预加载策略

```typescript
// 配置预加载策略
export const router = createRouter({
  routeTree,
  defaultPreload: 'intent', // 鼠标悬停时预加载
  defaultPreloadStaleTime: 10000, // 预加载缓存 10 秒
});

// 手动预加载
import { useRouter } from '@tanstack/react-router';

const router = useRouter();

// 预加载特定路由
router.preloadRoute({
  to: '/chat/$channelId',
  params: { channelId: 'channel-123' },
});
```

### 6.3 Suspense 边界

```typescript
// layouts/RootLayout.tsx
import { Suspense } from 'react';
import { Outlet } from '@tanstack/react-router';
import { Spinner } from '@/shared/components/Spinner';

export const RootLayout = () => {
  return (
    <div className="app">
      <Suspense fallback={<Spinner />}>
        <Outlet />
      </Suspense>
    </div>
  );
};
```

---

## 7. 路由导航

### 7.1 编程式导航

```typescript
import { useNavigate } from '@tanstack/react-router';

export const MyComponent = () => {
  const navigate = useNavigate();
  
  const handleClick = () => {
    // 导航到指定路由
    navigate({
      to: '/chat/$channelId',
      params: { channelId: 'channel-123' },
      search: { tab: 'messages' },
    });
  };
  
  const handleBack = () => {
    // 返回上一页
    navigate({ to: '..', });
  };
  
  return (
    <div>
      <button onClick={handleClick}>Go to Channel</button>
      <button onClick={handleBack}>Back</button>
    </div>
  );
};
```

### 7.2 声明式导航

```typescript
import { Link } from '@tanstack/react-router';

export const Navigation = () => {
  return (
    <nav>
      <Link to="/dashboard">Dashboard</Link>
      <Link to="/chat/$channelId" params={{ channelId: 'channel-123' }}>
        Chat
      </Link>
      <Link
        to="/tasks"
        search={{ status: 'active' }}
        activeProps={{ className: 'active' }}
      >
        Tasks
      </Link>
    </nav>
  );
};
```

---

## 8. 面包屑导航

### 8.1 面包屑组件

```typescript
// shared/components/Breadcrumb.tsx
import { Link, useMatches } from '@tanstack/react-router';

export const Breadcrumb = () => {
  const matches = useMatches();
  
  const breadcrumbs = matches
    .filter(match => match.context?.breadcrumb)
    .map(match => ({
      label: match.context.breadcrumb,
      to: match.pathname,
    }));
  
  return (
    <nav className="breadcrumb">
      {breadcrumbs.map((crumb, index) => (
        <span key={crumb.to}>
          {index > 0 && <span className="separator">/</span>}
          {index === breadcrumbs.length - 1 ? (
            <span className="current">{crumb.label}</span>
          ) : (
            <Link to={crumb.to}>{crumb.label}</Link>
          )}
        </span>
      ))}
    </nav>
  );
};
```

### 8.2 配置面包屑

```typescript
const chatChannelRoute = createRoute({
  getParentRoute: () => chatRoute,
  path: '/$channelId',
  component: ChannelView,
  loader: async ({ params }) => {
    const channel = await chatApi.getChannel(params.channelId);
    return { channel };
  },
  context: ({ loaderData }) => ({
    breadcrumb: loaderData.channel.name,
  }),
});
```

---

## 9. 路由过渡动画

### 9.1 使用 Framer Motion

```typescript
// layouts/AuthLayout.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { Outlet, useLocation } from '@tanstack/react-router';

export const AuthLayout = () => {
  const location = useLocation();
  
  return (
    <div className="app-layout">
      <Sidebar />
      <main>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};
```

### 9.2 页面过渡类型

```typescript
// lib/page-transitions.ts
export const pageTransitions = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slide: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.05 },
  },
};
```

---

## 10. 路由元数据

### 10.1 页面标题

```typescript
// 使用 React Helmet 管理页面标题
import { Helmet } from 'react-helmet-async';

export const ChatPage = () => {
  return (
    <>
      <Helmet>
        <title>Chat - Slock</title>
      </Helmet>
      <div>Chat content</div>
    </>
  );
};
```

### 10.2 路由元数据配置

```typescript
const chatRoute = createRoute({
  path: '/chat',
  component: ChatPage,
  meta: {
    title: 'Chat',
    description: 'Team chat and collaboration',
    requiresAuth: true,
    permissions: [Permission.MESSAGE_READ],
  },
});
```

---

## 11. 404 和错误处理

### 11.1 404 页面

```typescript
// pages/NotFoundPage.tsx
import { Link } from '@tanstack/react-router';

export const NotFoundPage = () => {
  return (
    <div className="not-found">
      <h1>404 - Page Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
      <Link to="/dashboard">Go to Dashboard</Link>
    </div>
  );
};
```

### 11.2 错误边界

```typescript
// 路由级别的错误边界
const chatRoute = createRoute({
  path: '/chat',
  component: ChatPage,
  errorComponent: ({ error }) => {
    return (
      <div className="error">
        <h2>Something went wrong</h2>
        <p>{error.message}</p>
        <button onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    );
  },
});
```

---

## 12. 路由配置总结

### 12.1 完整配置示例

```typescript
// src/router.tsx
import { createRouter, createRootRoute, createRoute, redirect } from '@tanstack/react-router';
import { queryClient } from '@/lib/react-query-config';
import { RootLayout } from '@/layouts/RootLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { requireAuth, requirePermission } from '@/lib/route-guards';
import { Permission } from '@/shared/types/auth.types';

// 根路由
const rootRoute = createRootRoute({
  component: RootLayout,
});

// 登录路由
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: () => import('@/pages/LoginPage').then(m => m.LoginPage),
});

// 应用主布局
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: AuthLayout,
  beforeLoad: requireAuth,
});

// 仪表盘
const dashboardRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/dashboard',
  component: () => import('@/pages/DashboardPage').then(m => m.DashboardPage),
});

// 聊天路由
const chatRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/chat',
  component: () => import('@/features/chat/components/ChatPage').then(m => m.ChatPage),
  beforeLoad: requirePermission(Permission.MESSAGE_READ),
});

const chatChannelRoute = createRoute({
  getParentRoute: () => chatRoute,
  path: '/$channelId',
  component: () => import('@/features/chat/components/ChannelView').then(m => m.ChannelView),
  loader: async ({ params }) => {
    return queryClient.ensureQueryData({
      queryKey: ['channel', params.channelId],
      queryFn: () => chatApi.getChannel(params.channelId),
    });
  },
});

// 创建路由树
const routeTree = rootRoute.addChildren([
  loginRoute,
  appRoute.addChildren([
    dashboardRoute,
    chatRoute.addChildren([chatChannelRoute]),
    // ... 其他路由
  ]),
]);

// 创建路由实例
export const router = createRouter({
  routeTree,
  context: {
    auth: undefined!,
    queryClient,
  },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 10000,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
```

### 12.2 在 App.tsx 中使用

```typescript
// src/App.tsx
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import { useAuth } from '@/lib/auth';

export const App = () => {
  const auth = useAuth();
  
  return (
    <RouterProvider
      router={router}
      context={{ auth }}
    />
  );
};
```

---

## 13. 最佳实践

### 13.1 路由命名规范

- ✅ 使用小写字母和连字符：`/chat-settings`
- ✅ 使用复数形式表示列表：`/tasks`、`/agents`
- ✅ 使用单数形式表示详情：`/task/:id`、`/agent/:id`
- ✅ 使用动词表示操作：`/agents/:id/edit`、`/tasks/:id/clone`

### 13.2 参数命名规范

- ✅ 使用 camelCase：`channelId`、`userId`
- ✅ 使用描述性名称：`taskId` 而不是 `id`
- ✅ 避免缩写：`channelId` 而不是 `cId`

### 13.3 性能优化

- ✅ 使用路由懒加载减少首屏加载时间
- ✅ 配置预加载策略提升导航体验
- ✅ 使用 loader 预加载数据
- ✅ 合理使用 Suspense 边界

### 13.4 安全性

- ✅ 所有需要认证的路由使用 `requireAuth`
- ✅ 敏感操作使用权限检查
- ✅ 避免在 URL 中暴露敏感信息
- ✅ 使用 HTTPS 保护路由

---

## 14. 总结

本文档定义了前端应用的完整路由设计，包括：

- ✅ **技术选型**：Tanstack Router（类型安全、现代化）
- ✅ **路由结构**：清晰的路由树，覆盖所有页面
- ✅ **权限控制**：基于角色和权限的路由保护
- ✅ **动态路由**：路径参数、查询参数、Hash 参数
- ✅ **懒加载**：按功能域和页面分割代码
- ✅ **导航**：编程式导航、声明式导航、面包屑
- ✅ **过渡动画**：使用 Framer Motion 实现平滑过渡
- ✅ **错误处理**：404 页面、错误边界

**下一步**：
- 实现路由配置文件
- 创建路由守卫和权限检查
- 实现面包屑导航组件
- 配置路由过渡动画

小张人呢？
