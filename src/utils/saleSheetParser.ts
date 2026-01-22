/**
 * 售货清单解析器 v6 - 动态列布局检测
 *
 * 功能范围：
 * 1. 解析班次信息（日期、班次、员工）
 * 2. 解析盘点表格（商品 原数 补货 剩余 销量 售额 库存 进货 兑奖 扣减 单价 规格）
 *
 * 注意：
 * - 美团/网费/售货/支出金额 由系统自动计算，不从解析获取
 * - 美团订单 由独立的 meituan.ts 解析
 * - 支出/入账记录 由财务模块独立处理
 *
 * 支持从 Excel/网页复制的带有多余空列的数据
 * 自动检测第一个非空列的位置，然后按固定列偏移解析
 */

import { getDefaultRedeemDiscount } from '../api/types';

// ==================== 类型定义 ====================

export interface ParsedExcelData {
  inventory: ParsedInventoryItem[];
  expenses: ParsedExpense[];
  meituanOrders: ParsedMeituanOrder[];
  shiftInfo: {
    date: string;
    shiftType: string;
    employee: string;
    internetFee: number;
    wechatPay: number;
    salesRevenue: number;
    expenditure: number;
    meituanRevenue: number;
  };
}

export interface ParsedInventoryItem {
  productName: string;
  original: number;
  restock: number | '';
  remaining: number | '';
  sales: number;
  revenue: number;
  stockVal: number;
  purchase: number | '';
  redeem: number | '';
  redeemAmount: number;
  loss: number | '';
  unitPrice: number;
  spec: number;
}

export interface ParsedExpense {
  item: string;
  amount: number | '';
  barPay: number | '';
  financePay: number;
}

export interface ParsedMeituanOrder {
  productInfo: string;
  productType: string;
  couponId: string;
  amount: number;
  merchantDiscount: number;
  time: string;
  phone: string;
  note: string;
  store: string;
  actualAmount: number;
}

// ==================== 主解析函数 ====================

export function parseExcelData(text: string): ParsedExcelData | null {
  if (!text || !text.trim()) {
    return null;
  }

  const lines = text.trim().split('\n');
  const result: ParsedExcelData = {
    inventory: [],
    expenses: [],
    meituanOrders: [],
    shiftInfo: {
      date: '',
      shiftType: '',
      employee: '',
      internetFee: 0,
      wechatPay: 0,
      salesRevenue: 0,
      expenditure: 0,
      meituanRevenue: 0,
    },
  };

  // 检测表头格式：0=新格式(兑奖在销量前), 1=旧格式(销量在兑奖前)
  let headerFormat: 'new' | 'old' | null = null;
  let inventoryHeaderIndexMap: Record<string, number> | null = null;

  // 解析每一行
  for (let rowIndex = 0; rowIndex < lines.length; rowIndex++) {
    const line = lines[rowIndex];
    if (!line.trim()) continue;

    const parts = line.split('\t');
    parseRow(
      parts,
      rowIndex,
      result,
      headerFormat,
      inventoryHeaderIndexMap,
      (format: 'new' | 'old', map: Record<string, number>) => {
        headerFormat = format;
        inventoryHeaderIndexMap = map;
      },
    );
  }

  // 最终输出
  console.group('🔍 Excel 数据解析结果');
  console.log('📋 班次信息:', result.shiftInfo);
  console.log(`📦 盘点表格 (${result.inventory.length} 项)`);
  console.log(`💰 支出记录 (${result.expenses.length} 项):`, result.expenses);
  console.log(`🍔 美团订单 (${result.meituanOrders.length} 个)`);
  console.groupEnd();

  return result;
}

// ==================== 解析单行 ====================

