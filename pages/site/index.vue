<template>
    <div class="site-page">
        <!-- 面包屑 -->
        <div class="breadcrumb">
          <span class="bc-item" @click="$router.push('/')">🏠 首页</span>
          <span class="bc-sep">›</span>
          <span class="bc-current">🖥️ 内部网站</span>
        </div>
        <!-- 页面头部 -->
        <div class="site-header">
            <div class="site-header-actions">
                <n-input v-model:value="searchForm.siteName" placeholder="搜索网站名称" clearable
                    style="width: 500px; margin-right: 8px;" @keyup.enter="handleSearch">
                    <template #prefix>
                        <n-icon>
                            <Search />
                        </n-icon>
                    </template>
                </n-input>
                <n-select v-model:value="searchForm.status" placeholder="状态筛选" :options="statusOptions" clearable
                    @update:value="handleSearch" />
                <n-select v-model:value="searchForm.siteType" placeholder="网站类型" :options="siteTypeOptions" clearable
                    @update:value="handleSearch" />

                <resource-selector :model-value="searchForm.resourceFilters" @update:model-value="handleResourcesFilterUpdated"/>
                <n-button type="primary" @click="handleSearch" style="margin-right: 8px;">
                                        <template #icon><n-icon>
                        <n-tooltip trigger="hover">
                                <template #trigger>
                                     <Search />
                                </template>
                                搜索
                        </n-tooltip>
                        </n-icon>
                    </template>
                    </n-button>
                <n-button type="primary" @click="handleRefreshAll" style="margin-right: 8px;" :loading="checkingAll">
                    <template #icon><n-icon>
                        <n-tooltip trigger="hover">
                                <template #trigger>
                                     <Refresh />
                                </template>
                                刷新检查
                        </n-tooltip>
                        </n-icon>
                    </template>
                </n-button>
                <n-button type="primary" @click="openTagManageModal" style="margin-right: 8px;">
                    <template #icon><n-icon>
                        <n-tooltip trigger="hover">
                                <template #trigger>
                                     <Bookmark />
                                </template>
                                标签管理
                        </n-tooltip>
                        </n-icon></template>
                </n-button>
                <n-button type="primary" @click="openAddModal">
                    <template #icon><n-icon>
                        <n-tooltip trigger="hover">
                                <template #trigger>
                                     <Add />
                                </template>
                                新增网站
                        </n-tooltip>
                        </n-icon></template>
                </n-button>
            </div>
        </div>

        <!-- 网站卡片列表 -->
        <div v-if="loading" class="loading-container">
            <n-spin size="large" />
        </div>

        <div v-else-if="siteList.length === 0" class="empty-container">
            <n-empty description="暂无网站数据" />
        </div>

        <div v-else class="site-grid">
            <div v-for="site in siteList" :key="site.id" class="site-card">
                <!-- 封面图 -->
                <div class="site-cover" @click="handleSiteClicked(site)">
                    <img v-if="site.cover" :src="site.cover" :alt="site.siteName" class="cover-img" />
                    <div v-else class="cover-placeholder">
                        <n-icon size="40" color="#9ca3af">
                            <Globe />
                        </n-icon>
                    </div>
                    <!-- 连接状态徽章 -->
                    <span v-if="site.lastCheckTime" class="status-badge" :class="site.status == 1 ? 'badge-online' : 'badge-offline'">
                        {{ site.status == 1 ? '在线' : '掉线' }}
                    </span>
                    <!-- 操作按钮 - 右上角悬浮 -->
                    <div class="site-card-actions">
                        <n-button size="small" @click.stop="handleRefreshSite(site)" class="card-action-btn" :loading="site.checking">
                            <template #icon>
                                <n-icon>
                                    <Refresh />
                                </n-icon>
                            </template>
                        </n-button>
                        <n-button size="small" @click.stop="openEditModal(site)" class="card-action-btn">
                            <template #icon>
                                <n-icon>
                                    <CreateOutline />
                                </n-icon>
                            </template>
                        </n-button>
                        <n-button size="small" type="error" @click.stop="handleDelete(site.id)" class="card-action-btn">
                            <template #icon>
                                <n-icon>
                                    <TrashOutline />
                                </n-icon>
                            </template>
                        </n-button>
                        <!-- 演示站点操作按钮 -->
                        <template v-if="site.siteType === 'demo'">
                            <n-tooltip trigger="hover">
                                <template #trigger>
                                    <n-button size="small" type="info" @click.stop="handleDemoStart(site)" class="card-action-btn" :loading="site._demoStarting">
                                        <template #icon><n-icon><PlayCircleOutline /></n-icon></template>
                                    </n-button>
                                </template>
                                启动
                            </n-tooltip>
                            <n-tooltip trigger="hover">
                                <template #trigger>
                                    <n-button size="small" type="warning" @click.stop="handleDemoCheck(site)" class="card-action-btn" :loading="site._demoChecking">
                                        <template #icon><n-icon><CheckmarkCircleOutline /></n-icon></template>
                                    </n-button>
                                </template>
                                检查
                            </n-tooltip>
                            <n-tooltip trigger="hover">
                                <template #trigger>
                                    <n-button size="small" type="error" @click.stop="handleDemoStop(site)" class="card-action-btn" :loading="site._demoStopping">
                                        <template #icon><n-icon><StopCircleOutline /></n-icon></template>
                                    </n-button>
                                </template>
                                停止
                            </n-tooltip>
                        </template>
                    </div>
                </div>

                <!-- 网站信息 -->
                <div class="site-info">
                    <div class="site-name">
                        {{ site.siteName }}
                        <n-tag v-if="site.siteTypeName" size="tiny" :bordered="false" type="info" style="margin-left: 6px; vertical-align: middle;">{{ site.siteTypeName }}</n-tag>
                    </div>
                    <div v-if="site.description" class="site-desc">{{ site.description }}</div>
                    <!-- 标签 -->
                    <div v-if="site.tagList && site.tagList.length > 0" class="site-tags">
                        <n-tag v-for="(tag, index) in site.tagList" :key="index" size="tiny" type="info"
                            style="margin-right: 3px; margin-top: 3px;">{{ tag.tagName }}</n-tag>
                    </div>
                    <!-- 负责人 -->
                    <div class="site-responsibles">
                        <n-tag v-for="(resp, index) in site.maintainers" :key="index" size="tiny" type="success"
                            style="margin-right: 3px; margin-top: 3px;">{{ resp.userName }}</n-tag>
                    </div>

                    <!-- 关联的资源 -->
                    <div class="site-resources" v-if="site.resources && site.resources.length > 0">
                        <n-tag v-for="(res, index) in site.resources" :key="index" size="tiny" type="success"
                            style="margin-right: 3px; margin-top: 3px;">
                            <span v-on:click="handleResourceClicked(res)" class="resource-link">
                                {{ res.resourceName }}
                            </span>
                        </n-tag>
                    </div>
                    <!-- 最后检查时间 -->
                    <div class="site-last-check">
                        最后检查于：<n-icon size="10" color="#6b7280">
                            <TimeOutline />
                        </n-icon>
                        <span>{{ formatLastCheckTime(site.lastCheckTime) }}</span>
                        <span>({{ site.lastCheckTime }})</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- 分页 -->
         <!-- 
                <div v-if="total > 0" class="pagination-container">
            <n-pagination v-model:page="currentPage" :page-count="Math.ceil(total / pageSize)" :page-size="pageSize"
                show-quick-jumper @update:page="handlePageChange" />
        </div>
         -->

        <!-- 新增/编辑 弹窗 -->
        <n-modal v-model:show="showModal" :title="modalTitle" preset="card" style="width: 620px;"
            :mask-closable="false">
            <n-form ref="formRef" :model="formData" :rules="formRules" label-placement="left" label-width="90px">
                <n-form-item label="网站名称" path="siteName">
                    <n-input v-model:value="formData.siteName" placeholder="请输入网站名称" maxlength="100" show-count />
                </n-form-item>
                <n-form-item label="网站类型">
                    <div style="display: flex; gap: 8px; width: 100%;">
                        <n-select v-model:value="formData.siteType" placeholder="请选择网站类型" :options="siteTypeOptions" clearable style="flex: 1;" />
                        <n-button v-if="formData.siteType === 'demo'" type="primary" @click="showDemoConfigModal = true" style="min-width: 120px;">
                            演示配置
                        </n-button>
                    </div>
                </n-form-item>
                <n-form-item label="访问地址" path="siteUrl">
                <n-input v-model:value="formData.siteUrl" placeholder="请输入网站地址，如 https://example.com"
                        maxlength="500" />
                </n-form-item>
                <n-form-item label="封面图片" path="cover">
                    <uploader v-model:value="formData.cover" :data="formApiData" @update:model-value="handleCoverUploaded"/>
                </n-form-item>
                <n-form-item label="网站描述" path="description">
                    <n-input v-model:value="formData.description" type="textarea" placeholder="请输入网站描述（可选）"
                        maxlength="500" show-count :autosize="{ minRows: 2, maxRows: 4 }" />
                </n-form-item>
                <n-form-item label="责任人" path="maintainerUserIds">
                    <user-selector :model-value="formData.maintainerUserIds" @update:model-value="handlemaintainerUserIdsUpdated"/>
                </n-form-item>
                <n-form-item label="标签" path="tags">
                    <div style="display: flex; gap: 8px; width: 100%;">
                        <n-select 
                            v-model:value="formData.tags" 
                            placeholder="请选择或输入标签"
                            :options="tagOptions"
                            multiple
                            style="flex: 1;"
                        />
                        <n-button type="primary" @click="openTagManageModal" style="min-width: 100px;">
                            管理标签
                        </n-button>
                    </div>
                </n-form-item>
                <n-form-item label="关联资源" path="relatedResources">
                    <resource-selector :model-value="formData.relatedResources" @update:model-value="handleRelatedResourcesUpdated"/>
                </n-form-item>
            </n-form>
            <template #footer>
                <div style="display: flex; justify-content: flex-end; gap: 8px;">
                    <n-button @click="showModal = false">取消</n-button>
                    <n-button type="primary" :loading="submitting" @click="handleSubmit">确定</n-button>
                </div>
            </template>
        </n-modal>

        <!-- 演示站点配置弹窗 -->
        <n-modal v-model:show="showDemoConfigModal" title="演示站点配置" preset="card" style="width: 720px;"
            :mask-closable="false">
            <SiteDemoConfigForm v-model:site-config="formData.siteConfig" />
            <template #footer>
                <div style="display: flex; justify-content: flex-end;">
                    <n-button type="primary" @click="showDemoConfigModal = false">完成</n-button>
                </div>
            </template>
        </n-modal>

        <!-- 标签管理弹窗 -->
        <n-modal v-model:show="showTagManageModal" title="管理标签" preset="card" style="width: 700px;"
            :mask-closable="false">
            <div style="margin-bottom: 12px;">
                <n-input 
                    v-model:value="newTagName" 
                    placeholder="输入新标签名称"
                    @keyup.enter="handleAddTag"
                    maxlength="50"
                >
                    <template #suffix>
                        <n-button type="primary" size="small" @click="handleAddTag" :loading="addingTag">
                            添加
                        </n-button>
                       <n-button type="primary" size="small" @click="handleRefreshTags" :loading="addingTag">
                            刷新
                        </n-button>
                    </template>
                </n-input>
            </div>
            <n-data-table
                :columns="tagColumns"
                :data="allTags"
                :bordered="false"
                :single-line="false"
                style="max-height: 400px; overflow-y: auto;"
            />
            <template #footer>
                <div style="display: flex; justify-content: flex-end;">
                    <n-button @click="showTagManageModal = false">关闭</n-button>
                </div>
            </template>
        </n-modal>
    </div>
