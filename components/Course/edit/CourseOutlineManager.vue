<template>
  <div ref="outlineWrapRef" class="outline-wrap">
    <div class="outline-header">
      <div class="outline-title">课程目录</div>
      <div class="header-right">
        <button class="btn-download-mat" @click="toggleMaterials">
          📦 资料下载
        </button>
        <button v-if="editMode" class="btn-green" @click="addChapterInline">+ 新增章节</button>
      </div>
    </div>
    <div v-if="editMode" class="drag-hint">拖动手柄 ⠿ 可调整章/小节顺序</div>

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

    <!-- 可排序容器：只放章节块，插入行放在外面，避免 Sortable 索引错乱 -->
    <div v-else ref="chapterListRef" class="chapter-list">
      <div
        v-for="(chapter, ci) in outline"
        :key="chapter.id"
        class="chapter-block chapter-sort-item"
        :data-chapter-id="chapter.id"
      >
        <!-- 章节行 -->
        <div class="chapter-row" @click="toggleChapter(chapter.id)">
          <span
            v-if="editMode"
            class="drag-handle chapter-drag-handle"
            title="拖拽调整章节顺序"
            @click.stop
          >⠿</span>
          <span v-if="isCourseLink(chapter)" class="collapse-icon link-ico">🔗</span>
          <span v-else class="collapse-icon">{{ collapsedChapters.has(chapter.id) ? '▶' : '▼' }}</span>
          <span class="chapter-badge">第 {{ ci + 1 }} 章</span>
          <!-- 章节标题：普通显示 / 课程链接 / 内联编辑 -->
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
          <span
            v-else-if="isCourseLink(chapter)"
            class="chapter-name chapter-link"
            title="点击跳转到引入的课程"
            @click.stop="goToLinkedCourse(chapter)"
          >{{ chapter.title }}</span>
          <span v-else class="chapter-name">{{ chapter.title }}</span>
          <span v-if="isCourseLink(chapter)" class="link-tag">引入课程</span>
          <span v-else class="chapter-count">{{ (chapter.children || []).length }} 节</span>
          <div v-if="editMode" class="chapter-actions" @click.stop>
            <span v-if="!isCourseLink(chapter)" class="action-link primary" @click="addSectionInline(chapter)">+ 新增小节</span>
            <span class="action-link" @click="insertChapterAfter(ci)">在此后插入</span>
            <span class="action-link" @click="startEditChapter(chapter)">{{ isCourseLink(chapter) ? '改标题' : '编辑' }}</span>
            <span class="action-link danger" @click="confirmDeleteChapter(chapter)">删除</span>
          </div>
        </div>

        <!-- 小节列表（可折叠；引入课程的章无小节，不渲染） -->
        <div
          v-if="!isCourseLink(chapter)"
          v-show="!collapsedChapters.has(chapter.id)"
        >
          <!-- 仅小节行参与 Sortable，避免插入行干扰索引 -->
          <div
            class="section-list"
            :data-chapter-index="ci"
            :data-chapter-id="chapter.id"
          >
            <div
              v-if="!editMode && (!chapter.children || chapter.children.length === 0)"
              class="no-section"
            >暂无小节</div>
            <div
              v-for="(section, si) in chapter.children || []"
              :key="section.id"
              class="section-row"
              :class="{ clickable: !editMode }"
              @click="!editMode && goToStudy(section)"
            >
              <span
                v-if="editMode"
                class="drag-handle section-drag-handle"
                title="拖拽调整小节顺序（可跨章）"
                @click.stop
              >⠿</span>
              <span class="section-num">{{ ci + 1 }}.{{ si + 1 }}</span>
              <span v-if="isCourseLink(section)" class="section-dot" style="background:#2080f0"></span>
              <span v-else class="section-dot" :style="{ background: section.sectionType === 'video' ? '#2080f0' : '#18a058' }"></span>
              <span
                v-if="isCourseLink(section)"
                class="section-name chapter-link"
                title="点击跳转到引入的课程"
                @click.stop="goToLinkedCourse(section)"
              >🔗 {{ section.title }}</span>
              <span v-else class="section-name">{{ section.title }}</span>
              <span v-if="isCourseLink(section)" class="link-tag">引入课程</span>
              <span v-else-if="section.freeFlag === 1" class="free-tag">免费试看</span>
              <div class="section-right">
                <template v-if="!editMode">
                  <span v-if="isCourseLink(section)" class="free-label">引入</span>
                  <span v-else-if="section.freeFlag === 1" class="free-label">免费</span>
                  <span v-else-if="accessLevel !== 'FULL'" style="color:#ccc;font-size:13px">🔒</span>
                </template>
                <template v-else>
                  <span v-if="!isCourseLink(section)" class="action-link primary" @click.stop="goToLesson(section)">编辑内容</span>
                  <span class="action-link danger" @click.stop="confirmDeleteSection(section)">删除</span>
                </template>
              </div>
            </div>
          </div>

          <!-- 新增小节输入行放在排序容器外 -->
          <div v-if="addingSectionChapterId === chapter.id" class="inline-add-row">
            <span class="section-num">{{ ci + 1 }}.{{ (chapter.children || []).length + 1 }}</span>
            <input
              v-model="newSectionTitle"
              class="inline-input"
              placeholder="输入小节标题后回车保存，或点右侧「引入已有课程」"
              @keyup.enter="saveNewSection(chapter)"
              @keyup.escape="cancelAddSection"
              v-focus
            />
            <span class="action-link primary" style="margin-left:8px" @click="saveNewSection(chapter)">保存</span>
            <span class="action-link" style="margin-left:8px" @click="openImportSectionModal(chapter)">引入已有课程</span>
            <span class="action-link danger" style="margin-left:8px" @click="cancelAddSection">取消</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 插入/新增章节输入行（在排序容器外，不干扰拖拽） -->
    <div v-if="!loading && insertAfterIndex !== null" class="chapter-block insert-chapter-block">
      <div class="chapter-row">
        <span class="chapter-badge">第 {{ insertAfterIndex + 2 }} 章</span>
        <input
          v-model="insertChapterTitle"
          class="inline-input"
          placeholder="输入新章节标题，回车保存，Esc取消"
          @blur="saveInsertChapter(insertAfterIndex)"
          @keyup.enter="saveInsertChapter(insertAfterIndex)"
          @keyup.escape="cancelInsertChapter"
          v-focus
        />
        <span class="action-link danger" style="margin-left:8px" @click="cancelInsertChapter">取消</span>
      </div>
    </div>

    <div v-if="!loading && addingChapter" class="chapter-block insert-chapter-block">
        <div class="chapter-row">
          <span class="chapter-badge">第 {{ outline.length + 1 }} 章</span>
          <input
            v-model="newChapterTitle"
            class="inline-input"
            placeholder="输入章节标题后回车保存，或点右侧「引入已有课程」"
            @keyup.enter="saveNewChapter"
            @keyup.escape="cancelAddChapter"
            v-focus
          />
          <span class="action-link primary" style="margin-left:8px" @click="saveNewChapter">保存</span>
          <span class="action-link" style="margin-left:8px" @click="openImportModal">引入已有课程</span>
          <span class="action-link danger" style="margin-left:8px" @click="cancelAddChapter">取消</span>
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

  <!-- 引入课程作为章：课程选择弹窗（仅在「新增章节 → 引入已有课程」时弹出） -->
  <n-modal
    v-if="showImport"
    :show="showImport"
    preset="card"
    :title="importMode === 'section' ? '引入课程作为小节' : '引入课程作为章'"
    style="width: 520px; max-width: 92vw"
    :segmented="{ content: true }"
    :mask-closable="!chapterBusy"
    @update:show="closeImportModal"
  >
    <div class="import-search">
      <input
        v-model="importKeyword"
        class="import-input"
        placeholder="输入课程名称搜索，回车查询"
        @keyup.enter="searchImportCourses"
      />
      <button class="btn-green" :disabled="importLoading" @click="searchImportCourses">搜索</button>
    </div>
    <div class="import-body">
      <div v-if="importLoading" class="import-tip">搜索中...</div>
      <div v-else-if="importList.length === 0" class="import-tip">未找到课程，换个关键词试试</div>
      <div
        v-for="c in importList"
        :key="c.id"
        class="import-item"
        :class="{ disabled: String(c.id) === String(courseId) }"
        @click="confirmImport(c)"
      >
        <img class="import-cover" :src="c.cover || coverPlaceholder" alt="" />
        <div class="import-meta">
          <div class="import-name">{{ c.title }}</div>
          <div class="import-sub">课程ID：{{ c.id }}<span v-if="String(c.id) === String(courseId)" class="import-self">（不能引入自己）</span></div>
        </div>
        <span v-if="String(c.id) !== String(courseId)" class="import-pick">引入</span>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { createDiscreteApi } from 'naive-ui';
