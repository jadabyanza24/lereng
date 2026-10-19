import { defineConfig } from 'vitest/config';
export default defineConfig({test:{include:['tests/**/*.test.ts'],environment:'node',testTimeout:25000,hookTimeout:25000},resolve:{alias:{'@':new URL('./src',import.meta.url).pathname}}});
