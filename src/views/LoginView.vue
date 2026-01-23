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

      <!-- 品牌标识项 (参照截图：极致极简) -->
      <div class="text-center mb-16">
        <div class="w-40 h-40 bg-brand-orange rounded-[48px] mx-auto flex items-center justify-center shadow-2xl shadow-orange-500/20 mb-12">
          <span class="text-8xl text-white font-black">S</span>
        </div>
        <h1 class="text-5xl font-black text-slate-800 tracking-tighter mb-4">{{ isBootstrapping ? 'Smarticafe' : (settingsStore.brandSettings.brandName || 'Smarticafe') }}</h1>
        <p class="text-slate-400 font-bold text-lg">请先完成身份验证以进入系统</p>
      </div>

      <!-- 内容区：初始化模式 (极致白色卡片版) -->
      <div v-if="isBootstrapping" class="bg-white rounded-[56px] p-12 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.15)] space-y-10 animate-in slide-in-from-bottom-12 duration-1000">
        <!-- 分组1: 品牌信息 -->
        <div class="space-y-6">
           <div class="text-[11px] font-black text-slate-300 uppercase tracking-widest ml-4">Step 01. Brand Design / 品牌设定</div>
           <div class="grid grid-cols-1 gap-4">
              <input v-model="bootstrap.brandName" type="text" placeholder="设置品牌名称" class="w-full bg-slate-50 rounded-[28px] h-20 px-10 text-xl font-bold placeholder:text-slate-200 focus:bg-white border-2 border-transparent focus:border-brand-orange/20 outline-none transition-all" />
              <input v-model="bootstrap.storeName" type="text" placeholder="设置门店名称" class="w-full bg-slate-50 rounded-[28px] h-20 px-10 text-xl font-bold placeholder:text-slate-200 focus:bg-white border-2 border-transparent focus:border-brand-orange/20 outline-none transition-all" />
           </div>
        </div>

        <!-- 分组2: 超级管理员 -->
        <div class="space-y-6 pt-8 border-t border-slate-50">
           <div class="text-[11px] font-black text-slate-300 uppercase tracking-widest ml-4">Step 02. Administrator / 超级管理</div>
           <div class="grid grid-cols-2 gap-4">
              <input v-model="bootstrap.pickName" type="text" placeholder="管理账号" class="bg-slate-50 rounded-[28px] h-20 px-10 text-xl font-bold outline-none focus:bg-white border-2 border-transparent focus:border-brand-orange/20 transition-all" />
              <input v-model="bootstrap.displayName" type="text" placeholder="显示姓名" class="bg-slate-50 rounded-[28px] h-20 px-10 text-xl font-bold outline-none focus:bg-white border-2 border-transparent focus:border-brand-orange/20 transition-all" />
           </div>
           <input v-model="bootstrap.password" type="password" placeholder="设置管理密码" class="w-full bg-slate-50 rounded-[28px] h-20 px-10 text-xl font-bold outline-none focus:bg-white border-2 border-transparent focus:border-brand-orange/20 transition-all" />
        </div>

        <button @click="handleBootstrap" class="w-full h-24 bg-slate-900 hover:bg-black text-white font-black text-2xl rounded-[32px] shadow-2xl active:scale-95 transition-all">
          激活并进入系统
        </button>
      </div>

      <!-- 内容区：智能登录模式 (极致白色卡片版) -->
      <div v-else class="bg-white rounded-[56px] p-12 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.15)]">
        <div class="space-y-10">
          <div class="relative group">
            <label class="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em] ml-1 mb-4 block text-center">Verify Identity / 身份验证</label>
            <input 
              v-model="searchName" 
              @input="handleNameChange"
              type="text" 
              placeholder="输入或选择姓名" 
              class="w-full bg-slate-50 border-2 border-slate-50 rounded-[40px] h-24 px-10 text-3xl font-black text-slate-800 placeholder:text-slate-200 focus:border-brand-orange/20 focus:bg-white outline-none transition-all text-center placeholder:font-bold"
            />
            
            <div v-if="!showPasswordInput && suggests.length > 0" class="flex flex-wrap justify-center gap-3 mt-10">
               <button 
                v-for="name in suggests" 
                :key="name"
                @click="selectSuggest(name)"
                class="px-8 py-4 rounded-full bg-slate-50 border border-slate-100 hover:border-brand-orange/30 hover:bg-brand-orange/5 text-sm font-black text-slate-500 hover:text-brand-orange transition-all shadow-sm active:scale-95"
               >
                 {{ name }}
               </button>
            </div>
          </div>

          <div v-if="showPasswordInput" class="animate-in slide-in-from-top-6 fade-in duration-700">
             <div class="relative group">
                <input 
                  v-model="password" 
                  @keyup.enter="handleBossLogin"
                  :type="isPasswordVisible ? 'text' : 'password'" 
                  placeholder="请输入管理密码" 
                  class="w-full bg-slate-50 border-2 border-brand-orange/20 rounded-[40px] h-24 px-10 text-center text-3xl font-mono focus:border-brand-orange focus:bg-white outline-none transition-all shadow-xl shadow-orange-500/5 placeholder:text-slate-200"
                  autofocus
                />
             </div>
             <button @click="handleBossLogin" class="w-full h-24 bg-brand-orange hover:bg-orange-500 text-white font-black text-2xl rounded-[40px] mt-8 shadow-2xl shadow-orange-500/30 active:scale-95 transition-all">
                确认并进入系统
             </button>
             <button @click="searchName = ''; showPasswordInput = false" class="w-full mt-8 text-[11px] font-black text-slate-300 hover:text-slate-400 transition-colors uppercase tracking-[0.2em]">
                ← Back to Selection / 返回
             </button>
          </div>
          
          <div v-if="!showPasswordInput" class="text-center pt-12">
             <div class="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-slate-50 text-[11px] font-black text-slate-300 border border-slate-100">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.4)]"></span>
                SYSTEM SECURED BY SMARTICAFE
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
