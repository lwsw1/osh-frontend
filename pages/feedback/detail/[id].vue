<template>
  <div class="page-wrapper">
    <div class="breadcrumb-box">
      <n-breadcrumb>
        <n-breadcrumb-item>
          <nuxt-link to="/">首页</nuxt-link>
        </n-breadcrumb-item>
        <n-breadcrumb-item>
          <nuxt-link to="/feedback/list">反馈列表</nuxt-link>
        </n-breadcrumb-item>
        <n-breadcrumb-item>反馈详情</n-breadcrumb-item>
      </n-breadcrumb>
    </div>

    <div v-if="loading" class="loading-box">
      <n-spin size="large" />
    </div>

    <div v-else-if="!detail" class="error-box">
      <n-empty description="加载失败或反馈不存在">
        <template #extra>
          <n-button @click="loadPageData">
            重新加载
          </n-button>
        </template>
      </n-empty>
    </div>

    <div v-else class="content-wrapper">
      <!-- 工单详情 -->
      <div class="detail-card">
        <div class="detail-header">
          <div class="detail-header-left">
            <div class="category-badge">
              <span class="icon">{{ resolveFeedbackCategoryIcon(detail) }}</span>
              <span class="name">{{ detail.categoryName }}</span>
            </div>
            <span
              v-for="tag in detail.tags || []"
              :key="tag.id"
              class="feedback-tag"
            >{{ tag.name }}</span>
          </div>

          <div class="detail-header-right">
            <!-- 管理员：操作按钮（弱→强从左到右）+ 状态标签 -->
            <template v-if="showAdminActions">
              <template v-if="!isFeedbackClosed">
                <n-button
                  v-for="action in availableStatusActions"
                  :key="action.value"
                  size="small"
                  :type="action.type === 'primary' ? 'primary' : 'default'"
                  :class="action.type === 'warning' ? 'header-btn-warning' : ''"
                  :disabled="adminUpdating"
                  @click="openStatusModal(action)"
                >
                  {{ action.label }}
                </n-button>
              </template>
              <n-button
                v-else
                size="small"
                type="primary"
                :loading="adminUpdating"
                @click="handleReopenFeedback"
              >
                重新打开处理
              </n-button>
            </template>
            <FeedbackStatusPopover :item="detail">
              <template #trigger>
                <div
                  class="status-badge"
                  :class="`status-${detail.status}`"
                >
                  {{ resolveStatusTextForCurrentUser(detail.status) }}
                </div>
              </template>
            </FeedbackStatusPopover>
          </div>
        </div>

        <div class="detail-title-row">
          <h1 class="detail-title">{{ detail.title }}</h1>
          <div v-if="detail.isPinned" class="pin-badge">
            🔝 置顶{{ detail.pinOrder }}
          </div>
        </div>

        <div class="detail-meta">
          <span class="meta-item">
            <span class="icon">👤</span>
            <span>{{ getFeedbackUserName(detail) }}</span>
          </span>
          <span class="meta-item">
            <span class="icon">📅</span>
            <span>{{ formatTime(detail.createTime) }}</span>
          </span>
          <span class="meta-item">
            <span class="icon">👁</span>
            <span>{{ detail.viewCount }} 浏览</span>
          </span>
          <span class="meta-item">
            <span class="icon">🧭</span>
            <span>{{ operationLogs.length }} 条进展</span>
          </span>
        </div>

        <div class="detail-content">
          {{ detail.content }}
        </div>

        <div v-if="resolutionSourceText" class="resolution-source">
          {{ resolutionSourceText }}
        </div>

        <div v-if="canConfirmPending" class="confirm-panel">
          <div class="confirm-panel-header">
            <div class="confirm-panel-title">⏳ 请确认处理结果</div>
            <span class="confirm-panel-deadline">
              {{ pendingConfirmLeftDays > 0 ? `还剩 ${pendingConfirmLeftDays} 天自动关闭` : '今天将自动确认为已解决' }}
            </span>
          </div>
          <div class="confirm-panel-desc">
            处理团队已完成处理，请确认问题是否已解决。
          </div>
          <div class="confirm-panel-actions">
            <n-button type="primary" :loading="submitterConfirming" @click="handleResolveBySubmitter">
              ✅ 问题已解决
            </n-button>
            <n-button :loading="submitterConfirming" @click="handleReopenBySubmitter">
              🔄 问题仍在，需继续处理
            </n-button>
          </div>
        </div>

        <!-- 互动操作：点赞 / 收藏 -->
        <div class="detail-actions">
          <button
            type="button"
            class="action-chip"
            :class="{ 'is-active': isLiked }"
            :title="isLiked ? '取消点赞' : '点赞'"
            @click="handleLike"
          >
            <span class="action-icon" :class="{ 'bounce': likeAnimating }">{{ isLiked ? '👍' : '👍🏻' }}</span>
            <span class="action-label">{{ isLiked ? '已点赞' : '点赞' }}</span>
            <span class="action-count">{{ detail.likeCount || 0 }}</span>
          </button>
          <button
            type="button"
            class="action-chip"
            :class="{ 'is-active': isFavorited }"
            :title="isFavorited ? '取消收藏' : '收藏'"
            @click="handleFavorite"
          >
            <span class="action-icon" :class="{ 'bounce': favoriteAnimating }">{{ isFavorited ? '⭐' : '☆' }}</span>
            <span class="action-label">{{ isFavorited ? '已收藏' : '收藏' }}</span>
            <span class="action-count">{{ detail.favoriteCount || 0 }}</span>
          </button>
        </div>
      </div>

      <div class="timeline-section">
        <div class="timeline-header">
          <h2 class="timeline-title">处理进展</h2>
          <span class="timeline-subtitle">反馈的完整状态变更记录</span>
        </div>
        <div class="timeline-list">
          <div v-for="(record, index) in operationLogs" :key="index" class="timeline-item">
            <div class="timeline-track">
              <div class="timeline-dot" :class="`type-${record.type}`" />
              <div v-if="index < operationLogs.length - 1" class="timeline-line" />
            </div>
            <div class="timeline-body">
              <div class="timeline-row">
                <div class="timeline-main">
                  <span class="timeline-operator">{{ extractOperator(record.text) }}</span>
                  <span class="timeline-action">{{ extractAction(record.text) }}</span>
                  <span v-if="record.toStatus" class="timeline-status-tag" :class="`tag-${record.type}`">
                    {{ record.toStatusText }}
                  </span>
                </div>
                <div class="timeline-row-right">
                  <span class="timeline-time">{{ record.time }}</span>
                  <button
                    v-if="showAdminActions && record.recordId"
                    type="button"
                    class="timeline-edit-btn"
                    title="修改备注"
                    @click.stop="openEditRemarkModal(record)"
                  >✏️</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 状态变更模态框 -->
      <n-modal
        v-model:show="statusModalVisible"
        :title="modalTitle"
        preset="card"
        :style="{ width: '520px' }"
        :mask-closable="false"
        :closable="!adminUpdating"
        :on-after-enter="focusModalInput"
        class="status-update-modal"
      >
        <div class="status-modal-content">
          <!-- 操作预览 -->
          <div class="operation-preview">
            <div class="preview-label">即将执行</div>
            <div class="preview-content">
              <span class="from-status">{{ currentStatusText }}</span>
              <span class="arrow-icon">→</span>
              <span class="to-status" :class="`status-${currentAction?.value}`">
                {{ currentAction?.label }}
              </span>
            </div>
          </div>

          <!-- 输入区域 -->
          <div class="input-section">
            <div class="input-label">
              <span>处理说明</span>
              <span class="required-mark">*</span>
            </div>
            <n-input
              ref="modalInputRef"
              v-model:value="statusRemark"
              type="textarea"
              :rows="4"
              placeholder="请输入处理说明，将记录在处理日志中..."
              maxlength="500"
              show-count
              :disabled="adminUpdating"
              @keydown.enter.ctrl="confirmStatusUpdate"
            />
            <div class="input-hint">💡 Ctrl + Enter 快速提交</div>
          </div>

          <!-- 快捷短语 -->
          <div class="quick-phrases">
            <div class="quick-header">
              <span class="quick-label">快捷短语</span>
              <n-button text size="tiny" @click="clearRemark">
                清空
              </n-button>
            </div>
            <div class="quick-tags">
              <n-tag
                v-for="phrase in quickPhrases"
                :key="phrase"
                size="small"
                class="quick-tag"
                :class="{ 'is-active': statusRemark.includes(phrase) }"
                @click="applyQuickPhrase(phrase)"
              >
                {{ phrase }}
              </n-tag>
            </div>
          </div>

          <!-- 高级选项 -->
          <div v-if="false" class="advanced-options">
            <div class="option-item" @click="syncToComment = !syncToComment">
              <div class="option-checkbox" :class="{ 'is-checked': syncToComment }">
                <span v-if="syncToComment" class="check-icon">✓</span>
              </div>
              <div class="option-content">
                <div class="option-title">同步到评论区</div>
                <div class="option-desc">用户可见此处理说明</div>
              </div>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="modal-footer">
            <n-button
              :disabled="adminUpdating"
              @click="closeStatusModal"
            >
              取消
            </n-button>
            <n-button
              type="primary"
              :loading="adminUpdating"
              :disabled="!canSubmit"
              @click="confirmStatusUpdate"
            >
              <template #icon>
                <span v-if="!adminUpdating">✓</span>
              </template>
              确认{{ currentAction?.label }}
            </n-button>
          </div>
        </template>
      </n-modal>

      <!-- 编辑备注模态框 -->
      <n-modal
        v-model:show="editRemarkModalVisible"
        title="修改备注"
        preset="card"
        :style="{ width: '480px' }"
        :mask-closable="false"
        :closable="!editRemarkUpdating"
      >
        <n-input
          v-model:value="editRemarkContent"
          type="textarea"
          :rows="4"
          placeholder="请输入备注内容..."
          maxlength="500"
          show-count
          :disabled="editRemarkUpdating"
        />
        <template #footer>
          <div class="modal-footer">
            <n-button :disabled="editRemarkUpdating" @click="editRemarkModalVisible = false">取消</n-button>
            <n-button
              type="primary"
              :loading="editRemarkUpdating"
              :disabled="!editRemarkContent.trim()"
              @click="confirmEditRemark"
            >保存</n-button>
          </div>
        </template>
      </n-modal>

      <!-- 评论区 -->
      <div v-if="false && detail.allowComment" ref="commentSectionRef" class="comment-section">
        <h2 class="comment-title">💬 评论 ({{ detail.commentCount }})</h2>

        <!-- 反馈已关闭提示 -->
        <div v-if="isFeedbackClosed" class="closed-notice">
          <span class="closed-icon">🔒</span>
          <span class="closed-text">该反馈已关闭，如需继续讨论请联系管理员重新打开</span>
        </div>

        <!-- 发表评论表单 -->
        <div v-else class="comment-form">
          <n-input
            v-model:value="commentContent"
            type="textarea"
            :rows="3"
            placeholder="发表你的评论..."
            maxlength="500"
            show-count
          />
          <div class="form-actions">
            <n-button type="primary" @click="handleSubmitComment" :loading="submittingComment">
              发表评论
            </n-button>
          </div>
        </div>

        <!-- 评论列表 -->
        <div v-if="commentLoading" class="loading-box compact">
          <n-spin size="small" />
        </div>

        <div v-else-if="comments.length > 0" class="comment-list">
          <div v-for="comment in comments" :key="comment.id" class="comment-item">
            <!-- 一级评论 -->
            <div class="comment-main">
              <div class="comment-avatar">
                {{ getCommentAvatarText(comment) }}
              </div>
              <div class="comment-body">
                <div class="comment-header">
                  <span class="comment-user">{{ getCommentUserName(comment) }}</span>
                  <span v-if="comment.isAdminReply" class="admin-badge">管理员</span>
                  <span class="comment-time">{{ formatTime(comment.createTime) }}</span>
                </div>
                <div class="comment-content">{{ comment.content }}</div>
                <div class="comment-actions">
                  <n-button text size="small" @click="handleReply(comment)">
                    回复
                  </n-button>
                </div>
              </div>
            </div>

            <!-- 二级评论（回复） -->
            <div v-if="comment.replies && comment.replies.length > 0" class="reply-list">
              <div v-for="reply in comment.replies" :key="reply.id" class="reply-item">
                <div class="comment-avatar small">
                  {{ getCommentAvatarText(reply) }}
                </div>
                <div class="comment-body">
                  <div class="comment-header">
                    <span class="comment-user">{{ getCommentUserName(reply) }}</span>
                    <span v-if="reply.isAdminReply" class="admin-badge">管理员</span>
                    <span class="reply-to">回复 @{{ getReplyToUserName(reply) }}</span>
                    <span class="comment-time">{{ formatTime(reply.createTime) }}</span>
                  </div>
                  <div class="comment-content">{{ reply.content }}</div>
                  <div class="comment-actions">
                    <n-button text size="small" @click="handleReply(reply, comment.id)">
                      回复
                    </n-button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 回复表单 -->
            <div v-if="replyingTo === comment.id" class="reply-form">
              <n-input
                v-model:value="replyContent"
                type="textarea"
                :rows="2"
                :placeholder="`回复 @${replyToUserName || '用户'}...`"
                maxlength="500"
                show-count
              />
              <div class="form-actions">
                <n-button size="small" type="primary" @click="handleSubmitReply" :loading="submittingReply">
                  发表回复
                </n-button>
                <n-button size="small" @click="cancelReply">
                  取消
                </n-button>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="commentsLoaded" class="empty-comments">
          <div class="empty-state">
            <div class="empty-icon">💬</div>
            <div class="empty-title">暂无评论</div>
            <div class="empty-desc">快来发表第一条评论，开启交流吧！</div>
          </div>
        </div>

        <div v-else class="empty-comments">
          <n-button text type="primary" @click="ensureCommentsLoaded">
            点击加载评论
          </n-button>
        </div>

        <!-- 加载更多评论 -->
        <div v-if="hasMoreComments" class="load-more-box">
          <n-button @click="loadMoreComments" :loading="loadingMoreComments">
            加载更多评论
          </n-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { NButton, NInput, NSpin, NEmpty, NBreadcrumb, NBreadcrumbItem, NModal, NTag } from 'naive-ui'
