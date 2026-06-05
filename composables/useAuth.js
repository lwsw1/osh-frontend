import { createDiscreteApi } from "naive-ui";
           
const { message } = createDiscreteApi(["message"])

export const useUser = ()=> useState("user",()=>null)

/** Member level required to take exams (aligned with backend VIP gate, level >= 2). */
export const MIN_EXAM_MEMBER_LEVEL = 2

/**
 * Current user's member level (0 = free / unknown).
 * Prefer in-memory user.role, then persisted login role in localStorage.
 */
export function getUserMemberLevel() {
  let level = 0
  const user = useUser()
  const fromUser = Number(user.value?.role?.level)
  if (Number.isFinite(fromUser) && fromUser >= 0) {
    level = fromUser
  }
  if (process.client) {
    try {
      const roleStr = localStorage.getItem('__user_role__')
      const role = roleStr ? JSON.parse(roleStr) : null
      const fromLs = Number(role?.level ?? NaN)
      if (Number.isFinite(fromLs) && fromLs >= 0) {
        level = Math.max(level, fromLs)
      }
    } catch {}
  }
  return level
}

export function canTakeExam() {
  return getUserMemberLevel() >= MIN_EXAM_MEMBER_LEVEL
}

/** osh_role.level 4–6：考试后台管理（与后端 @examLevelAuth 对齐） */
export const MIN_EXAM_ADMIN_ROLE_LEVEL = 4
export const MAX_EXAM_ADMIN_ROLE_LEVEL = 6

export function canManageExamByRoleLevel() {
  const lv = getUserMemberLevel()
  return lv >= MIN_EXAM_ADMIN_ROLE_LEVEL && lv <= MAX_EXAM_ADMIN_ROLE_LEVEL
}

// 权限列表：优先从 localStorage 读，保证刷新后不丢失
export const usePermissions = () => {
  const state = useState("permissions", () => {
    if (process.client) {
      try {
        const stored = localStorage.getItem('__permissions__')
        return stored ? JSON.parse(stored) : []
      } catch { return [] }
    }
    return []
  })
  return state
}

// 保存权限到 localStorage
export const savePermissions = (list) => {
  if (process.client) {
    try {
      localStorage.setItem('__permissions__', JSON.stringify(list || []))
    } catch {}
  }
}

// 清除权限
export const clearPermissions = () => {
  if (process.client) {
    localStorage.removeItem('__permissions__')
    localStorage.removeItem('__user_role__')
    localStorage.removeItem('__user_asset__')
  }
}

export const clearAuthState = () => {
  const user = useUser()
  user.value = null

  const token = useCookie("token")
  token.value = null

  if (process.client) {
    localStorage.removeItem('token')
    localStorage.removeItem('Token')
    localStorage.removeItem('__user_cache__')
  }

  clearPermissions()
  const permissions = usePermissions()
  permissions.value = []
}

let authExpiredHandling = false

export const handleAuthExpired = (redirectTo = null, tip = "登录已过期，请重新登录") => {
  if (!process.client) return
  // 并发请求同时失效时，只处理一次，避免重复弹错和重复跳转。
  if (authExpiredHandling) return
  authExpiredHandling = true

  clearAuthState()
  message.error(tip)

  const currentPath = window.location.pathname + window.location.search
  const target = redirectTo || `/login?from=${encodeURIComponent(currentPath)}`

  window.location.href = target
}

// 更新用户信息
export async function useRefreshUserInfo(){
    const token = useCookie("token")
    const user = useUser()
    // 用户已登录，直接获取用户信息
    if(token.value){
        let {
            data,
            error
        } = await useGetinfoApi()

        if(data.value){
            // 从 localStorage 恢复 asset，避免 getinfo 不返回 asset 时丢失
            let restoredAsset = user.value?.asset || null
            if (!restoredAsset && process.client) {
                try {
                    const stored = localStorage.getItem('__user_asset__')
                    restoredAsset = stored ? JSON.parse(stored) : null
                } catch {}
            }

            // 合并数据，保留 permissionList、asset 等登录时存的字段
            user.value = {
                ...user.value,
                ...data.value,
                // getinfo 不返回 asset，手动补回
                asset: restoredAsset,
            }
            if (process.client && data.value.role) {
              try {
                localStorage.setItem('__user_role__', JSON.stringify(data.value.role))
              } catch {}
            }
        }
    }
}

