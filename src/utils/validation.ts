/**
 * 数据验证和格式化工具函数
 * 用于班次结算模块的输入验证和数据处理
 */

/**
 * 安全的数字转换函数
 * 处理非数字输入、空值、NaN 等边界情况
 * 
 * @param val - 输入值（任意类型）
 * @returns 转换后的数字，无效输入返回 0
 * 
 * @example
 * safeNumber('123') // 123
 * safeNumber('abc') // 0
 * safeNumber(null) // 0
 * safeNumber(undefined) // 0
 * safeNumber('') // 0
 */
export const safeNumber = (val: any): number => {
  // 处理 null 和 undefined
  if (val === null || val === undefined) return 0;
  
  // 处理空字符串
  if (val === '') return 0;
  
  // 转换为数字
  const n = Number(val);
  
  // 处理 NaN
  if (isNaN(n)) return 0;
  
  return n;
};

/**
 * 格式化数字显示
 * 去除尾部零，使显示更简洁
 * 
 * @param num - 输入数字
 * @returns 格式化后的字符串，0 或无效值返回空字符串
 * 
 * @example
 * formatAuto(30.00) // '30'
 * formatAuto(30.50) // '30.5'
 * formatAuto(0) // ''
 * formatAuto(null) // ''
 * formatAuto('') // ''
 */
export const formatAuto = (num: number | string | undefined | null): string => {
  // 处理空值
  if (num === '' || num === null || num === undefined) return '';
  
  // 转换为数字
  const n = safeNumber(num);
  
  // 0 值返回空字符串（更清洁的显示）
  if (n === 0) return '';
  
  // 使用 toFixed(2) 确保两位小数
  let s = n.toFixed(2);
  
  // 移除 .00 后缀
  s = s.replace(/\.00$/, '');
  
  // 移除末尾的 0（但保留一位小数）
  // 例如：30.50 -> 30.5
  s = s.replace(/(\.[1-9])0$/, '$1');
  
  return s;
};

/**
 * 格式化数字显示（保留 0 值）
 * 与 formatAuto 类似，但 0 值显示为 '0' 而不是空字符串
 * 用于销量、销额等需要显示真实 0 值的字段
 *
 * @param num - 输入数字
 * @returns 格式化后的字符串，0 值显示为 '0'
 *
 * @example
 * formatNumberKeepZero(30.00) // '30'
 * formatNumberKeepZero(30.50) // '30.5'
 * formatNumberKeepZero(0) // '0'
 * formatNumberKeepZero(null) // ''
 */
export const formatNumberKeepZero = (num: number | string | undefined | null): string => {
  // 处理空值
  if (num === '' || num === null || num === undefined) return '';

  // 转换为数字
  const n = safeNumber(num);

  // 0 值显示为 '0'
  if (n === 0) return '0';

  // 使用 toFixed(2) 确保两位小数
  let s = n.toFixed(2);

  // 移除 .00 后缀
  s = s.replace(/\.00$/, '');

  // 移除末尾的 0（但保留一位小数）
  // 例如：30.50 -> 30.5
  s = s.replace(/(\.[1-9])0$/, '$1');

  return s;
};

/**
 * 验证数字范围
 * 确保数字在指定范围内
 * 
 * @param val - 输入值
 * @param min - 最小值（可选）
 * @param max - 最大值（可选）
 * @returns 验证后的数字，超出范围返回边界值
 * 
 * @example
 * clampNumber(150, 0, 100) // 100
 * clampNumber(-10, 0, 100) // 0
 * clampNumber(50, 0, 100) // 50
 */
export const clampNumber = (val: any, min?: number, max?: number): number => {
  const n = safeNumber(val);
  
  if (min !== undefined && n < min) return min;
  if (max !== undefined && n > max) return max;
  
  return n;
};

/**
 * 验证非负数
 * 用于库存、数量等不能为负的字段
 * 
 * @param val - 输入值
 * @returns 非负数，负数返回 0
 * 
 * @example
 * ensureNonNegative(-10) // 0
 * ensureNonNegative(10) // 10
 */
export const ensureNonNegative = (val: any): number => {
  const n = safeNumber(val);
  return Math.max(0, n);
};

/**
 * 验证正数
 * 用于价格、金额等必须为正的字段
 * 
 * @param val - 输入值
 * @returns 正数，非正数返回 0
 * 
 * @example
 * ensurePositive(-10) // 0
 * ensurePositive(0) // 0
 * ensurePositive(10) // 10
 */
