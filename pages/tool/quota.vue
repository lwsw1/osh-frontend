<template>
  <div class="quota-page">
    <button class="back-btn" type="button" @click="goBackToTool">返回工具模块</button>

    <div class="quota-page-header">
      <div class="quota-page-title-group">
        <span class="quota-page-kicker">Quota Center</span>
        <h1>工具点数购买</h1>
        <p>统一购买工具点数，按工具实际消耗量进行扣减。</p>
      </div>
      <div class="quota-balance-card">
        <span class="quota-balance-label">当前工具点数</span>
        <strong class="quota-balance-value">{{ quotaLoading ? '--' : currentQuota.remainingCount }}</strong>
        <div class="quota-balance-meta">
          <span>累计 {{ currentQuota.totalBuyCount }}</span>
          <span>已用 {{ currentQuota.usedCount }}</span>
        </div>
      </div>
    </div>

    <div class="quota-toolbar">
      <div class="quota-toolbar-left">
        <span class="quota-toolbar-title">可购买套餐</span>
        <span class="quota-toolbar-tip">支付后工具点数实时到账</span>
      </div>
      <div v-if="canManageQuota" class="quota-toolbar-right">
        <button class="quota-manage-btn" type="button" @click="openEditModal(null)">+ 新增套餐</button>
      </div>
    </div>

    <div class="quota-grid">
      <div v-for="item in packages" :key="item.packageId" class="quota-card">
        <div class="quota-card-head">
          <div>
            <h3>{{ item.packageName }}</h3>
            <span class="quota-card-points">+{{ item.useCount }} 工具点数</span>
          </div>
          <span class="quota-card-status" :class="{ off: Number(item.status) !== 1 }">
            {{ Number(item.status) === 1 ? '启用中' : '已停用' }}
          </span>
        </div>
        <div class="quota-card-price">
          <span class="quota-card-cash">¥{{ formatAmount(item.cashAmount) }}</span>
          <span v-if="Number(item.payType) === 3 && Number(item.pointAmount || 0) > 0" class="quota-card-point">
            + {{ item.pointAmount }} 积分
          </span>
        </div>
        <div class="quota-card-meta">
          <span>排序 {{ item.sortOrder || 0 }}</span>
          <span>支付类型 {{ Number(item.payType) === 3 ? '现金+积分' : '纯现金' }}</span>
        </div>
        <div class="quota-card-actions">
          <button
            class="quota-buy-action"
            type="button"
            :disabled="Number(item.status) !== 1 || paySubmitting"
            @click="openPayModal(item)"
          >
            {{ paySubmitting && selectedPackageId === item.packageId ? '创建中...' : '立即购买' }}
          </button>
          <template v-if="canManageQuota">
            <button class="quota-secondary-action" type="button" @click="openEditModal(item)">修改</button>
            <button class="quota-secondary-action danger" type="button" @click="handleDeletePackage(item)">删除</button>
          </template>
        </div>
      </div>
    </div>

    <n-empty v-if="!packages.length && !packagesLoading" description="暂无工具点数套餐" />

    <n-modal
      :show="showPayModal"
      preset="card"
      title="确认购买工具点数"
      style="width: 560px"
      :segmented="{ content: 'soft', footer: 'soft' }"
      @update:show="handleClosePayModal"
    >
      <div v-if="selectedPackage" class="pay-modal-body">
        <div class="pay-package-title">{{ selectedPackage.packageName }}</div>
        <div class="pay-package-points">+{{ selectedPackage.useCount }} 工具点数</div>

        <div class="pay-methods">
          <button
            class="pay-method-btn"
            :class="{ active: selectedChannel === 'wxpay' }"
            :disabled="!!payOrderNo"
            type="button"
            @click="selectedChannel = 'wxpay'"
          >
            <img class="pay-method-icon" src="~/assets/images/payment/wechat-pay.svg" alt="微信支付">
            <span>微信支付</span>
          </button>
          <button
            class="pay-method-btn"
            :class="{ active: selectedChannel === 'alipay' }"
            :disabled="!!payOrderNo"
            type="button"
            @click="selectedChannel = 'alipay'"
          >
            <img class="pay-method-icon" src="~/assets/images/payment/alipay-pay.svg" alt="支付宝">
            <span>支付宝</span>
          </button>
        </div>

        <div class="pay-summary-card">
          <div class="pay-summary-row"><span>现金金额</span><strong>¥{{ formatAmount(selectedPackage.cashAmount) }}</strong></div>
          <div v-if="Number(selectedPackage.payType) === 3" class="pay-summary-row">
            <span>积分金额</span><strong>{{ selectedPackage.pointAmount || 0 }} 积分</strong>
          </div>
          <div v-if="payOrderNo && payStatus !== '1'" class="pay-summary-row">
            <span>剩余支付时间</span><strong>{{ payCountdownText }}</strong>
          </div>
          <div v-if="payOrderNo" class="pay-summary-row">
            <span>支付状态</span><strong>{{ payStatusText }}</strong>
          </div>
        </div>

        <div v-if="payQrcodeImage" class="pay-qrcode-panel">
          <img :src="payQrcodeImage" alt="支付二维码" class="pay-qrcode-image">
          <p class="pay-qrcode-tip">请使用{{ selectedChannel === 'alipay' ? '支付宝' : '微信' }}扫码完成支付</p>
        </div>

        <div class="pay-tips">
          <p>1. 支付成功后工具点数将自动到账。</p>
          <p>2. 购买后不支持退款，请确认后再支付。</p>
        </div>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="handleClosePayModal">{{ payOrderNo ? '关闭' : '取消' }}</n-button>
          <n-button
            v-if="payOrderNo && payStatus !== '1'"
            :loading="cancelPayLoading"
            @click="cancelCurrentQuotaPayment"
          >
            关闭订单
          </n-button>
          <n-button
            type="primary"
            :loading="paySubmitting"
            :disabled="!!payOrderNo"
            @click="handleBuy(selectedPackage)"
          >
            生成支付二维码
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal
      :show="showEditModal"
      preset="card"
      :title="editingPackage ? '修改工具点数套餐' : '新增工具点数套餐'"
      style="width: 640px"
      :segmented="{ content: 'soft', footer: 'soft' }"
      @update:show="closeEditModal"
    >
      <n-form label-placement="left" label-width="110">
        <n-form-item label="套餐名称">
          <n-input v-model:value="editForm.packageName" placeholder="请输入套餐名称" />
        </n-form-item>
        <n-form-item label="工具点数">
          <n-input-number v-model:value="editForm.useCount" :min="1" placeholder="购买后增加的工具点数" />
        </n-form-item>
        <n-form-item label="现金金额">
          <n-input-number v-model:value="editForm.price" :min="0.01" placeholder="请输入现金金额">
            <template #prefix>￥</template>
          </n-input-number>
        </n-form-item>
        <n-form-item label="支付类型">
          <n-select v-model:value="editForm.payType" :options="payTypeOptions" />
        </n-form-item>
        <n-form-item v-if="Number(editForm.payType) === 3" label="积分金额">
          <n-input-number :value="autoPointCost" :show-button="false" readonly />
        </n-form-item>
        <n-form-item label="状态">
          <n-select v-model:value="editForm.status" :options="statusOptions" />
        </n-form-item>
        <n-form-item label="排序">
          <n-input-number v-model:value="editForm.sortOrder" :min="0" placeholder="请输入排序值" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="closeEditModal">取消</n-button>
          <n-button type="primary" :loading="saveSubmitting" @click="handleSavePackage">保存</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { createDiscreteApi, NButton, NEmpty, NForm, NFormItem, NInput, NInputNumber, NModal, NSpace, NSelect } from 'naive-ui'
