<template>
  <div class="page-wrapper">
    <!-- 面包屑 -->
    <div class="breadcrumb-box">
      <n-breadcrumb>
        <n-breadcrumb-item>
          <nuxt-link to="/">首页</nuxt-link>
        </n-breadcrumb-item>
        <n-breadcrumb-item>反馈列表</n-breadcrumb-item>
      </n-breadcrumb>
    </div>

    <!-- 公告区（跑马灯样式,置顶；纯文本展示，不可点击） -->
    <AnnouncementMarquee
      v-if="showAnnouncements"
      :items="announcements"
    />

    <!-- 模式切换 + 提交反馈 -->
    <div class="view-mode-box">
      <n-tabs
        :value="queryMode"
        type="line"
        size="medium"
        animated
        class="view-mode-tabs"
        @update:value="selectQueryMode"
      >
        <n-tab
          v-for="option in queryModeOptions"
          :key="option.value"
          :name="option.value"
        >
          {{ option.label }}
          <span
            v-if="option.value === 'mine' && pendingConfirmCount > 0"
            class="tab-pending-dot"
            :title="`${pendingConfirmCount} 条反馈待你确认`"
          >{{ pendingConfirmCount }}</span>
        </n-tab>
      </n-tabs>
      <n-button type="primary" class="view-mode-action" @click="goToCreate">提交反馈</n-button>
    </div>

    <!-- 筛选器 -->
    <div class="filter-box">
      <div class="category-chip-row">
        <button
          type="button"
          class="category-chip"
          :class="{ 'is-active': selectedCategoryId === null }"
          @click="selectCategory(null)"
        >
          全部
        </button>
        <button
          v-for="category in categories"
          :key="category.id"
          type="button"
          class="category-chip"
          :class="{ 'is-active': selectedCategoryId === category.id }"
          @click="selectCategory(category.id)"
        >
          <span class="chip-icon">{{ resolveFeedbackCategoryIcon(category) }}</span>
          <span class="chip-label">{{ category.name }}</span>
        </button>
      </div>
      <div class="filter-row">
        <div class="filter-row-content">
          <n-input
            v-model:value="keyword"
            placeholder="搜索反馈标题或内容..."
            clearable
            class="filter-search"
            @keyup.enter="handleSearch"
          >
            <template #suffix>
              <n-button text @click="handleSearch">
                🔍 搜索
              </n-button>
            </template>
          </n-input>
          <n-select
            v-model:value="selectedTagIds"
            multiple
            clearable
            filterable
            max-tag-count="responsive"
            :options="tagOptions"
            placeholder="按标签筛选"
            class="filter-control filter-tags"
            @update:value="handleTagChange"
          />
          <n-select
            v-model:value="selectedStatus"
            :options="statusOptions"
            clearable
            placeholder="全部状态"
            class="filter-control filter-status"
            @update:value="handleStatusChange"
          />
          <n-select
            v-model:value="sortType"
            :options="sortOptions"
            class="filter-control filter-sort"
            @update:value="handleSortChange"
          />
        </div>
      </div>
    </div>

    <!-- 置顶区 -->
    <div v-if="pinnedList.length > 0" class="pinned-section">
      <div class="section-header">
        <span class="icon">🔝</span>
        <span class="title">置顶反馈</span>
      </div>
      <div class="feedback-list">
        <FeedbackCard
          v-for="item in pinnedList"
          :key="item.id"
          :item="item"
          pinned
          @click="goToDetail"
          @updated="handleFeedbackUpdated"
        />
      </div>
    </div>

    <!-- 普通反馈列表 -->
    <div class="feedback-section">
      <div v-if="loading" class="loading-box">
        <div class="feedback-skeleton-list">
          <div v-for="index in pageSize" :key="index" class="feedback-skeleton-card">
            <div class="skeleton-line short" />
            <div class="skeleton-line title" />
            <div class="skeleton-line" />
            <div class="skeleton-line" />
            <div class="skeleton-line footer" />
          </div>
        </div>
      </div>
      <div v-else-if="feedbackList.length === 0 && pinnedList.length === 0" class="empty-box">
        <n-empty :description="emptyDescription" />
      </div>
      <div v-else class="feedback-list">
        <FeedbackCard
          v-for="item in feedbackList"
          :key="item.id"
          :item="item"
          @click="goToDetail"
          @updated="handleFeedbackUpdated"
        />
      </div>

      <div ref="loadMoreTriggerRef" class="load-more-sentinel">
        <n-spin v-if="loadingMore" size="small" />
        <span v-else-if="!hasMore && feedbackList.length > 0" class="load-more-finished">
          你已经浏览完全部反馈了
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onActivated, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { NButton, NInput, NBreadcrumb, NBreadcrumbItem, NSpin, NEmpty, NSelect, NTabs, NTab } from 'naive-ui'
import { 
  apiGetFeedbackCategories, 
  apiGetFeedbackTags,
  apiPageFeedback,
  apiGetFeedbackAnnouncements,
  apiGetPendingConfirmCount,
  resolveFeedbackCategoryIcon,
  resolveFeedbackErrorMessage,
  FEEDBACK_STATUS_CONFIG
} from '~/composables/assistant'
import { sortFeedbackTags } from '~/composables/feedbackTag'
import { applyFeedbackInteractionPatches } from '~/composables/useFeedbackState'
import FeedbackCard from '~/components/feedback/FeedbackCard.vue'
import AnnouncementMarquee from '~/components/feedback/AnnouncementMarquee.vue'

