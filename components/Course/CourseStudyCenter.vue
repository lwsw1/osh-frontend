<template>
  <div class="study-page">
    <!-- 顶部导航栏 -->
    <div class="study-topbar">
      <div class="topbar-left">
        <button class="btn-back" @click="goBackToDetail">← 返回列表</button>
        <span class="topbar-sep">|</span>
        <span class="course-name">{{ data.title }}</span>
        <span v-if="currentSection.title" class="section-name-bar">
          <span class="sep-arrow">›</span>
          {{ currentSection.title }}
        </span>
      </div>
      <div class="topbar-right">
        <span v-if="currentSection.freeFlag === 1" class="badge-free">免费试看</span>
      </div>
    </div>

    <!-- 主体：左侧视频 + 右侧面板 -->
    <div class="study-body">
      <!-- 左侧：视频播放器 -->
      <div class="video-col">
        <!-- 播放器 -->
        <div class="player-box">
          <video
            v-if="currentVideoUrl"
            ref="videoEl"
            :src="currentVideoUrl"
            controls
            controlsList="nodownload"
            oncontextmenu="return false"
            class="video-el"
            @ended="onVideoEnded"
          />
          <div v-else class="player-placeholder">
            <div class="placeholder-inner">
              <div class="play-icon-big">▶</div>
              <p class="placeholder-tip">{{ currentSection.title ? '视频加载中...' : '请从右侧选择章节开始学习' }}</p>
            </div>
          </div>
        </div>

        <!-- 视频信息栏 -->
        <div class="video-info-bar">
          <div class="vi-left">
            <span class="vi-title">{{ currentSection.title || '请选择章节' }}</span>
            <span v-if="currentSection.duration" class="vi-duration">
              ⏱ {{ fmtDuration(currentSection.duration) }}
            </span>
          </div>
          <div class="vi-right">
            <button class="btn-qa" @click="showQaPanel = !showQaPanel">
              💬 {{ showQaPanel ? '收起提问区' : '有疑问？去提问' }}
            </button>
          </div>
        </div>

        <!-- 提问区（折叠式，在文章上方；展开后避免长文档导致用户大量滚动） -->
        <Transition name="qa-slide">
          <div v-if="showQaPanel && currentSection.id" class="qa-panel-wrap">
            <ClientOnly>
              <CourseQuestionPanel
                :section-id="currentSection.id"
                :course-id="courseId"
                :access-level="accessLevel"
              />
            </ClientOnly>
          </div>
        </Transition>

        <!-- 文档展示区（有内容时直接展开，无需点击） -->
        <div v-if="renderedDocContent" class="doc-panel-wrap">
          <div ref="docPanelRef" class="doc-panel-content" v-html="renderedDocContent" />
        </div>
      </div>

      <!-- 右侧：章节目录 + 资料 -->
      <div class="sidebar-col">
        <!-- 资料下载（折叠） -->
        <div class="sidebar-section">
          <div class="sidebar-header" @click="toggleMaterials">
            <span class="sidebar-title">📦 课程资料</span>
            <span class="sidebar-toggle">{{ showMaterials ? '▲' : '▼' }}</span>
          </div>
          <div v-if="showMaterials" class="mat-list">
            <div v-if="materialsLoading" class="mat-tip">加载中...</div>
            <div v-else-if="materials.length === 0" class="mat-tip">暂无资料</div>
            <div v-for="mat in materials" :key="mat.id" class="mat-row">
              <span class="mat-icon">📄</span>
              <span class="mat-name">{{ mat.materialName || mat.name }}</span>
              <button class="mat-dl" @click="downloadMat(mat)">下载</button>
            </div>
          </div>
        </div>

        <!-- 章节目录 -->
        <div class="sidebar-section outline-section">
          <div class="sidebar-header-static">
            <span class="sidebar-title">📋 课程目录</span>
            <span class="section-count">{{ totalSections }} 节</span>
          </div>
          <div v-if="outlineLoading" class="mat-tip">加载中...</div>
          <div v-else class="outline-list">
            <div
              v-for="(chapter, ci) in outline"
              :key="chapter.id"
              class="chapter-group"
            >
              <!-- 章标题 -->
              <div class="chapter-title-row" @click="toggleChapter(chapter.id)">
                <span class="ch-badge">第{{ ci + 1 }}章</span>
                <span class="ch-name">{{ chapter.title }}</span>
                <span class="ch-count">{{ (chapter.children || []).length }}节</span>
                <span class="ch-arrow">{{ collapsedChapters.has(chapter.id) ? '▶' : '▼' }}</span>
              </div>
              <!-- 小节列表 -->
              <div v-show="!collapsedChapters.has(chapter.id)" class="section-list">
                <div
                  v-for="(section, si) in chapter.children || []"
                  :key="section.id"
                  class="section-item"
                  :class="{
                    active: currentSection.id === section.id,
                    locked: accessLevel === 'TRIAL' && section.freeFlag !== 1
                  }"
                  @click="selectSection(section)"
                >
                  <span class="sec-num">{{ ci + 1 }}.{{ si + 1 }}</span>
                  <span class="sec-dot" :class="section.sectionType === 'video' ? 'dot-video' : 'dot-text'" />
                  <span class="sec-name">{{ section.title }}</span>
                  <span v-if="section.freeFlag === 1" class="sec-free">免费</span>
                  <span v-else-if="accessLevel === 'TRIAL'" class="sec-lock">🔒</span>
                  <span v-if="currentSection.id === section.id" class="sec-playing">▶</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- 锁定提示 -->
    <Transition name="fade">
      <div v-if="lockedTipVisible" class="locked-toast">
        🔒 该章节需要购买课程后才能观看
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { fetchConfig } from '~/composables/useHttp';
import { getAuthHeaders, apiGetMaterialUrl, normalizeSectionFreeFlag } from '~/composables/Api/Course/course';
import CourseQuestionPanel from '~/components/Course/CourseQuestionPanel.vue';
import { renderCourseDoc, extractCourseDocImageSrcs, replaceCourseDocImageSrc } from '~/composables/useCourseDoc';

