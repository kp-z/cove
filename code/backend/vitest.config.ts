import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
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
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      }
    }
  },
  resolve: {
    alias: {
      '@domain': path.resolve(__dirname, './01-domain'),
      '@application': path.resolve(__dirname, './02-application'),
      '@infrastructure': path.resolve(__dirname, './03-infrastructure'),
      '@shared': path.resolve(__dirname, './shared')
    },
    extensions: ['.ts', '.js', '.json']
  }
});
