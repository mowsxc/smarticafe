<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import type { CSSProperties } from 'vue';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../stores/auth';
import { useAppStore } from '../stores/app';
import { useThemeStore } from '../stores/theme';
import { useSettingsStore } from '../stores/settings';
import { mainNavigation } from '../router';
import { useRouter, useRoute } from 'vue-router';
import MeituanVerifier from '../components/meituan/MeituanVerifier.vue';
import StandardLoginPanel from '../components/StandardLoginPanel.vue';
import QuickLoginPanel from '../components/QuickLoginPanel.vue';
import LinkSettingsModal from '../components/LinkSettingsModal.vue';
import ModernNotification from '../components/ui/ModernNotification.vue';
import ModernButton from '../components/ui/ModernButton.vue';
import { getSyncService } from '../services/supabase/client';

// Custom Links
const CUSTOM_URLS_KEY = 'smarticafe_custom_urls';
const customUrls = ref<Record<string, string>>({});

// Initialize custom urls from local storage
try {
  const saved = localStorage.getItem(CUSTOM_URLS_KEY);
  if (saved) {
    customUrls.value = JSON.parse(saved);
  }
} catch (e) { console.error('Failed to load custom urls', e); }

const showLinkModal = ref(false);
const editingNavItem = ref<any>(null);

const handleNavDoubleClick = (item: any) => {
  if (!item.external) return; // Only allow external links to be customized
  editingNavItem.value = item;
  showLinkModal.value = true;
};

const handleLinkSave = (newUrl: string) => {
  if (editingNavItem.value) {
    const label = editingNavItem.value.label;
    customUrls.value[label] = newUrl;
    localStorage.setItem(CUSTOM_URLS_KEY, JSON.stringify(customUrls.value));
    
    // If active, reload it immediately
    if (activeEmbeddedLabel.value === label) {
       reloadEmbeddedTab(label, newUrl);
       activeEmbeddedUrl.value = newUrl;
    } else {
       // If background tab exists, destroy it so it reloads with new url next time
       const wv = webviewMap.get(label);
       if (wv) {
           webviewMap.delete(label);
           try { wv.close(); } catch(_) {} 
       }
    }
  }
  showLinkModal.value = false;
};

// Store
const authStore = useAuthStore();
const appStore = useAppStore();
const themeStore = useThemeStore();
const router = useRouter();
const route = useRoute();

const settingsStore = useSettingsStore();
settingsStore.init();
const { brandSettings, logoSettings, cloudSettings } = storeToRefs(settingsStore);

const cloudEnabled = computed(() => !!cloudSettings.value.enabled);

const storeChars = computed(() => {
  const value = brandSettings.value.storeName || '';
  return value.split('').filter((char) => char.trim().length > 0);
});

const logoPreviewStyle = computed<CSSProperties>(() => ({
  height: `${logoSettings.value.height}px`,
  padding: `${logoSettings.value.padding}px`,
  borderRadius: `${logoSettings.value.borderRadius}px`,
  background: `linear-gradient(135deg, ${logoSettings.value.bgGradientStart} 0%, ${logoSettings.value.bgGradientEnd} 100%)`,
  boxShadow: logoSettings.value.glowIntensity > 0
    ? `0 0 ${logoSettings.value.glowIntensity * 6}px ${logoSettings.value.neonColor}`
    : 'none',
}));

const logoSignStyle = computed<CSSProperties>(() => ({
  height: `${logoSettings.value.height}px`,
  width: '20px',
  padding: '2px',
  borderRadius: '6px',
  marginRight: `${logoSettings.value.marginRight}px`,
  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
  boxShadow: logoSettings.value.style === 'neon' ? `0 0 12px ${logoSettings.value.neonColor}` : 'none',
}));

const logoTextBlockStyle = computed<CSSProperties>(() => ({
  display: 'flex',
  flexDirection: 'column' as const,
  justifyContent: 'space-between',
  gap: `${logoSettings.value.verticalGap}px`,
  paddingTop: `${logoSettings.value.paddingTop}px`,
}));

const brandTextStyle = computed<CSSProperties>(() => ({
  fontSize: `${logoSettings.value.fontSize.brand}px`,
  fontWeight: '600',
  color: logoSettings.value.textColor,
  lineHeight: '1.2',
}));

const systemTextStyle = computed<CSSProperties>(() => ({
  fontSize: `${logoSettings.value.fontSize.system}px`,
  fontWeight: '600',
  color: logoSettings.value.textColor,
  lineHeight: '1.2',
  letterSpacing: '0.08em',
}));

onMounted(() => {
  // Apply theme
  themeStore.applyTheme();

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.user-dropdown-wrapper')) {
      showUserDropdown.value = false;
    }
  });
});

// ===== Shift Info Editing =====
const showShiftEditModal = ref(false);
const editingShift = ref({
  date: String(appStore.currentDate || ''),
  shift: String(appStore.currentShift || ''),
  employee: String(appStore.currentEmployee || ''),
});

const shiftPeople = ref<string[]>([]);

// Check if current user can edit shift info
const canEditShift = computed(() => {
  if (authStore.currentUser?.role === 'admin') return true;
  return false;
});

