<template>
  <n-modal
    :show="show"
    preset="card"
    :title="formValue.id ? '编辑基础信息' : '课程新增界面'"
    style="width: 1000px"
    size="huge"
    :segmented="{ content: 'soft', footer: 'soft' }"
    @update:show="$emit('update:show', $event)"
  >
    <n-form label-placement="left" label-width="100">
      <n-form-item label="课程标题">
        <n-input v-model:value="formValue.title" placeholder="请输入课程标题" />
      </n-form-item>

      <n-form-item label="课程封面">
        <div class="cover-upload">
          <div v-if="formValue.cover" class="cover-preview" @click="triggerCover">
            <img :src="formValue.cover" class="cover-img" />
            <div class="cover-mask">点击更换</div>
          </div>
          <div v-else class="cover-placeholder" @click="triggerCover" :class="{ loading: coverUploading }">
            {{ coverUploading ? '上传中...' : '+ 点击上传封面' }}
          </div>
          <input ref="coverInputRef" type="file" accept="image/*" style="display:none" @change="handleCoverChange" />
          <span style="font-size:12px;color:#bbb;margin-left:10px">建议 16:9，JPG/PNG，≤5MB</span>
        </div>
      </n-form-item>

      <n-form-item label="课程介绍">
        <n-input
          v-model:value="formValue.desc"
          type="textarea"
          placeholder="请输入课程介绍"
          :autosize="{ minRows: 2 }"
        />
      </n-form-item>

      <n-form-item label="服务周期 (月)">
        <n-input-number
          v-model:value="formValue.service_period"
          :min="0"
          :max="120"
          placeholder="服务周期（月），如 12"
          style="width: 200px"
        />
      </n-form-item>

      <n-form-item label="具体包含服务">
        <n-input
          v-model:value="formValue.service_content"
          placeholder="具体包含服务"
          :theme-overrides="{ textColor: '#999' }"
        />
      </n-form-item>

      <n-form-item label="课程标签">
        <n-select
          v-model:value="formValue.tagIds"
          multiple
          filterable
          tag
          placeholder="选择已有标签或输入新标签后回车"
          :options="mergedTagOptions"
        />
      </n-form-item>

      <n-form-item label="资源类型">
        <n-select
          :key="selectedResourceType"
          v-model:value="selectedResourceType"
          :options="resourceTypeOptions"
          placeholder="请选择资源类型"
          style="width: 200px"
        />
      </n-form-item>

      <n-form-item label="课程价格">        <n-space>
          <n-input-number
            v-model:value="formValue.price"
            :min="0"
            placeholder="实际售价"
          >
            <template #prefix>￥</template>
          </n-input-number>
          <n-text depth="3">原价：</n-text>
          <n-input-number
            v-model:value="formValue.tPrice"
            :min="0"
            placeholder="划线价"
          >
            <template #prefix>￥</template>
          </n-input-number>
        </n-space>
      </n-form-item>

      <div class="material-layout">
        <div class="table-box">
          <n-table size="small" :single-line="false">
            <thead>
              <tr>
                <th>资料名称</th>
                <th>URL</th>
                <th>大小</th>
                <th>类型</th>
                <th>下载</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(f, i) in materialList" :key="i">
                <td>{{ f.name }}</td>
                <td>
                  <n-text depth="3" style="word-break:break-all;font-size:12px">
                    {{ f.url ? f.url.split('?')[0].split('/').pop() : '-' }}
                  </n-text>
                </td>
                <td>{{ f.size }}</td>
                <td>{{ f.type }}</td>
                <td>{{ f.download_count }}</td>
                <td>
                  <n-space>
                    <n-button text type="primary" @click="handleDownload(f)">下载</n-button>
                    <n-button
                      text
                      type="error"
                      @click="handleDeleteMaterial(i, f)"
                      >删除</n-button
                    >
                  </n-space>
                </td>
              </tr>
            </tbody>
          </n-table>
        </div>
        <div class="upload-box">
          <div class="mat-upload-btn" @click="triggerMat" :class="{ loading: matUploading }">
            {{ matUploading ? `上传中 ${matUploadProgress}%` : '⬆ 上传资料' }}
          </div>
          <div v-if="matUploading" class="mat-progress-wrap">
            <div class="mat-progress-bar" :style="{ width: matUploadProgress + '%' }" />
          </div>
          <input ref="matInputRef" type="file" accept=".zip,.rar,.7z" style="display:none" @change="handleMatChange" />
        </div>
      </div>
    </n-form>

    <template #footer>
      <n-space>
        <n-button type="primary" :loading="loading" :disabled="loading" @click="handlePublish">保存并发布</n-button>
        <n-button @click="$emit('update:show', false)">取消</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup>
