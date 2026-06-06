import { defineNuxtConfig } from 'nuxt/config';
export default defineNuxtConfig({
  telemetry: false,
  ssr: false,
    css:[
        "@/assets/main.css"
    ], 
  app: {
    head: {
      link: [],
      script: [],
    },
  },

  // 2. 这里的配置是关键！改成 imports，并且开启深度扫描
  imports: {
    dirs: [
      'composables',
      'composables/**', // 这行最重要！加了它，你躲在 Api/Course 里的 js 才能被找到
    ],
  },

  // 添加代理配置解决跨域问题
  // 答疑模块已统一为 /pc/qna，与其他模块一致，直接走通用 /api -> /pc 规则即可。
  routeRules: {
    '/api/**': {
      proxy: 'http://localhost:8081/pc/**'
    }
  },

  // Nitro 配置 - 开发环境代理（解决 CORS 跨域）
  nitro: {
    devProxy: {
      '/api': {
        target: 'http://localhost:8081/pc',
        changeOrigin: true,
        prependPath: true
      }
    }
  }
});
