<template>
  <div class="website-container">
    <!-- 筛选栏 -->
    <UseFullFilter
      v-model:modelValue="queryParams"
      :tag-options="tagOptions"
      @search="handleSearch"
    >
      <template #actions>
        <ClientOnly>
          <button v-if="canSubmit" class="btn-create" @click="goCreate">
            + 提交网站
          </button>
        </ClientOnly>
      </template>
    </UseFullFilter>

    <!-- 列表区域 -->
    <div class="website-content">
      <!-- 加载中 -->
      <Transition name="fade">
        <div v-if="loading" class="loading-overlay">
          <n-spin size="large" />
        </div>
      </Transition>

      <ClientOnly>
        <div class="website-list-box">
          <div v-if="websiteList.length > 0" class="website-row-list">
            <div
              v-for="item in websiteList"
              :key="item.id"
              class="website-item-row"
            >
              <!-- 主内容行 -->
              <div class="website-row-main">
                <!-- Logo / 首字母头像 -->
                <div class="website-logo" :style="{ background: getLogoBg(item.name) }">
                  <img
                    v-if="item.logoUrl"
                    :src="item.logoUrl"
                    :alt="item.name"
                    class="logo-img"
                    @error="e => e.target.style.display='none'"
                  />
                  <span v-else class="logo-placeholder">{{ item.name?.charAt(0) }}</span>
                </div>

                <!-- 名称 + 描述 + 标签 -->
                <div class="website-info">
                  <div class="website-name-row">
                    <span class="website-name">{{ item.name }}</span>
                    <span v-if="item.no" class="website-no">{{ item.no }}</span>
                    <span class="website-tags">
                      <n-tag
                        v-for="tag in parseTags(item.tags)"
                        :key="tag"
                        size="small"
                        :bordered="false"
                        class="tag-item"
                      >{{ tag }}</n-tag>
                    </span>
                  </div>
                  <div class="website-desc">{{ item.description || '暂无描述' }}</div>
                </div>

                <!-- 统计数据：我的收藏模式下不显示 -->
                <div v-if="!queryParams.isFollowing" class="website-meta">
                  <span class="meta-item">{{ item.clickCount || 0 }} 访问</span>
                  <span class="meta-item">{{ item.collectionCount || 0 }} 收藏</span>
                  <span v-if="item.ratingScore" class="meta-item score">
                    ⭐ {{ Number(item.ratingScore).toFixed(1) }}
                  </span>
                </div>

                <!-- 操作按钮 -->
                <div class="website-actions">
                  <!-- 评价按钮：我的收藏模式下不显示 -->
                  <ClientOnly>
                    <template v-if="canRating && !queryParams.isFollowing">
                      <button
                        class="action-btn vote good"
                        :class="{ active: item.myRating === 1 }"
                        @click.stop="handleRating(item, 1)"
                      >👍 {{ item.goodCount || 0 }}</button>
                      <button
                        class="action-btn vote mid"
                        :class="{ active: item.myRating === 2 }"
                        @click.stop="handleRating(item, 2)"
                      >😐 {{ item.midCount || 0 }}</button>
                      <button
                        class="action-btn vote bad"
                        :class="{ active: item.myRating === 3 }"
                        @click.stop="handleRating(item, 3)"
                      >👎 {{ item.badCount || 0 }}</button>
                    </template>
                  </ClientOnly>

                  <!-- 收藏按钮 -->
                  <ClientOnly>
                    <button
                      v-if="canFavorite"
                      class="action-btn favorite"
                      :class="{ active: item.isFavorite }"
                      @click.stop="handleFavorite(item)"
                    >{{ item.isFavorite ? '已收藏' : '+ 收藏' }}</button>
                  </ClientOnly>

                  <!-- 访问按钮 -->
                  <button
                    class="action-btn open"
                    @click.stop="handleOpen(item)"
                  >🔗 访问</button>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="!loading" class="empty-placeholder">
            <n-empty :description="queryParams.isFollowing ? '暂无收藏的网站' : '暂无网站数据'" />
          </div>
        </div>
      </ClientOnly>

      <!-- 分页 -->
      <div class="pagination-footer">
        <n-pagination
          v-model:page="queryParams.pageNum"
          :item-count="total"
          :page-size="queryParams.pageSize"
          @update:page="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { createDiscreteApi, NPagination, NSpin, NEmpty, NTag } from 'naive-ui'
import UseFullFilter from '~/components/UseFull/Filter.vue'
import {
  apiWebsiteTags,
  apiWebsiteList,
  apiWebsiteMyFavorites,
  apiWebsiteClick,
  apiWebsiteFavorite,
  apiWebsiteCancelFavorite,
  apiWebsiteRating,
} from '~/composables/Api/UseFull/usefull'

const { permissionList } = usePermission()

const canSubmit   = computed(() => permissionList.value.includes('website:submit'))
const canFavorite = computed(() => permissionList.value.includes('website:favorite'))
const canRating   = computed(() => permissionList.value.includes('website:rating:submit'))

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  websiteName: '',
  tagNames: [],
  isFollowing: false,
})

const websiteList = ref([])
const tagOptions  = ref([])
const total       = ref(0)
const loading     = ref(false)