import { useUser, getUserMemberLevel } from '~/composables/useAuth'
import {
  apiCreateToolPurchaseOrder,
  apiCurrentToolQuota,
  apiDeleteToolQuotaPackage,
  apiSaveToolQuotaPackage,
  apiToolQuotaPackages,
} from '~/composables/Api/Tool/tool'
import { usePayStatusApi, useCancelPayApi } from '~/composables/order'
import QRCode from 'qrcode'

const { message, dialog } = createDiscreteApi(['message', 'dialog'])
const user = useUser()
const canManageQuota = computed(() => getUserMemberLevel() >= 5)
const packages = ref([])
const packagesLoading = ref(false)
const quotaLoading = ref(false)
const paySubmitting = ref(false)
const selectedPackageId = ref(null)
const selectedPackage = ref(null)
const selectedChannel = ref('wxpay')
const saveSubmitting = ref(false)
const showEditModal = ref(false)
const editingPackage = ref(null)
const showPayModal = ref(false)
const cancelPayLoading = ref(false)
let payPollingTimer = null
let payCountdownTimer = null
const payOrderNo = ref('')
const payPaymentNo = ref('')
const payQrcodeImage = ref('')
const payRawCode = ref('')
const payStatus = ref('')
const payRemainingSeconds = ref(0)

