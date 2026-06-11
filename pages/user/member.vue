<template>
  <div class="member-page">
    <section class="member-hero">
      <div class="hero-main">
        <span class="eyebrow">{{ text.memberCenter }}</span>
        <h2>{{ currentStatus.memberName || text.normalUser }}</h2>
        <p>{{ currentSummary }}</p>
      </div>
      <div class="status-grid">
        <div class="status-tile" :class="{ active: center.vip?.active }">
          <span>{{ text.vipUser }}</span>
          <strong>{{ center.vip?.active ? text.opened : text.notOpened }}</strong>
          <small>{{ formatExpire(center.vip) }}</small>
        </div>
        <div class="status-tile" :class="{ active: center.smallClass?.active }">
          <span>{{ text.smallClassUser }}</span>
          <strong>{{ center.smallClass?.active ? text.opened : text.notOpened }}</strong>
          <small>{{ formatExpire(center.smallClass) }}</small>
        </div>
      </div>
    </section>

    <section class="member-section shop-section">
      <div class="section-head">
        <div>
          <h3>{{ text.choosePlan }}</h3>
          <p>{{ text.planHint }}</p>
        </div>
        <n-button quaternary :loading="loading" @click="loadMemberCenter">{{ text.refresh }}</n-button>
      </div>

      <n-spin :show="loading">
        <div class="shop-layout">
          <div class="plan-column">
            <button
              v-for="plan in plans"
              :key="plan.id"
              class="plan-card"
              :class="{ selected: selectedPlan?.id === plan.id }"
              type="button"
              @click="selectPlan(plan)"
            >
              <div class="plan-topline">
                <span class="plan-type">{{ memberTypeLabel(plan.memberType) }}</span>
                <span class="plan-period">{{ periodLabel(plan) }}</span>
              </div>
              <div class="plan-title-row">
                <h4>{{ plan.planName }}</h4>
                <n-tag v-if="isRecommended(plan)" type="warning" size="small">{{ text.recommend }}</n-tag>
              </div>
              <p class="plan-desc">{{ plan.description || text.defaultPlanDesc }}</p>
              <div class="benefit-list">
                <div v-for="benefit in planBenefits(plan)" :key="benefitKey(benefit)" class="benefit-item">
                  <span>{{ benefit.benefitTitle }}</span>
                  <small>{{ benefit.benefitDescription }}</small>
                </div>
              </div>
              <div class="price-row">
                <div class="price-main">
                  <strong>&yen;{{ money(planDisplayAmount(plan)) }}</strong>
                  <span v-if="planDisplaySuffix(plan)">{{ planDisplaySuffix(plan) }}</span>
                </div>
                <del v-if="showPlanOriginalPrice(plan)">&yen;{{ money(planDisplayOriginalAmount(plan)) }}</del>
              </div>
              <small class="unit-price">{{ planUnitPriceText(plan) }}</small>
            </button>
          </div>

          <aside class="checkout-panel">
            <div class="panel-block">
              <span class="panel-label">{{ text.currentChoice }}</span>
              <strong>{{ selectedPlan?.planName || text.selectPlan }}</strong>
              <p>{{ selectedPlan?.description || text.defaultPlanDesc }}</p>
            </div>

            <div class="panel-block quantity-block">
              <div>
                <span class="panel-label">{{ quantityLabel }}</span>
                <small>{{ quantityLimitText }}</small>
              </div>
              <div class="tier-options">
                <button
                  v-for="tier in selectedPriceTiers"
                  :key="tier.quantity"
                  class="tier-option"
                  :class="{ selected: quantity === tier.quantity }"
                  type="button"
                  @click="quantity = tier.quantity"
                >
                  <span>{{ tierLabel(tier) }}</span>
                  <strong>&yen;{{ money(tier.price) }}</strong>
                </button>
              </div>
            </div>

            <div class="payment-group">
              <button
                v-for="channel in payChannels"
                :key="channel.value"
                class="payment-card"
                :class="{ selected: payChannel === channel.value }"
                type="button"
                @click="payChannel = channel.value"
              >
                <span class="payment-mark" :class="channel.value">{{ channel.mark }}</span>
                <span>{{ channel.label }}</span>
              </button>
            </div>

            <div class="total-box">
              <span>{{ text.payAmount }}</span>
              <strong>&yen;{{ money(totalAmount) }}</strong>
              <small>{{ selectedDurationText }}</small>
            </div>

            <n-button type="primary" size="large" block :disabled="!selectedPlan" :loading="submitting" @click="createCheckout">
              {{ text.openNow }}
            </n-button>
          </aside>
        </div>
      </n-spin>
    </section>

    <section v-if="center.founder" class="member-section admin-section">
      <div class="section-head">
        <div>
          <h3>{{ text.founderConfig }}</h3>
          <p>{{ text.founderConfigHint }}</p>
        </div>
        <n-button secondary :loading="adminLoading" @click="loadAdminPlans">{{ text.reloadConfig }}</n-button>
      </div>

      <n-spin :show="adminLoading">
        <div class="admin-grid">
          <div v-for="plan in adminPlans" :key="plan.id" class="admin-plan" :class="adminPlanTone(plan)">
            <div class="admin-title">
              <div class="admin-title-text">
                <div class="admin-title-main">
                  <strong>{{ plan.planName || text.unnamedPlan }}</strong>
                  <span>{{ adminPlanBadge(plan) }}</span>
                </div>
                <div class="admin-plan-code">
                  {{ text.planCode }}：<code>{{ plan.planCode || text.noPlanCode }}</code>
                </div>
              </div>
              <n-switch v-model:value="plan.enabled" size="small" />
            </div>
            <div class="admin-fields">
              <label>
                <span>{{ text.planName }}</span>
                <n-input v-model:value="plan.planName" />
              </label>
              <label>
                <span>{{ text.price }}</span>
                <n-input-number v-model:value="plan.price" :min="0.01" :precision="2" />
              </label>
              <label>
                <span>{{ text.originalPrice }}</span>
                <n-input-number v-model:value="plan.originalPrice" :min="0" :precision="2" />
              </label>
              <label>
                <span>{{ text.minQuantity }}</span>
                <n-input-number v-model:value="plan.minPurchaseQuantity" :min="1" :precision="0" />
              </label>
              <label>
                <span>{{ text.maxQuantity }}</span>
                <n-input-number v-model:value="plan.maxPurchaseQuantity" :min="1" :precision="0" />
              </label>
              <label>
                <span>{{ text.sort }}</span>
                <n-input-number v-model:value="plan.sort" :precision="0" />
              </label>
            </div>
            <label class="wide-field">
              <span>{{ text.planDescription }}</span>
              <n-input v-model:value="plan.description" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" />
            </label>
            <div class="admin-actions inline-actions">
              <n-button secondary :loading="plan.saving" @click="savePlanConfig(plan)">{{ text.saveBasicConfig }}</n-button>
            </div>

            <div class="pricing-rule-panel">
              <div class="pricing-rule-head">
                <div>
                  <strong>{{ text.pricingRule }}</strong>
                  <p>{{ text.pricingRuleHint }}</p>
                </div>
                <n-button secondary :loading="plan.saving" @click="savePricingRule(plan)">{{ text.savePricingRule }}</n-button>
              </div>
              <div class="pricing-rule-fields">
                <label>
                  <span class="field-label-with-help">
                    {{ text.growthCoefficient }}
                    <n-tooltip trigger="hover">
                      <template #trigger>
                        <button class="help-dot" type="button" :aria-label="text.growthCoefficientTip">?</button>
                      </template>
                      {{ text.growthCoefficientTip }}
                    </n-tooltip>
                  </span>
                  <n-input-number v-model:value="plan.growthCoefficient" :min="0.01" :max="1.2" :step="0.01" :precision="4" />
                </label>
                <label>
                  <span class="field-label-with-help">
                    {{ text.capPlanCode }}
                    <n-tooltip trigger="hover">
                      <template #trigger>
                        <button class="help-dot" type="button" :aria-label="text.capPlanCodeTip">?</button>
                      </template>
                      {{ text.capPlanCodeTip }}
                    </n-tooltip>
                  </span>
                  <n-input v-model:value="plan.capPlanCode" :placeholder="text.capPlanCodePlaceholder" />
                </label>
                <label>
                  <span class="field-label-with-help">
                    {{ text.capRatio }}
                    <n-tooltip trigger="hover">
                      <template #trigger>
                        <button class="help-dot" type="button" :aria-label="text.capRatioTip">?</button>
                      </template>
                      {{ text.capRatioTip }}
                    </n-tooltip>
                  </span>
                  <n-input-number v-model:value="plan.capRatio" :min="0.01" :max="1" :step="0.01" :precision="4" />
                </label>
              </div>
              <div class="price-preview-head">
                <span>{{ text.pricePreview }}</span>
                <small>{{ adminPreviewSummary(plan) }}</small>
              </div>
              <div class="price-preview-grid">
                <div v-for="tier in adminPreviewTiers(plan)" :key="tier.quantity" class="price-preview-item">
                  <span>{{ tierLabel(tier) }}</span>
                  <strong>&yen;{{ money(tier.price) }}</strong>
                  <small v-if="tier.originalPrice > tier.price">{{ text.originalPrice }} &yen;{{ money(tier.originalPrice) }}</small>
                </div>
              </div>
            </div>

            <div class="benefit-editor">
              <div class="benefit-editor-head">
                <strong>{{ text.benefits }}</strong>
                <n-button size="small" tertiary @click="addBenefit(plan)">{{ text.addBenefit }}</n-button>
              </div>
              <div v-for="(benefit, index) in plan.benefits" :key="benefit.localKey" class="benefit-row">
                <n-input v-model:value="benefit.benefitTitle" :placeholder="text.benefitTitle" />
                <n-input v-model:value="benefit.benefitDescription" :placeholder="text.benefitDescription" />
                <n-input-number v-model:value="benefit.sort" :precision="0" />
                <n-switch v-model:value="benefit.enabled" size="small" />
                <n-button size="small" quaternary type="error" @click="removeBenefit(plan, index)">{{ text.remove }}</n-button>
              </div>
            </div>

            <div class="admin-actions">
              <n-button type="primary" :loading="plan.saving" @click="savePlanConfig(plan)">{{ text.saveConfig }}</n-button>
            </div>
          </div>
        </div>
      </n-spin>
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
            <span>
              {{ orderDurationText(order) }}
              <del v-if="showOrderOriginalPrice(order)">&yen;{{ money(order.originalAmount) }}</del>
            </span>
          </div>
          <div>
            <strong>{{ order.createTime || '-' }}</strong>
            <span>{{ order.expireTime ? `${text.expirePrefix}${order.expireTime}` : text.waitGrant }}</span>
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
import { NButton, NEmpty, NInput, NInputNumber, NModal, NSpin, NSwitch, NTag, NTooltip, createDiscreteApi } from 'naive-ui'

