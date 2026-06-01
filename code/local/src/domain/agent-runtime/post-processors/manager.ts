import type {
  ResponsePostProcessor,
  PostProcessContext,
  PostProcessResult,
  PostProcessorConfig
} from './types'

/**
 * 后处理器管理器
 * 管理和执行后处理器链
 */
export class PostProcessorManager {
  private readonly processors = new Map<string, ResponsePostProcessor>()

  constructor(private readonly config: PostProcessorConfig) {}

  /**
   * 注册后处理器
   */
  register(processor: ResponsePostProcessor): void {
    this.processors.set(processor.name, processor)
  }

  /**
   * 执行后处理器链
   */
  async process(
    response: string,
    context: PostProcessContext
  ): Promise<PostProcessResult> {
    let currentContent = response
    const allMetadata: Record<string, any> = {}
    const allValidationErrors: string[] = []

    // 按配置顺序执行启用的后处理器
    for (const processorName of this.config.enabled) {
      const processor = this.processors.get(processorName)
      if (!processor) {
        console.warn(`Post-processor '${processorName}' not found, skipping`)
        continue
      }

      try {
        const result = await processor.process(currentContent, context)

        // 更新内容
        currentContent = result.content

        // 合并元数据
        if (result.metadata) {
          allMetadata[processorName] = result.metadata
        }

        // 收集验证错误
        if (result.validationErrors) {
          allValidationErrors.push(...result.validationErrors)
        }

        // 如果处理器要求停止，则中断链
        if (!result.shouldContinue) {
          console.warn(
            `Post-processor '${processorName}' requested to stop processing`
          )
          break
        }
      } catch (error) {
        console.error(`Post-processor '${processorName}' failed:`, error)
        // 后处理失败不应该影响主流程，继续执行下一个
      }
    }

    return {
      content: currentContent,
      metadata: Object.keys(allMetadata).length > 0 ? allMetadata : undefined,
      validationErrors:
        allValidationErrors.length > 0 ? allValidationErrors : undefined,
      shouldContinue: allValidationErrors.length === 0
    }
  }

  /**
   * 获取已注册的后处理器列表
   */
  getRegisteredProcessors(): string[] {
    return Array.from(this.processors.keys())
  }
}
