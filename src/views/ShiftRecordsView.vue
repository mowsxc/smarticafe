<template>
  <div class="h-full flex flex-col gap-6 p-8 bg-transparent overflow-hidden">
    <!-- Header Area -->
    <div class="flex items-center justify-between shrink-0">
      <div class="flex flex-col">
        <h1 class="text-3xl font-black text-gray-900 tracking-tighter uppercase">
          交班记录
        </h1>
        <div class="flex items-center gap-2 mt-2">
          <span class="text-[10px] font-black text-brand-orange uppercase tracking-widest leading-none">Shift Records History</span>
        </div>
      </div>

      <!-- Quick Actions / Filters Header -->
      <div class="glass-panel p-1.5 rounded-2xl flex gap-3 items-center border border-white/60 shadow-lg shadow-black/5">
        <div class="flex items-center px-4 h-11 bg-white/40 rounded-xl border border-white/60 focus-within:border-brand-orange/40 focus-within:ring-4 focus-within:ring-orange-500/10 transition-all">
          <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-3">日期节点</label>
          <input
            v-model="filterDate"
            type="date"
            class="bg-transparent text-sm font-black text-gray-700 outline-none w-36"
          />
        </div>
        <div class="flex items-center px-4 h-11 bg-white/40 rounded-xl border border-white/60 focus-within:border-brand-orange/40 focus-within:ring-4 focus-within:ring-orange-500/10 transition-all">
          <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-3">班次过滤</label>
          <select
            v-model="filterShift"
            class="bg-transparent text-sm font-black text-gray-700 outline-none w-24 cursor-pointer"
          >
            <option value="">全部班次</option>
            <option value="早班">早班 (Morning)</option>
            <option value="晚班">晚班 (Night)</option>
          </select>
        </div>
        <button
          @click="loadRecords"
          class="h-11 px-8 bg-brand-orange text-white rounded-xl font-black text-sm shadow-xl shadow-orange-100 hover:scale-105 active:scale-95 transition-all"
        >
          查询记录
        </button>
      </div>
    </div>

    <!-- Main Content: Scrollable Grid -->
    <div class="flex-1 overflow-y-auto custom-scrollbar pr-2">
      <!-- Loading State -->
      <div v-if="loading" class="flex flex-col items-center justify-center h-64 gap-4">
        <div class="w-12 h-12 border-[3px] border-gray-100 border-t-brand-orange rounded-full animate-spin shadow-lg"></div>
        <span class="text-[12px] font-black uppercase tracking-[0.4em] text-gray-400 animate-pulse">Loading Records...</span>
      </div>
      
      <!-- Empty State -->
      <div v-else-if="records.length === 0" class="flex flex-col items-center justify-center h-64 gap-4">
        <div class="w-16 h-16 rounded-3xl bg-gray-100 flex items-center justify-center text-3xl shadow-inner">📭</div>
        <div class="flex flex-col items-center gap-2">
          <span class="text-[12px] font-black uppercase tracking-[0.4em] text-gray-400">暂无交班记录</span>
          <span class="text-[10px] text-gray-400 font-bold">若确有记录未显示，请检查 Supabase 控制台的 RLS 权限设置</span>
        </div>
      </div>
      
      <!-- Records Grid -->
      <div v-else class="grid grid-cols-1 gap-4 pb-8">
        <div 
          v-for="record in records" 
          :key="record.id"
          class="glass-panel rounded-[32px] p-8 border border-white/60 hover:border-brand-orange/30 shadow-xl shadow-black/[0.02] hover:shadow-orange-200/20 transition-all overflow-hidden relative group"
        >
          <!-- Progress Stripe -->
          <div class="absolute top-0 left-0 bottom-0 w-1.5 bg-brand-orange/20 group-hover:bg-brand-orange transition-colors"></div>

          <div class="flex flex-col gap-8 relative z-10">
            <!-- Top Section: Record Identity -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-6">
                <div class="flex flex-col">
                  <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">交班日期 / Date</span>
                  <div class="text-2xl font-black text-gray-800 tracking-tighter">{{ record.date }}</div>
                </div>
                <div class="h-10 w-px bg-gray-100"></div>
                <div class="flex flex-col">
                  <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">班次类型 / Shift</span>
                  <div class="flex items-center gap-2">
                     <span class="px-3 py-1 bg-brand-dark text-white rounded-lg text-[10px] font-black tracking-widest uppercase shadow-lg shadow-gray-200">
                      {{ record.shift }}
                    </span>
                  </div>
                </div>
                <div class="h-10 w-px bg-gray-100"></div>
                <div class="flex flex-col">
                  <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">经手人 / Operator</span>
                  <div class="text-[15px] font-black text-gray-700">{{ record.employee }}</div>
                </div>
                <div class="h-10 w-px bg-gray-100"></div>
                <div class="flex flex-col">
                  <span class="text-[10px] font-black text-brand-orange uppercase tracking-widest leading-none mb-1">接班人 / Successor</span>
                  <div class="text-[15px] font-black text-brand-orange">{{ record.successor }}</div>
                </div>
              </div>
              <div class="text-right">
                <span class="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] leading-none block mb-1">同步时间 / Sync Time</span>
                <div class="text-xs font-mono font-bold text-gray-500">{{ record.time }}</div>
              </div>
            </div>

            <!-- Middle Section: Financial Matrix -->
            <div class="grid grid-cols-4 gap-6">
              <div class="bg-white/40 rounded-3xl p-6 border border-white shadow-sm hover:shadow-xl transition-all group/card">
                <span class="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2">现金合计 / Cash</span>
                <div class="flex items-baseline gap-1">
                  <span class="text-xs font-bold text-gray-400">¥</span>
                  <div v-if="editingId === record.id" class="flex items-baseline">
                    <input
                      v-model.number="editForm.cashAmount"
                      type="number"
                      class="w-24 text-3xl font-mono font-black text-gray-800 tracking-tighter bg-white/50 rounded-lg px-2 py-1 border border-gray-200"
                    />
                  </div>
                  <div v-else class="text-3xl font-mono font-black text-gray-800 tracking-tighter group-hover/card:text-brand-orange transition-colors">{{ record.cashAmount.toFixed(2) }}</div>
                </div>
              </div>
              <div class="bg-white/40 rounded-3xl p-6 border border-white shadow-sm hover:shadow-xl transition-all group/card">
                <span class="text-[9px] font-black text-emerald-500 uppercase tracking-widest block mb-2">零售合计 / Sales</span>
                <div class="flex items-baseline gap-1">
                  <span class="text-xs font-bold text-emerald-300">¥</span>
                  <div v-if="editingId === record.id" class="flex items-baseline">
                    <input
                      v-model.number="editForm.salesAmount"
                      type="number"
                      class="w-24 text-3xl font-mono font-black text-emerald-600 tracking-tighter bg-white/50 rounded-lg px-2 py-1 border border-gray-200"
                    />
                  </div>
                  <div v-else class="text-3xl font-mono font-black text-emerald-600 tracking-tighter">{{ record.salesAmount.toFixed(2) }}</div>
                </div>
              </div>
              <div class="bg-white/40 rounded-3xl p-6 border border-white shadow-sm hover:shadow-xl transition-all group/card">
                <span class="text-[9px] font-black text-red-500 uppercase tracking-widest block mb-2">支出合计 / Expense</span>
                <div class="flex items-baseline gap-1">
                  <span class="text-xs font-bold text-red-300">¥</span>
                  <div v-if="editingId === record.id" class="flex items-baseline">
                    <input
                      v-model.number="editForm.expenseAmount"
                      type="number"
                      class="w-24 text-3xl font-mono font-black text-red-600 tracking-tighter bg-white/50 rounded-lg px-2 py-1 border border-gray-200"
                    />
                  </div>
                  <div v-else class="text-3xl font-mono font-black text-red-600 tracking-tighter">{{ record.expenseAmount.toFixed(2) }}</div>
                </div>
              </div>
              <div class="bg-brand-dark rounded-3xl p-6 shadow-2xl shadow-gray-200 border border-brand-dark hover:brightness-125 transition-all group/total">
                <span class="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">应缴合计 / Total</span>
                <div class="flex items-baseline gap-1">
                  <span class="text-xs font-bold text-brand-orange">¥</span>
                  <div v-if="editingId === record.id" class="flex items-baseline">
                    <input
                      v-model.number="editForm.totalAmount"
                      type="number"
                      class="w-28 text-3xl font-mono font-black text-white tracking-tighter bg-white/20 rounded-lg px-2 py-1 border border-white/30"
                    />
                  </div>
                  <div v-else class="text-3xl font-mono font-black text-white tracking-tighter transition-colors group-hover/total:text-brand-orange">{{ record.totalAmount.toFixed(2) }}</div>
                </div>
              </div>
            </div>

            <!-- Bottom Section: Remarks -->
            <div v-if="record.notes" class="bg-white/30 backdrop-blur-xl rounded-2xl p-5 border border-white/60 flex items-start gap-4 shadow-sm">
              <div class="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center shrink-0 shadow-inner">
                <span class="text-lg">📝</span>
              </div>
              <div class="flex flex-col gap-1.5">
                <span class="text-[10px] font-black text-orange-500 uppercase tracking-widest leading-none">交班备注 / Record Remarks</span>
                <div class="text-sm text-gray-700 leading-relaxed font-black">{{ record.notes }}</div>
              </div>
            </div>

            <!-- 超管操作按钮 -->
            <div v-if="isAdmin" class="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
              <template v-if="editingId === record.id">
                <button
                  @click="saveEdit"
                  class="px-4 py-2 rounded-xl bg-brand-orange text-white text-xs font-bold hover:bg-orange-600 transition-colors"
                >
                  保存
                </button>
                <button
                  @click="cancelEdit"
                  class="px-4 py-2 rounded-xl bg-gray-100 text-gray-500 text-xs font-bold hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
              </template>
              <template v-else>
                <button
                  @click="startEdit(record)"
                  class="px-4 py-2 rounded-xl bg-blue-50 text-blue-500 text-xs font-bold hover:bg-blue-100 transition-colors"
                >
                  编辑
                </button>
                <button
                  @click="openRollbackModal(record)"
                  class="px-4 py-2 rounded-xl bg-red-50 text-red-500 text-xs font-bold hover:bg-red-100 transition-colors"
                >
                  数据回退
                </button>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 数据回退弹窗 -->
  <Teleport to="body">
    <div v-if="showRollbackModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
        <h3 class="text-xl font-black text-gray-800 mb-4">数据回退</h3>
        <p class="text-sm text-gray-500 mb-4">
          选择要回退到的版本，将恢复该版本的原始班次数据。
        </p>
        <div class="max-h-60 overflow-y-auto border border-gray-100 rounded-xl p-2">
          <div
            v-for="version in rollbackVersions"
            :key="version.version"
            @click="selectedRollbackVersion = version.version"
            :class="[
              'p-3 rounded-xl cursor-pointer transition-all mb-1',
              selectedRollbackVersion === version.version
                ? 'bg-brand-orange text-white'
                : 'bg-gray-50 hover:bg-gray-100'
            ]"
          >
            <div class="font-bold">版本 {{ version.version }}</div>
            <div class="text-xs opacity-80">{{ version.date }} - {{ version.employee }}</div>
          </div>
        </div>
        <div class="flex gap-3 mt-6">
          <button
            @click="confirmRollback"
            :disabled="!selectedRollbackVersion"
            class="flex-1 py-3 rounded-xl bg-brand-orange text-white font-bold disabled:opacity-50"
          >
            确认回退
          </button>
          <button
            @click="showRollbackModal = false"
            class="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { fetchShiftRecords, type ShiftRecord } from '../api/shift';
