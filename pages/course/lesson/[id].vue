<template>
  <div class="lesson-page">
    <!-- 顶部导航 -->
    <div class="topbar">
      <div class="topbar-left">
        <span class="back-link" @click="router.back()">← 返回目录</span>
        <template v-if="breadcrumb.chapter">
          <span class="bc-sep">›</span>
          <span class="bc-item">{{ breadcrumb.chapter }}</span>
          <span class="bc-sep">›</span>
          <span class="bc-current">{{ form.title || '小节编辑' }}</span>
        </template>
      </div>
      <div class="topbar-right">
        <span v-if="form.freeFlag === 1" class="free-badge">免费试看</span>
        <span v-if="form.durationStr" class="duration-badge">⏱ {{ form.durationStr }}</span>
        <button class="btn-save-top" :class="{ loading: saving }" :disabled="saving" @click="handleSave">
          {{ saving ? '保存中...' : '💾 保存' }}
        </button>
      </div>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="page-loading">
      <n-spin size="large" description="加载小节数据..." />
    </div>

    <!-- 主体 -->
    <div ref="lessonBodyRef" v-else class="lesson-body">
      <!-- 悬浮左侧面板 -->
      <div
        ref="floatingSideRef"
        class="floating-side"
        :class="{ collapsed: sidePanelCollapsed }"
        :style="{ left: `${panelPos.x}px`, top: `${panelPos.y}px` }"
        @click.stop
      >
        <button
          class="floating-toggle"
          :class="{ collapsed: sidePanelCollapsed, dragging: isDraggingPanel }"
          :title="sidePanelCollapsed ? 'Expand panel' : 'Collapse panel'"
          @pointerdown="onPanelHandlePointerDown"
          @click="onPanelHandleClick"
        >
          <span class="toggle-icon">{{ sidePanelCollapsed ? '›' : '‹' }}</span>
          <span class="toggle-glow"></span>
        </button>
        <div class="left-col" v-show="!sidePanelCollapsed">
        <!-- 小节列表 -->
        <div class="card">
          <div class="card-title">
            <span class="dot green">●</span> 小节列表
          </div>
          <div class="section-tree">
            <div v-if="outline.length === 0" class="section-empty">暂无小节</div>
            <template v-for="chapter in outline" :key="chapter.id">
              <div class="section-chapter">{{ chapter.title }}</div>
              <div
                v-for="sec in chapter.children || []"
                :key="sec.id"
                class="section-item"
                :class="{ active: Number(sec.id) === currentSectionId }"
                @click="handleSelectSection(sec)"
              >
                <span class="section-item-title">{{ sec.title }}</span>
                <span v-if="isSectionDocReused(sec)" class="section-reuse-tag">复用</span>
                <span v-if="sec.anchorType === 'range'" class="section-anchor">片段</span>
              </div>
            </template>
          </div>
        </div>

        <!-- 基本信息卡片 -->
        <div class="card">
          <div class="card-title">
            <span class="dot green">●</span> 基本信息
          </div>
          <div class="field-row">
            <span class="field-label">小节标题</span>
            <input v-model="form.title" class="field-input" placeholder="请输入小节标题" />
          </div>
          <div v-if="isVideo" class="field-row">
            <span class="field-label">时长</span>
            <input v-model="form.durationStr" class="field-input" placeholder="如 25:30" />
          </div>
          <div class="field-row">
            <span class="field-label">免费试看</span>
            <n-switch v-model:value="form.freeFlag" :checked-value="1" :unchecked-value="0">
              <template #checked>是</template>
              <template #unchecked>否</template>
            </n-switch>
          </div>
          <div class="field-row">
            <span class="field-label">文档来源</span>
            <select v-model="form.docBindMode" class="field-input" :disabled="isReuseReadonly">
              <option value="">请选择</option>
              <option value="create">新建文档</option>
              <option value="reuse">复用已有文档</option>
            </select>
          </div>
          <div class="field-row" v-if="form.docBindMode === 'reuse'">
            <span class="field-label">选择文档</span>
            <select v-model="form.docId" class="field-input select-truncate">
              <option :value="null">请选择要复用的文档</option>
              <option
                v-for="opt in reusableDocOptions"
                :key="opt.docId"
                :value="opt.docId"
                :title="opt.fullLabel"
              >
                {{ opt.label }}
              </option>
            </select>
          </div>
          <template v-if="!isVideo && form.docBindMode === 'create'">
            <div class="field-row">
              <span class="field-label">片段模式</span>
              <select v-model="form.anchorType" class="field-input">
                <option value="full">整篇</option>
                <option value="range">片段</option>
              </select>
            </div>
            <div class="field-row" v-if="form.anchorType === 'range'">
              <span class="field-label">起始锚点</span>
              <input v-model="form.anchorStart" class="field-input" placeholder="例如：回调签名校验" />
            </div>
            <div class="field-row" v-if="form.anchorType === 'range'">
              <span class="field-label">结束锚点</span>
              <input v-model="form.anchorEnd" class="field-input" placeholder="例如：签名算法说明" />
            </div>
            <div class="field-row" v-if="form.anchorType === 'range'">
              <span class="field-label">片段标题</span>
              <input v-model="form.excerptTitle" class="field-input" placeholder="例如：签名校验片段" />
            </div>
          </template>
        </div>

        <!-- 视频卡片 -->
        <div v-if="isVideo" class="card video-card">
          <div class="card-title-row">
            <div class="card-title"><span class="dot green">●</span> 课程视频</div>
            <span class="action-text blue" @click="scrollToTop">顶部展示</span>
          </div>

          <!-- 播放器 / 上传区 -->
          <div class="video-wrap">
            <!-- 有有效视频：显示播放器 -->
            <template v-if="validVideoUrl">
              <video
                ref="videoEl"
                :src="validVideoUrl"
                controls
                controlsList="nodownload"
                oncontextmenu="return false"
                class="video-player"
              />
              <div v-if="videoUploading" class="upload-overlay">
                <n-spin size="medium" />
                <p class="upload-progress-text">上传中 {{ uploadProgress }}%</p>
                <n-progress type="line" :percentage="uploadProgress" style="width:200px;margin-top:6px" />
              </div>
              <div v-else class="video-actions">
                <button class="btn-reupload" @click="videoInputRef?.click()">🔄 重新上传</button>
              </div>
            </template>

            <!-- 无视频：上传区 -->
            <div v-else class="upload-zone" @click="videoInputRef?.click()" @dragover.prevent @drop.prevent="onVideoDrop">
              <template v-if="!videoUploading">
                <div class="upload-icon">⬆</div>
                <p class="upload-hint">点击或拖拽视频文件上传</p>
                <p class="upload-sub">支持 MP4 / MOV / AVI，建议 ≤ 2GB</p>
              </template>
              <template v-else>
                <n-spin size="medium" />
                <p class="upload-progress-text">上传中 {{ uploadProgress }}%</p>
                <n-progress type="line" :percentage="uploadProgress" style="width:200px;margin-top:6px" />
              </template>
            </div>
          </div>

          <!-- URL 输入 -->
          <div class="url-row">
            <input v-model="videoUrl" class="url-input" placeholder="或粘贴视频地址（MP4/M3U8/CDN）" @keyup.enter="refreshVideo" />
            <button class="btn-sm-green" @click="refreshVideo">预览</button>
          </div>
          <p class="video-tip">⊙ 支持 MP4、WebM、M3U8 格式，建议使用 CDN 地址</p>
          <div class="video-type-row">
            <span class="vt-label">视频类型</span>
            <label class="vt-radio"><input type="radio" v-model="form.videoType" value="mp4" /> MP4</label>
            <label class="vt-radio"><input type="radio" v-model="form.videoType" value="m3u8" /> M3U8 (HLS)</label>
            <label class="vt-radio"><input type="radio" v-model="form.videoType" value="webm" /> WebM</label>
          </div>
          <input ref="videoInputRef" type="file" accept="video/*" style="display:none" @change="onVideoFileChange" />
        </div>
      </div>
      </div>

      <!-- 右侧：文档编辑器 -->
      <div ref="rightColRef" class="right-col">
        <div
          v-if="isReuseReadonly && reusedFromSection"
          class="doc-reuse-tip readonly"
          :style="docReuseTipStyle"
          role="status"
          aria-live="polite"
        >
          <span class="doc-reuse-tip-icon">⟲</span>
          <span class="doc-reuse-tip-text">
            复用自根小节「{{ reusedFromSection.title }}」的文档，当前为只读。
            <button type="button" class="doc-reuse-link" @click="goToRootSection">前往根小节编辑</button>
          </span>
        </div>
        <div
          v-else-if="form.docBindMode === 'reuse' && form.docId"
          class="doc-reuse-tip"
          :style="docReuseTipStyle"
          role="status"
          aria-live="polite"
        >
          <span class="doc-reuse-tip-icon">⟲</span>
          <span class="doc-reuse-tip-text">复用模式：保存后仅绑定引用，不会修改根文档内容</span>
        </div>
        <DocEditor
          v-if="form.docBindMode === 'create' || form.docBindMode === 'reuse'"
          class="editor-host"
          ref="docEditorRef"
          v-model="form.content"
          :readonly="isReuseReadonly"
          placeholder="在此输入课程文档内容..."
          style="height:100%;border:1px solid #e8e8e8;border-radius:6px;"
        />
        <div v-else class="doc-reuse-placeholder">请先在左侧选择文档来源（新建文档 / 复用已有文档）。</div>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div class="lesson-footer">
      <button class="btn-cancel" @click="router.back()">取消</button>
      <div class="footer-right">
        <span class="save-tip">Ctrl+S 快速保存</span>
        <button class="btn-save-main" :disabled="saving" @click="handleSave">
          💾 保存课程内容
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { createDiscreteApi, NSpin, NSwitch } from 'naive-ui';
import { fetchConfig } from '~/composables/useHttp';
import { getAuthHeaders, apiUploadVideo, normalizeSectionFreeFlag } from '~/composables/Api/Course/course';
import DocEditor from '~/components/Course/edit/DocEditor.vue';
import { handleAuthExpired } from '~/composables/useAuth';

