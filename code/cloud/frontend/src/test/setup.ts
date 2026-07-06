import { beforeEach } from 'vitest';
import '@testing-library/jest-dom';

// Create storage mock before any other imports
const createStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
};

// Set up storage mocks on global object
const localStorageMock = createStorageMock();
const sessionStorageMock = createStorageMock();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

Object.defineProperty(global, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
  configurable: true,
});

// Now import modules that use localStorage
import '@/core/i18n';
// 注：MSW mock server（'@/mocks/server'）已在此前的重构中被整体删除，
// 但本文件遗留了对它的引用，导致所有前端单测都无法启动。
// 这里移除失效引用以恢复测试基础设施；如需 MSW mock，请重新搭建 '@/mocks' 目录。

// Clear localStorage before each test
beforeEach(() => {
  localStorageMock.clear();
  sessionStorageMock.clear();
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
} as unknown as typeof IntersectionObserver;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  }),
});

// Mock WebSocket：测试环境下没有真实后端，trpc.ts 中的 wsClient（lazy）一旦被某个
// 测试间接触发订阅，就会用 Node 自带的真实 WebSocket（基于 undici）尝试连接
// ws://localhost:3002，连接失败时会在 undici 内部抛出一个非标准的未捕获异常，
// 污染无关测试的输出。这里用一个不做任何真实网络操作的假 WebSocket 类替代，
// 避免测试意外发起真实网络连接。
class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: (() => void) | null = null;
  url: string | URL;

  constructor(url: string | URL) {
    this.url = url;
  }

  addEventListener(): void {}
  removeEventListener(): void {}
  send(): void {}
  close(): void {
    this.readyState = MockWebSocket.CLOSED;
  }
}

global.WebSocket = MockWebSocket as unknown as typeof WebSocket;
