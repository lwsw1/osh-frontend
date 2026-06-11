<template>
  <div class="tool-container">
    <div class="breadcrumb-header">
      <div class="breadcrumb-nav">
        <span class="bc-item" @click="$router.push('/')">🏠 首页</span>
        <span class="bc-sep">›</span>
        <span class="bc-current">🛠️ 工具</span>
      </div>
      <ClientOnly>
        <div v-if="isLoggedIn" class="quota-hero" :class="{ loading: quotaLoading }">
          <div class="quota-hero-icon">♦</div>
          <div class="quota-hero-content">
            <span class="quota-hero-label">当前工具点数</span>
            <strong class="quota-hero-value">{{ quotaLoading ? '--' : currentToolQuota.remainingCount }}</strong>
          </div>
          <div class="quota-hero-meta">
            <span>累计 {{ currentToolQuota.totalBuyCount }}</span>
            <span>已用 {{ currentToolQuota.usedCount }}</span>
          </div>
          <button class="quota-login-btn quota-buy-btn" type="button" @click="$router.push('/tool/quota')">
            购买工具点数
          </button>
        </div>
        <div v-else class="quota-hero quota-hero-guest">
          <div class="quota-hero-icon quota-hero-icon-guest">i</div>
          <div class="quota-hero-content">
            <span class="quota-hero-label">当前未登录</span>
            <strong class="quota-hero-value">仅可使用免费工具</strong>
          </div>
          <button class="quota-login-btn" type="button" @click="$router.push('/login?from=/tool')">
            去登录
          </button>
        </div>
      </ClientOnly>
    </div>
    <TransitionGroup name="tool-announcement-stack" tag="div" class="tool-announcement-stack">
      <div
        v-for="item in announcementToastList"
        :key="item.id"
        class="tool-announcement-toast"
      >
        <div class="tool-announcement-toast-title">{{ item.title }}</div>
      </div>
    </TransitionGroup>

    <section class="notice-section tool-notice-section">
      <div class="notice-bar">
        <div class="notice-label">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1l1.8 3.6L14 5.6l-3 2.9.7 4.1L8 10.5l-3.7 2.1.7-4.1-3-2.9 4.2-.6z" stroke="white" stroke-width="1.3" stroke-linejoin="round" fill="rgba(255,255,255,0.2)"/>
          </svg>
          <span>通知</span>
        </div>
        <div v-if="toolSystemAnnouncements.length > 0" class="notice-scroll-wrap">
          <div
            class="notice-scroll-track"
            :style="{ animationPlayState: systemAnnouncementPaused ? 'paused' : 'running' }"
            @mouseenter="systemAnnouncementPaused = true"
            @mouseleave="systemAnnouncementPaused = false"
          >
            <span class="notice-item" v-for="(item, index) in duplicatedSystemAnnouncements" :key="`system-${item.id}-${index}`">
              <span class="notice-dot"></span>
              <a
                v-if="hasAnnouncementLink(item)"
                class="notice-link"
                :href="item.link"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ item.title }}
              </a>
              <span v-else>{{ item.title }}</span>
              <span class="notice-sep">｜</span>
            </span>
          </div>
        </div>
        <div v-else class="notice-empty">
          当前暂无工具模块系统通知
        </div>
      </div>
      <div class="notice-bar notice-bar-2">
        <div class="notice-label notice-label-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 4h12M2 8h12M2 12h8" stroke="white" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
          <span>公告</span>
        </div>
        <div v-if="toolUserAnnouncements.length > 0" class="notice-scroll-wrap">
          <div
            class="notice-scroll-track"
            :style="{ animationPlayState: userAnnouncementPaused ? 'paused' : 'running' }"
            @mouseenter="userAnnouncementPaused = true"
            @mouseleave="userAnnouncementPaused = false"
          >
            <span class="notice-item" v-for="(item, index) in duplicatedUserAnnouncements" :key="`user-${item.id}-${index}`">
              <span class="notice-dot"></span>
              <a
                v-if="hasAnnouncementLink(item)"
                class="notice-link"
                :href="item.link"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ item.title }}
              </a>
              <span v-else>{{ item.title }}</span>
              <span class="notice-sep">｜</span>
            </span>
          </div>
        </div>
        <div v-else class="notice-empty">
          当前暂无工具模块业务公告
        </div>
      </div>
    </section>

    <ToolFilter
      v-model:modelValue="queryParams"
      :tag-options="tagOptions"
      @search="handleSearch"
    >
      <template #actions>
        <ClientOnly>
          <button v-if="canCreate" class="btn-create-tool" @click="handleCreateTool">
            + 新增工具
          </button>
          <button v-if="canDelete" class="btn-select-mode" :class="{ active: selectMode }" @click="toggleSelectMode">
            {{ selectMode ? '退出选择' : '☑ 选择删除' }}
          </button>
          <template v-if="canDelete && selectedIds.size > 0">
            <span class="batch-tip">已选 {{ selectedIds.size }} 个工具</span>
            <button class="btn-batch-cancel" @click="selectedIds.clear(); selectMode = false">取消</button>
            <button
              class="btn-batch-delete"
              :disabled="deleteSubmitting"
              @click="handleBatchDelete"
            >
              {{ deleteSubmitting ? '删除中...' : '🗑 删除选中' }}
            </button>
          </template>
        </ClientOnly>
      </template>
    </ToolFilter>

    <div class="tool-content-layout">
      <div class="list-main-section">
        <Transition name="fade">
          <div v-if="pending" class="loading-overlay">
            <n-spin size="large" />
          </div>
        </Transition>

        <ClientOnly>
          <div class="tool-list-box">
            <div v-if="displayList && displayList.length > 0" class="tool-row-list">
              <div
                v-for="item in displayList"
                :key="item.id"
                class="tool-item-row-card"
                :class="{ 'is-active': item.isExpanded, selected: selectedIds.has(item.id) }"
              >
                <div class="tool-row-content">
                  <div class="tool-row-main">
                    <button class="collapser-wrapper" type="button" @click.stop="toggleExpand(item)">
                      <span class="expand-arrow" :class="{ rotated: item.isExpanded }">›</span>
                    </button>

                    <label v-if="selectMode" class="select-check" @click.stop>
                      <input
                        type="checkbox"
                        :checked="selectedIds.has(item.id)"
                        @change="toggleSelect(item.id)"
                      >
                    </label>

                    <div class="title-section" @click="toggleExpand(item)">
                      <span class="tag">【{{ formatResourceType(item.resourceType) }}】</span>
                      <span class="main-title">{{ item.toolName }}</span>
                      <span v-if="item.description" class="description-text">{{ item.description }}</span>


                    </div>