const route = useRoute();
const router = useRouter();
const { message } = createDiscreteApi(['message']);

function isAuthExpiredResponse(res: any, err?: any) {
  const code = res?.code ?? err?.data?.code;
  const msg = res?.msg || err?.data?.msg || err?.data?.data || err?.message || '';
  return code === 401
    || code === 3100
    || code === 3101
    || /认证失败/.test(msg)
    || /登录已过期/.test(msg)
    || /用户未登录/.test(msg)
    || /请先登录/.test(msg);
}

const currentSectionId = ref(Number(route.params.id));
const courseId = Number(route.query.courseId);
// chapterId 从 URL query 传入，作为 parentId 的兜底
const chapterIdFromQuery = Number(route.query.chapterId) || 0;

// 状态
const loading = ref(true);
const saving = ref(false);
const sectionData = ref<any>(null);
const outline = ref<any[]>([]);
const breadcrumb = reactive({ chapter: '' });
const docEditorRef = ref<any>(null);
const sidePanelCollapsed = ref(false);
const floatingSideRef = ref<HTMLElement | null>(null);
const lessonBodyRef = ref<HTMLElement | null>(null);
const rightColRef = ref<HTMLElement | null>(null);
const PANEL_EXPANDED_WIDTH = 360;
const PANEL_COLLAPSED_WIDTH = 44;
const panelPos = reactive({ x: 16, y: 62 });
const isDraggingPanel = ref(false);
const dragMoved = ref(false);
let dragStartX = 0;
let dragStartY = 0;
let panelStartX = 0;
let panelStartY = 0;
const docReuseTipLeft = ref<number | null>(null);

