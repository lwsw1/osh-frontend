<template>
  <div class="navbar">
    <div class="container">
      <div class="brand-section">
        <button class="brand-btn" @click="handleOpen('/')">
          <img src="/osh-logo.png" alt="OSH" class="brand-logo" />
        </button>
      </div>

      <div class="nav-menu-scroll" ref="navMenuScrollRef">
        <nav class="nav-menu">
        <template v-for="(item, index) in menus" :key="index">
          <!-- 有子菜单的项 -->
          <n-dropdown v-if="item.children" :options="getDropdownOptions(item)" @select="handleDropdownSelect" placement="bottom-start">
            <a class="nav-item" :class="{ 'active': isChildMenuActive(item) }">
              <component :is="item.iconComponent" class="nav-icon" />
              <span class="nav-text">{{ item.name }}</span>
              <svg class="dropdown-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 5l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </a>
          </n-dropdown>
          
          <!-- 普通菜单项 -->
          <a
            v-else
            :href="item.path"
            @click.prevent="handleOpen(item.path)"
            @mouseenter="prefetchRoute(item.path)"
            class="nav-item"
            :class="{ 'active': isMenuItemActive(item) }"
          >
            <component :is="item.iconComponent" class="nav-icon" />
            <span class="nav-text">{{ item.name }}</span>
          </a>
        </template>
        </nav>
      </div>

      <div class="user-section">
        <nuxt-link class="login-link" to="/login" v-if="!user">
          <button class="btn-login">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="6" r="3" stroke="currentColor" stroke-width="1.5"/>
              <path d="M3 15c0-3 2.5-5 6-5s6 2 6 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <span>登录</span>
          </button>
        </nuxt-link>

        <template v-else>
          <!-- 消息通知铃铛 -->
          <NotificationBell />

          <n-dropdown :options="userOptions" @select="handleSelect" placement="bottom-end">
            <button class="user-btn">
              <n-avatar  
                round
                size="small"
                :src="user?.avatar || DEFAULT_AVATAR"
              />
              <span class="user-name">{{ user?.username || '用户' }}</span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" class="chevron">
                <path d="M4 6l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </n-dropdown>
        </template>
      </div>
    </div>
  </div>
  <div class="navbar-spacer"></div>
  <SearchBar ref="SearchBarRef" />
</template>

