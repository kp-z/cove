# Cove 前端单元测试方案

**创建日期**: 2026-05-16  
**负责人**: FrontendEngineer  
**项目**: Cove AI Agent Collaboration Platform

---

## 1. 测试现状分析

### 1.1 当前测试覆盖情况

**已有测试文件**: 15 个
- Sidebar 组件: 6 个测试文件
- TopBar 组件: 6 个测试文件
- Hooks: 3 个测试文件

**测试结果**: 
- ✅ 通过: 73 个测试用例 (10 个测试文件)
- ❌ 失败: 13 个测试用例 (5 个测试文件)
- 总计: 86 个测试用例

**未覆盖的代码**:
- Features 组件: 41 个文件 (0% 覆盖)
- Shared 组件: 41 个文件 (约 30% 覆盖)
- Stores: 5 个文件 (0% 覆盖)
- Utils: 1 个文件 (0% 覆盖)
- Hooks: 4 个文件 (75% 覆盖)

### 1.2 失败测试分析

**失败原因**:
1. **TimeCapsule 测试** (6 个失败) - 时间相关测试，需要 mock Date 和 timer
2. **TokenPill 测试** (2 个失败) - 查询策略问题，需要调整测试选择器
3. **UserMenu 测试** (3 个失败) - 交互测试，需要正确 mock 导航和认证
4. **Logo 测试** (1 个失败) - 文本查询问题，需要调整查询策略
5. **Sidebar 测试** (1 个失败) - 组件渲染问题，需要完善 mock

---

## 2. 测试策略

### 2.1 测试金字塔

```
        /\
       /  \        E2E Tests (5%)
      /____\       - 关键用户流程
     /      \      
    /        \     Integration Tests (15%)
   /__________\    - 功能模块集成
  /            \   
 /              \  Unit Tests (80%)
/________________\ - 组件、Hooks、Utils
```

### 2.2 测试优先级

**P0 - 核心功能** (必须测试):
- 认证流程 (AuthGuard, Login)
- 消息发送和接收 (Composer, MessageList)
- Agent 管理 (AgentCard, AgentEditForm)
- Channel 导航 (ChannelTabs, ChannelList)
- 状态管理 (所有 Stores)

**P1 - 重要功能** (应该测试):
- Dashboard 数据展示
- 设置页面
- 搜索和过滤
- 通知系统
- 工具函数和 Hooks

**P2 - 辅助功能** (可选测试):
- 动画和过渡效果
- 主题切换
- 布局调整
- 装饰性组件

### 2.3 测试类型

#### 2.3.1 组件测试
- **渲染测试**: 验证组件正确渲染
- **交互测试**: 验证用户交互行为
- **状态测试**: 验证组件状态变化
- **Props 测试**: 验证不同 props 的表现
- **边界测试**: 验证边界情况和错误处理

#### 2.3.2 Hooks 测试
- **返回值测试**: 验证 hook 返回正确的值
- **副作用测试**: 验证 useEffect 等副作用
- **依赖测试**: 验证依赖变化时的行为
- **清理测试**: 验证组件卸载时的清理

#### 2.3.3 Store 测试
- **初始状态测试**: 验证初始状态正确
- **Action 测试**: 验证 action 正确更新状态
- **Selector 测试**: 验证 selector 返回正确数据
- **持久化测试**: 验证状态持久化 (如果有)

#### 2.3.4 Utils 测试
- **纯函数测试**: 验证输入输出关系
- **边界测试**: 验证边界值和异常情况
- **类型测试**: 验证类型安全

---

## 3. 测试规范

### 3.1 文件组织

