<template>
  <div class="filter-bar">
    <div class="filter-left">
      <n-select
        v-model:value="modelValue.tags"
        multiple
        filterable
        placeholder="选择标签筛选"
        :options="tagOptions"
        style="width: 200px"
        clearable
        :max-tag-count="1"
      />

      <n-select
        v-model:value="modelValue.sortType"
        :options="resourceOptions"
        style="width: 160px"
        @update:value="handleSearch"
      />

      <button
        class="follow-btn"
        :class="{ active: modelValue.isFollowing, disabled: !loggedIn }"
        :disabled="!loggedIn"
        @click="toggleFollowing"
      >
        <span class="heart-icon">{{ modelValue.isFollowing ? '♥' : '♡' }}</span>
        我收藏的
      </button>

      <div class="search-wrap">
        <span class="search-icon">🔍</span>
        <input
          v-model="modelValue.keyword"
          class="search-input"
          placeholder="搜索工具关键字..."
          @keyup.enter="handleSearch"
        />
        <span v-if="modelValue.keyword" class="search-clear" @click="modelValue.keyword = ''; handleSearch()">✕</span>
      </div>

      <div class="search-wrap no-num">
        <span class="search-icon">🔢</span>
        <input
          v-model="modelValue.no"
          class="search-input"
          placeholder="工具编号..."
          @keyup.enter="handleSearch"
        />
        <span v-if="modelValue.no" class="search-clear" @click="modelValue.no = ''; handleSearch()">✕</span>
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
import { NSelect } from 'naive-ui';
import { computed } from 'vue';

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  tagOptions: { type: Array, default: () => [] },
});
const emit = defineEmits(['update:modelValue', 'search']);
const user = useUser();
const loggedIn = computed(() => !!user.value);

const resourceOptions = [
  { label: '全部', value: 'all' },
  { label: '免费', value: 'FREE' },
  { label: '消耗工具点数', value: 'CASH_POINT' },
  { label: 'VIP', value: 'VIP' },
  { label: '小班专属', value: 'SMALL_CLASS' },
  { label: '内部', value: 'INTERNAL' },
];

const toggleFollowing = () => {
  if (!loggedIn.value) {
    return;
  }
  props.modelValue.isFollowing = !props.modelValue.isFollowing;
  handleSearch();
};

const handleSearch = () => {
  props.modelValue.resourceType = props.modelValue.sortType === 'all' ? null : props.modelValue.sortType;
  props.modelValue.collectionFlag = props.modelValue.isFollowing ? 1 : null;
  emit('update:modelValue', props.modelValue);
  emit('search');
};
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
.follow-btn.disabled,
.follow-btn:disabled {
  background: #f5f7fa;
  border-color: #e5e7eb;
  color: #b0b7c3;
  cursor: not-allowed;
}
.follow-btn.disabled:hover,
.follow-btn:disabled:hover {
  border-color: #e5e7eb;
  color: #b0b7c3;
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
  min-width: 220px;
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
.no-num .search-input { width: 110px; }
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
  .filter-left {
    flex-wrap: wrap;
  }
  .filter-actions {
    width: 100%;
    justify-content: flex-start;
    margin-left: 0;
  }
}
</style>
