# DeviceEntity（设备实体）

> **AI_SEARCH_HEADER**  
> **文档ID**: entity-device  
> **实体类型**: DeviceEntity  
> **关键词**: `Device`, `设备`, `计算机`, `主机`, `Agent运行环境`, `资源管理`, `负载均衡`  
> **适用场景**: 查找设备数据结构、Agent 部署配置、资源监控、故障恢复  
> **相关实体**: AgentEntity, ExecutionEntity  
> **相关文档**: [Application Layer - Device Management](../../02-runtime-layer.md), [Backend API - Device Service](../../04-backend-api.md)

---

### 1.10 DeviceEntity（设备实体）

DeviceEntity 表示运行 Agent 的物理或虚拟计算设备。每个 Device 可以运行多个 Agent 实例，并提供计算资源、存储和网络能力。

**文件格式**: `devices/{device_id}/device.yaml`

```yaml
# devices/dev-001/device.yaml
# DeviceEntity 配置文件示例

# 基础信息
device_id: "dev-001"                     # 唯一标识（UUID）
name: "kp-macbook-pro"                   # 设备名称
hostname: "kpdeMacBook-Pro-2.local"      # 主机名
display_name: "KP 的 MacBook Pro"        # 显示名称

# 系统信息
os: "darwin"                             # 操作系统: darwin | linux | windows
arch: "arm64"                            # 架构: arm64 | x86_64
os_version: "macOS 15.0"                 # 操作系统版本

# 设备状态
status: "online"                         # 状态: online | offline | maintenance

# 设备能力
capabilities:
  cpu_cores: 12                          # CPU 核心数
  memory_gb: 32                          # 内存（GB）
  storage_gb: 512                        # 存储（GB）
  gpu: false                             # 是否有 GPU

# 网络信息
network:
  ip_address: "192.168.1.100"            # IP 地址
  public_ip: null                        # 公网 IP（可选）

# 运行中的 Agent
running_agents:
  - agent_id: "agent-001"
    name: "Alice"
    status: "active"
    pid: 12345
  - agent_id: "agent-002"
    name: "Bob"
    status: "idle"
    pid: 12346

# 资源使用情况（运行时动态数据）
resource_usage:
  cpu_percent: 45.2
  memory_percent: 68.5
  disk_percent: 72.3
  network_in_mbps: 12.5
  network_out_mbps: 8.3

# 时间信息
created_at: "2026-01-10T00:00:00Z"       # 注册时间
updated_at: "2026-05-06T02:15:00Z"       # 最后更新时间
last_seen_at: "2026-05-06T02:15:00Z"     # 最后在线时间

# 扩展元数据
meta:
  location: "home-office"                # 设备位置
  tags: ["primary", "development"]
  owner: "kp-user"
  daemon_version: "v0.44.2"             # Slock daemon 版本
```

---

### 关联关系

- **一对多**: Device → Agent（一个设备可运行多个 Agent）
- **一对多**: Device → Execution（一个设备可执行多个任务）

### 状态机

```
online ──┐
         ├──> maintenance ──> online
offline ─┘
```

### 使用场景

1. **Agent 部署**: 将 Agent 分配到特定 Device 运行
2. **资源监控**: 跟踪设备资源使用情况
3. **故障恢复**: 当设备离线时，迁移 Agent 到其他设备
4. **负载均衡**: 根据设备能力分配工作负载

---
