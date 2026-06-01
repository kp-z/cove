import type {
  ResponsePostProcessor,
  PostProcessContext,
  PostProcessResult
} from './types'

/**
 * 验证后处理器
 * 验证响应的格式、长度和完整性
 */
export class ValidationPostProcessor implements ResponsePostProcessor {
  readonly name = 'validation'

  constructor(
    private readonly config: {
      minLength?: number
      maxLength?: number
      requiredPatterns?: RegExp[]
      forbiddenPatterns?: RegExp[]
    } = {}
  ) {}

  async process(
    response: string,
    context: PostProcessContext
  ): Promise<PostProcessResult> {
    const validationErrors: string[] = []

    // 检查最小长度
    if (this.config.minLength && response.length < this.config.minLength) {
      validationErrors.push(
        `Response too short: ${response.length} < ${this.config.minLength}`
      )
    }

    // 检查最大长度
    if (this.config.maxLength && response.length > this.config.maxLength) {
      validationErrors.push(
        `Response too long: ${response.length} > ${this.config.maxLength}`
      )
    }

    // 检查必需的模式
    if (this.config.requiredPatterns) {
      for (const pattern of this.config.requiredPatterns) {
        if (!pattern.test(response)) {
          validationErrors.push(
            `Response missing required pattern: ${pattern.source}`
          )
        }
      }
    }

    // 检查禁止的模式
    if (this.config.forbiddenPatterns) {
      for (const pattern of this.config.forbiddenPatterns) {
        if (pattern.test(response)) {
          validationErrors.push(
            `Response contains forbidden pattern: ${pattern.source}`
          )
        }
      }
    }

    // 检查是否为空或只有空白字符
    if (!response.trim()) {
      validationErrors.push('Response is empty or contains only whitespace')
    }

    return {
      content: response,
      validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
      shouldContinue: validationErrors.length === 0,
      metadata: {
        validated: true,
        validationPassed: validationErrors.length === 0,
        responseLength: response.length
      }
    }
  }
}
