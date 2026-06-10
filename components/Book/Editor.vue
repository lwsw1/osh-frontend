<template>
  <client-only fallback="加载编辑器中...">
    <div class="editor-layout">
      <!-- 左侧：书名 + 基本信息 + 章节 + 目录 -->
      <div class="toc-sidebar">
        <!-- 书名 -->
        <div class="book-title-wrap">
          <input
            v-model="bookInfo.title"
            class="book-title-input"
            placeholder="请输入电子书名称"
            @blur="handleBookTitleBlur"
          />
        </div>
        <div class="toc-divider"></div>

        <!-- 封面上传 -->
        <div class="form-group">
          <label class="form-label">封面图片</label>
          <div class="cover-upload">
            <img v-if="bookInfo.coverPreview || bookInfo.cover" :src="bookInfo.coverPreview || bookInfo.cover" class="cover-preview" />
            <button class="upload-btn" @click="uploadCover">
              {{ bookInfo.cover ? '更换封面' : '上传封面' }}
            </button>
          </div>
        </div>

        <!-- 描述 -->
        <div class="form-group">
          <label class="form-label">简介</label>
          <textarea
            v-model="bookInfo.description"
            class="form-textarea"
            placeholder="请输入电子书简介"
            rows="3"
          ></textarea>
        </div>

        <!-- 价格 -->
        <div class="form-group">
          <label class="form-label">价格设置</label>
          <div class="price-inputs">
            <input
              v-model.number="bookInfo.price"
              type="number"
              step="0.01"
              min="0"
              class="form-input"
              placeholder="现价"
            />
            <input
              v-model.number="bookInfo.tPrice"
              type="number"
              step="0.01"
              min="0"
              class="form-input"
              placeholder="原价"
            />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">权限等级</label>
          <n-select
            v-model:value="bookInfo.level"
            :options="levelOptions"
            class="form-select"
            placeholder="请选择权限等级"
          />
        </div>

        <!-- 标签 -->
        <div class="form-group">
          <label class="form-label">标签</label>
          <n-select
            v-model:value="bookInfo.tags"
            multiple
            filterable
            tag
            clearable
            :loading="tagsLoading"
            :options="tagOptions"
            :filter="filterTagOption"
            class="form-select tag-select"
            placeholder="输入标签名，查询已有电子书标签"
            :on-create="createTagOption"
          />
        </div>

        <div class="toc-divider"></div>

        <!-- 章节列表 -->
        <h3 class="section-title">章节管理</h3>
        <div class="chapter-list">
          <div
            v-for="(chapter, idx) in chapters"
            :key="chapter.id || idx"
            class="chapter-item"
            :class="{ active: currentChapterIndex === idx }"
            @click="switchChapter(idx)"
          >
            <span class="chapter-num">第{{ idx + 1 }}章</span>
            <span class="chapter-title">{{ chapter.title || '未命名章节' }}</span>
            <label class="free-checkbox" @click.stop>
              <input type="checkbox" v-model="chapter.isFree" :true-value="1" :false-value="0" />
              <span>免费</span>
            </label>
            <button
              class="del-btn"
              v-if="chapters.length > 1"
              @click.stop="deleteChapter(idx)"
            >×</button>
          </div>
          <button class="add-chapter-btn" @click="addChapter">
            + 新增章节
          </button>
        </div>

        <div class="toc-divider mt-4"></div>

        <!-- 自动目录 -->
        <h3 class="toc-title">目录</h3>
        <div class="toc-divider"></div>
        <ul class="toc-list">
          <li
            v-for="(item, index) in tocList"
            :key="index"
            :class="['toc-item', `toc-level-${item.level}`]"
          >
            {{ item.text }}
          </li>
          <li v-if="tocList.length === 0" class="toc-empty">暂无标题</li>
        </ul>
      </div>

      <!-- 右侧编辑器 -->
      <div class="editor-container">
        <QuillEditor
          :key="`${currentChapterIndex}-${chapters[currentChapterIndex]?.id || 'new'}-${editorReloadToken}`"
          ref="quillEditorRef"
          v-model:content="currentContent"
          content-type="html"
          theme="snow"
          class="custom-quill-editor"
          :toolbar="toolbarOptions"
          placeholder="开始编辑电子书内容..."
          @ready="handleEditorReady"
        />
      </div>
    </div>
  </client-only>
</template>

<script setup>
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'
import { ref, watch, onMounted, computed, defineProps, defineEmits } from 'vue'
import { NSelect } from 'naive-ui'
import { apiGetBookDetail, apiGetPreviewUrls, apiGetBookTags, apiUploadBookImage } from '~/composables/Api/Book/book'
import { BOOK_LEVEL_OPTIONS } from '~/composables/bookLevels'

