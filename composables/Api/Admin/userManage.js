/**
 * 用户管理 API
 */
import { fetchConfig } from '~/composables/useHttp'

function getAuthHeaders() {
    const headers = { appid: fetchConfig.headers.appid }
    if (process.client) {
        let token = ''
        try { token = useCookie('token').value || '' } catch {}
        if (!token) {
            token = localStorage.getItem('token') || localStorage.getItem('Token') || ''
        }
        if (token) {
            headers.token = token
            headers.Authorization = `Bearer ${token}`
        }
    }
    return headers
}

/** 查询用户列表 */
export function apiGetUserManageList(params) {
    return $fetch(`${fetchConfig.baseURL}/admin/user/list`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: params
    })
}

/** 标记用户违规 */
export function apiRecordViolation(params) {
    return $fetch(`${fetchConfig.baseURL}/admin/user/violation/record`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: params
    })
}

/** 拉黑用户 */
export function apiBlockUser(params) {
    return $fetch(`${fetchConfig.baseURL}/admin/user/block`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: params
    })
}

/** 解除拉黑 */
export function apiUnblockUser(params) {
    return $fetch(`${fetchConfig.baseURL}/admin/user/unblock`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: params
    })
}

/** 查询用户违规记录 */
export function apiGetViolationList(userId) {
    return $fetch(`${fetchConfig.baseURL}/admin/user/violation/list?userId=${userId}`, {
        method: 'GET',
        headers: getAuthHeaders()
    })
}

/** 撤销违规记录 */
export function apiRevokeViolation(violationId) {
    return $fetch(`${fetchConfig.baseURL}/admin/user/violation/revoke`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: { violationId }
    })
}

/** 查询用户详情 */
export function apiGetUserDetail(userId) {
    return $fetch(`${fetchConfig.baseURL}/admin/user/detail?userId=${userId}`, {
        method: 'GET',
        headers: getAuthHeaders()
    })
}

/** 查询可分配角色列表 */
export function apiGetAssignableRoles() {
    return $fetch(`${fetchConfig.baseURL}/admin/user/roles/assignable`, {
        method: 'GET',
        headers: getAuthHeaders()
    })
}

/** 给用户添加角色（支持有效期） */
export function apiAddUserRole(userId, roleId, expireTime, permanent) {
    const body = { userId, roleId }
    if (expireTime) body.expireTime = expireTime
    if (permanent) body.permanent = true
    return $fetch(`${fetchConfig.baseURL}/admin/user/roles/add`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body
    })
}

/** 删除用户角色 */
export function apiRemoveUserRole(userId, roleId) {
    return $fetch(`${fetchConfig.baseURL}/admin/user/roles/remove`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: { userId, roleId }
    })
}

/** 修改用户信息（用户名、密码、积分、性别、个人简介） */
export function apiUpdateUser(params) {
    return $fetch(`${fetchConfig.baseURL}/admin/user/update`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: params
    })
}

/** 修改用户角色有效期（续期/减期） */
export function apiUpdateRoleExpire(userId, roleId, expireTime, permanent) {
    const body = { userId, roleId }
    if (expireTime) body.expireTime = expireTime
    if (permanent) body.permanent = true
    return $fetch(`${fetchConfig.baseURL}/admin/user/roles/expire`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body
    })
}
