/**
 * MSW Server - Node 环境（Vitest）
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