import {
  assertAssistantResponseSuccess,
  apiConfirmFeedbackStatus,
  apiGetFeedbackDetail,
  apiGetFeedbackComments,
  apiGetFeedbackProcessRecords,
  apiCreateComment,
  apiLikeFeedback,
  apiUnlikeFeedback,
  apiFavoriteFeedback,
  apiUnfavoriteFeedback,
  apiGetFeedbackInteractionStatus,
  apiUpdateFeedbackStatus,
  apiUpdateProcessRecordRemark,
  resolveFeedbackCategoryIcon,
  resolveFeedbackStatusText,
  resolveFeedbackErrorMessage
} from '~/composables/assistant'
import { patchFeedbackInteraction } from '~/composables/useFeedbackState'
import { useFeedbackDetailStatusView } from '~/composables/useFeedbackDetailStatusView'
import { usePermission } from '~/composables/usePermission'
import FeedbackStatusPopover from '~/components/feedback/FeedbackStatusPopover.vue'

// 使用全局用户状态（响应式，登录状态变化会自动更新）
const user = useUser()

const route = useRoute()
const router = useRouter()
const message = useMessage()
const { hasPermission } = usePermission()

const loading = ref(true)
const detail = ref(null)
const comments = ref([])
const commentContent = ref('')
const submittingComment = ref(false)
const commentLoading = ref(false)