</template>

<script setup>
import {
    NInput, NButton, NSelect, NModal, NForm, NFormItem,
    NTag, NSpin, NEmpty,
    NIcon, createDiscreteApi, NDataTable, NTooltip
} from 'naive-ui'
import SiteDemoConfigForm from './SiteDemoConfigForm.vue'
import ResourceSelector from './ResourceSelector.vue'
import { Search, Add, Globe, CreateOutline, Bookmark, TrashOutline, Refresh, TimeOutline, PlayCircleOutline, CheckmarkCircleOutline, StopCircleOutline } from '@vicons/ionicons5'
import { h } from 'vue'

const preContent = (text) => () => h('pre', { style: 'white-space: pre-wrap; word-break: break-all; max-height: 300px; overflow-y: auto; margin: 0; font-family: inherit;' }, text)

useHead({
    title: '内部网站 - 开源助手',
})

const formApiData = {
    type: "image",
    preview: true,
    minute: 3,
    id: "site-cover"
}

function handleCoverUploaded(file) {
    if (file) {
        formData.cover = file.userData.url
    }
}

function handleRelatedResourcesUpdated(value) {
    formData.relatedResources = value
}

function handleResourcesFilterUpdated(value) {
    searchForm.resourceFilters = value.map(res => {
        return res[0] + '|' + res[1]
    })
}