const QUOTA_PAY_ORDER_EXPIRE_SECONDS = 30 * 60
const QUOTA_PAY_POLLING_INTERVAL = 3000

const currentQuota = reactive({
  remainingCount: 0,
  totalBuyCount: 0,
  usedCount: 0,
})

const editForm = reactive({
  id: null,
  packageName: '',
  useCount: 100,
  price: null,
  payType: 1,
  status: 1,
  sortOrder: 0,
})

const payTypeOptions = [
  { label: '纯现金', value: 1 },
  { label: '现金/积分', value: 3 },
]

const statusOptions = [
  { label: '启用', value: 1 },
  { label: '停用', value: 0 },
]

const autoPointCost = computed(() => {
  if (Number(editForm.payType) !== 3) {
    return 0
  }
  const price = Number(editForm.price || 0)
  return Math.round(price * 10)
})

const formatAmount = (value) => Number(value || 0).toFixed(2)
const payCountdownText = computed(() => {
  if (payStatus.value === '3') return '订单已关闭'
  const totalSeconds = Number(payRemainingSeconds.value || 0)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})
const payStatusText = computed(() => {
  const map = {
    '': '待支付',
    '0': '待支付',
    '1': '支付成功',
    '2': '支付失败',
    '3': '已关闭',
  }
  return map[payStatus.value] || '处理中'
})

const goBackToTool = () => {
  navigateTo('/tool')
}

const loadQuota = async () => {
  quotaLoading.value = true
  try {
    const res = await apiCurrentToolQuota()
    const data = res?.data || res || {}
    currentQuota.remainingCount = Number(data.remainingCount || 0)
    currentQuota.totalBuyCount = Number(data.totalBuyCount || 0)
    currentQuota.usedCount = Number(data.usedCount || 0)
  } finally {
    quotaLoading.value = false
  }
}

const loadPackages = async () => {
  packagesLoading.value = true
  try {
    const res = await apiToolQuotaPackages()
    packages.value = Array.isArray(res?.data) ? res.data : []
  } finally {
    packagesLoading.value = false
  }
}

const openPayModal = (item) => {
  selectedPackage.value = item
  selectedChannel.value = 'wxpay'
  resetPayState()
  showPayModal.value = true
}

const handleBuy = async (item) => {
  paySubmitting.value = true
  selectedPackageId.value = item.packageId
  try {
    const res = await apiCreateToolPurchaseOrder({
      packageId: item.packageId,
      payType: item.payType,
      channel: selectedChannel.value,
    })
    const data = res?.data || {}
    const paymentInfo = data.payment || {}
    const payUrl = paymentInfo.payUrl || data.payUrl || ''
    const qrcode = paymentInfo.qrcode || data.qrcode || ''
    payOrderNo.value = data.orderNo || ''
    payPaymentNo.value = data.paymentNo || ''
    payRawCode.value = qrcode || payUrl
    payStatus.value = data.payStatus || '0'
    await buildQuotaPayQrcode()
    startQuotaPayPolling(payOrderNo.value)
    startQuotaPayCountdown(data.expireTime, data.closeExpireMinutes)
    if (payUrl) {
      window.open(payUrl, '_blank')
    }
    message.success('订单已创建，请完成支付')
  } catch (e) {
    message.error(e?.data?.msg || e?.message || '创建订单失败')
  } finally {
    paySubmitting.value = false
  }
}

const buildQuotaPayQrcode = async () => {
  if (!payRawCode.value) {
    payQrcodeImage.value = ''
    return
  }
  if (String(payRawCode.value).startsWith('data:image')) {
    payQrcodeImage.value = payRawCode.value
    return
  }
  payQrcodeImage.value = await QRCode.toDataURL(String(payRawCode.value), {
    width: 220,
    margin: 1,
  })
}

const stopQuotaPayPolling = () => {
  if (payPollingTimer) {
    clearInterval(payPollingTimer)
    payPollingTimer = null
  }
}

const stopQuotaPayCountdown = () => {
  if (payCountdownTimer) {
    clearInterval(payCountdownTimer)
    payCountdownTimer = null
  }
}

const resetPayState = () => {
  stopQuotaPayPolling()
  stopQuotaPayCountdown()
  selectedPackageId.value = null
  payOrderNo.value = ''
  payPaymentNo.value = ''
  payQrcodeImage.value = ''
  payRawCode.value = ''
  payStatus.value = ''
  payRemainingSeconds.value = QUOTA_PAY_ORDER_EXPIRE_SECONDS
}

