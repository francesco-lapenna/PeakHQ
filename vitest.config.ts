import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    passWithNoTests: true,
    // infra/ tests run under Jest (ts-jest + aws-cdk-lib/assertions), not Vitest
    exclude: ['**/node_modules/**', '**/dist/**', '**/cdk.out/**', 'infra/**'],
    projects: [
      {
        resolve: {
          alias: { '@': path.resolve(__dirname, './frontend/src') },
        },
        test: {
          name: 'frontend',
          include: ['frontend/**/*.test.{ts,tsx}'],
          environment: 'jsdom',
          setupFiles: ['./frontend/src/test-setup.ts'],
        },
      },
      {
        test: {
          name: 'backend',
          include: ['backend/**/*.test.ts'],
          environment: 'node',
        },
      },
    ],
    coverage: {
      exclude: ['infra/**'],
    },
  },
});
