<template>
  <div class="page-wrap">
    <!-- 顶部课程信息卡片 -->
    <div class="header-card">
      <div class="cover-box">
        <img :src="coverUrl || 'https://api.dicebear.com/7.x/shapes/svg?seed=1'" class="cover-img" />
      </div>
      <div class="info-box">
        <h1 class="course-title">{{ data.title }}</h1>
        <n-tooltip
          trigger="hover"
          placement="bottom-start"
          :disabled="!isIntroTruncated"
          :style="{ maxWidth: '520px' }"
        >
          <template #trigger>
            <p
              ref="descRef"
              class="course-desc"
              :class="{ 'course-desc--truncated': isIntroTruncated }"
            >{{ courseIntro }}</p>
          </template>
          <div class="course-desc-tooltip">{{ courseIntro }}</div>
        </n-tooltip>
        <div class="meta-row">
          <span class="meta-item">约 {{ data.buyCount || 0 }} 人学习</span>
          <span class="meta-sep">·</span>
          <span class="meta-item price-text">
            {{ Number(data.price) > 0 ? '¥' + data.price : '免费' }}
          </span>
          <template v-if="canUpdate">
            <span class="meta-sep">·</span>
            <span class="meta-item status-chip" :class="`status-${courseStatusTone}`">
              {{ courseStatusText }}
            </span>
          </template>
        </div>
        <div class="btn-row">
          <n-button type="primary" color="#18a058" @click="$emit('pay')">
            {{ isPaid ? '继续学习' : '立即学习' }}
          </n-button>
          <ClientOnly>
            <n-button secondary style="margin-left:10px" @click="openEditBasic" v-if="canUpdate">
              <template #icon><n-icon><CreateOutline /></n-icon></template>
              编辑基础信息
            </n-button>
            <n-button secondary style="margin-left:10px" @click="editMode = !editMode" v-if="canEditContent">
              <template #icon><n-icon><CreateOutline /></n-icon></template>
              {{ editMode ? '退出编辑' : '编辑课程内容' }}
            </n-button>
          </ClientOnly>
        </div>
      </div>
    </div>

    <!-- 课程目录（含编辑功能） -->
    <CourseOutlineManager
      :key="outlineKey"
      :course-id="String(courseId)"
      :edit-mode="editMode"
      :access-level="data.accessLevel || 'TRIAL'"
    />

    <!-- 编辑基础信息弹窗 -->
    <CourseEditModal
      v-model:show="showEditBasic"
      :tag-options="tagOptions"
      :init-data="editInitData"
      @success="onEditSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { NButton, NIcon, NTooltip } from 'naive-ui';
import { CreateOutline } from '@vicons/ionicons5';
import CourseOutlineManager from '~/components/Course/edit/CourseOutlineManager.vue';
import CourseEditModal from '~/components/Course/CourseEditModal.vue';
import { apiGetMaterialUrl, apiGetCourseMaterials } from '~/composables/Api/Course/course';
import { fetchConfig } from '~/composables/useHttp';

const { permissionList } = usePermission();
const canUpdate = computed(() => permissionList.value.includes('course:update'));
const canEditContent = computed(() => permissionList.value.includes('course:chapter:save'));
const COURSE_STATUS_TEXT_MAP: Record<number, string> = {
  2: '审核中',
  4: '审核通过',
  6: '审核未通过',
  7: '已隐藏',
};

const props = defineProps<{
  data: any;
  isPaid?: boolean;
}>();
const emit = defineEmits(['pay', 'refresh']);

const route = useRoute();
const courseId = route.params.id;
const isPaid = computed(() =>
  props.isPaid || props.data?.buyFlag === 1 || props.data?.accessLevel === 'FULL',
);
const editMode = ref(false);
const descRef = ref<HTMLElement | null>(null);
const isIntroTruncated = ref(false);
const courseIntro = computed(() => props.data?.intro || props.data?.desc || '暂无介绍');

function checkIntroTruncated() {
  const el = descRef.value;
  if (!el || courseIntro.value === '暂无介绍') {
    isIntroTruncated.value = false;
    return;
  }
  isIntroTruncated.value = el.scrollHeight > el.clientHeight + 1;
}

let descResizeObserver: ResizeObserver | null = null;

watch(courseIntro, () => nextTick(checkIntroTruncated));

