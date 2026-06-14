<template>
  <div class="contribution-page">
    <nav class="admin-subnav" aria-label="后台管理导航">
      <nuxt-link to="/admin/users" class="admin-subnav-item">用户管理</nuxt-link>
      <nuxt-link to="/admin/behavior" class="admin-subnav-item">行为数据</nuxt-link>
      <nuxt-link to="/admin/contribution" class="admin-subnav-item active">贡献统计</nuxt-link>
    </nav>

    <header class="page-header">
      <div>
        <h1>贡献统计</h1>
        <p>查看内部成员资源贡献点、收益排行和资源明细。</p>
      </div>
      <n-button type="primary" :loading="loading" @click="reloadAll">刷新</n-button>
    </header>

    <section class="filters">
      <n-date-picker v-model:value="timeRange" type="datetimerange" clearable />
      <n-select
        v-model:value="query.resourceType"
        :options="contributionResourceTypeOptions"
        placeholder="选择资源类型"
        clearable
        filterable
      />
      <n-button @click="resetFilters">重置</n-button>
    </section>

    <div class="panel">
      <div class="panel-title-row">
        <h3>贡献系数</h3>
        <n-button size="small" type="primary" :loading="coefficientSaving" @click="saveCoefficients">保存系数</n-button>
      </div>
      <div class="coefficient-grid">
        <n-form-item v-for="item in coefficientItems" :key="item.key" :label="item.label">
          <n-input-number
            v-model:value="coefficientForm[item.key]"
            :min="0"
            :step="item.step"
            clearable
          />
        </n-form-item>
      </div>
    </div>

    <div class="panel">
      <h3>内部成员贡献排行</h3>
      <n-data-table :columns="contributionColumns" :data="contributionSummary" :pagination="false" :scroll-x="1180" />
    </div>

    <div class="panel">
      <h3>贡献资源明细</h3>
      <n-data-table
        remote
        :loading="resourceLoading"
        :columns="resourceColumns"
        :data="contributionResources"
        :pagination="resourcePagination"
        :row-key="row => row.id"
        :scroll-x="1600"
        @update:page="changeResourcePage"
        @update:page-size="changeResourcePageSize"
      />
    </div>
  </div>
</template>

<script setup>
import { h, ref, reactive, computed, watch, onMounted } from 'vue'
import { NButton, NDataTable, NDatePicker, NFormItem, NInputNumber, NSelect, useMessage } from 'naive-ui'
import {
  apiGetBehaviorMeta,
  apiGetContributionSummary,
  apiGetContributionResources,
  apiSaveContributionCoefficients
} from '~/composables/Api/Admin/behavior'

useHead({ title: '贡献统计' })

const message = useMessage()
const loading = ref(false)
const resourceLoading = ref(false)
const coefficientSaving = ref(false)
const timeRange = ref(null)
const resourceTypes = ref([])
const contributionSummary = ref([])
const contributionResources = ref([])

const query = reactive({
  resourceType: null,
  pageNum: 1,
  pageSize: 20
})

const coefficientForm = reactive({
  base: 1,
  cashRevenue: 1,
  pointRevenue: 0.01,
  purchase: 3,
  view: 0.05,
  collect: 0.5,
  like: 0.3,
  use: 0.2
})

const coefficientItems = [
  { key: 'base', label: '基础分', step: 0.1 },
  { key: 'cashRevenue', label: '现金收益系数', step: 0.1 },
  { key: 'pointRevenue', label: '积分收益系数', step: 0.01 },
  { key: 'purchase', label: '购买系数', step: 0.1 },
  { key: 'view', label: '浏览系数', step: 0.01 },
  { key: 'collect', label: '收藏系数', step: 0.1 },
  { key: 'like', label: '点赞系数', step: 0.1 },
  { key: 'use', label: '使用系数', step: 0.1 }
]

const contributionResourceTypeOptions = computed(() => resourceTypes.value
  .filter(item => item.contributionTracked)
  .map(item => ({
    label: `${item.label}${item.paidCapable ? '（可收费）' : ''}`,
    value: item.code
  })))

const resourcePagination = reactive({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100]
})

const contributionColumns = [
  { title: '成员', key: 'contributorUsername', fixed: 'left', width: 150, render: row => h('a', { onClick: () => navigateTo(`/admin/user/${row.contributorUserId}`) }, row.contributorUsername || row.contributorUserId) },
  { title: '等级', key: 'contributorRoleLevel', width: 90, render: row => row.contributorRoleLevel ? `Lv.${row.contributorRoleLevel}` : '-' },
  { title: '贡献点', key: 'contributionPoints', width: 110, render: row => points(row.contributionPoints) },
  { title: '资源数', key: 'resourceCount', width: 90 },
  { title: '现金收益', key: 'revenueAmount', width: 120, render: row => money(row.revenueAmount) },
  { title: '积分收益', key: 'pointAmount', width: 110 },
  { title: '购买', key: 'purchaseCount', width: 90 },
  { title: '浏览', key: 'viewCount', width: 90 },
  { title: '收藏', key: 'collectCount', width: 90 },
  { title: '点赞', key: 'likeCount', width: 90 },
  { title: '使用', key: 'useCount', width: 90 }
]