// 退出登录
export async function useLogout(){
    try {
        await useLogoutApi()
    } catch (_) {
        // 远端 logout 失败（网络/Redis 抖动）不阻塞本地退出
    }
    clearAuthState()
    // 断开 WebSocket 连接并清空通知
    if (process.client) {
        const { disconnect, clearAll } = useWebSocket()
        disconnect()
        clearAll()
    }
    message.success("退出登录成功")
    // 强制跳转首页并刷新，确保内存状态完全清除
    if (process.client) {
        window.location.href = '/'
    }
}

// 登录并且绑定手机号之后才能操作
export function useHasAuth(callback = null){
    const route = useRoute()
    const token = useCookie("token")
    const user = useUser()
    // 未登录
    if(!token.value){
        message.error("请先登录")
        return navigateTo("/login?from="+route.fullPath)
    }

    // 未绑定手机号 
    // const phone = user.value?.phone
    // if(!phone && route.name != 'bindphone'){
    //     message.error("请先绑定手机号")
    //     return navigateTo("/bindphone?from="+route.fullPath)
    // }

    if(callback && typeof callback === "function"){
        callback()
    }
}

// 管理员权限判断（基于用户等级或权限列表）
// 优先级：
// 1. 如果用户对象中有 level/userLevel 字段，使用字段值判断
// 2. 否则使用权限列表判断（有 group:* 或 * 权限视为管理员）
export function useHasGroupAdminPermission() {
    const user = useUser()
    const permissions = usePermissions()
    
    return computed(() => {
        // 未登录用户没有权限
        if (!user.value) {
            if (process.client) {
                console.log('[useHasGroupAdminPermission] 用户未登录')
            }
            return false
        }
        
        // 方式1：尝试从用户对象获取等级字段
        const userLevel = user.value?.userLevel ?? 
                         user.value?.level ?? 
                         user.value?.role ?? 
                         user.value?.type ?? 
                         user.value?.user_type ?? 
                         null
        
        // 如果有等级字段，使用等级判断
        if (userLevel !== null && userLevel !== undefined) {
            const isAdmin = userLevel <= 2
            if (process.client) {
                console.log('=== 管理员权限检查（使用等级字段）===')
                console.log('userLevel:', userLevel)
                console.log('isAdmin:', isAdmin)
            }
            return isAdmin
        }
        
        // 方式2：使用权限列表判断
        const permList = Array.isArray(permissions.value) ? permissions.value : []
        
        // 如果有超级管理员权限（* 或 *:*:*）
        if (permList.includes('*') || permList.includes('*:*:*')) {
            if (process.client) {
                console.log('=== 管理员权限检查（使用权限列表-超级管理员）===')
                console.log('permissions:', permList)
                console.log('isAdmin: true (超级管理员)')
            }
            return true
        }
        
        // 如果有拼团管理权限（group:* 或 group:admin）
        const hasGroupPermission = permList.some(perm => 
            perm === 'group:*' || 
            perm === 'group:admin' || 
            (typeof perm === 'string' && perm.startsWith('group:'))
        )
        
        if (process.client) {
            console.log('=== 管理员权限检查（使用权限列表）===')
            console.log('permissions:', permList)
            console.log('hasGroupPermission:', hasGroupPermission)
            console.log('isAdmin:', hasGroupPermission)
        }
        
        return hasGroupPermission
    })
}

// 兼容旧版本：useIsAdmin 映射到 useHasGroupAdminPermission
export function useIsAdmin() {
    return useHasGroupAdminPermission()
}

// 检查管理员权限（带提示）
export function useCheckAdmin(callback) {
    const { message } = createDiscreteApi(['message'])
    const hasPermission = useHasGroupAdminPermission()
    
    if (!hasPermission.value) {
        message.error("需要管理员权限才能操作（用户等级需 ≤ 2）")
        return false
    }
    
    if (callback && typeof callback === "function") {
        callback()
        return true
    }
    
    return true
}

// 点赞/取消点赞
export function useHandleSupportPost(){
    const supportLoading = ref(false)
    // 点赞/取消点赞
    const handleSupport = (item)=>{
        useHasAuth(async ()=>{
            // 行为判断
            let type = item.issupport ? 'unsupport' : 'support'
            let msg = item.issupport ? '取消点赞' : '点赞'

            supportLoading.value = true

            const {
                error
            } = await usePostSupportApi(item.id,type)

            supportLoading.value = false

            // 操作失败，直接返回
            if(error.value) return

            // 点赞数 +1/-1
            if(type === 'unsupport'){
                item.support_count--
            } else {
                item.support_count++
            }

            item.issupport = !item.issupport


            message.success(msg + '成功')
        })
    }

    return {
        supportLoading,
        handleSupport
    }
}