const replyingTo = ref(null)
const replyContent = ref('')
const replyToUserId = ref(null)
const replyToUserName = ref('')
const replyRootId = ref(null)
const submittingReply = ref(false)

const commentPageNum = ref(1)
const commentPageSize = ref(10)
const hasMoreComments = ref(false)
const loadingMoreComments = ref(false)
const commentSectionRef = ref(null)
const commentObserver = ref(null)
const commentsLoaded = ref(false)

// 互动状态
const isLiked = ref(false)
const isFavorited = ref(false)
const likingLoading = ref(false)
const favoritingLoading = ref(false)
const likeAnimating = ref(false)
const favoriteAnimating = ref(false)
const adminUpdating = ref(false)
const submitterConfirming = ref(false)
const viewportWidth = ref(process.client ? window.innerWidth : 1200)
const managementPanelVisible = ref(false)

// 编辑备注模态框
const editRemarkModalVisible = ref(false)
const editRemarkRecordId = ref(null)
const editRemarkContent = ref('')
const editRemarkUpdating = ref(false)

// 状态变更模态框
const statusModalVisible = ref(false)
const currentAction = ref(null)
const statusRemark = ref('')
const syncToComment = ref(false)
const modalInputRef = ref(null)

// 快捷短语配置
const quickPhrases = [
  '已复现问题',
  '正在排查中',
  '请提供更多截图',
  '问题已修复',
  '已联系用户确认',
  '感谢您的反馈'
]

// 模态框标题
const modalTitle = computed(() => {
  if (!currentAction.value) return '确认操作'
  return `确认操作：${currentAction.value.label}`
})

// 当前状态文本
const currentStatusText = computed(() => {
  if (!detail.value) return ''
  return resolveFeedbackStatusText(detail.value.status)
})

// 是否可以提交
const canSubmit = computed(() => {
  return statusRemark.value.trim().length > 0 && !adminUpdating.value
})

// 登录状态检查（基于全局用户状态，响应式更新）
const isLoggedIn = computed(() => {
  return !!user.value
})
const showAdminActions = computed(() => {
  return !!detail.value && hasPermission('system:feedback:manage')
})
const isSubmitter = computed(() => {
  const currentUserId = user.value?.id || user.value?.userId || user.value?.uid
  return !!detail.value && !!currentUserId && String(detail.value.userId) === String(currentUserId)
})
const canConfirmPending = computed(() => {
  return isSubmitter.value && detail.value?.status === 'PENDING_CONFIRM'
})

/** PENDING_CONFIRM 状态进入时间，用于计算剩余确认天数 */
const pendingConfirmEntryTime = computed(() => {
  const record = [...(detail.value?.processRecords || [])]
    .filter(r => r?.toStatus === 'PENDING_CONFIRM')
    .sort((a, b) => new Date(b.createTime) - new Date(a.createTime))[0]
  return record?.createTime ? new Date(record.createTime) : null
})

/** 距自动确认还剩几天（7天窗口），最小为 0 */
const pendingConfirmLeftDays = computed(() => {
  if (!pendingConfirmEntryTime.value) return 7
  const elapsed = Math.floor((Date.now() - pendingConfirmEntryTime.value.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, 7 - elapsed)
})
const resolutionSourceText = computed(() => {
  if (detail.value?.status !== 'RESOLVED') {
    return ''
  }
  const latestResolvedRecord = [...(detail.value?.processRecords || [])]
    .filter(record => record?.toStatus === 'RESOLVED')
    .sort((left, right) => new Date(right.createTime) - new Date(left.createTime))[0]
  if (!latestResolvedRecord) {
    return '闭环来源：已解决'
  }
  if ((latestResolvedRecord.operatorName || '') === '系统' || (latestResolvedRecord.remark || '').includes('自动确认')) {
    return '闭环来源：系统自动确认'
  }
  if (isSubmitter.value && (latestResolvedRecord.remark || '').includes('提交人确认')) {
    return '闭环来源：用户确认'
  }
  return '闭环来源：已解决'
})
const managementPanelTrigger = computed(() => viewportWidth.value <= 768 ? 'click' : 'hover')
const managementStatusTriggerClass = computed(() => {
  const currentStatus = detail.value?.status || 'default'
  return `tone-${currentStatus}`
})

const {
  statusSteps,
  currentStepIndex,
  isFeedbackClosed,
  operationLogs,
  availableStatusActions
} = useFeedbackDetailStatusView(detail)

function assertFeedbackSuccess(res, fallbackMessage) {
  if (res?.code === 200) return
  throw new Error(res?.msg || fallbackMessage)
}

/**
 * 根据当前用户身份返回状态文本：
 * PENDING_CONFIRM 对提交人显示"待你确认"，对其他人显示"待用户确认"，避免误导
 */
function resolveStatusTextForCurrentUser(status) {
  if (status === 'PENDING_CONFIRM') {
    return isSubmitter.value ? '待你确认' : '待用户确认'
  }
  return resolveFeedbackStatusText(status)
}

/** 从 "【操作人】动作" 格式的 text 中提取操作人 */
function extractOperator(text) {
  const match = text?.match(/^【(.+?)】/)
  return match ? match[1] : ''
}

/** 从 "【操作人】动作" 格式的 text 中提取动作部分 */
function extractAction(text) {
  return text?.replace(/^【.+?】/, '').trim() || ''
}

/** 打开编辑备注模态框 */
function openEditRemarkModal(record) {
  editRemarkRecordId.value = record.recordId
  editRemarkContent.value = record.remark || ''
  editRemarkModalVisible.value = true
}

/** 提交备注修改 */
async function confirmEditRemark() {
  if (!editRemarkRecordId.value || !editRemarkContent.value.trim()) return
  try {
    editRemarkUpdating.value = true
    const res = await apiUpdateProcessRecordRemark(editRemarkRecordId.value, editRemarkContent.value.trim())
    assertAssistantResponseSuccess(res, '修改备注失败')
    message.success('备注已修改')
    editRemarkModalVisible.value = false
    await loadDetail()
  } catch (error) {
    message.error(resolveFeedbackErrorMessage(error, '修改备注失败'))
  } finally {
    editRemarkUpdating.value = false
  }
}

function getCommentUserName(comment) {
  return comment?.userName || `用户${comment?.userId || ''}`
}

function getFeedbackUserName(feedback) {
  return feedback?.userName || `用户${feedback?.userId || ''}`
}

function getCommentAvatarText(comment) {
  return getCommentUserName(comment).charAt(0)
}

function getReplyToUserName(comment) {
  return comment?.replyToUserName || '用户'
}

onMounted(async () => {
  if (process.client) {
    updateViewportWidth()
    window.addEventListener('resize', updateViewportWidth, { passive: true })
  }
  await loadDetail()
  await nextTick()
  initCommentObserver()
  if (route.query.created === '1') {
    message.success('反馈提交成功')
    router.replace({ path: route.path })
  }
})

onBeforeUnmount(() => {
  if (process.client) {
    window.removeEventListener('resize', updateViewportWidth)
  }
  destroyCommentObserver()
})

watch(commentSectionRef, (currentValue) => {
  if (currentValue) {
    initCommentObserver()
  }
})

/**
 * 加载页面数据（独立方法，支持重新加载）
 */
async function loadPageData() {
  loading.value = true

  try {
    await loadDetail()
  } finally {
    loading.value = false
  }
}

/**
 * 带超时的 API 调用包装器
 * @param {Function} apiCall - API 调用函数
 * @param {number} timeoutMs - 超时时间（毫秒）
 * @returns {Promise} API 响应
 */
function withTimeout(apiCall, timeoutMs = 10000) {
  return Promise.race([
    apiCall(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('请求超时，请稍后重试')), timeoutMs)
    )
  ])
}

