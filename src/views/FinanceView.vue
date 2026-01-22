<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAppStore } from '../stores/app';
import ModernButton from '../components/ui/ModernButton.vue';
import { useAutoFitTable } from '../composables/useAutoFitTable';
import { useToast } from '../composables/useToast';

// Types
interface ExpenseItem {
  id: string;
  item: string;
  amount: number;
  barPay: number;
  financePay: number;
  category: string;
  notes: string;
}

interface IncomeItem {
  id: string;
  item: string;
  amount: number;
  source: string;
  notes: string;
}

interface FinanceRecord {
  id: string;
  date: string;
  shift: string;
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
  status: 'pending' | 'verified' | 'archived';
}

// Store
const appStore = useAppStore();

// State
const activeTab = ref<'expenses' | 'income' | 'records'>('expenses');
const loading = ref(false);
const { info } = useToast();

// Expenses
const expenses = ref<ExpenseItem[]>([
  { id: '1', item: '原材料采购 - 可口可乐', amount: 1200, barPay: 800, financePay: 400, category: '饮品', notes: '' },
  { id: '2', item: '原材料采购 - 薯片', amount: 450, barPay: 450, financePay: 0, category: '零食', notes: '' },
  { id: '3', item: '房租水电', amount: 3000, barPay: 0, financePay: 3000, category: '固定支出', notes: '' },
  { id: '4', item: '设备维护', amount: 200, barPay: 200, financePay: 0, category: '维修', notes: '' },
]);

// Income
const incomes = ref<IncomeItem[]>([
  { id: '1', item: '会员卡充值', amount: 5000, source: '会员', notes: '' },
  { id: '2', item: '商品销售收入', amount: 3280, source: '销售', notes: '' },
]);

// Finance Records (historical)
const financeRecords = ref<FinanceRecord[]>([
  { id: '1', date: '2026-01-19', shift: '早班', totalIncome: 4500, totalExpense: 1200, netAmount: 3300, status: 'verified' },
  { id: '2', date: '2026-01-18', shift: '晚班', totalIncome: 6800, totalExpense: 2100, netAmount: 4700, status: 'archived' },
]);

// Computed totals
const totalExpense = computed(() => expenses.value.reduce((sum, item) => sum + (item.amount || 0), 0));
const totalBarPay = computed(() => expenses.value.reduce((sum, item) => sum + (item.barPay || 0), 0));
const totalFinancePay = computed(() => expenses.value.reduce((sum, item) => sum + (item.financePay || 0), 0));

const totalIncome = computed(() => incomes.value.reduce((sum, item) => sum + (item.amount || 0), 0));
const netAmount = computed(() => totalIncome.value - totalExpense.value);

// Table refs
const expenseTableContainerRef = ref<HTMLDivElement | null>(null);
const expenseTableRef = ref<HTMLTableElement | null>(null);
const incomeTableContainerRef = ref<HTMLDivElement | null>(null);
const incomeTableRef = ref<HTMLTableElement | null>(null);
const recordsTableContainerRef = ref<HTMLDivElement | null>(null);
const recordsTableRef = ref<HTMLTableElement | null>(null);

// Expense table auto-fit
const expenseFit = useAutoFitTable(expenseTableContainerRef, expenseTableRef, {
  getHeaders: () => ['支出项目', '分类', '总金额', '吧台支付', '财务支付'],
  getRows: () => expenses.value,
  getRowValues: (r) => [
    String(r.item || ''),
    String(r.category || ''),
    `¥${Number(r.amount || 0).toFixed(2)}`,
    `¥${Number(r.barPay || 0).toFixed(2)}`,
    `¥${Number(r.financePay || 0).toFixed(2)}`,
  ],
  safetyGapPx: 8,
  minColPx: 80,
  padXByCol: [120, 60, 80, 80, 80],
  watchDeps: () => [expenses.value.length],
});

const expenseScale = computed(() => expenseFit.scale.value);
const expenseTargetWidth = computed(() => expenseFit.targetWidth.value);
const expenseColWidths = computed(() => expenseFit.colWidths.value);

