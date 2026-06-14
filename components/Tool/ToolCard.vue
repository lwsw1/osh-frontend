<template>
  <div class="tool-card" :class="{ selected }" @click="handleCardClick">
    <div v-if="selectable" class="select-check" @click.stop="$emit('select', item.id)">
      <span class="check-icon">{{ selected ? '✓' : '' }}</span>
    </div>

    <div class="card-cover">
      <div class="tool-initial">{{ toolInitial }}</div>
      <span class="resource-badge" :class="resourceBadgeClass">{{ resourceTypeLabel }}</span>
      <div class="fav-btn" @click.stop="handleFavorite">
        <n-icon size="18" :color="item.isFavorite ? '#d03050' : 'rgba(255,255,255,0.88)'">
          <Heart v-if="item.isFavorite" />
          <HeartOutline v-else />
        </n-icon>
      </div>
    </div>

    <div class="card-body">
      <h4 class="card-title">{{ item.toolName }}</h4>
      <p class="card-desc">{{ item.description || '在线工具' }}</p>
      <div class="tag-row">
        <span v-for="tag in visibleTags" :key="tag" class="tag-chip">{{ tag }}</span>
      </div>
      <div class="card-stats">
        <div class="price-area">
          <span v-if="Number(item.price) > 0" class="price-paid">¥{{ item.price }}</span>
          <span v-else class="price-free">免费</span>
        </div>
        <div class="stats-right">
          <span>{{ item.totalUsage || 0 }} 次使用</span>
          <span class="fav-count">
            <n-icon size="12"><HeartOutline /></n-icon>
            {{ item.collectionCount || item.favoriteCount || 0 }}
          </span>
        </div>
      </div>
      <div class="rating-bar">
        <div class="bar-good" :style="{ width: ratingWidth }" />
        <div class="bar-mid" :style="{ width: item.neutralCount > 0 ? '10%' : '0' }" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { NIcon } from 'naive-ui';
import { Heart, HeartOutline } from '@vicons/ionicons5';

const props = defineProps({
  item: { type: Object, required: true },
  selectable: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
});
const emit = defineEmits(['click', 'favorite', 'select']);

const visibleTags = computed(() => (props.item.tags || []).slice(0, 2));
const toolInitial = computed(() => (props.item.toolName || '工').slice(0, 1));
const resourceTypeMap = {
  FREE: '免费',
  CASH_POINT: '消耗工具点数',
  VIP: 'VIP',
  SMALL_CLASS: '小班',
  INTERNAL: '内部',
};
const resourceTypeLabel = computed(() => resourceTypeMap[props.item.resourceType] || props.item.resourceType || '免费');
const resourceBadgeClass = computed(() => {
  const type = props.item.resourceType || 'FREE';
  return {
    free: type === 'FREE',
    paid: type === 'CASH_POINT',
    vip: type === 'VIP' || type === 'SMALL_CLASS' || type === 'INTERNAL',
  };
});
const ratingWidth = computed(() => {
  const good = Number(props.item.goodCount || 0);
  const bad = Number(props.item.badCount || 0);
  const total = good + bad + Number(props.item.neutralCount || 0);
  if (total <= 0) return '78%';
  return Math.max(8, Math.round((good / total) * 100)) + '%';
});

const handleFavorite = () => emit('favorite', props.item.id);
const handleCardClick = () => {
  if (props.selectable) {
    emit('select', props.item.id);
  } else {
    emit('click');
  }
};
</script>

<style scoped>
.tool-card {
  background: #fff;
  border: 1px solid #efeff5;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}
.tool-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.1);
  border-color: #18a058;
}
.tool-card.selected {
  border: 2px solid #d03050;
  box-shadow: 0 0 0 2px rgba(208,48,80,0.15);
}
.select-check {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(0,0,0,0.35);
  border: 2px solid #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: all 0.15s;
}
.tool-card.selected .select-check {
  background: #d03050;
  border-color: #d03050;
}
.check-icon { color: #fff; font-size: 13px; font-weight: 700; line-height: 1; }
.card-cover {
  position: relative;
  height: 120px;
  background: linear-gradient(135deg, #ecfdf5, #eef2ff);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tool-initial {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: #fff;
  color: #047857;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: 800;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
}
.resource-badge {
  position: absolute;
  left: 10px;
  bottom: 10px;
  max-width: calc(100% - 20px);
  padding: 5px 9px;
  border-radius: 999px;
  color: #10213a;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  backdrop-filter: blur(12px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.14);
}
.resource-badge.free { background: rgba(187, 247, 208, 0.92); }
.resource-badge.paid { background: rgba(254, 240, 138, 0.94); }
.resource-badge.vip {
  color: #f8fafc;
  background: rgba(79, 70, 229, 0.86);
}
.fav-btn {
  position: absolute; top: 8px; right: 8px;
  width: 28px; height: 28px;
  background: rgba(0,0,0,0.3); border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.2s; backdrop-filter: blur(2px);
}
.fav-btn:hover { background: rgba(0,0,0,0.5); transform: scale(1.1); }
.card-body { padding: 10px 10px 8px; }
.card-title {
  font-size: 13px; font-weight: 600; color: #222;
  margin: 0 0 5px; height: 18px; line-height: 18px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.card-desc {
  margin: 0 0 7px;
  color: #777;
  font-size: 11px;
  height: 30px;
  line-height: 15px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.tag-row {
  height: 20px;
  display: flex;
  gap: 5px;
  overflow: hidden;
  margin-bottom: 7px;
}
.tag-chip {
  max-width: 86px;
  padding: 2px 7px;
  border-radius: 999px;
  background: #eef7f1;
  color: #18a058;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card-stats { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.price-paid { color: #d03050; font-weight: 700; font-size: 14px; }
.price-free { color: #18a058; font-weight: 700; font-size: 14px; }
.stats-right { display: flex; align-items: center; gap: 8px; color: #999; font-size: 11px; }
.fav-count { display: flex; align-items: center; gap: 2px; }
.rating-bar { height: 3px; display: flex; border-radius: 2px; overflow: hidden; background: #eee; }
.bar-good { background: #18a058; }
.bar-mid { background: #f0a020; }
</style>
