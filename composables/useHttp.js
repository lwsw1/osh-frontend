import {
    createDiscreteApi
} from "naive-ui"
import { handleAuthExpired } from "~/composables/useAuth"

// 自动检测环境并设置API地址
function getBaseURL() {
    // 服务端渲染时使用完整地址
    if (process.server) {
        return "http://localhost:8081/pc"
    }
    
    // 客户端根据hostname判断
    const hostname = window.location.hostname
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        // 本地开发：通过 Nuxt 代理 /api → localhost:8081/pc，避免 CORS
        return "/api"
    } else {
        return "http://43.242.200.25:8081/pc"
    }
}

export const fetchConfig = {
    baseURL: getBaseURL(),
    headers:{
        appid:"bd9d01ecc75dbbaaefce"
    },
}

function isAuthExpiredError(err){
    const payload = err?.data || {}
    const msg = payload?.msg || payload?.data || err?.message || ''
    const code = payload?.code

    return code === 401
        || code === 3100
        || code === 3101
        || /认证失败/.test(msg)
        || /登录已过期/.test(msg)
        || /用户未登录/.test(msg)
        || /未登录或Token已过期/.test(msg)
}

function resolveToken() {
    // 优先 cookie，兼容已有逻辑
    let tokenValue = ""
    try {
        tokenValue = useCookie("token").value || ""
    } catch (e) {}

    // 客户端兜底 localStorage
    if (!tokenValue && process.client) {
        tokenValue = localStorage.getItem("token") || localStorage.getItem("Token") || ""
    }

    return tokenValue
}

function useGetFetchOptions(options = {}){
    options.baseURL = options.baseURL ?? fetchConfig.baseURL
    options.headers = options.headers ?? {
        appid:fetchConfig.headers.appid
    }
    options.initialCache = options.initialCache ?? false
    options.lazy = options.lazy ?? false

    // 用户登录默认带鉴权头，兼容不同后端读取方式
    const tokenValue = resolveToken()
    if(tokenValue){
        options.headers.token = tokenValue
        options.headers.Authorization = `Bearer ${tokenValue}`
    }

    return options
}

export async function useHttp(key,url,options = {}){
    options = useGetFetchOptions(options)
    options.key = key
    if(options.$){
        const data = ref(null)
        const error = ref(null)
        console.log(options)
        return await $fetch(url,options).then(res=>{
            data.value = res.data
            return {
                data,
                error
            }
        }).catch(err=>{
            const msg = err?.data?.data
            if(process.client && isAuthExpiredError(err)){
                // 统一走登录失效处理，避免业务页只看到“保存失败”。
                handleAuthExpired(null, err?.data?.msg || msg || '登录已过期，请重新登录')
                return {
                    data,
                    error
                }
            }
            if(process.client){
                const { message } = createDiscreteApi(["message"])
                message.error(msg || '服务端错误')
            }
            error.value = msg
            return {
                data,
                error
            }
        })
    }

    let res = await useFetch(url,{
        ...options,
        // 相当于响应拦截器
        transform:(res)=>{
            // 调试:打印原始响应结构
            if (process.client) {
                console.log('useHttp transform - 原始响应:', res)
                console.log('useHttp transform - res.data:', res.data)
                console.log('useHttp transform - res.rows:', res.rows)
                console.log('useHttp transform - res.code:', res.code)
            }
            
            // 如果后端返回业务错误（code !== 200），需要抛出异常让 catch 处理
            if (res.code !== undefined && res.code !== 200) {
                console.log('useHttp transform - 检测到业务错误 code:', res.code, 'msg:', res.msg)
                // 抛出错误，让 useHttp 的 catch 块处理
                const error = new Error(res.msg || '请求失败')
                error.data = res
                error.status = res.code
                throw error
            }
            
            // 如果后端直接返回 {total, rows, code, msg},则返回整个res
            // 如果后端返回 {code, data: {...}},则返回res.data
            if (res.rows !== undefined) {
                // 拼团列表等新接口直接返回数据
                return res
            } else if (res.data !== undefined) {
                // 旧接口在data字段中
                // 但如果 data 为 null 且存在 code 字段（业务错误），返回整个 res 保留错误信息
                if (res.data === null && res.code !== undefined) {
                    console.log('useHttp transform - data为null但存在code，返回整个res以保留错误信息')
                    return res
                }
                return res.data
            }
            return res
        },
    })

    // 客户端错误处理
    if(process.client && res.error.value){
        const errData = res.error.value?.data
        const msg = errData?.data || errData?.msg
        if(isAuthExpiredError(res.error.value)){
            // useFetch 和 $fetch 两条链路都要兜住，否则页面行为会不一致。
            handleAuthExpired(null, errData?.msg || msg || '登录已过期，请重新登录')
            return res
        }
        if(!options.lazy){
            const { message } = createDiscreteApi(["message"])
            message.error(msg || '服务端错误')
        }
    }

    return res
}

export async function request(key, url, options = {}) {
    options = useGetFetchOptions(options)
    return await $fetch(url, options).then(res => {
        // 直接返回接口的整个数据
        return res
    }).catch(err => {
        const msg = err?.data?.data
        if (process.client && isAuthExpiredError(err)) {
            // 统一走登录失效处理，避免业务页只看到“保存失败”。
            handleAuthExpired(null, err?.data?.msg || msg || '登录已过期，请重新登录')
            return {
                code: err?.data?.code,
                data: null
            }
        }
        if (process.client) {
            const { message } = createDiscreteApi(["message"])
            message.error(msg || '服务端错误')
        }
        return {
            code: err?.data?.code,
            data: null
        }
    })
}

// GET请求
export function useHttpGet(key,url,options = {}){
    options.method = "GET"
    return useHttp(key,url,options)
}

// POST请求
export function useHttpPost(key,url,options = {}){
    options.method = "POST"
    return useHttp(key,url,options)
}

// 文件下载请求（POST方式，返回二进制文件流 blob + 文件名）
export async function useHttpDownload(url, options = {}) {
    const fetchOptions = useGetFetchOptions({
        method: "POST",
        ...options
    })
    
    // 合并 headers
    if (options.headers) {
        fetchOptions.headers = {
            ...fetchOptions.headers,
            ...options.headers
        }
    }
    
    try {
        // 使用 raw 获取完整响应（含 headers）
        const response = await $fetch.raw(url, {
            ...fetchOptions,
            responseType: 'blob'
        })
        
        const blob = response._data
        
        // 从 Content-Disposition 响应头中提取文件名
        let fileName = ''
        const disposition = response.headers.get('content-disposition') || response.headers.get('Content-Disposition')
        if (disposition) {
            const match = disposition.match(/filename\*?=(?:UTF-8''|\s*"?)([^";\s]+)/i)
            if (match) {
                fileName = decodeURIComponent(match[1])
            }
        }
        
        return { data: ref(blob), fileName: ref(fileName), error: ref(null) }
    } catch (err) {
        if (process.client && isAuthExpiredError(err)) {
            handleAuthExpired(null, err?.data?.msg || '登录已过期，请重新登录')
            return { data: ref(null), fileName: ref(''), error: ref(err) }
        }
        if (process.client) {
            const { message } = createDiscreteApi(["message"])
            const msg = err?.data?.data || err?.data?.msg || err?.message || '下载失败'
            message.error(msg)
        }
        return { data: ref(null), fileName: ref(''), error: ref(err) }
    }
}
