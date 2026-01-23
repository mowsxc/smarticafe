<template>
  <div class="min-h-screen w-full flex items-center justify-center bg-[#f8f9fa] p-6 relative overflow-hidden">
      <!-- Background Elements -->
      <div class="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-brand-orange/5 rounded-full blur-3xl"></div>
      <div class="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl"></div>

      <div class="w-full max-w-[500px] z-10 transition-all duration-500">
          
          <!-- Progress Header -->
          <div class="mb-8 flex items-center justify-between px-8 relative">
              <!-- Connecting Line -->
              <div class="absolute left-10 right-10 top-5 h-0.5 bg-gray-200 -z-10"></div>
              <div class="absolute left-10 right-10 top-5 h-0.5 bg-brand-orange -z-10 transition-all duration-500 origin-left scale-x-0" :style="{ transform: `scaleX(${(step - 1) / 2})` }"></div>

              <div v-for="i in 3" :key="i" class="flex flex-col items-center gap-2 bg-[#f8f9fa] z-10 px-2">
                  <div 
                    class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-500 border-2"
                    :class="step >= i ? 'bg-brand-orange border-brand-orange text-white shadow-lg shadow-orange-200' : 'bg-white border-gray-200 text-gray-400'"
                  >
                      {{ i }}
                  </div>
                  <span class="text-[10px] font-medium uppercase tracking-wider transition-colors" :class="step >= i ? 'text-brand-orange' : 'text-gray-400'">{{ ['账号', '云端', '完成'][i-1] }}</span>
              </div>
          </div>

          <!-- Card -->
          <div class="bg-white/90 backdrop-blur-xl rounded-[40px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] border border-white/50 p-10 relative overflow-hidden min-h-[500px] flex flex-col">
              
              <!-- STEP 1: System Init -->
              <div v-if="step === 1" class="flex-1 flex flex-col space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                  <div class="text-center space-y-2">
                      <h1 class="text-2xl font-black text-gray-900 tracking-tight">初始化系统</h1>
                      <p class="text-gray-500 text-sm">创建超级管理员与品牌信息</p>
                  </div>

                  <div class="space-y-5 flex-1">
                      <div class="grid grid-cols-2 gap-4">
                          <input v-model="form.brandName" type="text" placeholder="品牌名称 (MyCafe)" class="setup-input" />
                          <input v-model="form.storeName" type="text" placeholder="门店名称 (HQ)" class="setup-input" />
                      </div>
                      <div class="h-px bg-gray-100 my-2"></div>
                      <input v-model="form.displayName" type="text" placeholder="您的姓名 (如: 店长)" class="setup-input" />
                      <input v-model="form.pickName" type="text" placeholder="登录账号 (如: admin)" class="setup-input" />
                      <input v-model="form.password" type="password" placeholder="登录密码" class="setup-input" />
                  </div>

                   <button @click="handleStep1" :disabled="!isValidStep1 || loading" class="setup-btn">
                      <div v-if="loading" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                      {{ loading ? '处理中...' : '下一步: 云服务配置' }}
                   </button>
              </div>

              <!-- STEP 2: Cloud Setup -->
              <div v-if="step === 2" class="flex-1 flex flex-col space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                  <div class="text-center space-y-2">
                      <h1 class="text-2xl font-black text-gray-900 tracking-tight">云端同步</h1>
                      <p class="text-gray-500 text-sm">连接 Supabase 实现多端数据互通</p>
                  </div>

                  <div class="space-y-6 flex-1">
                      <label class="flex items-center gap-4 p-5 border border-gray-100 rounded-2xl bg-gray-50/50 hover:bg-white hover:border-brand-orange/30 hover:shadow-md transition-all cursor-pointer group">
                          <div class="relative flex items-center">
                              <input type="checkbox" v-model="cloudForm.enabled" class="peer sr-only">
                              <div class="w-12 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-brand-orange shadow-inner"></div>
                          </div>
                          <div class="flex flex-col">
                              <span class="font-bold text-gray-700 group-hover:text-brand-orange transition-colors">启用云同步服务</span>
                              <span class="text-[10px] text-gray-400">开启后可远程管理店铺数据</span>
                          </div>
                      </label>

                      <div v-if="cloudForm.enabled" class="space-y-4 pt-2 animate-in slide-in-from-top-2 fade-in">
                          <div class="space-y-1">
                              <label class="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Project URL</label>
                              <input v-model="cloudForm.url" type="text" placeholder="https://xxx.supabase.co" class="setup-input text-xs font-mono" />
                          </div>
                          <div class="space-y-1">
                              <label class="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Anon Key</label>
                              <input v-model="cloudForm.key" type="password" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." class="setup-input text-xs font-mono" />
                          </div>
                          
                          <!-- Test Connection Button (Fake for now) -->
                          <div class="flex justify-end">
                              <button class="text-[11px] font-bold text-brand-orange hover:text-orange-600 underline">测试连接</button>
                          </div>
                      </div>
                      
                      <div v-else class="flex flex-col items-center justify-center p-8 text-gray-400 opacity-50 space-y-3">
                           <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path></svg>
                           <p class="text-xs">云端同步已禁用，数据将仅保存在本地</p>
                      </div>
                  </div>

                  <div class="flex gap-3">
                       <button @click="handleCloudSkip" class="setup-btn bg-gray-100 !text-gray-500 hover:bg-gray-200">
                           {{ cloudForm.enabled ? '暂不启用' : '跳过配置' }}
                       </button>
                       <button @click="handleStep2" class="setup-btn" :disabled="cloudForm.enabled && (!cloudForm.url || !cloudForm.key)">
                           继续下一步
                       </button>
                  </div>
              </div>

              <!-- STEP 3: Finish -->
              <div v-if="step === 3" class="flex-1 flex flex-col space-y-8 animate-in fade-in slide-in-from-right-8 duration-500 text-center">
                  <div class="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full mx-auto flex items-center justify-center mb-2 shadow-xl shadow-emerald-100 animate-bounce-slow">
                     <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                  
                  <div class="text-center space-y-2">
                      <h1 class="text-2xl font-black text-gray-900 tracking-tight">配置完成!</h1>
                      <p class="text-gray-500 text-sm">系统已准备就绪，祝您生意兴隆</p>
                  </div>

                  <div class="bg-gradient-to-br from-orange-50 to-white border border-orange-100 p-6 rounded-2xl text-left space-y-4 shadow-sm">
                      <div class="flex items-center justify-between pb-3 border-b border-orange-100/50">
                          <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">店铺信息</span>
                          <span class="font-bold text-gray-800">{{ form.brandName }} <span class="text-gray-400 mx-1">/</span> {{ form.storeName }}</span>
                      </div>
                      <div class="flex items-center justify-between pb-3 border-b border-orange-100/50">
                          <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">管理员</span>
                          <span class="font-bold text-gray-800">{{ form.displayName }} <span class="text-gray-400 text-[10px] bg-gray-100 px-1.5 py-0.5 rounded ml-1">{{ form.pickName }}</span></span>
                      </div>
                      <div class="flex items-center justify-between">
                          <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">云端服务</span>
                          <div class="flex items-center gap-1.5">
                              <div class="w-2 h-2 rounded-full" :class="cloudForm.enabled ? 'bg-emerald-500' : 'bg-gray-300'"></div>
                              <span class="font-bold" :class="cloudForm.enabled ? 'text-emerald-600' : 'text-gray-500'">{{ cloudForm.enabled ? '已启用' : '未启用' }}</span>
                          </div>
                      </div>
                  </div>
                  
                  <div class="flex-1"></div>

                  <button @click="handleStep3" class="setup-btn bg-emerald-500 shadow-emerald-200 hover:shadow-emerald-300 hover:bg-emerald-600 text-white">
                      进入收银台
                  </button>
              </div>

              <!-- Error Message -->
              <div v-if="errorMsg" class="absolute bottom-4 left-0 right-0 mx-auto w-max max-w-[80%] p-3 bg-red-50 text-red-500 text-xs rounded-xl text-center font-bold border border-red-100 shadow-lg animate-in slide-in-from-bottom-2 fade-in">
                  {{ errorMsg }}
              </div>

               <!-- Debug Tool -->
              <div class="absolute top-2 left-2 opacity-10 hover:opacity-100 transition-opacity flex gap-2">
                 <button @click="injectTest" class="text-[10px] text-gray-500 hover:text-red-500 font-mono border border-gray-200 p-1 rounded">⚠️ Inject Test Data</button>
                 <button @click="simulateTraffic" class="text-[10px] text-gray-500 hover:text-blue-500 font-mono border border-gray-200 p-1 rounded">⚡ Simulate Rush</button>
              </div>

          </div>
      </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useSettingsStore } from '../stores/settings';
