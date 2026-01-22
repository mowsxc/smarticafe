import { tauriCmd } from '../utils/tauri';
import type { MeituanOrder, MeituanStats, ApiResponse } from './types';

const API_BASE = 'http://127.0.0.1:32521/api';

/**
 * 获取美团订单列表
 */
export async function fetchMeituanOrders(params?: {
  date?: string;
  limit?: number;
}): Promise<MeituanOrder[]> {
  try {
    // 优先使用HTTP API
    const queryParams = new URLSearchParams();
    if (params?.date) queryParams.append('date', params.date);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const url = `${API_BASE}/meituan/orders${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result: ApiResponse<MeituanOrder[]> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'API request failed');
    }
    
    return result.data || [];
  } catch (httpError) {
    console.warn('HTTP API不可用，尝试Tauri命令...', httpError);
    
    try {
      // 备选：使用Tauri命令
      return await tauriCmd<MeituanOrder[]>('meituan_orders_list', params || {});
    } catch (tauriError) {
      console.error('❌ Tauri命令失败');
      throw tauriError;
    }
  }
}

/**
 * 计算美团订单统计
 */
export function calculateMeituanStats(orders: MeituanOrder[]): MeituanStats {
  const financialTotal = orders.reduce((sum, order) => sum + (order.financial || 0), 0);
  const barTotal = orders.reduce((sum, order) => sum + (order.barPrice || 0), 0);
  const finalTotal = barTotal > 0 ? barTotal : (financialTotal > 0 ? financialTotal : 0);
  
  // 计算可乐数量
  let cokes = 0;
  const keywords = ['可口可乐', '可乐', 'Coke', 'coke'];
  
  orders.forEach(order => {
    const s = (`${order.nameMain} ${order.type || ''}`).toLowerCase();
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
  
  const times = orders.map(o => o.time).filter(Boolean).sort();
  const range = times.length > 0 ? `${times[0]} ~ ${times[times.length - 1]}` : '';
  
  return {
    barTotal: finalTotal,
    realBarTotal: barTotal,
    financialTotal: parseFloat(financialTotal.toFixed(2)),
    count: orders.length,
    cokes,
    range
  };
}
