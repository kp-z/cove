"use strict";
/**
 * DiceBear Helper - DiceBear API 工具类
 *
 * 提供 DiceBear 头像生成的辅助功能
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DicebearHelper = void 0;
const crypto = __importStar(require("crypto"));
class DicebearHelper {
    static API_BASE = 'https://api.dicebear.com/9.x';
    // 可用的 DiceBear 风格
    static AVAILABLE_STYLES = [
        {
            id: 'adventurer',
            name: 'Adventurer',
            description: '冒险者风格',
            previewSeed: 'preview-adventurer',
            recommended: ['user'],
        },
        {
            id: 'avataaars',
            name: 'Avataaars',
            description: '卡通人物风格',
            previewSeed: 'preview-avataaars',
            recommended: ['user'],
        },
        {
            id: 'bottts',
            name: 'Bottts',
            description: '机器人风格',
            previewSeed: 'preview-bottts',
            recommended: ['agent'],
        },
        {
            id: 'identicon',
            name: 'Identicon',
            description: '几何图形风格',
            previewSeed: 'preview-identicon',
            recommended: ['user', 'agent'],
        },
        {
            id: 'initials',
            name: 'Initials',
            description: '首字母风格',
            previewSeed: 'preview-initials',
            recommended: ['channel', 'realm'],
        },
        {
            id: 'lorelei',
            name: 'Lorelei',
            description: '女性角色风格',
            previewSeed: 'preview-lorelei',
            recommended: ['user'],
        },
        {
            id: 'micah',
            name: 'Micah',
            description: '简约人物风格',
            previewSeed: 'preview-micah',
            recommended: ['user'],
        },
        {
            id: 'pixel-art',
            name: 'Pixel Art',
            description: '像素艺术风格',
            previewSeed: 'preview-pixel-art',
            recommended: ['user', 'agent'],
        },
        {
            id: 'shapes',
            name: 'Shapes',
            description: '抽象形状风格',
            previewSeed: 'preview-shapes',
            recommended: ['realm', 'channel'],
        },
        {
            id: 'thumbs',
            name: 'Thumbs',
            description: '拇指图标风格',
            previewSeed: 'preview-thumbs',
            recommended: ['user'],
        },
    ];
    // 默认风格映射
    static DEFAULT_STYLES = {
        user: 'avataaars',
        agent: 'bottts',
        channel: 'initials',
        realm: 'shapes',
    };
    /**
     * 生成 DiceBear 头像 URL
     */
    static generateUrl(style, seed, options) {
        const params = new URLSearchParams();
        params.append('seed', seed);
        if (options) {
            Object.entries(options).forEach(([key, value]) => {
                if (value !== undefined) {
                    params.append(key, String(value));
                }
            });
        }
        return `${this.API_BASE}/${style}/svg?${params.toString()}`;
    }
    /**
     * 生成随机种子
     */
    static generateRandomSeed() {
        return crypto.randomUUID();
    }
    /**
     * 根据实体类型获取默认风格
     */
    static getDefaultStyle(entityType) {
        return this.DEFAULT_STYLES[entityType];
    }
    /**
     * 获取所有可用风格
     */
    static getAvailableStyles(entityType) {
        if (!entityType) {
            return this.AVAILABLE_STYLES;
        }
        return this.AVAILABLE_STYLES.filter(style => style.recommended.includes(entityType));
    }
    /**
     * 验证风格是否有效
     */
    static isValidStyle(style) {
        return this.AVAILABLE_STYLES.some(s => s.id === style);
    }
    /**
     * 根据实体名称生成种子
     */
    static generateSeedFromName(name) {
        return name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    }
    /**
     * 获取风格的预览 URL
     */
    static getStylePreviewUrl(style) {
        const styleConfig = this.AVAILABLE_STYLES.find(s => s.id === style);
        const seed = styleConfig?.previewSeed || 'preview';
        return this.generateUrl(style, seed);
    }
}
exports.DicebearHelper = DicebearHelper;
