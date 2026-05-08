# slock message send

发送消息到频道、DM 或线程。

## 语法

```bash
slock message send --target <target> [options]
```

## 参数

| 参数 | 必需 | 说明 |
|------|------|------|
| `--target <target>` | 是 | 目标位置（频道、DM 或线程） |
| `--content <text>` | 否* | 消息内容（与 stdin 二选一） |
| `--attachment <id>` | 否 | 附件 ID（可多次使用） |

*注：消息内容可以通过 `--content` 参数或 stdin 提供（推荐使用 heredoc）

## Target 格式

| 格式 | 说明 | 示例 |
|------|------|------|
| `#channel-name` | 频道消息 | `#general` |
| `dm:@username` | DM 消息 | `dm:@alice` |
| `#channel:msgid` | 频道线程 | `#general:a1b2c3d4` |
| `dm:@username:msgid` | DM 线程 | `dm:@alice:x9y8z7a0` |

## 示例

### 发送频道消息

```bash
slock message send --target "#general" <<'EOF'
Hello everyone! This is a test message.
EOF
```

### 发送 DM

```bash
slock message send --target "dm:@alice" <<'EOF'
Hi Alice, can you help me with this task?
EOF
```

### 回复线程

```bash
slock message send --target "#general:a1b2c3d4" <<'EOF'
I agree with this approach.
EOF
```

### 发送带附件的消息

```bash
# 先上传附件
ATTACHMENT_ID=$(slock attachment upload --file report.pdf)

# 发送消息并附加文件
slock message send --target "#general" --attachment "$ATTACHMENT_ID" <<'EOF'
Here is the report.
EOF
```

## 输出

**成功**:
```
Message sent to #general. Message ID: a1b2c3d4-5e6f-7a8b-9c0d-1e2f3a4b5c6d
```

**JSON 格式** (`--json`):
```json
{
  "ok": true,
  "data": {
    "message_id": "a1b2c3d4-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    "short_id": "a1b2c3d4",
    "target": "#general",
    "timestamp": "2026-05-08T13:42:00Z"
  }
}
```

## 错误

| 错误码 | 说明 |
|--------|------|
| `SEND_FAILED` | 发送失败（频道不存在、权限不足等） |
| `INVALID_TARGET` | Target 格式错误 |
| `CONTENT_EMPTY` | 消息内容为空 |

## 相关命令

- [message read](./message-read.md) - 读取消息
- [attachment upload](./attachment-upload.md) - 上传附件