async function loadDetail() {
  try {
    const res = await withTimeout(() => apiGetFeedbackDetail(route.params.id), 10000)
    assertFeedbackSuccess(res, '加载详情失败')
    detail.value = res.data
    await ensureProcessRecords()

    syncInteractionStateFromDetail()
    if (isLoggedIn.value) {
      await syncInteractionStatus(true)
    }

    loading.value = false
  } catch (error) {
    message.error(resolveFeedbackErrorMessage(error, '加载详情失败'))
    detail.value = null
    loading.value = false
  }
}

async function ensureProcessRecords() {
  if (!detail.value) {
    return
  }
  if (Array.isArray(detail.value.processRecords) && detail.value.processRecords.length > 0) {
    return
  }
  try {
    const res = await apiGetFeedbackProcessRecords(route.params.id)
    assertFeedbackSuccess(res, '加载处理记录失败')
    detail.value.processRecords = res.data || []
  } catch (error) {
    detail.value.processRecords = []
  }
}

async function handleLike() {
  if (likingLoading.value || !detail.value) {
    return
  }

  // 检查是否登录
  if (!isLoggedIn.value) {
    message.warning('请先登录后再点赞')
    return
  }

  // 触发动画
  likeAnimating.value = true
  setTimeout(() => { likeAnimating.value = false }, 300)

  try {
    likingLoading.value = true

    const currentLiked = isLiked.value
    if (currentLiked) {
      // 取消点赞
      const res = await apiUnlikeFeedback(route.params.id)
      assertAssistantResponseSuccess(res, '取消点赞失败')
      message.success('已取消点赞')
      applyLikeState(false)
      syncFeedbackInteractionPatch()
    } else {
      // 点赞
      const res = await apiLikeFeedback(route.params.id)
      assertAssistantResponseSuccess(res, '点赞失败')
      message.success('点赞成功')
      applyLikeState(true)
      syncFeedbackInteractionPatch()
    }
  } catch (error) {
    const errorMessage = resolveFeedbackErrorMessage(error, '操作失败')
    if (errorMessage.includes('已经点赞过')) {
      syncLikeState(true)
      await syncInteractionStatus(true)
      syncFeedbackInteractionPatch()
      message.success('已同步为点赞状态')
      return
    }
    if (errorMessage.includes('还未点赞')) {
      syncLikeState(false)
      await syncInteractionStatus(true)
      syncFeedbackInteractionPatch()
      message.success('已同步为未点赞状态')
      return
    }
    message.error(errorMessage)
  } finally {
    likingLoading.value = false
  }
}

async function handleFavorite() {
  if (favoritingLoading.value || !detail.value) {
    return
  }

  // 检查是否登录
  if (!isLoggedIn.value) {
    message.warning('请先登录后再收藏')
    return
  }

  // 触发动画
  favoriteAnimating.value = true
  setTimeout(() => { favoriteAnimating.value = false }, 300)

  try {
    favoritingLoading.value = true

    const currentFavorited = isFavorited.value
    if (currentFavorited) {
      // 取消收藏
      const res = await apiUnfavoriteFeedback(route.params.id)
      assertAssistantResponseSuccess(res, '取消收藏失败')
      message.success('已取消收藏')
      applyFavoriteState(false)
      syncFeedbackInteractionPatch()
    } else {
      // 收藏
      const res = await apiFavoriteFeedback(route.params.id)
      assertAssistantResponseSuccess(res, '收藏失败')
      message.success('收藏成功')
      applyFavoriteState(true)
      syncFeedbackInteractionPatch()
    }
  } catch (error) {
    const errorMessage = resolveFeedbackErrorMessage(error, '操作失败')
    if (errorMessage.includes('已经收藏过')) {
      syncFavoriteState(true)
      await syncInteractionStatus(true)
      syncFeedbackInteractionPatch()
      message.success('已同步为收藏状态')
      return
    }
    if (errorMessage.includes('还未收藏')) {
      syncFavoriteState(false)
      await syncInteractionStatus(true)
      syncFeedbackInteractionPatch()
      message.success('已同步为未收藏状态')
      return
    }
    message.error(errorMessage)
  } finally {
    favoritingLoading.value = false
  }
}

function syncInteractionStateFromDetail() {
  if (!detail.value) {
    isLiked.value = false
    isFavorited.value = false
    return
  }

  isLiked.value = !!detail.value.isLiked
  isFavorited.value = !!detail.value.isFavorited
}

function applyLikeState(nextLiked) {
  if (!detail.value || isLiked.value === nextLiked) {
    return
  }

  const currentCount = Number(detail.value.likeCount) || 0
  isLiked.value = nextLiked
  detail.value.isLiked = nextLiked
  detail.value.likeCount = nextLiked ? currentCount + 1 : Math.max(0, currentCount - 1)
}

function syncLikeState(nextLiked) {
  if (!detail.value) {
    return
  }

  isLiked.value = nextLiked
  detail.value.isLiked = nextLiked
}

function applyFavoriteState(nextFavorited) {
  if (!detail.value || isFavorited.value === nextFavorited) {
    return
  }

  const currentCount = Number(detail.value.favoriteCount) || 0
  isFavorited.value = nextFavorited
  detail.value.isFavorited = nextFavorited
  detail.value.favoriteCount = nextFavorited ? currentCount + 1 : Math.max(0, currentCount - 1)
}

