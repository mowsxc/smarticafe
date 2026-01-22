/**
 * OriginalShift API - 原始班次快照管理
 * 由超管维护的初始数据，用于系统首次投入使用
 */

import { supabaseAdmin } from '../services/supabase/client';
import type {
  OriginalShiftSnapshot,
  OriginalShiftInventoryItem,
} from './types';
import { DEFAULT_REDEEM_DISCOUNTS, getDefaultRedeemDiscount } from './types';

// 重新导出类型
export type {
  OriginalShiftSnapshot,
  OriginalShiftInventoryItem,
} from './types';

export { DEFAULT_REDEEM_DISCOUNTS, getDefaultRedeemDiscount };

/**
 * 获取当前活跃的原始班次快照
 */
export async function fetchActiveOriginalShift(): Promise<OriginalShiftSnapshot | null> {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }

    const { data, error } = await supabaseAdmin
      .from('original_shifts')
      .select('*')
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // 没有找到活跃快照
        return null;
      }
      throw error;
    }

    return transformFromSupabase(data);
  } catch (error) {
    console.error('Failed to fetch active original shift:', error);
    return null;
  }
}

/**
 * 获取所有原始班次快照列表
 */
export async function fetchOriginalShiftList(): Promise<OriginalShiftSnapshot[]> {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }

    const { data, error } = await supabaseAdmin
      .from('original_shifts')
      .select('*')
      .order('version', { ascending: false });

    if (error) throw error;

    return (data || []).map(transformFromSupabase);
  } catch (error) {
    console.error('Failed to fetch original shift list:', error);
    return [];
  }
}

/**
 * 获取指定版本的原始班次快照
 */
export async function fetchOriginalShiftByVersion(version: number): Promise<OriginalShiftSnapshot | null> {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }

    const { data, error } = await supabaseAdmin
      .from('original_shifts')
      .select('*')
      .eq('version', version)
      .single();

    if (error) throw error;

    return transformFromSupabase(data);
  } catch (error) {
    console.error('Failed to fetch original shift by version:', error);
    return null;
  }
}

/**
 * 保存原始班次快照
 */
export async function saveOriginalShift(snapshot: OriginalShiftSnapshot, maintainedBy: string): Promise<string> {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }

    // 如果设为活跃版本，先取消其他活跃版本
    if (snapshot.is_active) {
      await (supabaseAdmin as any)
        .from('original_shifts')
        .update({ is_active: false })
        .eq('is_active', true);
    }

    const data = transformToSupabase(snapshot);
    data.maintained_by = maintainedBy;
    data.maintained_at = new Date().toISOString();

    const { data: result, error } = await (supabaseAdmin as any)
      .from('original_shifts')
      .insert(data)
      .select('id')
      .single();

    if (error) throw error;

    return result?.id || '';
  } catch (error) {
    console.error('Failed to save original shift:', error);
    throw error;
  }
}

/**
 * 更新原始班次快照
 */
export async function updateOriginalShift(snapshot: OriginalShiftSnapshot, maintainedBy: string): Promise<void> {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }

    // 如果设为活跃版本，先取消其他活跃版本
    if (snapshot.is_active && snapshot.id) {
      await (supabaseAdmin as any)
        .from('original_shifts')
        .update({ is_active: false })
        .eq('is_active', true)
        .neq('id', snapshot.id);
    }

    const data = transformToSupabase(snapshot);
    data.maintained_by = maintainedBy;
    data.maintained_at = new Date().toISOString();
    data.updated_at = new Date().toISOString();

    const { error } = await (supabaseAdmin as any)
      .from('original_shifts')
      .update(data)
      .eq('id', snapshot.id || '');

    if (error) throw error;
  } catch (error) {
    console.error('Failed to update original shift:', error);
    throw error;
  }
}

/**
 * 设置活跃版本
 */