import { tauriCmd } from '../utils/tauri'; // Import tauriCmd

const router = useRouter();
const authStore = useAuthStore();
const settingsStore = useSettingsStore();

const step = ref(1);
const loading = ref(false);
const errorMsg = ref('');

// Step 1: System Init
const form = reactive({
    pickName: '',
    displayName: '',
    password: '',
    brandName: '',
    storeName: '',
});

// ...

const injectTest = async () => {
    if(!confirm("Create Full Test Data? (MoJian, CuiGuoli, etc.)")) return;
    try {
        await tauriCmd('debug_seed_full_data');
        alert("✅ Seeded! Please refresh.");
    } catch(e: any) {
        alert(e);
    }
};

const simulateTraffic = async () => {
    const count = parseInt(prompt("How many orders?", "50") || "0");
    if (!count) return;
    
    loading.value = true;
    try {
        // 1. Get Token (assume seeded Laoban)
        // Check if we are logged in, or try to login as laoban
        let token = authStore.currentUser?.token;
        if (!token) {
            // Try explicit login for test
            const session = await tauriCmd<any>('auth_login', { input: { pick_name: 'laoban', password: 'admin' } });
            token = session.token;
        }

        // 2. Get Products
        // Need to use tauriCmd directly as store might be empty
        const products = await tauriCmd<any[]>('products_list', { token, q: '' });
        if (products.length === 0) throw new Error("No products found. Inject test data first.");

        const orders = [];
        for (let i = 0; i < count; i++) {
            // Random items
            const items = [];
            const itemCount = Math.floor(Math.random() * 5) + 1;
            for (let j = 0; j < itemCount; j++) {
                const prod = products[Math.floor(Math.random() * products.length)];
                items.push({ product_id: prod.id, quantity: 1 });
            }
            orders.push({
                token,
                date_ymd: '2026-01-23', // Force today
                shift: '白班',
                employee: 'admin',
                items
            });
        }

        const start = performance.now();
        // Send in batches of 5 to avoid overwhelming OS network stack if using HTTP, 
        // though Tauri IPC is fast. Let's try full parallel for "Stress".
        await Promise.all(orders.map(o => tauriCmd('pos_checkout', o)));
        
        const duration = performance.now() - start;
        alert(`✅ Processed ${count} orders in ${(duration/1000).toFixed(2)}s\nTPS: ${(count / (duration/1000)).toFixed(1)}`);

    } catch (e: any) {
        alert("Stress Test Failed: " + e.message);
    } finally {
        loading.value = false;
    }
};