const courseStatusCode = computed(() => Number(props.data?.status));
const courseStatusText = computed(() => COURSE_STATUS_TEXT_MAP[courseStatusCode.value] || `状态${props.data?.status ?? '-'}`);
const courseStatusTone = computed(() => {
  if (courseStatusCode.value === 4) return 'pass';
  if (courseStatusCode.value === 6) return 'reject';
  if (courseStatusCode.value === 7) return 'pending';
  return 'pending';
});

// 本地课程数据副本，编辑后更新
const localData = ref<any>({ ...props.data });

// 封面临时URL：后端 getCourseDetail 已经把 cover 字段签名成临时 URL 返回，直接用
const coverUrl = ref(props.data?.cover || '');

// 课程资料列表
const courseMaterials = ref<any[]>([]);

onMounted(() => {
  coverUrl.value = props.data?.cover || '';
  nextTick(() => {
    checkIntroTruncated();
    if (typeof ResizeObserver !== 'undefined' && descRef.value) {
      descResizeObserver = new ResizeObserver(() => checkIntroTruncated());
      descResizeObserver.observe(descRef.value);
    }
  });
});

onUnmounted(() => {
  descResizeObserver?.disconnect();
  descResizeObserver = null;
});

// props.data.cover 变化时（保存后父组件刷新数据）直接更新
watch(() => props.data?.cover, (newCover) => {
  if (newCover) {
    coverUrl.value = newCover;
  }
});

// 下载资料
async function downloadMaterial(mat: any) {
  const id = mat.id || mat.materialId;
  if (!id) {
    window.open(mat.fileUrl || mat.url, '_blank');
    return;
  }
  try {
    const res: any = await apiGetMaterialUrl(id, 120);
    if (res?.code === 200 && res.data) {
      window.open(res.data, '_blank');
    } else {
      window.open(mat.fileUrl || mat.url, '_blank');
    }
  } catch {
    window.open(mat.fileUrl || mat.url, '_blank');
  }
}

// ===== 编辑基础信息 =====
const showEditBasic = ref(false);
const tagOptions = ref<any[]>([]);
const editInitData = ref<any>(null);

// 加载标签
const loadTags = async () => {
  if (tagOptions.value.length > 0) return;
  try {
    const res: any = await $fetch('/course/tags', {
      baseURL: fetchConfig.baseURL,
      headers: {
        token: process.client ? (localStorage.getItem('token') || localStorage.getItem('Token') || '') : '',
        appid: fetchConfig.headers.appid,
      },
    });
    const list = res?.code === 200 ? (res.data || []) : [];
    tagOptions.value = list.map((item: any) => ({
      label: item.name || item.tagName,
      value: Number(item.id),  // 统一转数字，和 tagIds 类型一致
    }));
  } catch {}
};

