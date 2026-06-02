
<template>
  <div class="seckill-page">
    <!-- 公告 & 动态滚动栏（顶部，参考首页） -->
    <div class="seckill-notice-wrap">
      <!-- 公告行 -->
      <div class="seckill-notice-bar">
        <div class="seckill-notice-label seckill-notice-label-yellow">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 1l1.8 3.6L14 5.6l-3 2.9.7 4.1L8 10.5l-3.7 2.1.7-4.1-3-2.9 4.2-.6z" stroke="white" stroke-width="1.3" stroke-linejoin="round" fill="rgba(255,255,255,0.2)"/>
          </svg>
          <span>公告</span>
        </div>
        <div class="seckill-scroll-wrap">
          <div
            class="seckill-scroll-track"
            :style="{ animationDuration: noticeDuration + 's', animationPlayState: noticePaused ? 'paused' : 'running' }"
            @mouseenter="noticePaused = true"
            @mouseleave="noticePaused = false"
          >
            <span class="seckill-notice-item" v-for="(item, i) in [...noticeItems, ...noticeItems]" :key="'n' + i">
              <span class="seckill-notice-dot" :style="{ background: item.iconColor || '#e1251b' }"></span>
              {{ item.icon || '🔥' }} {{ item.title }}
              <span class="seckill-notice-sep">｜</span>
            </span>
          </div>
        </div>
      </div>

      <!-- 动态行 -->
      <div class="seckill-notice-bar seckill-notice-bar-blue">
        <div class="seckill-notice-label seckill-notice-label-blue">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="3" width="12" height="2" rx="1" fill="white"/>
            <rect x="2" y="7" width="9" height="2" rx="1" fill="white"/>
            <rect x="2" y="11" width="11" height="2" rx="1" fill="white"/>
          </svg>
          <span>动态</span>
        </div>
        <div class="seckill-scroll-wrap">
          <div
            class="seckill-scroll-track"
            :style="{ animationDuration: dynamicDuration + 's', animationPlayState: dynamicPaused ? 'paused' : 'running' }"
            @mouseenter="dynamicPaused = true"
            @mouseleave="dynamicPaused = false"
          >
            <span class="seckill-notice-item" v-for="(item, i) in [...dynamicItems, ...dynamicItems]" :key="'d' + i">
              <span class="seckill-notice-dot" :style="{ background: item.iconColor || '#3b82f6' }"></span>
              {{ item.icon || '🎉' }} {{ item.title }}
              <span class="seckill-notice-sep">｜</span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Banner 区 -->
    <div class="seckill-banner">
      <div class="banner-bg-left"></div>
      <div class="banner-bg-right"></div>
      <div class="banner-wave"></div>

      <div class="banner-inner">
        <!-- 左侧：文字区 -->
        <div class="banner-left">
          <div class="banner-tag-row">
            <span class="live-dot"></span>
            <span class="live-text">活动进行中</span>
          </div>
          <h1 class="banner-title">
            <span class="title-fire">🔥</span>
            <span class="title-main">限时秒杀</span>
          </h1>
          <h2 class="banner-sub">IT精品课 · 低至1折</h2>
          <p class="banner-desc">精选编程、设计、AI课程，限量特价，抢完即止</p>
          <div class="banner-feature-list">
            <span class="feature-item">✦ 正版授权</span>
            <span class="feature-item">✦ 永久有效</span>
            <span class="feature-item">✦ 讲师答疑</span>
          </div>
        </div>

        <!-- 中间：倒计时（当前选中活动的结束时间） -->
        <div class="banner-center">
          <div class="countdown-card">
            <div class="countdown-title">
              <span class="countdown-fire">⏰</span>
              距活动结束
            </div>
            <div class="countdown-body" v-if="correctedEndTime > 0">
              <ClientOnly>
                <CountDown :key="correctedEndTime" :time="correctedEndTime" class="countdown-widget" @end="handleSessionEnd" />
              </ClientOnly>
            </div>
            <div class="countdown-body" v-else>
              <span class="countdown-over">暂无活动</span>
            </div>
            <div class="countdown-hint">限时限量，抢完即止</div>
          </div>
        </div>

        <!-- 右侧：统计数据 -->
        <div class="banner-right">
          <div class="stat-card" v-for="s in stats" :key="s.label">
            <span class="stat-icon">{{ s.icon }}</span>
            <span class="stat-num">{{ s.num }}</span>
            <span class="stat-label">{{ s.label }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="seckill-body">
      <ClientOnly>
        <!-- 场次 Tab（多活动切换） -->
        <SeckillSessionTabs
          v-if="sessions.length > 0"
          v-model="activeActivityId"
          :sessions="sessions"
        />

        <!-- 操作栏：搜索 + 标签筛选 + 管理按钮 -->
        <div class="action-bar">
          <div class="search-filter-wrap">
            <div class="search-wrap">
              <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                v-model="searchKeyword"
                class="search-input"
                placeholder="搜索秒杀商品名称..."
                @keyup.enter="loadGoods"
              />
              <button class="search-btn" @click="loadGoods">搜索</button>
            </div>
            <ClientOnly>
              <n-select
                v-model:value="selectedTags"
                :options="tagSelectOptions"
                multiple
                filterable
                clearable
                placeholder="选择标签筛选"
                class="tag-select"
                @update:value="loadGoods"
              />
            </ClientOnly>
          </div>
          <!-- 管理操作按钮（权限控制） -->
          <div v-if="hasAnyPermission('seckill:activity:add','seckill:activity:edit','seckill:activity:remove','seckill:activity:status','seckill:goods:list','seckill:order:list')" class="manage-btns">
            <button v-if="hasPermission('seckill:activity:add')" class="manage-btn add-mode-btn" @click="openCreateActivityModal">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              新建活动
            </button>
            <button
              v-if="hasPermission('seckill:activity:status')"
              class="manage-btn publish-mode-btn"
              :disabled="!activeActivity || activeActivity.status !== 0"
              @click="handlePublishActivity"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 2 15 22 11 13 2 9 22 2"/></svg>
              发布
            </button>
            <button
              v-if="hasPermission('seckill:activity:status')"
              class="manage-btn offline-mode-btn"
              :disabled="!activeActivity || (activeActivity.status !== 1 && activeActivity.status !== 2)"
              @click="handleOfflineActivity"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
              下架
            </button>
            <button
              v-if="hasPermission('seckill:activity:remove')"
              class="manage-btn delete-mode-btn"
              :disabled="!activeActivity"
              @click="handleDeleteActivity"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
              删除
            </button>
            <button
              v-if="hasPermission('seckill:activity:edit')"
              class="manage-btn edit-mode-btn"
              :disabled="!activeActivity || activeActivity.status !== 0"
              @click="showEditModal = true"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              修改
            </button>
            <button v-if="hasPermission('seckill:goods:list')" class="manage-btn goods-mode-btn" @click="showGoodsModal = true">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              商品池
            </button>
            <button v-if="hasPermission('seckill:order:list')" class="manage-btn order-mode-btn" @click="showOrderModal = true">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
              订单
            </button>
          </div>
        </div>

        <!-- 筛选栏 -->
        <div class="filter-bar">
          <div class="filter-group">
            <span class="filter-label">类型：</span>
            <button
              v-for="t in typeOptions"
              :key="t.value"
              class="filter-btn"
              :class="{ active: filterType === t.value }"
              @click="filterType = t.value; loadGoods()"
            >{{ t.label }}</button>
          </div>
        </div>

        <!-- 商品列表 -->
        <div v-if="pending" class="loading-tip">加载中...</div>
        <div v-else-if="goodsList.length === 0" class="empty-tip">
          <Empty />
        </div>
        <div v-else class="goods-grid">
          <SeckillGoodsCard
            v-for="item in goodsList"
            :key="item.id"
            :item="item"
            :session="activeActivity || {}"
            @click="goDetail(item)"
            @buy="handleBuy(item)"
          />
        </div>

        <!-- 新建活动弹窗 -->
        <SeckillActivityCreateModal
          v-model:show="showCreateModal"
          @success="onActivityCreated"
        />

        <!-- 修改活动弹窗 -->
        <SeckillActivityEditModal
          v-model:show="showEditModal"
          :activity="activeActivity"
          @success="loadActivityList"
        />

        <!-- 商品池管理弹窗 -->
        <SeckillGoodsListModal v-model:show="showGoodsModal" />

        <!-- 订单列表弹窗 -->
        <SeckillOrderListModal v-model:show="showOrderModal" />

        <template #fallback>
          <div style="min-height: 300px;" />
        </template>
      </ClientOnly>
    </div>
  </div>
</template>

<script setup>
import { createDiscreteApi, NSelect } from 'naive-ui'

// ── 秒杀模块入口页 ───────────────────────────────────────────
useHead({ title: '限时秒杀 · IT精品课' })

const { message, dialog } = createDiscreteApi(['message', 'dialog'])

const { hasPermission, hasAnyPermission } = usePermission()

const stats = [
  { icon: '📚', num: '1000+', label: '精品课程' },
  { icon: '👨‍🎓', num: '50万+', label: '学员选择' },
  { icon: '⭐', num: '98%', label: '好评率' },
  { icon: '💰', num: '低至1折', label: '超值优惠' },
]

// ── 活动列表 ─────────────────────────────────────────────────
// 接口返回结构：{ code, rows, total }，rows 里每条是活动，活动下嵌套 items
const activityList = ref([])
const pending = ref(false)

const activeActivityId = ref(null)

async function loadActivityList(resetSelection = false, silent = false) {
  if (!silent) pending.value = true
  try {
    const res = await fetchSeckillAdminActivityRows({ pageNum: 1, pageSize: 50 })
    activityList.value = res?.rows || []
    const stillExists = activityList.value.some(a => String(a.id) === String(activeActivityId.value))
    if (resetSelection || !activeActivityId.value || !stillExists) {
      const found = activityList.value.find(a => a.status === 2) || activityList.value[0]
      activeActivityId.value = found ? String(found.id) : null
    }
    await loadGoods(silent)
  } catch (e) {
    console.error('[seckill] loadActivityList error:', e)
  } finally {
    if (!silent) pending.value = false
  }
}

// 客户端挂载后加载（跳过 SSR）
// 同时每 30 秒轮询一次，自动同步后端活动状态变化（如 未开始→进行中）
let refreshTimer = null
const { connect: wsConnect, disconnect: wsDisconnect, notifications } = useWebSocket()

onMounted(() => {
  loadActivityList()
  loadNoticeItems()
  loadDynamicItems()
  // 每 30 秒静默刷新，同步后端活动状态变化
  refreshTimer = setInterval(() => loadActivityList(false, true), 30000)

  // WebSocket：登录用户才连接
  wsConnect()
})

// 监听 WebSocket 消息，处理秒杀相关推送
watch(notifications, (msgs) => {
  if (!msgs.length) return
  const latest = msgs[0]
  if (latest.type === 'SECKILL_NOTICE_UPDATE') {
    loadNoticeItems()
  } else if (latest.type === 'SECKILL_DYNAMIC_NEW') {
    dynamicItems.value = [
      { title: latest.title, icon: '🎉', iconColor: '#3b82f6' },
      ...dynamicItems.value,
    ].slice(0, 10)
  }
}, { deep: false })

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
  wsDisconnect()
})

