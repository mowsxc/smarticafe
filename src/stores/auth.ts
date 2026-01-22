import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { getSyncService } from '../services/supabase/client';

// Import enhanced sync service
declare global {
  interface Window {
    smarticafeEnhancedSync?: import('../services/supabase/enhanced-client').EnhancedSyncService
  }
}

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'boss' | 'employee';
  displayName: string;
  equityPercentage?: number;
  heldFrom?: string | null;  // 代持来源，如 "莫健代持"
}

export const useAuthStore = defineStore('auth', () => {
  // Init from storage
  const storedUser = localStorage.getItem('auth_user');
  const currentUser = ref<User | null>(storedUser ? JSON.parse(storedUser) : null);
  const pendingRedirect = ref<string | null>(null);
  const isLoginRequired = ref(false);
  
  const isAuthenticated = computed(() => !!currentUser.value);

  const saveToStorage = (user: User) => {
    localStorage.setItem('auth_user', JSON.stringify(user));
  };

  // 员工免密登录
  const employeeLogin = async (name: string) => {
    const user: User = {
      id: `emp_${name}`,
      username: name,
      role: 'employee',
      displayName: name,
    };
    currentUser.value = user;
    saveToStorage(user);

    // Sync login to Supabase
    try {
      const syncService = getSyncService();
      await syncService.enqueue({
        table: 'auth_sessions',
        operation: 'upsert',
        data: {
          user_id: user.id,
          username: user.username,
          role: user.role,
          display_name: user.displayName,
          login_at: new Date().toISOString(),
          logout_at: null,
        },
      });
      await syncService.sync();
    } catch (error) {
      console.error('Failed to sync login to Supabase:', error);
      // Continue offline even if sync fails
    }
  };

  // 莫健的多身份登录 (支持代持股东)
  const mojianLogin = async (password: string) => {
    // 解析密码格式: mojian_cuiguoli 或直接密码
    let identityKey = password
    let heldShareholderName = null
    
    if (password.startsWith('mojian_')) {
      // 代持股东登录格式: mojian_姓名拼音
      const pinyin = password.replace('mojian_', '')
      const heldMap: Record<string, { name: string; equity: number }> = { // 代持股东（莫健代持，不显示登录入口）
        'cuiguoli': { name: '崔国丽', equity: 0.20 },
        'luqiumian': { name: '路秋勉', equity: 0.13 },
        'caomengsi': { name: '曹梦思', equity: 0.10 },
        'moyanfei': { name: '莫艳菲', equity: 0.02 },
      }
      const held = heldMap[pinyin]
      if (!held) {
        throw new Error('密码错误')
      }
      identityKey = 'held_shareholder'
      heldShareholderName = held.name
    }
    
    const identities: Record<string, { role: 'admin' | 'boss'; name: string; equity?: number; heldFrom?: string }> = { // 明面股东
      'laoban': { role: 'boss', name: '莫健', equity: 0.25 },
      'chaoguan': { role: 'admin', name: '莫健', equity: 0.25 },
      'held_shareholder': { role: 'boss', name: heldShareholderName || '未知', equity: 0 },
    };

    const identity = identities[identityKey];
    if (!identity) {
      throw new Error('密码错误');
    }

    // Fix: If it's a held shareholder, use the equity from heldMap
    let equityValue = identity.equity || 0;
    if (heldShareholderName) {
      const heldMap: Record<string, { name: string; equity: number }> = {
        'cuiguoli': { name: '崔国丽', equity: 0.20 },
        'luqiumian': { name: '路秋勉', equity: 0.13 },
        'caomengsi': { name: '曹梦思', equity: 0.10 },
        'moyanfei': { name: '莫艳菲', equity: 0.02 },
      };
      const pinyin = password.replace('mojian_', '');
      equityValue = heldMap[pinyin]?.equity || 0;
    }

    const user: User = {
      id: `mojian_${identityKey}`,
      username: 'mojian',
      role: identity.role,
      displayName: identity.name,
      equityPercentage: equityValue,
      heldFrom: heldShareholderName ? '莫健代持' : null,
    };
    currentUser.value = user;
    saveToStorage(user);

    // Sync login to Supabase
    try {
      const syncService = getSyncService();
      await syncService.enqueue({
        table: 'auth_sessions',
        operation: 'upsert',
        data: {
          user_id: user.id,
          username: user.username,
          role: user.role,
          display_name: user.displayName,
          equity_percentage: user.equityPercentage,
          login_at: new Date().toISOString(),
          logout_at: null,
        },
      });
      await syncService.sync();
    } catch (error) {
      console.error('Failed to sync login to Supabase:', error);
      // Continue offline even if sync fails
    }
  };

  // 股东登录
  const bossLogin = async (name: string, equity: number) => {
    const user: User = {
      id: `boss_${name}`,
      username: name,
      role: 'boss',
      displayName: name,
      equityPercentage: equity,
    };
    currentUser.value = user;
    saveToStorage(user);

    // Sync login to Supabase
    try {
      const syncService = getSyncService();
      await syncService.enqueue({
        table: 'auth_sessions',
        operation: 'upsert',
        data: {
          user_id: user.id,
          username: user.username,
          role: user.role,
          display_name: user.displayName,
          equity_percentage: user.equityPercentage,
          login_at: new Date().toISOString(),
          logout_at: null,
        },
      });
      await syncService.sync();
    } catch (error) {
      console.error('Failed to sync login to Supabase:', error);
      // Continue offline even if sync fails
    }
  };

  // 退出登录
  const logout = async () => {
    const userId = currentUser.value?.id;

    currentUser.value = null;
    localStorage.removeItem('auth_user');

    // Sync logout to Supabase
    if (userId) {
      try {
        const syncService = getSyncService();
        await syncService.enqueue({
          table: 'auth_sessions',
          operation: 'update',
          data: {
            user_id: userId,
            logout_at: new Date().toISOString(),
          },
        });
        await syncService.sync();
      } catch (error) {
        console.error('Failed to sync logout to Supabase:', error);
        // Continue offline even if sync fails
      }
    }
  };

  const fetchPickList = async () => {
    const employees = ['黄河'];
    const bosses = ['莫健'];
    return { employees, bosses };
  };

  const login = async (pickName: string, password: string) => {
    const name = String(pickName || '').trim();
    const pwd = String(password || '').trim();
    if (!name) throw new Error('请选择用户');

    const employees = ['黄河', '刘杰', '贾政华', '秦佳', '史红'];
    const shareholders = ['莫健', '朱晓培'];

    if (name === '莫健') {
      if (!pwd) throw new Error('请输入密码');
      await mojianLogin(pwd);
      return;
    }

    if (employees.includes(name)) {
      await employeeLogin(name);
      return;
    }

    if (name === '朱晓培') {
      if (!pwd) throw new Error('请输入密码');
      if (pwd === 'laoban' || pwd === 'zhuxiaopei') {
        await bossLogin(name, 0.30);
        return;
      }
      throw new Error('密码错误');
    }

    // Support for other shareholders if any
    if (shareholders.includes(name)) {
        if (!pwd) throw new Error('请输入密码');
        // Default password for others
        if (pwd === 'laoban') {
            await bossLogin(name, 0.05); // Default generic equity
            return;
        }
        throw new Error('密码错误');
    }

    throw new Error('不支持的用户');
  };

  // 获取角色显示的各种独立属性
  const userProfile = computed(() => {
    if (!currentUser.value) return null;
    const heldFrom = currentUser.value.heldFrom
    return {
      roleLabel: currentUser.value.role === 'admin' ? '超管' : (currentUser.value.role === 'boss' ? '股东' : '员工'),
      role: currentUser.value.role,
      name: currentUser.value.displayName,
      equity: currentUser.value.equityPercentage ? `${(currentUser.value.equityPercentage * 100).toFixed(0)}%` : null,
      heldFrom: heldFrom,
      heldName: heldFrom ? currentUser.value.displayName : null,
      isEmployee: currentUser.value.role === 'employee'
    };
  });

  // 检查权限
  const can = (action: string) => {
    if (!currentUser.value) return false;
    
    const role = currentUser.value.role;
    
    // 超管拥有所有权限
    if (role === 'admin') return true;
    
    // 股东权限
    if (role === 'boss') {
      const bossPermissions = [
        'view_cashier', 
        'view_finance', 
        'view_shift', 
        'view_data', 
        'view_products',
        'view_handover',
        'view_settings'
      ];
      return bossPermissions.includes(action);
    }
    
    // 员工权限
    if (role === 'employee') {
      const employeePermissions = [
        'view_cashier', 
        'view_shift', 
        'view_data',
        'view_handover'
      ];
      return employeePermissions.includes(action);
    }
    
    return false;
  };

  return {
    currentUser,
    pendingRedirect,
    isLoginRequired,
    isAuthenticated,
    fetchPickList,
    login,
    employeeLogin,
    mojianLogin,
    bossLogin,
    logout,
    userProfile,
    can,
  };
});