const text = {
  memberCenter: '会员中心',
  normalUser: '普通用户',
  vipUser: 'VIP用户',
  smallClassUser: '小班用户',
  opened: '已开通',
  notOpened: '未开通',
  choosePlan: '选择套餐',
  planHint: 'VIP 支持月付或年付，小班用户仅支持年付。',
  refresh: '刷新',
  defaultPlanDesc: '开通后自动发放对应会员权益。',
  currentChoice: '当前选择',
  selectPlan: '请选择套餐',
  wxpay: '微信支付',
  alipay: '支付宝',
  openNow: '立即开通',
  rechargeRecords: '充值记录',
  recordsHint: '查看会员套餐购买及权益发放状态。',
  noRecords: '暂无充值记录',
  noQrCode: '未获取到支付二维码',
  orderNo: '订单号：',
  cancelPay: '取消支付',
  paid: '我已支付',
  activeAfterOpen: '开通后立即生效',
  expirePrefix: '到期：',
  remainingPrefix: '剩余 ',
  remainingSuffix: ' 天',
  yearPay: '年付',
  monthPay: '月付',
  paidSuccess: '支付成功，会员权益已发放',
  granting: '支付成功，会员权益发放中，请稍后刷新',
  loadingFailed: '会员中心加载失败',
  createOrderFailed: '创建支付订单失败',
  orderCreateFailed: '订单创建失败',
  memberOpened: '会员已开通',
  notPaidYet: '暂未查询到支付成功，请稍后再试',
  statusFailed: '支付状态查询失败',
  currentNormalSummary: '开通会员后可访问对应专属资源。',
  expireSummaryPrefix: '有效期至 ',
  activeSummary: '会员权益已生效。',
  payWithPrefix: '请使用',
  payWithSuffix: '扫码完成支付',
  alipayQrTitle: '支付宝扫码支付',
  wxpayQrTitle: '微信扫码支付',
  granted: '已发放',
  grantFailed: '发放失败',
  paidOnly: '已支付',
  pendingPay: '待支付',
  recommend: '推荐',
  payAmount: '应付金额',
  quantityUnitMonth: '购买月数',
  quantityUnitYear: '购买年数',
  quantityLimitPrefix: '可选 ',
  quantityLimitJoin: ' 至 ',
  quantityLimitSuffixMonth: ' 个月',
  quantityLimitSuffixYear: ' 年',
  durationMonth: '个月权益',
  durationYear: '年权益',
  founderConfig: '创始人配置',
  founderConfigHint: '维护会员价格、购买数量和权益文案。',
  basicConfig: '基础配置',
  pricingRule: '计费规则',
  pricingRuleHint: '按当前最小/最大购买数实时预览价格，保存后用户端生效。',
  pricePreview: '价格预览',
  saveBasicConfig: '保存基础配置',
  savePricingRule: '保存计费规则',
  effectiveMax: '实际可买',
  capLimited: '已受封顶限制',
  noCap: '未设置封顶',
  reloadConfig: '重新载入',
  unnamedPlan: '未命名套餐',
  planCode: '套餐编码',
  noPlanCode: '未设置编码',
  planName: '套餐名称',
  price: '售价',
  originalPrice: '原价',
  minQuantity: '最小购买数',
  maxQuantity: '最大购买数',
  growthCoefficient: '增长系数',
  growthCoefficientTip: '控制连续购买多个周期时后续周期的折扣力度。算法按首期原价、第二期乘以该系数、第三期再乘以该系数的方式累加；数值越小，多买优惠越大。',
  capPlanCode: '封顶参考套餐',
  capPlanCodeTip: '用另一个套餐的编码作为价格上限参考。例如月卡填 vip_year，表示多个月卡的总价不能接近或超过年卡价格；留空表示不启用封顶。',
  capPlanCodePlaceholder: '例如 vip_year，可留空',
  capRatio: '封顶比例',
  capRatioTip: '封顶参考套餐价格乘以该比例就是当前套餐的价格上限。例如 vip_year 为 288，比例 0.95，则月卡多月购买最高参考线为 273.6 元。',
  sort: '排序',
  planDescription: '套餐说明',
  benefits: '会员权益',
  addBenefit: '新增权益',
  benefitTitle: '权益标题',
  benefitDescription: '权益说明',
  remove: '删除',
  saveConfig: '保存配置',
  saveSuccess: '配置已保存',
  saveFailed: '保存配置失败',
  adminLoadFailed: '配置加载失败',
  waitGrant: '待发放权益',
  startFrom: '起',
  monthUnit: '/月',
  yearUnit: '/年',
  minBuySuffix: '起购',
}

