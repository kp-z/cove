import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { validateDeployConfig, loadDeployConfig, type DeployConfig } from '../validators/protocol-validator';
import { waitForHealth, replaceEnvVars } from '../utils/helpers';

export interface DeployOptions {
  config: string;
  skipValidation?: boolean;
  skipBuild?: boolean;
  env?: string;
}

export async function deployCommand(options: DeployOptions): Promise<void> {
  const configPath = path.resolve(process.cwd(), options.config);

  console.log('\n🚀 Cove 部署工具\n');

  // 1. Validate configuration
  if (!options.skipValidation) {
    console.log('🔍 验证配置文件...');
    const validation = validateDeployConfig(configPath);

    if (!validation.valid) {
      console.error('❌ 配置验证失败：');
      validation.errors.forEach(err => {
        console.error(`  - ${err}`);
      });
      process.exit(1);
    }

    console.log('✅ 配置验证通过\n');
  }

  // 2. Load configuration
  const config = loadDeployConfig(configPath);

  // 3. Load environment variables
  const env = loadEnvFile(options.env);

  // 4. Deploy based on type
  if (config.type === 'backend') {
    await deployBackend(config, env);
  } else if (config.type === 'frontend') {
    await deployFrontend(config, env);
  }
}

async function deployBackend(config: DeployConfig, env: Record<string, string>): Promise<void> {
  console.log('🔧 部署后端服务\n');

  // 1. Build
  console.log('📦 构建项目...');
  try {
    execSync(config.build.command, {
      stdio: 'inherit',
      env: { ...process.env, ...config.build.env, ...env }
    });
    console.log('✅ 构建完成\n');
  } catch (error) {
    console.error('❌ 构建失败');
    process.exit(1);
  }

  // 2. Generate Dockerfile
  console.log('🐳 生成 Dockerfile...');
  const dockerfile = generateBackendDockerfile(config);
  fs.writeFileSync('Dockerfile', dockerfile);
  console.log('✅ Dockerfile 已生成\n');

  // 3. Build Docker image
  console.log('🔨 构建 Docker 镜像...');
  try {
    execSync('docker build -t cove-backend:latest .', { stdio: 'inherit' });
    console.log('✅ Docker 镜像构建完成\n');
  } catch (error) {
    console.error('❌ Docker 镜像构建失败');
    process.exit(1);
  }

  // 4. Stop existing container if running
  try {
    execSync('docker stop cove-backend 2>/dev/null || true', { stdio: 'ignore' });
    execSync('docker rm cove-backend 2>/dev/null || true', { stdio: 'ignore' });
  } catch (error) {
    // Ignore errors
  }

  // 5. Start container
  console.log('🚀 启动服务...');
  const envArgs = Object.entries({ ...config.start?.env, ...env })
    .map(([key, value]) => `-e ${key}="${value}"`)
    .join(' ');

  const port = config.start!.port;
  const dockerRunCmd = `docker run -d --name cove-backend -p ${port}:${port} ${envArgs} cove-backend:latest`;

  try {
    execSync(dockerRunCmd, { stdio: 'inherit' });
    console.log('✅ 服务启动成功\n');
  } catch (error) {
    console.error('❌ 服务启动失败');
    process.exit(1);
  }

  // 6. Health check
  console.log('⏳ 等待服务就绪...');
  const healthUrl = `http://localhost:${port}${config.health!.endpoint}`;
  const timeout = config.health!.timeout || 30;

  const healthy = await waitForHealth(healthUrl, timeout);

  if (healthy) {
    console.log('✅ 服务就绪\n');
    console.log('✅ 后端部署成功！\n');
    console.log(`🌐 服务地址: http://localhost:${port}`);
    console.log(`💚 健康检查: ${healthUrl}`);
    console.log(`📋 查看日志: docker logs -f cove-backend\n`);
  } else {
    console.error('❌ 健康检查超时');
    console.error('📋 查看日志: docker logs cove-backend');
    process.exit(1);
  }
}