function handlemaintainerUserIdsUpdated(value) {
    formData.maintainerUserIds = value
}

// 状态选项
const statusOptions = [
    { label: '正常', value: 1 },
    { label: '异常', value: 0 },
]

// 列表数据
const siteList = ref([])
const loading = ref(false)
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(100000)

// 搜索表单
const searchForm = reactive({
    siteName: '',
    status: null,
    siteType: null,
    resourceFilters: [], // 资源筛选条件
})

// 弹窗
const showModal = ref(false)
const modalTitle = ref('新增网站')
const submitting = ref(false)
const isEdit = ref(false)
const formRef = ref(null)

const defaultFormData = () => ({
    id: null,
    siteName: '测试站点',
    siteType: null,
    siteUrl: 'https://www.baidu.com',
    cover: '',
    description: '',
    maintainerUserIds: [],
    tags: [],
    status: 1,
    siteConfig: {},
    relatedResources: [],
})

const formData = reactive(defaultFormData())

// 演示配置弹窗
const showDemoConfigModal = ref(false)

// 网站类型选项
const siteTypeOptions = [
    { label: '演示站点', value: 'demo' }
]

// 标签相关
const allTags = ref([])
const tagOptions = ref([])
const showTagManageModal = ref(false)
const newTagName = ref('')
const addingTag = ref(false)

