<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick, onBeforeUnmount } from 'vue';
import { useAppStore } from '../stores/app';
import { useAuthStore } from '../stores/auth';
import { useCartStore } from '../stores/cart';
import { fetchProducts, type Product, createProduct, deleteProduct } from '../api/products';
import { tauriCmd } from '../utils/tauri';
import { useAutoFitTable } from '../composables/useAutoFitTable';
import ProductCard from '../components/pos/ProductCard.vue';
import CartItem from '../components/pos/CartItem.vue';
import SnapshotModal from '../components/SnapshotModal.vue';
import QuickLoginPanel from '../components/QuickLoginPanel.vue';
import { createShiftRecord } from '../api/shift';
import { getDefaultRedeemDiscount } from '../api/types';
import { getSyncService, supabase, subscribeToTable } from '../services/supabase/client';
import {
  formatAuto,
  formatNumberKeepZero,
  calculateSales,
  calculateRevenue,
  calculateCurrentStock,
  calculateFinancePay,
  calculateAmountDue,
  parseMoney,
  parseDiscountTotal
} from '../utils/validation';
import {
  handleDraftSaveError,
  handleDraftLoadError,
  handleSnapshotGenerationError,
  handleHandoverSubmitError,
  handleMeituanParseError,
} from '../utils/errorHandler';
import { parseExcelData } from '../utils/saleSheetParser';
import { toast } from '../composables/useToast';

// System context
const app = useAppStore();
const auth = useAuthStore();
const cart = useCartStore();

const activeShiftCtx = ref<{ dateYmd: string; shift: string; employee: string } | null>(null);
const activeShiftMissing = ref<boolean>(false);

const shiftCtxForUi = computed(() => getShiftCtx());

const getShiftCtx = () => {
  if (activeShiftCtx.value) return activeShiftCtx.value;
  return {
    dateYmd: String(app.currentDate || '').trim(),
    shift: String(app.currentShift || '').trim(),
    employee: String(app.currentEmployee || '').trim(),
  };
};

// 是否允许编辑：当班人员本人 或 超管
const canEdit = computed(() => {
  const currentUser = auth.currentUser;
  if (!currentUser) return false;
  if (currentUser.role === 'admin') return true;
  return getShiftCtx().employee === currentUser.username;
});

// Read-only mode（无编辑权限即只读：股东/非当班员工可查看但不可改）
const isReadonly = computed(() => !canEdit.value);

// Admin only mode (for 售货清单 import/undo)
const isAdmin = computed(() => auth.currentUser?.role === 'admin');

// 实时同步检测 - 检查是否需要重新初始化
let syncCheckInterval: NodeJS.Timeout | null = null;

const startSyncCheck = () => {
  syncCheckInterval = setInterval(async () => {
    try {
      const needsBootstrap = await auth.bootstrapRequired();
      if (needsBootstrap) {
        console.log('检测到系统需要重新初始化，跳转到设置页面...');
        // 如果系统检测到需要重新初始化，跳转回去
        window.location.href = '/#/setup';
      }
    } catch (error) {
      // 忽略错误，继续检查
    }
  }, 3000); // 每3秒检查一次
};

onMounted(() => {
  startSyncCheck();
});

onBeforeUnmount(() => {
  if (syncCheckInterval) {
    clearInterval(syncCheckInterval);
    syncCheckInterval = null;
  }
});

// 是否为当班人员（接班人）
const isCurrentShiftHolder = computed(() => {
  const currentUser = auth.currentUser;
  if (!currentUser) return false;
  // 接班人是当前登录用户
  return getShiftCtx().employee === currentUser.username;
});

// 超管权限：可编辑所有数据
const canEditAll = computed(() => auth.currentUser?.role === 'admin');

// 当班人员可编辑字段（不包括原数、库存、单价、规格）
const canEditFields = computed(() => ({
  restock: true,
  remaining: true,
  sales: true,
  revenue: true,
  purchase: true,
  redeem: true,
  loss: true,
  wangfei: true,
  expenseItem: true,
  expenseAmount: true,
  barPay: true,
  incomeItem: true,
  incomeAmount: true,
}));

// 判断单元格是否可编辑
const isCellEditable = (field: string): boolean => {
  if (isReadonly.value) return false;
  if (canEditAll.value) return true; // 超管可编辑所有
  if (isCurrentShiftHolder.value) {
    // 当班人员只能编辑部分字段
    return canEditFields.value[field as keyof typeof canEditFields.value] ?? false;
  }
  return false;
};

// Alias for template usage
const formatVal = formatAuto;

// Modal States
const showTaxModal = ref(false);
const tempTaxRate = ref('7');

const showStartShiftModal = ref(false);
const startShiftForm = ref({
  date: '',
  shift: '白班',
  employee: '',
});

const shiftPeople = ref<string[]>([]);

const loadShiftPeople = async () => {
  try {
    const list = await auth.fetchPickList();
    const employees = Array.isArray((list as any)?.employees) ? (list as any).employees : [];
    const bosses = Array.isArray((list as any)?.bosses) ? (list as any).bosses : [];
    shiftPeople.value = [...employees, ...bosses];
  } catch {
    shiftPeople.value = [];
  }
};

const openTaxModal = () => {
    if (isReadonly.value) return; // Prevent if readonly
    tempTaxRate.value = (meituanTaxRate.value * 100).toFixed(0);
    showTaxModal.value = true;
};

const saveTaxRate = () => {
    const r = parseFloat(tempTaxRate.value);
    if (!isNaN(r)) {
        meituanTaxRate.value = r / 100;
        // Recalculate
        meituanRows.value = meituanRows.value.map(r => ({
            ...r,
            financial: (r.amount - r.discount) * (1 - meituanTaxRate.value)
        }));
    }
    showTaxModal.value = false;
};


// UI State
const mode = ref<'handover' | 'sales'>('handover'); 
const loading = ref(true);
const products = ref<Product[]>([]);
const searchQuery = ref('');
const showMobileCart = ref(false); // Mobile Cart State
const cartTotalItems = computed(() => cart.items.reduce((s, i) => s + i.quantity, 0));

// --- Handover (Sales) Module State ---
interface HandoverRow extends Product {
  original: number;
  restock: number | '';
  remaining: number | '';
  redeem: number | '';
  redeem_discount: number; // 优惠金额
  loss: number | ''; // 手动扣减
  auto_loss: number; // 美团自动扣减
  purchase: number;
  stockVal: number;
  sales: number;
  revenue: number;
  unitPriceVal: number;
  specVal: number;
  isInvalidRemaining?: boolean;
  isInvalidConsumption?: boolean;
  isMissingRemaining?: boolean;
}
const handoverRows = ref<HandoverRow[]>([]);

const openRedeemModal = async (row: HandoverRow) => {
  if (!isCellEditable('redeem')) return;
  const prev = Number(row.redeem_discount) || 0;
  const input = prompt('设置乐享(每瓶)金额', String(prev));
  if (input === null) return;
  const val = Number(input);
  if (!Number.isFinite(val) || val < 0) return;
  row.redeem_discount = val;
  try {
    await tauriCmd('kv_set', { key: 'global_redeem_discount', value: val });
  } catch (error) {
    console.error('Failed to save global redeem discount:', error);
  }
  updateHandoverCalc();
};

// 导入跟踪状态（用于撤回功能）
interface ImportHistory {
    timestamp: number;
    newProductIds: string[];  // 新创建并同步到Supabase的商品ID
    newProductNames: string[]; // 新创建的商品名（未同步的）
    importedNames: string[];   // 所有导入过的商品名（用于撤销时恢复原状）
    expenseCount: number;
    meituanCount: number;
}
const importHistory = ref<ImportHistory | null>(null);

const lastLocalEditAt = ref(0);
let shiftLiveSubscription: { unsubscribe: () => void } | null = null;

const handoverTableContainerRef = ref<HTMLDivElement | null>(null);
const handoverTableWrapRef = ref<HTMLDivElement | null>(null);
const handoverTableRef = ref<HTMLTableElement | null>(null);
const handoverTableScale = ref(1);
const handoverTableTargetWidth = ref<number | null>(null);
const handoverTableSafetyGapPx = 8;
const handoverColWidths = ref<number[]>([]);

let handoverTableResizeObserver: ResizeObserver | null = null;

let handoverMeasureCanvas: HTMLCanvasElement | null = null;
const measureTextPx = (text: string, font: string): number => {
  if (!handoverMeasureCanvas) handoverMeasureCanvas = document.createElement('canvas');
  const ctx = handoverMeasureCanvas.getContext('2d');
  if (!ctx) return text.length * 10;
  ctx.font = font;
  return ctx.measureText(text).width;
};