// ==================== 【书的基础信息】 ====================
const props = defineProps({
  bookId: {
    type: Number,
    default: null
  }
})

const emit = defineEmits(['save'])
const imagePreviewMap = ref({})

const ensureEditableSpacing = (html) => {
  if (!html) {
    return '<p><br></p>'
  }
  let nextHtml = html.trim()
  if (/<\/pre>\s*$/i.test(nextHtml)) {
    nextHtml = `${nextHtml}<p><br></p>`
  }
  if (!/(<\/p>|<\/div>|<\/h1>|<\/h2>|<\/h3>|<\/blockquote>)\s*$/i.test(nextHtml)) {
    nextHtml = `${nextHtml}<p><br></p>`
  }
  return nextHtml
}

const bookInfo = ref({
  id: props.bookId,
  title: '',
  cover: '',  // 保存到数据库的相对路径
  coverPreview: '',  // 用于显示的完整URL
  description: '',
  price: 0.00,
  tPrice: 0.00,
  level: 0,
  tags: []
})

const levelOptions = BOOK_LEVEL_OPTIONS

// 标签输入
const tagsLoading = ref(false)
const tagOptions = ref([])

const normalizeTagName = (tag) => {
  if (typeof tag === 'string') {
    return tag.trim()
  }
  return String(tag?.name || tag?.tagName || tag?.label || tag?.value || '').trim()
}

const loadBookTags = async () => {
  tagsLoading.value = true
  try {
    const response = await apiGetBookTags()
    const tags = response?.data || response || []
    const uniqueTags = [...new Set((Array.isArray(tags) ? tags : []).map(normalizeTagName).filter(Boolean))]
    tagOptions.value = uniqueTags.map((tag) => ({
      label: tag,
      value: tag,
    }))
  } catch (error) {
    console.error('加载电子书标签失败:', error)
    tagOptions.value = []
  } finally {
    tagsLoading.value = false
  }
}

const filterTagOption = (pattern, option) => {
  const keyword = pattern.trim().toLowerCase()
  if (!keyword) return true
  return String(option.label || option.value || '').toLowerCase().includes(keyword)
}

const createTagOption = (inputVal) => {
  const tag = inputVal.trim()
  return tag ? { label: tag, value: tag } : false
}

// ==================== 【章节数据】 ====================
const chapters = ref([
  {
    id: null,
    bookId: props.bookId,
    title: '第一章',
    content: `<h2>第一章</h2><p>请开始编辑内容...</p>`,
    chapterNo: 1,
    sortOrder: 1,
    isFree: 0
  }
])

// 当前章节索引
const currentChapterIndex = ref(0)

// 编辑器内容（正确双向绑定）
const currentContent = computed({
  get() {
    return chapters.value[currentChapterIndex.value]?.content || ''
  },
  set(val) {
    if (chapters.value[currentChapterIndex.value]) {
      chapters.value[currentChapterIndex.value].content = val
      syncChapterTitle()
    }
  }
})

// ==================== 【增强：跨平台快捷键支持 + 图片缩放】 ====================
const quillEditorRef = ref(null)
let editorInstance = null
const editorReloadToken = ref(0)

const handleEditorReady = (editor) => {
  editorInstance = editor
  console.log('✅ 编辑器已就绪')
  
  // 设置图片上传
  setupImageUpload(editor)
  
  // 检测当前系统是否为Mac
  const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform)
  
  // 定义通用的标题层级格式化函数
  const formatHeader = (level) => {
    editor.format('header', level)
  }

  // 绑定标题层级快捷键
  editor.keyboard.addBinding({
    key: '1',
    ctrlKey: !isMac,
    metaKey: isMac,
    handler: () => formatHeader(1)
  })
  editor.keyboard.addBinding({
    key: '2',
    ctrlKey: !isMac,
    metaKey: isMac,
    handler: () => formatHeader(2)
  })
  editor.keyboard.addBinding({
    key: '3',
    ctrlKey: !isMac,
    metaKey: isMac,
    handler: () => formatHeader(3)
  })
  editor.keyboard.addBinding({
    key: '0',
    ctrlKey: !isMac,
    metaKey: isMac,
    handler: () => formatHeader(false)
  })

  // 初始化图片缩放功能
  initImageResize()
}

