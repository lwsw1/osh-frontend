<template>
  <div class="navbar">
    <div class="container">
      <div class="brand-section">
        <button class="brand-btn" @click="handleOpen('/')">
          <img src="/osh-logo.png" alt="OSH" class="brand-logo" />
        </button>
      </div>

      <div class="nav-scroll-shell">
        <button
          type="button"
          class="nav-scroll-btn"
          :disabled="!scrollState.canScrollLeft"
          :class="{ disabled: !scrollState.canScrollLeft }"
          @click="scrollNavBy(-240)"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M8.5 3.5L5 7l3.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        <div
          class="nav-menu-scroll"
          ref="navMenuScrollRef"
          @scroll="updateScrollState"
          @wheel="handleNavWheel"
          @mousedown="handleDragStart"
          @click.capture="handlePotentialDragClick"
        >
          <nav class="nav-menu">
            <template v-for="(item, index) in menus" :key="index">
              <n-dropdown v-if="item.children" :options="getDropdownOptions(item)" @select="handleDropdownSelect" placement="bottom-start">
                <a class="nav-item" :class="{ active: isChildMenuActive(item) }">
                  <component :is="item.iconComponent" class="nav-icon" />
                  <span class="nav-text">{{ item.name }}</span>
                  <svg class="dropdown-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M3 5l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </a>
              </n-dropdown>

              <a
                v-else
                :href="item.path"
                @click.prevent="handleOpen(item.path)"
                @mouseenter="prefetchRoute(item.path)"
                class="nav-item"
                :class="{ active: isMenuItemActive(item) }"
              >
                <component :is="item.iconComponent" class="nav-icon" />
                <span class="nav-text">{{ item.name }}</span>
              </a>
            </template>
          </nav>
        </div>

        <button
          type="button"
          class="nav-scroll-btn"
          :disabled="!scrollState.canScrollRight"
          :class="{ disabled: !scrollState.canScrollRight }"
          @click="scrollNavBy(240)"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5.5 3.5L9 7l-3.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
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
const MIN_AUDIT_ROLE_LEVEL = 5;

const { connect, disconnect } = useWebSocket();

onMounted(() => {
  if (user.value) connect();
});

watch(user, (newVal, oldVal) => {
  if (newVal && !oldVal) {
    connect();
  } else if (!newVal && oldVal) {
    disconnect();
  }
});

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
    id: "innerResource",
    iconComponent: SiteIcon,
    children: [
      { name: '内部网站', path: '/site', match: [{ name: 'site-index' }] , iconComponent: SiteIcon},
      { name: '内部资源', path: '/resource', match: [{ name: 'resource' }], iconComponent: InfoIcon }
    ]
  },
  { name: '审核', path: '/audit', match: [{ name: 'audit' }], iconComponent: AuditIcon },
  { name: '后台管理', path: '/admin/users', match: [{ name: 'admin-users' }], iconComponent: AuditIcon }
]);

const SearchBarRef = ref(null);
const navMenuScrollRef = ref(null);
const scrollState = ref({
  canScrollLeft: false,
  canScrollRight: false,
  enabled: false,
});
const { dialog } = createDiscreteApi(["dialog"]);
let navResizeObserver = null;
let isDragging = false;
let dragMoved = false;
let suppressClick = false;
let dragStartX = 0;
let dragStartScrollLeft = 0;
let navSyncFrame = 0;

function centerTab(targetEl, behavior = 'smooth') {
  const scrollContainer = navMenuScrollRef.value;
  if (!scrollContainer || !targetEl) return;
  const maxScrollLeft = Math.max(0, scrollContainer.scrollWidth - scrollContainer.clientWidth);
  const targetCenter = targetEl.offsetLeft + targetEl.offsetWidth / 2;
  const next = Math.max(0, Math.min(targetCenter - scrollContainer.clientWidth / 2, maxScrollLeft));
  scrollContainer.scrollTo({ left: next, behavior });
}

function centerActiveTab(behavior = 'smooth') {
  nextTick(() => {
    const scrollContainer = navMenuScrollRef.value;
    if (!scrollContainer) return;
    const activeEl = scrollContainer.querySelector('.nav-item.active');
    if (activeEl) {
      centerTab(activeEl, behavior);
    }
    updateScrollState();
  });
}

