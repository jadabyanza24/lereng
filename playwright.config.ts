import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'tests/e2e',fullyParallel:false,workers:1,use:{baseURL:process.env.BASE_URL||'http://localhost:3000',headless:true,launchOptions:{args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']},trace:'retain-on-failure'},reporter:'list',timeout:45000});