// Step 2: Cloud
const cloudForm = reactive({
    enabled: false,
    url: '',
    key: ''
});

const isValidStep1 = computed(() => {
    return form.pickName && form.displayName && form.password && form.brandName && form.storeName;
});

const handleStep1 = async () => {
    if (loading.value) return;
    loading.value = true;
    errorMsg.value = '';

    try {
        await authStore.bootstrapAdmin(form);
        
        // Update local settings immediately
        settingsStore.brandSettings.brandName = form.brandName;
        settingsStore.brandSettings.storeName = form.storeName;
        
        // Go to next step instead of finishing
        step.value = 2;
    } catch (e: any) {
        errorMsg.value = e.message || 'Initialization failed';
    } finally {
        loading.value = false;
    }
};

const handleCloudSkip = () => {
    cloudForm.enabled = false;
    handleStep2();
}

const handleStep2 = () => {
    // Save Cloud Settings
    settingsStore.cloudSettings.enabled = cloudForm.enabled;
    if (cloudForm.enabled) {
        settingsStore.cloudSettings.url = cloudForm.url;
        settingsStore.cloudSettings.key = cloudForm.key;
    }
    // TODO: Trigger save to backend if needed, currently store persists to localStorage
    step.value = 3;
};

const handleStep3 = async () => {
    // Redirect to home (which will go to Cashier)
    router.replace('/');
};
</script>

<style scoped>
.setup-input {
    @apply w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-brand-orange/50 focus:bg-white focus:ring-4 focus:ring-brand-orange/10 transition-all font-bold text-gray-700 placeholder:text-gray-300;
}
.setup-btn {
    @apply w-full h-14 rounded-2xl bg-brand-orange text-white font-bold text-lg shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center;
}

.animate-bounce-slow {
  animation: bounce 3s infinite;
}
</style>
