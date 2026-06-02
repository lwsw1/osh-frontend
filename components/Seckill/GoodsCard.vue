<template>
  <div class="seckill-card" :class="{ selected }" @click="handleCardClick">
    <!-- 勾选框（仅选择模式下显示） -->
    <div class="card-checkbox" v-if="selectable" @click.stop="$emit('toggle', item.id)">
      <div class="checkbox" :class="{ checked: selected }">
        <svg v-if="selected" width="10" height="10" viewBox="0 0 12 12" fill="none">
          <polyline points="2,6 5,9 10,3" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>

    <!-- 封面 -->
    <div class="card-cover" :class="item.goodsType === 2 ? 'cover-book' : 'cover-course'">
      <img :src="item.cover || 'https://placehold.co/400x200/f5f5f5/bbb?text=暂无封面'" :alt="item.title" loading="lazy" @error="onImgError" />
      <div class="quota-badge" v-if="item.totalStock > 0">🔥 限量{{ item.totalStock }}名</div>
      <div class="quota-badge unlimited" v-else>∞ 不限量</div>
      <!-- 售罄遮罩 -->
      <div class="soldout-mask" v-if="btnState === 'soldout'">
        <span class="soldout-text">已售罄</span>
      </div>
    </div>

    <!-- 内容区 -->
    <div class="card-body">
      <h4 class="card-title">{{ item.title }}</h4>

      <!-- 类型标签 -->
      <div class="card-meta">
        <span class="type-tag" :class="`type-${item.goodsType}`">
          {{ item.goodsType === 1 ? '课程' : item.goodsType === 2 ? '电子书' : '商品' }}
        </span>
        <span class="meta-divider">|</span>
        <span>限购 {{ item.limitPerUser > 0 ? item.limitPerUser + '件' : '不限' }}</span>
      </div>

      <!-- 资源编号 -->
      <div class="card-no" v-if="item.no">编号：{{ item.no }}</div>

      <!-- 标签 -->
      <div class="card-tags" v-if="item.tagNames && item.tagNames.length">
        <span class="card-tag" v-for="tag in item.tagNames" :key="tag">{{ tag }}</span>
      </div>

      <div class="card-divider" />

      <!-- 价格区 -->
      <div class="card-price">
        <span class="price-original">¥{{ item.originPrice }}</span>
        <span class="price-seckill">秒杀价 ¥{{ item.seckillPrice }}</span>
      </div>

      <!-- 名额进度条 -->
      <SeckillQuotaBar
        :quota="item.totalStock"
        :sold-count="item.soldCount"
      />

      <!-- 抢购按钮 -->
      <button
        class="buy-btn"
        :class="btnClass"
        :disabled="btnState === 'pending'"
        @click.stop="selectable ? $emit('toggle', item.id) : handleBuy()"
      >{{ btnText }}</button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  item:       { type: Object,  required: true },
  session:    { type: Object,  default: () => ({}) },
  selected:   { type: Boolean, default: false },
  selectable: { type: Boolean, default: false },
})
const emit = defineEmits(['click', 'buy', 'toggle'])

// 按钮状态（基于 availableStock 判断是否售罄）
// 注意：不再用 is_purchased 永久禁用按钮
// 新版支持累计购买，用户支付成功后只要还有剩余限购额度就可以继续购买
const btnState = computed(() => {
  // totalStock=0 表示不限量，availableStock=0 且 totalStock>0 表示售罄
  if (props.item.totalStock > 0 && props.item.availableStock <= 0) return 'soldout'
  return 'active'
})

const btnText = computed(() => {
  switch (btnState.value) {
    case 'soldout': return `¥${props.item.originPrice} 原价购买`
    default:        return '立即抢购'
  }
})

const btnClass = computed(() => ({
  'btn-active':  btnState.value === 'active',
  'btn-pending': btnState.value === 'pending',
  'btn-soldout': btnState.value === 'soldout',
}))

function handleBuy() { emit('buy', props.item) }

// 选择模式下点卡片 = 勾选；普通模式下 = 跳转
function handleCardClick() {
  if (props.selectable) {
    emit('toggle', props.item.id)
  } else {
    emit('click', props.item)
  }
}
</script>

<style scoped>
.seckill-card {
  background: #fff;
  border: 1.5px solid #ebebeb;
  border-radius: 8px;
  overflow: visible;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}
.seckill-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  border-color: #e1251b;
}
.seckill-card.selected {
  border-color: #e1251b;
  box-shadow: 0 0 0 2px rgba(225,37,27,0.15);
}

