<template>
  <div class="h-full flex flex-col gap-6 p-8 bg-transparent overflow-hidden">
    <!-- Header Area -->
    <div class="flex items-center justify-between shrink-0">
      <div class="flex flex-col">
        <h1 class="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-3">
          <span class="text-2xl">👥</span> 核心人力资源架构
        </h1>
        <div class="flex items-center gap-2 mt-1">
          <span class="text-[10px] font-black text-orange-500 uppercase tracking-[0.4em] opacity-70">Human Resources Node Control</span>
          <div class="w-1 h-1 rounded-full bg-gray-300"></div>
          <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">管理所有系统授权单位</span>
        </div>
      </div>
      <button 
        @click="showAddDialog = true"
        class="h-12 px-8 bg-brand-orange text-white rounded-xl font-black text-sm shadow-xl shadow-orange-100/50 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
      >
        <span class="text-xl">+</span> 新增节点用户
      </button>
    </div>

    <!-- User Grid: Glass Cards -->
    <div class="flex-1 overflow-y-auto custom-scrollbar pr-2">
      <!-- Loading State -->
      <div v-if="loading" class="flex flex-col items-center justify-center h-64 gap-4">
        <div class="w-12 h-12 border-[3px] border-gray-100 border-t-brand-orange rounded-full animate-spin shadow-lg"></div>
        <span class="text-[12px] font-black uppercase tracking-[0.4em] text-gray-400 animate-pulse">Loading Users...</span>
      </div>
      
      <!-- Empty State -->
      <div v-else-if="users.length === 0" class="flex flex-col items-center justify-center h-64 gap-4">
        <div class="w-16 h-16 rounded-3xl bg-gray-100 flex items-center justify-center text-3xl">👥</div>
        <span class="text-[12px] font-black uppercase tracking-[0.4em] text-gray-400">No Users Found</span>
      </div>
      
      <!-- User Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-8">
        <div 
          v-for="user in users" 
          :key="user.id"
          class="glass-panel rounded-[32xl] p-6 border border-white/60 hover:border-brand-orange/30 shadow-xl shadow-black/[0.02] hover:shadow-orange-200/20 transition-all group relative overflow-hidden flex flex-col h-full"
        >
          <!-- Role Indicator Stripe -->
          <div :class="['absolute top-0 right-0 w-24 h-24 -mr-12 -mt-12 rounded-full opacity-10 blur-xl', getRoleColorClass(user.role)]"></div>
          
          <div class="relative z-10 flex flex-col h-full">
            <!-- User Header -->
            <div class="flex items-start justify-between mb-6">
              <div class="flex items-center gap-4">
                <div class="relative">
                  <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-gray-100 to-white flex items-center justify-center text-gray-800 font-black text-xl shadow-inner border border-white">
                    {{ (user.display_name[0] || 'U').toUpperCase() }}
                  </div>
                  <div :class="['absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-sm', user.is_active ? 'bg-emerald-500' : 'bg-gray-300']"></div>
                </div>
                <div class="flex flex-col">
                  <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">NODE IDENTITY</span>
                  <div class="font-black text-gray-800 text-[16px] tracking-tight group-hover:text-brand-orange transition-colors">{{ user.display_name }}</div>
                  <div class="text-[10px] font-mono font-bold text-gray-400">@{{ user.pick_name }}</div>
                </div>
              </div>
              <span :class="['px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm', getRoleBadgeClass(user.role)]">
                {{ user.role }}
              </span>
            </div>

            <!-- Profile Info Matrix -->
            <div class="grid grid-cols-2 gap-3 mb-8">
               <div class="bg-white/40 rounded-2xl p-3 border border-white/60">
                 <span class="text-[8px] font-black text-gray-300 uppercase tracking-widest block mb-1">职位 Title</span>
                 <span class="text-xs font-black text-gray-600 block truncate">{{ user.identity }}</span>
               </div>
               <div class="bg-white/40 rounded-2xl p-3 border border-white/60">
                 <span class="text-[8px] font-black text-gray-300 uppercase tracking-widest block mb-1">股权 Equity</span>
                 <span class="text-xs font-mono font-black" :class="user.equity > 0 ? 'text-brand-orange' : 'text-gray-400'">
                   {{ user.equity > 0 ? (user.equity * 100).toFixed(1) + '%' : 'N/A' }}
                 </span>
               </div>
            </div>

            <!-- Action Cluster -->
            <div class="mt-auto flex gap-2">
              <button 
                @click="resetPassword(user)"
                class="flex-1 h-10 rounded-xl bg-white border border-gray-100 text-[10px] font-black text-gray-500 uppercase tracking-widest hover:bg-brand-dark hover:text-white hover:border-brand-dark transition-all active:scale-95 shadow-sm"
              >
                Reset PWD
              </button>
              <button 
                @click="toggleUserStatus(user)"
                :class="[
                  'w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90',
                  user.is_active ? 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-500 hover:text-white'
                ]"
              >
                 <svg v-if="user.is_active" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18.36 6.64a9 9 0 11-12.73 0M12 2v10"/></svg>
                 <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12l5 5L20 7"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Premium Add User Dialog -->
    <Transition name="fade">
      <div v-if="showAddDialog" class="fixed inset-0 z-[100] modal-backdrop flex items-center justify-center p-6" @click.self="showAddDialog = false">
        <Transition name="scale" appear>
          <div class="glass-card rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col border border-white/60">
            <div class="px-10 py-8 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white/40">
               <div class="flex flex-col">
                 <span class="font-black text-2xl text-gray-800 tracking-tight">初始化新节点</span>
                 <span class="text-[10px] font-black text-orange-500 uppercase tracking-[0.4em]">IAM New Node Initialization</span>
               </div>
               <button @click="showAddDialog = false" class="w-12 h-12 rounded-full hover:bg-black/5 flex items-center justify-center text-gray-400 transition-all active:scale-90">✕</button>
            </div>
            
            <form @submit.prevent="saveUser" class="p-10 bg-white/40 backdrop-blur-md overflow-y-auto custom-scrollbar flex flex-col gap-6">
              <div class="grid grid-cols-2 gap-6">
                <div class="flex flex-col gap-2">
                  <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">拾取名 Pick Name</label>
                  <input v-model="formData.pick_name" required placeholder="作为登录唯一ID" class="h-12 px-5 bg-white/60 rounded-2xl border border-white focus:border-brand-orange/40 focus:ring-4 focus:ring-orange-500/10 outline-none font-black text-gray-700 transition-all shadow-sm" />
                </div>
                <div class="flex flex-col gap-2">
                  <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">显示名称 Display Name</label>
                  <input v-model="formData.display_name" required placeholder="用户对外称呼" class="h-12 px-5 bg-white/60 rounded-2xl border border-white focus:border-brand-orange/40 focus:ring-4 focus:ring-orange-500/10 outline-none font-black text-gray-700 transition-all shadow-sm" />
                </div>
                <div class="flex flex-col gap-2">
                  <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">物理身份 Title</label>
                  <input v-model="formData.identity" required placeholder="收银员 / 经理 / 股东" class="h-12 px-5 bg-white/60 rounded-2xl border border-white focus:border-brand-orange/40 focus:ring-4 focus:ring-orange-500/10 outline-none font-black text-gray-700 transition-all shadow-sm" />
                </div>
                <div class="flex flex-col gap-2">
                  <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">系统角色 Role</label>
                  <select v-model="formData.role" required class="h-12 px-5 bg-white/60 rounded-2xl border border-white focus:border-brand-orange/40 focus:ring-4 focus:ring-orange-500/10 outline-none font-black text-gray-700 transition-all shadow-sm cursor-pointer">
                    <option value="employee">普通员工 Unit</option>
                    <option value="boss">股份节点 Boss</option>
                    <option value="admin">最高权限 Root</option>
                  </select>
                </div>
              </div>
              
              <div v-if="formData.role === 'boss'" class="flex flex-col gap-2 animate-slide-up">
                <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">股权权重 Share Equity (%)</label>
                <input v-model.number="formData.equity" type="number" step="0.1" min="0" max="100" class="h-12 px-5 bg-white/60 rounded-2xl border border-white focus:border-brand-orange/40 focus:ring-4 focus:ring-orange-500/10 outline-none font-mono font-black text-brand-orange transition-all shadow-sm text-lg" />
              </div>

              <div class="flex flex-col gap-2">
                <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">初始访问秘钥 Initial PWD</label>
                <input v-model="formData.password" type="password" required class="h-12 px-5 bg-white/60 rounded-2xl border border-white focus:border-brand-orange/40 focus:ring-4 focus:ring-orange-500/10 outline-none font-mono font-black text-gray-700 transition-all shadow-sm" />
              </div>
              
              <button type="submit" class="h-14 mt-4 bg-brand-dark text-white rounded-[20px] font-black tracking-[0.2em] shadow-2xl shadow-gray-200 hover:brightness-125 active:scale-95 transition-all">
                授权并发布节点 PUBLISH USER
              </button>
            </form>
          </div>
        </Transition>
      </div>
    </Transition>

    <!-- Reset Password Modal -->
    <Transition name="fade">
      <div v-if="showResetDialog" class="fixed inset-0 z-[110] modal-backdrop flex items-center justify-center p-6" @click.self="showResetDialog = false">
        <div class="glass-card rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl flex flex-col border border-white/60">
          <div class="px-8 py-6 border-b border-gray-100 bg-white/40">
            <span class="font-black text-xl text-gray-800 tracking-tight">重置访问秘钥</span>
          </div>
          <div class="p-8 flex flex-col gap-6 bg-white/40 backdrop-blur-md">
            <div class="flex flex-col gap-2">
              <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest">新密码 for {{ resettingUser?.display_name }}</label>
              <input v-model="newPwd" type="password" class="h-12 px-5 bg-white rounded-2xl border border-gray-100 outline-none font-mono" placeholder="至少4位" @keyup.enter="confirmReset" />
            </div>
            <div class="flex gap-3">
              <button @click="showResetDialog = false" class="flex-1 h-12 rounded-xl bg-gray-50 text-gray-400 font-bold">取消</button>
              <button @click="confirmReset" class="flex-1 h-12 rounded-xl bg-brand-orange text-white font-bold shadow-lg shadow-orange-100">确认修改</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useToast } from '../composables/useToast';