function parseRow(
  parts: string[], 
  rowIndex: number, 
  result: ParsedExcelData, 
  headerFormat: 'new' | 'old' | null,
  inventoryHeaderIndexMap: Record<string, number> | null,
  onFormatDetected: (format: 'new' | 'old', map: Record<string, number>) => void
): void {
  // 找到第一个非空列的位置（跳过前导空列）
  let firstNonEmptyIndex = 0;
  while (firstNonEmptyIndex < parts.length && !parts[firstNonEmptyIndex]?.trim()) {
    firstNonEmptyIndex++;
  }
  
  // 如果整行都是空的，跳过
  if (firstNonEmptyIndex >= parts.length) return;
  
  const firstNonEmpty = parts[firstNonEmptyIndex]?.trim() || '';
  
  // 第1行 (rowIndex=0): 班次信息 - 格式: 售货清单	日期	班次	员工	美团	金额	网费	金额	售货	金额	支出	金额
  if (rowIndex === 0 && firstNonEmpty === '售货清单') {
    // 重新解析班次信息，跳过空列
    const validParts = parts.filter(p => p?.trim());
    if (validParts.length >= 12) {
      result.shiftInfo.date = parseShortDate(validParts[1]) || '';
      result.shiftInfo.shiftType = validParts[2] || '';
      result.shiftInfo.employee = validParts[3] || '';
      result.shiftInfo.meituanRevenue = parseNumber(validParts[5]) || 0;
      result.shiftInfo.internetFee = parseNumber(validParts[7]) || 0;
      result.shiftInfo.salesRevenue = parseNumber(validParts[9]) || 0;
      result.shiftInfo.expenditure = parseNumber(validParts[11]) || 0;
    } else {
      // 兼容旧格式
      result.shiftInfo.date = parseShortDate(parts[1]) || '';
      result.shiftInfo.shiftType = parts[2] || '';
      result.shiftInfo.employee = parts[3] || '';
      result.shiftInfo.meituanRevenue = parseNumber(parts[5]) || 0;
      result.shiftInfo.internetFee = parseNumber(parts[7]) || 0;
      result.shiftInfo.salesRevenue = parseNumber(parts[9]) || 0;
      result.shiftInfo.expenditure = parseNumber(parts[11]) || 0;
    }
    console.log('✅ 班次信息:', result.shiftInfo);
    return;
  }

  // 第3行 (rowIndex=2): 商品表头，跳过
  if (firstNonEmpty === '商品名称') {
    // 基于原始 parts 建立“列名 -> 索引”映射（不跳过空列）
    const map: Record<string, number> = {};
    for (let i = firstNonEmptyIndex; i < parts.length; i++) {
      const key = (parts[i] || '').trim();
      if (!key) continue;
      map[key] = i;
    }

    const headerCols = Object.keys(map);
    console.log('📋 表头列:', headerCols);

    // 判断新旧格式
    // 新格式: 商品名称 原数 补货 剩余 兑奖 扣减 进货 库存 销量 销额 单价 规格
    // 旧格式: 商品名称 原数 补货 剩余 销量 售额 库存 进货 兑奖 扣减 单价 规格
    const isNew = map['兑奖'] !== undefined && map['销量'] !== undefined && map['兑奖'] < map['销量'];
    const format: 'new' | 'old' = isNew ? 'new' : 'old';
    onFormatDetected(format, map);
    console.log(`📋 检测到${format === 'new' ? '新' : '旧'}格式表头`);
    return;
  }

  // 检测美团订单 (第一非空列是纯数字，且第二非空列包含"包"/"特惠"/"显卡"等)
  if (firstNonEmpty.match(/^\d+$/) && parts[firstNonEmptyIndex + 1]?.trim() &&
      (parts[firstNonEmptyIndex + 1]?.trim().includes('包') || 
       parts[firstNonEmptyIndex + 1]?.trim().includes('特惠') || 
       parts[firstNonEmptyIndex + 1]?.trim().includes('显卡') ||
       parts[firstNonEmptyIndex + 1]?.trim().includes('体验券') ||
       parts[firstNonEmptyIndex + 1]?.trim().includes('通宵'))) {
    const order = parseMeituanRowByIndex(parts, firstNonEmptyIndex);
    if (order) {
      result.meituanOrders.push(order);
      console.log('✅ 美团订单:', order.productInfo);
    }
    return;
  }

  // 检测支出 (第一个非空列是支出项目名)
  const expenseKeywords = ['高德新会员', 'A区包夜', 'B区包夜', '网费', '电费', '房租', '水费'];
  if (expenseKeywords.includes(firstNonEmpty)) {
    const expense = parseExpenseRow(parts, firstNonEmptyIndex);
    if (expense && typeof expense.amount === 'number' && expense.amount > 0) {
      result.expenses.push(expense);
      console.log('✅ 支出:', expense.item, expense);
    }
    return;
  }

  // 检测商品行 (第一个非空列是商品名，且包含单价)
  // 标准格式: 商品名 原数 补货 剩余 销量 售额 库存 进货 兑奖 扣减 单价 规格
  if (firstNonEmpty && 
      !expenseKeywords.includes(firstNonEmpty) &&
      !firstNonEmpty.match(/^\d+$/) &&
      parts.length >= firstNonEmptyIndex + 12) {
    
    // 检查最后一个非空列是否包含单价（数字+元）
    const lastNonEmptyIndex = parts.findLastIndex(p => p?.trim());
    const lastNonEmpty = parts[lastNonEmptyIndex]?.trim() || '';
    
    // 如果最后是规格（数字），往前找单价
    const specCandidate = parts[lastNonEmptyIndex]?.trim() || '';
    const priceCandidate = parts[lastNonEmptyIndex - 1]?.trim() || '';
    
    // 单价应该在规格前面，格式如 "3.0元" 或 "3元"
    if (priceCandidate && (priceCandidate.includes('元') || parsePrice(priceCandidate) > 0)) {
      const item = parseInventoryRowDynamic(parts, firstNonEmptyIndex, headerFormat, inventoryHeaderIndexMap);
      if (item) {
        result.inventory.push(item);
        console.log('✅ 商品:', item.productName);
      }
    }
    return;
  }
}