// ── 公告栏：调新接口，直接取 title 展示 ──────────────────────
const noticeItems = ref([])
const noticeDuration = computed(() => Math.max(20, noticeItems.value.length * 6))
const noticePaused = ref(false)

async function loadNoticeItems() {
  try {
    const baseURL = process.client
      ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          ? 'http://localhost:8081/pc'
          : 'http://43.242.200.25:8081/pc')
      : 'http://localhost:8081/pc'
    const res = await $fetch('/seckill/user/announcement/notices', {
      baseURL,
      headers: { appid: 'bd9d01ecc75dbbaaefce' },
      method: 'GET',
      query: { limit: 10 },
    })
    noticeItems.value = res?.data || res || []
  } catch (e) {
    console.error('[seckill] loadNoticeItems error:', e)
  }
}

// ── 动态栏：调后端接口，直接取 title 展示 ────────────────────
const dynamicItems = ref([])
const dynamicDuration = computed(() => Math.max(25, dynamicItems.value.length * 5))
const dynamicPaused = ref(false)

async function loadDynamicItems() {
  try {
    const baseURL = process.client
      ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          ? 'http://localhost:8081/pc'
          : 'http://43.242.200.25:8081/pc')
      : 'http://localhost:8081/pc'
    const res = await $fetch('/seckill/user/recent/orders', {
      baseURL,
      headers: { appid: 'bd9d01ecc75dbbaaefce' },
      method: 'GET',
      query: { limit: 10 },
    })
    dynamicItems.value = res?.data || res || []
  } catch (e) {
    console.error('[seckill] loadDynamicItems error:', e)
  }
}

