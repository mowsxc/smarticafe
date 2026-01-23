<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue';
import { useAuthStore } from '../stores/auth';
import { tauriCmd } from '../utils/tauri';

const authStore = useAuthStore();
const activeTab = ref<'staff' | 'stakeholder'>('stakeholder');

const employees = ref<any[]>([]);
const accounts = ref<any[]>([]);
const loading = ref(false);
const showModal = ref(false);
const editingUser = ref<any>(null);

const form = reactive({
    id: '', 
    displayName: '',
    role: 'boss',
    equity: 0,
    proxyHost: '',
    isHidden: false,
    salaryBase: 0,
    idCard: '',
    bankCard: '',
    bankName: '',
    phone: '',
    emergencyContact: '',
});

const loadData = async () => {
    loading.value = true;
    try {
        if (!authStore.currentUser?.token) return;
        employees.value = await tauriCmd('employees_list', { token: authStore.currentUser.token });
        accounts.value = await tauriCmd('auth_accounts_list', { token: authStore.currentUser.token });
    } catch (e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
};

onMounted(loadData);

const proxyHosts = computed(() => {
    return accounts.value
        .filter(a => a.role === 'admin' || a.role === 'boss')
        .map(a => ({
            value: a.pick_name,
            label: `${a.display_name} (${a.pick_name})`
        }));
});

const openEdit = (user: any) => {
    editingUser.value = user;
    let profileData: any = {};
    try {
        if (user.profile) profileData = JSON.parse(user.profile);
    } catch {}

    form.id = user.id;
    form.displayName = user.display_name;
    form.role = user.role;
    form.equity = user.equity;
    form.proxyHost = user.proxy_host || '';
    form.isHidden = user.is_hidden;
    form.salaryBase = user.salary_base;
    form.idCard = profileData.idCard || '';
    form.bankCard = profileData.bankCard || '';
    form.bankName = profileData.bankName || '';
    form.phone = profileData.phone || '';
    form.emergencyContact = profileData.emergencyContact || '';
    showModal.value = true;
};

const saveUser = async () => {
    try {
        const profileJson = JSON.stringify({
            idCard: form.idCard,
            bankCard: form.bankCard,
            bankName: form.bankName,
            phone: form.phone,
            emergencyContact: form.emergencyContact
        });

        await authStore.updateProfile({
            id: form.id,
            display_name: form.displayName,
            equity: Number(form.equity),
            proxy_host: form.proxyHost || null,
            salary_base: Number(form.salaryBase),
            is_hidden: form.isHidden,
            profile: profileJson
        });
        
        showModal.value = false;
        await loadData();
    } catch (e: any) {
        alert('保存失败: ' + e.message);
    }
};

// Simple Employee Edit (Simplified for now, focusing on Stakeholder)
const openEditEmployee = (emp: any) => {
    alert("目前主要开发股东档案功能，员工简易编辑功能稍后开放");
};
</script>

<template>
  <div class="h-full flex flex-col bg-gray-50/50 p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
        <div>
            <h1 class="text-2xl font-black text-gray-900 tracking-tight">人员与档案</h1>
            <p class="text-gray-500 text-sm">管理股东权益、代持关系及员工档案</p>
        </div>
        
        <!-- Tabs -->
        <div class="flex bg-gray-200 p-1 rounded-xl">
             <button 
                class="px-4 py-2 rounded-lg text-sm font-bold transition-all"
                :class="activeTab === 'stakeholder' ? 'bg-white shadow-sm text-brand-dark' : 'text-gray-500 hover:text-gray-700'"
                @click="activeTab = 'stakeholder'"
             >
                股东账号
             </button>
             <button 
                class="px-4 py-2 rounded-lg text-sm font-bold transition-all"
                :class="activeTab === 'staff' ? 'bg-white shadow-sm text-brand-dark' : 'text-gray-500 hover:text-gray-700'"
                @click="activeTab = 'staff'"
             >
                员工列表
             </button>
        </div>
    </div>

    <!-- Stakeholders Grid -->
    <div v-if="activeTab === 'stakeholder'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pb-4">
        <div v-for="user in accounts" :key="user.id" 
             class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden flex flex-col"
        >
             <!-- Role Badge -->
             <div class="absolute top-0 right-0 px-3 py-1 bg-gray-100 rounded-bl-xl text-xs font-bold text-gray-500"
                  :class="{'!bg-purple-100 !text-purple-600': user.role === 'admin', '!bg-brand-orange/10 !text-brand-orange': user.role === 'boss'}"
             >
                 {{ user.role === 'admin' ? 'SYSTEM' : '股东' }}
             </div>

             <div class="flex items-center gap-4 mb-4">
                 <div class="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
                      :class="user.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-brand-orange/10 text-brand-orange'"
                 >
                     {{ user.display_name.charAt(0) }}
                 </div>
                 <div class="min-w-0">
                     <h3 class="font-bold text-gray-900 truncate">{{ user.display_name }}</h3>
                     <p class="text-xs text-gray-400 truncate">@{{ user.pick_name }}</p>
                 </div>
             </div>

             <!-- Metrics -->
             <div class="grid grid-cols-2 gap-2 mb-4">
                 <div class="bg-gray-50 p-2 rounded-xl text-center">
                     <span class="block text-[10px] text-gray-400 uppercase">股权</span>
                     <span class="block text-lg font-black text-gray-800">{{ user.equity }}%</span>
                 </div>
                 <div class="bg-gray-50 p-2 rounded-xl text-center">
                     <span class="block text-[10px] text-gray-400 uppercase">基本薪资</span>
                     <span class="block text-lg font-bold text-gray-800">¥{{ user.salary_base }}</span>
                 </div>
             </div>

             <!-- Proxy Info -->
             <div v-if="user.proxy_host" class="mb-2 bg-blue-50/50 p-2 rounded-lg flex items-center gap-2 text-xs border border-blue-100">
                 <span class="text-blue-500 font-bold shrink-0">🔗 挂靠:</span>
                 <span class="font-mono text-gray-600 truncate">{{ user.proxy_host }}</span>
             </div>
             
             <!-- Hidden Status -->
             <div v-if="user.is_hidden" class="mb-2 bg-gray-100/50 p-1.5 rounded text-center text-[10px] text-gray-500">
                 👻 登录列表隐藏
             </div>

             <div class="flex-1"></div>

             <button @click="openEdit(user)" class="w-full mt-2 py-2.5 rounded-xl bg-black text-white text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                 编辑档案
             </button>
        </div>
        
        <!-- Add New Button -->
        <div class="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:border-gray-300 hover:bg-gray-100 transition-all cursor-pointer min-h-[240px]">
             <!-- Future: Create New Account -->
            <svg class="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            <span class="font-bold text-sm">新增股东账号</span>
            <span class="text-[10px] mt-1">(请前往数据库添加)</span>
        </div>
    </div>

    <!-- Staff Grid (Simplified) -->
    <div v-if="activeTab === 'staff'" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div v-for="emp in employees" :key="emp.id" class="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between">
            <div class="flex items-center gap-3">
                 <div class="w-10 h-10 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center font-bold">{{ emp.name.charAt(0) }}</div>
                 <span class="font-bold text-gray-700">{{ emp.name }}</span>
            </div>
            <span class="px-2 py-1 bg-green-100 text-green-600 text-[10px] font-bold rounded-lg" v-if="emp.is_active">在职</span>
            <span class="px-2 py-1 bg-gray-100 text-gray-400 text-[10px] font-bold rounded-lg" v-else>离职</span>
        </div>
    </div>
    
    <!-- User Edit Modal -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div class="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white/95 backdrop-blur z-10">
                <div>
                   <h3 class="text-xl font-black text-gray-900">编辑档案: {{ form.displayName }}</h3>
                   <p class="text-xs text-gray-400">ID: {{ form.id.substring(0,8) }}...</p>
                </div>
                <button @click="showModal = false" class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200">
                    <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            
            <div class="p-8 space-y-8">
                <!-- Section 1: Financials -->
                <div>
                    <h4 class="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2">财务与权益</h4>
                    <div class="grid grid-cols-2 gap-6">
                        <div class="space-y-2">
                            <label class="text-sm font-bold text-gray-700">股权比例 (%)</label>
                            <input v-model="form.equity" type="number" step="0.1" class="input-field" />
                        </div>
                         <div class="space-y-2">
                            <label class="text-sm font-bold text-gray-700">基本薪资 (元)</label>
                            <input v-model="form.salaryBase" type="number" step="100" class="input-field" />
                        </div>
                    </div>
                </div>

                <!-- Section 2: Account Logic -->
                <div>
                    <h4 class="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2">账号逻辑</h4>
                    <div class="grid grid-cols-2 gap-6">
                         <div class="space-y-2">
                             <label class="text-sm font-bold text-gray-700">代持宿主 (挂靠在谁名下)</label>
                             <select v-model="form.proxyHost" class="input-field">
                                 <option value="">-- 无代持 --</option>
                                 <option v-for="host in proxyHosts" :key="host.value" :value="host.value">
                                     {{ host.label }}
                                 </option>
                             </select>
                             <p class="text-[10px] text-gray-400 leading-tight pt-1">选择挂靠后，分红报表将该账号份额合并显示在宿主名下。</p>
                         </div>
                         
                         <div class="space-y-2">
                             <label class="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-gray-50 h-12">
                                 <input type="checkbox" v-model="form.isHidden" class="w-5 h-5 rounded border-gray-300 text-brand-orange focus:ring-brand-orange">
                                 <span class="font-bold text-gray-700">在登录列表隐藏</span>
                             </label>
                             <p class="text-[10px] text-gray-400 leading-tight pt-1">用于隐名股东，只能通过手动输入账号登录。</p>
                         </div>
                    </div>
                </div>

                <!-- Section 3: Profile Details -->
                <div>
                    <h4 class="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2">详细档案</h4>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-1">
                            <label class="text-xs font-bold text-gray-500">身份证号</label>
                            <input v-model="form.idCard" type="text" class="input-field !h-10 text-sm" />
                        </div>
                        <div class="space-y-1">
                             <label class="text-xs font-bold text-gray-500">联系电话</label>
                             <input v-model="form.phone" type="text" class="input-field !h-10 text-sm" />
                        </div>
                        <div class="col-span-2 space-y-1">
                             <label class="text-xs font-bold text-gray-500">银行卡号</label>
                             <div class="flex gap-2">
                                 <input v-model="form.bankName" type="text" placeholder="开户行" class="input-field !h-10 text-sm w-1/3" />
                                 <input v-model="form.bankCard" type="text" placeholder="卡号" class="input-field !h-10 text-sm flex-1 font-mono" />
                             </div>
                        </div>
                         <div class="col-span-2 space-y-1">
                             <label class="text-xs font-bold text-gray-500">紧急联系人</label>
                             <input v-model="form.emergencyContact" type="text" class="input-field !h-10 text-sm" />
                        </div>
                    </div>
                </div>

            </div>
            
            <div class="p-6 border-t border-gray-100 bg-gray-50 rounded-b-3xl">
                <button @click="saveUser" class="w-full h-12 bg-black text-white font-bold rounded-xl shadow-lg hover:bg-gray-800 transition-all">保存更改</button>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
.input-field {
    @apply w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-brand-orange/50 focus:bg-white focus:ring-4 focus:ring-brand-orange/10 transition-all font-medium text-gray-800;
}
</style>
