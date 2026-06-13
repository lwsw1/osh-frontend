<template>
  <div v-if="announcementRows.length > 0" class="announcement-panel">
    <div
      v-for="row in announcementRows"
      :key="row.type"
      class="announcement-row"
    >
      <span class="bar-label" :class="row.type">{{ row.label }}</span>
      <button
        type="button"
        class="bar-content"
        :class="{ clickable: row.item.jumpUrl }"
        @click="handleClick(row.item)"
      >
        {{ row.item.content || row.item.title }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { fetchConfig } from '~/composables/useHttp'

const { projectAnnouncements } = useWebSocket()

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

const announcementRows = computed(() => {
  const sourceItem = announcements.value.find(isSourceAnnouncement)
  const projectItem = announcements.value.find(item => !isSourceAnnouncement(item))
  const rows = []

  if (projectItem) {
    rows.push({
      type: 'project',
      label: '新项目',
      item: projectItem,
    })
  }

  if (sourceItem) {
    rows.push({
      type: 'source',
      label: '数据源',
      item: sourceItem,
    })
  }

  return rows
})

function handleClick(item) {
  if (item.jumpUrl) navigateTo(item.jumpUrl)
}

function isSourceAnnouncement(item) {
  const text = `${item?.content || ''}${item?.title || ''}`
  return text.includes('数据源') || text.includes('GitHub')
}

onMounted(() => {
  loadAnnouncements()
})
</script>

<style scoped>
.announcement-panel {
  display: grid;
  gap: 6px;
  background: linear-gradient(90deg, #eff6ff, #f0fdf4);
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  margin-bottom: 16px;
  padding: 8px 12px;
}

.announcement-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  min-height: 26px;
}

.bar-label {
  border-radius: 4px;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  white-space: nowrap;
}

.bar-label.source {
  background: #d1fae5;
  color: #047857;
}

.bar-content {
  min-width: 0;
  border: 0;
  background: transparent;
  color: #374151;
  cursor: default;
  font: inherit;
  font-size: 13px;
  line-height: 1.5;
  overflow: hidden;
  padding: 0;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bar-content.clickable {
  cursor: pointer;
}

.bar-content.clickable:hover {
  color: #1d4ed8;
  text-decoration: underline;
}

@media (max-width: 640px) {
  .announcement-row {
    grid-template-columns: 1fr;
    gap: 4px;
  }

  .bar-label {
    width: fit-content;
  }

  .bar-content {
    white-space: normal;
  }
}
</style>
