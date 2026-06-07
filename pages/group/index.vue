<template>
    <div class="group-activity-list">
        <!-- 面包屑 -->
        <div class="breadcrumb">
          <span class="bc-item" @click="$router.push('/')">🏠 首页</span>
          <span class="bc-sep">›</span>
          <span class="bc-current">👥 拼团活动</span>
        </div>
        <n-card class="filter-card">
            <div class="filter-bar">
                <div class="flex items-center gap-4">
                    <span class="filter-label">状态筛选：</span>
                    <n-radio-group v-model:value="filterStatus" @update:value="handleFilterChange">
                        <n-radio-button :value="null">全部</n-radio-button>
                        <n-radio-button :value="1">进行中</n-radio-button>
                        <n-radio-button :value="2">已成功</n-radio-button>
                        <n-radio-button :value="3">已结束</n-radio-button>
                    </n-radio-group>
                    
                    <span class="filter-label">类型筛选：</span>
                    <n-select 
                        v-model:value="filterType" 
                        :options="typeOptions"
                        placeholder="全部类型"
                        clearable
                        style="width: 150px"
                        @update:value="handleFilterChange"
                    />
                </div>
                <!-- 右上角：操作按钮组 -->
                <div class="flex gap-2">
                    <!-- 我的拼团按钮 -->
                    <n-button type="info" @click="goToMyGroup">
                        <template #icon><n-icon :component="ListOutline" /></template>
                        我的拼团
                    </n-button>
                    <!-- 发起拼团按钮 - 所有登录用户可见 -->
                    <n-button 
                        type="primary" 
                        @click="openCreateModal"
                    >
                        <template #icon><n-icon :component="AddOutline" /></template>
                        发起拼团
                    </n-button>
                </div>
            </div>
        </n-card>

        <!-- 发起拼团弹窗 -->
        <n-modal
            v-model:show="showCreateModal"
            preset="card"
            title="发起服务器拼团"
            :style="{ width: '480px' }"
            :mask-closable="false"
            @after-leave="resetCreateForm"
        >
            <div class="create-form">
                <!-- 选择拼团活动 -->
                <div class="form-item">
                    <label class="form-label">选择拼团活动 <span class="required">*</span></label>
                    <n-select
                        v-model:value="createForm.activityId"
                        :options="activityOptions"
                        placeholder="请选择要发起的服务器拼团活动"
                    />
                </div>

                <!-- 人数设置 -->
                <div class="form-row">
                    <div class="form-item">
                        <label class="form-label">最低拼团人数 <span class="required">*</span></label>
                        <n-input-number
                            v-model:value="createForm.minNum"
                            :min="2"
                            :max="createForm.maxNum || 99"
                            placeholder="最少 2 人"
                            :precision="0"
                            style="width: 100%"
                        />
                    </div>
                    <div class="form-item">
                        <label class="form-label">最多拼团人数 <span class="required">*</span></label>
                        <n-input-number
                            v-model:value="createForm.maxNum"
                            :min="createForm.minNum || 2"
                            :max="999"
                            placeholder="不超过 999 人"
                            :precision="0"
                            style="width: 100%"
                        />
                    </div>
                </div>

                <!-- 支付费用 -->
                <div class="form-item">
                    <label class="form-label">设置支付费用 <span class="required">*</span></label>
                    <n-input-number
                        v-model:value="createForm.price"
                        :min="0.01"
                        :precision="2"
                        placeholder="请输入每人支付金额"
                        style="width: 100%"
                    >
                        <template #prefix>¥</template>
                    </n-input-number>
                </div>

                <!-- 服务器使用时间 -->
                <div class="form-item">
                    <label class="form-label">服务器使用时间 <span class="required">*</span></label>
                    <n-input-number
                        v-model:value="createForm.duration"
                        :min="1"
                        :max="120"
                        :precision="0"
                        placeholder="请输入使用月数"
                        style="width: 100%"
                    >
                        <template #suffix>个月</template>
                    </n-input-number>
                </div>

                <!-- 提示 -->
                <n-alert type="info" :show-icon="false" class="create-notice">
                    发起拼团后您将成为团长，邀请其他用户参团，达到最低人数即成团。
                </n-alert>
            </div>

            <template #footer>
                <div class="modal-footer">
                    <n-button @click="showCreateModal = false">取消</n-button>
                    <n-button
                        type="primary"
                        :loading="createLoading"
                        :disabled="!createForm.activityId"
                        @click="handleCreate"
                    >
                        确认发起
                    </n-button>
                </div>
            </template>
        </n-modal>

        <LoadingGroup :pending="pending" :error="error">
            <div v-if="rows && rows.length > 0" class="activity-grid">
                <n-card 
                    v-for="item in rows" 
                    :key="item.id"
                    class="activity-card"
                    :class="{ 'activity-disabled': item.status === 3 }"
                    @click="openActivityDetail(item)"
                >
                    <div class="activity-header">
                        <h3 class="activity-title">{{ item.title }}</h3>
                        <div class="status-badge" :class="`status-${item.status}`">
                            {{ useGroupStatusText(item.status) }}
                        </div>
                    </div>
                    
                    <div class="activity-info">
                        <p class="activity-desc">{{ item.description }}</p>
                        
                        <div class="activity-meta">
                            <div class="meta-item">
                                <span class="meta-label">现价</span>
                                <Price :value="item.group_price" class="text-lg text-rose-500 font-bold"/>
                            </div>
                            
                            <div class="meta-item">
                                <span class="meta-label">原价</span>
                                <Price :value="item.original_price" through class="text-sm"/>
                            </div>
                            
                            <div v-if="item.memberPrice !== undefined && item.memberPrice !== null" class="meta-item member-price">
                                <span class="meta-label">会员价</span>
                                <span class="text-lg text-orange-500 font-bold">￥{{ item.memberPrice }}</span>
                            </div>
                            
                            <div class="meta-item">
                                <span class="meta-label">拼团最低人数</span>
                                <span class="text-base font-semibold">{{ item.groupMinNum }}人</span>
                            </div>
                            
                            <div class="meta-item">
                                <span class="meta-label">拼团人数上限</span>
                                <span class="text-base font-semibold">{{ item.total }}人</span>
                            </div>
                            
                            <div class="meta-item">
                                <span class="meta-label">当前参团人数</span>
                                <span class="text-base font-semibold">{{ item.joined_count }}人</span>
                            </div>
                        </div>
                        
                        <!-- 拼团时间信息 -->
                        <div class="group-time-info">
                            <div class="time-row">
                                <span class="time-label">拼团开始时间：</span>
                                <span class="time-value">{{ formatTime(item.startTime) }}</span>
                            </div>
                            <div class="time-row">
                                <span class="time-label">拼团截止时间：</span>
                                <span class="time-value">{{ formatTime(item.expireTime) }}</span>
                            </div>
                        </div>
                        
                        <!-- 服务器使用时间信息 -->
                        <div class="server-time-info">
                            <div class="time-row">
                                <span class="time-label">服务器开始时间：</span>
                                <span class="time-value">{{ formatTime(item.serverStartTime) || '待设置' }}</span>
                            </div>
                            <div class="time-row">
                                <span class="time-label">服务器结束时间：</span>
                                <span class="time-value">{{ formatTime(item.serverExpireTime) || '待设置' }}</span>
                            </div>
                            <div class="time-row">
                                <span class="time-label">剩余使用时间：</span>
                                <span class="time-value remaining-time">{{ item.remainingMonths ? Math.ceil(item.remainingMonths) + '个月' : '待设置' }}</span>
                            </div>
                        </div>
                        
                        <div class="activity-progress">
                            <n-progress 
                                type="line" 
                                :percentage="useGroupProgress(item.joined_count, item.total)"
                                :show-indicator="false"
                                :height="8"
                                :color="(item.status === 1 || item.status === 2) ? '#18a058' : '#d0d0d0'"
                            />
                            <span class="progress-text">{{ item.joined_count }}/{{ item.total }}</span>
                        </div>
                        
                        <div class="activity-footer">
                            <div class="footer-actions">
                                <n-button 
                                    type="primary" 
                                    size="large"
                                    :disabled="item.status === 3 || (!item.can_join && !(item.status === 2 && item.joined_count < item.total))"
                                    @click.stop="handleJoinActivity(item)"
                                >
                                    {{ item.status === 3 ? '已结束' : ((item.can_join || (item.status === 2 && item.joined_count < item.total)) ? '立即参团' : '无法参团') }}
                                </n-button>
                                <!-- 手动添加按钮：需要管理员权限 + 进行中或已成功时显示 -->
                                <n-button
                                    v-if="isAdmin && (item.status === 1 || item.status === 2)"
                                    type="default"
                                    size="large"
                                    @click.stop="openAddUserModal(item)"
                                >
                                    <template #icon><n-icon :component="PersonAddOutline" /></template>
                                    手动添加
                                </n-button>
                            </div>
                        </div>
                    </div>
                </n-card>
            </div>
            
            <Empty v-else desc="暂无拼团活动" />
            
            <!-- 分页 -->
            <div class="pagination-wrapper" v-if="totalPages > 1">
                <n-pagination 
                    v-model:page="currentPage"
                    :page-count="totalPages"
                    :page-size="perPage"
                    @update:page="handlePageChange"
                />
            </div>
        </LoadingGroup>

        <!-- 手动添加用户弹窗 -->
        <n-modal
            v-model:show="showAddUserModal"
            preset="card"
            title="手动添加参团用户"
            style="width: 480px; max-width: 95vw"
            :mask-closable="false"
            @after-leave="addUserForm = { keyword: '', remark: '' }"
        >
            <div class="create-form">
                <div class="form-item">
                    <label class="form-label">当前拼团活动</label>
                    <div class="target-activity-hint">{{ addUserTargetActivity?.title || '-' }}</div>
                </div>
                <div class="form-item">
                    <label class="form-label">用户名 <span class="required">*</span></label>
                    <n-input
                        v-model:value="addUserForm.keyword"
                        placeholder="请输入用户名"
                        clearable
                    />
                </div>
                <div class="form-item">
                    <label class="form-label">备注（可选）</label>
                    <n-input
                        v-model:value="addUserForm.remark"
                        type="textarea"
                        placeholder="如：线下已付款，由管理员手动录入"
                        :rows="3"
                    />
                </div>
                <n-alert type="info" :show-icon="true">
                    操作记录将被保存，请确认用户信息无误后再提交。
                </n-alert>
            </div>
            <template #footer>
                <div class="modal-footer">
                    <n-button @click="showAddUserModal = false">取消</n-button>
                    <n-button type="primary" :loading="addUserLoading" @click="handleAddUser">确认添加</n-button>
                </div>
            </template>
        </n-modal>
    </div>
