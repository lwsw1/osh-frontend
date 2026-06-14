<template>
  <div class="open-project-page">
    <OpenProjectAnnouncementBar />

    <div class="page-head">
      <n-breadcrumb>
        <n-breadcrumb-item><nuxt-link to="/">首页</nuxt-link></n-breadcrumb-item>
        <n-breadcrumb-item>开源项目</n-breadcrumb-item>
      </n-breadcrumb>
      <n-button type="primary" secondary @click="openSourceModal">
        查看数据源
      </n-button>
    </div>

    <OpenProjectSearch :tag-options="tagOptions" :source-options="sourceOptions" @search="handleSearch" />

    <div class="page-layout">
      <div class="list-area">
        <div class="content-area">
          <div v-if="loading" class="empty-box"><n-spin size="large" /></div>
          <div v-else-if="projectList.length === 0" class="empty-box">
            <n-empty description="暂无开源项目" />
          </div>

          <div v-else class="project-grid">
            <div
              v-for="item in projectList"
              :key="item.id"
              class="project-card"
              :class="{ archived: item.isArchived === 1, expanded: expandedId === item.id }"
            >
              <div class="card-inner" @click="toggleExpand(item)">
                <div class="card-header">
                  <div class="title-row">
                    <span class="expand-icon" :class="{ open: expandedId === item.id }">›</span>
                    <span class="project-title">{{ item.projectName }}</span>
                    <n-tag v-if="item.isArchived === 1" size="small" type="warning">已归档</n-tag>
                  </div>
                  <div class="project-tags">
                    <n-tag v-for="(tagName, idx) in item.tagNames" :key="idx" size="small" type="primary">
                      {{ tagName }}
                    </n-tag>
                  </div>
                </div>

                <div class="card-body" v-show="expandedId !== item.id">
                  <p class="project-desc">{{ item.projectDesc || '暂无描述' }}</p>
                </div>

                <div class="card-footer">
                  <div class="author-info">
                    <n-avatar :size="24" :src="item.projectCover || defaultCover" />
                    <span class="author-name">{{ item.authorName || item.githubOwner || '匿名' }}</span>
                  </div>
                  <div class="footer-right">
                    <div class="github-stats">
                      <span class="stat-item">★ {{ item.starCount ?? '-' }}</span>
                      <span class="stat-item">⑂ {{ item.forkCount ?? '-' }}</span>
                      <span v-if="item.lastCommitTime" class="stat-item last-commit">
                        最近提交：{{ formatDate(item.lastCommitTime) }}
                      </span>
                    </div>
                    <n-button
                      text
                      :style="{ color: item.favorited ? '#f59e0b' : '#9ca3af', fontSize: '22px' }"
                      :title="item.favorited ? '取消收藏' : '收藏'"
                      @click.stop="toggleFavorite(item)"
                    >
                      {{ item.favorited ? '★' : '☆' }}
                    </n-button>
                  </div>
                </div>
              </div>

              <Transition name="expand">
                <div v-if="expandedId === item.id" class="card-detail">
                  <div class="detail-loading" v-if="detailLoading">
                    <n-spin size="small" /> 加载中...
                  </div>
                  <template v-else-if="detailData">
                    <div class="detail-grid">
                      <div class="detail-main">
                        <div class="detail-section-title">项目介绍</div>
                        <p class="detail-desc">{{ detailData.projectDesc || '暂无详细介绍' }}</p>

                        <div v-if="detailData.contributors?.length" class="contributors">
                          <div class="detail-section-title">贡献者</div>
                          <div class="contributor-list">
                            <a
                              v-for="contributor in detailData.contributors"
                              :key="contributor.id || contributor.githubAccount"
                              :href="contributor.profileUrl || buildGithubProfileUrl(contributor.githubAccount)"
                              target="_blank"
                              rel="noopener noreferrer"
                              class="contributor"
                            >
                              <n-avatar :size="22" :src="contributor.avatarUrl" />
                              <span>{{ contributor.wechatName || contributor.githubAccount }}</span>
                              <small class="github-account">@{{ contributor.githubAccount }}</small>
                              <small>{{ contributor.contributions || 0 }} 次贡献</small>
                              <small>{{ contributor.contributorType === 'primary' ? '主要' : '协同' }}</small>
                            </a>
                          </div>
                        </div>
                      </div>

                      <div class="detail-side">
                        <div class="detail-meta">
                          <div class="dm-row">
                            <span class="dm-label">作者</span>
                            <span class="dm-value">{{ detailData.authorName || '-' }}</span>
                          </div>
                          <div class="dm-row">
                            <span class="dm-label">数据源</span>
                            <span class="dm-value">{{ sourceName(detailData.sourceId) }}</span>
                          </div>
                          <div class="dm-row">
                            <span class="dm-label">状态</span>
                            <n-tag :type="detailData.isArchived === 1 ? 'warning' : 'success'" size="small">
                              {{ detailData.isArchived === 1 ? '已归档' : '活跃维护' }}
                            </n-tag>
                          </div>
                          <div class="dm-row">
                            <span class="dm-label">Star</span>
                            <span class="dm-value star">{{ detailData.starCount ?? '-' }}</span>
                          </div>
                          <div class="dm-row">
                            <span class="dm-label">Fork</span>
                            <span class="dm-value">{{ detailData.forkCount ?? '-' }}</span>
                          </div>
                          <div class="dm-row" v-if="detailData.language">
                            <span class="dm-label">语言</span>
                            <span class="dm-value">{{ detailData.language }}</span>
                          </div>
                          <div class="dm-row" v-if="detailData.lastSyncTime">
                            <span class="dm-label">同步</span>
                            <span class="dm-value muted">{{ formatDate(detailData.lastSyncTime) }}</span>
                          </div>
                        </div>

                        <div class="detail-actions">
                          <n-button type="primary" size="small" @click.stop="goGithub(detailData)">
                            访问 GitHub
                          </n-button>
                          <n-button v-if="canManageOpenProject" size="small" secondary @click.stop="openEditModal(detailData)">
                            编辑
                          </n-button>
                          <n-dropdown
                            v-if="detailData.resources?.length"
                            trigger="click"
                            :options="resourceDropdownOptions(detailData.resources)"
                            @select="key => handleResourceSelect(key, detailData)"
                          >
                            <n-button size="small" secondary @click.stop>
                              绑定资源
                            </n-button>
                          </n-dropdown>
                        </div>
                      </div>
                    </div>
                  </template>
                </div>
              </Transition>
            </div>
          </div>
        </div>

        <div class="pagination-wrapper" v-if="total > 0">
          <n-pagination
            :page-count="Math.ceil(total / pageSize)"
            :page="currentPage"
            @update:page="handlePageChange"
          />
        </div>
      </div>

      <div class="rank-area">
        <OpenProjectRankBoard @select="handleRankSelect" />
      </div>
    </div>

    <n-modal v-model:show="sourceModalVisible" preset="card" title="GitHub 数据源配置" class="source-modal">
      <div class="source-toolbar">
        <n-button v-if="canManageOpenProject" type="primary" :loading="sourceSyncingAll" @click="syncAllSources">同步全部</n-button>
        <n-button @click="loadSources">刷新</n-button>
      </div>

      <div class="source-list">
        <div v-for="source in sourceList" :key="source.id" class="source-item">
          <div>
            <strong>{{ source.sourceName || source.githubOwner }}</strong>
            <div class="source-meta">
              {{ source.sourceType === 'org' ? '组织' : '用户' }} ·
              <a
                :href="source.githubUrl || buildGithubProfileUrl(source.githubOwner)"
                target="_blank"
                rel="noopener noreferrer"
                class="source-link"
                @click.stop
              >
                {{ source.githubOwner }}
              </a>
              · 仓库 {{ source.repoCount || 0 }}
              · {{ source.enabled === 1 ? '启用' : '禁用' }}
            </div>
            <div class="source-message" v-if="source.lastSyncMessage">{{ source.lastSyncMessage }}</div>
          </div>
          <div v-if="canManageOpenProject" class="source-actions">
            <n-button size="small" @click="editSource(source)">编辑</n-button>
            <n-button size="small" :loading="syncingSourceId === source.id" @click="syncSource(source.id)">同步</n-button>
            <n-button size="small" type="error" secondary @click="deleteSource(source.id)">删除</n-button>
          </div>
        </div>
      </div>

      <n-alert v-if="!canManageOpenProject" type="info" :bordered="false">
        当前页面展示已配置的数据源。Lv.4 及以上用户可以编辑、同步和删除数据源。
      </n-alert>

      <template v-else>
        <n-form :model="sourceForm" label-placement="left" label-width="92px" class="modal-form">
          <n-form-item label="名称">
            <n-input v-model:value="sourceForm.sourceName" placeholder="例如 juege-osh" />
          </n-form-item>
          <n-form-item label="账号/组织">
            <n-input v-model:value="sourceForm.githubOwner" placeholder="GitHub owner 或 https://github.com/owner" />
          </n-form-item>
          <n-form-item label="类型">
            <n-select v-model:value="sourceForm.sourceType" :options="sourceTypeOptions" />
          </n-form-item>
          <n-form-item label="Token">
            <n-input v-model:value="sourceForm.accessToken" type="password" show-password-on="click" placeholder="可选，留空则不修改已有 token" />
          </n-form-item>
          <n-form-item label="启用">
            <n-switch v-model:value="sourceForm.enabledBool" />
          </n-form-item>
          <n-form-item label="备注">
            <n-input v-model:value="sourceForm.remark" type="textarea" :rows="2" />
          </n-form-item>
        </n-form>

        <div class="modal-actions">
          <n-button @click="resetSourceForm">清空</n-button>
          <n-button type="primary" :loading="savingSource" @click="saveSource">保存数据源</n-button>
        </div>
      </template>
    </n-modal>

    <n-modal v-model:show="editModalVisible" preset="card" title="编辑开源项目" class="edit-modal">
      <n-form :model="editForm" label-placement="left" label-width="104px">
        <n-form-item label="项目名称">
          <n-input v-model:value="editForm.projectName" />
        </n-form-item>
        <n-form-item label="作者">
          <n-input v-model:value="editForm.authorName" />
        </n-form-item>
        <n-form-item label="封面">
          <n-input v-model:value="editForm.projectCover" />
        </n-form-item>
        <n-form-item label="描述">
          <n-input v-model:value="editForm.projectDesc" type="textarea" :rows="4" />
        </n-form-item>
        <n-form-item label="标签">
          <n-select
            v-model:value="editForm.tagValues"
            multiple
            filterable
            tag
            :options="tagOptions"
            placeholder="选择已有标签，或输入新标签后回车"
          />
        </n-form-item>
        <n-form-item label="贡献人">
          <div class="contributor-editor">
            <div v-for="(item, idx) in editForm.contributors" :key="idx" class="contributor-row">
              <n-select v-model:value="item.contributorType" :options="contributorTypeOptions" class="contributor-type" />
              <n-input
                v-model:value="item.githubAccount"
                placeholder="GitHub 账号"
                @blur="fillContributorByGithub(item)"
              />
              <n-input v-model:value="item.wechatName" placeholder="微信名/昵称（留空时保存后自动匹配）" />
              <n-input v-model:value="item.profileUrl" placeholder="GitHub 账号链接" disabled />
              <n-input-number v-model:value="item.contributions" placeholder="贡献次数" class="contribution-count" disabled />
              <n-button text type="error" @click="removeContributor(idx)">删除</n-button>
            </div>
            <n-button dashed size="small" @click="addContributor">添加贡献人</n-button>
          </div>
        </n-form-item>
        <n-form-item label="绑定资源">
          <div class="resource-editor">
            <div v-for="(res, idx) in editForm.resources" :key="idx" class="resource-row">
              <n-select v-model:value="res.resourceType" :options="resourceTypeOptions" @update:value="() => resetResourceSelection(res)" />
              <n-select
                v-model:value="res.resourceId"
                filterable
                remote
                clearable
                :loading="res.loading"
                :options="res.options"
                placeholder="搜索并选择资源"
                @focus="() => searchResource(idx, '')"
                @search="keyword => searchResource(idx, keyword)"
                @update:value="value => selectResource(idx, value)"
              />
              <span class="resource-preview">{{ res.resourceName || '选择后自动绑定名称和路径' }}</span>
              <n-button text type="error" @click="removeEditResource(idx)">删除</n-button>
            </div>
            <n-button dashed size="small" @click="addEditResource">添加资源</n-button>
          </div>
        </n-form-item>
      </n-form>

      <template #footer>
        <n-space justify="end">
          <n-button @click="editModalVisible = false">取消</n-button>
          <n-button type="primary" :loading="savingEdit" @click="saveProjectEdit">保存</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import {
  NAlert, NBreadcrumb, NBreadcrumbItem, NAvatar, NButton, NEmpty, NPagination, NSpin, NTag,
  NModal, NForm, NFormItem, NInput, NInputNumber, NSelect, NSpace, NSwitch, NDropdown, createDiscreteApi
} from 'naive-ui'
import { computed, reactive, ref, onMounted } from 'vue'
import { getUserMemberLevel } from '~/composables/useAuth'