const startQuotaPayPolling = (orderNo) => {
  stopQuotaPayPolling()
  if (!orderNo) return
  payPollingTimer = setInterval(async () => {
    if (payStatus.value === '1' || payStatus.value === '3') {
      stopQuotaPayPolling()
      return
    }
    try {
      const { data: statusResult } = await usePayStatusApi(orderNo)
      if (payOrderNo.value !== orderNo) {
        return
      }
      if (statusResult.value?.payStatus) {
        payStatus.value = '1'
        stopQuotaPayPolling()
        stopQuotaPayCountdown()
        message.success('支付成功，工具点数已到账')
        await loadQuota()
        await loadPackages()
        showPayModal.value = false
        resetPayState()
      }
    } catch (e) {
      // ignore
    }
  }, QUOTA_PAY_POLLING_INTERVAL)
}

const startQuotaPayCountdown = (expireTime, closeExpireMinutes) => {
  stopQuotaPayCountdown()
  const deadline = expireTime ? new Date(String(expireTime).replace(' ', 'T')).getTime() : NaN
  if (!Number.isNaN(deadline)) {
    payRemainingSeconds.value = Math.max(0, Math.floor((deadline - Date.now()) / 1000))
  } else {
    const minutes = Number(closeExpireMinutes || 30)
    payRemainingSeconds.value = Math.max(0, minutes * 60)
  }
  if (payRemainingSeconds.value <= 0) {
    payStatus.value = '3'
    return
  }
  payCountdownTimer = setInterval(async () => {
    payRemainingSeconds.value = Math.max(0, payRemainingSeconds.value - 1)
    if (payRemainingSeconds.value === 0) {
      stopQuotaPayPolling()
      stopQuotaPayCountdown()
      if (payOrderNo.value && payStatus.value !== '1') {
        await cancelCurrentQuotaPayment(true)
        message.warning('订单已超时关闭，请重新发起购买。')
      }
    }
  }, 1000)
}

const cancelCurrentQuotaPayment = async (silent = false) => {
  if (!payOrderNo.value) {
    resetPayState()
    return
  }
  cancelPayLoading.value = true
  try {
    await useCancelPayApi(payOrderNo.value)
    payStatus.value = '3'
    if (!silent) {
      message.success('订单已关闭')
    }
  } catch (e) {
    if (!silent) {
      message.error(e?.data?.msg || e?.message || '关闭订单失败')
    }
  } finally {
    cancelPayLoading.value = false
    resetPayState()
    showPayModal.value = false
  }
}

const handleClosePayModal = async () => {
  if (payOrderNo.value && payStatus.value !== '1') {
    await cancelCurrentQuotaPayment(true)
    return
  }
  showPayModal.value = false
  resetPayState()
}

const openEditModal = (item) => {
  editingPackage.value = item
  editForm.id = item?.packageId ?? null
  editForm.packageName = item?.packageName ?? ''
  editForm.useCount = item?.useCount ?? 100
  editForm.price = item?.cashAmount ?? null
  editForm.payType = item?.payType ?? 1
  editForm.status = item?.status ?? 1
  editForm.sortOrder = item?.sortOrder ?? 0
  showEditModal.value = true
}

const closeEditModal = () => {
  showEditModal.value = false
  editingPackage.value = null
}

const handleSavePackage = async () => {
  if (!editForm.packageName.trim()) {
    message.warning('请输入套餐名称')
    return
  }
  saveSubmitting.value = true
  try {
    await apiSaveToolQuotaPackage({
      id: editForm.id,
      packageName: editForm.packageName.trim(),
      useCount: editForm.useCount,
      price: editForm.price,
      payType: editForm.payType,
      status: editForm.status,
      sortOrder: editForm.sortOrder,
    })
    message.success(editForm.id ? '套餐修改成功' : '套餐新增成功')
    closeEditModal()
    await loadPackages()
  } catch (e) {
    message.error(e?.data?.msg || e?.message || '保存套餐失败')
  } finally {
    saveSubmitting.value = false
  }
}