import { useAuthStore } from '../stores/auth';
import { getRollbackVersions, rollbackToVersion } from '../api/originalShift';

const auth = useAuthStore();
const filterDate = ref('');
const filterShift = ref('');
const records = ref<ShiftRecord[]>([]);
const loading = ref(false);
const editingId = ref<string | null>(null);
const editForm = ref<Partial<ShiftRecord>>({});
const rollbackVersions = ref<{ version: number; date: string; employee: string }[]>([]);
const showRollbackModal = ref(false);
const selectedRollbackVersion = ref<number | null>(null);
const currentRollbackRecord = ref<ShiftRecord | null>(null);

// 是否为超管
const isAdmin = computed(() => auth.currentUser?.role === 'admin');

// 加载可回退版本列表
const loadRollbackVersions = async () => {
  try {
    rollbackVersions.value = await getRollbackVersions();
  } catch (error) {
    console.error('加载回退版本列表失败:', error);
  }
};

// 开始编辑
const startEdit = (record: ShiftRecord) => {
  editingId.value = record.id;
  editForm.value = { ...record };
};

// 取消编辑
const cancelEdit = () => {
  editingId.value = null;
  editForm.value = {};
};

// 保存编辑
const saveEdit = async () => {
  if (!editForm.value.id) return;
  
  // 找到对应记录并更新
  const idx = records.value.findIndex(r => r.id === editForm.value.id);
  if (idx >= 0) {
    records.value[idx] = { ...records.value[idx], ...editForm.value };
    // TODO: 调用 API 保存到数据库
    console.log('保存交班记录:', records.value[idx]);
  }
  
  editingId.value = null;
  editForm.value = {};
};

