<template>
  <div class="info-gap-container">
    <n-alert title="平台风险公告" type="warning" class="notice-bar">
      不良信息、恶法内容将被加入页面名单，严重者封封！警告三次将永久封禁账号！
    </n-alert>

    <div class="top-toolbar">
      <n-space align="center" justify="space-between" style="width: 100%">
        <n-space>
          <n-button type="primary" @click="handlePublish">
            <template #icon>
              <n-icon><Add /></n-icon>
            </template>
            发布我的信息差
          </n-button>
          <n-input-group style="width: 300px">
            <n-input
              v-model:value="queryParams.title"
              placeholder="搜索信息差..."
              clearable
              @keyup.enter="handleSearch"
            />
            <n-button ghost @click="handleSearch">
              <template #icon>
                <n-icon><SearchOutline /></n-icon>
              </template>
            </n-button>
          </n-input-group>
        </n-space>

        <n-radio-group
          v-model:value="queryParams.type"
          name="tab-group"
          size="medium"
          @update:value="handleTypeChange"
        >
          <n-radio-button value="hot">
            <n-icon><FlashOutline /></n-icon> 热门信息差
          </n-radio-button>
          <n-radio-button value="latest">
            <n-icon><StarOutline /></n-icon> 最新发布
          </n-radio-button>
          <n-radio-button value="follow">
            <n-icon><BuildOutline /></n-icon> 我收藏的
          </n-radio-button>
        </n-radio-group>
      </n-space>
    </div>

    <n-grid :x-gap="20">
      <n-grid-item :span="18">
        <LoadingGroup
          :pending="pending"
          :error="error"
          :is-empty="rows.length === 0"
        >
          <div class="list-wrapper">
            <div
              v-for="item in rows"
              :key="item.id"
              class="info-item-row-card"
              :class="{ 'is-active': item.isExpanded }"
            >
              <div class="one-line-content">
                <div class="collapser-wrapper" @click.stop="toggleExpand(item)">
                  <n-icon
                    class="expand-arrow"
                    :class="{ rotated: item.isExpanded }"
                  >
                    <ChevronForwardOutline />
                  </n-icon>
                </div>

                <div class="title-section">
                  <span class="tag">【{{ item.tag }}】</span>
                  <span class="main-title">{{ item.title }}</span>
                  <span class="sub-tag-1"> 标签1 </span>
                  <span class="sub-tag-2"> 标签2 </span>
                  <span class="sub-tag-3"> 标签3 </span>
                </div>

                <div class="meta-group">
                  <span class="meta-item">
                    <n-icon><PersonOutline /></n-icon>
                    {{ item.nickname || '匿名' }}
                  </span>
                  <span class="meta-item time">
                    <n-icon><TimeOutline /></n-icon>
                    {{ formatTime(item.createTime) }}
                  </span>
                </div>

                <div class="action-group">
                  <n-space :size="4">
                    <n-button
                      size="tiny"
                      :color="item.isVoted === 1 ? '#18a058' : '#26a67a'"
                      text-color="#fff"
                      @click.stop="handleVote(item, 1)"
                    >
                      👍 {{ item.goodCount }}
                    </n-button>

                    <n-button
                      size="tiny"
                      :color="item.isVoted === 2 ? '#18a058' : '#718b9c'"
                      text-color="#fff"
                      @click.stop="handleVote(item, 2)"
                    >
                      😐 {{ item.middleCount }}
                    </n-button>

                    <n-button
                      size="tiny"
                      :color="item.isVoted === 3 ? '#18a058' : '#e53e3e'"
                      text-color="#fff"
                      @click.stop="handleVote(item, 3)"
                    >
                      👎 {{ item.badCount }}
                    </n-button>

                    <n-button
                      size="tiny"
                      :secondary="!item.isFollowed"
                      :type="item.isFollowed ? 'primary' : 'default'"
                      strong
                      @click.stop="handleFollow(item)"
                    >
                      ⭐️ {{ item.isFollowed ? '已收藏' : '收藏' }}
                    </n-button>
                  </n-space>
                </div>
              </div>

              <transition name="expand">
                <div v-if="item.isExpanded" class="detail-content-area">
                  <div class="content-text">
                    {{ item.content }}
                  </div>
                </div>
              </transition>
            </div>
          </div>

          <div class="pagination-wrapper">
            <n-pagination
              v-model:page="queryParams.pageNum"
              :item-count="total"
              :page-size="queryParams.pageSize"
              @update:page="handlePageChange"
            />
          </div>
        </LoadingGroup>
      </n-grid-item>

      <n-grid-item :span="6">
        <InfoGapHotList />
      </n-grid-item>
    </n-grid>

    <n-modal
      v-model:show="showModal"
      preset="card"
      title="发布我的信息差"
      style="width: 600px"
    >
      <n-form :model="form">
        <n-form-item label="标题">
          <n-input
            v-model:value="form.title"
            placeholder="一句话概括你的信息差"
          />
        </n-form-item>
        <n-form-item label="分类标签">
          <n-select
            v-model:value="form.tag"
            :options="[
              { label: '技术', value: '技术' },
              { label: '政策', value: '政策' },
              { label: '搞钱', value: '搞钱' },
            ]"
          />
        </n-form-item>
        <n-form-item label="内容详情">
          <n-input
            v-model:value="form.content"
            type="textarea"
            placeholder="请详细描述..."
            :autosize="{ minRows: 3, maxRows: 6 }"
          />
        </n-form-item>
      </n-form>

      <template #footer>
        <n-space justify="end">
          <n-button @click="showModal = false">取消</n-button>
          <n-button
            type="primary"
            :loading="btnLoading"
            @click="confirmPublish"
          >
            确认发布
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<!-- 样式实时切换 暂时搞不出来 算了 TODO -->

