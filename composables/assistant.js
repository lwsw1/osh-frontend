import { fetchConfig } from '~/composables/useHttp'

const feedbackCategoryIconMap = {
  announcement: '📢',
  suggestion: '💡',
  lightbulb: '💡',
  bug: '🐛',
  question: '❓',
  help: '🆘',
  other: '📝',
  note: '📝',
}

/**
 * 工单状态元数据配置（唯一数据源）
 *
 * stepIndex  : 进度条节点位置（0-based），-1 表示不在主流程节点上
 * slaHours   : 该阶段 SLA 预计时长（小时）
 * tone       : 事件时间轴圆点色调，对应 CSS class tone-{tone}
 * label      : 对外展示文案
 */
export const FEEDBACK_STATUS_CONFIG = {
  PENDING:         { label: '已提交',     stepIndex: 0, slaHours: 24,       tone: 'status'   },
  TRIAGED:         { label: '已受理',     stepIndex: 1, slaHours: 24,       tone: 'status'   },
  PROCESSING:      { label: '处理中',     stepIndex: 2, slaHours: 72,       tone: 'status'   },
  PENDING_CONFIRM: { label: '待用户确认', stepIndex: 3, slaHours: 7 * 24,   tone: 'pending'  },
  RESOLVED:        { label: '已解决',     stepIndex: 4, slaHours: 24,       tone: 'resolved' },
  REOPENED:        { label: '问题仍在',   stepIndex: 2, slaHours: 72,       tone: 'reopen'   },
  CLOSED:          { label: '已关闭',     stepIndex: -1, slaHours: 24,      tone: 'closed'   },
  REJECTED:        { label: '已驳回',     stepIndex: -1, slaHours: 24,      tone: 'closed'   },
}

/** legacy 小写 code → 标准大写 code 映射（兼容历史数据） */
const LEGACY_STATUS_ALIAS = {
  submitted:       'PENDING',
  triaged:         'TRIAGED',
  triage:          'TRIAGED',
  in_progress:     'PROCESSING',
  processing:      'PROCESSING',
  pending:         'PENDING',
  pending_confirm: 'PENDING_CONFIRM',
  resolved:        'RESOLVED',
  done:            'RESOLVED',
  closed:          'CLOSED',
  reopened:        'REOPENED',
  rejected:        'REJECTED',
}

/** 将任意 status code（含 legacy）规范化为大写标准 code */
export function normalizeStatus(status) {
  if (!status) return ''
  return LEGACY_STATUS_ALIAS[status] || status
}

/** 获取状态展示文案 */
export function resolveFeedbackStatusText(status) {
  const cfg = FEEDBACK_STATUS_CONFIG[normalizeStatus(status)]
  return cfg?.label || status || ''
}

/** 获取状态对应的 SLA 小时数 */
export function resolveFeedbackStatusSlaHours(status) {
  return FEEDBACK_STATUS_CONFIG[normalizeStatus(status)]?.slaHours ?? 24
}

/** 获取状态对应的事件色调 */
export function resolveFeedbackStatusTone(status) {
  return FEEDBACK_STATUS_CONFIG[normalizeStatus(status)]?.tone ?? 'status'
}

/** 获取状态在进度条中的节点位置（-1 表示终态，不在主流程节点） */
export function resolveFeedbackStatusStepIndex(status) {
  return FEEDBACK_STATUS_CONFIG[normalizeStatus(status)]?.stepIndex ?? 0
}

const assistantHeaders = () => {
  let tokenValue = ''
  try {
    tokenValue = useCookie('token').value || ''
  } catch {}

  if (process.client) {
    tokenValue = localStorage.getItem('token') || localStorage.getItem('Token') || tokenValue
  }

  const headers = {
    appid: fetchConfig.headers.appid,
  }

  if (tokenValue) {
    headers.Authorization = `Bearer ${tokenValue}`
    headers.token = tokenValue
  }

  return headers
}

