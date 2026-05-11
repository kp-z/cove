/**
 * MSW Browser - 浏览器环境（开发）
 */

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
