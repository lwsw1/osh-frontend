<template>
  <div class="user-manage-page">
    <h2 class="page-title">
      用户管理
      <n-button type="primary" size="small" class="invite-btn" @click="showInviteModal = true">
        邀请用户
      </n-button>
    </h2>

    <!-- 搜索/筛选栏 -->
    <div class="filter-bar">
      <div class="filter-row">
        <n-input v-model:value="query.username" placeholder="用户名" clearable size="small" class="filter-input" />
        <n-input v-model:value="query.email" placeholder="邮箱" clearable size="small" class="filter-input" />
        <n-select v-model:value="query.roleId" :options="roleOptions" placeholder="角色" clearable size="small" class="filter-select" />
        <n-select v-model:value="query.blocked" :options="blockedOptions" placeholder="是否拉黑" clearable size="small" class="filter-select-sm" />
        <n-select v-model:value="query.deleted" :options="deletedOptions" placeholder="是否注销" clearable size="small" class="filter-select-sm" />
        <div class="sort-group">
          <n-select v-model:value="query.orderBy" :options="orderByOptions" placeholder="排序" clearable size="small" class="filter-select" />
          <button class="sort-dir-btn" @click="toggleOrderDir" :title="query.orderDir === 'asc' ? '升序' : '降序'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path v-if="query.orderDir === 'asc'" d="M12 19V5M5 12l7-7 7 7" />
              <path v-else d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </button>
        </div>
        <n-button size="small" @click="resetQuery">重置</n-button>
      </div>
    </div>

    <!-- 用户列表 -->
    <div class="table-wrap">
      <n-spin :show="loading">
        <table class="user-table" v-if="userList.length > 0">
          <thead>
            <tr>
              <th>用户名</th>
              <th>邮箱</th>
              <th>角色</th>
              <th>积分</th>
              <th>违规次数</th>
              <th>状态</th>
              <th>注册时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in userList" :key="user.id" class="clickable-row" @click="goToDetail(user.id)">
              <td>
                <div class="user-cell">
                  <n-avatar :size="28" :src="user.avatar || defaultAvatar" round />
                  <span class="username-link">{{ user.username }}</span>
                </div>
              </td>
              <td>{{ user.email || '-' }}</td>
              <td>
                <n-tag :type="roleTagType(user.roleLevel)" size="small">
                  {{ user.roleName || '未分配' }}
                </n-tag>
              </td>
              <td>{{ user.points ?? 0 }}</td>
              <td>
                <span :class="{ 'text-danger': user.violationCount > 0 }">{{ user.violationCount ?? 0 }}</span>
              </td>
              <td>
                <n-tag :type="user.status === 1 ? 'error' : 'success'" size="small">
                  {{ user.status === 1 ? '已拉黑' : '正常' }}
                </n-tag>
              </td>
              <td>{{ user.createTime || '-' }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-state">暂无用户数据</div>
      </n-spin>
    </div>

    <!-- 分页 -->
    <div class="pagination-wrap" v-if="total > 0">
      <n-pagination
        :page="query.pageNum"
        :page-size="query.pageSize"
        :item-count="total"
        @update:page="handlePageChange"
      />
    </div>

    <!-- 邀请用户弹窗 -->
    <n-modal v-model:show="showInviteModal" preset="card" title="邀请用户注册" style="width: 460px;">
      <n-form size="small" ref="inviteFormRef" :model="inviteForm" :rules="inviteRules">
        <n-form-item label="邮箱" path="email">
          <n-input v-model:value="inviteForm.email" placeholder="被邀请人邮箱" />
        </n-form-item>
        <n-form-item label="角色" path="roleId">
          <n-select v-model:value="inviteForm.roleId" :options="inviteRoleOptions" placeholder="选择角色" @update:value="onInviteRoleChange" />
        </n-form-item>
        <n-form-item v-if="inviteNeedExpire" label="角色有效期">
          <div style="display:flex;align-items:center;gap:8px;width:100%;">
            <n-date-picker v-if="!inviteForm.permanent" v-model:value="inviteExpireTimestamp" type="datetime" size="small" placeholder="选择到期时间" clearable style="flex:1;" />
            <n-checkbox v-model:checked="inviteForm.permanent" size="small">永久</n-checkbox>
          </div>
        </n-form-item>
        <n-form-item label="初始积分">
          <n-input-number v-model:value="inviteForm.points" :min="0" :max="99999" placeholder="默认188" style="width: 100%;" />
        </n-form-item>
      </n-form>
      <div v-if="inviteResult" class="invite-result">
        <p>邀请链接已生成（{{ inviteResult.expireDays }}天有效）：</p>
        <code class="invite-link">{{ inviteResult.inviteLink }}</code>
        <n-button size="tiny" type="primary" @click="copyInviteLink">复制链接</n-button>
      </div>
      <template #footer>
        <n-button type="primary" size="small" @click="submitInvite" :loading="inviteLoading" :disabled="!canSubmitInvite">
          发送邀请
        </n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch, computed } from 'vue'