useHead({ title: text.memberCenter })

const { message } = createDiscreteApi(['message'])

const payChannels = [
  { value: 'wxpay', label: text.wxpay, mark: '微' },
  { value: 'alipay', label: text.alipay, mark: '支' },
]

const center = ref({})
const plans = ref([])
const orders = ref([])
const adminPlans = ref([])
const selectedPlan = ref(null)
const quantity = ref(1)
const payChannel = ref('wxpay')
const loading = ref(false)
const adminLoading = ref(false)
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
const selectedMinQuantity = computed(() => Math.max(1, Number(selectedPlan.value?.minPurchaseQuantity || 1)))
const selectedUnit = computed(() => isYearPlan(selectedPlan.value) ? text.quantityLimitSuffixYear : text.quantityLimitSuffixMonth)
const quantityLabel = computed(() => isYearPlan(selectedPlan.value) ? text.quantityUnitYear : text.quantityUnitMonth)
const selectedPriceTiers = computed(() => selectedPlan.value?.priceTiers || [])
const selectedTier = computed(() => selectedPriceTiers.value.find((tier) => Number(tier.quantity) === Number(quantity.value)))
const selectedMaxQuantity = computed(() => {
  if (selectedPriceTiers.value.length) return Math.max(...selectedPriceTiers.value.map((tier) => Number(tier.quantity)))
  const max = Number(selectedPlan.value?.effectiveMaxPurchaseQuantity || selectedPlan.value?.maxPurchaseQuantity || defaultMaxQuantity(selectedPlan.value))
  return Math.max(selectedMinQuantity.value, max)
})
const quantityLimitText = computed(() => `${text.quantityLimitPrefix}${selectedMinQuantity.value}${text.quantityLimitJoin}${selectedMaxQuantity.value}${selectedUnit.value}`)
const totalAmount = computed(() => Number(selectedTier.value?.price ?? selectedPlan.value?.price ?? 0) * (selectedTier.value ? 1 : Number(quantity.value || 0)))
const selectedDurationText = computed(() => {
  const months = Number(selectedTier.value?.durationMonths || selectedPlan.value?.durationMonths * quantity.value || 0)
  if (months >= 12 && months % 12 === 0) return `${months / 12}${text.durationYear}`
  return `${months}${text.durationMonth}`
})
const payModalTitle = computed(() => payChannel.value === 'alipay' ? text.alipayQrTitle : text.wxpayQrTitle)
const payScanTip = computed(() => `${text.payWithPrefix}${payChannel.value === 'alipay' ? text.alipay : text.wxpay}${text.payWithSuffix}`)

