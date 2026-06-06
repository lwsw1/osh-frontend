<template>
  <div class="member-page">
    <section class="member-summary">
      <div class="summary-main">
        <span class="summary-kicker">{{ text.memberCenter }}</span>
        <h2>{{ currentStatus.memberName || text.normalUser }}</h2>
        <p>{{ currentSummary }}</p>
      </div>
      <div class="status-grid">
        <div class="status-item" :class="{ active: center.vip?.active }">
          <span>{{ text.vipUser }}</span>
          <strong>{{ center.vip?.active ? text.opened : text.notOpened }}</strong>
          <small>{{ formatExpire(center.vip) }}</small>
        </div>
        <div class="status-item" :class="{ active: center.smallClass?.active }">
          <span>{{ text.smallClassUser }}</span>
          <strong>{{ center.smallClass?.active ? text.opened : text.notOpened }}</strong>
          <small>{{ formatExpire(center.smallClass) }}</small>
        </div>
      </div>
    </section>

    <section class="member-section">
      <div class="section-head">
        <div>
          <h3>{{ text.choosePlan }}</h3>
          <p>{{ text.planHint }}</p>
        </div>
        <n-button quaternary :loading="loading" @click="loadMemberCenter">{{ text.refresh }}</n-button>
      </div>

      <n-spin :show="loading">
        <div class="plan-grid">
          <button
            v-for="plan in plans"
            :key="plan.id"
            class="plan-card"
            :class="{ selected: selectedPlan?.id === plan.id }"
            type="button"
            @click="selectedPlan = plan"
          >
            <div class="plan-topline">
              <span class="plan-type">{{ memberTypeLabel(plan.memberType) }}</span>
              <span class="plan-period">{{ periodLabel(plan) }}</span>
            </div>
            <h4>{{ plan.planName }}</h4>
            <p class="plan-desc">{{ plan.description || text.defaultPlanDesc }}</p>
            <div class="price-row">
              <strong>&yen;{{ money(plan.price) }}</strong>
              <del v-if="plan.originalPrice && Number(plan.originalPrice) > Number(plan.price)">&yen;{{ money(plan.originalPrice) }}</del>
            </div>
          </button>
        </div>
      </n-spin>

      <div class="checkout-bar">
        <div>
          <span>{{ text.currentChoice }}</span>
          <strong>{{ selectedPlan?.planName || text.selectPlan }}</strong>
        </div>
        <n-radio-group v-model:value="payChannel" size="small">
          <n-radio-button value="wxpay">{{ text.wxpay }}</n-radio-button>
          <n-radio-button value="alipay">{{ text.alipay }}</n-radio-button>
        </n-radio-group>
        <n-button type="primary" size="large" :disabled="!selectedPlan" :loading="submitting" @click="createCheckout">
          {{ text.openNow }}
        </n-button>
      </div>
    </section>

    <section class="member-section">
      <div class="section-head">
        <div>
          <h3>{{ text.rechargeRecords }}</h3>
          <p>{{ text.recordsHint }}</p>
        </div>
      </div>
      <n-empty v-if="!orders.length && !loading" :description="text.noRecords" />
      <div v-else class="order-list">
        <div v-for="order in orders" :key="order.orderNo" class="order-item">
          <div>
            <strong>{{ order.planName }}</strong>
            <span>{{ order.orderNo }}</span>
          </div>
          <div>
            <strong>&yen;{{ money(order.payAmount) }}</strong>
            <span>{{ order.createTime || '-' }}</span>
          </div>
          <n-tag :type="orderTagType(order)" size="small">{{ orderStatusText(order) }}</n-tag>
        </div>
      </div>
    </section>

    <n-modal v-model:show="showPayModal" preset="card" :title="payModalTitle" class="member-pay-modal" :mask-closable="false">
      <div class="pay-modal-body">
        <QrCode v-if="paymentQrText" :data="paymentQrText" />
        <n-empty v-else :description="text.noQrCode" />
        <div class="pay-info">
          <strong>{{ pendingPlanName }}</strong>
          <span>{{ text.orderNo }}{{ pendingOrderNo }}</span>
          <span>{{ payScanTip }}</span>
        </div>
      </div>
      <template #footer>
        <div class="pay-actions">
          <n-button @click="cancelPayment">{{ text.cancelPay }}</n-button>
          <n-button type="primary" :loading="checkingPay" @click="checkPayStatus">{{ text.paid }}</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { NButton, NEmpty, NModal, NRadioButton, NRadioGroup, NSpin, NTag, createDiscreteApi } from 'naive-ui'