const { message, dialog } = createDiscreteApi(['message', 'dialog'])
const defaultCover = 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'

const projectList = ref([])
const tagOptions = ref([])
const sourceList = ref([])
const loading = ref(false)
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const searchParams = ref({})
const expandedId = ref(null)
const detailData = ref(null)
const detailLoading = ref(false)

const userLevel = computed(() => getUserMemberLevel())
const canManageOpenProject = computed(() => userLevel.value >= 4)
const sourceOptions = computed(() => sourceList.value.map(item => ({
  label: `${item.sourceName || item.githubOwner}（${item.githubOwner}）`,
  value: Number(item.id),
})))

const sourceModalVisible = ref(false)
const savingSource = ref(false)
const sourceSyncingAll = ref(false)
const syncingSourceId = ref(null)
const sourceForm = reactive(emptySourceForm())

const editModalVisible = ref(false)
const savingEdit = ref(false)
const editForm = reactive(emptyEditForm())

const sourceTypeOptions = [
  { label: 'GitHub 用户', value: 'user' },
  { label: 'GitHub 组织', value: 'org' },
]

const resourceTypeOptions = [
  { label: '课程', value: 'course' },
  { label: '电子书', value: 'book' },
  { label: '工具', value: 'tool' },
]

const contributorTypeOptions = [
  { label: '主要贡献人', value: 'primary' },
  { label: '协同开发人', value: 'contributor' },
]

