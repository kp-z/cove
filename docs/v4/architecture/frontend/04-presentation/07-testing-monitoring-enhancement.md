# 测试与监控增强设计（Testing & Monitoring Enhancement）

> **版本**: v4.0  
> **日期**: 2026-05-07  
> **关键词**: `API契约测试`, `MSW`, `Zod`, `性能监控`, `Lighthouse CI`, `可访问性测试`, `axe-core`, `jest-axe`, `Playwright`

**本文档包含**:
- API 契约测试增强（基于 MSW + Zod）
- 性能监控配置（Lighthouse CI + 性能预算）
- 可访问性测试集成（axe-core 自动化测试）

**适用场景**:
- 实施 API 契约验证
- 配置 CI 性能回归测试
- 集成自动化可访问性测试

**相关文档**:
- [Presentation Layer](./frontend-layer.md) - 前端架构设计（已包含 MSW 基础和 Web Vitals 监控）
- [API Integration](./01-api-integration.md) - Backend Service ↔ Frontend Hook 映射

---

## 1. API 契约测试增强

### 1.1 设计目标

**问题**：
- 现有 MSW Mock 是手写的，容易与实际 API 不一致
- API 变更时，前端测试可能仍然通过，但生产环境会失败
- 缺少 API 响应格式的自动验证

**解决方案**：
- 从 OpenAPI 规范自动生成 MSW handlers
- 使用 Zod schema 验证 API 响应格式
- 在测试中检测 API 契约变更

**优势**：
- ✅ 基于现有 MSW，无需引入 Pact Broker
- ✅ 不需要 Backend 额外工作
- ✅ 学习成本低，维护简单

---

### 1.2 技术方案

#### 1.2.1 OpenAPI 规范驱动

**工作流**：
```
Backend OpenAPI Spec (openapi.yaml)
         ↓
  openapi-msw 生成器
         ↓
  MSW Handlers (自动生成)
         ↓
  Frontend 测试使用
```

**安装依赖**：
```bash
npm install -D openapi-msw zod zod-to-json-schema
```

**OpenAPI 规范示例**：
```yaml
# backend/openapi.yaml
openapi: 3.0.0
info:
  title: Claude Manager API
  version: 1.0.0
paths:
  /api/v1/channels/{channelId}/messages:
    get:
      summary: Get messages in a channel
      parameters:
        - name: channelId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok:
                    type: boolean
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Message'
                  meta:
                    $ref: '#/components/schemas/PaginationMeta'
components:
  schemas:
    Message:
      type: object
      required:
        - message_id
        - content
        - sender_type
        - created_at
      properties:
        message_id:
          type: string
        content:
          type: string
        sender_type:
          type: string
          enum: [human, agent, system]
        sender:
          $ref: '#/components/schemas/User'
        created_at:
          type: string
          format: date-time
```

---

#### 1.2.2 Zod Schema 验证

**定义 Zod Schema**：
```typescript
// shared/schemas/api.ts
import { z } from 'zod';

// 基础响应格式
export const APIResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    ok: z.boolean(),
    data: dataSchema.nullable(),
    error: z.string().optional(),
  });

// Message Schema
export const MessageSchema = z.object({
  message_id: z.string(),
  content: z.string(),
  sender_type: z.enum(['human', 'agent', 'system']),
  sender: z.object({
    user_id: z.string(),
    name: z.string(),
    avatar_url: z.string().optional(),
  }).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional(),
});

// Pagination Meta Schema
export const PaginationMetaSchema = z.object({
  total: z.number(),
  page: z.number().optional(),
  limit: z.number().optional(),
  has_more: z.boolean(),
  cursor: z.string().optional(),
});

// Get Messages Response Schema
export const GetMessagesResponseSchema = APIResponseSchema(
  z.object({
    messages: z.array(MessageSchema),
    meta: PaginationMetaSchema,
  })
);

// Type inference
export type Message = z.infer<typeof MessageSchema>;
export type GetMessagesResponse = z.infer<typeof GetMessagesResponseSchema>;
```

---

#### 1.2.3 增强型 MSW Handlers