const docReuseTipStyle = computed(() => ({
  left: docReuseTipLeft.value == null ? '50%' : `${docReuseTipLeft.value}px`,
  transform: 'translateX(-50%)',
}));

// 视频
const videoUrl = ref('');
const videoRelativePath = ref('');
const videoEl = ref<HTMLVideoElement | null>(null);
const videoInputRef = ref<HTMLInputElement | null>(null);
const videoUploading = ref(false);
const uploadProgress = ref(0);

// 表单
const form = reactive({
  title: '',
  freeFlag: 0,
  durationStr: '',
  content: '',
  videoType: 'mp4',
  docBindMode: 'create' as '' | 'create' | 'reuse',
  docId: null as string | number | null,
  anchorType: 'full',
  anchorStart: '',
  anchorEnd: '',
  excerptTitle: '',
});

// 是否视频类型
const isVideo = computed(() => {
  const s = sectionData.value;
  if (!s) return true;
  const t = String(s.sectionType || s.type || '').toLowerCase();
  return !['text', 'textcontent', 'article'].includes(t);
});

// 有效视频URL（过滤 pending 占位）
const validVideoUrl = computed(() => {
  const url = videoUrl.value;
  if (!url) return '';
  if (url.includes('osh/pending') || url === 'pending') return '';
  return url;
});

// 初始化
onMounted(async () => {
  await loadData();
  loading.value = false;
  window.addEventListener('keydown', onKeyDown);
  document.addEventListener('pointerdown', onGlobalPointerDown, true);
  window.addEventListener('resize', onWindowResize);
  nextTick(() => {
    resetPanelPositionToEditor();
    updateDocReuseTipPosition();
  });
});
onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
  document.removeEventListener('pointerdown', onGlobalPointerDown, true);
  window.removeEventListener('resize', onWindowResize);
  document.removeEventListener('pointermove', onPanelHandlePointerMove, true);
  document.removeEventListener('pointerup', onPanelHandlePointerUp, true);
});

function onKeyDown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    handleSave();
  }
}

// 加载小节数据（从大纲接口）
async function loadData() {
  try {
    const res: any = await $fetch(`/course/section/outline/${courseId}`, {
      baseURL: fetchConfig.baseURL,
      headers: getAuthHeaders(),
    });
    if (res?.code === 200) {
      outline.value = (res.data || []).map((chapter: any) => ({
        ...chapter,
        children: (chapter.children || chapter.sections || []).map((sec: any) => ({
          ...sec,
          parentId: sec.parentId || sec.chapterId || chapter.id,
        })),
      }));
      if (tryUseSectionFromOutline(currentSectionId.value)) return;
      // 路由 id 找不到就回退到第一节
      const first = outline.value[0]?.children?.[0];
      if (first) {
        handleSelectSection(first);
        return;
      }
    }
  } catch (e) {
    console.error('[lesson] loadData error:', e);
    message.error('加载数据失败');
    return;
  }

  // 最终兜底：至少保证 parentId 有值，不影响保存
  sectionData.value = {
    parentId: chapterIdFromQuery || null,
    sort: 1,
    freeFlag: 0,
    fileSize: 0,
    duration: 0,
  };
}

function tryUseSectionFromOutline(sectionId: number) {
  for (const chapter of outline.value) {
    const sections = chapter.children || [];
    const found = sections.find((s: any) => String(s.id) === String(sectionId));
    if (!found) continue;
    hydrateSection(found, chapter);
    return true;
  }
  return false;
}