const router = useRouter()
const message = useMessage()
const user = useUser()
const isLoggedIn = computed(() => !!user.value)

const categories = ref([])
const feedbackTags = ref([])
const announcements = ref([])
const pinnedList = ref([])
const feedbackList = ref([])
const queryMode = ref('all')
const selectedCategoryId = ref(null)
const selectedTagIds = ref([])
// 默认不附加状态筛选，首屏展示全部反馈
const selectedStatus = ref(null)
const keyword = ref('')
const sortType = ref('hot') // 默认按最热排序
const pageNum = ref(1)
const pageSize = ref(9)
const total = ref(0)
const loading = ref(false)
const loadingMore = ref(false)
/** 当前用户待确认工单数，用于"我的反馈"tab 角标提示 */
const pendingConfirmCount = ref(0)
// ─────────────────────────────────────────────────────────────────────────────
// 无限滚动加载机制（改动前务必读完）
// ─────────────────────────────────────────────────────────────────────────────
// 核心链路：
//   1. 模板底部有 <div ref="loadMoreTriggerRef" class="load-more-sentinel"> 哨兵
//   2. watch(loadMoreTriggerRef) 在哨兵挂载后调用 initLoadMoreObserver()
//   3. IntersectionObserver(rootMargin: 200px) 观察哨兵，进入视口即调用 loadMore()
//   4. loadMore() 受多重守卫保护（见函数注释）
//
// 关键守卫与"为什么需要它"：
//   ▸ loading / loadingMore / hasMore：防止重复请求与越界翻页
//   ▸ pageNum===1 && !hasUserScrolled：防止 onMounted 后哨兵在视口内
//     就被 IntersectionObserver 自动触发，导致首屏多请求一次第 2 页
//   ▸ 300ms 节流：防止抖动期间多次触发
//
// 容易踩的坑（曾踩过）：
//   ▸ 改顶部布局变矮 / 首屏数据不足以撑满视口 时，哨兵会一开始就在视口内：
//       - 第一次回调被 hasUserScrolled 守卫挡掉
//       - 之后 isIntersecting 状态不变化，IntersectionObserver 不会再回调
//       - 即使用户后续滚动也无法解锁 → 死锁
//     已用 watch(hasUserScrolled) 在首次翻 true 时主动补触发一次 loadMore() 修复
//   ▸ 切换 queryMode / 重新筛选时，loadFeedback 会重置 hasUserScrolled = false
//     和 pageNum = 1，相当于回到首屏初始状态，机制能继续工作
//
// 改动检查清单：
//   [ ] 不要移除 hasUserScrolled 守卫（会引起 onMounted 自动加载第 2 页）
//   [ ] 不要移除 watch(hasUserScrolled) 补触发（会引起短页面下滑无加载）
//   [ ] 修改顶部高度后请回归"首屏短页面下滑能否触发加载下一页"
//   [ ] 修改 loadMore 守卫顺序时务必同步更新本注释
// ─────────────────────────────────────────────────────────────────────────────
/** 哨兵元素的 ref，由模板的 ref="loadMoreTriggerRef" 绑定 */
const loadMoreTriggerRef = ref(null)
/** IntersectionObserver 实例，用于监听哨兵是否进入视口 */
const loadMoreObserver = ref(null)
/** 上次触发 loadMore 的时间戳（毫秒），用于 300ms 节流 */
const lastLoadMoreAt = ref(0)
/** 用户是否已发生过滚动（scrollY > 24）；防止 onMounted 后哨兵自动触发首屏多余加载 */
const hasUserScrolled = ref(false)

