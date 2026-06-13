<template>
  <div class="source-page">
    <n-breadcrumb class="breadcrumb-wrapper">
      <n-breadcrumb-item><nuxt-link to="/">首页</nuxt-link></n-breadcrumb-item>
      <n-breadcrumb-item><nuxt-link to="/openproject/list">开源项目</nuxt-link></n-breadcrumb-item>
      <n-breadcrumb-item>项目源管理</n-breadcrumb-item>
    </n-breadcrumb>

    <div class="toolbar">
      <n-button type="primary" @click="openCreate">新增项目源</n-button>
      <n-button :loading="syncingAll" @click="syncAll">同步全部</n-button>
    </div>

    <n-data-table :columns="columns" :data="sources" :loading="loading" :pagination="false" />

    <n-modal v-model:show="modalVisible" preset="card" title="项目源" class="source-modal">
      <n-form ref="formRef" :model="form" :rules="rules" label-placement="left" label-width="110">
        <n-form-item label="项目源名称">
          <n-input v-model:value="form.sourceName" placeholder="例如 juege-osh" />
        </n-form-item>
        <n-form-item label="GitHub账号" path="githubOwner">
          <n-input v-model:value="form.githubOwner" placeholder="例如 juege-osh" />
        </n-form-item>
        <n-form-item label="来源类型">
          <n-select v-model:value="form.sourceType" :options="sourceTypeOptions" />
        </n-form-item>
        <n-form-item label="访问令牌">
          <n-input v-model:value="form.accessToken" type="password" show-password-on="click" placeholder="公开仓库可不填" />
        </n-form-item>
        <n-form-item label="启用">
          <n-switch v-model:value="form.enabledSwitch" />
        </n-form-item>
        <n-form-item label="备注">
          <n-input v-model:value="form.remark" type="textarea" :rows="3" />
        </n-form-item>
      </n-form>
      <template #footer>
        <div class="modal-actions">
          <n-button @click="modalVisible = false">取消</n-button>
          <n-button type="primary" :loading="saving" @click="saveSource">保存</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { h, onMounted, reactive, ref } from 'vue'
import {
  NBreadcrumb, NBreadcrumbItem, NButton, NDataTable, NForm, NFormItem,
  NInput, NModal, NSelect, NSpace, NSwitch, NTag, createDiscreteApi
} from 'naive-ui'

const { message } = createDiscreteApi(['message'])
const loading = ref(false)
const saving = ref(false)
const syncingAll = ref(false)
const sources = ref([])
const modalVisible = ref(false)
const formRef = ref(null)

const form = reactive({
  id: null,
  sourceName: '',
  githubOwner: '',
  sourceType: 'user',
  accessToken: '',
  enabledSwitch: true,
  remark: '',
})

const sourceTypeOptions = [
  { label: '用户', value: 'user' },
  { label: '组织', value: 'org' },
]

const rules = {
  githubOwner: [{ required: true, message: '请输入 GitHub 账号或组织', trigger: ['blur', 'input'] }],
}

const columns = [
  { title: '名称', key: 'sourceName' },
  { title: 'GitHub', key: 'githubOwner', render: row => h('a', { href: row.githubUrl, target: '_blank' }, row.githubOwner) },
  { title: '类型', key: 'sourceType', render: row => row.sourceType === 'org' ? '组织' : '用户' },
  { title: '状态', key: 'enabled', render: row => h(NTag, { type: row.enabled === 1 ? 'success' : 'default', size: 'small' }, () => row.enabled === 1 ? '启用' : '禁用') },
  { title: '仓库数', key: 'repoCount' },
  { title: '最后同步', key: 'lastSyncTime', render: row => formatTime(row.lastSyncTime) },
  { title: '同步结果', key: 'lastSyncMessage' },
  {
    title: '操作',
    key: 'actions',
    width: 220,
    render: row => h(NSpace, null, () => [
      h(NButton, { size: 'small', onClick: () => openEdit(row) }, () => '编辑'),
      h(NButton, { size: 'small', onClick: () => syncOne(row) }, () => '同步'),
      h(NButton, { size: 'small', type: 'error', onClick: () => removeSource(row) }, () => '删除'),
    ])
  },
]

function resetForm() {
  Object.assign(form, {
    id: null,
    sourceName: '',
    githubOwner: '',
    sourceType: 'user',
    accessToken: '',
    enabledSwitch: true,
    remark: '',
  })
}

function openCreate() {
  resetForm()
  modalVisible.value = true
}

function openEdit(row) {
  Object.assign(form, {
    id: row.id,
    sourceName: row.sourceName || '',
    githubOwner: row.githubOwner || '',
    sourceType: row.sourceType || 'user',
    accessToken: row.accessToken || '',
    enabledSwitch: row.enabled === 1,
    remark: row.remark || '',
  })
  modalVisible.value = true
}

async function loadSources() {
  loading.value = true
  try {
    const res = await apiGetOpenProjectSources()
    sources.value = res?.data || res || []
  } finally {
    loading.value = false
  }
}

function saveSource() {
  formRef.value?.validate(async errors => {
    if (errors) return
    saving.value = true
    try {
      await apiSaveOpenProjectSource({
        id: form.id,
        sourceName: form.sourceName,
        githubOwner: form.githubOwner,
        sourceType: form.sourceType,
        accessToken: form.accessToken,
        enabled: form.enabledSwitch ? 1 : 0,
        remark: form.remark,
      })
      message.success('保存成功')
      modalVisible.value = false
      await loadSources()
    } finally {
      saving.value = false
    }
  })
}

async function syncOne(row) {
  await apiSyncOpenProjectSource(row.id)
  message.success('同步已完成')
  await loadSources()
}

async function syncAll() {
  syncingAll.value = true
  try {
    await apiSyncAllOpenProjectSources()
    message.success('同步已完成')
    await loadSources()
  } finally {
    syncingAll.value = false
  }
}

async function removeSource(row) {
  await apiDeleteOpenProjectSource(row.id)
  message.success('删除成功')
  await loadSources()
}

function formatTime(raw) {
  if (!raw) return '-'
  const d = Array.isArray(raw) ? new Date(raw[0], raw[1] - 1, raw[2], raw[3] || 0, raw[4] || 0) : new Date(raw)
  if (Number.isNaN(d.getTime())) return String(raw)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

onMounted(loadSources)
</script>

<style scoped>
.source-page { max-width: 1400px; margin: 0 auto; padding: 20px; }
.breadcrumb-wrapper { margin-bottom: 20px; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; }
.source-modal { width: 620px; max-width: 92vw; }
.modal-actions { display: flex; justify-content: flex-end; gap: 12px; }
</style>