function scheduleNavSync(behavior = 'auto') {
  if (!import.meta.client) {
    centerActiveTab(behavior);
    return;
  }
  if (navSyncFrame) {
    cancelAnimationFrame(navSyncFrame);
  }
  navSyncFrame = window.requestAnimationFrame(() => {
    navSyncFrame = 0;
    centerActiveTab(behavior);
  });
}

function handleNavLayoutChange() {
  scheduleNavSync('auto');
}

function handleOpen(path) {
  navigateTo(path);
}

function prefetchRoute(path) {
  if (!path) return;
  try {
    preloadRouteComponents(path);
  } catch (e) {}
}

function updateScrollState() {
  const scrollContainer = navMenuScrollRef.value;
  if (!scrollContainer) return;
  const maxScroll = Math.max(0, scrollContainer.scrollWidth - scrollContainer.clientWidth);
  scrollState.value = {
    enabled: maxScroll > 1,
    canScrollLeft: scrollContainer.scrollLeft > 2,
    canScrollRight: scrollContainer.scrollLeft < maxScroll - 2,
  };
}

function handleNavWheel(event) {
  const scrollContainer = navMenuScrollRef.value;
  if (!scrollContainer || !scrollState.value.enabled) return;
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  if (!delta) return;
  const maxScroll = Math.max(0, scrollContainer.scrollWidth - scrollContainer.clientWidth);
  const next = Math.max(0, Math.min(scrollContainer.scrollLeft + delta, maxScroll));
  if (Math.abs(next - scrollContainer.scrollLeft) < 1) return;
  event.preventDefault();
  scrollContainer.scrollLeft = next;
  updateScrollState();
}

function scrollNavBy(delta) {
  const scrollContainer = navMenuScrollRef.value;
  if (!scrollContainer || !scrollState.value.enabled) return;
  scrollContainer.scrollBy({
    left: delta,
    behavior: 'smooth',
  });
}

function handleDragStart(event) {
  if (event.button !== 0 || !scrollState.value.enabled) return;
  const scrollContainer = navMenuScrollRef.value;
  if (!scrollContainer) return;
  isDragging = true;
  dragMoved = false;
  dragStartX = event.clientX;
  dragStartScrollLeft = scrollContainer.scrollLeft;
  scrollContainer.classList.add('dragging');
  if (import.meta.client) {
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
  }
}

function handleDragMove(event) {
  if (!isDragging) return;
  const scrollContainer = navMenuScrollRef.value;
  if (!scrollContainer) return;
  const deltaX = event.clientX - dragStartX;
  if (Math.abs(deltaX) > 4) {
    dragMoved = true;
  }
  scrollContainer.scrollLeft = dragStartScrollLeft - deltaX;
  updateScrollState();
}

function handleDragEnd() {
  if (!isDragging) return;
  const scrollContainer = navMenuScrollRef.value;
  isDragging = false;
  if (dragMoved) {
    suppressClick = true;
    setTimeout(() => {
      suppressClick = false;
    }, 0);
  }
  if (scrollContainer) {
    scrollContainer.classList.remove('dragging');
  }
  if (import.meta.client) {
    document.body.style.userSelect = '';
    window.removeEventListener('mousemove', handleDragMove);
    window.removeEventListener('mouseup', handleDragEnd);
  }
}

function handlePotentialDragClick(event) {
  if (!suppressClick) return;
  event.preventDefault();
  event.stopPropagation();
}