<!--                    <span class="access-type">{{ formatAccessType(item.accessType) }}</span>-->
                    <div class="meta-group">
                      <span v-if="isPaidResourceType(item.resourceType)" class="meta-item package-price">
                        {{ formatMinSortPackagePrice(item) }}
                      </span>
                      <span
                          v-if="isPaidResourceType(item.resourceType)"
                          class="meta-item quota"
                          :class="{ active: Number(item.remainingCount || 0) > 0 }"
                      >
                        剩余 {{ item.remainingCount || 0 }} 次
                      </span>
                      <button
                        v-if="item.no"
                        class="tool-no-copy"
                        type="button"
                        @click.stop="handleCopyToolNo(item.no)"
                      >
                        编号 {{ item.no }}
                      </button>
                      <span class="meta-item">{{ item.viewCount || 0 }} 浏览</span>
                      <span class="meta-item">{{ item.totalUsage || 0 }} 次使用</span>
                      <span class="meta-item">{{ item.collectionCount || 0 }} 收藏</span>
                    </div>

                  </div>

                  <div class="tool-row-sub">

                    <div class="action-group">
                    <button
                      v-if="canVoteGood"
                      class="row-action-btn vote good"
                      :class="{ active: Number(item.voteType || 0) === 1 }"
                      type="button"
                      @click.stop="handleToolVote(item, 1)"
                    >
                      👍 {{ item.goodCount || 0 }}
                    </button>
                    <button
                      v-if="canVoteBad"
                      class="row-action-btn vote bad"
                      :class="{ active: Number(item.voteType || 0) === 3 }"
                      type="button"
                      @click.stop="handleToolVote(item, 3)"
                    >
                      👎 {{ item.badCount || 0 }}
                    </button>
                    <button
                      v-if="canCreateQuestion"
                      class="row-action-btn question"
                      type="button"
                      @click.stop="handleOpenQuestionModal(item)"
                    >
                      💬 提问
                    </button>
                    <button
                      v-if="canCollect"
                      class="row-action-btn favorite"
                      :class="{ active: item.isFavorite }"
                      type="button"
                      @click.stop="handleDoCollect(item.id)"
                    >
                      {{ item.isFavorite ? '已收藏' : '+收藏' }}
                    </button>
                    <button
                      v-if="canUpdate"
                      class="row-action-btn edit"
                      type="button"
                      @click.stop="handleEditTool(item)"
                    >
                      修改
                    </button>
                    </div>
                  </div>
                </div>

                <transition name="expand">
                  <div v-if="item.isExpanded" class="tool-embed-area">
                    <iframe
                      v-if="isIframeTool(item) && getEmbedUrl(item)"
                      class="tool-embed-frame"
                      :src="getEmbedUrl(item)"
                      :title="item.toolName"
                    />
                    <component
                      :is="getRuntimeComponent(item)"
                      v-else-if="getRuntimeComponent(item)"
                      :tool-id="item.id"
                      @refresh-quota="refreshCurrentToolQuota"
                    />
                    <div v-else class="tool-empty-url">
                      该工具暂未配置可加载的工具文件
                    </div>
                  </div>
                </transition>
              </div>
            </div>

            <div v-else-if="!pending" class="empty-placeholder">
              <n-empty :description="queryParams.isFollowing ? '暂无收藏的工具' : '暂无工具数据'" />
            </div>
          </div>
        </ClientOnly>

        <div class="pagination-footer">
          <n-pagination
            v-model:page="queryParams.pageNum"
            :item-count="totalCount"
            :page-size="queryParams.pageSize"
            @update:page="handleRefresh"
          />
        </div>
      </div>

      <aside class="recommend-panel">
        <div class="recommend-tabs">
          <button
            v-for="tab in recommendTabs"
            :key="tab.value"
            class="recommend-tab"
            :class="{ active: recommendType === tab.value }"
            :disabled="recommendLoading"
            type="button"
            @click="handleRecommendTypeChange(tab.value)"
          >
            <span class="recommend-tab-icon">{{ tab.icon }}</span>
            {{ tab.label }}
          </button>
        </div>

        <div class="recommend-list-wrap">
          <n-spin :show="recommendLoading" size="small">
            <div v-if="currentRecommendRows.length > 0" class="recommend-list">
              <button
                v-for="item in currentRecommendRows"
                :key="item.id"
                class="recommend-item"
                type="button"
                @click="handleRecommendToolClick(item)"
              >
                <span class="recommend-title">{{ item.toolName }}</span>
                <span v-if="item.description" class="recommend-desc">{{ item.description }}</span>
                <span class="recommend-meta">
                  <span>{{ formatResourceType(item.resourceType) }}</span>
                  <span v-if="isPaidResourceType(item.resourceType)">{{ formatMinSortPackagePrice(item) }}</span>
                </span>
                <span class="recommend-stats">
                  <span v-if="recommendType === 'LATEST'">{{ formatRecommendTime(item) }}</span>
                  <span v-else>{{ item.collectionCount || 0 }} 收藏 · {{ item.totalUsage || 0 }} 次使用</span>
                </span>
              </button>
            </div>
            <n-empty v-else description="暂无推荐工具" />
          </n-spin>
        </div>

      </aside>
    </div>

    <ToolEditModal
      v-model:show="showEditModal"
      :tag-options="tagOptions"
      :edit-data="editingTool"
      @success="handleCreateSuccess"
    />

    <QuestionAnswerCreateModal
      v-model:show="showQuestionModal"
      title="为当前工具提问"
      preset-resource-type="tool"
      :preset-resource-no="questionToolId"
      :lock-resource="true"
      @success="handleQuestionCreated"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { createDiscreteApi, NPagination, NSpin, NEmpty } from 'naive-ui';