import { reactive, ref, onMounted, computed, watch } from 'vue';
import { createDiscreteApi } from 'naive-ui';
import {
  apiUploadCover,
  apiUploadMaterial,
  apiGetMaterialUrl,
  apiSaveCourse,
  getAuthHeaders,
} from '~/composables/Api/Course/course';
import { fetchConfig } from '~/composables/useHttp';
import {
  NModal, NForm, NFormItem, NInput, NSelect, NSpace,
  NText, NInputNumber, NButton, NTable,
} from 'naive-ui';

const props = defineProps({
  show: Boolean,
  tagOptions: { type: Array, default: () => [] },
  initData: { type: Object, default: null }, // 编辑时传入，新增时为 null
});
const emit = defineEmits(['update:show', 'success']);

const { message, dialog } = createDiscreteApi(['message', 'dialog']);
const loading = ref(false);
const coverUploading = ref(false);
const matUploading = ref(false);
const matUploadProgress = ref(0);
const coverInputRef = ref(null);
const matInputRef = ref(null);

// 标签列表：优先用父组件传入，否则自己加载
const innerTagOptions = ref([]);
const mergedTagOptions = computed(() => {
  const parent = Array.isArray(props.tagOptions) ? props.tagOptions : [];
  if (parent.length > 0) return parent;
  return innerTagOptions.value;
});

const loadInnerTags = async () => {
  try {
    const res = await $fetch('/course/tags', {
      baseURL: fetchConfig.baseURL,
      headers: getAuthHeaders(),
    });
    const list = res?.code === 200 ? (res.data || []) : (Array.isArray(res) ? res : []);
    innerTagOptions.value = list.map(item => ({
      label: item.name || item.tagName || String(item),
      value: item.id ?? item,
    }));
  } catch (e) {
    console.error('加载标签失败', e);
  }
};

// resourceType 数字→英文 兼容映射（数据库历史数据可能存了数字）
const resourceTypeNumMap = { 0: 'FREE', 1: 'FREE', 2: 'CASH_ONLY', 3: 'CASH_POINT', 4: 'VIP', 5: 'SMALL_CLASS', 6: 'INTERNAL' };
const normalizeResourceType = (val) => {
  if (!val && val !== 0) return 'FREE';
  const str = String(val).trim();
  // 已经是英文枚举值，直接返回
  if (['FREE', 'CASH_ONLY', 'CASH_POINT', 'VIP', 'SMALL_CLASS', 'INTERNAL'].includes(str)) return str;
  // 数字映射
  const num = Number(str);
  if (!isNaN(num) && resourceTypeNumMap[num] !== undefined) return resourceTypeNumMap[num];
  return 'FREE';
};

const formValue = reactive({
  id: null,
  title: '',
  desc: '',
  tagIds: [],
  cover: '',
  coverPath: '',
  service_period: 12,
  service_content: '源码+文档+网站答疑+专属交流微信群',
  price: 0,
  tPrice: 0,
  type: 'media',
});

// 资源类型单独用 ref，避免 reactive 对象属性在 n-select 中响应式失效
const selectedResourceType = ref('FREE');

