<template>
  <div class="outline-wrap">
    <div class="outline-header">
      <div class="outline-title">课程目录</div>
      <div class="header-right">
        <button class="btn-download-mat" @click="toggleMaterials">
          📦 资料下载
        </button>
        <button v-if="editMode" class="btn-green" @click="addChapterInline">+ 新增章节</button>
      </div>
    </div>

    <!-- 资料下载列表 -->
    <div v-if="showMaterials" class="material-panel">
      <div v-if="materialsLoading" class="mat-loading">加载中...</div>
      <div v-else-if="materials.length === 0" class="mat-empty">暂无课程资料</div>
      <div v-else class="mat-list">
        <div v-for="mat in materials" :key="mat.id" class="mat-row">
          <span class="mat-icon">📄</span>
          <span class="mat-name">{{ mat.materialName || mat.name }}</span>
          <span v-if="mat.fileType" class="mat-tag">{{ mat.fileType }}</span>
          <button class="mat-dl-btn" @click="downloadMat(mat)">⬇ 下载</button>
        </div>
      </div>
    </div>

    <div v-if="loading" style="padding:40px;text-align:center">
      <n-spin description="加载目录..." />
    </div>
    <div v-else-if="outline.length === 0 && !addingChapter" style="padding:40px;text-align:center;color:#999">
      暂无章节内容
    </div>

    <div class="chapter-list">
      <!-- 已有章节 -->
      <div v-for="(chapter, ci) in outline" :key="chapter.id" class="chapter-block">
        <!-- 章节行 -->
        <div class="chapter-row" @click="toggleChapter(chapter.id)">
          <span class="collapse-icon">{{ collapsedChapters.has(chapter.id) ? '▶' : '▼' }}</span>
          <span class="chapter-badge">第 {{ ci + 1 }} 章</span>
          <!-- 章节标题：普通显示 or 内联编辑 -->
          <template v-if="editingChapterId === chapter.id">
            <input
              v-model="editingChapterTitle"
              class="inline-input"
              placeholder="章节标题"
              @blur="saveChapter(chapter)"
              @keyup.enter="saveChapter(chapter)"
              @keyup.escape="editingChapterId = null"
              @click.stop
              v-focus
            />
          </template>
          <span v-else class="chapter-name">{{ chapter.title }}</span>
          <span class="chapter-count">{{ (chapter.children || []).length }} 节</span>
          <div v-if="editMode" class="chapter-actions" @click.stop>
            <span class="action-link primary" @click="addSectionInline(chapter)">+ 新增小节</span>
            <span class="action-link" @click="startEditChapter(chapter)">编辑</span>
            <span class="action-link danger" @click="confirmDeleteChapter(chapter)">删除</span>
          </div>
        </div>

        <!-- 小节列表（可折叠） -->
        <div v-show="!collapsedChapters.has(chapter.id)" class="section-list">
          <div v-if="!chapter.children || chapter.children.length === 0" class="no-section">暂无小节</div>
          <div
            v-for="(section, si) in chapter.children || []"
            :key="section.id"
            class="section-row"
            :class="{ clickable: true }"
            @click="!editMode && goToStudy(section)"
          >
            <span class="section-num">{{ ci + 1 }}.{{ si + 1 }}</span>
            <span class="section-dot" :style="{ background: section.sectionType === 'video' ? '#2080f0' : '#18a058' }"></span>
            <span class="section-name">{{ section.title }}</span>
            <span v-if="section.freeFlag === 1" class="free-tag">免费试看</span>
            <div class="section-right">
              <template v-if="!editMode">
                <span v-if="section.freeFlag === 1" class="free-label">免费</span>
                <span v-else-if="accessLevel !== 'FULL'" style="color:#ccc;font-size:13px">🔒</span>
              </template>
              <template v-else>
                <span class="action-link primary" @click.stop="goToLesson(section)">编辑内容</span>
                <span class="action-link danger" @click.stop="confirmDeleteSection(section)">删除</span>
              </template>
            </div>
          </div>

          <!-- 该章节下新增小节的内联输入行 -->
          <div v-if="addingSectionChapterId === chapter.id" class="inline-add-row">
            <span class="section-num">{{ ci + 1 }}.{{ (chapter.children || []).length + 1 }}</span>
            <input
              v-model="newSectionTitle"
              class="inline-input"
              placeholder="输入小节标题，回车保存，Esc取消"
              @blur="saveNewSection(chapter)"
              @keyup.enter="saveNewSection(chapter)"
              @keyup.escape="cancelAddSection"
              v-focus
            />
            <span class="action-link danger" style="margin-left:8px" @click="cancelAddSection">取消</span>
          </div>
        </div>
      </div>

      <!-- 新增章节的内联输入行 -->
      <div v-if="addingChapter" class="chapter-block">
        <div class="chapter-row">
          <span class="chapter-badge">第 {{ outline.length + 1 }} 章</span>
          <input
            v-model="newChapterTitle"
            class="inline-input"
            placeholder="输入章节标题，回车保存，Esc取消"
            @blur="saveNewChapter"
            @keyup.enter="saveNewChapter"
            @keyup.escape="cancelAddChapter"
            v-focus
          />
          <span class="action-link danger" style="margin-left:8px" @click="cancelAddChapter">取消</span>
        </div>
      </div>
    </div>
  </div>

  <!-- 小节内容编辑弹窗 -->
  <SectionEditModal
    v-if="showSectionEdit"
    :show="showSectionEdit"
    :section="editingSection"
    :course-id="courseId"
    @update:show="showSectionEdit = $event"
    @saved="loadOutline"
  />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { createDiscreteApi } from 'naive-ui';