```
src/
├── features/
│   └── agent/
│       ├── components/
│       │   ├── AgentCard.tsx
│       │   └── AgentCard.test.tsx          # 组件测试
│       ├── hooks/
│       │   ├── useAgentList.ts
│       │   └── useAgentList.test.ts        # Hook 测试
│       └── stores/
│           ├── agentStore.ts
│           └── agentStore.test.ts          # Store 测试
└── shared/
    ├── components/
    │   └── ui/
    │       ├── button.tsx
    │       └── button.test.tsx
    ├── hooks/
    │   ├── useNavigation.ts
    │   └── useNavigation.test.ts
    └── utils/
        ├── cn.ts
        └── cn.test.ts
```

### 3.2 命名规范

**测试文件**: `[ComponentName].test.tsx` 或 `[hookName].test.ts`

**测试套件**: 使用 `describe` 组织测试
```typescript
describe('ComponentName', () => {
  describe('Rendering', () => { ... });
  describe('Interactions', () => { ... });
  describe('Edge Cases', () => { ... });
});
```

**测试用例**: 使用 `it` 或 `test`，描述应该清晰
```typescript
it('should render with default props', () => { ... });
it('should call onClick when button is clicked', () => { ... });
it('should show error message when validation fails', () => { ... });
```

### 3.3 测试模式

#### 3.3.1 AAA 模式 (Arrange-Act-Assert)

```typescript
it('should update count when button is clicked', () => {
  // Arrange - 准备测试数据和环境
  const { getByRole } = render(<Counter initialCount={0} />);
  const button = getByRole('button', { name: /increment/i });
  
  // Act - 执行操作
  fireEvent.click(button);
  
  // Assert - 验证结果
  expect(screen.getByText('Count: 1')).toBeInTheDocument();
});
```

#### 3.3.2 Given-When-Then 模式

```typescript
it('should show error when form is submitted with empty fields', () => {
  // Given - 给定初始状态
  const onSubmit = vi.fn();
  render(<LoginForm onSubmit={onSubmit} />);
  
  // When - 当执行某个操作
  const submitButton = screen.getByRole('button', { name: /submit/i });
  fireEvent.click(submitButton);
  
  // Then - 那么应该得到某个结果
  expect(screen.getByText(/email is required/i)).toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();
});
```

### 3.4 Mock 策略

#### 3.4.1 API Mock (使用 MSW)

```typescript
// src/mocks/handlers/agent.ts
export const agentHandlers = [
  http.get('/api/agents', () => {
    return HttpResponse.json({
      agents: [
        { id: '1', name: 'Agent 1', status: 'active' },
        { id: '2', name: 'Agent 2', status: 'idle' },
      ],
    });
  }),
];
```

#### 3.4.2 Router Mock

```typescript
// src/test/test-utils.tsx
export function renderWithRouter(
  ui: React.ReactElement,
  { route = '/', ...options }: RenderOptions & { route?: string } = {}
) {
  window.history.pushState({}, 'Test page', route);
  return render(ui, {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[route]}>
        {children}
      </MemoryRouter>
    ),
    ...options,
  });
}
```

#### 3.4.3 Store Mock

```typescript
// 测试中 mock store
vi.mock('@/features/agent/stores/agentStore', () => ({
  useAgentStore: vi.fn(() => ({
    agents: mockAgents,
    fetchAgents: vi.fn(),
  })),
}));
```

#### 3.4.4 Hook Mock

```typescript
// 测试中 mock custom hook
vi.mock('@/shared/hooks/useNavigation', () => ({
  useNavigation: vi.fn(() => ({
    navigate: vi.fn(),
    goBack: vi.fn(),
  })),
}));
```

---

## 4. 测试实施计划

### 4.1 阶段一：修复现有失败测试 (1-2 天)

**目标**: 所有现有测试通过

**任务**:
1. 修复 TimeCapsule 测试 - mock Date 和 timer
2. 修复 TokenPill 测试 - 调整查询策略
3. 修复 UserMenu 测试 - 完善 mock
4. 修复 Logo 测试 - 调整文本查询
5. 修复 Sidebar 测试 - 完善组件 mock

### 4.2 阶段二：核心功能测试 (3-5 天)

