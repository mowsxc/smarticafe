<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useSettingsStore } from '../stores/settings';
import { useToast } from '../composables/useToast';

const authStore = useAuthStore();
const settingsStore = useSettingsStore();
const router = useRouter();
const { error, success } = useToast();

const isBootstrapping = ref(false);
const isLoading = ref(true);

// --- 智能登录数据 ---
const searchName = ref('');
const password = ref('');
const isPasswordVisible = ref(false);
const showPasswordInput = ref(false);
const activeUser = ref<any>(null);
const employees = ref<string[]>([]);
const bosses = ref<string[]>([]);

// --- 初始化数据 ---
const bootstrap = ref({
  pickName: '',
  displayName: '',
  password: '',
  brandName: '我的数字电竞',
  storeName: '总店'
});

const checkInit = async () => {
  isLoading.value = true;
  try {
    const required = await authStore.bootstrapRequired();
    isBootstrapping.value = required;
    if (!required) {
      const list = await authStore.fetchPickList();
      employees.value = list.employees;
      bosses.value = list.bosses;
    }
  } finally {
    isLoading.value = false;
  }
};

onMounted(checkInit);

// --- 自动校验与登录 ---
const handleNameChange = async () => {
  const name = searchName.value.trim();
  if (!name) {
    showPasswordInput.value = false;
    activeUser.value = null;
    return;
  }

  // 1. 检查是否是员工
  if (employees.value.includes(name)) {
    // 员工免密：直接冲！
    try {
      await authStore.employeeLogin(name);
      success(`欢迎回来，${name}`);
      router.push('/');
    } catch (e: any) {
      error(e.message || '登录异常');
    }
    return;
  }

  // 2. 检查是否是股东/超管
  if (bosses.value.includes(name)) {
    showPasswordInput.value = true;
    activeUser.value = { name, role: 'boss' };
  } else {
    showPasswordInput.value = false;
    activeUser.value = null;
  }
};

const handleBossLogin = async () => {
  if (!activeUser.value || !password.value) return;
  try {
    await authStore.login(activeUser.value.name, password.value);
    success(`登录成功，尊贵的 ${activeUser.value.name}`);
    router.push('/');
  } catch (e: any) {
    error(e.message || '密码错误');
  }
};

const handleBootstrap = async () => {
  if (!bootstrap.value.pickName || !bootstrap.value.password || !bootstrap.value.brandName) {
    error('请填写完整初始化信息');
    return;
  }
  try {
    await authStore.bootstrapAdmin(bootstrap.value);
    success('系统初始化成功！');
    await checkInit(); // 重新加载进入登录状态
  } catch (e: any) {
    error(e.message || '初始化失败');
  }
};

// 被选中的建议
const selectSuggest = (name: string) => {
  searchName.value = name;
  handleNameChange();
};

const suggests = computed(() => {
  const query = searchName.value.toLowerCase().trim();
  const all = [...bosses.value, ...employees.value];
  if (!query) return all.slice(0, 8);
  return all.filter(n => n.toLowerCase().includes(query)).slice(0, 8);
});
</script>