// ==================== 【图片缩放功能 - 独立函数】 ====================
const initImageResize = () => {
  console.log('🖼️ 初始化图片缩放功能')
  
  // 使用MutationObserver监听DOM变化
  const observeImages = () => {
    if (!editorInstance || !editorInstance.root) {
      console.warn('编辑器未就绪，1秒后重试')
      setTimeout(observeImages, 1000)
      return
    }

    const editorElement = editorInstance.root
    
    // 为现有图片添加事件
    const attachImageHandlers = () => {
      const images = editorElement.querySelectorAll('img')
      console.log(`找到 ${images.length} 张图片`)
      
      images.forEach((img, index) => {
        if (img.dataset.resizeEnabled === 'true') return
        
        img.dataset.resizeEnabled = 'true'
        img.style.cursor = 'pointer'
        img.style.maxWidth = '100%'
        img.style.height = 'auto'
        
        console.log(`为图片 ${index + 1} 添加点击事件`)
        
        img.addEventListener('click', function(e) {
          e.preventDefault()
          e.stopPropagation()
          console.log('🖱️ 图片被点击')
          
          // 移除其他图片的选中状态
          editorElement.querySelectorAll('img').forEach(i => {
            i.style.outline = 'none'
          })
          
          // 选中当前图片
          this.style.outline = '3px solid #3b82f6'
          
          // 显示缩放面板
          showResizePanel(this, editorElement)
        })
      })
    }

    // 显示缩放面板
    const showResizePanel = (img, container) => {
      console.log('📐 显示缩放面板')
      
      // 移除已存在的面板
      document.querySelectorAll('.image-resize-panel').forEach(p => p.remove())
      
      // 创建面板
      const panel = document.createElement('div')
      panel.className = 'image-resize-panel'
      panel.style.cssText = `
        position: fixed;
        display: flex;
        gap: 6px;
        background: white;
        border: 2px solid #3b82f6;
        border-radius: 8px;
        padding: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        z-index: 99999;
      `
      
      // 创建按钮组
      const controls = [
        { label: '25%', type: 'size', value: 25 },
        { label: '50%', type: 'size', value: 50 },
        { label: '75%', type: 'size', value: 75 },
        { label: '100%', type: 'size', value: 100 },
        { label: '|', type: 'divider' },
        { label: '←', type: 'float', value: 'left', title: '左浮动' },
        { label: '■', type: 'float', value: 'none', title: '不浮动' },
        { label: '→', type: 'float', value: 'right', title: '右浮动' },
        { label: '|', type: 'divider' },
        { label: '↔', type: 'inline', value: 'inline', title: '行内显示' },
        { label: '✕', type: 'close' }
      ]
      
      controls.forEach(control => {
        if (control.type === 'divider') {
          const divider = document.createElement('div')
          divider.textContent = '|'
          divider.style.cssText = `
            color: #cbd5e1;
            display: flex;
            align-items: center;
            padding: 0 4px;
          `
          panel.appendChild(divider)
          return
        }
        
        const btn = document.createElement('button')
        btn.textContent = control.label
        btn.title = control.title || control.label
        btn.style.cssText = `
          padding: 8px ${control.type === 'float' || control.type === 'inline' ? '10px' : '14px'};
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          background: white;
          color: ${control.type === 'close' ? '#ef4444' : '#334155'};
          font-size: ${control.type === 'float' || control.type === 'inline' ? '16px' : '14px'};
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          min-width: ${control.type === 'float' || control.type === 'inline' ? '36px' : 'auto'};
        `
        
        btn.addEventListener('mouseenter', () => {
          btn.style.background = control.type === 'close' ? '#fee2e2' : '#f1f5f9'
          btn.style.borderColor = control.type === 'close' ? '#ef4444' : '#3b82f6'
        })
        
        btn.addEventListener('mouseleave', () => {
          btn.style.background = 'white'
          btn.style.borderColor = '#e2e8f0'
        })
        
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          console.log(`点击按钮: ${control.label}`)
          
          if (control.type === 'close') {
            panel.remove()
            img.style.outline = 'none'
          } else if (control.type === 'size') {
            img.style.width = `${control.value}%`
            img.style.maxWidth = `${control.value}%`
            img.setAttribute('width', `${control.value}%`)
            console.log(`图片宽度已设置为: ${control.value}%`)
          } else if (control.type === 'float') {
            // 移除所有类
            img.classList.remove('img-left', 'img-center', 'img-right', 'img-inline')
            
            if (control.value === 'left') {
              img.style.float = 'left'
              img.style.marginRight = '16px'
              img.style.marginBottom = '16px'
              img.style.marginLeft = '0'
              img.style.display = 'block'
              img.classList.add('img-left')
            } else if (control.value === 'right') {
              img.style.float = 'right'
              img.style.marginLeft = '16px'
              img.style.marginBottom = '16px'
              img.style.marginRight = '0'
              img.style.display = 'block'
              img.classList.add('img-right')
            } else if (control.value === 'none') {
              img.style.float = 'none'
              img.style.display = 'block'
              img.style.marginLeft = 'auto'
              img.style.marginRight = 'auto'
              img.style.marginBottom = '16px'
              img.classList.add('img-center')
            }
            
            console.log(`图片浮动方式已设置为: ${control.value}`)
          } else if (control.type === 'inline') {
            // 行内显示 - 可以同一行多张图
            img.classList.remove('img-left', 'img-center', 'img-right')
            img.classList.add('img-inline')
            img.style.display = 'inline-block'
            img.style.float = 'none'
            img.style.marginLeft = '8px'
            img.style.marginRight = '8px'
            img.style.marginBottom = '8px'
            img.style.verticalAlign = 'middle'
            console.log('图片已设置为行内显示')
          }
        })
        
        panel.appendChild(btn)
      })
      
      // 定位面板
      const imgRect = img.getBoundingClientRect()
      panel.style.top = `${imgRect.top - 50}px`
      panel.style.left = `${imgRect.left}px`
      
      document.body.appendChild(panel)
      
      // 点击其他地方关闭
      const closePanel = (e) => {
        if (!panel.contains(e.target) && e.target !== img) {
          panel.remove()
          img.style.outline = 'none'
          document.removeEventListener('click', closePanel)
        }
      }
      setTimeout(() => {
        document.addEventListener('click', closePanel)
      }, 100)
    }

    // 立即执行一次
    attachImageHandlers()
    
    // 监听DOM变化
    const observer = new MutationObserver(() => {
      attachImageHandlers()
    })
    
    observer.observe(editorElement, {
      childList: true,
      subtree: true
    })
    
    console.log('✅ 图片监听器已启动')
  }
  
  // 延迟执行，确保编辑器完全加载
  setTimeout(observeImages, 500)
}