// 打开数据回退弹窗
const openRollbackModal = (record: ShiftRecord) => {
  currentRollbackRecord.value = record;
  loadRollbackVersions();
  showRollbackModal.value = true;
};

// 执行数据回退
const confirmRollback = async () => {
  if (!selectedRollbackVersion.value || !currentRollbackRecord.value) return;
  
  try {
    await rollbackToVersion(selectedRollbackVersion.value, currentRollbackRecord.value.id);
    alert(`已成功回退到版本 ${selectedRollbackVersion.value}`);
    showRollbackModal.value = false;
    selectedRollbackVersion.value = null;
    currentRollbackRecord.value = null;
  } catch (error) {
    console.error('数据回退失败:', error);
    alert('数据回退失败: ' + (error as Error).message);
  }
};

const loadRecords = async () => {
  loading.value = true;
  
  try {
    const data = await fetchShiftRecords({
      date: filterDate.value || undefined,
      shift: filterShift.value || undefined,
    });
    
    records.value = data;
    
    if (data.length === 0) {
      console.log('未找到交班记录，请确保已保存数据或检查筛选条件');
    }
  } catch (err) {
    console.error('加载交班记录失败:', err);
    records.value = getMockRecords();
  } finally {
    loading.value = false;
  }
};

function getMockRecords(): ShiftRecord[] {
  return [
    {
      id: '1',
      date: '2026-01-19',
      shift: '早班',
      employee: '黄河',
      successor: '刘杰',
      time: '14:32',
      cashAmount: 3280.50,
      salesAmount: 680.00,
      expenseAmount: 450.00,
      totalAmount: 3510.50,
      notes: '美团订单较多，库存充足'
    },
    {
      id: '2',
      date: '2026-01-18',
      shift: '晚班',
      employee: '刘杰',
      successor: '贾政华',
      time: '23:15',
      cashAmount: 4520.00,
      salesAmount: 1200.00,
      expenseAmount: 780.00,
      totalAmount: 4940.00,
      notes: '电竞区包夜用户多，营业额创新高'
    },
  ];
}

onMounted(() => {
  loadRecords();
});
</script>