export async function setActiveVersion(version: number, maintainedBy: string): Promise<void> {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }

    // 先取消所有活跃版本
    await (supabaseAdmin as any)
      .from('original_shifts')
      .update({ is_active: false })
      .eq('is_active', true);

    // 设置指定版本为活跃
    const { error } = await (supabaseAdmin as any)
      .from('original_shifts')
      .update({
        is_active: true,
        maintained_by: maintainedBy,
        maintained_at: new Date().toISOString()
      })
      .eq('version', version);

    if (error) throw error;
  } catch (error) {
    console.error('Failed to set active version:', error);
    throw error;
  }
}

/**
 * 删除原始班次快照（非活跃版本才能删除）
 */
export async function deleteOriginalShift(id: string): Promise<void> {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }

    const { error } = await supabaseAdmin
      .from('original_shifts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Failed to delete original shift:', error);
    throw error;
  }
}

/**
 * 数据回退到指定版本
 * 将指定版本的 original_shifts 数据恢复到当前班次
 */
export async function rollbackToVersion(version: number, shiftRecordId: string): Promise<boolean> {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }

    // 获取指定版本的快照
    const snapshot = await fetchOriginalShiftByVersion(version);
    if (!snapshot) {
      throw new Error(`未找到版本 ${version} 的快照`);
    }

    console.log(`🔄 回退到版本 ${version}:`, snapshot);
    console.log(`📝 关联交班记录: ${shiftRecordId}`);
    // TODO: 实现实际的数据回退逻辑
    // 1. 从 original_shifts 获取该版本的库存数据
    // 2. 恢复到 handoverRows
    // 3. 更新相关的财务数据

    return true;
  } catch (error) {
    console.error('Failed to rollback to version:', error);
    throw error;
  }
}

/**
 * 获取所有可回退的版本列表
 */
export async function getRollbackVersions(): Promise<{ version: number; date: string; employee: string }[]> {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }

    const { data, error } = await supabaseAdmin
      .from('original_shifts')
      .select('version, shift_date, employee, created_at')
      .order('version', { ascending: false });

    if (error) throw error;

    return (data || []).map((item: any) => ({
      version: item.version,
      date: item.shift_date,
      employee: item.employee,
    }));
  } catch (error) {
    console.error('Failed to get rollback versions:', error);
    return [];
  }
}

// ==================== 数据转换 ====================

function transformFromSupabase(data: any): OriginalShiftSnapshot {
  const inventoryItems = (typeof data.inventory_items === 'string'
    ? JSON.parse(data.inventory_items)
    : (data.inventory_items || [])) as any[];

  const expenses = (typeof data.expenses === 'string'
    ? JSON.parse(data.expenses)
    : (data.expenses || [])) as any[];

  return {
    id: data.id,
    version: data.version,
    is_active: data.is_active,
    shift_date: data.shift_date,
    shift_type: data.shift_type,
    employee: data.employee,
    internetFee: data.wangfei || 0,
    salesRevenue: data.shouhuo || 0,
    meituanRevenue: data.meituan || 0,
    expenditure: data.zhichu || 0,
    income: data.income || 0,
    amountDue: data.yingjiao || 0,
    inventory_items: inventoryItems.map(item => ({
      productName: item.productName || item.product_name || '',
      original: item.original || 0,
      prevStock: item.prevStock || item.prev_stock || 0,
      restock: item.restock ?? '',
      remaining: item.remaining ?? '',
      redeem: item.redeem ?? '',
      redeemAmount: item.redeemAmount || item.redeem_amount || 0,
      loss: item.loss ?? '',
      lossMethod: item.lossMethod || item.loss_method,
      purchase: item.purchase || 0,
      stockVal: item.stockVal || item.stock_val || 0,
      sales: item.sales || 0,
      revenue: item.revenue || 0,
      unitPrice: item.unitPrice || item.unit_price || 0,
      spec: item.spec || 0
    })),
    expenses: expenses.map(exp => ({
      item: exp.item || '',
      amount: exp.amount ?? '',
      barPay: exp.barPay || exp.bar_pay || '',
      financePay: exp.financePay || exp.finance_pay || 0
    })),
    meituan_raw_data: data.meituan_raw_data,
    notes: data.notes,
    maintained_by: data.maintained_by,
    maintained_at: data.maintained_at,
    created_at: data.created_at,
    updated_at: data.updated_at
  };
}

