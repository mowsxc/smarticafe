import { describe, it, expect } from 'vitest';
import {
  safeNumber,
  formatAuto,
  calculateSales,
  calculateRevenue,
  calculateFinancePay,
  calculateAmountDue,
  ensureNonNegative,
  ensurePositive,
  clampNumber,
  parseMoney,
  parseDiscountTotal,
  isValidNumber,
} from '../validation';

describe('盘点计算逻辑 - Validation Utils', () => {
  describe('safeNumber - 安全数字转换', () => {
    it('应该转换有效的数字字符串', () => {
      expect(safeNumber('123')).toBe(123);
      expect(safeNumber('123.45')).toBe(123.45);
      expect(safeNumber('-50')).toBe(-50);
    });

    it('应该处理数字类型', () => {
      expect(safeNumber(123)).toBe(123);
      expect(safeNumber(0)).toBe(0);
      expect(safeNumber(-50)).toBe(-50);
    });

    it('应该处理空值和无效输入', () => {
      expect(safeNumber(null)).toBe(0);
      expect(safeNumber(undefined)).toBe(0);
      expect(safeNumber('')).toBe(0);
      expect(safeNumber('abc')).toBe(0);
      expect(safeNumber('12abc')).toBe(0);
    });

    it('应该处理 NaN', () => {
      expect(safeNumber(NaN)).toBe(0);
    });
  });

  describe('formatAuto - 数字格式化', () => {
    it('应该去除 .00 后缀', () => {
      expect(formatAuto(30.00)).toBe('30');
      expect(formatAuto('30.00')).toBe('30');
    });

    it('应该去除末尾的 0', () => {
      expect(formatAuto(30.50)).toBe('30.5');
      expect(formatAuto(30.10)).toBe('30.1');
    });

    it('应该保留有效的小数', () => {
      expect(formatAuto(30.25)).toBe('30.25');
      expect(formatAuto(30.99)).toBe('30.99');
    });

    it('应该处理 0 值', () => {
      expect(formatAuto(0)).toBe('');
      expect(formatAuto('0')).toBe('');
      expect(formatAuto(0.00)).toBe('');
    });

    it('应该处理空值', () => {
      expect(formatAuto(null)).toBe('');
      expect(formatAuto(undefined)).toBe('');
      expect(formatAuto('')).toBe('');
    });

    it('应该处理无效输入', () => {
      expect(formatAuto('abc')).toBe('');
    });
  });

  describe('calculateSales - 销量计算', () => {
    it('应该正确计算销量：(原始 + 补货) - (剩余 + 兑奖 + 扣减)', () => {
      // 原始 100 + 补货 20 - 剩余 30 - 兑奖 5 - 扣减 2 = 83
      expect(calculateSales(100, 20, 30)).toBe(90);
    });

    it('应该处理未盘点的情况（remaining 为空）', () => {
      expect(calculateSales(100, 20, '')).toBe(0);
      expect(calculateSales(100, 20, null)).toBe(0);
      expect(calculateSales(100, 20, undefined)).toBe(0);
    });

    it('应该处理负数结果（返回 0）', () => {
      // 原始 10 + 补货 5 - 剩余 30 - 兑奖 5 - 扣减 2 = -22 -> 0
      expect(calculateSales(10, 5, 30)).toBe(0);
    });

    it('应该处理所有参数为 0 的情况', () => {
      expect(calculateSales(0, 0, 0)).toBe(0);
    });

    it('应该处理字符串输入', () => {
      expect(calculateSales('100', '20', '30')).toBe(90);
    });

    it('应该处理无效输入', () => {
      expect(calculateSales('abc', 'def', '30')).toBe(0);
    });

    it('应该处理边界情况：只有原始库存', () => {
      expect(calculateSales(100, 0, 100)).toBe(0);
    });

    it('应该处理边界情况：全部售出', () => {
      expect(calculateSales(100, 0, 0)).toBe(100);
    });
  });

  describe('calculateRevenue - 销售额计算', () => {
    it('应该正确计算销售额：销量 × 单价', () => {
      expect(calculateRevenue(83, 0, 0, 10)).toBe(830);
      expect(calculateRevenue(50, 0, 0, 25)).toBe(1250);
    });

    it('应该处理 0 销量', () => {
      expect(calculateRevenue(0, 0, 0, 10)).toBe(0);
    });

    it('应该处理 0 单价', () => {
      expect(calculateRevenue(100, 0, 0, 0)).toBe(0);
    });

    it('应该处理小数单价', () => {
      expect(calculateRevenue(100, 0, 0, 10.5)).toBe(1050);
      expect(calculateRevenue(83, 0, 0, 10.25)).toBe(850.75);
    });

    it('应该处理字符串输入', () => {
      expect(calculateRevenue('83', 0, 0, '10')).toBe(830);
    });

    it('应该处理无效输入', () => {
      expect(calculateRevenue('abc', 0, 0, 'def')).toBe(0);
    });
  });

  describe('calculateFinancePay - 财务支付计算', () => {
    it('应该正确计算财务支付：支出 - 吧台支付', () => {
      expect(calculateFinancePay(100, 30)).toBe(70);
      expect(calculateFinancePay(500, 200)).toBe(300);
    });

    it('应该处理吧台支付大于支出的情况（返回 0）', () => {
      expect(calculateFinancePay(100, 150)).toBe(0);
      expect(calculateFinancePay(50, 100)).toBe(0);
    });

    it('应该处理相等的情况', () => {
      expect(calculateFinancePay(100, 100)).toBe(0);
    });

    it('应该处理 0 值', () => {
      expect(calculateFinancePay(0, 0)).toBe(0);
      expect(calculateFinancePay(100, 0)).toBe(100);
      expect(calculateFinancePay(0, 100)).toBe(0);
    });

    it('应该处理字符串输入', () => {
      expect(calculateFinancePay('100', '30')).toBe(70);
    });

    it('应该处理无效输入', () => {
      expect(calculateFinancePay('abc', 'def')).toBe(0);
    });
  });

  describe('calculateAmountDue - 应缴金额计算', () => {
    it('应该正确计算应缴：(网费 + 售货) - (美团 + 支出)', () => {
      // (100 + 200) - (50 + 30) = 220
      expect(calculateAmountDue(100, 200, 50, 30)).toBe(220);
    });

    it('应该处理需要补款的情况（负数）', () => {
      // (100 + 200) - (500 + 30) = -230
      expect(calculateAmountDue(100, 200, 500, 30)).toBe(-230);
    });

    it('应该处理平衡的情况', () => {
      // (100 + 200) - (100 + 200) = 0
      expect(calculateAmountDue(100, 200, 100, 200)).toBe(0);
    });

    it('应该处理所有为 0 的情况', () => {
      expect(calculateAmountDue(0, 0, 0, 0)).toBe(0);
    });

    it('应该处理字符串输入', () => {
      expect(calculateAmountDue('100', '200', '50', '30')).toBe(220);
    });

    it('应该处理无效输入', () => {
      expect(calculateAmountDue('abc', 'def', 'ghi', 'jkl')).toBe(0);
    });

    it('应该处理空值', () => {
      expect(calculateAmountDue(null, undefined, '', 0)).toBe(0);
    });
  });

  describe('ensureNonNegative - 非负数验证', () => {
    it('应该返回非负数', () => {
      expect(ensureNonNegative(100)).toBe(100);
      expect(ensureNonNegative(0)).toBe(0);
    });

    it('应该将负数转换为 0', () => {
      expect(ensureNonNegative(-50)).toBe(0);
      expect(ensureNonNegative(-0.5)).toBe(0);
    });

    it('应该处理字符串输入', () => {
      expect(ensureNonNegative('100')).toBe(100);
      expect(ensureNonNegative('-50')).toBe(0);
    });
  });

  describe('ensurePositive - 正数验证', () => {
    it('应该返回正数', () => {
      expect(ensurePositive(100)).toBe(100);
      expect(ensurePositive(0.5)).toBe(0.5);
    });

    it('应该将非正数转换为 0', () => {
      expect(ensurePositive(0)).toBe(0);
      expect(ensurePositive(-50)).toBe(0);
    });

    it('应该处理字符串输入', () => {
      expect(ensurePositive('100')).toBe(100);
      expect(ensurePositive('0')).toBe(0);
    });
  });

  describe('clampNumber - 数字范围验证', () => {
    it('应该在范围内返回原值', () => {
      expect(clampNumber(50, 0, 100)).toBe(50);
    });

    it('应该将超出范围的值限制在边界', () => {
      expect(clampNumber(150, 0, 100)).toBe(100);
      expect(clampNumber(-10, 0, 100)).toBe(0);
    });

    it('应该处理只有最小值的情况', () => {
      expect(clampNumber(-10, 0)).toBe(0);
      expect(clampNumber(100, 0)).toBe(100);
    });

    it('应该处理只有最大值的情况', () => {
      expect(clampNumber(150, undefined, 100)).toBe(100);
      expect(clampNumber(50, undefined, 100)).toBe(50);
    });
  });

  describe('parseMoney - 货币字符串解析', () => {
    it('应该从字符串中提取数字', () => {
      expect(parseMoney('¥123.45')).toBe(123.45);
      expect(parseMoney('123.45元')).toBe(123.45);
      expect(parseMoney('$100')).toBe(100);
    });

    it('应该处理负数', () => {
      expect(parseMoney('-50')).toBe(-50);
      expect(parseMoney('¥-100')).toBe(-100);
    });

    it('应该处理无法提取的情况', () => {
      expect(parseMoney('abc')).toBe(0);
      expect(parseMoney('')).toBe(0);
    });

    it('应该处理数字输入', () => {
      expect(parseMoney(123)).toBe(123);
      expect(parseMoney(123.45)).toBe(123.45);
    });
  });

  describe('parseDiscountTotal - 多个货币值总和解析', () => {
    it('应该计算多个数字的总和', () => {
      // 注意：parseDiscountTotal 提取所有数字，不区分优惠和原价
      // '满100减10 满200减30' 提取 100, 10, 200, 30 = 340
      expect(parseDiscountTotal('满100减10 满200减30')).toBe(340);
      expect(parseDiscountTotal('10 20 30')).toBe(60);
    });

    it('应该处理单个数字', () => {
      expect(parseDiscountTotal('¥50')).toBe(50);
      expect(parseDiscountTotal('100')).toBe(100);
    });

    it('应该处理负数', () => {
      expect(parseDiscountTotal('-10 -20')).toBe(-30);
    });

    it('应该处理无法提取的情况', () => {
      expect(parseDiscountTotal('abc')).toBe(0);
      expect(parseDiscountTotal('')).toBe(0);
    });

    it('应该处理小数', () => {
      expect(parseDiscountTotal('10.5 20.5')).toBe(31);
    });
  });

  describe('isValidNumber - 数字有效性验证', () => {
    it('应该验证有效的数字', () => {
      expect(isValidNumber('123')).toBe(true);
      expect(isValidNumber('123.45')).toBe(true);
      expect(isValidNumber(123)).toBe(true);
      expect(isValidNumber(0)).toBe(true);
    });

    it('应该拒绝无效的数字', () => {
      expect(isValidNumber('abc')).toBe(false);
      expect(isValidNumber('')).toBe(false);
      expect(isValidNumber(null)).toBe(false);
      expect(isValidNumber(undefined)).toBe(false);
    });

    it('应该拒绝 NaN', () => {
      expect(isValidNumber(NaN)).toBe(false);
    });
  });
});
