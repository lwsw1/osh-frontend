import { fetchConfig } from '~/composables/useHttp'

function getAuthHeaders() {
  const headers = { appid: fetchConfig.headers.appid }
  if (process.client) {
    let token = ''
    try { token = useCookie('token').value || '' } catch {}
    if (!token) token = localStorage.getItem('token') || localStorage.getItem('Token') || ''
    if (token) {
      headers.token = token
      headers.Authorization = `Bearer ${token}`
    }
  }
  return headers
}

function post(path, body = {}) {
  return $fetch(`${fetchConfig.baseURL}${path}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body
  })
}

function get(path) {
  return $fetch(`${fetchConfig.baseURL}${path}`, {
    method: 'GET',
    headers: getAuthHeaders()
  })
}

export function apiGetBehaviorMeta() {
  return get('/admin/behavior/meta')
}

export function apiGetBehaviorOverview(query) {
  return post('/admin/behavior/overview', query)
}

export function apiGetBehaviorEvents(query) {
  return post('/admin/behavior/events/page', query)
}

export function apiGetContributionSummary(query) {
  return post('/admin/behavior/contribution/summary', query)
}

export function apiGetContributionResources(query) {
  return post('/admin/behavior/contribution/resources', query)
}

export function apiGetContributionRevenue(query) {
  return post('/admin/behavior/contribution/revenue/page', query)
}

export function apiGetContributionCoefficients() {
  return get('/admin/behavior/contribution/coefficients')
}

export function apiSaveContributionCoefficients(config) {
  return post('/admin/behavior/contribution/coefficients', config)
}