**带验证的 MSW Handler**：
```typescript
// test/mocks/handlers.ts
import { rest } from 'msw';
import { GetMessagesResponseSchema, MessageSchema } from '@/shared/schemas/api';

// 辅助函数：验证响应格式
function validateResponse<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error('❌ Mock response validation failed:', result.error);
    throw new Error(`Mock response does not match schema: ${result.error.message}`);
  }
  return result.data;
}

export const handlers = [
  // 获取消息列表（带验证）
  rest.get('/api/v1/channels/:channelId/messages', (req, res, ctx) => {
    const mockResponse = {
      ok: true,
      data: {
        messages: [
          {
            message_id: 'msg-001',
            content: 'Hello from Alice',
            sender_type: 'human',
            sender: {
              user_id: 'user-001',
              name: 'Alice',
            },
            created_at: '2026-05-07T10:00:00Z',
          },
        ],
        meta: {
          total: 1,
          has_more: false,
        },
      },
    };

    // 验证 Mock 响应格式
    const validated = validateResponse(GetMessagesResponseSchema, mockResponse);

    return res(ctx.status(200), ctx.json(validated));
  }),

  // 发送消息（带验证）
  rest.post('/api/v1/channels/:channelId/messages', async (req, res, ctx) => {
    const body = await req.json();

    const mockResponse = {
      ok: true,
      data: {
        message_id: 'msg-new',
        content: body.content,
        sender_type: 'human',
        created_at: new Date().toISOString(),
      },
    };

    // 验证 Mock 响应格式
    const validated = validateResponse(
      APIResponseSchema(MessageSchema),
      mockResponse
    );

    return res(ctx.status(201), ctx.json(validated));
  }),
];
```

---

#### 1.2.4 API Client 集成验证

**在 API Client 中验证响应**：
```typescript
// lib/api-client.ts
import { z } from 'zod';

export class APIClient {
  async request<T>(
    url: string,
    options: RequestInit,
    schema?: z.ZodSchema<T>
  ): Promise<T> {
    const response = await fetch(url, options);
    const data = await response.json();

    // 如果提供了 schema，验证响应格式
    if (schema) {
      const result = schema.safeParse(data);
      if (!result.success) {
        console.error('❌ API response validation failed:', result.error);
        throw new APIError('VALIDATION_ERROR', 'Invalid API response format');
      }
      return result.data;
    }

    return data;
  }
}

// 使用示例
const client = new APIClient();
const response = await client.request(
  '/api/v1/channels/ch-001/messages',
  { method: 'GET' },
  GetMessagesResponseSchema // 传入 schema 进行验证
);
```

---

#### 1.2.5 契约测试

**编写契约测试**：
```typescript
// features/chat/api/__tests__/message-api.contract.test.ts
import { describe, it, expect } from 'vitest';
import { rest } from 'msw';
import { server } from '@/test/mocks/server';
import { messageAPI } from '../message-api';
import { GetMessagesResponseSchema } from '@/shared/schemas/api';

describe('Message API Contract Tests', () => {
  it('should match GetMessages response schema', async () => {
    // 使用真实 API 响应格式
    const response = await messageAPI.getMessages('ch-001');

    // 验证响应格式
    const result = GetMessagesResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('should detect schema violations', async () => {
    // 模拟 API 返回错误格式
    server.use(
      rest.get('/api/v1/channels/:channelId/messages', (req, res, ctx) => {
        return res(
          ctx.status(200),
          ctx.json({
            ok: true,
            data: {
              messages: [
                {
                  // 缺少 required 字段 message_id
                  content: 'Invalid message',
                },
              ],
            },
          })
        );
      })
    );

    // 应该抛出验证错误
    await expect(messageAPI.getMessages('ch-001')).rejects.toThrow(
      'Invalid API response format'
    );
  });
});
```

---

### 1.3 实施步骤

1. **定义 Zod Schemas**（1 天）
   - 为所有 API 响应定义 Zod schema
   - 从 Entity 定义生成 schema（可选）

2. **增强 MSW Handlers**（1 天）
   - 添加响应格式验证
   - 更新现有 handlers

3. **集成到 API Client**（0.5 天）
   - 在 API Client 中添加 schema 验证
   - 处理验证错误

4. **编写契约测试**（0.5 天）
   - 为核心 API 编写契约测试
   - 集成到 CI

**总工作量**：3 天

---

## 2. 性能监控配置

### 2.1 设计目标

**问题**：
- 现有 Web Vitals 监控代码存在，但未集成到 CI
- 缺少性能回归检测
- 性能预算未强制执行

