"use strict";
/**
 * ThreadEntity - 线程实体（聚合根）
 *
 * 线程是消息的子对话，由一条根消息发起，支持多人回复。
 *
 * 业务规则：
 * - threadId 必须等于 rootMessageId
 * - channelId 不能为空
 * - Entity 是不可变的（更新返回新实例）
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreadEntity = void 0;
class ThreadEntity {
    props;
    constructor(props) {
        this.props = props;
        this.validate();
    }
    static create(props) {
        return new ThreadEntity(props);
    }
    static fromJSON(json) {
        return ThreadEntity.create({
            threadId: json.thread_id,
            channelId: json.channel_id,
            rootMessageId: json.root_message_id,
            participants: json.participants,
            replyCount: json.reply_count,
            lastReplyAt: json.last_reply_at ? new Date(json.last_reply_at) : undefined,
            createdAt: new Date(json.created_at),
        });
    }
    validate() {
        if (!this.props.threadId || this.props.threadId.trim() === '') {
            throw new Error('Thread ID cannot be empty');
        }
        if (!this.props.channelId || this.props.channelId.trim() === '') {
            throw new Error('Channel ID cannot be empty');
        }
        if (!this.props.rootMessageId || this.props.rootMessageId.trim() === '') {
            throw new Error('Root message ID cannot be empty');
        }
        if (this.props.threadId !== this.props.rootMessageId) {
            throw new Error('Thread ID must equal root message ID');
        }
    }
    // --- Getters ---
    get threadId() { return this.props.threadId; }
    get channelId() { return this.props.channelId; }
    get rootMessageId() { return this.props.rootMessageId; }
    get participants() { return this.props.participants; }
    get replyCount() { return this.props.replyCount; }
    get lastReplyAt() { return this.props.lastReplyAt; }
    get createdAt() { return this.props.createdAt; }
    // --- Immutable updates ---
    addReply() {
        return ThreadEntity.create({
            ...this.props,
            replyCount: this.props.replyCount + 1,
            lastReplyAt: new Date(),
        });
    }
    addParticipant(actorId) {
        if (this.props.participants.includes(actorId)) {
            return this;
        }
        return ThreadEntity.create({
            ...this.props,
            participants: [...this.props.participants, actorId],
        });
    }
    // --- Equality ---
    equals(other) {
        return this.props.threadId === other.props.threadId;
    }
    // --- Serialization ---
    toJSON() {
        return {
            thread_id: this.props.threadId,
            channel_id: this.props.channelId,
            root_message_id: this.props.rootMessageId,
            participants: this.props.participants,
            reply_count: this.props.replyCount,
            last_reply_at: this.props.lastReplyAt?.toISOString(),
            created_at: this.props.createdAt.toISOString(),
        };
    }
}
exports.ThreadEntity = ThreadEntity;