import { useRouter } from 'vue-router';
import Sortable from 'sortablejs';
import { fetchConfig } from '~/composables/useHttp';
import { getAuthHeaders, apiAddChapter, apiAddVideoSection, apiAddTextSection, apiDeleteSection, apiGetMaterialUrl, apiGetCourseMaterials, normalizeSectionFreeFlag, apiReorderSections, apiSearchCourses, apiAddCourseLinkSection } from '~/composables/Api/Course/course';
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

// ===== 引入课程作为章 =====
const coverPlaceholder = 'https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg';

// 该章是否为「引入的课程链接」
function isCourseLink(chapter: any): boolean {
  return chapter?.type === 'course_link';
}

// 点击引入课程的章标题：跳转到被引入课程的详情页
function goToLinkedCourse(chapter: any) {
  const target = chapter?.linkedCourseId;
  if (!target) {
    message.warning('该引入课程已失效');
    return;
  }
  router.push(`/course_detail/${target}`);
}

const loading = ref(false);
const outline = ref<any[]>([]);
const outlineWrapRef = ref<HTMLElement | null>(null);
const chapterListRef = ref<HTMLElement | null>(null);
let chapterSortable: Sortable | null = null;
const sectionSortables: Sortable[] = [];

onMounted(() => {
  loadOutline();
});