<script setup>
// ==================== 1) 依赖导入 ====================
import {
  NGrid,
  NGridItem,
  NButton,
  NSpace,
  NIcon,
  NPagination,
  NInput,
  NInputGroup,
  NAlert,
  NRadioGroup,
  NRadioButton,
  NTooltip,
  NModal,
  NForm,
  NFormItem,
  NSelect,
  createDiscreteApi,
} from 'naive-ui';
import {
  PersonOutline,
  TimeOutline,
  ArrowForward,
  ChevronForwardOutline,
  SearchOutline,
  Add,
  FlashOutline,
  StarOutline,
  BuildOutline,
} from '@vicons/ionicons5';
import InfoGapHotList from "~/components/InfoGapHotList.vue";

// ==================== 2) 页面状态 ====================
// 路由对象：用于读取 page 参数和 query 参数
const route = useRoute();

// 列表查询参数：同时驱动 UI、URL 和后端请求
const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  type: 'hot', // 排序：hot, latest, follow
  title: '', // 搜索词
});

// 发布弹窗相关状态
const showModal = ref(false);
const btnLoading = ref(false);
const form = reactive({
  title: '',
  tag: '技术',
  content: '',
});

// 列表请求状态
const pending = ref(false);
const error = ref(null);
const total = ref(0);
const rows = ref([]);

// ==================== 3) 列表数据加载 ====================
// 读取列表数据，并把后端字段补齐成前端可直接渲染的结构
const loadData = async () => {
  console.log('--- 正在请求页码 ---', queryParams.pageNum);
  pending.value = true;
  error.value = null;

  try {
    // 使用动态 key，按分类 + 页码区分请求缓存
    const dynamicKey = `info-gap-list-${queryParams.type}-p${queryParams.pageNum}`;
    const { data, error: fetchError } = await useHttpGet(
      dynamicKey,
      '/info_gap/list',
      {
        query: queryParams,
        watch: false,
        $: true,
      }
    );

    if (fetchError.value) {
      error.value = fetchError.value;
      return;
    }

    if (data.value) {
      // 统一初始化交互字段，避免模板侧出现 undefined
      rows.value = (data.value.rows || []).map((row) => ({
        ...row,
        isVoted: row.isVoted || 0,
        goodCount: row.goodCount || 0,
        middleCount: row.middleCount || 0,
        badCount: row.badCount || 0,
        isFollowed: !!row.isFollowed,
        isExpanded: false,
      }));
      total.value = data.value.total || 0;
    } else {
      rows.value = [];
      total.value = 0;
    }
  } catch (err) {
    error.value = err;
  } finally {
    pending.value = false;
  }
};