onMounted(() => {
  let auditRoleLevel = 0
  try {
    const roleStr = localStorage.getItem('__user_role__')
    if (roleStr) {
      const role = JSON.parse(roleStr)
      auditRoleLevel = parseInt(role.level || '0')
    }
  } catch {}
  const fromUser = Number(user.value?.role?.level ?? 0)
  if (Number.isFinite(fromUser) && fromUser > auditRoleLevel) {
    auditRoleLevel = fromUser
  }
  if (auditRoleLevel < MIN_AUDIT_ROLE_LEVEL) {
    const auditMenuIndex = menus.value.findIndex(item => item.path === '/audit');
    if (auditMenuIndex !== -1) {
      menus.value.splice(auditMenuIndex, 1);
    }
  }
  const permissions = usePermissions()

  const internalMenuIndex = menus.value.findIndex(item => item.id === 'innerResource');


  if (internalMenuIndex !== -1) {
    let innerResMenu = menus.value[internalMenuIndex]

    if (permissions.value.innerSite === undefined || permissions.value.innerSite.length === 0) {

      const internalSiteIndex = innerResMenu.children.findIndex(item => item.path === '/site');
      if (internalSiteIndex !== -1) {
        innerResMenu.children.splice(internalSiteIndex, 1);
      }
    }
    if (permissions.value.innerResource === undefined || permissions.value.innerResource.length === 0) {
      const internalResourceIndex = innerResMenu.children.findIndex(item => item.path === '/resource');
      if (internalResourceIndex !== -1) {
        innerResMenu.children.splice(internalResourceIndex, 1);
      }
    }

    if (innerResMenu.children.length === 0) {
      menus.value.splice(internalMenuIndex, 1);
    }
  }

  // if (internalMenuIndex !== -1) {
  //   const internalMenu = menus.value[internalMenuIndex];
  //   const visibleChildren = [];

  //   if (permissions.value.innerSite !== undefined) {
  //     visibleChildren.push(internalMenu.children[0]);
  //   }

  //   if (permissions.value.internalResource !== undefined) {
  //     visibleChildren.push(internalMenu.children[1]);
  //   }

  //   if (visibleChildren.length === 0) {
  //     menus.value.splice(internalMenuIndex, 1);
  //   } else if (visibleChildren.length === 1) {
  //     menus.value[internalMenuIndex] = {
  //       name: visibleChildren[0].name,
  //       path: visibleChildren[0].path,
  //       match: visibleChildren[0].match,
  //       iconComponent: SiteIcon
  //     };
  //   } else {
  //     internalMenu.children = visibleChildren;
  //   }
  // }

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

  nextTick(() => {
    scheduleNavSync('auto');
    if (typeof ResizeObserver !== 'undefined' && navMenuScrollRef.value) {
      navResizeObserver = new ResizeObserver(handleNavLayoutChange);
      navResizeObserver.observe(navMenuScrollRef.value);
      if (navMenuScrollRef.value.firstElementChild) {
        navResizeObserver.observe(navMenuScrollRef.value.firstElementChild);
      }
    }
    if (import.meta.client) {
      window.addEventListener('resize', handleNavLayoutChange);
    }
  });
});

onBeforeUnmount(() => {
  if (import.meta.client) {
    document.body.style.userSelect = '';
    window.removeEventListener('mousemove', handleDragMove);
    window.removeEventListener('mouseup', handleDragEnd);
    window.removeEventListener('resize', handleNavLayoutChange);
    if (navSyncFrame) {
      cancelAnimationFrame(navSyncFrame);
      navSyncFrame = 0;
    }
  }
  if (navResizeObserver) {
    navResizeObserver.disconnect();
    navResizeObserver = null;
  }
});

watch(
  () => route.fullPath,
  () => scheduleNavSync(),
  { flush: 'post' }
);

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

function handleDropdownSelect(key) {
  handleOpen(key);
}

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
  max-width: none;
  width: 100%;
  margin: 0;
  padding: 0;
  height: 60px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand-section {
  flex-shrink: 0;
}

.brand-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0;
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

.nav-menu-scroll {
  display: flex;
  align-items: center;
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

.nav-scroll-shell {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.nav-menu {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 0 8px;
  width: max-content;
  min-width: 100%;
}

.nav-scroll-btn {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(99, 102, 241, 0.12);
  color: #c7d2fe;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-scroll-btn:hover {
  background: rgba(99, 102, 241, 0.2);
  color: #eef2ff;
}

.nav-scroll-btn.disabled,
.nav-scroll-btn:disabled {
  opacity: 0.32;
  cursor: default;
}

.nav-scroll-btn.disabled:hover,
.nav-scroll-btn:disabled:hover {
  background: rgba(99, 102, 241, 0.12);
  color: #c7d2fe;
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

.nav-menu-scroll {
  cursor: grab;
}

.nav-menu-scroll.dragging {
  cursor: grabbing;
}

.user-section {
  flex-shrink: 0;
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
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
  padding: 6px 10px 6px 6px;
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

.navbar-spacer {
  height: 60px;
}

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

  .nav-scroll-btn {
    width: 28px;
    height: 28px;
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
