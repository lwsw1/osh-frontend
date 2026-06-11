<template>
    <div class="resource-group-card">
        <!-- 卡片头部 -->
        <div class="group-card-header" @click="toggleExpand">
            <div class="group-title">
                <n-icon size="18" color="#2563eb">
                    <FolderOutline />
                </n-icon>
                <span class="group-name">{{ group.name }}</span>
                <n-icon size="14" :class="['expand-arrow', { expanded: isExpanded }]">
                    <ChevronDownOutline />
                </n-icon>
            </div>
            <div class="group-actions" @click.stop>
                <n-button size="small" quaternary circle @click="$emit('edit', group)">
                    <template #icon>
                        <n-icon>
                            <CreateOutline />
                        </n-icon>
                    </template>
                </n-button>
                <n-button size="small" quaternary circle type="error" @click="$emit('delete', group)">
                    <template #icon>
                        <n-icon>
                            <TrashOutline />
                        </n-icon>
                    </template>
                </n-button>
            </div>
        </div>

        <!-- 展开面板 -->
        <div v-show="isExpanded" class="group-detail-panel">
            <!-- 描述信息 -->
            <div v-if="group.description" class="detail-section">
                <div class="section-label">
                    <n-icon size="14" color="#6b7280">
                        <InformationCircleOutline />
                    </n-icon>
                    <span>描述信息</span>
                </div>
                <div class="section-content description-content">
                    {{ group.description }}
                </div>
            </div>

            <!-- 关联资源（只有有资源或有描述时才显示） -->
            <div v-if="group.resources || group.description" class="detail-section">
                <div class="section-header">
                    <div class="section-label">
                        <n-icon size="14" color="#6b7280">
                            <LayersOutline />
                        </n-icon>
                        <span>关联资源 <template v-if="group.resources && group.resources.length > 0">({{ group.resources.length }})</template></span>
                    </div>
                    <n-tooltip trigger="hover" placement="top">
                        <template #trigger>
                            <n-button size="small" quaternary circle @click="handleAddResource">
                                <template #icon>
                                    <n-icon><Add /></n-icon>
                                </template>
                            </n-button>
                        </template>
                        新增资源
                    </n-tooltip>
                </div>
                
                <!-- 空状态 -->
                <div v-if="!group.resources || group.resources.length === 0" class="empty-resource">
                    <n-empty description="暂无关联资源，点击上方按钮添加" size="small" />
                </div>
                
                <!-- 资源列表 -->
                <div v-else class="section-content">
                    <div class="resource-list">
                        <div v-for="res in group.resources" :key="res.id" class="resource-item">
                            <n-icon size="18" color="#2563eb" class="resource-icon">
                                <DocumentTextOutline />
                            </n-icon>
                            <div class="resource-info">
                                <div class="resource-header">
                                    <span class="resource-name">{{ res.name }}</span>
                                    <n-tag v-if="res.type" size="small" type="info" class="resource-type-tag">
                                        {{ getResourceTypeLabel(res.type) }}
                                    </n-tag>
                                </div>
                                <div v-if="res.remark" class="resource-remark">{{ res.remark }}</div>
                            </div>
                            <div class="resource-actions">
                                <!-- 编辑按钮 -->
                                <n-tooltip trigger="hover" placement="top">
                                    <template #trigger>
                                        <n-button 
                                            size="small" 
                                            quaternary 
                                            circle
                                            @click="handleEditResource(res)"
                                        >
                                            <template #icon>
                                                <n-icon><CreateOutline /></n-icon>
                                            </template>
                                        </n-button>
                                    </template>
                                    编辑资源
                                </n-tooltip>
                                <!-- 文件类型显示下载按钮 -->
                                <n-tooltip v-if="isFileType(res.type)" trigger="hover" placement="top">
                                    <template #trigger>
                                        <n-button 
                                            size="small" 
                                            quaternary 
                                            circle
                                            @click="handleDownload(res)"
                                        >
                                            <template #icon>
                                                <n-icon><DownloadOutline /></n-icon>
                                            </template>
                                        </n-button>
                                    </template>
                                    下载资源
                                </n-tooltip>
                                <!-- 其他类型显示查看链接按钮 -->
                                 <!-- 
                                              <n-tooltip v-else trigger="hover" placement="top">
                                    <template #trigger>
                                        <n-button 
                                            size="small" 
                                            quaternary 
                                            circle
                                            @click="handleViewLinks(res)"
                                        >
                                            <template #icon>
                                                <n-icon><LinkOutline /></n-icon>
                                            </template>
                                        </n-button>
                                    </template>
                                    查看链接
                                </n-tooltip>
                                
                                 -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 资源链接弹窗 -->
            <n-modal v-model:show="showLinkModal" preset="card" :title="`${currentResource?.name || ''} - 关联链接`" style="width: 600px;">
                <div v-if="currentResourceLinks && currentResourceLinks.length > 0" class="modal-link-list">
                    <div v-for="link in currentResourceLinks" :key="link.id" class="modal-link-item">
                        <n-icon size="16" color="#2563eb">
                            <LinkOutline />
                        </n-icon>
                        <div class="modal-link-info">
                            <div class="modal-link-name">{{ link.name }}</div>
                            <div class="modal-link-url">{{ link.url }}</div>
                        </div>
                        <a :href="link.url" target="_blank" class="modal-link-btn" title="打开链接">
                            <n-icon size="14">
                                <OpenOutline />
                            </n-icon>
                        </a>
                    </div>
                </div>
                <n-empty v-else description="暂无关联链接" />
            </n-modal>

            <!-- 资源编辑弹窗 -->
            <n-modal v-model:show="showEditResourceModal" preset="card" title="编辑资源" style="width: 500px;">
                <n-form ref="resourceFormRef" :model="resourceFormData" :rules="resourceFormRules" label-placement="left" label-width="80">
                    <n-form-item label="资源名称" path="name">
                        <n-input v-model:value="resourceFormData.name" placeholder="请输入资源名称" />
                    </n-form-item>
                    <n-form-item label="资源类型" path="type">
                        <n-select 
                            v-model:value="resourceFormData.type" 
                            :options="resourceTypeOptions" 
                            placeholder="请选择资源类型"
                        />
                    </n-form-item>
                    <n-form-item label="上传文件" path="uploadFile">
                        <div style="width: 100%;">
                            <n-upload
                                v-model:file-list="editFileList"
                                name="file"
                                :max="1"
                                :custom-request="handleEditCustomUpload"
                                :on-error="handleUploadError"
                            >
                                <n-button>
                                    <template #icon>
                                        <n-icon><CloudUploadOutline /></n-icon>
                                    </template>
                                    选择文件
                                </n-button>
                            </n-upload>
                            <div v-if="editUploadedFilePath" style="margin-top: 8px; font-size: 13px; color: #6b7280;">
                                已上传文件：{{ editUploadedFilePath }}
                            </div>
                            <div v-if="resourceFormData.filePath && !editUploadedFilePath" style="margin-top: 8px; font-size: 13px; color: #6b7280;">
                                当前文件：{{ resourceFormData.filePath }}
                            </div>
                        </div>
                    </n-form-item>
                    <n-form-item label="备注" path="remark">
                        <n-input 
                            v-model:value="resourceFormData.remark" 
                            type="textarea" 
                            placeholder="请输入备注信息"
                            :autosize="{ minRows: 3, maxRows: 5 }"
                        />
                    </n-form-item>
                </n-form>
                <template #footer>
                    <n-space justify="end">
                        <n-button @click="showEditResourceModal = false">取消</n-button>
                        <n-button type="primary" @click="handleSaveResource" :loading="resourceSubmitting" :disabled="isUploading">保存</n-button>
                    </n-space>
                </template>
            </n-modal>

            <!-- 新增资源弹窗 -->
            <n-modal v-model:show="showAddResourceModal" preset="card" title="新增资源" style="width: 500px;">
                <n-form ref="addResourceFormRef" :model="addResourceFormData" :rules="resourceFormRules" label-placement="left" label-width="80">
                    <n-form-item label="资源名称" path="name">
                        <n-input v-model:value="addResourceFormData.name" placeholder="请输入资源名称" />
                    </n-form-item>
                    <n-form-item label="资源类型" path="type">
                        <n-select 
                            v-model:value="addResourceFormData.type" 
                            :options="resourceTypeOptions" 
                            placeholder="请选择资源类型"
                        />
                    </n-form-item>
                    <n-form-item label="上传文件" path="uploadFile">
                        <div style="width: 100%;">
                            <n-upload
                                v-model:file-list="addFileList"
                                name="file"
                                :max="1"
                                :custom-request="handleAddCustomUpload"
                                :on-error="handleUploadError"
                            >
                                <n-button>
                                    <template #icon>
                                        <n-icon><CloudUploadOutline /></n-icon>
                                    </template>
                                    选择文件
                                </n-button>
                            </n-upload>
                            <div v-if="uploadedFilePath" style="margin-top: 8px; font-size: 13px; color: #6b7280;">
                                已上传文件：{{ uploadedFilePath }}
                            </div>
                        </div>
                    </n-form-item>
                    <n-form-item label="备注" path="remark">
                        <n-input 
                            v-model:value="addResourceFormData.remark" 
                            type="textarea" 
                            placeholder="请输入备注信息"
                            :autosize="{ minRows: 3, maxRows: 5 }"
                        />
                    </n-form-item>
                </n-form>
                <template #footer>
                    <n-space justify="end">
                        <n-button @click="showAddResourceModal = false">取消</n-button>
                        <n-button type="primary" @click="handleSaveNewResource" :loading="addResourceSubmitting" :disabled="isUploading">保存</n-button>
                    </n-space>
                </template>
            </n-modal>

            <!-- 关联链接 -->
            <div v-if="group.links && group.links.length > 0" class="detail-section">
                <div class="section-label">
                    <n-icon size="14" color="#6b7280">
                        <LinkOutline />
                    </n-icon>
                    <span>关联链接 ({{ group.links.length }})</span>
                </div>
                <div class="section-content">
                    <div class="link-grid">
                        <div v-for="link in group.links" :key="link.id" class="link-item">
                            <n-icon size="16" color="#2563eb" class="link-icon">
                                <LinkOutline />
                            </n-icon>
                            <div class="link-info">
                                <span class="link-name">{{ link.name }}</span>
                                <span class="link-url">{{ link.url }}</span>
                            </div>
                            <a :href="link.url" target="_blank" class="link-open-btn" title="打开链接">
                                <n-icon size="14">
                                    <OpenOutline />
                                </n-icon>
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 备注 -->
            <div v-if="group.remark" class="detail-section">
                <div class="section-label">
                    <n-icon size="14" color="#6b7280">
                        <InformationCircleOutline />
                    </n-icon>
                    <span>备注</span>
                </div>
                <div class="section-content remark-content">
                    {{ group.remark }}
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
    NButton,
    NIcon,
    NEmpty,
    NModal,
    NTag,
    NForm,
    NFormItem,
    NInput,
    NSelect,
    NSpace,
    NTooltip,
    NUpload,
    useMessage
} from 'naive-ui'
import {
    FolderOutline,
    ChevronDownOutline,
    CreateOutline,
    TrashOutline,
    InformationCircleOutline,
    LayersOutline,
    DocumentTextOutline,
    LinkOutline,
    OpenOutline,
    DownloadOutline,
    Add,
    CloudUploadOutline
} from '@vicons/ionicons5'
import { useResourceLinksApi, useResourceUpdateApi, useResourceAddApi, useResourceUploadApi, useResourceDownloadApi } from '~/composables/resource'

