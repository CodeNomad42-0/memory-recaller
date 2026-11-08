import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile'

// 把 public/data 下的题库全部内联为 window.__RECALLER_DATA__，
// 这样单文件产物用 file:// 直接打开也能读到题目，无需任何网络请求。
function inlineQuestionData(): Plugin {
  const dataDir = resolve(process.cwd(), 'public/data')

  return {
    name: 'recaller:inline-question-data',
    transformIndexHtml(html) {
      const data: Record<string, unknown> = {}
      for (const name of readdirSync(dataDir)) {
        if (name.endsWith('.json')) {
          data[name] = JSON.parse(readFileSync(resolve(dataDir, name), 'utf8'))
        }
      }

      // 转义 '<'，避免题面里出现 </script> 时提前闭合脚本标签。
      const payload = JSON.stringify(data).replace(/</g, '\\u003c')

      return {
        html,
        tags: [
          {
            tag: 'script',
            children: `window.__RECALLER_DATA__=${payload}`,
            injectTo: 'head-prepend'
          }
        ]
      }
    }
  }
}

export default defineConfig({
  base: './',
  publicDir: false,
  plugins: [vue(), inlineQuestionData(), viteSingleFile()],
  build: {
    outDir: 'dist-single',
    assetsDir: 'assets',
    cssCodeSplit: false
  }
})
