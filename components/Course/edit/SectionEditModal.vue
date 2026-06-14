<template>
  <n-modal
    :show="show"
    preset="card"
    :title="`编辑小节：${section?.title || ''}`"
    style="width: 720px"
    :segmented="{ content: true }"
    @update:show="$emit('update:show', $event)"
  >
    <n-tabs v-model:value="activeTab" type="line">
      <!-- 基本信息 -->
      <n-tab-pane name="info" tab="基本信息">
        <n-form :model="form" label-placement="left" label-width="80" style="margin-top:12px">
          <n-form-item label="小节标题" required>
            <n-input v-model:value="form.title" placeholder="请输入小节标题" />
          </n-form-item>
          <n-form-item label="免费试看">
            <n-switch v-model:value="form.freeFlag" :checked-value="1" :unchecked-value="0">
              <template #checked>免费</template>
              <template #unchecked>付费</template>
            </n-switch>
          </n-form-item>
          <n-form-item v-if="section?.sectionType !== 'video'" label="图文内容">
            <n-input
              v-model:value="form.content"
              type="textarea"
              placeholder="请输入图文内容"
              :autosize="{ minRows: 8, maxRows: 16 }"
            />
          </n-form-item>
        </n-form>
      </n-tab-pane>

      <!-- 视频（仅视频类型显示） -->
      <n-tab-pane v-if="section?.sectionType === 'video'" name="video" tab="视频">
        <div style="margin-top:12px">
          <!-- 已有视频 -->
          <div v-if="videoInfo" class="video-card">
            <div class="v-thumb" @click="showPreview = true">
              <img v-if="videoInfo.coverUrl" :src="videoInfo.coverUrl" class="v-img" />
              <div v-else class="v-empty"><n-icon size="32" color="#ccc"><VideocamOutline /></n-icon></div>
              <div class="v-play-mask"><n-icon size="28" color="#fff"><PlayCircleOutline /></n-icon></div>
            </div>
            <div class="v-meta">
              <p class="v-name">{{ videoInfo.fileName || '视频文件' }}</p>
              <p v-if="videoInfo.duration" class="v-info">时长：{{ fmtDuration(videoInfo.duration) }}</p>
              <p v-if="videoInfo.fileSize" class="v-info">大小：{{ fmtSize(videoInfo.fileSize) }}</p>
              <n-button size="small" secondary style="margin-top:8px" @click="videoRef?.click()">
                <template #icon><n-icon><RefreshOutline /></n-icon></template>重新上传
              </n-button>
            </div>
          </div>
          <!-- 上传区 -->
          <div v-else class="upload-zone" @click="videoRef?.click()" @dragover.prevent @drop.prevent="onDrop">
            <template v-if="!uploading">
              <n-icon size="48" color="#ccc"><CloudUploadOutline /></n-icon>
              <p class="uz-hint">点击或拖拽视频文件上传</p>
              <p class="uz-sub">支持 MP4 / MOV / AVI，建议 ≤ 2GB</p>
            </template>
            <template v-else>
              <n-spin size="medium" />
              <p style="margin-top:12px;color:#666">上传中 {{ progress }}%</p>
              <n-progress type="line" :percentage="progress" style="width:240px;margin-top:8px" />
            </template>
          </div>
          <input ref="videoRef" type="file" accept="video/*" style="display:none" @change="onVideoChange" />

          <!-- 补充文档 -->
          <n-form-item label="补充说明" label-placement="left" label-width="80" style="margin-top:16px">
            <n-input
              v-model:value="form.content"
              type="textarea"
              placeholder="可补充文字说明、代码示例等（可选）"
              :autosize="{ minRows: 4, maxRows: 10 }"
            />
          </n-form-item>
        </div>
      </n-tab-pane>

      <!-- 课程资料 -->
      <n-tab-pane name="material" tab="课程资料">
        <div style="margin-top:12px">
          <div class="mat-toolbar">
            <n-button size="small" secondary :loading="matUploading" @click="matRef?.click()">
              <template #icon><n-icon><AddOutline /></n-icon></template>上传资料
            </n-button>
          </div>
          <input ref="matRef" type="file" style="display:none" @change="onMatChange" />
          <n-empty v-if="materials.length === 0" description="暂无资料" size="small" style="padding:24px 0" />
          <div v-else class="mat-list">
            <div v-for="(mat, idx) in materials" :key="mat.id || idx" class="mat-row">
              <n-icon size="18" color="#78909c"><DocumentOutline /></n-icon>
              <span class="mat-name">{{ mat.materialName || mat.name }}</span>
              <n-tag v-if="mat.fileType" size="tiny">{{ mat.fileType }}</n-tag>
              <n-button text size="small" @click="handleDownloadMat(mat)"><n-icon><DownloadOutline /></n-icon></n-button>
              <n-button text size="small" type="error" @click="deleteMat(mat, idx)"><n-icon><TrashOutline /></n-icon></n-button>
            </div>
          </div>
        </div>
      </n-tab-pane>
    </n-tabs>

    <template #footer>
      <n-space justify="end">
        <n-button @click="$emit('update:show', false)">取消</n-button>
        <n-button type="primary" :loading="saving" @click="handleSave">
          <template #icon><n-icon><SaveOutline /></n-icon></template>保存
        </n-button>
      </n-space>
    </template>
  </n-modal>

  <!-- 视频预览 -->
  <n-modal v-model:show="showPreview" preset="card" title="视频预览" style="width:760px">
    <video
      v-if="videoInfo?.videoUrl"
      :src="videoInfo.videoUrl"
      controls
      controlsList="nodownload"
      oncontextmenu="return false"
      style="width:100%;border-radius:4px"
    />
  </n-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { createDiscreteApi } from 'naive-ui';
