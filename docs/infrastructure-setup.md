# 基础设施搭建指南

> **文档版本**：v1.0
> 
> **最后更新**：2026-06-01
> 
> **适用阶段**：阶段 0 - 架构设计与基础设施

---

## 概述

本文档描述如何搭建 LLM Adapter 迁移项目的基础设施，包括：
- Backend 集群（3 个分片）
- Redis Pub/Sub（跨分片通信）
- 监控系统（Prometheus + Grafana）
- 压力测试环境

---

## 前置要求

### 软件依赖

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+
- k6（压力测试）
- Artillery（压力测试）

### 安装依赖

```bash
# macOS
brew install docker docker-compose k6
npm install -g artillery

# Ubuntu
sudo apt-get install docker.io docker-compose
sudo snap install k6
npm install -g artillery
```

---

## Backend 集群部署

### 1. 配置环境变量

创建 `.env` 文件：

```bash
# Backend 分片配置
BACKEND_SHARD_ID=0
BACKEND_TOTAL_SHARDS=3

# Redis 配置
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0
REDIS_CLUSTER_ENABLED=false

# Redis Pub/Sub
REDIS_PUBSUB_ENABLED=true

# 数据库配置
DATABASE_URL=postgresql://user:password@postgres:5432/cove

# 监控配置
PROMETHEUS_ENABLED=true
METRICS_PORT=9090
```

### 2. Docker Compose 配置

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  # Backend Shard 0
  backend-0:
    build: ./cloud/backend
    environment:
      - BACKEND_SHARD_ID=0
      - BACKEND_TOTAL_SHARDS=3
      - REDIS_HOST=redis
      - PORT=3002
    ports:
      - "3002:3002"
      - "9090:9090"  # Metrics
    depends_on:
      - redis
      - postgres
    networks:
      - cove-network

  # Backend Shard 1
  backend-1:
    build: ./cloud/backend
    environment:
      - BACKEND_SHARD_ID=1
      - BACKEND_TOTAL_SHARDS=3
      - REDIS_HOST=redis
      - PORT=3002
    ports:
      - "3003:3002"
      - "9091:9090"
    depends_on:
      - redis
      - postgres
    networks:
      - cove-network

  # Backend Shard 2
  backend-2:
    build: ./cloud/backend
    environment:
      - BACKEND_SHARD_ID=2
      - BACKEND_TOTAL_SHARDS=3
      - REDIS_HOST=redis
      - PORT=3002
    ports:
      - "3004:3002"
      - "9092:9090"
    depends_on:
      - redis
      - postgres
    networks:
      - cove-network

  # Redis
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass your-redis-password
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - cove-network

  # PostgreSQL
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=cove
      - POSTGRES_PASSWORD=your-postgres-password
      - POSTGRES_DB=cove
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - cove-network

  # Prometheus
  prometheus:
    image: prom/prometheus:latest
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    ports:
      - "9090:9090"
    volumes:
      - ./infrastructure/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./infrastructure/prometheus/alerts.yml:/etc/prometheus/alerts.yml
      - prometheus-data:/prometheus
    networks:
      - cove-network

  # Grafana
  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    ports:
      - "3000:3000"
    volumes:
      - ./infrastructure/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - grafana-data:/var/lib/grafana
    depends_on:
      - prometheus
    networks:
      - cove-network

  # Redis Exporter
  redis-exporter:
    image: oliver006/redis_exporter:latest
    environment:
      - REDIS_ADDR=redis:6379
      - REDIS_PASSWORD=your-redis-password
    ports:
      - "9121:9121"
    depends_on:
      - redis
    networks:
      - cove-network

volumes:
  redis-data:
  postgres-data:
  prometheus-data:
  grafana-data:

networks:
  cove-network:
    driver: bridge
```

### 3. 启动集群

```bash
# 构建镜像
docker-compose build

# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 检查服务状态
docker-compose ps
```

### 4. 验证部署

```bash
# 检查 Backend 健康状态
curl http://localhost:3002/health  # Shard 0
curl http://localhost:3003/health  # Shard 1
curl http://localhost:3004/health  # Shard 2

# 检查 Redis 连接
redis-cli -h localhost -p 6379 -a your-redis-password ping

# 检查 Prometheus
curl http://localhost:9090/-/healthy

# 检查 Grafana
curl http://localhost:3000/api/health
```

---

## 监控系统配置

### 1. 访问 Grafana

打开浏览器访问：`http://localhost:3000`

- 用户名：`admin`
- 密码：`admin`（首次登录后修改）

### 2. 添加 Prometheus 数据源

1. 进入 Configuration → Data Sources
2. 点击 "Add data source"
3. 选择 "Prometheus"
4. URL：`http://prometheus:9090`
5. 点击 "Save & Test"

### 3. 导入 Dashboard

1. 进入 Dashboards → Import
2. 上传 `infrastructure/grafana/dashboards/backend-cluster.json`
3. 选择 Prometheus 数据源
4. 点击 "Import"

### 4. 配置告警

Prometheus 告警规则已在 `infrastructure/prometheus/alerts.yml` 中定义。

查看告警状态：`http://localhost:9090/alerts`

---

## 压力测试环境

### 1. 安装测试工具

```bash
# 安装 k6
brew install k6

# 安装 Artillery
npm install -g artillery
```

### 2. 运行压力测试

```bash
cd tests/load

# 运行所有测试
./run-tests.sh all

# 运行单个测试
./run-tests.sh websocket   # WebSocket 连接测试
./run-tests.sh routing     # 消息路由测试
./run-tests.sh config      # 配置同步测试
```

### 3. 查看测试结果

测试结果保存在 `tests/load/results/` 目录：
- JSON 格式：原始数据
- HTML 格式：可视化报告

---

## 性能基准

### Backend 性能目标

| 指标 | 目标 | 验证方法 |
|------|------|----------|
| 最大连接数 | 10,000 / 实例 | WebSocket 压力测试 |
| 消息路由延迟 | < 10ms (p95) | 消息路由测试 |
| 消息吞吐量 | 10,000 msg/s | 消息路由测试 |
| 配置缓存命中率 | > 95% | 配置同步测试 |

### 验证步骤

1. 运行 WebSocket 测试，验证 10,000 连接
2. 运行消息路由测试，验证 10,000 msg/s
3. 运行配置同步测试，验证缓存命中率
4. 检查 Grafana Dashboard，确认所有指标达标

---

## 故障排查

### Backend 无法启动

```bash
# 检查日志
docker-compose logs backend-0

# 检查端口占用
lsof -i :3002

# 重启服务
docker-compose restart backend-0
```

### Redis 连接失败

```bash
# 检查 Redis 状态
docker-compose logs redis

# 测试连接
redis-cli -h localhost -p 6379 -a your-redis-password ping

# 重启 Redis
docker-compose restart redis
```

### Prometheus 无法采集指标

```bash
# 检查 Prometheus 配置
docker-compose exec prometheus promtool check config /etc/prometheus/prometheus.yml

# 查看 targets 状态
curl http://localhost:9090/api/v1/targets

# 重启 Prometheus
docker-compose restart prometheus
```

---

## 下一步

完成基础设施搭建后，进入阶段 1：核心组件实现

参考文档：
- 架构文档：`/Users/kp/项目/Proj/cove/docs/architecture-llm-adapter-migration.md`
- 阶段 1 Plan：`~/.claude/plans/llm-adapter-migration/stage-1-core-components.md`
