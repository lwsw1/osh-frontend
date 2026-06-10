<template>
  <div class="editor-page">
    <section class="hero">
      <p class="hero-label">Create Ebook</p>
      <h1>新增电子书</h1>
      <p>封面、章节、图文内容与权限等级一次性编辑完成，正文图片会统一上传到 OSS。</p>
    </section>

    <BookEditor ref="editorRef" @save="handleSave" />

    <div class="action-buttons">
      <n-button class="ghost-btn" @click="goBack">返回列表</n-button>
      <n-button type="primary" class="submit-btn" :loading="saving" @click="submitContent">
        保存电子书
      </n-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { NButton, createDiscreteApi } from 'naive-ui'
import { apiCreateBook } from '~/composables/Api/Book/book'

useHead({ title: '新增电子书' })

const { message } = createDiscreteApi(['message'])
const { hasPermission } = usePermission()
const canCreate = computed(() => hasPermission('book:create'))

const editorRef = ref(null)
const saving = ref(false)

onMounted(() => {
  if (!canCreate.value) {
    message.error('没有新增电子书权限')
    navigateTo('/list/book/1')
  }
})

function submitContent() {
  editorRef.value?.saveToDatabase()
}

async function handleSave(payload) {
  saving.value = true
  try {
    const response = await apiCreateBook(payload)
    if (response?.code && response.code !== 200) {
      throw new Error(response.msg || '创建失败')
    }

    const newBookId = response?.data
    message.success('电子书创建成功')
    navigateTo(newBookId ? `/detail/book/${newBookId}` : '/list/book/1')
  } catch (error) {
    console.error('create book failed', error)
    message.error(error?.data?.msg || error?.message || '创建失败')
  } finally {
    saving.value = false
  }
}

function goBack() {
  navigateTo('/list/book/1')
}
</script>

<style scoped>
.editor-page {
  padding: 24px 0 48px;
}

.hero {
  position: relative;
  overflow: hidden;
  margin-bottom: 20px;
  padding: 28px;
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, rgba(255, 195, 113, 0.32), transparent 28%),
    linear-gradient(135deg, #10213a 0%, #16345b 50%, #0f766e 100%);
  color: #fff;
  box-shadow: 0 26px 60px rgba(15, 23, 42, 0.22);
}

.hero::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(90deg, rgba(15, 23, 42, 0.46) 0%, rgba(15, 23, 42, 0.2) 48%, transparent 100%);
  pointer-events: none;
}

.hero-label {
  position: relative;
  margin: 0 0 10px;
  font-size: 11px;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.86);
}

.hero h1 {
  position: relative;
  margin: 0;
  font-size: clamp(30px, 4vw, 42px);
  color: #f8fafc;
  text-shadow: 0 2px 14px rgba(0, 0, 0, 0.28);
}

.hero p:last-child {
  position: relative;
  margin: 12px 0 0;
  max-width: 680px;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.9);
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 22px;
}

.ghost-btn,
.submit-btn {
  min-width: 180px;
  height: 46px;
  border-radius: 16px;
}

@media (max-width: 768px) {
  .hero {
    padding: 22px;
    border-radius: 22px;
  }

  .action-buttons {
    flex-direction: column;
  }

  .ghost-btn,
  .submit-btn {
    width: 100%;
  }
}
</style>
