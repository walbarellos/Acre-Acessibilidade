import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/ts/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/widget/text-normalizer.ts'],
      reporter: ['text', 'html'],
    },
  },
});