const handleDeletePackage = (item) => {
  dialog.warning({
    title: '删除确认',
    content: `确定删除套餐「${item.packageName}」？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await apiDeleteToolQuotaPackage(item.packageId)
        message.success('套餐删除成功')
        await loadPackages()
      } catch (e) {
        message.error(e?.data?.msg || e?.message || '删除套餐失败')
      }
    },
  })
}

onMounted(() => {
  if (!user.value) {
    navigateTo('/login?from=/tool/quota')
    return
  }
  loadQuota()
  loadPackages()
})

onUnmounted(() => {
  stopQuotaPayPolling()
  stopQuotaPayCountdown()
})
</script>

<style scoped>
.quota-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 18px;
  margin-bottom: 20px;
  border-radius: 999px;
  border: 1px solid #d6dee8;
  background: #fff;
  color: #334155;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}
.back-btn::before {
  content: '←';
  font-size: 14px;
}
.back-btn:hover {
  border-color: #18a058;
  color: #18a058;
  transform: translateX(-2px);
}
.quota-page-header {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}
.quota-page-kicker {
  font-size: 12px;
  color: #10b981;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.quota-page-title-group h1 {
  margin: 6px 0 10px;
  font-size: 30px;
  color: #0f172a;
}
.quota-page-title-group p {
  margin: 0;
  color: #64748b;
}
.quota-balance-card {
  min-width: 280px;
  padding: 18px;
  border-radius: 18px;
  background: linear-gradient(135deg, #ecfdf5, #dbeafe);
  border: 1px solid rgba(16, 185, 129, 0.16);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
}
.quota-balance-label {
  display: block;
  color: #64748b;
  font-size: 13px;
}
.quota-balance-value {
  display: block;
  margin-top: 6px;
  font-size: 32px;
  font-weight: 900;
  color: #0f172a;
}
.quota-balance-meta {
  display: flex;
  gap: 14px;
  margin-top: 10px;
  color: #64748b;
  font-size: 13px;
}
.quota-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}
.quota-toolbar-title {
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
}
.quota-toolbar-tip {
  margin-left: 12px;
  color: #64748b;
  font-size: 13px;
}
.quota-manage-btn {
  border: 1px solid #18a058;
  background: #18a058;
  color: #fff;
  border-radius: 10px;
  padding: 10px 14px;
  font-weight: 700;
  cursor: pointer;
}
.quota-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.quota-card {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 16px;
  padding: 18px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
}
.quota-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.quota-card-head h3 {
  margin: 0;
  font-size: 18px;
  color: #0f172a;
}
.quota-card-points {
  display: inline-block;
  margin-top: 8px;
  font-size: 13px;
  color: #10b981;
  font-weight: 700;
}
.quota-card-status {
  padding: 4px 10px;
  border-radius: 999px;
  background: #ecfdf5;
  color: #10b981;
  font-size: 12px;
  font-weight: 700;
}
.quota-card-status.off {
  background: #f1f5f9;
  color: #64748b;
}
.quota-card-price {
  margin-top: 14px;
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.quota-card-cash {
  font-size: 28px;
  font-weight: 900;
  color: #ef4444;
}
.quota-card-point {
  color: #7c3aed;
  font-weight: 700;
}
.quota-card-meta {
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
  color: #64748b;
  font-size: 13px;
}
.quota-card-actions {
  margin-top: 18px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.quota-buy-action,
.quota-secondary-action {
  border-radius: 10px;
  padding: 10px 14px;
  font-weight: 700;
  cursor: pointer;
}
.quota-buy-action {
  border: 1px solid #18a058;
  background: #18a058;
  color: #fff;
}
.quota-secondary-action {
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: #fff;
  color: #334155;
}
.quota-secondary-action.danger {
  color: #ef4444;
}
.pay-modal-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.pay-package-title {
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
}
.pay-package-points {
  color: #10b981;
  font-weight: 700;
}
.pay-methods {
  display: flex;
  gap: 12px;
}
.pay-method-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex: 1;
  border-radius: 12px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: #fff;
  padding: 12px 14px;
  font-weight: 700;
  cursor: pointer;
}
.pay-method-btn.active {
  border-color: #18a058;
  background: #ecfdf5;
  color: #047857;
}
.pay-method-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}
.pay-summary-card {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 12px;
  background: #f8fafc;
  padding: 14px 16px;
}
.pay-summary-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: #475569;
  margin-bottom: 8px;
}
.pay-summary-row:last-child {
  margin-bottom: 0;
}
.pay-summary-row strong {
  color: #0f172a;
}
.pay-qrcode-panel {
  text-align: center;
  padding: 12px 0;
}
.pay-qrcode-image {
  width: 220px;
  height: 220px;
  object-fit: contain;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
}
.pay-qrcode-tip {
  margin-top: 10px;
  color: #64748b;
  font-size: 13px;
}
.pay-tips {
  font-size: 13px;
  color: #64748b;
  line-height: 1.7;
}
.pay-tips p {
  margin: 0;
}
</style>