// Income table auto-fit
const incomeFit = useAutoFitTable(incomeTableContainerRef, incomeTableRef, {
  getHeaders: () => ['入账项目', '来源', '金额'],
  getRows: () => incomes.value,
  getRowValues: (r) => [
    String(r.item || ''),
    String(r.source || ''),
    `¥${Number(r.amount || 0).toFixed(2)}`,
  ],
  safetyGapPx: 8,
  minColPx: 80,
  padXByCol: [120, 80, 80],
  watchDeps: () => [incomes.value.length],
});

const incomeScale = computed(() => incomeFit.scale.value);
const incomeTargetWidth = computed(() => incomeFit.targetWidth.value);
const incomeColWidths = computed(() => incomeFit.colWidths.value);

// Records table auto-fit
const recordsFit = useAutoFitTable(recordsTableContainerRef, recordsTableRef, {
  getHeaders: () => ['日期', '班次', '总收入', '总支出', '净额', '状态'],
  getRows: () => financeRecords.value,
  getRowValues: (r) => [
    String(r.date || ''),
    String(r.shift || ''),
    `¥${Number(r.totalIncome || 0).toFixed(2)}`,
    `¥${Number(r.totalExpense || 0).toFixed(2)}`,
    `¥${Number(r.netAmount || 0).toFixed(2)}`,
    r.status === 'verified' ? '已审核' : (r.status === 'archived' ? '已归档' : '待审核'),
  ],
  safetyGapPx: 8,
  minColPx: 80,
  padXByCol: [80, 60, 80, 80, 80, 60],
  watchDeps: () => [financeRecords.value.length],
});

const recordsScale = computed(() => recordsFit.scale.value);
const recordsTargetWidth = computed(() => recordsFit.targetWidth.value);
const recordsColWidths = computed(() => recordsFit.colWidths.value);

// Actions
const addExpense = () => {
  expenses.value.push({
    id: Date.now().toString(),
    item: '',
    amount: 0,
    barPay: 0,
    financePay: 0,
    category: '日常',
    notes: '',
  });
};

const removeExpense = (index: number) => {
  expenses.value.splice(index, 1);
};

const addIncome = () => {
  incomes.value.push({
    id: Date.now().toString(),
    item: '',
    amount: 0,
    source: '销售',
    notes: '',
  });
};

const removeIncome = (index: number) => {
  incomes.value.splice(index, 1);
};

const exportReport = () => {
  info('财务报表导出功能开发中...\n\n将生成包含所有收支记录的Excel/PDF报表。');
};

const verifyRecord = (record: FinanceRecord) => {
  record.status = 'verified';
};

onMounted(async () => {
  loading.value = true;
  // Simulate loading
  await new Promise(resolve => setTimeout(resolve, 300));
  loading.value = false;
});
</script>

