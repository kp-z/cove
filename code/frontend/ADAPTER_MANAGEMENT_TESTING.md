# Adapter Management Testing Guide

## 功能概述

Settings 页面的 Adapters 面板现已支持完整的 CRUD 功能：
- ✅ 创建新 Adapter
- ✅ 编辑现有 Adapter
- ✅ 删除 Adapter
- ✅ 查看 Adapter 列表（按 Shared/Private 分组）
- ✅ 设置默认 Adapter

## 测试步骤

### 1. 访问 Adapter 管理页面

1. 启动前端开发服务器（如果尚未运行）：
   ```bash
   npm run dev
   ```

2. 在浏览器中访问：`http://localhost:5175`

3. 登录后，点击左侧导航栏的 "Settings"

4. 在 Settings 页面，点击 "Adapters" 标签

### 2. 创建 Adapter

#### 测试场景 A: 创建 Anthropic API Adapter

1. 点击 "Create Adapter" 按钮
2. 填写表单：
   - Name: `My Anthropic Adapter`
   - Description: `Test adapter for Anthropic API`
   - Type: `Anthropic API`
   - Scope: `Private`
   - API Key: （可选，留空使用环境变量）
   - Base URL: （可选）
   - Model: `claude-sonnet-4-20250514`
   - Temperature: `0.7`
   - Max Tokens: `4096`
3. 点击 "Create" 按钮
4. **预期结果**：
   - 表单收起
   - 新 adapter 出现在 "Private Adapters" 列表中
   - 显示 adapter 名称、类型和模型信息

#### 测试场景 B: 创建 OpenAI API Adapter

1. 点击 "Create Adapter" 按钮
2. 填写表单：
   - Name: `My OpenAI Adapter`
   - Type: `OpenAI API`
   - Scope: `Shared`
   - Model: `gpt-4`
3. 点击 "Create" 按钮
4. **预期结果**：新 adapter 出现在 "Shared Adapters" 列表中

#### 测试场景 C: 创建 Claude Code CLI Adapter

1. 点击 "Create Adapter" 按钮
2. 填写表单：
   - Name: `My CLI Adapter`
   - Type: `Claude Code CLI`
   - CLI Path: `/usr/local/bin/claude`
   - Model: `claude-3-5-sonnet-20241022`
   - Context Window: `200000`
3. 点击 "Create" 按钮
4. **预期结果**：新 adapter 创建成功

### 3. 编辑 Adapter

1. 在 adapter 卡片上点击 "Edit" 按钮
2. **预期结果**：
   - 卡片展开，显示编辑表单
   - 表单字段预填充当前值
3. 修改字段（例如：更改 Model 或 Temperature）
4. 点击 "Save Changes" 按钮
5. **预期结果**：
   - 卡片收起
   - 显示更新后的信息

### 4. 删除 Adapter

**权限说明**：
- **Private Adapters**：只有创建者可以编辑和删除
- **Shared Adapters**：只有创建者可以编辑和删除，其他用户只能查看（显示 "Read-only" 标签）

**测试步骤**：

1. 在 adapter 卡片上点击 "Delete" 按钮（仅对自己创建的 adapter 可见）
2. **预期结果**：弹出确认对话框
3. 点击 "Delete" 确认删除
4. **预期结果**：
   - 按钮显示 "Deleting..." 并禁用
   - 删除完成后对话框自动关闭
   - Adapter 从列表中移除

**注意**：
- 删除操作是异步的，对话框会等待删除完成后才关闭，确保操作成功
- 如果尝试删除其他用户创建的 shared adapter，后端会返回权限错误
- 前端已隐藏其他用户创建的 shared adapter 的编辑和删除按钮，防止误操作

### 5. 设置默认 Adapter

1. 在 "Default Adapter" 下拉框中选择一个 adapter
2. **预期结果**：
   - 下方显示当前默认 adapter 的详细信息
   - 新创建的 agent 将使用此 adapter

### 6. 表单验证测试

#### 测试场景 A: 必填字段验证

1. 点击 "Create Adapter" 按钮
2. 不填写 Name 字段
3. 尝试点击 "Create" 按钮
4. **预期结果**：按钮应该是禁用状态（disabled）

#### 测试场景 B: 取消操作

1. 点击 "Create Adapter" 按钮
2. 填写部分字段
3. 点击 "Cancel" 按钮
4. **预期结果**：
   - 表单收起
   - 数据未保存

### 7. UI/UX 测试

#### 测试场景 A: 空状态

1. 如果没有任何 adapter
2. **预期结果**：显示 "No adapters found. Create one to get started."

#### 测试场景 B: 分组显示

1. 创建至少一个 Shared adapter 和一个 Private adapter
2. **预期结果**：
   - Shared adapters 显示在 "🌐 Shared Adapters" 下
   - Private adapters 显示在 "🔒 Private Adapters" 下

#### 测试场景 C: 加载状态

1. 在创建或编辑时观察按钮状态
2. **预期结果**：
   - 创建时按钮显示 "Creating..."
   - 编辑时按钮显示 "Saving..."
   - 按钮在操作期间禁用

### 8. 集成测试

#### 测试场景 A: Agent Edit 页面集成

1. 创建一个新 adapter
2. 导航到 Agent Edit 页面
3. 在 Runtime Adapter 部分查看 adapter 列表
4. **预期结果**：新创建的 adapter 出现在下拉列表中

#### 测试场景 B: 删除 adapter 后的影响

1. 删除一个 adapter
2. 导航到 Agent Edit 页面
3. **预期结果**：被删除的 adapter 不再出现在列表中

## 已知限制

1. **模型发现功能**：当前实现中，模型发现功能已集成但需要有效的 API Key 才能工作
2. **错误提示**：错误信息目前通过 console.error 输出，后续可以添加 toast 通知

## 技术实现细节

### 文件修改

- **主文件**：`frontend/src/features/settings/components/panels/AdaptersPanel.tsx`
- **新增功能**：
  - 状态管理（editingId, isCreating, deleteConfirmId, formData）
  - AdapterCard 组件（折叠/展开视图）
  - 动态配置字段渲染
  - CRUD 操作处理
  - 删除确认对话框

### 使用的组件和 Hooks

- **UI 组件**：Button, AlertDialog (Radix UI)
- **tRPC Hooks**：useAdapters, useCreateAdapter, useUpdateAdapter, useDeleteAdapter
- **图标**：Plus (Lucide React)

### 样式

- 使用玻璃态设计（glassmorphism）
- 与现有 Settings 面板保持一致的样式
- 响应式布局

## 后续优化建议

1. **Toast 通知**：添加成功/错误的 toast 通知
2. **模型发现 UI**：添加模型发现的加载状态和错误提示
3. **表单验证**：添加更详细的字段验证（如 URL 格式、数字范围等）
4. **国际化**：添加多语言支持
5. **动画效果**：添加卡片展开/收起的平滑动画
6. **搜索/过滤**：当 adapter 数量较多时，添加搜索功能