**目标**: P0 核心功能 100% 覆盖

**任务**:
1. **认证模块** (auth)
   - [ ] AuthGuard.test.tsx
   - [ ] LoginPage.test.tsx (如果有)

2. **消息模块** (channel)
   - [ ] Composer.test.tsx
   - [ ] MessageList.test.tsx
   - [ ] MessageItem.test.tsx

3. **Agent 模块** (agent)
   - [ ] AgentCard.test.tsx
   - [ ] AgentEditForm.test.tsx
   - [ ] AgentList.test.tsx

4. **Channel 导航** (channel)
   - [ ] ChannelTabs.test.tsx
   - [ ] ChannelList.test.tsx
   - [ ] ChannelPanel.test.tsx

5. **状态管理** (stores)
   - [ ] agentStore.test.ts
   - [ ] channelStore.test.ts
   - [ ] messageStore.test.ts
   - [ ] loadingStore.test.ts
   - [ ] notificationStore.test.ts

### 4.3 阶段三：重要功能测试 (3-5 天)

**目标**: P1 重要功能 80% 覆盖

**任务**:
1. **Dashboard 模块**
   - [ ] DashboardPage.test.tsx
   - [ ] AgentStatusCard.test.tsx
   - [ ] ChannelActivityCard.test.tsx
   - [ ] TokenTrendCard.test.tsx

2. **设置模块**
   - [ ] SettingsPage.test.tsx
   - [ ] GeneralSettings.test.tsx
   - [ ] AppearanceSettings.test.tsx

3. **搜索和过滤**
   - [ ] SearchBar.test.tsx
   - [ ] FilterPanel.test.tsx

4. **Hooks**
   - [ ] useChannelNavigation.test.ts
   - [ ] useMessageList.test.ts

5. **Utils**
   - [ ] cn.test.ts
   - [ ] formatters.test.ts (如果有)

### 4.4 阶段四：辅助功能测试 (2-3 天)

**目标**: P2 辅助功能 50% 覆盖

**任务**:
1. UI 组件测试
2. 动画组件测试
3. 布局组件测试
4. 装饰性组件测试

### 4.5 阶段五：集成测试和 E2E 测试 (3-5 天)

**目标**: 关键用户流程覆盖

**任务**:
1. 用户登录流程
2. 创建和管理 Agent
3. 发送和接收消息
4. Channel 切换和导航
5. 设置修改和保存

---

## 5. 测试工具和配置

### 5.1 测试框架

- **Vitest**: 测试运行器
- **React Testing Library**: 组件测试
- **@testing-library/user-event**: 用户交互模拟
- **MSW**: API mock
- **@vitest/coverage-v8**: 代码覆盖率

### 5.2 测试配置

**vitest.config.ts**:
```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    pool: 'forks',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/mocks/',
        '**/*.d.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
```

### 5.3 测试脚本

**package.json**:
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest --watch"
  }
}
```

---

## 6. 测试最佳实践

### 6.1 DO - 应该做的

✅ **测试用户行为，而不是实现细节**
```typescript
// ✅ Good - 测试用户看到的内容
expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();

// ❌ Bad - 测试实现细节
expect(wrapper.find('.submit-button')).toHaveLength(1);
```

✅ **使用语义化查询**
```typescript
// 优先级顺序:
// 1. getByRole
// 2. getByLabelText
// 3. getByPlaceholderText
// 4. getByText
// 5. getByTestId (最后选择)
```

✅ **测试可访问性**
```typescript
it('should have proper aria labels', () => {
  render(<Button>Click me</Button>);
  const button = screen.getByRole('button', { name: /click me/i });
  expect(button).toHaveAccessibleName('Click me');
});
```

✅ **使用 userEvent 而不是 fireEvent**
```typescript
// ✅ Good - 更接近真实用户行为
await userEvent.click(button);
await userEvent.type(input, 'Hello');

