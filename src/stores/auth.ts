import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { getSyncService } from '../services/supabase/client';
import { tauriCmd } from '../utils/tauri';
import { useSettingsStore } from './settings';

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
  token?: string;
}

type TauriAuthSession = {
  account_id: string;
  role: string;
  identity: string;
  name: string;
  equity: number;
  token: string;
};

type AuthPickList = {
  employees: string[];
  bosses: string[];
};

type BootstrapAdminInput = {
  pick_name: string;
  display_name: string;
  password: string;
};

export const useAuthStore = defineStore('auth', () => {
  const settingsStore = useSettingsStore();
  settingsStore.init();

  // Init from storage
  const storedUser = localStorage.getItem('auth_user');
  const currentUser = ref<User | null>(storedUser ? JSON.parse(storedUser) : null);
  const pendingRedirect = ref<string | null>(null);
  const isLoginRequired = ref(false);
  
  const isAuthenticated = computed(() => !!currentUser.value);

  const saveToStorage = (user: User) => {
    localStorage.setItem('auth_user', JSON.stringify(user));
  };

  const bootstrapRequired = async () => {
    try {
      return await tauriCmd<boolean>('auth_bootstrap_required');
    } catch {
      return false;
    }
  };

  const bootstrapAdmin = async (input: { pickName: string; displayName: string; password: string }) => {
    const payload: BootstrapAdminInput = {
      pick_name: String(input.pickName || '').trim(),
      display_name: String(input.displayName || '').trim(),
      password: String(input.password || '').trim(),
    };
    if (!payload.pick_name || !payload.display_name || !payload.password) {
      throw new Error('请输入完整信息');
    }

    const session = await tauriCmd<TauriAuthSession>('auth_bootstrap_admin', payload as any);
    const user: User = {
      id: session?.account_id || `auth_${payload.pick_name}`,
      username: payload.pick_name,
      role: 'admin',
      displayName: session?.name || payload.display_name,
      token: session?.token,
    };
    currentUser.value = user;
    saveToStorage(user);

    try {
      const syncService = getSyncService();
      // 获取完整的账号信息用于同步到云端
      const accounts = await tauriCmd<any[]>('auth_accounts_list', { token: user.token });
      const myAccount = accounts.find(a => a.id === user.id);
      if (myAccount) {
        syncService.enqueue({
          table: 'auth_accounts',
          operation: 'upsert',
          data: myAccount,
        });
      }
      
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
      console.error('Failed to sync login/account to Supabase:', error);
    }
  };

  // 员工免密登录
  const employeeLogin = async (name: string) => {
    if (!settingsStore.businessSettings.passwordlessAll) {
      throw new Error('已关闭全员免密，请使用标准登录输入密码');
    }
    const session = await tauriCmd<TauriAuthSession>('auth_employee_login', { pick_name: name });
    const token = session?.token;

    const user: User = {
      id: session?.account_id || `emp_${name}`,
      username: name,
      role: 'employee',
      displayName: session?.name || name,
      token,
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

  const authLogin = async (pickName: string, password: string) => {
    const session = await tauriCmd<TauriAuthSession>('auth_login', {
      input: {
        pick_name: pickName,
        password,
      },
    });

    const role = (session?.role as User['role']) || 'boss';
    const user: User = {
      id: session?.account_id || `auth_${pickName}`,
      username: pickName,
      role,
      displayName: session?.name || pickName,
      token: session?.token,
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
    try {
      const list = await tauriCmd<AuthPickList>('auth_pick_list');
      const employees = Array.isArray(list?.employees) ? list.employees : [];
      const bosses = Array.isArray(list?.bosses) ? list.bosses : [];
      return { employees, bosses };
    } catch {
      return { employees: [], bosses: [] };
    }
  };

  const login = async (pickName: string, password: string) => {
    const name = String(pickName || '').trim();
    const pwd = String(password || '').trim();
    if (!name) throw new Error('请选择用户');

    const { employees, bosses } = await fetchPickList();
    if (employees.includes(name)) {
      if (!settingsStore.businessSettings.passwordlessAll) {
        throw new Error('已关闭全员免密，请使用标准登录输入密码');
      }
      try {
        await employeeLogin(name);
        return;
      } catch (e: any) {
        const msg = String(e?.message || '登录失败');
        if (msg.includes('unauthorized')) throw new Error('未授权的员工账号');
        throw new Error(msg);
      }
    }

    if (bosses.includes(name)) {
      if (!pwd) throw new Error('请输入密码');
      try {
        await authLogin(name, pwd);
        return;
      } catch (e: any) {
        const msg = String(e?.message || '登录失败');
        if (msg.startsWith('no_account:')) throw new Error('用户名不存在');
        if (msg.includes('bad_password')) throw new Error('密码错误');
        throw new Error(msg);
      }
    }

    throw new Error('用户名不存在');
  };

  // 获取角色显示的各种独立属性
  const userProfile = computed(() => {
    if (!currentUser.value) return null;
    return {
      roleLabel: currentUser.value.role === 'admin' ? '超管' : (currentUser.value.role === 'boss' ? '股东' : '员工'),
      role: currentUser.value.role,
      name: currentUser.value.displayName,
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
    bootstrapRequired,
    bootstrapAdmin,
    logout,
    userProfile,
    can,
  };
});