async function deployFrontend(config: DeployConfig, env: Record<string, string>): Promise<void> {
  console.log('🎨 部署前端应用\n');

  // 1. Build
  console.log('📦 构建项目...');
  try {
    execSync(config.build.command, {
      stdio: 'inherit',
      env: { ...process.env, ...config.build.env, ...env }
    });
    console.log('✅ 构建完成\n');
  } catch (error) {
    console.error('❌ 构建失败');
    process.exit(1);
  }

  // 2. Generate Nginx config
  console.log('⚙️  生成 Nginx 配置...');
  const nginxConf = generateNginxConfig(config);
  fs.writeFileSync('nginx.conf', nginxConf);
  console.log('✅ Nginx 配置已生成\n');

  // 3. Generate Dockerfile
  console.log('🐳 生成 Dockerfile...');
  const dockerfile = generateFrontendDockerfile(config);
  fs.writeFileSync('Dockerfile', dockerfile);
  console.log('✅ Dockerfile 已生成\n');

  // 4. Build Docker image
  console.log('🔨 构建 Docker 镜像...');
  try {
    execSync('docker build -t cove-frontend:latest .', { stdio: 'inherit' });
    console.log('✅ Docker 镜像构建完成\n');
  } catch (error) {
    console.error('❌ Docker 镜像构建失败');
    process.exit(1);
  }

  // 5. Stop existing container if running
  try {
    execSync('docker stop cove-frontend 2>/dev/null || true', { stdio: 'ignore' });
    execSync('docker rm cove-frontend 2>/dev/null || true', { stdio: 'ignore' });
  } catch (error) {
    // Ignore errors
  }

  // 6. Start container
  console.log('🚀 启动服务...');
  const port = config.serve!.port || 80;

  try {
    execSync(
      `docker run -d --name cove-frontend -p ${port}:80 cove-frontend:latest`,
      { stdio: 'inherit' }
    );
    console.log('✅ 服务启动成功\n');
  } catch (error) {
    console.error('❌ 服务启动失败');
    process.exit(1);
  }

  console.log('✅ 前端部署成功！\n');
  console.log(`🌐 访问地址: http://localhost:${port}`);
  console.log(`📋 查看日志: docker logs -f cove-frontend\n`);
}

function generateBackendDockerfile(config: DeployConfig): string {
  const { runtime, build, start } = config;

  return `
# Generated by Cove Deploy Toolkit
FROM node:${runtime.version}-alpine

WORKDIR /app

# Copy build output
COPY ${build.outputDir} ./dist
COPY package.json ./

# Install production dependencies
RUN npm install --production

# Expose port
EXPOSE ${start!.port}

# Start command
CMD ${JSON.stringify(start!.command.split(' '))}
`.trim();
}

function generateFrontendDockerfile(config: DeployConfig): string {
  const { build } = config;

  return `
# Generated by Cove Deploy Toolkit
FROM nginx:alpine

# Copy build output
COPY ${build.outputDir} /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
`.trim();
}

function generateNginxConfig(config: DeployConfig): string {
  const spaConfig = config.serve!.spa ? `
  location / {
    try_files $uri $uri/ /index.html;
  }
  ` : `
  location / {
    try_files $uri $uri/ =404;
  }
  `;

  const headers = config.serve!.headers || {};
  const headerLines = Object.entries(headers)
    .map(([key, value]) => `    add_header ${key} "${value}";`)
    .join('\n');

  return `
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;

${headerLines}

${spaConfig}
}
`.trim();
}

function loadEnvFile(envPath?: string): Record<string, string> {
  if (!envPath) {
    return {};
  }

  const fullPath = path.resolve(process.cwd(), envPath);

  if (!fs.existsSync(fullPath)) {
    console.warn(`⚠️  环境变量文件不存在: ${fullPath}`);
    return {};
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  const env: Record<string, string> = {};

  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();

      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      env[key] = value;
    }
  });

  return env;
}
