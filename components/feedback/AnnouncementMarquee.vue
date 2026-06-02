<template>
  <div v-if="items.length > 0" class="announcement-bar">
    <div class="announcement-label">
      <span class="announcement-label-icon">{{ labelIcon }}</span>
      <span>{{ label }}</span>
    </div>
    <div class="announcement-scroll-wrap">
      <div
        class="announcement-scroll-track"
        :class="{ 'is-static': items.length < 2 }"
        :style="{ animationPlayState: paused ? 'paused' : 'running' }"
        @mouseenter="paused = true"
        @mouseleave="paused = false"
      >
        <span
          v-for="(item, idx) in duplicatedItems"
          :key="`${item.id}-${idx}`"
          class="announcement-item"
        >
          <span class="announcement-dot" :style="{ background: resolveDotColor(idx) }"></span>
          {{ item.title }}
          <span class="announcement-sep">｜</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 公告跑马灯组件
 * - 纯文本展示,不可点击,不向父级 emit 事件,与"反馈详情"等任何路由解耦
 * - items.length >= 2 时复制一份实现无缝水平滚动;<2 条时关闭动画
 * - 鼠标悬停时暂停滚动,移开恢复
 * - 通过 label / labelIcon 切换"公告 / 动态"两种风格
 */
import { computed, ref } from 'vue'

const props = defineProps({
  /** 公告条目数组,每项至少包含 id / title 字段 */
  items: {
    type: Array,
    default: () => []
  },
  /** 左侧标签文案 */
  label: {
    type: String,
    default: '公告'
  },
  /** 左侧标签 emoji */
  labelIcon: {
    type: String,
    default: '📢'
  },
  /** 自定义 dot 颜色循环,未传则用默认 6 色 */
  dotColors: {
    type: Array,
    default: () => ['#6366f1', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899']
  }
})

const paused = ref(false)

const duplicatedItems = computed(() =>
  props.items.length >= 2 ? [...props.items, ...props.items] : props.items
)

function resolveDotColor(index) {
  return props.dotColors[index % props.dotColors.length]
}
</script>

<style scoped>
.announcement-bar {
  display: flex;
  align-items: center;
  height: 40px;
  margin-bottom: 24px;
  padding: 0 12px 0 0;
  background: linear-gradient(90deg, #fef9c3 0%, #fef3c7 40%, #fce7f3 100%);
  border: 1.5px solid #fbbf24;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(251, 191, 36, 0.15);
  overflow: hidden;
  animation: feedback-notice-in 0.5s ease both;
}

@keyframes feedback-notice-in {
  from { opacity: 0; transform: translateY(-100%); }
  to   { opacity: 1; transform: translateY(0); }
}

.announcement-label {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px 4px 10px;
  background: linear-gradient(135deg, #f59e0b, #f97316);
  border-radius: 0 8px 8px 0;
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  white-space: nowrap;
  flex-shrink: 0;
  margin-right: 16px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  box-shadow: 2px 0 12px rgba(249, 115, 22, 0.35);
  animation: feedback-notice-label-pulse 3s ease-in-out infinite;
}

@keyframes feedback-notice-label-pulse {
  0%, 100% { box-shadow: 2px 0 12px rgba(249, 115, 22, 0.35); }
  50%      { box-shadow: 2px 0 20px rgba(249, 115, 22, 0.6); }
}

.announcement-label-icon {
  font-size: 14px;
}

.announcement-scroll-wrap {
  flex: 1;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  overflow: hidden;
}

.announcement-scroll-track {
  display: flex;
  align-items: center;
  white-space: nowrap;
  animation: feedback-notice-scroll 32s linear infinite;
}

.announcement-scroll-track.is-static {
  animation: none;
}

@keyframes feedback-notice-scroll {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.announcement-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  padding-right: 8px;
  cursor: default;
  user-select: none;
}

.announcement-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  animation: feedback-notice-dot-blink 2s ease-in-out infinite;
}

@keyframes feedback-notice-dot-blink {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.5; transform: scale(1.4); }
}

.announcement-sep {
  color: #d97706;
  margin: 0 16px 0 8px;
  font-size: 14px;
  opacity: 0.5;
}
</style>