import ToolFilter from '~/components/Tool/ToolFilter.vue';
import ToolEditModal from '~/components/Tool/ToolEditModal.vue';
import QuestionAnswerCreateModal from '~/components/question_answer/CreateModal.vue';
import {
  apiCollectTool,
  apiConsumeToolUsage,
  apiCurrentToolQuota,
  apiDeleteTool,
  apiRemoveCollectTool,
  apiRecordToolView,
  apiToolRecommend,
  apiToolSystemAnnouncements,
  apiToolTags,
  apiToolUserAnnouncements,
  apiVoteBadTool,
  apiVoteGoodTool,
  useToolSearchApi,
} from '~/composables/Api/Tool/tool';
import ToolRuntimeTestTest from '~/components/Tool/runtime/test/test.vue';

const route = useRoute();
const { permissionList } = usePermission();
const { toolUserNoticeRefreshFlag } = useWebSocket();
const currentUser = useUser();
const tokenCookie = useCookie('token');

const getRoutePageNum = () => {
  const page = Number(route.query.page || 1);
  return Number.isFinite(page) && page > 0 ? page : 1;
};
const getRouteToolId = () => {
  const toolId = Number(route.query.toolId || 0);
  return Number.isFinite(toolId) && toolId > 0 ? toolId : null;
};
const shouldAutoOpenTool = () => String(route.query.autoOpen || '') === '1';

const canCreate = computed(() => permissionList.value.includes('tool:create'));
const canUpdate = computed(() => permissionList.value.includes('tool:update'));
const canDelete = computed(() => permissionList.value.includes('tool:delete'));
const canAddCollection = computed(() => permissionList.value.includes('tool:collection:add'));
const canRemoveCollection = computed(() => permissionList.value.includes('tool:collection:remove'));
const canCollect = computed(() => canAddCollection.value || canRemoveCollection.value);
const canVoteGood = computed(() => permissionList.value.includes('tool:vote:good'));
const canVoteBad = computed(() => permissionList.value.includes('tool:vote:bad'));
const canCreateQuestion = computed(() => permissionList.value.includes('qna:question:create'));

const queryParams = reactive({
  keyword: '',
  no: '',
  toolId: getRouteToolId(),
  tags: [],
  pageNum: getRoutePageNum(),
  pageSize: 10,
  isFollowing: false,
  collectionFlag: null,
  sortType: 'all',
  resourceType: null,
});

const {
  data: resData,
  pending,
  refresh,
} = await useToolSearchApi(queryParams);

const toolList = ref([]);
const toolSystemAnnouncements = ref([]);
const toolUserAnnouncements = ref([]);
const announcementToastList = ref([]);
const tagOptions = ref([]);
const systemAnnouncementPaused = ref(false);
const userAnnouncementPaused = ref(false);
const selectMode = ref(false);
const selectedIds = ref(new Set());
const showEditModal = ref(false);
const editingTool = ref(null);
const showQuestionModal = ref(false);
const questionToolId = ref(null);
const consumingToolIds = ref(new Set());
const deleteSubmitting = ref(false);
const recommendType = ref('HOT');
const recommendLoading = ref(false);
const quotaLoading = ref(false);
const recommendPageSize = 5;
const recommendData = reactive({
  HOT: { rows: [] },
  LATEST: { rows: [] },
});
const currentToolQuota = reactive({
  remainingCount: 0,
  totalBuyCount: 0,
  usedCount: 0,
});
const recommendTabs = [
  { label: '最近火热', value: 'HOT', icon: '⚡' },
  { label: '最新发布', value: 'LATEST', icon: '☆' },
];
const duplicatedSystemAnnouncements = computed(() => toolSystemAnnouncements.value.length > 1
  ? [...toolSystemAnnouncements.value, ...toolSystemAnnouncements.value]
  : toolSystemAnnouncements.value);
const duplicatedUserAnnouncements = computed(() => toolUserAnnouncements.value.length > 1
  ? [...toolUserAnnouncements.value, ...toolUserAnnouncements.value]
  : toolUserAnnouncements.value);
const isLoggedIn = computed(() => {
  if (currentUser.value) return true;
  if (tokenCookie.value) return true;
  if (!process.client) return false;
  return !!(localStorage.getItem('token') || localStorage.getItem('Token'));
});
const TOOL_ANNOUNCEMENT_TOAST_MAX = 2;
const TOOL_ANNOUNCEMENT_TOAST_DURATION = 3000;

watch(
  () => route.query.page,
  (value) => {
    const nextPage = Number(value || 1);
    const normalizedPage = Number.isFinite(nextPage) && nextPage > 0 ? nextPage : 1;
    if (queryParams.pageNum !== normalizedPage) {
      queryParams.pageNum = normalizedPage;
      loadTools();
    }
  }
);

watch(
  () => [route.query.toolId, route.query.autoOpen],
  async ([nextRouteToolId, nextRouteAutoOpen], [prevRouteToolId, prevRouteAutoOpen]) => {
    if (nextRouteToolId === prevRouteToolId && nextRouteAutoOpen === prevRouteAutoOpen) {
      return;
    }
    queryParams.toolId = getRouteToolId();
    queryParams.pageNum = 1;
    await loadTools();
  }
);

const runtimeToolMap = {
  '/test/test': ToolRuntimeTestTest,
};

const syncToolList = (payload) => {
  if (!payload) {
    toolList.value = [];
    return;
  }
  const actualData = payload?.data?.rows ? payload.data : payload;
  const rows = actualData?.rows || [];
  const prevMap = new Map(toolList.value.map((item) => [item.id, item]));
  toolList.value = rows.map((item) => {
    const prev = prevMap.get(item.id);
    const isFavorite = prev != null ? prev.isFavorite : item.collectionFlag === 1;
    return {
      ...item,
      isFavorite,
      collectionFlag: isFavorite ? 1 : 0,
      favoriteCount: prev != null ? prev.favoriteCount : (item.collectionCount || 0),
      collectionCount: prev != null ? prev.favoriteCount : (item.collectionCount || 0),
      voteType: item.voteType || item.vote_type || 0,
      goodCount: item.goodCount || item.good_count || 0,
      badCount: item.badCount || item.bad_count || 0,
      viewCount: item.viewCount || item.view_count || 0,
      isExpanded: prev != null ? !!prev.isExpanded : false,
    };
  });
};