const text = {
  memberCenter: '\u4f1a\u5458\u4e2d\u5fc3',
  normalUser: '\u666e\u901a\u7528\u6237',
  vipUser: 'VIP\u7528\u6237',
  smallClassUser: '\u5c0f\u73ed\u7528\u6237',
  opened: '\u5df2\u5f00\u901a',
  notOpened: '\u672a\u5f00\u901a',
  choosePlan: '\u9009\u62e9\u5957\u9910',
  planHint: 'VIP\u652f\u6301\u6708\u4ed8\u6216\u5e74\u4ed8\uff0c\u5c0f\u73ed\u7528\u6237\u4ec5\u652f\u6301\u5e74\u4ed8\u3002',
  refresh: '\u5237\u65b0',
  defaultPlanDesc: '\u5f00\u901a\u540e\u81ea\u52a8\u53d1\u653e\u5bf9\u5e94\u4f1a\u5458\u6743\u76ca',
  currentChoice: '\u5f53\u524d\u9009\u62e9',
  selectPlan: '\u8bf7\u9009\u62e9\u5957\u9910',
  wxpay: '\u5fae\u4fe1\u652f\u4ed8',
  alipay: '\u652f\u4ed8\u5b9d',
  openNow: '\u7acb\u5373\u5f00\u901a',
  rechargeRecords: '\u5145\u503c\u8bb0\u5f55',
  recordsHint: '\u67e5\u770b\u4f1a\u5458\u5957\u9910\u8d2d\u4e70\u53ca\u6743\u76ca\u53d1\u653e\u72b6\u6001\u3002',
  noRecords: '\u6682\u65e0\u5145\u503c\u8bb0\u5f55',
  noQrCode: '\u672a\u83b7\u53d6\u5230\u652f\u4ed8\u4e8c\u7ef4\u7801',
  orderNo: '\u8ba2\u5355\u53f7\uff1a',
  cancelPay: '\u53d6\u6d88\u652f\u4ed8',
  paid: '\u6211\u5df2\u652f\u4ed8',
  activeAfterOpen: '\u5f00\u901a\u540e\u7acb\u5373\u751f\u6548',
  expirePrefix: '\u5230\u671f\uff1a',
  remainingPrefix: '\u5269\u4f59 ',
  remainingSuffix: ' \u5929',
  yearPay: '\u5e74\u4ed8',
  monthPay: '\u6708\u4ed8',
  paidSuccess: '\u652f\u4ed8\u6210\u529f\uff0c\u4f1a\u5458\u6743\u76ca\u5df2\u53d1\u653e',
  loadingFailed: '\u4f1a\u5458\u4e2d\u5fc3\u52a0\u8f7d\u5931\u8d25',
  createOrderFailed: '\u521b\u5efa\u652f\u4ed8\u8ba2\u5355\u5931\u8d25',
  orderCreateFailed: '\u8ba2\u5355\u521b\u5efa\u5931\u8d25',
  memberOpened: '\u4f1a\u5458\u5df2\u5f00\u901a',
  notPaidYet: '\u6682\u672a\u67e5\u8be2\u5230\u652f\u4ed8\u6210\u529f\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5',
  statusFailed: '\u652f\u4ed8\u72b6\u6001\u67e5\u8be2\u5931\u8d25',
  currentNormalSummary: '\u5f00\u901a\u4f1a\u5458\u540e\u53ef\u8bbf\u95ee\u5bf9\u5e94\u4e13\u5c5e\u8d44\u6e90\u3002',
  expireSummaryPrefix: '\u6709\u6548\u671f\u81f3 ',
  activeSummary: '\u4f1a\u5458\u6743\u76ca\u5df2\u751f\u6548\u3002',
  payWithPrefix: '\u8bf7\u4f7f\u7528',
  payWithSuffix: '\u626b\u7801\u5b8c\u6210\u652f\u4ed8',
  alipayQrTitle: '\u652f\u4ed8\u5b9d\u626b\u7801\u652f\u4ed8',
  wxpayQrTitle: '\u5fae\u4fe1\u626b\u7801\u652f\u4ed8',
  granted: '\u5df2\u53d1\u653e',
  grantFailed: '\u53d1\u653e\u5931\u8d25',
  paidOnly: '\u5df2\u652f\u4ed8',
  pendingPay: '\u5f85\u652f\u4ed8',
}