import {
  NInput, NSelect, NButton, NTag, NAvatar, NPagination, NSpin, NModal, NForm, NFormItem, NInputNumber, NDatePicker, NCheckbox
} from 'naive-ui'
import { fetchConfig } from '~/composables/useHttp'
import { apiGetUserManageList } from '~/composables/Api/Admin/userManage'

const defaultAvatar = '/default-avatar.png'

// 页面仅创始人可访问，无需额外判断

const loading = ref(false)
const userList = ref([])
const total = ref(0)

const query = reactive({
  username: '',
  email: '',
  roleId: null,
  blocked: null,
  deleted: null,
  orderBy: null,
  orderDir: 'desc',
  pageNum: 1,
  pageSize: 20
})

const roleOptions = [
  { label: '普通用户', value: 1 },
  { label: '普通开发者', value: 2 },
  { label: 'VIP用户', value: 3 },
  { label: '小班用户', value: 4 },
  { label: '普通管理员', value: 5 },
  { label: '核心开发者', value: 6 },
  { label: '创始人', value: 7 },
]

const blockedOptions = [
  { label: '已拉黑', value: true },
  { label: '未拉黑', value: false },
]

const deletedOptions = [
  { label: '已注销', value: true },
  { label: '未注销', value: false },
]

const orderByOptions = [
  { label: '注册时间', value: 'createTime' },
  { label: '积分', value: 'points' },
  { label: '违规次数', value: 'violationCount' },
]

function roleTagType(level) {
  if (level >= 5) return 'error'
  if (level >= 3) return 'warning'
  return 'info'
}

function toggleOrderDir() {
  query.orderDir = query.orderDir === 'asc' ? 'desc' : 'asc'
}

// 实时搜索：监听所有查询条件变化，自动请求
let searchTimer = null
watch(
  () => [query.username, query.email, query.roleId, query.blocked, query.deleted, query.orderBy, query.orderDir],
  () => {
    // 防抖 300ms
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      query.pageNum = 1
      loadUsers()
    }, 300)
  }
)

