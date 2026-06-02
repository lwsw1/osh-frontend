<template>
  <div v-if="announcements.length > 0" class="announcement-bar">
    <!-- 左侧标签 -->
    <span class="bar-label">🆕 新项目</span>

    <!-- 滚动文字区域 -->

    <div class="bar-scroll-wrap"
         @mouseenter="paused = true"
         @mouseleave="paused = false"
    >
      <div class="bar-scroll" :style="{ animationDuration: scrollDuration, animationPlayState: paused ? 'paused' : 'running' }">
        <span
          v-for="(item, idx) in announcements"
          :key="item.id"
          class="bar-item"
          @click="handleClick(item)"
        >
          {{ item.content || item.title }}
          <span v-if="idx < announcements.length - 1" class="bar-sep">·</span>
        </span>
        <!-- 复制一份实现无缝滚动 -->
        <span
          v-for="(item, idx) in announcements"
          :key="`dup-${item.id}`"
          class="bar-item"
          @click="handleClick(item)"
        >
          {{ item.content || item.title }}
          <span v-if="idx < announcements.length - 1" class="bar-sep">·</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { fetchConfig } from '~/composables/useHttp'

const { projectAnnouncements } = useWebSocket()

const paused = ref(false)

// 从 MySQL 加载的公告
const dbAnnouncements = ref([])

async function loadAnnouncements() {
  try {
    const headers = { appid: fetchConfig.headers.appid }
    if (process.client) {
      const token = localStorage.getItem('token') || ''
      if (token) headers.token = token
    }
    const res = await $fetch('/openproject/announcements', {
      baseURL: fetchConfig.baseURL,
      headers,
    })
    const list = res?.data || res || []
    dbAnnouncements.value = list.map(item => ({
      id: item.id,
      content: item.title,
      jumpUrl: item.link,
    }))
  } catch (e) {
    dbAnnouncements.value = []
  }
}

// WebSocket 推送优先，没有推送时用 MySQL 数据
const announcements = computed(() => {
  if (projectAnnouncements.value && projectAnnouncements.value.length > 0) {
    return projectAnnouncements.value
  }
  return dbAnnouncements.value
})

// 根据条数动态调整滚动速度
const scrollDuration = computed(() => {
  const count = announcements.value.length
  return `${Math.max(10, count * 6)}s`
})

function handleClick(item) {
  if (item.jumpUrl) navigateTo(item.jumpUrl)
}

onMounted(() => {
  loadAnnouncements()
})
</script>

<style scoped>
.announcement-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(90deg, #eff6ff, #f0fdf4);
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 8px 14px;
  margin-bottom: 16px;
  overflow: hidden;
}

.bar-label {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  color: #1d4ed8;
  background: #dbeafe;
  padding: 2px 8px;
  border-radius: 4px;
  white-space: nowrap;
}

/* 滚动容器 */
.bar-scroll-wrap {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.bar-scroll {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  animation: scroll-left linear infinite;
}

@keyframes scroll-left {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.bar-item {
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  padding: 0 8px;
  transition: color 0.15s;
}
.bar-item:hover { color: #1d4ed8; text-decoration: underline; }

.bar-sep {
  color: #9ca3af;
  margin-left: 8px;
}
</style>