function hydrateSection(found: any, chapter: any) {
  const resolvedParentId = found.parentId || chapter?.id || chapterIdFromQuery || null;
  currentSectionId.value = Number(found.id);
  sectionData.value = { ...found, parentId: resolvedParentId };
  breadcrumb.chapter = chapter?.title || '';
  form.title = found.title || '';
  form.freeFlag = normalizeSectionFreeFlag(found.freeFlag);
  form.content = found.textContent || found.content || '';
  form.docId = found.docId || null;
  const rootSection = found.docId ? findDocRootSection(found.docId) : null;
  const isRootDocSection = !found.docId || (rootSection && String(rootSection.id) === String(found.id));
  if (found.docId && !isRootDocSection) {
    form.docBindMode = 'reuse';
  } else if (found.docId || (found.textContent || found.content || '').trim()) {
    form.docBindMode = 'create';
  } else {
    form.docBindMode = 'create';
  }
  form.anchorType = found.anchorType || 'full';
  form.anchorStart = found.anchorStart || '';
  form.anchorEnd = found.anchorEnd || '';
  form.excerptTitle = found.excerptTitle || '';
  form.durationStr = found.duration ? fmtDuration(found.duration) : '';
  videoUrl.value = found.mediaUrl || '';
  videoRelativePath.value = '';
  if (String(found.sectionType || found.type || '').toLowerCase() === 'text') {
    refreshEditorContentFromServer(Number(found.id));
  }
}

const reusableDocOptions = computed(() => {
  const list: Array<{ docId: string; label: string; fullLabel: string; content: string; rootTitle: string }> = [];
  const seen = new Set<string>();
  for (const chapter of outline.value || []) {
    const sections = chapter.children || [];
    for (const sec of sections) {
      const docId = String(sec.docId || '').trim();
      if (!docId || docId === '0' || seen.has(docId)) continue;
      seen.add(docId);
      const root = findDocRootSection(docId);
      const title = sec.title || '未命名小节';
      const rootTitle = root?.title || title;
      const shortDocId = docId.length > 8 ? docId.slice(-8) : docId;
      const label = `${rootTitle} (doc:${shortDocId})`;
      const fullLabel = `${rootTitle} (doc:${docId})`;
      list.push({ docId, label, fullLabel, content: sec.textContent || sec.content || '', rootTitle });
    }
  }
  return list;
});

function findDocRootSection(docId: string | number | null | undefined) {
  const targetDocId = String(docId || '').trim();
  if (!targetDocId) return null;
  let root: any = null;
  for (const chapter of outline.value || []) {
    for (const sec of chapter.children || []) {
      if (String(sec.docId || '').trim() !== targetDocId) continue;
      if (!root) {
        root = sec;
        continue;
      }
      const secTime = new Date(sec.createTime || 0).getTime();
      const rootTime = new Date(root.createTime || 0).getTime();
      if (secTime < rootTime || (secTime === rootTime && Number(sec.id) < Number(root.id))) {
        root = sec;
      }
    }
  }
  return root;
}

const reusedFromSection = computed(() => {
  const docId = form.docId || sectionData.value?.docId;
  if (!docId) return null;
  return findDocRootSection(docId);
});

const isReuseReadonly = computed(() => {
  const docId = form.docId || sectionData.value?.docId;
  if (!docId || !reusedFromSection.value) return false;
  return String(reusedFromSection.value.id) !== String(currentSectionId.value);
});

function isSectionDocReused(sec: any) {
  const docId = sec?.docId;
  if (!docId) return false;
  const root = findDocRootSection(docId);
  return !!(root && String(root.id) !== String(sec.id));
}

function goToRootSection() {
  const root = reusedFromSection.value;
  if (!root) return;
  handleSelectSection(root);
}

watch(() => form.docBindMode, (mode) => {
  if (mode === 'create') {
    form.docId = null;
    return;
  }
  if (mode === 'reuse') {
    if (!form.docId) {
      form.content = '';
      return;
    }
    // 避免把当前小节已加载的内容，被下拉里“同 docId 的其他小节缓存内容”覆盖掉。
    const currentSectionDocId = String(sectionData.value?.docId || '');
    if (currentSectionDocId && String(form.docId) === currentSectionDocId) {
      return;
    }
    const current = reusableDocOptions.value.find(item => item.docId === String(form.docId || ''));
    if (current) {
      form.content = current.content || '';
    } else {
      form.content = '';
    }
  }
});

watch(() => sidePanelCollapsed.value, () => {
  nextTick(() => {
    resetPanelPositionToEditor();
    updateDocReuseTipPosition();
  });
});

watch(() => form.docId, (docId) => {
  if (form.docBindMode !== 'reuse') return;
  const currentSectionDocId = String(sectionData.value?.docId || '');
  if (currentSectionDocId && String(docId || '') === currentSectionDocId) {
    nextTick(() => {
      updateDocReuseTipPosition();
    });
    return;
  }
  const hit = reusableDocOptions.value.find(item => item.docId === String(docId || ''));
  if (!hit) return;
  form.content = hit.content || '';
  nextTick(() => {
    updateDocReuseTipPosition();
  });
});

watch(() => form.docBindMode, () => {
  nextTick(() => {
    updateDocReuseTipPosition();
  });
});

async function handleSelectSection(section: any) {
  const chapter = outline.value.find((ch: any) => (ch.children || []).some((s: any) => String(s.id) === String(section.id)));
  hydrateSection(section, chapter);
  if (String(section.sectionType || section.type || '').toLowerCase() === 'text') {
    await refreshEditorContentFromServer(Number(section.id));
  }
  await nextTick();
  if (!isVideo.value) {
    const anchor = form.anchorStart || form.excerptTitle || '';
    if (anchor && docEditorRef.value?.scrollToAnchorText) {
      docEditorRef.value.scrollToAnchorText(anchor);
    }
  }
  updateDocReuseTipPosition();
  const chapterId = section.parentId || chapter?.id || chapterIdFromQuery || '';
  router.replace(`/course/lesson/${section.id}?courseId=${courseId}&chapterId=${chapterId}`);
}