// Open shift edit modal
const openShiftEdit = () => {
  if (!canEditShift.value) return;
  editingShift.value = {
    date: String(appStore.currentDate || ''),
    shift: String(appStore.currentShift || ''),
    employee: String(appStore.currentEmployee || ''),
  };
  ;(async () => {
    try {
      const list = await authStore.fetchPickList();
      const employees = Array.isArray(list?.employees) ? list.employees : [];
      const bosses = Array.isArray(list?.bosses) ? list.bosses : [];
      shiftPeople.value = [...employees, ...bosses];
    } catch {
      shiftPeople.value = [];
    }
  })();
  showShiftEditModal.value = true;
};

// Save shift edit
const saveShiftEdit = () => {
  appStore.setShift(editingShift.value.date, editingShift.value.shift, editingShift.value.employee);
  showShiftEditModal.value = false;
};

// ===== User Avatar Dropdown =====
const showUserDropdown = ref(false);
const handleUserAction = () => {
  if (authStore.isAuthenticated) {
    showUserDropdown.value = !showUserDropdown.value;
  } else {
    isStandardLoginOpen.value = true;
  }
};

const handleLogout = () => {
  authStore.logout();
  showUserDropdown.value = false;
};

const handleLoginToggle = () => {
  showUserDropdown.value = false;
  isStandardLoginOpen.value = true;
};

// ===== Customizable Brand Settings =====

// Embedded webview state
const activeEmbeddedLabel = ref<string | null>(null);
const activeEmbeddedUrl = ref<string | null>(null);

// ===== Embedded Webview Functions (Tab Mode) =====
const webviewMap = new Map<string, any>(); // Label -> Webview Instance

const hideAllEmbeds = async () => {
  const t = (window as any).__TAURI__ || null;
  const hidePromises: Promise<any>[] = [];

  for (const [label, wv] of webviewMap.entries()) {
    const p = (async () => {
        try {
          if (wv) {
             // Try to hide
             if (typeof wv.hide === 'function') {
                await wv.hide();
             }
             // Try to move offscreen (using simple object structure which Tauri usually calculates)
             if (typeof wv.setPosition === 'function') {
                // Try LogicalPosition structure for Tauri v2 compatibility
                await wv.setPosition(new (t?.window?.PhysicalPosition || Object)(-20000, -20000));
                // Fallback: try raw object if above failed silently or just in case
                await wv.setPosition({ type: 'Physical', x: -20000, y: -20000 }).catch(() => {});
             }
          }
        } catch (e) {
          console.warn(`Failed to hide webview ${label}`, e);
          // If instance is dead, remove it
          webviewMap.delete(label);
        }
    })();
    hidePromises.push(p);
  }
  
  // Wait for all hides with a timeout to prevent UI blocking
  try {
    await Promise.race([
        Promise.all(hidePromises),
        new Promise(resolve => setTimeout(resolve, 200)) 
    ]);
  } catch(e) { console.error('Hide timeout', e); }

  activeEmbeddedLabel.value = null;
};

const handleInternalNav = async (path: string) => {
  // Always trigger hide logic
  await hideAllEmbeds();
  activeEmbeddedUrl.value = null;
  
  // Ensure we actually populate the router even if hide failed
  await router.push(path);
};

const handleExternalLink = async (item: any) => {
  if (!item.url) return;
  
  if (!authStore.isAuthenticated) {
    authStore.pendingRedirect = JSON.stringify({
      mode: 'embedded_webview',
      url: item.url,
      label: item.label
    });
    authStore.isLoginRequired = true;
    return;
  }

  await openEmbeddedWebview(item.label, item.url);
};

// Force reload a specific tab (used when settings change)
const reloadEmbeddedTab = async (label: string, url: string) => {
  const wv = webviewMap.get(label);
  if (wv && typeof wv.loadUrl === 'function') {
    try {
      await wv.loadUrl(url);
    } catch (e) {
      console.error('Failed to reload webview', e);
    }
  }
};