// ── 场次 Tab 数据（把活动列表映射为 SessionTabs 需要的格式） ──
// 根据时间自己判断状态，不完全依赖后端 status（后端定时任务可能有延迟）
function resolveDisplayStatus(a) {
  const now = Date.now()
  // 后端时间格式 "2026-05-07 13:23:22"，替换空格为 T 兼容所有浏览器
  const parseT = s => s ? new Date(s.replace(' ', 'T')).getTime() : 0
  const start = parseT(a.startTime)
  const end   = parseT(a.endTime)
  if (a.status === 0) return 'draft'
  if (a.status === 4) return 'offline'
  if (a.status === 3) return 'ended'
  if (end > 0 && now > end) return 'ended'
  if (start > 0 && now >= start && end > 0 && now <= end) return 'active'
  if (start > 0 && now < start) return 'pending'
  return a.status === 2 ? 'active' : a.status === 1 ? 'pending' : 'ended'
}

const sessions = computed(() =>
  activityList.value.map(a => ({
    id: a.id,
    name: a.title,
    status: resolveDisplayStatus(a),
    rawStatus: a.status,
  }))
)

// 当前选中的活动对象
const activeActivity = computed(() =>
  activityList.value.find(a => String(a.id) === String(activeActivityId.value)) || null
)