<template>
  <div class="h-full flex flex-col gap-6 p-8 bg-transparent overflow-hidden">
    <!-- Header Area -->
    <div class="flex items-center justify-between shrink-0">
      <div class="flex flex-col">
        <h1 class="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-3">
          <span class="text-2xl">💵</span> 财务记账审计中心
        </h1>
        <div class="flex items-center gap-2 mt-1">
          <span class="text-[10px] font-black text-brand-orange uppercase tracking-[0.4em] opacity-70">Financial Audit & Ledger</span>
          <div class="w-1 h-1 rounded-full bg-gray-300"></div>
          <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
            {{ appStore.currentDate }} {{ appStore.currentShift }}
          </span>
        </div>
      </div>
      
      <!-- Tab Switcher -->
      <div class="flex items-center gap-2 bg-white/50 backdrop-blur-md rounded-2xl p-1 border border-white/60 shadow-lg">
        <button 
          @click="activeTab = 'expenses'"
          :class="[
            'px-6 py-2.5 rounded-xl text-[12px] font-black tracking-wide transition-all',
            activeTab === 'expenses' 
              ? 'bg-brand-orange text-white shadow-lg' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
          ]"
        >
          支出表
        </button>
        <button 
          @click="activeTab = 'income'"
          :class="[
            'px-6 py-2.5 rounded-xl text-[12px] font-black tracking-wide transition-all',
            activeTab === 'income' 
              ? 'bg-brand-orange text-white shadow-lg' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
          ]"
        >
          入账表
        </button>
        <button 
          @click="activeTab = 'records'"
          :class="[
            'px-6 py-2.5 rounded-xl text-[12px] font-black tracking-wide transition-all',
            activeTab === 'records' 
              ? 'bg-brand-orange text-white shadow-lg' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
          ]"
        >
          历史记录
        </button>
      </div>
      
      <ModernButton variant="primary" label="导出报表" @click="exportReport" />
    </div>

    <!-- Main Content -->
    <div class="flex-1 overflow-hidden">
      <!-- Expenses Tab -->
      <div v-if="activeTab === 'expenses'" class="h-full flex flex-col gap-4">
        <!-- Summary Cards -->
        <div class="grid grid-cols-4 gap-4 shrink-0">
          <div class="glass-panel rounded-2xl p-4 border border-white/60">
            <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">总支出</span>
            <div class="text-2xl font-mono font-black text-gray-800 mt-1">¥{{ totalExpense.toFixed(2) }}</div>
          </div>
          <div class="glass-panel rounded-2xl p-4 border border-white/60">
            <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">吧台支付</span>
            <div class="text-2xl font-mono font-black text-blue-600 mt-1">¥{{ totalBarPay.toFixed(2) }}</div>
          </div>
          <div class="glass-panel rounded-2xl p-4 border border-white/60">
            <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">财务支付</span>
            <div class="text-2xl font-mono font-black text-emerald-600 mt-1">¥{{ totalFinancePay.toFixed(2) }}</div>
          </div>
          <div class="glass-panel rounded-2xl p-4 border border-white/60 bg-brand-orange/10">
            <span class="text-[10px] font-black text-brand-orange uppercase tracking-widest">余额变化</span>
            <div class="text-2xl font-mono font-black text-brand-orange mt-1">¥{{ (totalIncome - totalExpense).toFixed(2) }}</div>
          </div>
        </div>

        <!-- Expenses Table -->
        <div class="flex-1 glass-panel rounded-[32px] border border-white/60 shadow-2xl overflow-hidden flex flex-col">
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white/40 shrink-0">
            <span class="text-[14px] font-black text-gray-700">支出明细列表</span>
            <ModernButton variant="secondary" size="sm" label="+ 添加支出" @click="addExpense" />
          </div>
          <div ref="expenseTableContainerRef" class="flex-1 overflow-auto overflow-x-hidden custom-scrollbar px-2">
            <div v-if="loading" class="flex flex-col items-center justify-center h-64 gap-4">
              <div class="w-12 h-12 border-[3px] border-gray-100 border-t-brand-orange rounded-full animate-spin"></div>
              <span class="text-[12px] font-black uppercase tracking-[0.4em] text-gray-400 animate-pulse">Loading...</span>
            </div>
            <div v-else
              class="origin-top-left"
              :style="{ transform: `scale(${expenseScale})`, width: expenseTargetWidth ? `${expenseTargetWidth}px` : 'auto' }"
            >
              <table
                ref="expenseTableRef"
                class="border-collapse table-fixed"
                :style="{ width: expenseTargetWidth ? `${expenseTargetWidth}px` : 'auto' }"
              >
                <colgroup v-if="expenseColWidths.length">
                  <col v-for="(w, idx) in expenseColWidths" :key="idx" :style="{ width: `${w}px` }" />
                </colgroup>
                <thead class="sticky top-0 z-10 bg-white/40 backdrop-blur-md">
                  <tr class="h-12 border-b border-gray-100 font-bold text-gray-400 uppercase tracking-tighter text-[11px]">
                    <th class="text-left pl-4 pr-2">支出项目</th>
                    <th class="text-left px-2">分类</th>
                    <th class="text-right px-2">总金额</th>
                    <th class="text-right px-2">吧台支付</th>
                    <th class="text-right px-2">财务支付</th>
                    <th class="text-center pr-4 w-20">操作</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-50/50">
                  <tr v-for="(item, index) in expenses" :key="item.id" class="h-12 group hover:bg-orange-50/30 transition-colors">
                    <td class="pl-4 pr-2">
                      <input 
                        v-model="item.item" 
                        type="text" 
                        placeholder="输入支出项目"
                        class="w-full bg-transparent border-none outline-none font-medium text-gray-700 placeholder:text-gray-300"
                      />
                    </td>
                    <td class="px-2">
                      <select v-model="item.category" class="bg-transparent border-none outline-none text-sm text-gray-600 cursor-pointer">
                        <option value="日常">日常</option>
                        <option value="饮品">饮品</option>
                        <option value="零食">零食</option>
                        <option value="固定支出">固定支出</option>
                        <option value="维修">维修</option>
                        <option value="其他">其他</option>
                      </select>
                    </td>
                    <td class="px-2 text-right">
                      <input 
                        v-model.number="item.amount" 
                        type="number" 
                        class="w-24 bg-transparent text-right border-none outline-none font-mono font-bold text-gray-800"
                      />
                    </td>
                    <td class="px-2 text-right">
                      <input 
                        v-model.number="item.barPay" 
                        type="number" 
                        class="w-24 bg-transparent text-right border-none outline-none font-mono font-bold text-blue-600"
                      />
                    </td>
                    <td class="px-2 text-right">
                      <input 
                        v-model.number="item.financePay" 
                        type="number" 
                        class="w-24 bg-transparent text-right border-none outline-none font-mono font-bold text-emerald-600"
                      />
                    </td>
                    <td class="pr-4 text-center">
                      <button 
                        @click="removeExpense(index)"
                        class="w-8 h-8 rounded-lg bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Income Tab -->
      <div v-if="activeTab === 'income'" class="h-full flex flex-col gap-4">
        <!-- Summary Cards -->
        <div class="grid grid-cols-3 gap-4 shrink-0">
          <div class="glass-panel rounded-2xl p-4 border border-white/60">
            <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">总收入</span>
            <div class="text-2xl font-mono font-black text-emerald-600 mt-1">¥{{ totalIncome.toFixed(2) }}</div>
          </div>
          <div class="glass-panel rounded-2xl p-4 border border-white/60">
            <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">总支出</span>
            <div class="text-2xl font-mono font-black text-red-500 mt-1">¥{{ totalExpense.toFixed(2) }}</div>
          </div>
          <div class="glass-panel rounded-2xl p-4 border border-white/60 bg-brand-orange/10">
            <span class="text-[10px] font-black text-brand-orange uppercase tracking-widest">净收入</span>
            <div class="text-2xl font-mono font-black text-brand-orange mt-1">¥{{ netAmount.toFixed(2) }}</div>
          </div>
        </div>

        <!-- Income Table -->
        <div class="flex-1 glass-panel rounded-[32px] border border-white/60 shadow-2xl overflow-hidden flex flex-col">
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white/40 shrink-0">
            <span class="text-[14px] font-black text-gray-700">入账明细列表</span>
            <ModernButton variant="secondary" size="sm" label="+ 添加入账" @click="addIncome" />
          </div>
          <div ref="incomeTableContainerRef" class="flex-1 overflow-auto overflow-x-hidden custom-scrollbar px-2">
            <div v-if="loading" class="flex flex-col items-center justify-center h-64 gap-4">
              <div class="w-12 h-12 border-[3px] border-gray-100 border-t-brand-orange rounded-full animate-spin"></div>
              <span class="text-[12px] font-black uppercase tracking-[0.4em] text-gray-400 animate-pulse">Loading...</span>
            </div>
            <div v-else
              class="origin-top-left"
              :style="{ transform: `scale(${incomeScale})`, width: incomeTargetWidth ? `${incomeTargetWidth}px` : 'auto' }"
            >
              <table
                ref="incomeTableRef"
                class="border-collapse table-fixed"
                :style="{ width: incomeTargetWidth ? `${incomeTargetWidth}px` : 'auto' }"
              >
                <colgroup v-if="incomeColWidths.length">
                  <col v-for="(w, idx) in incomeColWidths" :key="idx" :style="{ width: `${w}px` }" />
                </colgroup>
                <thead class="sticky top-0 z-10 bg-white/40 backdrop-blur-md">
                  <tr class="h-12 border-b border-gray-100 font-bold text-gray-400 uppercase tracking-tighter text-[11px]">
                    <th class="text-left pl-4 pr-2">入账项目</th>
                    <th class="text-left px-2">来源</th>
                    <th class="text-right px-2">金额</th>
                    <th class="text-center pr-4 w-20">操作</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-50/50">
                  <tr v-for="(item, index) in incomes" :key="item.id" class="h-12 group hover:bg-orange-50/30 transition-colors">
                    <td class="pl-4 pr-2">
                      <input 
                        v-model="item.item" 
                        type="text" 
                        placeholder="输入入账项目"
                        class="w-full bg-transparent border-none outline-none font-medium text-gray-700 placeholder:text-gray-300"
                      />
                    </td>
                    <td class="px-2">
                      <select v-model="item.source" class="bg-transparent border-none outline-none text-sm text-gray-600 cursor-pointer">
                        <option value="销售">销售</option>
                        <option value="会员">会员</option>
                        <option value="其他">其他</option>
                      </select>
                    </td>
                    <td class="px-2 text-right">
                      <input 
                        v-model.number="item.amount" 
                        type="number" 
                        class="w-32 bg-transparent text-right border-none outline-none font-mono font-bold text-emerald-600"
                      />
                    </td>
                    <td class="pr-4 text-center">
                      <button 
                        @click="removeIncome(index)"
                        class="w-8 h-8 rounded-lg bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Records Tab -->
      <div v-if="activeTab === 'records'" class="h-full flex flex-col gap-4">
        <!-- Records Table -->
        <div class="flex-1 glass-panel rounded-[32px] border border-white/60 shadow-2xl overflow-hidden flex flex-col">
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white/40 shrink-0">
            <span class="text-[14px] font-black text-gray-700">历史财务记录</span>
          </div>
          <div ref="recordsTableContainerRef" class="flex-1 overflow-auto overflow-x-hidden custom-scrollbar px-2">
            <div v-if="loading" class="flex flex-col items-center justify-center h-64 gap-4">
              <div class="w-12 h-12 border-[3px] border-gray-100 border-t-brand-orange rounded-full animate-spin"></div>
              <span class="text-[12px] font-black uppercase tracking-[0.4em] text-gray-400 animate-pulse">Loading...</span>
            </div>
            <div v-else
              class="origin-top-left"
              :style="{ transform: `scale(${recordsScale})`, width: recordsTargetWidth ? `${recordsTargetWidth}px` : 'auto' }"
            >
              <table
                ref="recordsTableRef"
                class="border-collapse table-fixed"
                :style="{ width: recordsTargetWidth ? `${recordsTargetWidth}px` : 'auto' }"
              >
                <colgroup v-if="recordsColWidths.length">
                  <col v-for="(w, idx) in recordsColWidths" :key="idx" :style="{ width: `${w}px` }" />
                </colgroup>
                <thead class="sticky top-0 z-10 bg-white/40 backdrop-blur-md">
                  <tr class="h-12 border-b border-gray-100 font-bold text-gray-400 uppercase tracking-tighter text-[11px]">
                    <th class="text-left pl-4 pr-2">日期</th>
                    <th class="text-left px-2">班次</th>
                    <th class="text-right px-2">总收入</th>
                    <th class="text-right px-2">总支出</th>
                    <th class="text-right px-2">净额</th>
                    <th class="text-center px-2">状态</th>
                    <th class="text-center pr-4 w-20">操作</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-50/50">
                  <tr v-for="record in financeRecords" :key="record.id" class="h-12 group hover:bg-orange-50/30 transition-colors">
                    <td class="pl-4 pr-2 font-medium text-gray-700">{{ record.date }}</td>
                    <td class="px-2">
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold" :class="record.shift === '早班' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'">
                        {{ record.shift }}
                      </span>
                    </td>
                    <td class="px-2 text-right font-mono font-bold text-emerald-600">¥{{ record.totalIncome.toFixed(2) }}</td>
                    <td class="px-2 text-right font-mono font-bold text-red-500">¥{{ record.totalExpense.toFixed(2) }}</td>
                    <td class="px-2 text-right font-mono font-bold text-gray-800">¥{{ record.netAmount.toFixed(2) }}</td>
                    <td class="px-2 text-center">
                      <span 
                        class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                        :class="{
                          'bg-emerald-100 text-emerald-600': record.status === 'verified',
                          'bg-gray-100 text-gray-500': record.status === 'archived',
                          'bg-yellow-100 text-yellow-600': record.status === 'pending'
                        }"
                      >
                        {{ record.status === 'verified' ? '已审核' : (record.status === 'archived' ? '已归档' : '待审核') }}
                      </span>
                    </td>
                    <td class="pr-4 text-center">
                      <button 
                        v-if="record.status === 'pending'"
                        @click="verifyRecord(record)"
                        class="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-500 hover:bg-emerald-500 hover:text-white text-[10px] font-bold transition-all"
                      >
                        审核
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