// ❌ Bad - 低级 DOM 事件
fireEvent.click(button);
fireEvent.change(input, { target: { value: 'Hello' } });
```

✅ **等待异步操作完成**
```typescript
// ✅ Good
await waitFor(() => {
  expect(screen.getByText(/success/i)).toBeInTheDocument();
});

// ❌ Bad - 可能导致测试不稳定
expect(screen.getByText(/success/i)).toBeInTheDocument();
```

### 6.2 DON'T - 不应该做的

❌ **不要测试第三方库**
```typescript
// ❌ Bad - 不需要测试 React Router
it('should use React Router', () => {
  expect(useNavigate).toBeDefined();
});
```

❌ **不要过度 mock**
```typescript
// ❌ Bad - mock 太多，测试失去意义
vi.mock('./Component1');
vi.mock('./Component2');
vi.mock('./Component3');
// ... 测试变成了 mock 的测试
```

❌ **不要依赖测试执行顺序**
```typescript
// ❌ Bad - 测试之间有依赖
let sharedState;
it('test 1', () => { sharedState = 'value'; });
it('test 2', () => { expect(sharedState).toBe('value'); });
```

❌ **不要使用 snapshot 测试 UI**
```typescript
// ❌ Bad - snapshot 测试容易过时且难以维护
expect(wrapper).toMatchSnapshot();

// ✅ Good - 测试具体的行为和内容
expect(screen.getByText('Welcome')).toBeInTheDocument();
```

---

## 7. 覆盖率目标

### 7.1 总体目标

- **Lines**: ≥ 80%
- **Functions**: ≥ 80%
- **Branches**: ≥ 80%
- **Statements**: ≥ 80%

### 7.2 模块目标

| 模块 | 目标覆盖率 | 优先级 |
|------|-----------|--------|
| Core (auth, router) | 90% | P0 |
| Features (agent, channel, chat) | 85% | P0 |
| Shared Components | 80% | P1 |
| Stores | 90% | P0 |
| Hooks | 85% | P1 |
| Utils | 90% | P1 |
| UI Components | 70% | P2 |

---

## 8. 持续集成

### 8.1 CI 流程

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

### 8.2 Pre-commit Hook

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "vitest related --run"
    ]
  }
}
```

---

## 9. 维护和更新

### 9.1 测试维护原则

1. **新功能必须有测试**: 每个新功能 PR 必须包含相应的测试
2. **Bug 修复必须有测试**: 修复 bug 时，先写失败的测试，再修复
3. **重构时保持测试通过**: 重构代码时，测试应该继续通过
4. **定期审查测试**: 每月审查一次测试，删除过时的测试

### 9.2 测试文档

- 在 `docs/testing/` 目录下维护测试文档
- 记录复杂的测试场景和 mock 策略
- 更新测试最佳实践

---

## 10. 附录

### 10.1 常用测试工具函数

```typescript
// src/test/test-utils.tsx

// 渲染带 Router 的组件
export function renderWithRouter(ui: React.ReactElement, options?: RenderOptions) {
  return render(ui, {
    wrapper: ({ children }) => (
      <MemoryRouter>{children}</MemoryRouter>
    ),
    ...options,
  });
}

// 渲染带 Provider 的组件
export function renderWithProviders(ui: React.ReactElement, options?: RenderOptions) {
  return render(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={i18n}>
          {children}
        </I18nextProvider>
      </QueryClientProvider>
    ),
    ...options,
  });
}

// 等待加载完成
export async function waitForLoadingToFinish() {
  await waitForElementToBeRemoved(() => screen.queryByText(/loading/i));
}

// Mock 用户
export function mockUser(overrides = {}) {
  return {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    ...overrides,
  };
}
```

### 10.2 参考资源

- [React Testing Library 文档](https://testing-library.com/react)
- [Vitest 文档](https://vitest.dev/)
- [MSW 文档](https://mswjs.io/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**文档版本**: 1.0  
**最后更新**: 2026-05-16
