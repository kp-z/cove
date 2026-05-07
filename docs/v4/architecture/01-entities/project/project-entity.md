# ProjectEntity（项目实体）

> **AI_SEARCH_HEADER**  
> **文档ID**: entity-project  
> **实体类型**: ProjectEntity  
> **关键词**: `Project`, `项目`, `项目配置`, `project.yaml`, `团队协作`, `项目管理`, `Agent 分组`  
> **适用场景**: 查找项目数据结构、项目配置格式、多 Agent 协作设计  
> **相关实体**: AgentEntity, ChannelEntity, TaskEntity, OKREntity  
> **相关文档**: [Backend API - Project Service](../../04-backend-api.md)

---

### 1.2 ProjectEntity（项目实体）

**文件格式**: `projects/{project_id}/project.yaml`

```yaml
# projects/proj-001/project.yaml
# ProjectEntity 配置文件示例

# 基础信息
project_id: "proj-001"                   # 唯一标识（UUID）
name: "Cove"                             # 项目名称
display_name: "Cove 平台"                # 显示名称
description: "AI Agent 协作平台"         # 描述
icon: "icons/project-001.png"            # 项目图标

# 项目路径
path: "/Users/kp/项目/Proj/claude_manager"  # 项目根路径
git_repo: "https://github.com/owner/open-adventure.git"  # Git 仓库地址
git_branch: "main"                       # 当前分支

# 项目状态
status: "active"                         # 状态: active | archived | maintenance
visibility: "private"                    # 可见性: public | private | internal

# 关联的 Channel（只存 ID）
channels:
  - channel_id: "channel-001"
  - channel_id: "channel-002"

# 项目专属 Agent（只存 ID）
agents:
  - agent_id: "agent-001"
  - agent_id: "agent-002"

# OKR 列表（只存 ID 和文件路径）
okrs:
  - okr_id: "okr-001"
    okr_file: "projects/proj-001/okrs/okr-001/okr.yaml"
  - okr_id: "okr-002"
    okr_file: "projects/proj-001/okrs/okr-002/okr.yaml"

# 技术栈
tech_stack:
  backend:
    - "Python 3.11"
    - "FastAPI"
    - "PostgreSQL"
  frontend:
    - "React 18"
    - "TypeScript"
    - "Tailwind CSS"
  infrastructure:
    - "Docker"
    - "Nginx"

# 项目配置
config:
  test_coverage_threshold: 80            # 测试覆盖率阈值
  code_review_required: true             # 是否需要代码审查
  ci_cd_enabled: true                    # 是否启用 CI/CD

# 项目依赖（Dependencies）
dependencies:
  projects:                              # 依赖的其他项目
    - project_id: "proj-base"
      project_name: "Base Library"
      version: "1.2.0"
      required: true
  external_services:                     # 依赖的外部服务
    - service_name: "GitHub API"
      service_url: "https://api.github.com"
      required: true
    - service_name: "Anthropic API"
      service_url: "https://api.anthropic.com"
      required: true

# 项目状态（Status）
project_status:
  health: "healthy"                      # 健康状态: healthy | warning | critical
  build_status: "passing"                # 构建状态: passing | failing | unknown
  test_status: "passing"                 # 测试状态: passing | failing | unknown
  deployment_status: "deployed"          # 部署状态: deployed | deploying | failed | not_deployed
  last_build_at: "2026-05-02T09:00:00Z"  # 最后构建时间
  last_deploy_at: "2026-05-01T18:00:00Z" # 最后部署时间

# 扩展元数据
meta:
  tags: ["ai", "agent", "collaboration"]
  category: "platform"
  owner: "kp-user"
  team_size: 5
  license: "MIT"                         # 许可证
  homepage: "https://openadventure.dev"  # 项目主页
  documentation: "https://docs.openadventure.dev"  # 文档地址
  created_at: "2026-04-01T00:00:00Z"
  updated_at: "2026-05-02T10:00:00Z"
```

---