const props = defineProps({
    group: {
        type: Object,
        required: true
    },
    defaultExpanded: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['edit', 'delete', 'resource-update'])

const message = useMessage()
const isExpanded = ref(props.defaultExpanded)

// 资源链接弹窗
const showLinkModal = ref(false)
const currentResource = ref(null)
const currentResourceLinks = ref([])

// 资源编辑弹窗
const showEditResourceModal = ref(false)
const resourceSubmitting = ref(false)
const resourceFormRef = ref(null)
const resourceFormData = ref({
    id: null,
    name: '',
    type: '',
    remark: ''
})

// 新增资源弹窗
const showAddResourceModal = ref(false)
const addResourceSubmitting = ref(false)
const addResourceFormRef = ref(null)
const addResourceFormData = ref({
    name: '',
    type: '',
    remark: ''
})

// 上传文件路径
const uploadedFilePath = ref('')  // 新增资源时使用
const editUploadedFilePath = ref('')  // 编辑资源时使用

// 上传文件列表
const addFileList = ref([])
const editFileList = ref([])

// 上传状态
const isUploading = ref(false)  // 是否正在上传

// 资源类型选项
const resourceTypeOptions = [
    { label: '文档', value: 'doc' },
    { label: '视频', value: 'video' },
    { label: '图片', value: 'image' },
    { label: '代码', value: 'code' },
    { label: '其他', value: 'other' }
]

// 表单验证规则
const resourceFormRules = {
    name: {
        required: true,
        message: '请输入资源名称',
        trigger: 'blur'
    },
    type: {
        required: true,
        message: '请选择资源类型',
        trigger: 'change'
    }
}

// 切换展开/收起
function toggleExpand() {
    isExpanded.value = !isExpanded.value
}

// 获取资源类型标签
function getResourceTypeLabel(type) {
    const typeMap = {
        'doc': '文档',
        'video': '视频',
        'image': '图片',
        'code': '代码',
        'other': '其他'
    }
    return typeMap[type] || type
}

// 判断是否为文件类型（可下载）
function isFileType(type) {
    return ['doc', 'video', 'image', 'code'].includes(type)
}

// 处理下载
async function handleDownload(resource) {
    if (!resource.filePath) {
        message.warning('该资源没有关联的文件')
        return
    }
    
    try {
        message.info('正在准备下载：' + resource.name)
        
        // 调用资源下载 API（返回二进制流 + 文件名）
        const { data, fileName, error } = await useResourceDownloadApi(resource.id)
        
        if (error.value) {
            message.error('下载失败')
            return
        }
        
        const blob = data.value
        if (!blob) {
            message.error('文件数据为空')
            return
        }
        
        // 优先使用服务端返回的文件名（含正确扩展名），回退到资源名称
        const downloadFileName = fileName.value || resource.name
        
        // 使用 Blob 创建可下载的 URL
        const blobUrl = window.URL.createObjectURL(blob)
        
        // 创建 <a> 标签触发浏览器"另存为"对话框
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = downloadFileName
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()
        
        // 清理 DOM 和内存
        document.body.removeChild(link)
        // 延迟释放 URL，确保下载已开始
        setTimeout(() => {
            window.URL.revokeObjectURL(blobUrl)
        }, 100)
        
        message.success('下载成功：' + downloadFileName)
    } catch (err) {
        console.error('下载失败:', err)
        message.error('下载失败')
    }
}

// 编辑资源
function handleEditResource(resource) {
    resourceFormData.value = {
        id: resource.id,
        name: resource.name,
        type: resource.type || '',
        remark: resource.remark || '',
        filePath: resource.filePath || ''  // 保存现有文件路径
    }
    editUploadedFilePath.value = ''  // 清空新上传文件路径
    editFileList.value = []  // 清空文件列表
    isUploading.value = false  // 重置上传状态
    showEditResourceModal.value = true
}

// 打开新增资源弹窗
function handleAddResource() {
    addResourceFormData.value = {
        name: '',
        type: '',
        remark: ''
    }
    uploadedFilePath.value = ''  // 清空上传文件路径
    addFileList.value = []  // 清空文件列表
    isUploading.value = false  // 重置上传状态
    showAddResourceModal.value = true
}

// 新增资源自定义上传
async function handleAddCustomUpload({ file, onFinish, onError }) {
    if (isUploading.value) {
        message.warning('文件正在上传中，请稍候')
        onError()
        return
    }
    
    try {
        isUploading.value = true
        const formData = new FormData()
        formData.append('file', file.file)
        
        const { data } = await useResourceUploadApi(formData)
        
        if (data.value && data.value.filePath) {
            uploadedFilePath.value = data.value.filePath
            onFinish()
        } else {
            onError()
        }
    } catch (error) {
        console.error('上传失败:', error)
        onError()
    } finally {
        isUploading.value = false
    }
}

// 编辑资源自定义上传
async function handleEditCustomUpload({ file, onFinish, onError }) {
    if (isUploading.value) {
        message.warning('文件正在上传中，请稍候')
        onError()
        return
    }
    
    try {
        isUploading.value = true
        const formData = new FormData()
        formData.append('file', file.file)
        
        const { data } = await useResourceUploadApi(formData)
        
        if (data.value && data.value.filePath) {
            editUploadedFilePath.value = data.value.filePath
            onFinish()
        } else {
            onError()
        }
    } catch (error) {
        console.error('上传失败:', error)
        onError()
    } finally {
        isUploading.value = false
    }
}

// 上传失败
function handleUploadError() {
    message.error('文件上传失败')
}

// 保存新资源
async function handleSaveNewResource() {
    try {
        // 表单验证
        await addResourceFormRef.value?.validate()
        
        addResourceSubmitting.value = true
        
        // 构建资源数据
        const resourceData = {
            ...addResourceFormData.value,
            groupId: props.group.id  // 传入资源组ID
        }
        
        // 如果有上传文件，添加到资源数据中
        if (uploadedFilePath.value) {
            resourceData.filePath = uploadedFilePath.value
            // 如果未选择类型，默认为文档
            if (!resourceData.type) {
                resourceData.type = 'doc'
            }
        }
        
        // 调用新增API
        const { data } = await useResourceAddApi(resourceData)
        
        message.success('资源新增成功')
        showAddResourceModal.value = false
        
        // 通知父组件刷新数据
        emit('resource-update')
    } catch (error) {
        if (error && error.errors) {
            // 表单验证错误，不做处理
            return
        }
        message.error('新增资源失败')
    } finally {
        addResourceSubmitting.value = false
    }
}

// 保存资源
async function handleSaveResource() {
    try {
        // 表单验证
        await resourceFormRef.value?.validate()
        
        resourceSubmitting.value = true
        
        // 构建更新数据
        const updateData = {
            id: resourceFormData.value.id,
            name: resourceFormData.value.name,
            type: resourceFormData.value.type,
            remark: resourceFormData.value.remark
        }
        
        // 如果有新上传的文件，使用新文件路径
        if (editUploadedFilePath.value) {
            updateData.filePath = editUploadedFilePath.value
        } else if (resourceFormData.value.filePath) {
            // 否则保留原文件路径
            updateData.filePath = resourceFormData.value.filePath
        }
        
        // 调用更新API
        await useResourceUpdateApi(updateData)
        
        message.success('资源更新成功')
        showEditResourceModal.value = false
        
        // 通知父组件刷新数据
        emit('resource-update')
    } catch (error) {
        if (error && error.errors) {
            // 表单验证错误，不做处理
            return
        }
        console.error('更新资源失败:', error)
        message.error('更新资源失败')
    } finally {
        resourceSubmitting.value = false
    }
}

// 查看资源关联的链接
async function handleViewLinks(resource) {
    currentResource.value = resource
    showLinkModal.value = true
    
    try {
        const { data } = await useResourceLinksApi(resource.id)
        currentResourceLinks.value = data.value || []
    } catch (error) {
        console.error('获取资源链接失败:', error)
        message.error('获取链接列表失败')
        currentResourceLinks.value = []
    }
}

// 暴露展开/收起方法供外部调用
defineExpose({
    toggleExpand,
    isExpanded
})
</script>

<style scoped>
.resource-group-card {
    background: #fff;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 16px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
    transition: box-shadow 0.2s;
}

.resource-group-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.group-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    padding: 4px;
    margin: -4px;
    border-radius: 6px;
    transition: background 0.2s;
}

