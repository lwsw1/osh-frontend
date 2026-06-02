<template>
  <div class="user-detail-page">
    <div class="detail-header">
      <n-button text @click="goBack" class="back-btn">← 返回用户列表</n-button>
      <h2 class="page-title">用户详情</h2>
    </div>

    <n-spin :show="loading">
      <template v-if="user">
        <!-- 基本信息卡片 -->
        <div class="info-card">
          <div class="info-card-header">
            <n-avatar :size="64" :src="user.avatar || defaultAvatar" round />
            <div class="info-header-text">
              <h3 class="info-username">{{ user.username }}</h3>
              <div class="info-roles">
                <n-tag v-for="(r, idx) in user.roles" :key="idx" :type="roleTagType(r.roleLevel)" size="small">{{ r.roleName }}</n-tag>
                <n-tag v-if="!user.roles || user.roles.length === 0" size="small">未分配角色</n-tag>
              </div>
            </div>
            <div class="info-status">
              <n-tag :type="user.status === 1 ? 'error' : 'success'" size="small">
                {{ user.status === 1 ? '已拉黑' : '正常' }}
              </n-tag>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">用户ID</span>
              <span class="info-value mono">{{ user.id }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">邮箱</span>
              <span class="info-value">{{ user.email || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">唯一标识</span>
              <span class="info-value mono">{{ user.uniqueId || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">用户名</span>
              <n-input v-model:value="editForm.username" size="small" />
            </div>
            <div class="info-item">
              <span class="info-label">重置密码（留空不修改）</span>
              <n-input v-model:value="editForm.password" size="small" placeholder="输入新密码" type="password" show-password-on="click" />
            </div>
            <div class="info-item">
              <span class="info-label">性别</span>
              <n-select v-model:value="editForm.sex" :options="sexOptions" size="small" />
            </div>
            <div class="info-item">
              <span class="info-label">积分</span>
              <n-input-number v-model:value="editForm.points" :min="0" size="small" style="width:100%;" />
            </div>
            <div class="info-item full">
              <span class="info-label">个人简介</span>
              <n-input v-model:value="editForm.introduction" type="textarea" size="small" :rows="2" placeholder="个人简介" />
            </div>
            <div class="info-item">
              <span class="info-label">违规次数</span>
              <span class="info-value" :class="{ 'text-danger': user.violationCount > 0 }">{{ user.violationCount ?? 0 }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">邀请码</span>
              <span class="info-value mono">{{ user.inviteCode || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">注册时间</span>
              <span class="info-value">{{ user.createTime || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">更新时间</span>
              <span class="info-value">{{ user.updateTime || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">是否注销</span>
              <n-tag :type="user.deleteFlag == 1 ? 'error' : 'default'" size="small">
                {{ user.deleteFlag == 1 ? '已注销' : '正常' }}
              </n-tag>
            </div>
          </div>

          <div class="save-row">
            <n-button type="primary" size="small" :loading="saving" @click="saveUserInfo">保存修改</n-button>
          </div>
        </div>

        <!-- 角色管理卡片 -->
        <div class="section-card">
          <h3 class="section-title">角色管理</h3>
          <div class="role-list">
            <div v-for="(r, ri) in (user.roles || [])" :key="ri" class="role-item-wrap">
              <n-tag :type="roleTagType(r.roleLevel)" size="medium" :closable="r.roleLevel >= 2 && r.roleLevel <= 5" @close="removeRole(r)">
                {{ r.roleName }} (Lv.{{ r.roleLevel }})
              </n-tag>
              <span v-if="r.expireTime && (r.roleCode === 'vip' || r.roleCode === 'small_class')" class="expire-hint">
                {{ formatExpireTime(r.expireTime) }}
              </span>
              <n-button v-if="r.roleCode === 'vip' || r.roleCode === 'small_class'" text type="info" size="tiny" @click="openExpireEdit(r)">修改有效期</n-button>
            </div>
            <span v-if="!user.roles || user.roles.length === 0" class="empty-hint-inline">未分配角色</span>
          </div>
          <!-- 修改有效期 -->
          <div v-if="editingExpireRole" class="expire-edit-row">
            <span class="expire-edit-label">修改「{{ editingExpireRole.roleName }}」有效期：</span>
            <n-date-picker v-if="!editExpirePermanent" v-model:value="editExpireTimestamp" type="datetime" size="small" placeholder="选择新到期时间" clearable style="width: 200px;" />
            <n-checkbox v-model:checked="editExpirePermanent" size="small">永久</n-checkbox>
            <n-button size="small" type="primary" :disabled="!editExpirePermanent && !editExpireTimestamp" @click="submitExpireEdit">确认</n-button>
            <n-button size="small" @click="editingExpireRole = null">取消</n-button>
          </div>
          <!-- 添加角色 -->
          <div class="role-add-row">
            <n-select v-model:value="addRoleId" :options="assignableRoleOptions" placeholder="选择要添加的角色" size="small" clearable style="width: 200px;" @update:value="onRoleSelect" />
            <template v-if="needExpireTime">
              <n-date-picker v-if="!addPermanent" v-model:value="addExpireTimestamp" type="datetime" size="small" placeholder="选择到期时间" clearable style="width: 200px;" />
              <n-checkbox v-model:checked="addPermanent" size="small">永久</n-checkbox>
            </template>
            <n-button size="small" type="primary" :disabled="!canAddRole" @click="handleAddRole">添加角色</n-button>
          </div>
        </div>

        <!-- 违规记录 -->
        <div class="section-card">
          <div class="section-header">
            <h3 class="section-title">违规记录</h3>
            <n-button size="small" type="warning" @click="showViolationForm = !showViolationForm">
              {{ showViolationForm ? '取消' : '标记违规' }}
            </n-button>
          </div>
          <div v-if="showViolationForm" class="violation-form">
            <div class="violation-form-row">
              <n-select v-model:value="violationForm.violationType" :options="violationTypeOptions" placeholder="违规类型" size="small" style="width:140px;" />
              <n-input v-model:value="violationForm.reason" placeholder="填写违规原因" size="small" style="flex:1;" />
              <n-button type="primary" size="small" :loading="violationLoading" :disabled="!violationForm.violationType" @click="submitViolation">提交</n-button>
            </div>
          </div>
          <div v-if="violations.length === 0 && !showViolationForm" class="empty-hint">暂无违规记录</div>
          <div v-if="violations.length > 0" class="violation-list">
            <div v-for="(v, idx) in violations" :key="idx" class="violation-item" :class="{ revoked: v.deleteFlag == 1 }">
              <div class="violation-header">
                <div class="violation-header-left">
                  <n-tag :type="v.reason?.startsWith('[拉黑]') ? 'error' : 'warning'" size="small">{{ getViolationTypeName(v.violationType) }}</n-tag>
                  <n-tag v-if="v.deleteFlag == 1" type="default" size="small">已撤销</n-tag>
                </div>
                <span class="violation-time">{{ v.createTime }}</span>
              </div>
              <div class="violation-reason">{{ v.reason || '无' }}</div>
              <div class="violation-actions" v-if="v.deleteFlag != 1">
                <n-button text type="warning" size="tiny" @click="handleRevoke(v)">撤销</n-button>
              </div>
            </div>
          </div>
        </div>
      </template>
      <div v-else-if="!loading" class="empty-hint">用户不存在或无权查看</div>
    </n-spin>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { NAvatar, NTag, NButton, NSpin, NSelect, NInput, NInputNumber, NDatePicker, NCheckbox } from 'naive-ui'
import { apiGetUserDetail, apiGetAssignableRoles, apiAddUserRole, apiRemoveUserRole, apiRevokeViolation, apiRecordViolation, apiUpdateUser, apiUpdateRoleExpire } from '~/composables/Api/Admin/userManage'

const route = useRoute()
const defaultAvatar = '/default-avatar.png'

const loading = ref(true)
const saving = ref(false)
const user = ref(null)
const violations = ref([])
const addRoleId = ref(null)
const addExpireTimestamp = ref(null)
const addPermanent = ref(false)
const assignableRoleOptions = ref([])

// 修改有效期
const editingExpireRole = ref(null)
const editExpireTimestamp = ref(null)
const editExpirePermanent = ref(false)

// VIP用户(roleId=3)和小班用户(roleId=4)需要指定有效期
const needExpireTime = computed(() => {
  if (!addRoleId.value) return false
  return addRoleId.value === 3 || addRoleId.value === 4
})

const canAddRole = computed(() => {
  if (!addRoleId.value) return false
  if (needExpireTime.value && !addPermanent.value && !addExpireTimestamp.value) return false
  return true
})

function onRoleSelect() {
  addExpireTimestamp.value = null
  addPermanent.value = false
}

// 可编辑表单
const editForm = reactive({ username: '', password: '', sex: '未知', points: 0, introduction: '' })
const sexOptions = [
  { label: '未知', value: '未知' },
  { label: '男', value: '男' },
  { label: '女', value: '女' },
]

// 标记违规
const showViolationForm = ref(false)
const violationLoading = ref(false)
const violationForm = reactive({ violationType: null, reason: '' })
const violationTypeOptions = [
  { label: '乱答', value: 1 },
  { label: '广告', value: 2 },
  { label: '恶意灌水', value: 3 },
  { label: '其他', value: 4 },
]

function roleTagType(level) {
  if (level >= 5) return 'error'
  if (level >= 3) return 'warning'
  return 'info'
}

function formatExpireTime(expireTime) {
  if (!expireTime) return ''
  const str = String(expireTime)
  if (str.startsWith('2099')) return '永久'
  // 格式化为 yyyy-MM-dd HH:mm
  const d = new Date(str)
  if (isNaN(d.getTime())) return str.substring(0, 16)
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0')
}

function getViolationTypeName(type) {
  const map = { 1: '乱答', 2: '广告', 3: '恶意灌水', 4: '其他' }
  return map[type] || '未知'
}

function goBack() { navigateTo('/admin/users') }

function fillEditForm() {
  if (!user.value) return
  editForm.username = user.value.username || ''
  editForm.password = ''
  editForm.sex = user.value.sex || '未知'
  editForm.points = Number(user.value.points) || 0
  editForm.introduction = user.value.introduction || ''
}

async function loadDetail() {
  loading.value = true
  try {
    const res = await apiGetUserDetail(route.params.id)
    const data = res?.data || res || {}
    user.value = data.user || null
    violations.value = data.violations || []
    fillEditForm()
  } catch {
    user.value = null
    violations.value = []
  } finally {
    loading.value = false
  }
}

async function saveUserInfo() {
  if (!user.value) return
  saving.value = true
  try {
    const params = { userId: user.value.id, username: editForm.username, sex: editForm.sex, points: editForm.points, introduction: editForm.introduction }
    if (editForm.password) params.password = editForm.password
    const res = await apiUpdateUser(params)
    alert(res?.msg || res?.data || '保存成功')
    editForm.password = ''
    loadDetail()
  } catch (e) {
    alert(e?.data?.msg || '保存失败')
  } finally {
    saving.value = false
  }
}

async function loadAssignableRoles() {
  try {
    const res = await apiGetAssignableRoles()
    const list = res?.data || res || []
    assignableRoleOptions.value = list.map(r => ({ label: r.roleName, value: r.roleId, roleLevel: r.roleLevel }))
  } catch { assignableRoleOptions.value = [] }
}

async function handleAddRole() {
  if (!addRoleId.value || !user.value) return
  try {
    let expireTime = null
    let permanent = false
    if (needExpireTime.value) {
      if (addPermanent.value) {
        permanent = true
      } else if (addExpireTimestamp.value) {
        // NDatePicker 返回时间戳（毫秒），转为 yyyy-MM-dd HH:mm:ss
        const d = new Date(addExpireTimestamp.value)
        expireTime = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0') + ':' + String(d.getSeconds()).padStart(2,'0')
      }
    }
    const res = await apiAddUserRole(user.value.id, addRoleId.value, expireTime, permanent)
    alert(res?.msg || res?.data || '添加成功')
    addRoleId.value = null
    addExpireTimestamp.value = null
    addPermanent.value = false
    loadDetail()
  } catch (e) { alert(e?.data?.msg || '添加失败') }
}

async function removeRole(role) {
  if (!confirm(`确认移除「${role.roleName}」角色？`)) return
  const roleId = role.roleId
  if (!roleId) { alert('该角色无法操作'); return }
  try {
    const res = await apiRemoveUserRole(user.value.id, roleId)
    alert(res?.msg || res?.data || '已移除')
    loadDetail()
  } catch (e) { alert(e?.data?.msg || '移除失败') }
}

function openExpireEdit(role) {
  editingExpireRole.value = role
  editExpireTimestamp.value = null
  editExpirePermanent.value = false
  // 如果当前有到期时间且不是永久，预填
  if (role.expireTime && !String(role.expireTime).startsWith('2099')) {
    const d = new Date(role.expireTime)
    if (!isNaN(d.getTime())) editExpireTimestamp.value = d.getTime()
  }
}

async function submitExpireEdit() {
  if (!editingExpireRole.value || !user.value) return
  const roleId = editingExpireRole.value.roleId
  if (!roleId) { alert('角色无法操作'); return }
  let expireTime = null
  if (editExpirePermanent.value) {
    // permanent
  } else if (editExpireTimestamp.value) {
    const d = new Date(editExpireTimestamp.value)
    expireTime = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0') + ':' + String(d.getSeconds()).padStart(2,'0')
  } else {
    alert('请选择到期时间或勾选永久'); return
  }
  try {
    const res = await apiUpdateRoleExpire(user.value.id, roleId, expireTime, editExpirePermanent.value)
    alert(res?.msg || res?.data || '修改成功')
    editingExpireRole.value = null
    loadDetail()
  } catch (e) { alert(e?.data?.msg || '修改失败') }
}

async function submitViolation() {
  if (!violationForm.violationType || !user.value) return
  violationLoading.value = true
  try {
    const res = await apiRecordViolation({ userId: user.value.id, violationType: violationForm.violationType, reason: violationForm.reason })
    alert(res?.msg || res?.data || '操作成功')
    violationForm.violationType = null
    violationForm.reason = ''
    showViolationForm.value = false
    loadDetail()
  } catch (e) { alert(e?.data?.msg || '操作失败') }
  finally { violationLoading.value = false }
}

async function handleRevoke(violation) {
  if (!confirm('确认撤销该违规记录？')) return
  try {
    const res = await apiRevokeViolation(violation.id)
    alert(res?.msg || res?.data || '已撤销')
    loadDetail()
  } catch (e) { alert(e?.data?.msg || '撤销失败') }
}

onMounted(() => { loadDetail(); loadAssignableRoles() })
useHead({ title: '用户详情' })
</script>

<style scoped>
.user-detail-page { max-width: 900px; margin: 0 auto; padding: 24px; }
.detail-header { margin-bottom: 20px; }
.back-btn { color: #64748b; font-size: 13px; margin-bottom: 8px; }
.back-btn:hover { color: #3b82f6; }
.page-title { font-size: 1.25rem; font-weight: 600; color: #1a202c; margin: 0; }

.info-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 20px; }
.info-card-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9; }
.info-header-text { flex: 1; }
.info-username { font-size: 1.1rem; font-weight: 600; color: #1e293b; margin: 0 0 6px; }
.info-roles { display: flex; gap: 6px; flex-wrap: wrap; }

.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.info-item { display: flex; flex-direction: column; gap: 4px; }
.info-item.full { grid-column: 1 / -1; }
.info-label { font-size: 12px; color: #94a3b8; font-weight: 500; }
.info-value { font-size: 14px; color: #334155; }
.info-value.points { color: #f59e0b; font-weight: 600; }
.info-value.mono { font-family: monospace; letter-spacing: 0.03em; }
.text-danger { color: #ef4444; font-weight: 600; }

.save-row { margin-top: 20px; padding-top: 16px; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; }

.section-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 20px; }
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.section-title { font-size: 1rem; font-weight: 600; color: #1e293b; margin: 0; }

.role-list { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.role-item-wrap { display: flex; align-items: center; gap: 4px; }
.expire-hint { font-size: 11px; color: #94a3b8; }
.expire-edit-row { display: flex; align-items: center; gap: 8px; margin: 12px 0; padding: 12px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; flex-wrap: wrap; }
.expire-edit-label { font-size: 13px; color: #334155; font-weight: 500; }
.role-add-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
.empty-hint { color: #94a3b8; font-size: 14px; text-align: center; padding: 24px 0; }
.empty-hint-inline { color: #94a3b8; font-size: 13px; }

.violation-form { margin-bottom: 16px; padding: 12px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; }
.violation-form-row { display: flex; align-items: center; gap: 8px; }

.violation-list { display: flex; flex-direction: column; gap: 10px; }
.violation-item { padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; }
.violation-item.revoked { opacity: 0.6; background: #f1f5f9; border-style: dashed; }
.violation-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.violation-header-left { display: flex; align-items: center; gap: 6px; }
.violation-time { font-size: 12px; color: #94a3b8; }
.violation-reason { font-size: 13px; color: #475569; line-height: 1.5; }
.violation-actions { margin-top: 6px; display: flex; justify-content: flex-end; }
</style>
