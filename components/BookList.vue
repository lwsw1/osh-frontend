<template>
  <article class="book-card" role="link" tabindex="0" @click="open" @keyup.enter="open">
    <div class="cover-shell">
      <UiImage :src="item.cover || defaultCover" object-fit="contain" class="book-cover" />
      <span class="cover-level">{{ bookLevelLabel(item.level) }}</span>
      <span v-if="Number(item.price || 0) === 0" class="cover-badge free">免费</span>
      <span v-else class="cover-badge paid">付费</span>
    </div>

    <div class="card-body">
      <div class="card-top">
        <div class="title-block">
          <h3>{{ item.title }}</h3>
          <p>{{ item.desc || item.description || '暂无简介，点击查看完整电子书详情。' }}</p>
        </div>

        <button
          class="favorite-btn"
          :class="{ active: favoriteActive }"
          @click.stop="toggleFavorite"
          :disabled="favoriteLoading"
          aria-label="收藏电子书"
          :title="favoriteActive ? '取消收藏' : '收藏'"
        >
          <n-icon :component="favoriteActive ? Heart : HeartOutline" />
        </button>
      </div>

      <div v-if="displayTags.length" class="tag-row">
        <span v-for="tag in displayTags" :key="tag" class="tag-chip">{{ tag }}</span>
      </div>

      <div class="stats-row">
        <div class="stat-box">
          <n-icon :component="PeopleOutline" />
          <span>购买人数</span>
          <strong>{{ item.purchase_count || item.purchaseCount || item.sub_count || 0 }}</strong>
        </div>
        <div class="stat-box">
          <n-icon :component="ListOutline" />
          <span>章节数</span>
          <strong>{{ item.chapterCount ?? 0 }}</strong>
        </div>
        <div class="stat-box">
          <n-icon :component="ShieldCheckmarkOutline" />
          <span>权限等级</span>
          <strong>{{ bookLevelLabel(item.level) }}</strong>
        </div>
      </div>

      <div class="footer-row">
        <div class="price-block">
          <span class="price">{{ Number(item.price || 0) === 0 ? '免费' : `¥${item.price}` }}</span>
          <span v-if="item.t_price || item.tPrice" class="origin">¥{{ item.t_price || item.tPrice }}</span>
        </div>
        <button class="enter-btn">
          <span>查看详情</span>
          <n-icon :component="ArrowForwardOutline" />
        </button>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { createDiscreteApi, NIcon } from 'naive-ui'
import {
  ArrowForwardOutline,
  Heart,
  HeartOutline,
  ListOutline,
  PeopleOutline,
  ShieldCheckmarkOutline,
} from '@vicons/ionicons5'
import { useHasAuth } from '~/composables/useAuth'
import { apiFavoriteBook } from '~/composables/Api/Book/book'
import { bookLevelLabel } from '~/composables/bookLevels'

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['refresh'])

const { message } = createDiscreteApi(['message'])

const defaultCover = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='160'%3E%3Crect width='120' height='160' fill='%23edf2f7'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%2364758b'%3EBOOK%3C/text%3E%3C/svg%3E"

const favoriteLoading = ref(false)
const favoriteActive = ref(false)

watch(
  () => props.item,
  (value) => {
    favoriteActive.value = Number(value?.favorited ?? value?.collectionFlag ?? 0) === 1 || value?.isFavorite === true
  },
  { immediate: true, deep: true }
)

const displayTags = computed(() => {
  const tags = props.item.tagNameList || props.item.tags || []
  return tags.slice(0, 3)
})

function open() {
  navigateTo(`/detail/book/${props.item.id}`)
}

function toggleFavorite() {
  useHasAuth(async () => {
    if (favoriteLoading.value) return
    favoriteLoading.value = true

    const nextStatus = favoriteActive.value ? 0 : 1

    try {
      const response = await apiFavoriteBook(props.item.id, nextStatus)
      if (response?.code && response.code !== 200) {
        throw new Error(response.msg || '收藏操作失败')
      }
      favoriteActive.value = nextStatus === 1
      message.success(nextStatus === 1 ? '已加入收藏' : '已取消收藏')
      emit('refresh')
    } catch (error) {
      console.error('toggle book favorite failed', error)
      message.error(error?.data?.msg || error?.message || '收藏操作失败')
    } finally {
      favoriteLoading.value = false
    }
  })
}
</script>

