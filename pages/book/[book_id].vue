<template>
    <LoadingGroup :pending="pending" :error="error">
        <div class="reader-shell">
        <!-- 面包屑 -->
        <div class="breadcrumb">
          <span class="bc-item" @click="$router.push('/list/book/1')">🏠 电子书列表</span>
          <span class="bc-sep">›</span>
          <span class="bc-current">📖 阅读</span>
        </div>
        <div class="book-reader-layout">
                <aside class="book-sidebar">
                    <div class="book-info-card">
                        <div class="shelf-glow"></div>
                        <div class="book-cover-frame">
                            <n-image 
                                :src="data.detail.cover" 
                                class="book-cover"
                                object-fit="cover"
                            />
                        </div>
                        <div class="book-meta-stack">
                            <span class="book-kicker">Ebook Reader</span>
                            <h3 class="book-title">{{ data.detail.title }}</h3>
                            <div class="book-stats">
                                <span class="stat-item">
                                    <n-icon size="14"><BookOutline /></n-icon>
                                    {{ data.menus.length }} 章节
                                </span>
                                <span class="book-progress-pill">
                                    正在阅读第 {{ activeChapterIndex + 1 }} 章
                                </span>
                            </div>
                            <div class="book-insight-grid">
                                <div class="insight-card">
                                    <span>目录</span>
                                    <strong>{{ data.menus.length }}</strong>
                                </div>
                                <div class="insight-card">
                                    <span>免费章</span>
                                    <strong>{{ freeChapterCount }}</strong>
                                </div>
                            </div>
                        </div>

                        <div class="book-admin-actions">
                            <n-button quaternary @click="goDetail">查看详情</n-button>
                            <n-button v-if="canEditBook" secondary type="primary" @click="goEdit">编辑电子书</n-button>
                            <n-button v-if="canDeleteBook" tertiary type="error" @click="handleDelete">删除电子书</n-button>
                        </div>
                    </div>

                    <n-scrollbar class="chapter-list-scroll">
                        <div class="chapter-list-head">
                            <span class="chapter-list-kicker">Reading Flow</span>
                            <h4>阅读目录</h4>
                        </div>
                        <div class="chapter-list">
                            <div 
                                v-for="(item,index) in data.menus"
                                :key="index" 
                                class="chapter-item"
                                :class="{ 'active': activeId == item.id }"
                                @click="open(item.id)"
                            >
                                <div class="chapter-number">{{ index + 1 }}</div>
                                <div class="chapter-line"></div>
                                <div class="chapter-info">
                                    <div class="chapter-title">{{ item.title }}</div>
                                    <div class="chapter-badge" v-if="item.isFree">免费</div>
                                </div>
                                <n-icon class="chapter-arrow" size="16"><ChevronForwardOutline /></n-icon>
                            </div>
                            <div v-if="data.menus.length == 0" class="empty-state">
                                <n-icon size="48" color="#ccc"><BookOutline /></n-icon>
                                <p>暂无目录</p>
                            </div>
                        </div>
                    </n-scrollbar>
                </aside>
                
                <main class="book-content">
                    <n-card class="content-card">
                        <NuxtPage :page-key="pageKey" />
                    </n-card>
                </main>

                <aside class="book-qna-rail">
                    <div class="book-qna-sticky">
                        <BookQuestionPanel :book-id="book_id" compact />
                    </div>
                </aside>
            </div>
        </div>
    </LoadingGroup>
</template>

<script setup>
import {
    NGrid,
    NGridItem,
    NCard,
    NScrollbar,
    NImage,
    NIcon,
    NButton,
    createDiscreteApi
} from "naive-ui"
import { BookOutline, ChevronForwardOutline } from '@vicons/ionicons5'
import { apiDeleteBook } from '~/composables/Api/Book/book'

const route = useRoute()
const pageKey = computed(()=>route.fullPath)
const { book_id,id } = route.params
const activeId = ref(id)
const { hasPermission } = usePermission()
const canEditBook = computed(() => hasPermission('book:update'))
const canDeleteBook = computed(() => hasPermission('book:delete'))
const { dialog, message } = createDiscreteApi(["dialog", "message"])
const activeChapterIndex = computed(() => {
    const currentIndex = data.value?.menus?.findIndex?.((item) => String(item.id) === String(activeId.value)) ?? -1
    return currentIndex >= 0 ? currentIndex : 0
})
const freeChapterCount = computed(() => (data.value?.menus || []).filter((item) => Number(item.isFree) === 1).length)

