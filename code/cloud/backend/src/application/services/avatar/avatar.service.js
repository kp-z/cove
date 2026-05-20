"use strict";
/**
 * Avatar Service - 头像管理服务
 *
 * 职责：
 * - 头像业务逻辑（上传、更新、删除）
 * - DiceBear 头像生成
 * - 头像类型管理（uploaded vs dicebear）
 *
 * 依赖：
 * - StorageService: 处理文件存储
 * - DicebearHelper: 生成 DiceBear URL
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvatarService = void 0;
const dicebear_helper_1 = require("./dicebear.helper");
class AvatarService {
    storageService;
    logger;
    maxAvatarSize = 2 * 1024 * 1024; // 2MB
    allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    constructor(storageService, logger) {
        this.storageService = storageService;
        this.logger = logger;
    }
    /**
     * 上传头像
     */
    async uploadAvatar(options) {
        const { entityType, entityId, fileBuffer, mimeType } = options;
        // 验证文件大小
        if (fileBuffer.length > this.maxAvatarSize) {
            throw new Error(`Avatar size exceeds maximum allowed size of ${this.maxAvatarSize / 1024 / 1024}MB`);
        }
        // 验证文件类型
        if (!this.allowedMimeTypes.includes(mimeType)) {
            throw new Error(`Invalid avatar type. Allowed types: ${this.allowedMimeTypes.join(', ')}`);
        }
        // 使用 StorageService 上传文件
        const fileInfo = await this.storageService.upload({
            category: 'avatars',
            subPath: `${entityType}s/${entityId}`,
            fileBuffer,
            mimeType,
            fileName: `avatar.${this.getExtension(mimeType)}`,
            overwrite: true, // 覆盖旧头像
        });
        this.logger.info('Avatar uploaded successfully', {
            entityType,
            entityId,
            size: fileInfo.size,
        });
        return {
            avatarUrl: fileInfo.relativePath,
            avatarType: 'uploaded',
        };
    }
    /**
     * 设置 DiceBear 头像
     */
    async setDicebearAvatar(options) {
        const { entityType, entityId, style, seed } = options;
        // 验证风格
        if (!dicebear_helper_1.DicebearHelper.isValidStyle(style)) {
            throw new Error(`Invalid DiceBear style: ${style}`);
        }
        // 生成或使用提供的种子
        const finalSeed = seed || dicebear_helper_1.DicebearHelper.generateRandomSeed();
        // 生成 URL
        const avatarUrl = dicebear_helper_1.DicebearHelper.generateUrl(style, finalSeed);
        this.logger.info('DiceBear avatar set successfully', {
            entityType,
            entityId,
            style,
            seed: finalSeed,
        });
        return {
            avatarUrl,
            avatarType: 'dicebear',
            avatarSeed: finalSeed,
            avatarStyle: style,
        };
    }
    /**
     * 生成随机 DiceBear 头像
     */
    async generateRandomAvatar(entityType, entityId, style) {
        const finalStyle = style || dicebear_helper_1.DicebearHelper.getDefaultStyle(entityType);
        const seed = dicebear_helper_1.DicebearHelper.generateRandomSeed();
        return this.setDicebearAvatar({
            entityType,
            entityId,
            style: finalStyle,
            seed,
        });
    }
    /**
     * 删除上传的头像
     */
    async deleteUploadedAvatar(entityType, entityId) {
        const avatarPath = `storage/avatars/${entityType}s/${entityId}`;
        await this.storageService.deleteDirectory(avatarPath);
        this.logger.info('Avatar deleted successfully', {
            entityType,
            entityId,
        });
    }
    /**
     * 获取头像 URL
     */
    getAvatarUrl(avatarType, avatarUrl, avatarSeed, avatarStyle) {
        if (avatarType === 'uploaded' && avatarUrl) {
            return this.storageService.getUrl(avatarUrl);
        }
        if (avatarType === 'dicebear' && avatarSeed && avatarStyle) {
            return dicebear_helper_1.DicebearHelper.generateUrl(avatarStyle, avatarSeed);
        }
        // 返回默认头像
        return this.getDefaultAvatarUrl();
    }
    /**
     * 获取可用的 DiceBear 风格列表
     */
    getAvailableStyles(entityType) {
        const styles = dicebear_helper_1.DicebearHelper.getAvailableStyles(entityType);
        return styles.map(style => ({
            id: style.id,
            name: style.name,
            description: style.description,
            previewUrl: dicebear_helper_1.DicebearHelper.getStylePreviewUrl(style.id),
            recommended: style.recommended,
        }));
    }
    /**
     * 获取默认头像 URL
     */
    getDefaultAvatarUrl() {
        return dicebear_helper_1.DicebearHelper.generateUrl('identicon', 'default');
    }
    /**
     * 根据 MIME 类型获取文件扩展名
     */
    getExtension(mimeType) {
        const mimeToExt = {
            'image/png': 'png',
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/webp': 'webp',
        };
        return mimeToExt[mimeType] || 'png';
    }
}
exports.AvatarService = AvatarService;
