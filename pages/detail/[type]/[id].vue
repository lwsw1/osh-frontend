<template>
    <LoadingGroup :pending="pending" :error="error">
        <template v-if="data">

        <section class="py-4" v-if="data.isbuy && ((data.type != 'media' && type=='course') || type == 'live')">
            <ClientOnly>
                <template #fallback>
                    <LoadingSkeleton/>
                </template>
                <PlayerAudio v-if="data.type == 'audio'" :title="data.title" :url="data.content" :cover="data.cover"/>
                <!-- 引入视频播放器 -->
                <PlayerVideo v-else-if="data.type == 'video'" :url="data.content" />
                <!-- 引入直播播放器 -->
                <PlayerLive v-else-if="type == 'live'" :url="data.playUrl"/>
            </ClientOnly>
        </section>

        <section v-else class="detail-top">
            <div class="book-cover-container" v-if="type == 'book'">
                <img :src="data.cover" class="book-cover-large" />
                <div class="book-badge" v-if="data.price == 0">免费</div>
            </div>
            <n-image v-else :src="data.cover" object-fit="cover" class="image"/>
            
            <div class="info">
                <div class="flex flex-col items-start">
                    <div class="book-header">
                        <h1 class="book-title">{{ data.title }}</h1>
                        <FavaBtn :isfava="data.isfava" :goods_id="data.id" :type="type"/>
                    </div>
                    <div class="book-meta">
                        <span class="meta-item">
                            <n-icon size="16"><PeopleOutline /></n-icon>
                            {{ data.sub_count || 0 }}人学过
                        </span>
                        <span class="meta-divider">|</span>
                        <span class="meta-item" v-if="type === 'course'">
                            【{{ o[data.type] }}】
                        </span>
                    </div>

                    <template v-if="!data.isbuy">
                        <DetailActiveBar :data="data" v-if="data.group || data.flashsale"/>

                        <template v-else>
                            <div class="price-section">
                                <Price :value="data.price" class="current-price"/>
                                <Price :value="data.t_price" through class="original-price"/>
                            </div>

                            <!-- 领取优惠券 -->
                            <CouponModal v-if="type != 'live'"/>
                            <LiveStatusBar v-else :start="data.start_time" :end="data.end_time"/>
                        </template>
                    </template>

                </div>

                <div class="action-buttons">
                    <template v-if="type == 'book'">
                        <template v-if="menus.length > 0">
                            <n-button type="primary" size="large" :loading="loading" @click="buy" class="primary-btn">
                                <template #icon><n-icon><BookOutline /></n-icon></template>
                                {{ bookActionLabel }}
                            </n-button>
                            <n-button v-if="freeId" size="large" strong secondary type="primary" @click="learn({ id:freeId })" class="secondary-btn">
                                <template #icon><n-icon><EyeOutline /></n-icon></template>
                                免费试看
                            </n-button>
                        </template>
                        <n-button v-else type="primary" size="large" disabled>敬请期待</n-button>
                    </template>

                    <n-button v-else type="primary" size="large" :loading="loading" @click="buy" class="primary-btn">
                        {{ btn }}
                    </n-button>
                    
                    <!-- 编辑删除按钮 - 仅电子书显示，使用 ClientOnly 避免 SSR 问题 -->
                    <ClientOnly>
                        <template v-if="type == 'book'">
                            <n-button v-if="canEditBook" size="large" secondary @click="handleEdit" class="edit-btn">
                                <template #icon>
                                    <n-icon><CreateOutline /></n-icon>
                                </template>
                                编辑电子书
                            </n-button>
                            <n-button v-if="canDeleteBook" size="large" tertiary type="error" @click="handleDelete" class="edit-btn">
                                删除电子书
                            </n-button>
                        </template>
                    </ClientOnly>
                </div>
            </div>
        </section>

        <n-grid :x-gap="20">
            <n-grid-item :span="18">
                <DetailGroupworks v-if="!data.isbuy && data.group" :group_id="data.group.id"/>

                <section class="detail-bottom">
                    <UiTab class="border-b">
                        <UiTabItem :active="tab == item.value" v-for="(item,index) in tabs" :key="index" @click="changeTab(item.value)">{{ item.label }}</UiTabItem>
                    </UiTab>
                    <div v-if="tab == 'content'" class="content" v-html="detailContent"></div>

                    <DetailMenu v-else>
                        <DetailMenuItem v-for="(item,index) in menus"
                        :key="index" :item="item" :index="index" @click="learn(item)"/>

                        <Empty v-if="menus.length == 0" desc="暂无目录"/>
                    </DetailMenu>

                </section>
                <BookQuestionPanel v-if="type == 'book' && data?.id" :book-id="data.id" class="book-qna-block" />
            </n-grid-item>
            <n-grid-item :span="6">
                <HotCourseList/>
            </n-grid-item>
        </n-grid>
        </template>
    </LoadingGroup>

    <!-- 电子书支付弹窗 -->
    <NModal v-model:show="showPayModal" :mask-closable="false" preset="card" title="购买电子书" class="book-pay-modal" @close="handleClosePayModal">
        <div class="book-pay-content">
            <section class="book-pay-summary">
                <div class="book-pay-cover-wrap">
                    <img :src="data?.cover" class="book-pay-cover" />
                </div>
                <div class="book-pay-info">
                    <p class="book-pay-label">订单商品</p>
                    <h3>{{ data?.title }}</h3>
                    <p class="book-pay-tip">请在{{ bookPayCountdownText }}内完成支付，超时订单将自动关闭。若支付过程中取消支付，请关闭弹窗并重新发起购买。</p>
                </div>
                <div class="book-pay-amount">
                    <span>实付金额</span>
                    <strong>¥{{ bookPayFinalAmountText }}</strong>
                </div>
            </section>

            <section class="book-pay-section">
                <div class="book-pay-section-head">
                    <h4>积分抵扣</h4>
                    <span>可用 {{ userPoints }} 积分</span>
                </div>
                <div class="book-pay-points-row">
                    <NCheckbox
                        v-model:checked="useBookPoints"
                        :disabled="isPayChannelLocked || payLoading || userPoints <= 0"
                    >
                        使用积分抵扣
                    </NCheckbox>
                    <strong>-¥{{ bookPayDeductAmountText }}</strong>
                </div>
                <div class="book-pay-points-meta">
                    <span>预计使用 {{ bookPayPointsUsed }} 积分</span>
                    <span>原价 ¥{{ bookPayOriginalAmountText }}</span>
                </div>
            </section>

            <section class="book-pay-section">
                <div class="book-pay-section-head">
                    <h4>支付方式</h4>
                    <span v-if="isPayChannelLocked">当前 {{ selectedChannelLabel }}</span>
                </div>
                <NRadioGroup
                    :value="payChannel"
                    class="book-pay-methods"
                    :disabled="payLoading"
                    @update:value="handlePayChannelChange"
                >
                    <NRadio
                        v-for="channel in channelOptions"
                        :key="channel.value"
                        :value="channel.value"
                        class="book-pay-method"
                        :class="{ active: payChannel === channel.value, locked: isPayChannelLocked && payChannel !== channel.value }"
                    >
                        <span class="book-pay-method-name">{{ channel.label }}</span>
                        <small>{{ channel.desc }}</small>
                    </NRadio>
                </NRadioGroup>
                <p class="book-pay-lock-tip">支付二维码生成后切换方式，将取消当前支付并重新生成。</p>
            </section>

            <section class="book-pay-qrcode-panel">
                <template v-if="payQrcode">
                    <div class="book-pay-qrcode">
                        <QrCode :data="payQrcode" />
                    </div>
                    <p class="book-pay-scan-title">请使用{{ selectedChannelLabel }}扫码支付</p>
                    <p class="book-pay-scan-tip">正在等待支付结果，剩余 {{ bookPayCountdownText }}</p>
                </template>

                <template v-else>
                    <NButton type="primary" size="large" :loading="payLoading" class="book-pay-confirm" @click="confirmBookPay">
                        确认支付
                    </NButton>
                </template>
            </section>
        </div>
    </NModal>