// 排序选项
const sortOptions = [
  { label: '🔥 最热', value: 'hot' },
  { label: '🆕 最新', value: 'latest' }
]
const queryModeOptions = [
  { label: '全部反馈', value: 'all' },
  { label: '我的反馈', value: 'mine' },
  { label: '我的收藏', value: 'favorite' }
]
const statusOptions = Object.entries(FEEDBACK_STATUS_CONFIG).map(([value, cfg]) => ({
  label: cfg.label,
  value
}))
const tagOptions = computed(() => feedbackTags.value.map(tag => ({
  label: tag.name,
  value: tag.id
})))
// 公告独立于 queryMode 展示,且只在 onMounted 加载一次
// 切换"全部 / 我的 / 收藏"时不再重新拉取,刷新页面才会再次加载
const showAnnouncements = computed(() => announcements.value.length > 0)
const emptyDescription = computed(() => {
  if (queryMode.value === 'mine') {
    return '暂无我的反馈'
  }
  if (queryMode.value === 'favorite') {
    return '暂无收藏反馈'
  }
  return '暂无反馈'
})
const hasMore = computed(() => (feedbackList.value.length + pinnedList.value.length) < total.value)

onMounted(() => {
  if (process.client) {
    window.addEventListener('scroll', handleWindowScroll, { passive: true })
  }
  syncQueryModeFromRoute()
  loadCategories()
  loadTags()
  loadAnnouncements()
  loadFeedback()
  if (isLoggedIn.value) {
    loadPendingConfirmCount()
  }
})

onActivated(() => {
  syncQueryModeFromRoute()
  applyPatchedFeedbackList()
})

/**
 * 哨兵 DOM 一旦挂载就启动 IntersectionObserver。
 * 不要在其它地方手动调用 initLoadMoreObserver,统一由这里负责。
 */
watch(loadMoreTriggerRef, (currentValue) => {
  if (currentValue) {
    initLoadMoreObserver()
  }
})

/**
 * 解锁守卫：首屏短页面 / 顶部布局变矮 时,哨兵可能一挂载就处于视口内,
 * 第一次 IntersectionObserver 回调被 hasUserScrolled 守卫挡掉,
 * 之后 isIntersecting 状态不变化,Observer 不会再回调 → 死锁。
 *
 * 这里在用户首次滚动的瞬间主动补触发一次 loadMore(),
 * loadMore 内部的 loading / loadingMore / hasMore / 节流 守卫保证不会重复加载。
 *
 * ⚠️ 不要因为"看起来多余"删掉,删掉会导致首屏短页面下滑无任何加载反应。
 */
watch(hasUserScrolled, (scrolled) => {
  if (scrolled) {
    loadMore()
  }
})

onBeforeUnmount(() => {
  if (process.client) {
    window.removeEventListener('scroll', handleWindowScroll)
  }
  destroyLoadMoreObserver()
})

async function loadCategories() {
  try {
    const res = await apiGetFeedbackCategories()
    categories.value = res.data || []
  } catch (error) {
    message.error(resolveFeedbackErrorMessage(error, '加载分类失败'))
    console.error('加载分类失败:', error)
  }
}

async function loadPendingConfirmCount() {
  try {
    const res = await apiGetPendingConfirmCount()
    pendingConfirmCount.value = res?.data ?? 0
  } catch {
    // 静默失败，角标不显示即可，不影响主流程
    pendingConfirmCount.value = 0
  }
}

async function loadTags() {
  try {
    const res = await apiGetFeedbackTags()
    feedbackTags.value = sortFeedbackTags(res.data || [])
  } catch (error) {
    message.error(resolveFeedbackErrorMessage(error, '加载标签失败'))
    console.error('加载标签失败:', error)
  }
}

async function loadAnnouncements() {
  try {
    // 公告从统一公告表 osh_announcement(module='feedback', channel=1) 拉取
    const res = await apiGetFeedbackAnnouncements(5)
    announcements.value = Array.isArray(res?.data) ? res.data : []
  } catch (error) {
    message.error(resolveFeedbackErrorMessage(error, '加载公告失败'))
    console.error('加载公告失败:', error)
  }
}

/**
 * 重新加载第一页（切换 queryMode / 改筛选条件 / 切换排序时调用）。
 *
 * 关键副作用：
 *   - pageNum 重置为 1
 *   - hasUserScrolled 重置为 false：等价于回到首屏初始状态,避免在用户已经滚过
 *     的列表上立刻触发哨兵自动加载第 2 页
 */