const props = defineProps({
  data: { type: Object, required: true },
});

// accessLevel: FULL=全部可看，TRIAL=仅试看，从课程详情数据里取
const accessLevel = computed(() => {
  const level = props.data?.accessLevel || 'TRIAL';
  console.log('[CourseStudyCenter] accessLevel:', level, '| data.accessLevel:', props.data?.accessLevel);
  return level;
});

function mapOutlineSection(section, chapterId) {
  return {
    ...section,
    parentId: section.parentId || section.chapterId || chapterId,
    freeFlag: normalizeSectionFreeFlag(section.freeFlag),
  };
}

function isSectionFreePreview(section) {
  return normalizeSectionFreeFlag(section?.freeFlag) === 1;
}
const router = useRouter();
const courseId = computed(() => props.data?.id || route.params.id);

function goBackToDetail() {
  router.push(`/course_detail/${courseId.value}`);
}

// ===== 当前播放小节 =====
const currentSection = ref({});
const currentVideoUrl = ref('');
const videoEl = ref(null);
const docPanelRef = ref(null);
const renderedDocContent = ref('');

// 渲染文档内容并刷新其中的图片临时 URL（照搬编辑器的 resolveImgUrls 逻辑）
async function renderAndRefreshDoc(textContent) {
  if (!textContent) {
    renderedDocContent.value = '';
    return;
  }

  // 先渲染出 HTML 立即显示
  renderedDocContent.value = renderCourseDoc(textContent);

  // 等 v-html 渲染到真实 DOM 后再操作
  await nextTick();

  const container = docPanelRef.value;
  if (!container) return;

  const imgs = container.querySelectorAll('img');
  if (!imgs.length) return;

  const pathsToResolve = [];
  imgs.forEach((img) => {
    const dataSrc = img.dataset.src || '';
    const src = img.getAttribute('src') || '';
    // 优先用 data-src（相对路径），其次用 src（相对路径或过期临时 URL），排除 base64
    const pathToUse = (dataSrc && !dataSrc.startsWith('data:')) ? dataSrc
      : (!src.startsWith('data:') ? src : '');
    if (pathToUse && !pathsToResolve.includes(pathToUse)) {
      pathsToResolve.push(pathToUse);
    }
  });

  if (!pathsToResolve.length) return;

  try {
    const token = useCookie('token');
    const tokenValue = token.value || (process.client ? localStorage.getItem('token') || '' : '');

    const response = await $fetch('/course/content/image-urls', {
      method: 'POST',
      body: { paths: pathsToResolve, minute: 1440 },
      baseURL: fetchConfig.baseURL,
      headers: {
        appid: fetchConfig.headers.appid,
        token: tokenValue,
      },
    });

    if (response?.code === 200 && response?.data) {
      // 后端返回的 Map key 是 fileKey（相对路径），value 是新临时 URL
      const urlMap = response.data;

      imgs.forEach((img) => {
        const dataSrc = img.dataset.src || '';
        const src = img.getAttribute('src') || '';

        // 先尝试用 data-src 匹配
        if (dataSrc && !dataSrc.startsWith('data:') && urlMap[dataSrc]) {
          img.src = urlMap[dataSrc];
          return;
        }
        // 再尝试用 src 匹配（src 本身是相对路径）
        if (src && !src.startsWith('data:') && !src.startsWith('http') && urlMap[src]) {
          img.src = urlMap[src];
          img.dataset.src = src;
          return;
        }
        // 旧数据：src 是过期临时 URL，后端提取了 fileKey 作为 key，src 包含 fileKey
        if (src.startsWith('http')) {
          for (const [fileKey, newUrl] of Object.entries(urlMap)) {
            if (src.includes(fileKey)) {
              img.src = newUrl;
              img.dataset.src = fileKey;
              break;
            }
          }
        }
      });
    }
  } catch (err) {
    console.warn('[CourseStudyCenter] 批量获取图片临时 URL 失败', err);
  }
}