const resourceColumns = [
  { title: '资源', key: 'resourceName', width: 260, ellipsis: { tooltip: true }, render: row => row.resourceName || `#${row.resourceId}` },
  { title: '类型', key: 'resourceType', width: 120, render: row => findResourceLabel(row.resourceType) },
  { title: '贡献人', key: 'contributorUsername', width: 140 },
  { title: '贡献点', key: 'contributionPoints', width: 110, render: row => points(row.contributionPoints) },
  { title: '订单/收益数', key: 'revenueCount', width: 120 },
  { title: '现金收益', key: 'revenueAmount', width: 120, render: row => money(row.revenueAmount) },
  { title: '积分收益', key: 'pointAmount', width: 110 },
  { title: '购买', key: 'purchaseCount', width: 90 },
  { title: '浏览', key: 'viewCount', width: 90 },
  { title: '收藏', key: 'collectCount', width: 90 },
  { title: '点赞', key: 'likeCount', width: 90 },
  { title: '使用', key: 'useCount', width: 90 },
  { title: '创建时间', key: 'createTime', width: 180, render: row => formatTime(row.createTime) }
]

watch(() => [query.resourceType, timeRange.value], debounce(() => {
  query.pageNum = 1
  resourcePagination.page = 1
  reloadAll()
}, 350), { deep: true })

onMounted(async () => {
  await loadMeta()
  await reloadAll()
})

async function loadMeta() {
  const res = await apiGetBehaviorMeta()
  const data = res?.data || {}
  resourceTypes.value = data.resourceTypes || []
  Object.assign(coefficientForm, normalizeCoefficients(data.coefficients))
}

async function reloadAll() {
  loading.value = true
  try {
    await loadContribution()
  } finally {
    loading.value = false
  }
}

async function loadContribution() {
  resourceLoading.value = true
  try {
    const body = { ...query }
    if (timeRange.value?.length === 2) {
      body.startTime = formatDateTime(timeRange.value[0])
      body.endTime = formatDateTime(timeRange.value[1])
    }
    const [summaryRes, resourceRes] = await Promise.all([
      apiGetContributionSummary(body),
      apiGetContributionResources(body)
    ])
    contributionSummary.value = summaryRes?.data || []
    const resourceData = resourceRes?.data || {}
    contributionResources.value = resourceData.rows || []
    resourcePagination.itemCount = resourceData.total || 0
  } finally {
    resourceLoading.value = false
  }
}

async function saveCoefficients() {
  coefficientSaving.value = true
  try {
    const res = await apiSaveContributionCoefficients(normalizeCoefficients(coefficientForm))
    Object.assign(coefficientForm, normalizeCoefficients(res?.data))
    await loadContribution()
    message.success('贡献系数已保存')
  } finally {
    coefficientSaving.value = false
  }
}

function changeResourcePage(page) {
  query.pageNum = page
  resourcePagination.page = page
  loadContribution()
}

function changeResourcePageSize(size) {
  query.pageNum = 1
  query.pageSize = size
  resourcePagination.page = 1
  resourcePagination.pageSize = size
  loadContribution()
}

function resetFilters() {
  timeRange.value = null
  query.resourceType = null
}

function normalizeCoefficients(source = {}) {
  return coefficientItems.reduce((result, item) => {
    result[item.key] = Number(source?.[item.key] ?? coefficientForm[item.key] ?? 0)
    return result
  }, {})
}

function findResourceLabel(code) {
  if (!code) return '-'
  return resourceTypes.value.find(item => item.code === code)?.label || code
}

function points(value) {
  return Number(value || 0).toFixed(2)
}

function money(value) {
  return `￥${Number(value || 0).toFixed(2)}`
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
.contribution-page {
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
  grid-template-columns: minmax(260px, 1fr) minmax(180px, 240px) auto;
  gap: 10px;
  margin-bottom: 16px;
}

.panel {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 14px;
}

.panel h3 {
  margin: 0 0 12px;
  font-size: 16px;
}

.panel-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.coefficient-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px 14px;
}

@media (max-width: 900px) {
  .filters,
  .coefficient-grid {
    grid-template-columns: 1fr;
  }

  .page-header {
    flex-direction: column;
  }
}
</style>