// 资源类型选项（与后端 CourseResourceEnum 保持一致）
const resourceTypeOptions = [
  { label: '免费', value: 'FREE' },
  { label: '仅现金', value: 'CASH_ONLY' },
  { label: '现金&积分', value: 'CASH_POINT' },
  { label: 'VIP专属', value: 'VIP' },
  { label: '小班专属', value: 'SMALL_CLASS' },
  { label: '内部专属', value: 'INTERNAL' },
];

// 弹窗打开时加载标签，并回显数据
watch(() => props.show, async (val) => {
  if (val) {
    // 每次打开弹窗都刷新标签，避免首次加载失败或 token 未就绪导致 No Data
    await loadInnerTags();
    // 有 initData 时回显（编辑模式），否则重置（新增模式）
    if (props.initData) {
      console.log('[CourseEditModal] initData:', JSON.stringify({
        id: props.initData.id,
        tagIds: props.initData.tagIds,
        materialsLen: props.initData.materials?.length,
      }));
      formValue.id = props.initData.id || null;
      formValue.title = props.initData.title || '';
      formValue.desc = props.initData.desc || '';
      formValue.cover = props.initData.cover || '';
      formValue.coverPath = props.initData.coverPath || '';
      formValue.tagIds = Array.isArray(props.initData.tagIds) ? [...props.initData.tagIds] : [];
      formValue.service_period = props.initData.service_period || 12;
      formValue.service_content = props.initData.service_content || '源码+文档+网站答疑+专属交流微信群';
      formValue.price = props.initData.price || 0;
      formValue.tPrice = props.initData.tPrice || 0;
      formValue.type = props.initData.type || 'media';
      selectedResourceType.value = normalizeResourceType(props.initData.resourceType);
      // 回显资料列表
      materialList.value = Array.isArray(props.initData.materials) ? [...props.initData.materials] : [];
    } else {
      // 新增：重置表单
      formValue.id = null;
      formValue.title = '';
      formValue.desc = '';
      formValue.cover = '';
      formValue.coverPath = '';
      formValue.tagIds = [];
      formValue.service_period = 12;
      formValue.service_content = '源码+文档+网站答疑+专属交流微信群';
      formValue.price = 0;
      formValue.tPrice = 0;
      formValue.type = 'media';
      selectedResourceType.value = 'FREE';
      materialList.value = [];
    }
  }
});

const materialList = ref([]);

/** 触发封面选择 */
const triggerCover = () => coverInputRef.value?.click();

/** 封面上传 */
const handleCoverChange = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { message.warning('封面不能超过 5MB'); return; }
  coverUploading.value = true;
  try {
    const res = await apiUploadCover(file);
    if (res?.code === 200) {
      const d = res.data;
      // 优先用完整 url，其次拼接 baseURL + relativePath，最后直接用 data 字符串
      const fullUrl = d?.url || d?.fileUrl
        || (d?.relativePath ? `${fetchConfig.baseURL.replace('/pc', '')}${d.relativePath}` : null)
        || (typeof d === 'string' ? d : '');
      formValue.cover = fullUrl;
      formValue.coverPath = d?.relativePath || d; // 保存 relativePath 用于提交
      message.success('封面上传成功');
      console.log('[封面上传] res.data:', d, '=> 显示URL:', fullUrl);
    } else {
      message.error(res?.msg || '上传失败');
    }
  } catch (err) {
    console.error('封面上传失败:', err);
    message.error('上传失败');
  }
  finally { coverUploading.value = false; e.target.value = ''; }
};

/** 触发资料选择 */
const triggerMat = () => matInputRef.value?.click();

