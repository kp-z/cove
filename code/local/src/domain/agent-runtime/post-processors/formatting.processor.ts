import type {
  ResponsePostProcessor,
  PostProcessContext,
  PostProcessResult
} from './types'

/**
 * 格式化后处理器
 * 清理和格式化响应内容
 */
export class FormattingPostProcessor implements ResponsePostProcessor {
  readonly name = 'formatting'

  constructor(
    private readonly config: {
      trimWhitespace?: boolean
      normalizeLineEndings?: boolean
      removeExtraSpaces?: boolean
      fixMarkdown?: boolean
    } = {}
  ) {}

  async process(
    response: string,
    context: PostProcessContext
  ): Promise<PostProcessResult> {
    let content = response
    const changes: string[] = []

    // 修剪首尾空白
    if (this.config.trimWhitespace !== false) {
      const trimmed = content.trim()
      if (trimmed !== content) {
        content = trimmed
        changes.push('trimmed_whitespace')
      }
    }

    // 规范化行尾
    if (this.config.normalizeLineEndings !== false) {
      const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
      if (normalized !== content) {
        content = normalized
        changes.push('normalized_line_endings')
      }
    }

    // 移除多余空格
    if (this.config.removeExtraSpaces !== false) {
      const cleaned = content.replace(/ +/g, ' ')
      if (cleaned !== content) {
        content = cleaned
        changes.push('removed_extra_spaces')
      }
    }

    // 修复 Markdown 格式
    if (this.config.fixMarkdown !== false) {
      const fixed = this.fixMarkdownFormatting(content)
      if (fixed !== content) {
        content = fixed
        changes.push('fixed_markdown')
      }
    }

    return {
      content,
      shouldContinue: true,
      metadata: {
        formatted: true,
        changes: changes.length > 0 ? changes : undefined,
        originalLength: response.length,
        formattedLength: content.length
      }
    }
  }

  /**
   * 修复常见的 Markdown 格式问题
   */
  private fixMarkdownFormatting(content: string): string {
    let fixed = content

    // 确保代码块有正确的换行
    fixed = fixed.replace(/```(\w+)\n?/g, '```$1\n')
    fixed = fixed.replace(/\n?```/g, '\n```')

    // 确保标题前后有空行
    fixed = fixed.replace(/([^\n])\n(#{1,6} )/g, '$1\n\n$2')
    fixed = fixed.replace(/(#{1,6} [^\n]+)\n([^\n#])/g, '$1\n\n$2')

    // 确保列表项格式正确
    fixed = fixed.replace(/^(\d+)\. /gm, '$1. ')
    fixed = fixed.replace(/^- /gm, '- ')

    return fixed
  }
}