const expandOnlyTool = (toolId) => {
  toolList.value = toolList.value.map((item) => ({
    ...item,
    isExpanded: item.id === toolId,
  }));
  const tool = toolList.value.find((item) => item.id === toolId);
  if (tool) {
    recordToolView(tool);
  }
};

const loadTools = async () => {
  await refresh();
  syncToolList(resData.value);
  if (queryParams.toolId && shouldAutoOpenTool()) {
    expandOnlyTool(queryParams.toolId);
  }
};

const loadRecommendTools = async (type = recommendType.value) => {
  if (recommendLoading.value) {
    return;
  }
  recommendLoading.value = true;
  try {
    const res = await apiToolRecommend({
      type,
      pageNum: 1,
      pageSize: recommendPageSize,
    });
    const payload = res?.data?.rows ? res.data : res;
    recommendData[type].rows = payload?.rows || [];
  } catch (e) {
    console.error('加载推荐工具失败', e);
    recommendData[type].rows = [];
  } finally {
    recommendLoading.value = false;
  }
};

const loadCurrentToolQuota = async () => {
  if (!isLoggedIn.value) {
    currentToolQuota.remainingCount = 0;
    currentToolQuota.totalBuyCount = 0;
    currentToolQuota.usedCount = 0;
    return;
  }
  quotaLoading.value = true;
  try {
    const res = await apiCurrentToolQuota();
    const data = res?.data || res || {};
    currentToolQuota.remainingCount = Number(data.remainingCount || 0);
    currentToolQuota.totalBuyCount = Number(data.totalBuyCount || 0);
    currentToolQuota.usedCount = Number(data.usedCount || 0);
  } catch (e) {
    currentToolQuota.remainingCount = 0;
    currentToolQuota.totalBuyCount = 0;
    currentToolQuota.usedCount = 0;
  } finally {
    quotaLoading.value = false;
  }
};

const refreshCurrentToolQuota = async () => {
  await loadCurrentToolQuota();
};

const loadToolSystemAnnouncements = async () => {
  try {
    const res = await apiToolSystemAnnouncements();
    toolSystemAnnouncements.value = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
  } catch (e) {
    console.error('加载工具系统通知失败', e);
    toolSystemAnnouncements.value = [];
  }
};

const loadToolUserAnnouncements = async () => {
  try {
    const res = await apiToolUserAnnouncements();
    toolUserAnnouncements.value = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
  } catch (e) {
    console.error('加载工具业务公告失败', e);
    toolUserAnnouncements.value = [];
  }
};

const handleToolAnnouncementToast = (event) => {
  const title = event?.detail?.title;
  if (!title) {
    return;
  }
  pushAnnouncementToast(title);
};

function pushAnnouncementToast(title) {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const toast = {
    id,
    title,
    timer: null,
  };

  if (announcementToastList.value.length >= TOOL_ANNOUNCEMENT_TOAST_MAX) {
    const removed = announcementToastList.value.shift();
    if (removed?.timer) {
      clearTimeout(removed.timer);
    }
  }

  announcementToastList.value.push(toast);
  toast.timer = window.setTimeout(() => {
    removeAnnouncementToast(id);
  }, TOOL_ANNOUNCEMENT_TOAST_DURATION);
}

function removeAnnouncementToast(id) {
  announcementToastList.value = announcementToastList.value.filter((item) => {
    if (item.id !== id) {
      return true;
    }
    if (item.timer) {
      clearTimeout(item.timer);
    }
    return false;
  });
}

const loadTags = async () => {
  try {
    const res = await apiToolTags();
    const list = res?.code === 200 ? (res.data || []) : [];
    tagOptions.value = list.map((item) => ({
      label: item.name,
      value: item.id,
    }));
  } catch (e) {
    console.error('加载工具标签失败', e);
  }
};

onMounted(() => {
  loadToolSystemAnnouncements();
  loadToolUserAnnouncements();
  loadTags();
  loadTools();
  loadRecommendTools();
  if (isLoggedIn.value) {
    loadCurrentToolQuota();
  }
  if (process.client) {
    window.addEventListener('message', handleIframeToolMessage);
    window.addEventListener('tool-announcement-toast', handleToolAnnouncementToast);
  }
});

watch(isLoggedIn, (value) => {
  if (value) {
    loadCurrentToolQuota();
    return;
  }
  currentToolQuota.remainingCount = 0;
  currentToolQuota.totalBuyCount = 0;
  currentToolQuota.usedCount = 0;
});

onBeforeUnmount(() => {
  if (process.client) {
    window.removeEventListener('message', handleIframeToolMessage);
    window.removeEventListener('tool-announcement-toast', handleToolAnnouncementToast);
  }
  announcementToastList.value.forEach((item) => {
    if (item.timer) {
      clearTimeout(item.timer);
    }
  });
  announcementToastList.value = [];
});

watch(toolUserNoticeRefreshFlag, async (value) => {
  if (!process.client || !value) {
    return;
  }
  const currentPath = window.location.pathname || '';
  if (!currentPath.startsWith('/tool')) {
    return;
  }
  await loadToolUserAnnouncements();
});

const totalCount = computed(() => {
  const actualData =
    resData.value?.data?.total !== undefined
      ? resData.value.data
      : resData.value;
  return actualData?.total || 0;
});

const displayList = computed(() => {
  if (!queryParams.isFollowing) return toolList.value;
  return toolList.value.filter((item) => item.collectionFlag === 1 || item.isFavorite);
});

const currentRecommendRows = computed(() => recommendData[recommendType.value].rows);

const currentExpandedTool = computed(() => {
  return toolList.value.find((item) => item.isExpanded) || null;
});

const hasAnnouncementLink = (item) => !!item?.link && String(item.link).trim() !== '';

function toggleSelectMode() {
  selectMode.value = !selectMode.value;
  if (!selectMode.value) selectedIds.value.clear();
}

function handleCreateTool() {
  editingTool.value = null;
  showEditModal.value = true;
}

function handleEditTool(item) {
  editingTool.value = { ...item };
  showEditModal.value = true;
}

function handleOpenQuestionModal(item) {
  if (!canCreateQuestion.value) {
    const { message } = createDiscreteApi(['message']);
    message.warning('暂无工具提问权限');
    return;
  }
  questionToolId.value = Number(item.id);
  showQuestionModal.value = true;
}

