import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts', '**/*.spec.ts'],
    exclude: [
      'node_modules/**',
      'dist/**',
      '.git/**',
      '**/node_modules/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types.ts',
        '**/index.ts',
        '**/*.d.ts'
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    }
  }
});