const updateHandoverTableFit = async () => {
  if ((mode.value as string) !== 'handover') return;
  await nextTick();

  const containerEl = handoverTableContainerRef.value;
  const wrapEl = handoverTableWrapRef.value;
  const tableEl = handoverTableRef.value;
  if (!containerEl || !wrapEl || !tableEl) return;

  const availableWidth = Math.max(0, containerEl.clientWidth - handoverTableSafetyGapPx * 2);
  if (availableWidth <= 0) return;

  const cs = window.getComputedStyle(tableEl);
  const font = cs.font || `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const padXByCol = [
    48, // 商品名称：pl-4 + 右侧留白
    28,
    28,
    28,
    28,
    28,
    28,
    28,
    28,
    32, // 销额：包含 ¥ 前缀
    28,
    32, // 规格：pr-4 + 右侧留白
  ];
  const minCol = 56;

  const headerTexts = ['商品名称', '原数', '补货', '剩余', '兑奖', '扣减', '进货', '库存', '销量', '销额', '单价', '规格'];
  const cols = headerTexts.length;
  const required = new Array<number>(cols).fill(0);

  // required width: header
  for (let i = 0; i < cols; i += 1) {
    const padX = padXByCol[i] ?? 28;
    required[i] = Math.max(required[i], Math.ceil(measureTextPx(headerTexts[i], font) + padX));
  }

  // required width: body (use data rather than DOM to avoid input.w-full 影响)
  for (const r of handoverRows.value) {
    const values: string[] = [
      String(r.name ?? ''),
      String(r.original ?? ''),
      String(r.restock ?? ''),
      String(r.remaining ?? ''),
      String(r.redeem ?? ''),
      String(r.loss ?? ''),
      String(formatAuto(r.purchase)),
      String(formatAuto(r.stockVal)),
      String(formatAuto(r.sales)),
      `¥${String(formatAuto(r.revenue))}`,
      String(formatAuto(r.unitPriceVal)),
      String(formatAuto(r.specVal)),
    ];
    for (let i = 0; i < cols; i += 1) {
      const padX = padXByCol[i] ?? 28;
      required[i] = Math.max(required[i], Math.ceil(measureTextPx(values[i], font) + padX));
    }
  }

  for (let i = 0; i < cols; i += 1) {
    required[i] = Math.max(required[i], minCol);
  }

  // Step 1: start from equal share (average)
  const base = availableWidth / cols;
  const widths = new Array<number>(cols).fill(base);

  // Step 2: columns that need more than average get it; this may overflow the total
  for (let i = 0; i < cols; i += 1) {
    widths[i] = Math.max(widths[i], required[i]);
  }

  const sumRequired = required.reduce((s, w) => s + w, 0);
  let sumWidths = widths.reduce((s, w) => s + w, 0);

  // If even minimum required cannot fit, only then scale
  if (sumRequired > availableWidth) {
    const finalWidths = required.map(w => Math.floor(w));
    const finalSum = finalWidths.reduce((s, w) => s + w, 0);
    handoverColWidths.value = finalWidths;
    handoverTableTargetWidth.value = finalSum;
    handoverTableScale.value = finalSum > availableWidth ? availableWidth / finalSum : 1;
    return;
  }

  // Step 3: if total overflowed, take it back from columns that have slack over their required
  let overflow = sumWidths - availableWidth;
  if (overflow > 0.5) {
    const slack = widths.map((w, i) => Math.max(0, w - required[i]));
    const slackTotal = slack.reduce((s, w) => s + w, 0);

    if (slackTotal > 0) {
      for (let i = 0; i < cols; i += 1) {
        if (slack[i] <= 0) continue;
        const take = overflow * (slack[i] / slackTotal);
        widths[i] = Math.max(required[i], widths[i] - take);
      }
      sumWidths = widths.reduce((s, w) => s + w, 0);
      overflow = sumWidths - availableWidth;
    }
  }

  // Step 4: if still underfilled (or after shrink), distribute remaining evenly to all columns
  sumWidths = widths.reduce((s, w) => s + w, 0);
  const remaining = availableWidth - sumWidths;
  if (remaining > 0.5) {
    const per = remaining / cols;
    for (let i = 0; i < cols; i += 1) {
      widths[i] += per;
    }
  }

  // Finalize: integer px widths and fix rounding drift
  const finalWidths = widths.map(w => Math.floor(w));
  let finalSum = finalWidths.reduce((s, w) => s + w, 0);
  let drift = Math.round(availableWidth - finalSum);
  for (let i = 0; i < cols && drift !== 0; i += 1) {
    if (drift > 0) {
      finalWidths[i] += 1;
      drift -= 1;
    } else if (drift < 0 && finalWidths[i] > required[i]) {
      finalWidths[i] -= 1;
      drift += 1;
    }
  }
  finalSum = finalWidths.reduce((s, w) => s + w, 0);

  handoverColWidths.value = finalWidths;
  handoverTableTargetWidth.value = finalSum;
  handoverTableScale.value = 1;
};

// --- Accounting Module State ---
interface ExpenseItem {
  item: string;
  amount: number | '';
  barPay: number | '';
  financePay: number | '';
}
interface IncomeItem {
  item: string;
  amount: number | '';
}
const expenses = ref<ExpenseItem[]>([{ item: '', amount: '', barPay: '', financePay: '' }]);
const incomes = ref<IncomeItem[]>([{ item: '', amount: '' }]);

// --- Shift Module State ---
const shiftState = ref({
  wangfei: '',
  shouhuo: 0,
  meituan: '',
  zhichu: 0,
  yingjiao: 0
});

// --- Meituan Module State & Logic ---
const meituanOrderText = ref('');
const meituanTaxRate = ref(0.07);
const meituanRows = ref<any[]>([]);

// 计算记账模块合计（必须在 watch 之前定义）
const totalExpenditureAmount = computed(() => expenses.value.reduce((s, it) => s + (Number(it.amount) || 0), 0));
const totalIncomeAmount = computed(() => incomes.value.reduce((s, it) => s + (Number(it.amount) || 0), 0));
const totalBarPay = computed(() => expenses.value.reduce((s, it) => s + (Number(it.barPay) || 0), 0));
const totalFinancePay = computed(() => expenses.value.reduce((s, it) => s + (Number(it.financePay) || 0), 0));

// 将财务记账（支付金额合计/吧台支付合计/入账）与交班计算/顶部统计实时关联
watch(
  [
    () => shiftState.value.wangfei,
    () => shiftState.value.shouhuo,
    () => shiftState.value.meituan,
    totalExpenditureAmount,
    totalBarPay,
    totalIncomeAmount,
  ],
  ([wangfeiRaw, shouhuoRaw, meituanRaw]) => {
    const wangfeiVal = typeof wangfeiRaw === 'number' ? wangfeiRaw : (parseFloat(String(wangfeiRaw)) || 0);
    const shouhuoVal = typeof shouhuoRaw === 'number' ? shouhuoRaw : (parseFloat(String(shouhuoRaw)) || 0);
    const meituanVal = typeof meituanRaw === 'number' ? meituanRaw : (parseFloat(String(meituanRaw)) || 0);

    // 交班计算里的“支出”以吧台支付合计为准
    const desiredZhichu = Number(totalBarPay.value) || 0;
    if (shiftState.value.zhichu !== desiredZhichu) {
      shiftState.value.zhichu = desiredZhichu;
    }

    // 应缴统一按新公式重算
    const desiredYingjiao = calculateAmountDue(wangfeiVal, shouhuoVal, meituanVal, desiredZhichu);
    if (shiftState.value.yingjiao !== desiredYingjiao) {
      shiftState.value.yingjiao = desiredYingjiao;
    }

    // 顶部统计的“支出”显示：支付金额合计（不是吧台支付）
    app.shiftStats = {
      internetFee: wangfeiVal,
      salesRevenue: shouhuoVal,
      meituanRevenue: meituanVal,
      expenditure: Number(totalExpenditureAmount.value) || 0,
      income: Number(totalIncomeAmount.value) || 0,
      amountDue: desiredYingjiao,
    };
  },
  { immediate: true }
);

const expenseTableContainerRef = ref<HTMLDivElement | null>(null);
const expenseTableRef = ref<HTMLTableElement | null>(null);
const incomeTableContainerRef = ref<HTMLDivElement | null>(null);
const incomeTableRef = ref<HTMLTableElement | null>(null);
const meituanTableContainerRef = ref<HTMLDivElement | null>(null);
const meituanTableRef = ref<HTMLTableElement | null>(null);

const expenseFit = useAutoFitTable(expenseTableContainerRef, expenseTableRef, {
  getHeaders: () => ['支出项目', '支付金额', '吧台支付', '财务支付'],
  getRows: () => expenses.value,
  getRowValues: (r) => [
    String(r.item ?? ''),
    String(r.amount ?? ''),
    String(r.barPay ?? ''),
    String(formatAuto(r.financePay)),
  ],
  safetyGapPx: 8,
  minColPx: 72,
  padXByCol: [40, 28, 28, 28],
  watchDeps: () => [mode.value, expenses.value.length],
});

const expenseScale = computed(() => expenseFit.scale.value);
const expenseTargetWidth = computed(() => expenseFit.targetWidth.value);
const expenseColWidths = computed(() => expenseFit.colWidths.value);

const incomeFit = useAutoFitTable(incomeTableContainerRef, incomeTableRef, {
  getHeaders: () => ['入账项目', '入账金额'],
  getRows: () => incomes.value,
  getRowValues: (r) => [String(r.item ?? ''), String(r.amount ?? '')],
  safetyGapPx: 8,
  minColPx: 84,
  padXByCol: [40, 28],
  watchDeps: () => [mode.value, incomes.value.length],
});

const incomeScale = computed(() => incomeFit.scale.value);
const incomeTargetWidth = computed(() => incomeFit.targetWidth.value);
const incomeColWidths = computed(() => incomeFit.colWidths.value);

const showMeituanType = ref(false);
const showMeituanRemark = ref(false);
const showMeituanStore = ref(false);

const getMeituanHeaders = () => {
  const h: string[] = ['序号', '交易快照'];
  if (showMeituanType.value) h.push('商品类型');
  h.push('券号', '消费金额', '商家优惠', '消费时间', '用户手机');
  if (showMeituanRemark.value) h.push('备注');
  if (showMeituanStore.value) h.push('验证门店');
  h.push('团单价', '财务价', '计费价');
  return h;
};

const meituanFit = useAutoFitTable(meituanTableContainerRef, meituanTableRef, {
  getHeaders: getMeituanHeaders,
  getRows: () => (meituanRows.value as any[]).map((o, idx) => ({ ...o, _idx: idx + 1 })),
  getRowValues: (o: any) => {
    const v: string[] = [
      String(o?._idx ?? ''),
      String(o?.nameMain || o?.name || ''),
    ];
    if (showMeituanType.value) v.push(String(o?.type || '-'));
    v.push(
      String(o?.coupon || ''),
      `¥${String(formatAuto(o?.amount))}`,
      `¥${String(formatAuto(o?.discount))}`,
      String(o?.time || ''),
      String(o?.phone || '-'),
    );
    if (showMeituanRemark.value) v.push(String(o?.remark || '-'));
    if (showMeituanStore.value) v.push(String(o?.store || '-'));
    v.push(
      `¥${String(formatAuto(o?.actual))}`,
      `¥${String(formatAuto(o?.financial))}`,
      `¥${String(formatAuto(o?.barPrice || o?.bar))}`,
    );
    return v;
  },
  safetyGapPx: 8,
  minColPx: 56,
  padXByCol: [24, 48, 32, 40, 28, 28, 44, 40, 40, 40, 32, 32, 32],
  watchDeps: () => [
    mode.value,
    meituanRows.value.length,
    showMeituanType.value,
    showMeituanRemark.value,
    showMeituanStore.value,
  ],
});

const meituanScale = computed(() => meituanFit.scale.value);
const meituanTargetWidth = computed(() => meituanFit.targetWidth.value);
const meituanColWidths = computed(() => meituanFit.colWidths.value);

const showPackageModal = ref(false);
const packageRules = ref([
  { tests: '新会员 特惠', price: 30 },
  { tests: '新会员 女神', price: 30 },
  { tests: '新会员 超值', price: 100 },
  { tests: '5070 3小时', price: 34 },
  { tests: '5070 4小时', price: 44 },
  { tests: '5070 包天', price: 110 },
  { tests: '网游区 3小时', price: 26 },
  { tests: '网游区 4小时', price: 36 },
  { tests: '网游区 包天', price: 90 },
  { tests: '网游区 包早', price: 25 },
  { tests: '网游区 包夜', price: 45 },
  { tests: '普通区 包夜', price: 30 },
  { tests: '普通区 包天', price: 70 },
  { tests: '老会员 生日', price: 66 },
  { tests: '电竞区 通宵', price: 55 },
  { tests: '1000 送500', price: 1000 },
  { tests: '100 送20', price: 100 },
]);

const meituanStats = computed(() => {
  const rows = meituanRows.value;
  // 计算财务价: (amount - discount) * (1 - rate)
  const financialTotal = rows.reduce((s, r) => s + (r.financial || 0), 0);
  
  // 计算计费价 (Bar Total): Sum of Package Prices matched
  // 注意：未匹配套餐的行，其 barPrice 为 0
  const barTotal = rows.reduce((s, r) => s + (r.barPrice || 0), 0);
  
  // 最终显示的“美团”合计逻辑：
  // 优先使用计费价合计；若计费价为0且财务价>0，则使用财务价（兜底）
  // 这与旧版 ShiftModule.js 逻辑一致
  const finalTotal = barTotal > 0 ? barTotal : (financialTotal > 0 ? financialTotal : 0);
  
  // Coke count logic
  let cokes = 0;
  const keywords = ['可口可乐', '可乐', 'Coke', 'coke'];
  rows.forEach(r => {
    const rawName = String(r.name || '');
    const bracketIdx = rawName.indexOf('[');
    const nameMain = bracketIdx > 0 ? rawName.slice(0, bracketIdx).trim() : rawName;
    
    const s = (nameMain + ' ' + (r.type||'')).toLowerCase();
    if (!keywords.some(k => s.includes(k.toLowerCase()))) return;
    
    let best = 1;
    keywords.forEach(k => {
      const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const m1 = s.match(new RegExp(`${escaped}\\s*[xX\\*\\u00D7]\\s*(\\d+)`));
      if (m1) best = Math.max(best, parseInt(m1[1]) || 1);
      const m2 = s.match(new RegExp(`${escaped}[^\\d]{0,4}(\\d+)\\s*(瓶|听|罐|杯|份|个)`));
      if (m2) best = Math.max(best, parseInt(m2[1]) || 1);
    });
    cokes += best;
  });

  // 修正时间范围格式：显示完整时间戳
  const times = rows.map(r => r.time).filter(Boolean).sort();
  const range = times.length > 0 ? `${times[0]} ~ ${times[times.length-1]}` : '';

  return {
    barTotal: finalTotal, // 最终用于 Handover 的值
    realBarTotal: barTotal, // 仅套餐计费价
    financialTotal: parseFloat(financialTotal.toFixed(2)),
    count: rows.length,
    cokes,
    range
  };
});

const isCokeOrder = (o: any) => {
  const keywords = ['可口可乐', '可乐', 'Coke', 'coke'];
  const rawName = String(o?.name || o?.nameMain || '');
  const bracketIdx = rawName.indexOf('[');
  const nameMain = bracketIdx > 0 ? rawName.slice(0, bracketIdx).trim() : rawName;
  const s = (nameMain + ' ' + String(o?.type || '')).toLowerCase();
  return keywords.some(k => s.includes(k.toLowerCase()));
};

// Update shiftState.meituan when meituanStats changes
watch(meituanStats, (v) => {
  shiftState.value.meituan = v.barTotal ? v.barTotal.toString() : '';
  updateYingjiao();
}, { immediate: true });



function findPackagePrice(name: string, rules: any[]) {
  const normName = name.replace(/\s+/g, ' ');
  for (const r of rules) {
    const tests = r.tests.split(' ').filter(Boolean);
    if (tests.length === 2 && tests.every((t: string) => normName.includes(t))) {
      return r.price;
    }
  }
  return 0; // Return 0 if not found
}

function addPackageRule() {
  packageRules.value.push({ tests: '', price: 0 });
}

function resetPackageRules() {
  packageRules.value = [
    { tests: '新会员 特惠', price: 30 },
    { tests: '新会员 女神', price: 30 },
    { tests: '新会员 超值', price: 100 },
    { tests: '5070 3小时', price: 34 },
    { tests: '5070 4小时', price: 44 },
    { tests: '5070 包天', price: 110 },
    { tests: '网游区 3小时', price: 26 },
    { tests: '网游区 4小时', price: 36 },
    { tests: '网游区 包天', price: 90 },
    { tests: '网游区 包早', price: 25 },
    { tests: '网游区 包夜', price: 45 },
    { tests: '普通区 包夜', price: 30 },
    { tests: '普通区 包天', price: 70 },
    { tests: '老会员 生日', price: 66 },
    { tests: '电竞区 通宵', price: 55 },
    { tests: '1000 送500', price: 1000 },
    { tests: '100 送20', price: 100 },
  ];
}

function savePackageRules() {
  meituanRows.value = meituanRows.value.map(o => ({
    ...o,
    barPrice: findPackagePrice(o.name, packageRules.value) || 0
  }));
  showPackageModal.value = false;
  shiftState.value.meituan = meituanStats.value.barTotal.toString();
  updateYingjiao();
}

const handleMeituanParse = async () => {
  try {
    let text = meituanOrderText.value;
    if (!text && navigator.clipboard) {
      text = await navigator.clipboard.readText();
      meituanOrderText.value = text;
    }
    if (!text) return alert("剪贴板为空，且输入框无内容");

    const lines = text.trim().split(/\n/).map(l => l.trim()).filter(Boolean);
    const results: any[] = [];
    const couponMap = new Map();
    const timeRe = /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/;

    lines.forEach((line, idx) => {
      const cols = line.split('\t').map(c => c.trim());
      if (cols.length < 4) return;
      
      const maybeHeader = (cols[0]||'') + (cols[1]||'') + (cols[2]||'');
      if (maybeHeader.includes('交易') && maybeHeader.includes('券')) return;

      const timeIdx = cols.findIndex(c => timeRe.test(c));
      
      let name, type, coupon, amount, discount, time, phone, remark, store;
      if (timeIdx !== -1) {
        time = cols[timeIdx];
        if (timeIdx === 0) {
          name = cols[1]; type = ''; coupon = cols[2];
          amount = parseMoney(cols[3]);
          discount = parseDiscountTotal(cols[4]);
          phone = ''; remark = ''; store = '';
        } else {
          name = cols[0];
          type = cols[1];
          coupon = cols[2];
          amount = parseMoney(cols[3]);
          const discountPart = cols.slice(4, timeIdx).filter(Boolean).join(' ');
          discount = parseDiscountTotal(discountPart);
          phone = cols[timeIdx + 1] || '';
          remark = cols[timeIdx + 2] || '';
          const storePart = cols.slice(timeIdx + 3).filter(Boolean).join(' ');
          store = storePart || (cols[timeIdx + 3] || '');
        }
      } else {
        name = cols[0]; type = cols[1]; coupon = cols[2];
        amount = parseMoney(cols[3]);
        discount = parseDiscountTotal(cols[4]);
        time = cols[5] || '';
        phone = cols[6] || '';
        remark = cols[7] || '';
        store = cols[8] || '';
      }

      if (coupon && couponMap.has(coupon)) return; 
      if (coupon) couponMap.set(coupon, true);

      const actualPrice = amount - discount;
      const financial = actualPrice * (1 - meituanTaxRate.value);
      const barPrice = findPackagePrice(name, packageRules.value) || 0;

      // 提取交易快照主标题（去除价格和ID）
      const bracketIdx = name.indexOf('[');
      const nameMain = bracketIdx > 0 ? name.slice(0, bracketIdx).trim() : name;

      // 生成优惠金额的tooltip（显示计算过程和原内容）
      const discountRaw = cols.slice(4, timeIdx !== -1 ? timeIdx : 5).filter(Boolean).join(' ') || '-';
      const discountTooltip = discount > 0 
        ? `原内容: ${discountRaw}\n总计: ¥${formatAuto(discount)}`
        : '无优惠';

      results.push({ 
        id: idx,
        name, 
        nameMain,  // 主标题
        type, 
        coupon, 
        amount, 
        discount, 
        discountRaw,  // 原始优惠内容
        discountTooltip,  // 优惠tooltip
        actual: actualPrice, 
        financial, 
        barPrice, 
        time, phone, remark, store 
      });
    });

    results.sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    meituanRows.value = results;
    shiftState.value.meituan = meituanStats.value.barTotal.toString();
    updateYingjiao();
    console.log('✅ 成功解析', results.length, '条订单，计费价总计:', meituanStats.value.barTotal);
  } catch (e) {
    // 使用错误处理函数
    const errorMsg = handleMeituanParseError(e, { 
      textLength: meituanOrderText.value.length,
      timestamp: new Date().toISOString()
    });
    alert(errorMsg);
  }
};


const clearMeituan = () => {
  if (isReadonly.value) return;
  meituanRows.value = [];
  meituanOrderText.value = '';
  performSave();
};

// --- Persistence (Auto-Save) ---
let autoSaveTimer: any = null;

const buildShiftLiveId = (dateYmd: string, shift: string, employee: string) => {
  return `${dateYmd}::${shift}::${employee}`;
};

const loadActiveShiftFromCloud = async () => {
  if (!supabase) return;

  activeShiftMissing.value = false;

  // Preferred: instance-level active shift (date/shift/employee) via shifts.status=active
  // Note: some deployments may have a different shifts schema (e.g. shift definitions).
  // In that case PostgREST returns 400; we fallback to the latest shift_records entry.
  const { data, error } = await (supabase as any)
    .from('shifts')
    .select('date_ymd, shift_type, employee, start_at')
    .eq('status', 'active')
    .order('start_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!error && data) {
    const dateYmd = String(data.date_ymd || '').trim();
    const shift = String(data.shift_type || '').trim();
    const employee = String(data.employee || '').trim();
    if (dateYmd && shift && employee) {
      activeShiftCtx.value = { dateYmd, shift, employee };
      return;
    }
  }

  if (error) {
    console.warn('[loadActiveShiftFromCloud] shifts query failed, fallback to shift_records:', error);
  }

  const { data: fallbackData, error: fallbackError } = await (supabase as any)
    .from('shift_records')
    .select('date_ymd, shift, employee, created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fallbackError || !fallbackData) {
    activeShiftMissing.value = true;
    return;
  }

  const dateYmd = String(fallbackData.date_ymd || '').trim();
  const shift = String(fallbackData.shift || '').trim();
  const employee = String(fallbackData.employee || '').trim();
  if (!dateYmd || !shift || !employee) {
    activeShiftMissing.value = true;
    return;
  }

  activeShiftCtx.value = { dateYmd, shift, employee };
};

const todayYmd = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const defaultShiftByNow = () => {
  const d = new Date();
  const minutes = d.getHours() * 60 + d.getMinutes();
  const dayStart = 8 * 60;
  const dayEnd = 20 * 60;
  return minutes >= dayStart && minutes < dayEnd ? '白班' : '晚班';
};

const openStartShiftModal = () => {
  const user = auth.currentUser;
  const defaultEmployee = String(user?.username || '').trim() || String(app.currentEmployee || '').trim();
  startShiftForm.value = {
    date: todayYmd(),
    shift: defaultShiftByNow(),
    employee: defaultEmployee,
  };
  ;(async () => {
    await loadShiftPeople();
  })();
  showStartShiftModal.value = true;
};

const ensureShiftContext = async (): Promise<boolean> => {
  if (activeShiftCtx.value?.dateYmd && activeShiftCtx.value?.shift && activeShiftCtx.value?.employee) {
    app.setShift(activeShiftCtx.value.dateYmd, activeShiftCtx.value.shift, activeShiftCtx.value.employee);
    return true;
  }

  // Local fallback: if local shift_records has any row, use latest
  try {
    const rows = await tauriCmd<any[]>('shift_records_list', { limit: 1 });
    const r = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    const dateYmd = String(r?.date_ymd || '').trim();
    const shift = String(r?.shift || '').trim();
    const employee = String(r?.employee || '').trim();
    if (dateYmd && shift && employee) {
      activeShiftCtx.value = { dateYmd, shift, employee };
      app.setShift(dateYmd, shift, employee);
      activeShiftMissing.value = false;
      return true;
    }
  } catch {
    // ignore
  }

  // No record: must prompt user to start first shift
  openStartShiftModal();
  activeShiftMissing.value = true;
  return false;
};

const confirmStartShift = async () => {
  const date = String(startShiftForm.value.date || '').trim();
  const shift = String(startShiftForm.value.shift || '').trim();
  const employee = String(startShiftForm.value.employee || '').trim();
  if (!date || !shift || !employee) {
    toast.error('请填写完整：日期 / 班次 / 当班人');
    return;
  }

  if (!auth.currentUser) {
    if (!shiftPeople.value || shiftPeople.value.length === 0) {
      await loadShiftPeople();
    }
    if (!shiftPeople.value || shiftPeople.value.length === 0) {
      toast.error('当前未登录且未检测到本地账号，请先创建超管并登录后再开班');
      return;
    }
  }

  if (!shiftPeople.value || shiftPeople.value.length === 0) {
    await loadShiftPeople();
  }

  const allowed = new Set(shiftPeople.value.map(s => String(s || '').trim()).filter(Boolean));
  if (auth.currentUser?.username) allowed.add(String(auth.currentUser.username).trim());
  if (!allowed.has(employee)) {
    toast.error('当班人用户名不存在，请从列表选择或先在系统中创建账号');
    return;
  }

  try {
    await tauriCmd<string>('shift_record_insert', {
      input: {
        date_ymd: date,
        shift,
        employee,
        wangfei: 0,
        shouhuo: 0,
        meituan: 0,
        zhichu: 0,
        income: 0,
        yingjiao: 0,
      },
    });
  } catch (e) {
    console.error('Failed to create first shift record:', e);
    toast.error('创建班次失败，请重试');
    return;
  }

  activeShiftCtx.value = { dateYmd: date, shift, employee };
  app.setShift(date, shift, employee);
  activeShiftMissing.value = false;
  showStartShiftModal.value = false;
};

const applyShiftLiveDraft = async (draft: any) => {
  if (!draft) return;

  if (draft.shiftState) {
    shiftState.value.wangfei = draft.shiftState.wangfei ?? '';
    shiftState.value.shouhuo = draft.shiftState.shouhuo ?? 0;
    shiftState.value.meituan = draft.shiftState.meituan ?? '';
    shiftState.value.zhichu = draft.shiftState.zhichu ?? 0;
    shiftState.value.yingjiao = draft.shiftState.yingjiao ?? 0;
  }

  if (draft.expenses) {
    const restoredExpenses = Array.isArray(draft.expenses) ? draft.expenses : [];
    expenses.value = restoredExpenses.map((it: any) => ({
      item: it?.item ?? '',
      amount: it?.amount ?? '',
      barPay: it?.barPay ?? '',
      financePay: calculateFinancePay(it?.amount ?? '', it?.barPay ?? ''),
    }));
    const last = expenses.value[expenses.value.length - 1];
    if (!last || String(last.item ?? '') !== '' || String(last.amount ?? '') !== '' || String(last.barPay ?? '') !== '') {
      expenses.value.push({ item: '', amount: '', barPay: '', financePay: '' });
    }
  }

  if (draft.incomes) {
    const restoredIncomes = Array.isArray(draft.incomes) ? draft.incomes : [];
    incomes.value = restoredIncomes.map((it: any) => ({
      item: it?.item ?? '',
      amount: it?.amount ?? '',
    }));
    const last = incomes.value[incomes.value.length - 1];
    if (!last || String(last.item ?? '') !== '' || String(last.amount ?? '') !== '') {
      incomes.value.push({ item: '', amount: '' });
    }
  }

  if (draft.meituanRows) meituanRows.value = draft.meituanRows;

  if (
    (!handoverRows.value || handoverRows.value.length === 0) &&
    draft.handoverRowsSnapshot &&
    Array.isArray(draft.handoverRowsSnapshot) &&
    draft.handoverRowsSnapshot.length > 0
  ) {
    handoverRows.value = draft.handoverRowsSnapshot.map((it: any) => {
      const row: HandoverRow = {
        id: it?.id ?? it?.name ?? '',
        name: it?.name ?? it?.id ?? '',
        category: it?.category ?? '未分类',
        unit_price: Number(it?.unit_price) || 0,
        stock: Number(it?.stock) || 0,
        spec: Number(it?.spec) || 1,
        original: Number(it?.original) || 0,
        restock: it?.restock ?? '',
        remaining: it?.remaining ?? '',
        redeem: it?.redeem ?? '',
        redeem_discount: Number(it?.redeem_discount) || getDefaultRedeemDiscount(String(it?.name ?? it?.id ?? '')),
        loss: it?.loss ?? '',
        auto_loss: Number(it?.auto_loss) || 0,
        purchase: Number(it?.purchase) || 0,
        stockVal: Number(it?.stockVal) || 0,
        sales: 0,
        revenue: 0,
        unitPriceVal: Number(it?.unitPriceVal) || Number(it?.unit_price) || 0,
        specVal: Number(it?.specVal) || Number(it?.spec) || 1,
      };
      return row;
    });
  }

  if (draft.handoverInputs && Array.isArray(draft.handoverInputs)) {
    const inputMap = new Map(draft.handoverInputs.map((i: any) => [i.id, i]));
    handoverRows.value.forEach(p => {
      const saved = inputMap.get(p.id) as any;
      if (saved) {
        p.restock = (saved.restock === 0 ? '' : (saved.restock ?? ''));
        p.remaining = saved.remaining ?? '';
        p.redeem = (saved.redeem === 0 ? '' : (saved.redeem ?? ''));
        p.loss = (saved.loss === 0 ? '' : (saved.loss ?? ''));
      }
    });
  }

  updateHandoverCalc();
  updateYingjiao();
};

const loadShiftLiveFromCloud = async () => {
  if (!supabase) return;

  const { dateYmd, shift, employee } = getShiftCtx();
  if (!dateYmd || !shift || !employee) return;

  const id = buildShiftLiveId(dateYmd, shift, employee);
  const { data, error } = await (supabase as any)
    .from('shift_live')
    .select('payload, updated_at')
    .eq('id', id)
    .maybeSingle();

  if (error || !data?.payload) return;

  if (!canEdit.value) {
    await applyShiftLiveDraft(data.payload);
  }
};

const setupShiftLiveRealtime = () => {
  if (!supabase) return;

  const { dateYmd, shift, employee } = getShiftCtx();
  if (!dateYmd || !shift || !employee) return;

  const id = buildShiftLiveId(dateYmd, shift, employee);

  try {
    shiftLiveSubscription?.unsubscribe();
  } catch {
    // ignore
  }
  shiftLiveSubscription = subscribeToTable('shift_live', `id=eq.${id}`, async (payload: any) => {
    const now = Date.now();
    if (canEdit.value && now - lastLocalEditAt.value < 2000) return;
    const nextDraft = payload?.new?.payload;
    if (!nextDraft) return;
    if (!canEdit.value) {
      await applyShiftLiveDraft(nextDraft);
    }
  });
};

const persistShiftLive = async (draft: any) => {
  if (!canEdit.value) return;

  const { dateYmd, shift, employee } = getShiftCtx();
  if (!dateYmd || !shift || !employee) return;

  const id = buildShiftLiveId(dateYmd, shift, employee);
  const barPay = Number(totalBarPay.value) || 0;
  const income = Number(totalIncomeAmount.value) || 0;
  const wangfei = Number(shiftState.value.wangfei) || 0;
  const shouhuo = Number(shiftState.value.shouhuo) || 0;
  const meituan = Number(shiftState.value.meituan) || 0;
  const amountDue = Number(shiftState.value.yingjiao) || 0;

  // 1) 本地实时落盘：SQLite kv（断电/断网可恢复）
  try {
    await tauriCmd('kv_set', {
      key: `shift_live:${id}`,
      value: {
        id,
        date_ymd: dateYmd,
        shift,
        employee,
        wangfei,
        shouhuo,
        meituan,
        bar_pay: barPay,
        income,
        amount_due: amountDue,
        payload: draft,
        updated_at: new Date().toISOString(),
      },
    });
  } catch {
    // ignore
  }

  // 2) 云端同步：enqueue upsert -> sync
  try {
    const syncService = getSyncService();
    syncService.enqueue({
      table: 'shift_live',
      operation: 'upsert',
      data: {
        id,
        date_ymd: dateYmd,
        shift,
        employee,
        wangfei,
        shouhuo,
        meituan,
        bar_pay: barPay,
        income,
        amount_due: amountDue,
        payload: draft,
        updated_at: new Date().toISOString(),
      },
    });
    await syncService.sync();
  } catch {
    // ignore (offline)
  }
};

// 创建防抖的保存函数
const performSave = async () => {
    if (isReadonly.value) return;
    if (loading.value) return;

    try {
         lastLocalEditAt.value = Date.now();
         const draft = {
             shiftState: { ...shiftState.value },
             expenses: expenses.value,
             incomes: incomes.value,
             meituanRows: meituanRows.value,
             // 关键：如果刷新时产品列表加载失败（浏览器离线/云端不可达），仍可用该快照恢复盘点表
             handoverRowsSnapshot: handoverRows.value.map(p => ({
                 id: p.id,
                 name: p.name,
                 category: p.category,
                 unit_price: p.unit_price,
                 stock: p.stock,
                 spec: p.spec,
                 original: p.original,
                 restock: p.restock,
                 remaining: p.remaining,
                 redeem: p.redeem,
                 redeem_discount: p.redeem_discount,
                 loss: p.loss,
                 auto_loss: p.auto_loss,
                 purchase: p.purchase,
                 stockVal: p.stockVal,
                 unitPriceVal: p.unitPriceVal,
                 specVal: p.specVal,
             })),
             handoverInputs: handoverRows.value.map(p => ({
                 id: p.id,
                 restock: p.restock,
                 remaining: p.remaining,
                 redeem: p.redeem,
                 loss: p.loss
             }))
         };
         const json = JSON.stringify(draft);

         // 1) 优先写入 Tauri KV（桌面端）
         try {
           await tauriCmd('kv_set', {
             key: `cashier_draft_v1`,
             value: json
           });
         } catch {
           // ignore, fallback to localStorage below
         }

         // 2) 浏览器刷新兜底：写入 localStorage
         try {
           localStorage.setItem('cashier_draft_v1', json);
         } catch {
           // ignore
         }

         // 3) 实时入库+同步云端（本地 SQLite kv + Supabase shift_live）
         await persistShiftLive(draft);
    } catch (e) {
        handleDraftSaveError(e, { 
          timestamp: new Date().toISOString()
        });
    }
};

const saveDraft = async () => {
    if (isReadonly.value) return;
    if (loading.value) return;

    // 防抖 1 秒
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(performSave, 1000);
};

const loadDraft = async () => {
    try {
        if (isReadonly.value) return;
        let json: string | null = null;
        try {
          json = await tauriCmd<string>('kv_get', { key: `cashier_draft_v1` });
        } catch {
          json = null;
        }

        // 浏览器兜底：从 localStorage 读
        if (!json) {
          try {
            json = localStorage.getItem('cashier_draft_v1');
          } catch {
            json = null;
          }
        }

        if (!json) return;

        const draft = JSON.parse(json);
        await applyShiftLiveDraft(draft);
    } catch (e) {
        // 使用错误处理函数
        handleDraftLoadError(e, { 
          timestamp: new Date().toISOString()
        });
    }
};

// Watch for changes to trigger auto-save
watch(
    [shiftState, expenses, incomes, meituanRows, handoverRows], 
    () => saveDraft(), 
    { deep: true }
);

onMounted(async () => {
  try {
    loading.value = true;
    
    // 1. Fetch Real Products from Backend
    const data = await fetchProducts();
    products.value = data;
    
    // 2. Initialize Handover Rows
    handoverRows.value = data.map(p => ({
        ...p,
        original: p.stock, 
        restock: '',
        remaining: '', 
        redeem: '',
        redeem_discount: getDefaultRedeemDiscount(p.name),
        loss: '',
        auto_loss: 0,
        purchase: 0,
        stockVal: p.stock,
        sales: 0,
        revenue: 0,
        unitPriceVal: p.unit_price,
        specVal: parseFloat(String(p.spec)) || 0
    }));
    
    await loadActiveShiftFromCloud();
    const ok = await ensureShiftContext();
    if (!ok) {
      return;
    }

    // 3. Load Draft (Restore previous state)
    await loadDraft();

    await loadShiftLiveFromCloud();
    setupShiftLiveRealtime();

  } catch (e) {
    console.error("Failed to load products:", e);
  } finally {
    loading.value = false;
  }
});

watch(
  activeShiftCtx,
  async () => {
    await loadShiftLiveFromCloud();
    setupShiftLiveRealtime();
  },
  { deep: true }
);

onBeforeUnmount(() => {
  try {
    shiftLiveSubscription?.unsubscribe();
  } catch {
    // ignore
  }
  shiftLiveSubscription = null;
});

const updateHandoverCalc = () => {
    let totalRev = 0;
    handoverRows.value.forEach(row => {
        const isCokeProduct = (() => {
          const keywords = ['可口可乐', '可乐', 'coke'];
          const n = String(row.name || '').toLowerCase();
          return keywords.some(k => n.includes(k));
        })();

        // 负数兜底：除进货外都不允许负数
        if (row.restock !== '' && Number(row.restock) < 0) row.restock = '';
        if (row.redeem !== '' && Number(row.redeem) < 0) row.redeem = '';
        if (row.loss !== '' && Number(row.loss) < 0) row.loss = '';
        if (row.remaining !== '' && Number(row.remaining) < 0) row.remaining = 0;

        // 1. 计算销量: 销量 = 原数 + 补货 - 剩余
        row.sales = calculateSales(row.original, row.restock, row.remaining);
        
        // 2. 扣减自动匹配逻辑（不覆盖手动输入，只写入 auto_loss 标签）
        row.auto_loss = meituanRows.value.reduce((count, order) => {
            const snapshot = String(order?.name || '').toLowerCase();
            const rawName = String(row.name || '').toLowerCase();
            if (!snapshot || !rawName) return count;

            // 兼容：可口可乐在订单里通常写“可乐”
            const keyword = rawName.includes('可口可乐') ? '可乐' : rawName;
            return snapshot.includes(keyword) ? count + 1 : count;
        }, 0);

        // 导入去重：如果美团订单里已识别到“可乐”，则该商品的兑奖数量要扣掉自动扣减（避免 兑奖=1 且 美团=1 双计）
        if (isCokeProduct) {
          const manualRedeem = Number(row.redeem) || 0;
          const autoLoss = Number(row.auto_loss) || 0;
          if (manualRedeem > 0 && autoLoss > 0) {
            const deduped = Math.max(0, manualRedeem - autoLoss);
            row.redeem = deduped === 0 ? '' : (deduped as any);
          }

          // 扣减去重：导入表里“扣减”常常是总扣减（包含美团可乐），这里自动扣掉 auto_loss，避免合计双计
          const manualLoss = Number(row.loss) || 0;
          if (manualLoss > 0 && autoLoss > 0) {
            const dedupedLoss = Math.max(0, manualLoss - autoLoss);
            row.loss = dedupedLoss === 0 ? '' : (dedupedLoss as any);
          }
        }

        const totalLoss = (Number(row.loss) || 0) + (Number(row.auto_loss) || 0);
        
        // 3. 计算售额: 售额 = (销量 - 损耗 - 兑奖) * 单价 + 兑奖 * 优惠
        row.revenue = calculateRevenue(row.sales, row.redeem, totalLoss, row.unitPriceVal, row.redeem_discount);
        
        // 4. 计算本班库存: 库存 = 前班库存 + 进货 - 取整(补货 / 规格)
        row.stockVal = calculateCurrentStock(row.stock, row.purchase, row.restock, row.specVal);
        
        if (row.revenue > 0) totalRev += row.revenue;
        
        // ===== 验证逻辑 =====
        const original = Number(row.original) || 0;
        const restock = Number(row.restock) || 0;
        const totalAvailable = original + restock;
        const remaining = Number(row.remaining);

        // 校验0: 剩余必填（除非 原数+补货 都为空/为0）
        const remStr = String(row.remaining);
        row.isMissingRemaining = totalAvailable > 0 && (remStr === '' || remStr === 'null' || remStr === 'undefined');
        
        // 校验1: 剩余数不能超过 (原数+补货)
        row.isInvalidRemaining = remaining > totalAvailable;
        
        const redeem = Number(row.redeem) || 0;
        const loss = totalLoss;
        
        // 校验2: 兑奖 + 扣减 <= 剩余（从剩余分桶）
        if (remStr !== '' && remStr !== null && !row.isMissingRemaining) {
            (row as any).isInvalidConsumption = (redeem + loss) > (Number(row.remaining) || 0);
        } else {
            (row as any).isInvalidConsumption = false;
        }
    });

    shiftState.value.shouhuo = totalRev;
    updateYingjiao();
};

watch(
  () => meituanRows.value,
  () => {
    if ((mode.value as string) !== 'handover') return;
    updateHandoverCalc();
  },
  { deep: true }
);

const handleLossInput = (_row?: HandoverRow) => {
    updateHandoverCalc();
};


const handleExpenseInput = (idx: number, field: string) => {
  const item = expenses.value[idx];
  
  if (field === 'amount' || field === 'barPay') {
    // 使用新的计算函数
    item.financePay = calculateFinancePay(item.amount, item.barPay);
  }

  // 自动添加新行
  if (expenses.value[idx].item !== '' && idx === expenses.value.length - 1) {
    expenses.value.push({ item: '', amount: '', barPay: '', financePay: '' });
  }
  
  // 更新交班条的支出关联（吧台支付）
  shiftState.value.zhichu = totalBarPay.value;
  updateYingjiao();
};

const handleIncomeInput = (idx: number) => {
  if (incomes.value[idx].item !== '' && idx === incomes.value.length - 1) {
    incomes.value.push({ item: '', amount: '' });
  }
  // 触发 Header 的入账统计更新
  updateYingjiao();
};

function updateYingjiao() {
  // 使用新的计算函数
  shiftState.value.yingjiao = calculateAmountDue(
    shiftState.value.wangfei,
    shiftState.value.shouhuo,
    shiftState.value.meituan,
    totalBarPay.value
  );
}

// 售货导入功能 - 从剪贴板直接导入
const importFromClipboard = async () => {
    if (isReadonly.value) return;

    try {
        // 1. 读取剪贴板
        const clipboardText = await navigator.clipboard.readText();
        if (!clipboardText || !clipboardText.trim()) {
            return;
        }

        // 2. 解析数据
        const parsed = parseExcelData(clipboardText);
        if (!parsed) {
            return;
        }

        // 3. 导入班次信息（日期、班次、员工）
        if (parsed.shiftInfo.date) {
            app.currentDate = parsed.shiftInfo.date;
        }
        if (parsed.shiftInfo.shiftType) {
            app.currentShift = parsed.shiftInfo.shiftType;
        }
        if (parsed.shiftInfo.employee) {
            app.currentEmployee = parsed.shiftInfo.employee;
        }

        // 4. 导入网费到交班计算（网费是手动输入的，其他统计自动计算）
        shiftState.value.wangfei = String(parsed.shiftInfo.internetFee || 0);

        // 5. 导入商品数据
        const newProductNames: string[] = [];

        for (const item of parsed.inventory) {
            const existingProduct = products.value.find(p => p.name === item.productName);
            const existingRow = handoverRows.value.find(r => r.id === item.productName);

            if (existingProduct || existingRow) {
                // 已存在商品：更新原数、补货、剩余、兑奖、扣减（销量和售额自动计算）
                if (existingRow) {
                    existingRow.original = item.original;
                    existingRow.restock = (item.restock === 0 ? '' : item.restock);
                    existingRow.remaining = item.remaining;
                    existingRow.redeem = ((item.redeem as number) === 0 ? '' : (item.redeem as any));
                    existingRow.loss = ((item.loss as number) === 0 ? '' : (item.loss as any));
                    // 销量和售额由 updateHandoverCalc 自动计算
                }
            } else {
                // 新商品：创建完整行（销量和售额自动计算）
                const newRow: HandoverRow = {
                    id: item.productName,
                    name: item.productName,
                    category: '未分类',
                    unit_price: item.unitPrice,
                    stock: item.stockVal,
                    spec: item.spec,
                    original: item.original,
                    restock: (item.restock === 0 ? '' : item.restock),
                    remaining: item.remaining,
                    redeem: ((item.redeem as number) === 0 ? '' : (item.redeem as any)),
                    redeem_discount: getDefaultRedeemDiscount(item.productName),
                    loss: ((item.loss as number) === 0 ? '' : (item.loss as any)),
                    auto_loss: 0,
                    purchase: typeof item.purchase === 'number' ? item.purchase : (item.purchase === '' ? 0 : parseFloat(String(item.purchase)) || 0),
                    stockVal: item.stockVal,
                    // 销量和售额由 updateHandoverCalc 自动计算
                    sales: 0,
                    revenue: 0,
                    unitPriceVal: item.unitPrice,
                    specVal: item.spec,
                };
                handoverRows.value.push(newRow);
                newProductNames.push(item.productName);
            }
        }

        // 导入后自动计算销量和售额
        updateHandoverCalc();

        // 导入属于关键写操作：立即落盘（跳过1秒防抖），避免用户刷新导致清空
        await performSave();

        // 6. 同步新商品到 Supabase
        const newProductIds: string[] = [];
        for (const name of newProductNames) {
            const row = handoverRows.value.find(r => r.name === name);
            if (row) {
                try {
                    const created = await createProduct({
                        name: row.name,
                        category: row.category,
                        unit_price: row.unit_price,
                        stock: row.stock,
                        spec: row.spec,
                    });
                    newProductIds.push(created.id);
                    products.value.push(created);
                } catch (e) {
                    console.error(`创建商品失败 ${name}:`, e);
                }
            }
        }

        // 7. 保留导入顺序（不排序）- 与老数据顺序一致
        // 注意：不再按名称排序，保持原始Excel顺序

        // 8. 保存导入历史（用于撤回）
        importHistory.value = {
            timestamp: Date.now(),
            newProductIds,
            newProductNames,
            importedNames: [...newProductNames], // 跟踪所有新导入的商品
            expenseCount: 0,
            meituanCount: 0,
        };
    } catch (e) {
        console.error('导入失败:', e);
    }
};

// 撤回导入
const undoImport = async () => {
    if (!importHistory.value || isReadonly.value) return;

    // 移除新导入的商品（从表格中删除）
    const importedNames = importHistory.value.importedNames;
    handoverRows.value = handoverRows.value.filter(row => !importedNames.includes(row.name));

    // 从 products 列表移除新创建的商品（同步到 Supabase 的）
    for (const id of importHistory.value.newProductIds) {
        try {
            await deleteProduct(id);
        } catch (e) {
            console.error(`删除商品失败 ${id}:`, e);
        }
        products.value = products.value.filter(p => p.id !== id);
    }

    // 清空历史记录
    importHistory.value = null;

    // 撤回属于关键写操作：立即落盘
    await performSave();
};

// Replaced by new handleHandoverAction below

const handleInstantCheckout = async () => {
  try {
    await cart.checkout(app.currentEmployee, app.currentShift);
    alert("收银结算成功！");
    const data = await fetchProducts();
    products.value = data;
  } catch (e) {
    alert("收银失败。");
  }
};

// Snapshot & Handover Logic
const showSnapshotModal = ref(false);
const snapshotHtml = ref('');
const snapshotInfo = ref('');
const snapshotTime = ref('');
const handoverContainer = ref<HTMLElement | null>(null);

const showSuccessorPicker = ref(false);
const pendingSnapshotHtml = ref('');
const pendingSnapshotInfo = ref('');

const generateSnapshotHtml = async () => {
    if (!handoverContainer.value) {
      throw new Error('无法访问页面元素');
    }
    
    try {
      // 1. Clone the node to avoid modifying the actual DOM
      const clone = handoverContainer.value.cloneNode(true) as HTMLElement;
      
      // 2. Get stylesheet content to ensure styles are preserved
      let styles = '';
      document.querySelectorAll('style, link[rel="stylesheet"]').forEach(node => {
          styles += node.outerHTML;
      });

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          ${styles}
          <style>
             body { -webkit-font-smoothing: antialiased; padding: 20px; background: #fff; }
             /* Enforce readonly appearance */
             input { pointer-events: none; }
             button { display: none !important; } /* Hide buttons in snapshot */
          </style>
        </head>
        <body>
          ${clone.outerHTML}
        </body>
        </html>
      `;
      return html;
    } catch (e) {
      throw new Error(`快照生成失败: ${e}`);
    }
};

