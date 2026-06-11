<template>
  <div class="audit-page">
    <section class="audit-toolbar">
      <div>
        <h1 class="page-title">资源审核</h1>
        <p class="page-subtitle">{{ currentResourceLabel }}待审核 {{ pendingTotal }} 条</p>
      </div>
      <div class="filters">
        <n-input
          v-model:value="query.keyword"
          clearable
          placeholder="搜索资源名称、简介或链接"
          class="keyword-input"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        />
        <n-select
          v-model:value="query.resourceType"
          :options="resourceOptions"
          class="resource-select"
          @update:value="handleResourceChange"
        />
        <n-button type="primary" :loading="loading" @click="handleSearch">查询</n-button>
      </div>
    </section>

    <section class="audit-table-panel">
      <n-data-table
        remote
        :loading="loading"
        :columns="columns"
        :data="rows"
        :pagination="pagination"
        :row-key="row => row.id"
        :scroll-x="tableScrollX"
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
      />
    </section>
  </div>
</template>

<script setup>
import { NButton, NDataTable, NSelect, NTag, NImage, NEllipsis, NInput, createDiscreteApi } from 'naive-ui';
import { computed, h, onMounted, reactive, ref, watch } from 'vue';
import { RESOURCE_STATUS, isPublishedStatus } from '~/composables/enums/resourceStatus';

definePageMeta({
  name: 'audit',
});

useHead({ title: '审核 - 开源助手' });

const { message, dialog } = createDiscreteApi(['message', 'dialog']);
const route = useRoute();
const user = useUser();

const MIN_AUDIT_ROLE_LEVEL = 5;
const canAccessAuditPage = computed(() => {
  let roleLevel = 0;
  const fromUser = Number(user.value?.role?.level ?? 0);
  if (Number.isFinite(fromUser) && fromUser > 0) {
    roleLevel = fromUser;
  }
  if (process.client) {
    try {
      const roleStr = localStorage.getItem('__user_role__');
      if (roleStr) {
        const role = JSON.parse(roleStr);
        const fromLocal = Number(role?.level ?? 0);
        if (Number.isFinite(fromLocal) && fromLocal > 0) {
          roleLevel = Math.max(roleLevel, fromLocal);
        }
      }
    } catch {}
  }
  return roleLevel >= MIN_AUDIT_ROLE_LEVEL;
});

const resourceOptions = [
  { label: '课程', value: 'course' },
  { label: '答疑问题', value: 'qa_question' },
  { label: '答疑回答', value: 'qa_answer' },
  { label: '电子书', value: 'book' },
  { label: '工具', value: 'tool' },
  { label: '实用网站', value: 'website' },
  { label: '开源项目', value: 'open_project' },
  { label: '信息差', value: 'info_gap' },
];

const query = reactive({
  resourceType: 'course',
  keyword: '',
  pageNum: 1,
  pageSize: 10,
});
const rows = ref([]);
const loading = ref(false);
const pendingTotal = ref(0);

const pagination = reactive({
  page: 1,
  pageSize: 10,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [
    { label: '10条/页', value: 10 },
    { label: '20条/页', value: 20 },
    { label: '50条/页', value: 50 },
  ],
  prefix({ itemCount }) {
    return `共 ${itemCount} 条`;
  },
});

const resourceTableConfigs = {
  default: {
    scrollX: 1060,
    columns: [
      {
        title: '资源',
        key: 'title',
        minWidth: 260,
        render(row) {
          return h('div', { class: 'resource-cell' }, [
            row.cover
              ? h(NImage, {
                  src: row.cover,
                  width: 44,
                  height: 44,
                  objectFit: 'cover',
                  previewDisabled: true,
                  class: 'resource-cover',
                })
              : h('div', { class: 'resource-cover placeholder' }, getResourceLabel(query.resourceType).slice(0, 1)),
            h('div', { class: 'resource-main' }, [
              h('div', { class: 'resource-title' }, row.title || `#${row.id}`),
              h(NEllipsis, { lineClamp: 2, class: 'resource-desc' }, {
                default: () => row.description || row.url || '-',
              }),
            ]),
          ]);
        },
      },
      createTypeColumn(),
      createStatusColumn(),
      createTextColumn('创建人', 'createBy', 120),
      createTextColumn('创建时间', 'createTime', 180, formatDateTime),
      createActionColumn(),
    ],
  },
  open_project: {
    scrollX: 960,
    columns: [
      createTextColumn('项目名称', 'title', 220),
      createTextColumn('作者', 'author', 140),
      createLinkColumn('项目连接', 'url', 320),
      createTextColumn('提交时间', 'submitTime', 180, formatDateTime),
      createActionColumn(),
    ],
  },
};

const currentTableConfig = computed(() => resourceTableConfigs[query.resourceType] || resourceTableConfigs.default);
const currentResourceLabel = computed(() => getResourceLabel(query.resourceType));
const columns = computed(() => currentTableConfig.value.columns);
const tableScrollX = computed(() => currentTableConfig.value.scrollX || 1060);

onMounted(() => {
  if (!guardAuditAccess()) {
    return;
  }
  fetchList();
});

watch(canAccessAuditPage, (allowed) => {
  if (!allowed) {
    guardAuditAccess();
  }
});