</template>

<script setup>
import {
    NCard,
    NRadioGroup,
    NRadioButton,
    NProgress,
    NPagination,
    NButton,
    NModal,
    NSelect,
    NInputNumber,
    NInput,
    NAlert,
    NIcon,
    createDiscreteApi
} from "naive-ui"
import { AddOutline, PersonAddOutline, ListOutline } from '@vicons/ionicons5'
import { useIsAdmin } from '~~/composables/useAuth'

definePageMeta({
    name: 'group'
})

useHead({ title: '拼团活动列表' })

const filterStatus = ref(null)
const filterType = ref(null)  // 新增：类型筛选
const currentPage = ref(1)

// 类型选项
const typeOptions = [
    { label: '服务器拼团', value: 'server' },
    { label: 'AI拼团', value: 'ai' }
]

// 权限检查
const isAdmin = useIsAdmin()

// 优化:使用 lazy: true 避免阻塞页面渲染
const {
    data,
    error,
    pending,
    refresh
} = await useGetGroupActivityListApi({ 
    status: filterStatus.value,
    type: filterType.value  // 新增：类型筛选参数
}, currentPage.value)

// 调试:直接打印原始数据
if (process.client) {
    console.log('=== 页面初始化调试 ===')
    console.log('原始 data:', data)
    console.log('原始 data.value:', data.value)
    console.log('原始 data.value?.rows:', data.value?.rows)
    console.log('原始 error:', error.value)
    console.log('原始 pending:', pending.value)
}

