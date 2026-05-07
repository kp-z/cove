# Cove

**AI Agent 协作平台**

Cove 是一个统一管理和编排 AI Agent 的协作平台，支持多 Agent 协同工作、工作流编排和任务管理。

## 特性

- 🤖 **Agent 管理** - 统一管理多个 AI Agent
- 📋 **任务编排** - 可视化工作流设计
- 👥 **团队协作** - 多 Agent 协同工作
- 📊 **实时监控** - 执行状态实时追踪
- 🔄 **框架集成** - 支持 Claude Code、OpenClaw 等框架

## 架构

```
01-entities/    (实体层 - 数据定义)
    ↓
02-runtime/     (运行时层 - 状态管理)
    ↓
03-backend/     (后端层 - API服务)
    ↓
04-frontend/    (前端层 - 用户界面)
```

## 技术栈

**后端**：
- Python 3.11 + FastAPI
- SQLAlchemy 2.0 (async)
- WebSocket 实时通信

**前端**：
- React 19 + TypeScript
- Tailwind CSS 4
- Vite 6

## 快速开始

```bash
# 克隆项目
git clone https://github.com/kp-z/cove.git
cd cove

# 后端启动
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python run.py

# 前端启动
cd frontend
npm install
npm run dev
```

## 文档

- [架构文档](docs/v4/architecture/)
- [开发指南](docs/development/)
- [API 文档](docs/api/)

## 开源协议

MIT License

---

Made with ❤️ by Cove Team