/* 勾选框 */
.card-checkbox {
  position: absolute;
  top: -8px;
  left: -8px;
  z-index: 10;
}
.checkbox {
  width: 18px; height: 18px;
  border-radius: 4px;
  border: 2px solid #ddd;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  cursor: pointer;
}
.checkbox:hover { border-color: #e1251b; }
.checkbox.checked {
  background: #e1251b;
  border-color: #e1251b;
}

/* 封面 */
.card-cover {
  position: relative;
  overflow: hidden;
  background: #f5f5f5;
  border-radius: 6px 6px 0 0;
}
.cover-course { height: 100px; }
.cover-book   { height: 120px; }
.card-cover img { width: 100%; height: 100%; object-fit: cover; }

.quota-badge {
  position: absolute;
  top: 0; left: 0;
  background: #e1251b;
  color: #fff;
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 0 0 6px 0;
  font-weight: 600;
}
.quota-badge.unlimited {
  background: #22c55e;
}
/* 售罄遮罩 */
.soldout-mask {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px 6px 0 0;
}
.soldout-text {
  color: #fff;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 4px;
  text-shadow: 0 1px 4px rgba(0,0,0,0.5);
}

/* 内容 */
.card-body { padding: 8px 10px 10px; }
.card-title {
  font-size: 12px;
  font-weight: 600;
  color: #333;
  margin: 0 0 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
  height: 34px;
}
.card-meta {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: #999;
  margin-bottom: 2px;
}
.meta-divider { color: #ddd; }
.card-info { font-size: 11px; color: #999; margin-bottom: 4px; }
.card-no   { font-size: 11px; color: #bbb; margin-top: 2px; margin-bottom: 2px; }
.card-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; margin-bottom: 2px; }
.card-tag  {
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(14, 165, 233, 0.1);
  color: #0369a1;
  font-size: 10px;
  font-weight: 600;
}
.info-divider { margin: 0 3px; color: #ddd; }
.card-divider { height: 1px; background: #f5f5f5; margin: 5px 0; }

.card-price {
  display: flex;
  align-items: baseline;
  gap: 5px;
  margin-bottom: 4px;
}
.price-original { font-size: 11px; color: #bbb; text-decoration: line-through; }
.price-seckill  { font-size: 15px; font-weight: 800; color: #e1251b; }

.buy-btn {
  width: 100%;
  padding: 6px 0;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  margin-top: 6px;
  transition: all 0.15s;
}
.btn-active    { background: #e1251b; color: #fff; }
.btn-active:hover { background: #c0392b; }
.btn-pending   { background: #f5f5f5; color: #bbb; cursor: not-allowed; }
.btn-soldout   { background: #f5f5f5; color: #888; border: 1px solid #e5e5e5; font-size: 11px; }
.btn-soldout:hover { background: #eee; }
.btn-purchased { background: #fff8f0; color: #e1251b; border: 1px solid #ffd0cc; }
</style>

<style>
/* ===== 商品卡片 · 太空风格 ===== */
[data-theme="space"] .seckill-card {
  background: #0d1117 !important;
  border-color: rgba(48,54,61,0.8) !important;
}
[data-theme="space"] .seckill-card:hover {
  box-shadow: 0 4px 16px rgba(88,166,255,0.12) !important;
  border-color: #58a6ff !important;
}
[data-theme="space"] .seckill-card.selected {
  border-color: #58a6ff !important;
  box-shadow: 0 0 0 2px rgba(88,166,255,0.2) !important;
}
[data-theme="space"] .card-cover {
  background: #161b22 !important;
}
[data-theme="space"] .card-title {
  color: #e6edf3 !important;
}
[data-theme="space"] .card-meta {
  color: #484f58 !important;
}
[data-theme="space"] .card-no {
  color: #484f58 !important;
}
[data-theme="space"] .card-tag {
  background: rgba(88, 166, 255, 0.1) !important;
  color: #58a6ff !important;
}
[data-theme="space"] .meta-divider {
  color: rgba(48,54,61,0.8) !important;
}
[data-theme="space"] .card-divider {
  background: rgba(48,54,61,0.8) !important;
}
[data-theme="space"] .price-original {
  color: #484f58 !important;
}
[data-theme="space"] .price-seckill {
  color: #79c0ff !important;
}
[data-theme="space"] .btn-active {
  background: linear-gradient(135deg, #1d4ed8, #0ea5e9) !important;
}
[data-theme="space"] .btn-active:hover {
  background: linear-gradient(135deg, #1e40af, #0284c7) !important;
}
[data-theme="space"] .btn-pending {
  background: #161b22 !important;
  color: #484f58 !important;
}
[data-theme="space"] .btn-soldout {
  background: #161b22 !important;
  color: #484f58 !important;
  border-color: rgba(48,54,61,0.8) !important;
}
[data-theme="space"] .btn-soldout:hover {
  background: #1c2128 !important;
}
[data-theme="space"] .btn-purchased {
  background: #0d1f3c !important;
  color: #58a6ff !important;
  border-color: rgba(88,166,255,0.25) !important;
}
[data-theme="space"] .checkbox {
  background: #161b22 !important;
  border-color: rgba(48,54,61,0.8) !important;
}
[data-theme="space"] .checkbox:hover {
  border-color: #58a6ff !important;
}
[data-theme="space"] .checkbox.checked {
  background: #1d4ed8 !important;
  border-color: #1d4ed8 !important;
}
</style>