async function refreshEditorContentFromServer(sectionId: number) {
  if (!sectionId) return;
  try {
    const res: any = await $fetch(`/course/section/content/${courseId}/${sectionId}`, {
      baseURL: fetchConfig.baseURL,
      headers: getAuthHeaders(),
    });
    if (res?.code === 200) {
      const latest = res.data || '';
      form.content = latest;
      sectionData.value = {
        ...(sectionData.value || {}),
        textContent: latest,
        content: latest,
      };
    }
  } catch (err) {
    console.warn('[lesson] refreshEditorContentFromServer failed:', err);
  }
}

function onGlobalPointerDown(event: PointerEvent) {
  if (sidePanelCollapsed.value) return;
  const panel = floatingSideRef.value;
  const target = event.target as Node | null;
  if (!panel || !target) return;
  if (!panel.contains(target)) {
    sidePanelCollapsed.value = true;
  }
}

function onPanelHandlePointerDown(event: PointerEvent) {
  if (event.button !== 0) return;
  const body = lessonBodyRef.value;
  if (!body) return;
  isDraggingPanel.value = true;
  dragMoved.value = false;
  dragStartX = event.clientX;
  dragStartY = event.clientY;
  panelStartX = panelPos.x;
  panelStartY = panelPos.y;
  document.addEventListener('pointermove', onPanelHandlePointerMove, true);
  document.addEventListener('pointerup', onPanelHandlePointerUp, true);
}

function onPanelHandlePointerMove(event: PointerEvent) {
  if (!isDraggingPanel.value) return;
  const dx = event.clientX - dragStartX;
  const dy = event.clientY - dragStartY;
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
    dragMoved.value = true;
  }
  panelPos.x = panelStartX + dx;
  panelPos.y = panelStartY + dy;
  clampPanelPosition();
}

function onPanelHandlePointerUp() {
  isDraggingPanel.value = false;
  document.removeEventListener('pointermove', onPanelHandlePointerMove, true);
  document.removeEventListener('pointerup', onPanelHandlePointerUp, true);
}

function onPanelHandleClick() {
  if (dragMoved.value) return;
  sidePanelCollapsed.value = !sidePanelCollapsed.value;
}

function getEditorAnchorInBody() {
  const body = lessonBodyRef.value;
  const container = rightColRef.value;
  if (!body || !container) return null;
  const bodyRect = body.getBoundingClientRect();
  const toolbar = container.querySelector('.editor-host .toolbar') as HTMLElement | null;
  const editorHost = container.querySelector('.editor-host') as HTMLElement | null;
  const anchorEl = editorHost || toolbar;
  if (!anchorEl) return null;
  const anchorRect = anchorEl.getBoundingClientRect();
  return {
    top: (toolbar?.getBoundingClientRect().top ?? anchorRect.top) - bodyRect.top,
    left: anchorRect.left - bodyRect.left,
  };
}

function resetPanelPositionToEditor() {
  const body = lessonBodyRef.value;
  if (!body) return;
  const anchor = getEditorAnchorInBody();
  const panelWidth = sidePanelCollapsed.value ? PANEL_COLLAPSED_WIDTH : PANEL_EXPANDED_WIDTH;
  if (anchor) {
    panelPos.y = anchor.top;
    panelPos.x = anchor.left - panelWidth;
  }
  clampPanelPosition();
}

function clampPanelPosition() {
  const body = lessonBodyRef.value;
  if (!body) return;
  const bodyRect = body.getBoundingClientRect();
  const panelWidth = sidePanelCollapsed.value ? PANEL_COLLAPSED_WIDTH : PANEL_EXPANDED_WIDTH;
  const panelHeight = sidePanelCollapsed.value ? 44 : Math.min(bodyRect.height - 24, bodyRect.height * 0.78);
  const maxX = Math.max(10, bodyRect.width - panelWidth - 10);
  const maxY = Math.max(10, bodyRect.height - panelHeight - 10);
  panelPos.x = Math.min(Math.max(10, panelPos.x), maxX);
  panelPos.y = Math.min(Math.max(18, panelPos.y), maxY);
}

function onWindowResize() {
  resetPanelPositionToEditor();
  updateDocReuseTipPosition();
}

function updateDocReuseTipPosition() {
  if (!form.docId || (form.docBindMode !== 'reuse' && !isReuseReadonly.value)) {
    docReuseTipLeft.value = null;
    return;
  }
  const container = rightColRef.value;
  if (!container) return;
  const leftGroup = container.querySelector('.editor-host .toolbar-left') as HTMLElement | null;
  const rightGroup = container.querySelector('.editor-host .toolbar-right') as HTMLElement | null;
  if (!leftGroup || !rightGroup) {
    docReuseTipLeft.value = null;
    return;
  }
  const containerRect = container.getBoundingClientRect();
  const leftRect = leftGroup.getBoundingClientRect();
  const rightRect = rightGroup.getBoundingClientRect();
  const gapStart = leftRect.right;
  const gapEnd = rightRect.left;
  if (gapEnd > gapStart) {
    docReuseTipLeft.value = (gapStart + gapEnd) / 2 - containerRect.left;
    return;
  }
  docReuseTipLeft.value = null;
}