function syncFavoriteState(nextFavorited) {
  if (!detail.value) {
    return
  }

  isFavorited.value = nextFavorited
  detail.value.isFavorited = nextFavorited
}

async function syncInteractionStatus(silent = false) {
  if (!isLoggedIn.value || !detail.value) {
    return
  }

  try {
    const res = await apiGetFeedbackInteractionStatus(route.params.id)
    assertAssistantResponseSuccess(res, '获取互动状态失败')
    const interactionStatus = res.data || {}
    isLiked.value = !!interactionStatus.isLiked
    isFavorited.value = !!interactionStatus.isFavorited
    detail.value.isLiked = isLiked.value
    detail.value.isFavorited = isFavorited.value
  } catch (error) {
    if (!silent) {
      message.error(resolveFeedbackErrorMessage(error, '同步互动状态失败'))
    }
  }
}

async function loadComments() {
  if (!detail.value || commentsLoaded.value && commentPageNum.value === 1) {
    return true
  }

  try {
    commentLoading.value = commentPageNum.value === 1
    const res = await withTimeout(
      () => apiGetFeedbackComments(
        route.params.id,
        commentPageNum.value,
        commentPageSize.value
      ),
      10000
    )
    assertFeedbackSuccess(res, '加载评论失败')

    const newComments = Array.isArray(res.data) ? res.data : []

    if (commentPageNum.value === 1) {
      comments.value = newComments
      commentsLoaded.value = true
    } else {
      comments.value.push(...newComments)
    }

    hasMoreComments.value = newComments.length === commentPageSize.value
    return true
  } catch (error) {
    message.error(resolveFeedbackErrorMessage(error, '加载评论失败'))
    return false
  } finally {
    commentLoading.value = false
  }
}

async function refreshFeedbackAfterComment() {
  commentPageNum.value = 1
  commentsLoaded.value = false
  const results = await Promise.allSettled([loadComments(), loadDetail()])
  const hasRefreshFailed = results.some(result => result.status === 'rejected' || result.value === false)
  if (hasRefreshFailed) {
    message.warning('评论已发表，刷新评论列表失败，请稍后手动刷新')
  }
}

async function handleSubmitComment() {
  if (!commentContent.value.trim()) {
    message.warning('请输入评论内容')
    return
  }

  await ensureCommentsLoaded()

  try {
    submittingComment.value = true
    const res = await apiCreateComment(route.params.id, {
      content: commentContent.value,
      parentId: 0
    })
    assertFeedbackSuccess(res, '评论失败')
    message.success('评论成功')
    commentContent.value = ''
    submittingComment.value = false
    await refreshFeedbackAfterComment()
  } catch (error) {
    message.error(resolveFeedbackErrorMessage(error, '评论失败'))
  } finally {
    submittingComment.value = false
  }
}

function handleReply(comment, rootId = null) {
  replyingTo.value = rootId || comment.id
  replyToUserId.value = comment.userId
  replyToUserName.value = getCommentUserName(comment)
  replyRootId.value = rootId || comment.id
  replyContent.value = ''
}

async function handleSubmitReply() {
  if (!replyContent.value.trim()) {
    message.warning('请输入回复内容')
    return
  }

  await ensureCommentsLoaded()

  try {
    submittingReply.value = true
    const res = await apiCreateComment(route.params.id, {
      content: replyContent.value,
      parentId: replyingTo.value,
      replyToUserId: replyToUserId.value,
      replyToUserName: replyToUserName.value
    })
    assertFeedbackSuccess(res, '回复失败')
    message.success('回复成功')
    cancelReply()
    submittingReply.value = false
    await refreshFeedbackAfterComment()
  } catch (error) {
    message.error(resolveFeedbackErrorMessage(error, '回复失败'))
  } finally {
    submittingReply.value = false
  }
}

function cancelReply() {
  replyingTo.value = null
  replyContent.value = ''
  replyToUserId.value = null
  replyToUserName.value = ''
  replyRootId.value = null
}

async function loadMoreComments() {
  await ensureCommentsLoaded()
  try {
    loadingMoreComments.value = true
    commentPageNum.value++
    const success = await loadComments()
    if (!success) {
      commentPageNum.value = Math.max(1, commentPageNum.value - 1)
    }
  } finally {
    loadingMoreComments.value = false
  }
}

async function ensureCommentsLoaded() {
  if (commentsLoaded.value) {
    return true
  }

  commentPageNum.value = 1
  commentsLoaded.value = false
  return loadComments()
}

function initCommentObserver() {
  if (!process.client || !detail.value?.allowComment || !commentSectionRef.value || commentObserver.value) {
    return
  }

  commentObserver.value = new IntersectionObserver(entries => {
    const [entry] = entries
    if (entry?.isIntersecting) {
      ensureCommentsLoaded()
      destroyCommentObserver()
    }
  }, {
    rootMargin: '200px 0px',
  })

  commentObserver.value.observe(commentSectionRef.value)
}

function destroyCommentObserver() {
  if (!commentObserver.value) {
    return
  }

  commentObserver.value.disconnect()
  commentObserver.value = null
}

function syncFeedbackInteractionPatch() {
  if (!detail.value?.id) {
    return
  }

  patchFeedbackInteraction(detail.value.id, {
    likeCount: detail.value.likeCount || 0,
    favoriteCount: detail.value.favoriteCount || 0,
    isLiked: isLiked.value,
    isFavorited: isFavorited.value,
  })
}

function updateViewportWidth() {
  if (!process.client) {
    return
  }
  viewportWidth.value = window.innerWidth
}

// 打开状态变更模态框
function openStatusModal(action) {
  managementPanelVisible.value = false
  currentAction.value = action
  statusRemark.value = ''
  syncToComment.value = false
  statusModalVisible.value = true
}

// 关闭状态变更模态框
function closeStatusModal() {
  statusModalVisible.value = false
  currentAction.value = null
  statusRemark.value = ''
  syncToComment.value = false
}

// 聚焦模态框输入框
function focusModalInput() {
  nextTick(() => {
    modalInputRef.value?.focus()
  })
}

// 清空备注
function clearRemark() {
  statusRemark.value = ''
  focusModalInput()
}

// 应用快捷短语
function applyQuickPhrase(phrase) {
  if (statusRemark.value) {
    statusRemark.value += '，' + phrase
  } else {
    statusRemark.value = phrase
  }
}

// 确认状态更新
async function confirmStatusUpdate() {
  if (!currentAction.value || !statusRemark.value.trim()) {
    return
  }

  const toStatus = currentAction.value.value
  const remark = statusRemark.value.trim()

  try {
    adminUpdating.value = true
    const res = await apiUpdateFeedbackStatus(route.params.id, { toStatus, remark })
    assertAssistantResponseSuccess(res, '更新状态失败')
    message.success('状态更新成功')
    closeStatusModal()
    await loadDetail()
  } catch (error) {
    message.error(resolveFeedbackErrorMessage(error, '操作失败'))
  } finally {
    adminUpdating.value = false
  }
}