import {
  SaveOutline, RefreshOutline, AddOutline, VideocamOutline,
  CloudUploadOutline, PlayCircleOutline, DownloadOutline, TrashOutline, DocumentOutline,
} from '@vicons/ionicons5';
import { fetchConfig } from '~/composables/useHttp';
import { getAuthHeaders, apiUploadVideo, apiGetSectionVideo, apiUploadMaterial, apiDeleteMaterial, apiGetVideoUrls, apiGetMaterialUrl, normalizeSectionFreeFlag } from '~/composables/Api/Course/course';

const props = defineProps<{ show: boolean; section: any; courseId: string }>();
const emit = defineEmits(['update:show', 'saved']);

const { message, dialog } = createDiscreteApi(['message', 'dialog']);

const activeTab = ref('info');
const saving = ref(false);
const form = reactive({ title: '', freeFlag: 0, content: '' });

// 视频
const videoInfo = ref<any>(null);
const videoRef = ref<HTMLInputElement | null>(null);
const uploading = ref(false);
const progress = ref(0);
const showPreview = ref(false);
const videoRelativePath = ref('');

// 资料
const materials = ref<any[]>([]);
const matRef = ref<HTMLInputElement | null>(null);
const matUploading = ref(false);

// 打开时初始化，section 或 show 变化都重新加载
watch([() => props.show, () => props.section?.id], async ([show]) => {
  if (!show || !props.section) return;  activeTab.value = 'info';
  form.title = props.section.title || '';
  form.freeFlag = normalizeSectionFreeFlag(props.section.freeFlag);
  form.content = props.section.content || props.section.textContent || '';
  videoInfo.value = null;
  videoRelativePath.value = '';
  materials.value = [];

  if (props.section.sectionType === 'video') {
    try {
      const res: any = await apiGetSectionVideo(props.section.id);
      if (res?.code === 200 && res.data) {
        videoInfo.value = res.data;
        // 用临时URL接口获取可播放地址
        try {
          const urlRes: any = await apiGetVideoUrls(props.section.id, 60);
          if (urlRes?.code === 200 && urlRes.data) {
            videoInfo.value = { ...videoInfo.value, videoUrl: urlRes.data[props.section.id] || urlRes.data };
          }
        } catch {}
      }
    } catch {}
  }
  // 对应后端 GET /pc/course/{courseId}/materials (CourseManageController)
  try {
    const res: any = await $fetch(`/course/${props.courseId}/materials`, {
      baseURL: fetchConfig.baseURL, headers: getAuthHeaders(),
    });
    if (res?.code === 200) materials.value = res.data || [];
  } catch {}
});

// 视频上传
function onDrop(e: DragEvent) { const f = e.dataTransfer?.files?.[0]; if (f) uploadVideo(f); }
function onVideoChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (f) uploadVideo(f);
  (e.target as HTMLInputElement).value = '';
}
async function uploadVideo(file: File) {
  uploading.value = true;
  progress.value = 0;
  try {
    const sectionIdForUpload = props.section?.id || null;
    const res: any = await apiUploadVideo(
      file,
      file.name,
      sectionIdForUpload,
      (percent) => { progress.value = percent; },
    );
    if (res?.code === 200) {
      message.success('视频上传成功');
      videoRelativePath.value = res.data?.relativePath || '';
      videoInfo.value = { videoUrl: res.data?.url || '', fileName: res.data?.videoName || file.name };
    } else message.error(res?.msg || '上传失败');
  } catch (err: any) {
    message.error(err?.message || '上传失败');
  } finally {
    uploading.value = false;
    progress.value = 0;
  }
}

