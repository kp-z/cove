# Chrome DevTools + MCP 调试环境

## 概述

已成功集成 Chrome DevTools Protocol (CDP) 和 Model Context Protocol (MCP)，使 Claude 能够直接调试 Cove 前端应用。

## 已完成的配置

### 1. Chrome 调试启动脚本
- **位置**: `frontend/scripts/dev-debug.sh`
- **功能**: 启动带远程调试的 Chrome 实例
- **端口**: 9223
- **CDP 端点**: http://localhost:9223/json

### 2. MCP 服务器配置
- **配置文件**: `frontend/.mcp.json`
- **服务器**: `@modelcontextprotocol/server-chrome-devtools`
- **环境变量**: `CHROME_REMOTE_DEBUGGING_PORT=9223`

### 3. Vite Source Maps
- **配置文件**: `frontend/vite.config.ts`
- **已启用**: `build.sourcemap: true`

### 4. 统一开发脚本
- **位置**: `scripts/dev-with-debug.sh`
- **功能**: 一键启动前端、后端和 Chrome 调试环境

### 5. 权限配置
- **配置文件**: `frontend/.claude/settings.local.json`
- **已添加权限**:
  - `Bash(bash */scripts/dev-debug.sh)`
  - `Bash(lsof -ti:9223)`
  - `mcp__chrome-devtools__*`

## 使用方法

### 方式 1: 仅启动 Chrome 调试

```bash
cd frontend
bash scripts/dev-debug.sh
```

### 方式 2: 启动完整开发环境

```bash
cd /Users/kp/项目/Proj/cove/code
bash scripts/dev-with-debug.sh
```

这将启动：
- 后端服务器 (http://localhost:3001)
- 前端开发服务器 (http://localhost:5175)
- Chrome 调试实例 (CDP: http://localhost:9223)

## 验证

### 检查 CDP 端点

```bash
curl http://localhost:9223/json
```

应该返回可调试的 targets 列表。

### 检查 Chrome 进程

```bash
lsof -ti:9223
```

应该返回 Chrome 进程 ID。

## Claude 调试能力

现在 Claude 可以通过 Chrome DevTools MCP 服务器执行以下操作：

1. **浏览器导航**: 打开页面、刷新、前进/后退
2. **元素交互**: 点击、输入、滚动
3. **截图**: 捕获当前视口或整页
4. **控制台**: 读取控制台日志和错误
5. **JavaScript 执行**: 在页面上下文中执行代码
6. **网络监控**: 查看网络请求和响应
7. **性能分析**: 运行 Lighthouse 审计

## 调试工作流示例

### 场景 1: 调试前端错误

```
用户: "频道面板打不开"

Claude 可以:
1. 打开 http://localhost:5175
2. 捕获控制台错误
3. 执行 JS 检查 Zustand store 状态
4. 截图确认 UI 状态
5. 分析并建议修复
```

### 场景 2: 性能调查

```
用户: "应用感觉很慢"

Claude 可以:
1. 运行 Lighthouse 性能审计
2. 分析网络请求时序
3. 检查 React 渲染性能
4. 识别瓶颈并建议优化
```

## 端口分配

- `5175` - Vite 前端开发服务器
- `3001` - Express + tRPC 后端服务器
- `9222` - Playwright MCP (已占用)
- `9223` - Cove Chrome 调试 (新增)

## 安全注意事项

- ✅ 仅限开发环境使用
- ✅ 使用独立 Chrome 配置文件 (`/tmp/cove-chrome-debug-profile`)
- ✅ 调试端口仅限 localhost
- ⚠️ 生产环境永不启用远程调试

## 故障排除

### Chrome 无法启动

```bash
# 清理已有实例
lsof -ti:9223 | xargs kill -9

# 重新启动
bash frontend/scripts/dev-debug.sh
```

### MCP 服务器未连接

1. 确认 `.mcp.json` 配置正确
2. 重启 Claude Code 会话
3. 检查权限配置

### CDP 端点无响应

```bash
# 检查 Chrome 进程
ps aux | grep chrome | grep 9223

# 验证端点
curl http://localhost:9223/json
```

## 下一步

可以考虑的增强功能：

1. **React DevTools 集成** - 深度检查组件树
2. **后端 Node.js 调试** - 调试 tRPC 过程
3. **自动化错误模式识别** - AI 驱动的错误分析
4. **可视化回归测试** - 截图对比
5. **实时性能监控** - 持续性能追踪

## 参考资料

- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [Chrome DevTools MCP Server](https://github.com/ChromeDevTools/chrome-devtools-mcp)
- [Model Context Protocol](https://modelcontextprotocol.io/)
