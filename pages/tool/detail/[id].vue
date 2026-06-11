<template>
  <LoadingGroup :pending="pending" :error="error">
    <main class="tool-detail-page">
      <div class="top-action-row">
        <button class="back-btn" @click="goBack">返回工具列表</button>
        <button v-if="tool?.id" class="start-use-btn" @click="startUseTool">开始使用本工具</button>
      </div>

      <section v-if="tool" class="detail-hero">
        <div class="info-panel">
          <div class="title-row">
            <div>
              <p class="kicker">Tool Detail</p>
              <h1>{{ tool.toolName }}</h1>
            </div>
            <button class="favorite-btn" :class="{ active: isCollected }" @click.stop.prevent="toggleFavorite">
              {{ isCollected ? '已收藏' : '收藏' }}
            </button>
          </div>

          <p class="description">{{ tool.description || '暂无工具简介。' }}</p>

          <div v-if="tags.length" class="tag-row">
            <span v-for="tag in tags" :key="tag" class="tag-chip">{{ tag }}</span>
          </div>

          <div class="metric-grid">
            <div class="metric-card">
              <span>使用次数</span>
              <strong>{{ tool.totalUsage || 0 }}</strong>
            </div>
            <div class="metric-card">
              <span>收藏数</span>
              <strong>{{ tool.collectionCount || 0 }}</strong>
            </div>
            <div v-if="isPaidTool" class="metric-card">
              <span>剩余次数</span>
              <strong>{{ remainingCountText }}</strong>
            </div>
          </div>

          <div v-if="isPaidTool" class="purchase-row">
            <div class="quota-block">
              <span>当前权益</span>
              <strong>{{ purchasedStatusText }}</strong>
              <em v-if="Number(tool.remainingCount || 0) > 0">还可使用 {{ tool.remainingCount }} 次</em>
            </div>
          </div>
          <div v-else class="purchase-row">
            <div class="quota-block">
              <span>当前权益</span>
              <strong>{{ resourceTypeLabel }}</strong>
            </div>
          </div>
        </div>
      </section>

      <section v-if="tool" class="detail-section">
        <div class="section-title-row">
          <div>
            <p class="section-kicker">Tool Content</p>
            <h2>工具内容</h2>
          </div>
          <a
            v-if="tool.githubUrl"
            class="text-link"
            :href="tool.githubUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>
        <div class="info-grid">
          <div class="info-item">
            <span>资源类型</span>
            <strong>{{ resourceTypeLabel }}</strong>
          </div>
          <div class="info-item">
            <span>好评数</span>
            <strong>{{ tool.goodCount || 0 }}</strong>
          </div>
          <div class="info-item">
            <span>差评数</span>
            <strong>{{ tool.badCount || 0 }}</strong>
          </div>
          <div class="info-item">
            <span>权限等级</span>
            <strong>{{ tool.level || 1 }}</strong>
          </div>
          <div class="info-item">
            <span>更新时间</span>
            <strong>{{ tool.updateTime || tool.createTime || '--' }}</strong>
          </div>
        </div>
      </section>

      <section v-if="tool && isPaidTool" class="detail-section package-section">
        <div class="section-title-row">
          <div>
            <p class="section-kicker">Quota</p>
            <h2>使用次数说明</h2>
          </div>
          <div class="quota-summary">
            <span>剩余次数</span>
            <strong>{{ remainingCountText }}</strong>
          </div>
        </div>

        <div class="empty-packages">
          当前工具不再单独售卖套餐，请前往统一次数购买入口购买使用次数。
          <br>
          单次使用将消耗 {{ tool.quotaCost || 1 }} 工具点数。
        </div>
      </section>
    </main>
  </LoadingGroup>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { createDiscreteApi } from 'naive-ui';
import {
  apiCollectTool,
  apiRemoveCollectTool,
  apiToolDetail,
} from '~/composables/Api/Tool/tool';

