# Local Agent Deployment

Local Agent 的 npm 发布和安装配置。

## 特性

- ✅ **npm 发布**：发布到 npm registry，支持 npx 直接运行
- ✅ **全局安装**：支持 `npm install -g @cove/local`
- ✅ **配置管理**：自动生成和管理配置文件
- ✅ **自动更新**：支持版本检查和自动更新提示

## 发布流程

### 1. 准备发布

确保 `code/local/package.json` 配置正确：

```json
{
  "name": "@cove/local",
  "version": "0.1.0",
  "description": "Cove Local Agent - Connect your local machine to Cove Cloud",
  "main": "dist/main.js",
  "bin": {
    "cove-local": "dist/main.js"
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "prepublishOnly": "npm run build && npm test"
  }
}
```

### 2. 发布到 npm

```bash
cd code/local

# 登录 npm（首次）
npm login

# 发布
npm publish --access public
```

### 3. 版本管理

```bash
# 补丁版本（bug 修复）
npm version patch

# 小版本（新功能）
npm version minor

# 大版本（破坏性更改）
npm version major

# 发布新版本
npm publish
```

## 用户安装方式

### 方式 1：npx 直接运行（推荐）

```bash
# 首次运行会自动安装
npx @cove/local

# 指定配置文件
npx @cove/local --config /path/to/config.json
```

### 方式 2：全局安装

```bash
# 安装
npm install -g @cove/local

# 运行
cove-local

# 更新
npm update -g @cove/local

# 卸载
npm uninstall -g @cove/local
```

### 方式 3：本地安装

```bash
# 在项目中安装
npm install @cove/local

# 运行
npx cove-local
```

## 配置文件

Local Agent 会在首次运行时引导用户创建配置文件：

```json
{
  "cloudUrl": "ws://localhost:3002",
  "deviceId": "auto-generated-uuid",
  "deviceName": "My MacBook Pro",
  "apiKey": "wn_xxxxxxxxxxxxxxxx",
  "maxConcurrentTasks": 3,
  "logLevel": "info"
}
```

配置文件位置：
- macOS/Linux: `~/.cove/config.json`
- Windows: `%USERPROFILE%\.cove\config.json`

## 开发

```bash
cd code/local

# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 测试
npm test

# 本地测试 CLI
npm link
cove-local --help
```

## 发布检查清单

- [ ] 更新版本号（`npm version`）
- [ ] 更新 CHANGELOG.md
- [ ] 运行测试（`npm test`）
- [ ] 构建成功（`npm run build`）
- [ ] 检查打包内容（`npm pack --dry-run`）
- [ ] 发布到 npm（`npm publish`）
- [ ] 验证安装（`npx @cove/local --version`）
- [ ] 更新文档

## 自动化发布

可以使用 GitHub Actions 自动发布：

```yaml
# .github/workflows/publish-local.yml
name: Publish Local Agent

on:
  push:
    tags:
      - 'local-v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - run: cd code/local && npm ci
      - run: cd code/local && npm run build
      - run: cd code/local && npm test
      - run: cd code/local && npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## License

MIT