async function fetchList() {
  loading.value = true;
  try {
    const res = await apiGetPendingAuditResources({
      resourceType: query.resourceType,
      keyword: query.keyword ? query.keyword.trim() : undefined,
      pageNum: query.pageNum,
      pageSize: query.pageSize,
    });
    const data = res?.data || {};
    rows.value = data.rows || [];
    pagination.page = data.pageNum || query.pageNum;
    pagination.pageSize = data.pageSize || query.pageSize;
    pagination.itemCount = data.total || 0;
    pendingTotal.value = data.pendingTotal ?? data.total ?? 0;
  } catch (error) {
    message.error(resolveErrorMessage(error, '加载待审核资源失败'));
  } finally {
    loading.value = false;
  }
}

function guardAuditAccess() {
  if (canAccessAuditPage.value) {
    return true;
  }
  message.error('没有审核模块访问权限');
  navigateTo('/');
  return false;
}

function handleResourceChange() {
  query.pageNum = 1;
  pagination.page = 1;
  fetchList();
}

function handleSearch() {
  query.pageNum = 1;
  pagination.page = 1;
  fetchList();
}

function handlePageChange(page) {
  query.pageNum = page;
  pagination.page = page;
  fetchList();
}

function handlePageSizeChange(pageSize) {
  query.pageNum = 1;
  query.pageSize = pageSize;
  pagination.page = 1;
  pagination.pageSize = pageSize;
  fetchList();
}

function createTextColumn(title, key, width, formatter) {
  return {
    title,
    key,
    width,
    ellipsis: {
      tooltip: true,
    },
    render(row) {
      const value = row[key];
      if (value === null || value === undefined || value === '') {
        return '-';
      }
      return formatter ? formatter(value) : value;
    },
  };
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }
  const normalized = String(value).replace('T', ' ');
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}:${match[6]}`;
  }
  return normalized;
}

function createLinkColumn(title, key, width) {
  return {
    title,
    key,
    width,
    ellipsis: {
      tooltip: true,
    },
    render(row) {
      const url = row[key];
      if (!url) {
        return '-';
      }
      return h('a', {
        href: url,
        target: '_blank',
        rel: 'noopener noreferrer',
        class: 'resource-link',
      }, url);
    },
  };
}

function createTypeColumn() {
  return {
    title: '类型',
    key: 'resourceType',
    width: 110,
    render() {
      return h(NTag, { type: 'info', bordered: false }, { default: () => getResourceLabel(query.resourceType) });
    },
  };
}

function createStatusColumn() {
  return {
    title: '状态',
    key: 'status',
    width: 100,
    render(row) {
      return h(NTag, { type: 'warning', bordered: false }, { default: () => `待审核` });
    },
  };
}

function createActionColumn() {
  return {
    title: '操作',
    key: 'actions',
    width: 150,
    fixed: 'right',
    render(row) {
      return h('div', { class: 'action-cell' }, [
        h(NButton, {
          type: 'primary',
          size: 'small',
          onClick: () => confirmAudit(row, RESOURCE_STATUS.PUBLISHED),
        }, { default: () => '通过' }),
        h(NButton, {
          type: 'error',
          size: 'small',
          secondary: true,
          onClick: () => confirmAudit(row, RESOURCE_STATUS.OFF_SHELF),
        }, { default: () => '拒绝' }),
      ]);
    },
  };
}

function confirmAudit(row, status) {
  const isApprove = isPublishedStatus(status);
  dialog.warning({
    title: '审核确认',
    content: `确认${isApprove ? '通过' : '拒绝'}「${row.title || row.id}」吗？`,
    positiveText: isApprove ? '通过' : '拒绝',
    negativeText: '取消',
    onPositiveClick: () => audit(row, status),
  });
}

async function audit(row, status) {
  try {
    const res = await apiAuditResource({
      resourceType: query.resourceType,
      resourceId: row.id,
      status,
    });
    assertSuccessResponse(res);
    message.success(isPublishedStatus(status) ? '审核通过' : '已拒绝');
    fetchList();
  } catch (error) {
    message.error(resolveErrorMessage(error, '审核失败'));
  }
}

function assertSuccessResponse(res) {
  if (res && Number(res.code) !== 200) {
    throw new Error(res.msg || res.data || '审核失败');
  }
}

function getResourceLabel(resourceType) {
  const match = resourceOptions.find(item => item.value === resourceType);
  return match ? match.label : resourceType;
}

function resolveErrorMessage(error, fallback) {
  return error?.data?.msg || error?.data?.data || error?.message || fallback;
}
</script>

<style scoped>
.audit-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.audit-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.page-title {
  margin: 0;
  font-size: 22px;
  line-height: 30px;
  font-weight: 700;
  color: #111827;
}

.page-subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: #6b7280;
}

.filters {
  display: flex;
  align-items: center;
  gap: 10px;
}

.resource-select {
  width: 180px;
}

.keyword-input {
  width: min(420px, 34vw);
}

.audit-table-panel {
  padding: 16px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

:deep(.resource-cell) {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

:deep(.resource-cover) {
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  overflow: hidden;
}

:deep(.resource-cover.placeholder) {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eef2ff;
  color: #4f46e5;
  font-weight: 700;
}

:deep(.resource-main) {
  min-width: 0;
}

:deep(.resource-title) {
  font-size: 14px;
  font-weight: 700;
  color: #111827;
}

:deep(.resource-desc) {
  margin-top: 4px;
  max-width: 520px;
  font-size: 12px;
  color: #6b7280;
}

:deep(.resource-link) {
  color: #2563eb;
  text-decoration: none;
}

:deep(.resource-link:hover) {
  text-decoration: underline;
}

:deep(.action-cell) {
  display: flex;
  align-items: center;
  gap: 8px;
}

@media (max-width: 768px) {
  .audit-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .filters {
    width: 100%;
  }

  .resource-select {
    flex: 1;
    width: auto;
  }
}
</style>