/** 资料上传 */
const handleMatChange = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (materialList.value.length >= 1) {
    message.warning('只能上传一个资料，请先删除现有资料');
    e.target.value = '';
    return;
  }
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    message.warning('文件大小不应超过 50MB');
    e.target.value = '';
    return;
  }
  matUploading.value = true;
  matUploadProgress.value = 0;
  // 模拟上传进度（定时器推进到90%，完成后跳100%）
  const progressTimer = setInterval(() => {
    if (matUploadProgress.value < 90) matUploadProgress.value += 10;
  }, 200);
  try {
    const res = await apiUploadMaterial(file, file.name);
    clearInterval(progressTimer);
    matUploadProgress.value = 100;
    console.log('[上传资料] res.data:', res?.data);
    if (res?.code === 200) {
      if (!res.data?.relativePath) {
        message.error('资料上传失败：未返回存储路径，请重试');
        return;
      }
      materialList.value.push({
        id: res.data?.materialId,
        name: res.data?.materialName || res.data?.fileName || file.name,
        url: res.data?.url,               // 完整签名URL，仅用于显示
        relativePath: res.data?.relativePath, // 相对路径，提交给后端用
        size: (Number(res.data?.size || file.size) / 1024 / 1024).toFixed(2) + ' MB',
        fileSize: Number(res.data?.size || file.size), // 字节数
        type: res.data?.type || res.data?.fileType || file.name.split('.').pop(),
      });
      message.success('资料上传成功');
    } else {
      message.error(res?.msg || '上传失败');
    }
  } catch { clearInterval(progressTimer); message.error('上传失败'); }
  finally { matUploading.value = false; matUploadProgress.value = 0; e.target.value = ''; }
};

/** 下载资料（获取临时URL，触发浏览器下载弹窗） */
const handleDownload = async (mat) => {
  const download = (url) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = mat.name || 'download';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  if (!mat.id) { download(mat.url); return; }
  try {
    const res = await apiGetMaterialUrl(mat.id, 120);
    download(res?.code === 200 ? res.data : mat.url);
  } catch { download(mat.url); }
};

/** 删除资料（带确认提示） */
const handleDeleteMaterial = (index, mat) => {
  dialog.warning({
    title: '确认删除',
    content: `确定删除资料「${mat.name || '该资料'}」？删除后不可恢复。`,
    positiveText: '确认删除',
    negativeText: '取消',
    onPositiveClick: () => {
      materialList.value.splice(index, 1);
      message.success('资料已删除');
    },
  });
};