const assistantFetch = (url, options = {}) => {
  return $fetch(url, {
    baseURL: fetchConfig.baseURL,
    headers: {
      ...assistantHeaders(),
      ...(options.headers || {}),
    },
    ...options,
  })
}


export function resolveFeedbackCategoryIcon(category) {
  const iconKey = category?.icon || category?.categoryIcon || category?.code || category?.categoryCode
  return feedbackCategoryIconMap[iconKey] || category?.icon || category?.categoryIcon || '📝'
}



export function resolveFeedbackErrorMessage(error, fallbackMessage = '操作失败') {
  return error?.data?.msg || error?.data?.data || error?.msg || error?.message || fallbackMessage
}

export function assertAssistantResponseSuccess(response, fallbackMessage = '操作失败') {
  if (response?.code === 200) {
    return response.data
  }
  throw new Error(response?.msg || fallbackMessage)
}

export function apiGetAssistantInit(courseId) {
  return assistantFetch('/assistant/init', {
    params: courseId ? { courseId } : {},
  })
}

export function apiAskSiteQuestion(question) {
  return assistantFetch('/assistant/site-qa/ask', {
    method: 'POST',
    body: { question },
  })
}

export function apiAskCourseQuestion(courseId, question) {
  return assistantFetch('/assistant/course-qa/ask', {
    method: 'POST',
    body: { courseId, question },
  })
}

export function apiCreateAssistantFeedback(payload) {
  return apiCreateFeedback(payload)
}

export function apiGetMyAssistantFeedback() {
  return assistantFetch('/assistant/feedback/page', {
    method: 'POST',
    body: {
      queryMode: 'mine',
      pageNum: 1,
      pageSize: 50,
    },
  })
}

export function apiGetPendingConfirmCount() {
  return assistantFetch('/assistant/feedback/pending-confirm/count')
}

// ==================== 反馈系统 - 公开接口 ====================

/**
 * 获取反馈分类列表
 */
export function apiGetFeedbackCategories() {
  return assistantFetch('/feedback/category/list')
}

export function apiGetFeedbackTags(params = {}) {
  return assistantFetch('/feedback/tag/list', { query: params })
}

export function apiCreateFeedbackTag(payload) {
  return assistantFetch('/assistant/feedback/tag/create', {
    method: 'POST',
    body: payload,
  })
}

/**
 * 分页查询反馈列表
 */
export function apiPageFeedback(params) {
  return assistantFetch('/feedback/page', {
    method: 'POST',
    body: params,
  })
}

/**
 * 拉取反馈公告。
 */
export function apiGetFeedbackAnnouncements(limit = 10) {
  return assistantFetch('/feedback/announcement/list', {
    query: { limit },
  })
}

/**
 * 获取反馈详情
 */
export function apiGetFeedbackDetail(id) {
  return assistantFetch(`/feedback/detail/${id}`)
}

export function apiGetFeedbackStatusSummary(id) {
  return assistantFetch(`/feedback/status-summary/${id}`)
}

/**
 * 获取反馈处理记录列表
 */
export function apiGetFeedbackProcessRecords(feedbackId) {
  return assistantFetch(`/feedback/${feedbackId}/process-record/list`)
}

/**
 * 获取反馈评论列表
 */
export function apiGetFeedbackComments(feedbackId, pageNum = 1, pageSize = 20) {
  return assistantFetch(`/feedback/${feedbackId}/comment/list`, {
    params: { pageNum, pageSize },
  })
}

/**
 * 获取当前用户对反馈的互动状态
 */
export function apiGetFeedbackInteractionStatus(feedbackId) {
  return assistantFetch(`/feedback/${feedbackId}/interaction-status`)
}

// ==================== 反馈系统 - 用户接口 ====================

/**
 * 创建反馈
 */
export function apiCreateFeedback(payload) {
  return assistantFetch('/assistant/feedback/create', {
    method: 'POST',
    body: payload,
  })
}

