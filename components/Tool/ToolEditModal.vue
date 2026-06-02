<template>
  <n-modal
    :show="show"
    preset="card"
    :title="modalTitle"
    style="width: 920px"
    size="huge"
    :segmented="{ content: 'soft', footer: 'soft' }"
    @update:show="$emit('update:show', $event)"
  >
    <n-form label-placement="left" label-width="100">
      <div class="form-grid">
        <n-form-item label="工具名称">
          <n-input v-model:value="formValue.toolName" placeholder="请输入工具名称，如图片转PDF" />
        </n-form-item>
      </div>

      <div class="form-grid">
        <n-form-item label="前端路由">
          <n-input
            v-model:value="formValue.routePath"
            placeholder="请输入站内工具路由，如 /tool/image-to-pdf"
          />
        </n-form-item>
      </div>

      <n-form-item label="工具描述">
        <n-input
          v-model:value="formValue.description"
          type="textarea"
          placeholder="请输入工具简介、使用场景或能力说明"
          :autosize="{ minRows: 3 }"
        />
      </n-form-item>

      <div class="form-grid">
        <n-form-item label="GitHub">
          <n-input v-model:value="formValue.githubUrl" placeholder="可选，GitHub 地址" />
        </n-form-item>
      </div>

      <n-form-item label="工具标签">
        <div class="tag-editor">
          <n-select
            v-model:value="formValue.tags"
            multiple
            filterable
            tag
            :max-tag-count="3"
            placeholder="选择推荐标签，或输入自定义标签后回车（最多3个）"
            :options="tagSelectOptions"
            :on-create="onCreateTag"
            @update:value="handleTagsChange"
          />
          <div v-if="suggestTagNames.length > 0" class="tag-suggest">
            <n-text depth="3" class="tag-suggest-title">推荐标签：</n-text>
            <n-space class="tag-suggest-list" :wrap="true">
              <n-tag
                v-for="tag in suggestTagNames"
                :key="tag"
                :bordered="false"
                class="tag-suggest-item"
                :type="formValue.tags.includes(tag) ? 'success' : 'default'"
                @click="addSuggestTag(tag)"
              >
                {{ tag }}
              </n-tag>
            </n-space>
          </div>
        </div>
      </n-form-item>

      <div class="form-grid">
        <n-form-item label="资源类型">
          <n-select
            v-model:value="formValue.resourceType"
            :options="resourceTypeOptions"
            placeholder="请选择资源类型"
          />
        </n-form-item>

        <n-form-item label="资源等级">
          <n-input-number v-model:value="formValue.level" :min="1" :max="99" style="width: 100%" />
        </n-form-item>
      </div>

      <n-form-item label="备注">
        <n-input v-model:value="formValue.remark" placeholder="可选，后台备注" />
      </n-form-item>

      <n-form-item v-if="showPackageEditor" label="售卖套餐">
        <div class="package-editor">
          <div
            v-for="(item, index) in formValue.packages"
            :key="item.localKey"
            class="package-row"
          >
            <n-input-number v-model:value="item.useCount" :min="1" placeholder="次数" />
            <n-input-number v-model:value="item.price" :min="0" placeholder="现金">
              <template #prefix>￥</template>
            </n-input-number>
            <n-input-number v-model:value="item.sortOrder" placeholder="排序" />
            <n-button tertiary type="error" @click="removePackage(index)">删除</n-button>
          </div>
          <n-button secondary type="primary" @click="addPackage">+ 添加套餐</n-button>
        </div>
      </n-form-item>
    </n-form>

    <template #footer>
      <n-space>
        <n-button type="primary" :loading="loading" :disabled="loading" @click="handleSubmit">{{ submitText }}</n-button>
        <n-button @click="$emit('update:show', false)">取消</n-button>
      </n-space>
    </template>
  </n-modal>

</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { createDiscreteApi } from 'naive-ui';
import {
  NModal, NForm, NFormItem, NInput, NSelect, NSpace,
  NInputNumber, NButton, NTag, NText,
} from 'naive-ui';
import { apiRecommendToolTags, apiSaveTool, apiUpdateTool } from '~/composables/Api/Tool/tool';