// 倒计时目标时间
const correctedEndTime = computed(() => {
  if (!activeActivity.value?.endTime) return 0
  return new Date(activeActivity.value.endTime).getTime()
})

function handleSessionEnd() {
  loadActivityList()
}

// 切换场次时重新加载商品
watch(activeActivityId, () => {
  loadGoods()
})

// ── 筛选 ──────────────────────────────────────────────────────
const typeOptions = [
  { label: '全部', value: '' },
  { label: '课程', value: 1 },
  { label: '电子书', value: 2 },
  { label: '商品', value: 3 },
]
const filterType = ref('')
const searchKeyword = ref('')
const selectedTags = ref([])

// 从当前活动的 items 中收集所有不重复的标签
const availableTags = computed(() => {
  const items = activeActivity.value?.items || []
  const tagSet = new Set()
  items.forEach(item => (item.tagNames || []).forEach(t => tagSet.add(t)))
  return [...tagSet].sort()
})

// n-select 需要的 options 格式
const tagSelectOptions = computed(() =>
  availableTags.value.map(t => ({ label: t, value: t }))
)

function toggleTag(tag) {
  const idx = selectedTags.value.indexOf(tag)
  if (idx === -1) selectedTags.value.push(tag)
  else selectedTags.value.splice(idx, 1)
  loadGoods()
}

// ── 商品列表（从当前活动的 items 中取） ────────────────────
const goodsList = ref([])

async function loadGoods(silent = false) {
  if (!silent) pending.value = true
  console.log('[seckill] loadGoods, activeActivity:', activeActivity.value, 'items:', activeActivity.value?.items?.length)
  let items = activeActivity.value?.items || []
  if (filterType.value !== '') items = items.filter(g => g.goodsType === filterType.value)
  if (searchKeyword.value) items = items.filter(g => g.title?.includes(searchKeyword.value))
  if (selectedTags.value.length) {
    items = items.filter(g =>
      selectedTags.value.every(tag => (g.tagNames || []).includes(tag))
    )
  }
  goodsList.value = items
  console.log('[seckill] goodsList:', goodsList.value.length, 'pending will be:', silent ? 'unchanged' : false)
  if (!silent) pending.value = false
}

// ── 管理端：活动操作 ──────────────────────────────────────────
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showOrderModal = ref(false)
const showGoodsModal = ref(false)

function openCreateActivityModal() {
  showCreateModal.value = true
}

// 统一的带 token 的 $fetch 辅助
const { seckillFetch: adminFetch } = useSeckillFetch()

async function onActivityCreated(newActivity) {
  await new Promise(r => setTimeout(r, 350))
  pending.value = true
  try {
    // data: null 说明创建接口不返回 id，直接调管理端接口刷新列表
    const res = await fetchSeckillAdminActivityRows({ pageNum: 1, pageSize: 50 })
    console.log('[seckill] admin list after create:', res)
    activityList.value = res?.rows || []

    // 选中 id 最大的草稿（刚创建的）
    const drafts = activityList.value.filter(a => a.status === 0)
    console.log('[seckill] drafts:', drafts.length)
    activeActivityId.value = drafts.length
      ? drafts.reduce((max, a) => a.id > max.id ? a : max, drafts[0]).id
      : activityList.value[0]?.id || null
    await loadGoods()
  } catch (e) {
    console.error('[seckill] onActivityCreated error:', e)
  } finally {
    pending.value = false
  }
}

async function handlePublishActivity() {
  if (!activeActivity.value || activeActivity.value.status !== 0) return
  const confirmed = await new Promise(resolve => {
    dialog.info({
      title: '发布活动',
      content: `确认发布活动「${activeActivity.value.title}」？发布后将进入未开始状态。`,
      positiveText: '确认发布',
      negativeText: '取消',
      onPositiveClick: () => resolve(true),
      onNegativeClick: () => resolve(false),
      onClose: () => resolve(false),
    })
  })
  if (!confirmed) return
  const res = await adminFetch('/seckill/activity/status', {
    method: 'POST', body: { ids: [activeActivity.value.id], status: 1 },
  }).catch(() => null)
  if (res?.code === 200) {
    message.success('活动已发布')
    await loadActivityList()
  }
}

async function handleOfflineActivity() {
  if (!activeActivity.value) return
  if (activeActivity.value.status !== 1 && activeActivity.value.status !== 2) return
  const confirmed = await new Promise(resolve => {
    dialog.warning({
      title: '下架活动',
      content: `确认下架活动「${activeActivity.value.title}」？`,
      positiveText: '确认下架',
      negativeText: '取消',
      onPositiveClick: () => resolve(true),
      onNegativeClick: () => resolve(false),
      onClose: () => resolve(false),
    })
  })
  if (!confirmed) return
  const res = await adminFetch('/seckill/activity/status', {
    method: 'POST', body: { ids: [activeActivity.value.id], status: 4 },
  }).catch(() => null)
  if (res?.code === 200) {
    message.success('活动已下架')
    await loadActivityList()
  }
}

