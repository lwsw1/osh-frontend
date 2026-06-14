<template>
  <div class="behavior-page">
    <nav class="admin-subnav" aria-label="后台管理导航">
      <nuxt-link to="/admin/users" class="admin-subnav-item">用户管理</nuxt-link>
      <nuxt-link to="/admin/behavior" class="admin-subnav-item active">行为数据</nuxt-link>
      <nuxt-link to="/admin/contribution" class="admin-subnav-item">贡献统计</nuxt-link>
    </nav>

    <header class="page-header">
      <div>
        <h1>用户行为数据</h1>
        <p>查看用户行为轨迹、访问状态和活跃排行。</p>
      </div>
      <n-button type="primary" :loading="loading" @click="reloadAll">刷新</n-button>
    </header>

    <section class="filters">
      <n-date-picker v-model:value="timeRange" type="datetimerange" clearable />
      <n-input v-model:value="query.username" placeholder="用户名称" clearable />
      <n-select v-model:value="query.roleLevel" :options="roleLevelOptions" placeholder="角色等级" clearable />
      <n-select v-model:value="query.module" :options="moduleOptions" placeholder="选择模块" clearable filterable />
      <n-select v-model:value="query.actionType" :options="actionTypeOptions" placeholder="选择行为类型" clearable filterable />
      <n-select v-model:value="query.resourceType" :options="resourceTypeOptions" placeholder="选择资源类型" clearable filterable />
      <n-button @click="resetFilters">重置</n-button>
    </section>

    <section class="summary-grid">
      <div class="metric">
        <span>行为总数</span>
        <strong>{{ formatNumber(summary.totalEvents) }}</strong>
      </div>
      <div class="metric">
        <span>活跃用户</span>
        <strong>{{ formatNumber(summary.activeUsers) }}</strong>
      </div>
      <div class="metric">
        <span>失败行为</span>
        <strong>{{ formatNumber(summary.failedEvents) }}</strong>
      </div>
      <div class="metric">
        <span>平均耗时</span>
        <strong>{{ formatNumber(Math.round(summary.avgDurationMs || 0)) }} ms</strong>
      </div>
    </section>

    <n-tabs v-model:value="activeTab" type="line" animated>
      <n-tab-pane name="events" tab="行为明细">
        <div class="panel">
          <n-data-table
            remote
            :loading="eventsLoading"
            :columns="eventColumns"
            :data="events"
            :pagination="eventPagination"
            :row-key="row => row.id"
            :scroll-x="1280"
            @update:page="changeEventPage"
            @update:page-size="changeEventPageSize"
          />
        </div>
      </n-tab-pane>

      <n-tab-pane name="insight" tab="统计概览">
        <div class="insight-grid">
          <div class="panel">
            <h3>模块分布</h3>
            <div v-for="item in modules" :key="item.label || 'empty'" class="rank-row">
              <span>{{ item.label || '未标记' }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </div>
          <div class="panel">
            <h3>行为类型分布</h3>
            <div v-for="item in actions" :key="item.label || 'empty'" class="rank-row">
              <span>{{ findActionLabel(item.label) }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </div>
          <div class="panel wide">
            <h3>活跃用户排行</h3>
            <n-data-table :columns="activeUserColumns" :data="activeUsers" :pagination="false" />
          </div>
        </div>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<script setup>
import { h, ref, reactive, computed, watch, onMounted } from 'vue'
import { NButton, NDataTable, NDatePicker, NInput, NSelect, NTabs, NTabPane, NTag } from 'naive-ui'
import {
  apiGetBehaviorMeta,
  apiGetBehaviorOverview,
  apiGetBehaviorEvents
} from '~/composables/Api/Admin/behavior'

useHead({ title: '用户行为数据' })

const activeTab = ref('events')
const loading = ref(false)
const eventsLoading = ref(false)
const timeRange = ref(null)

const query = reactive({
  username: '',
  roleLevel: null,
  module: null,
  actionType: null,
  resourceType: null,
  pageNum: 1,
  pageSize: 20
})

const summary = ref({})
const modules = ref([])
const actions = ref([])
const activeUsers = ref([])
const events = ref([])
const eventTotal = ref(0)
const roleLevels = ref([])
const modulesMeta = ref([])
const resourceTypes = ref([])
const actionTypes = ref([])

const roleLevelOptions = computed(() => roleLevels.value)

const resourceTypeOptions = computed(() => resourceTypes.value.map(item => ({
  label: `${item.label}${item.paidCapable ? '（可收费）' : ''}`,
  value: item.code
})))

const moduleOptions = computed(() => modulesMeta.value.map(item => ({
  label: item.label,
  value: item.code
})))

const actionTypeOptions = computed(() => actionTypes.value.map(item => ({
  label: item.label,
  value: item.code
})))

const eventPagination = reactive({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100]
})

const eventColumns = [
  { title: '时间', key: 'happenTime', width: 180, render: row => formatTime(row.happenTime) },
  { title: '用户', key: 'username', width: 140, render: row => row.userId ? h('a', { onClick: () => navigateTo(`/admin/user/${row.userId}`) }, row.username || row.userId) : '匿名' },
  { title: '等级', key: 'roleLevel', width: 80, render: row => row.roleLevel ? `Lv.${row.roleLevel}` : '-' },
  { title: '模块', key: 'module', width: 140 },
  { title: '行为', key: 'actionType', width: 110, render: row => findActionLabel(row.actionType) },
  { title: '资源类型', key: 'resourceType', width: 120, render: row => findResourceLabel(row.resourceType) },
  { title: '资源', key: 'resourceName', width: 220, ellipsis: { tooltip: true }, render: row => row.resourceName || row.resourceId || '-' },
  { title: '状态', key: 'status', width: 100, render: row => h(NTag, { type: isSuccess(row.status) ? 'success' : 'error', size: 'small' }, { default: () => row.status || '-' }) },
  { title: '耗时', key: 'durationMs', width: 100, render: row => `${row.durationMs || 0} ms` },
  { title: '路径', key: 'requestUri', minWidth: 220, ellipsis: { tooltip: true } }
]

const activeUserColumns = [
  { title: '用户', key: 'username', render: row => row.userId ? h('a', { onClick: () => navigateTo(`/admin/user/${row.userId}`) }, row.username || row.userId) : '匿名' },
  { title: '等级', key: 'roleLevel', width: 90, render: row => row.roleLevel ? `Lv.${row.roleLevel}` : '-' },
  { title: '行为数', key: 'eventCount', width: 100 },
  { title: '最近行为', key: 'lastHappenTime', width: 180, render: row => formatTime(row.lastHappenTime) }
]

const normalizedQuery = computed(() => {
  const body = { ...query }
  if (timeRange.value?.length === 2) {
    body.startTime = formatDateTime(timeRange.value[0])
    body.endTime = formatDateTime(timeRange.value[1])
  }
  return body
})

watch(() => [query.username, query.roleLevel, query.module, query.actionType, query.resourceType, timeRange.value], debounce(() => {
  query.pageNum = 1
  eventPagination.page = 1
  reloadAll()
}, 350), { deep: true })

onMounted(async () => {
  await loadMeta()
  await reloadAll()
})

async function loadMeta() {
  const res = await apiGetBehaviorMeta()
  const data = res?.data || {}
  roleLevels.value = data.roleLevels || []
  modulesMeta.value = data.modules || []
  resourceTypes.value = data.resourceTypes || []
  actionTypes.value = data.actionTypes || []
}

async function reloadAll() {
  loading.value = true
  try {
    await Promise.all([loadOverview(), loadEvents()])
  } finally {
    loading.value = false
  }
}

async function loadOverview() {
  const res = await apiGetBehaviorOverview(normalizedQuery.value)
  const data = res?.data || {}
  summary.value = data.summary || {}
  modules.value = data.modules || []
  actions.value = data.actions || []
  activeUsers.value = data.activeUsers || []
}

async function loadEvents() {
  eventsLoading.value = true
  try {
    const res = await apiGetBehaviorEvents(normalizedQuery.value)
    const data = res?.data || {}
    events.value = data.rows || []
    eventTotal.value = data.total || 0
    eventPagination.itemCount = eventTotal.value
  } finally {
    eventsLoading.value = false
  }
}

function changeEventPage(page) {
  query.pageNum = page
  eventPagination.page = page
  loadEvents()
}

function changeEventPageSize(size) {
  query.pageNum = 1
  query.pageSize = size
  eventPagination.page = 1
  eventPagination.pageSize = size
  loadEvents()
}

function resetFilters() {
  timeRange.value = null
  query.username = ''
  query.roleLevel = null
  query.module = null
  query.actionType = null
  query.resourceType = null
}

function findResourceLabel(code) {
  if (!code) return '-'
  return resourceTypes.value.find(item => item.code === code)?.label || code
}

function findActionLabel(code) {
  if (!code) return '未标记'
  return actionTypes.value.find(item => item.code === code)?.label || code
}

function isSuccess(status) {
  return status === 'SUCCESS' || status === '成功' || status === '操作成功' || status === '0'
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString()
}

function formatDateTime(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function formatTime(value) {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 19)
}

function debounce(fn, wait) {
  let timer = null
  return (...args) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), wait)
  }
}
</script>