function handleQuestionCreated() {
  showQuestionModal.value = false;
}

async function handleCreateSuccess() {
  queryParams.pageNum = 1;
  await loadTags();
  await loadTools();
  await loadRecommendTools(recommendType.value);
}

function toggleSelect(id) {
  const s = new Set(selectedIds.value);
  if (s.has(id)) s.delete(id);
  else s.add(id);
  selectedIds.value = s;
}

async function handleBatchDelete() {
  const { message, dialog } = createDiscreteApi(['message', 'dialog']);
  if (deleteSubmitting.value || selectedIds.value.size === 0) {
    return;
  }
  dialog.warning({
    title: '确认删除',
    content: `确定删除选中的 ${selectedIds.value.size} 个工具？`,
    positiveText: '确认删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      if (deleteSubmitting.value) {
        return false;
      }
      deleteSubmitting.value = true;
      try {
        const ids = Array.from(selectedIds.value);
        const res = await apiDeleteTool(ids);
        if (res?.code === 200) {
          message.success(`已删除 ${ids.length} 个工具`);
          selectedIds.value.clear();
          selectMode.value = false;
          queryParams.pageNum = 1;
          await loadTools();
        } else {
          message.error(res?.msg || '删除失败');
        }
      } catch (e) {
        message.error('删除失败，请重试');
      } finally {
        deleteSubmitting.value = false;
      }
    },
  });
}

const handleSearch = () => {
  queryParams.toolId = null;
  queryParams.pageNum = 1;
  navigateTo({
    path: '/tool',
  }, { replace: true });
  loadTools();
};

const handleRefresh = (page) => {
  queryParams.pageNum = page || 1;
  const nextQuery = {};
  if (queryParams.pageNum > 1) {
    nextQuery.page = String(queryParams.pageNum);
  }
  if (queryParams.toolId) {
    nextQuery.toolId = String(queryParams.toolId);
    if (shouldAutoOpenTool()) {
      nextQuery.autoOpen = '1';
    }
  }
  navigateTo({
    path: '/tool',
    query: nextQuery,
  }, { replace: true });
  loadTools();
};

const handleRecommendTypeChange = (type) => {
  if (recommendLoading.value) {
    return;
  }
  recommendType.value = type;
  loadRecommendTools(type);
};

const handleRecommendToolClick = async (item) => {
  if (!item?.id || pending.value) {
    return;
  }
  queryParams.toolId = item.id;
  queryParams.keyword = '';
  queryParams.tags = [];
  queryParams.resourceType = null;
  queryParams.isFollowing = false;
  queryParams.collectionFlag = null;
  queryParams.pageNum = 1;
  await navigateTo({
    path: '/tool',
    query: {
      toolId: String(item.id),
      autoOpen: '1',
    },
  }, { replace: true });
  await loadTools();
  expandOnlyTool(item.id);
};

const handleOpenTool = (item) => {
  navigateTo(`/tool/detail/${item.id}`);
};

const canExpandTool = (item) => {
  if (!item) {
    return false;
  }
  if (item.resourceType === 'FREE') {
    return true;
  }
  const currentLevel = Number(getUserMemberLevel() || 0);
  const requiredLevel = Number(item.level || 0);
  if (currentLevel > requiredLevel) {
    return true;
  }
  return Number(currentToolQuota.remainingCount || 0) > 0;
};

const toggleExpand = (item) => {
  const { message } = createDiscreteApi(['message']);
  const nextExpanded = !item.isExpanded;
  if (nextExpanded && !canExpandTool(item)) {
    message.warning('当前工具点数不足，无法展开该工具');
    return;
  }
  toolList.value = toolList.value.map((tool) => ({
    ...tool,
    isExpanded: tool.id === item.id ? nextExpanded : tool.isExpanded,
  }));
  if (nextExpanded) {
    const current = toolList.value.find((tool) => tool.id === item.id);
    recordToolView(current);
  }
};

const recordToolView = async (item) => {
  if (!item?.id) {
    return;
  }
  item.viewCount = Number(item.viewCount || 0) + 1;
  try {
    await apiRecordToolView(item.id);
  } catch (e) {
    console.error('记录工具浏览失败', e);
  }
};

const getFieldValue = (item, camelKey, snakeKey) => item?.[camelKey] || item?.[snakeKey] || '';

const getEmbedUrl = (item) => getFieldValue(item, 'routePath', 'route_path');

const isIframeTool = () => false;

const getUrlOrigin = (url) => {
  if (!url || !process.client) {
    return '';
  }
  try {
    return new URL(url, window.location.origin).origin;
  } catch (e) {
    return '';
  }
};

const getRuntimeComponent = (item) => {
  const routePath = getFieldValue(item, 'routePath', 'route_path');
  return runtimeToolMap[routePath] || null;
};

const formatAccessType = () => '站内页面';

const formatResourceType = (resourceType) => {
  const typeMap = {
    FREE: '免费',
    CASH_POINT: '消耗工具点数',
    VIP: 'VIP',
    SMALL_CLASS: '小班',
    INTERNAL: '内部',
  };
  return typeMap[resourceType] || resourceType || '工具';
};

const isPaidResourceType = (resourceType) => ['CASH_POINT'].includes(resourceType);