// 页面挂载后强制刷新一次
onMounted(() => {
    if (process.client) {
        console.log('=== 页面已挂载,强制刷新数据 ===')
        refresh()
    }
})

// 优化:使用计算属性处理数据,适配后端实际返回的数据结构
const rows = computed(() => {
    if (process.client) {
        console.log('=== rows 计算属性触发 ===')
        console.log('data.value:', data.value)
        console.log('data.value?.rows:', data.value?.rows)
    }
    
    if (!data.value) {
        if (process.client) console.log('data.value 为 null/undefined, 返回空数组')
        return []
    }
    
    if (!data.value.rows) {
        if (process.client) console.log('data.value.rows 不存在, 返回空数组')
        return []
    }
    
    if (process.client) console.log('原始rows数量:', data.value.rows.length)
    
    // 后端返回的rows已经是数组,进行字段映射
    const mappedRows = data.value.rows.map(item => {
        return {
            ...item,
            // 字段名映射:驼峰转下划线
            group_price: item.currentPrice,
            original_price: item.basePrice,
            joined_count: item.currentNum,
            total: item.groupMaxNum,
            groupMinNum: item.groupMinNum, // 拼团最低人数
            can_join: item.canJoin,
            // 拼团时间
            startTime: item.startTime,           // 拼团开始时间
            expireTime: item.expireTime,         // 拼团截止时间
            // 服务器使用时间（注意：后端字段名为 serverEndTime 而非 serverExpireTime）
            serverStartTime: item.serverStartTime,
            serverExpireTime: item.serverEndTime, // 映射后端 serverEndTime 字段
            remainingMonths: item.remainingMonths, // 剩余使用月数
            // 添加缺失的字段
            cover: item.cover || '', // 封面图
            description: `${item.cpu || ''} ${item.memory || ''} ${item.storage || ''}` // 使用配置信息作为描述
        }
    })
    
    if (process.client) {
        console.log('映射后rows数量:', mappedRows.length)
        console.log('最终rows:', mappedRows)
        if (mappedRows.length > 0) {
            const firstItem = mappedRows[0]
            console.log('[调试] 第一条数据的时间字段:')
            console.log('  startTime:', firstItem.startTime)
            console.log('  expireTime:', firstItem.expireTime)
            console.log('  serverStartTime:', firstItem.serverStartTime)
            console.log('  serverExpireTime:', firstItem.serverExpireTime)
            console.log('  remainingMonths:', firstItem.remainingMonths)
        }
    }
    return mappedRows
})