const handleHandoverAction = async () => {
    if (isReadonly.value) return;
    // 1. Check for uncounted items
    const uncounted = handoverRows.value.filter(p => p.remaining === '' || p.remaining === null || p.remaining === undefined);
    if (uncounted.length > 0) {
        if (!confirm(`还有 ${uncounted.length} 项商品未盘点（剩余数为空）。\n是否继续交班？`)) {
            return;
        }
    }

    try {
      // 2. Generate Snapshot
      const html = await generateSnapshotHtml();
      snapshotHtml.value = html;
      snapshotInfo.value = `${app.currentDate} ${app.currentShift} ${app.currentEmployee} → 下一班`;
      
      const now = new Date();
      snapshotTime.value = now.toLocaleString('zh-CN', { hour12: false });
      
      showSnapshotModal.value = true;
    } catch (e) {
      // 使用错误处理函数
      const errorMsg = handleSnapshotGenerationError(e, {
        timestamp: new Date().toISOString(),
        employee: app.currentEmployee,
        shift: app.currentShift
      });
      alert(errorMsg);
    }
};

const resetForNextShift = (successorName: string) => {
  // 1) 清空交班模块输入（网费/美团等）
  shiftState.value.wangfei = '';
  shiftState.value.shouhuo = 0;
  shiftState.value.meituan = '';
  shiftState.value.zhichu = 0;
  shiftState.value.yingjiao = 0;

  // 2) 清空支出/入账/美团数据
  expenses.value = [{ item: '', amount: '', barPay: '', financePay: '' }];
  incomes.value = [{ item: '', amount: '' }];
  meituanRows.value = [];

  // 3) 重置盘点表：原数=上班次剩余，库存=上班次库存
  handoverRows.value = handoverRows.value.map(r => {
    const prevRemaining = Number(r.remaining);
    const nextOriginal = isNaN(prevRemaining) ? 0 : Math.max(0, prevRemaining);
    const nextPrevStock = Number(r.stockVal) || 0;

    return {
      ...r,
      stock: nextPrevStock,
      original: nextOriginal,
      restock: '',
      remaining: '',
      redeem: '',
      loss: '',
      auto_loss: 0,
      purchase: 0,
      stockVal: nextPrevStock,
      sales: 0,
      revenue: 0,
      isInvalidRemaining: false,
      isInvalidConsumption: false,
      isMissingRemaining: false,
    };
  });

  // 4) 切换到接班人
  app.currentEmployee = successorName;
};