// ==================== 4) 顶部筛选与分页事件 ====================
const handlePageChange = (p) => {
  console.log('正在跳转至页码:', p);
  syncToPage(p);
};

// 切换类型后回到第一页
const handleTypeChange = async (value) => {
  queryParams.type = value;
  await syncToPage(1);
};

// 搜索时回到第一页
const handleSearch = async () => {
  await syncToPage(1);
};

// ==================== 5) 路由参数与查询参数同步 ====================
// 从路由读取当前的筛选条件
const getRouteType = () => route.query.type || 'hot';
const getRouteTitle = () =>
  typeof route.query.title === 'string' ? route.query.title : '';
const getRoutePageNum = () => parseInt(route.params.page) || 1;

// 同步到目标页：同页则直接刷新，不同页则更新 URL
const syncToPage = async (page) => {
  queryParams.pageNum = page;

  if (getRoutePageNum() === page) {
    await loadData();
    return;
  }

  await navigateTo({
    path: `/info_gap/${page}`,
    query: {
      ...route.query,
      type: queryParams.type,
      title: queryParams.title || undefined,
    },
  });
};

// 监听 URL 页码变化，并把 URL 上的 type/title 同步回查询参数
watch(
  () => route.params.page,
  (newP) => {
    const p = parseInt(newP) || 1;
    queryParams.pageNum = p;
    queryParams.type = getRouteType();
    queryParams.title = getRouteTitle();
    loadData();
  },
  { immediate: true }
);