async function handleDeleteActivity() {
  if (!activeActivity.value) return
  const confirmed = await new Promise(resolve => {
    dialog.error({
      title: '删除活动',
      content: `确认删除活动「${activeActivity.value.title}」？此操作不可恢复。`,
      positiveText: '确认删除',
      negativeText: '取消',
      onPositiveClick: () => resolve(true),
      onNegativeClick: () => resolve(false),
      onClose: () => resolve(false),
    })
  })
  if (!confirmed) return
  const idArr = [activeActivity.value.id]
  const params = idArr.map(id => `ids=${id}`).join('&')
  const res = await adminFetch(`/seckill/activity/batch?${params}`, {
    method: 'DELETE',
  }).catch(() => null)
  if (res?.code === 200) {
    message.success('活动已删除')
    activeActivityId.value = null
    await loadActivityList(true)
  }
}

// ── 用户端：跳转详情 ──────────────────────────────────────────
function goDetail(item) {
  const actId = item.activityId || activeActivity.value?.id
  // 把活动数据存到共享状态，详情页直接用，不再重新请求
  useState('seckillActivity').value = activeActivity.value
  navigateTo(`/seckill/detail/${actId}?itemId=${item.id}`)
}

function handleBuy(item) {
  const actId = item.activityId || activeActivity.value?.id
  useState('seckillActivity').value = activeActivity.value
  navigateTo(`/seckill/detail/${actId}?itemId=${item.id}`)
}
</script>