async function loadUsers() {
  loading.value = true
  try {
    const res = await apiGetUserManageList(query)
    const data = res?.data || res || {}
    userList.value = data.rows || []
    total.value = data.total || 0
  } catch (e) {
    userList.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function resetQuery() {
  query.username = ''
  query.email = ''
  query.roleId = null
  query.blocked = null
  query.deleted = null
  query.orderBy = null
  query.orderDir = 'desc'
  query.pageNum = 1
  loadUsers()
}

function handlePageChange(page) {
  query.pageNum = page
  loadUsers()
}

// ── 角色管理（已移至详情子页面） ──

function goToDetail(userId) {
  navigateTo(`/admin/user/${userId}`)
}

// ── 邀请管理员 ──
const showInviteModal = ref(false)
const inviteLoading = ref(false)
const inviteResult = ref(null)
const inviteFormRef = ref(null)
const inviteForm = reactive({ email: '', roleId: null, points: 188, permanent: false })
const inviteExpireTimestamp = ref(null)
const inviteRoleOptions = [
  { label: '普通开发者', value: 2 },
  { label: 'VIP用户', value: 3 },
  { label: '小班用户', value: 4 },
  { label: '普通管理员', value: 5 },
  { label: '核心开发者', value: 6 },
]

// VIP(roleId=3) 和 小班(roleId=4) 需要指定有效期
const inviteNeedExpire = computed(() => inviteForm.roleId === 3 || inviteForm.roleId === 4)

const canSubmitInvite = computed(() => {
  if (!inviteForm.email || !inviteForm.roleId) return false
  if (inviteNeedExpire.value && !inviteForm.permanent && !inviteExpireTimestamp.value) return false
  return true
})

function onInviteRoleChange() {
  inviteExpireTimestamp.value = null
  inviteForm.permanent = false
}
const inviteRules = {
  email: [
    { required: true, message: '请输入邮箱' },
    {
      validator: (_rule, value) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value),
      message: '请输入有效邮箱格式',
      trigger: ['input', 'blur']
    }
  ],
  roleId: [
    { required: true, message: '请选择角色', type: 'number' }
  ]
}

async function submitInvite() {
  // 表单校验
  try {
    await inviteFormRef.value.validate()
  } catch {
    return
  }
  inviteLoading.value = true
  inviteResult.value = null
  try {
    // 构建请求体
    const body = { email: inviteForm.email, roleId: inviteForm.roleId, points: inviteForm.points }
    if (inviteNeedExpire.value) {
      if (inviteForm.permanent) {
        body.permanent = true
      } else if (inviteExpireTimestamp.value) {
        const d = new Date(inviteExpireTimestamp.value)
        body.expireTime = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0') + ':' + String(d.getSeconds()).padStart(2,'0')
      }
    }
    const res = await $fetch(`${fetchConfig.baseURL}/admin/invite/create`, {
      method: 'POST',
      headers: getAuthHeadersLocal(),
      body
    })
    if (res?.code === 200 && res?.data) {
      inviteResult.value = res.data
      alert('邀请已发送到对方邮箱')
    } else {
      alert(res?.msg || '邀请失败')
    }
  } catch (e) {
    alert(e?.data?.msg || '邀请失败')
  } finally {
    inviteLoading.value = false
  }
}

function copyInviteLink() {
  if (!inviteResult.value?.inviteLink) return
  navigator.clipboard.writeText(inviteResult.value.inviteLink)
  alert('链接已复制')
}

function getAuthHeadersLocal() {
  const headers = { appid: 'bd9d01ecc75dbbaaefce' }
  if (process.client) {
    let token = ''
    try { token = useCookie('token').value || '' } catch {}
    if (!token) token = localStorage.getItem('token') || ''
    if (token) { headers.token = token; headers.Authorization = `Bearer ${token}` }
  }
  return headers
}

onMounted(() => {
  loadUsers()
})

useHead({ title: '用户管理' })
</script>

<style scoped>
.user-manage-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

.page-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1a202c;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.invite-btn {
  font-size: 12px;
}

.invite-result {
  margin-top: 12px;
  padding: 12px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 6px;
  font-size: 13px;
}

.invite-link {
  display: block;
  word-break: break-all;
  margin: 8px 0;
  padding: 8px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 12px;
}

.filter-bar {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.filter-input { width: 150px; }
.filter-select { width: 140px; }
.filter-select-sm { width: 120px; }

.sort-group {
  display: flex;
  align-items: center;
  gap: 0;
}
.sort-group .filter-select {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.sort-dir-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 28px;
  border: 1px solid #e2e8f0;
  border-left: none;
  border-radius: 0 4px 4px 0;
  background: #fff;
  cursor: pointer;
  color: #475569;
  transition: all 0.15s;
}
.sort-dir-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
  background: #eff6ff;
}

.table-wrap {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.user-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.user-table th {
  background: #f1f5f9;
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: #475569;
  border-bottom: 1px solid #e2e8f0;
}

.user-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
}

.user-table tr:hover td {
  background: #f8fafc;
}

.clickable-row {
  cursor: pointer;
  transition: background 0.15s;
}
.clickable-row:hover td {
  background: #eff6ff;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.username-link {
  color: #3b82f6;
  transition: color 0.15s;
}
.username-link:hover {
  color: #1d4ed8;
  text-decoration: underline;
}

.text-danger { color: #ef4444; font-weight: 600; }

.empty-state {
  padding: 60px 0;
  text-align: center;
  color: #94a3b8;
  font-size: 14px;
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

</style>