// 资料
async function onMatChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  matUploading.value = true;
  try {
    const res: any = await apiUploadMaterial(file, file.name);
    if (res?.code === 200) {
      message.success('上传成功');
      materials.value.push({ id: res.data?.materialId, materialName: res.data?.materialName || file.name, fileUrl: res.data?.fileUrl, fileType: res.data?.fileType || file.name.split('.').pop() });
    } else message.error(res?.msg || '上传失败');
  } catch { message.error('上传失败'); }
  finally { matUploading.value = false; (e.target as HTMLInputElement).value = ''; }
}
async function handleDownloadMat(mat: any) {
  if (!mat.id) { window.open(mat.fileUrl, '_blank'); return; }
  try {
    const res: any = await apiGetMaterialUrl(mat.id, 120);
    if (res?.code === 200 && res.data) {
      window.open(res.data, '_blank');
    } else {
      window.open(mat.fileUrl, '_blank');
    }
  } catch {
    window.open(mat.fileUrl, '_blank');
  }
}

function deleteMat(mat: any, idx: number) {  dialog.warning({
    title: '确认删除', content: `删除「${mat.materialName || mat.name}」？`,
    positiveText: '删除', negativeText: '取消',
    onPositiveClick: async () => {
      if (mat.id) { try { await apiDeleteMaterial(mat.id); } catch {} }
      materials.value.splice(idx, 1);
      message.success('已删除');
    },
  });
}

// 保存
async function handleSave() {
  if (!form.title.trim()) { message.warning('请输入小节标题'); return; }
  saving.value = true;
  try {
    const isVideo = props.section?.sectionType === 'video';
    const res: any = await $fetch(isVideo ? '/course/section/video/save' : '/course/section/textContent/save', {
      method: 'POST', baseURL: fetchConfig.baseURL, headers: getAuthHeaders(),
      body: {
        id: props.section?.id,
        courseId: Number(props.courseId),
        parentId: props.section?.parentId || props.section?.chapterId,
        sort: props.section?.sort || 1,
        title: form.title.trim(),
        freeFlag: form.freeFlag,
        content: form.content,
        textContent: form.content,
        mediaUrl: videoRelativePath.value || props.section?.mediaUrl || 'pending',
        fileSize: props.section?.fileSize || 0,
        duration: props.section?.duration || 0,
      },
    });
    if (res?.code === 200) { message.success('保存成功'); emit('saved'); emit('update:show', false); }
    else message.error(res?.msg || '保存失败');
  } catch { message.error('保存失败'); }
  finally { saving.value = false; }
}

const fmtDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const fmtSize = (b: number) => b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
</script>

<style scoped>
.video-card { display: flex; gap: 16px; background: #fafafa; border: 1px solid #eee; border-radius: 8px; padding: 14px; }
.v-thumb {
  position: relative; width: 160px; height: 90px; border-radius: 6px;
  overflow: hidden; background: #111; flex-shrink: 0; cursor: pointer;
}
.v-img { width: 100%; height: 100%; object-fit: cover; }
.v-empty { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; }
.v-play-mask {
  position: absolute; inset: 0; background: rgba(0,0,0,0.3);
  display: flex; justify-content: center; align-items: center;
  opacity: 0; transition: opacity 0.2s;
}
.v-thumb:hover .v-play-mask { opacity: 1; }
.v-meta { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.v-name { font-size: 14px; font-weight: 500; color: #333; margin: 0; }
.v-info { font-size: 13px; color: #888; margin: 0; }

.upload-zone {
  border: 2px dashed #ddd; border-radius: 8px; padding: 40px 20px;
  text-align: center; cursor: pointer; background: #fafafa; transition: all 0.2s;
}
.upload-zone:hover { border-color: #18a058; background: #f0fdf4; }
.uz-hint { margin: 12px 0 4px; font-size: 14px; color: #555; }
.uz-sub { font-size: 12px; color: #bbb; margin: 0; }

.mat-toolbar { margin-bottom: 12px; }
.mat-list { display: flex; flex-direction: column; gap: 8px; }
.mat-row {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; background: #fafafa; border: 1px solid #f0f0f0; border-radius: 6px;
}
.mat-name { flex: 1; font-size: 13px; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