// ===== 大纲 =====
const outline = ref([]);
const outlineLoading = ref(false);
const collapsedChapters = ref(new Set());

const totalSections = computed(() =>
  outline.value.reduce((sum, ch) => sum + (ch.children?.length || 0), 0)
);

function toggleChapter(id) {
  const s = new Set(collapsedChapters.value);
  if (s.has(id)) s.delete(id);
  else s.add(id);
  collapsedChapters.value = s;
}

async function loadOutline() {
  outlineLoading.value = true;
  try {
    const res = await $fetch(`/course/section/outline/${courseId.value}`, {
      baseURL: fetchConfig.baseURL,
      headers: getAuthHeaders(),
    });
    if (res?.code === 200) {
      outline.value = (res.data || []).map(ch => ({
        ...ch,
        children: (ch.children || ch.sections || []).map(s => mapOutlineSection(s, ch.id)),
      }));

      // 优先：URL 传入的 sectionId 定位到指定小节
      const targetId = route.query.sectionId ? String(route.query.sectionId) : null;
      if (targetId) {
        for (const ch of outline.value) {
          const found = (ch.children || []).find(s => String(s.id) === targetId);
          if (found) {
            selectSection(found);
            return;
          }
        }
      }

      // 其次：选第一个有视频的小节（FULL 模式选任意，TRIAL 模式优先选免费节）
      for (const ch of outline.value) {
        for (const s of ch.children || []) {
          if (s.mediaUrl && !s.mediaUrl.includes('pending')) {
            if (accessLevel.value === 'FULL' || isSectionFreePreview(s)) {
              selectSection(s);
              return;
            }
          }
        }
      }
      // 最后：选第一个免费小节（TRIAL 模式兜底）
      for (const ch of outline.value) {
        for (const s of ch.children || []) {
          if (accessLevel.value === 'FULL' || isSectionFreePreview(s)) {
            selectSection(s);
            return;
          }
        }
      }
    }
  } catch {}
  finally { outlineLoading.value = false; }
}

function selectSection(section) {
  // TRIAL 模式下，非免费章节拦截
  if (accessLevel.value === 'TRIAL' && !isSectionFreePreview(section)) {
    showLockedTip();
    return;
  }
  currentSection.value = section;
  currentVideoUrl.value = section.mediaUrl && !section.mediaUrl.includes('pending')
    ? section.mediaUrl : '';
  // 先用大纲快照回显，再按 section/content 接口拉最新文档内容覆盖。
  renderAndRefreshDoc(section.textContent || '');
  if (String(section.sectionType || section.type || '').toLowerCase() === 'text') {
    refreshSectionDocContent(section.id);
  }
}

async function refreshSectionDocContent(sectionId) {
  if (!sectionId) return;
  try {
    const res = await $fetch(`/course/section/content/${courseId.value}/${sectionId}`, {
      baseURL: fetchConfig.baseURL,
      headers: getAuthHeaders(),
    });
    if (res?.code === 200) {
      const latest = res.data || '';
      await renderAndRefreshDoc(latest);
      const sec = currentSection.value || {};
      currentSection.value = { ...sec, textContent: latest };
    } else if (res?.code !== 200 && accessLevel.value === 'TRIAL') {
      showLockedTip();
    }
  } catch (err) {
    console.warn('[CourseStudyCenter] refreshSectionDocContent failed', err);
  }
}

