<template>
  <n-popover
    :delay="100"
    trigger="hover"
    placement="bottom"
    :show-arrow="false"
    @update:show="handleShowChange"
  >
    <template #trigger>
      <div class="popover-trigger">
        <slot name="trigger" />
      </div>
    </template>

    <div class="status-popover">
      <div class="status-progress">
        <div
          v-for="(step, index) in displaySteps"
          :key="step.value"
          class="progress-step"
          :class="{
            'is-completed': currentStepIndex > index,
            'is-active': currentStepIndex === index
          }"
        >
          <div class="step-marker" />
          <div class="step-label">{{ step.label }}</div>
          <div class="step-time">{{ resolveStepTime(step.value) }}</div>
        </div>
      </div>

      <div class="current-card">
        <div class="current-card-head">
          <span class="current-title">{{ currentStatusText }}</span>
          <span class="current-owner">{{ currentHandlerText }}</span>
        </div>
        <div class="current-deadline">{{ currentDeadlineText }}</div>
      </div>

      <div v-if="canConfirmPending" class="confirm-actions">
        <n-button size="small" type="primary" :loading="confirming" @click.stop="handleConfirmResolved">
          问题已解决
        </n-button>
        <n-button size="small" :loading="confirming" @click.stop="handleConfirmReopened">
          问题仍在
        </n-button>
      </div>

      <div v-if="pendingConfirmHint" class="confirm-hint">{{ pendingConfirmHint }}</div>

      <div class="recent-events">
        <div class="events-title">最近事件</div>
        <div v-if="loading" class="events-loading">
          <n-spin size="small" />
        </div>
        <div v-else class="event-list">
          <div v-for="event in recentEvents" :key="event.key" class="event-item">
            <span
              class="event-dot"
              :class="{
                'tone-status': event.type === 'status',
                'tone-pending': event.type === 'pending',
                'tone-resolved': event.type === 'resolved',
                'tone-reopen': event.type === 'reopen',
                'tone-closed': event.type === 'closed'
              }"
            />
            <div class="event-body">
              <div class="event-text">{{ event.text }}</div>
              <div class="event-time">{{ event.time }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </n-popover>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useMessage, NPopover, NButton, NSpin } from 'naive-ui'
import {
  apiConfirmFeedbackStatus,
  apiGetFeedbackStatusSummary,
  assertAssistantResponseSuccess,
  FEEDBACK_STATUS_CONFIG,
  resolveFeedbackStatusText,
  resolveFeedbackStatusSlaHours,
  resolveFeedbackStatusTone,
  resolveFeedbackStatusStepIndex,
  resolveFeedbackErrorMessage
} from '~/composables/assistant'

