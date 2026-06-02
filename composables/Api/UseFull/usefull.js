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
