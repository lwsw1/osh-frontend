<template>
  <div class="redirect-page">
    <n-result status="info" title="开源项目由 GitHub 数据源同步" description="人工新增入口已停用，请在开源项目列表中配置 GitHub 数据源。">
      <template #footer>
        <n-button type="primary" @click="navigateTo('/openproject/list')">返回开源项目</n-button>
      </template>
    </n-result>
  </div>
</template>

<script setup>
import { NButton, NResult } from 'naive-ui'

onMounted(() => {
  navigateTo('/openproject/list')
})
</script>

<style scoped>
.redirect-page {
  display: flex;
  justify-content: center;
  padding: 80px 20px;
}
</style>
