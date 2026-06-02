<template>
  <div class="filter-bar">
    <div class="filter-left">
      <!-- 标签多选 -->
      <n-select
        v-model:value="modelValue.tagNames"
        multiple
        filterable
        placeholder="选择标签筛选"
        :options="tagOptions"
        style="width: 220px"
        clearable
        :max-tag-count="2"
        @update:value="handleSearch"
      />

      <!-- 我的收藏 -->
      <button
        class="follow-btn"
        :class="{ active: modelValue.isFollowing }"
        @click="toggleFollowing"
      >
        <span class="heart-icon">{{ modelValue.isFollowing ? '♥' : '♡' }}</span>
        我收藏的
      </button>

      <!-- 关键字搜索 -->
      <div class="search-wrap">
        <span class="search-icon">🔍</span>
        <input
          v-model="modelValue.websiteName"
          class="search-input"
          placeholder="搜索网站名称..."
          @keyup.enter="handleSearch"
        />
        <span
          v-if="modelValue.websiteName"
          class="search-clear"
          @click="modelValue.websiteName = ''; handleSearch()"
        >✕</span>
      </div>

      <button class="btn-query" @click="handleSearch">
        🔍 查询
      </button>
    </div>

    <div class="filter-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup>
import { NSelect } from 'naive-ui'

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  tagOptions: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue', 'search'])

const toggleFollowing = () => {
  props.modelValue.isFollowing = !props.modelValue.isFollowing
  handleSearch()
}

const handleSearch = () => {
  emit('update:modelValue', props.modelValue)
  emit('search')
}
</script>

<style scoped>
.filter-bar {
  display: flex;
  align-items: center;
  background: #fff;
  padding: 14px 18px;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
  margin-bottom: 10px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  gap: 12px;
  flex-wrap: wrap;
  width: 100%;
  box-sizing: border-box;
}
.filter-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
  flex-wrap: wrap;
}
.follow-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 14px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background: #fff;
  font-size: 13px;
  color: #555;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.follow-btn:hover { border-color: #18a058; color: #18a058; }
.follow-btn.active {
  background: #f0fdf4;
  border-color: #18a058;
  color: #18a058;
  font-weight: 500;
}
.heart-icon { font-size: 14px; }
.search-wrap {
  display: flex;
  align-items: center;
  background: #f5f7fa;
  border: 1.5px solid #d0d7e3;
  border-radius: 6px;
  padding: 0 10px;
  height: 34px;
  gap: 6px;
  transition: border-color 0.2s, box-shadow 0.2s;
  flex: 1;
  min-width: 200px;
}
.search-wrap:focus-within {
  border-color: #18a058;
  box-shadow: 0 0 0 2px rgba(24,160,88,0.12);
  background: #fff;
}
.search-icon { font-size: 13px; color: #999; flex-shrink: 0; }
.search-input {
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: #333;
  width: 100%;
  min-width: 0;
}
.search-input::placeholder { color: #aaa; }
.search-clear { font-size: 12px; color: #bbb; cursor: pointer; }
.search-clear:hover { color: #666; }
.btn-query {
  background: #18a058;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 7px 18px;
  font-size: 13px;
  cursor: pointer;
  font-weight: 500;
  white-space: nowrap;
  transition: background 0.2s;
}
.btn-query:hover { background: #0e7a3e; }
.filter-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-left: auto;
  flex-shrink: 0;
}
@media (max-width: 980px) {
  .filter-actions {
    width: 100%;
    justify-content: flex-start;
    margin-left: 0;
  }
}
</style>