<template>
  <div class="fixed inset-0 bg-[#0f172a] text-slate-200 overflow-hidden flex items-center justify-center p-4">
    <!-- 动态背景背景 -->
    <div class="absolute inset-0 z-0">
      <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 blur-[120px] rounded-full"></div>
      <div class="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full"></div>
      <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
    </div>

    <!-- 主卡片 -->
    <div v-if="!isLoading" class="relative z-10 w-full max-w-[440px] animate-in fade-in zoom-in duration-700">
      
      <!-- 品牌标识项 (保持不变) -->
      <div class="text-center mb-8">
        <div class="w-24 h-24 bg-linear-to-tr from-brand-orange to-orange-400 rounded-[32px] mx-auto flex items-center justify-center shadow-2xl shadow-orange-500/30 mb-8 group hover:rotate-12 transition-all duration-700 active:scale-90">
          <span class="text-6xl text-white font-black italic tracking-tighter">S</span>
        </div>
        <h1 class="text-4xl font-black text-white tracking-tight uppercase">{{ isBootstrapping ? '系统初始化' : (settingsStore.brandSettings.brandName || 'Smarticafe') }}</h1>
        <p class="text-orange-500 mt-3 font-black tracking-[0.4em] uppercase text-[10px] opacity-80">
          {{ isBootstrapping ? 'Initialize Smarticafe OS' : (settingsStore.brandSettings.storeName || 'Digital Hub') }}
        </p>
      </div>

      <!-- 品牌标识项 (保持不变) -->
      <div class="text-center mb-8">
        <div class="w-24 h-24 bg-linear-to-tr from-brand-orange to-orange-400 rounded-[32px] mx-auto flex items-center justify-center shadow-2xl shadow-orange-500/30 mb-8 group hover:rotate-12 transition-all duration-700 active:scale-90">
          <span class="text-6xl text-white font-black italic tracking-tighter">S</span>
        </div>
        <h1 class="text-4xl font-black text-white tracking-tight uppercase">{{ isBootstrapping ? '系统初始化' : (settingsStore.brandSettings.brandName || 'Smarticafe') }}</h1>
        <p class="text-orange-500 mt-3 font-black tracking-[0.4em] uppercase text-[10px] opacity-80">
          {{ isBootstrapping ? 'Step Into Future' : (settingsStore.brandSettings.storeName || 'DIGITAL HUB') }}
        </p>
      </div>

      <!-- 内容区：初始化模式 (高级白版本) -->
      <div v-if="isBootstrapping" class="bg-white rounded-[48px] p-10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)] space-y-8 animate-in slide-in-from-bottom-12 duration-1000">
        
        <!-- 分组1: 品牌信息 -->
        <div class="space-y-4">
           <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">01. Identity / 品牌设定</div>
           <div class="grid grid-cols-1 gap-3">
              <input v-model="bootstrap.brandName" type="text" placeholder="品牌名 (如: 创新意电竞)" class="w-full bg-slate-50 border-2 border-slate-50 rounded-[28px] h-16 px-8 text-slate-800 font-bold placeholder:text-slate-300 focus:border-brand-orange/20 focus:bg-white outline-none transition-all" />
              <input v-model="bootstrap.storeName" type="text" placeholder="门店名 (如: 旗舰店)" class="w-full bg-slate-50 border-2 border-slate-50 rounded-[28px] h-16 px-8 text-slate-800 font-bold placeholder:text-slate-300 focus:border-brand-orange/20 focus:bg-white outline-none transition-all" />
           </div>
        </div>

        <!-- 分组2: 超级管理员 -->
        <div class="space-y-4 pt-4 border-t border-slate-100">
           <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">02. Master / 超管账号</div>
           <div class="grid grid-cols-2 gap-3">
              <input v-model="bootstrap.pickName" type="text" placeholder="登录账号" class="bg-slate-50 border-2 border-slate-50 rounded-[28px] h-16 px-8 text-slate-800 font-bold outline-none focus:border-brand-orange/20 focus:bg-white transition-all" />
              <input v-model="bootstrap.displayName" type="text" placeholder="显示姓名" class="bg-slate-50 border-2 border-slate-50 rounded-[28px] h-16 px-8 text-slate-800 font-bold outline-none focus:border-brand-orange/20 focus:bg-white transition-all" />
           </div>
           <input v-model="bootstrap.password" type="password" placeholder="设置全平台管理密码" class="w-full bg-slate-50 border-2 border-slate-50 rounded-[28px] h-16 px-8 text-slate-800 font-bold focus:border-brand-orange/20 focus:bg-white outline-none transition-all" />
        </div>

        <button @click="handleBootstrap" class="w-full h-20 bg-gray-900 hover:bg-black text-white font-black text-xl rounded-[32px] shadow-2xl active:scale-95 transition-all">
          完成初始化
        </button>

        <p class="text-center text-[9px] font-bold text-slate-300 uppercase tracking-widest">Enterprise Edition • Smarticafe OS</p>
      </div>

      <!-- 内容区：智能登录模式 (高级白版本) -->
      <div v-else class="bg-white rounded-[48px] p-12 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)]">
        <div class="space-y-6">
          <div class="relative group">
            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-3 block text-center">Identity / 身份验证</label>
            <input 
              v-model="searchName" 
              @input="handleNameChange"
              type="text" 
              placeholder="输入或选择姓名" 
              class="w-full bg-slate-50 border-2 border-slate-50 rounded-[32px] h-20 px-8 text-2xl font-black text-slate-800 placeholder:text-slate-200 focus:border-brand-orange/20 focus:bg-white outline-none transition-all text-center"
            />
            
            <div v-if="!showPasswordInput && suggests.length > 0" class="flex flex-wrap justify-center gap-2 mt-8">
               <button 
                v-for="name in suggests" 
                :key="name"
                @click="selectSuggest(name)"
                class="px-5 py-3 rounded-full bg-slate-50 border border-slate-100 hover:border-brand-orange/30 hover:bg-brand-orange/5 text-xs font-black text-slate-500 hover:text-brand-orange transition-all"
               >
                 {{ name }}
               </button>
            </div>
          </div>

          <div v-if="showPasswordInput" class="animate-in slide-in-from-top-4 fade-in duration-500">
             <div class="relative group">
                <input 
                  v-model="password" 
                  @keyup.enter="handleBossLogin"
                  :type="isPasswordVisible ? 'text' : 'password'" 
                  placeholder="请输入管理密码" 
                  class="w-full bg-slate-50 border-2 border-brand-orange/20 rounded-[32px] h-20 px-8 text-center text-xl font-mono focus:border-brand-orange focus:bg-white outline-none transition-all shadow-xl shadow-orange-500/5"
                  autofocus
                />
             </div>
             <button @click="handleBossLogin" class="w-full h-20 bg-brand-orange hover:bg-orange-500 text-white font-black text-xl rounded-[32px] mt-6 shadow-2xl shadow-orange-500/30 active:scale-95 transition-all">
                确认登录
             </button>
             <button @click="searchName = ''; showPasswordInput = false" class="w-full mt-6 text-[10px] font-black text-slate-300 hover:text-slate-400 transition-colors uppercase tracking-widest">
                ← 返回选择
             </button>
          </div>
          
          <div v-if="!showPasswordInput" class="text-center pt-10">
             <div class="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-slate-50 text-[10px] font-black text-slate-400 border border-slate-100">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                SYSTEM SECURED
             </div>
          </div>
        </div>
      </div>

    </div>

    <!-- 加载中 -->
    <div v-else class="text-center space-y-4">
      <div class="w-12 h-12 border-4 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin mx-auto"></div>
      <p class="text-xs font-bold text-slate-500 animate-pulse">验证系统核心...</p>
    </div>
  </div>
</template>

<style scoped>
.animate-bounce-slow {
  animation: bounce 3s infinite;
}
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
</style>