async function toggleExpand(item) {
  if (expandedId.value === item.id) {
    expandedId.value = null
    detailData.value = null
    return
  }
  expandedId.value = item.id
  detailData.value = null
  detailLoading.value = true
  try {
    const res = await apiGetOpenProjectDetail(item.id)
    detailData.value = res?.data || res || item
  } catch {
    detailData.value = item
  } finally {
    detailLoading.value = false
  }
}

async function goGithub(item) {
  if (!item?.projectUrl) return
  await apiClickOpenProject(item.id).catch(() => {})
  window.open(item.projectUrl, '_blank')
}

async function toggleFavorite(item) {
  try {
    if (item.favorited) {
      await apiCancelFavoriteOpenProject(item.id)
      item.favorited = false
    } else {
      await apiFavoriteOpenProject(item.id)
      item.favorited = true
    }
  } catch (e) {
    message.error(e?.data?.msg || '收藏操作失败')
  }
}

async function loadTags() {
  try {
    const res = await apiGetOpenProjectTags()
    const tags = res?.data || res || []
    tagOptions.value = tags.map(t => ({ label: t.tagName, value: Number(t.id) }))
  } catch {}
}

async function loadSources() {
  const res = await apiGetOpenProjectSources()
  sourceList.value = res?.data || res || []
}