<style scoped>
.behavior-page {
  max-width: 1280px;
  margin: 0 auto;
  padding: 24px;
}

.admin-subnav {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  margin-bottom: 18px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.admin-subnav-item {
  min-width: 88px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 14px;
  border-radius: 6px;
  color: #475569;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: background 0.15s, color 0.15s, box-shadow 0.15s;
}

.admin-subnav-item:hover {
  color: #2563eb;
  background: rgba(255, 255, 255, 0.7);
}

.admin-subnav-item.active {
  color: #1d4ed8;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.page-header h1 {
  margin: 0 0 4px;
  font-size: 24px;
}

.page-header p {
  margin: 0;
  color: #64748b;
}

.filters {
  display: grid;
  grid-template-columns: minmax(260px, 1.4fr) repeat(5, minmax(120px, 1fr)) auto;
  gap: 10px;
  margin-bottom: 16px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.metric,
.panel {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.metric {
  padding: 14px 16px;
}

.metric span {
  display: block;
  color: #64748b;
  font-size: 13px;
}

.metric strong {
  display: block;
  margin-top: 6px;
  font-size: 24px;
}

.panel {
  padding: 14px;
  margin-bottom: 14px;
}

.panel h3 {
  margin: 0 0 12px;
  font-size: 16px;
}

.insight-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.wide {
  grid-column: 1 / -1;
}

.rank-row,
.panel-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.rank-row {
  padding: 8px 0;
  border-bottom: 1px solid #f1f5f9;
}

.rank-row:last-child {
  border-bottom: 0;
}

@media (max-width: 900px) {
  .filters,
  .summary-grid,
  .insight-grid {
    grid-template-columns: 1fr;
  }

  .page-header {
    flex-direction: column;
  }
}
</style>
