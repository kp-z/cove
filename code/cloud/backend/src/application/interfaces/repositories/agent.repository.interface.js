"use strict";
/**
 * IAgentRepository - Agent Repository 接口
 *
 * Application Layer 通过此接口访问 Agent 数据，不依赖具体实现。
 * Infrastructure Layer 负责实现此接口（如 PrismaAgentRepository）。
 *
 * 设计原则：
 * - 依赖倒置：Application 依赖接口，Infrastructure 实现接口
 * - 返回 Domain Entity，不返回数据库模型
 * - 所有方法返回 Promise（异步操作）
 */
Object.defineProperty(exports, "__esModule", { value: true });
