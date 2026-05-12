# 01 - Message + Channel 基础 CRUD（P0）

> **前置**：必须先发送 [00-总纲.md](./00-总纲.md)。

---

请实现 Message 和 Channel 的基础 CRUD API。**严格遵循总纲约束**。

## 需求范围

### Domain Layer

1. **ChannelEntity**：
   - 字段：`channel_id, name, type(public/private/dm), members, communication_rules`
2. **MessageEntity**：
   - 字段：`message_id, channel_id, sender_id, content, mentions, thread_id, status`
3. **业务规则（方法）**：
   - `Channel.add_member(member)` —— 检查重复成员、成员上限
   - `Channel.can_send_message(user_id)` —— 权限 + 速率限制检查
   - `Message.edit(new_content, editor_id)` —— 检查编辑者权限、记录历史
   - `Message.delete(deleter_id)` —— soft delete，校验权限

### Application Service Layer

1. **ChannelService**：
   - `create_channel / get_channel / list_channels / add_member / remove_member`
2. **MessageService**：
   - `send_message / get_message / list_messages(分页) / edit_message / delete_message`
3. 跨 Service 调用通过端口（如 `MessageService` 不直接调 `ChannelRepository`，而通过 `ChannelService.can_send(...)`）

### Infrastructure Layer

1. **PostgreSQL Schema**：`channels`, `channel_members`, `messages`
   - 参考 `docs/v4/architecture/backend/03-infrastructure/04-backend-api.md` 中的 schema 设计
2. **REST API**：
   ```
   POST   /api/v1/channels
   GET    /api/v1/channels
   GET    /api/v1/channels/{id}
   POST   /api/v1/channels/{id}/members
   DELETE /api/v1/channels/{id}/members/{member_id}
   POST   /api/v1/channels/{id}/messages
   GET    /api/v1/channels/{id}/messages?cursor=&limit=
   GET    /api/v1/messages/{id}
   PUT    /api/v1/messages/{id}
   DELETE /api/v1/messages/{id}
   ```

## 验收标准

- mypy strict 通过
- pytest 覆盖率 >= 80%
- 所有 API 返回统一 envelope: `{ success, data, error }`
- 错误响应符合 RFC 7807 Problem Details

---

**先输出文件清单和依赖图，等我确认。**