// 锁定提示弹窗
const lockedTipVisible = ref(false);
function showLockedTip() {
  lockedTipVisible.value = true;
  setTimeout(() => { lockedTipVisible.value = false; }, 3000);
}

function onVideoEnded() {
  // 自动播放下一节
  for (let ci = 0; ci < outline.value.length; ci++) {
    const children = outline.value[ci].children || [];
    for (let si = 0; si < children.length; si++) {
      if (children[si].id === currentSection.value.id) {
        const next = children[si + 1] || outline.value[ci + 1]?.children?.[0];
        if (next) selectSection(next);
        return;
      }
    }
  }
}

// ===== 资料 =====
const showMaterials = ref(false);
const materials = ref([]);
const materialsLoading = ref(false);

async function toggleMaterials() {
  showMaterials.value = !showMaterials.value;
  if (showMaterials.value && materials.value.length === 0) {
    materialsLoading.value = true;
    try {
      const res = await $fetch(`/course/${courseId.value}/materials`, {
        baseURL: fetchConfig.baseURL,
        headers: getAuthHeaders(),
      });
      if (res?.code === 200) materials.value = res.data || [];
    } catch {}
    finally { materialsLoading.value = false; }
  }
}

async function downloadMat(mat) {
  const id = mat.id || mat.materialId;
  if (!id) { window.open(mat.fileUrl || mat.url, '_blank'); return; }
  try {
    const res = await apiGetMaterialUrl(id, 120);
    window.open(res?.code === 200 && res.data ? res.data : (mat.fileUrl || mat.url), '_blank');
  } catch { window.open(mat.fileUrl || mat.url, '_blank'); }
}

// ===== 问题面板开关 =====
const showQaPanel = ref(false);

