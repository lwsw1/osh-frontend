<template>
    <div class="form-container">
        <div class="form-wrapper">
            <h2 class="form-title">编辑用户资料</h2>
            <n-form :model="form" ref="formRef" :rules="rules" label-width="80" label-placement="left" class="form-body">
                <n-form-item label="用户名">
                    <n-input v-model:value="user.username" disabled/>
                </n-form-item>
                <n-form-item label="头像" path="avatar">
                    <uploader v-model="form.avatar"/>
                </n-form-item>
                <n-form-item label="昵称" path="nickname">
                    <n-input v-model:value="form.nickname" placeholder="请输入昵称"/>
                </n-form-item>
                <n-form-item label="GitHub账号" path="githubAccount">
                    <n-input
                        v-model:value="form.githubAccount"
                        placeholder="请输入 GitHub 账号"
                        maxlength="100"
                        show-count
                        clearable
                    />
                </n-form-item>
                <n-form-item label="微信名称" path="wechatName">
                    <n-input
                        v-model:value="form.wechatName"
                        placeholder="请输入微信名称"
                        maxlength="100"
                        show-count
                        clearable
                    />
                </n-form-item>
                <n-form-item label="性别" path="sex">
                    <n-radio-group v-model:value="form.sex" name="sex">
                        <n-space>
                        <n-radio v-for="song in options" :key="song.value" :value="song.value">
                            {{ song.value }}
                        </n-radio>
                        </n-space>
                    </n-radio-group>
                </n-form-item>
                <div class="button-container">
                    <n-button type="primary" @click="onSubmit" :loading="loading" class="submit-btn">提交修改</n-button>
                </div>
            </n-form>
        </div>
    </div>
</template>

<style scoped>
.form-container {
    min-height: 100vh;
    background: linear-gradient(-45deg, #00b4d8, #00c9a7, #00b7bd, #00d2b8);
    background-size: 400% 400%;
    animation: gradientShift 15s ease infinite;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 40px 20px;
    position: relative;
}

@keyframes gradientShift {
    0% {
        background-position: 0% 50%;
    }
    50% {
        background-position: 100% 50%;
    }
    100% {
        background-position: 0% 50%;
    }
}

.form-wrapper {
    background-color: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(10px);
    border-radius: 10px;
    box-shadow: 0 8px 32px rgba(0, 150, 150, 0.2);
    width: 100%;
    max-width: 600px;
    padding: 30px;
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.form-title {
    text-align: center;
    color: #333;
    margin-bottom: 25px;
    font-size: 24px;
    font-weight: 600;
}

.form-body {
    width: 100%;
}

.button-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.submit-btn {
  min-width: 120px;
  margin-top: 10px; /* Add some top margin for better spacing */
}

/* Additional styles for naive-ui overrides */
:deep(.n-form-item-label) {
  color: #333;
}

:deep(.n-input),
:deep(.n-radio) {
  --n-color: rgba(255, 255, 255, 0.9);
  --n-border-color: #00b4d8;
  --n-border-hover: #0077b6;
  --n-border-focus: #0077b6;
}
</style>

<script setup>
import {
    NForm,
    NFormItem,
    NInput,
    NRadio,
    NRadioGroup,
    NButton,
    NSpace,
    createDiscreteApi
} from "naive-ui"
const user = useUser()
const formRef = ref(null)
const form = reactive({
    username:"",
    avatar:"",
    nickname:"",
    sex:"",
    introduction:"",
    githubAccount:"",
    wechatName:""
})

// 初始化form
if(user.value){
    form.username = user.value.username
    form.avatar = user.value.avatar
    form.nickname = user.value.nickname
    form.sex = user.value.sex
    form.introduction = user.value.introduction
    form.githubAccount = user.value.githubAccount
    form.wechatName = user.value.wechatName
}

const rules = {
    nickname:[{
        required: true,
        message: "昵称不能为空"
    }],
    sex:[{
        required: true,
        message:"性别不能为空"
    }]
}

const options = [{
    value:"未知"
},{
    value:"男"
},{
    value:"女"
}]

const loading = ref(false)
const onSubmit = ()=>{
    formRef.value.validate(async (errors)=>{
        if(errors){
            return
        }

        loading.value = true

        const {
            data,
            error
        } = await useUpdateUserInfoApi({
            username: form.username || user.value?.username,
            sex: form.sex,
            introduction: form.introduction,
            githubAccount: form.githubAccount,
            wechatName: form.wechatName,
        })
        loading.value = false

        if(error.value){
            return
        }

        const { message } = createDiscreteApi(["message"])
        message.success("修改成功")

        // 刷新用户信息
        useRefreshUserInfo()

    })
}
</script>
