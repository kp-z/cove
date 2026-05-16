# 开发文档

本目录包含 Cove 项目的开发环境配置、调试工具、问题修复等技术文档。

## 文档列表

### 调试与开发环境
- [debugging.md](./debugging.md) - Chrome DevTools + MCP 调试环境配置
  - Chrome 远程调试配置
  - MCP 服务器集成
  - 统一开发脚本
  - 调试工作流示例

### 问题修复
- [cors-fix.md](./cors-fix.md) - CORS 跨域问题修复说明
  - 问题描述和根本原因
  - 解决方案（OPTIONS 预检请求处理）
  - 验证步骤
  - 生产环境注意事项

## 使用指南

### 调试环境启动
```bash
# 启动完整开发环境（后端 + 前端 + Chrome 调试）
cd /Users/kp/项目/Proj/cove/code
bash scripts/dev-with-debug.sh
```

### 端口分配
- `5175` - Vite 前端开发服务器
- `3001` - Express + tRPC 后端服务器
- `9223` - Chrome 远程调试端口

## 相关资源

- [V4 架构文档](../v4/architecture/)
- [功能实现文档](../features/)
- [评估报告](../report/)