useHead({ title: text.memberCenter })

const { message } = createDiscreteApi(['message'])

const center = ref({})
const plans = ref([])
const orders = ref([])
const selectedPlan = ref(null)
const payChannel = ref('wxpay')
const loading = ref(false)
const submitting = ref(false)
const checkingPay = ref(false)
const showPayModal = ref(false)
const pendingOrderNo = ref('')
const pendingPlanName = ref('')
const paymentQrText = ref('')
let payTimer = null

const currentStatus = computed(() => center.value.current || {})
const currentSummary = computed(() => {
  const current = currentStatus.value
  if (current.memberType === 'user') return text.currentNormalSummary
  if (current.expireTime) return `${text.expireSummaryPrefix}${current.expireTime}`
  return text.activeSummary
})
const payModalTitle = computed(() => payChannel.value === 'alipay' ? text.alipayQrTitle : text.wxpayQrTitle)
const payScanTip = computed(() => `${text.payWithPrefix}${payChannel.value === 'alipay' ? text.alipay : text.wxpay}${text.payWithSuffix}`)

onMounted(loadMemberCenter)
onBeforeUnmount(stopPayPolling)

async function loadMemberCenter() {
  loading.value = true
  try {
    const [centerData, orderData] = await Promise.all([
      apiGetMemberCenter(),
      apiGetMemberOrders(),
    ])
    center.value = centerData || {}
    plans.value = center.value.plans || []
    orders.value = orderData || []
    if (!selectedPlan.value && plans.value.length) {
      selectedPlan.value = plans.value[0]
    }
  } catch (err) {
    message.error(err?.message || text.loadingFailed)
  } finally {
    loading.value = false
  }
}

async function createCheckout() {
  if (!selectedPlan.value) return
  submitting.value = true
  try {
    const result = await apiCreateMemberCheckout({
      planId: selectedPlan.value.id,
      channel: payChannel.value,
      usePoints: false,
    })
    pendingOrderNo.value = result?.orderNo || ''
    pendingPlanName.value = selectedPlan.value.planName
    paymentQrText.value = result?.payment?.qrcode || result?.payment?.payUrl || ''
    if (!pendingOrderNo.value) {
      message.error(text.orderCreateFailed)
      return
    }
    if (result?.needPay === false) {
      message.success(text.memberOpened)
      await loadMemberCenter()
      return
    }
    showPayModal.value = true
    startPayPolling()
  } catch (err) {
    message.error(err?.message || text.createOrderFailed)
  } finally {
    submitting.value = false
  }
}

function startPayPolling() {
  stopPayPolling()
  payTimer = window.setInterval(checkPayStatusSilently, 3000)
}

function stopPayPolling() {
  if (payTimer) {
    window.clearInterval(payTimer)
    payTimer = null
  }
}

async function checkPayStatusSilently() {
  if (!pendingOrderNo.value) return
  try {
    const status = await apiGetMemberPayStatus(pendingOrderNo.value)
    if (isPaid(status)) {
      await handlePaidSuccess()
    }
  } catch (err) {}
}

async function checkPayStatus() {
  if (!pendingOrderNo.value) return
  checkingPay.value = true
  try {
    const status = await apiGetMemberPayStatus(pendingOrderNo.value)
    if (isPaid(status)) {
      await handlePaidSuccess()
    } else {
      message.info(text.notPaidYet)
    }
  } catch (err) {
    message.error(err?.message || text.statusFailed)
  } finally {
    checkingPay.value = false
  }
}

async function handlePaidSuccess() {
  stopPayPolling()
  showPayModal.value = false
  message.success(text.paidSuccess)
  pendingOrderNo.value = ''
  paymentQrText.value = ''
  await loadMemberCenter()
}

