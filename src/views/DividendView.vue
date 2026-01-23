<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useAuthStore } from '../stores/auth';
import { tauriCmd } from '../utils/tauri';
import dayjs from 'dayjs';

const authStore = useAuthStore();
const currentMonth = ref(dayjs().format('YYYY-MM'));
const report = ref<any>(null);
const loading = ref(false);
const errorMsg = ref('');

// Computed: My Dividend View
const myView = computed(() => {
    if (!report.value || !authStore.currentUser) return null;
    
    const myPickName = authStore.currentUser.username;
    // Find myself
    const me = report.value.shareholders.find((s: any) => s.pick_name === myPickName);
    
    // Find people proxied by me
    const myProxies = report.value.shareholders.filter((s: any) => s.proxy_host === myPickName);
    
    // Calculate totals
    const myDirect = me ? me.dividend : 0;
    const proxyTotal = myProxies.reduce((sum: number, p: any) => sum + p.dividend, 0);
    
    return {
        me,
        myProxies,
        totalReceive: myDirect + proxyTotal,
        role: authStore.currentUser.role
    };
});

const loadReport = async () => {
    if (!authStore.isAuthenticated) return;
    loading.value = true;
    errorMsg.value = '';
    try {
        const res = await tauriCmd('finance_dividend_report', { 
            token: authStore.currentUser?.token,
            month: currentMonth.value 
        });
        report.value = res;
    } catch (e: any) {
        errorMsg.value = e.message;
        report.value = null;
    } finally {
        loading.value = false;
    }
};

watch(currentMonth, loadReport);
onMounted(loadReport);

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(val);
};
</script>

<template>
  <div class="h-full flex flex-col bg-gray-50/50 p-6 overflow-hidden">
      
      <!-- Header -->
      <div class="flex items-center justify-between mb-8 shrink-0">
        <div>
            <h1 class="text-2xl font-black text-gray-900 tracking-tight">分红报表</h1>
            <p class="text-gray-500 text-sm">股东权益分配与利润结算</p>
        </div>
        
        <div class="flex items-center gap-4 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
            <span class="text-xs font-bold text-gray-400 pl-2">结算月份</span>
            <input type="month" v-model="currentMonth" class="bg-gray-50 border-none rounded-lg text-sm font-bold text-gray-800 focus:ring-2 focus:ring-brand-orange/20 outline-none p-2" />
            <button @click="loadReport" class="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="刷新">
                <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            </button>
        </div>
    </div>

    <div v-if="loading" class="flex-1 flex items-center justify-center">
        <div class="w-8 h-8 border-4 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin"></div>
    </div>

    <div v-else-if="errorMsg" class="flex-1 flex flex-col items-center justify-center text-red-400">
        <svg class="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        <span class="font-bold">{{ errorMsg }}</span>
    </div>

    <div v-else-if="report" class="flex-1 overflow-hidden flex flex-col gap-6">
        
        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 relative overflow-hidden group">
                <div class="absolute right-0 top-0 w-24 h-24 bg-brand-orange/5 rounded-full -mr-8 -mt-8 group-hover:bg-brand-orange/10 transition-colors"></div>
                <span class="text-xs font-bold text-gray-400 uppercase tracking-wider z-10">本月净利润 (Net Profit)</span>
                <span class="text-3xl font-black text-gray-900 z-10">{{ formatCurrency(report.total_profit) }}</span>
            </div>
             
             <!-- My Slice -->
            <div class="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-2xl shadow-lg shadow-gray-200 flex flex-col justify-between h-32 relative overflow-hidden text-white">
                 <div class="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10"></div>
                <span class="text-xs font-bold text-white/50 uppercase tracking-wider z-10 flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-green-400"></span>
                    我应得的分红
                </span>
                <div class="z-10">
                     <span class="text-3xl font-black tracking-tight">{{ formatCurrency(myView?.totalReceive || 0) }}</span>
                     <p v-if="myView?.myProxies?.length" class="text-[10px] text-white/50 mt-1">包含 {{ myView.myProxies.length }} 位代持人的份额</p>
                </div>
            </div>
        </div>

        <!-- Detail Table -->
        <div class="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
            <div class="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h3 class="font-bold text-gray-700">股东权益明细</h3>
                <span class="text-xs text-gray-400">按股权比例分配</span>
            </div>
            <div class="flex-1 overflow-auto">
                <table class="w-full text-left">
                    <thead class="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th class="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">股东姓名</th>
                            <th class="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">股权</th>
                            <th class="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">代持状态</th>
                            <th class="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">分红金额</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50">
                        <tr v-for="s in report.shareholders" :key="s.pick_name" class="hover:bg-gray-50 transition-colors">
                            <td class="px-6 py-4">
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center font-bold text-xs">
                                        {{ s.name.charAt(0) }}
                                    </div>
                                    <div>
                                        <div class="font-bold text-gray-900">{{ s.name }}</div>
                                        <div class="text-xs text-gray-400">@{{ s.pick_name }}</div>
                                    </div>
                                </div>
                            </td>
                            <td class="px-6 py-4">
                                <span class="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">{{ s.equity }}%</span>
                            </td>
                            <td class="px-6 py-4">
                                <div v-if="s.proxy_host" class="flex items-center gap-1 text-xs text-blue-500 bg-blue-50 w-max px-2 py-1 rounded-full">
                                    <span>🔗 挂靠于:</span>
                                    <span class="font-bold font-mono">{{ s.proxy_host }}</span>
                                </div>
                                <span v-else class="text-xs text-gray-300">-</span>
                            </td>
                            <td class="px-6 py-4 text-right font-mono font-bold text-gray-700">
                                {{ formatCurrency(s.dividend) }}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
             <!-- Footer Note -->
            <div class="p-4 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-400 text-center">
                * 分红计算公式: 当月净利润 × (股权比例 / 100)。代持部分的金额需由宿主线下转账给委托人。
            </div>
        </div>
    </div>
  </div>
</template>