async function loadFeedback() {
  loading.value = true
  try {
    pageNum.value = 1
    hasUserScrolled.value = false
    await fetchFeedbackPage(pageNum.value)
  } catch (error) {
    message.error(resolveFeedbackErrorMessage(error, '加载反馈失败'))
    console.error('加载反馈失败:', error)
  } finally {
    loading.value = false
  }
}

function buildFeedbackPageParams(nextPageNum, extraParams = {}) {
  return {
    queryMode: queryMode.value,
    sortType: sortType.value,
    pageNum: nextPageNum,
    pageSize: pageSize.value,
    ...extraParams,
    ...(selectedCategoryId.value !== null ? { categoryId: selectedCategoryId.value } : {}),
    ...(selectedTagIds.value.length ? { tagIds: selectedTagIds.value } : {}),
    ...(selectedStatus.value ? { status: selectedStatus.value } : {}),
    ...(keyword.value ? { keyword: keyword.value } : {}),
  }
}

function syncQueryModeFromRoute() {
  const mode = router.currentRoute.value.query?.mode
  queryMode.value = queryModeOptions.some(option => option.value === mode) ? mode : 'all'
}

function selectQueryMode(mode) {
  if (queryMode.value === mode) {
    return
  }
  queryMode.value = mode
  router.replace({
    path: '/feedback/list',
    query: mode === 'all' ? {} : { mode }
  })
  loadFeedback()
}

function selectCategory(categoryId) {
  selectedCategoryId.value = categoryId
  loadFeedback()
}

function handleStatusChange() {
  loadFeedback()
}

function handleTagChange() {
  loadFeedback()
}

function handleSearch() {
  loadFeedback()
}

function handleSortChange() {
  loadFeedback()
}

/**
 * 加载下一页反馈。
 *
 * 守卫顺序（顺序敏感,改之前请读顶部"无限滚动加载机制"说明）：
 *   1. loading / loadingMore / hasMore：防止重复请求与越界翻页
 *   2. pageNum===1 && !hasUserScrolled：防止 onMounted 后哨兵在视口内自动触发,
 *      首屏多请求一次第 2 页（用户实际只想看第 1 页）
 *   3. 300ms 节流：防止滚动抖动期间多次触发
 *
 * 调用入口：
 *   - IntersectionObserver 哨兵进入视口（initLoadMoreObserver 内）
 *   - watch(hasUserScrolled) 用户首次滚动时的解锁补触发
 *
 * ⚠️ 删除任何一个守卫前,先回归"首屏不主动加载"和"短页面下滑能加载"两个场景。
 */
async function loadMore() {
  if (loading.value || loadingMore.value || !hasMore.value) {
    return
  }

  if (pageNum.value === 1 && !hasUserScrolled.value) {
    return
  }

  const now = Date.now()
  if (now - lastLoadMoreAt.value < 300) {
    return
  }
  lastLoadMoreAt.value = now

  loadingMore.value = true
  try {
    await fetchFeedbackPage(pageNum.value + 1)
  } catch (error) {
    message.error(resolveFeedbackErrorMessage(error, '加载更多失败'))
  } finally {
    loadingMore.value = false
  }
}

function goToDetail(id) {
  router.push(`/feedback/detail/${id}`)
}

function goToCreate() {
  router.push('/feedback/create')
}

function handleFeedbackUpdated() {
  loadFeedback()
}

/**
 * 监听 window 滚动,翻转 hasUserScrolled 一次。
 *
 * 仅在 scrollY > 24 时认定"用户真的滚过了",避免输入聚焦或浏览器恢复滚动位置
 * 引起的伪滚动误触发。
 * 翻转后由 watch(hasUserScrolled) 负责解锁 loadMore。
 */
function handleWindowScroll() {
  if (!process.client || hasUserScrolled.value) {
    return
  }
  if (window.scrollY > 24) {
    hasUserScrolled.value = true
  }
}

async function fetchFeedbackPage(nextPageNum) {
  const res = await apiPageFeedback(buildFeedbackPageParams(nextPageNum))

  const rows = applyFeedbackInteractionPatches(res.rows || [])
  const pinned = rows.filter(item => item.isPinned === 1)
  const normal = rows.filter(item => item.isPinned === 0)

  if (nextPageNum === 1) {
    pinnedList.value = pinned
    feedbackList.value = normal
  } else {
    feedbackList.value.push(...normal)
  }

  pageNum.value = nextPageNum
  total.value = res.total || 0
}

