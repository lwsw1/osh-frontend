<template>
  <NConfigProvider inline-theme-disabled :theme-overrides="themeOverrides" :date-locale="dateZhCN" :locale="zhCN">
    <NMessageProvider>
      <NDialogProvider>
        <NuxtLayout>
          <NuxtPage/>
        </NuxtLayout>
        <!-- 全局主题切换挂件 -->
        <ThemeWidget />
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>

<script setup>
import { NMessageProvider, NDialogProvider, NConfigProvider } from 'naive-ui'
import { zhCN, dateZhCN } from 'naive-ui'
import { onMounted } from 'vue'

// Leantime-inspired theme
const themeOverrides = {
  common: {
    primaryColor: '#6366f1',
    primaryColorHover: '#5558e3',
    primaryColorPressed: '#4f46e5',
    borderRadius: '6px',
  }
}

// 客户端启动时：未登录则清掉残留权限
onMounted(() => {
  const token = useCookie('token').value
    || localStorage.getItem('token')
    || localStorage.getItem('Token')
  if (!token) {
    localStorage.removeItem('__permissions__')
    const permissions = usePermissions()
    permissions.value = []
  }
})
</script>

<style>
/* Leantime-inspired Global Styles - Tech, Clean, Professional */

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  /* Color System */
  --color-bg-primary: #0f1419;
  --color-bg-secondary: #1a1d29;
  --color-bg-tertiary: #252936;
  --color-bg-elevated: #2d3142;
  
  --color-surface: #ffffff;
  --color-surface-hover: #f8fafc;
  
  --color-border: rgba(148, 163, 184, 0.12);
  --color-border-hover: rgba(148, 163, 184, 0.2);
  
  --color-text-primary: #0f172a;
  --color-text-secondary: #475569;
  --color-text-tertiary: #94a3b8;
  
  --color-text-inverse: #f1f5f9;
  --color-text-inverse-secondary: #cbd5e1;
  
  --color-accent: #6366f1;
  --color-accent-hover: #5558e3;
  --color-accent-light: rgba(99, 102, 241, 0.1);
  
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  
  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
  
  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 2px 4px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-xl: 0 8px 24px rgba(0, 0, 0, 0.12);
  
  /* Typography */
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --font-mono: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
}

html {
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: var(--font-sans);
  background: #f8fafc;
  color: var(--color-text-primary);
  line-height: 1.6;
  min-height: 100vh;
}

/* Scrollbar Styling */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.5);
}

/* Typography Utilities */
h1, h2, h3, h4, h5, h6 {
  font-weight: 600;
  line-height: 1.3;
  color: var(--color-text-primary);
  margin-bottom: var(--space-md);
}

h1 { font-size: 2rem; }
h2 { font-size: 1.5rem; }
h3 { font-size: 1.25rem; }
h4 { font-size: 1.125rem; }
h5 { font-size: 1rem; }
h6 { font-size: 0.875rem; }

p {
  margin-bottom: var(--space-md);
}

a {
  color: var(--color-accent);
  text-decoration: none;
  transition: color 0.2s ease;
}

a:hover {
  color: var(--color-accent-hover);
}

/* Card Component Base */
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease;
}

.card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--color-border-hover);
}

/* Button Base Styles */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  font-size: 14px;
  font-weight: 500;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn-primary {
  background: var(--color-accent);
  color: white;
}

.btn-primary:hover {
  background: var(--color-accent-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.btn-secondary {
  background: var(--color-surface);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-border-hover);
}

/* Input Base Styles */
.input {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  font-size: 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
}

.input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-light);
}

/* Badge */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 500;
  border-radius: var(--radius-sm);
  background: var(--color-accent-light);
  color: var(--color-accent);
}

/* Utility Classes */
.text-primary { color: var(--color-text-primary); }
.text-secondary { color: var(--color-text-secondary); }
.text-tertiary { color: var(--color-text-tertiary); }

.bg-surface { background: var(--color-surface); }
.bg-hover { background: var(--color-surface-hover); }

.border { border: 1px solid var(--color-border); }
.border-radius { border-radius: var(--radius-md); }

.shadow-sm { box-shadow: var(--shadow-sm); }
.shadow-md { box-shadow: var(--shadow-md); }
.shadow-lg { box-shadow: var(--shadow-lg); }

/* Animation */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-in {
  animation: fadeIn 0.3s ease;
}
</style>