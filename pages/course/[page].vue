<template>
  <div class="course-container">
    <div class="breadcrumb">
      <span class="bc-item" @click="$router.push('/')">🏠 首页</span>
      <span class="bc-sep">›</span>
      <span class="bc-current">📚 课程</span>
    </div>
    <CourseFilter
      v-model:modelValue="queryParams"
      :tag-options="tagOptions"
      :type-options="typeOptions"
      @search="handleSearch"
    />

    <!-- 多选操作栏：创始人可批量隐藏 / 查看已隐藏，有新增权限时显示创建按钮 -->
    <ClientOnly>
      <div v-if="canCreate || canHideCourse" class="batch-bar">
        <div class="batch-left">
          <!-- 正常列表下才允许「选择隐藏」 -->
          <button v-if="canHideCourse && !onlyHiddenView" class="btn-select-mode" :class="{ active: selectMode }" @click="toggleSelectMode">
            {{ selectMode ? '退出选择' : '☑ 选择隐藏' }}
          </button>
          <!-- 已隐藏课程分类入口（创始人专属） -->
          <button v-if="canHideCourse" class="btn-hidden-view" :class="{ active: onlyHiddenView }" @click="toggleHiddenView">
            {{ onlyHiddenView ? '← 返回课程列表' : '👁‍🗨 已隐藏课程' }}
          </button>
          <template v-if="selectedIds.size > 0">
            <span class="batch-tip">已选 {{ selectedIds.size }} 门课程</span>
            <button class="btn-batch-cancel" @click="selectedIds.clear(); selectMode = false">取消</button>
            <button class="btn-batch-hide" @click="handleBatchHide">👁‍🗨 隐藏选中</button>
          </template>
          <!-- 删除功能保留代码，暂不展示
          <button v-if="canDelete" class="btn-select-mode" :class="{ active: selectMode }" @click="toggleSelectMode">
            {{ selectMode ? '退出选择' : '☑ 选择删除' }}
          </button>
          <template v-if="selectedIds.size > 0">
            <button class="btn-batch-delete" @click="handleBatchDelete">🗑 删除选中</button>
          </template>
          -->
        </div>
        <button v-if="canCreate && !onlyHiddenView" class="btn-create-course" @click="showCreateModal = true">
          + 新增课程
        </button>
      </div>
    </ClientOnly>

    <div class="list-main-section">
      <Transition name="fade">
        <div v-if="pending" class="loading-overlay">
          <n-spin size="large" />
        </div>
      </Transition>

      <ClientOnly>
        <div class="grid-content-box">
          <n-grid
            v-if="displayList && displayList.length > 0"
            :x-gap="16"
            :y-gap="16"
            :cols="5"
          >
            <n-gi v-for="item in displayList" :key="item.id">
              <CourseCard
                :item="item"
                :selectable="selectMode"
                :selected="selectedIds.has(item.id)"
                @click="handleDetail(item.id)"
                @favorite="handleDoCollect"
                @select="toggleSelect"
              />
            </n-gi>
          </n-grid>

          <div v-else-if="!pending" class="empty-placeholder">
            <n-empty :description="onlyHiddenView ? '暂无已隐藏课程' : (queryParams.isFollowing ? '暂无收藏的课程' : '暂无课程数据')" />
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

    <CourseEditModal v-model:show="showCreateModal" :tag-options="tagOptions" @success="handleCreateSuccess" />
  </div>
</template><script setup>
import { ref, reactive, computed, onMounted, onActivated } from 'vue';
import { createDiscreteApi } from 'naive-ui';
import CourseEditModal from '~/components/Course/CourseEditModal.vue';
import CourseFilter from '~/components/Course/CourseFilter.vue';
import CourseCard from '~/components/Course/CourseCard.vue';
import { NGrid, NGi, NPagination } from 'naive-ui';
import { fetchConfig } from '~/composables/useHttp';
import { apiCollectCourse, apiRemoveCollect, apiGetCoverUrls, apiSyncCoursesToEs, apiHideCourses, getAuthHeaders } from '~/composables/Api/Course/course';
import { getUserMemberLevel } from '~/composables/useAuth';

const { hasPermission, permissionList } = usePermission();

const FOUNDER_ROLE_LEVEL = 6;

// 响应式权限判断，确保 user 数据加载后自动更新
const canCreate = computed(() => permissionList.value.includes('course:create'));
const canDelete = computed(() => permissionList.value.includes('course:delete'));
const canUpdate = computed(() => permissionList.value.includes('course:update'));
const canHideCourse = computed(() => getUserMemberLevel() >= FOUNDER_ROLE_LEVEL);
const canManageCourse = computed(() => canCreate.value || canDelete.value || canUpdate.value);