// ==================== 【同步章节标题】 ====================
const syncChapterTitle = () => {
  const html = currentContent.value
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const h1 = doc.querySelector('h1')
  const h2 = doc.querySelector('h2')

  const titleText = h1?.innerText?.trim() || h2?.innerText?.trim() || ''
  if (titleText) {
    chapters.value[currentChapterIndex.value].title = titleText
  }
}

// ==================== 【自动生成目录】 ====================
const tocList = ref([])

const updateToc = () => {
  const html = currentContent.value
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const headings = doc.querySelectorAll('h1, h2, h3')

  const arr = []
  headings.forEach((h) => {
    const text = h.innerText.trim()
    if (text) {
      arr.push({
        text,
        level: h.tagName.charAt(1)
      })
    }
  })
  tocList.value = arr
}

// ==================== 【工具栏】 ====================
const toolbarOptions = [
  ['bold', 'italic', 'underline', 'strike'],
  [{ header: [1, 2, 3, false] }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  [{ align: [] }],
  ['link', 'image'],
  ['clean']
]

const IMG_SRC_REGEX = /<img\b[^>]*?\bsrc=(["'])(.*?)\1[^>]*>/gi

const extractImageSrcs = (html) => {
  if (!html) return []
  IMG_SRC_REGEX.lastIndex = 0
  const srcs = []
  let match
  while ((match = IMG_SRC_REGEX.exec(html)) !== null) {
    if (match[2]) srcs.push(match[2])
  }
  return srcs
}

const replaceImageSrc = (html, oldSrc, newSrc) => {
  if (!html || oldSrc === newSrc) return html
  return html.replaceAll(oldSrc, newSrc)
}

const dataUrlToFile = (dataUrl, fallbackName = 'ebook-image') => {
  const [meta, base64] = dataUrl.split(',')
  const mime = meta.match(/data:(.*?);base64/)?.[1] || 'image/png'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  const ext = mime.split('/')[1] || 'png'
  return new File([bytes], `${fallbackName}.${ext}`, { type: mime })
}

const uploadImageAndGetPaths = async (file) => {
  const response = await apiUploadBookImage(file, { minute: 120 })
  if (response.code !== 200 || !response.data?.url) {
    throw new Error(response.msg || '上传失败')
  }
  const relativeUrl = response.data.url
  const previewUrl = response.data.previewUrl || response.data.url
  imagePreviewMap.value[previewUrl] = relativeUrl
  return { relativeUrl, previewUrl }
}

const convertRelativeImagesToPreview = async (html) => {
  const srcs = extractImageSrcs(html)
  const relativeSrcs = [...new Set(srcs.filter(src => src && !src.startsWith('http') && !src.startsWith('data:')))]
  if (relativeSrcs.length === 0) return html
  const res = await apiGetPreviewUrls(relativeSrcs, 120)
  if (res.code !== 200 || !res.data) return html
  let nextHtml = html
  Object.entries(res.data).forEach(([relativePath, previewUrl]) => {
    imagePreviewMap.value[previewUrl] = relativePath
    nextHtml = replaceImageSrc(nextHtml, relativePath, previewUrl)
  })
  return nextHtml
}

const extractRelativePathFromSignedUrl = (url) => {
  try {
    const parsed = new URL(url)
    const pathSegments = parsed.pathname.split('/').filter(Boolean)
    if (pathSegments.length < 2) return ''
    return pathSegments.slice(1).join('/')
  } catch {
    return ''
  }
}

const normalizeChapterContentForSave = async (html, chapterIndex) => {
  if (!html) return html
  const srcs = [...new Set(extractImageSrcs(html))]
  let nextHtml = html
  for (const src of srcs) {
    if (!src) continue
    if (src.startsWith('data:image/')) {
      const file = dataUrlToFile(src, `chapter-${chapterIndex + 1}-${Date.now()}`)
      const { relativeUrl } = await uploadImageAndGetPaths(file)
      nextHtml = replaceImageSrc(nextHtml, src, relativeUrl)
      continue
    }
    if (imagePreviewMap.value[src]) {
      nextHtml = replaceImageSrc(nextHtml, src, imagePreviewMap.value[src])
      continue
    }
    if (src.startsWith('http')) {
      const relativePath = extractRelativePathFromSignedUrl(src)
      if (relativePath) {
        nextHtml = replaceImageSrc(nextHtml, src, relativePath)
      }
    }
  }
  return nextHtml
}

// ==================== 【图片上传处理】 ====================
const setupImageUpload = (editor) => {
  const toolbar = editor.getModule('toolbar')
  toolbar.addHandler('image', () => {
    const input = document.createElement('input')
    input.setAttribute('type', 'file')
    input.setAttribute('accept', 'image/*')
    input.click()

    input.onchange = async () => {
      const file = input.files[0]
      if (!file) return

      // 检查文件大小（限制3MB）
      if (file.size > 3 * 1024 * 1024) {
        alert('图片大小不能超过3MB')
        return
      }

      // 显示上传中提示
      const range = editor.getSelection(true)
      editor.insertText(range.index, '上传中...')
      editor.setSelection(range.index + 5)

      try {
        // 创建FormData
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', 'image')
        formData.append('preview', 'true')  // 添加preview参数

        // 上传到后端
        const { previewUrl } = await uploadImageAndGetPaths(file)

        // 删除"上传中..."文字
        editor.deleteText(range.index, 5)

        // 插入图片 - 使用previewUrl
        editor.insertEmbed(range.index, 'image', previewUrl)
        editor.setSelection(range.index + 1)
        console.log('✅ 图片上传成功 - 显示URL:', previewUrl)
      } catch (error) {
        console.error('❌ 图片上传失败:', error)
        // 删除"上传中..."文字
        editor.deleteText(range.index, 5)
        alert('图片上传失败: ' + (error.message || '未知错误'))
      }
    }
  })
}

// ==================== 【章节操作】 ====================
const handleBookTitleBlur = () => {
  if (!bookInfo.value.title.trim()) {
    bookInfo.value.title = '未命名电子书'
  }
}

// 上传封面
const uploadCover = () => {
  const input = document.createElement('input')
  input.setAttribute('type', 'file')
  input.setAttribute('accept', 'image/*')
  input.click()

  input.onchange = async () => {
    const file = input.files[0]
    if (!file) return

    if (file.size > 3 * 1024 * 1024) {
      alert('图片大小不能超过3MB')
      return
    }

    try {
      const response = await apiUploadBookImage(file, { minute: 120 })

      if (response.code === 200 && response.data) {
        // 保存相对路径url到数据库，显示用previewUrl
        bookInfo.value.cover = response.data.url  // 保存相对路径
        bookInfo.value.coverPreview = response.data.previewUrl || response.data.url  // 显示用临时URL
        
        console.log('✅ 封面上传成功 - 保存URL:', bookInfo.value.cover, '显示URL:', bookInfo.value.coverPreview)
      } else {
        throw new Error(response.msg || '上传失败')
      }
    } catch (error) {
      console.error('❌ 封面上传失败:', error)
      alert('封面上传失败: ' + (error.message || '未知错误'))
    }
  }
}

let autoId = 100
const addChapter = () => {
  const num = chapters.value.length + 1
  chapters.value.push({
    id: null,
    bookId: props.bookId,
    title: `第${num}章`,
    content: `<h2>第${num}章</h2>`,
    chapterNo: num,
    sortOrder: num,
    isFree: 0
  })
  currentChapterIndex.value = chapters.value.length - 1
}

const switchChapter = (idx) => {
  currentChapterIndex.value = idx
  chapters.value[idx].content = ensureEditableSpacing(chapters.value[idx].content)
  editorReloadToken.value += 1
  updateToc()
}

const deleteChapter = (idx) => {
  chapters.value.splice(idx, 1)
  if (currentChapterIndex.value >= chapters.value.length) {
    currentChapterIndex.value = chapters.value.length - 1
  }
}

// ==================== 【保存】 ====================
const saveToDatabase = async () => {
  // 同步当前章节内容
  syncChapterTitle()
  
  // 更新章节顺序和编号（从1开始）
  chapters.value.forEach((ch, i) => {
    ch.sortOrder = i + 1
    ch.chapterNo = i + 1
    ch.bookId = props.bookId
  })

  const normalizedChapters = chapters.value.map((ch) => ({
    ...ch
  }))

  try {
    await Promise.all(
      normalizedChapters.map(async (ch, index) => {
        ch.content = await normalizeChapterContentForSave(ch.content, index)
      })
    )
    const saveData = {
      id: bookInfo.value.id,
      title: bookInfo.value.title,
      cover: bookInfo.value.cover,  // 保存URL字段
      desc: bookInfo.value.description,
      price: bookInfo.value.price,
      t_price: bookInfo.value.tPrice,
      level: bookInfo.value.level,
      tags: bookInfo.value.tags.length > 0 ? bookInfo.value.tags : [],
      chapters: normalizedChapters.map(ch => ({
        id: ch.id,
        bookId: ch.bookId,
        title: ch.title,
        content: ch.content,
        chapterNo: ch.chapterNo,
        sortOrder: ch.sortOrder,
        isFree: ch.isFree
      }))
    }

    console.log('📦 保存数据:', saveData)
    console.log('📚 章节数据:', saveData.chapters)
    emit('save', saveData)
  } catch (err) {
    console.error('❌ 处理章节图片失败:', err)
    alert('章节图片处理失败: ' + (err.message || '未知错误'))
  }
}

// ==================== 监听内容变化 ====================
watch(currentContent, () => {
  updateToc()
}, { deep: true })

// 合并重复的onMounted
onMounted(() => {
  updateToc()
  loadBookTags()
})

// 暴露给父组件调用
defineExpose({ 
  saveToDatabase,
  loadBookData: (data) => {
    console.log('📖 开始加载电子书数据:', data)
    console.log('📸 接收到的封面URL:', data.cover)
    
    // 重置 bookInfo
    bookInfo.value.id = props.bookId || data.id
    bookInfo.value.title = data.title || ''
    
    // 编辑模式：后端返回相对路径，我们需要保存相对路径，但显示时需要完整URL
    // 如果是相对路径（不包含http），需要请求后端获取临时URL
    if (data.cover) {
      bookInfo.value.cover = data.cover  // 保存相对路径
      // 如果是相对路径，调用后端获取临时URL用于显示
      if (!data.cover.startsWith('http')) {
        // 调用后端API获取临时URL
        apiGetBookDetail(props.bookId).then((res) => {
          if (res.code === 200 && res.data && res.data.cover) {
            bookInfo.value.coverPreview = res.data.cover
            console.log('📸 获取到临时URL:', bookInfo.value.coverPreview)
          }
        })
      } else {
        bookInfo.value.coverPreview = data.cover
      }
    }
    
    bookInfo.value.description = data.desc || data.description || ''
    bookInfo.value.price = data.price !== undefined ? Number(data.price) : 0
    bookInfo.value.tPrice = data.t_price !== undefined ? Number(data.t_price) : 0
    bookInfo.value.level = data.level !== undefined ? Number(data.level) : 0
    
    console.log('📸 设置后的封面 - 保存用:', bookInfo.value.cover)
    
    // 处理标签
    if (data.tags) {
      if (typeof data.tags === 'string') {
        try {
          bookInfo.value.tags = JSON.parse(data.tags)
        } catch {
          bookInfo.value.tags = data.tags.split(',').filter(t => t.trim())
        }
      } else if (Array.isArray(data.tags)) {
        bookInfo.value.tags = data.tags
      }
    } else {
      bookInfo.value.tags = []
    }
    
    console.log('✅ 基本信息已加载:', {
      title: bookInfo.value.title,
      cover: bookInfo.value.cover,
      price: bookInfo.value.price,
      tags: bookInfo.value.tags
    })
    
    // 加载章节数据
    if (data.book_details && Array.isArray(data.book_details) && data.book_details.length > 0) {
      chapters.value = data.book_details.map((ch, index) => ({
        id: ch.id,
        bookId: props.bookId || data.id,
        title: ch.title || `第${index + 1}章`,
        content: ensureEditableSpacing(ch.content || `<h2>${ch.title || '第' + (index + 1) + '章'}</h2><p>请开始编辑...</p>`),
        chapterNo: ch.chapterNo || ch.chapter_no || (index + 1),
        sortOrder: ch.sortOrder || ch.sort_order || (index + 1),
        isFree: ch.isFree !== undefined ? ch.isFree : (ch.isfree !== undefined ? ch.isfree : 0)
      }))
      Promise.all(
        chapters.value.map(async (chapter) => {
          chapter.content = await convertRelativeImagesToPreview(chapter.content)
        })
      ).catch((err) => {
        console.error('❌ 章节图片回显处理失败:', err)
      })
      
      console.log('✅ 章节数据已加载:', chapters.value.length, '章')
      console.log('📚 章节详情:', chapters.value.map(ch => ({ 
        id: ch.id,
        title: ch.title, 
        isFree: ch.isFree,
        contentLength: ch.content?.length || 0
      })))
    } else {
      console.log('⚠️ 没有章节数据，保持默认章节')
    }
    
    // 重置当前章节索引并更新目录
    currentChapterIndex.value = 0
    nextTick(() => {
      editorReloadToken.value += 1
      updateToc()
    })
    
    console.log('✅ 电子书数据加载完成')
  }
})
</script>

<style scoped>
.editor-layout {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  padding: 20px;
  min-height: 800px;
}

.toc-sidebar {
  width: 320px;
  min-width: 320px;
  background: #f8fafc;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  position: sticky;
  top: 24px;
  max-height: calc(100vh - 48px);
  overflow-y: auto;
}

.book-title-wrap {
  margin-bottom: 12px;
}
.book-title-input {
  width: 100%;
  border: none;
  background: transparent;
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  outline: none;
  padding: 4px 0;
  border-bottom: 1px solid #e2e8f0;
}
.book-title-input:focus {
  border-bottom-color: #3b82f6;
}

/* 表单样式 */
.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.form-input:focus {
  border-color: #3b82f6;
}

.form-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.2s;
}

.form-textarea:focus {
  border-color: #3b82f6;
}

/* 封面上传 */
.cover-upload {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cover-preview {
  width: 100%;
  height: 160px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.upload-btn {
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  color: #475569;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.upload-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
}

/* 价格输入 */
.price-inputs {
  display: flex;
  gap: 8px;
}

.price-inputs .form-input {
  flex: 1;
}

/* 下拉选择 */
.form-select {
  width: 100%;
}

:deep(.form-select .n-base-selection) {
  --n-border: 1px solid #e2e8f0 !important;
  --n-border-hover: 1px solid #3b82f6 !important;
  --n-border-focus: 1px solid #3b82f6 !important;
  --n-box-shadow-focus: 0 0 0 2px rgba(59, 130, 246, 0.12) !important;
  --n-border-radius: 6px !important;
  --n-height: 36px !important;
  background: #fff;
}

:deep(.tag-select .n-base-selection) {
  min-height: 38px;
  height: auto;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px;
  color: #0f172a;
}

.toc-divider {
  height: 1px;
  background: #e2e8f0;
  margin-bottom: 16px;
}

.chapter-list {
  margin-bottom: 8px;
}
.chapter-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  margin: 6px 0;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.2s;
  gap: 8px;
}
.chapter-item.active {
  background: #3b82f6;
  color: #fff;
  border-color: #2563eb;
}
.chapter-num {
  font-size: 12px;
  opacity: 0.8;
}
.chapter-title {
  flex: 1;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.free-checkbox {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  cursor: pointer;
  user-select: none;
}
.free-checkbox input {
  cursor: pointer;
}
.del-btn {
  background: none;
  border: none;
  color: inherit;
  font-size: 16px;
  cursor: pointer;
  opacity: 0.8;
  padding: 0 4px;
}
.del-btn:hover {
  opacity: 1;
}
.add-chapter-btn {
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: 1px dashed #cbd5e1;
  background: #fff;
  color: #64748b;
  cursor: pointer;
  margin-top: 8px;
}
.mt-4 {
  margin-top: 16px;
}

.toc-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 12px;
  color: #0f172a;
}
.toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.toc-item {
  padding: 10px 12px;
  margin: 6px 0;
  border-radius: 8px;
  color: #334155;
  font-size: 15px;
}
.toc-level-1 {
  font-size: 16px;
  font-weight: 600;
  padding-left: 8px;
  color: #0f172a;
}
.toc-level-2 {
  padding-left: 28px;
  color: #334155;
}
.toc-level-3 {
  padding-left: 48px;
  color: #64748b;
  font-size: 14px;
}
.toc-empty {
  color: #94a3b8;
  font-size: 15px;
  padding: 10px 12px;
}

.editor-container {
  flex: 1;
  min-width: 0;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}
:deep(.ql-toolbar) {
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
  padding: 12px 16px;
  position: sticky;
  top: 0;
  z-index: 10;
}
:deep(.ql-container) {
  height: 85vh;
  max-height: 1000px;
  font-size: 16px;
  line-height: 1.8;
  color: #333;
  padding: 32px 40px;
  overflow-y: auto;
}
:deep(.ql-container)::-webkit-scrollbar {
  width: 7px;
}
:deep(.ql-container)::-webkit-scrollbar-thumb {
  background-color: #ccc;
  border-radius: 4px;
}
:deep(.ql-container)::-webkit-scrollbar-thumb:hover {
  background-color: #aaa;
}
:deep(.ql-editor h1) {
  font-size: 32px;
  font-weight: 700;
  margin: 24px 0 28px;
  color: #0f172a;
}
:deep(.ql-editor h2) {
  font-size: 26px;
  font-weight: 600;
  margin: 20px 0 24px;
  color: #1e293b;
}
:deep(.ql-editor h3) {
  font-size: 22px;
  font-weight: 600;
  margin: 18px 0 20px;
  color: #334155;
}
:deep(.ql-editor p) {
  margin: 0 0 16px;
}

:deep(.ql-editor pre),
:deep(.ql-editor .ql-code-block-container) {
  display: block;
  clear: both;
  margin: 20px 0 18px;
  background: linear-gradient(180deg, #1f2430 0%, #111827 100%);
  color: #e2e8f0;
  border-radius: 18px;
  padding: 18px 20px;
  white-space: pre-wrap;
}

:deep(.ql-editor pre + p),
:deep(.ql-editor .ql-code-block-container + p),
:deep(.ql-editor pre + div),
:deep(.ql-editor .ql-code-block-container + div) {
  margin-top: 18px;
}

/* 图片缩放控制面板样式 */
:deep(.image-resize-panel) {
  display: flex;
  gap: 4px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 9999;
  position: absolute;
}

:deep(.image-resize-panel button) {
  padding: 6px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: #fff;
  color: #334155;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

:deep(.image-resize-panel button:hover) {
  background: #f1f5f9;
  border-color: #3b82f6;
  color: #3b82f6;
}

:deep(.image-resize-panel button[data-action="close"]) {
  color: #ef4444;
  font-weight: bold;
}

:deep(.image-resize-panel button[data-action="close"]:hover) {
  background: #fee2e2;
  border-color: #ef4444;
}

/* 编辑器内图片样式优化 */
:deep(.ql-editor img) {
  display: block;
  margin: 16px auto;
  border-radius: 8px;
  transition: all 0.2s;
  cursor: pointer !important;
}

:deep(.ql-editor img:hover) {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  transform: scale(1.02);
}

/* 图片浮动样式 */
:deep(.ql-editor img.img-left) {
  float: left !important;
  margin-right: 16px !important;
  margin-bottom: 16px !important;
  margin-left: 0 !important;
}

:deep(.ql-editor img.img-right) {
  float: right !important;
  margin-left: 16px !important;
  margin-bottom: 16px !important;
  margin-right: 0 !important;
}

:deep(.ql-editor img.img-center) {
  float: none !important;
  display: block !important;
  margin-left: auto !important;
  margin-right: auto !important;
  margin-bottom: 16px !important;
}

/* 行内图片样式 - 支持同一行多张图 */
:deep(.ql-editor img.img-inline) {
  display: inline-block !important;
  float: none !important;
  margin: 0 8px 8px 8px !important;
  vertical-align: middle !important;
}

/* 清除浮动 */
:deep(.ql-editor p:after),
:deep(.ql-editor div:after) {
  content: "";
  display: table;
  clear: both;
}

/* 确保编辑器容器支持绝对定位 */
:deep(.ql-container) {
  position: relative;
}
</style>