const props = defineProps({
  item: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['updated'])

const message = useMessage()
const user = useUser()
const loading = ref(false)
const confirming = ref(false)
const detail = ref(null)
const DEFAULT_PENDING_CONFIRM_WINDOW_DAYS = 7

// 进度条节点：从配置中提取主流程节点（stepIndex >= 0），去重后按顺序排列
const displaySteps = Object.entries(FEEDBACK_STATUS_CONFIG)
  .filter(([, cfg]) => cfg.stepIndex >= 0)
  .reduce((acc, [value, cfg]) => {
    if (!acc.some(s => s.stepIndex === cfg.stepIndex)) {
      acc.push({ label: cfg.label, value, stepIndex: cfg.stepIndex })
    }
    return acc
  }, [])
  .sort((a, b) => a.stepIndex - b.stepIndex)

const currentStatus = computed(() => detail.value?.status || props.item?.status)
const currentStatusText = computed(() => {
  // PENDING_CONFIRM 对提交人显示"待你确认"，对其他人显示"待用户确认"
  if (currentStatus.value === 'PENDING_CONFIRM') {
    return isSubmitter.value ? '待你确认' : '待用户确认'
  }
  return resolveFeedbackStatusText(currentStatus.value)
})
const currentStepIndex = computed(() => resolveFeedbackStatusStepIndex(currentStatus.value))
const currentHandlerText = computed(() => detail.value?.handlerName || props.item?.handlerName || '待处理团队')
const currentDeadlineText = computed(() => {
  const baseTime = resolveCurrentStageTime()
  if (!baseTime) {
    return 'SLA 预计时间待计算'
  }
  const deadline = new Date(baseTime.getTime() + resolveSlaHours() * 60 * 60 * 1000)
  return `预计完成时间：${formatAbsoluteTime(deadline)}`
})
const currentUserId = computed(() => user.value?.id || user.value?.userId || user.value?.uid)
const isSubmitter = computed(() => !!currentUserId.value && String(currentUserId.value) === String(detail.value?.userId || props.item?.userId))
const canConfirmPending = computed(() => isSubmitter.value && currentStatus.value === 'PENDING_CONFIRM')
const stageTimeMap = computed(() => {
  const processRecords = detail.value?.processRecords || []
  const result = {}
  processRecords.forEach(record => {
    if (!record?.toStatus || !record?.createTime || result[record.toStatus]) {
      return
    }
    result[record.toStatus] = record.createTime
  })
  return result
})
const pendingConfirmHint = computed(() => {
  if (currentStatus.value !== 'PENDING_CONFIRM') {
    return ''
  }
  const pendingConfirmTime = stageTimeMap.value.PENDING_CONFIRM
  if (!pendingConfirmTime) {
    return `请在 ${DEFAULT_PENDING_CONFIRM_WINDOW_DAYS} 天内确认，否则系统将自动确认为已解决`
  }
  const leftDays = Math.max(0, DEFAULT_PENDING_CONFIRM_WINDOW_DAYS - diffDays(new Date(pendingConfirmTime), new Date()))
  return `请在 ${leftDays} 天内确认，否则系统将自动确认为已解决`
})
const recentEvents = computed(() => {
  const processRecords = detail.value?.processRecords || []
  if (!processRecords.length) {
    return [{
      key: `create-${props.item.id}`,
      type: 'status',
      text: '工单已提交',
      time: formatRelativeTime(props.item.createTime)
    }]
  }
  return processRecords
    .slice(-3)
    .reverse()
    .map((record, index) => ({
      key: `${record.id || index}`,
      type: resolveEventType(record),
      text: buildEventText(record),
      time: formatRelativeTime(record.createTime)
    }))
})

async function handleShowChange(show) {
  if (!show || detail.value || loading.value) {
    return
  }
  try {
    loading.value = true
    const res = await apiGetFeedbackStatusSummary(props.item.id)
    assertAssistantResponseSuccess(res, '加载工单状态失败')
    detail.value = res.data
  } catch (error) {
    message.error(resolveFeedbackErrorMessage(error, '加载工单状态失败'))
  } finally {
    loading.value = false
  }
}

function resolveStepTime(status) {
  return formatRelativeTime(stageTimeMap.value[status])
}

function resolveCurrentStageTime() {
  const currentStageTime = stageTimeMap.value[currentStatus.value]
  if (currentStageTime) {
    return new Date(currentStageTime)
  }
  return props.item?.createTime ? new Date(props.item.createTime) : null
}

function resolveSlaHours() {
  return resolveFeedbackStatusSlaHours(currentStatus.value)
}

function resolveEventType(record) {
  return resolveFeedbackStatusTone(record?.toStatus)
}

function buildEventText(record) {
  if (!record?.fromStatus) {
    return '工单已提交'
  }
  return `${resolveFeedbackStatusText(record.fromStatus)} → ${resolveFeedbackStatusText(record.toStatus)}`
}

async function handleConfirmResolved() {
  await submitConfirmAction('RESOLVED', '提交人确认已解决', '已确认问题解决')
}

async function handleConfirmReopened() {
  await submitConfirmAction('REOPENED', '提交人反馈问题仍在', '已反馈问题仍在，将继续处理')
}

async function submitConfirmAction(toStatus, remark, successMessage) {
  // 前端守卫：只有 PENDING_CONFIRM 状态才允许提交人确认
  if (currentStatus.value !== 'PENDING_CONFIRM') {
    message.warning('当前反馈状态已变更，请刷新页面后重试')
    detail.value = null  // 清空缓存，下次 hover 重新拉取最新状态
    return
  }
  try {
    confirming.value = true
    const res = await apiConfirmFeedbackStatus(props.item.id, { toStatus, remark })
    assertAssistantResponseSuccess(res, '确认失败')
    message.success(successMessage)
    detail.value = null
    emit('updated')
  } catch (error) {
    message.error(resolveFeedbackErrorMessage(error, '确认失败'))
  } finally {
    confirming.value = false
  }
}

function diffDays(startTime, endTime) {
  return Math.floor((endTime - startTime) / (1000 * 60 * 60 * 24))
}

function formatAbsoluteTime(value) {
  if (!value) {
    return ''
  }
  const date = value instanceof Date ? value : new Date(value)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatRelativeTime(value) {
  if (!value) {
    return '--'
  }
  const date = new Date(value)
  const diff = Date.now() - date.getTime()
  if (diff < 60 * 1000) {
    return '刚刚'
  }
  if (diff < 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 1000))} 分钟前`
  }
  if (diff < 24 * 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 60 * 1000))} 小时前`
  }
  return `${Math.floor(diff / (24 * 60 * 60 * 1000))} 天前`
}
</script>

<style scoped>
.popover-trigger {
  display: inline-flex;
}

.status-popover {
  width: 360px;
  padding: 14px;
}

.status-progress {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin-bottom: 14px;
}

.progress-step {
  text-align: center;
  color: #94a3b8;
}

.progress-step.is-completed,
.progress-step.is-active {
  color: #1f2937;
}

.step-marker {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  margin: 0 auto 6px;
  background: #cbd5e1;
}

.progress-step.is-completed .step-marker {
  background: #3b82f6;
}

.progress-step.is-active .step-marker {
  background: #3b82f6;
}

.step-label {
  font-size: 12px;
  font-weight: 600;
}

.step-time {
  margin-top: 4px;
  font-size: 11px;
}

.current-card {
  padding: 12px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.current-card-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.current-title {
  font-size: 14px;
  font-weight: 700;
  color: #111827;
}

.current-owner {
  font-size: 12px;
  color: #64748b;
}

.current-deadline {
  margin-top: 6px;
  font-size: 12px;
  color: #475569;
}

.confirm-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.confirm-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #b45309;
}

.recent-events {
  margin-top: 14px;
}

.events-title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #334155;
}

.events-loading {
  padding: 12px 0;
}

.event-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.event-item {
  display: flex;
  gap: 8px;
}

.event-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  margin-top: 6px;
  background: #94a3b8;
  flex-shrink: 0;
}

.event-dot.tone-status {
  background: #3b82f6;
}

.event-dot.tone-pending {
  background: #d97706;
}

.event-dot.tone-resolved {
  background: #16a34a;
}

.event-dot.tone-reopen {
  background: #ea580c;
}

.event-dot.tone-closed {
  background: #6b7280;
}

.event-body {
  min-width: 0;
}

.event-text {
  font-size: 12px;
  color: #1f2937;
}

.event-time {
  margin-top: 2px;
  font-size: 11px;
  color: #94a3b8;
}
</style>
