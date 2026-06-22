import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/async_race/',
  plugins: [react()],
  server: { port: 3000 },
  build: { outDir: 'build' },
  // @ts-expect-error vitest extends vite config — type mismatch between bundled vite versions
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
  },
});
