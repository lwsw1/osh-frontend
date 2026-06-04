<template>
  <div>
  <div class="breadcrumb">
    <span class="bc-item" @click="$router.push('/')">🏠 首页</span>
    <span class="bc-sep">›</span>
    <span class="bc-current">📝 考试</span>
  </div>
  <n-grid :x-gap="20">
    <n-grid-item :span="18">
      <!-- 筛选栏：标签 / 我收藏的 / 关键字搜索 -->
      <div class="paper-filter-bar">
        <n-select
          v-model:value="filter.tag"
          :options="tagOptions"
          placeholder="选择标签筛选"
          clearable
          filterable
          style="width: 200px"
          @update:value="onFilterChange"
        />
        <button
          class="follow-btn"
          :class="{ active: filter.collectFlag === 1 }"
          @click="toggleCollectFilter"
        >
          <span class="heart-icon">{{ filter.collectFlag === 1 ? '♥' : '♡' }}</span>
          我收藏的
        </button>
        <div class="search-wrap">
          <span class="search-icon">🔍</span>
          <input
            v-model="filter.keyword"
            class="search-input"
            placeholder="搜索考试关键字..."
            @keyup.enter="onFilterChange"
          />
          <span
            v-if="filter.keyword"
            class="search-clear"
            @click="filter.keyword = ''; onFilterChange()"
          >✕</span>
        </div>
        <button class="btn-query" @click="onFilterChange">🔍 查询</button>
      </div>

      <ClientOnly>
        <div v-if="showExamAdminBar" class="exam-admin-bar">
          <n-button v-if="canExamCreate" class="btn-create-exam" size="small" @click="openCreateExam">
            + 新增考试
          </n-button>
        </div>
      </ClientOnly>

      <LoadingGroup :pending="pending" :error="error" :is-empty="rows.length === 0">
        <TestpaperList
          v-for="item in rows"
          :key="item.id"
          :item="item"
          :can-edit="canExamEdit"
          :can-delete="canExamDelete"
          @edit="openEditExam"
          @delete="confirmDeleteExam"
          @favorite="handleToggleFavorite"
        />
        <div class="pagination-wrapper">
          <n-pagination
            size="large"
            :page="page"
            :item-count="total"
            :page-size="limit"
            :on-update:page="handlePageChange"
          />
        </div>
      </LoadingGroup>
      <ExamEditModal
        v-model:show="examModalVisible"
        :init-data="examModalInit"
        :tag-options="tagOptions"
        @success="onExamSaved"
      />
    </n-grid-item>
    <n-grid-item :span="6">
      <HotCourseList />
    </n-grid-item>
  </n-grid>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch, onMounted } from 'vue'
import { NButton, NGrid, NGridItem, NPagination, NSelect, createDiscreteApi } from 'naive-ui'
import ExamEditModal from '~/components/Exam/ExamEditModal.vue'
import { usePermission } from '~/composables/usePermission'
import { canManageExamByRoleLevel, useUser } from '~/composables/useAuth'
import {
  apiDeleteExam,
  apiGetExamTags,
  apiSearchExams,
  apiToggleCollect,
} from '~/composables/Api/Exam/exam'

const route = useRoute()
const { hasPermission } = usePermission()
const user = useUser()

const canExamCreate = computed(
  () => hasPermission('exam:create') || canManageExamByRoleLevel()
)
const canExamEdit = computed(
  () => hasPermission('exam:update') || canManageExamByRoleLevel()
)
const canExamDelete = computed(
  () => hasPermission('exam:delete') || canManageExamByRoleLevel()
)
const showExamAdminBar = computed(
  () => canExamCreate.value || canExamEdit.value || canExamDelete.value
)

// ---- 列表数据与筛选 ----
const limit = 12
const page = computed(() => parseInt(route.params.page) || 1)

const filter = reactive({
  keyword: '',
  tag: null,
  collectFlag: null, // 1 = 只看我收藏的；null = 全部
})

const rows = ref([])
const total = ref(0)
const pending = ref(false)
const error = ref(false)

async function loadList() {
  pending.value = true
  error.value = false
  try {
    const res = await apiSearchExams({
      keyword: filter.keyword ? filter.keyword.trim() : undefined,
      tag: filter.tag || undefined,
      collectFlag: filter.collectFlag || undefined,
      pageNum: page.value,
      pageSize: limit,
    })
    if (res?.code === 200 && res.data) {
      rows.value = res.data.rows || res.data.records || []
      total.value = res.data.total || res.data.count || rows.value.length
    } else {
      rows.value = []
      total.value = 0
      error.value = res?.msg || '加载失败'
    }
  } catch (e) {
    rows.value = []
    total.value = 0
    error.value = e?.data?.msg || e?.message || '加载失败'
  } finally {
    pending.value = false
  }
}

// 首次渲染拉取（top-level await 让 SSR 也能跑）
await loadList()

// 翻页时 route.params.page 变化 -> 重新拉取
watch(() => route.params.page, () => loadList())

