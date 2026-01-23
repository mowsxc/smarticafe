import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useSettingsStore } from '../stores/settings';
import { toast } from '../composables/useToast';
import { tauriCmd } from '../utils/tauri';

// 页面组件
import CashierView from '../views/CashierView.vue';
import ShiftRecordsView from '../views/ShiftRecordsView.vue';
import ProductsView from '../views/ProductsView.vue';
import FinanceView from '../views/FinanceView.vue';
import UsersView from '../views/UsersView.vue';
import PermissionsView from '../views/PermissionsView.vue';
import SettingsView from '../views/SettingsView.vue';

const routes: RouteRecordRaw[] = [
  // 业务主应用（使用 MainLayout）
  {
    path: '/',
    component: () => import('../layout/MainLayout.vue'),
    redirect: '/cashier',
    children: [
      {
        path: 'cashier',
        name: 'Cashier',
        component: CashierView,
        meta: { requiresAuth: true, title: '收银台', icon: '💰', permission: 'view_cashier' },
      },
      {
        path: 'external',
        name: 'ExternalPage',
        component: () => import('../views/ExternalPage.vue'),
        meta: { requiresAuth: true, title: '外部页面', icon: '🌍' },
      },
      {
        path: 'shift-records',
        name: 'ShiftRecords',
        component: ShiftRecordsView,
        meta: { requiresAuth: true, title: '交班记录', icon: '📋', permission: 'view_shift' },
      },
      {
        path: 'products',
        name: 'Products',
        component: ProductsView,
        meta: { requiresAuth: true, title: '商品管理', icon: '📦', adminOnly: true, permission: 'view_products' },
      },
      {
        path: 'finance',
        name: 'Finance',
        component: FinanceView,
        meta: { requiresAuth: true, title: '财务管理', icon: '💼', bossOnly: true, permission: 'view_finance' },
      },
      {
        path: 'dividend',
        name: 'Dividend',
        component: () => import('../views/DividendView.vue'),
        meta: { requiresAuth: true, title: '分红报表', icon: '💸', bossOnly: true, permission: 'view_finance' },
      },
      {
        path: 'users',
        name: 'Users',
        component: UsersView,
        meta: { requiresAuth: true, title: '用户管理', icon: '👥', adminOnly: true, permission: 'view_users' },
      },
      {
        path: 'permissions',
        name: 'Permissions',
        component: PermissionsView,
        meta: { requiresAuth: true, title: '权限管理', icon: '🔐', adminOnly: true, permission: 'view_permissions' },
      },
      {
        path: 'settings',
        name: 'Settings',
        component: SettingsView,
        meta: { requiresAuth: true, title: '系统设置', icon: '⚙️', adminOnly: true, permission: 'view_settings' },
      },
    ]
  },
  
  // 独立页面（如初始化引导，不使用 MainLayout）
  {
    path: '/setup',
    name: 'Setup',
    component: () => import('../views/SetupView.vue'),
    meta: { requiresAuth: false, title: '系统初始化' }
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    ...routes,
    {
      path: '/setup',
      name: 'Setup',
      component: () => import('../views/SetupView.vue'),
      meta: { requiresAuth: false, title: '系统初始化' }
    }
  ],
});

// 检查初始化是否完成
async function checkInitComplete(): Promise<boolean> {
  try {
    // 检查是否有活跃班次
    const activeShift = await tauriCmd('shift_get_active');
    if (!activeShift) {
      return false;
    }

    // 检查是否有活跃员工
    const employees = await tauriCmd('employees_list') as any[];
    const activeEmployees = employees?.filter(emp => emp.is_active !== false) || [];
    if (!activeEmployees || activeEmployees.length === 0) {
      return false;
    }

    return true;
  } catch (e) {
    console.warn('Init complete check failed:', e);
    return false;
  }
}

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
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();
  const settingsStore = useSettingsStore();

  // 更新页面标题
  if (to.meta.title) {
    const brand = settingsStore.brandSettings?.brandName || 'Smarticafe';
    document.title = `${to.meta.title} - ${brand} - Smarticafe v${APP_VERSION} (${LAUNCH_TIME})`;
  }

  // 1. 系统初始化检查 (Bootstrap Check)
  // 这是最高优先级的检查
  try {
     const needsBootstrap = await authStore.bootstrapRequired();

     if (needsBootstrap) {
         // 如果需要初始化，且当前不在 setup 页面，强制跳转
         if (to.name !== 'Setup') {
             next({ name: 'Setup' });
             return;
         }
         // 如果已经在 setup 页面，放行
         next();
         return;
     } else {
         // 检查初始化是否完成（需要有员工和活跃班次）
         const initComplete = await checkInitComplete();
         if (!initComplete) {
             // 初始化未完成，强制回到setup页面
             if (to.name !== 'Setup') {
                 next({ name: 'Setup' });
                 return;
             }
         } else {
             // 初始化已完成
             if (to.name === 'Setup') {
                 // 如果试图访问 setup 但已完成初始化，踢回首页
                 next({ path: '/' });
                 return;
             }
         }
     }
  } catch (e) {
      console.warn('Bootstrap check failed, maybe offline or api error', e);
      // Fallback: continue normal flow
  }

  // 如果页面不需要认证，直接放行
  if (to.meta.requiresAuth === false) {
    next();
    return;
  }

  // 检查是否已登录
  if (!authStore.isAuthenticated) {
    authStore.pendingRedirect = to.fullPath;
    authStore.isLoginRequired = true; // 保留此标志位用于触发 Header bar 的登录弹窗
    // 这里我们不再阻断路由，而是让用户留在当前页面（可能是 MainLayout），
    // 此时 MainLayout 会显示全屏的 "请先登录" 遮罩层 (我们在 MainLayout里见过的那个 div v-if="!authStore.isAuthenticated")
    // 所以 next() 放行即可，让 MainLayout 接管。
    next(); 
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
  { name: 'Dividend', label: '分红报表', icon: '💸', path: '/dividend', bossOnly: true, permission: 'view_finance' },
  { name: 'Users', label: '用户管理', icon: '👥', path: '/users', adminOnly: true, permission: 'view_users' },
  { name: 'Permissions', label: '权限管理', icon: '🔐', path: '/permissions', adminOnly: true, permission: 'view_permissions' },
  { name: 'Settings', label: '系统设置', icon: '⚙️', path: '/settings', adminOnly: true, permission: 'view_settings' },
];

export default router;