// 管理员重新打开反馈
async function handleReopenFeedback() {
  if (!detail.value) {
    return
  }
  try {
    managementPanelVisible.value = false
    adminUpdating.value = true
    const res = await apiUpdateFeedbackStatus(route.params.id, {
      toStatus: 'REOPENED',
      remark: '管理员重新打开工单'
    })
    assertAssistantResponseSuccess(res, '重新打开失败')
    message.success('已重新打开')
    await loadDetail()
  } catch (error) {
    message.error(resolveFeedbackErrorMessage(error, '重新打开失败'))
  } finally {
    adminUpdating.value = false
  }
}

async function handleResolveBySubmitter() {
  await submitterConfirm('RESOLVED', '提交人确认已解决', '已确认问题解决')
}

async function handleReopenBySubmitter() {
  await submitterConfirm('REOPENED', '提交人反馈问题仍在', '已反馈问题仍在，将继续处理')
}

async function submitterConfirm(toStatus, remark, successMessage) {
  if (!detail.value) {
    return
  }
  // 前端守卫：只有 PENDING_CONFIRM 状态才允许提交人确认，避免重复提交或状态已变更时的无效请求
  if (detail.value.status !== 'PENDING_CONFIRM') {
    message.warning('当前反馈状态已变更，请刷新页面后重试')
    await loadDetail()
    return
  }
  try {
    submitterConfirming.value = true
    const res = await apiConfirmFeedbackStatus(route.params.id, {
      toStatus,
      remark
    })
    assertAssistantResponseSuccess(res, '确认失败')
    message.success(successMessage)
    await loadDetail()
  } catch (error) {
    message.error(resolveFeedbackErrorMessage(error, '确认失败'))
  } finally {
    submitterConfirming.value = false
  }
}

function formatTime(time) {
  if (!time) return ''
  const date = new Date(time)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  
  return date.toLocaleDateString('zh-CN')
}

</script>

<style scoped>
.page-wrapper {
  width: 100%;
  padding: 24px 20px;
  background: #f8f9fa;
  min-height: calc(100vh - 40px);
}



.breadcrumb-box {
  margin-bottom: 20px;
}

.loading-box {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 100px 0;
}

.content-wrapper {
  max-width: 1120px;
  margin: 0 auto;
}

/* 详情卡片 */
.detail-card {
  background: #fff;
  padding: 32px 36px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  margin-bottom: 24px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 14px;
}

.detail-header-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.detail-header-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  margin-left: auto;
  flex-shrink: 0;
}

/* 驳回按钮：橙色线框，视觉上比关闭弱、比主操作弱 */
.header-btn-warning {
  border-color: #f59e0b !important;
  color: #b45309 !important;
}

.header-btn-warning:hover {
  background: #fffbeb !important;
}

.category-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 12px;
  background: #f5f7ff;
  border-radius: 999px;
  font-size: 13px;
  color: #667eea;
  line-height: 1;
}

.category-badge .icon {
  font-size: 14px;
}

.pin-badge {
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 10px;
  background: #ff9800;
  color: #fff;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  flex-shrink: 0;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

.status-PENDING {
  background: #fff7e6;
  color: #d97706;
  animation: breathing 2s ease-in-out infinite;
}

.status-TRIAGED {
  background: #eff6ff;
  color: #1d4ed8;
}

@keyframes breathing {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(217, 119, 6, 0.4);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(217, 119, 6, 0);
  }
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

.detail-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.detail-title {
  font-size: 26px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  line-height: 1.4;
  flex: 1;
  min-width: 0;
}

.feedback-tag {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
  line-height: 1;
}

.detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eef0f3;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #6b7280;
}

.meta-item .icon {
  font-size: 14px;
}

@keyframes bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.3); }
}

.detail-content {
  font-size: 15px;
  line-height: 1.8;
  color: #374151;
  white-space: pre-wrap;
  margin-bottom: 20px;
}

.resolution-source {
  display: inline-flex;
  align-items: center;
  margin-bottom: 18px;
  padding: 6px 12px;
  border-radius: 999px;
  background: #f0fdf4;
  color: #15803d;
  font-size: 12px;
  font-weight: 600;
}

.confirm-panel {
  margin-bottom: 20px;
  padding: 18px 20px;
  border: 1px solid #f6d08a;
  border-radius: 16px;
  background: linear-gradient(135deg, #fff8e8 0%, #fffef9 100%);
}

.confirm-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.confirm-panel-title {
  font-size: 16px;
  font-weight: 700;
  color: #9a6700;
}

.confirm-panel-deadline {
  padding: 2px 10px;
  border-radius: 999px;
  background: #fef3c7;
  color: #b45309;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.confirm-panel-desc {
  font-size: 14px;
  line-height: 1.7;
  color: #7c5b12;
  margin-bottom: 14px;
}

.confirm-panel-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

/* 互动操作 */
.detail-actions {
  display: flex;
  gap: 10px;
  padding-top: 16px;
  border-top: 1px solid #eef0f3;
}

.action-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 14px;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  background: #fff;
  color: #4b5563;
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease, color 0.2s ease;
  user-select: none;
}

.action-chip:hover {
  border-color: #c7d2fe;
  background: #f8faff;
  color: #1d4ed8;
}

.action-chip.is-active {
  border-color: #c7d2fe;
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 500;
}

.action-chip .action-icon {
  font-size: 16px;
  line-height: 1;
}

.action-chip .action-icon.bounce {
  animation: bounce 0.3s ease;
}

.action-chip .action-count {
  color: #94a3b8;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.action-chip.is-active .action-count {
  color: #1d4ed8;
}

.timeline-section {
  background: #fff;
  border-radius: 18px;
  padding: 24px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
}

.timeline-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 18px;
}

.timeline-title {
  margin: 0;
  font-size: 20px;
  color: #111827;
}

.timeline-subtitle {
  font-size: 13px;
  color: #6b7280;
}

.timeline-list {
  display: flex;
  flex-direction: column;
}

/* 每条记录：左侧轨道 + 右侧内容 */
.timeline-item {
  display: flex;
  gap: 12px;
}

/* 左侧轨道：圆点 + 竖线 */
.timeline-track {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 10px;
  padding-top: 5px;
}

.timeline-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #cbd5e1;
  flex-shrink: 0;
}

