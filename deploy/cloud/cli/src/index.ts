#!/usr/bin/env node

import { Command } from 'commander';
import { deployCommand } from './commands/deploy';

const program = new Command();

program
  .name('cove-deploy')
  .description('Cove 部署工具 - 基于协议的前后端自动部署')
  .version('1.0.0');

// Deploy command
program
  .command('deploy')
  .description('部署项目到本地 Docker 环境')
  .option('-c, --config <path>', '配置文件路径', 'cove.deploy.json')
  .option('--skip-validation', '跳过配置验证')
  .option('--skip-build', '跳过构建步骤')
  .option('-e, --env <file>', '环境变量文件路径')
  .action(async (options) => {
    try {
      await deployCommand(options);
    } catch (error: any) {
      console.error('\n❌ 部署失败:', error.message);
      process.exit(1);
    }
  });

// Stop command
program
  .command('stop')
  .description('停止运行中的服务')
  .option('-t, --type <type>', '服务类型 (backend|frontend|all)', 'all')
  .action((options) => {
    const { execSync } = require('child_process');

    console.log('\n🛑 停止服务...\n');

    if (options.type === 'backend' || options.type === 'all') {
      try {
        execSync('docker stop cove-backend', { stdio: 'inherit' });
        execSync('docker rm cove-backend', { stdio: 'inherit' });
        console.log('✅ 后端服务已停止');
      } catch (error) {
        console.log('⚠️  后端服务未运行');
      }
    }

    if (options.type === 'frontend' || options.type === 'all') {
      try {
        execSync('docker stop cove-frontend', { stdio: 'inherit' });
        execSync('docker rm cove-frontend', { stdio: 'inherit' });
        console.log('✅ 前端服务已停止');
      } catch (error) {
        console.log('⚠️  前端服务未运行');
      }
    }

    console.log();
  });

// Logs command
program
  .command('logs')
  .description('查看服务日志')
  .option('-t, --type <type>', '服务类型 (backend|frontend)', 'backend')
  .option('-f, --follow', '实时跟踪日志')
  .action((options) => {
    const { execSync } = require('child_process');

    const containerName = options.type === 'backend' ? 'cove-backend' : 'cove-frontend';
    const followFlag = options.follow ? '-f' : '';
    const cmd = followFlag ? `docker logs -f ${containerName}` : `docker logs ${containerName}`;

    try {
      execSync(cmd, { stdio: 'inherit' });
    } catch (error) {
      console.error(`❌ 无法获取日志，容器 ${containerName} 可能未运行`);
      process.exit(1);
    }
  });

// Validate command
program
  .command('validate')
  .description('验证配置文件')
  .option('-c, --config <path>', '配置文件路径', 'cove.deploy.json')
  .action((options) => {
    const path = require('path');
    const { validateDeployConfig } = require('./validators/protocol-validator');

    const configPath = path.resolve(process.cwd(), options.config);

    console.log('\n🔍 验证配置文件...\n');

    const result = validateDeployConfig(configPath);

    if (result.valid) {
      console.log('✅ 配置验证通过\n');
    } else {
      console.error('❌ 配置验证失败：\n');
      result.errors.forEach((err: string) => {
        console.error(`  - ${err}`);
      });
      console.log();
      process.exit(1);
    }
  });

program.parse();
