import { tauriCmd } from '../utils/tauri';
import type { ExpenseItem, IncomeItem, FinanceData, ApiResponse } from './types';

const API_BASE = 'http://127.0.0.1:32521/api';

/**
 * 获取财务记账数据
 */
export async function fetchFinanceData(params?: {
  date?: string;
  shift?: string;
}): Promise<FinanceData> {
  try {
    // 优先使用HTTP API
    const queryParams = new URLSearchParams();
    if (params?.date) queryParams.append('date', params.date);
    if (params?.shift) queryParams.append('shift', params.shift);
    
    const url = `${API_BASE}/finance/accounting${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result: ApiResponse<FinanceData> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'API request failed');
    }
    
    return result.data || {
      expenses: [],
      incomes: [],
      totalExpenditure: 0,
      totalIncome: 0,
      totalBarPay: 0
    };
  } catch (httpError) {
    console.warn('HTTP API不可用，尝试Tauri命令...', httpError);
    
    try {
      // 备选：使用Tauri命令
      return await tauriCmd<FinanceData>('finance_data_get', params || {});
    } catch (tauriError) {
      console.error('❌ Tauri命令失败');
      throw tauriError;
    }
  }
}

/**
 * 保存财务记账数据
 */
export async function saveFinanceData(data: {
  date: string;
  shift: string;
  employee: string;
  expenses: ExpenseItem[];
  incomes: IncomeItem[];
  notes?: string;
}): Promise<string> {
  try {
    const url = `${API_BASE}/finance/accounting`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result: ApiResponse<{ id: string }> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to save finance data');
    }
    
    return result.data?.id || '';
  } catch (httpError) {
    console.warn('HTTP API不可用，尝试Tauri命令...', httpError);
    
    try {
      return await tauriCmd<string>('finance_data_save', data);
    } catch (tauriError) {
      console.error('❌ Tauri命令失败');
      throw tauriError;
    }
  }
}

/**
 * 获取财务记录历史
 */
export async function fetchFinanceHistory(params?: {
  date?: string;
  limit?: number;
  offset?: number;
}): Promise<Array<{
  id: string;
  date: string;
  shift: string;
  employee: string;
  totalExpense: number;
  totalIncome: number;
  netAmount: number;
  status: 'pending' | 'verified' | 'archived';
  created_at: string;
}>> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.date) queryParams.append('date', params.date);
    if (params?.limit) queryParams.append('limit', String(params.limit));
    if (params?.offset) queryParams.append('offset', String(params.offset));
    
    const url = `${API_BASE}/finance/history${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'API request failed');
    }
    
    return result.data || [];
  } catch (httpError) {
    console.warn('HTTP API不可用，返回空数组', httpError);
    return [];
  }
}

/**
 * 计算支出总额
 */
export function calculateTotalExpenditure(expenses: ExpenseItem[]): number {
  return expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

/**
 * 计算入账总额
 */
export function calculateTotalIncome(incomes: IncomeItem[]): number {
  return incomes.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

/**
 * 计算吧台支付总额
 */
export function calculateTotalBarPay(expenses: ExpenseItem[]): number {
  return expenses.reduce((sum, item) => sum + (Number(item.barPay) || 0), 0);
}

/**
 * 计算财务支付金额
 * 公式: 财务支付 = 支付金额 - 吧台支付
 */
export function calculateFinancePay(amount: number | '', barPay: number | ''): number | '' {
  const amountNum = Number(amount);
  const barPayNum = Number(barPay);
  
  if (amount === '' || isNaN(amountNum)) return '';
  if (barPay === '' || isNaN(barPayNum)) return amountNum;
  
  return amountNum - barPayNum;
}
