/**
 * 原生 WebSocket 连接管理 + 消息通知状态
 *
 * 连接地址：ws://host/ws/connect?token=xxx
 * 消息格式：QAAnswerNotifyDTO JSON
 *   { type, questionId, questionSummary, answererNickname, answerSummary, createTime }
 */

// ─── 全局单例状态 ─────────────────────────────────────────────────────────────

export const useNotifications = () => useState('ws_notifications', () => [])
export const useUnreadCount   = () => useState('ws_unread', () => 0)
export const useWsStatus      = () => useState('ws_status', () => 'disconnected')
/** 开源项目广播公告列表（type=NEW_OPEN_PROJECT） */
export const useProjectAnnouncements = () => useState('ws_project_announcements', () => [])
export const useToolUserNoticeRefreshFlag = () => useState('ws_tool_user_notice_refresh', () => 0)

// ─── WebSocket 单例（非响应式）────────────────────────────────────────────────
let _ws = null
let _heartbeatTimer = null
let _reconnectTimer = null
let _manualClose = false   // 主动断开时不重连

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

function getWsBaseURL() {
  const hostname = window.location.hostname
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1'
  const host = isLocal ? 'localhost:8081' : '43.242.200.25:8081'
  return `ws://${host}`
}

function resolveToken() {
  try {
    const cookie = useCookie('token').value
    if (cookie) return cookie
  } catch {}
  return localStorage.getItem('token') || localStorage.getItem('Token') || ''
}

// ─── 主 Composable ────────────────────────────────────────────────────────────

export function useWebSocket() {
  const notifications = useNotifications()
  const unreadCount   = useUnreadCount()
  const wsStatus      = useWsStatus()
  const projectAnnouncements = useProjectAnnouncements()
  const toolUserNoticeRefreshFlag = useToolUserNoticeRefreshFlag()

  function connect() {
    if (!process.client) return
    if (_ws && (_ws.readyState === WebSocket.CONNECTING || _ws.readyState === WebSocket.OPEN)) return

    const token = resolveToken()
    if (!token) return

    _manualClose = false
    wsStatus.value = 'connecting'

    const url = `${getWsBaseURL()}/ws/connect?token=${encodeURIComponent(token)}`
    _ws = new WebSocket(url)

    _ws.onopen = () => {
      wsStatus.value = 'connected'
      console.log('[WS] 连接成功')
      _startHeartbeat()
    }

    _ws.onmessage = (event) => {
      if (event.data === 'pong') return   // 心跳回包
      try {
        // 后端统一消息格式 WsNotifyMessage：
        // { type, title, content, jumpUrl, bizId, createTime }
        const payload = JSON.parse(event.data)
        const msg = {
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type: payload.type || 'SYSTEM',
          title: payload.title || '新消息',
          content: payload.content || '',
          jumpUrl: payload.jumpUrl || null,
          bizId: payload.bizId || null,
          createTime: payload.createTime || new Date().toISOString(),
          read: false,
        }

        // 广播类型消息：不推送到小铃铛通知列表
        const BROADCAST_TYPES = ['NEW_OPEN_PROJECT', 'TOOL_USER_NOTICE_REFRESH']
        const isBroadcast = BROADCAST_TYPES.includes(msg.type)

        if (!isBroadcast) {
          notifications.value.unshift(msg)
          if (notifications.value.length > 50) notifications.value = notifications.value.slice(0, 50)
          unreadCount.value++
        }

        // 开源项目广播：写入公告列表
        if (msg.type === 'NEW_OPEN_PROJECT') {
          projectAnnouncements.value.unshift(msg)
          if (projectAnnouncements.value.length > 10) {
            projectAnnouncements.value = projectAnnouncements.value.slice(0, 10)
          }
        }

        if (msg.type === 'TOOL_USER_NOTICE_REFRESH') {
          toolUserNoticeRefreshFlag.value = Date.now()
          if (process.client && msg.title) {
            try {
              window.dispatchEvent(new CustomEvent('tool-announcement-toast', {
                detail: { title: msg.title }
              }))
              console.log('title : ' , msg.title);
            } catch (err) {
              console.error('[WS] 工具公告提示派发失败', err)
            }
          }
        }
      } catch (e) {
        console.error('[WS] 消息解析失败', e)
      }
    }

    _ws.onclose = () => {
      wsStatus.value = 'disconnected'
      _stopHeartbeat()
      console.log('[WS] 连接关闭')
      if (!_manualClose) {
        // 5 秒后自动重连
        _reconnectTimer = setTimeout(connect, 5000)
      }
    }

    _ws.onerror = (err) => {
      wsStatus.value = 'error'
      console.error('[WS] 连接错误', err)
    }
  }

  function disconnect() {
    _manualClose = true
    clearTimeout(_reconnectTimer)
    _stopHeartbeat()
    if (_ws) {
      _ws.close()
      _ws = null
    }
    wsStatus.value = 'disconnected'
  }

  function markAllRead() {
    notifications.value.forEach(n => (n.read = true))
    unreadCount.value = 0
  }

  function markRead(id) {
    const msg = notifications.value.find(n => n.id === id)
    if (msg && !msg.read) {
      msg.read = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
  }

  function clearAll() {
    notifications.value = []
    unreadCount.value = 0
  }

  return { notifications, unreadCount, wsStatus, connect, disconnect, markAllRead, markRead, clearAll, projectAnnouncements, toolUserNoticeRefreshFlag }
}

// ─── 心跳 ─────────────────────────────────────────────────────────────────────

function _startHeartbeat() {
  _stopHeartbeat()
  _heartbeatTimer = setInterval(() => {
    if (_ws && _ws.readyState === WebSocket.OPEN) {
      _ws.send('ping')
    }
  }, 30000)
}

function _stopHeartbeat() {
  if (_heartbeatTimer) {
    clearInterval(_heartbeatTimer)
    _heartbeatTimer = null
  }
}
