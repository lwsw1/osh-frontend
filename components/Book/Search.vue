<template>
  <section class="book-search-panel">
    <div class="panel-heading">
      <div class="heading-icon">
        <n-icon :component="BookOutline" />
      </div>
      <div>
        <h1>电子书</h1>
        <p>精选技术读物与实战手册</p>
      </div>
    </div>

    <div class="toolbar">
      <div class="field-group keyword-group inline-field">
        <label>关键词</label>
        <n-input
          v-model:value="draft.keyword"
          placeholder="搜索书名、简介、关键主题"
          clearable
          @keyup.enter="submitSearch"
        />
      </div>

      <div class="field-group inline-field">
        <label>标签</label>
        <n-select
          v-model:value="draft.tagNameList"
          :options="tagOptions"
          multiple
          filterable
          clearable
          placeholder="选择电子书标签"
        />
      </div>

      <div class="field-group inline-field small-field">
        <label>权限等级</label>
        <n-select
          v-model:value="draft.level"
          :options="levelOptions"
          clearable
          placeholder="全部等级"
        />
      </div>

      <div class="field-group inline-field small-field">
        <label>排序方式</label>
        <n-select
          v-model:value="draft.sortType"
          :options="sortOptions"
          clearable
          placeholder="默认推荐"
        />
      </div>

      <div class="toolbar-actions">
        <button class="ghost-btn" @click="resetSearch">
          <n-icon :component="RefreshOutline" />
          <span>重置</span>
        </button>
        <button class="submit-btn" @click="submitSearch">
          <n-icon :component="SearchOutline" />
          <span>搜索</span>
        </button>
        <button v-if="canCreateBook" class="primary-btn" @click="goToCreate">
          <n-icon :component="AddOutline" />
          <span>新增电子书</span>
        </button>
      </div>
    </div>

    <div class="action-row">
      <span class="quick-label">快捷筛选</span>
      <div class="chip-row">
        <button
          v-for="item in quickFilters"
          :key="item.label"
          class="quick-chip"
          :class="{ active: isQuickFilterActive(item) }"
          :aria-pressed="isQuickFilterActive(item)"
          @click="applyQuickFilter(item)"
        >
          {{ item.label }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { NIcon, NInput, NSelect } from 'naive-ui'
import { AddOutline, BookOutline, RefreshOutline, SearchOutline } from '@vicons/ionicons5'
import { apiGetBookTags } from '~/composables/Api/Book/book'
import { BOOK_LEVEL_FILTER_OPTIONS } from '~/composables/bookLevels'

const props = defineProps({
  canCreateBook: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['search'])

const draft = reactive({
  keyword: '',
  tagNameList: [],
  level: 'all',
  sortType: null,
})

const tagOptions = ref([])

const levelOptions = BOOK_LEVEL_FILTER_OPTIONS

const sortOptions = [
  { label: '默认推荐', value: 'default' },
  { label: '最新发布', value: 'latest' },
  { label: '最多购买', value: 'popular' },
  { label: '价格从低到高', value: 'priceAsc' },
  { label: '价格从高到低', value: 'priceDesc' },
]

const quickFilters = [
  { label: '免费优先', patch: { sortType: 'priceAsc' } },
  { label: 'VIP', patch: { level: 3 } },
  { label: '最近上新', patch: { sortType: 'latest' } },
]

onMounted(async () => {
  try {
    const response = await apiGetBookTags()
    const tags = response?.data || response || []
    tagOptions.value = (tags || []).map((tag) => ({
      label: String(tag),
      value: String(tag),
    }))
  } catch (error) {
    console.error('load book tags failed', error)
    tagOptions.value = []
  }
})

function submitSearch() {
  emit('search', {
    keyword: draft.keyword.trim(),
    title: draft.keyword.trim(),
    tagNameList: [...draft.tagNameList],
    level: draft.level === 'all' ? null : draft.level,
    sortType: draft.sortType || 'default',
  })
}

function resetSearch() {
  draft.keyword = ''
  draft.tagNameList = []
  draft.level = 'all'
  draft.sortType = null
  submitSearch()
}

function applyQuickFilter(item) {
  Object.assign(draft, item.patch)
  submitSearch()
}

function isQuickFilterActive(item) {
  return Object.entries(item.patch).every(([key, value]) => draft[key] === value)
}

function goToCreate() {
  navigateTo('/book/CreateBook')
}
</script>

<style scoped>
.book-search-panel {
  padding: 24px;
  border: 1px solid #e2e8f0;
  border-top: 3px solid #4f46e5;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 10px 32px rgba(15, 23, 42, 0.06);
}

.panel-heading {
  display: flex;
  align-items: center;
  gap: 12px;
}

.heading-icon {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 8px;
  background: #eef2ff;
  color: #4f46e5;
  font-size: 22px;
}

.panel-heading h1 {
  margin: 0;
  color: #111827;
  font-size: 24px;
  line-height: 1.25;
}

.panel-heading p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 13px;
}

.toolbar {
  margin-top: 22px;
  display: flex;
  align-items: end;
  gap: 12px;
  flex-wrap: wrap;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.inline-field {
  flex: 1 1 230px;
  min-width: 0;
}

.keyword-group {
  flex-basis: 320px;
}

.small-field {
  flex: 0 1 180px;
}

.field-group label {
  color: #475569;
  font-size: 12px;
  font-weight: 600;
}

.submit-btn,
.ghost-btn,
.primary-btn,
.quick-chip {
  border: none;
  font: inherit;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.toolbar-actions button {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.submit-btn {
  background: #4f46e5;
  color: #ffffff;
}

.submit-btn:hover {
  background: #4338ca;
}

.action-row {
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-top: 1px solid #f1f5f9;
  padding-top: 14px;
}

.quick-label {
  flex: 0 0 auto;
  color: #94a3b8;
  font-size: 12px;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.quick-chip {
  min-height: 30px;
  padding: 0 11px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quick-chip:hover,
.quick-chip.active {
  border-color: #a5b4fc;
  background: #eef2ff;
  color: #4338ca;
}

.ghost-btn,
.primary-btn {
  border: 1px solid #e2e8f0;
}

.ghost-btn {
  background: #ffffff;
  color: #475569;
}

.ghost-btn:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
}

.primary-btn {
  border-color: #0f766e;
  background: #0f766e;
  color: #ffffff;
}

.primary-btn:hover {
  border-color: #115e59;
  background: #115e59;
}

@media (max-width: 960px) {
  .book-search-panel {
    padding: 20px;
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .inline-field,
  .keyword-group,
  .small-field {
    flex: none;
    width: 100%;
  }

  .action-row {
    align-items: flex-start;
  }

  .toolbar-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .toolbar-actions > button {
    flex: 1;
  }
}

@media (max-width: 640px) {
  .book-search-panel {
    padding: 16px;
  }

  .action-row {
    flex-direction: column;
  }
}
</style>