// 标签表格列定义
const tagColumns = [
    {
        title: '标签名称',
        key: 'tagName',
        width: 100,
        render: (row) => {
            return h('div', {
                innerText: row.tagName
            })
        }
    },
    {
        title: '已添加网站数',
        key: 'usageCount',
        width: 100,
        render: (row) => {
            return h('span', { 
                style: 'color: #18a058; font-weight: bold;' 
            }, row.usageCount || 0)
        }
    },
    {
        title: '操作',
        key: 'actions',
        width: 20,
        fixed: 'right',
        render: (row) => {
            return h('div', { style: 'display: flex; gap: 4px;' }, [
                // h(NButton, {
                //     size: 'small',
                //     type: 'primary',
                //     onClick: () => handleUpdateTag(row)
                // }, { default: () => '保存' }),
                h(NButton, {
                    size: 'small',
                    type: 'error',
                    onClick: () => handleDeleteTag(row)
                }, { default: () => '删除' })
            ])
        }
    }
]

function handleResourceClicked(res) {
    if (res.jumpingUrl) {
    window.open(res.jumpingUrl, '_blank')
}
}

const formRules = {
    siteName: [{ required: true, message: '请输入网站名称', trigger: 'blur' }],
    siteUrl: [
        { required: true, message: '请输入网站地址', trigger: 'blur' },
        { pattern: /^https?:\/\/.+/, message: '请输入以 http:// 或 https:// 开头的地址', trigger: 'blur' }
    ],
}

