<template>
  <div v-if="type === 'book'" class="book-page">
    <n-breadcrumb class="breadcrumb">
      <n-breadcrumb-item>
        <nuxt-link to="/">首页</nuxt-link>
      </n-breadcrumb-item>
      <n-breadcrumb-item>电子书</n-breadcrumb-item>
    </n-breadcrumb>

    <BookSearch :can-create-book="canCreateBook" @search="handleBookSearch" />

    <section class="book-results-shell">
      <div class="results-head">
        <div>
          <h2>全部电子书</h2>
          <p>共 {{ total }} 本</p>
        </div>
        <div class="results-side">
          <span>第 {{ page }} / {{ totalPages }} 页</span>
        </div>
      </div>

      <LoadingGroup :pending="pending" :error="error" :is-empty="!pending && rows.length === 0">
        <template #loading>
          <div class="book-grid">
            <div v-for="index in 6" :key="index" class="book-skeleton"></div>
          </div>
        </template>

        <div class="book-grid">
          <BookList
            v-for="item in rows"
            :key="item.id"
            :item="item"
            @refresh="refreshBookList"
          />
        </div>

        <div class="pagination-container">
          <n-pagination
            :page="page"
            :item-count="total"
            :page-size="pageSize"
            @update:page="handleBookPageChange"
          />
        </div>
      </LoadingGroup>
    </section>
  </div>

  <div v-else class="list-page">
    <n-breadcrumb class="breadcrumb">
      <n-breadcrumb-item>
        <nuxt-link to="/">首页</nuxt-link>
      </n-breadcrumb-item>
      <n-breadcrumb-item>{{ title }}</n-breadcrumb-item>
    </n-breadcrumb>

    <LoadingGroup :pending="pending" :error="error" :is-empty="rows.length === 0">
      <div class="list-grid">
        <CourseList v-for="(item, index) in rows" :key="item.id || index" :item="item" />
      </div>

      <div class="pagination-container">
        <n-pagination
          size="large"
          :page="page"
          :item-count="total"
          :page-size="limit"
          :on-update:page="handlePageChange"
        />
      </div>
    </LoadingGroup>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { NBreadcrumb, NBreadcrumbItem, NPagination } from 'naive-ui'
import { apiSearchBooks } from '~/composables/Api/Book/book'

const route = useRoute()
const type = computed(() => route.params.type)
const title = route.meta.title
const currentPage = computed(() => Number(route.params.page || 1))
const pageSize = 12

const { hasPermission } = usePermission()
const canCreateBook = computed(() => hasPermission('book:create'))

const bookQuery = reactive({
  title: '',
  tagNameList: [],
  level: null,
  sortType: 'default',
})

let rows = ref([])
let total = ref(0)
let pending = ref(false)
let error = ref(null)
const page = ref(currentPage.value)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

let limit = ref(pageSize)
let handlePageChange = (nextPage) => {
  navigateTo({
    params: {
      ...route.params,
      page: nextPage,
    },
    query: {
      ...route.query,
    },
  })
}

if (type.value !== 'book') {
  const pageState = await usePage(({ pageNum, pageSize: size, ...otherParams }) => {
    return useBookListApi(type.value, {
      pageNum,
      pageSize: size,
      ...otherParams,
    })
  }, {
    title: '',
    tagNameList: [],
  })

  rows = pageState.rows
  total = pageState.total
  pending = pageState.pending
  error = pageState.error
  limit = pageState.limit
  handlePageChange = pageState.handlePageChange
}

if (type.value === 'book') {
  await refreshBookList()
}

watch(currentPage, async (value) => {
  page.value = value
  if (type.value === 'book') {
    await refreshBookList()
  }
})

async function refreshBookList() {
  if (type.value !== 'book') return
  pending.value = true
  error.value = null

  try {
    const response = await apiSearchBooks({
      pageNum: page.value,
      pageSize,
      title: bookQuery.title,
      tagNameList: bookQuery.tagNameList,
      level: bookQuery.level,
    })

    const payload = response?.data || response || {}
    let list = payload.rows || payload.records || []

    list = sortBooks(list, bookQuery.sortType)

    rows.value = list
    total.value = payload.total || list.length
  } catch (err) {
    console.error('load books failed', err)
    error.value = err
    rows.value = []
    total.value = 0
  } finally {
    pending.value = false
  }
}

function handleBookSearch(nextQuery) {
  bookQuery.title = nextQuery.title || ''
  bookQuery.tagNameList = nextQuery.tagNameList || []
  bookQuery.level = nextQuery.level ?? null
  bookQuery.sortType = nextQuery.sortType || 'default'
  if (page.value !== 1) {
    handleBookPageChange(1)
    return
  }
  refreshBookList()
}

function handleBookPageChange(nextPage) {
  navigateTo({
    params: {
      ...route.params,
      page: nextPage,
    },
    query: {
      ...route.query,
    },
  })
}

function sortBooks(list, sortType) {
  const nextList = [...list]
  if (sortType === 'latest') {
    return nextList.sort((a, b) => new Date(b.createTime || 0) - new Date(a.createTime || 0))
  }
  if (sortType === 'popular') {
    return nextList.sort((a, b) => Number(b.purchase_count || b.purchaseCount || b.sub_count || 0) - Number(a.purchase_count || a.purchaseCount || a.sub_count || 0))
  }
  if (sortType === 'priceAsc') {
    return nextList.sort((a, b) => Number(a.price || 0) - Number(b.price || 0))
  }
  if (sortType === 'priceDesc') {
    return nextList.sort((a, b) => Number(b.price || 0) - Number(a.price || 0))
  }
  return nextList
}

definePageMeta({
  middleware: ['list'],
})
</script>

<style scoped>
.book-page,
.list-page {
  padding: 24px 0 56px;
}

.breadcrumb {
  margin-bottom: 18px;
}

.book-results-shell {
  margin-top: 30px;
}

.results-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid #e2e8f0;
}

.results-head h2 {
  margin: 0;
  color: #111827;
  font-size: 20px;
}

.results-head p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 13px;
}

.results-side {
  color: #64748b;
  font-size: 13px;
}

.book-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.book-skeleton {
  min-height: 224px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: linear-gradient(90deg, rgba(226, 232, 240, 0.8), rgba(241, 245, 249, 1), rgba(226, 232, 240, 0.8));
  background-size: 240% 100%;
  animation: shimmer 1.4s linear infinite;
}

.list-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-lg);
  margin-bottom: var(--space-xl);
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 28px;
}

@keyframes shimmer {
  from {
    background-position: 200% 0;
  }
  to {
    background-position: -200% 0;
  }
}

@media (max-width: 1180px) {
  .results-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .book-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 960px) {
  .list-grid {
    grid-template-columns: 1fr;
  }
}
</style>
