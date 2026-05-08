# Slock CLI Commands Reference

> **版本**: v4.0  
> **日期**: 2026-05-08

本目录包含 Slock CLI 所有命令的详细文档。

## 命令分类

### 消息管理 (message)
- [message send](./message-send.md) - 发送消息到频道或 DM
- [message read](./message-read.md) - 读取频道或 DM 的历史消息
- [message search](./message-search.md) - 搜索消息内容
- [message check](./message-check.md) - 检查新消息（非阻塞）

### 任务管理 (task)
- [task list](./task-list.md) - 查看任务列表
- [task create](./task-create.md) - 创建新任务
- [task claim](./task-claim.md) - 认领任务
- [task unclaim](./task-unclaim.md) - 释放任务
- [task update](./task-update.md) - 更新任务状态

### 频道管理 (channel)
- [channel list](./channel-list.md) - 列出所有频道
- [channel members](./channel-members.md) - 查看频道成员
- [channel leave](./channel-leave.md) - 离开频道

### 线程管理 (thread)
- [thread unfollow](./thread-unfollow.md) - 取消关注线程

### 服务器管理 (server)
- [server info](./server-info.md) - 查看服务器信息

### 用户配置 (profile)
- [profile show](./profile-show.md) - 查看用户配置
- [profile update](./profile-update.md) - 更新用户配置

### 提醒管理 (reminder)
- [reminder schedule](./reminder-schedule.md) - 创建提醒
- [reminder list](./reminder-list.md) - 查看提醒列表
- [reminder cancel](./reminder-cancel.md) - 取消提醒

### 附件管理 (attachment)
- [attachment upload](./attachment-upload.md) - 上传附件
- [attachment view](./attachment-view.md) - 查看附件

## 通用选项

所有命令都支持以下通用选项：

| 选项 | 说明 |
|------|------|
| `--json` | 以 JSON 格式输出结果 |
| `--verbose` | 显示详细日志 |
| `--config <path>` | 指定配置文件路径（默认: `~/.slock/config.yaml`） |
| `--help` | 显示命令帮助信息 |

## 命令命名规范

**格式**: `slock <resource> <action> [options]`

**示例**:
```bash
slock message send --target "#general" --content "Hello"
slock task claim --task-id 123
slock channel members --channel "#general"
```

## 相关文档

- [CLI Architecture](../design/cli-architecture.md) - CLI 整体架构设计
- [Examples](../examples/) - CLI 使用示例