const route = useRoute();
const router = useRouter();
const { message } = createDiscreteApi(['message']);

const resourceTypeMap = {
  FREE: '免费',
  CASH_POINT: '消耗工具点数',
  VIP: 'VIP',
  SMALL_CLASS: '小班专属',
  INTERNAL: '内部',
};

const {
  data,
  pending,
  error,
} = await useAsyncData(
  `tool-detail-${route.params.id}`,
  () => apiToolDetail(route.params.id),
  { server: false }
);

const tool = computed(() => data.value?.data || data.value || null);
const isCollected = ref(false);

watch(
  tool,
  (value) => {
    isCollected.value = Number(value?.collectionFlag || 0) === 1;
  },
  { immediate: true }
);

const tags = computed(() => tool.value?.tags || []);
const resourceTypeLabel = computed(() => resourceTypeMap[tool.value?.resourceType] || tool.value?.resourceType || '免费');
const isPaidTool = computed(() => ['CASH_POINT'].includes(tool.value?.resourceType));
const remainingCountText = computed(() => {
  const count = Number(tool.value?.remainingCount || 0);
  return count > 0 ? `${count} 次` : '0 次';
});
const purchasedStatusText = computed(() => Number(tool.value?.remainingCount || 0) > 0 ? '已购买' : '未购买');

function goBack() {
  navigateTo('/tool');
}

function startUseTool() {
  if (!tool.value?.id) return;
  navigateTo({
    path: '/tool',
    query: {
      toolId: String(tool.value.id),
      autoOpen: '1',
    },
  });
}

async function toggleFavorite() {
  const current = tool.value;
  if (!current) return;
  const nextCollected = !isCollected.value;
  const previousCount = Number(current.collectionCount || 0);
  isCollected.value = nextCollected;
  current.collectionFlag = nextCollected ? 1 : 0;
  current.collectionCount = nextCollected ? previousCount + 1 : Math.max(0, previousCount - 1);
  try {
    const res = nextCollected
      ? await apiCollectTool(current.id)
      : await apiRemoveCollectTool(current.id);
    if (res?.code && res.code !== 200) {
      throw new Error(res.msg || '收藏操作失败');
    }
    message.success(nextCollected ? '收藏成功' : '已取消收藏');
  } catch (e) {
    isCollected.value = !nextCollected;
    current.collectionFlag = nextCollected ? 0 : 1;
    current.collectionCount = previousCount;
    message.error(e?.message || '收藏操作失败');
  }
}

useHead(() => ({
  title: tool.value?.toolName ? `${tool.value.toolName} - 工具详情` : '工具详情',
}));
</script>

