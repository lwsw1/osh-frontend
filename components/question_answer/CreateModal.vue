<template>
  <n-modal
    :show="show"
    preset="card"
    :title="title"
    style="width: 800px"
    :segmented="{ content: 'soft', footer: 'soft' }"
    @update:show="$emit('update:show', $event)"
  >
    <n-form label-placement="left" label-width="100">
      <n-form-item label="问题类型">
        <n-radio-group v-model:value="formValue.isPaidOnly">
          <n-space>
            <n-radio :value="0">
              <span>🔓 公开问题（所有人可见）</span>
            </n-radio>
            <n-radio :value="1">
              <span>🔒 付费专属（仅付费用户可见）</span>
            </n-radio>
          </n-space>
        </n-radio-group>
      </n-form-item>

      <n-form-item label="资源类型" required>
        <n-select
          v-model:value="formValue.resourceType"
          placeholder="请选择资源类型"
          :options="resourceTypeOptions"
          clearable
          :disabled="lockResource"
        />
      </n-form-item>

      <n-form-item label="资源编号" v-if="formValue.resourceType">
        <n-input-number
          v-model:value="formValue.resourceNo"
          placeholder="请输入资源编号（选填）"
          :min="1"
          style="width: 100%"
          :disabled="lockResource"
        />
      </n-form-item>

      <n-form-item label="问题内容" required>
        <div style="width: 100%">
          <n-input
            v-model:value="formValue.content"
            type="textarea"
            placeholder="详细描述你的问题，包括报错信息、环境等...&#10;&#10;提示：清晰的问题描述能帮助你更快获得解答"
            :autosize="{ minRows: 4, maxRows: 8 }"
            maxlength="200"
            show-count
          />
          <div
            style="margin-top: 8px; font-size: 12px;"
            :style="{ color: contentLength >= 10 ? '#18a058' : '#d03050' }"
          >
            {{ contentHint }}
          </div>
        </div>
      </n-form-item>

      <n-form-item label="标签">
        <div style="width: 100%">
          <n-select
            v-model:value="formValue.tags"
            multiple
            filterable
            tag
            :max-tag-count="5"
            :loading="tagsLoading"
            :options="tagSelectOptions"
            placeholder="选择推荐标签，或输入自定义标签后回车（最多5个）"
            :on-create="onCreateTag"
            @update:value="onTagsChange"
          />
          <div v-if="suggestTags.length > 0" style="margin-top: 10px">
            <n-text depth="3" style="font-size: 12px">推荐标签：</n-text>
            <n-space style="margin-top: 6px" :wrap="true">
              <n-tag
                v-for="t in suggestTags"
                :key="t"
                :bordered="false"
                style="cursor: pointer"
                :type="formValue.tags.includes(t) ? 'success' : 'default'"
                @click="addSuggestTag(t)"
              >
                {{ t }}
              </n-tag>
            </n-space>
          </div>
        </div>
      </n-form-item>
    </n-form>

    <template #footer>
      <n-space justify="end">
        <n-button @click="$emit('update:show', false)">取消</n-button>
        <n-button
          type="primary"
          @click="handlePublish"
          :loading="loading"
          :disabled="!canSubmit"
        >
          立即发布
        </n-button>
      </n-space>
    </template>
  </n-modal>

  <n-modal
    v-model:show="showAuditTip"
    preset="dialog"
    type="success"
    title="新增成功"
    content="新增成功，请等待审核"
    positive-text="知道了"
  />
</template>

<script setup>
import { reactive, ref, computed, watch } from 'vue';
import { createDiscreteApi } from 'naive-ui';
import { apiCreateQuestion, apiGetQnaTags } from '~/composables/Api/QuestionAnswer/qna.js';
import {
  NModal, NForm, NFormItem, NInput, NInputNumber, NSelect, NRadioGroup, NRadio,
  NSpace, NButton, NTag, NText,
} from 'naive-ui';
const props = defineProps({
  show: Boolean,
  presetResourceType: {
    type: String,
    default: '',
  },
  presetResourceNo: {
    type: [Number, String],
    default: null,
  },
  lockResource: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '我要提问',
  },
})
const emit = defineEmits(['update:show', 'success']);

const { message } = createDiscreteApi(['message']);

const loading = ref(false);
const showAuditTip = ref(false);
const suggestTags = ref([]);
const tagsLoading = ref(false);

// 下拉选项：把推荐标签转成 n-select 的 options 格式，value 用标签名（String）
const tagSelectOptions = computed(() =>
  suggestTags.value.map(t => ({ label: t, value: t }))
);

