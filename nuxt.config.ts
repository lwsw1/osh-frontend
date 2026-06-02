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
  routeRules: {
    '/api/qna/**': {
      proxy: 'http://localhost:8081/api/qna/**'
    },
    // @deprecated 2026-05-31 后端已统一去除 public 前缀（/pc/public/feedback -> /pc/feedback），
    // 前端 composables/assistant.js 已全部切到新路径，本规则保留作为过渡期标记，
    // 确认线上无残留请求后可整段删除。
    // '/api/public/**': {
    //   proxy: 'http://localhost:8081/public/**'
    // },
    '/api/**': {
      proxy: 'http://localhost:8081/pc/**'
    }
  },

  // Nitro 配置 - 开发环境代理（解决 CORS 跨域）
  nitro: {
    devProxy: {
      '/api/qna': {
        target: 'http://localhost:8081/api/qna',
        changeOrigin: true,
        prependPath: true
      },
      // @deprecated 2026-05-31 后端已统一去除 public 前缀，前端不再走 /api/public，
      // 通用规则 /api -> /pc 已能覆盖。保留作为过渡期标记，确认无残留请求后可整段删除。
      // '/api/public': {
      //   target: 'http://localhost:8081/public',
      //   changeOrigin: true,
      //   prependPath: true
      // },
      '/api': {
        target: 'http://localhost:8081/pc',
        changeOrigin: true,
        prependPath: true
      }
    }
  }
});