async function cancelPayment() {
  const orderNo = pendingOrderNo.value
  stopPayPolling()
  showPayModal.value = false
  pendingOrderNo.value = ''
  paymentQrText.value = ''
  if (!orderNo) return
  try {
    await apiCancelMemberPay(orderNo)
  } catch (err) {}
}

function isPaid(status) {
  return status?.payStatus === true || status?.payStatus === 1 || status?.paymentStatus === 1 || status?.orderStatus === 1
}

function memberTypeLabel(type) {
  return type === 'small_class' ? text.smallClassUser : text.vipUser
}

function periodLabel(plan) {
  if (plan.periodType === 'year' || Number(plan.durationMonths) >= 12) return text.yearPay
  return text.monthPay
}

function formatExpire(status) {
  if (!status?.active) return text.activeAfterOpen
  if (status.expireTime) return `${text.expirePrefix}${status.expireTime}`
  return `${text.remainingPrefix}${status.remainingDays || 0}${text.remainingSuffix}`
}

function money(value) {
  const num = Number(value || 0)
  return num.toFixed(2)
}

function orderStatusText(order) {
  if (order.grantStatus === 1) return text.granted
  if (order.grantStatus === 2) return text.grantFailed
  if (order.payStatus === 1) return text.paidOnly
  return text.pendingPay
}

function orderTagType(order) {
  if (order.grantStatus === 1) return 'success'
  if (order.grantStatus === 2) return 'error'
  if (order.payStatus === 1) return 'info'
  return 'warning'
}
</script>

<style scoped>
.member-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.member-summary,
.member-section {
  background: #fff;
  border-radius: 8px;
  border: 1px solid #eef0f4;
}

.member-summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 20px;
  padding: 24px;
  background: linear-gradient(135deg, #fff7ed 0%, #ffffff 42%, #f0f9ff 100%);
}

.summary-kicker,
.plan-type,
.plan-period {
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
}

.summary-main h2 {
  margin: 8px 0;
  font-size: 28px;
  color: #111827;
}

.summary-main p,
.section-head p,
.plan-desc,
.order-item span,
.pay-info span {
  margin: 0;
  color: #6b7280;
  font-size: 13px;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.status-item {
  border: 1px solid #e5e7eb;
  background: rgba(255, 255, 255, 0.82);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.status-item.active {
  border-color: #f59e0b;
  background: #fffbeb;
}

.status-item strong {
  color: #111827;
  font-size: 18px;
}

.status-item small {
  color: #6b7280;
}

.member-section {
  padding: 20px;
}

.section-head,
.checkout-bar,
.order-item,
.pay-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.section-head {
  margin-bottom: 16px;
}

.section-head h3 {
  margin: 0 0 6px;
  color: #111827;
  font-size: 18px;
}

.plan-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.plan-card {
  text-align: left;
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 8px;
  padding: 18px;
  cursor: pointer;
  min-height: 180px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: border-color .18s, box-shadow .18s, transform .18s;
}

.plan-card:hover,
.plan-card.selected {
  border-color: #2563eb;
  box-shadow: 0 10px 24px rgba(37, 99, 235, .12);
  transform: translateY(-1px);
}

.plan-topline,
.price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.plan-card h4 {
  margin: 0;
  color: #111827;
  font-size: 18px;
}

.plan-desc {
  line-height: 1.6;
  flex: 1;
}

.price-row strong {
  color: #dc2626;
  font-size: 24px;
}

.price-row del {
  color: #9ca3af;
}

.checkout-bar {
  margin-top: 18px;
  padding: 16px;
  border-radius: 8px;
  background: #f9fafb;
}

.checkout-bar div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.checkout-bar span {
  color: #6b7280;
  font-size: 12px;
}

.checkout-bar strong {
  color: #111827;
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.order-item {
  border: 1px solid #eef0f4;
  border-radius: 8px;
  padding: 14px 16px;
}

.order-item > div {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.order-item strong {
  color: #111827;
}

.pay-modal-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.pay-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

@media (max-width: 960px) {
  .member-summary,
  .plan-grid {
    grid-template-columns: 1fr;
  }

  .checkout-bar,
  .order-item {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>