const props = defineProps({
  show: Boolean,
  tagOptions: { type: Array, default: () => [] },
  editData: { type: Object, default: null },
});
const emit = defineEmits(['update:show', 'success']);

const { message } = createDiscreteApi(['message']);
const loading = ref(false);
const suggestTagNames = ref([]);

const formValue = reactive({
  id: null,
  toolName: '',
  no: '',
  description: '',
  routePath: '',
  githubUrl: '',
  status: 1,
  remark: '',
  resourceType: 'FREE',
  level: 1,
  tags: [],
  packages: [],
});

const isEdit = computed(() => !!props.editData?.id);
const modalTitle = computed(() => isEdit.value ? '修改工具' : '新增工具');
const submitText = computed(() => isEdit.value ? '保存修改' : '保存并发布');
const tagSelectOptions = computed(() => {
  const options = Array.isArray(props.tagOptions) ? [...props.tagOptions] : [];
  const existingValues = new Set(options.map((item) => String(item.value)));
  formValue.tags.forEach((tag) => {
    const value = String(tag);
    if (!existingValues.has(value)) {
      options.push({ label: value, value });
      existingValues.add(value);
    }
  });
  suggestTagNames.value.forEach((tag) => {
    if (!existingValues.has(tag)) {
      options.push({ label: tag, value: tag });
      existingValues.add(tag);
    }
  });
  return options;
});

const resourceTypeOptions = [
  { label: '免费', value: 'FREE' },
  { label: '付费套餐', value: 'CASH_ONLY' },
  { label: '现金&积分', value: 'CASH_POINT' },
  { label: 'VIP免费', value: 'VIP' },
  { label: '小班免费', value: 'SMALL_CLASS' },
  { label: '内部免费', value: 'INTERNAL' },
];

const MAX_TAG_COUNT = 3;
const MAX_RECOMMEND_TAG_COUNT = 5;
const paidResourceTypes = ['CASH_ONLY', 'CASH_POINT'];
const showPackageEditor = computed(() => paidResourceTypes.includes(formValue.resourceType));

const resourceTypeNumMap = {
  0: 'FREE',
  1: 'FREE',
  2: 'CASH_ONLY',
  3: 'CASH_POINT',
  4: 'VIP',
  5: 'SMALL_CLASS',
  6: 'INTERNAL',
};

watch(() => props.show, (value) => {
  if (value) {
    resetForm();
    loadRecommendTags();
  }
});

watch(() => props.editData, () => {
  if (props.show) resetForm();
});

function resetForm() {
  const source = props.editData || {};
  formValue.id = source.id || null;
  formValue.toolName = source.toolName || '';
  formValue.no = source.no || '';
  formValue.description = source.description || '';
  formValue.routePath = source.routePath || source.route_path || '';
  formValue.githubUrl = source.githubUrl || source.github_url || '';
  formValue.status = source.status ?? 1;
  formValue.remark = source.remark || '';
  formValue.resourceType = normalizeResourceType(source.resourceType || source.resource_type || 'FREE');
  formValue.level = Number(source.level || 1);
  formValue.tags = Array.isArray(source.tags) ? [...source.tags] : [];
  formValue.packages = normalizePackages(source.packages);
}

function normalizeResourceType(resourceType) {
  if (resourceType == null || resourceType === '') {
    return 'FREE';
  }
  const value = String(resourceType).trim();
  if (['FREE', 'CASH_ONLY', 'CASH_POINT', 'VIP', 'SMALL_CLASS', 'INTERNAL'].includes(value)) {
    return value;
  }
  const mappedValue = resourceTypeNumMap[Number(value)];
  return mappedValue || value;
}

function createEmptyPackage() {
  return {
    localKey: `${Date.now()}-${Math.random()}`,
    id: null,
    useCount: 10,
    price: 0,
    status: 1,
    sortOrder: 0,
  };
}

function normalizePackages(packages) {
  if (!Array.isArray(packages)) {
    return [];
  }
  return packages.map((item) => ({
    localKey: `${item.id || 'new'}-${Date.now()}-${Math.random()}`,
    id: item.id || null,
    useCount: Number(item.useCount || item.use_count || 1),
    price: Number(item.price || 0),
    status: item.status ?? 1,
    sortOrder: Number(item.sortOrder || item.sort_order || 0),
  }));
}

