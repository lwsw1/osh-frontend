<template>
  <n-form class="login-form" ref="formRef" :model="form" :rules="rules" size="large">
    <div v-if="loadError" class="invite-error">
      <p>{{ loadError }}</p>
      <n-button type="primary" @click="navigateTo('/login')">返回登录</n-button>
    </div>

    <template v-else-if="inviteInfo">
      <div class="invite-info-box">
        <p>您被邀请注册为：<strong>{{ inviteInfo.roleName }}</strong></p>
      </div>

      <n-form-item path="username" :show-label="false">
        <n-input v-model:value="form.username" placeholder="用户名（4-20位，字母开头，字母数字下划线）" />
      </n-form-item>

      <n-form-item :show-label="false">
        <n-input :value="inviteInfo.email" disabled placeholder="邮箱" />
      </n-form-item>

      <n-form-item path="password" :show-label="false">
        <n-input v-model:value="form.password" placeholder="设置密码" type="password" />
      </n-form-item>

      <n-form-item path="repassword" :show-label="false">
        <n-input v-model:value="form.repassword" placeholder="确认密码" type="password" />
      </n-form-item>

      <n-button class="submit-button" type="primary" @click="onSubmit" :loading="loading" :disabled="!form.username || !form.password || !form.repassword">
        确认注册
      </n-button>
    </template>

    <div v-else class="invite-loading">加载中...</div>
  </n-form>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { NForm, NFormItem, NInput, NButton, createDiscreteApi } from 'naive-ui'
import { fetchConfig } from '~/composables/useHttp'

const route = useRoute()
const loading = ref(false)
const loadError = ref('')
const inviteInfo = ref(null)

const form = reactive({
  username: '',
  password: '',
  repassword: ''
})

const rules = {
  username: [
    { required: true, message: '请输入用户名' },
    {
      validator: (_rule, value) => /^[A-Za-z][A-Za-z0-9_]{3,19}$/.test(value),
      message: '用户名必须是4-20位，字母开头，字母数字下划线',
      trigger: ['input', 'blur']
    }
  ],
  password: [
    { required: true, message: '请设置密码' },
    {
      validator: (_rule, value) => {
        if (value.length < 8 || value.length > 20) return false
        return /[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value)
      },
      message: '密码必须是8-20位，且包含大小写字母和数字',
      trigger: ['input', 'blur']
    }
  ],
  repassword: [
    { required: true, message: '请确认密码' },
    {
      validator: (_rule, value) => value === form.password,
      message: '两次密码不一致',
      trigger: ['input', 'blur']
    }
  ]
}

const formRef = ref(null)

async function loadInviteInfo() {
  const token = route.query.token
  if (!token) {
    loadError.value = '邀请链接无效'
    return
  }
  try {
    const res = await $fetch(`${fetchConfig.baseURL}/admin/invite/info?token=${token}`, {
      headers: { appid: fetchConfig.headers.appid }
    })
    if (res?.code === 200 && res?.data) {
      inviteInfo.value = res.data
    } else {
      loadError.value = res?.msg || '邀请链接无效或已过期'
    }
  } catch (e) {
    loadError.value = e?.data?.msg || '邀请链接无效或已过期'
  }
}

async function onSubmit() {
  formRef.value.validate(async (errors) => {
    if (errors) return
    loading.value = true
    try {
      const res = await $fetch(`${fetchConfig.baseURL}/admin/invite/confirm`, {
        method: 'POST',
        headers: { appid: fetchConfig.headers.appid },
        body: {
          token: route.query.token,
          username: form.username,
          password: form.password,
          repassword: form.repassword
        }
      })
      const { message } = createDiscreteApi(['message'])
      if (res?.code === 200) {
        message.success('注册成功，请登录')
        navigateTo('/login')
      } else {
        message.error(res?.msg || '注册失败')
      }
    } catch (e) {
      const { message } = createDiscreteApi(['message'])
      message.error(e?.data?.msg || '注册失败')
    } finally {
      loading.value = false
    }
  })
}

onMounted(() => {
  loadInviteInfo()
})

useHead({ title: '管理员邀请注册' })

definePageMeta({
  layout: 'login',
  title: '邀请注册'
})
</script>

<style scoped>
.login-form { width: 100%; }

.invite-info-box {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  font-size: 14px;
  color: #1e40af;
}

.invite-error {
  text-align: center;
  padding: 40px 0;
  color: #64748b;
}

.invite-loading {
  text-align: center;
  padding: 40px 0;
  color: #94a3b8;
}

.submit-button {
  width: 100%;
  background-color: #007bff !important;
  border-color: #007bff !important;
  color: white !important;
  font-weight: 500;
  border-radius: 4px;
  padding: 0.75rem 0;
  margin-top: 1rem;
  font-size: 1rem;
}
.submit-button:hover {
  background-color: #0056b3 !important;
}
</style>
