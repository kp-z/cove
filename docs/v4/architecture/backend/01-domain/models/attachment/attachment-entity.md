# AttachmentEntity（附件实体）

> **AI_SEARCH_HEADER**  
> **文档ID**: entity-attachment  
> **实体类型**: AttachmentEntity  
> **关键词**: `Attachment`, `附件`, `文件上传`, `图片`, `文件存储`, `预览`  
> **适用场景**: 查找附件数据结构、文件上传流程、存储策略、预览生成  
> **相关实体**: MessageEntity, ChannelEntity  
> **相关文档**: [Backend API - Attachment Service](../../03-infrastructure/04-backend-api.md)

---

### AttachmentEntity（附件实体）

**文件格式**: `attachments/{attachment_id}/metadata.yaml`

```yaml
# attachments/attach-001/metadata.yaml
# AttachmentEntity 配置文件示例

# 基础信息
attachment_id: "attach-001"              # 唯一标识（UUID）
file_name: "architecture.png"            # 原始文件名
file_type: "image/png"                   # MIME 类型
file_size: 102400                        # 文件大小（字节）

# 存储信息
storage_path: "attachments/attach-001/architecture.png"  # 存储路径
thumbnail_path: "attachments/attach-001/thumb.png"       # 缩略图路径（图片类型）

# 关联信息
message_id: "msg-001"                    # 关联的消息 ID
channel_id: "channel-001"               # 所属频道
uploaded_by: "user-001"                  # 上传者 ID

# 时间信息
created_at: "2026-05-02T10:00:00Z"
```

---