<style scoped>
.top-action-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.tool-detail-page {
  max-width: 1180px;
  margin: 0 auto;
  padding: 18px 24px 42px;
}
.back-btn {
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: #fff;
  color: #334155;
  border-radius: 8px;
  padding: 8px 14px;
  cursor: pointer;
  font-weight: 600;
}
.start-use-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #18a058;
  background: #18a058;
  color: #ffffff !important;
  border-radius: 8px;
  padding: 8px 14px;
  min-height: 40px;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
}
.back-btn:hover { border-color: #18a058; color: #18a058; }
.start-use-btn:hover { opacity: 0.92; }
.detail-hero {
  display: block;
}
.info-panel,
.detail-section {
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: linear-gradient(150deg, rgba(255,255,255,0.98), rgba(247,250,252,0.94));
  border-radius: 8px;
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.08);
}
.info-panel {
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.kicker {
  margin: 0 0 8px;
  color: #0f766e;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
h1 {
  margin: 0;
  color: #10213a;
  font-size: 34px;
  line-height: 1.2;
}
.favorite-btn {
  border: 0;
  border-radius: 8px;
  padding: 10px 16px;
  background: #eef2f7;
  color: #334155;
  cursor: pointer;
  font-weight: 700;
  white-space: nowrap;
}
.favorite-btn.active {
  background: #fee2e2;
  color: #d03050;
}
.description {
  margin: 0;
  min-height: 56px;
  color: #64748b;
  font-size: 15px;
  line-height: 1.8;
}
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tag-chip {
  max-width: 150px;
  padding: 7px 12px;
  border-radius: 999px;
  background: #e0f2fe;
  color: #0369a1;
  font-size: 13px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.metric-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.metric-card,
.info-item {
  border-radius: 8px;
  background: rgba(241, 245, 249, 0.78);
  padding: 14px;
}
.metric-card span,
.info-item span {
  display: block;
  color: #64748b;
  font-size: 13px;
  margin-bottom: 8px;
}
.metric-card strong,
.info-item strong,
.info-item a {
  color: #10213a;
  font-size: 18px;
  font-weight: 800;
  text-decoration: none;
}
.info-item a.text-link {
  color: #1d4ed8;
  text-decoration: underline;
  text-underline-offset: 4px;
  cursor: pointer;
}
.info-item a.text-link:hover {
  color: #0f766e;
}
.purchase-row {
  margin-top: auto;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
}
.quota-block {
  display: grid;
  gap: 5px;
}
.quota-block span {
  color: #64748b;
  font-size: 13px;
}
.quota-block strong {
  color: #10213a;
  font-size: 24px;
  font-weight: 900;
}
.quota-block em {
  color: #0f766e;
  font-style: normal;
  font-weight: 700;
}
.detail-section {
  margin-top: 22px;
  padding: 24px;
}
.section-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.section-kicker {
  margin: 0 0 6px;
  color: #0f766e;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.detail-section h2 {
  margin: 0;
  color: #10213a;
  font-size: 22px;
}
.info-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.quota-summary {
  min-width: 132px;
  border-radius: 8px;
  background: #ecfdf5;
  padding: 10px 14px;
  text-align: right;
}
.quota-summary span {
  display: block;
  color: #64748b;
  font-size: 12px;
  margin-bottom: 4px;
}
.quota-summary strong {
  color: #047857;
  font-size: 20px;
  font-weight: 900;
}
.package-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}
.package-card {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 8px;
  background: #fff;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.package-card.disabled {
  opacity: 0.58;
}
.package-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}
.package-head h3 {
  margin: 0;
  color: #10213a;
  font-size: 18px;
  line-height: 1.35;
}
.package-status {
  flex: 0 0 auto;
  border-radius: 999px;
  background: #ecfdf5;
  color: #047857;
  padding: 5px 9px;
  font-size: 12px;
  font-weight: 800;
}
.package-card.disabled .package-status {
  background: #f1f5f9;
  color: #64748b;
}
.package-count {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.package-count strong {
  color: #0f172a;
  font-size: 34px;
  font-weight: 900;
}
.package-count span {
  color: #64748b;
  font-weight: 700;
}
.package-price {
  min-height: 31px;
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}
.cash-price {
  color: #ea3f13;
  font-size: 24px;
  font-weight: 900;
}
.point-price {
  color: #7c3aed;
  font-size: 18px;
  font-weight: 900;
}
.free-price {
  color: #0f766e;
  font-size: 22px;
  font-weight: 900;
}
.buy-btn {
  margin-top: auto;
  border: 0;
  border-radius: 8px;
  padding: 11px 14px;
  color: #fff;
  background: #13236f;
  cursor: pointer;
  font-weight: 800;
}
.buy-btn:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
}
.empty-packages {
  border-radius: 8px;
  background: #f8fafc;
  color: #64748b;
  padding: 28px;
  text-align: center;
  font-weight: 700;
}

.purchase-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.purchase-modal-card {
  width: 100%;
  max-width: 560px;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.24);
  overflow: hidden;
}

.purchase-modal-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.purchase-modal-topbar-title {
  font-size: 18px;
  font-weight: 800;
  color: #10213a;
}