// 加载列表
async function loadList() {
    loading.value = true
    try {
        const query = {
            pageNum: currentPage.value,
            pageSize: pageSize.value,
        }
        if (searchForm.siteName) query.siteName = searchForm.siteName
        if (searchForm.status !== null) query.status = searchForm.status
        if (searchForm.siteType) query.siteType = searchForm.siteType
        if (searchForm.resourceFilters.length > 0) {
            query.resourceFilters = searchForm.resourceFilters
        }
        const { data } = await useSiteInfoListApi(query)
        if (data.value ) {
            const sites = data.value.rows || []
            siteList.value = sites
            total.value = data.value.total || 0
        }
    } finally {
        loading.value = false
    }
}

// 搜索
function handleSearch() {
    currentPage.value = 1
    loadList()
}

// 新增还是修改：新增为 false，修改为 true
const isUpdate = ref(false)

// 打开新增弹窗
function openAddModal() {
    isEdit.value = false
    modalTitle.value = '新增网站'
    isUpdate.value = false
    Object.assign(formData, defaultFormData())
    showModal.value = true
}

// 打开编辑弹窗
function openEditModal(site) {
    isEdit.value = true
    modalTitle.value = '编辑网站'
    isUpdate.value = true
    let maintainerUserIds = site.maintainerUserIds || []
    let siteUrl = site.siteUrl || ''
    // 获取网站链接地址(有权限校验)
    useGetSiteInfoByIdApi(site.id, true)
        .then(({ data }) => {
        if (data.value) {
            const siteInfo = data.value
            const tags = siteInfo.tagList ? siteInfo.tagList.map(tag => tag.id) : []
            siteUrl = siteInfo.siteUrl || siteUrl
            Object.assign(formData, {
                id: site.id,
                siteName: siteInfo.siteName || '',
                siteType: siteInfo.siteType || null,
                siteUrl: siteInfo.siteUrl || '',
                description: site.description || '',
                tags: tags,
                maintainerUserIds: maintainerUserIds,
                status: siteInfo.status ?? 1,
                siteConfig: siteInfo.siteConfig || {},
                relatedResources: site.relatedResources || [],
            })
            showModal.value = true
        }
    })
}

// 提交表单
async function handleSubmit() {
    try {
        await formRef.value.validate()
    } catch {
        return
    }
    submitting.value = true
    const { message } = createDiscreteApi(['message'])
    try {
        if (formData.tags) {
            formData.tagList = formData.tags.map(tagId => {
                    return { id: tagId }
                }
            )
        }
        const req = { ...formData }

        debugger
        if (isEdit.value) {
            await useSiteInfoUpdateApi(req)
            message.success('修改成功')
        } else {
            await useSiteInfoAddApi(req)
            message.success('新增成功')
        }
        showModal.value = false
        loadList()
    } catch (error) {
        message.error(isEdit.value ? '修改失败' : '新增失败')
    } finally {
        submitting.value = false
    }
}

// 删除
function handleDelete(id) {
    const { dialog, message } = createDiscreteApi(['dialog', 'message'])
    dialog.warning({
        title: '提示',
        content: '确认删除该网站吗？',
        positiveText: '删除',
        negativeText: '取消',
        onPositiveClick: async () => {
            try {
                await useSiteInfoDeleteApi(id)
                message.success('删除成功')
                loadList()
            } catch {
                message.error('删除失败')
            }
        },
    })
}

// ========== 演示站点操作 ==========

// 启动演示站点后端服务
async function handleDemoStart(site) {
    const { dialog, message } = createDiscreteApi(['dialog', 'message'])
    site._demoStarting = true
    try {
        message.info('正在启动服务，请耐心等待...')
        useSiteDemoStartApi(site.id).then((res) => {
            if (res.code === 200) {
                const result = res.data
                if (result?.started) {
                    let info = '服务已成功启动！\n\n'
                    if (result.healthCheckOutput) {
                        info += '📋 检查输出：\n' + result.healthCheckOutput + '\n\n'
                    }
                    if (result.frontendUrl) {
                        info += '🌐 访问地址：\n' + result.frontendUrl + '\n\n'
                    }
                    if (result.loginUsername) {
                        info += '🔑 登录凭证：\n用户名：' + result.loginUsername
                        if (result.loginPassword) info += '\n密码：' + result.loginPassword
                    }
                    dialog.success({
                        title: '启动成功',
                        content: preContent(info),
                        positiveText: '访问站点',
                        onPositiveClick: () => {
                            if (result.frontendUrl) {
                                window.open(result.frontendUrl, '_blank')
                            }
                        }
                    })
                } else {
                    dialog.warning({
                        title: '启动超时',
                        content: preContent((result?.message || '健康检查未通过') + '\n\n请稍后手动检查服务状态'),
                        positiveText: '确定'
                    })
                }
            } else {
                dialog.error({
                    title: '启动失败',
                    content: preContent(res.msg || '服务端错误'),
                    positiveText: '确定'
                })
            }
        })
    } catch (e) {
        dialog.error({
            title: '启动失败',
            content: preContent(e.message || '连接异常'),
            positiveText: '确定'
        })
    } finally {
        site._demoStarting = false
    }
}

