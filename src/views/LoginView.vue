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
      
      <!-- 品牌标识项 -->
      <div class="text-center mb-10">
        <div class="w-20 h-20 bg-linear-to-tr from-brand-orange to-orange-400 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-orange-500/20 mb-6 group hover:rotate-12 transition-transform duration-500">
          <span class="text-4xl text-white font-black italic">S</span>
        </div>
        <h1 class="text-3xl font-black text-white tracking-tight">{{ isBootstrapping ? '系统初始化' : (settingsStore.brandSettings.brandName || 'Smarticafe') }}</h1>
        <p class="text-slate-400 mt-2 font-medium tracking-wide uppercase text-xs">
          {{ isBootstrapping ? 'FIRST-TIME SETUP' : (settingsStore.brandSettings.storeName || 'DIGITAL ESPORTS HUB') }}
        </p>
      </div>

      <!-- 内容区：初始化模式 -->
      <div v-if="isBootstrapping" class="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[40px] p-8 shadow-2xl space-y-5">
        <div class="space-y-4">
          <div class="group relative">
            <input v-model="bootstrap.brandName" type="text" placeholder="品牌名称 (如：创新意电竞)" class="w-full bg-white/5 border border-white/10 rounded-2xl h-14 px-6 text-sm focus:border-brand-orange/50 focus:bg-white/10 outline-none transition-all" />
          </div>
          <div class="group relative">
            <input v-model="bootstrap.storeName" type="text" placeholder="门店名称 (如：旗舰店)" class="w-full bg-white/5 border border-white/10 rounded-2xl h-14 px-6 text-sm focus:border-brand-orange/50 focus:bg-white/10 outline-none transition-all" />
          </div>
          <div class="h-px bg-white/5 my-2"></div>
          <div class="grid grid-cols-2 gap-4">
            <input v-model="bootstrap.pickName" type="text" placeholder="管理员账号" class="bg-white/5 border border-white/10 rounded-2xl h-14 px-6 text-sm outline-none focus:border-brand-orange/50 transition-all" />
            <input v-model="bootstrap.displayName" type="text" placeholder="显示姓名" class="bg-white/5 border border-white/10 rounded-2xl h-14 px-6 text-sm outline-none focus:border-brand-orange/50 transition-all" />
          </div>
          <input v-model="bootstrap.password" type="password" placeholder="设置平台密码" class="w-full bg-white/5 border border-white/10 rounded-2xl h-14 px-6 text-sm focus:border-brand-orange/50 outline-none transition-all" />
        </div>
        <button @click="handleBootstrap" class="w-full h-14 bg-brand-orange hover:bg-orange-500 text-white font-bold rounded-2xl shadow-xl shadow-orange-500/20 active:scale-[0.98] transition-all">
          完成初始化并进入
        </button>
      </div>

      <!-- 内容区：智能登录模式 -->
      <div v-else class="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[40px] p-10 shadow-2xl">
        <div class="space-y-6">
          <!-- 名字输入与自动建议 -->
          <div class="relative group">
            <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-2 block text-center">Identity / 身份验证</label>
            <input 
              v-model="searchName" 
              @input="handleNameChange"
              type="text" 
              placeholder="输入或选择姓名" 
              class="w-full bg-white/5 border-2 border-white/5 rounded-3xl h-16 px-8 text-lg font-bold text-white placeholder:text-slate-600 focus:border-brand-orange/40 focus:bg-white/10 outline-none transition-all text-center"
            />
            
            <!-- 快捷建议列表 -->
            <div v-if="!showPasswordInput && suggests.length > 0" class="flex flex-wrap justify-center gap-2 mt-6">
               <button 
                v-for="name in suggests" 
                :key="name"
                @click="selectSuggest(name)"
                class="px-4 py-2 rounded-full bg-white/5 border border-white/5 hover:border-brand-orange/40 hover:bg-brand-orange/10 text-xs font-semibold text-slate-400 hover:text-brand-orange transition-all"
               >
                 {{ name }}
               </button>
            </div>
          </div>

          <!-- 密码输入区 (仅在需要时动画滑出) -->
          <div v-if="showPasswordInput" class="animate-in slide-in-from-top-4 fade-in duration-500">
             <div class="relative group">
                <input 
                  v-model="password" 
                  @keyup.enter="handleBossLogin"
                  :type="isPasswordVisible ? 'text' : 'password'" 
                  placeholder="请输入密码" 
                  class="w-full bg-white/10 border-2 border-brand-orange/30 rounded-3xl h-16 px-8 text-center text-lg font-mono focus:border-brand-orange outline-none transition-all shadow-2xl shadow-orange-500/10"
                  autofocus
                />
                <button 
                  @click="isPasswordVisible = !isPasswordVisible" 
                  class="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 hover:text-brand-orange"
                >
                  {{ isPasswordVisible ? '🔒' : '👁️' }}
                </button>
             </div>
             <button @click="handleBossLogin" class="w-full h-16 bg-brand-orange hover:bg-orange-500 text-white font-black text-lg rounded-3xl mt-6 shadow-2xl shadow-orange-500/30 active:scale-95 transition-all">
                进入系统
             </button>
             <button @click="searchName = ''; showPasswordInput = false" class="w-full mt-4 text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-widest">
                返回重选
             </button>
          </div>
          
          <div v-if="!showPasswordInput" class="text-center pt-8">
             <div class="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-slate-400/5 text-[10px] font-bold text-slate-500 border border-white/5">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                SMARTICAFE OS v2.0.0 SECURED
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
