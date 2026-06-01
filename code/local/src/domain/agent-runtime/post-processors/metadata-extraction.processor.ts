import type {
  ResponsePostProcessor,
  PostProcessContext,
  PostProcessResult
} from './types'

/**
 * 元数据提取后处理器
 * 从响应中提取有用的元数据
 */
export class MetadataExtractionPostProcessor implements ResponsePostProcessor {
  readonly name = 'metadata-extraction'

  constructor(
    private readonly config: {
      extractCodeBlocks?: boolean
      extractLinks?: boolean
      extractMentions?: boolean
      estimateSentiment?: boolean
      extractKeywords?: boolean
    } = {}
  ) {}

  async process(
    response: string,
    context: PostProcessContext
  ): Promise<PostProcessResult> {
    const metadata: Record<string, any> = {}

    // 提取代码块
    if (this.config.extractCodeBlocks !== false) {
      const codeBlocks = this.extractCodeBlocks(response)
      if (codeBlocks.length > 0) {
        metadata.codeBlocks = codeBlocks
        metadata.hasCode = true
      }
    }

    // 提取链接
    if (this.config.extractLinks !== false) {
      const links = this.extractLinks(response)
      if (links.length > 0) {
        metadata.links = links
        metadata.hasLinks = true
      }
    }

    // 提取提及（@mentions）
    if (this.config.extractMentions !== false) {
      const mentions = this.extractMentions(response)
      if (mentions.length > 0) {
        metadata.mentions = mentions
        metadata.hasMentions = true
      }
    }

    // 估计情感
    if (this.config.estimateSentiment !== false) {
      metadata.sentiment = this.estimateSentiment(response)
    }

    // 提取关键词
    if (this.config.extractKeywords !== false) {
      metadata.keywords = this.extractKeywords(response)
    }

    // 基本统计
    metadata.stats = {
      wordCount: this.countWords(response),
      sentenceCount: this.countSentences(response),
      paragraphCount: this.countParagraphs(response),
      characterCount: response.length
    }

    return {
      content: response,
      shouldContinue: true,
      metadata
    }
  }

  /**
   * 提取代码块
   */
  private extractCodeBlocks(content: string): Array<{ language: string; code: string }> {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
    const blocks: Array<{ language: string; code: string }> = []
    let match

    while ((match = codeBlockRegex.exec(content)) !== null) {
      blocks.push({
        language: match[1] || 'plaintext',
        code: match[2].trim()
      })
    }

    return blocks
  }

  /**
   * 提取链接
   */
  private extractLinks(content: string): string[] {
    const urlRegex = /https?:\/\/[^\s)]+/g
    const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
    const links: string[] = []

    // 提取普通 URL
    let match
    while ((match = urlRegex.exec(content)) !== null) {
      links.push(match[0])
    }

    // 提取 Markdown 链接
    while ((match = markdownLinkRegex.exec(content)) !== null) {
      links.push(match[2])
    }

    return [...new Set(links)] // 去重
  }

  /**
   * 提取提及
   */
  private extractMentions(content: string): string[] {
    const mentionRegex = /@(\w+)/g
    const mentions: string[] = []
    let match

    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1])
    }

    return [...new Set(mentions)] // 去重
  }

  /**
   * 估计情感（简单的基于关键词的方法）
   */
  private estimateSentiment(content: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = [
      'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
      'perfect', 'love', 'best', 'awesome', 'happy', 'success', 'successful'
    ]
    const negativeWords = [
      'bad', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'fail',
      'failed', 'error', 'problem', 'issue', 'wrong', 'broken', 'bug'
    ]

    const lowerContent = content.toLowerCase()
    let positiveCount = 0
    let negativeCount = 0

    for (const word of positiveWords) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi')
      const matches = lowerContent.match(regex)
      if (matches) positiveCount += matches.length
    }

    for (const word of negativeWords) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi')
      const matches = lowerContent.match(regex)
      if (matches) negativeCount += matches.length
    }

    if (positiveCount > negativeCount) return 'positive'
    if (negativeCount > positiveCount) return 'negative'
    return 'neutral'
  }

  /**
   * 提取关键词（简单的基于频率的方法）
   */
  private extractKeywords(content: string): string[] {
    // 移除代码块和链接
    let text = content.replace(/```[\s\S]*?```/g, '')
    text = text.replace(/https?:\/\/[^\s)]+/g, '')

    // 分词
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3) // 只保留长度 > 3 的词

    // 停用词
    const stopWords = new Set([
      'this', 'that', 'with', 'from', 'have', 'been', 'will', 'would',
      'could', 'should', 'about', 'which', 'their', 'there', 'when',
      'where', 'what', 'how', 'why', 'who', 'whom', 'whose', 'these',
      'those', 'then', 'than', 'such', 'into', 'through', 'during'
    ])

    // 计算词频
    const wordFreq = new Map<string, number>()
    for (const word of words) {
      if (!stopWords.has(word)) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
      }
    }

    // 返回前 10 个高频词
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word)
  }

  /**
   * 统计单词数
   */
  private countWords(content: string): number {
    return content.split(/\s+/).filter(word => word.length > 0).length
  }

  /**
   * 统计句子数
   */
  private countSentences(content: string): number {
    return content.split(/[.!?]+/).filter(s => s.trim().length > 0).length
  }

  /**
   * 统计段落数
   */
  private countParagraphs(content: string): number {
    return content.split(/\n\n+/).filter(p => p.trim().length > 0).length
  }
}
