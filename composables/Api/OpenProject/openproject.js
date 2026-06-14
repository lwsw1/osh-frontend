import { fetchConfig } from '~/composables/useHttp'

const BASE = (() => {
  const base = fetchConfig.baseURL
  if (base.includes('/pc')) {
    return base + '/openproject'
  }
  return '/api/openproject'
})()

const getHeaders = () => {
  let token = ''
  if (process.client) {
    token = localStorage.getItem('token') || localStorage.getItem('Token') || ''
    if (!token) {
      try { token = useCookie('token').value || '' } catch {}
    }
  }
  return {
    token,
    appid: fetchConfig.headers.appid,
  }
}

const opFetch = (url, options = {}) =>
  $fetch(url, { ...options, headers: { ...getHeaders(), ...(options.headers || {}) } })

export const apiGetOpenProjectList = (params) =>
  opFetch(`${BASE}/list`, { method: 'POST', body: params })

export const apiGetOpenProjectTags = () =>
  opFetch(`${BASE}/tags`)

export const apiClickOpenProject = (id) =>
  opFetch(`${BASE}/click`, { method: 'PUT', params: { id } })

export const apiGetOpenProjectDetail = (id) =>
  opFetch(`${BASE}/detail/${id}`)

export const apiEditOpenProject = (data) =>
  opFetch(`${BASE}/edit`, { method: 'POST', body: data })

export const apiFavoriteOpenProject = (projectId) =>
  opFetch(`${BASE}/favorite`, { method: 'POST', params: { projectId } })

export const apiCancelFavoriteOpenProject = (projectId) =>
  opFetch(`${BASE}/favorite/cancel`, { method: 'POST', params: { projectId } })

export const apiGetOpenProjectRank = (rankType = 'star', period = 7, topN = 10) =>
  opFetch(`${BASE}/rank`, { params: { rankType, period, topN } })

export const apiGetOpenProjectSources = () =>
  opFetch(`${BASE}/source/list`)

export const apiSaveOpenProjectSource = (data) =>
  opFetch(`${BASE}/source/save`, { method: 'POST', body: data })

export const apiDeleteOpenProjectSource = (id) =>
  opFetch(`${BASE}/source/delete`, { method: 'POST', params: { id } })

export const apiSyncOpenProjectSource = (id) =>
  opFetch(`${BASE}/source/sync`, { method: 'POST', params: { id } })

export const apiSyncAllOpenProjectSources = () =>
  opFetch(`${BASE}/source/sync-all`, { method: 'POST' })

export const apiSearchOpenProjectResources = (params) =>
  opFetch(`${BASE}/resource/search`, { params })