onUnmounted(() => {
  destroySortables();
});

// ===== 资料下载 =====
const showMaterials = ref(false);
const materials = ref<any[]>([]);
const materialsLoading = ref(false);

async function loadMaterials(force = false) {
  if (!force && materials.value.length > 0) return;
  materialsLoading.value = true;
  try {
    const res: any = await apiGetCourseMaterials(props.courseId);
    if (res?.code === 200 && Array.isArray(res.data)) {
      materials.value = res.data;
    } else if (res?.code === 401 || res?.msg?.includes('登录')) {
      message.warning('登录已失效，请刷新页面重新登录后再查看资料');
    } else if (res?.code !== 200) {
      message.error(res?.msg || '加载资料失败');
    }
  } catch (e) {
    message.error('加载资料失败，请稍后重试');
  } finally {
    materialsLoading.value = false;
  }
}

// 点击资料下载按钮：展开/收起，首次展开时加载
function toggleMaterials() {
  showMaterials.value = !showMaterials.value;
  if (showMaterials.value) loadMaterials(true);
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
    await nextTick();
    initSortables();
  }
}

// ===== SortableJS 拖拽排序 =====
// 防止排序/插入过程中重复提交或并发操作
const chapterBusy = ref(false);

function destroySortables() {
  chapterSortable?.destroy();
  chapterSortable = null;
  sectionSortables.forEach((s) => s.destroy());
  sectionSortables.length = 0;
}