</template>
<script setup>
    import {
        NImage,
        NButton,
        NGrid,
        NGridItem,
        NIcon,
        NModal,
        NCheckbox,
        NRadio,
        NRadioGroup,
        createDiscreteApi,
    } from "naive-ui"
    import { CreateOutline, PeopleOutline, BookOutline, EyeOutline } from '@vicons/ionicons5'
    import { fetchConfig } from '~/composables/useHttp'
    import { usePermission } from '~/composables/usePermission'
    
    const route = useRoute()
    const { id,type } = route.params
    const user = useUser()
    
    // 使用权限系统，和课程模块保持一致
    const { hasPermission } = usePermission()
    
    // 电子书管理权限判断：需要 book:update 和 book:delete 权限
    const canEditBook = computed(() => hasPermission('book:update'))
    const canDeleteBook = computed(() => hasPermission('book:delete'))

    useInitHead()

    const {
        tabs,
        tab,
        changeTab
    } = useInitDetailTabs(type)

    // 获取请求参数
    const query = useRequestQuery()

    const {
        data,
        error,
        pending,
        refresh
    } = await usegetByIdDetailApi(type,query)

    const title = computed(()=> !pending.value ? data.value?.title : "详情页")

    useHead({ title })
    
    const o = {
        media:"图文",
        video:"视频",
        audio:"音频"
    }

    const subTitle = computed(()=>{
        let pre = ""
        if(type === "course" && data.value){
            pre = `【${o[data.value.type]}】`
        }
        return `${pre}${data.value?.sub_count || 0}人学过`
    })

    const btn = computed(()=>{
        if(data.value?.group){
            return "立即拼团"
        } else if(data.value?.flashsale){
            return "立即秒杀"
        }
        return "立即学习"
    })

    const bookActionLabel = computed(() => {
        console.log('bookActionLabel', data.value.isbuy)
        if (type === 'book' && data.value && !data.value.isbuy && Number(data.value.price) > 0) {
            return '立即购买'
        }
        return '立即学习'
    })

    const detailContent = computed(() => {
        if (!data.value) return ''
        if (type === 'book') {
            return data.value.try || data.value.desc || '<p>暂无内容介绍</p>'
        }
        return (data.value.type == 'media' && data.value.isbuy) ? data.value.content : data.value.try
    })

    // 购买学习
    const loading = ref(false)
    const buy = ()=>{
        useHasAuth(async ()=>{
            // 免费学习
            if(data.value.price == 0){
                loading.value = true
                let {
                    error:learnError
                } = await useLearnApi({
                    goods_id:data.value.id,
                    type
                })

                loading.value = false

                // 请求成功，刷新数据
                if(!learnError.value) refresh()

                return
            }

            // 发起拼团
            if(data.value.group){
                loading.value = true
                useCreateOrderApi({
                    group_id:data.value.group.id
                },"group")
                .then(res=>{
                    if(!res.error.value){
                        navigateTo(`/pay?no=${res.data.value.no}`)
                    }
                })
                .finally(()=>{
                    loading.value = false
                })
                return
            }

            // 电子书走统一支付弹窗
            if(type == "book"){
                showPayModal.value = true
                return
            }

            // 付费学习（课程/专栏/直播走原有逻辑）
            let ty = "course"
            let id = data.value.id
            if(type == "live"){
                ty = "live"
            } else if(type == "column"){
                ty = "column"
            }

            if(data.value.flashsale){
                ty = "flashsale"
                id = data.value.flashsale.id
            }

            navigateTo(`/createorder?id=${id}&type=${ty}`)

        })
    }

    // 菜单
    const menus = computed(()=> {
        if (!data.value) return []
        return (type == 'book' ? data.value.book_details : data.value.column_courses ) || []
    })

    // 点击菜单
    const learn = (item)=>{
        useHasAuth(()=>{
            const { message } = createDiscreteApi(["message"])

            // 专栏
            if(type == "column" && item.price != 0 && !data.value.isbuy){
                return message.error("请先购买该专栏")
            }


            // 跳转
            let url = ""
            if(type == "column"){
                url = `/detail/course/${item.id}?column_id=${data.value.id}`
            } else if(type == 'book'){
                url = `/book/${data.value.id}/${item.id}`
            }
            navigateTo(url)
        })
    }

    // 电子书第一个免费章节ID
    const freeId = computed(()=>{
        let fid = 0
        if(type == 'book' && data.value){
            let item = (data.value.book_details || []).find(o => Number(o.isFree ?? o.isfree) === 1)
            if(item){
                fid = item.id
            }
        }
        return fid
    })

    // 编辑电子书
    const handleEdit = () => {
        navigateTo(`/book/edit/${id}`)
    }

    const getAuthHeaders = () => {
        let tokenValue = ''
        if (process.client) {
            tokenValue = localStorage.getItem('token') || localStorage.getItem('Token') || ''
            if (!tokenValue) {
                tokenValue = useCookie('token').value || ''
            }
        }
        return {
            appid: fetchConfig.headers.appid,
            token: tokenValue,
            Authorization: tokenValue ? `Bearer ${tokenValue}` : ''
        }
    }

    const handleDelete = async () => {
        const { dialog, message } = createDiscreteApi(['dialog', 'message'])
        dialog.warning({
            title: '删除确认',
            content: '确定删除该电子书吗？此操作不可恢复。',
            positiveText: '删除',
            negativeText: '取消',
            onPositiveClick: async () => {
                try {
                    const res = await $fetch(`/book/delete?id=${id}`, {
                        method: 'DELETE',
                        baseURL: fetchConfig.baseURL,
                        headers: getAuthHeaders()
                    })
                    if (res.code === 200) {
                        message.success('删除成功')
                        navigateTo('/list/book/1')
                    } else {
                        message.error(res.msg || '删除失败')
                    }
                } catch (err) {
                    message.error(err.message || '删除失败')
                }
            }
        })
    }

    // 获取query
    function useRequestQuery(){
        const {
            column_id,
            flashsale_id,
            group_id
        } = route.query

        let query = {
            id
        }
        if(column_id){
            query.column_id = column_id
        }

        if(flashsale_id){
            query.flashsale_id = flashsale_id
        } else if(group_id){
            query.group_id = group_id
        }

        return query
    }

    // 初始化tab
    function useInitDetailTabs(t){
        const tabs = computed(()=>{
            let ts = [{
                label:"详情",
                value:"content"
            }]

            if(t == "column" || t == "book"){
                ts.push({
                    label:"目录",
                    value:"menu"
                })
            }

            return ts
        })

        const tab = ref("content")

        const changeTab = (e)=> tab.value = e

        return {
            tabs,
            tab,
            changeTab
        }
    }

    // 初始化head
    function useInitHead(){
        if(type === "course"){
            useHead({
                link:[{
                    rel:"stylesheet",
                    href:"/aplayer/APlayer.min.css"
                }],
                script:[{
                    src:"/aplayer/APlayer.min.js",
                },{
                    src:"//unpkg.byted-static.com/xgplayer/2.31.2/browser/index.js"
                }]
            })
        }

        if(type === "live"){
            useHead({
                script:[{
                    src:"//unpkg.byted-static.com/xgplayer/2.31.2/browser/index.js",
                },{
                    src:"//unpkg.byted-static.com/xgplayer-flv/2.5.1/dist/index.min.js"
                }]
            })
        }
    }

    // ===== 电子书支付弹窗 =====
    const showPayModal = ref(false)
    const payChannel = ref('wxpay')
    const payQrcode = ref('')
    const payOrderNo = ref('')
    const payPaymentNo = ref('')
    const payPointsUsed = ref(0)
    const payDeductAmount = ref(0)
    const payCashAmount = ref(null)
    const useBookPoints = ref(false)
    const payLoading = ref(false)
    const BOOK_PAY_POLLING_INTERVAL = 2000
    const BOOK_PAY_ORDER_EXPIRE_SECONDS = 30 * 60
    const bookPayRemainingSeconds = ref(BOOK_PAY_ORDER_EXPIRE_SECONDS)
    let payPollingTimer = null
    let payCountdownTimer = null
    const isPayChannelLocked = computed(() => Boolean(payQrcode.value || payPaymentNo.value))
    const bookPayCountdownText = computed(() => {
        const minutes = String(Math.floor(bookPayRemainingSeconds.value / 60)).padStart(2, '0')
        const seconds = String(bookPayRemainingSeconds.value % 60).padStart(2, '0')
        return `${minutes}:${seconds}`
    })

    const channelOptions = [
        { label: '微信支付', value: 'wxpay', desc: '微信扫码' },
        { label: '支付宝', value: 'alipay', desc: '支付宝扫码' },
    ]
    const selectedChannelLabel = computed(() => {
        return channelOptions.find(item => item.value === payChannel.value)?.label || '当前方式'
    })
    const bookPayOriginalAmount = computed(() => Number(data.value?.price || 0))
    const userPoints = computed(() => Number(user.value?.asset?.points || 0))
    const maxUsablePoints = computed(() => Math.floor(bookPayOriginalAmount.value * 10))
    const estimatedBookPayPointsUsed = computed(() => {
        if (!useBookPoints.value) {
            return 0
        }
        return Math.max(0, Math.min(userPoints.value, maxUsablePoints.value))
    })
    const bookPayPointsUsed = computed(() => isPayChannelLocked.value ? payPointsUsed.value : estimatedBookPayPointsUsed.value)
    const bookPayDeductAmount = computed(() => {
        if (isPayChannelLocked.value) {
            return payDeductAmount.value
        }
        return Number((estimatedBookPayPointsUsed.value / 10).toFixed(2))
    })
    const bookPayFinalAmount = computed(() => {
        if (isPayChannelLocked.value && payCashAmount.value !== null) {
            return payCashAmount.value
        }
        return Math.max(0, Number((bookPayOriginalAmount.value - bookPayDeductAmount.value).toFixed(2)))
    })
    const bookPayOriginalAmountText = computed(() => bookPayOriginalAmount.value.toFixed(2))
    const bookPayDeductAmountText = computed(() => bookPayDeductAmount.value.toFixed(2))
    const bookPayFinalAmountText = computed(() => bookPayFinalAmount.value.toFixed(2))

    function handlePayChannelChange(nextChannel) {
        if (nextChannel === payChannel.value || payLoading.value) {
            return
        }

        if (!isPayChannelLocked.value) {
            payChannel.value = nextChannel
            return
        }

        const nextChannelLabel = channelOptions.find(item => item.value === nextChannel)?.label || '新的支付方式'
        const { dialog } = createDiscreteApi(['dialog'])
        dialog.warning({
            title: '切换支付方式',
            content: `当前支付已生成，切换为${nextChannelLabel}后将取消当前支付并重新创建支付单。是否继续？`,
            positiveText: '继续切换',
            negativeText: '取消',
            onPositiveClick: async () => {
                await cancelCurrentBookPayment()
                payChannel.value = nextChannel
                await confirmBookPay()
            }
        })
    }

    async function confirmBookPay() {
        payLoading.value = true
        try {
            const res = await $fetch('/book/relation/purchase', {
                method: 'POST',
                baseURL: fetchConfig.baseURL,
                headers: getAuthHeaders(),
                body: { bookId: Number(id), channel: payChannel.value, usePoints: useBookPoints.value }
            })
            if (res.code !== 200) {
                createDiscreteApi(['message']).message.error(res.msg || '创建订单失败')
                return
            }
            const result = res.data
            payPointsUsed.value = Number(result.pointsUsed || 0)
            payDeductAmount.value = Number(result.pointsDeductAmount || 0)
            payCashAmount.value = Number(result.price || 0)
            updateLocalUserPoints(result.remainingPoints)
            // 免费书直接刷新
            if (!result.needPay) {
                showPayModal.value = false
                createDiscreteApi(['message']).message.success('获取成功！')
                refresh()
                return
            }
            payQrcode.value = result.payment?.qrcode || result.payment?.payUrl || ''
            payOrderNo.value = result.orderNo
            payPaymentNo.value = result.paymentNo
            startBookPayPolling(result.orderNo)
            startBookPayCountdown(result.paymentNo)
        } catch(e) {
            createDiscreteApi(['message']).message.error(e.data?.msg || '网络错误')
        } finally {
            payLoading.value = false
        }
    }

    async function cancelCurrentBookPayment() {
        stopBookPayPolling()
        stopBookPayCountdown()
        const orderNo = payOrderNo.value
        payQrcode.value = ''
        payOrderNo.value = ''
        payPaymentNo.value = ''
        bookPayRemainingSeconds.value = BOOK_PAY_ORDER_EXPIRE_SECONDS
        const pointsToRefund = payPointsUsed.value
        payPointsUsed.value = 0
        payDeductAmount.value = 0
        payCashAmount.value = null

        if (!orderNo) {
            return
        }

        try {
            await useCancelPayApi(orderNo)
            if (pointsToRefund > 0) {
                updateLocalUserPoints(userPoints.value + pointsToRefund)
            }
        } catch (e) {
            // 取消失败不阻断用户重新选择支付方式，后端幂等处理最终状态
        }
    }

    function startBookPayPolling(orderNo) {
        stopBookPayPolling()
        payPollingTimer = setInterval(async () => {
            try {
                const { data: statusResult } = await usePayStatusApi(orderNo)
                if (payOrderNo.value !== orderNo) {
                    return
                }
                if (statusResult.value?.payStatus) {
                    stopBookPayPolling()
                    stopBookPayCountdown()
                    payQrcode.value = ''
                    payOrderNo.value = ''
                    payPaymentNo.value = ''
                    payPointsUsed.value = 0
                    payDeductAmount.value = 0
                    payCashAmount.value = null
                    bookPayRemainingSeconds.value = BOOK_PAY_ORDER_EXPIRE_SECONDS
                    showPayModal.value = false
                    createDiscreteApi(['message']).message.success('支付成功！')
                    refresh()
                }
            } catch(e) { /* 轮询失败静默忽略 */ }
        }, BOOK_PAY_POLLING_INTERVAL)
    }

    function startBookPayCountdown(paymentNo) {
        stopBookPayCountdown()
        bookPayRemainingSeconds.value = BOOK_PAY_ORDER_EXPIRE_SECONDS
        payCountdownTimer = setInterval(async () => {
            if (payPaymentNo.value !== paymentNo) {
                stopBookPayCountdown()
                return
            }
            bookPayRemainingSeconds.value = Math.max(bookPayRemainingSeconds.value - 1, 0)
            if (bookPayRemainingSeconds.value === 0) {
                await handleBookPayOrderExpired(paymentNo)
            }
        }, 1000)
    }

    async function handleBookPayOrderExpired(paymentNo) {
        if (payPaymentNo.value !== paymentNo) {
            return
        }

        await cancelCurrentBookPayment()
        showPayModal.value = false
        createDiscreteApi(['message']).message.warning('订单已超时关闭，请重新发起购买。')
    }

    function stopBookPayPolling() {
        if (payPollingTimer) {
            clearInterval(payPollingTimer)
            payPollingTimer = null
        }
    }

    function stopBookPayCountdown() {
        if (payCountdownTimer) {
            clearInterval(payCountdownTimer)
            payCountdownTimer = null
        }
    }

    async function handleClosePayModal() {
        await cancelCurrentBookPayment()
        showPayModal.value = false
    }

    function updateLocalUserPoints(points) {
        if (points === null || points === undefined || Number.isNaN(Number(points))) {
            return
        }
        const nextPoints = String(Math.max(0, Number(points)))
        user.value = {
            ...(user.value || {}),
            asset: {
                ...(user.value?.asset || {}),
                points: nextPoints
            }
        }
        if (process.client) {
            try {
                localStorage.setItem('__user_asset__', JSON.stringify(user.value.asset))
            } catch {}
        }
    }

    onUnmounted(() => {
        stopBookPayPolling()
        stopBookPayCountdown()
    })