const buildUsageKey = (toolId) => `${toolId}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const setConsuming = (toolId, value) => {
  const next = new Set(consumingToolIds.value);
  if (value) next.add(toolId);
  else next.delete(toolId);
  consumingToolIds.value = next;
};

const parseIframeMessageData = (data) => {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  }
  return data && typeof data === 'object' ? data : null;
};

const handleIframeToolMessage = (event) => {
  const item = currentExpandedTool.value;
  if (!item || !isIframeTool(item)) {
    return;
  }

  const iframeOrigin = getUrlOrigin(getEmbedUrl(item));
  if (!iframeOrigin || event.origin !== iframeOrigin) {
    return;
  }

  const data = parseIframeMessageData(event.data);
  if (!data || data.type !== 'OSH_TOOL_USED') {
    return;
  }
  if (data.status && data.status !== 'SUCCESS') {
    return;
  }
  if (Number(data.toolId) !== Number(item.id)) {
    return;
  }

  handleToolUsed(item, data.usageKey);
};

// TODO 后续改到 子页面直接调用接口先校验再使用,并扣数
const handleToolUsed = async (item, usageKey) => {
  if (!item || !isPaidResourceType(item.resourceType)) {
    return;
  }
  const { message } = createDiscreteApi(['message']);
  if (consumingToolIds.value.has(item.id)) {
    return;
  }
  if (Number(item.remainingCount || 0) <= 0) {
    message.warning('工具使用次数不足，请先购买套餐');
    return;
  }
  setConsuming(item.id, true);
  try {
    const res = await apiConsumeToolUsage({
      toolId: item.id,
      usageKey: usageKey || buildUsageKey(item.id),
    });
    if (res?.code === 200) {
      const consumeCost = Number(item?.quotaCost || 1);
      item.remainingCount = Number(res.data ?? Math.max(0, Number(item.remainingCount || 0) - consumeCost));
      item.purchasedFlag = item.remainingCount > 0 ? 1 : 0;
      item.totalUsage = Number(item.totalUsage || 0) + 1;
      currentToolQuota.remainingCount = Math.max(0, Number(currentToolQuota.remainingCount || 0) - consumeCost);
      currentToolQuota.usedCount = Number(currentToolQuota.usedCount || 0) + consumeCost;
      message.success(`已扣减 ${consumeCost} 工具点数`);
    } else {
      message.error(res?.msg || '扣减工具使用次数失败');
    }
  } catch (e) {
    message.error(e?.data?.msg || e?.message || '扣减工具使用次数失败');
  } finally {
    setConsuming(item.id, false);
  }
};

const getMinSortPackage = (item) => {
  return null;
};

const formatMinSortPackagePrice = (item) => {
  if (!isPaidResourceType(item?.resourceType)) return '免费';
  return `单次消耗 ${Number(item?.quotaCost || 1)} 工具点数`;
};

const formatRecommendTime = (item) => {
  return item?.createTime || item?.create_time || '最近发布';
};

const handleCopyToolNo = async (toolNo) => {
  const { message } = createDiscreteApi(['message']);
  if (!toolNo) {
    return;
  }
  if (!process.client || !navigator?.clipboard?.writeText) {
    message.warning('当前环境暂不支持复制');
    return;
  }
  try {
    await navigator.clipboard.writeText(toolNo);
    message.success(`已复制工具编号：${toolNo}`);
  } catch (e) {
    message.error('复制失败，请重试');
  }
};

const handleDoCollect = async (toolId) => {
  const { message } = createDiscreteApi(['message']);
  const tool = toolList.value.find((item) => item.id === toolId);
  if (!tool) return;

  const wasCollected = tool.isFavorite;
  if (!wasCollected && !canAddCollection.value) {
    message.warning('暂无收藏工具权限');
    return;
  }
  if (wasCollected && !canRemoveCollection.value) {
    message.warning('暂无取消收藏权限');
    return;
  }
  const previousCount = tool.favoriteCount || tool.collectionCount || 0;
  tool.isFavorite = !wasCollected;
  tool.collectionFlag = wasCollected ? 0 : 1;
  tool.favoriteCount = wasCollected
    ? Math.max(0, previousCount - 1)
    : previousCount + 1;
  tool.collectionCount = tool.favoriteCount;

  try {
    const res = wasCollected
      ? await apiRemoveCollectTool(toolId)
      : await apiCollectTool(toolId);

    if (res?.code === 200) {
      message.success(wasCollected ? '已取消收藏' : '收藏成功');
      if (recommendType.value === 'HOT') {
        loadRecommendTools('HOT');
      }
    } else {
      rollbackFavorite(tool, wasCollected, previousCount);
      message.error(res?.msg || '操作失败');
    }
  } catch {
    rollbackFavorite(tool, wasCollected, previousCount);
    message.error('请求失败');
  }
};

const handleToolVote = async (item, type) => {
  const { message } = createDiscreteApi(['message']);
  if (!item?.id) return;
  if (type === 1 && !canVoteGood.value) {
    message.warning('暂无点赞工具权限');
    return;
  }
  if (type === 3 && !canVoteBad.value) {
    message.warning('暂无差评工具权限');
    return;
  }

  const oldVoteType = Number(item.voteType || 0);
  const oldGoodCount = Number(item.goodCount || 0);
  const oldBadCount = Number(item.badCount || 0);

  applyToolVoteLocal(item, oldVoteType, type);

  try {
    const res = type === 1
      ? await apiVoteGoodTool(item.id)
      : await apiVoteBadTool(item.id);
    if (res?.code === 200) {
      item.voteType = Number(res.data || 0);
      message.success(item.voteType === 0 ? '已取消评价' : '评价成功');
      return;
    }
    item.voteType = oldVoteType;
    item.goodCount = oldGoodCount;
    item.badCount = oldBadCount;
    message.error(res?.msg || '评价失败');
  } catch (e) {
    item.voteType = oldVoteType;
    item.goodCount = oldGoodCount;
    item.badCount = oldBadCount;
    message.error(e?.data?.msg || e?.message || '评价失败');
  }
};

const applyToolVoteLocal = (item, oldVoteType, type) => {
  if (oldVoteType === type) {
    updateToolVoteCount(item, type, -1);
    item.voteType = 0;
    return;
  }
  if (oldVoteType !== 0) {
    updateToolVoteCount(item, oldVoteType, -1);
  }
  updateToolVoteCount(item, type, 1);
  item.voteType = type;
};

const updateToolVoteCount = (item, type, delta) => {
  if (type === 1) {
    item.goodCount = Math.max(0, Number(item.goodCount || 0) + delta);
  }
  if (type === 3) {
    item.badCount = Math.max(0, Number(item.badCount || 0) + delta);
  }
};

const rollbackFavorite = (tool, wasCollected, previousCount) => {
  tool.isFavorite = wasCollected;
  tool.collectionFlag = wasCollected ? 1 : 0;
  tool.favoriteCount = previousCount;
  tool.collectionCount = tool.favoriteCount;
};
</script>

<style scoped>
.tool-container {
  width: 100%;
  max-width: none;
  box-sizing: border-box;
  margin: 0 auto;
  padding: 0 24px;
}

.breadcrumb-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 14px 0 4px;
}

.breadcrumb-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #999;
}
.bc-item { color: #666; cursor: pointer; transition: color 0.2s; }
.bc-item:hover { color: #18a058; }
.bc-sep { color: #ddd; user-select: none; }
.bc-current { color: #333; font-weight: 600; }
.quota-hero {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 250px;
  padding: 10px 14px;
  border: 1px solid rgba(16, 185, 129, 0.18);
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(236, 253, 245, 0.96), rgba(224, 242, 254, 0.92));
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}
.quota-hero.loading {
  opacity: 0.72;
}
.quota-hero-guest {
  border-color: rgba(148, 163, 184, 0.22);
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.96), rgba(241, 245, 249, 0.94));
}
.quota-hero-icon {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #10b981, #3b82f6);
  color: #fff;
  font-size: 16px;
  font-weight: 900;
  flex-shrink: 0;
}
.quota-hero-icon-guest {
  background: linear-gradient(135deg, #64748b, #94a3b8);
}
.quota-hero-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.quota-hero-label {
  font-size: 12px;
  color: #64748b;
  line-height: 1.2;
}
.quota-hero-value {
  font-size: 22px;
  color: #0f172a;
  font-weight: 900;
  line-height: 1.2;
}
.quota-hero-meta {
  margin-left: auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  font-size: 12px;
  color: #64748b;
  white-space: nowrap;
}
.quota-login-btn {
  margin-left: auto;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 10px;
  background: #fff;
  color: #334155;
  font-size: 12px;
  font-weight: 700;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}
.quota-login-btn:hover {
  border-color: #18a058;
  color: #18a058;
}
.quota-buy-btn {
  background: #18a058;
  color: #fff;
  border-color: #18a058;
}
.quota-buy-btn:hover {
  background: #15914d;
  border-color: #15914d;
  color: #fff;
}
.tool-notice-section {
  margin-bottom: 14px;
}
.notice-section {
  padding: 6px 0 0;
  background: transparent;
}
.notice-bar {
  width: 100%;
  padding: 0 12px;
  display: flex;
  align-items: center;
  height: 40px;
  gap: 0;
  overflow: hidden;
  background: linear-gradient(90deg, #fef9c3 0%, #fef3c7 40%, #fce7f3 100%);
  border: 1.5px solid #fbbf24;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(251, 191, 36, 0.15);
}
.notice-bar-2 {
  margin-top: 8px;
  background: linear-gradient(90deg, #e0f2fe 0%, #dbeafe 40%, #ede9fe 100%);
  border-color: #60a5fa;
  box-shadow: 0 2px 8px rgba(96, 165, 250, 0.15);
}
.notice-label {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px 4px 10px;
  background: linear-gradient(135deg, #f59e0b, #f97316);
  border-radius: 0 8px 8px 0;
  color: white;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
  flex-shrink: 0;
  margin-right: 16px;
  letter-spacing: 0.08em;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  box-shadow: 2px 0 12px rgba(249, 115, 22, 0.35);
  animation: label-pulse 3s ease-in-out infinite;
}
@keyframes label-pulse {
  0%, 100% { box-shadow: 2px 0 12px rgba(249, 115, 22, 0.35); }
  50% { box-shadow: 2px 0 20px rgba(249, 115, 22, 0.6); }
}
.notice-label-2 {
  background: linear-gradient(135deg, #10b981, #06b6d4);
  box-shadow: 2px 0 12px rgba(16, 185, 129, 0.35);
}
.notice-bar-2 {
  background: linear-gradient(90deg, #ecfdf5 0%, #e0f2fe 40%, #ede9fe 100%);
  border-color: #6ee7b7;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.15);
}
.notice-scroll-wrap {
  flex: 1;
  overflow: hidden;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
}
.notice-empty {
  flex: 1;
  display: flex;
  align-items: center;
  height: 100%;
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
}
.notice-scroll-track {
  display: flex;
  align-items: center;
  white-space: nowrap;
  animation: notice-scroll 60s linear infinite;
}
.notice-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  padding-right: 8px;
}
.notice-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #f59e0b;
  flex-shrink: 0;
}
.notice-link {
  color: #111827;
  text-decoration: none;
  transition: color 0.2s ease;
}
.notice-link:hover {
  color: #ea580c;
  text-decoration: underline;
}
.notice-sep {
  color: rgba(17, 24, 39, 0.35);
  margin-left: 2px;
}
@keyframes notice-scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.batch-tip { font-size: 14px; color: #d03050; font-weight: 600; }
.btn-select-mode,
.btn-batch-cancel,
.btn-batch-delete,
.btn-create-tool {
  border-radius: 6px;
  padding: 7px 16px;
  font-size: 13px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  white-space: nowrap;
}
.btn-select-mode {
  background: #fff; color: #666; border: 1px solid #d9d9d9;
}
.btn-select-mode:hover, .btn-select-mode.active {
  border-color: #d03050; color: #d03050; background: #fff2f0;
}
.btn-batch-cancel {
  background: #fff; color: #666; border: 1px solid #d9d9d9;
}
.btn-batch-cancel:hover { border-color: #999; color: #333; }
.btn-batch-delete {
  background: #d03050; color: #fff; border: 1px solid #d03050;
}
.btn-batch-delete:hover { background: #a0203a; border-color: #a0203a; }
.btn-create-tool {
  background: #fff; color: #18a058; border: 1px solid #18a058;
}
.btn-create-tool:hover { background: #18a058; color: #fff; }
.tool-announcement-stack {
  position: fixed;
  top: 88px;
  right: 24px;
  z-index: 2100;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  pointer-events: none;
}
.tool-announcement-toast {
  min-width: 280px;
  max-width: 420px;
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(16, 185, 129, 0.18);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
  backdrop-filter: blur(10px);
}
.tool-announcement-toast-title {
  color: #0f172a;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.5;
  word-break: break-word;
}
.tool-announcement-stack-enter-active,
.tool-announcement-stack-leave-active {
  transition: all 0.45s ease;
}
.tool-announcement-stack-enter-from {
  opacity: 0;
  transform: translate3d(0, -16px, 0);
}
.tool-announcement-stack-leave-to {
  opacity: 0;
  transform: translate3d(0, -24px, 0);
}
.tool-announcement-stack-move {
  transition: transform 0.35s ease;
}
.tool-content-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 20px;
  align-items: start;
}
.list-main-section {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.tool-list-box {
  min-height: 200px;
  margin-bottom: 12px;
}
.tool-row-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tool-item-row-card {
  background: #fff;
  border: 1px solid #efeff5;
  border-radius: 6px;
  overflow: hidden;
  transition: all 0.2s ease;
}
.tool-item-row-card:hover {
  border-color: #26a67a;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}
.tool-item-row-card.is-active {
  border-color: #26a67a;
  box-shadow: 0 4px 12px rgba(38, 166, 122, 0.08);
}
.tool-item-row-card.selected {
  border-color: #d03050;
}
.tool-row-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 14px 12px;
}
.tool-row-main,
.tool-row-sub {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.tool-row-main {
  min-height: 28px;
}
.tool-row-sub {
  padding-left: 36px;
  flex-wrap: wrap;
  row-gap: 8px;
}
.collapser-wrapper {
  width: 24px;
  height: 24px;
  border: 0;
  background: transparent;
  color: #999;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0;
}
.expand-arrow {
  font-size: 24px;
  line-height: 1;
  transition: transform 0.25s ease;
}
.expand-arrow.rotated {
  color: #26a67a;
  transform: rotate(90deg);
}
.select-check {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.title-section {
  flex: 1 1 420px;
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  row-gap: 4px;
  cursor: pointer;
}
.tag {
  color: #165d69;
  font-weight: 700;
  white-space: nowrap;
}
.main-title {
  color: #333;
  font-size: 15px;
  font-weight: 700;
  overflow: visible;
  text-overflow: clip;
  white-space: normal;
  word-break: break-word;
}
.description-text {
  color: #666;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 360px;
}
.access-type {
  color: #888;
  font-size: 12px;
  white-space: nowrap;
  flex-shrink: 0;
}
.meta-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: #888;
  font-size: 12px;
  flex: 0 1 auto;
  min-width: 0;
}
.tool-no-copy {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid #dbe4ee;
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s ease;
}
.tool-no-copy:hover {
  border-color: #26a67a;
  color: #18a058;
  background: #f0fdf4;
}
.meta-item {
  white-space: nowrap;
}
.meta-item.package-price {
  color: #d03050;
  font-weight: 800;
}
.meta-item.quota {
  color: #d03050;
  font-weight: 700;
}
.meta-item.quota.active {
  color: #18a058;
}
.action-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 0 1 auto;
}
.row-action-btn {
  border: 1px solid #d9d9d9;
  border-radius: 5px;
  background: #fff;
  color: #333;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  height: 26px;
  padding: 0 9px;
  transition: all 0.2s;
  white-space: nowrap;
}
.row-action-btn:hover {
  border-color: #26a67a;
  color: #26a67a;
}
.row-action-btn.favorite.active {
  background: #18a058;
  border-color: #18a058;
  color: #fff;
}
.row-action-btn.vote.good {
  background: #26a67a;
  border-color: #26a67a;
  color: #fff;
}
.row-action-btn.vote.bad {
  background: #e53e3e;
  border-color: #e53e3e;
  color: #fff;
}
.row-action-btn.vote.active {
  background: #18a058;
  border-color: #18a058;
  color: #fff;
}
.row-action-btn.question {
  border-color: #18a058;
  color: #13784b;
}
.row-action-btn.question:hover {
  background: #f0faf5;
  border-color: #18a058;
  color: #18a058;
}
.row-action-btn.edit:hover {
  border-color: #4f46e5;
  color: #4f46e5;
}
.tool-embed-area {
  background: #fafafa;
  border-top: 1px dashed #efeff5;
  padding: 12px 16px 16px 46px;
}
.tool-embed-frame {
  width: 100%;
  min-height: 560px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
}
.tool-empty-url {
  color: #999;
  font-size: 13px;
  line-height: 44px;
}
.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
}
.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
.pagination-footer {
  display: flex;
  justify-content: center;
  padding-bottom: 16px;
}
.loading-overlay {
  position: absolute;
  top: 40px;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.7);
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.recommend-panel {
  position: sticky;
  top: 12px;
  align-self: start;
  background: #fff;
  border: 1px solid #efeff5;
  border-radius: 6px;
  padding: 12px;
}
.recommend-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-bottom: 12px;
}
.recommend-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 32px;
  border: 1px solid #d9d9d9;
  border-radius: 5px;
  background: #fff;
  color: #555;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  transition: all 0.2s;
}
.recommend-tab.active,
.recommend-tab:hover {
  border-color: #18a058;
  background: #f0faf5;
  color: #18a058;
}
.recommend-tab:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.recommend-tab-icon {
  font-size: 13px;
  line-height: 1;
}
.recommend-list-wrap {
  min-height: 286px;
}
.recommend-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.recommend-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 100%;
  min-height: 72px;
  padding: 10px;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
}
.recommend-item:hover {
  border-color: #26a67a;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.recommend-title {
  color: #222;
  font-size: 14px;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.recommend-desc {
  color: #666;
  font-size: 12px;
  line-height: 18px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.recommend-meta,
.recommend-stats {
  display: flex;
  gap: 8px;
  color: #888;
  font-size: 12px;
  line-height: 18px;
}
.recommend-meta span:first-child {
  color: #165d69;
  font-weight: 700;
}
.recommend-meta span:last-child:not(:first-child) {
  color: #d03050;
  font-weight: 800;
}
@media (max-width: 1100px) {
  .tool-announcement-stack {
    top: 76px;
    right: 12px;
    left: 12px;
    align-items: stretch;
  }
  .tool-announcement-toast {
    min-width: 0;
    max-width: none;
  }
  .tool-content-layout {
    grid-template-columns: 1fr;
  }
  .recommend-panel {
    position: static;
  }
}
@media (max-width: 900px) {
  .tool-row-main {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .title-section {
    flex-basis: calc(100% - 36px);
  }
  .tool-row-sub {
    padding-left: 36px;
  }
  .action-group {
    padding-left: 0;
  }
  .tool-embed-area {
    padding-left: 16px;
  }
}
</style>