// ==================== 解析各类型行（动态版） ====================

/**
 * 动态解析商品行 - 根据表头格式检测
 * 
 * 新格式 (headerFormat='new'):
 * 列: 0=商品名, 1=原数, 2=补货, 3=剩余, 4=兑奖, 5=扣减, 6=进货, 7=库存, 8=销量, 9=销额, 10=单价, 11=规格
 * 
 * 旧格式 (headerFormat='old'):
 * 列: 0=商品名, 1=原数, 2=补货, 3=剩余, 4=销量, 5=售额, 6=库存, 7=进货, 8=兑奖, 9=扣减, 10=单价, 11=规格
 */
function parseInventoryRowDynamic(
  parts: string[], 
  startCol: number, 
  headerFormat: 'new' | 'old' | null,
  headerIndexMap: Record<string, number> | null
): ParsedInventoryItem | null {
  // 如果已拿到表头映射，优先使用映射解析（最稳，避免空列/缺列导致错位）
  if (headerIndexMap) {
    const productName = (parts[headerIndexMap['商品名称']] || '').trim();
    if (!productName) return null;

    const getBy = (k: string): string => {
      const idx = headerIndexMap[k];
      if (idx === undefined) return '';
      return (parts[idx] || '').trim();
    };

    const original = parseNumber(getBy('原数')) || 0;
    const restock = parseNumberOrEmpty(getBy('补货'));
    const remaining = parseNumberOrEmpty(getBy('剩余'));

    const redeemRaw = getBy('兑奖');
    const lossRaw = getBy('扣减');

    const unitPrice = parsePrice(getBy('单价')) || 0;
    const spec = parseNumber(getBy('规格')) || 1;

    const sales = parseNumber(getBy('销量')) || 0;
    const revenue = parseNumber(getBy('销额')) || parseNumber(getBy('售额')) || 0;

    const stockVal = parseNumber(getBy('库存')) || 0;
    const purchase = parseNumberOrEmpty(getBy('进货'));

    const { quantity: redeem, amount: redeemAmount } = convertRedeemToQuantity(redeemRaw, unitPrice, productName);
    const loss = parseNumberOrEmpty(lossRaw);

    return {
      productName,
      original,
      restock,
      remaining,
      sales,
      revenue,
      stockVal,
      purchase,
      redeem,
      redeemAmount,
      loss,
      unitPrice,
      spec,
    };
  }

  // 获取从 startCol 开始的所有列（包括空列）
  const cols: string[] = [];
  for (let i = startCol; i < parts.length; i++) {
    cols.push(parts[i]?.trim() || '');
  }
  
  const productName = cols[0];
  if (!productName) return null;
  
  // 查找单价列（包含"元"的列）和规格列
  let priceColIndex = -1;
  let specColIndex = -1;
  
  for (let i = cols.length - 1; i >= 0; i--) {
    const col = cols[i];
    // 单价格式: "3.0元" 或 "3元"
    if (col.includes('元') && parsePrice(col) > 0) {
      priceColIndex = i;
      // 规格列是单价列的下一列
      specColIndex = i + 1;
      break;
    }
  }
  
  if (priceColIndex < 1) return null; // 单价必须在第2列之后
  
  const unitPrice = parsePrice(cols[priceColIndex]);
  const spec = specColIndex < cols.length ? parseNumber(cols[specColIndex]) : 1;
  
  // 根据表头格式解析列
  let original = 0, restock: number | '' = '', remaining: number | '' = '';
  let sales = 0, revenue = 0, stockVal = 0, purchase: number | '' = '';
  let redeemRaw = '', lossRaw = '';
  
  if (headerFormat === 'new') {
    // 新格式: 商品名 原数 补货 剩余 兑奖 扣减 进货 库存 销量 销额 单价 规格
    original = parseNumber(cols[1]) || 0;
    restock = parseNumberOrEmpty(cols[2]);
    remaining = parseNumberOrEmpty(cols[3]);
    redeemRaw = cols[4] || '';
    lossRaw = cols[5] || '';
    purchase = parseNumberOrEmpty(cols[6]) || '';
    stockVal = parseNumber(cols[7]) || 0;
    sales = parseNumber(cols[8]) || 0;
    revenue = parseNumber(cols[9]) || 0;
  } else {
    // 旧格式: 商品名 原数 补货 剩余 销量 售额 库存 进货 兑奖 扣减 单价 规格
    original = parseNumber(cols[1]) || 0;
    restock = parseNumberOrEmpty(cols[2]);
    remaining = parseNumberOrEmpty(cols[3]);
    sales = parseNumber(cols[4]) || 0;
    revenue = parseNumber(cols[5]) || 0;
    stockVal = parseNumber(cols[6]) || 0;
    purchase = parseNumberOrEmpty(cols[7]) || '';
    redeemRaw = cols[8] || '';
    lossRaw = cols[9] || '';
  }
  
  // 兑奖换算
  const { quantity: redeem, amount: redeemAmount } = convertRedeemToQuantity(redeemRaw, unitPrice, productName);
  
  // 扣减
  const loss = parseNumberOrEmpty(lossRaw);
  
  return {
    productName,
    original,
    restock,
    remaining,
    sales,
    revenue,
    stockVal,
    purchase,
    redeem,
    redeemAmount,
    loss,
    unitPrice,
    spec,
  };
}

