import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// `VITE_BASE` 可在部署时覆盖为 '/<repo-name>/'；默认 './' 让产物在任意子路径下都能加载。
export default defineConfig({
  base: process.env.VITE_BASE ?? './',
  plugins: [vue()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