const totalPages = computed(() => {
    // 后端没有pages字段,使用total和per_page计算
    const total = data.value?.total || 0
    const perPage = 10 // 默认每页10条
    return Math.ceil(total / perPage) || 1
})

const perPage = computed(() => {
    return 10 // 默认每页10条
})

// 筛选状态变化
function handleFilterChange() {
    currentPage.value = 1
    refreshWithFilter()
}

// 页码变化
function handlePageChange(page) {
    currentPage.value = page
    refreshWithFilter()
}

// 带筛选条件刷新 - 优化:重新调用 API 获取最新数据
async function refreshWithFilter() {
    try {
        const result = await useGetGroupActivityListApi(
            { 
                status: filterStatus.value,
                type: filterType.value  // 新增：传递类型参数
            }, 
            currentPage.value
        )
        data.value = result.data.value
        error.value = result.error.value
        pending.value = result.pending.value
    } catch (err) {
        console.error('刷新拼团列表失败:', err)
        error.value = err
    }
}

// ── 发起拼团弹窗逻辑 ────────────────────────────────────────────────
const showCreateModal = ref(false)
const createLoading = ref(false)
const createForm = ref({ activityId: null, minNum: 2, maxNum: 5, price: null, duration: 12 })

// 拼团活动下拉选项（前端固定，与接口无关）
const FIXED_ACTIVITIES = [
    {
        id: 1,
        title: 'AI服务器拼团 - 4核8G版',
        cpu: '4核',
        memory: '8GB',
        storage: '100GB SSD',
        currentPrice: 2388.00,
        groupMinNum: 2,
        groupMaxNum: 5
    },
    {
        id: 2,
        title: 'AI服务器拼团 - 8核16G版',
        cpu: '8核',
        memory: '16GB',
        storage: '200GB SSD',
        currentPrice: 4776.00,
        groupMinNum: 2,
        groupMaxNum: 8
    }
]

const activityOptions = FIXED_ACTIVITIES.map(item => ({
    label: item.title,
    value: item.id
}))

// 当前选中活动的详细信息
const selectedActivity = computed(() =>
    FIXED_ACTIVITIES.find(r => r.id === createForm.value.activityId) || null
)

function openCreateModal() {
    useHasAuth(() => { showCreateModal.value = true })
}

function resetCreateForm() {
    createForm.value = { activityId: null, payMethod: 'wechat' }
}