// 进入课程页时自动同步 ES，等价于手动 esSync，保证审核页能读到最新待审课程。
let lastEsSyncAt = 0;
const ES_SYNC_COOLDOWN_MS = 15_000;

async function triggerCourseEsSync() {
  if (!canManageCourse.value) return;
  const now = Date.now();
  if (now - lastEsSyncAt < ES_SYNC_COOLDOWN_MS) return;
  lastEsSyncAt = now;
  try {
    await apiSyncCoursesToEs();
  } catch (_) {
    // 同步失败不阻塞列表展示
  }
}

// 1. 核心修复：在查询参数中增加新的两个字段，并给默认排序赋值
const queryParams = reactive({
  keyword: '',
  tags: [],
  pageNum: 1,
  pageSize: 10,
  isFree: null,
  isFollowing: false,
  collectionFlag: null, // 「我收藏的」筛选
  sortType: 'all',
  resourceType: null,  // 课程资源类型筛选（FREE/VIP/CASH_ONLY 等）
  courseNo: '',
  onlyHidden: false,   // 创始人「已隐藏课程」分类，仅显示 status=7
});

// 是否处于「已隐藏课程」视图
const onlyHiddenView = computed(() => queryParams.onlyHidden === true);

// 2. 核心接口调用
// 建议：确保 queryParams 的变化能被 refresh 捕捉
const {
  data: resData,
  pending,
  refresh,
} = await useCourseSearchApi(queryParams);
const courseList = ref([]);

const syncCourseList = (payload) => {
  if (!payload) {
    courseList.value = [];
    return;
  }

  const actualData = payload?.data?.rows ? payload.data : payload;
  const rows = actualData?.rows || [];
  // 保留本地乐观更新的收藏态，避免刷新结果把用户刚点的状态覆盖掉。
  const prevMap = new Map(courseList.value.map((c) => [c.id, c]));
  courseList.value = rows.map((item) => {
    const prev = prevMap.get(item.id);
    const isFavorite = prev != null ? prev.isFavorite : item.collectionFlag === 1;
    return {
      ...item,
      isFavorite,
      collectionFlag: isFavorite ? 1 : 0,
      favoriteCount: prev != null ? prev.favoriteCount : (item.collectionCount || 0),
      buyCount: item.salesCount || 0,
      cover: item.cover || 'https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg',
      ratingScore: item.ratingScore || 5,
    };
  });
};

const loadCourses = async () => {
  await refresh();
  syncCourseList(resData.value);
  await refreshCoverUrls();
};

/** 绕过 useFetch 缓存，隐藏/编辑后直接拉最新列表 */
async function fetchCourseListDirect() {
  const res = await $fetch('/course/search', {
    method: 'POST',
    baseURL: fetchConfig.baseURL,
    headers: getAuthHeaders(),
    body: {
      keyword: queryParams.keyword,
      tags: queryParams.tags,
      pageNum: queryParams.pageNum,
      pageSize: queryParams.pageSize,
      isFree: queryParams.isFree,
      isFollowing: queryParams.isFollowing,
      collectionFlag: queryParams.collectionFlag,
      sortType: queryParams.sortType,
      resourceType: queryParams.resourceType,
      courseNo: queryParams.courseNo,
      onlyHidden: queryParams.onlyHidden,
    },
  });
  if (res?.code !== 200) return false;
  const payload = res.data ?? res;
  resData.value = payload;
  syncCourseList(payload);
  await refreshCoverUrls();
  return true;
}

async function refreshCoverUrls() {
  if (!courseList.value.length) return;
  const ids = courseList.value.map((c) => c.id).filter(Boolean);
  if (!ids.length) return;
  try {
    const res = await apiGetCoverUrls(ids, 1440);
    if (res?.code === 200 && res.data) {
      const urlMap = res.data;
      courseList.value.forEach((course) => {
        if (urlMap[course.id]) {
          course.cover = urlMap[course.id];
        }
      });
    }
  } catch (e) {
    // 封面刷新失败不影响列表展示，静默处理
  }
}

onMounted(() => {
  triggerCourseEsSync();
  loadTags();
  loadCourses();
});

// 从详情页返回列表页时，页面实例可能被复用，onMounted 不会再次触发。
// 补充 onActivated 强制拉新，避免列表卡片仍显示旧状态/旧标题。
onActivated(() => {
  triggerCourseEsSync();
  loadTags();
  loadCourses();
});