import { useRouter } from 'vue-router';
import { fetchConfig } from '~/composables/useHttp';
import { getAuthHeaders, apiAddChapter, apiAddVideoSection, apiAddTextSection, apiDeleteSection, apiGetMaterialUrl, normalizeSectionFreeFlag } from '~/composables/Api/Course/course';
import SectionEditModal from '~/components/Course/edit/SectionEditModal.vue';

const vFocus = { mounted: (el: HTMLElement) => el.focus() };

const props = defineProps<{ courseId: string; editMode: boolean; accessLevel?: string }>();
const { message, dialog } = createDiscreteApi(['message', 'dialog']);
const router = useRouter();

// ===== 折叠状态 =====
const collapsedChapters = ref<Set<number>>(new Set());

function toggleChapter(id: number) {
  if (collapsedChapters.value.has(id)) {
    collapsedChapters.value.delete(id);
  } else {
    collapsedChapters.value.add(id);
  }
  // 触发响应式更新
  collapsedChapters.value = new Set(collapsedChapters.value);
}

// ===== 跳转学习中心（普通用户点击小节） =====
function goToStudy(section: any) {
  // TRIAL 模式下点击锁定章节，给提示而不是跳转
  if (props.accessLevel !== 'FULL' && normalizeSectionFreeFlag(section.freeFlag) !== 1) {
    message.warning('该章节需要购买课程后才能观看');
    return;
  }
  router.push(`/course_detail/${props.courseId}?sectionId=${section.id}`);
}

// ===== 跳转编辑页（有编辑权限时点击"编辑内容"按钮） =====
function goToLesson(section: any) {
  const chapterId = section.parentId || section.chapterId || '';
  router.push(`/course/lesson/${section.id}?courseId=${props.courseId}&chapterId=${chapterId}`);
}

const loading = ref(false);
const outline = ref<any[]>([]);

onMounted(loadOutline);

// ===== 资料下载 =====
const showMaterials = ref(false);
const materials = ref<any[]>([]);
const materialsLoading = ref(false);

async function loadMaterials() {
  if (materials.value.length > 0) return; // 已加载过不重复请求
  materialsLoading.value = true;
  try {
    const res: any = await $fetch(`/course/section/materials/${props.courseId}`, {
      baseURL: fetchConfig.baseURL,
      headers: {
        token: useCookie('token').value || '',
        appid: fetchConfig.headers.appid,
      },
    });
    if (res?.code === 200 && Array.isArray(res.data)) {
      materials.value = res.data;
    }
  } catch {}
  finally { materialsLoading.value = false; }
}

// 点击资料下载按钮：展开/收起，首次展开时加载
function toggleMaterials() {
  showMaterials.value = !showMaterials.value;
  if (showMaterials.value) loadMaterials();
}

