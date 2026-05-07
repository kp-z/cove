# ServerEntity

## AI_SEARCH_HEADER
```
Entity: ServerEntity
Purpose: 服务器实体 - 管理 Slock 后端服务的物理/虚拟服务器配置
Aggregate Root: Yes
Identity: server_id (UUID)
Lifecycle: 独立生命周期，由管理员创建和管理
Storage: server/{server_id}/server.yaml
```

## 概述

ServerEntity 表示 Slock 系统中的后端服务器实例。每个 Server 是一个独立的计算资源，可以运行多个 Agent 实例。Server 负责管理计算资源、网络配置、安全策略等基础设施层面的配置。

## 核心特征

- **Aggregate Root**: ServerEntity 是独立的聚合根
- **唯一标识**: server_id (UUID)
- **生命周期**: 由管理员创建，可以启动/停止/删除
- **关联关系**: 
  - 一个 Server 可以运行多个 Agent (1:N)
  - 一个 Server 属于一个 Project (N:1)
  - Server 有对应的 ServerRuntime 状态 (1:1)

## 字段定义

### 基础信息
- `server_id` (string, required): 服务器唯一标识 (UUID)
- `name` (string, required): 服务器名称（用户友好）
- `description` (string, optional): 服务器描述
- `project_id` (string, required): 所属项目 ID

### 服务器配置
- `type` (string, required): 服务器类型
  - `physical`: 物理服务器
  - `virtual`: 虚拟机
  - `container`: 容器
  - `cloud`: 云实例
- `provider` (string, optional): 云服务提供商（cloud 类型时）
  - `aws`, `gcp`, `azure`, `local`
- `region` (string, optional): 地理区域（cloud 类型时）
- `instance_type` (string, optional): 实例类型（如 t3.medium）

### 计算资源
- `resources` (object, required): 资源配置
  - `cpu_cores` (integer): CPU 核心数
  - `memory_gb` (integer): 内存大小 (GB)
  - `disk_gb` (integer): 磁盘大小 (GB)
  - `gpu_count` (integer, optional): GPU 数量

### 网络配置
- `network` (object, required): 网络配置
  - `hostname` (string): 主机名
  - `ip_address` (string, optional): IP 地址
  - `port` (integer): 服务端口
  - `protocol` (string): 协议 (http/https)
  - `domain` (string, optional): 域名

### 安全配置
- `security` (object, required): 安全配置
  - `ssh_enabled` (boolean): 是否启用 SSH
  - `ssh_port` (integer, optional): SSH 端口
  - `firewall_rules` (array, optional): 防火墙规则
  - `ssl_enabled` (boolean): 是否启用 SSL
  - `ssl_cert_path` (string, optional): SSL 证书路径

### 容量限制
- `limits` (object, required): 容量限制
  - `max_agents` (integer): 最大 Agent 数量
  - `max_concurrent_executions` (integer): 最大并发执行数
  - `max_memory_per_agent_gb` (integer): 每个 Agent 最大内存

### 状态信息
- `status` (string, required): 服务器状态
  - `provisioning`: 正在配置
  - `running`: 运行中
  - `stopped`: 已停止
  - `maintenance`: 维护中
  - `error`: 错误状态
  - `terminated`: 已终止

### 时间信息
- `created_at` (string, required): 创建时间 (ISO 8601)
- `updated_at` (string, required): 最后更新时间
- `started_at` (string, optional): 启动时间
- `stopped_at` (string, optional): 停止时间

### 扩展元数据
- `meta` (object, optional): 扩展元数据
  - `tags` (array): 标签
  - `environment` (string): 环境 (dev/staging/prod)
  - `cost_center` (string): 成本中心
  - `owner` (string): 负责人

## 示例 YAML

```yaml
# server/server-001/server.yaml
# ServerEntity 示例 - AWS EC2 生产服务器

# 基础信息
server_id: "server-001"
name: "slock-prod-01"
description: "Slock 生产环境主服务器"
project_id: "project-001"

# 服务器配置
type: "cloud"
provider: "aws"
region: "us-west-2"
instance_type: "t3.xlarge"

# 计算资源
resources:
  cpu_cores: 4
  memory_gb: 16
  disk_gb: 100
  gpu_count: 0

# 网络配置
network:
  hostname: "slock-prod-01.example.com"
  ip_address: "10.0.1.100"
  port: 443
  protocol: "https"
  domain: "api.slock.example.com"

# 安全配置
security:
  ssh_enabled: true
  ssh_port: 22
  firewall_rules:
    - port: 443
      protocol: "tcp"
      source: "0.0.0.0/0"
    - port: 22
      protocol: "tcp"
      source: "10.0.0.0/16"
  ssl_enabled: true
  ssl_cert_path: "/etc/ssl/certs/slock.crt"

# 容量限制
limits:
  max_agents: 50
  max_concurrent_executions: 100
  max_memory_per_agent_gb: 4

# 状态信息
status: "running"

# 时间信息
created_at: "2026-01-01T00:00:00Z"
updated_at: "2026-05-07T01:00:00Z"
started_at: "2026-01-01T00:30:00Z"
stopped_at: null

# 扩展元数据
meta:
  tags: ["production", "primary"]
  environment: "prod"
  cost_center: "engineering"
  owner: "devops-team"
```

## 关联关系

### 父级关系
- **ProjectEntity** (N:1): Server 属于一个 Project

### 子级关系
- **AgentEntity** (1:N): Server 可以运行多个 Agent
- **ServerRuntime** (1:1): Server 有对应的运行时状态

### 引用关系
- Server 通过 `server_id` 被 AgentEntity 引用
- Server 通过 `server_id` 被 ServerRuntime 引用

## 状态机

```
[provisioning] --启动--> [running]
[running] --停止--> [stopped]
[stopped] --启动--> [running]
[running] --维护--> [maintenance]
[maintenance] --恢复--> [running]
[*] --错误--> [error]
[error] --修复--> [running]
[stopped] --删除--> [terminated]
```

## 业务规则

1. **资源限制**: 运行的 Agent 数量不能超过 `max_agents`
2. **状态约束**: 只有 `running` 状态的 Server 可以启动新的 Agent
3. **删除保护**: 有运行中 Agent 的 Server 不能被删除
4. **容量检查**: 启动 Agent 前需检查 Server 剩余资源
5. **网络唯一性**: 同一 Project 内的 Server hostname 必须唯一

## DDD 设计说明

### 为什么是 Aggregate Root？
- Server 有独立的生命周期（创建、启动、停止、删除）
- Server 管理自己的资源配置和安全策略
- Server 是基础设施层的核心概念，不依赖其他实体

### 边界控制
- Server 通过 `limits` 控制资源分配
- Agent 启动时需要向 Server 申请资源
- Server 状态变更会影响其上运行的所有 Agent

### 一致性保证
- Server 的资源配置变更需要原子性操作
- Server 状态变更需要通知所有关联的 Agent
- Server 删除需要先停止所有 Agent
