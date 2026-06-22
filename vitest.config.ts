import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    passWithNoTests: true,
    // infra/ tests run under Jest (ts-jest + aws-cdk-lib/assertions), not Vitest
    exclude: ['**/node_modules/**', '**/dist/**', '**/cdk.out/**', 'infra/**'],
    coverage: {
      exclude: ['infra/**'],
    },
  },
});
