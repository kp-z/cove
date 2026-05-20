"use strict";
/**
 * ThreadService - Thread 管理业务逻辑
 *
 * 职责：
 * - 创建和管理 Thread
 * - 处理线程回复
 * - 查询线程消息和元数据
 *
 * 依赖：
 * - IThreadRepository: Thread 数据访问
 * - IMessageRepository: Message 数据访问
 * - IEventBus: 事件发布
 * - ILogger: 日志记录
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreadService = void 0;
const thread_errors_1 = require("./thread.errors");
const thread_entity_1 = require("../../../domain/models/thread/thread.entity");
const message_entity_1 = require("../../../domain/models/message/message.entity");
const realm_context_store_1 = require("../../context/realm-context-store");
class ThreadService {
    threadRepository;
    messageRepository;
    logger;
    constructor(threadRepository, messageRepository, logger) {
        this.threadRepository = threadRepository;
        this.messageRepository = messageRepository;
        this.logger = logger;
    }
    async getOrCreateThread(rootMessageId) {
        const context = (0, realm_context_store_1.getRealmContext)();
        const existing = await this.threadRepository.findById(rootMessageId);
        if (existing) {
            return existing;
        }
        const rootMessage = await this.messageRepository.findById(rootMessageId);
        if (!rootMessage) {
            throw new thread_errors_1.RootMessageNotFoundError(rootMessageId);
        }
        const thread = thread_entity_1.ThreadEntity.create({
            threadId: rootMessageId,
            channelId: rootMessage.channelId,
            rootMessageId,
            participants: [rootMessage.senderId],
            replyCount: 0,
            createdAt: new Date(),
        });
        await this.threadRepository.save(thread, context.realmId);
        this.logger.info('Thread created', { threadId: rootMessageId, channelId: rootMessage.channelId });
        return thread;
    }
    async replyInThread(rootMessageId, senderId, senderType, content) {
        const context = (0, realm_context_store_1.getRealmContext)();
        const rootMessage = await this.messageRepository.findById(rootMessageId);
        if (!rootMessage) {
            throw new thread_errors_1.RootMessageNotFoundError(rootMessageId);
        }
        if (rootMessage.threadId) {
            throw new thread_errors_1.NestedThreadError(rootMessageId);
        }
        const thread = await this.getOrCreateThread(rootMessageId);
        const messageId = this.generateMessageId();
        const msgShortId = messageId.split('-')[1]?.substring(0, 8) ?? 'unknown';
        const now = new Date();
        const message = message_entity_1.MessageEntity.create({
            messageId,
            msgShortId,
            channelId: thread.channelId,
            channelName: rootMessage.channelName,
            senderId,
            senderName: senderId,
            senderType,
            content,
            contentType: 'text',
            contentFormat: 'plain',
            threadId: rootMessageId,
            isThreadRoot: false,
            attachments: [],
            mentions: [],
            references: [],
            reactions: [],
            status: 'sent',
            isEdited: false,
            editHistory: [],
            createdAt: now,
            updatedAt: now,
            meta: {
                client: 'server',
                isPinned: false,
                isImportant: false,
            },
        });
        await this.messageRepository.save(message, context.realmId);
        const updatedThread = thread.addReply().addParticipant(senderId);
        await this.threadRepository.update(updatedThread, context.realmId);
        this.logger.info('Thread reply sent', { threadId: rootMessageId, messageId });
        return message;
    }
    async listThreadMessages(threadId, _cursor, _limit) {
        return this.messageRepository.findByThread(threadId);
    }
    async listChannelThreads(channelId) {
        return this.threadRepository.findByChannel(channelId);
    }
    // --- Private helpers ---
    generateMessageId() {
        return `message-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
}
exports.ThreadService = ThreadService;
// --- Application Layer Errors ---