// ==================== 6) 纯工具函数 ====================
// 时间格式化：2026-03-27T07:48:39 -> 03-27 07:48
const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const date = new Date(timeStr);
  return `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date
    .getDate()
    .toString()
    .padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
};

// 点开详情页
const handleDetail = (id) => navigateTo(`/detail/info_gap/${id}`);

// ==================== 7) 发布弹窗与发布流程 ====================
// 打开发布弹窗
const handlePublish = () => {
  showModal.value = true;
};

// 提交发布：校验 -> 请求 -> 提示 -> 关闭并刷新列表
const confirmPublish = async () => {
  if (!form.title || !form.content) {
    const { message } = createDiscreteApi(['message']);
    return message.warning('请填写完整内容');
  }

  btnLoading.value = true;
  try {
    const { data, error: postError } = await useHttpPost(
      'add-info-gap',
      '/info_gap/save',
      {
        body: form,
        $: true,
      }
    );

    if (postError.value) throw new Error(postError.value);

    const { message } = createDiscreteApi(['message']);
    message.success('发布成功！');

    showModal.value = false;
    Object.assign(form, { title: '', tag: '技术', content: '' });
    await syncToPage(1);
  } catch (err) {
    console.error('发布失败:', err);
  } finally {
    btnLoading.value = false;
  }
};

// ==================== 8) 列表交互动作 ====================
// 评价动作：乐观更新 + 请求失败回滚
const handleVote = async (item, type) => {
  const { message } = createDiscreteApi(['message']);

  // 先存快照，用于失败时回滚
  const oldVoted = item.isVoted;
  const oldCounts = {
    1: item.goodCount,
    2: item.middleCount,
    3: item.badCount,
  };

  // 本地先更新 UI
  if (oldVoted === type) {
    updateCount(item, type, -1);
    item.isVoted = 0;
  } else {
    if (oldVoted !== 0) {
      updateCount(item, oldVoted, -1);
    }
    updateCount(item, type, 1);
    item.isVoted = type;
  }

  // 再发请求，失败则回滚
  try {
    const { error } = await useHttpPost('info-vote', '/info_gap/vote', {
      query: { id: item.id, type: type },
      $: true,
    });
    if (error.value) throw new Error(error.value.message || '后端处理失败');
    message.success(item.isVoted === 0 ? '已取消评价' : '评价成功');
  } catch (err) {
    item.isVoted = oldVoted;
    item.goodCount = oldCounts[1];
    item.middleCount = oldCounts[2];
    item.badCount = oldCounts[3];
    message.error('操作失败：' + err.message);
  }
};

// 关注动作：乐观更新 + 请求失败回滚
const handleFollow = async (item) => {
  const { message } = createDiscreteApi(['message']);

  // 本地先更新 UI，失败再回滚
  const originalStatus = item.isFollowed;
  item.isFollowed = !item.isFollowed;

  try {
    const { error } = await useHttpPost(
      'info-follow',
      `/info_gap/follow/${item.userId}`,
      { $: true }
    );

    if (error.value) throw error.value;

    message.success(item.isFollowed ? '关注成功' : '已取消关注');
  } catch (err) {
    item.isFollowed = originalStatus;
    message.error('关注操作失败，请检查网络');
  }
};

// 展开/收起单条内容
const toggleExpand = (item) => {
  item.isExpanded = !item.isExpanded;
};

// 统一更新三种评价计数
const updateCount = (item, type, delta) => {
  if (type === 1) item.goodCount += delta;
  if (type === 2) item.middleCount += delta;
  if (type === 3) item.badCount += delta;
};

// ==================== 9) 页面元信息 ====================
useHead({ title: '信息差 - 开源助手' });
</script>

<style scoped>
.info-gap-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px 16px;
}

.notice-bar {
  margin-bottom: 16px;
}

/* 顶部工具栏样式 (原左侧红框内容) */
.top-toolbar {
  background: #fff;
  padding: 12px 20px;
  border-radius: 8px;
  border: 1px solid #efeff5;
  margin-bottom: 20px;
}

/* 极致压缩一行卡片 */
.info-item-row-card {
  background: #fff;
  border: 1px solid #efeff5;
  border-radius: 6px;
  padding: 8px 16px;
  margin-bottom: 8px;
  transition: all 0.2s ease;
}

.info-item-row-card:hover {
  border-color: #26a67a;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.one-line-content {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 32px; /* 强制统一高度 */
}

/* 标题区：自动伸缩 */
.title-section {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  cursor: pointer;
}

.tag {
  font-weight: bold;
  color: #165d69;
  white-space: nowrap;
  margin-right: 8px;
}

.main-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 8px;
}

.sub-tag-1 {
  font-weight: bold;
  color: #165d69;
  white-space: nowrap;
  margin-right: 8px;
}

.sub-tag-2 {
  font-weight: bold;
  color: #165d69;
  white-space: nowrap;
  margin-right: 8px;
}

.sub-tag-3 {
  font-weight: bold;
  color: #165d69;
  white-space: nowrap;
}

.expand-icon {
  color: #999;
  cursor: pointer;
  font-size: 18px;
}

/* 元数据区：紧凑显示 */
.meta-group {
  display: flex;
  gap: 12px;
  color: #888;
  font-size: 12px;
  flex-shrink: 0;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 交互区：按钮极小化 */
.action-group {
  flex-shrink: 0;
  border-left: 1px solid #eee;
  padding-left: 16px;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}
/* 让卡片容器支持自适应高度 */
.info-item-row-card {
  display: flex;
  flex-direction: column;
  padding: 0 !important; /* 内部间距交给子项 */
  margin-bottom: 8px;
  overflow: hidden;
}

/* 最左侧箭头容器 */
.collapser-wrapper {
  padding-left: 12px;
  display: flex;
  align-items: center;
  cursor: pointer;
}

.expand-arrow {
  font-size: 18px;
  color: #999;
  transition: transform 0.25s ease; /* 顺滑旋转 */
}

/* 箭头展开时的状态 */
.expand-arrow.rotated {
  transform: rotate(90deg);
  color: #26a67a;
}

/* 详情内容区域样式 */
.detail-content-area {
  background: #fafafa;
  padding: 12px 16px 16px 46px; /* 46px 是为了让文字和标题垂直对齐 */
  border-top: 1px dashed #efeff5;
  color: #555;
  line-height: 1.6;
  font-size: 13px;
  white-space: pre-wrap; /* 保持后端返回的换行 */
}

/* 激活状态的卡片边框变亮 */
.is-active {
  border-color: #26a67a !important;
  box-shadow: 0 4px 12px rgba(38, 166, 122, 0.08);
}
</style>
