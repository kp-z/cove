# Cove Deployment

Cove 项目的部署工具和配置集合。

## 目录结构

```
deploy/
├── cloud/                    # Cloud 部署（Docker）
│   ├── cli/                  # cove-deploy CLI 工具
│   ├── schemas/              # JSON Schema 验证
│   ├── templates/            # 配置模板
│   ├── docs/                 # 文档
│   └── README.md
├── local/                    # Local Agent 部署（npm）
│   └── README.md
└── README.md                 # 本文件
```

## Cloud 部署

Cloud Backend + Frontend 使用 Docker 容器化部署。

**特点**：
- 基于协议驱动的配置文件（`cove.deploy.json`）
- 自动生成 Dockerfile 和 Nginx 配置
- 支持健康检查和日志管理
- 适合部署到云服务器或本地 Docker 环境

**快速开始**：
```bash
# 安装 CLI 工具
cd deploy/cloud/cli
npm install && npm run build && npm link

# 在 Cloud 项目中部署
cd code/cloud
cove-deploy deploy
```

详见 [cloud/README.md](./cloud/README.md)

## Local Agent 部署

Local Agent 发布到 npm，用户通过 npx 或全局安装使用。

**特点**：
- 发布到 npm registry
- 支持 `npx @cove/local` 直接运行
- 支持全局安装 `npm install -g @cove/local`
- 自动配置管理

**快速开始**：
```bash
# 发布到 npm
cd code/local
npm publish --access public

# 用户安装使用
npx @cove/local
```

详见 [local/README.md](./local/README.md)

## 部署对比

| 特性 | Cloud | Local |
|------|-------|-------|
| 部署方式 | Docker 容器 | npm 包 |
| 目标环境 | 云服务器 | 用户本地机器 |
| 安装方式 | `cove-deploy` CLI | `npx @cove/local` |
| 配置文件 | `cove.deploy.json` | `~/.cove/config.json` |
| 更新方式 | 重新构建镜像 | `npm update` |
| 适用场景 | 中心化服务 | 分布式 Agent |

## 开发工作流

### Cloud 开发和部署

```bash
# 1. 开发
cd code/cloud/backend
npm run dev

# 2. 测试
npm test

# 3. 构建
npm run build

# 4. 部署
cd ../
cove-deploy deploy
```

### Local 开发和发布

```bash
# 1. 开发
cd code/local
npm run dev

# 2. 测试
npm test

# 3. 构建
npm run build

# 4. 发布
npm version patch
npm publish
```

## CI/CD

推荐使用 GitHub Actions 自动化部署：

- **Cloud**: 推送到 main 分支时自动构建 Docker 镜像
- **Local**: 创建 tag 时自动发布到 npm

详见各子目录的 README 文档。

## License

MIT
