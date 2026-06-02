<template>
  <div class="page-wrapper">
    <!-- 面包屑 -->
    <n-breadcrumb class="breadcrumb">
      <n-breadcrumb-item>
        <nuxt-link to="/">首页</nuxt-link>
      </n-breadcrumb-item>
      <n-breadcrumb-item>
        <nuxt-link to="/usefull/list">实用网站</nuxt-link>
      </n-breadcrumb-item>
      <n-breadcrumb-item>提交网站申请</n-breadcrumb-item>
    </n-breadcrumb>

    <div class="form-card">
      <h2 class="form-title">提交网站申请</h2>

      <n-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-placement="top"
        class="form-body"
      >
        <!-- 网站名称 -->
        <n-form-item label="网站名称" path="name">
          <n-input
            v-model:value="form.name"
            placeholder="请输入网站名称（如：GitHub）"
            clearable
            size="large"
          />
        </n-form-item>

        <!-- 网站链接 -->
        <n-form-item label="网站链接" path="url">
          <n-input
            v-model:value="form.url"
            placeholder="请输入网站链接（以 http:// 或 https:// 开头）"
            clearable
            size="large"
          />
        </n-form-item>

        <!-- 网站描述 -->
        <n-form-item label="网站描述" path="description">
          <n-input
            v-model:value="form.description"
            type="textarea"
            placeholder="请简要描述该网站的用途（选填）"
            :rows="4"
            size="large"
          />
        </n-form-item>

        <!-- Logo 地址 -->
        <n-form-item label="Logo 图片地址" path="logoUrl">
          <n-input
            v-model:value="form.logoUrl"
            placeholder="请输入 Logo 图片 URL（选填）"
            clearable
            size="large"
          />
        </n-form-item>

        <!-- 标签 -->
        <n-form-item label="标签" path="tagNames">
          <n-select
            v-model:value="form.tagNames"
            multiple
            filterable
            tag
            placeholder="选择或输入标签（可新建，按 Enter 确认）"
            :options="tagOptions"
            size="large"
            clearable
            :max-tag-count="5"
          />
        </n-form-item>

        <!-- 按钮组 -->
        <div class="btn-group">
          <n-button size="large" @click="goBack">返回列表</n-button>
          <n-button
            type="primary"
            size="large"
            :loading="submitting"
            @click="handleSubmit"
          >提交申请</n-button>
        </div>
      </n-form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { createDiscreteApi, NForm, NFormItem, NInput, NSelect, NButton, NBreadcrumb, NBreadcrumbItem } from 'naive-ui'
import { apiWebsiteTags, apiWebsiteSubmit } from '~/composables/Api/UseFull/usefull'

const formRef   = ref(null)
const submitting = ref(false)
const tagOptions = ref([])

const form = ref({
  name: '',
  url: '',
  description: '',
  logoUrl: '',
  tagNames: [],
})

const formRules = {
  name: [
    { required: true, message: '请输入网站名称', trigger: 'blur' },
    { min: 1, max: 50, message: '名称长度 1-50 个字符', trigger: 'blur' },
  ],
  url: [
    { required: true, message: '请输入网站链接', trigger: 'blur' },
    {
      pattern: /^https?:\/\/.+/,
      message: '链接必须以 http:// 或 https:// 开头',
      trigger: 'blur',
    },
  ],
}

const loadTags = async () => {
  try {
    const res = await apiWebsiteTags()
    if (res?.code === 200) {
      tagOptions.value = (res.data || []).map(t => ({
        label: t.tagName,
        value: t.tagName,
      }))
    }
  } catch (e) {
    console.error('加载标签失败', e)
  }
}

const handleSubmit = async () => {
  const { message } = createDiscreteApi(['message'])
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  submitting.value = true
  try {
    const body = {
      name: form.value.name.trim(),
      url: form.value.url.trim(),
      description: form.value.description?.trim() || undefined,
      logoUrl: form.value.logoUrl?.trim() || undefined,
      tagNames: form.value.tagNames?.length ? form.value.tagNames : undefined,
    }
    const res = await apiWebsiteSubmit(body)
    if (res?.code === 200) {
      message.success('提交成功，请等待管理员审核')
      navigateTo('/usefull/list')
    } else {
      message.error(res?.msg || '提交失败')
    }
  } catch (e) {
    message.error(e?.data?.msg || e?.message || '提交失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}

const goBack = () => navigateTo('/usefull/list')

onMounted(() => {
  loadTags()
})
</script>

<style scoped>
.page-wrapper {
  width: 100%;
  padding: 30px 20px;
  box-sizing: border-box;
  background: #f5f7fa;
  min-height: calc(100vh - 40px);
}

.breadcrumb {
  margin-bottom: 24px;
  font-size: 14px;
}

.form-card {
  background: #fff;
  padding: 32px 40px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  box-sizing: border-box;
  max-width: 760px;
}

.form-title {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 28px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.form-body {
  width: 100%;
}

.btn-group {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 8px;
}

@media (max-width: 768px) {
  .page-wrapper { padding: 16px 12px; }
  .form-card { padding: 20px 16px; }
  .form-title { font-size: 17px; }
  .btn-group { justify-content: stretch; }
  .btn-group :deep(.n-button) { flex: 1; }
}
</style>