function handlePageChange(p) {
  if (p === page.value) return
  navigateTo({
    params: { ...route.params, page: p },
    query: { ...route.query },
  })
}

function onFilterChange() {
  // 改了筛选条件 -> 回到第一页再查（避免停留在不存在的页码）
  if (page.value !== 1) {
    handlePageChange(1)
  } else {
    loadList()
  }
}

function toggleCollectFilter() {
  filter.collectFlag = filter.collectFlag === 1 ? null : 1
  onFilterChange()
}

// ---- 收藏切换 ----
async function handleToggleFavorite(item) {
  const { message } = createDiscreteApi(['message'])
  if (!user.value) {
    message.warning('请先登录后再收藏')
    return navigateTo('/login?from=' + encodeURIComponent(route.fullPath))
  }
  // 乐观更新：先翻转 UI，失败再回滚
  const prevCollected = !!item.is_collected
  const prevCount = item.collect_count || 0
  item.is_collected = !prevCollected
  item.collect_count = prevCollected ? Math.max(0, prevCount - 1) : prevCount + 1
  try {
    const res = await apiToggleCollect(item.id)
    if (res?.code !== 200) {
      item.is_collected = prevCollected
      item.collect_count = prevCount
      message.error(res?.msg || '操作失败')
    }
  } catch (e) {
    item.is_collected = prevCollected
    item.collect_count = prevCount
    message.error(e?.data?.msg || e?.message || '操作失败')
  }
}

// ---- 标签下拉数据（筛选 + 新增/编辑弹窗共用） ----
const tagOptions = ref([])

async function loadExamTagOptions() {
  try {
    const res = await apiGetExamTags()
    const list = res?.code === 200 ? res.data || [] : []
    // 后端按名称过滤，所以 value 必须是 name 字符串
    tagOptions.value = list
      .filter((t) => t && t.name != null && String(t.name).trim() !== '')
      .map((t) => ({ label: String(t.name), value: String(t.name) }))
  } catch {
    tagOptions.value = []
  }
}

onMounted(() => {
  if (process.client) loadExamTagOptions()
})

// ---- 新增/编辑/删除考试 ----
const examModalVisible = ref(false)
const examModalInit = ref(null)

function openCreateExam() {
  examModalInit.value = null
  examModalVisible.value = true
}

function openEditExam(item) {
  examModalInit.value = item ? { ...item } : null
  examModalVisible.value = true
}

async function onExamSaved() {
  examModalInit.value = null
  await loadList()
}

function confirmDeleteExam(item) {
  const { dialog, message } = createDiscreteApi(['dialog', 'message'])
  dialog.warning({
    title: '确认删除',
    content: `确定删除试卷「${item.title}」？删除后不可恢复。`,
    positiveText: '删除',
    negativeText: '取消',
    async onPositiveClick() {
      try {
        const res = await apiDeleteExam(item.id)
        if (res?.code === 200) {
          message.success('删除成功')
          await loadList()
          return true
        }
        message.error(res?.msg || '删除失败')
        return true
      } catch (e) {
        message.error(e?.data?.msg || e?.message || '删除失败')
        return true
      }
    },
  })
}

useHead({
  title: '考试列表',
})
</script>

<style scoped>
/* 筛选栏（视觉对齐课程列表筛选） */
.paper-filter-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  background: #fff;
  padding: 14px 18px;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
  margin-bottom: 10px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.follow-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 14px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background: #fff;
  font-size: 13px;
  color: #555;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.follow-btn:hover {
  border-color: #18a058;
  color: #18a058;
}
.follow-btn.active {
  background: #f0fdf4;
  border-color: #18a058;
  color: #18a058;
  font-weight: 500;
}
.heart-icon { font-size: 14px; }

.search-wrap {
  display: flex;
  align-items: center;
  background: #f5f7fa;
  border: 1.5px solid #d0d7e3;
  border-radius: 6px;
  padding: 0 10px;
  height: 34px;
  gap: 6px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.search-wrap:focus-within {
  border-color: #18a058;
  box-shadow: 0 0 0 2px rgba(24, 160, 88, 0.12);
  background: #fff;
}
.search-icon { font-size: 13px; color: #999; flex-shrink: 0; }
.search-input {
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: #333;
  width: 180px;
}
.search-input::placeholder { color: #aaa; }
.search-clear { font-size: 12px; color: #bbb; cursor: pointer; }
.search-clear:hover { color: #666; }

.btn-query {
  background: #18a058;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 7px 18px;
  font-size: 13px;
  cursor: pointer;
  font-weight: 500;
  white-space: nowrap;
  transition: background 0.2s;
}
.btn-query:hover { background: #0e7a3e; }

.exam-admin-bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.75rem;
}

.btn-create-exam {
  border-radius: 6px;
  font-weight: 500;
  border: 1px solid #18a058;
  color: #18a058;
  background: #fff;
}
.btn-create-exam:hover {
  background: #18a058;
  color: #fff;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 1.25rem;
  margin-bottom: 2.5rem;
}
</style>
