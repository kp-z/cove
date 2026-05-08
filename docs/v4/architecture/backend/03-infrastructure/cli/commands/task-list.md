# slock task list

查看频道的任务列表。

## 语法

```bash
slock task list [options]
```

## 参数

| 参数 | 必需 | 说明 |
|------|------|------|
| `--channel <name>` | 否 | 频道名称（默认当前频道） |
| `--status <status>` | 否 | 按状态筛选 |
| `--assignee <user>` | 否 | 按负责人筛选 |
| `--mine` | 否 | 只显示我的任务 |

## 任务状态

| 状态 | 说明 |
|------|------|
| `todo` | 待处理 |
| `in_progress` | 进行中 |
| `in_review` | 审核中 |
| `done` | 已完成 |

## 示例

### 查看所有任务

```bash
# 查看当前频道的所有任务
slock task list

# 查看指定频道的任务
slock task list --channel "#engineering"
```

### 按状态筛选

```bash
# 查看待处理的任务
slock task list --status todo

# 查看进行中的任务
slock task list --status in_progress

# 查看审核中的任务
slock task list --status in_review
```

### 按负责人筛选

```bash
# 查看 Alice 的任务
slock task list --assignee "@alice"

# 查看我的任务
slock task list --mine
```

### 组合筛选

```bash
# 查看我的待处理任务
slock task list --mine --status todo

# 查看 engineering 频道中 Alice 的进行中任务
slock task list --channel "#engineering" --assignee "@alice" --status in_progress
```

## 输出

**标准格式**:
```
Tasks in #engineering:

TODO (3):
  #5  Fix login bug                    @alice
  #7  Update documentation             (unassigned)
  #9  Refactor authentication module   @bob

IN_PROGRESS (2):
  #3  Implement user profile API       @alice
  #6  Add unit tests for auth          @charlie

IN_REVIEW (1):
  #2  Setup CI/CD pipeline             @bob

DONE (5):
  #1  Project setup                    @alice
  #4  Database schema design           @bob
  ...
```

**JSON 格式** (`--json`):
```json
{
  "ok": true,
  "data": {
    "channel": "#engineering",
    "tasks": [
      {
        "id": 5,
        "title": "Fix login bug",
        "status": "todo",
        "assignee": "@alice",
        "created_at": "2026-05-08T10:00:00Z",
        "updated_at": "2026-05-08T10:00:00Z"
      }
    ],
    "summary": {
      "todo": 3,
      "in_progress": 2,
      "in_review": 1,
      "done": 5
    }
  }
}
```

## 任务编号

任务编号是频道内唯一的递增数字，格式为 `#N`。使用任务编号可以快速引用任务：

```bash
# 认领任务
slock task claim --task-id 5

# 更新任务状态
slock task update --task-id 5 --status in_progress
```

## 使用场景

### 查找可认领的任务

```bash
# 查看待处理的任务
slock task list --status todo

# 认领感兴趣的任务
slock task claim --task-id 7
```

### 跟踪团队进度

```bash
# 查看所有进行中的任务
slock task list --status in_progress

# 查看需要审核的任务
slock task list --status in_review
```

### 检查自己的工作

```bash
# 查看我的所有任务
slock task list --mine

# 查看我的待处理任务
slock task list --mine --status todo
```

## 错误

| 错误码 | 说明 |
|--------|------|
| `CHANNEL_NOT_FOUND` | 频道不存在 |
| `PERMISSION_DENIED` | 权限不足 |
| `INVALID_STATUS` | 无效的状态值 |

## 相关命令

- [task create](./task-create.md) - 创建任务
- [task claim](./task-claim.md) - 认领任务
- [task update](./task-update.md) - 更新任务状态
- [task unclaim](./task-unclaim.md) - 释放任务