/**
 * 发表评论
 */
export function apiCreateComment(feedbackId, payload) {
  return assistantFetch(`/assistant/feedback/${feedbackId}/comment`, {
    method: 'POST',
    body: payload,
  })
}

// ==================== 反馈系统 - 管理员接口 ====================

/**
 * 反馈管理列表（分页）
 */
export function apiAdminPageFeedback(params) {
  return assistantFetch('/admin/feedback/page', {
    method: 'POST',
    body: params,
  })
}

/**
 * 置顶反馈
 */
export function apiPinFeedback(feedbackId, pinOrder) {
  return assistantFetch(`/admin/feedback/${feedbackId}/pin`, {
    method: 'POST',
    params: { pinOrder },
  })
}

/**
 * 取消置顶
 */
export function apiUnpinFeedback(feedbackId) {
  return assistantFetch(`/admin/feedback/${feedbackId}/unpin`, {
    method: 'POST',
  })
}

/**
 * 更新反馈状态
 */
export function apiUpdateFeedbackStatus(feedbackId, payload) {
  return assistantFetch(`/admin/feedback/${feedbackId}/status`, {
    method: 'POST',
    body: payload,
  })
}

/**
 * 追加处理备注（不改变状态）
 */
export function apiAppendFeedbackRemark(feedbackId, remark) {
  return assistantFetch(`/admin/feedback/${feedbackId}/remark`, {
    method: 'POST',
    body: { remark },
  })
}

/**
 * 修改处理记录备注
 */
export function apiUpdateProcessRecordRemark(recordId, remark) {
  return assistantFetch(`/admin/feedback/process-record/${recordId}/remark`, {
    method: 'PUT',
    body: { remark },
  })
}

/**
 * 提交人确认工单结果
 */
export function apiConfirmFeedbackStatus(feedbackId, payload) {
  return assistantFetch(`/assistant/feedback/${feedbackId}/confirm`, {
    method: 'POST',
    body: payload,
  })
}

/**
 * 删除反馈
 */
export function apiDeleteFeedback(feedbackId) {
  return assistantFetch(`/admin/feedback/${feedbackId}`, {
    method: 'DELETE',
  })
}

// ==================== 反馈系统 - 互动接口（点赞、收藏）====================

/**
 * 点赞反馈
 */
export function apiLikeFeedback(feedbackId) {
  return assistantFetch(`/feedback/${feedbackId}/like`, {
    method: 'POST',
  })
}

/**
 * 取消点赞
 */
export function apiUnlikeFeedback(feedbackId) {
  return assistantFetch(`/feedback/${feedbackId}/like`, {
    method: 'DELETE',
  })
}

/**
 * 收藏反馈
 */
export function apiFavoriteFeedback(feedbackId) {
  return assistantFetch(`/feedback/${feedbackId}/favorite`, {
    method: 'POST',
  })
}

/**
 * 取消收藏
 */
export function apiUnfavoriteFeedback(feedbackId) {
  return assistantFetch(`/feedback/${feedbackId}/favorite`, {
    method: 'DELETE',
  })
}

// ==================== MCP 调试测试接口 ====================

/**
 * 健康检查
 */
export function apiMcpHealthCheck() {
  return $fetch('/public/mcp-debug/health', {
    baseURL: fetchConfig.baseURL,
    headers: { appid: fetchConfig.headers.appid },
  })
}

/**
 * 数据库连接测试
 */
export function apiMcpTestDatabase() {
  return $fetch('/public/mcp-debug/test-database', {
    baseURL: fetchConfig.baseURL,
    headers: { appid: fetchConfig.headers.appid },
  })
}

/**
 * 完整链路测试
 */
export function apiMcpTestFullChain() {
  return $fetch('/public/mcp-debug/test-full-chain', {
    baseURL: fetchConfig.baseURL,
    headers: { appid: fetchConfig.headers.appid },
  })
}