const confirmHandover = async () => {
  // 在快照预览里点击“确定交班”后：先弹出接班人选择
  pendingSnapshotHtml.value = snapshotHtml.value;
  pendingSnapshotInfo.value = snapshotInfo.value;
  showSnapshotModal.value = false;
  showSuccessorPicker.value = true;
};

const handleSelectSuccessor = async (successorName: string) => {
  try {
    // 1) 写入交班记录（通过同步队列）
    const wangfei = Number(shiftState.value.wangfei) || 0;
    const shouhuo = Number(shiftState.value.shouhuo) || 0;
    const meituan = Number(shiftState.value.meituan) || 0;
    const zhichu = Number(shiftState.value.zhichu) || 0;
    const income = Number(totalIncomeAmount.value) || 0;
    const yingjiao = Number(shiftState.value.yingjiao) || 0;

    await createShiftRecord({
      employee: app.currentEmployee,
      shift_date: app.currentDate,
      shift_type: app.currentShift,
      successor: successorName,
      snapshot_html: pendingSnapshotHtml.value,
      snapshot_info: pendingSnapshotInfo.value || JSON.stringify({
        date: app.currentDate,
        shift: app.currentShift,
        employee: app.currentEmployee,
        successor: successorName,
        timestamp: new Date().toISOString(),
      }),
      financial_summary: {
        cash_amount: wangfei + shouhuo + income,
        sales_amount: shouhuo,
        expense_amount: zhichu,
        total_amount: yingjiao,
        income_amount: income,
        internet_fee: wangfei,
        meituan_revenue: meituan,
      },
    });

    // 2) 切换到接班人，并初始化下一班盘点
    resetForNextShift(successorName);

    showSuccessorPicker.value = false;
    pendingSnapshotHtml.value = '';
    pendingSnapshotInfo.value = '';
  } catch (e) {
    const errorMsg = handleHandoverSubmitError(e, {
      timestamp: new Date().toISOString(),
      employee: app.currentEmployee,
      shift: app.currentShift,
    });
    alert(errorMsg);
  }
};

