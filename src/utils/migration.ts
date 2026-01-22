/**
 * 数据迁移工具
 * 用于将旧的拼音变量名迁移到新的英文变量名
 */

import type { ShiftState } from '../api/types';

/**
 * 旧的ShiftState接口（拼音命名）
 */
interface LegacyShiftState {
  wangfei: string | number;
  shouhuo: number;
  meituan: string | number;
  zhichu: number;
  yingjiao: number;
  // 可能还有旧的ruzhang字段
  ruzhang?: number;
}

/**
 * 迁移ShiftState数据
 * 从拼音命名迁移到英文命名
 */
export function migrateShiftState(oldState: any): ShiftState {
  // 如果已经是新格式，直接返回
  if (oldState.internetFee !== undefined) {
    return oldState as ShiftState;
  }
  
  // 从旧格式迁移
  const legacy = oldState as LegacyShiftState;
  
  return {
    internetFee: legacy.wangfei ?? '',
    salesRevenue: legacy.shouhuo ?? 0,
    meituanRevenue: legacy.meituan ?? '',
    expenditure: legacy.zhichu ?? 0,
    income: legacy.ruzhang ?? 0,
    amountDue: legacy.yingjiao ?? 0
  };
}

/**
 * 检查是否为旧格式数据
 */
export function isLegacyShiftState(state: any): boolean {
  return state && (
    state.wangfei !== undefined ||
    state.shouhuo !== undefined ||
    state.meituan !== undefined ||
    state.zhichu !== undefined ||
    state.yingjiao !== undefined
  );
}

/**
 * 迁移草稿数据
 * 用于从localStorage或数据库中迁移保存的草稿
 */
export function migrateDraftData(draft: any): any {
  if (!draft) return draft;
  
  const migratedDraft = { ...draft };
  
  // 迁移shiftState
  if (draft.shiftState && isLegacyShiftState(draft.shiftState)) {
    migratedDraft.shiftState = migrateShiftState(draft.shiftState);
  }
  
  return migratedDraft;
}

/**
 * 变量名映射表
 * 用于日志和调试
 */
export const VARIABLE_NAME_MAPPING = {
  // ShiftState
  wangfei: 'internetFee',
  shouhuo: 'salesRevenue',
  meituan: 'meituanRevenue',
  zhichu: 'expenditure',
  ruzhang: 'income',
  yingjiao: 'amountDue',
  
  // 其他可能的映射
  meituanRows: 'meituanOrders',
  handoverRows: 'inventoryItems',
} as const;

/**
 * 获取新变量名
 */
export function getNewVariableName(oldName: string): string {
  return VARIABLE_NAME_MAPPING[oldName as keyof typeof VARIABLE_NAME_MAPPING] || oldName;
}

/**
 * 打印迁移日志
 */
export function logMigration(oldName: string, oldValue: any, newName: string, newValue: any) {
  console.log(`🔄 数据迁移: ${oldName} (${oldValue}) → ${newName} (${newValue})`);
}
