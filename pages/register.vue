<template>
    <n-form class="login-form" ref="formRef" :model="form" :rules="rules" size="large">

        <n-form-item path="email" :show-label="false">
            <n-input v-model:value="form.email" placeholder="邮箱"/>
        </n-form-item>

        <n-form-item path="username" :show-label="false">
            <n-input v-model:value="form.username" placeholder="用户名"/>
        </n-form-item>

        <n-form-item path="password" :show-label="false">
            <n-input v-model:value="form.password" placeholder="密码" type="password"/>
        </n-form-item>

        <n-form-item path="repassword" :show-label="false">
            <n-input v-model:value="form.repassword" placeholder="确认密码" type="password"/>
        </n-form-item>

        <n-form-item :show-label="false">
            <n-input v-model:value="form.inviteCode" placeholder="邀请码（选填）"/>
        </n-form-item>

        <n-form-item path="uniqueId" :show-label="false">
            <n-input v-model:value="form.uniqueId" placeholder="唯一标识"/>
            <SendCode :email="form.email" :username="form.username" :password="form.password" :repassword="form.repassword" :inviteCode="form.inviteCode"/>
        </n-form-item>

        <div class="button-container">
            <div class="links">
                <n-button class="go-to-button" quaternary type="primary" size="tiny" @click="goLogin">
                    已有账号？去登录
                </n-button>
            </div>
        </div>

        <div>
            <n-button class="submit-button" type="primary" :disabled="!form.email || !form.username || !form.password || !form.repassword || !form.uniqueId" @click="onSubmit" :loading="loading">
                注册
            </n-button>
        </div>

        <div class="agreement-container">
            注册即同意
            <n-button quaternary type="primary" size="tiny">《服务协议》</n-button>
            和
            <n-button quaternary type="primary" size="tiny">《隐私政策》</n-button>
        </div>
    </n-form>
</template>

<script setup>
import {
    NForm,
    NFormItem,
    NInput,
    NButton,
    createDiscreteApi
} from "naive-ui"

const route = useRoute()

useHead({ title: '注册' })

const formRef = ref(null)
const loading = ref(false)

const form = reactive({
    username: "",
    password: "",
    repassword: "",
    email: "",
    uniqueId: "",
    inviteCode: ""
})

// 从 URL query 中读取邀请码并自动填入
onMounted(() => {
    const code = route.query.code || route.query.inviteCode || ''
    if (code) {
        form.inviteCode = code
    }
})

const rules = {
    email: [
        { required: true, message: "请输入邮箱" },
        {
            validator: (_rule, value) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value),
            message: "请输入有效邮箱格式",
            trigger: ["input", "blur"]
        }
    ],
    username: [
        { required: true, message: "请输入用户名" },
        {
            validator: (_rule, value) => /^[a-zA-Z][a-zA-Z0-9_]{3,19}$/.test(value),
            message: "用户名必须是4-20位字母、数字、下划线组成，且以字母开头",
            trigger: ["input", "blur"]
        }
    ],
    password: [
        { required: true, message: "请输入密码" },
        {
            validator: (_rule, value) => {
                if (value.length < 8 || value.length > 20) return false
                return /[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value)
            },
            message: "密码必须是8-20位，且包含大小写字母和数字",
            trigger: ["input", "blur"]
        }
    ],
    repassword: [
        { required: true, message: "请输入确认密码" },
        {
            validator: (_rule, value) => value === form.password,
            message: "两次密码输入不一致",
            trigger: ["input", "blur"]
        }
    ],
    uniqueId: [
        { required: true, message: "请输入唯一标识" }
    ]
}

const goLogin = () => {
    navigateTo('/login')
}

const onSubmit = () => {
    formRef.value.validate(async (errors) => {
        if (errors) return

        loading.value = true
        let { data, error } = await useRegApi(form.uniqueId)
        loading.value = false

        if (error.value) return

        const { message } = createDiscreteApi(["message"])
        if (data.value != null) {
            message.success("注册成功，请登录")
            navigateTo('/login')
        } else {
            message.error("注册失败")
        }
    })
}

useEnterEvent(() => onSubmit())

definePageMeta({
    layout: "login",
    title: "注册"
})
</script>

<style scoped>
.login-form {
    width: 100%;
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
    letter-spacing: 0.5px;
    transition: all 0.3s ease;
}

.submit-button:hover {
    background-color: #0056b3 !important;
    border-color: #0056b3 !important;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 123, 255, 0.3);
}

.button-container {
    display: flex;
    justify-content: space-between;
    margin: 1rem 0;
}

.links {
    display: flex;
    justify-content: space-between;
    width: 100%;
}

.go-to-button {
    color: #007bff;
    font-size: 0.9rem;
}

.agreement-container {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    font-size: 0.75rem;
    margin-top: 1.25rem;
    color: #6b7280;
    line-height: 1.5;
}

.agreement-container .n-button {
    color: #007bff;
    padding: 0;
    margin: 0 0.25rem;
    font-size: 0.75rem;
    font-weight: 400;
}
</style>