async function openEditBasic() {
  await loadTags();

  // 🔍 诊断：打印课程完整原始数据
  console.log('[EditBasic] 🔍 完整 props.data:', props.data);
  console.log('[EditBasic] 🔍 所有可能的标签字段:', {
    tags: props.data?.tags,
    tagList: props.data?.tagList,
    tagIds: props.data?.tagIds,
    courseTags: props.data?.courseTags,
    courseTagList: props.data?.courseTagList,
  });

  // 加载课程资料列表
  let materials: any[] = [];
  try {
    const matRes: any = await apiGetCourseMaterials(props.data?.id);
    console.log('[EditBasic] 🔍 materials 完整响应:', matRes);
    
    if (matRes?.code !== 200) {
      console.warn('[EditBasic] materials load failed:', matRes?.msg);
    }
    
    // 兼容多种响应格式
    let rawMaterials = [];
    if (matRes?.code === 200) {
      rawMaterials = matRes.data || matRes.rows || [];
    } else if (Array.isArray(matRes)) {
      rawMaterials = matRes;
    }
    
    console.log('[EditBasic] 🔍 解析后的 rawMaterials:', rawMaterials);
    
    materials = rawMaterials.map((m: any) => {
      console.log('[EditBasic] 🔍 单个资料原始数据:', m);
      const storedPath = m.url && !String(m.url).startsWith('http') ? m.url : '';
      return {
        id: m.id || m.materialId,
        name: m.name || m.materialName || m.fileName || '',
        url: String(m.url || '').startsWith('http') ? m.url : (m.downloadUrl || ''),
        relativePath: m.relativePath || storedPath || '',
        size: m.fileSize ? (Number(m.fileSize) / 1024 / 1024).toFixed(2) + ' MB' : (m.size || ''),
        fileSize: m.fileSize || 0,
        type: m.fileType || m.type || m.extension || '',
        download_count: m.downloadCount || m.download_count || 0,
      };
    });
    
    console.log('[EditBasic] 🔍 最终 materials 数组:', materials);
  } catch (e) {
    console.error('[EditBasic] ❌ load materials error:', e);
  }

  // 标签 id 列表：兼容多种格式
  const rawTags = props.data?.tags || props.data?.tagList || props.data?.tagIds 
    || props.data?.courseTags || props.data?.courseTagList || [];
  
  console.log('[EditBasic] 🔍 rawTags:', rawTags);
  
  const tagIds = rawTags.map((t: any) => {
    if (typeof t === 'object' && t !== null) {
      const id = t.id ?? t.tagId ?? t.value ?? t.tag_id;
      console.log('[EditBasic] 🔍 标签对象:', t, '=> id:', id);
      return Number(id);  // 统一转数字
    }
    console.log('[EditBasic] 🔍 标签原始值:', t);
    return Number(t);  // 统一转数字
  }).filter((id: any) => id != null && !isNaN(id));

  console.log('[EditBasic] ✅ 最终 resolved tagIds:', tagIds);

  // 补全 tagOptions：把课程已有标签中不在 tagOptions 里的也加进去（防止手动新增的标签找不到 label 显示数字）
  const existingTagIds = new Set(tagOptions.value.map((o: any) => o.value));
  for (const t of rawTags) {
    if (typeof t === 'object' && t !== null) {
      const id = Number(t.id ?? t.tagId ?? t.value ?? t.tag_id);
      const name = t.name || t.tagName || t.label || '';
      if (id && name && !existingTagIds.has(id)) {
        tagOptions.value.push({ label: name, value: id });
        existingTagIds.add(id);
      }
    }
  }

  editInitData.value = {
    id: props.data?.id,
    title: props.data?.title || '',
    desc: props.data?.intro || props.data?.desc || '',
    cover: coverUrl.value || props.data?.cover || '',
    coverPath: props.data?.cover || '',  // 数据库存的就是相对路径，直接用
    tagIds,
    service_period: props.data?.servicePeriod || props.data?.service_period || 12,
    service_content: props.data?.serviceContent || props.data?.service_content || '源码+文档+网站答疑+专属交流微信群',
    price: props.data?.price || 0,
    tPrice: props.data?.tPrice || props.data?.t_price || 0,
    type: props.data?.type || 'media',
    resourceType: props.data?.resourceType || 'FREE',
    materials,
  };
  showEditBasic.value = true;
}

function onEditSuccess() {
  // 重新加载课程详情，不刷新整页（避免 permissions 状态丢失）
  emit('refresh');
  showEditBasic.value = false;
}
</script>

<style scoped>
.page-wrap {
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px 16px;
}
.header-card {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  display: flex;
  gap: 24px;
  margin-bottom: 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.cover-box { flex-shrink: 0; }
.cover-img {
  width: 260px;
  height: 160px;
  object-fit: cover;
  border-radius: 6px;
  display: block;
}
.info-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.course-title { font-size: 22px; font-weight: 700; margin: 0; color: #1a1a1a; }
.course-desc {
  font-size: 14px;
  color: #666;
  margin: 0;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  cursor: default;
}
.course-desc--truncated {
  cursor: help;
}
.course-desc-tooltip {
  white-space: pre-wrap;
  line-height: 1.6;
  max-width: 520px;
}
.meta-row { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #888; }
.meta-sep { color: #ddd; }
.price-text { color: #18a058; font-weight: 600; }
.status-chip {
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}
.status-pending { background: #fff7e6; color: #d48806; }
.status-pass { background: #f6ffed; color: #389e0d; }
.status-reject { background: #fff1f0; color: #cf1322; }
.btn-row { display: flex; align-items: center; margin-top: 8px; }

/* 资料下载 */
.material-section {
  background: #fff;
  border-radius: 8px;
  padding: 20px 24px;
  margin-top: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.material-header {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 14px;
}
.material-list { display: flex; flex-direction: column; gap: 8px; }
.material-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e8e8e8;
}
.mat-icon { font-size: 16px; flex-shrink: 0; }
.mat-name { flex: 1; font-size: 14px; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mat-type {
  font-size: 12px; color: #888;
  background: #e8e8e8; padding: 2px 8px; border-radius: 10px; flex-shrink: 0;
}
.mat-dl-btn {
  background: #18a058; color: #fff; border: none;
  border-radius: 5px; padding: 5px 14px; font-size: 13px;
  cursor: pointer; flex-shrink: 0; transition: background 0.2s;
}
.mat-dl-btn:hover { background: #0e7a3e; }
</style>