watch(selectedPlan, (plan) => {
  if (!plan) return
  quantity.value = Math.max(Number(plan.minPurchaseQuantity || 1), 1)
})

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
      selectPlan(plans.value[0])
    } else if (selectedPlan.value) {
      const fresh = plans.value.find((plan) => plan.id === selectedPlan.value.id)
      if (fresh) selectPlan(fresh)
    }
    if (center.value.founder) await loadAdminPlans()
  } catch (err) {
    message.error(err?.message || text.loadingFailed)
  } finally {
    loading.value = false
  }
}

async function loadAdminPlans() {
  adminLoading.value = true
  try {
    const data = await apiGetMemberAdminPlans()
    adminPlans.value = (data || []).map(cloneAdminPlan)
  } catch (err) {
    message.error(err?.message || text.adminLoadFailed)
  } finally {
    adminLoading.value = false
  }
}

function selectPlan(plan) {
  selectedPlan.value = plan
  quantity.value = Math.max(Number(plan?.minPurchaseQuantity || 1), 1)
}

async function createCheckout() {
  if (!selectedPlan.value) return
  submitting.value = true
  try {
    const result = await apiCreateMemberCheckout({
      planId: selectedPlan.value.id,
      channel: payChannel.value,
      quantity: quantity.value,
      usePoints: false,
    })
    pendingOrderNo.value = result?.orderNo || ''
    pendingPlanName.value = `${selectedPlan.value.planName} x${quantity.value}`
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

async function savePlanConfig(plan) {
  plan.saving = true
  try {
    await apiUpdateMemberPlanConfig({
      id: plan.id,
      planName: plan.planName,
      price: plan.price,
      originalPrice: plan.originalPrice,
      description: plan.description,
      minPurchaseQuantity: plan.minPurchaseQuantity,
      maxPurchaseQuantity: plan.maxPurchaseQuantity,
      sort: plan.sort,
      status: plan.enabled ? 1 : 0,
      benefits: (plan.benefits || [])
        .filter((benefit) => String(benefit.benefitTitle || '').trim())
        .map((benefit, index) => ({
          benefitTitle: benefit.benefitTitle,
          benefitDescription: benefit.benefitDescription,
          icon: benefit.icon,
          sort: benefit.sort ?? index * 10,
          status: benefit.enabled ? 1 : 0,
        })),
    })
    message.success(text.saveSuccess)
    await loadMemberCenter()
  } catch (err) {
    message.error(err?.message || text.saveFailed)
  } finally {
    plan.saving = false
  }
}

async function savePricingRule(plan) {
  plan.saving = true
  try {
    await apiUpdateMemberPricingRule({
      id: plan.id,
      growthCoefficient: plan.growthCoefficient,
      capPlanCode: plan.capPlanCode,
      capRatio: plan.capRatio,
    })
    message.success(text.saveSuccess)
    await loadMemberCenter()
  } catch (err) {
    message.error(err?.message || text.saveFailed)
  } finally {
    plan.saving = false
  }
}
function addBenefit(plan) {
  if (!plan.benefits) plan.benefits = []
  plan.benefits.push({
    localKey: `${plan.id}-${Date.now()}-${plan.benefits.length}`,
    benefitTitle: '',
    benefitDescription: '',
    icon: 'spark',
    sort: plan.benefits.length * 10,
    enabled: true,
  })
}

function removeBenefit(plan, index) {
  plan.benefits.splice(index, 1)
}

function cloneAdminPlan(plan) {
  return {
    ...plan,
    price: Number(plan.price || 0),
    originalPrice: Number(plan.originalPrice || 0),
    minPurchaseQuantity: Number(plan.minPurchaseQuantity || 1),
    maxPurchaseQuantity: Number(plan.maxPurchaseQuantity || defaultMaxQuantity(plan)),
    growthCoefficient: Number(plan.growthCoefficient || defaultGrowthCoefficient(plan)),
    capPlanCode: plan.capPlanCode || '',
    capRatio: Number(plan.capRatio || 1),
    sort: Number(plan.sort || 0),
    enabled: Number(plan.status) === 1,
    saving: false,
    benefits: (plan.benefits || []).map((benefit, index) => ({
      ...benefit,
      localKey: `${plan.id}-${benefit.id || index}`,
      sort: Number(benefit.sort ?? index * 10),
      enabled: Number(benefit.status ?? 1) === 1,
    })),
  }
}

function adminPlanTone(plan) {
  if (plan?.memberType === 'small_class') return 'tone-small-class'
  return isYearPlan(plan) ? 'tone-vip-year' : 'tone-vip-month'
}

function adminPlanBadge(plan) {
  if (plan?.memberType === 'small_class') return text.smallClassUser
  return isYearPlan(plan) ? text.yearPay : text.monthPay
}

function adminPreviewTiers(plan) {
  const min = Math.max(1, Number(plan?.minPurchaseQuantity || 1))
  const configuredMax = Math.max(min, Number(plan?.maxPurchaseQuantity || min))
  const capPlan = adminPlans.value.find((item) => item.planCode === String(plan?.capPlanCode || '').trim())
  const effectiveMax = adminEffectiveMaxQuantity(plan, capPlan)
  const max = Math.min(configuredMax, effectiveMax)
  const tiers = []
  for (let quantity = min; quantity <= max; quantity++) {
    const durationMonths = Number(plan?.durationMonths || 0) * quantity
    const originalPrice = Number(plan?.originalPrice || plan?.price || 0) * quantity
    tiers.push({
      quantity,
      durationMonths,
      originalPrice,
      price: adminPreviewPrice(plan, quantity, capPlan),
    })
  }
  return tiers
}

function adminPreviewSummary(plan) {
  const min = Math.max(1, Number(plan?.minPurchaseQuantity || 1))
  const max = Math.max(min, Number(plan?.maxPurchaseQuantity || min))
  const capPlan = adminPlans.value.find((item) => item.planCode === String(plan?.capPlanCode || '').trim())
  const effectiveMax = adminEffectiveMaxQuantity(plan, capPlan)
  const unit = isYearPlan(plan) ? text.quantityLimitSuffixYear.trim() : text.quantityLimitSuffixMonth.trim()
  const range = `${text.quantityLimitPrefix}${min}${text.quantityLimitJoin}${Math.min(max, effectiveMax)}${unit}`
  if (capPlan && effectiveMax < max) return `${range}，${text.capLimited}`
  return capPlan ? range : `${range}，${text.noCap}`
}

function adminEffectiveMaxQuantity(plan, capPlan) {
  const min = Math.max(1, Number(plan?.minPurchaseQuantity || 1))
  const configuredMax = Math.max(min, Number(plan?.maxPurchaseQuantity || min))
  const capAmount = adminCapAmount(plan, capPlan)
  if (!capAmount) return configuredMax
  let max = min
  for (let quantity = min; quantity <= configuredMax; quantity++) {
    if (adminGeometricPrice(Number(plan?.price || 0), Number(plan?.growthCoefficient || defaultGrowthCoefficient(plan)), quantity) >= capAmount) break
    max = quantity
  }
  return Math.max(min, max)
}

function adminPreviewPrice(plan, quantity, capPlan) {
  let price = normalizeAdminPrice(adminGeometricPrice(Number(plan?.price || 0), Number(plan?.growthCoefficient || defaultGrowthCoefficient(plan)), quantity))
  const capAmount = adminCapAmount(plan, capPlan)
  if (capAmount && price >= capAmount) price = endingEightBelowNumber(capAmount)
  return Math.max(Number(plan?.price || 0), price)
}

function adminGeometricPrice(basePrice, coefficient, quantity) {
  let total = 0
  let factor = 1
  for (let i = 0; i < quantity; i++) {
    total += basePrice * factor
    factor *= coefficient
  }
  return total
}

function adminCapAmount(plan, capPlan) {
  if (!capPlan || !Number(capPlan.price)) return null
  return Number(capPlan.price) * Number(plan?.capRatio || 1)
}

function normalizeAdminPrice(value) {
  const rounded = Math.round(Number(value || 0))
  const lower = endingEightFloorNumber(rounded)
  const upper = lower + 10
  return Math.abs(rounded - lower) <= Math.abs(upper - rounded) ? lower : upper
}

function endingEightBelowNumber(capAmount) {
  let candidate = normalizeAdminPrice(Number(capAmount || 0) - 1)
  while (candidate >= capAmount) candidate -= 10
  return candidate
}

function endingEightFloorNumber(value) {
  return Math.floor((Number(value || 0) - 8) / 10) * 10 + 8
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
    if (isGranted(status)) await handlePaidSuccess()
  } catch (err) {}
}

async function checkPayStatus() {
  if (!pendingOrderNo.value) return
  checkingPay.value = true
  try {
    const status = await apiGetMemberPayStatus(pendingOrderNo.value)
    if (isGranted(status)) {
      await handlePaidSuccess()
    } else if (isPaid(status)) {
      message.info(text.granting)
      await loadMemberCenter()
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
  return status?.paid === true
}

function isGranted(status) {
  return status?.granted === true
}

function memberTypeLabel(type) {
  return type === 'small_class' ? text.smallClassUser : text.vipUser
}

function isYearPlan(plan) {
  return plan?.periodType === 'year' || Number(plan?.durationMonths || 0) >= 12
}

function periodLabel(plan) {
  return isYearPlan(plan) ? text.yearPay : text.monthPay
}

function defaultMaxQuantity(plan) {
  return isYearPlan(plan) ? 3 : 3
}

function defaultGrowthCoefficient(plan) {
  if (!isYearPlan(plan)) return 0.78
  return plan?.memberType === 'small_class' ? 0.95 : 0.9
}

function planMinQuantity(plan) {
  return Math.max(1, Number(plan?.minPurchaseQuantity || 1))
}

function planDisplayAmount(plan) {
  return planTierByQuantity(plan, planMinQuantity(plan))?.price ?? Number(plan?.price || 0) * planMinQuantity(plan)
}

function planDisplayOriginalAmount(plan) {
  return planTierByQuantity(plan, planMinQuantity(plan))?.originalPrice ?? Number(plan?.originalPrice || 0) * planMinQuantity(plan)
}

function planDisplaySuffix(plan) {
  return planMinQuantity(plan) > 1 ? text.startFrom : ''
}

function planUnitPriceText(plan) {
  const unit = isYearPlan(plan) ? text.yearUnit : text.monthUnit
  const min = planMinQuantity(plan)
  const minText = min > 1 ? `，${min}${selectedUnitForPlan(plan)}${text.minBuySuffix}` : ''
  return `¥${money(plan?.price)}${unit}${minText}`
}

function planTierByQuantity(plan, quantity) {
  return (plan?.priceTiers || []).find((tier) => Number(tier.quantity) === Number(quantity))
}

function tierLabel(tier) {
  const months = Number(tier.durationMonths || 0)
  if (months >= 12 && months % 12 === 0) return `${months / 12}${text.durationYear}`
  return `${months}${text.durationMonth}`
}

function selectedUnitForPlan(plan) {
  return isYearPlan(plan) ? text.quantityLimitSuffixYear.trim() : text.quantityLimitSuffixMonth.trim()
}

function showOriginalPrice(plan) {
  return plan?.originalPrice && Number(plan.originalPrice) > Number(plan.price)
}

function showPlanOriginalPrice(plan) {
  return Number(planDisplayOriginalAmount(plan) || 0) > Number(planDisplayAmount(plan) || 0)
}

function showOrderOriginalPrice(order) {
  return Number(order?.originalAmount || 0) > Number(order?.payAmount || 0)
}

function isRecommended(plan) {
  return plan?.planCode === 'vip_year'
}

function planBenefits(plan) {
  const benefits = plan?.benefits || []
  if (benefits.length) return benefits.slice(0, 4)
  return [{ benefitTitle: text.defaultPlanDesc, benefitDescription: plan?.description || '' }]
}

function benefitKey(benefit) {
  return benefit.id || `${benefit.benefitTitle}-${benefit.sort}`
}

function formatExpire(status) {
  if (!status?.active) return text.activeAfterOpen
  if (status.expireTime) return `${text.expirePrefix}${status.expireTime}`
  return `${text.remainingPrefix}${status.remainingDays || 0}${text.remainingSuffix}`
}

function orderDurationText(order) {
  const quantityText = order.purchaseQuantity ? `x${order.purchaseQuantity}` : ''
  const months = Number(order.durationMonths || 0)
  const duration = months >= 12 && months % 12 === 0 ? `${months / 12}${text.durationYear}` : `${months}${text.durationMonth}`
  return `${quantityText} ${duration}`.trim()
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
  color: #111827;
}

.member-hero,
.member-section {
  background: #fff;
  border: 1px solid #e6e8ee;
  border-radius: 8px;
}

.member-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  gap: 20px;
  padding: 26px;
  background: linear-gradient(135deg, #fff8e7 0%, #ffffff 44%, #eef7ff 100%);
}

.eyebrow,
.plan-type,
.plan-period,
.panel-label {
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
}

.hero-main h2 {
  margin: 8px 0;
  font-size: 30px;
}

.hero-main p,
.section-head p,
.plan-desc,
.checkout-panel p,
.order-item span,
.pay-info span,
.benefit-item small,
.quantity-block small,
.total-box small {
  margin: 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.status-tile {
  border: 1px solid #e5e7eb;
  background: rgba(255, 255, 255, .82);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.status-tile.active {
  border-color: #f59e0b;
  background: #fffbeb;
}

.status-tile strong {
  font-size: 18px;
}

.status-tile small {
  color: #64748b;
}

.member-section {
  padding: 20px;
}

.section-head,
.plan-topline,
.plan-title-row,
.quantity-block,
.order-item,
.pay-actions,
.admin-title,
.benefit-editor-head,
.admin-actions {
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
  font-size: 18px;
}

.shop-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  gap: 16px;
  align-items: start;
}

.plan-column {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.plan-card {
  min-height: 320px;
  text-align: left;
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 8px;
  padding: 18px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: border-color .18s, box-shadow .18s, transform .18s;
}

.plan-card:hover,
.plan-card.selected {
  border-color: #2563eb;
  box-shadow: 0 12px 26px rgba(37, 99, 235, .12);
  transform: translateY(-1px);
}

.plan-card h4 {
  margin: 0;
  font-size: 18px;
}

.benefit-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.benefit-item {
  border-left: 3px solid #22c55e;
  padding-left: 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.benefit-item span {
  font-size: 13px;
  font-weight: 700;
}

.price-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.price-main {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.price-main span,
.unit-price {
  color: #64748b;
  font-size: 12px;
}

.price-row strong,
.total-box strong {
  color: #dc2626;
  font-size: 26px;
}

.price-row del {
  color: #94a3b8;
}

.checkout-panel {
  position: sticky;
  top: 16px;
  border: 1px solid #e5e7eb;
  background: #f8fafc;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.panel-block strong {
  font-size: 18px;
}

.payment-group {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.payment-card {
  height: 58px;
  border: 1px solid #d7dce5;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 700;
}

.payment-card.selected {
  border-color: #2563eb;
  box-shadow: 0 8px 18px rgba(37, 99, 235, .14);
}

.payment-mark {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.payment-mark.wxpay {
  background: #16a34a;
}

.payment-mark.alipay {
  background: #1677ff;
}

.tier-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.tier-option {
  min-height: 58px;
  border: 1px solid #d7dce5;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
}

.tier-option.selected {
  border-color: #2563eb;
  background: #eff6ff;
}

.tier-option span {
  color: #475569;
  font-size: 12px;
}

.tier-option strong {
  color: #dc2626;
  font-size: 14px;
}

.total-box {
  border: 1px dashed #f59e0b;
  border-radius: 8px;
  background: #fffbeb;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.order-list,
.admin-grid,
.benefit-editor {
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

.admin-section {
  background: #fbfdff;
}

.admin-plan {
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.admin-title strong {
  font-size: 16px;
}

.admin-title-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.admin-title-main {
  display: flex;
  align-items: center;
  gap: 10px;
}

.admin-title-main span {
  border-radius: 999px;
  padding: 3px 8px;
  background: rgba(255, 255, 255, .72);
  color: #475569;
  font-size: 12px;
  font-weight: 700;
}

.admin-plan-code {
  color: #64748b;
  font-size: 12px;
}

.admin-plan-code code {
  border: 1px solid rgba(100, 116, 139, .18);
  border-radius: 6px;
  background: rgba(255, 255, 255, .78);
  padding: 2px 6px;
  color: #0f172a;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
}

.admin-plan.tone-vip-month {
  border-color: #bfdbfe;
  background: linear-gradient(180deg, #eff6ff 0%, #ffffff 120px);
}

.admin-plan.tone-vip-year {
  border-color: #fde68a;
  background: linear-gradient(180deg, #fffbeb 0%, #ffffff 120px);
}

.admin-plan.tone-small-class {
  border-color: #bbf7d0;
  background: linear-gradient(180deg, #f0fdf4 0%, #ffffff 120px);
}

.inline-actions {
  justify-content: flex-start;
}

.pricing-rule-panel {
  border: 1px solid rgba(37, 99, 235, .16);
  background: rgba(248, 250, 252, .78);
  border-radius: 8px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pricing-rule-head,
.price-preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.pricing-rule-head strong,
.price-preview-head span {
  color: #0f172a;
  font-size: 14px;
  font-weight: 800;
}

.pricing-rule-head p,
.price-preview-head small {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 12px;
}

.pricing-rule-fields {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.pricing-rule-fields label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #475569;
  font-size: 12px;
  font-weight: 700;
}

.field-label-with-help {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.help-dot {
  width: 16px;
  height: 16px;
  border: 1px solid #cbd5e1;
  border-radius: 50%;
  background: rgba(255, 255, 255, .9);
  color: #64748b;
  cursor: help;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
  padding: 0;
}

.help-dot:hover,
.help-dot:focus-visible {
  border-color: #2563eb;
  color: #2563eb;
  outline: none;
}

.price-preview-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.price-preview-item {
  min-height: 72px;
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.price-preview-item span,
.price-preview-item small {
  color: #64748b;
  font-size: 12px;
}

.price-preview-item strong {
  color: #dc2626;
  font-size: 18px;
}


.admin-fields {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.admin-fields label,
.wide-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #475569;
  font-size: 12px;
  font-weight: 700;
}

.benefit-row {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr) 88px 44px 58px;
  gap: 8px;
  align-items: center;
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

@media (max-width: 1180px) {
  .shop-layout,
  .member-hero {
    grid-template-columns: 1fr;
  }

  .checkout-panel {
    position: static;
  }
}

@media (max-width: 960px) {
  .plan-column,
  .admin-fields,
  .pricing-rule-fields,
  .price-preview-grid {
    grid-template-columns: 1fr;
  }

  .order-item,
  .benefit-row {
    align-items: stretch;
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .member-hero,
  .member-section {
    padding: 16px;
  }

  .status-grid,
  .payment-group {
    grid-template-columns: 1fr;
  }

  .section-head,
  .quantity-block,
  .order-item {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>