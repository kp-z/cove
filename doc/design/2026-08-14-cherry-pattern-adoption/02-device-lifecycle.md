# Phase 2 · 设备可用 (B)

> **状态**: 未开始  
> **依赖**: Phase 1 至少完成 executionId + 状态投影  
> **Cherry 参考**: lifecycle / IoC 分阶段启动 — 只读模式

## 1. 目标

Local 设备在断线、崩溃、重启后可恢复到可服务状态；云端认领与心跳语义清晰、幂等。

## 2. 非目标

- 不做多设备复杂调度优化（可后续）
- 不引入桌面壳

## 3. 拟移植的模式

| Cherry 模式 | Cove 落点（预期） |
|-------------|-------------------|
| 分阶段 bootstrap | local 启动：config → gateway → runtime → ready |
| 长生命周期服务纪律 | connection-manager / lifecycle-manager 职责清晰 |
| 资源释放与崩溃边界 | 未完成执行标为 `orphaned` 并决策重试或失败 |

## 4. 建议切片（草案）

1. 设备状态机：`disconnected | connecting | ready | degraded`
2. 心跳 + 超时 → 云端标记不可用
3. 重启后：上报未完成 `executionId`，与云端对账

## 5. 开放问题

- orphaned 执行默认重试还是失败？
- 多 device 抢同一任务时的锁/租约时长？

## 6. 完成标准

- [ ] 断线/重启场景有测试或可重复手工脚本
- [ ] 与 Phase 1 状态机无冲突
- [ ] `PROGRESS.md` 已更新
