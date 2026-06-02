
<template>
  <div class="detail-page" v-if="goods">
    <!-- 返回按钮 -->
    <div class="back-bar">
      <button class="back-btn" @click="navigateTo('/seckill')">← 返回秒杀列表</button>
    </div>
    <div class="detail-layout">
      <!-- 左侧：内容预览区 -->
      <div class="detail-left">
        <div class="cover-wrap" :class="goods.goodsType === 2 ? 'cover-book' : 'cover-course'">
          <img :src="goods.cover || '/default-cover.jpg'" :alt="goods.title" class="cover-img" />
          <button class="preview-btn" @click="handlePreview">
            ▶ {{ goods.goodsType === 2 ? '免费试读' : '免费试看' }}
          </button>
        </div>
        <div class="outline-section" v-if="goods.goodsType === 1 && outline.length">
          <h3 class="section-title">课程大纲</h3>
          <CourseOutline :chapters="outline" />
        </div>
      </div>

      <!-- 右侧：购买决策区 -->
      <div class="detail-right">
        <h1 class="goods-title">{{ goods.title }}</h1>

        <div class="goods-type-row">
          <span class="type-badge" :class="`type-${goods.goodsType}`">
            {{ goods.goodsType === 1 ? '课程' : goods.goodsType === 2 ? '电子书' : '题库' }}
          </span>
          <span class="limit-text" v-if="goods.limitPerUser > 0">每人限购 {{ goods.limitPerUser }} 件</span>
        </div>

        <!-- 价格卡片 -->
        <div class="price-card">
          <div class="price-main-row">
            <span class="price-seckill">🔥 秒杀价 ¥{{ goods.seckillPrice }}</span>
          </div>
          <div class="price-sub-row">
            <span class="price-original">原价 ¥{{ goods.originPrice }}</span>
            <span class="price-saved">已优惠 ¥{{ (goods.originPrice - goods.seckillPrice).toFixed(2) }}</span>
          </div>

          <div class="price-divider" />

          <!-- 倒计时 -->
          <div class="countdown-row" v-if="activityData?.status === 2 && correctedEndTime > 0">
            <span class="countdown-label">距结束：</span>
            <ClientOnly>
              <CountDown :key="correctedEndTime" :time="correctedEndTime" @end="handleEnd" />
            </ClientOnly>
          </div>

          <!-- 名额 -->
          <div class="quota-row" v-if="goods.totalStock > 0">
            <span class="quota-label">剩余名额：</span>
            <span class="quota-value">{{ remaining }} / {{ goods.totalStock }}</span>
          </div>
          <SeckillQuotaBar :quota="goods.totalStock" :sold-count="goods.soldCount" />

          <div class="price-divider" />

          <!-- 服务承诺 -->
          <div class="promise-list">
            <span class="promise-item">✅ 购买后永久有效</span>
            <span class="promise-item">✅ 含配套资料下载</span>
            <span class="promise-item">✅ 讲师在线答疑</span>
          </div>

          <div class="price-divider" />

          <!-- 购买数量选择器（limitPerUser > 1 时显示） -->
          <div class="quantity-row" v-if="maxQuantity > 1">
            <span class="quantity-label">购买数量：</span>
            <div class="quantity-ctrl">
              <button class="qty-btn" :disabled="quantity <= 1" @click="quantity = Math.max(1, quantity - 1)">−</button>
              <span class="qty-val">{{ quantity }}</span>
              <button class="qty-btn" :disabled="quantity >= maxQuantity" @click="quantity = Math.min(maxQuantity, quantity + 1)">+</button>
            </div>
            <span class="quantity-hint">最多 {{ maxQuantity }} 件</span>
          </div>

          <!-- 支付超时提示 -->
          <div class="pay-timeout-hint" v-if="activityData?.payTimeoutMin">
            ⚠️ 抢购成功后请在 {{ activityData.payTimeoutMin }} 分钟内完成支付
          </div>

          <!-- 操作按钮 -->
          <button
            class="buy-btn"
            :class="btnClass"
            :disabled="btnState !== 'active' || loading"
            @click="handleBuy"
          >
            <span v-if="loading">{{ loadingText }}</span>
            <span v-else>{{ btnText }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 下方 Tab 区 -->
    <div class="detail-tabs-wrap">
      <div class="detail-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-btn"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >{{ tab.label }}</button>
      </div>
      <div class="tab-content">
        <div v-if="activeTab === 'intro'" class="tab-intro" v-html="goods.description || '暂无介绍'" />
        <div v-else-if="activeTab === 'outline'">
          <CourseOutline :chapters="outline" v-if="outline.length" />
          <Empty v-else />
        </div>
        <div v-else-if="activeTab === 'review'">
          <Empty />
        </div>
      </div>
    </div>
  </div>

  <!-- 加载中 / 活动不存在 -->
  <div v-else class="loading-wrap">
    <div v-if="loadError" class="error-wrap">
      <div class="error-icon">😕</div>
      <p class="error-title">活动不存在或已结束</p>
      <p class="error-desc">该秒杀活动可能已下架或尚未开始</p>
      <button class="error-btn" @click="navigateTo('/seckill')">返回秒杀列表</button>
    </div>
    <LoadingCourseSkeleton v-else />
  </div>
</template>

<script setup>
import { createDiscreteApi } from 'naive-ui'

const route = useRoute()
const activityId = Number(route.params.id)
const itemId = Number(route.query.itemId)

const { message } = createDiscreteApi(['message'])

// ── 轮询定时器（必须在第一个 await 之前注册生命周期钩子） ────
const polling = ref(null)
onUnmounted(() => {
  if (polling.value) clearInterval(polling.value)
})

// ── 活动详情 ─────────────────────────────────────────────────
const activityData = ref(null)
const loadError = ref(false)

// 优先用列表页传过来的共享状态（避免用户端接口只返回进行中活动的限制）
const sharedActivity = useState('seckillActivity')
if (sharedActivity.value?.id === activityId) {
  activityData.value = sharedActivity.value
} else {
  // 没有共享数据时才请求接口
  const { data: activityRes } = await useSeckillUserActivityDetailApi(activityId)
  if (activityRes.value) {
    activityData.value = activityRes.value
  } else {
    loadError.value = true
  }
}

// 从活动 items 中找到当前商品
const goods = computed(() => {
  if (!activityData.value?.items) return null
  return activityData.value.items.find(i => i.id === itemId) || activityData.value.items[0] || null
})

// 活动结束时间
const correctedEndTime = computed(() => {
  if (!activityData.value?.endTime) return 0
  return new Date(activityData.value.endTime).getTime()
})

function handleEnd() {
  activityData.value = null
}

// ── 课程大纲（仅课程类型，暂不加载） ─────────────────────────
const outline = ref([])

// ── 按钮状态 ─────────────────────────────────────────────────
const btnState = computed(() => {
  if (!goods.value) return 'pending'
  if (activityData.value?.status !== 2) return 'ended'
  if (goods.value.totalStock > 0 && goods.value.availableStock <= 0) return 'soldout'
  return 'active'
})

const btnText = computed(() => {
  switch (btnState.value) {
    case 'ended':   return '活动已结束'
    case 'soldout': return `¥${goods.value?.originPrice} 原价购买`
    default:        return '立即抢购'
  }
})

const btnClass = computed(() => ({
  'btn-active':  btnState.value === 'active',
  'btn-pending': btnState.value === 'ended',
  'btn-soldout': btnState.value === 'soldout',
}))

const remaining = computed(() => Math.max(0, goods.value?.availableStock || 0))

// ── 购买数量 ─────────────────────────────────────────────────
// limitPerUser 来自活动详情接口（接口9）的商品明细字段
// limitPerUser=0 表示不限，此时选择器不显示，默认购买 1 件
const maxQuantity = computed(() => {
  const limit = goods.value?.limitPerUser || 0
  return limit > 1 ? limit : 1
})
const quantity = ref(1)
// 切换商品时重置数量
watch(goods, () => { quantity.value = 1 })

// ── 带 token 的 $fetch 辅助（解决 useHttp 在异步上下文取不到 token 的问题） ──
const { seckillFetch } = useSeckillFetch()

// ── 秒杀流程 ─────────────────────────────────────────────────
const loading = ref(false)
const loadingText = ref('抢购中...')

async function handleBuy() {
  // 售罄时跳转原价购买
  if (btnState.value === 'soldout') {
    const typeMap = { 1: 'course', 2: 'book', 3: 'goods' }
    navigateTo(`/createorder?id=${goods.value.goodsId}&type=${typeMap[goods.value.goodsType] || 'course'}`)
    return
  }

  // 未登录跳转登录
  const token = useCookie('token')
  if (!token.value) {
    navigateTo(`/login?redirect=/seckill/detail/${activityId}?itemId=${itemId}`)
    return
  }

  loading.value = true
  loadingText.value = '抢购中...'

  // Step 1：执行秒杀（quantity 默认 1，limitPerUser > 1 时由用户选择）
  let doRes
  try {
    const query = quantity.value > 1 ? `?quantity=${quantity.value}` : ''
    doRes = await seckillFetch(`/seckill/user/do/${activityId}/${itemId}${query}`, { method: 'POST' })
  } catch (e) {
    message.error(e?.data?.msg || '秒杀失败，请重试')
    loading.value = false
    return
  }

  const seckillNo = doRes?.data?.seckillNo
  const orderNo   = doRes?.data?.orderNo
  const doStatus  = doRes?.data?.status
  // needPay=false 表示无需支付（如免费商品），直接跳转成功页
  const needPay   = doRes?.data?.needPay !== false

  // status=-1 表示后台 Kafka 正在处理，属于正常状态，直接进轮询
  // 只有既没有单号、又不是处理中状态，才判定为真正的失败
  if (doStatus !== -1 && !seckillNo && !orderNo) {
    message.error(doRes?.msg || '秒杀失败，请重试')
    loading.value = false
    return
  }

  // Step 2：后台处理中（status=-1）或已有结果，统一进入轮询
  loadingText.value = '正在处理...'
  startPolling(seckillNo || orderNo, needPay)
}

function startPolling(seckillNo, needPay = true) {
  let count = 0
  const MAX_POLLS = 30        // 每1秒轮询一次，最多30次 = 30秒超时
  // 建单正常耗时阈值：超过此次数后收到 null 视为"订单不存在/已超时"
  // 而不是"建单中"。Kafka 消费通常在 3~5 秒内完成，这里给 8 秒余量
  const NULL_TIMEOUT_COUNT = 8
  polling.value = setInterval(async () => {
    count++
    if (count > MAX_POLLS) {
      clearInterval(polling.value)
      loading.value = false
      message.error('建单超时，请刷新页面查看结果')
      return
    }

    let result
    try {
      result = await seckillFetch(`/seckill/user/order/result/${activityId}/${itemId}`)
    } catch (e) {
      const msg = e?.data?.msg || ''
      // 后台还在处理，继续轮询
      if (msg.includes('暂未查到') || msg.includes('尚未查到') || msg.includes('请稍后')) {
        return
      }
      clearInterval(polling.value)
      loading.value = false
      navigateTo('/seckill/result?status=fail')
      return
    }

    // status=-1：后台 Kafka 仍在处理，继续等待
    if (result?.data?.status === -1) return

    // data 为 null 的两种情况：
    //   1. 建单中（Redis key 还没写入）：count 较小时继续等待
    //   2. 订单已超时/不存在（Redis key 过期 + DB 兜底查不到）：count 超过阈值后停止
    // 用轮询计数区分：建单通常 3~5 秒完成，超过 NULL_TIMEOUT_COUNT 次还是 null
    // 说明不是建单中，而是订单已超时或根本不存在，主动提示用户
    if (!result?.data) {
      if (count >= NULL_TIMEOUT_COUNT) {
        clearInterval(polling.value)
        loading.value = false
        message.warning('订单已超时或不存在，请重新抢购')
        return
      }
      // 还在阈值内，继续等待
      return
    }

    const orderStatus = result.data.status

    if (orderStatus === 0) {
      clearInterval(polling.value)

      // status=0 时 orderNo 才有值，不能用 seckillNo 兜底
      // seckillNo 是秒杀尝试号，orderNo 才是支付单号
      let resOrderNo = result.data.orderNo || ''
      let resQrcode  = result.data.qrcode  || ''
      let resPayUrl  = result.data.payUrl   || ''

      // orderNo 或二维码缺失时，用 orderNo 调发起支付接口补拿
      // 注意：此处只用 resOrderNo，不能用 seckillNo 替代
      if (!resOrderNo || (!resQrcode && !resPayUrl)) {
        try {
          const payRes = await seckillFetch(
            `/seckill/user/order/pay/${encodeURIComponent(resOrderNo)}`,
            { method: 'POST' }
          )
          resOrderNo = resOrderNo || payRes?.data?.orderNo || payRes?.data?.out_trade_no || ''
          resQrcode  = payRes?.data?.qrcode  || payRes?.data?.payurl  || resQrcode
          resPayUrl  = payRes?.data?.payUrl  || payRes?.data?.pay_url || resQrcode
        } catch (e) {
          console.warn('[seckill] 发起支付接口失败', e)
        }
      }

      loading.value = false
      // 过滤掉 null 字符串，避免 URL 里出现 orderNo=null
      const safeEncode = v => encodeURIComponent((v && v !== 'null') ? v : '')
      navigateTo(
        `/seckill/result?status=success` +
        `&seckillNo=${safeEncode(seckillNo)}` +
        `&orderNo=${safeEncode(resOrderNo)}` +
        `&qrcode=${safeEncode(resQrcode)}` +
        `&payUrl=${safeEncode(resPayUrl)}` +
        `&title=${safeEncode(result.data.goodsTitle || goods.value?.title || '')}` +
        `&cover=${safeEncode(result.data.goodsCover || '')}` +
        `&price=${result.data.seckillPrice ?? goods.value?.seckillPrice}` +
        `&totalAmount=${result.data.totalAmount ?? result.data.seckillPrice ?? goods.value?.seckillPrice}` +
        `&originPrice=${result.data.originPrice ?? goods.value?.originPrice}` +
        `&payExpireTime=${safeEncode(result.data.payExpireTime || '')}`
      )
    } else if (orderStatus === 1) {
      // 已支付（极少数情况）
      clearInterval(polling.value)
      loading.value = false
      message.success('秒杀成功且已支付！')
      navigateTo('/user/buy/1', { replace: true })
    } else {
      // 其他状态（已取消/超时/退款）
      clearInterval(polling.value)
      loading.value = false
      const statusMsg = { 2: '订单已取消', 3: '订单已超时', 4: '订单已退款' }
      message.warning(statusMsg[orderStatus] || '秒杀失败')
      navigateTo('/seckill/result?status=fail')
    }
  }, 1000) // 每1秒轮询一次
}

onUnmounted(() => {
  if (polling.value) clearInterval(polling.value)
})

function handlePreview() {
  if (goods.value?.goodsType === 1) {
    navigateTo(`/course/lesson/${goods.value.goodsId}`)
  } else if (goods.value?.goodsType === 2) {
    navigateTo(`/book/${goods.value.goodsId}/1`)
  }
}

// ── Tab ──────────────────────────────────────────────────────
const tabs = [
  { key: 'intro',   label: '商品介绍' },
  { key: 'outline', label: '课程大纲' },
  { key: 'review',  label: '用户评价' },
]
const activeTab = ref('intro')
</script>

<style scoped>
.detail-page { max-width: 1100px; margin: 24px auto; padding: 0 16px; }

.back-bar { margin-bottom: 16px; }
.back-btn {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 6px 14px; background: #fff; border: 1px solid #e5e7eb;
  border-radius: 8px; font-size: 13px; color: #6b7280;
  cursor: pointer; transition: all 0.15s;
}
.back-btn:hover { border-color: #e1251b; color: #e1251b; background: #fff5f5; }
.detail-layout { display: flex; gap: 32px; align-items: flex-start; }
.detail-left  { flex: 1; min-width: 0; }
.detail-right { width: 360px; flex-shrink: 0; }

.cover-wrap { position: relative; border-radius: 10px; overflow: hidden; background: #f0f0f0; margin-bottom: 20px; }
.cover-course { height: 220px; }
.cover-book   { height: 300px; }
.cover-img { width: 100%; height: 100%; object-fit: cover; }
.preview-btn {
  position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%);
  background: rgba(0,0,0,0.6); color: #fff; border: none; border-radius: 20px;
  padding: 8px 24px; font-size: 14px; cursor: pointer;
  backdrop-filter: blur(4px); transition: all 0.2s;
}
.preview-btn:hover { background: rgba(244,63,94,0.85); }

.outline-section { margin-top: 8px; }
.section-title { font-size: 16px; font-weight: 700; color: #222; margin: 0 0 12px; padding-bottom: 8px; border-bottom: 2px solid #f43f5e; }

.goods-title { font-size: 20px; font-weight: 700; color: #111; margin: 0 0 10px; line-height: 1.4; }
.goods-type-row { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.type-badge { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; color: #fff; }
.type-1 { background: #e1251b; }
.type-2 { background: #6366f1; }
.type-3 { background: #f59e0b; }
.limit-text { font-size: 12px; color: #999; }

.price-card { background: #fff; border: 1px solid #f0f0f0; border-radius: 12px; padding: 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
.price-main-row { margin-bottom: 6px; }
.price-seckill { font-size: 24px; font-weight: 800; color: #f43f5e; }
.price-sub-row { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
.price-original { font-size: 13px; color: #9ca3af; text-decoration: line-through; }
.price-saved { font-size: 12px; color: #f59e0b; background: #fffbeb; padding: 1px 6px; border-radius: 4px; }
.price-divider { height: 1px; background: #f3f4f6; margin: 12px 0; }
.countdown-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 14px; }
.countdown-label { color: #6b7280; }
.quota-row { display: flex; align-items: center; gap: 8px; font-size: 13px; margin-bottom: 4px; }
.quota-label { color: #6b7280; }
.quota-value { font-weight: 600; color: #f43f5e; }
.promise-list { display: flex; flex-direction: column; gap: 6px; }
.promise-item { font-size: 13px; color: #374151; }
.pay-timeout-hint { font-size: 12px; color: #f59e0b; background: #fffbeb; padding: 6px 10px; border-radius: 4px; margin-bottom: 10px; }

.quantity-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.quantity-label { font-size: 13px; color: #6b7280; white-space: nowrap; }
.quantity-ctrl { display: flex; align-items: center; gap: 0; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
.qty-btn {
  width: 30px; height: 30px; border: none; background: #f9fafb;
  font-size: 16px; font-weight: 600; color: #374151; cursor: pointer;
  transition: background 0.15s; line-height: 1;
}
.qty-btn:hover:not(:disabled) { background: #f3f4f6; color: #e1251b; }
.qty-btn:disabled { color: #d1d5db; cursor: not-allowed; }
.qty-val { min-width: 36px; text-align: center; font-size: 14px; font-weight: 600; color: #111; padding: 0 4px; }
.quantity-hint { font-size: 12px; color: #9ca3af; }

.buy-btn { width: 100%; padding: 12px 0; border: none; border-radius: 8px; font-size: 16px; font-weight: 700; cursor: pointer; margin-bottom: 10px; transition: all 0.2s; }
.btn-active { background: linear-gradient(135deg, #ff6b35, #f43f5e); color: #fff; }
.btn-active:hover:not(:disabled) { opacity: 0.9; }
.btn-active:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-pending { background: #f3f4f6; color: #9ca3af; cursor: not-allowed; }
.btn-soldout { background: #f9fafb; color: #6b7280; border: 1px solid #e5e7eb; }

.detail-tabs-wrap { margin-top: 32px; background: #fff; border-radius: 12px; border: 1px solid #f0f0f0; overflow: hidden; }
.detail-tabs { display: flex; border-bottom: 1px solid #f0f0f0; }
.tab-btn { padding: 14px 24px; border: none; background: transparent; font-size: 14px; color: #6b7280; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; }
.tab-btn:hover { color: #f43f5e; }
.tab-btn.active { color: #f43f5e; border-bottom-color: #f43f5e; font-weight: 600; }
.tab-content { padding: 20px; }
.tab-intro { line-height: 1.8; color: #374151; }

.loading-wrap { padding: 40px; }

.error-wrap {
  display: flex; flex-direction: column; align-items: center;
  padding: 80px 20px; text-align: center;
}
.error-icon { font-size: 56px; margin-bottom: 16px; }
.error-title { font-size: 18px; font-weight: 700; color: #374151; margin: 0 0 8px; }
.error-desc  { font-size: 14px; color: #9ca3af; margin: 0 0 24px; }
.error-btn {
  padding: 10px 28px; background: #e1251b; color: #fff;
  border: none; border-radius: 8px; font-size: 14px;
  font-weight: 600; cursor: pointer; transition: opacity 0.2s;
}
.error-btn:hover { opacity: 0.85; }
</style>