interface User {
  id: string;
  pick_name: string;
  display_name: string;
  role: 'admin' | 'boss' | 'employee';
  identity: string;
  equity: number;
  is_active: boolean;
}

const users = ref<User[]>([]);
const loading = ref(false);
const showAddDialog = ref(false);
const formData = ref({
  pick_name: '',
  display_name: '',
  identity: '',
  role: 'employee' as 'admin' | 'boss' | 'employee',
  equity: 0,
  password: '',
});

onMounted(async () => {
  await loadUsers();
});

const loadUsers = async () => {
  loading.value = true;
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 400));
  
  // Load users with real data structure
  users.value = [
    // 股东（明面）
    { id: '1', pick_name: 'mojian', display_name: '莫健', role: 'admin', identity: '老板/超管', equity: 0.25, is_active: true },
    { id: '2', pick_name: 'zhuxiaopei', display_name: '朱晓培', role: 'boss', identity: '股东', equity: 0.30, is_active: true },
    // 正式员工
    { id: '3', pick_name: 'huanghe', display_name: '黄河', role: 'employee', identity: '收银员', equity: 0, is_active: true },
    { id: '4', pick_name: 'liujie', display_name: '刘杰', role: 'employee', identity: '收银员', equity: 0, is_active: true },
    { id: '5', pick_name: 'jiazhenhua', display_name: '贾政华', role: 'employee', identity: '收银员', equity: 0, is_active: true },
    { id: '6', pick_name: 'qinjia', display_name: '秦佳', role: 'employee', identity: '收银员', equity: 0, is_active: true },
    { id: '7', pick_name: 'shihong', display_name: '史红', role: 'employee', identity: '收银员', equity: 0, is_active: true },
  ];
  loading.value = false;
};