.group-card-header:hover {
    background: #f9fafb;
}

.group-title {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
}

.group-name {
    font-size: 16px;
    font-weight: 600;
    color: #111827;
}

.expand-arrow {
    color: #9ca3af;
    transition: transform 0.3s;
}

.expand-arrow.expanded {
    transform: rotate(180deg);
}

.group-actions {
    display: flex;
    gap: 4px;
}

/* 详情面板 */
.group-detail-panel {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #f3f4f6;
    animation: slideDown 0.3s ease;
}

@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.detail-section {
    margin-bottom: 16px;
}

.detail-section:last-child {
    margin-bottom: 0;
}

.section-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 8px;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.section-header .section-label {
    margin-bottom: 0;
}

.empty-resource {
    padding: 20px 0;
}

.section-content {
    padding-left: 20px;
}

.description-content {
    font-size: 14px;
    color: #6b7280;
    line-height: 1.6;
}

.remark-content {
    font-size: 12px;
    color: #9ca3af;
    line-height: 1.5;
}

/* 资源列表 */
.resource-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.resource-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 14px;
    background: #f9fafb;
    border-radius: 8px;
    transition: all 0.2s;
}

.resource-item:hover {
    background: #f3f4f6;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}

.resource-icon {
    flex-shrink: 0;
    margin-top: 2px;
}

.resource-info {
    flex: 1;
    min-width: 0;
}

.resource-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
}