const formValue = reactive({
  resourceType: null,
  resourceNo: null,
  content: '',
  isPaidOnly: 0,
  tags: [],  // 存标签名（String），后端自动 resolve（存在复用，不存在新建）
});

const resourceTypeOptions = [
  { label: '课程', value: 'course' },
  { label: '网站', value: 'website' },
  { label: '电子书', value: 'book' },
];

// 表单验证
const canSubmit = computed(() => {
  return !!formValue.resourceType && formValue.content.trim().length >= 10;
});

const contentLength = computed(() => formValue.content.trim().length)

const contentHint = computed(() => {
  if (contentLength.value >= 10) {
    return '内容长度已满足发布条件'
  }
  return `问题内容至少需要10个字符，当前还差${10 - contentLength.value}个字符`
})

// 监听弹窗打开，加载标签
watch(() => props.show, async (newVal) => {
  if (newVal && suggestTags.value.length === 0) {
    await loadTags();
  }
  if (newVal) {
    applyResourcePreset()
  }
});

watch(
  () => [props.presetResourceType, props.presetResourceNo, props.lockResource],
  () => {
    if (props.show) {
      applyResourcePreset()
    }
  }
)

// 加载推荐标签，suggestTags 存标签名字符串列表
async function loadTags() {
  tagsLoading.value = true;
  try {
    const res = await apiGetQnaTags();
    if (res?.code === 200 && res.data) {
      if (Array.isArray(res.data)) {
        suggestTags.value = res.data
          .map(t => (typeof t === 'string' ? t : t.name))
          .filter(t => t)
          .slice(0, 20);
      }
    }
  } catch (e) {
    console.error('加载标签失败:', e);
  } finally {
    tagsLoading.value = false;
  }
}

// 用户手动输入新标签时的回调（n-select tag 模式），直接用输入的字符串作为 value
function onCreateTag(inputVal) {
  const t = inputVal.trim();
  return t ? { label: t, value: t } : false;
}

// 标签变化时强制限制最多5个
function onTagsChange(val) {
  if (val && val.length > 5) {
    message.warning('最多添加5个标签');
    formValue.tags = val.slice(0, 5);
  }
}

// 点击推荐标签添加
function addSuggestTag(t) {
  if (formValue.tags.includes(t)) return;
  if (formValue.tags.length >= 5) {
    message.warning('最多添加5个标签');
    return;
  }
  formValue.tags.push(t);
}

// 重置表单
function resetForm() {
  formValue.resourceType = null;
  formValue.resourceNo = null;
  formValue.content = '';
  formValue.isPaidOnly = 0;
  formValue.tags = [];
  applyResourcePreset()
}

function applyResourcePreset() {
  if (!props.presetResourceType && !props.presetResourceNo) return
  formValue.resourceType = props.presetResourceType || null
  formValue.resourceNo = props.presetResourceNo ? Number(props.presetResourceNo) : null
}

// 立即发布（改为：创建问题）
async function handlePublish() {
  // 验证
  if (!formValue.content.trim()) {
    message.warning('请输入问题内容');
    return;
  }
  if (formValue.content.trim().length < 10) {
    message.warning('问题描述至少需要10个字符');
    return;
  }
  if (!formValue.resourceType) {
    message.warning('请选择资源类型');
    return;
  }

  loading.value = true;
  try {
    // 构建请求数据
    const requestData = {
      content: formValue.content.trim(),
      resourceType: formValue.resourceType,
      isPaidOnly: String(formValue.isPaidOnly),
    };

    // 可选字段：资源ID
    if (formValue.resourceNo) {
      requestData.resourceNo = Number(formValue.resourceNo);
    }

    // 可选字段：标签
    if (formValue.tags.length > 0) {
      requestData.tags = formValue.tags;
    }

    console.log('创建问题请求数据:', requestData);

    // 创建问题
    const createRes = await apiCreateQuestion(requestData);
    
    console.log('创建问题响应:', createRes);
    
    if (createRes?.code === 200) {
      emit('update:show', false);
      emit('success');
      showAuditTip.value = true;
      setTimeout(resetForm, 300);
    } else {
      message.error(createRes?.msg || '创建失败，请重试');
    }
  } catch (error) {
    console.error('创建问题失败:', error);
    if (error?.data?.msg) {
      message.error(error.data.msg);
    } else if (error?.message) {
      message.error(error.message);
    } else {
      message.error('创建失败，请检查网络后重试');
    }
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
/* 样式保持简洁 */
</style>