<script setup>
import {
  NDropdown,
  NAvatar,
  createDiscreteApi,
} from 'naive-ui';
import { h, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const user = useUser();
const route = useRoute();
const permissions = usePermissions();
const { hasAnyPermission } = usePermission();

// ── WebSocket：用户登录后自动连接，退出后断开 ──────────────────────────────
const { connect, disconnect } = useWebSocket();

onMounted(() => {
  if (user.value) connect();
});

onBeforeUnmount(() => {
  // 组件卸载时不主动断开（保持全局连接），退出登录时由 useLogout 断开
});

watch(user, (newVal, oldVal) => {
  if (newVal && !oldVal) {
    // 刚登录
    connect();
  } else if (!newVal && oldVal) {
    // 刚退出
    disconnect();
  }
});

// SVG Icon Components
const HomeIcon = () => h('svg', { width: 18, height: 18, viewBox: '0 0 18 18', fill: 'none' }, [
  h('path', { d: 'M2 7l7-5 7 5v8a1 1 0 01-1 1H3a1 1 0 01-1-1V7z', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
]);

const CourseIcon = () => h('svg', { width: 18, height: 18, viewBox: '0 0 18 18', fill: 'none' }, [
  h('rect', { x: '3', y: '4', width: '12', height: '11', rx: '1', stroke: 'currentColor', 'stroke-width': '1.5' }),
  h('path', { d: 'M6 7h6M6 10h4', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round' })
]);

const BookIcon = () => h('svg', { width: 18, height: 18, viewBox: '0 0 18 18', fill: 'none' }, [
  h('path', { d: 'M4 2h10a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z', stroke: 'currentColor', 'stroke-width': '1.5' }),
  h('path', { d: 'M9 2v14', stroke: 'currentColor', 'stroke-width': '1.5' })
]);

const ExamIcon = () => h('svg', { width: 18, height: 18, viewBox: '0 0 18 18', fill: 'none' }, [
  h('rect', { x: '4', y: '2', width: '10', height: '14', rx: '1', stroke: 'currentColor', 'stroke-width': '1.5' }),
  h('path', { d: 'M7 6h4M7 9h4M7 12h2', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round' })
]);

const QAIcon = () => h('svg', { width: 18, height: 18, viewBox: '0 0 18 18', fill: 'none' }, [
  h('circle', { cx: '9', cy: '9', r: '6', stroke: 'currentColor', 'stroke-width': '1.5' }),
  h('path', { d: 'M9 6v3M9 12h.01', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round' })
]);

const FlashIcon = () => h('svg', { width: 18, height: 18, viewBox: '0 0 18 18', fill: 'none' }, [
  h('path', { d: 'M10 2L4 10h5l-1 6 6-8h-5l1-6z', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
]);

const GroupIcon = () => h('svg', { width: 18, height: 18, viewBox: '0 0 18 18', fill: 'none' }, [
  h('circle', { cx: '6', cy: '6', r: '2', stroke: 'currentColor', 'stroke-width': '1.5' }),
  h('circle', { cx: '12', cy: '6', r: '2', stroke: 'currentColor', 'stroke-width': '1.5' }),
  h('path', { d: 'M2 14c0-2 1.5-3 4-3s4 1 4 3M8 14c0-2 1.5-3 4-3s4 1 4 3', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round' })
]);

const ProjectIcon = () => h('svg', { width: 18, height: 18, viewBox: '0 0 18 18', fill: 'none' }, [
  h('path', { d: 'M3 8l6-5 6 5', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
  h('path', { d: 'M9 3v12M5 11h8', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round' })
]);

const LinkIcon = () => h('svg', { width: 18, height: 18, viewBox: '0 0 18 18', fill: 'none' }, [
  h('path', { d: 'M7 11l4-4M11 7h-3v3', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
  h('rect', { x: '3', y: '3', width: '12', height: '12', rx: '2', stroke: 'currentColor', 'stroke-width': '1.5' })
]);

const ToolIcon = () => h('svg', { width: 18, height: 18, viewBox: '0 0 18 18', fill: 'none' }, [
  h('path', { d: 'M14 7l-7 7-4-4 7-7 4 4z', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
  h('path', { d: 'M11 4l3 3', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round' })
]);

const InfoIcon = () => h('svg', { width: 18, height: 18, viewBox: '0 0 18 18', fill: 'none' }, [
  h('circle', { cx: '9', cy: '9', r: '6', stroke: 'currentColor', 'stroke-width': '1.5' }),
  h('path', { d: 'M9 9v3M9 6h.01', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round' })
]);

const SiteIcon = () => h('svg', { width: 18, height: 18, viewBox: '0 0 18 18', fill: 'none' }, [
  h('circle', { cx: '9', cy: '9', r: '6', stroke: 'currentColor', 'stroke-width': '1.5' }),
  h('path', { d: 'M3 9h12M9 3c-2 2-2 8 0 12M9 3c2 2 2 8 0 12', stroke: 'currentColor', 'stroke-width': '1.5' })
]);

const FeedbackIcon = () => h('svg', { width: 18, height: 18, viewBox: '0 0 18 18', fill: 'none' }, [
  h('path', { d: 'M3 6a2 2 0 012-2h8a2 2 0 012 2v6a2 2 0 01-2 2H9l-3 2v-2H5a2 2 0 01-2-2V6z', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
  h('path', { d: 'M7 8h4M7 11h2', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round' })
]);

const AuditIcon = () => h('svg', { width: 18, height: 18, viewBox: '0 0 18 18', fill: 'none' }, [
  h('path', { d: 'M5 2h8a1 1 0 011 1v12a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1z', stroke: 'currentColor', 'stroke-width': '1.5' }),
  h('path', { d: 'M7 6h4M7 9h4M7 12l1 1 3-3', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
]);

const PlanIcon = () => h('svg', { width: 18, height: 18, viewBox: '0 0 18 18', fill: 'none' }, [
  h('rect', { x: '2', y: '3', width: '14', height: '12', rx: '2', stroke: 'currentColor', 'stroke-width': '1.5' }),
  h('path', { d: 'M6 7h6M6 10h4M9 3v2', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round' }),
]);

const AUDIT_MENU_PERMISSION = 'audit';

const menus = ref([
  { name: '首页', path: '/', iconComponent: HomeIcon },
  { name: '课程', path: '/course/1', match: [{ name: 'course-page' }], iconComponent: CourseIcon },
  { name: '电子书', path: '/list/book/1', match: [{ name: 'list-type-page', params: { type: 'book' } }], iconComponent: BookIcon },
  { name: '考试', path: '/paper/1', match: [{ name: 'paper-page' }], iconComponent: ExamIcon },
  { name: '答疑', path: '/question_answer/1', match: [{ name: 'question_answer-page' }], iconComponent: QAIcon },
  { name: '秒杀', path: '/seckill', match: [{ name: 'seckill' }], iconComponent: FlashIcon },
  { name: '拼团', path: '/group', match: [{ name: 'group-index' }], iconComponent: GroupIcon },
  { name: '开源项目', path: '/openproject/list', match: [{ name: 'openproject-list' }], iconComponent: ProjectIcon },
  { name: '实用网站', path: '/usefull/list', match: [{ name: 'usefull-list' }], iconComponent: LinkIcon },
  { name: '工具', path: '/tool', match: [{ name: 'tool' }, { name: 'tool-page' }], iconComponent: ToolIcon },
  { name: '信息差', path: '/info_gap/1', match: [{ name: 'info_gap-page' }], iconComponent: InfoIcon },
  { name: '反馈', path: '/feedback/list', match: [{ name: 'feedback-list' }], iconComponent: FeedbackIcon },
  {
    name: '内部资源',
    iconComponent: SiteIcon,
    children: [
      { name: '内部网站', path: '/site', match: [{ name: 'site-index' }] , iconComponent: SiteIcon},
      { name: '内部资源', path: '/resource', match: [{ name: 'resource' }], iconComponent: InfoIcon }
    ]
  },
  { name: '审核', path: '/audit', match: [{ name: 'audit' }], iconComponent: AuditIcon },
  { name: '用户管理', path: '/admin/users', match: [{ name: 'admin-users' }], iconComponent: AuditIcon }
]);

const SearchBarRef = ref(null);
const navMenuScrollRef = ref(null);
const { dialog } = createDiscreteApi(["dialog"]);

// 让目标页签在 bar 上可见；若它贴着某一侧边缘，多滑出一点(peek)，
// 把那一侧还没显示出来的相邻页签带出来，提示用户后面还有内容。
function revealTab(targetEl) {
  const scrollContainer = navMenuScrollRef.value;
  if (!scrollContainer || !targetEl) return;

  const peek = 64; // 多露出相邻页签的宽度
  const cs = scrollContainer.scrollLeft;
  const maxScrollLeft = Math.max(0, scrollContainer.scrollWidth - scrollContainer.clientWidth);

  // 用实时屏幕坐标计算需要滚动的距离，左右逻辑对称
  const cRect = scrollContainer.getBoundingClientRect();
  const eRect = targetEl.getBoundingClientRect();

  let delta = 0;
  if (eRect.right + peek > cRect.right) {
    // 右侧被遮挡 → 往右滑，带出右边的页签
    delta = eRect.right + peek - cRect.right;
  } else if (eRect.left - peek < cRect.left) {
    // 左侧被遮挡 → 往左滑，带出左边的页签
    delta = eRect.left - peek - cRect.left;
  } else {
    return; // 已完整可见，不动
  }

  const next = Math.max(0, Math.min(cs + delta, maxScrollLeft));
  if (Math.abs(next - cs) < 1) return;
  scrollContainer.scrollTo({ left: next, behavior: 'smooth' });
}

// 跳转完成后，定位到当前激活的页签并保证其可见
function revealActiveTab() {
  nextTick(() => {
    const scrollContainer = navMenuScrollRef.value;
    if (!scrollContainer) return;
    const activeEl = scrollContainer.querySelector('.nav-item.active');
    if (activeEl) revealTab(activeEl);
  });
}

function handleOpen(path) {
  navigateTo(path);
}

// 鼠标悬停即预加载目标路由的代码块，点击时跳转更快
function prefetchRoute(path) {
  if (!path) return;
  try {
    preloadRouteComponents(path);
  } catch (e) {}
}

onMounted(() => {
  if (!hasAnyPermission(AUDIT_MENU_PERMISSION)) {
    const auditMenuIndex = menus.value.findIndex(item => item.path === '/audit');
    if (auditMenuIndex !== -1) {
      menus.value.splice(auditMenuIndex, 1);
    }
  }

  const permissions = usePermissions()
  const internalMenuIndex = menus.value.findIndex(item => item.name === '内部资源');

  if (internalMenuIndex !== -1) {
    const internalMenu = menus.value[internalMenuIndex];
    const visibleChildren = [];

    // 检查内部网站权限
    if (permissions.value.innerSite !== undefined) {
      visibleChildren.push(internalMenu.children[0]); // 内部网站
    }

    // 检查内部资源权限
    if (permissions.value.internalResource !== undefined) {
      visibleChildren.push(internalMenu.children[1]); // 内部资源
    }

    // 如果没有任何权限，移除整个内部菜单
    if (visibleChildren.length === 0) {
      menus.value.splice(internalMenuIndex, 1);
    } else if (visibleChildren.length === 1) {
      // 如果只有一个子项，直接变成普通菜单项
      menus.value[internalMenuIndex] = {
        name: visibleChildren[0].name,
        path: visibleChildren[0].path,
        match: visibleChildren[0].match,
        iconComponent: SiteIcon
      };
    } else {
      // 有多个子项，保留下拉菜单
      internalMenu.children = visibleChildren;
    }
  }

  // 用户管理：仅已登录的创始人（level >= 6）可见
  let isFounder = false
  if (user.value) {
    try {
      const roleStr = localStorage.getItem('__user_role__')
      if (roleStr) {
        const role = JSON.parse(roleStr)
        isFounder = parseInt(role.level || '0') >= 6
      }
    } catch {}
  }
  if (!isFounder) {
    const adminMenuIndex = menus.value.findIndex(item => item.path === '/admin/users')
    if (adminMenuIndex !== -1) {
      menus.value.splice(adminMenuIndex, 1)
    }
  }

  revealActiveTab();
});

watch(
  () => route.fullPath,
  () => revealActiveTab(),
  { flush: 'post' }
);

// 获取下拉菜单选项
function getDropdownOptions(item) {
  return item.children.map(child => ({
    label: child.name,
    key: child.path,
    icon: () => h('svg', { width: 16, height: 16, viewBox: '0 0 18 18', fill: 'none' }, [
      h('circle', { cx: '9', cy: '9', r: '6', stroke: 'currentColor', 'stroke-width': '1.5' }),
      h('path', { d: 'M3 9h12M9 3c-2 2-2 8 0 12M9 3c2 2 2 8 0 12', stroke: 'currentColor', 'stroke-width': '1.5' })
    ])
  }));
}

// 处理下拉菜单选择
function handleDropdownSelect(key) {
  handleOpen(key);
}

// 检查子菜单是否激活
function isChildMenuActive(item) {
  if (!item.children) return false;
  return item.children.some(child => isMenuItemActive(child));
}

const isMenuItemActive = (item) => {
  if (item.match) {
    let i = item.match.findIndex((o) => {
      let res = true;
      if (o.params && typeof o.params === 'object') {
        res =
          Object.keys(o.params).findIndex(
            (k) => route.params[k] == o.params[k]
          ) != -1;
      }
      return o.name == route.name && res;
    });
    return i != -1;
  }
  return route.path == item.path;
};

const userOptions = [
  {
    label: '用户中心',
    key: 'center',
  },
  {
    label: '退出',
    key: 'logout',
  },
];

const handleSelect = (k)=>{
    switch (k) {
        case "logout":
            dialog.warning({
                content: "是否要退出登录？",
                positiveText: "退出",
                negativeText: "取消",
                onPositiveClick: async () => {
                    await useLogout()
                },
            });
            break;
        case "center":
            navigateTo({
                name: "user-profile"
            })
            break;
    }
}
</script>

<style scoped>
/* Leantime-inspired Tech Navbar - Clean, Modern, Professional */
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: linear-gradient(180deg, #1a1d29 0%, #252936 100%);
  border-bottom: 1px solid rgba(99, 102, 241, 0.1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.dropdown-arrow {
  margin-left: 4px;
  transition: transform 0.2s;
}

.nav-item:hover .dropdown-arrow {
  transform: rotate(180deg);
}

.container {
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  padding: 0 24px;
  height: 60px;
  display: flex;
  align-items: center;
  gap: 12px;
}

@media (max-width: 1200px) {
  .container {
    max-width: 100%;
  }
}

/* Brand Section */
.brand-section {
  flex-shrink: 0;
}

.brand-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.brand-btn:hover {
  background: rgba(99, 102, 241, 0.08);
}

.brand-logo {
  height: 50px;
  width: auto;
  flex-shrink: 0;
  object-fit: contain;
}

.brand-text {
  font-size: 18px;
  font-weight: 600;
  color: #f1f5f9;
  letter-spacing: -0.02em;
}

/* Navigation Menu - scrollable middle section */
.nav-menu-scroll {
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
  -webkit-overflow-scrolling: touch;
}

.nav-menu-scroll::-webkit-scrollbar {
  display: none;
}

.nav-menu {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 0 8px;
  width: max-content;
  min-width: 100%;
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 6px;
  color: #94a3b8;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.nav-item:hover {
  color: #e2e8f0;
  background: rgba(148, 163, 184, 0.08);
}

.nav-item.active {
  color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
}

.nav-item.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 12px;
  right: 12px;
  height: 2px;
  background: #6366f1;
  border-radius: 2px 2px 0 0;
}

.nav-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-text {
  font-size: 14px;
}

/* User Section */
.user-section {
  flex-shrink: 0;
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.login-link {
  text-decoration: none;
}

.btn-login {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-login:hover {
  background: #5558e3;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.user-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px 6px 6px;
  background: rgba(148, 163, 184, 0.08);
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.user-btn:hover {
  background: rgba(148, 163, 184, 0.12);
  border-color: rgba(148, 163, 184, 0.2);
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: #e2e8f0;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chevron {
  color: #94a3b8;
  flex-shrink: 0;
}

.user-btn :deep(.n-avatar) {
  border: 2px solid rgba(99, 102, 241, 0.2);
}

/* Spacer */
.navbar-spacer {
  height: 60px;
}

/* Responsive */
@media (max-width: 1200px) {
  .nav-item {
    padding: 8px 10px;
    font-size: 13px;
  }
  
  .nav-text {
    font-size: 13px;
  }
}

@media (max-width: 992px) {
  .container {
    gap: 16px;
  }
  
  .nav-menu {
    gap: 1px;
    padding: 0 8px;
  }
  
  .nav-item {
    padding: 8px;
  }
  
  .nav-text {
    display: none;
  }
  
  .user-name {
    display: none;
  }
}

@media (max-width: 768px) {
  .brand-text {
    display: none;
  }
}
</style>