async function loadList() {
  loading.value = true
  expandedId.value = null
  detailData.value = null
  try {
    const res = await apiGetOpenProjectList({
      ...searchParams.value,
      pageNum: currentPage.value,
      pageSize: pageSize.value,
    })
    const data = res?.data || res || {}
    projectList.value = data.rows || []
    total.value = data.total || 0
  } catch {
    projectList.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function handleSearch(params) {
  searchParams.value = params
  currentPage.value = 1
  loadList()
}

function handleRankSelect(rankItem) {
  const found = projectList.value.find(p => p.id === rankItem.id)
  if (found) toggleExpand(found)
}

function handlePageChange(page) {
  currentPage.value = page
  loadList()
}

function openSourceModal() {
  sourceModalVisible.value = true
  loadSources()
}

function editSource(source) {
  Object.assign(sourceForm, {
    id: source.id,
    sourceName: source.sourceName || '',
    githubOwner: source.githubOwner || '',
    sourceType: source.sourceType || 'user',
    accessToken: '',
    enabledBool: source.enabled !== 0,
    remark: source.remark || '',
  })
}

function resetSourceForm() {
  Object.assign(sourceForm, emptySourceForm())
}

async function saveSource() {
  if (!sourceForm.githubOwner?.trim()) {
    message.warning('请填写 GitHub 账号或组织')
    return
  }
  savingSource.value = true
  try {
    await apiSaveOpenProjectSource({
      id: sourceForm.id,
      sourceName: sourceForm.sourceName,
      githubOwner: sourceForm.githubOwner,
      sourceType: sourceForm.sourceType,
      accessToken: sourceForm.accessToken || undefined,
      enabled: sourceForm.enabledBool ? 1 : 0,
      remark: sourceForm.remark,
    })
    message.success('数据源已保存')
    resetSourceForm()
    await loadSources()
  } catch (e) {
    message.error(e?.data?.msg || '保存失败')
  } finally {
    savingSource.value = false
  }
}

function deleteSource(id) {
  dialog.warning({
    title: '删除数据源',
    content: '确认删除这个 GitHub 数据源吗？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      await apiDeleteOpenProjectSource(id)
      message.success('已删除')
      await loadSources()
    },
  })
}

async function syncSource(id) {
  syncingSourceId.value = id
  try {
    await apiSyncOpenProjectSource(id)
    message.success('同步完成')
    await loadSources()
    await loadList()
  } catch (e) {
    message.error(e?.data?.msg || '同步失败')
  } finally {
    syncingSourceId.value = null
  }
}

async function syncAllSources() {
  sourceSyncingAll.value = true
  try {
    await apiSyncAllOpenProjectSources()
    message.success('同步全部完成')
    await loadSources()
    await loadList()
  } catch (e) {
    message.error(e?.data?.msg || '同步失败')
  } finally {
    sourceSyncingAll.value = false
  }
}

async function openEditModal(project) {
  const source = await apiGetOpenProjectDetail(project.id).catch(() => null)
  const detail = source?.data || source || project
  const tags = detail.tagIds || []
  Object.assign(editForm, {
    id: detail.id,
    projectName: detail.projectName || '',
    projectDesc: detail.projectDesc || '',
    authorName: detail.authorName || '',
    projectCover: detail.projectCover || '',
    tagValues: tags.map(Number),
    resources: (detail.resources || []).map(toEditableResource),
    contributors: (detail.contributors || []).map(toEditableContributor),
  })
  if (!editForm.contributors.length) addContributor()
  editModalVisible.value = true
}

function toEditableContributor(item) {
  return {
    githubAccount: item.githubAccount || '',
    wechatName: item.wechatName || '',
    contributorType: item.contributorType === 'primary' ? 'primary' : 'contributor',
    contributions: Number(item.contributions || 0),
    avatarUrl: item.avatarUrl || '',
    profileUrl: item.profileUrl || buildGithubProfileUrl(item.githubAccount),
    sortOrder: Number(item.sortOrder || 0),
  }
}

function addContributor() {
  editForm.contributors.push({
    githubAccount: '',
    wechatName: '',
    contributorType: editForm.contributors.length === 0 ? 'primary' : 'contributor',
    contributions: 0,
    avatarUrl: '',
    profileUrl: '',
    sortOrder: editForm.contributors.length,
  })
}

function removeContributor(index) {
  editForm.contributors.splice(index, 1)
}

function fillContributorByGithub(item) {
  if (!item?.githubAccount?.trim()) return
  if (!item.profileUrl?.trim()) {
    item.profileUrl = buildGithubProfileUrl(item.githubAccount)
  }
}

function buildGithubProfileUrl(githubAccount) {
  const account = githubAccount?.trim()
  return account ? `https://github.com/${account}` : ''
}

function toEditableResource(item) {
  return {
    resourceType: item.resourceType || 'course',
    resourceId: item.resourceId || null,
    resourceName: item.resourceName || '',
    resourceUrl: item.resourceUrl || '',
    options: item.resourceId ? [{
      label: item.resourceName || `#${item.resourceId}`,
      value: Number(item.resourceId),
      raw: {
        id: item.resourceId,
        resourceType: item.resourceType,
        resourceName: item.resourceName,
        resourceUrl: item.resourceUrl,
      },
    }] : [],
    loading: false,
  }
}

function addEditResource() {
  editForm.resources.push(toEditableResource({ resourceType: 'course' }))
}

function removeEditResource(index) {
  editForm.resources.splice(index, 1)
}

function resetResourceSelection(res) {
  res.resourceId = null
  res.resourceName = ''
  res.resourceUrl = ''
  res.options = []
}

async function searchResource(index, keyword) {
  const row = editForm.resources[index]
  if (!row) return
  row.loading = true
  try {
    const list = await fetchResourceOptions(row.resourceType, keyword)
    row.options = list.map(item => ({
      label: item.resourceName || item.title || item.name || item.toolName || `#${item.id}`,
      value: Number(item.id),
      raw: item,
    }))
  } finally {
    row.loading = false
  }
}

function selectResource(index, value) {
  const row = editForm.resources[index]
  const option = row?.options?.find(item => item.value === value)
  if (!row || !option) return
  row.resourceId = option.value
  row.resourceName = option.raw?.resourceName || option.label
  row.resourceUrl = option.raw?.resourceUrl || buildResourceUrl(row.resourceType, option.value)
}

async function fetchResourceOptions(type, keyword = '') {
  const res = await apiSearchOpenProjectResources({
    resourceType: type,
    keyword,
    limit: 20,
  })
  return res?.data || res || []
}

function buildResourceUrl(type, id) {
  if (type === 'course') return `/course_detail/${id}`
  if (type === 'book') return `/detail/book/${id}`
  if (type === 'tool') return `/tool/detail/${id}`
  return ''
}

function resourceDropdownOptions(resources = []) {
  return resources.map((item, index) => ({
    key: index,
    label: `${resourceLabel(item.resourceType)}：${item.resourceName || `#${item.resourceId}`}`,
  }))
}

function handleResourceSelect(index, project) {
  const resource = project?.resources?.[index]
  if (!resource) return
  const targetUrl = resolveResourceJumpUrl(resource)
  if (targetUrl) {
    goResourceUrl(targetUrl)
  }
}

function resolveResourceJumpUrl(resource) {
  if (resource.resourceType === 'tool') {
    return `/tool?toolId=${resource.resourceId}&autoOpen=1`
  }
  if (resource.resourceType === 'course') {
    return resource.resourceUrl || `/course_detail/${resource.resourceId}`
  }
  if (resource.resourceType === 'book') {
    return resource.resourceUrl || `/detail/book/${resource.resourceId}`
  }
  return resource.resourceUrl || ''
}

function goResourceUrl(url) {
  if (!url) return
  if (process.client) {
    window.location.href = url
    return
  }
  navigateTo(url)
}

async function saveProjectEdit() {
  savingEdit.value = true
  try {
    const tagIds = editForm.tagValues.filter(v => typeof v === 'number')
    const customTags = editForm.tagValues.filter(v => typeof v === 'string' && v.trim())
    await apiEditOpenProject({
      id: editForm.id,
      projectName: editForm.projectName,
      projectDesc: editForm.projectDesc,
      authorName: editForm.authorName,
      projectCover: editForm.projectCover,
      tagIds,
      customTags,
      resources: editForm.resources
        .filter(r => r.resourceId)
        .map(({ resourceType, resourceId, resourceName, resourceUrl }) => ({ resourceType, resourceId, resourceName, resourceUrl })),
      contributors: editForm.contributors
        .filter(item => item.githubAccount?.trim())
        .map((item, idx) => ({
          ...item,
          profileUrl: item.profileUrl?.trim() || buildGithubProfileUrl(item.githubAccount),
          sortOrder: idx,
        })),
    })
    message.success('开源项目已保存')
    editModalVisible.value = false
    await loadTags()
    await loadList()
  } catch (e) {
    message.error(e?.data?.msg || '保存失败')
  } finally {
    savingEdit.value = false
  }
}

function emptySourceForm() {
  return {
    id: null,
    sourceName: '',
    githubOwner: '',
    sourceType: 'user',
    accessToken: '',
    enabledBool: true,
    remark: '',
  }
}

function emptyEditForm() {
  return {
    id: null,
    projectName: '',
    projectDesc: '',
    authorName: '',
    projectCover: '',
    tagValues: [],
    resources: [],
    contributors: [],
  }
}

function sourceName(sourceId) {
  const source = sourceList.value.find(item => Number(item.id) === Number(sourceId))
  return source ? (source.sourceName || source.githubOwner) : '-'
}

function resourceLabel(type) {
  const map = { course: '查看课程', book: '查看电子书', tool: '查看工具' }
  return map[type] || '查看资源'
}

function formatDate(raw) {
  if (!raw) return ''
  try {
    const d = Array.isArray(raw)
      ? new Date(raw[0], raw[1] - 1, raw[2], raw[3] || 0, raw[4] || 0)
      : new Date(raw)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  } catch {
    return ''
  }
}

onMounted(async () => {
  await Promise.all([loadTags(), loadSources()])
  loadList()
})
</script>

<style scoped>
.open-project-page { max-width: 1400px; margin: 0 auto; padding: 20px; }
.page-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
.page-layout { display: grid; grid-template-columns: 1fr 300px; gap: 24px; align-items: start; }
.list-area { min-width: 0; }
.rank-area { position: sticky; top: 80px; }
.content-area { min-height: 400px; }
.empty-box { display: flex; justify-content: center; align-items: center; height: 300px; }
.project-grid { display: flex; flex-direction: column; gap: 16px; margin-top: 24px; }
.project-card { border-radius: 8px; box-shadow: 0 2px 8px rgba(15,23,42,0.05); background: #fff; border: 1px solid #e2e8f0; cursor: pointer; overflow: hidden; transition: all 0.2s ease; }
.project-card:hover { box-shadow: 0 8px 24px rgba(15,23,42,0.08); border-color: #94a3b8; transform: translateY(-1px); }
.project-card.expanded { border-color: #3b82f6; transform: none; }
.project-card.archived { opacity: 0.72; }
.card-inner { display: grid; grid-template-columns: 1fr auto; grid-template-rows: auto auto; padding: 18px 24px; }
.card-header { grid-column: 1; display: flex; flex-direction: column; gap: 8px; }
.title-row { display: flex; align-items: center; gap: 10px; }
.expand-icon { color: #94a3b8; font-size: 26px; line-height: 1; transition: transform 0.2s ease; }
.expand-icon.open { transform: rotate(90deg); color: #3b82f6; }
.project-title { font-size: 16px; font-weight: 600; color: #1e293b; }
.project-tags { display: flex; gap: 6px; flex-wrap: wrap; padding-left: 28px; }
.card-body { grid-column: 1; grid-row: 2; padding: 8px 0 0 28px; }
.project-desc { font-size: 13px; color: #64748b; line-height: 1.6; margin: 0; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
.card-footer { grid-column: 2; grid-row: 1 / 3; display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; padding-left: 28px; min-width: 150px; }
.author-info { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.author-name { color: #64748b; }
.footer-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
.github-stats { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; font-size: 12px; color: #64748b; }
.stat-item { display: flex; align-items: center; justify-content: flex-end; }
.last-commit { color: #9ca3af; font-size: 11px; }
.card-detail { border-top: 1px solid #edf2f7; background: #f8fafc; padding: 20px 24px; }
.detail-loading { display: flex; align-items: center; gap: 8px; color: #64748b; font-size: 13px; }
.detail-grid { display: grid; grid-template-columns: 1fr 250px; gap: 28px; }
.detail-section-title { font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 10px; }
.detail-desc { font-size: 14px; color: #334155; line-height: 1.8; white-space: pre-wrap; margin: 0; }
.contributors { margin-top: 22px; }
.contributor-list { display: flex; gap: 8px; flex-wrap: wrap; }
.contributor { display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 999px; background: #eef2ff; color: #334155; text-decoration: none; font-size: 12px; }
.contributor:hover { color: #1d4ed8; background: #dbeafe; }
.github-account { color: #64748b; }
.contributor small { color: #64748b; }
.detail-meta { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
.dm-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; font-size: 13px; }
.dm-label { color: #94a3b8; }
.dm-value { color: #1e293b; font-weight: 500; text-align: right; }
.dm-value.star { color: #f59e0b; }
.dm-value.muted { color: #9ca3af; }
.detail-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-top: 12px; }
.pagination-wrapper { display: flex; justify-content: center; margin-top: 32px; }
.source-modal, .edit-modal { width: min(1040px, 94vw); }
.source-toolbar { display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 14px; }
.source-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; max-height: 260px; overflow: auto; }
.source-item { display: flex; justify-content: space-between; gap: 16px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; }
.source-meta, .source-message { margin-top: 4px; font-size: 12px; color: #64748b; }
.source-link { color: #2563eb; text-decoration: none; }
.source-link:hover { text-decoration: underline; }
.source-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.modal-form { border-top: 1px solid #e2e8f0; padding-top: 18px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px; }
.resource-editor, .contributor-editor { width: 100%; display: flex; flex-direction: column; gap: 8px; }
.resource-row { display: grid; grid-template-columns: 120px 1.2fr 1fr auto; gap: 8px; align-items: center; }
.resource-preview { min-width: 0; color: #64748b; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.contributor-row { display: grid; grid-template-columns: 130px 1fr 1fr 1fr 110px auto; gap: 8px; align-items: center; }
.expand-enter-active, .expand-leave-active { transition: max-height 0.25s ease, opacity 0.2s ease; max-height: 640px; overflow: hidden; }
.expand-enter-from, .expand-leave-to { max-height: 0; opacity: 0; }
@media (max-width: 1024px) {
  .page-layout { grid-template-columns: 1fr; }
  .rank-area { order: -1; position: static; }
}
@media (max-width: 760px) {
  .card-inner, .detail-grid { grid-template-columns: 1fr; }
  .card-footer { grid-column: 1; grid-row: auto; align-items: flex-start; padding: 14px 0 0 28px; }
  .footer-right { align-items: flex-start; }
  .github-stats { align-items: flex-start; }
  .resource-row, .contributor-row { grid-template-columns: 1fr; }
  .source-item { flex-direction: column; }
}
</style>
