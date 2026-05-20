"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeCodeCLIAdapter = void 0;
const child_process_1 = require("child_process");
class ClaudeCodeCLIAdapter {
    cliPath;
    model;
    workingDir;
    timeout;
    constructor(cliPath, model, workingDir, timeout) {
        this.cliPath = cliPath || 'claude';
        this.model = model || 'opus';
        this.workingDir = workingDir || process.cwd();
        this.timeout = timeout || 120000; // 默认 2 分钟超时
    }
    async generateResponse(params) {
        // 构建完整的 prompt（系统提示 + 消息历史）
        const fullPrompt = this.buildPrompt(params);
        // 构建 CLI 参数
        const args = [
            '-p', // print mode
            '--output-format=json',
            '--bare', // 最小化模式
            '--model', this.model,
            '--no-session-persistence', // 不保存会话
        ];
        // 如果有系统提示，添加 --system-prompt
        if (params.systemPrompt) {
            args.push('--system-prompt', params.systemPrompt);
        }
        // 添加 prompt 作为最后一个参数
        args.push(fullPrompt);
        try {
            const output = await this.executeCli(args);
            return this.parseOutput(output);
        }
        catch (error) {
            throw new Error(`Claude CLI execution failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    buildPrompt(params) {
        // 将消息历史拼接为单个 prompt
        return params.messages
            .map(msg => {
            const role = msg.role === 'user' ? 'User' : 'Assistant';
            return `${role}: ${msg.content}`;
        })
            .join('\n\n');
    }
    executeCli(args) {
        return new Promise((resolve, reject) => {
            let stdout = '';
            let stderr = '';
            const child = (0, child_process_1.spawn)(this.cliPath, args, {
                cwd: this.workingDir,
                env: process.env,
            });
            // 设置超时
            const timeoutId = setTimeout(() => {
                child.kill('SIGTERM');
                reject(new Error(`CLI execution timeout after ${this.timeout}ms`));
            }, this.timeout);
            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            child.on('error', (error) => {
                clearTimeout(timeoutId);
                reject(new Error(`Failed to spawn CLI: ${error.message}`));
            });
            child.on('close', (code) => {
                clearTimeout(timeoutId);
                if (code !== 0) {
                    reject(new Error(`CLI exited with code ${code}. stderr: ${stderr}`));
                    return;
                }
                resolve(stdout);
            });
        });
    }
    parseOutput(output) {
        try {
            const parsed = JSON.parse(output.trim());
            if (parsed.type !== 'result') {
                throw new Error(`Unexpected output type: ${parsed.type}`);
            }
            if (!parsed.result) {
                throw new Error('No result in CLI output');
            }
            return parsed.result;
        }
        catch (error) {
            if (error instanceof SyntaxError) {
                throw new Error(`Failed to parse CLI output as JSON: ${error.message}`);
            }
            throw error;
        }
    }
}
exports.ClaudeCodeCLIAdapter = ClaudeCodeCLIAdapter;