// 发起拼团
async function handleCreate() {
    const { message } = createDiscreteApi(['message'])
    if (!createForm.value.activityId) return message.error('请选择拼团活动')
    if (!createForm.value.minNum || createForm.value.minNum < 2) return message.error('最低拼团人数不能少于 2 人')
    if (!createForm.value.maxNum || createForm.value.maxNum < createForm.value.minNum) return message.error('最多拼团人数不能少于最低人数')
    if (!createForm.value.price || createForm.value.price <= 0) return message.error('请设置支付费用')
    if (!createForm.value.duration || createForm.value.duration < 1) return message.error('请设置服务器使用时间')

    createLoading.value = true
    try {
        // ── TODO: 后端实现后根据实际参数格式调整 ──────────────────────
        // 当前接口：POST /pc/group/work/join?activityId={id}&payMethod={method}
        // 如后端有专用「发起」接口，改用 useCreateGroupWorkApi
        const result = await useCreateGroupWorkApi({
            activityId: createForm.value.activityId,
            minNum: createForm.value.minNum,
            maxNum: createForm.value.maxNum,
            price: createForm.value.price,
            duration: createForm.value.duration
        })

        // 检查是否有错误
        if (result.error.value) {
            // 优先使用后端返回的错误信息
            const errorData = result.data.value || result.error.value?.data
            const errorMsg = errorData?.msg || 
                           errorData?.message ||
                           result.error.value?.message || 
                           '发起失败,请重试'
            message.error(errorMsg)
            return
        }

        // 检查业务状态码（兼容不同返回格式）
        const responseData = result.data.value
        const responseCode = responseData?.code ?? result.data.value?.code
        
        if (responseCode !== undefined && responseCode !== 200) {
            // 业务错误
            const errorMsg = responseData?.msg || responseData?.message || '发起失败,请重试'
            message.error(errorMsg)
            return
        }

        // 成功处理
        showCreateModal.value = false
        message.success('拼团发起成功！')
        const orderNo = responseData?.orderNo || responseData?.order_no || responseData?.data?.orderNo || responseData?.data?.order_no
        if (orderNo) {
            // 跳转到支付页面，传递 activityId 以便支付成功后返回
            navigateTo(`/pay?no=${orderNo}&activityId=${createForm.value.activityId}&type=group`)
        } else {
            refresh()
        }
    } catch (err) {
        console.error('发起拼团失败:', err)
        // 捕获 transform 抛出的业务错误
        const errorMsg = err?.data?.msg || err?.data?.message || err?.message || '发起失败,请重试'
        message.error(errorMsg)
    } finally {
        createLoading.value = false
    }
}

// 打开活动详情
function openActivityDetail(item) {
    navigateTo(`/group/work/${item.id}`)
}

// 参与拼团活动
function handleJoinActivity(item) {
    useHasAuth(async () => {
        const { message } = createDiscreteApi(["message"])
        
        const canJoin = (item.status !== 3) && (item.can_join || (item.status === 2 && item.joined_count < item.total))
        if (!canJoin) {
            return message.error('该活动已满员或已结束')
        }
        
        // 跳转到详情页参团
        navigateTo(`/group/work/${item.id}`)
    })
}

// 跳转到我的拼团页面
function goToMyGroup() {
    navigateTo('/group/my')
}

// 格式化时间 - 优化:增加时间格式化处理
function formatTime(time) {
    if (!time) return ''
    const date = new Date(time)
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    })
}

// ── 手动添加用户逻辑 ─────────────────────────────────────
const showAddUserModal = ref(false)
const addUserLoading = ref(false)
const addUserForm = ref({ keyword: '', remark: '' })
const addUserTargetActivity = ref(null)

function openAddUserModal(item) {
    addUserTargetActivity.value = item
    addUserForm.value = { keyword: '', remark: '' }
    showAddUserModal.value = true
}

async function handleAddUser() {
    const { message } = createDiscreteApi(['message'])
    if (!addUserForm.value.keyword?.trim()) return message.error('请输入用户手机号或用户名')

    addUserLoading.value = true
    try {
        // ── TODO: 后端实现手动添加用户接口后在此接入 ─────────────────────────
        // 建议接口：POST /pc/admin/group/work/addUser
        // 建议请求体：{ activityId: addUserTargetActivity.value?.id, keyword, remark? }
        // 其中 keyword 可为用户手机号或用户名，后端进行查询匹配
        // ───────────────────────────────────────────────────────────────────
        // 示例调用：
        // const result = await useHttpPost('AdminAddGroupUser',
        //     '/admin/group/work/addUser',
        //     { body: { activityId: addUserTargetActivity.value?.id,
        //               keyword: addUserForm.value.keyword,
        //               remark: addUserForm.value.remark } }
        // )
        // if (!result.error.value) { message.success('添加成功') ... }

        // ── 暂时模拟成功（后端接口接入后删除此行） ──
        await new Promise(resolve => setTimeout(resolve, 600))
        message.success(`已将用户「${addUserForm.value.keyword}」添加至拼团（TODO: 待后端实现）`)
        showAddUserModal.value = false
        refresh()
    } catch (err) {
        console.error('手动添加失败:', err)
        message.error('添加失败，请重试')
    } finally {
        addUserLoading.value = false
    }
}
</script>