/** 保存并发布 */
const handlePublish = async () => {
  // 新增时完整校验，编辑时只校验标题
  if (!formValue.title?.trim()) { message.error('请输入课程标题'); return; }

  if (!formValue.id) {
    // 新增模式：校验必填字段
    if (!formValue.cover && !formValue.coverPath) { message.error('请上传课程封面图片'); return; }
    if (!formValue.desc?.trim()) { message.error('请输入课程介绍'); return; }
    if (formValue.price === null || formValue.price === undefined) { message.error('请输入课程价格'); return; }
    if (formValue.tPrice === null || formValue.tPrice === undefined) { message.error('请输入课程原价'); return; }
    if (!formValue.type) { message.error('请选择课程类型'); return; }
    if (!selectedResourceType.value) { message.error('请选择资源类型'); return; }
  }

  const mat = materialList.value[0];
  if (mat && !mat.id) {
    if (!mat.relativePath || mat.relativePath.startsWith('http')) {
      message.error('资料上传未完成或地址无效，请重新上传资料');
      return;
    }
  }

  loading.value = true;

  // 根据 resourceType 自动推导 freeType
  const resourceType = selectedResourceType.value || 'FREE';
  const freeType = resourceType === 'FREE' ? 0 : 3;

  try {
    // cover 字段：只传相对路径，如果是临时 URL（http开头）说明用户没有重新上传，不传（后端保持原值）
    const coverToSubmit = (() => {
      const path = formValue.coverPath || formValue.cover || '';
      if (!path || path.startsWith('http')) return undefined; // 临时 URL 不传，后端保持原值
      return String(path);
    })();

    const submitData = {
      id: formValue.id || undefined,
      title: formValue.title,
      intro: formValue.desc,
      ...(coverToSubmit !== undefined ? { cover: coverToSubmit } : {}),
      tags: formValue.tagIds.map((id) => {
        // 手动输入的标签：值是字符串本身；已有标签：值是数字id，需要转回name
        if (typeof id === 'string' && isNaN(Number(id))) return id; // 手动输入的新标签
        const opt = mergedTagOptions.value.find((o) => o.value === id || String(o.value) === String(id));
        return opt ? opt.label : String(id);
      }),
      servicePeriod: formValue.service_period,
      serviceContent: formValue.service_content,
      price: formValue.price,
      tPrice: formValue.tPrice,
      type: formValue.type,
      resourceType,
      freeType,
      material: materialList.value[0] ? (() => {
        const mat = materialList.value[0];
        // 已有资料（有 id）：传 materialId 告知后端保留，不重建
        if (mat.id) {
          return {
            materialId: mat.id,
            fileName: mat.name,
            fileUrl: mat.relativePath || 'keep',  // 后端有 materialId 时不会用此字段
            fileType: mat.type || 'zip',
            fileSize: mat.fileSize || 1,
          };
        }
        // 新上传的资料：只传 OSS 相对路径
        return {
          fileName: mat.name,
          fileUrl: mat.relativePath,
          fileType: mat.type || 'zip',
          fileSize: mat.fileSize || 1,
        };
      })() : null,
    };
    const res = await apiSaveCourse(submitData);
    if (res?.code === 200) {
      message.success(formValue.id ? '课程信息已更新！' : '课程创建成功！');
      emit('success');
      emit('update:show', false);
    } else {
      message.error(res?.msg || '保存失败');
    }
  } catch { message.error('网络异常'); }
  finally { loading.value = false; }
};
</script>

<style scoped>
/* 这里拷贝你原来的弹窗相关样式，确保 UI 不变 */
.material-layout {
  display: flex;
  gap: 20px;
  margin-top: 24px;
  border-top: 1px solid #f0f0f0;
  padding-top: 20px;
}
.table-box { flex: 1; }
.upload-box { width: 200px; }
.sub-title { font-weight: bold; margin-bottom: 10px; font-size: 14px; color: #333; }

.cover-upload { display: flex; align-items: center; gap: 0; }
.cover-preview {
  position: relative; width: 160px; height: 90px; border-radius: 4px;
  overflow: hidden; cursor: pointer;
}
.cover-img { width: 100%; height: 100%; object-fit: cover; }
.cover-mask {
  position: absolute; inset: 0; background: rgba(0,0,0,0.4); color: #fff;
  display: flex; justify-content: center; align-items: center; font-size: 13px;
  opacity: 0; transition: opacity 0.2s;
}
.cover-preview:hover .cover-mask { opacity: 1; }
.cover-placeholder {
  width: 160px; height: 90px; border: 2px dashed #ddd; border-radius: 4px;
  display: flex; justify-content: center; align-items: center;
  font-size: 13px; color: #999; cursor: pointer; transition: all 0.2s;
}
.cover-placeholder:hover, .cover-placeholder.loading { border-color: #18a058; color: #18a058; }

.mat-upload-btn {
  border: 2px dashed #ddd; border-radius: 6px; padding: 20px;
  text-align: center; cursor: pointer; font-size: 13px; color: #666;
  transition: all 0.2s;
}
.mat-upload-btn:hover, .mat-upload-btn.loading { border-color: #18a058; color: #18a058; }

.mat-progress-wrap {
  margin-top: 8px;
  height: 4px;
  background: #f0f0f0;
  border-radius: 2px;
  overflow: hidden;
}
.mat-progress-bar {
  height: 100%;
  background: #18a058;
  border-radius: 2px;
  transition: width 0.2s ease;
}
</style>
