# OpenClaw Gateway 配置 (gateway.yaml)

**文件路径**: `runtime/openclaw_gateway/gateway.yaml`

**说明**: OpenClaw Gateway 配置文件，定义网关的监听地址、路由规则、认证配置、限流策略。Gateway 是 Runtime 层与外部系统的桥梁。

---

## 与 Entity 层的对应关系

| Runtime 层 | Entity 层 | 说明 |
|---|---|---|
| `gateway.routes[]` | `agents/{id}/runtime.yaml` | 路由规则对应 Agent 的运行时配置 |
| `gateway.auth` | `agents/{id}/config/plugins.yaml` | 认证配置与 Plugin 权限相关 |

---

## 字段说明

### 网关基础配置
- `gateway.host`: 监听地址（如 `0.0.0.0`）
- `gateway.port`: 监听端口（如 `8080`）
- `gateway.protocol`: 协议（http/https）
- `gateway.tls.enabled`: 是否启用 TLS
- `gateway.tls.cert_file`: TLS 证书文件路径
- `gateway.tls.key_file`: TLS 私钥文件路径

### 路由规则
- `gateway.routes[]`: 路由规则列表
  - `path`: 路由路径（如 `/api/agents/{agent_id}/execute`）
  - `method`: HTTP 方法（GET/POST/PUT/DELETE）
  - `handler`: 处理器名称（execute_agent/export_state/import_state）
  - `auth_required`: 是否需要认证
  - `rate_limit`: 限流配置
    - `requests_per_minute`: 每分钟请求数
    - `burst`: 突发请求数

### 认证配置
- `gateway.auth.enabled`: 是否启用认证
- `gateway.auth.type`: 认证类型（jwt/api_key/oauth2）
- `gateway.auth.jwt_secret`: JWT 密钥（jwt 类型）
- `gateway.auth.jwt_expiry_hours`: JWT 过期时间（小时）
- `gateway.auth.api_keys[]`: API Key 列表（api_key 类型）
  - `key`: API Key
  - `name`: Key 名称
  - `permissions[]`: 权限列表

### 限流策略
- `gateway.rate_limiting.enabled`: 是否启用全局限流
- `gateway.rate_limiting.default_requests_per_minute`: 默认每分钟请求数
- `gateway.rate_limiting.default_burst`: 默认突发请求数
- `gateway.rate_limiting.storage`: 限流存储（memory/redis）
- `gateway.rate_limiting.redis_url`: Redis 连接 URL（redis 存储）

### CORS 配置
- `gateway.cors.enabled`: 是否启用 CORS
- `gateway.cors.allowed_origins[]`: 允许的源列表
- `gateway.cors.allowed_methods[]`: 允许的 HTTP 方法
- `gateway.cors.allowed_headers[]`: 允许的请求头
- `gateway.cors.max_age_seconds`: 预检请求缓存时间

### 日志配置
- `gateway.logging.level`: 日志级别（debug/info/warning/error）
- `gateway.logging.format`: 日志格式（json/text）
- `gateway.logging.output`: 日志输出（stdout/file）
- `gateway.logging.file_path`: 日志文件路径（file 输出）

---

## 完整示例

见 `gateway.yaml` 文件。

---

## 参考

- Entity 层 Runtime 配置: `agents/{agent_id}/runtime.yaml`
- Entity 层 Plugin 配置: `agents/{agent_id}/config/plugins.yaml`
- Runtime 层文档: `docs/v4/architecture/02-runtime-layer.md` Section 2.3