function parseExpenseRow(parts: string[], startCol: number = 15): ParsedExpense | null {
  // 动态解析支出行
  const validCols: string[] = [];
  for (let i = startCol; i < parts.length; i++) {
    if (parts[i]?.trim()) {
      validCols.push(parts[i].trim());
    }
  }
  
  if (validCols.length < 4) return null;
  
  const item = validCols[0];
  if (!item || item === '入账项目' || item === '合计') return null;

  const amount = parseNumberOrEmpty(validCols[1]);
  const barPay = parseNumberOrEmpty(validCols[2]);
  const financePay = parseNumber(validCols[3]) || 0;

  return { item, amount, barPay, financePay };
}

function parseMeituanRow(parts: string[], startCol: number = 15): ParsedMeituanOrder | null {
  // 列: startCol=序号, startCol+1=商品, startCol+2=类型, startCol+3=券号, startCol+4=金额, startCol+5=优惠, startCol+6=时间, startCol+7=手机, startCol+8=备注, startCol+9=门店
  if (parts.length < startCol + 10) return null;

  const productInfo = parts[startCol + 1]?.trim() || '';
  if (!productInfo) return null;

  const productType = parts[startCol + 2]?.trim() || '';
  const couponId = parts[startCol + 3]?.trim() || '';
  const amount = parseMoney(parts[startCol + 4]) || 0;
  const merchantDiscount = parseMerchantDiscount(parts[startCol + 5]) || 0;
  const time = parts[startCol + 6]?.trim() || '';
  const phone = parts[startCol + 7]?.trim() || '';
  const note = parts[startCol + 8]?.trim() || '';
  const store = parts[startCol + 9]?.trim() || '';

  return {
    productInfo,
    productType,
    couponId,
    amount,
    merchantDiscount,
    time,
    phone,
    note,
    store,
    actualAmount: amount,
  };
}