function addPackage() {
  formValue.packages.push(createEmptyPackage());
}

function removePackage(index) {
  formValue.packages.splice(index, 1);
}

function handleTagsChange(value) {
  if (Array.isArray(value) && value.length > MAX_TAG_COUNT) {
    formValue.tags = value.slice(0, MAX_TAG_COUNT);
    message.warning(`工具标签最多添加 ${MAX_TAG_COUNT} 个`);
    return;
  }
  formValue.tags = Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

function onCreateTag(inputVal) {
  const tag = (inputVal || '').trim();
  return tag ? { label: tag, value: tag } : false;
}

function addSuggestTag(tag) {
  if (!tag || formValue.tags.includes(tag)) {
    return;
  }
  if (formValue.tags.length >= MAX_TAG_COUNT) {
    message.warning(`工具标签最多添加 ${MAX_TAG_COUNT} 个`);
    return;
  }
  formValue.tags.push(tag);
}

async function loadRecommendTags() {
  try {
    const res = await apiRecommendToolTags();
    const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
    suggestTagNames.value = list
      .map((item) => (typeof item === 'string' ? item : item?.name))
      .filter(Boolean)
      .slice(0, MAX_RECOMMEND_TAG_COUNT);
  } catch (err) {
    console.error('加载工具推荐标签失败:', err);
    suggestTagNames.value = [];
  }
}

async function handleSubmit() {
  if (!formValue.toolName?.trim()) {
    message.error('请输入工具名称');
    return;
  }
  if (!formValue.routePath?.trim()) {
    message.error('请输入站内工具前端路由');
    return;
  }
  if (formValue.tags.length > MAX_TAG_COUNT) {
    message.error(`工具标签最多添加 ${MAX_TAG_COUNT} 个`);
    return;
  }
  const submitPackages = showPackageEditor.value ? formValue.packages : [];
  for (const item of submitPackages) {
    if (!item.useCount || item.useCount <= 0) {
      message.error('套餐次数必须大于0');
      return;
    }
    if (Number(item.price || 0) <= 0) {
      message.error('套餐现金金额必须大于0');
      return;
    }
  }

  loading.value = true;
  try {
    const body = {
      id: formValue.id,
      toolName: formValue.toolName,
      description: formValue.description,
      logoUrl: null,
      routePath: formValue.routePath,
      githubUrl: formValue.githubUrl,
      status: formValue.status,
      remark: formValue.remark,
      resourceType: formValue.resourceType,
      level: formValue.level,
      packages: submitPackages.map((item) => ({
        id: item.id,
        packageName: `${item.useCount}次使用套餐`,
        useCount: item.useCount,
        price: item.price || 0,
        status: item.status ?? 1,
        sortOrder: item.sortOrder || 0,
      })),
      tags: formValue.tags.map((tag) => {
        if (typeof tag === 'string' && isNaN(Number(tag))) return tag;
        const option = props.tagOptions.find((item) => item.value === tag || String(item.value) === String(tag));
        return option ? option.label : String(tag);
      }),
    };
    const res = isEdit.value ? await apiUpdateTool(body) : await apiSaveTool(body);
    if (res?.code === 200) {
      message.success(isEdit.value ? '工具修改成功' : '工具创建成功');
      emit('success');
      emit('update:show', false);
    } else {
      message.error(res?.msg || '保存失败');
    }
  } catch (err) {
    console.error(isEdit.value ? '修改工具失败:' : '新增工具失败:', err);
    message.error('网络异常');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.form-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  column-gap: 18px;
}
.package-editor {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.tag-editor {
  width: 100%;
}
.tag-suggest {
  margin-top: 10px;
}
.tag-suggest-title {
  font-size: 12px;
}
.tag-suggest-list {
  margin-top: 6px;
}
.tag-suggest-item {
  cursor: pointer;
}
.package-row {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) minmax(130px, 1fr) minmax(90px, 0.8fr) auto;
  gap: 8px;
  align-items: center;
}
@media (max-width: 780px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  .package-row {
    grid-template-columns: 1fr;
  }
}
</style>
