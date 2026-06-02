<template>
    <div class="profile-page">
        <h3 class="page-title">基本信息</h3>

        <!-- 头像区域（独立上传，不参与表单提交） -->
        <div class="avatar-section">
            <div class="avatar-section-label">头像</div>
            <div class="avatar-wrap">
                <n-avatar
                    round
                    :size="72"
                    :src="currentAvatar"
                    class="avatar-img"
                />
                <div class="avatar-upload-area">
                    <ClientOnly>
                        <n-upload
                            accept="image/png,image/jpeg,image/gif,image/webp"
                            :action="uploadAction"
                            :headers="uploadHeaders"
                            name="file"
                            :show-file-list="false"
                            :default-file-list="fileList"
                            @before-upload="onBeforeUpload"
                            @finish="onAvatarUploaded"
                            @error="onAvatarError"
                        >
                            <n-button size="small" type="primary" :loading="avatarUploading">
                                {{ avatarUploading ? '上传中...' : '更换头像' }}
                            </n-button>
                        </n-upload>
                    </ClientOnly>
                    <span class="avatar-tip">支持 JPG、PNG、GIF、WebP，最大 3MB</span>
                </div>
            </div>
        </div>

        <n-divider />

        <!-- 当前角色 -->
        <div class="roles-section">
            <div class="roles-section-label">我的角色</div>
            <div class="roles-list" v-if="userRoles.length > 0">
                <div v-for="(r, idx) in userRoles" :key="idx" class="role-item">
                    <n-tag :type="roleTagType(r.roleLevel)" size="small">{{ r.roleName }}</n-tag>
                    <span v-if="r.expireTime" class="role-expire">
                        {{ formatExpireTime(r.expireTime) }}
                    </span>
                </div>
            </div>
            <span v-else class="roles-empty">暂无角色信息</span>
        </div>

        <n-divider />

        <!-- 基本信息表单 -->
        <n-form
            ref="formRef"
            :model="form"
            :rules="rules"
            label-width="90"
            label-placement="left"
            class="info-form"
        >
            <!-- 用户名（可修改） -->
            <n-form-item label="用户名" path="username">
                <n-input
                    v-model:value="form.username"
                    placeholder="请输入用户名"
                    maxlength="20"
                    show-count
                />
            </n-form-item>

            <!-- 邮箱（只读） -->
            <n-form-item label="邮箱">
                <n-input :value="user?.email || '未绑定'" disabled />
            </n-form-item>

            <!-- 性别 -->
            <n-form-item label="性别" path="sex">
                <n-radio-group v-model:value="form.sex" name="sex">
                    <n-space>
                        <n-radio v-for="opt in sexOptions" :key="opt.value" :value="opt.value">
                            {{ opt.label }}
                        </n-radio>
                    </n-space>
                </n-radio-group>
            </n-form-item>

            <!-- 个人简介 -->
            <n-form-item label="个人简介" path="introduction">
                <n-input
                    v-model:value="form.introduction"
                    type="textarea"
                    placeholder="介绍一下自己吧..."
                    :rows="3"
                    maxlength="100"
                    show-count
                />
            </n-form-item>

            <!-- 用户状态（只读展示） -->
            <n-form-item label="账号状态">
                <n-tag :type="statusTag.type" :bordered="false" size="medium">
                    {{ statusTag.text }}
                </n-tag>
                <span class="status-tip">{{ statusTag.tip }}</span>
            </n-form-item>

            <n-form-item>
                <n-button
                    type="primary"
                    :loading="loading"
                    @click="onSubmit"
                    class="submit-btn"
                >
                    保存修改
                </n-button>
            </n-form-item>
        </n-form>
    </div>
</template>

<script setup>
import {
    NForm,
    NFormItem,
    NInput,
    NRadio,
    NRadioGroup,
    NButton,
    NSpace,
    NTag,
    NAvatar,
    NDivider,
    NUpload,
    createDiscreteApi
} from 'naive-ui'

useHead({ title: '基本信息' })

const user = useUser()
const formRef = ref(null)
const loading = ref(false)
const defaultAvatar = DEFAULT_AVATAR

// ── 头像（独立逻辑） ──
const avatarUploading = ref(false)
const fileList = ref([])
const currentAvatar = computed(() => user.value?.avatar || defaultAvatar)

// 上传配置：直接对接后端 /pc/user/upload_avatar
const { action: uploadAction, headers: uploadHeaders } = (() => {
    const token = useCookie('token')
    return {
        action: fetchConfig.baseURL + '/user/upload_avatar',
        headers: {
            appid: fetchConfig.headers.appid,
            token: token.value,
            Authorization: `Bearer ${token.value}`,
        }
    }
})()

function onBeforeUpload() {
    avatarUploading.value = true
    return true
}