// 兼容旧接口
function parseMeituanRowByIndex(parts: string[], startCol: number): ParsedMeituanOrder | null {
  return parseMeituanRow(parts, startCol);
}

// ==================== 辅助函数 ====================

/**
 * 解析短日期格式为完整日期
 * 支持格式: 12/31 → 2026-12-31, 1/15 → 2026-01-15
 * @param shortDate 短日期字符串
 * @returns 完整日期字符串 YYYY-MM-DD
 */
function parseShortDate(shortDate: string): string {
  const trimmed = shortDate?.trim();
  if (!trimmed) return '';

  // 匹配 M/D 或 MM/DD 格式
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!match) {
    // 如果不是短格式，直接返回原值
    return trimmed;
  }

  const month = match[1].padStart(2, '0');
  const day = match[2].padStart(2, '0');
  const year = new Date().getFullYear(); // 使用当前年份

  return `${year}-${month}-${day}`;
}

function parseNumberOrEmpty(value: string): number | '' {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '-') return '';
  const num = parseFloat(trimmed.replace(/[^\d.-]/g, ''));
  return isNaN(num) ? '' : num;
}

function parseNumber(value: string): number {
  if (!value) return 0;
  const num = parseFloat(value.replace(/[^\d.-]/g, ''));
  return isNaN(num) ? 0 : num;
}

function parsePrice(value: string): number {
  return parseNumber(value);
}

function parseMoney(value: string): number {
  if (!value) return 0;
  const num = parseFloat(value.replace(/[¥￥]/g, '').replace(/[^\d.]/g, ''));
  return isNaN(num) ? 0 : num;
}

function parseMerchantDiscount(value: string): number {
  if (!value) return 0;
  let total = 0;
  const matches = value.match(/(\d+\.?\d*)元?/g);
  if (matches) {
    for (const match of matches) {
      total += parseNumber(match);
    }
  }
  return total;
}

function convertRedeemToQuantity(
  value: string,
  unitPrice: number,
  productName: string
): { quantity: number | ''; amount: number } {
  const trimmed = value.trim();

  if (!trimmed.includes('元')) {
    const qty = parseNumber(trimmed) || 0;
    return { quantity: qty, amount: 0 };
  }

  const amount = parseMoney(trimmed) || 0;
  if (amount === 0) {
    return { quantity: '', amount: 0 };
  }

  const lexiangDiscount = getDefaultRedeemDiscount(productName) || 0;
  const discountPerBottle = unitPrice - lexiangDiscount;

  if (discountPerBottle <= 0) {
    console.warn(`商品 ${productName} 优惠金额异常：单价${unitPrice}，乐享${lexiangDiscount}`);
    return { quantity: '', amount };
  }

  const quantity = Math.round(amount / discountPerBottle);
  return { quantity, amount };
}
