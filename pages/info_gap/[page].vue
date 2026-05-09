<template>
  <div class="info-gap-container">
    <n-alert title="平台风险公告" type="warning" class="notice-bar">
      不良信息、恶法内容将被加入页面名单，严重者封封！警告三次将永久封禁账号！
    </n-alert>

    <div class="top-toolbar">
      <n-space align="center" justify="space-between" style="width: 100%">
        <n-space>
          <n-button type="primary" @click="handlePublish">
            <template #icon
              ><n-icon><Add /></n-icon
            ></template>
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
              <template #icon
                ><n-icon><SearchOutline /></n-icon
              ></template>
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

                <div class="title-section" @click="handleDetail(item.id)">
                  <span class="tag">【{{ item.tag }}】</span>
                  <span class="main-title">{{ item.title }}</span>
                </div>

                <div class="meta-group">
                  <span class="meta-item"
                    ><n-icon><PersonOutline /></n-icon
                    >{{ item.nickname || '匿名' }}</span
                  >
                  <span class="meta-item time"
                    ><n-icon><TimeOutline /></n-icon
                    >{{ formatTime(item.createTime) }}</span
                  >
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
                      {{ item.isFollowed ? '已关注' : '+关注' }}
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
          <n-button type="primary" :loading="btnLoading" @click="confirmPublish"
            >确认发布</n-button
          >
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<!-- 样式实时切换 暂时搞不出来 算了 TODO -->

<script setup>
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

// 1. 初始化查询参数（对应后端的 Page 参数和自定义搜索参数）
const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  type: 'hot', // 排序：hot, latest, follow
  title: '', // 搜索词
});
const showModal = ref(false); // 控制弹窗显示
const btnLoading = ref(false); // 按钮加载状态
const form = reactive({
  title: '',
  tag: '技术',
  content: '',
});
const route = useRoute();

const pending = ref(false); // 加载状态
const error = ref(null); // 错误捕获
const total = ref(0); // 后端返回的总条数
const rows = ref([]); // 列表数据容器
// 2. 加载数据的方法