async function initSortables() {
  destroySortables();
  if (!props.editMode || loading.value) return;
  await nextTick();
  const chapterEl = chapterListRef.value;
  if (!chapterEl) return;

  chapterSortable = Sortable.create(chapterEl, {
    animation: 150,
    handle: '.chapter-drag-handle',
    draggable: '.chapter-sort-item',
    ghostClass: 'sort-ghost',
    chosenClass: 'sort-chosen',
    forceFallback: true,
    fallbackOnBody: true,
    fallbackTolerance: 3,
    onEnd: (evt) => {
      if (chapterBusy.value || evt.oldIndex == null || evt.newIndex == null) return;
      if (evt.oldIndex === evt.newIndex) return;
      // 立刻同步 Vue 数据，防止 Sortable 改 DOM 后被 Vue 重渲染还原
      const arr = [...outline.value];
      const [moved] = arr.splice(evt.oldIndex, 1);
      arr.splice(evt.newIndex, 0, moved);
      outline.value = arr;
      persistChapterOrder(arr);
    },
  });

  const sectionLists = outlineWrapRef.value?.querySelectorAll('.section-list[data-chapter-index]') || [];
  sectionLists.forEach((el) => {
    const ci = Number((el as HTMLElement).dataset.chapterIndex);
    const chapter = outline.value[ci];
    if (!chapter || isCourseLink(chapter)) return;
    sectionSortables.push(
      Sortable.create(el as HTMLElement, {
        group: 'course-sections',
        animation: 150,
        handle: '.section-drag-handle',
        draggable: '.section-row',
        filter: '.inline-add-row,.no-section',
        preventOnFilter: true,
        ghostClass: 'sort-ghost',
        chosenClass: 'sort-chosen',
        forceFallback: true,
        fallbackOnBody: true,
        fallbackTolerance: 3,
        onEnd: (evt) => {
          if (chapterBusy.value || evt.oldIndex == null || evt.newIndex == null) return;
          const fromCi = Number((evt.from as HTMLElement).dataset.chapterIndex);
          const toCi = Number((evt.to as HTMLElement).dataset.chapterIndex);
          if (Number.isNaN(fromCi) || Number.isNaN(toCi)) return;
          const toChapter = outline.value[toCi];
          if (isCourseLink(toChapter)) {
            message.warning('引入课程的章不能放入小节');
            loadOutline();
            return;
          }
          if (fromCi === toCi && evt.oldIndex === evt.newIndex) return;
          moveSection(fromCi, evt.oldIndex, toCi, evt.newIndex);
        },
      }),
    );
  });
}

// 将章节新顺序写回后端
async function persistChapterOrder(chapters: any[]) {
  const items = chapters.map((ch, i) => ({ id: ch.id, parentId: 0, sort: i + 1 }));
  chapterBusy.value = true;
  try {
    const res: any = await apiReorderSections({ courseId: Number(props.courseId), items });
    if (res?.code !== 200) throw new Error(res?.msg || '排序保存失败');
    message.success('章节顺序已保存');
    await loadOutline();
  } catch (err: any) {
    message.error(err?.message || err?.data?.msg || '排序保存失败，已恢复原顺序');
    await loadOutline();
  } finally {
    chapterBusy.value = false;
  }
}

// ===== 在指定章节后插入新章节 =====
const insertAfterIndex = ref<number | null>(null);
const insertChapterTitle = ref('');

function insertChapterAfter(index: number) {
  if (chapterBusy.value) return;
  // 关闭其它内联输入，避免互相干扰
  addingChapter.value = false;
  editingChapterId.value = null;
  addingSectionChapterId.value = null;
  insertAfterIndex.value = index;
  insertChapterTitle.value = '';
}

function cancelInsertChapter() {
  insertAfterIndex.value = null;
  insertChapterTitle.value = '';
}

async function saveInsertChapter(afterIndex: number) {
  // blur 与 enter 可能同时触发，用 busy + 标题判断双重保护
  if (chapterBusy.value) return;
  const title = insertChapterTitle.value.trim();
  if (!title) { cancelInsertChapter(); return; }
  chapterBusy.value = true;
  try {
    // 1. 先创建新章节（暂时排到末尾），后端返回新章节 id
    const createRes: any = await apiAddChapter({
      courseId: Number(props.courseId),
      title,
      sort: outline.value.length + 1,
    });
    if (createRes?.code !== 200 || !createRes?.data) throw new Error(createRes?.msg || '插入失败');
    const newId = createRes.data;
    // 2. 把新章节插到目标位置，整体重排一次写回（原子）
    const ids = outline.value.map((c: any) => c.id);
    ids.splice(afterIndex + 1, 0, newId);
    const items = ids.map((id: any, i: number) => ({ id, parentId: 0, sort: i + 1 }));
    const res: any = await apiReorderSections({ courseId: Number(props.courseId), items });
    if (res?.code !== 200) throw new Error(res?.msg || '插入失败');
    message.success('章节已插入');
    cancelInsertChapter();
    await loadOutline();
  } catch (err: any) {
    message.error(err?.message || err?.data?.msg || '插入失败');
    await loadOutline();
  } finally {
    chapterBusy.value = false;
  }
}