// ===== 工具 =====
function fmtDuration(sec) {
  if (!sec) return '';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

onMounted(loadOutline);
</script>

<style scoped>
/* ===== 整体布局 ===== */
.study-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(24, 160, 88, 0.08), transparent 28%),
    radial-gradient(circle at top right, rgba(32, 128, 240, 0.08), transparent 24%),
    linear-gradient(180deg, #0d1017 0%, #0b0d12 100%);
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* ===== 顶部导航 ===== */
.study-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 52px;
  background: #1a1a1a;
  border-bottom: 1px solid #2a2a2a;
  flex-shrink: 0;
}
.topbar-left { display: flex; align-items: center; gap: 10px; min-width: 0; overflow: hidden; }
.btn-back {
  background: none; border: 1px solid #444; color: #ccc;
  border-radius: 4px; padding: 5px 12px; font-size: 13px;
  cursor: pointer; white-space: nowrap; transition: all 0.2s; flex-shrink: 0;
}
.btn-back:hover { border-color: #18a058; color: #18a058; }
.topbar-sep { color: #444; flex-shrink: 0; }
.course-name { font-size: 14px; font-weight: 600; color: #eee; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.section-name-bar { font-size: 13px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sep-arrow { color: #555; margin-right: 4px; }
.topbar-right { flex-shrink: 0; }
.badge-free { font-size: 12px; color: #18a058; border: 1px solid #18a058; padding: 2px 8px; border-radius: 10px; }

/* ===== 主体 ===== */
.study-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
  gap: 18px;
  padding: 18px 18px 24px;
  box-sizing: border-box;
}

/* ===== 左侧视频区 ===== */
.video-col {
  flex: 4;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow-y: auto;
  scrollbar-width: none;
}
.video-col::-webkit-scrollbar { display: none; }

.player-box {
  background: #000;
  width: min(100%, 1340px);
  aspect-ratio: 16/9;
  flex-shrink: 0;
  margin: 0 auto;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 28px 70px rgba(0, 0, 0, 0.42);
}
.video-el {
  width: 100%;
  height: 100%;
  display: block;
  background: #000;
  object-fit: contain;
}
.player-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at center, #1a1a2e 0%, #000 100%);
}
.placeholder-inner { text-align: center; }
.play-icon-big { font-size: 64px; color: rgba(255,255,255,0.15); margin-bottom: 16px; }
.placeholder-tip { font-size: 14px; color: #666; }

/* 视频信息栏 */
.video-info-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  background: rgba(20, 24, 32, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  flex-shrink: 0;
  width: min(100%, 1340px);
  margin: 16px auto 0;
  box-sizing: border-box;
  backdrop-filter: blur(12px);
  box-shadow: 0 16px 40px rgba(0,0,0,0.22);
}
.vi-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
.vi-title { font-size: 15px; font-weight: 600; color: #f4f7fb; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vi-duration { font-size: 12px; color: #8f9bb0; flex-shrink: 0; }
.vi-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.btn-qa {
  background: linear-gradient(135deg, #ff9b29 0%, #ff7a00 100%);
  color: #fff;
  border: none;
  border-radius: 999px;
  padding: 9px 16px;
  font-size: 13px;
  cursor: pointer;
  font-weight: 600;
  flex-shrink: 0;
  transition: transform 0.2s, box-shadow 0.2s, filter 0.2s;
  box-shadow: 0 10px 24px rgba(255, 122, 0, 0.28);
}
.btn-qa:hover {
  transform: translateY(-1px);
  filter: brightness(1.03);
  box-shadow: 0 14px 28px rgba(255, 122, 0, 0.34);
}

/* 文档展示面板 */
.doc-panel-wrap {
  background: rgba(20, 24, 32, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 18px;
  flex-shrink: 0;
  width: min(100%, 1340px);
  margin: 18px auto 0;
  overflow: visible;
  box-sizing: border-box;
  backdrop-filter: blur(12px);
  box-shadow: 0 18px 42px rgba(0,0,0,0.22);
}
.doc-panel-content {
  padding: 24px 28px 28px;
  font-size: 15px;
  line-height: 1.88;
  color: #d5deea;
}
/* 文档内容样式 */
.doc-panel-content :deep(h1) { font-size: 28px; font-weight: 800; color: #f7fbff; margin: 8px 0 16px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 10px; }
.doc-panel-content :deep(h2) { font-size: 22px; font-weight: 700; color: #f1f6fd; margin: 24px 0 10px; }
.doc-panel-content :deep(h3) { font-size: 18px; font-weight: 700; color: #5ed39b; margin: 18px 0 8px; }
.doc-panel-content :deep(h4) { font-size: 15px; font-weight: 700; color: #dbe7f6; margin: 14px 0 6px; }
.doc-panel-content :deep(p) { margin: 10px 0; }
.doc-panel-content :deep(blockquote) {
  border-left: 4px solid #29c06f;
  margin: 16px 0;
  padding: 14px 16px;
  background: linear-gradient(90deg, rgba(41, 192, 111, 0.15), rgba(41, 192, 111, 0.05));
  color: #d7efe3;
  border-radius: 0 12px 12px 0;
}
.doc-panel-content :deep(pre) {
  background: #0b1320;
  color: #d4dce8;
  padding: 14px 16px;
  border-radius: 12px;
  overflow-x: auto;
  margin: 12px 0;
  font-family: monospace;
  font-size: 13px;
  border: 1px solid rgba(255,255,255,0.08);
}
.doc-panel-content :deep(code) { background: rgba(17, 24, 39, 0.92); color: #6ae0a6; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px; }
.doc-panel-content :deep(a) { color: #72d9ff; text-decoration: underline; }
.doc-panel-content :deep(hr) { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 16px 0; }
.doc-panel-content :deep(ul) { padding-left: 20px; }
.doc-panel-content :deep(ol) { padding-left: 20px; }
.doc-panel-content :deep(li) { margin: 6px 0; }
.doc-panel-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 14px;
  margin: 14px auto;
  display: block;
  box-shadow: 0 14px 30px rgba(0,0,0,0.25);
  border: 1px solid rgba(255,255,255,0.08);
}
.doc-panel-content :deep(table) { border-collapse: collapse; width: 100%; margin: 8px 0; }
.doc-panel-content :deep(th), .doc-panel-content :deep(td) { border: 1px solid rgba(255,255,255,0.08); padding: 10px 12px; font-size: 13px; }
.doc-panel-content :deep(th) { background: rgba(255,255,255,0.06); color: #f0f5fb; font-weight: 700; }

/* 文档面板动画 */
.doc-slide-enter-active, .doc-slide-leave-active { transition: all 0.25s ease; overflow: hidden; }
.doc-slide-enter-from, .doc-slide-leave-to { opacity: 0; max-height: 0; }
.doc-slide-enter-to, .doc-slide-leave-from { opacity: 1; max-height: 480px; }

/* 问题面板包裹 */
/* 提问区现在位于文章上方，去掉原来用于"页面底部留白"的 20px 下内边距，
   让下方的 .doc-panel-wrap 通过自身 18px 上外边距维持一致的视觉间距。 */
.qa-panel-wrap {
  width: min(100%, 1340px);
  margin: 18px auto 0;
  padding: 0;
  background: transparent;
  box-sizing: border-box;
}

/* 提问区展开动画 */
.qa-slide-enter-active,
.qa-slide-leave-active {
  transition: all 0.28s ease;
  overflow: hidden;
}
.qa-slide-enter-from,
.qa-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
  max-height: 0;
}
.qa-slide-enter-to,
.qa-slide-leave-from {
  opacity: 1;
  transform: translateY(0);
  max-height: 1000px;
}

/* ===== 右侧侧边栏 ===== */
.sidebar-col {
  flex: 1;
  min-width: 260px;
  max-width: 320px;
  background: rgba(18, 21, 29, 0.94);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 48px rgba(0,0,0,0.24);
  backdrop-filter: blur(14px);
}

.sidebar-section {
  border-bottom: 1px solid #2a2a2a;
  flex-shrink: 0;
}
.outline-section {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.outline-section .outline-list {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.12) transparent;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
}
.sidebar-header:hover { background: #1e1e1e; }
.sidebar-header-static {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.sidebar-title { font-size: 13px; font-weight: 700; color: #d7e1ee; }
.sidebar-toggle { font-size: 10px; color: #6f7c8f; }
.section-count { font-size: 12px; color: #6f7c8f; }

/* 资料列表 */
.mat-list { padding: 8px 12px 12px; }
.mat-tip { font-size: 12px; color: #555; padding: 8px 4px; }
.mat-row {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 4px; border-bottom: 1px solid #1e1e1e;
}
.mat-row:last-child { border-bottom: none; }
.mat-icon { font-size: 14px; flex-shrink: 0; }
.mat-name { flex: 1; font-size: 12px; color: #aaa; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mat-dl {
  background: none; border: 1px solid #18a058; color: #18a058;
  border-radius: 3px; padding: 2px 8px; font-size: 11px; cursor: pointer;
  flex-shrink: 0; transition: all 0.15s;
}
.mat-dl:hover { background: #18a058; color: #fff; }

/* 章节目录 */
.outline-list { overflow-y: auto; }
.chapter-group { border-bottom: 1px solid #1e1e1e; }
.chapter-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  cursor: pointer;
  background: #1a1a1a;
  user-select: none;
  transition: background 0.15s;
}
.chapter-title-row:hover { background: #222; }
.ch-badge {
  font-size: 10px; color: #18a058; border: 1px solid #18a058;
  padding: 1px 5px; border-radius: 3px; flex-shrink: 0;
}
.ch-name { flex: 1; font-size: 13px; font-weight: 700; color: #e4ecf7; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ch-count { font-size: 11px; color: #6f7c8f; flex-shrink: 0; }
.ch-arrow { font-size: 9px; color: #6f7c8f; flex-shrink: 0; }

.section-list { background: #111; }
.section-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px 10px 24px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid #1a1a1a;
}
.section-item.locked {
  cursor: not-allowed;
  opacity: 0.5;
}
.section-item.locked:hover { background: transparent; }
.section-item:last-child { border-bottom: none; }
.section-item:hover { background: #171c24; }
.section-item.active {
  background: linear-gradient(90deg, rgba(24,160,88,0.22), rgba(24,160,88,0.08));
  border-left: 3px solid #18a058;
  padding-left: 21px;
}
.sec-num { font-size: 11px; color: #6f7c8f; width: 24px; flex-shrink: 0; }
.sec-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.dot-video { background: #2080f0; }
.dot-text { background: #18a058; }
.sec-name { flex: 1; font-size: 13px; color: #c6d0de; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.section-item.active .sec-name { color: #66db9f; font-weight: 700; }
.sec-free { font-size: 10px; color: #18a058; border: 1px solid #18a058; padding: 1px 4px; border-radius: 3px; flex-shrink: 0; }
.sec-lock { font-size: 12px; flex-shrink: 0; opacity: 0.6; }
.sec-playing { font-size: 10px; color: #18a058; flex-shrink: 0; }

/* 锁定提示 toast */
.locked-toast {
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.85);
  color: #fff;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  z-index: 9999;
  white-space: nowrap;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
}

@media (max-width: 1280px) {
  .study-body {
    padding: 12px;
    gap: 12px;
  }

  .sidebar-col {
    min-width: 280px;
  }
}

@media (max-width: 1024px) {
  .study-body {
    flex-direction: column;
    overflow: visible;
  }

  .sidebar-col {
    max-width: none;
    min-width: 0;
  }
}
</style>