function applyPatchedFeedbackList() {
  pinnedList.value = applyFeedbackInteractionPatches(pinnedList.value)
  feedbackList.value = applyFeedbackInteractionPatches(feedbackList.value)
}

/**
 * 初始化哨兵的 IntersectionObserver。
 *
 * 关键点：
 *   - rootMargin: '200px 0px' 提前 200px 触发,让加载体验更顺滑
 *   - 由 watch(loadMoreTriggerRef) 在哨兵挂载时调用,无需手动管理时机
 *   - 重复调用时通过 loadMoreObserver.value 守卫提前返回,避免重复绑定
 *
 * ⚠️ 不要在 onMounted 里直接调用本函数,因为哨兵此时还可能未挂载。
 */
function initLoadMoreObserver() {
  if (!process.client || !loadMoreTriggerRef.value || loadMoreObserver.value) {
    return
  }

  loadMoreObserver.value = new IntersectionObserver(entries => {
    const [entry] = entries
    if (entry?.isIntersecting) {
      loadMore()
    }
  }, {
    rootMargin: '200px 0px',
  })

  loadMoreObserver.value.observe(loadMoreTriggerRef.value)
}

/**
 * 销毁 IntersectionObserver,避免组件卸载后内存泄漏。
 * 在 onBeforeUnmount 中调用。
 */
function destroyLoadMoreObserver() {
  if (!loadMoreObserver.value) {
    return
  }

  loadMoreObserver.value.disconnect()
  loadMoreObserver.value = null
}

</script>

<style scoped>
.page-wrapper {
  width: 100%;
  padding: 24px 20px;
  background: #f8f9fa;
  min-height: calc(100vh - 40px);
}

.breadcrumb-box {
  margin-bottom: 20px;
}

.view-mode-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  border-bottom: 1px solid #eef0f3;
}

.view-mode-tabs {
  flex: 1;
  min-width: 0;
}

.view-mode-action {
  flex-shrink: 0;
  margin-bottom: 8px;
}

/* "我的反馈" tab 待确认角标 */
.tab-pending-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  margin-left: 5px;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  vertical-align: middle;
}

.feedback-skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.feedback-skeleton-card {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.skeleton-line {
  height: 12px;
  border-radius: 999px;
  background: linear-gradient(90deg, #eef2f6 25%, #f7f9fb 50%, #eef2f6 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.4s ease-in-out infinite;
  margin-bottom: 12px;
}

.skeleton-line.short {
  width: 120px;
}

.skeleton-line.title {
  width: 56%;
  height: 18px;
}

.skeleton-line.footer {
  width: 72%;
  margin-bottom: 0;
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* 公告样式已迁出至 components/Feedback/AnnouncementMarquee.vue */

/* 筛选器 */
.filter-box {
  background: #fff;
  padding: 14px 20px;
  border-radius: 8px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.filter-row {
  margin-bottom: 12px;
}

.filter-row:last-child {
  margin-bottom: 0;
}

.filter-row-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-search {
  flex: 1 1 280px;
  min-width: 220px;
}

.filter-control {
  flex: 0 0 auto;
}

.filter-tags {
  width: 200px;
}

.filter-status {
  width: 130px;
}

.filter-sort {
  width: 130px;
}

/* 类目筛选 chip */
.category-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.category-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 30px;
  padding: 0 14px;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  background: #fff;
  color: #4b5563;
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease, color 0.2s ease;
  user-select: none;
}

.category-chip:hover {
  border-color: #c7d2fe;
  color: #1d4ed8;
}

.category-chip.is-active {
  border-color: #1d4ed8;
  background: #1d4ed8;
  color: #fff;
}

.category-chip .chip-icon {
  font-size: 14px;
}

/* 区块标题 */
.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.section-header .icon {
  font-size: 22px;
  margin-right: 8px;
}

/* 置顶区 */
.pinned-section {
  margin-bottom: 24px;
}

/* 反馈列表 */
.feedback-section {
  margin-bottom: 80px;
}

.feedback-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

/* 反馈卡片样式已迁出至 components/Feedback/FeedbackCard.vue */

/* 加载状态 */
.loading-box,
.empty-box {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60px 0;
}

/* 响应式 */
@media (max-width: 768px) {
  .page-wrapper {
    padding: 16px 12px;
  }

  .feedback-list {
    grid-template-columns: 1fr;
  }
}
</style>