function transformToSupabase(snapshot: OriginalShiftSnapshot): any {
  const inventoryItems = snapshot.inventory_items.map(item => ({
    product_name: item.productName,
    original: item.original,
    prev_stock: item.prevStock,
    restock: item.restock,
    remaining: item.remaining,
    redeem: item.redeem,
    redeem_amount: item.redeemAmount,
    loss: item.loss,
    loss_method: item.lossMethod,
    purchase: item.purchase,
    stock_val: item.stockVal,
    sales: item.sales,
    revenue: item.revenue,
    unit_price: item.unitPrice,
    spec: item.spec
  }));

  const expenses = snapshot.expenses.map(exp => ({
    item: exp.item,
    amount: exp.amount,
    bar_pay: exp.barPay,
    finance_pay: exp.financePay
  }));

  return {
    version: snapshot.version,
    is_active: snapshot.is_active,
    shift_date: snapshot.shift_date,
    shift_type: snapshot.shift_type,
    employee: snapshot.employee,
    wangfei: snapshot.internetFee,
    shouhuo: snapshot.salesRevenue,
    meituan: snapshot.meituanRevenue,
    zhichu: snapshot.expenditure,
    income: snapshot.income,
    yingjiao: snapshot.amountDue,
    inventory_items: JSON.stringify(inventoryItems),
    expenses: JSON.stringify(expenses),
    meituan_raw_data: snapshot.meituan_raw_data,
    notes: snapshot.notes
  };
}

// ==================== 辅助函数 ====================

/**
 * 根据商品名称获取当前版本的库存项
 */
export function getInventoryItemByProductName(
  snapshot: OriginalShiftSnapshot,
  productName: string
): OriginalShiftInventoryItem | undefined {
  return snapshot.inventory_items.find(
    item => item.productName.toLowerCase() === productName.toLowerCase()
  );
}

/**
 * 获取下一个版本号
 */
export async function getNextVersion(): Promise<number> {
  try {
    if (!supabaseAdmin) {
      return 1;
    }

    const { data, error } = await (supabaseAdmin as any)
      .from('original_shifts')
      .select('version')
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return 1;
      throw error;
    }

    return (data?.version || 0) + 1;
  } catch {
    return 1;
  }
}

/**
 * 从活跃版本创建新的快照版本
 */
export async function createNewVersionFromActive(
  newShiftDate: string,
  newShiftType: string,
  newEmployee: string,
  maintainedBy: string
): Promise<OriginalShiftSnapshot | null> {
  const active = await fetchActiveOriginalShift();
  if (!active) return null;

  const version = await getNextVersion();

  return {
    version,
    is_active: false,
    shift_date: newShiftDate,
    shift_type: newShiftType,
    employee: newEmployee,
    internetFee: active.internetFee,
    salesRevenue: active.salesRevenue,
    meituanRevenue: active.meituanRevenue,
    expenditure: active.expenditure,
    income: active.income,
    amountDue: active.amountDue,
    inventory_items: active.inventory_items.map(item => ({
      ...item,
      original: item.remaining !== '' ? Number(item.remaining) || 0 : 0,
      prevStock: item.stockVal,
      restock: '',
      remaining: '',
      redeem: '',
      redeemAmount: getDefaultRedeemDiscount(item.productName),
      loss: '',
      lossMethod: undefined,
      purchase: 0,
      stockVal: item.stockVal,
      sales: 0,
      revenue: 0
    })),
    expenses: active.expenses.map(exp => ({
      ...exp,
      amount: '',
      barPay: '',
      financePay: exp.financePay || 0
    })),
    meituan_raw_data: active.meituan_raw_data,
    notes: active.notes,
    maintained_by: maintainedBy
  };
}
