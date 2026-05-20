"use strict";
/**
 * Avatar Router - 头像相关 API
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAvatarRouter = createAvatarRouter;
const zod_1 = require("zod");
const trpc_1 = require("../trpc");
function createAvatarRouter(avatarService) {
    return (0, trpc_1.router)({
        /**
         * 获取可用的 DiceBear 风格列表
         */
        getAvailableStyles: trpc_1.publicProcedure
            .input(zod_1.z
            .object({
            entityType: zod_1.z.enum(['user', 'agent', 'channel', 'realm']).optional(),
        })
            .optional())
            .query(async ({ input }) => {
            const styles = avatarService.getAvailableStyles(input?.entityType);
            return {
                styles,
            };
        }),
    });
}