const openEmbeddedWebview = async (label: string, url: string) => {
  try {
    const safeLabel = String(label || 'ext').trim() || 'ext';
    const safeUrl = String(url || '').trim();
    if (!safeUrl) return;

    // 1. Hide others
    await hideAllEmbeds();

    // 2. Check existing
    let wv = webviewMap.get(safeLabel);
    
    // Tauri helpers
    const t = (window as any).__TAURI__ || null;
    const computeContentRect = () => {
      const mainElement = document.querySelector('main');
      if (!mainElement) return null;
      const rect = mainElement.getBoundingClientRect();
      return {
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    };

    if (wv) {
      // Reuse existing tab
      try {
        const rect = computeContentRect();
        if (rect) {
           // Restore position and size
           if (typeof wv.setPosition === 'function') {
                await wv.setPosition(new (t?.window?.PhysicalPosition || Object)(rect.x, rect.y));
           }
           if (typeof wv.setSize === 'function') {
                await wv.setSize(new (t?.window?.PhysicalSize || Object)(rect.width, rect.height));
           }
           
           // Ensure it is visible again
           await wv.show();
           await wv.setFocus();
        }
        activeEmbeddedLabel.value = safeLabel;
        activeEmbeddedUrl.value = safeUrl;
        return;
      } catch (e) {
        console.warn('Reusable webview failed, creating new one', e);
        webviewMap.delete(safeLabel);
        // Fall through to create new
      }
    }

    // 3. Create New
    const apiWebview = t && (t as any).webview ? (t as any).webview : null;
    const WebviewCtor = apiWebview && apiWebview.Webview ? apiWebview.Webview : null;

    if (!WebviewCtor) {
      console.warn('当前环境不支持内嵌网页（需要 Tauri v2 webview API）');
      window.open(safeUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    const win = t.window.getCurrentWindow();
    const rect = computeContentRect();
    if (!win || !rect) {
      window.open(safeUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    const wvLabel = `tab_${Math.random().toString(36).substr(2, 9)}`;
    
    wv = new WebviewCtor(win, wvLabel, {
      url: safeUrl,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      visible: true,
      focus: true,
    });

    // Save to map
    webviewMap.set(safeLabel, wv);
    
    // Keep reference on window for cleanup if needed
    (window as any).__embeddedWebviews = (window as any).__embeddedWebviews || [];
    (window as any).__embeddedWebviews.push(wv);

    activeEmbeddedLabel.value = safeLabel;
    activeEmbeddedUrl.value = safeUrl;
    
  } catch (e) {
    console.error('打开内嵌网页异常:', e);
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

// Login panel state
const isMeituanDrawerOpen = ref(false);
const isStandardLoginOpen = ref(false); // 访客状态用
const isQuickLoginOpen = ref(false);    // 已登录状态用

// Open login panel based on auth state
const openLoginPanel = () => {
  if (authStore.isAuthenticated) {
    // 已登录：显示快捷登录面板
    isQuickLoginOpen.value = true;
  } else {
    // 未登录：显示标准登录面板
    isStandardLoginOpen.value = true;
  }
};

// Watch for auth changes
watch(() => authStore.isAuthenticated, async (val) => {
  if (val && authStore.pendingRedirect) {
    try {
      const pending = JSON.parse(authStore.pendingRedirect);
      authStore.pendingRedirect = null;
      
      if (pending.mode === 'embedded_webview') {
        await openEmbeddedWebview(pending.label, pending.url);
      } else if (pending.mode === 'new_window') {
        window.open(pending.url, '_blank');
      } else {
        router.push(pending.url || pending);
      }
    } catch (e) {
      const target = authStore.pendingRedirect;
      authStore.pendingRedirect = null;
      if (target) {
        router.push(target);
      }
    }
  }
});

// Sync login panel state from auth store
watch(() => authStore.isLoginRequired, (val) => {
  if (val) {
    openLoginPanel();
  }
});

// ===== Real-time Clock =====
const currentTime = ref('');
const updateTime = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  currentTime.value = `${hours}:${minutes}:${seconds}`;
};
let timer: any = null;

onMounted(() => {
  updateTime();
  timer = setInterval(updateTime, 1000);

  void refreshGlobalStatus();
  if (globalStatusTimer) clearInterval(globalStatusTimer);
  globalStatusTimer = setInterval(refreshGlobalStatus, 3000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
  if (globalStatusTimer) clearInterval(globalStatusTimer);
  // Cleanup all webviews
  for (const [_, wv] of webviewMap.entries()) {
    try { wv.close(); } catch(_) {}
  }
  webviewMap.clear();
});


// ===== Navigation Icon Mapping =====
const navIconMap: Record<string, string> = {
  Cashier: 'M2 5h20v14H2V5zm2 2v10h16V7H4z', // 收银台
  ShiftRecords: 'M3 4h18v2H3V4zm0 4h18v2H3V8zm0 4h18v2H3v-2zm0 4h18v2H3v-2z', // 交班记录
  Products: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z', // 商品管理
  Finance: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', // 财务管理
  Users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75', // 用户管理
  Permissions: 'M3 11h18M7 15v-4m4 4v-8m4 8v-12M3 7v4M3 11h18M7 15v4m4-4v4m4-4v4m4-4v4', // 权限管理
  Settings: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 0-9-9m0 0V3m0 18v-3m9-9H6m12-6h-3m0 0v3m0-6h-3m6 6h-3', // 系统设置
  external_coupon: 'M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z', // 验券管理
  external_stats: 'M18 20V10M12 20V4M6 20v-6', // 消费数据
};

// Get SVG path for nav item
const getNavIconPath = (item: any): string => {
  if (item.external) {
    return navIconMap[item.label === '验券管理' ? 'external_coupon' : 'external_stats'] || '';
  }
  return navIconMap[item.name] || '';
};

// ===== Navigation Permission Check =====
const canShowNavItem = (item: any): boolean => {
  if (item.adminOnly && authStore.currentUser?.role !== 'admin') return false;
  if (item.bossOnly && !['admin', 'boss'].includes(authStore.currentUser?.role || '')) return false;
  if (item.permission && !authStore.can(String(item.permission))) return false;
  return true;
};

// ===== Navigation Active State =====
const navItemHover = ref<string | null>(null);
const avatarHover = ref(false);

const showGlobalStatusModal = ref(false);
const globalSyncPending = ref<number>(0);
const globalSyncLastSync = ref<string>('never');
const globalSyncError = ref<string | null>(null);
const globalSyncInProgress = ref<boolean>(false);
let globalStatusTimer: any = null;

const globalSyncLastSyncShort = computed(() => {
  const v = String(globalSyncLastSync.value || '');
  if (!v || v === 'never') return 'never';
  return v.replace('T', ' ').replace('Z', '').slice(0, 19);
});

const refreshGlobalStatus = async () => {
  try {
    const svc = getSyncService();
    const s = svc.getStatus();
    globalSyncPending.value = Number(s.pendingChanges) || 0;
    globalSyncLastSync.value = String(s.lastSync || 'never');
    globalSyncError.value = s.syncError ? String(s.syncError) : null;
    globalSyncInProgress.value = svc.isSyncing();
  } catch {
    // ignore
  }
};

const triggerGlobalSync = async () => {
  try {
    globalSyncInProgress.value = true;
    const svc = getSyncService();
    await svc.forceSync();
  } finally {
    await refreshGlobalStatus();
  }
};

const isNavActive = (item: any): boolean => {
  if (item.external) {
    const targetUrl = customUrls.value[item.label] || item.url;
    return activeEmbeddedUrl.value === targetUrl;
  }
  return route.path === item.path;
};

// Handle nav item click
const handleNavClick = async (item: any) => {
  if (item.external) {
    const targetUrl = customUrls.value[item.label] || item.url;
    // Override url for handling
    const itemWithCustomUrl = { ...item, url: targetUrl };
    await handleExternalLink(itemWithCustomUrl);
  } else {
    await handleInternalNav(item.path || '');
  }
};
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-gray-50 text-gray-900 font-sans overflow-y-auto scroll-smooth selection:bg-brand-orange selection:text-white">
    
    <!-- Auth Overlay Backdrop for unauthenticated users -->
    <div v-if="!authStore.isAuthenticated" class="fixed inset-0 z-50 bg-slate-100/60 backdrop-blur-xl flex flex-col items-center justify-center p-8 overflow-hidden">
        <div class="absolute inset-0 pointer-events-none opacity-20 shimmer grayscale"></div>
        <div class="max-w-md w-full space-y-12 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div class="w-32 h-32 bg-linear-to-tr from-brand-orange to-orange-400 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-orange-200/50 animate-bounce-slow">
                <span class="text-6xl text-white font-black tracking-tighter">S</span>
            </div>
            <div class="space-y-4">
                <h1 class="text-4xl font-black text-slate-900 tracking-tight">Smarticafe</h1>
                <p class="text-slate-500 font-medium">请先完成身份验证以进入系统</p>
            </div>
            <ModernButton variant="primary" size="lg" icon="🔐" @click="openLoginPanel" class="px-12 py-6 rounded-3xl text-lg shadow-2xl shadow-orange-500/30">
                立即登录 / 初始化
            </ModernButton>
        </div>
    </div>

    <!-- ===== HEADER SECTION ===== -->
    <header class="header shrink-0 relative">
      <div class="header-inner flex items-center justify-between">
        
        <!-- LEFT: Brand & Navigation -->
        <div class="header-left flex items-center">
          
          <!-- BRAND AREA (新设计) -->
          <div
            class="brand-area flex items-center relative bg-transparent rounded-lg"
            :style="logoPreviewStyle"
          >
            <!-- 右边：橙色竖排招牌 -->
            <div
              class="flex flex-col items-center justify-center rounded"
              :style="logoSignStyle"
            >
              <!-- 竖排文字（每个字一行） -->
              <div class="flex flex-col items-center gap-0.5">
                <span
                  v-for="(char, index) in storeChars"
                  :key="`${char}-${index}`"
                  class="text-[11px] font-normal text-white leading-tight"
                >{{ char }}</span>
              </div>
            </div>
            <!-- 左边：上下两个无边框无边距文字框 -->
            <div class="flex flex-col items-start justify-between p-0 m-0 h-full" :style="logoTextBlockStyle">
              <!-- 上框：创新意 电竞馆 -->
              <span
                class="leading-none tracking-wide block p-0 m-0 whitespace-nowrap"
                :style="brandTextStyle"
              >
                {{ brandSettings.brandName }}
              </span>
              <!-- 下框：SMARTICAFE 橙色 -->
              <span
                class="leading-none tracking-wider block p-0 m-0 whitespace-nowrap"
                :style="systemTextStyle"
              >
                {{ brandSettings.systemName }}
              </span>
            </div>
          </div>

          <!-- Navigation Divider -->
          <div class="nav-divider w-px h-8 bg-linear-to-b from-transparent via-gray-300 to-transparent mx-3 rounded-full"></div>

          <!-- Navigation -->
          <nav class="nav flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[40vw] md:max-w-none pr-4">
            <template v-for="item in mainNavigation" :key="item.path || item.url">
              <!-- Nav Item (Internal or External) -->
              <button 
                v-if="canShowNavItem(item)"
                @click="handleNavClick(item)"
                @dblclick="handleNavDoubleClick(item)"
                @mouseenter="navItemHover = (item.path || item.url || '') as string"
                @mouseleave="navItemHover = null"
                :class="[
                  'nav-item relative flex items-center gap-2.5 h-9 px-3.5 rounded-xl text-[13px] font-semibold tracking-wide',
                  isNavActive(item) 
                    ? 'nav-item--active text-brand-orange bg-linear-to-br from-orange-50 to-orange-100 shadow-lg shadow-orange-100/50' 
                    : 'nav-item--default text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                ]"
                :title="item.adminOnly ? '仅超管可访问' : (item.bossOnly ? '仅股东可访问' : item.label)"
              >
                <!-- Active Indicator Line with Pulse -->
                <div 
                  v-if="isNavActive(item)"
                  class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-brand-orange rounded-r-full"
                >
                  <span class="absolute inset-0 bg-brand-orange rounded-r-full animate-ping opacity-50"></span>
                </div>
                <!-- Unified SVG Icon -->
                <svg 
                  class="nav-icon w-4.5 h-4.5 shrink-0 transition-all duration-300"
                  :class="[
                    isNavActive(item) ? 'text-brand-orange' : 'text-gray-400',
                    navItemHover === (item.path || item.url || '') ? 'scale-110 text-brand-orange' : ''
                  ]"
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  stroke-width="2" 
                  stroke-linecap="round" 
                  stroke-linejoin="round"
                >
                  <path :d="getNavIconPath(item)" />
                </svg>
                <span 
                  class="nav-label relative z-10 transition-all duration-200"
                  :class="[
                    isNavActive(item) ? 'text-brand-orange font-bold' : 'text-gray-600',
                    navItemHover === (item.path || item.url || '') ? 'translate-x-0.5' : ''
                  ]"
                >{{ item.label }}</span>
              </button>
            </template>
          </nav>
        </div>

        <!-- CENTER: Time Display (带图标) -->
        <div class="header-center flex items-center gap-2">
          <svg class="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span class="time-display text-[14px] font-mono font-bold text-gray-800 tracking-wider">{{ currentTime }}</span>
        </div>

        <!-- RIGHT: User Profile -->
        <div class="header-right flex items-center gap-3">
          <!-- Shift Info (日期+班次+姓名，单行) -->
          <div
            class="shift-info flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors"
            :class="{ 'can-edit': canEditShift }"
            @click="openShiftEdit"
          >
            <svg class="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span class="text-[11px] font-mono text-gray-600 leading-none">
              {{ appStore.currentDate }} {{ appStore.currentShift }} {{ appStore.currentEmployee }}
            </span>
            <span
              v-if="canEditShift"
              class="text-[9px] text-orange-400 animate-pulse"
            >●</span>
          </div>

          <div
            class="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-lg"
            :title="cloudEnabled ? 'Cloud Enabled' : 'Cloud Disabled'"
          >
            <div class="relative w-4 h-4">
              <svg
                class="absolute inset-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                :class="cloudEnabled ? 'text-emerald-600' : 'text-red-500'"
              >
                <path d="M20 17.5a4.5 4.5 0 0 0-3.5-4.39A6 6 0 1 0 6 16H5a3 3 0 0 0 0 6h13a3 3 0 0 0 2-4.5z" />
              </svg>
              <svg
                class="absolute inset-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.6"
                stroke-linecap="round"
                stroke-linejoin="round"
                :class="cloudEnabled ? 'text-emerald-600' : 'text-red-500'"
              >
                <path v-if="cloudEnabled" d="M8.2 13.2l2.3 2.3 5.6-5.6" />
                <path v-else d="M9 9l6 6M15 9l-6 6" />
              </svg>
            </div>
          </div>

          <button
            class="relative w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center"
            @click="showGlobalStatusModal = true"
            :title="globalSyncError ? '同步异常' : (globalSyncPending > 0 ? '有待同步数据' : '同步正常')"
            aria-label="全站状态总览"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              :class="globalSyncError ? 'text-red-500' : (globalSyncPending > 0 ? 'text-brand-orange' : 'text-gray-500')"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>

            <span
              v-if="globalSyncPending > 0"
              class="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-brand-orange text-white text-[10px] font-black flex items-center justify-center"
            >
              {{ globalSyncPending }}
            </span>

            <span
              v-if="globalSyncError"
              class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white bg-red-500"
            ></span>
          </button>

          <!-- Divider -->
          <div class="w-px h-8 bg-gray-200 rounded-full"></div>

          <!-- User Info -->
          <div
            class="hidden md:flex items-center gap-1.5 text-[11px] cursor-pointer select-none hover:opacity-90 transition-opacity"
            @click="openLoginPanel"
            title="点击打开登录"
          >
            <svg class="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span class="text-gray-400 font-medium">{{ authStore.userProfile?.roleLabel || '' }}</span>
            <span class="text-gray-800 font-bold">{{ authStore.userProfile?.name || '立即登录' }}</span>
            <span v-if="authStore.isAuthenticated" class="text-gray-600">￥--/--</span>
          </div>

          <!-- Divider -->
          <div class="w-px h-8 bg-gray-200 rounded-full"></div>

          <!-- User Avatar (Rightmost) -->
          <div class="user-dropdown-wrapper relative">
            <!-- Avatar Button -->
            <div
              @click="handleUserAction"
              @mouseenter="avatarHover = true"
              @mouseleave="avatarHover = false"
              class="user-avatar-button flex items-center gap-3 cursor-pointer group transition-transform duration-300"
              :class="avatarHover ? 'scale-105' : ''"
            >
              <!-- Avatar -->
              <div class="avatar-wrapper relative">
                <div
                  class="avatar w-9 h-9 rounded-xl flex items-center justify-center text-[13px] font-bold transition-all duration-300 shadow-lg"
                  :class="avatarHover ? 'shadow-orange-200 ring-2 ring-brand-orange/30' : ''"
                  :style="{
                    background: authStore.isAuthenticated 
                      ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                      : 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
                    color: 'white',
                    boxShadow: authStore.isAuthenticated 
                      ? '0 4px 12px rgba(249, 115, 22, 0.3)'
                      : '0 4px 12px rgba(100, 116, 139, 0.2)',
                  }"
                >
                  {{ (authStore.userProfile?.name?.[0] || 'G').toUpperCase() }}
                </div>
                <!-- Status Badge with Pulse -->
                <span 
                  class="status-badge absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white"
                  :class="authStore.isAuthenticated ? 'bg-emerald-400' : 'bg-gray-300'"
                >
                  <span v-if="authStore.isAuthenticated" class="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-50"></span>
                </span>
              </div>
            </div>

            <!-- Dropdown Menu -->
            <Transition name="dropdown">
              <div
                v-if="showUserDropdown"
                class="user-dropdown absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50"
              >
                <div class="py-2">
                  <template v-if="authStore.isAuthenticated">
                    <div class="px-4 py-2 text-[10px] text-gray-400 border-b border-gray-50 mb-2">
                      账户详情: {{ authStore.userProfile?.name }} ({{ authStore.userProfile?.roleLabel }})
                    </div>
                    <button
                      @click="handleLogout"
                      class="dropdown-item w-full flex items-center gap-3 px-4 py-2.5 text-[12px] text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all duration-150"
                    >
                      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                        <polyline points="16 17 21 12 16 7"/>
                        <line x1="21" y1="12" x2="9" y2="12"/>
                      </svg>
                      退出登录
                    </button>
                  </template>
                  <template v-else>
                    <button
                      @click="handleLoginToggle"
                      class="dropdown-item w-full flex items-center gap-3 px-4 py-2.5 text-[12px] text-brand-orange hover:bg-orange-50 transition-all duration-150"
                    >
                      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                        <polyline points="10 17 15 12 10 7"/>
                        <line x1="15" y1="12" x2="3" y2="12"/>
                      </svg>
                      账户登录
                    </button>
                  </template>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </header>

    <!-- ===== MAIN CONTENT ===== -->
    <main class="main-content flex-1 flex flex-col overflow-y-auto scroll-smooth p-4 pt-2 immersive-scroll">
      <div class="content-wrapper flex-1 flex flex-col overflow-y-auto scroll-smooth rounded-2xl bg-white shadow-sm border border-gray-100 immersive-scroll">
        <router-view v-slot="{ Component }">
          <Transition name="page-fade" mode="out-in">
            <div :key="route.path" class="h-full">
              <component :is="Component" />
            </div>
          </Transition>
        </router-view>
      </div>
    </main>

    <Transition name="modal">
      <div
        v-if="showGlobalStatusModal"
        class="fixed inset-0 z-100 flex items-center justify-center p-4 modal-backdrop"
        @click.self="showGlobalStatusModal = false"
      >
        <div class="w-full max-w-[520px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div class="flex flex-col">
              <span class="text-[14px] font-bold text-gray-800">系统状态总览</span>
              <span class="text-[10px] text-gray-400">Sync / Network / Queue</span>
            </div>
            <button
              class="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex items-center justify-center"
              @click="showGlobalStatusModal = false"
              aria-label="关闭"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div class="px-5 py-4 space-y-3 text-[12px] text-gray-700">
            <div class="flex items-center justify-between">
              <span class="text-gray-500">待同步队列</span>
              <span class="font-black" :class="globalSyncPending > 0 ? 'text-brand-orange' : 'text-gray-700'">{{ globalSyncPending }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-500">上次同步</span>
              <span class="font-mono text-[11px] text-gray-700">{{ globalSyncLastSyncShort }}</span>
            </div>
            <div class="flex items-start justify-between gap-4">
              <span class="text-gray-500 shrink-0">同步状态</span>
              <div class="flex-1 text-right">
                <span v-if="globalSyncInProgress" class="font-bold text-brand-orange">同步中…</span>
                <span v-else-if="globalSyncError" class="font-bold text-red-500" :title="globalSyncError">同步失败</span>
                <span v-else class="font-bold text-emerald-600">正常</span>
              </div>
            </div>

            <div class="pt-2 flex items-center justify-end gap-2">
              <button
                class="h-10 px-4 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors"
                @click="showGlobalStatusModal = false"
              >
                关闭
              </button>
              <button
                class="h-10 px-4 rounded-xl bg-brand-orange text-white font-bold hover:bg-orange-600 transition-colors disabled:opacity-50"
                :disabled="globalSyncInProgress"
                @click="triggerGlobalSync"
              >
                {{ globalSyncInProgress ? '同步中…' : '重试同步' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Meituan Drawer Backdrop -->
    <Transition name="fade">
      <div 
        v-if="isMeituanDrawerOpen" 
        class="drawer-backdrop fixed inset-0 bg-black/5 z-10"
        @click="isMeituanDrawerOpen = false"
      />
    </Transition>

    <!-- Meituan Drawer -->
    <Transition name="drawer-slide">
      <aside v-if="isMeituanDrawerOpen" class="meituan-drawer fixed right-4 top-4 bottom-4 w-96 bg-white rounded-2xl shadow-2xl z-20 flex flex-col overflow-hidden" @click.stop>
        <div class="drawer-header flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div class="drawer-title flex flex-col">
            <span class="text-[15px] font-semibold text-gray-800">美团验券</span>
            <span class="text-[9px] text-gray-400 uppercase tracking-wider">Meituan</span>
          </div>
          <button 
            @click="isMeituanDrawerOpen = false"
            class="drawer-close w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="drawer-body flex-1 overflow-auto p-4">
          <MeituanVerifier />
        </div>
      </aside>
    </Transition>

    <!-- Shift Edit Modal -->
    <Transition name="modal">
      <div 
        v-if="showShiftEditModal" 
        class="fixed inset-0 z-100 flex items-center justify-center p-4 modal-backdrop"
        @click="showShiftEditModal = false"
      >
        <div 
          class="shift-edit-modal w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
          @click.stop
        >
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 class="text-[15px] font-semibold text-gray-800">编辑班次信息</h3>
            <button 
              @click="showShiftEditModal = false"
              class="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
            >
              ✕
            </button>
          </div>
          
          <div class="p-6 space-y-4">
            <div class="space-y-2">
              <label class="text-[12px] font-medium text-gray-600">日期</label>
              <input 
                v-model="editingShift.date" 
                type="date" 
                class="w-full h-11 px-4 rounded-xl border border-gray-200 focus:border-brand-orange/40 focus:ring-4 focus:ring-orange-500/10 outline-none font-mono text-sm"
              />
            </div>
            
            <div class="space-y-2">
              <label class="text-[12px] font-medium text-gray-600">班次</label>
              <select 
                v-model="editingShift.shift"
                class="w-full h-11 px-4 rounded-xl border border-gray-200 focus:border-brand-orange/40 focus:ring-4 focus:ring-orange-500/10 outline-none font-mono text-sm"
              >
                <option value="白班">白班</option>
                <option value="晚班">晚班</option>
              </select>
            </div>
            
            <div class="space-y-2">
              <label class="text-[12px] font-medium text-gray-600">当班人</label>
              <select 
                v-model="editingShift.employee"
                class="w-full h-11 px-4 rounded-xl border border-gray-200 focus:border-brand-orange/40 focus:ring-4 focus:ring-orange-500/10 outline-none font-mono text-sm"
              >
                <option v-for="p in shiftPeople" :key="p" :value="p">{{ p }}</option>
              </select>
            </div>
          </div>
          
          <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
            <button 
              @click="showShiftEditModal = false"
              class="px-4 h-10 rounded-xl text-[12px] font-medium text-gray-600 hover:bg-gray-100 transition-all"
            >
              取消
            </button>
            <button 
              @click="saveShiftEdit"
              class="px-6 h-10 rounded-xl text-[12px] font-medium text-white bg-brand-orange hover:bg-orange-600 transition-all"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Standard Login Panel (for guests/visitors) -->
    <StandardLoginPanel
      :is-open="isStandardLoginOpen"
      @close="isStandardLoginOpen = false"
      @login-success="isStandardLoginOpen = false"
    />

    <!-- Quick Login Panel (for logged-in users) -->
    <QuickLoginPanel
      :is-open="isQuickLoginOpen"
      @close="isQuickLoginOpen = false"
      @login-success="isQuickLoginOpen = false"
    />

    <!-- Link Settings Modal -->
    <LinkSettingsModal
      :is-open="showLinkModal"
      :label="editingNavItem?.label || ''"
      :initial-url="editingNavItem ? (customUrls[editingNavItem.label] || editingNavItem.url) : ''"
      @close="showLinkModal = false"
      @save="handleLinkSave"
    />

    <!-- Notification Container -->
    <ModernNotification />
  </div>
</template>

<style scoped>
/* ===== MODAL ANIMATIONS ===== */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .shift-edit-modal,
.modal-leave-to .shift-edit-modal {
  transform: scale(0.95) translateY(20px);
}

/* ===== DROPDOWN ANIMATIONS ===== */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

/* ===== BRAND AREA STYLES ===== */
.brand-area {
  transition: all 0.2s ease;
}

.brand-area:hover .edit-icon {
  opacity: 1;
}

.brand-area.can-edit {
  cursor: pointer;
}

.brand-area.can-edit:hover {
  background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%) !important;
}

.brand-area.can-edit:hover .shift-text {
  color: #f97316 !important;
}

.brand-area.can-edit:hover .edit-icon {
  opacity: 1;
}

/* ===== NAVIGATION STYLES ===== */
.nav-item {
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-item::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 2px;
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.3) 0%, rgba(249, 115, 22, 0.1) 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.nav-item:hover::before {
  opacity: 1;
}

.nav-item--default:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.nav-item--active {
  box-shadow: 0 2px 8px rgba(249, 115, 22, 0.15);
}

.nav-item--active::before {
  opacity: 1;
}

/* Active Indicator Animation */
.nav-item--active .absolute.left-0 {
  animation: indicatorSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes indicatorSlideIn {
  from {
    transform: translateY(-50%) scaleY(0);
    opacity: 0;
  }
  to {
    transform: translateY(-50%) scaleY(1);
    opacity: 1;
  }
}

.nav-icon {
  flex-shrink: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-label {
  white-space: nowrap;
  transition: all 0.2s ease;
}

/* Ripple Effect on Click */
.nav-item::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, rgba(249, 115, 22, 0.2) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.nav-item:active::after {
  opacity: 1;
  transition: opacity 0s;
}

.store-sign {
  width: 40px;
  height: 44px;
}

.store-name {
  writing-mode: vertical-rl;
  text-orientation: mixed;
}

.brand-text {
  flex-shrink: 0;
}

.brand-name {
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.system-name {
  font-family: 'SF Mono', 'Monaco', monospace;
}

/* Navigation */
.nav-divider {
  flex-shrink: 0;
}

.nav {
  flex-shrink: 0;
}

.nav-item {
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.nav-item--default:hover {
  transform: translateY(-1px);
}

.nav-item--active {
  box-shadow: 0 2px 8px rgba(249, 115, 22, 0.15);
}

.nav-icon {
  flex-shrink: 0;
}

.nav-label {
  white-space: nowrap;
}

/* Time Display */
.time-display {
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
}

.status-dot {
  box-shadow: 0 0 8px rgba(52, 211, 153, 0.4);
}

.status-text {
  font-family: 'SF Mono', 'Monaco', monospace;
}

/* Shift Info */
.shift-info {
  flex-shrink: 0;
}

.shift-dot {
  box-shadow: 0 0 8px rgba(96, 165, 250, 0.4);
}

.shift-text {
  font-family: 'SF Mono', 'Monaco', monospace;
}

/* User Avatar */
.user-avatar {
  flex-shrink: 0;
}

.user-role {
  font-family: 'SF Mono', 'Monaco', monospace;
}

.user-name {
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.avatar-wrapper {
  flex-shrink: 0;
}

.avatar {
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.status-badge {
  box-shadow: 0 0 6px rgba(52, 211, 153, 0.4);
}

/* ===== MAIN CONTENT ===== */
.main-content {
  padding: 8px 16px 16px;
}

.content-wrapper {
  border: 1px solid #f3f4f6;
}

/* ===== PAGE TRANSITIONS ===== */
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 200ms ease;
}

.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
}

/* ===== FADE TRANSITION ===== */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 200ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ===== DRAWER TRANSITIONS ===== */
.drawer-backdrop {
  transition: opacity 200ms ease;
}

.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 300ms ease;
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateX(100%);
}

.meituan-drawer {
  transition: transform 300ms ease;
}

/* ===== RESPONSIVE DESIGN ===== */

/* Large screens (1440px+) */
@media (min-width: 1440px) {
  .header {
    padding: 10px 24px;
  }
  
  .header-inner {
    height: 56px;
  }
  
  .nav-item {
    padding: 0 16px;
    height: 36px;
  }
}

/* Medium screens (1024px - 1439px) */
@media (max-width: 1439px) {
  .shift-text {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

/* Small screens (768px - 1023px) */
@media (max-width: 1023px) {
  .header {
    padding: 6px 12px;
  }
  
  .header-inner {
    height: 48px;
  }
  
  .system-name {
    display: none;
  }
  
  .nav-divider {
    display: none;
  }
  
  .nav-label {
    display: none;
  }
  
  .nav-item {
    padding: 0 12px;
    height: 32px;
  }
  
  .shift-info {
    display: none !important;
  }
  
  .user-info {
    display: none !important;
  }
  
  .avatar {
    width: 36px;
    height: 36px;
    border-radius: 10px;
  }
}

/* Mobile screens (< 768px) */
@media (max-width: 767px) {
  .header {
    padding: 4px 8px;
  }
  
  .header-inner {
    height: 44px;
  }
  
  .brand-text {
    display: none;
  }
  
  .store-sign {
    width: 32px;
    height: 36px;
  }
  
  .store-sign svg {
    width: 20px;
    height: 20px;
  }
  
  .nav-item {
    padding: 0 8px;
    height: 28px;
  }
  
  .nav-icon {
    width: 16px;
    height: 16px;
  }
  
  .user-avatar {
    padding-left: 12px;
  }
  
  .main-content {
    padding: 4px 8px 8px;
  }
}

/* ===== ACCESSIBILITY ===== */
.nav-item:focus-visible,
.user-avatar:focus-visible,
.drawer-close:focus-visible {
  outline: 2px solid rgba(249, 115, 22, 0.5);
  outline-offset: 2px;
}

/* ===== HIGH CONTRAST MODE ===== */
@media (prefers-contrast: high) {
  .header {
    border-bottom: 2px solid #000;
  }
  
  .nav-item--active {
    border: 1px solid #000;
  }
}

/* ===== REDUCED MOTION ===== */
@media (prefers-reduced-motion: reduce) {
  .nav-item,
  .avatar,
  .user-name,
  .page-fade-enter-active,
  .page-fade-leave-active,
  .fade-enter-active,
  .fade-leave-active,
  .drawer-slide-enter-active,
  .drawer-slide-leave-active {
    transition: none;
  }
}
</style>