<style scoped>
.group-activity-list {
    padding: 1rem 0;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #999;
  margin-bottom: 12px;
}
.bc-item { color: #666; cursor: pointer; transition: color 0.2s; }
.bc-item:hover { color: #18a058; }
.bc-sep { color: #ddd; user-select: none; }
.bc-current { color: #333; font-weight: 600; }

.filter-card {
    margin-bottom: 1.5rem;
    border-radius: 8px;
}

.filter-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

/* 弹窗表单 */
.create-form { display: flex; flex-direction: column; gap: 1.25rem; }

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.form-item { display: flex; flex-direction: column; gap: 0.4rem; }

.form-label { font-size: 0.9rem; font-weight: 600; color: #374151; }
.required { color: #d03050; }

.activity-hint {
    font-size: 0.78rem;
    color: #888;
    margin: 0;
    padding: 0.4rem 0.6rem;
    background: #f9fafb;
    border-radius: 6px;
}

.pay-radio-group { display: flex; gap: 1rem; }
.pay-radio { border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.6rem 1rem; }
.pay-option { display: flex; align-items: center; gap: 0.5rem; }
.pay-icon {
    font-size: 0.7rem; font-weight: 700;
    padding: 2px 6px; border-radius: 4px; color: #fff;
}
.wechat-icon { background: #07c160; }
.alipay-icon  { background: #1677ff; }

.create-notice { font-size: 0.85rem; }

.modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; }

.flex {
    display: flex;
}

.items-center {
    align-items: center;
}

.gap-4 {
    gap: 1rem;
}

.filter-label {
    font-weight: 600;
    color: #374151;
}

.activity-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
}

.activity-card {
    cursor: pointer;
    border-radius: 12px;
    transition: all 0.3s;
    overflow: hidden;
}

.activity-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}

.activity-disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.activity-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
    gap: 0.5rem;
}

.activity-title {
    font-size: 1.125rem;
    font-weight: 700;
    margin: 0;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
}

.status-badge {
    position: relative;
    top: auto;
    right: auto;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
    color: white;
    white-space: nowrap;
    flex-shrink: 0;
}

.status-1 {
    background-color: #18a058;
}

.status-2 {
    background-color: #2080f0;
}

.status-3 {
    background-color: #d03050;
}

.status-4 {
    background-color: #f0a020;
}

.activity-info {
    padding: 1rem;
}

.activity-desc {
    font-size: 0.875rem;
    color: #6b7280;
    margin-bottom: 1rem;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
}

.activity-meta {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
}

.meta-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.meta-label {
    font-size: 0.875rem;
    color: #6b7280;
    min-width: 70px;
}

/* 服务器使用时间信息 */
.server-time-info {
    background-color: #f0fdf4;
    border: 1px solid #bbf7d0;
    padding: 0.75rem;
    border-radius: 6px;
    margin-top: 0.75rem;
}

/* 拼团时间信息 */
.group-time-info {
    background-color: #eff6ff;
    border: 1px solid #bfdbfe;
    padding: 0.75rem;
    border-radius: 6px;
    margin-top: 0.75rem;
}

.time-row {
    display: flex;
    align-items: center;
    margin-bottom: 0.5rem;
    font-size: 0.8125rem;
}

.time-row:last-child {
    margin-bottom: 0;
}

.time-label {
    color: #6b7280;
    min-width: 110px;
    font-weight: 500;
}

.time-value {
    font-weight: 500;
    color: #374151;
}

.remaining-time {
    color: #f43f5e;
    font-weight: 600;
}

.text-lg {
    font-size: 1.125rem;
}

.text-rose-500 {
    color: #f43f5e;
}

.font-bold {
    font-weight: 700;
}

.text-xs {
    font-size: 0.75rem;
}

.text-gray-400 {
    color: #9ca3af;
}

.text-base {
    font-size: 1rem;
}

.font-semibold {
    font-weight: 600;
}

.ml-2 {
    margin-left: 0.5rem;
}

.activity-progress {
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.progress-text {
    font-size: 0.75rem;
    color: #6b7280;
    white-space: nowrap;
}

.activity-footer {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding-top: 1rem;
    border-top: 1px solid #f3f4f6;
}

.footer-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.target-activity-hint {
    padding: 0.5rem 0.75rem;
    background: #f3f4f6;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 500;
    color: #374151;
}

.pagination-wrapper {
    display: flex;
    justify-content: center;
    padding: 2rem 0;
}
</style>
