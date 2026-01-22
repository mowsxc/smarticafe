import { supabaseAdmin, getSyncService } from '../services/supabase/client';
import type { ShiftState, ShiftCalculation, ShiftRecord, ShiftSnapshot } from './types';

// 重新导出 ShiftRecord 以便在其他地方使用
export type { ShiftRecord } from './types';

export async function createShiftRecord(snapshot: ShiftSnapshot): Promise<void> {
  const syncService = getSyncService();

  const financial = snapshot.financial_summary || {
    cash_amount: 0,
    sales_amount: 0,
    expense_amount: 0,
    total_amount: 0,
    internet_fee: 0,
    meituan_revenue: 0,
  };

  await syncService.enqueue({
    table: 'shift_records',
    operation: 'insert',
    data: {
      date_ymd: snapshot.shift_date,
      shift: snapshot.shift_type,
      employee: snapshot.employee,
      successor: snapshot.successor,
      wangfei: financial.internet_fee || 0,
      shouhuo: financial.sales_amount || 0,
      meituan: financial.meituan_revenue || 0,
      zhichu: financial.expense_amount || 0,
      income: financial.income_amount || 0,
      yingjiao: financial.total_amount || 0,
      snapshot_html: snapshot.snapshot_html || null,
      snapshot_info: snapshot.snapshot_info || null,
    },
  });

  await syncService.sync();
}

/**
 * 获取交班计算数据
 * 从收银台状态和财务数据计算应交金额
 */
export async function fetchShiftCalculation(params?: {
  date?: string;
  shift?: string;
}): Promise<ShiftCalculation> {
  try {
    // 从 Supabase 查询财务条目
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }

    let query = supabaseAdmin
      .from('accounting_entries')
      .select('entry_type, amount, bar_pay, finance_pay');

    if (params?.date) {
      query = query.eq('date_ymd', params.date);
    }
    if (params?.shift) {
      query = query.eq('shift', params.shift);
    }

    const { data, error } = await query;

    if (error) throw error;

    const entries = (data || []) as any[];

    // 计算各项汇总
    let internetFee = 0;
    let salesRevenue = 0;
    let meituanRevenue = 0;
    let expenditure = 0;
    let income = 0;

    entries.forEach((entry: any) => {
      switch (entry.entry_type) {
        case '网费':
          internetFee += entry.finance_pay || 0;
          break;
        case '售货':
          salesRevenue += entry.finance_pay || 0;
          break;
        case '美团':
          meituanRevenue += entry.finance_pay || 0;
          break;
        case '支出':
          expenditure += entry.bar_pay || 0;
          break;
        case '收入':
          income += entry.finance_pay || 0;
          break;
      }
    });

    const amountDue = internetFee + salesRevenue + meituanRevenue - expenditure + income;

    return {
      internetFee,
      salesRevenue,
      meituanRevenue,
      expenditure,
      income,
      amountDue
    };
  } catch (error) {
    console.warn('Supabase query failed, returning default values:', error);
    return {
      internetFee: 0,
      salesRevenue: 0,
      meituanRevenue: 0,
      expenditure: 0,
      income: 0,
      amountDue: 0
    };
  }
}

/**
 * 获取交班记录列表
 */
export async function fetchShiftRecords(params?: {
  date?: string;
  shift?: string;
  limit?: number;
  offset?: number;
}): Promise<ShiftRecord[]> {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }

    let query = supabaseAdmin
      .from('shift_records')
      .select('*')
      .order('created_at', { ascending: false });

    if (params?.date) {
      query = query.eq('date_ymd', params.date);
    }
    if (params?.shift) {
      query = query.eq('shift', params.shift);
    }
    if (params?.limit) {
      query = query.limit(params.limit);
    }
    if (params?.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;

    // 转换为前端格式
    return (data || []).map((record: any) => ({
      id: record.id,
      date: record.date_ymd,
      shift: record.shift,
      employee: record.employee,
      successor: record.successor || '未知',
      time: record.created_at ? new Date(record.created_at).toLocaleTimeString('zh-CN', { hour12: false }).slice(0, 5) : '',
      cashAmount: (record.wangfei || 0) + (record.shouhuo || 0) + (record.income || 0),
      salesAmount: record.shouhuo || 0,
      expenseAmount: record.zhichu || 0,
      totalAmount: (record.wangfei || 0) + (record.shouhuo || 0) - (record.meituan || 0) - (record.zhichu || 0) + (record.income || 0),
      notes: record.snapshot_info || record.notes || '',
      created_at: record.created_at
    }));
  } catch (error) {
    console.warn('Failed to fetch shift records from Supabase:', error);
    return [];
  }
}

/**
 * 获取单条交班记录详情
 */
export async function fetchShiftRecord(id: string): Promise<ShiftRecord | null> {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }

    const { data, error } = await (supabaseAdmin as any)
      .from('shift_records')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) return null;

    const record = data as any;
    return {
      id: record.id,
      date: record.date_ymd,
      shift: record.shift,
      employee: record.employee,
      successor: record.successor || '未知',
      time: record.created_at ? new Date(record.created_at).toLocaleTimeString('zh-CN', { hour12: false }).slice(0, 5) : '',
      cashAmount: (record.wangfei || 0) + (record.shouhuo || 0) + (record.income || 0),
      salesAmount: record.shouhuo || 0,
      expenseAmount: record.zhichu || 0,
      totalAmount: (record.wangfei || 0) + (record.shouhuo || 0) + (record.meituan || 0) - (record.zhichu || 0) + (record.income || 0),
      notes: record.snapshot_info || record.notes || '',
      created_at: record.created_at
    };
  } catch (error) {
    console.warn('Failed to fetch shift record from Supabase:', error);
    return null;
  }
}

/**
 * 计算应交金额
 * 公式: 应交 = 网费 + 售货 + 美团 - 支出 + 入账
 */
export function calculateAmountDue(state: {
  internetFee: string | number;
  salesRevenue: number;
  meituanRevenue: string | number;
  expenditure: number;
  income: number;
}): number {
  const internetFee = parseFloat(String(state.internetFee)) || 0;
  const salesRevenue = state.salesRevenue || 0;
  const meituanRevenue = parseFloat(String(state.meituanRevenue)) || 0;
  const expenditure = state.expenditure || 0;
  const income = state.income || 0;

  return internetFee + salesRevenue - meituanRevenue - expenditure + income;
}

/**
 * 转换旧格式到新格式（数据迁移）
 */
export function migrateShiftState(oldState: any): ShiftState {
  return {
    internetFee: oldState.wangfei ?? oldState.internetFee ?? '',
    salesRevenue: oldState.shouhuo ?? oldState.salesRevenue ?? 0,
    meituanRevenue: oldState.meituan ?? oldState.meituanRevenue ?? '',
    expenditure: oldState.zhichu ?? oldState.expenditure ?? 0,
    income: oldState.ruzhang ?? oldState.income ?? 0,
    amountDue: oldState.yingjiao ?? oldState.amountDue ?? 0
  };
}