**解决方案**：
- 配置 Lighthouse CI 在 PR 中运行
- 设置性能预算阈值
- 自动生成性能对比报告

**优势**：
- ✅ 不需要付费监控服务
- ✅ 基于现有 Lighthouse 配置
- ✅ 自动化，无需手动维护

---

### 2.2 Lighthouse CI 配置

#### 2.2.1 安装和配置

**安装**：
```bash
npm install -D @lhci/cli
```

**配置文件**：
```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview',
      url: [
        'http://localhost:4173/',
        'http://localhost:4173/chat',
        'http://localhost:4173/tasks',
        'http://localhost:4173/agents',
        'http://localhost:4173/okr',
      ],
      numberOfRuns: 3, // 运行 3 次取平均值
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        // 性能预算
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],

        // Core Web Vitals
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],

        // 资源大小
        'resource-summary:script:size': ['error', { maxNumericValue: 500000 }], // 500KB
        'resource-summary:stylesheet:size': ['error', { maxNumericValue: 100000 }], // 100KB
        'resource-summary:image:size': ['error', { maxNumericValue: 1000000 }], // 1MB
      },
    },
    upload: {
      target: 'temporary-public-storage', // 或使用 Lighthouse CI Server
    },
  },
};
```

---

#### 2.2.2 GitHub Actions 集成

**CI 配置**：
```yaml
# .github/workflows/lighthouse-ci.yml
name: Lighthouse CI

on:
  pull_request:
    branches: [main, develop]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}

      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: lighthouse-results
          path: .lighthouseci
```

---

#### 2.2.3 性能预算表

| 指标 | 目标值 | 警告阈值 | 错误阈值 |
|------|--------|----------|----------|
| **Performance Score** | >90 | 80-90 | <80 |
| **Accessibility Score** | >95 | 90-95 | <90 |
| **LCP** (Largest Contentful Paint) | <2.5s | 2.5-4s | >4s |
| **FID** (First Input Delay) | <100ms | 100-300ms | >300ms |
| **CLS** (Cumulative Layout Shift) | <0.1 | 0.1-0.25 | >0.25 |
| **FCP** (First Contentful Paint) | <1.8s | 1.8-3s | >3s |
| **TBT** (Total Blocking Time) | <200ms | 200-600ms | >600ms |
| **JavaScript Bundle** | <500KB | 500-800KB | >800KB |
| **CSS Bundle** | <100KB | 100-150KB | >150KB |
| **Images** | <1MB | 1-2MB | >2MB |

---

### 2.3 实施步骤

1. **配置 Lighthouse CI**（0.5 天）
   - 创建 `lighthouserc.js`
   - 设置性能预算

2. **集成到 GitHub Actions**（0.5 天）
   - 创建 CI workflow
   - 配置 PR 评论

**总工作量**：1 天

---

## 3. 可访问性测试集成

### 3.1 设计目标

**问题**：
- 缺少自动化可访问性测试
- 无法检测常见 a11y 问题（缺少 ARIA、色彩对比度不足）
- 无法确保 WCAG 2.1 AA 合规

**解决方案**：
- 集成 `jest-axe` 到单元测试
- 集成 `@axe-core/playwright` 到 E2E 测试
- 在 CI 中自动运行

**优势**：
- ✅ 自动检测常见 a11y 问题
- ✅ 集成到现有测试流程
- ✅ 无需额外培训

---

### 3.2 技术方案

#### 3.2.1 单元测试集成（jest-axe）

**安装**：
```bash
npm install -D jest-axe
```

**配置**：
```typescript
// test/setup.ts
import { toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);
```

**组件测试示例**：
```typescript
// features/chat/components/__tests__/MessageBubble.test.tsx
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { MessageBubble } from '../MessageBubble';

describe('MessageBubble Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(
      <MessageBubble
        message={{
          message_id: 'msg-001',
          content: 'Hello world',
          sender_type: 'human',
          sender: { user_id: 'user-001', name: 'Alice' },
          created_at: '2026-05-07T10:00:00Z',
        }}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper ARIA labels', () => {
    const { getByRole } = render(
      <MessageBubble
        message={{
          message_id: 'msg-001',
          content: 'Hello world',
          sender_type: 'human',
          sender: { user_id: 'user-001', name: 'Alice' },
          created_at: '2026-05-07T10:00:00Z',
        }}
      />
    );

    expect(getByRole('article')).toHaveAttribute('aria-label', 'Message from Alice');
  });
});
```

