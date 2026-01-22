import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { migrateShiftState, isLegacyShiftState } from '../utils/migration';
import type { ShiftState } from '../api/types';

export const useAppStore = defineStore('app', () => {
  // Load from storage or default
  const storedApp = localStorage.getItem('app_state');
  const state = storedApp ? JSON.parse(storedApp) : null;

  const currentDate = ref(state?.currentDate || '2026-01-01');
  const currentShift = ref(state?.currentShift || '白班');
  const currentEmployee = ref(state?.currentEmployee || '黄河');
  
  const systemStatus = ref('online');

  // 班次实时统计数据 (供 Header 和收银台共享)
  // 使用新的英文变量名
  let initialStats: ShiftState = {
    internetFee: 0,      // 网费 (原: wangfei)
    salesRevenue: 0,     // 售货 (原: shouhuo)
    meituanRevenue: 0,   // 美团 (原: meituan)
    expenditure: 0,      // 支出 (原: zhichu)
    income: 0,           // 入账 (原: ruzhang)
    amountDue: 0,        // 应交 (原: yingjiao)
  };

  // 如果存储的是旧格式，进行迁移
  if (state?.shiftStats) {
    if (isLegacyShiftState(state.shiftStats)) {
      console.log('🔄 检测到旧格式数据，正在迁移...');
      initialStats = migrateShiftState(state.shiftStats);
      console.log('✅ 数据迁移完成');
    } else {
      initialStats = state.shiftStats;
    }
  }

  const shiftStats = ref<ShiftState>(initialStats);

  // Watch for changes to persist
  watch(
    [currentDate, currentShift, currentEmployee, shiftStats],
    () => {
      localStorage.setItem('app_state', JSON.stringify({
        currentDate: currentDate.value,
        currentShift: currentShift.value,
        currentEmployee: currentEmployee.value,
        shiftStats: shiftStats.value
      }));
    },
    { deep: true }
  );

  // 交班动作触发器
  const handoverSignal = ref(0);
  const triggerHandover = () => {
    handoverSignal.value++;
  };

  const setShift = (date: string, shift: string, employee: string) => {
    currentDate.value = date;
    currentShift.value = shift;
    currentEmployee.value = employee;
    
    // Reset stats on new shift start? 
    // Usually 'setShift' implies starting a new shift or loading one. 
    // If it is just correcting context, we might not want to reset.
    // Given the simple requirement, we just update state.
  };

  return { 
    currentDate, 
    currentShift, 
    currentEmployee, 
    systemStatus,
    shiftStats,
    handoverSignal,
    triggerHandover,
    setShift 
  };
});