// 根据名称生成固定背景色，同一名称颜色始终一致
const LOGO_COLORS = [
  'linear-gradient(135deg,#667eea,#764ba2)',
  'linear-gradient(135deg,#f093fb,#f5576c)',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
  'linear-gradient(135deg,#43e97b,#38f9d7)',
  'linear-gradient(135deg,#fa709a,#fee140)',
  'linear-gradient(135deg,#a18cd1,#fbc2eb)',
  'linear-gradient(135deg,#fccb90,#d57eeb)',
  'linear-gradient(135deg,#0ea5e9,#6366f1)',
]
const getLogoBg = (name) => {
  if (!name) return LOGO_COLORS[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return LOGO_COLORS[Math.abs(hash) % LOGO_COLORS.length]
}

// 解析 tags 逗号字符串为数组
const parseTags = (tags) => {
  if (!tags) return []
  return tags.split(',').map(t => t.trim()).filter(Boolean)
}

// 加载标签
const loadTags = async () => {
  try {
    const res = await apiWebsiteTags()
    if (res?.code === 200) {
      tagOptions.value = (res.data || []).map(t => ({
        label: t.tagName,
        value: t.tagName,
      }))
    }
  } catch (e) {
    console.error('加载标签失败', e)
  }
}

// 加载网站列表
const loadList = async () => {
  loading.value = true
  try {
    let rows = []
    let totalCount = 0

    if (queryParams.isFollowing) {
      // 我的收藏走专用接口 GET /website/Favorites
      const res = await apiWebsiteMyFavorites(queryParams.pageNum, queryParams.pageSize)
      if (res?.code === 200) {
        const data = res.data || {}
        // 收藏列表字段名与普通列表不同，做映射统一
        rows = (data.rows || []).map(item => ({
          id: item.websiteId || item.id,
          name: item.websiteName || item.name,
          url: item.websiteUrl || item.url,
          description: item.websiteDescription || item.description,
          logoUrl: item.logoUrl || null,
          tags: item.tags || null,
          clickCount: item.clickCount || 0,
          collectionCount: item.collectionCount || 0,
          goodCount: item.goodCount || 0,
          midCount: item.midCount || 0,
          badCount: item.badCount || 0,
          ratingScore: item.ratingScore || null,
          no: item.no || null,
          collectionFlag: 1,
          myRatingType: item.myRatingType || null,
        }))
        totalCount = data.total || 0
      } else {
        const { message } = createDiscreteApi(['message'])
        message.error(res?.msg || '加载收藏列表失败')
      }
    } else {
      const body = {
        pageNum: queryParams.pageNum,
        pageSize: queryParams.pageSize,
        websiteName: queryParams.websiteName || undefined,
        tagNames: queryParams.tagNames?.length ? queryParams.tagNames : undefined,
      }
      const res = await apiWebsiteList(body)
      if (res?.code === 200) {
        const data = res.data || {}
        rows = data.rows || []
        totalCount = data.total || 0
      } else {
        const { message } = createDiscreteApi(['message'])
        message.error(res?.msg || '加载失败')
      }
    }

    websiteList.value = rows.map(item => ({
      ...item,
      // collectionFlag=1 表示当前用户已收藏；我的收藏列表里的条目默认已收藏
      isFavorite: item.collectionFlag === 1 || queryParams.isFollowing,
      // myRatingType 表示当前用户对该网站的评价类型（1好评/2中评/3差评）
      myRating: item.myRatingType || null,
    }))
    total.value = totalCount
  } catch (e) {
    console.error('加载网站列表失败', e)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  queryParams.pageNum = 1
  loadList()
}

const handlePageChange = (page) => {
  queryParams.pageNum = page
  loadList()
}

// 点击访问
const handleOpen = async (item) => {
  // 先记录点击，失败不影响跳转
  try { await apiWebsiteClick(item.id) } catch {}
  item.clickCount = (item.clickCount || 0) + 1
  window.open(item.url, '_blank')
}

// 收藏 / 取消收藏
const handleFavorite = async (item) => {
  const { message } = createDiscreteApi(['message'])
  const wasFavorite = item.isFavorite
  item.isFavorite = !wasFavorite
  item.collectionCount = wasFavorite
    ? Math.max(0, (item.collectionCount || 0) - 1)
    : (item.collectionCount || 0) + 1
  try {
    const res = wasFavorite
      ? await apiWebsiteCancelFavorite(item.id)
      : await apiWebsiteFavorite(item.id)
    if (res?.code === 200) {
      message.success(wasFavorite ? '已取消收藏' : '收藏成功')
    } else {
      // 回滚
      item.isFavorite = wasFavorite
      item.collectionCount = wasFavorite
        ? (item.collectionCount || 0) + 1
        : Math.max(0, (item.collectionCount || 0) - 1)
      message.error(res?.msg || '操作失败')
    }
  } catch {
    item.isFavorite = wasFavorite
    message.error('请求失败')
  }
}

// 提交评价
const handleRating = async (item, ratingType) => {
  const { message } = createDiscreteApi(['message'])
  const oldRating = item.myRating
  // 同一评价再次点击不重复提交
  if (oldRating === ratingType) return

  const countKey = { 1: 'goodCount', 2: 'midCount', 3: 'badCount' }
  // 乐观更新：先减掉旧评价计数，再加新评价计数
  if (oldRating) {
    item[countKey[oldRating]] = Math.max(0, (item[countKey[oldRating]] || 0) - 1)
  }
  item[countKey[ratingType]] = (item[countKey[ratingType]] || 0) + 1
  item.myRating = ratingType

  try {
    const res = await apiWebsiteRating(item.id, ratingType)
    if (res?.code === 200) {
      message.success('评价成功')
      // 后端 goodCount/midCount/badCount 已实时更新，重新拉列表同步真实数据
      await loadList()
    } else if (res?.msg?.includes('已经评价')) {
      // 后端说已评价过：保留高亮状态，不回滚，静默处理
    } else {
      // 其他错误：回滚乐观更新
      item.myRating = oldRating
      if (oldRating) {
        item[countKey[oldRating]] = (item[countKey[oldRating]] || 0) + 1
      }
      item[countKey[ratingType]] = Math.max(0, (item[countKey[ratingType]] || 0) - 1)
      message.error(res?.msg || '评价失败')
    }
  } catch (e) {
    const errMsg = e?.data?.msg || e?.message || ''
    if (errMsg.includes('已经评价')) {
      // 同上，已评价过，保留高亮
      return
    }
    // 其他异常：回滚
    item.myRating = oldRating
    if (oldRating) {
      item[countKey[oldRating]] = (item[countKey[oldRating]] || 0) + 1
    }
    item[countKey[ratingType]] = Math.max(0, (item[countKey[ratingType]] || 0) - 1)
    message.error('请求失败')
  }
}

const goCreate = () => navigateTo('/usefull/create')

onMounted(() => {
  loadTags()
  loadList()
})
</script>

<style scoped>
.website-container {
  width: 100%;
  padding: 20px;
  box-sizing: border-box;
  background: #f5f7fa;
  min-height: calc(100vh - 40px);
}

/* 内容区 */
.website-content {
  position: relative;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  overflow: hidden;
}

/* 加载遮罩 */
.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.7);
  z-index: 10;
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* 列表 */
.website-row-list { width: 100%; }

.website-item-row {
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.15s;
}
.website-item-row:last-child { border-bottom: none; }
.website-item-row:hover { background: #f9fafc; }

/* 主内容行 */
.website-row-main {
  display: flex;
  align-items: center;
  padding: 14px 20px;
  gap: 16px;
  min-height: 72px;
}

/* Logo */
.website-logo {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.logo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.logo-placeholder {
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  text-transform: uppercase;
}

/* 信息区 */
.website-info {
  flex: 1;
  min-width: 0;
}
.website-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}
.website-name {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  white-space: nowrap;
}
.website-no {
  font-size: 11px;
  color: #aaa;
  background: #f5f5f5;
  padding: 1px 6px;
  border-radius: 4px;
}
.website-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.tag-item {
  background: #f0f7ff !important;
  color: #3b82f6 !important;
  font-size: 11px;
}
.website-desc {
  font-size: 13px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 480px;
}

/* 统计 */
.website-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
  min-width: 80px;
}
.meta-item {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
}
.meta-item.score { color: #f59e0b; font-weight: 500; }

/* 操作按钮 */
.website-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.action-btn {
  padding: 5px 12px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background: #fff;
  font-size: 12px;
  color: #555;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.action-btn:hover { border-color: #18a058; color: #18a058; }
.action-btn.vote.good:hover, .action-btn.vote.good.active { border-color: #18a058; color: #18a058; background: #f0fdf4; }
.action-btn.vote.mid:hover,  .action-btn.vote.mid.active  { border-color: #f59e0b; color: #f59e0b; background: #fffbeb; }
.action-btn.vote.bad:hover,  .action-btn.vote.bad.active  { border-color: #ef4444; color: #ef4444; background: #fef2f2; }
.action-btn.favorite { border-color: #d9d9d9; }
.action-btn.favorite:hover, .action-btn.favorite.active {
  border-color: #f59e0b; color: #f59e0b; background: #fffbeb;
}
.action-btn.open {
  background: #18a058;
  color: #fff;
  border-color: #18a058;
  font-weight: 500;
}
.action-btn.open:hover { background: #0e7a3e; border-color: #0e7a3e; }

/* 新增按钮 */
.btn-create {
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
.btn-create:hover { background: #0e7a3e; }

/* 空状态 */
.empty-placeholder {
  padding: 60px 0;
  display: flex;
  justify-content: center;
}

/* 分页 */
.pagination-footer {
  display: flex;
  justify-content: center;
  padding: 16px 0;
  border-top: 1px solid #f0f0f0;
}

/* 响应式 */
@media (max-width: 768px) {
  .website-container { padding: 12px; }
  .website-row-main { flex-wrap: wrap; padding: 12px 14px; }
  .website-meta { flex-direction: row; min-width: unset; }
  .website-actions { flex-wrap: wrap; }
  .website-desc { max-width: 100%; }
}
</style>