---

#### 3.2.2 E2E 测试集成（Playwright + axe-core）

**安装**：
```bash
npm install -D @axe-core/playwright
```

**E2E 测试示例**：
```typescript
// e2e/chat.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Chat Page Accessibility', () => {
  test('should have no accessibility violations', async ({ page }) => {
    await page.goto('/chat');

    // 等待页面加载完成
    await page.waitForSelector('[data-testid="chat-window"]');

    // 运行 axe 检查
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/chat');

    // Tab 键导航
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'message-input');

    // Enter 键发送消息
    await page.fill('[data-testid="message-input"]', 'Hello');
    await page.keyboard.press('Enter');

    // 验证消息已发送
    await expect(page.locator('[data-testid="message-bubble"]').last()).toContainText('Hello');
  });

  test('should have proper focus management in modals', async ({ page }) => {
    await page.goto('/chat');

    // 打开设置模态框
    await page.click('[data-testid="settings-button"]');

    // 焦点应该在模态框内
    await expect(page.locator(':focus')).toBeVisible();
    await expect(page.locator(':focus')).toHaveAttribute('role', 'dialog');

    // Escape 键关闭模态框
    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });
});
```

---

#### 3.2.3 CI 集成

**GitHub Actions 配置**：
```yaml
# .github/workflows/accessibility.yml
name: Accessibility Tests

on:
  pull_request:
    branches: [main, develop]

jobs:
  a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests with axe
        run: npm run test:unit

      - name: Run E2E tests with axe
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: accessibility-results
          path: test-results/
```

---

### 3.3 常见可访问性问题检查清单

**自动检测的问题**：
- ✅ 缺少 `alt` 属性的图片
- ✅ 色彩对比度不足
- ✅ 缺少 ARIA 标签
- ✅ 表单控件缺少 `label`
- ✅ 按钮缺少可访问名称
- ✅ 标题层级跳跃（h1 → h3）
- ✅ 重复的 `id` 属性
- ✅ 无效的 ARIA 属性

**需要手动测试的问题**（可选）：
- ⚠️ 屏幕阅读器体验（NVDA, JAWS, VoiceOver）
- ⚠️ 键盘导航完整性
- ⚠️ 焦点顺序合理性
- ⚠️ 动画和过渡对前庭障碍用户的影响

---

### 3.4 实施步骤

1. **集成 jest-axe**（0.5 天）
   - 安装和配置
   - 为核心组件添加 a11y 测试

2. **集成 Playwright axe**（0.5 天）
   - 安装和配置
   - 为关键页面添加 a11y 测试

3. **配置 CI**（0.5 天）
   - 创建 GitHub Actions workflow
   - 设置失败阈值

**总工作量**：1.5 天

---

## 4. 总结

### 4.1 实施优先级

| 任务 | 工作量 | 优先级 | 依赖 |
|------|--------|--------|------|
| API 契约测试（Zod Schema） | 3 天 | P1 | 无 |
| Lighthouse CI 配置 | 1 天 | P1 | 无 |
| 可访问性测试集成 | 1.5 天 | P1 | 无 |
| **总计** | **5.5 天** | - | - |

### 4.2 预期收益

**API 契约测试**：
- ✅ 提前发现 API 不兼容问题
- ✅ 减少生产环境 API 错误
- ✅ 提升前后端协作效率

**性能监控**：
- ✅ 防止性能回归
- ✅ 强制执行性能预算
- ✅ 提升用户体验

**可访问性测试**：
- ✅ 自动检测常见 a11y 问题
- ✅ 确保 WCAG 2.1 AA 合规
- ✅ 扩大用户覆盖范围

### 4.3 维护成本

- **API 契约测试**：低（Zod schema 随 API 变更更新）
- **性能监控**：极低（自动化运行）
- **可访问性测试**：低（集成到现有测试流程）

---

## 5. 参考资料

- [MSW Documentation](https://mswjs.io/)
- [Zod Documentation](https://zod.dev/)
- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)
- [jest-axe Documentation](https://github.com/nickcolley/jest-axe)
- [axe-core Playwright Documentation](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