// 检查演示站点服务状态
async function handleDemoCheck(site) {
    const { dialog, message } = createDiscreteApi(['dialog', 'message'])
    site._demoChecking = true
    try {
        useSiteDemoCheckApi(site.id).then(res => {
            if (res.code === 200) {
                const result = res.data
                let info = ''

                // 健康状态
                if (result?.healthy !== undefined) {
                    info += '🩺 服务状态：' + (result.healthy ? '✅ 正常运行' : '❌ 异常')
                    if (result.exitCode !== undefined) info += ' (退出码: ' + result.exitCode + ')'
                    info += '\n'
                }

                // 检查输出
                if (result?.output) {
                    info += '\n📋 检查输出：\n' + result.output + '\n'
                }

                // 错误信息
                if (result?.error) {
                    info += '\n⚠ 错误：' + result.error + '\n'
                }

                // 访问地址
                if (result?.frontendUrl) {
                    info += '\n🌐 访问地址：' + result.frontendUrl + '\n'
                }

                // 登录凭证
                if (result?.loginUsername) {
                    info += '\n🔑 登录凭证：\n用户名：' + result.loginUsername
                    if (result.loginPassword) info += '\n密码：' + result.loginPassword
                }

                if (result?.healthy) {
                    dialog.success({
                        title: '检查结果 — 服务正常',
                        content: preContent(info),
                        positiveText: '访问站点',
                        onPositiveClick: () => {
                            if (result.frontendUrl) {
                                window.open(result.frontendUrl, '_blank')
                            }
                        }
                    })
                } else if (info) {
                    dialog.warning({
                        title: '检查结果 — 服务异常',
                        content: preContent(info),
                        positiveText: '确定'
                    })
                } else {
                    message.success('状态检查完成')
                }
            } else {
                dialog.error({
                    title: '检查失败',
                    content: preContent(res.msg || '服务端错误'),
                    positiveText: '确定'
                })
            }
        })

    } catch (e) {
        dialog.error({
            title: '检查失败',
            content: preContent(e.message || '连接异常'),
            positiveText: '确定'
        })
    } finally {
        site._demoChecking = false
    }
}

// 停止演示站点服务
async function handleDemoStop(site) {
    const { dialog, message } = createDiscreteApi(['dialog', 'message'])
    dialog.warning({
        title: '确认停止',
        content: '确认停止 ' + site.siteName + ' 的演示服务吗？',
        positiveText: '确认停止',
        negativeText: '取消',
        onPositiveClick: async () => {
            site._demoStopping = true
            try {
                message.info('正在停止服务...')
                useSiteDemoStopApi(site.id).then(res => {
                    if (res.code === 200) {
                        const result = res.data
                        let info = ''
                        if (result?.stopped !== undefined) {
                            info += '🛑 停止结果：' + (result.stopped ? '✅ 已停止' : '⚠ 脚本执行返回非零退出码') + '\n'
                            if (result.exitCode !== undefined) info += '退出码：' + result.exitCode + '\n'
                        }
                        if (result?.output) {
                            info += '\n📋 输出：\n' + result.output
                        }
                        if (result?.stopped) {
                            dialog.success({
                                title: '停止成功',
                                content: preContent(info),
                                positiveText: '确定'
                            })
                        } else {
                            dialog.warning({
                                title: '停止结果',
                                content: preContent(info || '未知结果'),
                                positiveText: '确定'
                            })
                        }
                    } else {
                        dialog.error({
                            title: '停止失败',
                            content: preContent(res.msg || '服务端错误'),
                            positiveText: '确定'
                        })
                    }
                })
            } catch (e) {
                dialog.error({
                    title: '停止失败',
                    content: preContent(e.message || '连接异常'),
                    positiveText: '确定'
                })
            } finally {
                site._demoStopping = false
            }
        }
    })
}