async function downloadMat(mat: any) {
  const url = mat.url || mat.fileUrl;
  if (!url) return;
  const a = document.createElement('a');
  a.href = url;
  a.download = mat.name || mat.materialName || 'download';
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function loadOutline() {
  loading.value = true;
  try {
    const res: any = await $fetch(`/course/section/outline/${props.courseId}`, {
      baseURL: fetchConfig.baseURL,
      headers: getAuthHeaders(),
    });
    if (res?.code === 200) {
      outline.value = (res.data || []).map((ch: any) => ({
        ...ch,
        children: (ch.children || ch.sections || []).map((s: any) => ({
          ...s,
          parentId: s.parentId || s.chapterId || ch.id,
          freeFlag: normalizeSectionFreeFlag(s.freeFlag),
        })),
      }));
    }
  } catch {
    message.error('加载目录失败');
  } finally {
    loading.value = false;
  }
}

// ===== 新增章节（内联） =====
const addingChapter = ref(false);
const newChapterTitle = ref('');

function addChapterInline() {
  newChapterTitle.value = '';
  addingChapter.value = true;
}

function cancelAddChapter() {
  addingChapter.value = false;
  newChapterTitle.value = '';
}

async function saveNewChapter() {
  const title = newChapterTitle.value.trim();
  if (!title) { cancelAddChapter(); return; }
  try {
    const res: any = await apiAddChapter({
      courseId: Number(props.courseId),
      title,
      sort: outline.value.length + 1,
    });
    if (res?.code === 200) {
      message.success('章节添加成功');
      cancelAddChapter();
      await loadOutline();
    } else {
      message.error(res?.msg || '添加失败');
    }
  } catch (e: any) {
    message.error(e?.data?.msg || '请求失败');
  }
}

// ===== 编辑章节标题（内联） =====
const editingChapterId = ref<number | null>(null);
const editingChapterTitle = ref('');

function startEditChapter(chapter: any) {
  editingChapterId.value = chapter.id;
  editingChapterTitle.value = chapter.title;
}

async function saveChapter(chapter: any) {
  const title = editingChapterTitle.value.trim();
  editingChapterId.value = null;
  if (!title || title === chapter.title) return;
  try {
    const idx = outline.value.findIndex((c: any) => c.id === chapter.id);
    const sort = chapter.sort ?? (idx >= 0 ? idx + 1 : 1);
    // save 接口：传 id 时后端走更新，不传时走新增
    const res: any = await apiAddChapter({
      id: chapter.id,
      courseId: Number(props.courseId),
      title,
      sort,
    });
    if (res?.code === 200) {
      message.success('章节已更新');
      await loadOutline();
    } else {
      message.error(res?.msg || '更新失败');
    }
  } catch (e: any) {
    message.error(e?.data?.msg || '请求失败');
  }
}

function confirmDeleteChapter(chapter: any) {
  dialog.warning({
    title: '确认删除',
    content: `删除章节「${chapter.title}」及其所有小节？此操作不可恢复。`,
    positiveText: '删除', negativeText: '取消',
    onPositiveClick: async () => {
      try {
        const res: any = await apiDeleteSection(chapter.id, Number(props.courseId));
        if (res?.code === 200) {
          message.success('章节已删除');
          await loadOutline();
        } else {
          message.error(res?.msg || '删除失败');
        }
      } catch (e: any) {
        message.error(e?.data?.msg || '删除失败');
      }
    },
  });
}

// ===== 新增小节（内联） =====
const addingSectionChapterId = ref<number | null>(null);
const newSectionTitle = ref('');
const newSectionType = ref('video');

function addSectionInline(chapter: any) {
  addingSectionChapterId.value = chapter.id;
  newSectionTitle.value = '';
  newSectionType.value = 'video';
  // 如果章节是折叠状态，自动展开
  if (collapsedChapters.value.has(chapter.id)) {
    collapsedChapters.value.delete(chapter.id);
    collapsedChapters.value = new Set(collapsedChapters.value);
  }
}

function cancelAddSection() {
  addingSectionChapterId.value = null;
  newSectionTitle.value = '';
}

async function saveNewSection(chapter: any) {
  const title = newSectionTitle.value.trim();
  if (!title) { cancelAddSection(); return; }
  try {
    const isVideo = newSectionType.value === 'video';
    let body: any = {
      courseId: Number(props.courseId),
      parentId: chapter.id,
      title,
      freeFlag: 0,
      sort: (chapter.children?.length || 0) + 1,
    };

    if (isVideo) {
      // 视频小节必填字段：mediaUrl、fileSize（先占位，后续编辑内容时上传视频）
      body.mediaUrl = 'pending';
      body.fileSize = 0;
      body.duration = 0;
    }

    const apiFn = isVideo ? apiAddVideoSection : apiAddTextSection;
    const res: any = await apiFn(body);
    if (res?.code === 200) {
      message.success('小节添加成功，请点击「编辑内容」上传视频');
      cancelAddSection();
      await loadOutline();
    } else {
      message.error(res?.msg || '添加失败');
    }
  } catch (e: any) {
    message.error(e?.data?.msg || '请求失败');
  }
}

function confirmDeleteSection(section: any) {
  dialog.warning({
    title: '确认删除',
    content: `删除小节「${section.title}」？此操作不可恢复。`,
    positiveText: '删除', negativeText: '取消',
    onPositiveClick: async () => {
      try {
        const res: any = await apiDeleteSection(section.id, Number(props.courseId));
        if (res?.code === 200) {
          message.success('小节已删除');
          await loadOutline();
        } else {
          message.error(res?.msg || '删除失败');
        }
      } catch (e: any) {
        message.error(e?.data?.msg || '删除失败');
      }
    },
  });
}

// ===== 小节内容编辑（保留弹窗备用，主要用跳转页面） =====
const showSectionEdit = ref(false);
const editingSection = ref<any>(null);
</script>

<style scoped>
.outline-wrap {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.outline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}
.outline-title { font-size: 15px; font-weight: 600; color: #1a1a1a; }
.header-right { display: flex; align-items: center; gap: 10px; }

.btn-download-mat {
  background: #fff; color: #18a058; border: 1px solid #18a058;
  border-radius: 4px; padding: 5px 14px; font-size: 13px;
  cursor: pointer; transition: all 0.2s; font-weight: 500;
}
.btn-download-mat:hover { background: #18a058; color: #fff; }

/* 资料面板 */
.material-panel {
  border-top: 1px solid #f0f0f0;
  padding: 14px 20px;
  background: #fafafa;
}
.mat-loading, .mat-empty { font-size: 13px; color: #999; padding: 8px 0; }
.mat-list { display: flex; flex-direction: column; gap: 8px; }
.mat-row {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px; background: #fff;
  border: 1px solid #e8e8e8; border-radius: 6px;
}
.mat-icon { font-size: 16px; flex-shrink: 0; }
.mat-name { flex: 1; font-size: 13px; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mat-tag { font-size: 11px; color: #888; background: #f0f0f0; padding: 2px 8px; border-radius: 10px; flex-shrink: 0; }
.mat-dl-btn {
  background: #18a058; color: #fff; border: none;
  border-radius: 5px; padding: 4px 12px; font-size: 12px;
  cursor: pointer; flex-shrink: 0; transition: background 0.2s;
}
.mat-dl-btn:hover { background: #0e7a3e; }

.btn-green {
  background: #18a058;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
}
.btn-green:hover { background: #0e7a3e; }

.chapter-block { border-bottom: 1px solid #f0f0f0; }
.chapter-block:last-child { border-bottom: none; }
.chapter-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  background: #f8f9fa;
  cursor: pointer;
  user-select: none;
}
.chapter-row:hover { background: #f0f0f0; }
.collapse-icon { font-size: 10px; color: #999; flex-shrink: 0; width: 12px; }
.chapter-badge {
  font-size: 12px; color: #fff; background: #18a058;
  padding: 2px 8px; border-radius: 3px; flex-shrink: 0;
}
.chapter-name { flex: 1; font-weight: 600; font-size: 15px; color: #222; }
.chapter-count { font-size: 12px; color: #999; flex-shrink: 0; }
.chapter-actions { display: flex; align-items: center; gap: 14px; flex-shrink: 0; }

/* 内联输入框 */
.inline-input {
  flex: 1;
  border: none;
  border-bottom: 2px solid #18a058;
  outline: none;
  font-size: 14px;
  padding: 2px 4px;
  background: transparent;
  color: #222;
  min-width: 0;
}

.type-select {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 12px;
  color: #555;
  background: #fff;
  cursor: pointer;
  flex-shrink: 0;
}

.action-link {
  font-size: 13px; color: #555; cursor: pointer; user-select: none; transition: color 0.15s;
}
.action-link:hover { color: #222; }
.action-link.primary { color: #18a058; }
.action-link.primary:hover { color: #0e7a3e; }
.action-link.danger { color: #d03050; }
.action-link.danger:hover { color: #a0203a; }

.section-list { padding: 4px 0; }
.no-section { padding: 10px 36px; font-size: 12px; color: #bbb; }

.section-row, .inline-add-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px 12px 36px;
  border-bottom: 1px solid #fafafa;
  transition: background 0.15s;
}
.section-row:hover { background: #f6fdf9; }
.section-row.clickable { cursor: pointer; }
.section-row.clickable:hover { background: #e8f5e9; }
.inline-add-row { background: #f0fdf4; }

.section-num { font-size: 12px; color: #bbb; width: 28px; flex-shrink: 0; }
.section-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.section-name { flex: 1; font-size: 14px; color: #444; }
.free-tag {
  font-size: 11px; color: #18a058; border: 1px solid #18a058;
  padding: 1px 5px; border-radius: 3px; flex-shrink: 0;
}
.section-right { flex-shrink: 0; display: flex; align-items: center; gap: 12px; }
.free-label { font-size: 12px; color: #18a058; }
</style>
