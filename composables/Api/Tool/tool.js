const baseURL = fetchConfig.baseURL;
const APP_ID = 'bd9d01ecc75dbbaaefce';

export const getToolAuthHeaders = () => {
  let tokenValue = '';
  try {
    tokenValue = useCookie('token').value || '';
  } catch {}
  if (process.client) {
    tokenValue = localStorage.getItem('token') || localStorage.getItem('Token') || tokenValue;
  }

  const headers = {
    appid: APP_ID,
  };
  if (tokenValue) {
    headers.Authorization = 'Bearer ' + tokenValue;
    headers.token = tokenValue;
  }
  return headers;
};

export function useToolSearchApi(body) {
  return useHttpPost('ToolSearch', '/tool/search', {
    body,
    headers: getToolAuthHeaders(),
    lazy: true,
    server: false,
    watch: false,
  });
}

export async function apiToolTags(keyword) {
  return $fetch('/tool/tags', {
    method: 'GET',
    baseURL,
    headers: getToolAuthHeaders(),
    query: keyword ? { keyword } : undefined,
  });
}

export async function apiRecommendToolTags() {
  return $fetch('/tool/tags/recommend', {
    method: 'GET',
    baseURL,
    headers: getToolAuthHeaders(),
  });
}

export async function apiToolDetail(id) {
  return $fetch(`/tool/detail/${id}`, {
    method: 'GET',
    baseURL,
    headers: getToolAuthHeaders(),
  });
}

export async function apiRecordToolView(id) {
  return $fetch(`/tool/view/${id}`, {
    method: 'POST',
    baseURL,
    headers: getToolAuthHeaders(),
  });
}

export async function apiToolRecommend(body) {
  return $fetch('/tool/recommend', {
    method: 'POST',
    baseURL,
    headers: getToolAuthHeaders(),
    body,
  });
}

export async function apiToolSystemAnnouncements() {
  return $fetch('/tool/announcement/systemNotice/latest', {
    method: 'GET',
    baseURL,
    headers: getToolAuthHeaders(),
  });
}

export async function apiToolUserAnnouncements() {
  return $fetch('/tool/announcement/userNotice/latest', {
    method: 'GET',
    baseURL,
    headers: getToolAuthHeaders(),
  });
}

export async function apiCurrentToolQuota() {
  return $fetch('/tool/quota/current', {
    method: 'GET',
    baseURL,
    headers: getToolAuthHeaders(),
  });
}

export async function apiToolQuotaPackages() {
  return $fetch('/tool/purchase/packages', {
    method: 'GET',
    baseURL,
    headers: getToolAuthHeaders(),
  });
}

export async function apiCreateToolPurchaseOrder(body) {
  return $fetch('/tool/purchase/create', {
    method: 'POST',
    baseURL,
    headers: getToolAuthHeaders(),
    body,
  });
}

export async function apiSaveToolQuotaPackage(body) {
  return $fetch('/tool/purchase/package/save', {
    method: 'POST',
    baseURL,
    headers: getToolAuthHeaders(),
    body,
  });
}

export async function apiDeleteToolQuotaPackage(packageId) {
  return $fetch('/tool/purchase/package/delete', {
    method: 'POST',
    baseURL,
    headers: getToolAuthHeaders(),
    body: { packageId },
  });
}

export async function apiSaveTool(body) {
  return $fetch('/tool/save', {
    method: 'POST',
    baseURL,
    headers: getToolAuthHeaders(),
    body,
  });
}

export async function apiUpdateTool(body) {
  return $fetch('/tool/update', {
    method: 'POST',
    baseURL,
    headers: getToolAuthHeaders(),
    body,
  });
}

export async function apiCollectTool(toolId) {
  return $fetch('/tool/collection/add', {
    method: 'POST',
    baseURL,
    headers: getToolAuthHeaders(),
    body: { toolId },
  });
}

export async function apiRemoveCollectTool(toolId) {
  return $fetch('/tool/collection/remove', {
    method: 'POST',
    baseURL,
    headers: getToolAuthHeaders(),
    body: { toolId },
  });
}

export async function apiDeleteTool(ids) {
  return $fetch('/tool/delete', {
    method: 'POST',
    baseURL,
    headers: getToolAuthHeaders(),
    body: { ids },
  });
}

export async function apiConsumeToolUsage(body) {
  return $fetch('/tool/use/consume', {
    method: 'POST',
    baseURL,
    headers: getToolAuthHeaders(),
    body,
  });
}

export async function apiVoteGoodTool(toolId) {
  return $fetch('/tool/vote/good', {
    method: 'POST',
    baseURL,
    headers: getToolAuthHeaders(),
    body: { toolId },
  });
}

export async function apiVoteBadTool(toolId) {
  return $fetch('/tool/vote/bad', {
    method: 'POST',
    baseURL,
    headers: getToolAuthHeaders(),
    body: { toolId },
  });
}

export async function apiToolPurchaseDetail(toolId) {
  return $fetch('/tool/purchase/detail', {
    method: 'GET',
    baseURL,
    headers: getToolAuthHeaders(),
    params: { toolId },
  });
}