.purchase-close-btn {
  border: 0;
  background: transparent;
  font-size: 26px;
  line-height: 1;
  color: #64748b;
  cursor: pointer;
}

.purchase-close-btn:hover {
  color: #0f172a;
}

.purchase-modal-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px;
}

.purchase-modal-head {
  text-align: center;
}

.purchase-modal-title {
  font-size: 20px;
  font-weight: 800;
  color: #10213a;
}

.purchase-modal-desc {
  margin-top: 6px;
  color: #64748b;
  line-height: 1.7;
}

.purchase-modal-subtitle {
  font-size: 15px;
  font-weight: 800;
  color: #10213a;
  margin-bottom: 12px;
}

.purchase-modal-block {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 8px;
  background: #fff;
  padding: 16px;
}

.purchase-modal-block.compact {
  padding-top: 12px;
  padding-bottom: 12px;
}

.channel-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.channel-card {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 10px;
  background: #fff;
  padding: 14px 16px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.channel-card:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.channel-card.active {
  border-color: #18a058;
  box-shadow: 0 0 0 3px rgba(24, 160, 88, 0.12);
  background: #f3fff8;
}

.channel-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.channel-icon {
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  object-fit: contain;
}

.channel-name {
  display: block;
  color: #10213a;
  font-size: 16px;
  font-weight: 800;
}

.channel-tip {
  display: block;
  margin-top: 6px;
  color: #64748b;
  font-size: 13px;
}

.purchase-summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  color: #475569;
}

.purchase-summary-row:last-child {
  margin-bottom: 0;
}

.purchase-summary-row strong {
  color: #10213a;
}

.purchase-qrcode-wrap {
  margin-top: 14px;
  display: flex;
  justify-content: center;
}

.purchase-qrcode-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 8px 0 4px;
}

.purchase-qrcode {
  width: 180px;
  height: 180px;
  border-radius: 8px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: #fff;
  object-fit: contain;
}

.purchase-qrcode-tip {
  margin: 0;
  color: #475569;
  font-size: 13px;
}

.purchase-qrcode-notice {
  width: 100%;
  padding: 12px 16px;
  border-radius: 12px;
  background: #fff7ed;
  border: 1px solid rgba(249, 115, 22, 0.18);
  text-align: center;
  box-sizing: border-box;
}

.purchase-qrcode-notice p {
  margin: 0;
  color: #9a3412;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.7;
}

.purchase-qrcode-notice p + p {
  margin-top: 4px;
}

.purchase-closed-banner {
  width: 100%;
  padding: 12px 16px;
  border-radius: 12px;
  background: #fef2f2;
  border: 1px solid rgba(220, 38, 38, 0.2);
  color: #b91c1c;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.6;
  text-align: center;
  box-sizing: border-box;
}

.purchase-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.purchase-action-btn {
  border: 0;
  border-radius: 10px;
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s ease;
}

.purchase-action-btn:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.purchase-action-btn.primary {
  background: #13236f;
  color: #fff;
}

.purchase-action-btn.primary:hover:not(:disabled) {
  background: #1d2f8a;
}

.purchase-action-btn.ghost {
  background: #f8fafc;
  color: #334155;
}

.purchase-action-btn.ghost.danger {
  color: #dc2626;
}

@media (max-width: 640px) {
  .channel-grid {
    grid-template-columns: 1fr;
  }
  .purchase-overlay {
    padding: 12px;
  }
  .purchase-modal-card {
    max-width: 100%;
  }
}

@media (max-width: 980px) {
  .tool-detail-page {
    padding: 14px 14px 32px;
  }
  .metric-grid,
  .info-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .package-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .title-row,
  .purchase-row,
  .section-title-row {
    flex-direction: column;
    align-items: stretch;
  }
  h1 {
    font-size: 26px;
  }
  .metric-grid,
  .info-grid,
  .package-grid {
    grid-template-columns: 1fr;
  }
  .quota-summary {
    text-align: left;
  }
}
</style>