.resource-name {
    font-size: 14px;
    font-weight: 600;
    color: #111827;
}

.resource-type-tag {
    flex-shrink: 0;
    font-size: 11px;
}

.resource-remark {
    font-size: 13px;
    color: #6b7280;
    line-height: 1.5;
}

.resource-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
}

/* 链接网格 */
.link-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 8px;
}

.link-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: #f9fafb;
    border-radius: 6px;
    transition: all 0.2s;
    min-height: 40px;
}

.link-item:hover {
    background: #f3f4f6;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.link-icon {
    flex-shrink: 0;
}

.link-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.link-name {
    font-size: 14px;
    font-weight: 500;
    color: #111827;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.link-url {
    font-size: 12px;
    color: #6b7280;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.link-open-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    color: #2563eb;
    border-radius: 4px;
    transition: background 0.2s;
}

.link-open-btn:hover {
    background: rgba(37, 99, 235, 0.1);
}

.empty-detail {
    padding: 20px 0;
}

/* 弹窗链接列表 */
.modal-link-list {
    max-height: 400px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.modal-link-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: #f9fafb;
    border-radius: 6px;
    transition: background 0.2s;
}

.modal-link-item:hover {
    background: #f3f4f6;
}

.modal-link-info {
    flex: 1;
    min-width: 0;
}

.modal-link-name {
    font-size: 14px;
    font-weight: 500;
    color: #111827;
    margin-bottom: 2px;
}

.modal-link-url {
    font-size: 12px;
    color: #6b7280;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.modal-link-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    color: #2563eb;
    border-radius: 4px;
    transition: background 0.2s;
    flex-shrink: 0;
}

.modal-link-btn:hover {
    background: rgba(37, 99, 235, 0.1);
}
</style>