const filteredSalesProducts = computed(() => {
  if (!searchQuery.value) return products.value;
  const q = searchQuery.value.toLowerCase();
  return products.value.filter(p => p.name.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q)));
});

watch(
  () => [mode.value, handoverRows.value.length],
  () => {
    void updateHandoverTableFit();
  },
  { flush: 'post' }
);

onMounted(() => {
  const containerEl = handoverTableContainerRef.value;
  if (!containerEl || typeof ResizeObserver === 'undefined') return;

  handoverTableResizeObserver = new ResizeObserver(() => {
    void updateHandoverTableFit();
  });
  handoverTableResizeObserver.observe(containerEl);
});

onBeforeUnmount(() => {
  handoverTableResizeObserver?.disconnect();
  handoverTableResizeObserver = null;
});
</script>

<template>
  <div class="h-full flex flex-col gap-2 text-[13px] text-gray-800">


    <Transition name="fade" mode="out-in">
      <!-- Handover Mode (盘点模式) -->
      <div v-if="mode === 'handover'" key="handover" ref="handoverContainer" class="flex-1 overflow-y-auto scroll-smooth immersive-scroll flex flex-col gap-3">
        <!-- Main Content Grid -->
        <div class="flex-1 overflow-hidden grid grid-cols-2 gap-3">
          <!-- Left: Inventory Table -->
          <div class="glass-panel rounded-3xl shadow-xl flex flex-col overflow-y-auto scroll-smooth immersive-scroll relative">
            <!-- Background decoration -->
            <div class="absolute top-0 right-0 w-80 h-80 bg-linear-to-br from-brand-orange/10 to-transparent rounded-bl-full pointer-events-none blur-3xl"></div>
            
            <!-- Shift Information & Stats Bar -->
            <div class="bg-white/40 backdrop-blur-md px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div class="flex flex-wrap items-center gap-4 min-w-0">
                   <div class="flex flex-col">
                      <span class="text-[14px] font-bold tracking-wide text-gray-900">售货清单</span>
                      <span class="text-[8px] font-black text-brand-orange uppercase tracking-widest leading-none mt-1">Sales Inventory</span>
                   </div>
                   <!-- Staff Info -->
                   <div class="flex items-center bg-white/50 backdrop-blur-md rounded-2xl border border-white/60 px-4 h-9 text-[11px] gap-3 shadow-sm whitespace-nowrap shrink-0">
                      <span class="font-bold text-gray-400">{{ shiftCtxForUi.dateYmd }}</span>
                      <span class="w-px h-3 bg-gray-200"></span>
                      <span class="font-black text-brand-orange">{{ shiftCtxForUi.shift }}</span>
                      <span class="w-px h-3 bg-gray-200"></span>
                      <div class="flex items-center gap-2">
                        <div
                          class="w-1.5 h-1.5 rounded-full"
                          :class="activeShiftMissing ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'"
                          :title="activeShiftMissing ? '未找到当前班次（shifts.status=active），请到交班流程开班/切换' : ''"
                        ></div>
                        <span class="font-black text-gray-800">{{ shiftCtxForUi.employee }}</span>
                      </div>
                   </div>
                    
                    <!-- Stats -->
                    <div class="flex items-center bg-white/20 backdrop-blur-md p-1 rounded-2xl border border-white/40 h-9 gap-3 px-3 shadow-inner max-w-full overflow-x-auto whitespace-nowrap">
                        <div class="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/40 transition-all cursor-help group/stat">
                          <span class="text-[13px] text-gray-400 group-hover/stat:text-brand-orange transition-colors">网费</span>
                          <span class="text-[13px] text-gray-800">{{ formatVal(app.shiftStats.internetFee) }}</span>
                        </div>
                        <div class="w-px h-3 bg-gray-200/60"></div>
                        <div class="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/40 transition-all cursor-help group/stat">
                          <span class="text-[13px] text-gray-400 group-hover/stat:text-blue-500 transition-colors">售货</span>
                          <span class="text-[13px] text-blue-600">{{ formatVal(app.shiftStats.salesRevenue) }}</span>
                        </div>
                      <div class="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/40 transition-all cursor-help group/stat">
                          <span class="text-[13px] text-gray-400 group-hover/stat:text-brand-orange transition-colors">美团</span>
                          <span class="text-[13px] text-brand-orange">{{ formatVal(app.shiftStats.meituanRevenue) }}</span>
                        </div>
                        <div class="w-px h-3 bg-gray-200/60"></div>
                        <div class="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/40 transition-all cursor-help group/stat">
                          <span class="text-[13px] text-gray-400 group-hover/stat:text-red-500 transition-colors">支出</span>
                          <span class="text-[13px] text-red-500">{{ formatVal(app.shiftStats.expenditure) }}</span>
                        </div>
                        <div class="w-px h-3 bg-gray-200/60"></div>
                        <div class="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/40 transition-all cursor-help group/stat">
                          <span class="text-[13px] text-gray-400 group-hover/stat:text-emerald-500 transition-colors">入账</span>
                          <span class="text-[13px] text-emerald-600">{{ formatVal(app.shiftStats.income) }}</span>
                        </div>
                     </div>

                       <!-- 售货清单操作 (超管专用) - 右对齐 -->
                        <div class="flex flex-wrap items-center gap-2 justify-end flex-1 min-w-0">
                            <!-- 导入/撤销按钮 (始终显示) -->
                           <div class="flex items-center gap-1 h-10 shrink-0">
                              <button
                                v-if="isAdmin"
                                @click="importFromClipboard"
                                :disabled="isReadonly"
                                class="h-9 px-4 rounded-xl bg-brand-orange text-white text-xs font-bold whitespace-nowrap leading-none hover:bg-orange-600 active:bg-orange-700 transition-colors shadow-lg shadow-orange-200 flex items-center justify-center min-w-[48px]"
                                title="从剪贴板导入售货清单"
                              >
                                导入
                              </button>
                              <button
                                v-if="isAdmin"
                                @click="undoImport"
                                :disabled="isReadonly || !importHistory"
                                class="h-9 px-4 rounded-xl bg-white text-red-500 text-xs font-bold whitespace-nowrap leading-none hover:bg-red-50 active:bg-red-100 transition-colors border border-red-200 shadow-sm flex items-center justify-center min-w-[48px]"
                                title="撤销上次导入的售货清单"
                              >
                                撤销
                              </button>
                           </div>

                           <!-- 盘点/收银模式切换 -->
                            <div class="bg-gray-100 p-0.5 rounded-xl flex gap-0.5 h-10 border border-gray-200/50">
                               <button
                                 @click="mode = 'handover' as any"
                                 class="px-4 rounded-lg text-xs font-medium transition-all flex items-center justify-center min-w-[60px]"
                                 :class="(mode as string) === 'handover' ? 'bg-white text-brand-orange shadow-sm' : 'text-gray-400 hover:text-gray-600'"
                               >
                                 盘点
                               </button>
                               <button
                                 @click="mode = 'sales' as any"
                                 class="px-4 rounded-lg text-xs font-medium transition-all flex items-center justify-center min-w-[60px]"
                                 :class="(mode as string) === 'sales' ? 'bg-white text-brand-orange shadow-sm' : 'text-gray-400 hover:text-gray-600'"
                               >
                                 收银
                              </button>
                           </div>
                        </div>
                </div>
            </div>
          
          <div ref="handoverTableContainerRef" class="flex-1 w-full overflow-auto custom-scrollbar px-2">
            <div
              ref="handoverTableWrapRef"
              class="origin-top-left"
              :style="{
                transform: `scale(${handoverTableScale})`,
                width: handoverTableTargetWidth ? `${handoverTableTargetWidth}px` : 'auto',
              }"
            >
            <table
              ref="handoverTableRef"
              class="text-[13px] table-fixed border-collapse"
              :style="{ width: handoverTableTargetWidth ? `${handoverTableTargetWidth}px` : 'auto' }"
            >
              <colgroup v-if="handoverColWidths.length">
                <col v-for="(w, idx) in handoverColWidths" :key="idx" :style="{ width: `${w}px` }" />
              </colgroup>
               <thead class="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm border-b border-gray-100">
                 <tr class="h-10 text-center text-[13px] text-gray-400 uppercase">
                   <th class="min-w-[140px] pl-4 pr-3 text-left tracking-widest text-gray-400 whitespace-nowrap">商品名称</th>
                   <th class="px-2 whitespace-nowrap">原数</th>
                   <th class="px-2 whitespace-nowrap">补货</th>
                   <th class="px-2 whitespace-nowrap">剩余</th>
                   <th class="px-2 whitespace-nowrap">兑奖</th>
                   <th class="px-2 whitespace-nowrap">扣减</th>
                   <th class="px-2 whitespace-nowrap">进货</th>
                   <th class="px-2 whitespace-nowrap">库存</th>
                   <th class="px-2 whitespace-nowrap">销量</th>
                   <th class="px-2 whitespace-nowrap">销额</th>
                   <th class="px-2 whitespace-nowrap">单价</th>
                   <th class="pr-4 pl-2 whitespace-nowrap">规格</th>
                 </tr>
               </thead>

               <tbody class="divide-y divide-gray-50">
                 <tr v-for="p in handoverRows" :key="p.id" class="h-10 luxury-table-row transition-all group">
                   <td class="min-w-[140px] h-10 text-gray-700 pl-4 pr-3 relative whitespace-nowrap">
                     <div class="absolute inset-y-2 left-0 w-1 bg-brand-orange scale-y-0 group-hover:scale-y-100 transition-transform"></div>
                     {{ p.name }}
                   </td>
                    <!-- 原数：始终只读 -->
                    <td class="text-center h-10 whitespace-nowrap">
                      <input disabled :value="p.original" type="number" class="w-full h-full text-center bg-transparent text-gray-400 outline-none p-0 cursor-not-allowed font-bold" />
                    </td>
                    <!-- 补货：当班人员可编辑，超管可编辑 -->
                    <td class="text-center h-10 whitespace-nowrap">
                      <input :disabled="!isCellEditable('restock')" v-model.number="p.restock" @input="updateHandoverCalc" type="number" min="0" class="w-full h-full text-center bg-transparent focus:bg-white/80 text-red-500 outline-none p-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold" />
                    </td>
                    <!-- 剩余：当班人员可编辑，超管可编辑 -->
                    <td class="text-center h-10 whitespace-nowrap relative">
                       <input :disabled="!isCellEditable('remaining')" v-model.number="p.remaining" @input="updateHandoverCalc" type="number" min="0" class="w-full h-full text-center bg-transparent focus:bg-white/80 text-red-500 outline-none p-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold" />
                       <!-- 缺失提示标签（原数+补货>0 且剩余为空） -->
                       <Transition name="fade">
                         <div
                           v-if="p.isMissingRemaining"
                           class="absolute -top-1 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[8px] px-1 rounded-sm shadow-sm pointer-events-none z-10 whitespace-nowrap"
                         >
                           必填
                         </div>
                       </Transition>
                       <!-- 超出提示标签 -->
                       <Transition name="fade">
                         <div
                           v-if="p.isInvalidRemaining"
                           class="absolute -top-1 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[8px] px-1 rounded-sm shadow-sm pointer-events-none z-10 whitespace-nowrap"
                         >
                           超出
                         </div>
                       </Transition>
                    </td>
                    <!-- 兑奖：左输入数量，右侧显示乐享金额标签；双击弹出设置 -->
                    <td class="h-10 whitespace-nowrap relative" @dblclick="openRedeemModal(p)">
                      <div class="h-10 flex items-center justify-between gap-2 px-1">
                        <input
                          :disabled="!isCellEditable('redeem')"
                          v-model.number="p.redeem"
                          @input="updateHandoverCalc"
                          type="number"
                          min="0"
                          class="w-full h-full text-center bg-transparent focus:bg-white/80 text-red-500 outline-none p-0 transition-all border-none disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                        />

                        <span
                          v-if="(Number(p.redeem) || 0) > 0"
                          class="shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-black whitespace-nowrap"
                          :class="(p as any).isInvalidConsumption ? 'bg-red-500 text-white' : 'bg-red-50 text-red-600'"
                        >
                          <template v-if="(p as any).isInvalidConsumption">超出</template>
                          <template v-else>乐享 {{ formatVal(Number(p.redeem_discount) || 0) }}</template>
                        </span>
                      </div>

                      <Transition name="fade">
                        <div
                          v-if="(p as any).isInvalidConsumption"
                          class="absolute -top-1 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[8px] px-1 rounded-sm shadow-sm pointer-events-none z-10 whitespace-nowrap"
                        >
                          异常
                        </div>
                      </Transition>
                    </td>

                    <!-- 扣减：左输入手动扣减，右侧显示美团自动扣减；计算按两者合计 -->
                    <td class="h-10 whitespace-nowrap relative">
                      <div class="h-10 flex items-center justify-between gap-2 px-1">
                        <input
                          :disabled="!isCellEditable('loss')"
                          v-model.number="p.loss"
                          @input="handleLossInput(p)"
                          type="number"
                          min="0"
                          class="w-full h-full text-center bg-transparent focus:bg-white/80 text-red-500 outline-none p-0 transition-all border-none disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                        />

                        <span
                          v-if="(Number(p.auto_loss) || 0) > 0"
                          class="shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-black whitespace-nowrap"
                          :class="(p as any).isInvalidConsumption ? 'bg-red-500 text-white' : 'bg-orange-50 text-orange-600'"
                        >
                          <template v-if="(p as any).isInvalidConsumption">超出</template>
                          <template v-else>美团 {{ formatVal(p.auto_loss) }}</template>
                        </span>
                      </div>
                    </td>
                   <!-- 进货：当班人员可编辑，超管可编辑 -->
                   <td class="text-center h-10 whitespace-nowrap">
                     <input :disabled="!isCellEditable('purchase')" v-model.number="p.purchase" @input="updateHandoverCalc" type="number" class="w-full h-full text-center bg-transparent focus:bg-white/80 text-red-500 outline-none p-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold" />
                   </td>
                    <!-- 库存：始终只读 -->
                    <td class="text-center h-10 whitespace-nowrap">
                      <span class="text-[13px] font-bold" :class="p.stockVal !== p.stock ? 'text-red-500' : 'text-gray-500'">
                        {{ formatVal(p.stockVal) }}
                      </span>
                    </td>
                    <!-- 销量：始终只读 -->
                    <td class="text-center h-10 whitespace-nowrap">
                      <span class="text-[13px] text-gray-900 font-bold">{{ formatNumberKeepZero(p.sales) }}</span>
                    </td>
                    <!-- 销额：始终只读 -->
                    <td class="text-center h-10 whitespace-nowrap font-black">
                      <span class="text-gray-900">{{ formatNumberKeepZero(p.revenue) }}</span>
                    </td>
                   <!-- 单价：始终只读 -->
                   <td class="px-2 text-center h-10 whitespace-nowrap">
                     <span class="text-gray-300">{{ formatAuto(p.unitPriceVal) }}</span>
                   </td>
                   <!-- 规格：始终只读 -->
                   <td class="text-center pr-4 pl-2 h-10 whitespace-nowrap">
                     <span class="text-[13px] text-gray-300">{{ formatAuto(p.specVal) }}</span>
                   </td>
                 </tr>
               </tbody>
            </table>
            </div>
          </div>
        </div>

        <!-- Right: Content Column (Handover Summary, Accounting, Meituan) -->
        <div class="flex flex-col gap-2 overflow-y-auto immersive-scroll pr-1">
          
           <!-- [Replica] Handover Module (交班计算核心) -->
           <div class="glass-panel rounded-2xl border border-black/5 shadow-2xl flex flex-col overflow-hidden shrink-0">
             <div class="px-6 py-3 flex items-center justify-between bg-white shrink-0 border-b border-gray-100">
                <div class="flex flex-col">
                   <span class="text-[14px] font-bold tracking-wide text-gray-900">交班计算</span>
                   <span class="text-[8px] font-black text-brand-orange uppercase tracking-widest leading-none mt-1">Handover Calculation</span>
                </div>
                <!-- 交班按钮 Moved to Header -->
                <button 
                  @click="handleHandoverAction"
                  :disabled="isReadonly"
                  class="h-9 px-6 rounded-xl font-black text-[12px] bg-brand-orange text-white border-brand-orange shadow-xl shadow-orange-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-20 shrink-0"
                >
                  交班预览
                </button>
             </div>
             <div class="p-2">
                <div class="flex items-center gap-2 overflow-hidden">
                 <!-- 网费：当班人员可编辑，超管可编辑 -->
                 <div class="flex-1 min-w-0 h-10 flex bg-white rounded-xl overflow-hidden border border-gray-100 focus-within:ring-4 focus-within:ring-orange-500/10 focus-within:border-brand-orange/40 transition-all shadow-sm">
                     <div class="bg-gray-50 px-2 flex items-center justify-center text-[13px] text-gray-500 border-r border-gray-100 shrink-0 uppercase tracking-wide">网费</div>
                     <input :disabled="!isCellEditable('wangfei')" v-model.number="shiftState.wangfei" @input="updateYingjiao" type="number" class="w-full h-full bg-transparent text-center text-[13px] text-gray-900 outline-none p-0 disabled:opacity-50 disabled:cursor-not-allowed" />
                  </div>
                  <!-- 售货 (Auto) -->
                  <div class="flex-1 min-w-0 h-10 flex bg-blue-50/20 rounded-xl overflow-hidden border border-blue-100/50 shadow-sm">
                     <div class="bg-blue-50/50 px-2 flex items-center justify-center text-[13px] text-blue-500 border-r border-blue-100/30 shrink-0 uppercase tracking-wide">售货</div>
                     <input :value="formatVal(app.shiftStats.salesRevenue)" readonly class="w-full h-full bg-transparent text-center text-[13px] text-blue-600 outline-none p-0 cursor-default" />
                  </div>
                  <!-- 美团 (Auto) -->
                  <div class="flex-1 min-w-0 h-10 flex bg-orange-50/20 rounded-xl overflow-hidden border border-orange-100/50 shadow-sm">
                     <div class="bg-orange-50/50 px-2 flex items-center justify-center text-[13px] text-orange-500 border-r border-orange-100/30 shrink-0 uppercase tracking-wide">美团</div>
                     <input :value="formatVal(app.shiftStats.meituanRevenue)" readonly class="w-full h-full bg-transparent text-center text-[13px] text-brand-orange outline-none p-0 cursor-default" />
                  </div>
                  <!-- 支出 (Auto) -->
                  <div class="flex-1 min-w-0 h-10 flex bg-red-50/20 rounded-xl overflow-hidden border border-red-100/50 shadow-sm">
                     <div class="bg-red-50/50 px-2 flex items-center justify-center text-[13px] text-red-500 border-r border-red-100/30 shrink-0 uppercase tracking-wide">支出</div>
                     <input :value="formatVal(app.shiftStats.expenditure)" readonly class="w-full h-full bg-transparent text-center text-[13px] text-red-600 outline-none p-0 cursor-default" />
                  </div>
                  <!-- 入账 (Auto) -->
                  <div class="flex-1 min-w-0 h-10 flex bg-emerald-50/20 rounded-xl overflow-hidden border border-emerald-100/50 shadow-sm">
                     <div class="bg-emerald-50/50 px-2 flex items-center justify-center text-[13px] text-emerald-500 border-r border-emerald-100/30 shrink-0 uppercase tracking-wide">入账</div>
                     <input :value="formatVal(app.shiftStats.income)" readonly class="w-full h-full bg-transparent text-center text-[13px] text-emerald-600 outline-none p-0 cursor-default" />
                  </div>
                  <!-- 财务 (Result) -->
                  <div class="flex-[1.2] min-w-[130px] h-10 flex bg-brand-dark rounded-xl overflow-hidden border border-brand-dark group/total transition-all shadow-2xl">
                     <div class="bg-white/10 px-3 flex items-center justify-center text-[13px] text-gray-400 border-r border-white/10 shrink-0">应缴</div>
                     <div class="w-full bg-transparent flex items-center justify-center text-[13px] text-white leading-none truncate px-2 group-hover:text-brand-orange transition-colors">
                        {{ formatVal(app.shiftStats.amountDue) }}
                     </div>
                  </div>
              </div>
           </div>
         </div>

           <!-- Accounting Module 记账模块 -->
           <div class="glass-panel rounded-2xl border border-black/5 shadow-lg flex flex-col overflow-hidden shrink-0">
             <div class="px-6 py-3 flex items-center justify-between bg-white shrink-0 border-b border-gray-100">
                <div class="flex flex-col">
                   <span class="text-[14px] tracking-wide text-gray-900">财务记账</span>
                   <span class="text-[8px] text-brand-orange uppercase tracking-widest leading-none mt-1">Finance Accounting</span>
                </div>
                <div class="flex items-center gap-4 text-[9px] text-gray-400 whitespace-nowrap">
                  <span>支出金额 <span class="text-red-500 font-black">{{ formatVal(totalExpenditureAmount) }}</span></span>
                  <span class="opacity-40">|</span>
                  <span>财务做支付 <span class="text-blue-600 font-black">{{ formatVal(totalBarPay) }}</span></span>
                  <span class="opacity-40">|</span>
                  <span>财务支出 <span class="text-gray-700 font-black">{{ formatVal(totalFinancePay) }}</span></span>
                  <span class="opacity-40">|</span>
                  <span>入账金额 <span class="text-emerald-600 font-black">{{ formatVal(totalIncomeAmount) }}</span></span>
                </div>
             </div>
            <div class="grid grid-cols-2 gap-0 bg-white/20">
              <!-- Expenditure Table -->
              <div class="border-r border-gray-100 flex flex-col overflow-hidden">
                 <div ref="expenseTableContainerRef" class="max-h-[250px] overflow-hidden px-1">
                    <div
                      class="origin-top-left"
                      :style="{ transform: `scale(${expenseScale})`, width: expenseTargetWidth ? `${expenseTargetWidth}px` : 'auto' }"
                    >
                    <table
                      ref="expenseTableRef"
                      class="border-collapse text-[11px] table-fixed"
                      :style="{ width: expenseTargetWidth ? `${expenseTargetWidth}px` : 'auto' }"
                    >
                      <colgroup v-if="expenseColWidths.length">
                        <col v-for="(w, idx) in expenseColWidths" :key="idx" :style="{ width: `${w}px` }" />
                      </colgroup>
                      <thead class="sticky top-0 z-10 bg-white/60 backdrop-blur-md">
                        <tr class="font-bold text-gray-500 h-10 border-b border-gray-100 uppercase tracking-wide">
                          <th class="pl-3 pr-2 text-left whitespace-nowrap">
                            <div class="flex flex-col">
                              <span class="text-[10px]">支出项目</span>
                              <span class="text-[8px] opacity-40">ITEM</span>
                            </div>
                          </th>
                          <th class="px-2 whitespace-nowrap">
                             <div class="flex flex-col items-center">
                              <span class="text-[10px]">支付金额</span>
                              <span class="text-[8px] opacity-40">AMT</span>
                            </div>
                          </th>
                          <th class="px-2 whitespace-nowrap">
                             <div class="flex flex-col items-center">
                              <span class="text-[10px] text-blue-600">吧台支付</span>
                              <span class="text-[8px] text-blue-400/50">BAR PAY</span>
                            </div>
                          </th>
                          <th class="px-2 whitespace-nowrap">
                             <div class="flex flex-col items-center">
                              <span class="text-[10px]">财务支付</span>
                              <span class="text-[8px] opacity-40">FINANCE</span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-50">
                        <tr v-for="(it, idx) in expenses" :key="idx" class="h-9 luxury-table-row">
                          <td class="relative h-9 whitespace-nowrap">
                             <!-- 支出项目：当班人员可编辑，超管可编辑 -->
                             <input :disabled="!isCellEditable('expenseItem')" v-model="it.item" @input="handleExpenseInput(idx, 'item')" type="text" class="w-full h-full bg-transparent outline-none font-black text-gray-700 placeholder:text-gray-300 text-[12px] disabled:opacity-50 disabled:cursor-not-allowed" placeholder="支出项目..." />
                          </td>
                          <td class="h-9 whitespace-nowrap">
                             <!-- 金额：当班人员可编辑，超管可编辑 -->
                             <input :disabled="!isCellEditable('expenseAmount')" v-model="it.amount" @input="handleExpenseInput(idx, 'amount')" type="number" class="w-full h-full text-center bg-transparent outline-none font-bold text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed" />
                          </td>
                          <td class="h-9 whitespace-nowrap">
                             <!-- 吧台支付：当班人员可编辑，超管可编辑 -->
                             <input :disabled="!isCellEditable('barPay')" v-model="it.barPay" @input="handleExpenseInput(idx, 'barPay')" type="number" class="w-full h-full text-center bg-transparent outline-none font-black text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed" />
                          </td>
                          <td class="text-center h-9 whitespace-nowrap">
                             <span class="text-gray-400 text-[10px] font-bold">{{ formatAuto(it.financePay) }}</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    </div>
                  </div>
              </div>
              <!-- Income Table -->
              <div class="flex flex-col overflow-hidden">
                 <div ref="incomeTableContainerRef" class="max-h-[250px] overflow-hidden px-1">
                    <div
                      class="origin-top-left"
                      :style="{ transform: `scale(${incomeScale})`, width: incomeTargetWidth ? `${incomeTargetWidth}px` : 'auto' }"
                    >
                    <table
                      ref="incomeTableRef"
                      class="border-collapse text-[11px] table-fixed"
                      :style="{ width: incomeTargetWidth ? `${incomeTargetWidth}px` : 'auto' }"
                    >
                      <colgroup v-if="incomeColWidths.length">
                        <col v-for="(w, idx) in incomeColWidths" :key="idx" :style="{ width: `${w}px` }" />
                      </colgroup>
                      <thead class="sticky top-0 z-10 bg-white/60 backdrop-blur-md">
                        <tr class="font-bold text-gray-500 h-10 border-b border-gray-100 uppercase tracking-wide">
                          <th class="pl-3 pr-2 text-left whitespace-nowrap">
                            <div class="flex flex-col">
                              <span class="text-[10px]">入账项目</span>
                              <span class="text-[8px] opacity-40">ITEM</span>
                            </div>
                          </th>
                          <th class="px-2 whitespace-nowrap">
                             <div class="flex flex-col items-center">
                              <span class="text-[10px]">入账金额</span>
                              <span class="text-[8px] opacity-40">AMT</span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-50">
                        <tr v-for="(it, idx) in incomes" :key="idx" class="h-9 luxury-table-row">
                          <td class="relative h-9 whitespace-nowrap">
                             <!-- 入账项目：当班人员可编辑，超管可编辑 -->
                             <input :disabled="!isCellEditable('incomeItem')" v-model="it.item" @input="handleIncomeInput(idx)" type="text" class="w-full h-full bg-transparent outline-none font-black text-gray-700 placeholder:text-gray-300 text-[12px] disabled:opacity-50 disabled:cursor-not-allowed" placeholder="入账项目..." />
                          </td>
                          <td class="h-9 whitespace-nowrap">
                             <!-- 入账金额：当班人员可编辑，超管可编辑 -->
                             <input :disabled="!isCellEditable('incomeAmount')" v-model="it.amount" @input="handleIncomeInput(idx)" type="number" class="w-full h-full text-center bg-transparent outline-none font-black text-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed" />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    </div>
                  </div>
              </div>
            </div>
          </div>

          <!-- Meituan Module 美团验券 -->
          <div class="glass-panel rounded-2xl border border-white/60 shadow-lg flex flex-col overflow-hidden flex-1 min-h-0">
            <div class="h-14 flex items-center justify-between px-6 bg-white shrink-0 border-b border-gray-100">
               <div class="flex flex-col">
                  <span class="text-[14px] font-bold tracking-wide text-gray-900">美团订单</span>
                  <span class="text-[8px] font-black text-brand-orange uppercase tracking-widest leading-none mt-1">Meituan Orders</span>
               </div>
                <div class="flex items-center gap-3">
                  <div class="flex bg-gray-100 p-0.5 rounded-xl border border-gray-200/50 gap-1 items-center px-1">
                    <button @click="showMeituanType = !showMeituanType" :class="showMeituanType ? 'bg-white text-brand-orange shadow-sm' : 'text-gray-400'" class="h-7 px-3 rounded-lg text-[10px] font-medium transition-all">类型</button>
                    <button @click="showMeituanRemark = !showMeituanRemark" :class="showMeituanRemark ? 'bg-white text-brand-orange shadow-sm' : 'text-gray-400'" class="h-7 px-3 rounded-lg text-[10px] font-medium transition-all">备注</button>
                    <button @click="showMeituanStore = !showMeituanStore" :class="showMeituanStore ? 'bg-white text-brand-orange shadow-sm' : 'text-gray-400'" class="h-7 px-3 rounded-lg text-[10px] font-medium transition-all">门店</button>
                  </div>
                  <button :disabled="isReadonly" @click="showPackageModal = true" class="h-9 px-4 rounded-xl bg-white border border-gray-200 text-gray-600 text-xs font-medium hover:bg-black hover:text-white active:scale-95 transition-all disabled:opacity-20">配置</button>
                  <button :disabled="isReadonly" @click="clearMeituan" class="h-9 px-4 rounded-xl bg-red-50 text-red-500 border border-red-100 text-xs font-medium hover:bg-red-100 active:scale-95 transition-all">
                    撤销
                  </button>
                  <button :disabled="isReadonly" @click="handleMeituanParse" class="h-9 px-4 rounded-xl bg-brand-orange text-white text-xs font-medium shadow-lg shadow-orange-500/20 active:scale-95 transition-all disabled:opacity-20">
                    导入
                  </button>
                </div>
            </div>
            <div class="bg-orange-50/20 p-2 flex items-center gap-6 pl-4 shrink-0 border-b border-orange-100/30 flex-wrap">
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-black text-gray-400">起止时间</span>
                <span class="text-[11px] font-black text-gray-700 font-din">{{ meituanStats.range || '-' }}</span>
              </div>
              <div class="w-px h-4 bg-orange-100/50"></div>
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-black text-gray-400">核销</span>
                <span class="text-[14px] font-black text-gray-800">{{ meituanStats.count }}</span>
              </div>
              <div class="w-px h-4 bg-orange-100/50"></div>
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-black text-gray-400">可乐</span>
                <span class="text-[14px] font-black text-red-600">{{ meituanStats.cokes }}</span>
              </div>
              <div class="w-px h-4 bg-orange-100/50"></div>
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-black text-gray-400">财务价</span>
                <span class="text-[14px] font-black text-emerald-600">¥{{ formatAuto(meituanStats.financialTotal) }}</span>
              </div>
              <div class="w-px h-4 bg-orange-100/50"></div>
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-black text-gray-400">计费价</span>
                <span class="text-[14px] font-black text-brand-orange">¥{{ formatAuto(meituanStats.barTotal) }}</span>
              </div>
            </div>
            <div ref="meituanTableContainerRef" class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden immersive-scroll px-1 pb-2">
              <div
                class="origin-top-left"
                :style="{ transform: `scale(${meituanScale})`, width: meituanTargetWidth ? `${meituanTargetWidth}px` : 'auto' }"
              >
              <table
                ref="meituanTableRef"
                class="border-collapse text-[10px] table-fixed"
                :style="{ width: meituanTargetWidth ? `${meituanTargetWidth}px` : 'auto' }"
              >
                <colgroup v-if="meituanColWidths.length">
                  <col v-for="(w, idx) in meituanColWidths" :key="idx" :style="{ width: `${w}px` }" />
                </colgroup>
                <thead class="sticky top-0 bg-white/95 backdrop-blur-md z-10 shadow-sm border-b border-gray-100">
                  <tr class="h-10 font-bold text-gray-500 uppercase tracking-wide text-center text-[12px]">
                    <th class="border-r border-gray-50 px-2 whitespace-nowrap">序号</th>
                    <th class="text-left pl-3 pr-2 border-r border-gray-50 whitespace-nowrap">交易快照</th>
                    <th v-if="showMeituanType" class="px-2 border-r border-gray-50 whitespace-nowrap">商品类型</th>
                    <th class="px-2 border-r border-gray-50 whitespace-nowrap">券号</th>
                    <th class="px-2 border-r border-gray-50 whitespace-nowrap">消费金额</th>
                    <th class="px-2 border-r border-gray-50 whitespace-nowrap">商家优惠</th>
                    <th class="px-2 border-r border-gray-50 text-left whitespace-nowrap">消费时间</th>
                    <th class="px-2 border-r border-gray-50 whitespace-nowrap">用户手机</th>
                    <th v-if="showMeituanRemark" class="px-2 border-r border-gray-50 whitespace-nowrap">备注</th>
                    <th v-if="showMeituanStore" class="px-2 border-r border-gray-50 whitespace-nowrap">验证门店</th>
                    <th class="px-2 border-r border-gray-50 text-emerald-600 whitespace-nowrap">团单价</th>
                    <th class="px-2 border-r border-gray-50 text-emerald-700 whitespace-nowrap">财务价</th>
                    <th class="px-2 text-brand-orange whitespace-nowrap">计费价</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-50">
                  <tr v-for="(o, idx) in meituanRows" :key="idx" class="h-9 luxury-table-row text-center" :class="isCokeOrder(o) ? 'bg-red-50/40' : ''">
                    <td class="px-2 text-gray-300 text-[11px] border-r border-gray-50/30 whitespace-nowrap" :class="isCokeOrder(o) ? 'border-l-4 border-l-red-500 text-red-600' : ''">{{ idx + 1 }}</td>
                    <td class="pl-3 pr-2 text-left font-bold truncate border-r border-gray-50/30 whitespace-nowrap" :class="isCokeOrder(o) ? 'text-red-600' : 'text-gray-700'" :title="o.name">{{ o.nameMain || o.name }}</td>
                    <td v-if="showMeituanType" class="px-2 text-gray-400 truncate border-r border-gray-50/30 whitespace-nowrap">{{ o.type || '-' }}</td>
                    <td class="px-2 text-gray-400 text-[11px] border-r border-gray-50/30 font-din whitespace-nowrap">{{ o.coupon }}</td>
                    <td class="px-2 text-gray-500 border-r border-gray-50/30 font-din whitespace-nowrap">¥{{ formatAuto(o.amount) }}</td>
                    <td class="px-2 text-gray-400 border-r border-gray-50/30 font-din whitespace-nowrap" :title="o.discountTooltip">¥{{ formatAuto(o.discount) }}</td>
                    <td class="px-2 text-left text-gray-400 text-[11px] border-r border-gray-50/30 font-din whitespace-nowrap">{{ o.time }}</td>
                    <td class="px-2 text-gray-400 text-[11px] border-r border-gray-50/30 font-din whitespace-nowrap">{{ o.phone || '-' }}</td>
                    <td v-if="showMeituanRemark" class="px-2 text-gray-400 truncate border-r border-gray-50/30 whitespace-nowrap" :title="o.remark">{{ o.remark || '-' }}</td>
                    <td v-if="showMeituanStore" class="px-2 text-gray-400 truncate border-r border-gray-50/30 whitespace-nowrap" :title="o.store">{{ o.store || '-' }}</td>
                    <td class="px-2 text-emerald-600 font-black border-r border-gray-50/30 font-din whitespace-nowrap">¥{{ formatAuto(o.actual) }}</td>
                    <td @dblclick="openTaxModal" class="px-2 text-emerald-700 font-black border-r border-gray-50/30 cursor-help font-din whitespace-nowrap">¥{{ formatAuto(o.financial) }}</td>
                    <td class="px-2 font-black text-brand-orange font-din whitespace-nowrap">¥{{ formatAuto(o.barPrice || o.bar) }}</td>
                  </tr>
                </tbody>
              </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

      <!-- Sales Mode (售卖模式) -->
      <div v-else key="sales" class="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 overflow-y-auto scroll-smooth immersive-scroll relative">
        <div class="col-span-1 md:col-span-8 lg:col-span-9 flex flex-col gap-3 overflow-hidden">
          <div class="flex-1 overflow-auto pr-1 custom-scrollbar">
            <div v-if="loading" class="flex flex-col items-center justify-center h-full text-gray-300 gap-4">
               <div class="w-12 h-12 border-[3px] border-gray-100 border-t-brand-orange rounded-full animate-spin shadow-lg"></div>
               <span class="text-[12px] font-black uppercase tracking-[0.4em] text-gray-400 animate-pulse">Initializing Interface...</span>
            </div>
            <TransitionGroup 
              v-else 
              name="scale" 
              tag="div" 
              class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 content-start"
            >
              <ProductCard v-for="p in filteredSalesProducts" :key="p.id" :product="p" @add="cart.addToCart" />
            </TransitionGroup>
          </div>
        </div>
        
        <!-- Desktop Cart Column -->
        <div class="hidden md:flex md:col-span-4 lg:col-span-3 flex-col overflow-hidden glass-card rounded-[32px] border border-white/60 relative shadow-2xl">
            <!-- Decorative Glow -->
            <div class="absolute -top-20 -right-20 w-60 h-60 bg-brand-orange/20 blur-[100px] rounded-full pointer-events-none"></div>
            <div class="h-16 border-b border-gray-100 flex items-center justify-between px-6 shrink-0 bg-white shadow-sm">
               <div class="flex flex-col">
                  <span class="text-[14px] font-bold tracking-wide text-gray-900">售货清单</span>
                  <span class="text-[8px] font-black text-brand-orange uppercase tracking-widest leading-none mt-1">Sales Inventory</span>
               </div>
               <div class="flex items-center gap-3">
                  <div class="bg-gray-100 p-1 rounded-2xl flex gap-1 h-9 relative group overflow-hidden shadow-inner border border-gray-200/50">
                     <div 
                       class="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-xl shadow-lg shadow-black/5 transition-transform duration-500 ease-spring"
                       :style="{ transform: (mode as string) === 'handover' ? 'translateX(0)' : 'translateX(100%)' }"
                     ></div>
                     <button @click="mode = 'handover'" class="relative z-10 px-4 rounded-xl text-[10px] font-black transition-colors flex flex-col items-center justify-center leading-none" :class="(mode as string) === 'handover' ? 'text-brand-orange' : 'text-gray-400'">
                       盘点
                     </button>
                     <button @click="mode = 'sales'" class="relative z-10 px-4 rounded-xl text-[10px] font-black transition-colors flex flex-col items-center justify-center leading-none" :class="(mode as string) === 'sales' ? 'text-brand-orange' : 'text-gray-400'">
                       售卖
                     </button>
                  </div>
                  <button @click="cart.clearCart" class="text-[10px] text-red-500 font-black hover:bg-black hover:text-white px-3 py-2 rounded-xl transition-all border border-red-50 group/clear" :disabled="cart.items.length === 0">
                     清空 RESET
                  </button>
               </div>
            </div>
            <div class="flex-1 overflow-auto p-4 flex flex-col gap-3 custom-scrollbar">
              <TransitionGroup name="slide-up">
                <CartItem v-for="item in cart.items" :key="item.id" :item="item" @add="cart.addToCart" @remove="cart.removeFromCart" />
              </TransitionGroup>
              <div v-if="cart.items.length === 0" class="flex-1 flex flex-col items-center justify-center grayscale">
                 <div class="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center text-3xl mb-4 border border-gray-100 shadow-inner opacity-40">🛒</div>
                 <span class="text-[10px] font-black uppercase tracking-[0.3em] text-gray-300">购物车空空如也 / Cart Empty</span>
              </div>
            </div>
            <div class="p-8 bg-white/40 backdrop-blur-3xl border-t border-white/80 shrink-0 shadow-[0_-24px_48px_rgba(0,0,0,0.03)] relative overflow-hidden">
               <!-- Subtle glow behind total -->
               <div class="absolute -top-40 -right-40 w-80 h-80 bg-brand-orange/5 blur-[120px] pointer-events-none"></div>
               
               <div class="flex justify-between items-center mb-8 relative z-10">
                 <div class="flex flex-col">
                   <span class="text-gray-500 text-[11px] font-black uppercase tracking-wider">应付合计支付</span>
                   <span class="text-[8px] font-black text-gray-300 uppercase tracking-widest leading-none mt-1">TOTAL AMOUNT PAYABLE</span>
                 </div>
                 <div class="flex items-baseline gap-1.5 group/total">
                   <span class="text-xl font-black text-gray-300 group-hover:text-brand-orange transition-colors">¥</span>
                   <span class="font-bold tracking-wide text-gray-900 leading-none group-hover:text-brand-orange transition-colors">{{ formatAuto(cart.totalAmount) }}</span>
                 </div>
               </div>
               
               <button 
                 @click="handleInstantCheckout" 
                 :disabled="cart.items.length === 0" 
                 class="h-16 w-full rounded-[28px] bg-brand-dark text-white font-black text-[18px] tracking-[0.3em] shadow-2xl shadow-gray-900/10 active:scale-95 transition-all overflow-hidden relative group"
               >
                 <div class="absolute inset-0 bg-linear-to-tr from-brand-orange to-orange-400 opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
                 <span class="relative z-10">立即结算 AUTHORIZE</span>
                 <div class="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-linear-to-r from-transparent via-white/10 to-transparent pointer-events-none"></div>
               </button>
            </div>
        </div>
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="showStartShiftModal" class="fixed inset-0 z-100 flex items-center justify-center p-4 modal-backdrop">
        <Transition name="scale" appear>
          <div v-if="showStartShiftModal" class="w-full max-w-[420px] glass-card rounded-[32px] shadow-2xl overflow-hidden relative" @click.stop>
            <div class="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white/40">
              <div class="flex flex-col">
                <span class="font-black text-gray-800 text-lg tracking-tight">开班 / 创建当前班次</span>
                <span class="text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Start Shift Required</span>
              </div>
              <div class="text-[10px] font-black text-orange-500 uppercase tracking-widest">第一次使用</div>
            </div>

            <div class="p-8 space-y-5 bg-white/40">
              <div class="space-y-2">
                <label class="text-[12px] font-medium text-gray-600">日期</label>
                <input
                  v-model="startShiftForm.date"
                  type="date"
                  class="w-full h-11 px-4 rounded-xl border border-gray-200 focus:border-brand-orange/40 focus:ring-4 focus:ring-orange-500/10 outline-none font-mono text-sm"
                />
              </div>

              <div class="space-y-2">
                <label class="text-[12px] font-medium text-gray-600">班次</label>
                <select
                  v-model="startShiftForm.shift"
                  class="w-full h-11 px-4 rounded-xl border border-gray-200 focus:border-brand-orange/40 focus:ring-4 focus:ring-orange-500/10 outline-none font-mono text-sm"
                >
                  <option value="白班">白班</option>
                  <option value="晚班">晚班</option>
                </select>
              </div>

              <div class="space-y-2">
                <label class="text-[12px] font-medium text-gray-600">当班人</label>
                <select
                  v-model="startShiftForm.employee"
                  class="w-full h-11 px-4 rounded-xl border border-gray-200 focus:border-brand-orange/40 focus:ring-4 focus:ring-orange-500/10 outline-none font-mono text-sm"
                >
                  <option value="" disabled>请选择当班人</option>
                  <option v-for="p in shiftPeople" :key="p" :value="p">{{ p }}</option>
                </select>
              </div>

              <button
                @click="confirmStartShift"
                class="glass-button w-full h-14 bg-brand-orange text-white font-black rounded-[20px] shadow-xl transition-all active:scale-95"
              >
                确认开班并进入收银台
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
    <!-- 套餐配置弹窗 -->
    <Transition name="fade">
      <div v-if="showPackageModal" class="fixed inset-0 z-100 modal-backdrop flex items-center justify-center" @click.self="showPackageModal = false">
        <Transition name="scale" appear>
          <div v-if="showPackageModal" class="glass-card rounded-[40px] w-[900px] max-w-[96vw] max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div class="flex items-center justify-between px-10 py-8 border-b border-gray-100 shrink-0 bg-white/40">
              <div class="flex flex-col gap-1">
                 <div class="font-black text-2xl text-gray-800 tracking-tight">美团套餐配置中心</div>
                 <div class="text-[10px] font-black text-orange-500 uppercase tracking-[0.4em]">Meituan Logic Engine</div>
              </div>
              <button @click="showPackageModal = false" class="w-12 h-12 rounded-full hover:bg-black/5 flex items-center justify-center text-gray-400 transition-all active:scale-90">✕</button>
            </div>
            <div class="p-10 overflow-y-auto immersive-scroll bg-white/40 backdrop-blur-sm">
              <div class="bg-orange-50/50 border border-orange-100 rounded-2xl p-6 mb-8 flex items-start gap-4">
                <div class="text-2xl mt-1">💡</div>
                <div class="text-xs text-orange-800/80 leading-relaxed font-medium">
                  每条套餐规则由 <span class="font-black text-orange-600">两个关键字</span> 组成。系统会自动扫描订单快照，当同时满足这两个词时触发计费逻辑。
                  <br/>
                  <span class="opacity-60 italic text-[10px]">示例：输入 "网游区 3小时"，点击保存后，所有对应订单将按此价格计算。</span>
                </div>
              </div>
              
              <div class="grid grid-cols-2 gap-4">
                <div v-for="(rule, idx) in packageRules" :key="idx" class="group relative animate-slide-up" :style="{ animationDelay: `${idx * 0.05}s` }">
                  <div class="flex items-center gap-2 p-1 bg-white/50 rounded-2xl border border-white group-hover:border-brand-orange/30 transition-all group-hover:shadow-lg group-hover:shadow-orange-200/20">
                    <input v-model="rule.tests" type="text" placeholder="关键词A 关键词B" class="h-11 flex-1 px-4 bg-transparent text-sm font-black outline-none border-none placeholder:text-gray-300" />
                    <div class="h-6 w-px bg-gray-100"></div>
                    <div class="flex items-center px-4 bg-gray-50 rounded-xl h-11 border border-gray-50">
                      <span class="text-gray-400 text-xs mr-2">¥</span>
                      <input v-model.number="rule.price" type="number" class="w-16 bg-transparent text-center font-black text-sm outline-none" />
                    </div>
                    <button @click="packageRules.splice(idx, 1)" class="w-11 h-11 rounded-xl flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all">
                      <svg viewBox="0 0 24 24" fill="none" class="w-5 h-5" stroke="currentColor" stroke-width="2.5"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="px-10 py-6 border-t border-gray-100 flex gap-4 shrink-0 bg-white/60">
              <button @click="addPackageRule" class="glass-button h-12 px-6 rounded-2xl flex items-center justify-center gap-2 font-black text-sm text-gray-600">
                <span class="text-xl">+</span> 新增规则
              </button>
              <button @click="resetPackageRules" class="glass-button h-12 px-6 rounded-2xl font-black text-sm text-gray-400 italic">
                重置默认
              </button>
              <button @click="savePackageRules" class="glass-button bg-brand-orange text-white h-12 px-10 rounded-2xl font-black text-sm ml-auto shadow-xl shadow-orange-200/50">
                生效并保存
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

    <!-- Tax Modal -->
    <Transition name="fade">
      <div v-if="showTaxModal" class="fixed inset-0 z-100 flex items-center justify-center p-4 modal-backdrop" @click.self="showTaxModal = false">
        <Transition name="scale" appear>
          <div v-if="showTaxModal" class="w-full max-w-[340px] glass-card rounded-[32px] shadow-2xl overflow-hidden relative" @click.stop>
              <div class="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white/40">
                  <div class="flex flex-col">
                    <span class="font-black text-gray-800 text-lg tracking-tight">调整财务税率</span>
                    <span class="text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Financial Tax Setting</span>
                  </div>
                  <button @click="showTaxModal = false" class="w-10 h-10 rounded-full hover:bg-black/5 flex items-center justify-center text-gray-400 transition-colors">✕</button>
              </div>
              <div class="p-8 space-y-8 bg-white/40">
                  <div class="space-y-4">
                      <div class="flex justify-between items-center px-1">
                        <label class="text-[11px] font-black text-gray-400 uppercase tracking-widest">税率百分数 (%)</label>
                        <span class="text-orange-500 font-black text-xs">{{ tempTaxRate }}%</span>
                      </div>
                      <div class="relative group">
                          <div class="absolute -inset-1 bg-brand-orange/10 rounded-2xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                          <div class="relative flex items-center bg-white border border-gray-100 rounded-[20px] h-16 transition-all shadow-sm">
                            <input v-model="tempTaxRate" type="number" class="w-full h-full bg-transparent font-black text-3xl text-center outline-none" placeholder="7" />
                            <span class="absolute right-6 font-black text-gray-200 text-xl">%</span>
                          </div>
                      </div>
                  </div>
                  <button @click="saveTaxRate" class="glass-button w-full h-14 bg-gray-900 text-white font-black rounded-[20px] shadow-xl transition-all active:scale-95">
                     确认修改
                  </button>
              </div>
          </div>
        </Transition>
      </div>
    </Transition>

    <SnapshotModal
      :is-open="showSnapshotModal"
      :html-content="snapshotHtml"
      :info="snapshotInfo"
      :timestamp="snapshotTime"
      @close="showSnapshotModal = false"
      @confirm="confirmHandover"
    />

    <QuickLoginPanel
      :is-open="showSuccessorPicker"
      mode="successor"
      @close="showSuccessorPicker = false; pendingSnapshotHtml = ''; pendingSnapshotInfo = ''"
      @select-successor="handleSelectSuccessor"
    />

    <!-- Mobile Cart FAB (Only in Sales Mode on Mobile) -->
    <Transition name="scale">
      <button
        v-if="mode === 'sales'"
        @click="showMobileCart = true"
        class="md:hidden fixed bottom-6 right-6 z-40 w-16 h-16 rounded-full bg-brand-orange text-white shadow-2xl flex items-center justify-center active:scale-95 transition-transform"
      >
        <div class="relative">
             <span class="text-2xl">🛒</span>
             <span v-if="cartTotalItems > 0" class="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                {{ cartTotalItems }}
             </span>
        </div>
      </button>
    </Transition>

    <!-- Mobile Cart Overlay -->
    <Transition name="slide-up">
      <div v-if="showMobileCart && mode === 'sales'" class="fixed inset-0 z-50 flex flex-col bg-gray-100 md:hidden">
          <!-- Header -->
          <div class="h-14 bg-white px-4 flex items-center justify-between border-b border-gray-100 shrink-0">
             <span class="font-black text-lg text-gray-800">购物车 ({{ cartTotalItems }})</span>
             <button @click="showMobileCart = false" class="text-gray-400 font-bold p-2">关闭</button>
          </div>
          
          <!-- Cart Items -->
          <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-3 immersive-scroll">
               <CartItem v-for="item in cart.items" :key="item.id" :item="item" @add="cart.addToCart" @remove="cart.removeFromCart" />
               <div v-if="cart.items.length === 0" class="flex-1 flex flex-col items-center justify-center opacity-40">
                  <span class="text-4xl mb-4">🛒</span>
                  <span class="text-xs font-black uppercase tracking-widest text-gray-400">Empty Cart</span>
               </div>
          </div>

          <!-- Total & Checkout -->
          <div class="p-6 bg-white border-t border-gray-100 shrink-0 pb-safe">
             <div class="flex justify-between items-center mb-4">
                 <span class="text-xs font-black text-gray-400 uppercase">Total Payable</span>
                 <div class="flex items-baseline gap-1">
                    <span class="text-sm font-bold text-gray-400">¥</span>
                    <span class="text-2xl font-black text-gray-900">{{ formatAuto(cart.totalAmount) }}</span>
                 </div>
             </div>
             
             <button 
                  @click="handleInstantCheckout" 
                  :disabled="cart.items.length === 0" 
                  class="w-full h-14 bg-brand-dark text-white rounded-xl font-black text-lg shadow-xl active:scale-95 transition-transform disabled:opacity-50"
             >
                 立即结算
             </button>
          </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { appearance: none; -webkit-appearance: none; margin: 0; }
input[type=number] { appearance: textfield; -moz-appearance: textfield; }

input[type="number"], input[type="text"] {
  background: transparent;
  width: 100%;
  height: 100%;
  padding: 0 4px;
}
input:focus {
  background: #fff !important;
  box-shadow: inset 0 0 0 1px rgba(255, 102, 51, 0.4) !important;
}

table {
  border-spacing: 0;
  border-collapse: collapse;
}
td, th {
  border-width: 1px;
  border-color: #e2e8f0; /* slate-200 */
}
</style>