const {
    data,
    error,
    pending
} = await useBookMenusApi(book_id)

const open = (d)=>{
    activeId.value = d
    navigateTo({
        params:{
            ...route.params,
            id:d
        }
    })
}

const goDetail = () => navigateTo(`/detail/book/${book_id}`)
const goEdit = () => navigateTo(`/book/edit/${book_id}`)

const handleDelete = () => {
    dialog.warning({
        title: '删除确认',
        content: '确定删除这本电子书吗？删除后不可恢复。',
        positiveText: '删除',
        negativeText: '取消',
        async onPositiveClick() {
            try {
                const response = await apiDeleteBook(book_id)
                if (response?.code && response.code !== 200) {
                    throw new Error(response.msg || '删除失败')
                }
                message.success('电子书已删除')
                navigateTo('/list/book/1')
            } catch (err) {
                console.error('delete book failed', err)
                message.error(err?.data?.msg || err?.message || '删除失败')
            }
        }
    })
}

definePageMeta({
    middleware(to){
        const { book_id } = to.params
        if(isNaN(+book_id)){
            return abortNavigation("页面不存在")
        }
        return true
    }
})
</script>

<style scoped>
.reader-shell {
    width: min(100%, 1760px);
    margin: 0 auto;
    padding: 18px 10px 34px;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #999;
  margin-bottom: 14px;
}
.bc-item { color: #666; cursor: pointer; transition: color 0.2s; }
.bc-item:hover { color: #18a058; }
.bc-sep { color: #ddd; user-select: none; }
.bc-current { color: #333; font-weight: 600; }

.book-reader-layout {
    display: grid;
    grid-template-columns: 248px minmax(680px, 52vw) 188px;
    gap: 18px;
    align-items: start;
    justify-content: space-between;
}

.book-sidebar {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-width: 0;
}

.book-info-card {
    position: relative;
    overflow: hidden;
    background:
      radial-gradient(circle at top, rgba(255,255,255,0.98), rgba(248,250,252,0.94)),
      linear-gradient(145deg, #ffffff 0%, #eef4ff 48%, #f7fbff 100%);
    border: 1px solid rgba(226, 232, 240, 0.9);
    border-radius: 28px;
    padding: 1.4rem 1.2rem;
    box-shadow: 0 24px 60px rgba(15,23,42,0.08);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
}

.shelf-glow {
    position: absolute;
    inset: -30% auto auto 50%;
    width: 180px;
    height: 180px;
    transform: translateX(-50%);
    background: radial-gradient(circle, rgba(59,130,246,0.16) 0%, rgba(59,130,246,0) 72%);
    pointer-events: none;
}

.book-cover-frame {
    position: relative;
    overflow: hidden;
    padding: 10px;
    border-radius: 24px;
    background: linear-gradient(145deg, rgba(255,255,255,0.9), rgba(226,232,240,0.72));
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.88),
      0 16px 32px rgba(15,23,42,0.08);
}

.book-cover {
    width: 132px;
    height: 186px;
    border-radius: 18px;
    box-shadow: 0 18px 42px rgba(15,23,42,0.16);
    overflow: hidden;
    background: linear-gradient(180deg, #e2e8f0 0%, #f8fafc 100%);
}

.book-cover :deep(img),
.book-cover :deep(.n-image-img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.book-meta-stack {
    width: 100%;
}

.book-kicker {
    display: inline-flex;
    padding: 6px 10px;
    border-radius: 999px;
    background: rgba(37,99,235,0.08);
    color: #1d4ed8;
    font-size: 11px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    font-weight: 700;
}

.book-title {
    font-size: 17px;
    font-weight: 700;
    color: #1a1a1a;
    text-align: center;
    margin: 14px 0 0;
    line-height: 1.45;
}

.book-stats {
    display: flex;
    flex-direction: column;
    gap: 10px;
    color: #666;
    font-size: 13px;
    margin-top: 14px;
}

.book-progress-pill {
    display: inline-flex;
    align-self: center;
    justify-content: center;
    padding: 8px 12px;
    border-radius: 999px;
    background: linear-gradient(135deg, rgba(15,157,88,0.12), rgba(59,130,246,0.08));
    color: #0f766e;
    font-size: 12px;
    font-weight: 700;
}

.book-insight-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-top: 14px;
}

.insight-card {
    padding: 12px;
    border-radius: 18px;
    background: rgba(255,255,255,0.82);
    border: 1px solid rgba(226,232,240,0.92);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.86);
}

.insight-card span {
    display: block;
    font-size: 11px;
    color: #64748b;
    margin-bottom: 8px;
}

.insight-card strong {
    font-size: 20px;
    color: #0f172a;
}

.book-admin-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
}

.stat-item {
    display: flex;
    align-items: center;
    gap: 4px;
}

.chapter-list-scroll {
    max-height: calc(100vh - 520px);
    background: rgba(255,255,255,0.95);
    border: 1px solid rgba(226,232,240,0.92);
    border-radius: 26px;
    box-shadow: 0 24px 60px rgba(15,23,42,0.06);
}

.chapter-list-head {
    padding: 18px 18px 8px;
}

.chapter-list-kicker {
    display: inline-block;
    font-size: 11px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #94a3b8;
}

.chapter-list-head h4 {
    margin: 8px 0 0;
    font-size: 18px;
    color: #0f172a;
}

.chapter-list {
    padding: 0.5rem 0.7rem 0.8rem;
}

.chapter-item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.9rem 0.95rem;
    border-radius: 16px;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-bottom: 0.5rem;
}

.chapter-item:hover {
    background: #f5f7fa;
}

.chapter-item.active {
    background: linear-gradient(135deg, #0f9d58 0%, #0b7b45 100%);
    color: white;
    box-shadow: 0 14px 30px rgba(15,157,88,0.28);
    transform: translateX(4px);
}

.chapter-number {
    position: relative;
    z-index: 1;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #f0f0f0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 600;
    color: #666;
    flex-shrink: 0;
}

.chapter-line {
    position: absolute;
    left: 28px;
    top: 40px;
    bottom: -10px;
    width: 2px;
    background: linear-gradient(180deg, rgba(148,163,184,0.24), rgba(148,163,184,0));
}

.chapter-item:last-child .chapter-line {
    display: none;
}

.chapter-item.active .chapter-number {
    background: rgba(255,255,255,0.2);
    color: white;
}

.chapter-info {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.chapter-title {
    flex: 1;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.4;
}

.chapter-badge {
    background: #18a058;
    color: white;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
}

.chapter-item.active .chapter-badge {
    background: rgba(255,255,255,0.3);
}

.chapter-arrow {
    color: #999;
    flex-shrink: 0;
}

.chapter-item.active .chapter-arrow {
    color: white;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    color: #999;
}

.empty-state p {
    margin-top: 1rem;
    font-size: 14px;
}

.book-content {
    min-width: 0;
    display: flex;
    justify-content: center;
}

.content-card {
    width: 100%;
    border-radius: 24px;
    border: 1px solid rgba(226, 232, 240, 0.78);
    box-shadow: 0 18px 46px rgba(15,23,42,0.08);
    overflow: hidden;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(248,250,252,0.98) 100%);
}

.book-qna-rail {
    min-width: 0;
    justify-self: end;
}

.book-qna-sticky {
    position: sticky;
    top: 18px;
}

@media (max-width: 1280px) {
    .book-reader-layout {
        grid-template-columns: 230px minmax(0, 1fr) 180px;
    }
}

@media (max-width: 1100px) {
    .book-reader-layout {
        grid-template-columns: 230px minmax(0, 1fr);
    }

    .book-qna-rail {
        grid-column: 1 / -1;
    }

    .book-qna-sticky {
        position: static;
    }
}

@media (max-width: 768px) {
    .reader-shell {
        width: 100%;
        padding: 12px 10px 24px;
    }

    .book-reader-layout {
        grid-template-columns: 1fr;
        gap: 16px;
    }

    .chapter-list-scroll {
        max-height: 300px;
    }
}
</style>