<style scoped>
.book-card {
  position: relative;
  display: grid;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  grid-template-columns: 148px minmax(0, 1fr);
  min-height: 224px;
  gap: 20px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 5px 18px rgba(15, 23, 42, 0.05);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.book-card:hover,
.book-card:focus-visible {
  transform: translateY(-2px);
  border-color: #c7d2fe;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.1);
  outline: none;
}

.cover-shell {
  position: relative;
  height: 192px;
  min-height: 192px;
  border-radius: 6px;
  overflow: hidden;
  background: #f1f5f9;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.06);
}

.book-cover {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.cover-level,
.cover-badge {
  position: absolute;
  left: 10px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.cover-level {
  top: 10px;
  color: #f8fafc;
  background: rgba(15, 23, 42, 0.72);
}

.cover-badge {
  bottom: 10px;
}

.cover-badge.free {
  background: #dcfce7;
  color: #166534;
}

.cover-badge.paid {
  background: #fef3c7;
  color: #92400e;
}

.card-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-top {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.title-block {
  min-width: 0;
}

.title-block h3 {
  margin: 0;
  color: #111827;
  font-size: 18px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.title-block p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.65;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.favorite-btn,
.enter-btn {
  border: none;
  font: inherit;
}

.favorite-btn {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  flex-shrink: 0;
  padding: 0;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #ffffff;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.favorite-btn:hover {
  border-color: #fecdd3;
  background: #fff1f2;
  color: #e11d48;
}

.favorite-btn.active {
  border-color: #fecdd3;
  background: #fff1f2;
  color: #e11d48;
}

.tag-row {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-chip {
  max-width: 100%;
  overflow: hidden;
  padding: 4px 8px;
  border-radius: 4px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stats-row {
  display: flex;
  min-width: 0;
  gap: 0;
  padding: 10px 0;
  border-top: 1px solid #f1f5f9;
  border-bottom: 1px solid #f1f5f9;
}

.stat-box {
  display: grid;
  grid-template-columns: 16px auto;
  grid-template-rows: auto auto;
  min-width: 0;
  flex: 1;
  column-gap: 6px;
  padding: 0 12px;
  border-right: 1px solid #e2e8f0;
  color: #94a3b8;
}

.stat-box:first-child {
  padding-left: 0;
}

.stat-box:last-child {
  border-right: 0;
}

.stat-box span {
  grid-column: 2;
  min-width: 0;
  overflow: hidden;
  color: #64748b;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stat-box strong {
  grid-column: 2;
  min-width: 0;
  margin-top: 2px;
  overflow: hidden;
  color: #1e293b;
  font-size: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.footer-row {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.price-block {
  display: flex;
  min-width: 0;
  align-items: baseline;
  gap: 10px;
}

.price {
  min-width: 0;
  overflow: hidden;
  color: #e11d48;
  font-size: 20px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.origin {
  color: #94a3b8;
  text-decoration: line-through;
}

.enter-btn {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  border-radius: 6px;
  background: #4f46e5;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.enter-btn:hover {
  background: #4338ca;
}

@media (max-width: 860px) {
  .book-card {
    grid-template-columns: 128px minmax(0, 1fr);
  }

  .cover-shell {
    height: 172px;
    min-height: 172px;
  }
}

@media (max-width: 560px) {
  .book-card {
    grid-template-columns: 104px minmax(0, 1fr);
    gap: 12px;
    padding: 12px;
  }

  .cover-shell {
    height: 148px;
    min-height: 148px;
  }

  .footer-row {
    align-items: flex-end;
  }

  .stats-row {
    display: grid;
    grid-template-columns: 1fr;
    padding: 6px 0;
  }

  .stat-box {
    grid-template-columns: 16px minmax(0, 1fr) auto;
    grid-template-rows: auto;
    padding: 6px 0;
    border-right: 0;
    border-bottom: 1px solid #f1f5f9;
  }

  .stat-box:last-child {
    border-bottom: 0;
  }

  .stat-box span {
    grid-column: 2;
  }

  .stat-box strong {
    grid-column: 3;
    margin-top: 0;
  }

  .enter-btn span {
    display: none;
  }
}
</style>
