/**
 * 响应后处理器接口
 */
export interface ResponsePostProcessor {
  /**
   * 处理器名称
   */
  readonly name: string

  /**
   * 处理响应
   * @param response 原始响应内容
   * @param context 处理上下文
   * @returns 处理后的响应和提取的元数据
   */
  process(
    response: string,
    context: PostProcessContext
  ): Promise<PostProcessResult>
}

/**
 * 后处理上下文
 */
export interface PostProcessContext {
  channelId: string
  messageId: string
  taskId: string
  adapter: string
  timestamp: Date
  metrics?: Record<string, any>
}

/**
 * 后处理结果
 */
export interface PostProcessResult {
  /**
   * 处理后的响应内容
   */
  content: string

  /**
   * 提取的元数据
   */
  metadata?: Record<string, any>

  /**
   * 验证错误（如果有）
   */
  validationErrors?: string[]

  /**
   * 是否应该继续处理
   */
  shouldContinue: boolean
}

/**
 * 后处理器配置
 */
export interface PostProcessorConfig {
  /**
   * 启用的后处理器列表
   */
  enabled: string[]

  /**
   * 后处理器特定配置
   */
  options?: Record<string, any>
}
