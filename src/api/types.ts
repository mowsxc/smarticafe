/**
 * Smarticafe Pro - API Types
 * 统一的类型定义文件
 */

// ==================== 美团相关类型 ====================

export interface MeituanOrder {
  id: number;
  name: string;
  nameMain: string;
  type: string;
  coupon: string;
  amount: number;
  discount: number;
  discountRaw: string;
  discountTooltip: string;
  actual: number;
  financial: number;
  barPrice: number;
  time: string;
  phone: string;
  remark: string;
  store: string;
}

export interface MeituanStats {
  barTotal: number;
  realBarTotal: number;
  financialTotal: number;
  count: number;
  cokes: number;
  range: string;
}

// ==================== 交班相关类型 ====================

export interface ShiftState {
  internetFee: string | number;      // 网费 (原: wangfei)
  salesRevenue: number;               // 售货收入 (原: shouhuo)
  meituanRevenue: string | number;    // 美团收入 (原: meituan)
  expenditure: number;                // 支出 (原: zhichu)
  income: number;                     // 入账 (新增，对应totalIncomeAmount)
  amountDue: number;                  // 应交金额 (原: yingjiao)
}

export interface ShiftCalculation {
  internetFee: number;
  salesRevenue: number;
  meituanRevenue: number;
  expenditure: number;
  income: number;
  amountDue: number;
}

// 交班记录类型（用于展示）
export interface ShiftRecord {
  id: string;
  date: string;              // 交班日期 YYYY-MM-DD
  shift: string;             // 班次: '早班' | '晚班'
  employee: string;          // 经手人
  successor: string;         // 接班人
  time: string;              // 同步时间 HH:mm
  cashAmount: number;        // 现金合计
  salesAmount: number;       // 零售合计
  expenseAmount: number;     // 支出合计
  totalAmount: number;       // 应缴合计
  notes: string;             // 备注
  created_at?: string;       // 创建时间
}

// 交班快照数据类型（用于保存到数据库）
export interface ShiftSnapshot {
  employee: string;              // 经手人
  shift_date: string;            // 交班日期
  shift_type: string;            // 班次类型
  successor: string;             // 接班人
  snapshot_html?: string;        // 快照HTML
  snapshot_info?: string;        // 快照信息JSON
  financial_summary?: {          // 财务汇总
    cash_amount: number;
    sales_amount: number;
    expense_amount: number;
    total_amount: number;
    income_amount?: number;       // 入账合计
    internet_fee?: number;
    meituan_revenue?: number;
  };
  inventory_snapshot?: {         // 库存快照
    products: Array<{
      id: string;
      name: string;
      original: number;
      remaining: number;
      stock_val: number;
    }>;
  };
  notes?: string;                // 备注
}

// ==================== 财务相关类型 ====================

export interface ExpenseItem {
  item: string;
  amount: number | '';
  barPay: number | '';
  financePay: number | '';
}

export interface IncomeItem {
  item: string;
  amount: number | '';
}

export interface FinanceData {
  expenses: ExpenseItem[];
  incomes: IncomeItem[];
  totalExpenditure: number;
  totalIncome: number;
  totalBarPay: number;
}

// ==================== 商品相关类型 ====================

export interface Product {
  id: string;
  name: string;
  category: string;
  unit_price: number;
  cost_price?: number;
  stock: number;
  spec: number;
  on_shelf?: boolean;
}

export interface InventoryItem extends Product {
  original: number;
  restock: number | '';
  remaining: number | '';
  redeem: number | '';
  loss: number | '';
  purchase: number | '';
  purchaseReason?: string;
  stockVal: number;
  sales: number;
  revenue: number;
  lossMethod?: string;
  isInvalidRemaining?: boolean;
  isInvalidConsumption?: boolean;
  unitPriceVal: number;
  specVal: number;
}

// ==================== API响应类型 ====================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// ==================== 原始班次类型 ====================

// 兑奖优惠配置
export interface RedeemDiscount {
  productName: string;   // 商品名称（支持模糊匹配）
  discount: number;      // 优惠金额（元）
}

// 原始班次快照类型（超管维护的初始数据）
export interface OriginalShiftSnapshot {
  id?: string;
  version: number;                    // 版本号，用于标识不同的快照版本
  is_active: boolean;                 // 是否是当前活跃版本
  shift_date: string;                 // 班次日期
  shift_type: string;                 // 班次类型: '早班' | '晚班'
  employee: string;                   // 经手人

  // 财务汇总
  internetFee: number;                // 网费 (原: wangfei)
  salesRevenue: number;               // 售货 (原: shouhuo)
  meituanRevenue: number;             // 美团 (原: meituan)
  expenditure: number;                // 支出 (原: zhichu)
  income: number;                     // 入账
  amountDue: number;                  // 应交 (原: yingjiao)

  // 商品库存快照
  inventory_items: OriginalShiftInventoryItem[];

  // 支出明细
  expenses: OriginalShiftExpense[];

  // 美团订单数据（粘贴的原始数据）
  meituan_raw_data?: string;

  // 备注
  notes?: string;

  // 超管维护信息
  maintained_by?: string;
  maintained_at?: string;
  created_at?: string;
  updated_at?: string;
}

// 原始班次库存项
export interface OriginalShiftInventoryItem {
  productName: string;       // 商品名称 (原: product_name)
  original: number;          // 原数（接班时的初始库存）
  prevStock: number;         // 前班库存（单位：箱） (原: prev_stock)
  restock: number | '';      // 补货（单位：瓶）
  remaining: number | '';    // 剩余（单位：瓶）
  redeem: number | '';       // 兑奖（单位：瓶）
  redeemAmount: number;      // 兑奖优惠金额 (原: redeem_amount)
  loss: number | '';         // 扣减（单位：瓶）
  lossMethod?: string;       // 扣减方式 (原: loss_method)
  purchase: number;          // 进货（单位：箱）
  stockVal: number;          // 库存（单位：箱） (原: stock_val)
  sales: number;             // 销量（计算得出）
  revenue: number;           // 售额（计算得出）
  unitPrice: number;         // 单价 (原: unit_price)
  spec: number;              // 规格（瓶/箱）
}

// 原始班次支出项
export interface OriginalShiftExpense {
  item: string;              // 支出项目
  amount: number | '';       // 支出金额
  barPay: number | '';       // 吧台支付 (原: bar_pay)
  financePay: number;        // 财务支付（计算得出） (原: finance_pay)
}

// 默认兑奖配置
export const DEFAULT_REDEEM_DISCOUNTS: RedeemDiscount[] = [
  { productName: '中瓶/冰茶', discount: 1 },
  { productName: '大补水', discount: 1 },
  { productName: '东鹏', discount: 1 },
  { productName: '乐虎', discount: 1 },
  { productName: '咖啡', discount: 1 },
  { productName: '口味王30', discount: 5 },
  { productName: '口味王50', discount: 8 },
  { productName: '口味王100', discount: 15 },
];

// 根据商品名称获取默认兑奖金额
export function getDefaultRedeemDiscount(productName: string): number {
  const normalizedName = productName.toLowerCase();
  for (const config of DEFAULT_REDEEM_DISCOUNTS) {
    if (normalizedName.includes(config.productName.toLowerCase()) ||
        config.productName.toLowerCase().includes(normalizedName)) {
      return config.discount;
    }
  }
  return 1; // 默认1元
}