function onAvatarUploaded({ event }) {
    avatarUploading.value = false
    fileList.value = []
    try {
        const res = JSON.parse(event.target.response)
        if (res.code === 200 && res.data) {
            user.value = { ...user.value, avatar: res.data }
            const { message } = createDiscreteApi(['message'])
            message.success('头像更新成功')
        } else {
            const { message } = createDiscreteApi(['message'])
            message.error(res.msg || '头像上传失败')
        }
    } catch {
        const { message } = createDiscreteApi(['message'])
        message.error('头像上传失败')
    }
}

function onAvatarError() {
    avatarUploading.value = false
    fileList.value = []
    const { message } = createDiscreteApi(['message'])
    message.error('头像上传失败')
}

// ── 用户角色 ──
const userRoles = ref([])

function roleTagType(level) {
    if (level >= 5) return 'error'
    if (level >= 3) return 'warning'
    return 'info'
}

function formatExpireTime(expireTime) {
    if (!expireTime) return ''
    const str = String(expireTime)
    if (str.startsWith('2099')) return '永久有效'
    const d = new Date(str)
    if (isNaN(d.getTime())) return '到期: ' + str.substring(0, 16)
    return '到期: ' + d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0')
}

async function loadUserRoles() {
    try {
        const token = useCookie('token')
        const res = await $fetch(fetchConfig.baseURL + '/user/roles', {
            headers: {
                appid: fetchConfig.headers.appid,
                token: token.value,
                Authorization: `Bearer ${token.value}`,
            }
        })
        userRoles.value = res?.data || res || []
    } catch {
        userRoles.value = []
    }
}

onMounted(() => { loadUserRoles() })

// ── 基本信息表单（不含头像） ──
const form = reactive({
    username:     user.value?.username     || '',
    sex:          user.value?.sex          || '未知',
    introduction: user.value?.introduction || '',
})

const sexOptions = [
    { label: '未知', value: '未知' },
    { label: '男',   value: '男'   },
    { label: '女',   value: '女'   },
]

const statusTag = computed(() => {
    const count = user.value?.violationCount ?? 0
    if (count >= 3) {
        return { type: 'error',   text: '已拉黑', tip: '账号存在严重违规，部分功能已受限' }
    }
    if (count >= 1) {
        return { type: 'warning', text: '警示中', tip: `已有 ${count} 次违规记录，请遵守社区规范` }
    }
    return { type: 'success', text: '正常', tip: '账号状态良好，无违规记录' }
})

const rules = {
    username: [
        { required: true, message: '用户名不能为空', trigger: ['blur', 'input'] },
        { min: 2, max: 20, message: '用户名长度 2~20 个字符', trigger: ['blur', 'input'] },
    ],
}

const onSubmit = () => {
    formRef.value?.validate(async (errors) => {
        if (errors) return

        loading.value = true

        const { error } = await useUpdateUserInfoApi({
            username:     form.username,
            sex:          form.sex,
            introduction: form.introduction,
        })

        loading.value = false
        if (error.value) return

        const { message } = createDiscreteApi(['message'])
        message.success('保存成功')
        await useRefreshUserInfo()
    })
}
</script>

<style scoped>
.profile-page {
    padding: 1.5rem 2rem 2rem;
}

.page-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 1.5rem;
}

/* 头像区域 */
.avatar-section {
    display: flex;
    align-items: flex-start;
    gap: 0;
    margin-bottom: 0.25rem;
}

.avatar-section-label {
    width: 90px;
    flex-shrink: 0;
    font-size: 0.875rem;
    color: #333;
    padding-top: 0.5rem;
}

.avatar-wrap {
    display: flex;
    align-items: center;
    gap: 1.25rem;
}

.avatar-img {
    flex-shrink: 0;
}

.avatar-upload-area {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.avatar-tip {
    font-size: 0.72rem;
    color: #9ca3af;
}

/* 表单 */
.info-form {
    max-width: 480px;
}

.status-tip {
    font-size: 0.75rem;
    color: #6b7280;
    margin-left: 0.75rem;
    align-self: center;
}

.submit-btn {
    min-width: 120px;
}

/* 角色区域 */
.roles-section {
    display: flex;
    align-items: flex-start;
    gap: 0;
    margin-bottom: 0.25rem;
}

.roles-section-label {
    width: 90px;
    flex-shrink: 0;
    font-size: 0.875rem;
    color: #333;
    padding-top: 0.25rem;
}

.roles-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
}

.role-item {
    display: flex;
    align-items: center;
    gap: 0.375rem;
}

.role-expire {
    font-size: 0.72rem;
    color: #94a3b8;
}

.roles-empty {
    font-size: 0.8rem;
    color: #9ca3af;
}
</style>
