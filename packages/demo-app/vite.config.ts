import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // 从环境变量读取端口，默认 5174
    port: parseInt(process.env.PORT || '5174', 10),
    // 从环境变量读取主机，默认 localhost（开发环境），0.0.0.0（容器环境）
    host: process.env.HOST || (process.env.DOCKER ? '0.0.0.0' : 'localhost'),
    // 启用 CORS
    cors: true,
    // 严格端口检查（如果端口被占用则失败，不自动切换）
    strictPort: true,
    // 代理配置（如果需要）
    proxy: {}
  },
  // 环境变量配置
  envPrefix: ['VITE_', 'SUBDOMAIN_PREFIX'],
  // 构建配置
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'development',
    // 生产环境构建优化
    minify: process.env.NODE_ENV === 'production' ? 'esbuild' : false
  }
});