// 把 [fromCi].children[fromSi] 移动到 [toCi] 的第 toSi 个位置（可跨章），重排受影响章节的 sort
async function moveSection(fromCi: number, fromSi: number, toCi: number, toSi: number) {
  if (chapterBusy.value) return;
  const fromChapter = outline.value[fromCi];
  const toChapter = outline.value[toCi];
  if (!fromChapter || !toChapter) return;
  if (isCourseLink(toChapter)) {
    message.warning('引入课程的章不能放入小节');
    return;
  }
  const section = (fromChapter.children || [])[fromSi];
  if (!section) return;
  if (fromCi === toCi && fromSi === toSi) return;

  // 乐观更新：从源章移除，再插入目标位置（Sortable 的 newIndex 即目标下标）
  fromChapter.children.splice(fromSi, 1);
  let insertIdx = toSi;
  if (insertIdx > (toChapter.children?.length || 0)) insertIdx = toChapter.children.length;
  section.parentId = toChapter.id;
  toChapter.children.splice(insertIdx, 0, section);

  // 收集受影响章节下所有小节的新 parentId + sort
  const affected = fromCi === toCi ? [toChapter] : [fromChapter, toChapter];
  const items: any[] = [];
  for (const ch of affected) {
    (ch.children || []).forEach((s: any, i: number) => {
      items.push({ id: s.id, parentId: ch.id, sort: i + 1 });
    });
  }

  chapterBusy.value = true;
  try {
    const res: any = await apiReorderSections({ courseId: Number(props.courseId), items });
    if (res?.code !== 200) throw new Error(res?.msg || '排序保存失败');
    message.success('小节顺序已更新');
    await loadOutline();
  } catch (err: any) {
    message.error(err?.message || err?.data?.msg || '排序保存失败，已恢复');
    await loadOutline();
  } finally {
    chapterBusy.value = false;
  }
}

// ===== 引入课程弹窗 =====
const showImport = ref(false);
const importKeyword = ref('');
const importLoading = ref(false);
const importList = ref<any[]>([]);
// 引入目标：'chapter' = 引入为章；'section' = 引入为某章下的小节
const importMode = ref<'chapter' | 'section'>('chapter');
const importParentChapter = ref<any>(null);

// 从「新增章节」行里点击「引入已有课程」时弹出，保留新增行上下文（取消弹窗即回到新增行）
function openImportModal() {
  importMode.value = 'chapter';
  importParentChapter.value = null;
  editingChapterId.value = null;
  insertAfterIndex.value = null;
  importKeyword.value = '';
  importList.value = [];
  showImport.value = true;
  searchImportCourses();
}

// 从某章的「新增小节」行里点击「引入已有课程」时弹出
function openImportSectionModal(chapter: any) {
  importMode.value = 'section';
  importParentChapter.value = chapter;
  importKeyword.value = '';
  importList.value = [];
  showImport.value = true;
  searchImportCourses();
}

function closeImportModal() {
  if (chapterBusy.value) return;
  showImport.value = false;
}

async function searchImportCourses() {
  importLoading.value = true;
  try {
    const res: any = await apiSearchCourses({
      keyword: importKeyword.value.trim(),
      pageNum: 1,
      pageSize: 20,
    });
    const data = res?.data || {};
    importList.value = data.rows || data.records || [];
  } catch (e: any) {
    message.error(e?.data?.msg || '搜索课程失败');
    importList.value = [];
  } finally {
    importLoading.value = false;
  }
}

