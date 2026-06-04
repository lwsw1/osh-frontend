<template>
  <div class="filter-bar">
    <div class="filter-left">
      <!-- 标签筛选 -->
      <n-select
        v-model:value="modelValue.tags"
        multiple
        filterable
        remote
        placeholder="选择标签筛选"
        :options="displayTagOptions"
        :loading="tagLoading"
        style="width: 200px"
        clearable
        :max-tag-count="1"
        @search="handleTagSearch"
      />

      <!-- 排序 -->
      <n-select
        v-model:value="modelValue.sortType"
        :options="sortOptions"
        style="width: 160px"
        @update:value="handleSearch"
      />

      <!-- 我收藏的 -->
      <button
        class="follow-btn"
        :class="{ active: modelValue.isFollowing }"
        @click="toggleFollowing"
      >
        <span class="heart-icon">{{ modelValue.isFollowing ? '♥' : '♡' }}</span>
        我收藏的
      </button>
      <!-- 搜索关键字 - 更明显 -->
      <div class="search-wrap">
        <span class="search-icon">🔍</span>
        <input
          v-model="modelValue.keyword"
          class="search-input"
          placeholder="搜索课程关键字..."
          @keyup.enter="handleSearch"
        />
        <span v-if="modelValue.keyword" class="search-clear" @click="modelValue.keyword = ''; handleSearch()">✕</span>
      </div>

      <!-- 课程编号 -->
      <div class="search-wrap no-num">
        <span class="search-icon">🔢</span>
        <input
          v-model="modelValue.courseNo"
          class="search-input"
          placeholder="课程编号..."
          @keyup.enter="handleSearch"
        />
      </div>

      <!-- 查询按钮 -->
      <button class="btn-query" @click="handleSearch">
        🔍 查询
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { NSelect } from 'naive-ui';
import { fetchConfig } from '~/composables/useHttp';
import { getAuthHeaders } from '~/composables/Api/Course/course';

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  tagOptions: { type: Array, default: () => [] },
});
const emit = defineEmits(['update:modelValue', 'search', 'create']);

const tagLoading = ref(false);
const innerTagOptions = ref([]);

const mapTagOptions = (list) => (list || []).map((item) => ({
  label: item.name || item.tagName || String(item),
  value: item.id ?? item,
}));

const loadTags = async (keyword = '') => {
  tagLoading.value = true;
  try {
    const res = await $fetch('/course/tags', {
      baseURL: fetchConfig.baseURL,
      headers: getAuthHeaders(),
      params: keyword ? { keyword } : undefined,
    });
    const list = res?.code === 200 ? (res.data || []) : (Array.isArray(res) ? res : []);
    innerTagOptions.value = mapTagOptions(list);
  } catch (e) {
    console.error('加载标签失败', e);
  } finally {
    tagLoading.value = false;
  }
};

const displayTagOptions = computed(() => {
  const parent = Array.isArray(props.tagOptions) ? props.tagOptions : [];
  if (parent.length > 0) return parent;
  return innerTagOptions.value;
});

let tagSearchTimer = null;
const handleTagSearch = (query) => {
  if (tagSearchTimer) clearTimeout(tagSearchTimer);
  tagSearchTimer = setTimeout(() => {
    loadTags(String(query || '').trim());
  }, 200);
};

watch(
  () => props.tagOptions,
  (list) => {
    if (Array.isArray(list) && list.length > 0) {
      innerTagOptions.value = list;
    }
  },
  { deep: true }
);

onMounted(() => {
  if (!props.tagOptions?.length) {
    loadTags();
  }
});

const sortOptions = [
  { label: '全部', value: 'all' },
  { label: '免费', value: 'FREE' },
  { label: '小班专属', value: 'SAMLL_CLASS' },
  { label: '付费', value: 'CASH_ONLY' },
  { label: 'VIP', value: 'VIP' },
  { label: '内部', value: 'INTERNAL' },
];

const toggleFollowing = () => {
  props.modelValue.isFollowing = !props.modelValue.isFollowing;
  handleSearch();
};

const handleSearch = () => {
  props.modelValue.isFree = props.modelValue.sortType === 'FREE' ? true : null;
  // 全部时清空类型筛选
  if (props.modelValue.sortType === 'all') {
    props.modelValue.isFree = null;
    props.modelValue.courseType = null;
  }
  // 将 sortType 映射为后端 resourceType（all 时传 null）
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
  flex-wrap: wrap;
  flex: 1;
}

/* 我收藏的按钮 */
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

/* 搜索框 - 更明显 */
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
  width: 160px;
}
.search-input::placeholder { color: #aaa; }
.search-clear { font-size: 12px; color: #bbb; cursor: pointer; }
.search-clear:hover { color: #666; }
.no-num .search-input { width: 110px; }

/* 查询按钮 */
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

/* 新增课程 */
.btn-create {
  background: #fff;
  color: #18a058;
  border: 1px solid #18a058;
  border-radius: 6px;
  padding: 7px 16px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}
.btn-create:hover { background: #f0fdf4; }
</style>
