import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useSettingsStore } from '../stores/settings';
import { toast } from '../composables/useToast';

// 页面组件
import CashierView from '../views/CashierView.vue';
import ShiftRecordsView from '../views/ShiftRecordsView.vue';
import ProductsView from '../views/ProductsView.vue';
import FinanceView from '../views/FinanceView.vue';
import UsersView from '../views/UsersView.vue';
import PermissionsView from '../views/PermissionsView.vue';
import SettingsView from '../views/SettingsView.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/cashier',
  },
  {
    path: '/external',
    name: 'ExternalPage',
    component: () => import('../views/ExternalPage.vue'),
    meta: { requiresAuth: true, title: '外部页面', icon: '🌍' },
  },
  {
    path: '/cashier',
    name: 'Cashier',
    component: CashierView,
    meta: { requiresAuth: true, title: '收银台', icon: '💰', permission: 'view_cashier' },
  },
  {
    path: '/shift-records',
    name: 'ShiftRecords',
    component: ShiftRecordsView,
    meta: { requiresAuth: true, title: '交班记录', icon: '📋', permission: 'view_shift' },
  },
  {
    path: '/products',
    name: 'Products',
    component: ProductsView,
    meta: { requiresAuth: true, title: '商品管理', icon: '📦', adminOnly: true, permission: 'view_products' },
  },
  {
    path: '/finance',
    name: 'Finance',
    component: FinanceView,
    meta: { requiresAuth: true, title: '财务管理', icon: '💼', bossOnly: true, permission: 'view_finance' },
  },
  {
    path: '/users',
    name: 'Users',
    component: UsersView,
    meta: { requiresAuth: true, title: '用户管理', icon: '👥', adminOnly: true, permission: 'view_users' },
  },
  {
    path: '/permissions',
    name: 'Permissions',
    component: PermissionsView,
    meta: { requiresAuth: true, title: '权限管理', icon: '🔐', adminOnly: true, permission: 'view_permissions' },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsView,
    meta: { requiresAuth: true, title: '系统设置', icon: '⚙️', adminOnly: true, permission: 'view_settings' },
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

// 运行版本与启动时间 (用于标题显示)
const APP_VERSION = '2.0.0';
const LAUNCH_TIME = new Date().toLocaleString('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
}).replace(/\//g, '-');

// 路由守卫
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore();
  const settingsStore = useSettingsStore();

  // 1. 优先检查系统是否已初始化
  authStore.bootstrapRequired().then(required => {
    if (required) {
      // 如果需要初始化，且当前不是处于登录弹窗触发状态，则强制开启登录弹窗
      if (!authStore.isLoginRequired) {
          authStore.isLoginRequired = true;
      }
    }
  });
  
  // 更新页面标题
  if (to.meta.title) {
    const brand = settingsStore.brandSettings?.brandName || 'Smarticafe';
    document.title = `${to.meta.title} - ${brand} - Smarticafe v${APP_VERSION} (${LAUNCH_TIME})`;
  }

  // 如果页面不需要认证，直接放行
  if (to.meta.requiresAuth === false) {
    next();
    return;
  }

  // 检查是否已登录
  if (!authStore.isAuthenticated) {
    authStore.pendingRedirect = to.fullPath;
    authStore.isLoginRequired = true;
    next(false);
    return;
  }

  // 检查管理员权限
  if (to.meta.adminOnly && authStore.currentUser?.role !== 'admin') {
    toast.error('您没有权限访问此页面（仅限超管）');
    next(false);
    return;
  }

  // 检查股东权限
  if (to.meta.bossOnly && !['admin', 'boss'].includes(authStore.currentUser?.role || '')) {
    toast.error('您没有权限访问此页面（仅限股东）');
    next(false);
    return;
  }

  // 模块级权限检查
  if (to.meta.permission && !authStore.can(String(to.meta.permission))) {
    toast.error('您没有权限访问此模块');
    next(false);
    return;
  }

  next();
});

// 导航配置
export const mainNavigation = [
  { name: 'Cashier', label: '收银台', icon: '💰', path: '/cashier', permission: 'view_cashier' },
  {
    label: '验券中心',
    icon: '🍔',
    external: true,
    url: 'https://e.dianping.com/app/merchant-platform/30ef342572cb44b?iUrl=Ly9lLmRpYW5waW5nLmNvbS9hcHAvbWVyY2hhbnQtcGxhdGZvcm0td2ViL3N0YXR1cy9kYXRhLnJlc291cmNlX2NhdXNlLXZpZXc/JXN0YXRlPWRlYXV0'
  },
  {
    label: '消费数据',
    icon: '📊',
    external: true,
    url: 'https://e.dianping.com/app/merchant-platform/543c7d5810bd431?iUrl=Ly9lLmRpYW5waW5nLmNvbS9hcHAvbWVyY2hhbnQtcGxhdGZvcm0td2ViL3N0YXR1cy9kYXRhLnJlc291cmNlX2NhdXNlLXZpZXc/JXN0YXRlPWRlYXV0'
  },
  { name: 'ShiftRecords', label: '交班记录', icon: '📋', path: '/shift-records', permission: 'view_shift' },
  { name: 'Products', label: '商品管理', icon: '📦', path: '/products', adminOnly: true, permission: 'view_products' },
  { name: 'Finance', label: '财务管理', icon: '💼', path: '/finance', bossOnly: true, permission: 'view_finance' },
  { name: 'Users', label: '用户管理', icon: '👥', path: '/users', adminOnly: true, permission: 'view_users' },
  { name: 'Permissions', label: '权限管理', icon: '🔐', path: '/permissions', adminOnly: true, permission: 'view_permissions' },
  { name: 'Settings', label: '系统设置', icon: '⚙️', path: '/settings', adminOnly: true, permission: 'view_settings' },
];

export default router;