// 1. 修改加载数据的方法，调用你封装的 useHttpGet
const loadData = async () => {
  console.log('--- 正在请求页码 ---', queryParams.pageNum); // 看这个打印！
  pending.value = true;
  error.value = null;

  try {
    const dynamicKey = `info-gap-list-${queryParams.type}-p${queryParams.pageNum}`; // 加上 pageNum
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
      // 【关键修改】：只在这里赋值一次！
      // 确保 isVoted, goodCount 等字段都在 map 里初始化
      rows.value = (data.value.rows || []).map((row) => ({
        ...row,
        // 确保这些字段存在，Vue 才能追踪它们的变化
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

// 分页数值变化
const handlePageChange = (p) => {
  console.log('正在跳转至页码:', p);
  syncToPage(p);
};

// 展示类型变化
const handleTypeChange = async (value) => {
  queryParams.type = value;
  await syncToPage(1);
};

// 搜索信息时使用
const handleSearch = async () => {
  await syncToPage(1);
};

const getRouteType = () => route.query.type || 'hot';
const getRouteTitle = () =>
    typeof route.query.title === 'string' ? route.query.title : '';
const getRoutePageNum = () => parseInt(route.params.page) || 1;

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

// 2. 修改监听逻辑：监听路由里的页码参数
watch(
  () => route.params.page,
  (newP) => {
    // 只要 URL 里的 page 变了，就同步给请求参数并刷数据
    const p = parseInt(newP) || 1;
    queryParams.pageNum = p;
    queryParams.type = getRouteType();
    queryParams.title = getRouteTitle();
    loadData();
  },
  { immediate: true } // 初始进来时也抓一次
);
// 4. 挂载时立即请求数据
// onMounted(() => {
//   loadData();
// });

// 3. 时间格式化（后端返回的是 2026-03-27T07:48:39，需要美化）
const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const date = new Date(timeStr);
  // 返回格式：03-27 07:48
  return `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date
    .getDate()
    .toString()
    .padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
};

const handleDetail = (id) => navigateTo(`/detail/info_gap/${id}`);
// 1. 点击顶部的绿色按钮打开弹窗
const handlePublish = () => {
  showModal.value = true;
};

// 2. 提交数据到后端
const confirmPublish = async () => {
  if (!form.title || !form.content) {
    const { message } = createDiscreteApi(['message']);
    return message.warning('请填写完整内容');
  }

  btnLoading.value = true;
  try {
    // 调用你封装好的 useHttpPost
    // 注意：后端对应的接口地址记得对齐，假设是 /info_gap/add
    const { data, error: postError } = await useHttpPost(
      'add-info-gap',
      '/info_gap/save',
      {
        body: form, // POST 请求的数据放在 body 里
        $: true, // 强制请求模式
      }
    );

    if (postError.value) throw new Error(postError.value);

    const { message } = createDiscreteApi(['message']);
    message.success('发布成功！');

    // 发布成功后的“收尾”三部曲：
    showModal.value = false; // 1. 关弹窗
    Object.assign(form, { title: '', tag: '技术', content: '' }); // 2. 清空表单
    await syncToPage(1); // 3. 回到第一页并刷新列表
  } catch (err) {
    console.error('发布失败:', err);
  } finally {
    btnLoading.value = false;
  }
};

// 1. 点赞/评价逻辑
const handleVote = async (item, type) => {
  const { message } = createDiscreteApi(['message']);

  // 1. 备份快照（回滚用）
  const oldVoted = item.isVoted;
  const oldCounts = {
    1: item.goodCount,
    2: item.middleCount,
    3: item.badCount,
  };

  // 2. 核心逻辑（只跑一次判断）
  if (oldVoted === type) {
    // 场景 A：取消评价 (点的是同一个按钮)
    updateCount(item, type, -1);
    item.isVoted = 0;
  } else {
    // 场景 B & C：切换评价 或 新增评价
    if (oldVoted !== 0) {
      // 如果之前有旧评价，先把旧的减掉（对应后端 oldColumn - 1）
      updateCount(item, oldVoted, -1);
    }
    // 加上新的（对应后端 currentColumn + 1）
    updateCount(item, type, 1);
    item.isVoted = type;
  }

  // 3. 发送请求
  try {
    const { error } = await useHttpPost('info-vote', '/info_gap/vote', {
      query: { id: item.id, type: type },
      $: true,
    });
    if (error.value) throw new Error(error.value.message || '后端处理失败');
    message.success(item.isVoted === 0 ? '已取消评价' : '评价成功');
  } catch (err) {
    // 4. 异常回滚
    item.isVoted = oldVoted;
    item.goodCount = oldCounts[1];
    item.middleCount = oldCounts[2];
    item.badCount = oldCounts[3];
    message.error('操作失败：' + err.message);
  }
};

// 2. 关注作者逻辑
const handleFollow = async (item) => {
  const { message } = createDiscreteApi(['message']);

  // --- 第一步：UI 瞬间切换（乐观更新） ---
  // 先把原始状态存起来，万一接口挂了我们要回滚
  const originalStatus = item.isFollowed;

  // 直接修改对象属性，Vue 3 的 reactive 会自动追踪
  item.isFollowed = !item.isFollowed;

  try {
    // --- 第二步：静默发送请求 ---
    const { error } = await useHttpPost(
      'info-follow',
      `/info_gap/follow/${item.userId}`,
      { $: true }
    );

    if (error.value) throw error.value;

    // --- 第三步：成功处理 ---
    // 这里千万、千万不要写 loadData()！！
    // 因为 UI 已经变了，后端也成功了，下次刷新自然也是对的。
    message.success(item.isFollowed ? '关注成功' : '已取消关注');
  } catch (err) {
    // --- 第四步：异常回滚 ---
    // 只有请求真的失败了，才把按钮切回去
    item.isFollowed = originalStatus;
    message.error('关注操作失败，请检查网络');
  }
};

const toggleExpand = (item) => {
  item.isExpanded = !item.isExpanded;
};

// 抽取一个辅助函数，省得写那么多 if-else
const updateCount = (item, type, delta) => {
  if (type === 1) item.goodCount += delta;
  if (type === 2) item.middleCount += delta;
  if (type === 3) item.badCount += delta;
};
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
  flex: 1;
  display: flex;
  align-items: center;
  min-width: 0;
  cursor: pointer;
}

.tag {
  font-weight: bold;
  color: #165d69;
  white-space: nowrap;
}

.main-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
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