// ========== 标签管理相关方法 ==========

// 加载所有标签
async function loadAllTags() {
    try {
        // -1 为系统标签
        const { data } = await useSiteTagsListApi()
        if (data.value) {
            allTags.value = data.value.map(tag => ({
                id: tag.id,
                tagName: tag.tagName,
                usageCount: tag.usageCount || 0
            }))
            tagOptions.value = data.value.map(tag => ({
                label: `${tag.tagName}`,
                value: tag.id
            }))
        }
    } catch (error) {
        console.error('加载标签失败:', error)
    }
}

// 打开标签管理弹窗
function openTagManageModal() {
    showTagManageModal.value = true
    loadAllTags()
}

function handleRefreshTags() {
    loadAllTags()
}

// 添加新标签
async function handleAddTag() {
    if (!newTagName.value || !newTagName.value.trim()) {
        const { message } = createDiscreteApi(['message'])
        message.warning('请输入标签名称')
        return
    }
    
    addingTag.value = true
    const { message } = createDiscreteApi(['message'])
    
    try {
        await useSiteTagAddApi({
            tagName: newTagName.value.trim(),
            siteId: -1 // -1 表示系统标签
        })
        message.success('添加成功')
        newTagName.value = ''
        await loadAllTags() // 重新加载标签列表
    } catch {
        message.error('添加失败')
    } finally {
        addingTag.value = false
    }
}

// 更新标签
async function handleUpdateTag(row) {
    const { message } = createDiscreteApi(['message'])
    
    if (!row.tagName || !row.tagName.trim()) {
        message.warning('标签名称不能为空')
        return
    }
    
    try {
        await useSiteTagUpdateApi({
            id: row.id,
            tagName: row.tagName.trim()
        })
        message.success('修改成功')
        await loadAllTags()
    } catch {
        message.error('修改失败')
    }
}

// 删除标签
async function handleDeleteTag(row) {
    const { dialog, message } = createDiscreteApi(['dialog', 'message'])
    
    dialog.warning({
        title: '提示',
        content: '确认删除该标签吗？',
        positiveText: '删除',
        negativeText: '取消',
        onPositiveClick: async () => {
            try {
                await useSiteTagDeleteApi([row.id])
                message.success('删除成功')
                await loadAllTags()
            } catch {
                message.error('删除失败')
            }
        },
    })
}


function handleSiteClicked(site) {
    // 处理网站点击事件
    useSiteUrlApi(site.id).then(({ data }) => {
        if (data.value) {
            // 打开浏览器页签
            // TODO 权限校验
            window.open(data.value.siteUrl, '_blank')
        }
    })
}

const checkingAll = ref(false)

async function handleRefreshAll() {
    checkingAll.value = true
    try {
        const { data } = await useSiteInfoRefreshAllApi()
        if (data.value) {
            const results = data.value
            // Update connection status for each site
            siteList.value.forEach(site => {
                const result = results.find(r => r.siteId === site.id)
                if (result) {
                    site.isConnected = result.isConnected
                    site.lastCheckTime = result.lastCheckTime
                }
            })
        }
    } catch (error) {
        console.error('刷新检查失败:', error)
        const { message } = createDiscreteApi(["message"])
        message.error("刷新检查失败")
    } finally {
        checkingAll.value = false
    }
}

async function handleRefreshSite(site) {
    site.checking = true
    try {
        await useSiteInfoRefreshApi(site.id)
    } catch (error) {
        const { message } = createDiscreteApi(["message"])
        message.error("检查网站状态失败")
    } finally {
        site.checking = false
        loadList()
    }
}

