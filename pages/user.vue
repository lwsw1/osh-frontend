<template>
    <n-grid :x-gap="20">
        <!-- 左侧：用户信息卡片 + 菜单 -->
        <n-grid-item :span="5">
            <!-- 用户信息卡片 -->
            <div class="user-profile-card">
                <!-- 头像 -->
                <div class="avatar-wrapper">
                    <n-avatar
                        round
                        :size="72"
                        :src="user?.avatar || defaultAvatar"
                        class="user-avatar"
                    />
                </div>
                <!-- 昵称 / 用户名 -->
                <div class="user-name">{{ user?.username || '未登录' }}</div>
                <!-- 资产 -->
                <div class="asset-row">
                    <div class="asset-item">
                        <span class="asset-value">{{ user?.asset?.points ?? '—' }}</span>
                        <span class="asset-label">积分</span>
                    </div>
                </div>
            </div>

            <!-- 导航菜单 -->
            <ul class="center-menu">
                <li
                    v-for="(group, gi) in menuGroups"
                    :key="gi"
                >
                    <div class="menu-group-title">{{ group.label }}</div>
                    <ul class="menu-group-items">
                        <li
                            v-for="(item, ii) in group.items"
                            :key="ii"
                            :class="{ 'active': item.name === activeName }"
                            @click="navigate(item)"
                        >
                            {{ item.title }}
                        </li>
                    </ul>
                </li>
            </ul>
        </n-grid-item>

        <!-- 右侧：内容区 -->
        <n-grid-item :span="19">
            <div class="user-content-container">
                <NuxtPage :page-key="pageKey" />
            </div>
        </n-grid-item>
    </n-grid>
</template>

<script setup>
import {
    NGrid,
    NGridItem,
    NAvatar
} from "naive-ui"

const route = useRoute()
const pageKey = computed(() => route.fullPath)
const activeName = computed(() => route.name)
const user = useUser()

const defaultAvatar = DEFAULT_AVATAR

// 访问 /user 根路径时默认跳转到基本信息页
onMounted(() => {
    if (route.name === 'user') {
        navigateTo({ name: 'user-profile' }, { replace: true })
    }
})

const menuGroups = [
    {
        label: '我的订单',
        items: [
            { title: '订单记录', name: 'user-buy-page' },
            { title: '会员中心', name: 'user-member' },
        ]
    },
    {
        label: '邀请好友',
        items: [
            { title: '我的邀请', name: 'user-invitation' },
        ]
    },
    {
        label: '账号设置',
        items: [
            { title: '基本信息', name: 'user-profile' },
        ]
    },
    {
        label: '账号与安全',
        items: [
            { title: '修改密码', name: 'user-password' },
            { title: '修改邮箱', name: 'user-email' },
            { title: '注销账号', name: 'user-delete' },
        ]
    },
]

const navigate = (item) => {
    navigateTo({
        name: item.name,
        params: { page: 1 }
    })
}

definePageMeta({
    middleware: ['auth']
})
</script>

<style>
/* ── 用户信息卡片 ── */
.user-profile-card {
    background-color: white;
    border-radius: 0.75rem;
    padding: 1.5rem 1rem 1rem;
    margin-bottom: 0.75rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
}

.avatar-wrapper {
    margin-bottom: 0.25rem;
}

.user-name {
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;
    text-align: center;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.asset-row {
    display: flex;
    align-items: center;
    gap: 0;
    margin-top: 0.75rem;
    width: 100%;
    background: #f9fafb;
    border-radius: 0.5rem;
    padding: 0.6rem 0;
}

.asset-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
}

.asset-value {
    font-size: 1.1rem;
    font-weight: 700;
    color: #f59e0b;
}

.asset-label {
    font-size: 0.7rem;
    color: #6b7280;
}

.asset-divider {
    width: 1px;
    height: 2rem;
    background: #e5e7eb;
}

/* ── 菜单 ── */
.center-menu {
    list-style: none;
    background-color: white;
    border-radius: 0.75rem;
    padding: 0.5rem 0;
    margin: 0;
}

.menu-group-title {
    font-size: 0.7rem;
    color: #9ca3af;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    padding: 0.6rem 1.25rem 0.25rem;
}

.menu-group-items {
    list-style: none;
    padding: 0;
    margin: 0;
}

.menu-group-items li {
    padding: 0.6rem 1.25rem;
    font-size: 0.875rem;
    cursor: pointer;
    color: #374151;
    border-radius: 0.25rem;
    margin: 0 0.25rem;
    transition: background-color 0.15s, color 0.15s;
}

.menu-group-items li:hover {
    background-color: #eff6ff;
    color: #3b82f6;
}

.menu-group-items li.active {
    font-weight: 600;
    color: #3b82f6;
    background-color: #dbeafe;
}

/* ── 内容区 ── */
.user-content-container {
    background-color: white;
    border-radius: 0.75rem;
    margin-bottom: 2.5rem;
    min-height: 75vh;
}
</style>