export const ensurePositive = (val: any): number => {
  const n = safeNumber(val);
  return n > 0 ? n : 0;
};

/**
 * 解析货币字符串
 * 从字符串中提取第一个数字（用于美团订单解析）
 * 
 * @param val - 输入字符串
 * @returns 提取的数字，无法提取返回 0
 * 
 * @example
 * parseMoney('¥123.45') // 123.45
 * parseMoney('123.45元') // 123.45
 * parseMoney('abc') // 0
 */
export const parseMoney = (val: string | number): number => {
  const s = String(val || '');
  const m = s.match(/-?\d+(?:\.\d+)?/);
  if (!m) return 0;
  const n = parseFloat(m[0]);
  return isNaN(n) ? 0 : n;
};

/**
 * 解析多个货币值的总和
 * 用于美团订单的优惠金额解析
 * 
 * @param val - 输入字符串（可能包含多个数字）
 * @returns 所有数字的总和
 * 
 * @example
 * parseDiscountTotal('满100减10 满200减30') // 40
 * parseDiscountTotal('¥50') // 50
 */
export const parseDiscountTotal = (val: string | number): number => {
  const s = String(val || '');
  const ms = s.match(/-?\d+(?:\.\d+)?/g);
  if (!ms) return 0;
  return ms.reduce((sum, x) => sum + (parseFloat(x) || 0), 0);
};

/**
 * 验证输入是否为有效的数字字符串
 * 
 * @param val - 输入值
 * @returns true 如果是有效的数字，false 否则
 * 
 * @example
 * isValidNumber('123') // true
 * isValidNumber('123.45') // true
 * isValidNumber('abc') // false
 * isValidNumber('') // false
 */
export const isValidNumber = (val: any): boolean => {
  if (val === '' || val === null || val === undefined) return false;
  const n = Number(val);
  return !isNaN(n);
};

/**
 * 计算销量
 * 销量 = 原数 + 补货 - 剩余
 */
export const calculateSales = (
  original: any,
  restock: any,
  remaining: any
): number => {
  const orig = ensureNonNegative(original);
  const rest = ensureNonNegative(restock);
  
  if (remaining === '' || remaining === null || remaining === undefined) {
    return 0;
  }
  
  const rem = ensureNonNegative(remaining);
  const sales = (orig + rest) - rem;
  
  return Math.max(0, sales);
};

/**
 * 计算销售额
 * 售额 = (销量 - 扣减 - 兑奖) * 单价 + 兑奖 * 优惠
 */
export const calculateRevenue = (
  sales: any,
  redeem: any,
  loss: any,
  unitPrice: any,
  discount: any = 1
): number => {
  const s = ensureNonNegative(sales);
  const r = ensureNonNegative(redeem);
  const l = ensureNonNegative(loss);
  const p = ensureNonNegative(unitPrice);
  const d = ensureNonNegative(discount);

  const revenue = (s - l - r) * p + (r * d);
  
  return Math.max(0, revenue);
};

/**
 * 计算本班库存
 * 库存 = 前班库存 + 进货 - 取整(补货 / 规格)
 */
export const calculateCurrentStock = (
  prevStock: any,
  purchase: any,
  restock: any,
  spec: any
): number => {
  const ps = safeNumber(prevStock);
  const pc = safeNumber(purchase);
  const rs = safeNumber(restock);
  const sp = safeNumber(spec) || 1;

  const restockBoxes = Math.floor(rs / sp);
  return ps + pc - restockBoxes;
};

/**
 * 计算财务支付
 * 财务支付 = 支出金额 - 吧台支付
 */
export const calculateFinancePay = (amount: any, barPay: any): number => {
  const amt = safeNumber(amount);
  const bar = safeNumber(barPay);
  const result = amt - bar;
  return Math.max(0, result);
};

/**
 * 计算应缴金额
 * 公式: 应缴 = 网费 + 售货 - 美团(计费价) - 支付(吧台支付)
 * 
 * @param internetFee - 网费
 * @param salesRevenue - 售货
 * @param meituanRevenue - 美团（计费价）
 * @param expenditure - 支付（吧台支付）
 * @param income - 保留参数（兼容旧调用），不参与应缴计算
 * @returns 应缴金额
 */
export const calculateAmountDue = (
  internetFee: any,
  salesRevenue: any,
  meituanRevenue: any,
  expenditure: any,
  _income: any = 0
): number => {
  const w = safeNumber(internetFee);
  const s = safeNumber(salesRevenue);
  const m = safeNumber(meituanRevenue);
  const z = safeNumber(expenditure);

  return w + s - m - z;
};