async function confirmImport(course: any) {
  if (chapterBusy.value) return;
  if (String(course.id) === String(props.courseId)) {
    message.warning('不能把课程引入到它自己');
    return;
  }
  chapterBusy.value = true;
  try {
    let res: any;
    if (importMode.value === 'section') {
      // 引入为小节：挂到指定章下，sort 排到该章末尾
      const chapter = importParentChapter.value;
      if (!chapter) { message.error('未指定所属章节'); return; }
      res = await apiAddCourseLinkSection({
        courseId: Number(props.courseId),
        parentId: chapter.id,
        title: course.title,
        sort: (chapter.children?.length || 0) + 1,
        linkedCourseId: course.id,
      });
    } else {
      // 引入为章
      res = await apiAddChapter({
        courseId: Number(props.courseId),
        title: course.title,
        sort: outline.value.length + 1,
        type: 'course_link',
        linkedCourseId: course.id,
      });
    }
    if (res?.code === 200) {
      message.success(importMode.value === 'section' ? '已引入课程作为小节' : '已引入课程作为新章');
      showImport.value = false;
      if (importMode.value === 'section') {
        cancelAddSection();
      } else {
        cancelAddChapter();
      }
      await loadOutline();
    } else {
      message.error(res?.msg || '引入失败');
    }
  } catch (e: any) {
    message.error(e?.data?.msg || '引入失败');
  } finally {
    chapterBusy.value = false;
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

watch(() => props.editMode, (val) => {
  if (val) initSortables();
  else destroySortables();
});

watch(() => outline.value.length, () => {
  if (props.editMode) initSortables();
});

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
.drag-hint { font-size: 12px; color: #888; padding: 0 20px 10px; }

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
.btn-green:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-outline {
  background: #fff; color: #2080f0; border: 1px solid #2080f0;
  border-radius: 4px; padding: 6px 14px; font-size: 13px;
  cursor: pointer; transition: all 0.2s;
}
.btn-outline:hover { background: #2080f0; color: #fff; }

/* 引入课程的章 */
.collapse-icon.link-ico { font-size: 13px; }
.chapter-link { color: #2080f0; cursor: pointer; text-decoration: none; }
.chapter-link:hover { text-decoration: underline; }
.link-tag {
  font-size: 11px; color: #2080f0; border: 1px solid #2080f0;
  padding: 1px 6px; border-radius: 3px; flex-shrink: 0;
}

/* 引入课程弹窗 */
.import-modal {
  width: 520px; max-width: 92vw; background: #fff;
  border-radius: 10px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.15);
}
.import-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; border-bottom: 1px solid #f0f0f0;
}
.import-title { font-size: 15px; font-weight: 600; color: #1a1a1a; }
.import-close { cursor: pointer; color: #999; font-size: 16px; }
.import-close:hover { color: #333; }
.import-search { display: flex; gap: 8px; padding: 14px 18px 6px; }
.import-input {
  flex: 1; border: 1px solid #ddd; border-radius: 6px;
  padding: 7px 10px; font-size: 14px; outline: none;
}
.import-input:focus { border-color: #18a058; }
.import-body { max-height: 50vh; overflow-y: auto; padding: 8px 18px 18px; }
.import-tip { text-align: center; color: #999; font-size: 13px; padding: 24px 0; }
.import-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px; border: 1px solid #eee; border-radius: 8px;
  margin-top: 8px; cursor: pointer; transition: all 0.15s;
}
.import-item:hover { border-color: #18a058; background: #f6fdf9; }
.import-item.disabled { opacity: 0.5; cursor: not-allowed; }
.import-item.disabled:hover { border-color: #eee; background: #fff; }
.import-cover { width: 60px; height: 40px; object-fit: cover; border-radius: 4px; flex-shrink: 0; background: #f0f0f0; }
.import-meta { flex: 1; min-width: 0; }
.import-name { font-size: 14px; color: #222; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.import-sub { font-size: 12px; color: #999; margin-top: 2px; }
.import-self { color: #d03050; margin-left: 4px; }
.import-pick { font-size: 13px; color: #18a058; flex-shrink: 0; }

.chapter-block { border-bottom: 1px solid #f0f0f0; }
.chapter-block:last-child { border-bottom: none; }
.insert-chapter-block { background: #f0fdf4; }

/* SortableJS 拖拽态 */
.sort-ghost { opacity: 0.45; background: #e8f5e9 !important; }
.sort-chosen { background: #f0fdf4 !important; }

/* 拖拽手柄 */
.drag-handle {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  color: #18a058;
  font-size: 14px;
  line-height: 22px;
  cursor: grab;
  user-select: none;
  text-align: center;
  background: #f0fdf4;
  border: 1px solid #b7e4c7;
  border-radius: 4px;
  touch-action: none;
}
.drag-handle:hover { background: #dcfce7; border-color: #18a058; }
.sort-chosen .drag-handle, .sort-ghost .drag-handle { cursor: grabbing; background: #bbf7d0; }
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
