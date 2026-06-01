import { describe, it, expect } from 'vitest'
import {
  ValidationPostProcessor,
  FormattingPostProcessor,
  MetadataExtractionPostProcessor,
  PostProcessorManager
} from '../post-processors'
import type { PostProcessContext } from '../post-processors'

describe('Post Processors', () => {
  const mockContext: PostProcessContext = {
    channelId: 'channel-1',
    messageId: 'msg-1',
    taskId: 'task-1',
    adapter: 'test-adapter',
    timestamp: new Date()
  }

  describe('ValidationPostProcessor', () => {
    it('应该验证响应长度', async () => {
      const processor = new ValidationPostProcessor({
        minLength: 10,
        maxLength: 100
      })

      // 太短
      const shortResult = await processor.process('short', mockContext)
      expect(shortResult.shouldContinue).toBe(false)
      expect(shortResult.validationErrors).toContain('Response too short: 5 < 10')

      // 太长
      const longText = 'a'.repeat(150)
      const longResult = await processor.process(longText, mockContext)
      expect(longResult.shouldContinue).toBe(false)
      expect(longResult.validationErrors).toContain('Response too long: 150 > 100')

      // 正常
      const validResult = await processor.process('This is a valid response', mockContext)
      expect(validResult.shouldContinue).toBe(true)
      expect(validResult.validationErrors).toBeUndefined()
    })

    it('应该检查必需的模式', async () => {
      const processor = new ValidationPostProcessor({
        requiredPatterns: [/hello/i, /world/i]
      })

      const result = await processor.process('Hello there', mockContext)
      expect(result.shouldContinue).toBe(false)
      expect(result.validationErrors?.some(e => e.includes('world'))).toBe(true)

      const validResult = await processor.process('Hello world', mockContext)
      expect(validResult.shouldContinue).toBe(true)
    })

    it('应该检查禁止的模式', async () => {
      const processor = new ValidationPostProcessor({
        forbiddenPatterns: [/badword/i, /spam/i]
      })

      const result = await processor.process('This contains badword', mockContext)
      expect(result.shouldContinue).toBe(false)
      expect(result.validationErrors?.some(e => e.includes('badword'))).toBe(true)

      const validResult = await processor.process('This is clean', mockContext)
      expect(validResult.shouldContinue).toBe(true)
    })

    it('应该拒绝空响应', async () => {
      const processor = new ValidationPostProcessor()

      const result = await processor.process('   ', mockContext)
      expect(result.shouldContinue).toBe(false)
      expect(result.validationErrors).toContain('Response is empty or contains only whitespace')
    })
  })

  describe('FormattingPostProcessor', () => {
    it('应该修剪空白', async () => {
      const processor = new FormattingPostProcessor()

      const result = await processor.process('  hello world  ', mockContext)
      expect(result.content).toBe('hello world')
      expect(result.metadata?.changes).toContain('trimmed_whitespace')
    })

    it('应该规范化行尾', async () => {
      const processor = new FormattingPostProcessor()

      const result = await processor.process('line1\r\nline2\rline3\n', mockContext)
      expect(result.content).toBe('line1\nline2\nline3')
      expect(result.metadata?.changes).toContain('normalized_line_endings')
    })

    it('应该移除多余空格', async () => {
      const processor = new FormattingPostProcessor()

      const result = await processor.process('hello    world', mockContext)
      expect(result.content).toBe('hello world')
      expect(result.metadata?.changes).toContain('removed_extra_spaces')
    })

    it('应该修复 Markdown 格式', async () => {
      const processor = new FormattingPostProcessor()

      const markdown = '```typescript\nconst x = 1```'
      const result = await processor.process(markdown, mockContext)
      expect(result.content).toContain('```typescript\n')
      expect(result.content).toContain('\n```')
      expect(result.metadata?.changes).toContain('fixed_markdown')
    })
  })

  describe('MetadataExtractionPostProcessor', () => {
    it('应该提取代码块', async () => {
      const processor = new MetadataExtractionPostProcessor()

      const content = '```typescript\nconst x = 1\n```\n\n```python\nprint("hello")\n```'
      const result = await processor.process(content, mockContext)

      expect(result.metadata?.codeBlocks).toHaveLength(2)
      expect(result.metadata?.codeBlocks[0].language).toBe('typescript')
      expect(result.metadata?.codeBlocks[1].language).toBe('python')
      expect(result.metadata?.hasCode).toBe(true)
    })

    it('应该提取链接', async () => {
      const processor = new MetadataExtractionPostProcessor()

      const content = 'Check out https://example.com and [GitHub](https://github.com)'
      const result = await processor.process(content, mockContext)

      expect(result.metadata?.links).toContain('https://example.com')
      expect(result.metadata?.links).toContain('https://github.com')
      expect(result.metadata?.hasLinks).toBe(true)
    })

    it('应该提取提及', async () => {
      const processor = new MetadataExtractionPostProcessor()

      const content = 'Hey @alice and @bob, check this out!'
      const result = await processor.process(content, mockContext)

      expect(result.metadata?.mentions).toContain('alice')
      expect(result.metadata?.mentions).toContain('bob')
      expect(result.metadata?.hasMentions).toBe(true)
    })

    it('应该估计情感', async () => {
      const processor = new MetadataExtractionPostProcessor()

      const positive = await processor.process('This is great and wonderful!', mockContext)
      expect(positive.metadata?.sentiment).toBe('positive')

      const negative = await processor.process('This is terrible and awful!', mockContext)
      expect(negative.metadata?.sentiment).toBe('negative')

      const neutral = await processor.process('This is a statement.', mockContext)
      expect(neutral.metadata?.sentiment).toBe('neutral')
    })

    it('应该提取关键词', async () => {
      const processor = new MetadataExtractionPostProcessor()

      const content = 'TypeScript TypeScript JavaScript programming code development'
      const result = await processor.process(content, mockContext)

      expect(result.metadata?.keywords).toContain('typescript')
      expect(result.metadata?.keywords.length).toBeGreaterThan(0)
    })

    it('应该统计基本信息', async () => {
      const processor = new MetadataExtractionPostProcessor()

      const content = 'Hello world.\n\nThis is a test.'
      const result = await processor.process(content, mockContext)

      expect(result.metadata?.stats.wordCount).toBe(6)
      expect(result.metadata?.stats.sentenceCount).toBe(2)
      expect(result.metadata?.stats.paragraphCount).toBe(2)
    })
  })

  describe('PostProcessorManager', () => {
    it('应该按顺序执行后处理器', async () => {
      const manager = new PostProcessorManager({
        enabled: ['validation', 'formatting', 'metadata-extraction']
      })

      manager.register(new ValidationPostProcessor({ minLength: 5 }))
      manager.register(new FormattingPostProcessor())
      manager.register(new MetadataExtractionPostProcessor())

      const result = await manager.process('  Hello world!  ', mockContext)

      expect(result.content).toBe('Hello world!')
      expect(result.metadata?.validation).toBeDefined()
      expect(result.metadata?.formatting).toBeDefined()
      expect(result.metadata?.['metadata-extraction']).toBeDefined()
    })

    it('应该在验证失败时停止', async () => {
      const manager = new PostProcessorManager({
        enabled: ['validation', 'formatting']
      })

      manager.register(new ValidationPostProcessor({ minLength: 100 }))
      manager.register(new FormattingPostProcessor())

      const result = await manager.process('short', mockContext)

      expect(result.shouldContinue).toBe(false)
      expect(result.validationErrors).toBeDefined()
      // formatting 不应该被执行，因为 validation 失败了
      expect(result.metadata?.formatting).toBeUndefined()
    })

    it('应该跳过未注册的后处理器', async () => {
      const manager = new PostProcessorManager({
        enabled: ['validation', 'unknown-processor']
      })

      manager.register(new ValidationPostProcessor())

      const result = await manager.process('Hello world', mockContext)

      expect(result.shouldContinue).toBe(true)
      expect(result.metadata?.validation).toBeDefined()
    })

    it('应该处理后处理器错误', async () => {
      const manager = new PostProcessorManager({
        enabled: ['failing-processor']
      })

      const failingProcessor = {
        name: 'failing-processor',
        process: async () => {
          throw new Error('Processor failed')
        }
      }

      manager.register(failingProcessor)

      // 不应该抛出错误
      const result = await manager.process('Hello world', mockContext)
      expect(result.content).toBe('Hello world')
    })

    it('应该返回已注册的后处理器列表', () => {
      const manager = new PostProcessorManager({
        enabled: []
      })

      manager.register(new ValidationPostProcessor())
      manager.register(new FormattingPostProcessor())

      const processors = manager.getRegisteredProcessors()
      expect(processors).toContain('validation')
      expect(processors).toContain('formatting')
    })
  })
})