</script>
<style>
    .flex {
      display: flex;
    }
    
    .items-center {
      align-items: center;
    }
    
    .items-start {
      align-items: flex-start;
    }
    
    .flex-col {
      flex-direction: column;
    }
    
    .mr-2 {
      margin-right: 0.5rem;
    }
    
    .ml-1 {
      margin-left: 0.25rem;
    }
    
    .ml-2 {
      margin-left: 0.5rem;
    }
    
    .my-2 {
      margin-top: 0.5rem;
      margin-bottom: 0.5rem;
    }
    
    .mt-2 {
      margin-top: 0.5rem;
    }
    
    .mt-auto {
      margin-top: auto;
    }
    
    .text-xl {
      font-size: 1.25rem;
      line-height: 1.75rem;
    }
    
    .text-xs {
      font-size: 0.75rem;
      line-height: 1rem;
    }
    
    .text-gray-400 {
      color: #9ca3af;
    }
    
    .border-b {
      border-bottom-width: 1px;
    }
    
    .rounded {
      border-radius: 0.25rem;
    }
    
    .bg-white {
      background-color: #fff;
    }
    
    .py-4 {
      padding-top: 1rem;
      padding-bottom: 1rem;
    }
    
    .py-2 {
      padding-top: 0.5rem;
      padding-bottom: 0.5rem;
    }
    
    .px-5 {
      padding-left: 1.25rem;
      padding-right: 1.25rem;
    }
    
    .pb-5 {
      padding-bottom: 1.25rem;
    }
    
    .object-fit {
      object-fit: cover;
    }
    
    .detail-top {
        display: flex;
        padding: 2rem;
        border-radius: 12px;
        background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
        margin-bottom: 1.5rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        gap: 2rem;
    }
    
    .book-cover-container {
        position: relative;
        flex-shrink: 0;
    }
    
    .book-cover-large {
        width: 200px;
        height: 280px;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        transition: transform 0.3s ease;
        object-fit: cover;
        display: block;
    }
    
    .book-cover-large:hover {
        transform: translateY(-4px);
    }
    
    .book-badge {
        position: absolute;
        top: 12px;
        right: 12px;
        background: linear-gradient(135deg, #18a058 0%, #0e7a3e 100%);
        color: white;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        box-shadow: 0 2px 8px rgba(24,160,88,0.3);
    }
    
    .detail-top .image {
        width: 340px;
        height: 200px;
        border-radius: 12px;
        flex-shrink: 0;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .detail-top .info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }
    
    .book-header {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    
    .book-title {
        font-size: 28px;
        font-weight: 700;
        color: #1a1a1a;
        margin: 0;
        line-height: 1.3;
    }
    
    .book-meta {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: #666;
        font-size: 14px;
        margin-top: 0.5rem;
    }
    
    .meta-item {
        display: flex;
        align-items: center;
        gap: 4px;
    }
    
    .meta-divider {
        color: #ddd;
    }
    
    .price-section {
        display: flex;
        align-items: baseline;
        gap: 0.75rem;
        margin-top: 1rem;
    }
    
    .current-price {
        font-size: 32px;
        font-weight: 700;
        color: #d03050;
    }
    
    .original-price {
        font-size: 16px;
        color: #999;
    }
    
    .action-buttons {
        display: flex;
        gap: 1rem;
        margin-top: auto;
        flex-wrap: wrap;
    }
    
    .primary-btn {
        min-width: 140px;
    }
    
    .secondary-btn {
        min-width: 120px;
    }
    
    .edit-btn {
      min-width: 120px;
    }

    .book-qna-block {
      margin-top: 24px;
    }

    .detail-bottom {
        background-color: #fff;
        border-radius: 12px;
        margin-bottom: 1.5rem;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        overflow: hidden;
    }

    .detail-bottom .content {
        padding: 2rem;
        line-height: 1.8;
        font-size: 16px;
        color: #333;
    }
    
    .detail-bottom .content img {
        max-width: 100% !important;
        border-radius: 8px;
        margin: 1rem 0;
    }
    
    .detail-bottom .content h2 {
        font-size: 24px;
        font-weight: 600;
        margin: 1.5rem 0 1rem;
        color: #1a1a1a;
    }
    
    .detail-bottom .content h3 {
        font-size: 20px;
        font-weight: 600;
        margin: 1.25rem 0 0.75rem;
        color: #333;
    }
    
    .detail-bottom .content p {
        margin: 0.75rem 0;
    }
    
    .detail-bottom .content ul, 
    .detail-bottom .content ol {
        padding-left: 1.5rem;
        margin: 0.75rem 0;
    }
    
    .detail-bottom .content li {
        margin: 0.5rem 0;
    }
    
    .detail-bottom .content code {
        background: #f5f7fa;
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'Courier New', monospace;
        font-size: 14px;
        color: #d03050;
    }
    
    .detail-bottom .content pre {
        background: #f5f7fa;
        padding: 1rem;
        border-radius: 8px;
        overflow-x: auto;
        margin: 1rem 0;
    }
    
    .detail-bottom .content pre code {
        background: none;
        padding: 0;
        color: #333;
    }

    .book-pay-modal {
        width: min(640px, calc(100vw - 32px));
    }

    .book-pay-modal .n-card-header {
        padding: 22px 28px 14px;
        border-bottom: 1px solid #eef1f4;
    }

    .book-pay-modal .n-card__content {
        padding: 0;
    }

    .book-pay-content {
        background: #f7f9fb;
    }

    .book-pay-summary {
        display: grid;
        grid-template-columns: 76px 1fr auto;
        gap: 16px;
        align-items: center;
        padding: 22px 28px;
        background: #fff;
    }

    .book-pay-cover-wrap {
        width: 76px;
        height: 96px;
        border-radius: 8px;
        overflow: hidden;
        background: #eef2f6;
        box-shadow: 0 6px 16px rgba(20, 32, 46, 0.1);
    }

    .book-pay-cover {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: cover;
    }

    .book-pay-info h3 {
        margin: 4px 0 10px;
        color: #1f2937;
        font-size: 18px;
        line-height: 1.35;
        font-weight: 650;
    }

    .book-pay-label,
    .book-pay-tip,
    .book-pay-amount span,
    .book-pay-lock-tip,
    .book-pay-scan-tip {
        margin: 0;
        color: #7a8594;
        font-size: 13px;
    }

    .book-pay-amount {
        min-width: 120px;
        text-align: right;
    }

    .book-pay-amount strong {
        display: block;
        margin-top: 6px;
        color: #d03050;
        font-size: 26px;
        line-height: 1;
        font-weight: 700;
    }

    .book-pay-section {
        margin: 12px 16px 0;
        padding: 18px 12px;
        background: #fff;
        border: 1px solid #edf0f4;
        border-radius: 8px;
    }

    .book-pay-section-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
        padding: 0 4px;
    }

    .book-pay-section-head h4 {
        margin: 0;
        color: #1f2937;
        font-size: 15px;
        font-weight: 650;
    }

    .book-pay-section-head span {
        color: #18a058;
        font-size: 12px;
    }

    .book-pay-methods {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
    }

    .book-pay-method {
        margin-right: 0;
        padding: 12px 14px;
        border: 1px solid #dfe5ec;
        border-radius: 8px;
        background: #fff;
        transition: border-color .2s, background-color .2s, box-shadow .2s, opacity .2s;
    }

    .book-pay-method.active {
        border-color: #18a058;
        background: #f3fbf6;
        box-shadow: 0 0 0 2px rgba(24, 160, 88, 0.1);
    }

    .book-pay-method.locked {
        opacity: .46;
    }

    .book-pay-method-name {
        display: block;
        color: #1f2937;
        font-size: 14px;
        font-weight: 600;
    }

    .book-pay-method small {
        display: block;
        margin-top: 4px;
        color: #8a94a3;
        font-size: 12px;
    }

    .book-pay-lock-tip {
        margin-top: 12px;
        padding: 0 4px;
    }

    .book-pay-points-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 0 4px;
    }

    .book-pay-points-row strong {
        color: #d03050;
        font-size: 16px;
        font-weight: 700;
        white-space: nowrap;
    }

    .book-pay-points-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-top: 10px;
        padding: 0 4px;
        color: #7a8594;
        font-size: 12px;
    }

    .book-pay-qrcode-panel {
        min-height: 174px;
        padding: 22px 28px 28px;
        text-align: center;
    }

    .book-pay-qrcode {
        display: inline-flex;
        padding: 12px;
        border-radius: 8px;
        background: #fff;
        border: 1px solid #e8edf2;
        box-shadow: 0 8px 22px rgba(20, 32, 46, 0.08);
    }

    .book-pay-scan-title {
        margin: 14px 0 4px;
        color: #1f2937;
        font-size: 15px;
        font-weight: 600;
    }

    .book-pay-confirm {
        width: 240px;
        height: 42px;
        margin-top: 36px;
        border-radius: 6px;
    }

    @media (max-width: 640px) {
        .book-pay-summary {
            grid-template-columns: 64px 1fr;
        }

        .book-pay-cover-wrap {
            width: 64px;
            height: 84px;
        }

        .book-pay-amount {
            grid-column: 1 / -1;
            text-align: left;
        }

        .book-pay-methods {
            grid-template-columns: 1fr;
        }

        .book-pay-points-meta {
            align-items: flex-start;
            flex-direction: column;
            gap: 4px;
        }

        .book-pay-confirm {
            width: 100%;
        }
    }
</style>
