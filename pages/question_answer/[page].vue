<template>
  <div class="qna-page">
    <div class="qna-inner">
      <div class="breadcrumb">
        <span class="bc-item" @click="$router.push('/')">🏠 首页</span>
        <span class="bc-sep">›</span>
        <span class="bc-current">💬 问答社区</span>
      </div>

      <QuestionAnswerList
        :key="listKey"
        @to-detail="handleToDetail"
        @open-create="showCreate = true"
      />
    </div>
    
    <QuestionAnswerCreateModal
      v-model:show="showCreate"
      @success="handleCreateSuccess"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const showCreate = ref(false);
const listKey = ref(0);

function handleToDetail(id) {
  router.push(`/question_answer/detail/${id}`);
}

function handleCreateSuccess() {
  // 刷新列表，但不要整页 reload，避免吞掉“等待审核”提示弹框。
  listKey.value += 1;
}
</script>

<style scoped>
.qna-page { 
  min-height: 100vh; 
  background: #f5f6fa;
}
.qna-inner { 
  max-width: 1200px; 
  margin: 0 auto; 
  padding: 20px 20px 60px; 
}
.breadcrumb { 
  display: flex; 
  align-items: center; 
  gap: 8px; 
  font-size: 14px; 
  color: #999; 
  margin-bottom: 16px; 
}
.bc-item { 
  color: #666; 
  cursor: pointer; 
  transition: color 0.2s;
}
.bc-item:hover { 
  color: #18a058; 
}
.bc-sep { 
  color: #ddd; 
  user-select: none;
}
.bc-current { 
  color: #333; 
  font-weight: 600; 
}
</style>