// 4. 映射总条数
const totalCount = computed(() => {
  const actualData =
    resData.value?.data?.total !== undefined
      ? resData.value.data
      : resData.value;
  return actualData?.total || 0;
});

// 「我收藏的」前端过滤
const displayList = computed(() => {
  if (!queryParams.isFollowing) return courseList.value;
  return courseList.value.filter((item) => item.collectionFlag === 1 || item.isFavorite);
});

// 5. 弹窗控制
const showCreateModal = ref(false);

// 多选删除
const selectMode = ref(false);
const selectedIds = ref(new Set());

function toggleSelectMode() {
  selectMode.value = !selectMode.value;
  if (!selectMode.value) selectedIds.value.clear();
}

// 切换「已隐藏课程」分类视图
function toggleHiddenView() {
  queryParams.onlyHidden = !queryParams.onlyHidden;
  // 进入/退出该分类时重置多选与收藏筛选，避免条件叠加
  selectMode.value = false;
  selectedIds.value.clear();
  queryParams.isFollowing = false;
  queryParams.collectionFlag = null;
  queryParams.pageNum = 1;
  loadCourses();
}

function toggleSelect(id) {
  const s = new Set(selectedIds.value);
  if (s.has(id)) s.delete(id);
  else s.add(id);
  selectedIds.value = s;
}

async function reloadAfterHide() {
  // 隐藏改的是 ES 数据，先同步再重新查询，保证拿到最新的「已隐藏」状态
  lastEsSyncAt = 0;
  try {
    await triggerCourseEsSync();
  } catch (_) {}
  try {
    const ok = await fetchCourseListDirect();
    if (!ok) {
      await loadCourses();
    }
  } catch (_) {
    try {
      await loadCourses();
    } catch (_) {}
  }
}

function handleBatchHide() {
  const { message, dialog } = createDiscreteApi(['message', 'dialog']);
  const hideCount = selectedIds.value.size;
  const hideDialog = dialog.warning({
    title: '确认隐藏',
    content: `确定隐藏选中的 ${hideCount} 门课程？隐藏后普通用户将无法在课程列表中看到，数据仍保留。`,
    positiveText: '确认隐藏',
    negativeText: '取消',
    onPositiveClick() {
      const ids = Array.from(selectedIds.value);
      apiHideCourses(ids)
        .then(async (res) => {
        if (res?.code !== 200) {
          message.error(res?.msg || '隐藏失败');
          return;
        }
        message.success(`已隐藏 ${ids.length} 门课程`);
        selectedIds.value.clear();
        selectMode.value = false;
        hideDialog.destroy();
        // 1. 乐观移除：立即从当前列表去掉被隐藏的课程，肉眼即时消失
        const hiddenSet = new Set(ids);
        courseList.value = courseList.value.filter((c) => !hiddenSet.has(c.id));
        // 2. 重新请求 search，用服务端最新结果覆盖（已隐藏 status=7 已在后端排除）
        await reloadAfterHide();
        })
        .catch(() => {
          message.error('隐藏失败，请重试');
        });
      return false;
    },
  });
}

/* 删除逻辑保留，UI 已注释暂不启用
async function handleBatchDelete() {
  const { message, dialog } = createDiscreteApi(['message', 'dialog']);
  dialog.warning({
    title: '确认删除',
    content: `确定删除选中的 ${selectedIds.value.size} 门课程？此操作不可恢复，将同时删除课程的章节、资料等所有数据。`,
    positiveText: '确认删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        const ids = Array.from(selectedIds.value);
        const res = await $fetch('/course/delete', {
          method: 'POST',
          baseURL: fetchConfig.baseURL,
          headers: getAuthHeaders(),
          body: { ids },
        });
        if (res?.code === 200) {
          message.success(`已删除 ${ids.length} 门课程`);
          selectedIds.value.clear();
          selectMode.value = false;
          queryParams.pageNum = 1;
          await loadCourses();
        } else {
          message.error(res?.msg || '删除失败');
        }
      } catch (e) {
        message.error('删除失败，请重试');
      }
    },
  });
}
*/

const typeOptions = [
  { label: '视频课', value: 'media' },
  { label: '直播课', value: 'live' },
  { label: '图文课', value: 'text' },
];

// 标签列表
const tagOptions = ref([]);
const loadTags = async () => {
  try {
    const res = await $fetch('/course/tags', {
      baseURL: fetchConfig.baseURL,
      headers: getAuthHeaders(),
    });
    const list = res?.code === 200 ? (res.data || []) : (Array.isArray(res) ? res : []);
    tagOptions.value = list.map(item => ({
      label: item.name || item.tagName || String(item),
      value: item.id ?? item,
    }));
  } catch (e) {
    console.error('加载标签失败', e);
  }
};
// --- 逻辑函数 ---

