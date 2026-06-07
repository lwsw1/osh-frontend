function memberHeaders() {
  const token = useCookie('token')
  const headers = { appid: fetchConfig.headers.appid }
  if (token.value) {
    headers.token = token.value
    headers.Authorization = `Bearer ${token.value}`
  }
  return headers
}

function memberErrorMessage(err, fallback = '请求失败') {
  return err?.data?.msg || err?.data?.message || err?.response?._data?.msg || err?.response?._data?.message || err?.message || fallback
}

function unwrapMemberResponse(res) {
  if (res?.code !== undefined && res.code !== 200) {
    throw new Error(res.msg || res.data || '请求失败')
  }
  return res?.data ?? res
}

export async function apiGetMemberCenter() {
  const res = await $fetch('/user/member/center', {
    baseURL: fetchConfig.baseURL,
    headers: memberHeaders(),
  })
  return unwrapMemberResponse(res)
}

export async function apiGetMemberPlans() {
  const res = await $fetch('/user/member/plans', {
    baseURL: fetchConfig.baseURL,
    headers: memberHeaders(),
  })
  return unwrapMemberResponse(res)
}

export async function apiCreateMemberCheckout(body) {
  try {
    const res = await $fetch('/user/member/checkout', {
      baseURL: fetchConfig.baseURL,
      method: 'POST',
      headers: memberHeaders(),
      body,
    })
    return unwrapMemberResponse(res)
  } catch (err) {
    throw new Error(memberErrorMessage(err, '创建支付订单失败'))
  }
}

export async function apiGetMemberOrders() {
  const res = await $fetch('/user/member/orders', {
    baseURL: fetchConfig.baseURL,
    headers: memberHeaders(),
  })
  return unwrapMemberResponse(res)
}

export async function apiGetMemberPayStatus(orderNo) {
  const res = await $fetch('/user/member/pay-status', {
    baseURL: fetchConfig.baseURL,
    headers: memberHeaders(),
    query: { orderNo },
  })
  return unwrapMemberResponse(res)
}

export async function apiCancelMemberPay(orderNo) {
  const res = await $fetch('/pay/cancel', {
    baseURL: fetchConfig.baseURL,
    method: 'POST',
    headers: memberHeaders(),
    query: { orderNo },
  })
  return unwrapMemberResponse(res)
}
export async function apiGetMemberAdminPlans() {
  const res = await $fetch('/user/member/admin/plans', {
    baseURL: fetchConfig.baseURL,
    headers: memberHeaders(),
  })
  return unwrapMemberResponse(res)
}

export async function apiUpdateMemberPlanConfig(body) {
  const res = await $fetch('/user/member/admin/plan/config', {
    baseURL: fetchConfig.baseURL,
    method: 'POST',
    headers: memberHeaders(),
    body,
  })
  return unwrapMemberResponse(res)
}
export async function apiUpdateMemberPricingRule(body) {
  const res = await $fetch('/user/member/admin/plan/pricing-rule', {
    baseURL: fetchConfig.baseURL,
    method: 'POST',
    headers: memberHeaders(),
    body,
  })
  return unwrapMemberResponse(res)
}