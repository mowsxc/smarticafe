import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { getSyncService } from '../services/supabase/client';
import { ACCOUNTS } from '../config/accounts';
import type { ShareholderAccount } from '../config/accounts.example';
import { tauriCmd } from '../utils/tauri';

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
    let token: string | undefined;
    try {
      const session = await tauriCmd<TauriAuthSession>('auth_employee_login', { pick_name: name });
      token = session?.token;
    } catch {
      token = undefined;
    }

    const user: User = {
      id: `emp_${name}`,
      username: name,
      role: 'employee',
      displayName: name,
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

  const shareholderLogin = async (account: ShareholderAccount, password: string) => {
    let token: string | undefined;
    try {
      const session = await tauriCmd<TauriAuthSession>('auth_login', {
        input: {
          pick_name: account.displayName,
          password,
        },
      });
      token = session?.token;
    } catch {
      token = undefined;
    }

    const user: User = {
      id: `shareholder_${account.loginKey}`,
      username: account.loginKey,
      role: account.role,
      displayName: account.displayName,
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
    const employees = ACCOUNTS.employees.map((e) => e.username);
    const bosses = ACCOUNTS.shareholders.map((s) => s.displayName);
    return { employees, bosses };
  };

  const login = async (pickName: string, password: string) => {
    const name = String(pickName || '').trim();
    const pwd = String(password || '').trim();
    if (!name) throw new Error('请选择用户');

    const employees = ACCOUNTS.employees.map((e) => e.username);
    if (employees.includes(name)) {
      await employeeLogin(name);
      return;
    }

    const shareholder = ACCOUNTS.shareholders.find((s) => s.displayName === name);
    if (shareholder) {
      if (!pwd) throw new Error('请输入密码');
      if (pwd !== shareholder.loginKey) throw new Error('密码错误');
      await shareholderLogin(shareholder, pwd);
      return;
    }

    throw new Error('不支持的用户');
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
    logout,
    userProfile,
    can,
  };
});
