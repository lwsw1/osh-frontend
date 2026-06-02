
<template>
  <div class="result-page">
    <div class="result-card">

      <!-- ── 成功状态 ── -->
      <template v-if="status === 'success'">
        <div class="result-icon">🎉</div>
        <h2 class="result-title">抢购成功！</h2>

        <!-- 商品信息 -->
        <div class="result-info">
          <div class="info-row" v-if="cover">
            <img :src="decodeURIComponent(cover)" class="goods-cover" />
          </div>
          <div class="info-row">
            <span class="info-label">商品</span>
            <span class="info-value">{{ title }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">原价</span>
            <span class="info-value origin-price-text">¥{{ originPrice }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">单件秒杀价</span>
            <span class="info-value">¥{{ price }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">应付金额</span>
            <span class="info-value price-text">¥{{ payAmount }}</span>
          </div>
          <div class="info-row" v-if="seckillNo">
            <span class="info-label">秒杀单号</span>
            <span class="info-value order-no">{{ seckillNo }}</span>
          </div>
          <div class="info-row" v-if="payExpireTime">
            <span class="info-label">支付截止</span>
            <span class="info-value expire-text">{{ decodeURIComponent(payExpireTime) }}</span>
          </div>
        </div>

        <!-- 支付倒计时 -->
        <ClientOnly>
          <div class="pay-countdown" v-if="payDeadlineMs > 0 && !payDone && !payExpired">
            <span class="pay-countdown-label">⏰ 剩余支付时间：</span>
            <CountDown :key="payDeadlineMs" :time="payDeadlineMs" @end="handlePayExpire" />
          </div>
        </ClientOnly>
        <div class="pay-expired-tip" v-if="payExpired">⚠️ 支付已超时，订单已自动取消</div>
        <div class="pay-success-tip" v-if="payDone">🎉 支付成功，正在跳转...</div>

        <!-- 支付区域 -->
        <div class="qr-section" v-if="!payDone && !payExpired">
          <!-- 有二维码：直接展示，无需点击"立即支付" -->
          <template v-if="payData">
            <p class="qr-tip">请使用微信扫码完成支付</p>
            <!-- qrcode/payUrl 都是支付链接，用 QrCode 组件生成二维码 -->
            <QrCode v-if="payData.qrcode" :data="payData.qrcode" />
            <QrCode v-else-if="payData.payUrl" :data="payData.payUrl" />
            <p class="qr-sub-tip">二维码有效期内请尽快扫码支付</p>
          </template>
          <!-- 无二维码（异常情况） -->
          <template v-else>
            <p class="qr-tip" style="color:#9ca3af;">支付信息加载中，请稍候...</p>
          </template>
        </div>

        <!-- 操作按钮 -->
        <div class="action-row" v-if="!payDone && !payExpired">
          <button class="btn-cancel" :disabled="cancelLoading" @click="handleCancel">
            {{ cancelLoading ? '取消中...' : '取消订单' }}
          </button>
        </div>
        <button class="btn-secondary" @click="goSeckill">继续逛逛</button>
      </template>

      <!-- ── 失败状态 ── -->
      <template v-else>
        <div class="result-icon">😔</div>
        <h2 class="result-title">很遗憾，名额已被抢完</h2>
        <p class="result-desc">本场次优惠名额已售罄，可以查看其他优惠课程或等待下次活动</p>
        <div class="result-actions">
          <button class="btn-primary" @click="goSeckill">查看其他优惠课程</button>
        </div>
      </template>

    </div>
  </div>
</template>

<script setup>
import { createDiscreteApi } from 'naive-ui'

const route = useRoute()
const { status, title, cover, price, totalAmount, originPrice, seckillNo, payExpireTime } = route.query

// 从 URL 参数读取 orderNo、qrcode、payUrl（由 detail 页轮询结果传入）
// 过滤掉 "null" 字符串，避免用 null 去查支付状态
// 注意：orderNo（支付单号）和 seckillNo（秒杀尝试号）现在是两个不同的值
// orderNo 为空时不能用 seckillNo 兜底，两者语义不同
const sanitize = v => (v && v !== 'null') ? v : ''
const orderNo      = sanitize(route.query.orderNo)
const seckillNoParam = sanitize(seckillNo)
const qrcodeParam  = sanitize(route.query.qrcode)  ? decodeURIComponent(sanitize(route.query.qrcode))  : ''
const payUrlParam  = sanitize(route.query.payUrl)  ? decodeURIComponent(sanitize(route.query.payUrl))  : ''

// 应付金额：优先用 totalAmount（单价×数量），没有则降级用 price（单件价）
const payAmount = computed(() => totalAmount || price)

const { message, dialog } = createDiscreteApi(['message', 'dialog'])

// ── 带 token 的 $fetch（统一解决 token 取不到的问题） ─────────
const { seckillFetch } = useSeckillFetch()

// ── 支付截止时间（毫秒） ──────────────────────────────────────
const payDeadlineMs = computed(() => {
  if (!payExpireTime) return 0
  const t = new Date(decodeURIComponent(payExpireTime).replace(' ', 'T')).getTime()
  return isNaN(t) ? 0 : t
})

// ── 支付状态 ─────────────────────────────────────────────────
const payDone    = ref(false)
const payExpired = ref(false)

function handlePayExpire() {
  payExpired.value = true
  stopPayPolling()
}

// ── 二维码数据：直接从 URL 参数初始化，无需再调发起支付接口 ──
// payData = { qrcode, payUrl } 或 null（无需支付时）
const payData = ref(
  (qrcodeParam || payUrlParam)
    ? { qrcode: qrcodeParam, payUrl: payUrlParam }
    : null
)
const payTimer = ref(null)

// ── 页面加载：只展示二维码，不提前查支付状态 ─────────────────
// 正确时序：展示二维码 → 用户扫码 → 再轮询 /pay/status 确认结果
// /pay/status 在用户扫码之前调会报"订单不存在"，因为支付记录还没生成
onMounted(() => {
  // 有二维码才需要轮询支付结果，且延迟5秒再开始——给用户扫码的时间
  // 用户扫码后微信会回调后端生成支付记录，此时 /pay/status 才能查到
  if (payData.value && orderNo) {
    setTimeout(() => {
      if (!payDone.value && !payExpired.value) {
        startPayPolling()
      }
    }, 5000)
  }
})

// ── 轮询支付状态（接口：GET /pay/status?orderNo={orderNo}）────
// 每2秒轮询，无上限——直到支付成功、超时、取消才停止
function startPayPolling() {
  stopPayPolling()
  payTimer.value = setInterval(async () => {
    await checkPayStatus()
  }, 2000)
}

// 单次查询支付状态，可复用（轮询 & 手动触发）
// 新接口 GET /pay/status 返回 R<T> 格式，业务数据在 res.data
async function checkPayStatus() {
  if (!orderNo) return
  let res
  try {
    res = await seckillFetch(`/pay/status?orderNo=${encodeURIComponent(orderNo)}`)
  } catch {
    return
  }

  if (res?.code !== 200 || !res?.data) return

  // 后端字段：orderStatus / payStatus / payStatus(bool)，兼容多种格式
  const d = res.data
  const s = d.orderStatus ?? d.paymentStatus ?? (d.payStatus === true ? 1 : d.status)
  if (s === 1) {
    handlePaySuccess()
  } else if (s === 0) {
    // 待支付，继续等
  } else if (s === 2) {
    stopPayPolling()
    message.warning('订单已取消')
    navigateTo('/seckill', { replace: true })
  } else if (s === 3) {
    stopPayPolling()
    payExpired.value = true
  } else if (s === 4) {
    stopPayPolling()
    message.info('订单已退款')
  }
}

function stopPayPolling() {
  if (payTimer.value) {
    clearInterval(payTimer.value)
    payTimer.value = null
  }
}

function handlePaySuccess() {
  payDone.value = true
  stopPayPolling()
  message.success('支付成功！')
  setTimeout(() => navigateTo('/user/buy/1', { replace: true }), 2000)
}

// ── 取消订单（接口：POST /seckill/user/order/cancel/{seckillNo}）
// 路径参数必须传 seckillNo（秒杀尝试号），不能传 orderNo（支付单号）
const cancelLoading = ref(false)

async function handleCancel() {
  // 取消接口需要 seckillNo，orderNo 是支付单号，两者不能混用
  if (!seckillNoParam) return

  // 取消前先查一次最新状态，防止已支付的订单被取消
  await checkPayStatus()
  if (payDone.value) {
    message.warning('订单已支付，无法取消')
    return
  }

  const confirmed = await new Promise(resolve => {
    dialog.warning({
      title: '取消订单',
      content: '确认取消此秒杀订单？取消后名额将释放。',
      positiveText: '确认取消',
      negativeText: '再想想',
      onPositiveClick: () => resolve(true),
      onNegativeClick: () => resolve(false),
      onClose: () => resolve(false),
    })
  })
  if (!confirmed) return
  cancelLoading.value = true
  try {
    // 路径参数传 seckillNo（秒杀尝试号），后端按此查找并取消订单
    const res = await seckillFetch(`/seckill/user/order/cancel/${encodeURIComponent(seckillNoParam)}`, { method: 'POST' })
    if (res?.code === 200) {
      message.success('订单已取消')
      stopPayPolling()
      navigateTo('/seckill', { replace: true })
    } else {
      message.error(res?.msg || '取消失败')
    }
  } catch (e) {
    message.error(e?.data?.msg || '取消失败')
  } finally {
    cancelLoading.value = false
  }
}

function goSeckill() {
  navigateTo('/seckill')
}

onUnmounted(() => stopPayPolling())
</script>

<style scoped>
.result-page {
  display: flex; justify-content: center; align-items: flex-start;
  min-height: 60vh; padding: 40px 16px;
}
.result-card {
  background: #fff; border-radius: 16px; padding: 40px 36px;
  text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.08);
  width: 100%; max-width: 460px;
  display: flex; flex-direction: column; gap: 14px;
}
.result-icon { font-size: 52px; line-height: 1; }
.result-title { font-size: 22px; font-weight: 700; color: #111; margin: 0; }
.result-desc  { font-size: 14px; color: #6b7280; margin: 0; line-height: 1.6; }

/* 订单信息 */
.result-info {
  background: #f9fafb; border-radius: 10px;
  padding: 14px 18px; text-align: left;
}
.info-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 7px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px;
}
.info-row:last-child { border-bottom: none; }
.info-label { color: #6b7280; }
.info-value { color: #111; font-weight: 500; max-width: 260px; text-align: right; }
.price-text  { color: #f43f5e; font-weight: 700; font-size: 16px; }
.order-no    { font-size: 12px; color: #9ca3af; }
.expire-text { color: #f59e0b; font-size: 13px; }

/* 支付倒计时 */
.pay-countdown {
  display: flex; align-items: center; justify-content: center;
  gap: 8px; font-size: 14px; color: #374151;
  background: #fff7ed; border-radius: 8px; padding: 10px 16px;
}
.pay-countdown-label { color: #f59e0b; font-weight: 600; }
.pay-expired-tip { color: #ef4444; font-size: 14px; background: #fef2f2; border-radius: 8px; padding: 10px; }
.pay-success-tip { color: #22c55e; font-size: 14px; background: #f0fdf4; border-radius: 8px; padding: 10px; }

/* 二维码区域 */
.qr-section { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.qr-tip     { font-size: 14px; color: #374151; margin: 0; }
.qr-sub-tip { font-size: 12px; color: #9ca3af; margin: 0; }

/* 按钮 */
.btn-primary {
  width: 100%; padding: 13px 0;
  background: linear-gradient(135deg, #ff6b35, #f43f5e);
  color: #fff; border: none; border-radius: 8px;
  font-size: 15px; font-weight: 600; cursor: pointer; transition: opacity 0.2s;
}
.btn-primary:hover:not(:disabled) { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary {
  width: 100%; padding: 12px 0; background: #fff;
  color: #374151; border: 1px solid #e5e7eb; border-radius: 8px;
  font-size: 15px; cursor: pointer; transition: all 0.2s;
}
.btn-secondary:hover { border-color: #f43f5e; color: #f43f5e; }
.btn-cancel {
  width: 100%; padding: 10px 0; background: transparent;
  color: #9ca3af; border: 1px dashed #e5e7eb; border-radius: 8px;
  font-size: 13px; cursor: pointer; transition: all 0.2s;
}
.btn-cancel:hover:not(:disabled) { color: #ef4444; border-color: #ef4444; }
.btn-cancel:disabled { opacity: 0.4; cursor: not-allowed; }

.result-actions { display: flex; flex-direction: column; gap: 10px; }

/* 商品封面 */
.goods-cover {
  width: 100%; max-height: 140px; object-fit: cover;
  border-radius: 8px; margin-bottom: 4px;
}
.origin-price-text { color: #9ca3af; text-decoration: line-through; font-size: 13px; }

/* 二维码图片 */
.qr-img {
  width: 180px; height: 180px;
  border: 1px solid #e5e7eb; border-radius: 8px;
  padding: 8px; background: #fff;
}

/* 刷新按钮 */
.btn-refresh {
  padding: 6px 16px; background: transparent;
  color: #6b7280; border: 1px solid #e5e7eb;
  border-radius: 6px; font-size: 12px; cursor: pointer;
  transition: all 0.2s;
}
.btn-refresh:hover:not(:disabled) { border-color: #f43f5e; color: #f43f5e; }
.btn-refresh:disabled { opacity: 0.4; cursor: not-allowed; }

/* 操作行 */
.action-row { width: 100%; }
</style>