// 格式化最后检查时间
function formatLastCheckTime(timeStr) {
    if (!timeStr) return ''
    const date = new Date(timeStr)
    const now = new Date()
    const diff = now - date
    
    // 小于1分钟
    if (diff < 60000) {
        return '刚刚'
    }
    // 小于1小时
    if (diff < 3600000) {
        return Math.floor(diff / 60000) + '分钟前'
    }
    // 小于24小时
    if (diff < 86400000) {
        return Math.floor(diff / 3600000) + '小时前'
    }
    // 超过24小时，显示具体日期
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours().toString().padStart(2, '0')
    const minute = date.getMinutes().toString().padStart(2, '0')
    return `${month}月${day}日 ${hour}:${minute}`
}

onMounted(() => {
    loadList()
    loadAllTags()
})
</script>

<style scoped>
.site-page {
width: 100%;
    min-height: 60vh;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #999;
  margin-bottom: 12px;
}
.bc-item { color: #666; cursor: pointer; transition: color 0.2s; }
.bc-item:hover { color: #18a058; }
.bc-sep { color: #ddd; user-select: none; }
.bc-current { color: #333; font-weight: 600; }

.site-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    background: #fff;
    border-radius: 8px;
    padding: 16px 20px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.site-title {
    font-size: 18px;
    font-weight: 700;
    color: #111827;
    margin: 0;
}

.site-header-actions {
    display: flex;
    align-items: center;
}

.loading-container,
.empty-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 300px;
    background: #fff;
    border-radius: 8px;
}

.site-grid {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
}

.site-card {
    background: #fff;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
    transition: box-shadow 0.2s, transform 0.2s;
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.site-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
}

.site-cover {
    position: relative;
    height: 120px;
    background: #f3f4f6;
    overflow: hidden;
    cursor: pointer;
}

.cover-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.cover-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #e0f2fe 0%, #e0e7ff 100%);
}

.status-badge {
    position: absolute;
    top: 8px;
    left: 8px;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    z-index: 2;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.badge-online {
    background: #10b981;
    color: #ffffff;
}

.badge-offline {
    background: #ef4444;
    color: #ffffff;
    animation: pulse-red 2s ease-in-out infinite;
}

@keyframes pulse-red {
    0%, 100% {
        opacity: 1;
    }
    50% {
        opacity: 0.8;
    }
}

.site-card-actions {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 6px;
    opacity: 0;
    transition: opacity 0.2s ease;
    z-index: 2;
}

.site-card:hover .site-card-actions {
    opacity: 1;
}

.card-action-btn {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.site-info {
    padding: 10px 12px;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.site-name {
    font-size: 14px;
    font-weight: 700;
    color: #111827;
    margin-bottom: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.3;
}

.site-url {
    display: flex;
    align-items: center;
    gap: 3px;
    margin-bottom: 4px;
}

.url-link {
    font-size: 10px;
    color: #2563eb;
    text-decoration: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100px;
}

.url-link:hover {
    text-decoration: underline;
}

.site-desc {
    font-size: 12px;
    color: #6b7280;
    margin-bottom: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.4;
}

.site-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    min-height: 0;
}

.site-tags .n-tag {
    font-size: 11px;
    padding: 0 6px;
    height: 20px;
    line-height: 18px;
}

.site-responsibles {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    min-height: 0;
}

.site-resources {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    min-height: 0;
}

.resource-link {
  color: #1890ff; /* Naive UI / antd 标准链接蓝 */
  cursor: pointer;
  text-decoration: none;
  transition: color 0.2s ease-in-out;
}

.site-responsibles .n-tag {
    font-size: 11px;
    padding: 0 6px;
    height: 20px;
    line-height: 18px;
}

.site-last-check {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: #6b7280;
    margin-top: auto;
}

.pagination-container {
    margin-top: 20px;
    display: flex;
    justify-content: center;
    padding: 16px 0;
}

@media (max-width: 1400px) {
    .site-grid {
        grid-template-columns: repeat(3, 1fr);
    }
}

@media (max-width: 1024px) {
    .site-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 640px) {
    .site-grid {
        grid-template-columns: 1fr;
    }
}

</style>