.timeline-dot.type-system   { background: #93c5fd; }
.timeline-dot.type-operation { background: #3b82f6; }
.timeline-dot.type-pending  { background: #3b82f6; }
.timeline-dot.type-resolve  { background: #3b82f6; }
.timeline-dot.type-reopen   { background: #3b82f6; }
.timeline-dot.type-close    { background: #cbd5e1; }

.timeline-line {
  flex: 1;
  width: 2px;
  background: #e5e7eb;
  margin: 4px 0;
  min-height: 16px;
}

/* 右侧内容区 */
.timeline-body {
  flex: 1;
  min-width: 0;
  padding-bottom: 20px;
}

/* 主行：操作人 + 动作 + 状态 tag + 时间 */
.timeline-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.timeline-main {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  min-width: 0;
}

.timeline-operator {
  font-size: 13px;
  font-weight: 700;
  color: #374151;
  white-space: nowrap;
}

.timeline-action {
  font-size: 13px;
  color: #6b7280;
}

/* 状态 tag */
.timeline-status-tag {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

/* ── 全局状态色盘：统一蓝色调，关闭/驳回用浅灰区分 ──────────── */
.tag-operation { background: #eff6ff; color: #1d4ed8; }
.tag-reopen    { background: #eff6ff; color: #1d4ed8; }
.tag-pending   { background: #eff6ff; color: #1d4ed8; }
.tag-resolve   { background: #eff6ff; color: #1d4ed8; }
.tag-close     { background: #f1f5f9; color: #64748b; }
.tag-system    { background: #f1f5f9; color: #64748b; }

.timeline-time {
  font-size: 11px;
  color: #9ca3af;
  white-space: nowrap;
  flex-shrink: 0;
}

.timeline-row-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.timeline-edit-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.15s ease;
  padding: 0;
  border-radius: 4px;
}

.timeline-item:hover .timeline-edit-btn {
  opacity: 1;
}

.timeline-edit-btn:hover {
  background: #f1f5f9;
}

.management-status-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 28px;
  padding: 0 12px;
  border: 1px solid #d9e2ef;
  border-radius: 999px;
  background: #fff;
  color: #1f2937;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  line-height: 1;
}

.management-status-trigger:hover {
  border-color: #bfd3ea;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.06);
}

.management-status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #94a3b8;
  flex-shrink: 0;
}

.management-status-trigger-value {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
  white-space: nowrap;
}

.management-status-trigger-caret {
  font-size: 10px;
  color: #94a3b8;
  transition: transform 0.2s ease;
  margin-left: 2px;
}

.management-status-trigger.is-open .management-status-trigger-caret {
  transform: rotate(180deg);
}

.management-status-trigger.tone-PENDING {
  background: #fffaf0;
  border-color: #f3d6a1;
}

.management-status-trigger.tone-PENDING .management-status-indicator {
  background: #d97706;
}

.management-status-trigger.tone-PENDING .management-status-trigger-value {
  color: #b45309;
}

.management-status-trigger.tone-TRIAGED {
  background: #eef2ff;
  border-color: #c7d2fe;
}

.management-status-trigger.tone-TRIAGED .management-status-indicator {
  background: #4f46e5;
}

.management-status-trigger.tone-TRIAGED .management-status-trigger-value {
  color: #4338ca;
}

.management-status-trigger.tone-PROCESSING {
  background: #f5f9ff;
  border-color: #c8dcfb;
}

.management-status-trigger.tone-PROCESSING .management-status-indicator {
  background: #2563eb;
}

.management-status-trigger.tone-PROCESSING .management-status-trigger-value {
  color: #1d4ed8;
}

.management-status-trigger.tone-PENDING_CONFIRM {
  background: #fffbeb;
  border-color: #fcd34d;
}

.management-status-trigger.tone-PENDING_CONFIRM .management-status-indicator {
  background: #d97706;
}

.management-status-trigger.tone-PENDING_CONFIRM .management-status-trigger-value {
  color: #b45309;
}

.management-status-trigger.tone-RESOLVED {
  background: #f3fbf6;
  border-color: #b7e2c6;
}

.management-status-trigger.tone-RESOLVED .management-status-indicator {
  background: #16a34a;
}

.management-status-trigger.tone-RESOLVED .management-status-trigger-value {
  color: #15803d;
}

.management-status-trigger.tone-CLOSED {
  background: #f8fafc;
  border-color: #d5dde8;
}

.management-status-trigger.tone-CLOSED .management-status-indicator {
  background: #64748b;
}

.management-status-trigger.tone-CLOSED .management-status-trigger-value {
  color: #475569;
}

.management-status-trigger.tone-REOPENED {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.management-status-trigger.tone-REOPENED .management-status-indicator {
  background: #2563eb;
}

.management-status-trigger.tone-REOPENED .management-status-trigger-value {
  color: #1d4ed8;
}

.management-status-trigger.tone-REJECTED {
  background: #f8fafc;
  border-color: #d5dde8;
}

.management-status-trigger.tone-REJECTED .management-status-indicator {
  background: #64748b;
}

.management-status-trigger.tone-REJECTED .management-status-trigger-value {
  color: #475569;
}

.management-popover-panel {
  width: min(540px, calc(100vw - 32px));
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px 18px;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.14);
  overflow: hidden;
  background-clip: padding-box;
  isolation: isolate;
}

.management-header {
  margin-bottom: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.management-header .title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}.management-body {
  display: flex;
  gap: 24px;
}

.management-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 18px;
  justify-content: center;
}

.management-right {
  width: 232px;
  flex-shrink: 0;
  border-left: 1px solid #e5e7eb;
  padding-left: 16px;
  display: flex;
  flex-direction: column;
  max-height: 208px;
}

/* 步骤条样式 - 图标在文字上方 */
.steps-wrapper.vertical-layout {
  display: flex;
  align-items: flex-start;
  gap: 0;
  padding: 6px 0 2px;
}

.steps-wrapper.vertical-layout .step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  flex: 1;
}

.step-icon-wrapper {
  display: flex;
  align-items: center;
  position: relative;
  width: 100%;
  justify-content: center;
}

.step-icon {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 0.3s ease;
  z-index: 1;
  flex-shrink: 0;
}

.step-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #d1d5db;
  transition: all 0.3s ease;
}

.check-icon {
  color: #fff;
  font-weight: bold;
  font-size: 14px;
}

.current-icon {
  color: #fff;
  font-size: 10px;
}

.step-label {
  font-size: 12px;
  color: #6b7280;
  transition: all 0.3s ease;
  margin-top: 8px;
  text-align: center;
}

.step-reopen-hint {
  display: block;
  margin-top: 2px;
  font-size: 10px;
  color: #3b82f6;
  font-weight: 500;
}

.step-line {
  position: absolute;
  top: 50%;
  left: calc(50% + 14px);
  right: calc(-50% + 14px);
  height: 2px;
  background: #e5e7eb;
  z-index: 0;
  transition: all 0.3s ease;
  transform: translateY(-50%);
}

/* 步骤状态样式 */
.step-item.is-completed .step-icon {
  background: #10b981;
}

.step-item.is-completed .step-label {
  color: #10b981;
  font-weight: 500;
}

.step-item.is-completed .step-line {
  background: #10b981;
}

.step-item.is-active .step-icon {
  background: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
}

.step-item.is-active .step-dot {
  background: #fff;
  width: 10px;
  height: 10px;
}

.step-item.is-active .step-label {
  color: #3b82f6;
  font-weight: 600;
}

.step-item.is-pending .step-icon {
  background: #f3f4f6;
  border: 2px solid #d1d5db;
}

.step-item.is-pending .step-dot {
  background: #d1d5db;
}

/* 操作按钮行 - 与步骤条对齐 */
.action-buttons-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-left: 10px;
  margin-top: 4px;
}

/* 日志区域 */
.log-header {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
  flex-shrink: 0;
}

.log-timeline-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.log-timeline {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 156px;
  overflow-y: auto;
  padding-right: 6px;
}

.log-timeline::-webkit-scrollbar {
  width: 4px;
}

.log-timeline::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 2px;
}

.log-timeline::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 2px;
}

.log-timeline::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.log-item {
  display: flex;
  gap: 10px;
  position: relative;
}

.log-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d1d5db;
  margin-top: 5px;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

/* 日志类型色点 */
.log-dot.type-system {
  background: #9ca3af;
}

.log-dot.type-view {
  background: #3b82f6;
}

.log-dot.type-operation {
  background: #10b981;
}

.log-dot.type-resolve {
  background: #8b5cf6;
}

.log-dot.type-close {
  background: #ef4444;
}

.log-item:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 3px;
  top: 14px;
  bottom: -16px;
  width: 2px;
  background: #e5e7eb;
}

.log-content {
  flex: 1;
}

.log-text {
  font-size: 12px;
  color: #374151;
  line-height: 1.45;
  margin-bottom: 3px;
  font-weight: 500;
}

.log-remark {
  font-size: 11px;
  color: #6b7280;
  background: #f9fafb;
  padding: 5px 8px;
  border-radius: 6px;
  margin-bottom: 5px;
  line-height: 1.45;
}

.log-time {
  font-size: 11px;
  color: #9ca3af;
}

/* 评论区 */
.comment-section {
  background: #fff;
  padding: 32px 36px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.comment-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 20px 0;
}

/* 反馈已关闭提示（行内紧凑样式） */
.closed-notice {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  margin-bottom: 20px;
  font-size: 13px;
  color: #6b7280;
}

.closed-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.closed-text {
  line-height: 1.4;
}

/* 评论表单 */
.comment-form,
.reply-form {
  margin-bottom: 32px;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}

/* 评论列表 */
.comment-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.comment-item {
  padding-bottom: 24px;
  border-bottom: 1px solid #f0f0f0;
}

.comment-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.comment-main {
  display: flex;
  gap: 12px;
}

.comment-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  flex-shrink: 0;
}

.comment-avatar.small {
  width: 32px;
  height: 32px;
  font-size: 14px;
}

.comment-body {
  flex: 1;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.comment-user {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.admin-badge {
  padding: 2px 8px;
  background: #ff9800;
  color: white;
  border-radius: 999px;
  font-size: 11px;
}

.reply-to {
  font-size: 13px;
  color: #667eea;
}

.comment-time {
  font-size: 12px;
  color: #999;
  margin-left: auto;
}

.comment-content {
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  margin-bottom: 8px;
  white-space: pre-wrap;
}

.comment-actions {
  display: flex;
  gap: 12px;
}

/* 回复列表 */
.reply-list {
  margin-left: 52px;
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-left: 16px;
  border-left: 2px solid #f0f0f0;
}

.reply-item {
  display: flex;
  gap: 12px;
}

.reply-form {
  margin-left: 52px;
  margin-top: 16px;
}

.empty-comments {
  padding: 60px 0;
}

/* 评论区空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 14px;
  color: #9ca3af;
}

.load-more-box {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

/* 状态变更模态框样式 */
.status-update-modal :deep(.n-card-header) {
  border-bottom: 1px solid #e5e7eb;
  padding: 16px 20px;
}

.status-update-modal :deep(.n-card__content) {
  padding: 20px;
}

.status-update-modal :deep(.n-card__footer) {
  border-top: 1px solid #e5e7eb;
  padding: 12px 20px;
}

.status-modal-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 操作预览 */
.operation-preview {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #bae6fd;
}

.preview-label {
  font-size: 12px;
  color: #0369a1;
  margin-bottom: 8px;
  font-weight: 500;
}

.preview-content {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
}

.from-status {
  color: #6b7280;
  font-weight: 500;
}

.arrow-icon {
  color: #3b82f6;
  font-weight: bold;
  font-size: 16px;
}

.to-status {
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 13px;
}

.to-status.status-PROCESSING {
  background: #eff6ff;
  color: #1d4ed8;
}

.to-status.status-TRIAGED {
  background: #eff6ff;
  color: #1d4ed8;
}

.to-status.status-PENDING_CONFIRM {
  background: #eff6ff;
  color: #1d4ed8;
}

.to-status.status-RESOLVED {
  background: #eff6ff;
  color: #1d4ed8;
}

.to-status.status-REOPENED {
  background: #eff6ff;
  color: #1d4ed8;
}

.to-status.status-CLOSED {
  background: #f1f5f9;
  color: #64748b;
}

.to-status.status-REJECTED {
  background: #f1f5f9;
  color: #64748b;
}

/* 输入区域 */
.input-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.required-mark {
  color: #ef4444;
}

.input-hint {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 4px;
}

/* 快捷短语 */
.quick-phrases {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quick-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.quick-label {
  font-size: 13px;
  color: #374151;
  font-weight: 500;
}

.quick-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.quick-tag {
  cursor: pointer;
  transition: all 0.2s ease;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
}

.quick-tag:hover {
  background: #3b82f6;
  color: #fff;
  border-color: #3b82f6;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}

.quick-tag.is-active {
  background: #10b981;
  color: #fff;
  border-color: #10b981;
}

/* 高级选项 */
.advanced-options {
  border-top: 1px solid #e5e7eb;
  padding-top: 16px;
}

.option-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: background 0.2s ease;
}

.option-item:hover {
  background: #f9fafb;
}

.option-checkbox {
  width: 18px;
  height: 18px;
  border: 2px solid #d1d5db;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
  transition: all 0.2s ease;
}

.option-checkbox.is-checked {
  background: #3b82f6;
  border-color: #3b82f6;
}

.option-checkbox .check-icon {
  color: #fff;
  font-size: 12px;
  font-weight: bold;
}

.option-content {
  flex: 1;
}

.option-title {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.option-desc {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 2px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 响应式 */
@media (max-width: 768px) {
  .page-wrapper {
    padding: 16px 12px;
  }

  .detail-card,
  .comment-section {
    padding: 20px 16px;
  }

  .detail-title {
    font-size: 22px;
  }

  .detail-header {
    flex-direction: column;
    align-items: stretch;
  }

  .detail-header-right {
    width: 100%;
    justify-content: space-between;
    margin-left: 0;
  }

  .management-status-trigger {
    width: 100%;
    justify-content: space-between;
  }

  .management-popover-panel {
    width: min(100vw - 24px, 500px);
    padding: 16px;
  }

  .reply-list {
    margin-left: 32px;
  }

  .reply-form {
    margin-left: 32px;
  }

  .management-body {
    flex-direction: column;
    gap: 24px;
  }

  .management-right {
    width: 100%;
    border-left: none;
    border-top: 1px solid #e5e7eb;
    padding-left: 0;
    padding-top: 20px;
  }

  .steps-wrapper {
    padding: 4px 0;
  }

  .step-label {
    font-size: 12px;
  }
}
</style>

<!--
  反馈状态弹窗的 popover 容器样式：
  Naive UI 的 n-popover 会被 teleport 到 <body> 下，scoped 样式无法通过
  :deep(.n-popover...) 命中（编译产物 [data-v-xxx] .n-popover 选择器无法匹配）。
  这里通过透传到 popover 根节点的 class 进行精确覆盖，避免容器自带的矩形 box-shadow
  在面板圆角四个角处“漏出”形成可见的瑕疵角。
-->
<style>
.feedback-management-popover.n-popover.n-popover--raw {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  border-radius: 0 !important;
  padding: 0 !important;
}

.feedback-management-popover.n-popover .n-popover-arrow-wrapper,
.feedback-management-popover.n-popover .n-popover-arrow {
  display: none !important;
  opacity: 0 !important;
  visibility: hidden !important;
}
</style>