// 视频上传
function onVideoDrop(e: DragEvent) {
  const f = e.dataTransfer?.files?.[0];
  if (f) uploadVideo(f);
}
function onVideoFileChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (f) uploadVideo(f);
  (e.target as HTMLInputElement).value = '';
}

async function uploadVideo(file: File) {
  videoUploading.value = true;
  uploadProgress.value = 0;
  try {
    // 传 sectionId 后，后端会先删该小节 OSS 旧视频（若有）再上传新文件
    const sectionIdForUpload = currentSectionId.value || null;
    const res: any = await apiUploadVideo(
      file,
      file.name,
      sectionIdForUpload,
      (percent) => { uploadProgress.value = percent; },
    );
    if (res?.code === 200) {
      videoRelativePath.value = res.data?.relativePath || '';
      videoUrl.value = res.data?.url || '';
      if (res.data?.size) {
        sectionData.value = { ...sectionData.value, fileSize: res.data.size };
      }
      message.success('视频上传成功');
      autoSaveVideo();
    } else {
      message.error(res?.msg || '上传失败');
    }
  } catch (err: any) {
    message.error(err?.message || '视频上传失败');
  } finally {
    videoUploading.value = false;
    uploadProgress.value = 0;
  }
}

// 上传后静默保存 relativePath 到数据库
async function autoSaveVideo() {
  if (!videoRelativePath.value) return;
  try {
    await $fetch('/course/section/video/save', {
      method: 'POST',
      baseURL: fetchConfig.baseURL,
      headers: getAuthHeaders(),
      body: {
        id: currentSectionId.value,
        courseId,
        parentId: sectionData.value?.parentId,
        title: form.title.trim() || sectionData.value?.title,
        freeFlag: form.freeFlag,
        sort: sectionData.value?.sort || 1,
        mediaUrl: videoRelativePath.value, // 只传 relativePath
        fileSize: sectionData.value?.fileSize || 0,
        duration: parseDuration(form.durationStr),
      },
    });
  } catch {}
}

