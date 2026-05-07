# errors.jsonl 示例

**文件路径**: `agents/{agent_id}/memory/errors.jsonl`

**说明**: 结构化错误日志，记录 Agent 运行过程中遇到的错误及解决方案。每行一个 JSON 对象，便于追加写入和流式读取。

## 格式定义

```jsonl
{"error_id":"err-001","timestamp":"2026-05-02T10:30:00Z","level":"error","category":"tool_error","tool_name":"Bash","error_type":"CommandFailed","error_message":"npm install failed: ENOENT","context":{"task_id":"task-001","execution_id":"exec-001","file_path":"package.json"},"resolution":{"status":"resolved","method":"auto","action":"Created missing package.json with default config","resolved_at":"2026-05-02T10:31:00Z"},"meta":{"retry_count":1,"recovered":true}}
{"error_id":"err-002","timestamp":"2026-05-02T11:15:00Z","level":"warning","category":"rate_limit","tool_name":null,"error_type":"RateLimitExceeded","error_message":"API rate limit reached: 60 requests/min","context":{"task_id":"task-001","execution_id":"exec-001","api_endpoint":"https://api.anthropic.com/v1/messages"},"resolution":{"status":"resolved","method":"auto","action":"Waited 60s and retried with exponential backoff","resolved_at":"2026-05-02T11:16:00Z"},"meta":{"retry_count":2,"recovered":true}}
{"error_id":"err-003","timestamp":"2026-05-03T09:00:00Z","level":"error","category":"file_access","tool_name":"Read","error_type":"PermissionDenied","error_message":"Cannot read file: /etc/shadow - Permission denied","context":{"task_id":"task-005","execution_id":"exec-003","file_path":"/etc/shadow"},"resolution":{"status":"resolved","method":"manual","action":"User confirmed file is not needed, skipped","resolved_at":"2026-05-03T09:05:00Z"},"meta":{"retry_count":0,"recovered":true}}
{"error_id":"err-004","timestamp":"2026-05-03T14:20:00Z","level":"critical","category":"context_overflow","tool_name":null,"error_type":"ContextWindowExceeded","error_message":"Context window 95% full, auto-compaction triggered","context":{"task_id":"task-008","execution_id":"exec-005","tokens_used":190000,"max_tokens":200000},"resolution":{"status":"resolved","method":"auto","action":"Structured compaction performed, archived to memory/diary/2026-05-03.md","resolved_at":"2026-05-03T14:20:30Z"},"meta":{"retry_count":0,"recovered":true}}
{"error_id":"err-005","timestamp":"2026-05-04T08:45:00Z","level":"error","category":"network","tool_name":"WebFetch","error_type":"TimeoutError","error_message":"Request timeout after 30s: https://api.github.com/repos/owner/repo/pulls","context":{"task_id":"task-012","execution_id":"exec-007","url":"https://api.github.com/repos/owner/repo/pulls"},"resolution":{"status":"unresolved","method":null,"action":null,"resolved_at":null},"meta":{"retry_count":3,"recovered":false}}
```

## 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| error_id | string | ✅ | 错误唯一标识 |
| timestamp | ISO 8601 | ✅ | 错误发生时间 |
| level | enum | ✅ | 严重级别: warning / error / critical |
| category | string | ✅ | 错误分类: tool_error / rate_limit / file_access / context_overflow / network / logic_error |
| tool_name | string | ❌ | 触发错误的工具名称 |
| error_type | string | ✅ | 错误类型标识 |
| error_message | string | ✅ | 人类可读的错误描述 |
| context | object | ✅ | 错误上下文（task_id, execution_id, 相关路径等） |
| resolution | object | ✅ | 解决方案（status, method, action, resolved_at） |
| meta | object | ❌ | 扩展元数据（重试次数、是否恢复等） |

## 使用场景

1. **错误模式识别**: 分析高频错误类型，优化 Agent 行为
2. **自动恢复学习**: 记录成功的恢复策略，下次遇到相同错误时自动应用
3. **健康监控**: 统计错误率，触发告警
4. **调试辅助**: 快速定位历史问题和解决方案