const handleSearch = () => {
  queryParams.pageNum = 1;
  loadCourses();
};

const handleRefresh = (page) => {
  // 这里的 page 是 n-pagination 传回来的页码
  queryParams.pageNum = page || 1;
  loadCourses();
};

const handleCreateSuccess = async () => {
  lastEsSyncAt = 0;
  await triggerCourseEsSync();
  queryParams.pageNum = 1;
  await loadTags();
  await loadCourses();
};

const handleDetail = (id) => {
  // 确保路径和你的 pages 目录结构一致
  navigateTo(`/course_detail/${id}`);
};

const handleDoCollect = async (courseId) => {
  const { message } = createDiscreteApi(['message']);
  const course = courseList.value.find((c) => c.id === courseId);
  if (!course) return;

  const wasCollected = course.isFavorite;
  // 乐观更新
  course.isFavorite = !wasCollected;
  course.collectionFlag = wasCollected ? 0 : 1;
  course.favoriteCount = wasCollected
    ? Math.max(0, (course.favoriteCount || 0) - 1)
    : (course.favoriteCount || 0) + 1;
  course.collectionCount = course.favoriteCount;

  try {
    const res = wasCollected
      ? await apiRemoveCollect(courseId)
      : await apiCollectCourse(courseId);

    if (res?.code === 200) {
      message.success(wasCollected ? '已取消收藏' : '收藏成功');
    } else {
      // 回滚
      course.isFavorite = wasCollected;
      course.collectionFlag = wasCollected ? 1 : 0;
      course.favoriteCount = wasCollected
        ? (course.favoriteCount || 0) + 1
        : Math.max(0, (course.favoriteCount || 0) - 1);
      course.collectionCount = course.favoriteCount;
      message.error(res?.msg || '操作失败');
    }
  } catch {
    course.isFavorite = wasCollected;
    message.error('请求失败');
  }
};
</script>
<style scoped>
.course-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #999;
  margin: 14px 0 10px;
}
.bc-item {
  color: #666;
  cursor: pointer;
  transition: color 0.2s;
}
.bc-item:hover { color: #18a058; }
.bc-sep { color: #ddd; user-select: none; }
.bc-current { color: #333; font-weight: 600; }


/* 多选操作栏 */
.batch-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  min-height: 36px;
}
.batch-left { display: flex; align-items: center; gap: 10px; }
.batch-tip { font-size: 14px; color: #d48806; font-weight: 600; }

/* 统一按钮样式 */
.btn-select-mode,
.btn-batch-cancel,
.btn-batch-hide,
.btn-batch-delete,
.btn-hidden-view,
.btn-create-course {
  border-radius: 6px;
  padding: 7px 16px;
  font-size: 13px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  white-space: nowrap;
}
.btn-hidden-view {
  background: #fff; color: #666; border: 1px solid #d9d9d9;
}
.btn-hidden-view:hover, .btn-hidden-view.active {
  border-color: #2080f0; color: #2080f0; background: #ecf5ff;
}
.btn-select-mode {
  background: #fff; color: #666; border: 1px solid #d9d9d9;
}
.btn-select-mode:hover, .btn-select-mode.active {
  border-color: #d48806; color: #d48806; background: #fff7e6;
}
.btn-batch-cancel {
  background: #fff; color: #666; border: 1px solid #d9d9d9;
}
.btn-batch-cancel:hover { border-color: #999; color: #333; }
.btn-batch-hide {
  background: #d48806; color: #fff; border: 1px solid #d48806;
}
.btn-batch-hide:hover { background: #ad6800; border-color: #ad6800; }
.btn-batch-delete {
  background: #d03050; color: #fff; border: 1px solid #d03050;
}
.btn-batch-delete:hover { background: #a0203a; border-color: #a0203a; }
.btn-create-course {
  background: #fff; color: #18a058; border: 1px solid #18a058;
}
.btn-create-course:hover { background: #18a058; color: #fff; }

.list-main-section {
  position: relative;
  display: flex;
  flex-direction: column;
}

/* 上方箭头距离控制 */
.status-bar {
  padding: 10px 0;
  font-size: 13px;
  color: #ff4d4f; /* 对应你截图里的红色字体 */
}

/* ✨ 解决分页器看不到的核心：限制内容区总高度 */
.grid-content-box {
  min-height: 200px;
  margin-bottom: 12px;
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
</style>