// 刷新视频播放
function refreshVideo() {
  if (videoEl.value) videoEl.value.load();
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 保存小节（更新，因为 id 存在后端走 update）
async function handleSave() {
  if (!form.title.trim()) { message.warning('请输入小节标题'); return; }
  if (form.docBindMode === 'reuse' && !form.docId) {
    message.warning('请选择要复用的文档');
    return;
  }
  saving.value = true;
  try {
    const isVid = isVideo.value;
    const endpoint = isVid ? '/course/section/video/save' : '/course/section/textContent/save';
    const parentId = sectionData.value?.parentId || chapterIdFromQuery || null;
    console.log('[lesson] handleSave parentId:', parentId, 'sectionData:', JSON.stringify(sectionData.value));
    if (!parentId) {
      message.error('无法获取父章节ID，请返回目录重新进入');
      saving.value = false;
      return;
    }
    const body: any = {
      id: currentSectionId.value,
      courseId,
      parentId,
      title: form.title.trim(),
      freeFlag: form.freeFlag,
      sort: sectionData.value?.sort || 1,
      docMode: (form.docBindMode === 'reuse' || isReuseReadonly.value) ? 'BIND_EXISTING' : 'CREATE',
      docId: (form.docBindMode === 'reuse' || isReuseReadonly.value) ? (form.docId || sectionData.value?.docId) : null,
      anchorType: form.anchorType || 'full',
      anchorStart: form.anchorStart || '',
      anchorEnd: form.anchorEnd || '',
      excerptTitle: form.excerptTitle || '',
      docTitle: form.title.trim(),
    };
    if (!isReuseReadonly.value && (form.docBindMode === 'create' || form.docBindMode === 'reuse')) {
      body.textContent = form.content;
      body.content = form.content;
    }
    if (isVid) {
      // 只有新上传了视频才传 relativePath，否则不传 mediaUrl，后端保持数据库原值
      if (videoRelativePath.value) {
        body.mediaUrl = videoRelativePath.value;
      }
      body.fileSize = sectionData.value?.fileSize || 0;
      body.duration = parseDuration(form.durationStr);
    }
    const res: any = await $fetch(endpoint, {
      method: 'POST',
      baseURL: fetchConfig.baseURL,
      headers: getAuthHeaders(),
      body,
    });
    if (res?.code === 200) {
      message.success('保存成功 ✓');
      setTimeout(() => {
        router.push(`/course_detail/${courseId}`);
      }, 600);
    } else if (isAuthExpiredResponse(res)) {
      // 保存接口里再兜一层，避免后端返回业务码时被通用请求层漏掉。
      handleAuthExpired();
    } else {
      message.error(res?.msg || '保存失败');
    }
  } catch (err: any) {
    if (isAuthExpiredResponse(null, err)) {
      handleAuthExpired();
      return;
    }
    message.error('保存失败，请重试');
  } finally {
    saving.value = false;
  }
}

// 工具函数
function fmtDuration(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
function parseDuration(str: string) {
  if (!str) return 0;
  const p = str.split(':');
  return p.length === 2 ? Number(p[0]) * 60 + Number(p[1]) : Number(str) || 0;
}
</script>

<style scoped>
.lesson-page {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(circle at 14% 8%, rgba(24, 160, 88, 0.15), transparent 34%),
    radial-gradient(circle at 88% 12%, rgba(32, 128, 240, 0.12), transparent 32%),
    linear-gradient(180deg, #eef3f8 0%, #e8edf5 100%);
  z-index: 50;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* 顶部 */
.topbar {
  height: 52px;
  background: rgba(255, 255, 255, 0.84);
  border-bottom: 1px solid rgba(221, 228, 237, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  flex-shrink: 0;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.topbar-left { display: flex; align-items: center; gap: 8px; font-size: 13px; min-width: 0; overflow: hidden; }
.back-link { color: #18a058; cursor: pointer; font-weight: 500; white-space: nowrap; flex-shrink: 0; }
.back-link:hover { text-decoration: underline; }
.bc-sep { color: #ddd; flex-shrink: 0; }
.bc-item { color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px; }
.bc-current { color: #333; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
.topbar-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.free-badge { font-size: 12px; color: #18a058; border: 1px solid #18a058; padding: 2px 8px; border-radius: 10px; }
.duration-badge { font-size: 13px; color: #888; }
.btn-save-top {
  background: #18a058; color: #fff; border: none;
  border-radius: 5px; padding: 7px 18px; font-size: 13px; cursor: pointer; font-weight: 500;
  transition: background 0.2s;
}
.btn-save-top:hover { background: #0e7a3e; }
.btn-save-top:disabled, .btn-save-top.loading { opacity: 0.7; cursor: not-allowed; }

.page-loading { flex: 1; display: flex; justify-content: center; align-items: center; }

/* 主体布局 */
.lesson-body {
  flex: 1;
  position: relative;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

/* 悬浮侧边面板 */
.floating-side {
  position: absolute;
  width: 360px;
  max-width: calc(100vw - 28px);
  z-index: 8;
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.floating-side.collapsed {
  width: 44px;
}
.floating-toggle {
  width: 44px;
  height: 34px;
  border: 1px solid rgba(16, 120, 86, 0.3);
  border-radius: 12px;
  background: linear-gradient(140deg, rgba(255, 255, 255, 0.94), rgba(233, 247, 241, 0.88));
  color: #126a43;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow:
    0 12px 26px rgba(14, 122, 62, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.88);
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  position: relative;
  overflow: hidden;
  cursor: grab;
  touch-action: none;
}
.floating-toggle:hover {
  background: linear-gradient(140deg, rgba(255, 255, 255, 0.97), rgba(220, 244, 232, 0.92));
  transform: translateY(-1px);
}
.floating-toggle:active,
.floating-toggle.dragging {
  cursor: grabbing;
}
.toggle-icon {
  line-height: 1;
  transform: translateX(-0.5px);
  z-index: 2;
}
.toggle-glow {
  position: absolute;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(24, 160, 88, 0.24), rgba(24, 160, 88, 0));
  z-index: 1;
}
.floating-toggle.collapsed .toggle-icon {
  transform: translateX(0.5px);
}

/* 左侧 */
.left-col {
  max-height: calc(100vh - 210px);
  overflow-y: auto;
  padding: 12px;
  border: 1px solid rgba(173, 186, 203, 0.45);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 18px 44px rgba(18, 43, 68, 0.14);
}

/* 右侧 */
.right-col {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 10px 16px 16px;
  min-height: 0;
  width: 100%;
  position: relative;
}

/* 卡片 */
.card {
  background: rgba(255, 255, 255, 0.78);
  border-radius: 10px;
  padding: 14px;
  border: 1px solid rgba(223, 230, 238, 0.86);
  box-shadow: 0 6px 18px rgba(20, 34, 51, 0.06);
}
.card-title {
  font-size: 14px; font-weight: 600; color: #222;
  margin-bottom: 14px; display: flex; align-items: center; gap: 6px;
}
.dot { font-size: 10px; }
.dot.green { color: #18a058; }
.card-title-row {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;
}
.card-title-row .card-title { margin-bottom: 0; }
.action-text { font-size: 12px; cursor: pointer; }
.action-text.blue { color: #2080f0; }
.action-text.blue:hover { text-decoration: underline; }

/* 表单 */
.field-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.field-row:last-child { margin-bottom: 0; }
.field-label { font-size: 13px; color: #666; width: 56px; flex-shrink: 0; }
.field-input {
  flex: 1; border: 1px solid #d9d9d9; border-radius: 5px;
  padding: 7px 10px; font-size: 13px; outline: none; transition: border-color 0.2s, box-shadow 0.2s;
  max-width: 100%;
  min-width: 0;
}
.field-input:focus { border-color: #18a058; box-shadow: 0 0 0 2px rgba(24,160,88,0.1); }
.select-truncate {
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}

.section-tree { max-height: 220px; overflow-y: auto; }
.section-empty { font-size: 12px; color: #999; padding: 6px 0; }
.section-chapter { font-size: 12px; color: #666; margin: 8px 0 4px; font-weight: 600; }
.section-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 1px solid #e8e8e8;
  border-radius: 5px;
  padding: 6px 8px;
  margin-bottom: 6px;
  cursor: pointer;
  background: #fff;
}
.section-item:hover { border-color: #b7e4c7; background: #f8fff9; }
.section-item.active { border-color: #18a058; background: #f0fdf4; }
.section-item-title {
  font-size: 12px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.section-anchor {
  font-size: 11px;
  color: #18a058;
  border: 1px solid #18a058;
  border-radius: 10px;
  padding: 0 6px;
  flex-shrink: 0;
}
.section-reuse-tag {
  font-size: 10px;
  color: #ad6800;
  border: 1px solid rgba(250, 173, 20, 0.55);
  background: #fff7e6;
  border-radius: 10px;
  padding: 0 6px;
  flex-shrink: 0;
}
.doc-reuse-placeholder {
  height: 100%;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.85);
  color: #666;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 20px;
}
.doc-reuse-tip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  position: absolute;
  top: 15px;
  z-index: 3;
  width: auto;
  max-width: min(360px, calc(100% - 32px));
  box-sizing: border-box;
  font-size: 11px;
  color: #3f4d5a;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(233, 244, 255, 0.86));
  border: 1px solid rgba(166, 198, 228, 0.7);
  border-radius: 999px;
  padding: 4px 9px;
  margin: 0;
  box-shadow: 0 7px 18px rgba(27, 66, 100, 0.1);
  backdrop-filter: blur(8px);
  pointer-events: none;
}
.doc-reuse-tip-icon {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #1b8f57;
  background: radial-gradient(circle at 30% 30%, rgba(226, 255, 239, 0.96), rgba(190, 245, 214, 0.82));
  border: 1px solid rgba(128, 218, 169, 0.9);
  flex-shrink: 0;
}
.doc-reuse-tip.readonly {
  max-width: min(520px, calc(100% - 32px));
  color: #7c4a03;
  background: linear-gradient(135deg, rgba(255, 251, 235, 0.96), rgba(255, 244, 214, 0.9));
  border-color: rgba(250, 173, 20, 0.45);
  pointer-events: auto;
}
.doc-reuse-link {
  margin-left: 6px;
  border: none;
  background: none;
  color: #1677ff;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}
.doc-reuse-tip.readonly .doc-reuse-tip-icon {
  color: #ad6800;
  background: radial-gradient(circle at 30% 30%, rgba(255, 247, 230, 0.96), rgba(255, 231, 186, 0.82));
  border-color: rgba(250, 173, 20, 0.55);
}
.doc-reuse-tip-text {
  display: block;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #4a5d71;
  line-height: 1.3;
}
.editor-host {
  flex: 1;
  min-height: 0;
  width: 100%;
}

/* 视频 */
.video-card { padding: 14px; }
.video-wrap {
  width: 100%;
  background: #111;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 10px;
  aspect-ratio: 16/9;
  position: relative;
}
.video-player { width: 100%; height: 100%; display: block; object-fit: contain; }
.upload-overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.72);
}
.video-actions {
  position: absolute; bottom: 8px; right: 8px;
}
.btn-reupload {
  background: rgba(0,0,0,0.5); color: #fff; border: 1px solid rgba(255,255,255,0.3);
  border-radius: 4px; padding: 4px 10px; font-size: 12px; cursor: pointer;
  backdrop-filter: blur(4px);
}
.btn-reupload:hover { background: rgba(0,0,0,0.7); }

.upload-zone {
  width: 100%; height: 100%;
  display: flex; flex-direction: column; justify-content: center; align-items: center;
  cursor: pointer; background: #1a1a1a; transition: background 0.2s;
}
.upload-zone:hover { background: #222; }
.upload-icon { font-size: 32px; color: #666; }
.upload-hint { margin: 8px 0 4px; font-size: 13px; color: #aaa; }
.upload-sub { font-size: 11px; color: #666; margin: 0; }
.upload-progress-text { margin-top: 10px; color: #ccc; font-size: 13px; }

.url-row { display: flex; gap: 6px; margin-bottom: 6px; }
.url-input {
  flex: 1; border: 1px solid #d9d9d9; border-radius: 4px;
  padding: 5px 8px; font-size: 12px; color: #555; outline: none;
}
.url-input:focus { border-color: #18a058; }
.btn-sm-green {
  background: #18a058; color: #fff; border: none;
  border-radius: 4px; padding: 5px 12px; font-size: 12px; cursor: pointer;
}
.btn-sm-green:hover { background: #0e7a3e; }
.video-tip { font-size: 11px; color: #999; margin: 0 0 8px; }
.video-type-row { display: flex; align-items: center; gap: 12px; font-size: 12px; }
.vt-label { color: #666; }
.vt-radio { display: flex; align-items: center; gap: 4px; cursor: pointer; color: #555; }

/* 底部 */
.lesson-footer {
  height: 58px;
  display: flex; justify-content: space-between; align-items: center;
  padding: 0 20px; background: rgba(255, 255, 255, 0.88); border-top: 1px solid rgba(221, 228, 237, 0.85); flex-shrink: 0;
  backdrop-filter: blur(8px);
}
.footer-right { display: flex; align-items: center; gap: 12px; }
.save-tip { font-size: 12px; color: #bbb; }
.btn-cancel {
  background: #fff; color: #666; border: 1px solid #d9d9d9;
  border-radius: 5px; padding: 8px 20px; font-size: 13px; cursor: pointer;
}
.btn-cancel:hover { border-color: #999; color: #333; }
.btn-save-main {
  background: #18a058; color: #fff; border: none;
  border-radius: 5px; padding: 9px 26px; font-size: 14px; cursor: pointer; font-weight: 500;
  transition: background 0.2s;
}
.btn-save-main:hover { background: #0e7a3e; }
.btn-save-main:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
