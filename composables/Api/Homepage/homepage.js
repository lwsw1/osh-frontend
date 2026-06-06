/**
 * 首页各模块热门数据 API
 * 统一封装 8 个新模块的首页接口调用
 */
import { fetchConfig } from '~/composables/useHttp'

const BASE = fetchConfig.baseURL
const APPID = fetchConfig.headers.appid

const hpFetch = (url, params = {}) =>
  $fetch(url, {
    baseURL: BASE,
    headers: { appid: APPID },
    params,
  })

// ─── 答疑社区 ────────────────────────────────────────────────────────────────
/** GET /pc/homepage/qa/hot */
export const fetchHotQa = (limit = 3) =>
  hpFetch('/homepage/qa/hot', { limit })

// ─── 限时秒杀 ────────────────────────────────────────────────────────────────
/** GET /pc/homepage/seckill/hot */
export const fetchHotSeckill = (limit = 5) =>
  hpFetch('/homepage/seckill/hot', { limit })

// ─── 拼团优惠 ────────────────────────────────────────────────────────────────
/** GET /pc/homepage/group/hot */
export const fetchHotGroup = (limit = 5) =>
  hpFetch('/homepage/group/hot', { limit })

// ─── 开源项目 ────────────────────────────────────────────────────────────────
/** GET /pc/homepage/openproject/hot */
export const fetchHotOpenProject = (limit = 5) =>
  hpFetch('/homepage/openproject/hot', { limit })

// ─── 实用网站 ────────────────────────────────────────────────────────────────
/** GET /pc/homepage/website/hot */
export const fetchHotWebsite = (limit = 5) =>
  hpFetch('/homepage/website/hot', { limit })

// ─── 技术信息差 ──────────────────────────────────────────────────────────────
/** GET /pc/homepage/infogap/hot */
export const fetchHotInfoGap = (limit = 5) =>
  hpFetch('/homepage/infogap/hot', { limit })

// ─── 实用工具 ────────────────────────────────────────────────────────────────
/** GET /pc/homepage/tool/hot */
export const fetchHotTool = (limit = 5) =>
  hpFetch('/homepage/tool/hot', { limit })

// ─── 用户反馈 ────────────────────────────────────────────────────────────────
/** GET /pc/homepage/feedback/hot */
export const fetchHotFeedback = (limit = 5) =>
  hpFetch('/homepage/feedback/hot', { limit })
