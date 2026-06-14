const baseURL = fetchConfig.baseURL

export const getWebsiteAuthHeaders = () => {
  // 与 useHttp.js 的 resolveToken 保持完全一致：优先 cookie，客户端兜底 localStorage
  let tokenValue = ''
  try {
    tokenValue = useCookie('token').value || ''
  } catch {}
  if (!tokenValue && process.client) {
    tokenValue = localStorage.getItem('token') || localStorage.getItem('Token') || ''
  }
  const headers = { appid: 'bd9d01ecc75dbbaaefce' }
  if (tokenValue) {
    headers.token = tokenValue
    headers.Authorization = 'Bearer ' + tokenValue
  }
  return headers
}

/** 获取标签列表（无需登录） */
export async function apiWebsiteTags(keyword) {
  return $fetch('/website/tags', {
    method: 'GET',
    baseURL,
    headers: getWebsiteAuthHeaders(),
    params: keyword ? { keyword } : {},
  })
}

/** 查询网站列表（无需登录，POST 分页） */
export async function apiWebsiteList(body) {
  return $fetch('/website/list', {
    method: 'POST',
    baseURL,
    headers: getWebsiteAuthHeaders(),
    body,
  })
}

/** 增加点击次数（无需登录） */
export async function apiWebsiteClick(id) {
  return $fetch('/website/click', {
    method: 'PUT',
    baseURL,
    headers: getWebsiteAuthHeaders(),
    params: { id },
  })
}

/** 提交网站申请（需登录，需权限 website:submit） */
export async function apiWebsiteSubmit(body) {
  return $fetch('/website/submit', {
    method: 'POST',
    baseURL,
    headers: getWebsiteAuthHeaders(),
    body,
  })
}

/** 收藏网站（需登录，需权限 website:favorite） */
export async function apiWebsiteFavorite(websiteId) {
  return $fetch('/website/favorite', {
    method: 'POST',
    baseURL,
    headers: getWebsiteAuthHeaders(),
    params: { websiteId },
  })
}

/** 取消收藏（需登录，需权限 website:favorite:cancel） */
export async function apiWebsiteCancelFavorite(websiteId) {
  return $fetch('/website/del', {
    method: 'GET',
    baseURL,
    headers: getWebsiteAuthHeaders(),
    params: { websiteId },
  })
}

/** 我的收藏列表（需登录，需权限 website:favorite:list） */
export async function apiWebsiteMyFavorites(pageNum = 1, pageSize = 10) {
  return $fetch('/website/Favorites', {
    method: 'GET',
    baseURL,
    headers: getWebsiteAuthHeaders(),
    params: { pageNum, pageSize },
  })
}

/** 提交评价（需登录，需权限 website:rating:submit） */
export async function apiWebsiteRating(websiteId, ratingType) {
  return $fetch('/website/rating/submit', {
    method: 'POST',
    baseURL,
    headers: getWebsiteAuthHeaders(),
    body: { websiteId, ratingType },
  })
}

/** 公告栏：新上线网站（无需登录） */
export async function apiWebsiteNotices(limit = 10) {
  return $fetch('/website/notices', {
    method: 'GET',
    baseURL,
    headers: getWebsiteAuthHeaders(),
    params: { limit },
  })
}

/** 动态栏：用户好评动态（无需登录） */
export async function apiWebsiteDynamics(limit = 10) {
  return $fetch('/website/dynamics', {
    method: 'GET',
    baseURL,
    headers: getWebsiteAuthHeaders(),
    params: { limit },
  })
}

/** 下载导入模板（需权限 website:import 或 website:import:admin） */
export async function apiWebsiteImportTemplate() {
  const headers = getWebsiteAuthHeaders()
  const url = baseURL + '/website/import/template'
  // 用原生 fetch 获取文件流，ofetch 不支持 blob responseType
  const res = await fetch(url, { method: 'GET', headers })
  if (!res.ok) throw new Error('下载模板失败')
  const blob = await res.blob()
  // 从 Content-Disposition 取文件名，兜底用中文名
  const disposition = res.headers.get('content-disposition') || ''
  const match = disposition.match(/filename\*?=(?:UTF-8''|\s*"?)([^";\s]+)/i)
  const fileName = match ? decodeURIComponent(match[1]) : '实用网站导入模板.xlsx'
  return { blob, fileName }
}

/** 普通用户批量导入，进审核队列（需权限 website:import） */
export async function apiWebsiteImport(file) {
  const headers = getWebsiteAuthHeaders()
  // Content-Type 让浏览器自动设置 multipart boundary，不能手动指定
  delete headers['Content-Type']
  const formData = new FormData()
  formData.append('file', file)
  return $fetch('/website/import', {
    method: 'POST',
    baseURL,
    headers,
    body: formData,
  })
}

/** 管理员批量导入，直接发布（需权限 website:import:admin） */
export async function apiWebsiteImportAdmin(file) {
  const headers = getWebsiteAuthHeaders()
  delete headers['Content-Type']
  const formData = new FormData()
  formData.append('file', file)
  return $fetch('/website/import/admin', {
    method: 'POST',
    baseURL,
    headers,
    body: formData,
  })
}
