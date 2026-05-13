export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Cove Backend API',
    version: '2.0.0',
    description: 'Cove 协作平台后端 API — 频道、消息、线程、任务、Agent 管理',
  },
  servers: [
    { url: 'http://localhost:3001', description: 'Local Development' },
  ],
  tags: [
    { name: 'Health', description: '健康检查' },
    { name: 'Messages', description: '消息管理' },
    { name: 'Threads', description: '线程管理' },
    { name: 'Channels', description: '频道管理' },
    { name: 'Tasks', description: '任务管理' },
    { name: 'Agents', description: 'Agent 管理' },
  ],
  paths: {
    // ===================== Health =====================
    '/health': {
      get: {
        tags: ['Health'],
        summary: '健康检查',
        responses: {
          '200': {
            description: '服务正常',
            content: { 'application/json': { schema: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'ok' },
                timestamp: { type: 'string', format: 'date-time' },
                uptime: { type: 'number' },
              },
            } } },
          },
        },
      },
    },

    // ===================== Messages =====================
    '/api/channels/{channelId}/messages': {
      post: {
        tags: ['Messages'],
        summary: '发送消息',
        parameters: [
          { name: 'channelId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          required: ['senderId', 'content'],
          properties: {
            senderId: { type: 'string' },
            senderType: { type: 'string', enum: ['human', 'agent', 'system'], default: 'human' },
            content: { type: 'string' },
            threadId: { type: 'string' },
            attachments: { type: 'array', items: { type: 'string' } },
            mentions: { type: 'array', items: { type: 'string' } },
          },
        } } } },
        responses: {
          '201': { description: '消息发送成功', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
          '400': { description: '参数错误' },
          '403': { description: '无权发送（非成员/频率限制）' },
        },
      },
      get: {
        tags: ['Messages'],
        summary: '获取频道消息列表（游标分页）',
        parameters: [
          { name: 'channelId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'cursor', in: 'query', schema: { type: 'string', description: '上一页最后消息 ID' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          '200': { description: '消息列表', content: { 'application/json': { schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object', properties: {
                messages: { type: 'array', items: { $ref: '#/components/schemas/Message' } },
                nextCursor: { type: 'string', nullable: true },
              } },
            },
          } } } },
        },
      },
    },
    '/api/messages/{messageId}': {
      get: {
        tags: ['Messages'],
        summary: '获取单条消息',
        parameters: [{ name: 'messageId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: '消息详情', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
          '404': { description: '消息不存在' },
        },
      },
      put: {
        tags: ['Messages'],
        summary: '更新消息内容',
        parameters: [{ name: 'messageId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          required: ['content', 'editorId'],
          properties: {
            content: { type: 'string' },
            editorId: { type: 'string', description: '编辑者 ID（必须是消息发送者）' },
          },
        } } } },
        responses: {
          '200': { description: '更新成功' },
          '403': { description: '无权编辑' },
          '404': { description: '消息不存在' },
        },
      },
      delete: {
        tags: ['Messages'],
        summary: '删除消息（软删除）',
        parameters: [{ name: 'messageId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          required: ['deletedBy'],
          properties: { deletedBy: { type: 'string' } },
        } } } },
        responses: {
          '200': { description: '删除成功' },
          '403': { description: '无权删除' },
          '404': { description: '消息不存在' },
        },
      },
    },
    '/api/messages/{messageId}/reactions': {
      post: {
        tags: ['Messages'],
        summary: '添加反应',
        parameters: [{ name: 'messageId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          required: ['userId', 'emoji'],
          properties: { userId: { type: 'string' }, emoji: { type: 'string', example: '👍' } },
        } } } },
        responses: { '200': { description: '添加成功' } },
      },
      delete: {
        tags: ['Messages'],
        summary: '移除反应',
        parameters: [{ name: 'messageId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          required: ['userId', 'emoji'],
          properties: { userId: { type: 'string' }, emoji: { type: 'string' } },
        } } } },
        responses: { '200': { description: '移除成功' } },
      },
    },

    // ===================== Threads =====================
    '/api/messages/{messageId}/thread/messages': {
      post: {
        tags: ['Threads'],
        summary: '回复线程',
        parameters: [{ name: 'messageId', in: 'path', required: true, schema: { type: 'string' }, description: 'Root 消息 ID' }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          required: ['senderId', 'content'],
          properties: {
            senderId: { type: 'string' },
            senderType: { type: 'string', enum: ['human', 'agent'], default: 'human' },
            content: { type: 'string' },
          },
        } } } },
        responses: {
          '201': { description: '回复成功' },
          '400': { description: '嵌套线程不允许' },
          '404': { description: 'Root 消息不存在' },
        },
      },
      get: {
        tags: ['Threads'],
        summary: '获取线程消息列表',
        parameters: [
          { name: 'messageId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { '200': { description: '线程消息列表' } },
      },
    },
    '/api/messages/{messageId}/thread': {
      get: {
        tags: ['Threads'],
        summary: '获取线程元数据',
        parameters: [{ name: 'messageId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: '线程详情', content: { 'application/json': { schema: { $ref: '#/components/schemas/Thread' } } } },
          '404': { description: '线程不存在' },
        },
      },
    },
    '/api/channels/{channelId}/threads': {
      get: {
        tags: ['Threads'],
        summary: '获取频道活跃线程列表',
        parameters: [{ name: 'channelId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: '线程列表' } },
      },
    },

    // ===================== Channels =====================
    '/api/channels': {
      post: {
        tags: ['Channels'],
        summary: '创建频道',
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          required: ['name', 'type', 'createdBy'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            type: { type: 'string', enum: ['public', 'private', 'dm'] },
            projectId: { type: 'string', description: '项目 ID（可选，DM/全局频道不需要）' },
            createdBy: { type: 'string' },
            memberIds: { type: 'array', items: { type: 'string' } },
          },
        } } } },
        responses: { '201': { description: '创建成功' }, '400': { description: '参数错误' } },
      },
      get: {
        tags: ['Channels'],
        summary: '获取频道列表',
        parameters: [
          { name: 'projectId', in: 'query', schema: { type: 'string' }, description: '按项目筛选（可选）' },
        ],
        responses: { '200': { description: '频道列表' } },
      },
    },
    '/api/channels/{channelId}': {
      get: {
        tags: ['Channels'],
        summary: '获取频道详情',
        parameters: [{ name: 'channelId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: '频道详情' }, '404': { description: '不存在' } },
      },
      put: {
        tags: ['Channels'],
        summary: '更新频道',
        parameters: [{ name: 'channelId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          properties: { name: { type: 'string' }, description: { type: 'string' } },
        } } } },
        responses: { '200': { description: '更新成功' }, '404': { description: '不存在' } },
      },
      delete: {
        tags: ['Channels'],
        summary: '删除频道（需先归档）',
        parameters: [{ name: 'channelId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: '删除成功' }, '400': { description: '未归档' }, '404': { description: '不存在' } },
      },
    },
    '/api/channels/{channelId}/members': {
      post: {
        tags: ['Channels'],
        summary: '添加成员',
        parameters: [{ name: 'channelId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          required: ['memberId'],
          properties: { memberId: { type: 'string' } },
        } } } },
        responses: { '200': { description: '添加成功' } },
      },
    },
    '/api/channels/{channelId}/members/{memberId}': {
      delete: {
        tags: ['Channels'],
        summary: '移除成员',
        parameters: [
          { name: 'channelId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'memberId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: '移除成功' } },
      },
    },

    // ===================== Tasks =====================
    '/api/messages/{messageId}/convert-to-task': {
      post: {
        tags: ['Tasks'],
        summary: '消息转任务',
        parameters: [{ name: 'messageId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          required: ['title', 'createdBy'],
          properties: {
            title: { type: 'string' },
            createdBy: { type: 'string' },
          },
        } } } },
        responses: {
          '201': { description: '任务创建成功', content: { 'application/json': { schema: { $ref: '#/components/schemas/Task' } } } },
          '404': { description: '消息不存在' },
        },
      },
    },
    '/api/channels/{channelId}/tasks': {
      get: {
        tags: ['Tasks'],
        summary: '获取频道任务列表',
        parameters: [{ name: 'channelId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: '任务列表' } },
      },
    },
    '/api/tasks/{taskId}/claim': {
      post: {
        tags: ['Tasks'],
        summary: '认领任务',
        parameters: [{ name: 'taskId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          required: ['userId'],
          properties: { userId: { type: 'string' } },
        } } } },
        responses: {
          '200': { description: '认领成功' },
          '403': { description: '无法认领' },
          '404': { description: '任务不存在' },
        },
      },
    },
    '/api/tasks/{taskId}/unclaim': {
      post: {
        tags: ['Tasks'],
        summary: '取消认领',
        parameters: [{ name: 'taskId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          required: ['userId'],
          properties: { userId: { type: 'string' } },
        } } } },
        responses: {
          '200': { description: '取消成功' },
          '403': { description: '非当前指派人' },
        },
      },
    },
    '/api/tasks/{taskId}/status': {
      put: {
        tags: ['Tasks'],
        summary: '更新任务状态',
        parameters: [{ name: 'taskId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          required: ['status', 'actorId'],
          properties: {
            status: { type: 'string', enum: ['todo', 'in_progress', 'blocked', 'in_review', 'done', 'cancelled'] },
            actorId: { type: 'string' },
          },
        } } } },
        responses: {
          '200': { description: '状态更新成功' },
          '400': { description: '非法状态转换' },
        },
      },
    },

    // ===================== Agents =====================
    '/api/agents': {
      post: {
        tags: ['Agents'],
        summary: '创建 Agent',
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          required: ['name', 'displayName', 'createdBy'],
          properties: {
            name: { type: 'string' },
            displayName: { type: 'string' },
            description: { type: 'string' },
            capabilities: { type: 'array', items: { type: 'string' } },
            tags: { type: 'array', items: { type: 'string' } },
            createdBy: { type: 'string' },
          },
        } } } },
        responses: { '201': { description: '创建成功', content: { 'application/json': { schema: { $ref: '#/components/schemas/Agent' } } } } },
      },
      get: {
        tags: ['Agents'],
        summary: '获取所有 Agent',
        responses: { '200': { description: 'Agent 列表' } },
      },
    },
    '/api/agents/{agentId}': {
      get: {
        tags: ['Agents'],
        summary: '获取 Agent 详情',
        parameters: [{ name: 'agentId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Agent 详情' }, '404': { description: '不存在' } },
      },
      delete: {
        tags: ['Agents'],
        summary: '删除 Agent',
        parameters: [{ name: 'agentId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: '删除成功' } },
      },
    },
    '/api/agents/{agentId}/runtime': {
      put: {
        tags: ['Agents'],
        summary: '更新运行时配置',
        parameters: [{ name: 'agentId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          required: ['model'],
          properties: {
            model: { type: 'string', example: 'claude-sonnet-4-6' },
            temperature: { type: 'number', minimum: 0, maximum: 2 },
            maxTokens: { type: 'integer' },
            systemPrompt: { type: 'string' },
          },
        } } } },
        responses: { '200': { description: '更新成功' }, '400': { description: 'temperature 范围错误' } },
      },
    },
    '/api/agents/{agentId}/persona': {
      put: {
        tags: ['Agents'],
        summary: '更新 Agent 人设',
        parameters: [{ name: 'agentId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          required: ['name', 'role'],
          properties: {
            name: { type: 'string' },
            role: { type: 'string' },
            tone: { type: 'string' },
            instructions: { type: 'string' },
          },
        } } } },
        responses: { '200': { description: '更新成功' } },
      },
    },
    '/api/agents/{agentId}/skills': {
      put: {
        tags: ['Agents'],
        summary: '更新 Agent 技能',
        parameters: [{ name: 'agentId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          required: ['skillIds'],
          properties: { skillIds: { type: 'array', items: { type: 'string' } } },
        } } } },
        responses: { '200': { description: '更新成功' } },
      },
    },
    '/api/agents/{agentId}/tools': {
      put: {
        tags: ['Agents'],
        summary: '更新 Agent 工具',
        parameters: [{ name: 'agentId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          required: ['toolIds'],
          properties: { toolIds: { type: 'array', items: { type: 'string' } } },
        } } } },
        responses: { '200': { description: '更新成功' } },
      },
    },
    '/api/agents/{agentId}/triggers': {
      put: {
        tags: ['Agents'],
        summary: '更新 Agent 触发器',
        parameters: [{ name: 'agentId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          properties: {
            onMention: { type: 'boolean' },
            onDirectMessage: { type: 'boolean' },
            onSchedule: { type: 'string' },
            customRules: { type: 'array', items: { type: 'string' } },
          },
        } } } },
        responses: { '200': { description: '更新成功' } },
      },
    },
    '/api/agents/{agentId}/start': {
      post: {
        tags: ['Agents'],
        summary: '启动 Agent（异步）',
        parameters: [{ name: 'agentId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '202': { description: '启动指令已接受' },
          '400': { description: 'Agent 未配置 runtimeConfig.model' },
          '404': { description: 'Agent 不存在' },
        },
      },
    },
    '/api/agents/{agentId}/stop': {
      post: {
        tags: ['Agents'],
        summary: '停止 Agent（异步）',
        parameters: [{ name: 'agentId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '202': { description: '停止指令已接受' },
          '404': { description: 'Agent 不存在' },
        },
      },
    },
    '/api/agents/{agentId}/status': {
      get: {
        tags: ['Agents'],
        summary: '获取 Agent 运行状态',
        parameters: [{ name: 'agentId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: '运行状态', content: { 'application/json': { schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object', properties: { status: { type: 'string', enum: ['running', 'stopped', 'error'] } } },
            },
          } } } },
        },
      },
    },
  },
  components: {
    schemas: {
      Message: {
        type: 'object',
        properties: {
          message_id: { type: 'string' },
          channel_id: { type: 'string' },
          sender_id: { type: 'string' },
          sender_type: { type: 'string', enum: ['human', 'agent', 'system'] },
          content: { type: 'string' },
          thread_id: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['draft', 'sending', 'sent', 'failed', 'deleted'] },
          is_edited: { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      Thread: {
        type: 'object',
        properties: {
          thread_id: { type: 'string' },
          channel_id: { type: 'string' },
          root_message_id: { type: 'string' },
          participants: { type: 'array', items: { type: 'string' } },
          reply_count: { type: 'integer' },
          last_reply_at: { type: 'string', format: 'date-time', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Channel: {
        type: 'object',
        properties: {
          channel_id: { type: 'string' },
          name: { type: 'string' },
          display_name: { type: 'string' },
          type: { type: 'string', enum: ['public', 'private', 'dm', 'thread'] },
          status: { type: 'string', enum: ['active', 'archived'] },
          project_id: { type: 'string' },
        },
      },
      Task: {
        type: 'object',
        properties: {
          task_id: { type: 'string' },
          task_number: { type: 'integer', description: '频道内自增编号' },
          title: { type: 'string' },
          status: { type: 'string', enum: ['todo', 'in_progress', 'blocked', 'in_review', 'done', 'cancelled'] },
          channel_id: { type: 'string' },
          source_message_id: { type: 'string', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Agent: {
        type: 'object',
        properties: {
          agent_id: { type: 'string' },
          name: { type: 'string' },
          display_name: { type: 'string' },
          status: { type: 'string', enum: ['active', 'idle', 'disabled', 'error'] },
          runtime_config: { type: 'object', properties: {
            model: { type: 'string' },
            temperature: { type: 'number' },
            maxTokens: { type: 'integer' },
            systemPrompt: { type: 'string' },
          } },
          persona: { type: 'object', properties: {
            name: { type: 'string' },
            role: { type: 'string' },
            tone: { type: 'string' },
            instructions: { type: 'string' },
          } },
          skills: { type: 'object', properties: { skillIds: { type: 'array', items: { type: 'string' } } } },
          tools: { type: 'object', properties: { toolIds: { type: 'array', items: { type: 'string' } } } },
          triggers: { type: 'object', properties: {
            onMention: { type: 'boolean' },
            onDirectMessage: { type: 'boolean' },
            onSchedule: { type: 'string' },
          } },
          created_by: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'object' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'object', properties: {
            code: { type: 'string' },
            message: { type: 'string' },
          } },
        },
      },
    },
  },
};