<style scoped>
/* ── Banner ─────────────────────────────────────────────── */
.seckill-banner {
  position: relative;
  background: #e1251b;
  overflow: hidden;
  min-height: 180px;
}
.banner-bg-left {
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, #b71c1c 0%, #e1251b 40%, #ff4747 80%, #ff6b35 100%);
}
.banner-bg-right {
  position: absolute;
  top: -60px; right: -60px;
  width: 360px; height: 360px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%);
}
.banner-wave {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, transparent, #f5a623, #fff, #f5a623, transparent);
}
.banner-inner {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1200px;
  margin: 0 auto;
  padding: 28px 32px;
  gap: 20px;
}
.banner-left { flex: 1; min-width: 0; }
.banner-tag-row { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; }
.live-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(255,255,255,0.3);
  animation: pulse-white 1.5s ease-in-out infinite;
}
@keyframes pulse-white {
  0%, 100% { box-shadow: 0 0 0 3px rgba(255,255,255,0.3); }
  50% { box-shadow: 0 0 0 6px rgba(255,255,255,0.1); }
}
.live-text { font-size: 11px; color: rgba(255,255,255,0.9); font-weight: 600; letter-spacing: 1.5px; }
.banner-title {
  font-size: 44px; font-weight: 900; color: #fff;
  margin: 0 0 4px; line-height: 1.1;
  display: flex; align-items: center; gap: 10px;
  text-shadow: 0 2px 8px rgba(0,0,0,0.2);
}
.title-fire { font-size: 38px; }
.banner-sub { font-size: 18px; font-weight: 700; color: #fde68a; margin: 0 0 10px; }
.banner-desc { font-size: 13px; color: rgba(255,255,255,0.75); margin: 0 0 14px; }
.banner-feature-list { display: flex; gap: 10px; flex-wrap: wrap; }
.feature-item {
  font-size: 12px; color: rgba(255,255,255,0.85);
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.25);
  padding: 3px 10px; border-radius: 20px;
}
.banner-center { flex-shrink: 0; }
.countdown-card {
  background: rgba(0,0,0,0.25);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 12px; padding: 18px 24px;
  text-align: center; min-width: 210px;
}
.countdown-title {
  font-size: 12px; color: rgba(255,255,255,0.8);
  margin-bottom: 12px; display: flex;
  align-items: center; justify-content: center;
  gap: 5px; letter-spacing: 1px;
}
.countdown-body { margin-bottom: 8px; }
.countdown-over { font-size: 16px; color: rgba(255,255,255,0.5); }
.countdown-hint { font-size: 11px; color: rgba(255,255,255,0.45); }
.countdown-widget :deep(.count-down) {
  display: flex; align-items: center; justify-content: center;
  gap: 4px; color: rgba(255,255,255,0.7); font-size: 12px;
}
.countdown-widget :deep(.count-down small) {
  background: #1a1a1a; color: #fff; border-radius: 4px;
  padding: 5px 8px; font-size: 24px; font-weight: 900;
  min-width: 38px; text-align: center; font-variant-numeric: tabular-nums;
}
.banner-right {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 8px; flex-shrink: 0;
}
.stat-card {
  display: flex; flex-direction: column; align-items: center;
  background: rgba(0,0,0,0.2);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 10px; padding: 12px 16px; min-width: 96px;
  transition: background 0.2s;
}
.stat-card:hover { background: rgba(0,0,0,0.3); }
.stat-icon { font-size: 18px; margin-bottom: 3px; }
.stat-num { font-size: 15px; font-weight: 800; color: #fde68a; line-height: 1.2; }
.stat-label { font-size: 11px; color: rgba(255,255,255,0.6); margin-top: 2px; }
@media (max-width: 900px) { .banner-right { display: none; } }
@media (max-width: 640px) { .banner-center { display: none; } .banner-title { font-size: 30px; } }

.seckill-page {
  background: #fff;
  min-height: 100vh;
}

/* ── Body ────────────────────────────────────────────────── */
.seckill-body {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px 24px 40px;
}

/* ── 场次 Tab ────────────────────────────────────────────── */
:deep(.session-tabs) {
  background: #fff;
  border-radius: 12px;
  padding: 14px 20px;
  margin-bottom: 14px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
:deep(.session-tab) {
  border-radius: 8px;
  background: #f7f7f7;
  border: 1.5px solid #e5e7eb;
  transition: all 0.2s;
}
:deep(.session-tab:hover) { border-color: #e1251b; }
:deep(.session-tab.active) { background: #fff1f0; border-color: #e1251b; }
:deep(.status-active .session-badge) { background: #e1251b; }

/* ── 操作栏 ──────────────────────────────────────────────── */
.action-bar {
  display: flex; align-items: center;
  justify-content: space-between; gap: 12px;
  margin-bottom: 14px; padding: 14px 20px;
  background: #fff; border-radius: 12px;
  box-shadow: none;
  border: 1px solid #f3f4f6;
}
.search-filter-wrap {
  display: flex; align-items: center; gap: 10px;
  flex: 1; min-width: 0;
}
.search-wrap {
  display: flex; align-items: center; flex: 1; max-width: 300px;
  background: #f7f7f7; border: 1.5px solid #e5e7eb;
  border-radius: 24px; padding: 0 16px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.search-wrap:focus-within {
  border-color: #e1251b; background: #fff;
  box-shadow: 0 0 0 3px rgba(225,37,27,0.08);
}
.search-icon { color: #aaa; flex-shrink: 0; margin-right: 8px; }
.search-input {
  flex: 1; padding: 9px 0; border: none;
  background: transparent; font-size: 14px; outline: none; color: #222;
}
.search-input::placeholder { color: #bbb; }
.search-btn {
  padding: 7px 20px; background: #e1251b; color: #fff;
  border: none; border-radius: 16px; font-size: 13px;
  font-weight: 600; cursor: pointer; margin-left: 8px; flex-shrink: 0;
  transition: background 0.15s, transform 0.1s;
}
.search-btn:hover { background: #c0392b; transform: translateY(-1px); }
.tag-select { width: 180px; flex-shrink: 0; }
.manage-btns { display: flex; gap: 8px; margin-left: 8px; flex-shrink: 0; }
.manage-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 7px 16px; border-radius: 8px;
  font-size: 13px; font-weight: 500; cursor: pointer;
  border: 1.5px solid; transition: all 0.15s; background: #fff;
}
.manage-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.manage-btn.add-mode-btn     { border-color: #e1251b; color: #e1251b; }
.manage-btn.add-mode-btn:hover:not(:disabled) { background: #e1251b; color: #fff; }
.manage-btn.publish-mode-btn { border-color: #22c55e; color: #22c55e; }
.manage-btn.publish-mode-btn:hover:not(:disabled) { background: #22c55e; color: #fff; }
.manage-btn.offline-mode-btn { border-color: #f59e0b; color: #f59e0b; }
.manage-btn.offline-mode-btn:hover:not(:disabled) { background: #f59e0b; color: #fff; }
.manage-btn.delete-mode-btn  { border-color: #ef4444; color: #ef4444; }
.manage-btn.delete-mode-btn:hover:not(:disabled)  { background: #ef4444; color: #fff; }
.manage-btn.order-mode-btn   { border-color: #6366f1; color: #6366f1; }
.manage-btn.order-mode-btn:hover:not(:disabled)   { background: #6366f1; color: #fff; }
.manage-btn.goods-mode-btn   { border-color: #10b981; color: #10b981; }
.manage-btn.goods-mode-btn:hover:not(:disabled)   { background: #10b981; color: #fff; }
.manage-btn.edit-mode-btn    { border-color: #0ea5e9; color: #0ea5e9; }
.manage-btn.edit-mode-btn:hover:not(:disabled)    { background: #0ea5e9; color: #fff; }

/* ── 筛选栏 ──────────────────────────────────────────────── */
.filter-bar {
  display: flex; flex-wrap: wrap; gap: 10px; align-items: center;
  margin-bottom: 16px; padding: 12px 20px;
  background: #fff; border-radius: 12px;
  box-shadow: none;
  border: 1px solid #f3f4f6;
}
.filter-group { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.filter-label { font-size: 13px; color: #999; white-space: nowrap; font-weight: 500; }
.filter-btn {
  padding: 5px 16px; border-radius: 16px;
  border: 1.5px solid #e5e7eb; background: #f7f7f7;
  font-size: 13px; color: #555; cursor: pointer; transition: all 0.15s;
}
.filter-btn:hover { border-color: #e1251b; color: #e1251b; background: #fff5f5; }
.filter-btn.active {
  background: #e1251b; border-color: #e1251b;
  color: #fff; font-weight: 600;
  box-shadow: 0 2px 8px rgba(225,37,27,0.25);
}

/* ── 商品网格 ────────────────────────────────────────────── */
.goods-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}
.empty-tip {
  padding: 80px 0; text-align: center;
  background: #fff; border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.loading-tip {
  padding: 80px 0; text-align: center;
  color: #9ca3af; font-size: 14px;
  background: #fff; border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

/* ── 公告 & 动态滚动栏 ───────────────────────────────────── */
.seckill-notice-wrap {
  background: transparent;
  padding: 6px 32px;
}
.seckill-notice-bar {
  max-width: 1200px;
  margin: 0 auto 4px;
  padding: 0 12px 0 0;
  display: flex;
  align-items: center;
  height: 34px;
  overflow: hidden;
  background: linear-gradient(90deg, #fef9c3 0%, #fef3c7 40%, #fce7f3 100%);
  border: none;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(251,191,36,0.12);
  animation: seckill-notice-in 0.5s ease both;
}

.seckill-notice-bar-blue {
  background: linear-gradient(90deg, #eff6ff 0%, #dbeafe 40%, #ede9fe 100%);
  border: none;
  box-shadow: 0 1px 4px rgba(59,130,246,0.08);
  margin-bottom: 0;
}

@keyframes seckill-notice-in {
  from { opacity: 0; transform: translateY(-100%); }
  to   { opacity: 1; transform: translateY(0); }
}

.seckill-notice-label {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 10px;
  height: 100%;
  width: 64px;
  border-radius: 0 6px 6px 0;
  color: white;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
  flex-shrink: 0;
  margin-right: 14px;
  letter-spacing: 0.08em;
  text-shadow: 0 1px 3px rgba(0,0,0,0.2);
  justify-content: center;
}

.seckill-notice-label-yellow {
  background: linear-gradient(135deg, #f59e0b, #f97316);
  box-shadow: 2px 0 12px rgba(249,115,22,0.35);
  animation: label-pulse-yellow 3s ease-in-out infinite;
}

.seckill-notice-label-blue {
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  box-shadow: 2px 0 12px rgba(99,102,241,0.35);
  animation: label-pulse-blue 3s ease-in-out infinite;
}

@keyframes label-pulse-yellow {
  0%, 100% { box-shadow: 2px 0 12px rgba(249,115,22,0.35); }
  50%       { box-shadow: 2px 0 20px rgba(249,115,22,0.6); }
}

@keyframes label-pulse-blue {
  0%, 100% { box-shadow: 2px 0 12px rgba(99,102,241,0.35); }
  50%       { box-shadow: 2px 0 20px rgba(99,102,241,0.6); }
}

.seckill-scroll-wrap {
  flex: 1;
  overflow: hidden;
  height: 100%;
  display: flex;
  align-items: center;
}

.seckill-scroll-track {
  display: flex;
  align-items: center;
  white-space: nowrap;
  animation: seckill-scroll linear infinite;
}

@keyframes seckill-scroll {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.seckill-notice-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #111827;
  padding-right: 6px;
  cursor: default;
  transition: color 0.2s;
}

.seckill-notice-item:hover { color: #d97706; }

.seckill-notice-dot {
  display: inline-block;
  width: 7px; height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  animation: dot-blink-sk 2s ease-in-out infinite;
}

@keyframes dot-blink-sk {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.5; transform: scale(1.4); }
}

.seckill-notice-sep {
  color: #d97706;
  margin: 0 16px 0 8px;
  font-size: 14px;
  opacity: 0.5;
}
</style>

<!-- 太空风格覆盖（非 scoped，通过 data-theme 属性控制） -->
<style>
/* ===== 秒杀页 · 太空风格 ===== */

/* 页面背景 */
[data-theme="space"] .seckill-page {
  background: #020817 !important;
}

/* 公告栏 */
[data-theme="space"] .seckill-notice-bar {
  background: linear-gradient(90deg, #0d1f3c 0%, #0d2137 40%, #1a1040 100%) !important;
  box-shadow: 0 1px 4px rgba(88,166,255,0.1) !important;
}
[data-theme="space"] .seckill-notice-bar-blue {
  background: linear-gradient(90deg, #0d1117 0%, #0d1f3c 40%, #130d2e 100%) !important;
  box-shadow: 0 1px 4px rgba(99,102,241,0.1) !important;
}
[data-theme="space"] .seckill-notice-item {
  color: #8b949e !important;
}
[data-theme="space"] .seckill-notice-item:hover {
  color: #58a6ff !important;
}
[data-theme="space"] .seckill-notice-sep {
  color: #58a6ff !important;
}

/* Banner */
[data-theme="space"] .seckill-banner {
  background: #020817 !important;
}
[data-theme="space"] .banner-bg-left {
  background: linear-gradient(105deg, #0a1628 0%, #0d2137 40%, #1d4ed8 80%, #0ea5e9 100%) !important;
}
[data-theme="space"] .banner-bg-right {
  background: radial-gradient(circle, rgba(88,166,255,0.15) 0%, transparent 70%) !important;
}
[data-theme="space"] .banner-wave {
  background: linear-gradient(90deg, transparent, #58a6ff, #a5d6ff, #58a6ff, transparent) !important;
}
[data-theme="space"] .banner-sub {
  color: #79c0ff !important;
}
[data-theme="space"] .feature-item {
  background: rgba(88,166,255,0.1) !important;
  border-color: rgba(88,166,255,0.25) !important;
}
[data-theme="space"] .stat-num {
  color: #79c0ff !important;
}
[data-theme="space"] .countdown-card {
  background: rgba(13,33,55,0.6) !important;
  border-color: rgba(88,166,255,0.2) !important;
}
[data-theme="space"] .countdown-widget :deep(small) {
  background: #0d1117 !important;
}

/* Body 区域 */
[data-theme="space"] .seckill-body {
  background: transparent !important;
}

/* 场次 Tab */
[data-theme="space"] :deep(.session-tabs) {
  background: #0d1117 !important;
  border: 1px solid rgba(48,54,61,0.8) !important;
  box-shadow: none !important;
}
[data-theme="space"] :deep(.session-tab) {
  background: #161b22 !important;
  border-color: rgba(48,54,61,0.8) !important;
  color: #8b949e !important;
}
[data-theme="space"] :deep(.session-tab:hover) {
  border-color: #58a6ff !important;
  color: #58a6ff !important;
}
[data-theme="space"] :deep(.session-tab.active) {
  background: #0d2137 !important;
  border-color: #58a6ff !important;
  color: #58a6ff !important;
}
[data-theme="space"] :deep(.status-active .session-badge) {
  background: #1d4ed8 !important;
}

/* 操作栏 */
[data-theme="space"] .action-bar {
  background: #0d1117 !important;
  border-color: rgba(48,54,61,0.8) !important;
}
[data-theme="space"] .search-wrap {
  background: #161b22 !important;
  border-color: rgba(48,54,61,0.8) !important;
}
[data-theme="space"] .search-wrap:focus-within {
  border-color: #58a6ff !important;
  background: #0d1117 !important;
  box-shadow: 0 0 0 3px rgba(88,166,255,0.12) !important;
}
[data-theme="space"] .search-icon {
  color: #484f58 !important;
}
[data-theme="space"] .search-input {
  color: #e6edf3 !important;
}
[data-theme="space"] .search-input::placeholder {
  color: #484f58 !important;
}
[data-theme="space"] .search-btn {
  background: linear-gradient(135deg, #1d4ed8, #0ea5e9) !important;
}
[data-theme="space"] .search-btn:hover {
  background: linear-gradient(135deg, #1e40af, #0284c7) !important;
}
[data-theme="space"] .manage-btn {
  background: #161b22 !important;
}

/* 筛选栏 */
[data-theme="space"] .filter-bar {
  background: #0d1117 !important;
  border-color: rgba(48,54,61,0.8) !important;
}
[data-theme="space"] .filter-label {
  color: #484f58 !important;
}
[data-theme="space"] .filter-btn {
  background: #161b22 !important;
  border-color: rgba(48,54,61,0.8) !important;
  color: #8b949e !important;
}
[data-theme="space"] .filter-btn:hover {
  border-color: #58a6ff !important;
  color: #58a6ff !important;
  background: #0d1f3c !important;
}
[data-theme="space"] .filter-btn.active {
  background: linear-gradient(135deg, #1d4ed8, #0ea5e9) !important;
  border-color: #1d4ed8 !important;
  color: #fff !important;
  box-shadow: 0 2px 8px rgba(29,78,216,0.35) !important;
}

/* 加载 / 空状态 */
[data-theme="space"] .loading-tip,
[data-theme="space"] .empty-tip {
  background: #0d1117 !important;
  color: #484f58 !important;
  border: 1px solid rgba(48,54,61,0.8) !important;
  box-shadow: none !important;
}
</style>