const getRoleBadgeClass = (role: string) => {
  const classes: Record<string, string> = {
    admin: 'bg-red-50 text-red-500 border border-red-100',
    boss: 'bg-orange-50 text-brand-orange border border-orange-100',
    employee: 'bg-blue-50 text-blue-500 border border-blue-100',
  };
  return classes[role] || 'bg-gray-50 text-gray-500 border border-gray-100';
};

const getRoleColorClass = (role: string) => {
  const classes: Record<string, string> = {
    admin: 'bg-red-500',
    boss: 'bg-orange-500',
    employee: 'bg-blue-500',
  };
  return classes[role] || 'bg-gray-500';
};

const { success, warning } = useToast();
const showResetDialog = ref(false);
const resettingUser = ref<User | null>(null);
const newPwd = ref('');

const resetPassword = (user: User) => {
  resettingUser.value = user;
  newPwd.value = '';
  showResetDialog.value = true;
};

const confirmReset = async () => {
  if (!resettingUser.value) return;
  if (newPwd.value.length < 4) {
    warning('密码长度至少需要4个字符');
    return;
  }
  
  // TODO: API Call
  success(`✅ ${resettingUser.value.display_name} 的密码已重置`);
  showResetDialog.value = false;
};

const toggleUserStatus = async (user: User) => {
  user.is_active = !user.is_active;
  const status = user.is_active ? '启用' : '禁用';
  success(`用户 ${user.display_name} 已${status}`);
};

const saveUser = async () => {
  if (!formData.value.pick_name || !formData.value.display_name) {
    warning('请填写必填字段');
    return;
  }
  
  const newUser: User = {
    id: Date.now().toString(),
    pick_name: formData.value.pick_name,
    display_name: formData.value.display_name,
    role: formData.value.role,
    identity: formData.value.identity,
    equity: formData.value.role === 'boss' ? formData.value.equity / 100 : 0,
    is_active: true,
  };
  
  users.value.unshift(newUser);
  success(`✅ 用户 ${newUser.display_name} 已创建\n\n登录ID: ${newUser.pick_name}`);
  
  showAddDialog.value = false;
  formData.value = {
    pick_name: '',
    display_name: '',
    identity: '',
    role: 'employee',
    equity: 0,
    password: '',
  };
};
</script>
