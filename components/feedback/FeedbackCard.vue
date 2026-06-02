<template>
  <div
    class="feedback-card"
    :class="{ pinned: pinned }"
    @click="$emit('click', item.id)"
  >
    <div v-if="pinned" class="pin-badge">置顶{{ item.pinOrder }}</div>
    <div class="card-header">
      <span class="category-icon">{{ resolveFeedbackCategoryIcon(item) }}</span>
      <span class="category-name">{{ item.categoryName }}</span>
    </div>
    <FeedbackStatusPopover :item="item" @updated="$emit('updated')">
      <template #trigger>
        <span
          class="status-badge"
          :class="{
            'status-PENDING': item.status === 'PENDING',
            'status-TRIAGED': item.status === 'TRIAGED',
            'status-PROCESSING': item.status === 'PROCESSING',
            'status-PENDING_CONFIRM': item.status === 'PENDING_CONFIRM',
            'status-RESOLVED': item.status === 'RESOLVED',
            'status-REOPENED': item.status === 'REOPENED',
            'status-CLOSED': item.status === 'CLOSED',
            'status-REJECTED': item.status === 'REJECTED'
          }"
          @click.stop
        >
          {{ statusChipText }}
        </span>
      </template>
    </FeedbackStatusPopover>
    <h3 class="card-title">{{ item.title }}</h3>
    <div v-if="item.tags?.length" class="tag-row">
      <span v-for="tag in item.tags" :key="tag.id" class="feedback-tag">{{ tag.name }}</span>
    </div>
    <p class="card-content">
      {{ item.contentPreview || '' }}{{ item.contentPreview ? '...' : '' }}
    </p>
    <div class="card-footer">
      <span class="footer-user">👤 {{ resolvedUserName }}</span>
      <div class="card-footer-right">
        <div class="card-footer-stats">
          <span class="stat-chip" title="浏览数">
            <span class="stat-icon">📖</span>{{ item.viewCount || 0 }}
          </span>
          <span class="stat-chip" title="点赞数">
            <span class="stat-icon">👍</span>{{ item.likeCount || 0 }}
          </span>
          <span class="stat-chip" title="收藏数">
            <span class="stat-icon">⭐</span>{{ item.favoriteCount || 0 }}
          </span>
        </div>
        <span class="footer-time">{{ resolvedTime }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 反馈卡片组件
 * - 同时承载"置顶卡片"与"普通卡片":通过 pinned prop 切换边框 / 背景 / 角标
 * - 点击整张卡片向父级 emit('click', id) 由父级负责跳转,保持组件无路由耦合
 */
import { computed } from 'vue'
import FeedbackStatusPopover from '~/components/feedback/FeedbackStatusPopover.vue'
import {
  resolveFeedbackCategoryIcon,
  resolveFeedbackStatusText
} from '~/composables/assistant'

const props = defineProps({
  /** 反馈条目数据,字段沿用列表接口返回结构 */
  item: {
    type: Object,
    required: true
  },
  /** 是否为置顶样式（额外渲染 pin-badge 与置顶配色） */
  pinned: {
    type: Boolean,
    default: false
  }
})

defineEmits(['click', 'updated'])

const user = useUser()

/** 当前登录用户是否是该工单的提交人 */
const isSubmitter = computed(() => {
  const currentUserId = user.value?.id || user.value?.userId || user.value?.uid
  return !!currentUserId && String(currentUserId) === String(props.item?.userId)
})

const resolvedUserName = computed(() =>
  props.item?.userName || `用户${props.item?.userId || ''}`
)

const resolvedTime = computed(() => formatTime(props.item?.createTime))
const statusSignalText = computed(() => {
  const status = props.item?.status
  if (status === 'PENDING_CONFIRM') {
    // 提交人看到"待你确认"，其他人看到"待用户确认"，避免误导
    return isSubmitter.value ? '待你确认' : '待用户确认'
  }
  if (status === 'TRIAGED') {
    return '已受理'
  }
  if (status === 'PROCESSING') {
    return buildProcessingDayText(props.item?.createTime, '处理中')
  }
  if (status === 'REOPENED') {
    return buildProcessingDayText(props.item?.createTime, '重新处理中')
  }
  return resolveFeedbackStatusText(status)
})
// badge 文本复用状态信号语义，避免二次拼接产生重复文本
const statusChipText = computed(() => statusSignalText.value)

/** 相对时间格式化:今天 / 昨天 / N 天前 / 具体日期 */
function formatTime(time) {
  if (!time) return ''
  const date = new Date(time)
  const now = new Date()
  const diff = now - date
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`

  return date.toLocaleDateString('zh-CN')
}

function buildProcessingDayText(time, prefix = '处理中') {
  if (!time) {
    return prefix
  }
  const startTime = new Date(time)
  const now = new Date()
  const days = Math.max(1, Math.floor((now - startTime) / (1000 * 60 * 60 * 24)) + 1)
  return `${prefix} Day${days}`
}
</script>

<style scoped>
.feedback-card {
  display: flex;
  flex-direction: column;
  height: 232px;
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  position: relative;
}

.feedback-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.feedback-card.pinned {
  border: 2px solid #ff9800;
  background: linear-gradient(135deg, #fff 0%, #fff8f0 100%);
  padding: 14px;
}

.pin-badge {
  display: inline-block;
  background: #ff9800;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  margin-bottom: 8px;
}

.card-header {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 6px;
  height: 26px;
  margin-bottom: 8px;
  overflow: hidden;
}

.category-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.category-name {
  font-size: 14px;
  font-weight: 500;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.status-PENDING {
  background: #eff6ff;
  color: #1d4ed8;
}

.status-TRIAGED {
  background: #eff6ff;
  color: #1d4ed8;
}

.status-PROCESSING {
  background: #eff6ff;
  color: #1d4ed8;
}

.status-PENDING_CONFIRM {
  background: #eff6ff;
  color: #1d4ed8;
}

.status-RESOLVED {
  background: #eff6ff;
  color: #1d4ed8;
}

.status-REOPENED {
  background: #eff6ff;
  color: #1d4ed8;
}

.status-CLOSED {
  background: #f1f5f9;
  color: #64748b;
}

.status-REJECTED {
  background: #f1f5f9;
  color: #64748b;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
  height: 22px;
  line-height: 22px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-right: 80px;
}

.tag-row {
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  height: 24px;
  margin: 0 0 8px 0;
  overflow: hidden;
}

.feedback-tag {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 12px;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 13px;
  line-height: 1;
  flex-shrink: 0;
  max-width: 120px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-content {
  /*
   * 用 -webkit-line-clamp 截断 2 行;同时用 max-height 做物理裁剪兜底,
   * 防止在 flex 子项内 line-clamp 偶发失效时第 3 行半截字漏出。
   * line-height 1.55 × font-size 13px × 2 行 ≈ 40.3px
   */
  flex: 1 1 auto;
  min-height: 0;
  max-height: calc(13px * 1.55 * 2);
  font-size: 13px;
  color: #6b7280;
  line-height: 1.55;
  margin: 0 0 10px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-word;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  flex-shrink: 0;
  gap: 8px;
}

.card-footer-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.footer-user {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: #6b7280;
}

.footer-time {
  color: #9ca3af;
  flex-shrink: 0;
  font-size: 12px;
  white-space: nowrap;
}

.card-footer-stats {
  display: flex;
  gap: 4px;
  flex-wrap: nowrap;
  align-items: center;
}

.stat-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #4b5563;
  font-size: 11px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.stat-chip .stat-icon {
  font-size: 12px;
}
</style>
