import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateFinancePay,
  calculateAmountDue,
  safeNumber,
  formatAuto,
} from '../../utils/validation';

/**
 * 财务模块计算逻辑测试
 * 测试支出、入账、财务支付等计算
 * 
 * Validates: Requirements 2.1, 2.2, 2.5
 */
describe('财务计算逻辑 - Finance Module', () => {
  describe('财务支付计算 - calculateFinancePay', () => {
    it('应该正确计算财务支付：支出金额 - 吧台支付', () => {
      // 支出 100，吧台支付 30，财务支付 = 70
      expect(calculateFinancePay(100, 30)).toBe(70);
    });

    it('应该处理吧台支付大于支出的情况（返回 0）', () => {
      // 支出 100，吧台支付 150，财务支付 = 0（不能为负）
      expect(calculateFinancePay(100, 150)).toBe(0);
    });

    it('应该处理支出和吧台支付相等的情况', () => {
      expect(calculateFinancePay(100, 100)).toBe(0);
    });

    it('应该处理 0 支出的情况', () => {
      expect(calculateFinancePay(0, 0)).toBe(0);
      expect(calculateFinancePay(0, 50)).toBe(0);
    });

    it('应该处理 0 吧台支付的情况', () => {
      expect(calculateFinancePay(100, 0)).toBe(100);
    });

    it('应该处理字符串输入', () => {
      expect(calculateFinancePay('100', '30')).toBe(70);
      expect(calculateFinancePay('100', '150')).toBe(0);
    });

    it('应该处理无效输入', () => {
      expect(calculateFinancePay('abc', 'def')).toBe(0);
      expect(calculateFinancePay(null, undefined)).toBe(0);
    });

    it('应该处理小数金额', () => {
      expect(calculateFinancePay(100.5, 30.25)).toBe(70.25);
    });
  });

  describe('财务模块集成 - 支出行处理', () => {
    interface ExpenseItem {
      item: string;
      amount: number | '';
      barPay: number | '';
      financePay: number | '';
    }

    let expenses: ExpenseItem[];

    beforeEach(() => {
      expenses = [
        { item: '水电费', amount: 100, barPay: 30, financePay: 0 },
        { item: '房租', amount: 500, barPay: 200, financePay: 0 },
      ];
    });

    it('应该计算单行财务支付', () => {
      const row = expenses[0];
      const financePay = calculateFinancePay(row.amount, row.barPay);
      expect(financePay).toBe(70);
    });

    it('应该计算多行财务支付总和', () => {
      let totalFinancePay = 0;
      expenses.forEach(row => {
        const amount = safeNumber(row.amount);
        const barPay = safeNumber(row.barPay);
        totalFinancePay += calculateFinancePay(amount, barPay);
      });
      expect(totalFinancePay).toBe(370); // 70 + 300
    });

    it('应该计算支出总额', () => {
      const totalAmount = expenses.reduce((sum, row) => sum + safeNumber(row.amount), 0);
      expect(totalAmount).toBe(600);
    });

    it('应该计算吧台支付总额', () => {
      const totalBarPay = expenses.reduce((sum, row) => sum + safeNumber(row.barPay), 0);
      expect(totalBarPay).toBe(230);
    });

    it('应该处理空支出行', () => {
      const emptyRow: ExpenseItem = { item: '', amount: '', barPay: '', financePay: '' };
      const amount = safeNumber(emptyRow.amount);
      const barPay = safeNumber(emptyRow.barPay);
      const financePay = calculateFinancePay(amount, barPay);
      expect(financePay).toBe(0);
    });

    it('应该处理部分填充的支出行', () => {
      const partialRow: ExpenseItem = { item: '杂费', amount: 50, barPay: '', financePay: 0 };
      const amount = safeNumber(partialRow.amount);
      const barPay = safeNumber(partialRow.barPay);
      const financePay = calculateFinancePay(amount, barPay);
      expect(financePay).toBe(50);
    });
  });

  describe('应缴金额计算 - calculateAmountDue', () => {
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

    it('应该处理小数金额', () => {
      // 100.5 + 200.25 - 50.75 - 30.5 = 219.5
      expect(calculateAmountDue(100.5, 200.25, 50.75, 30.5)).toBe(219.5);
    });
  });

  describe('财务模块完整流程 - 交班计算', () => {
    interface ShiftState {
      internetFee: string | number; // 网费收入
      merchandiseSales: number; // 售货销售额
      meituanRevenue: string | number; // 美团订单金额
      expenses: number; // 支出金额
      amountDue: number; // 应缴金额
    }

    let shiftState: ShiftState;

    beforeEach(() => {
      shiftState = {
        internetFee: '100',
        merchandiseSales: 200,
        meituanRevenue: '50',
        expenses: 30,
        amountDue: 0,
      };
    });

    it('应该计算完整的交班应缴金额', () => {
      const internetFee = safeNumber(shiftState.internetFee);
      const merchandiseSales = safeNumber(shiftState.merchandiseSales);
      const meituanRevenue = safeNumber(shiftState.meituanRevenue);
      const expenses = safeNumber(shiftState.expenses);

      const amountDue = calculateAmountDue(internetFee, merchandiseSales, meituanRevenue, expenses);
      expect(amountDue).toBe(220);
    });

    it('应该处理网费为空的情况', () => {
      shiftState.internetFee = '';
      const internetFee = safeNumber(shiftState.internetFee);
      const merchandiseSales = safeNumber(shiftState.merchandiseSales);
      const meituanRevenue = safeNumber(shiftState.meituanRevenue);
      const expenses = safeNumber(shiftState.expenses);

      const amountDue = calculateAmountDue(internetFee, merchandiseSales, meituanRevenue, expenses);
      expect(amountDue).toBe(120); // 0 + 200 - 50 - 30
    });

    it('应该处理美团为空的情况', () => {
      shiftState.meituanRevenue = '';
      const internetFee = safeNumber(shiftState.internetFee);
      const merchandiseSales = safeNumber(shiftState.merchandiseSales);
      const meituanRevenue = safeNumber(shiftState.meituanRevenue);
      const expenses = safeNumber(shiftState.expenses);

      const amountDue = calculateAmountDue(internetFee, merchandiseSales, meituanRevenue, expenses);
      expect(amountDue).toBe(270); // 100 + 200 - 0 - 30
    });

    it('应该处理需要补款的情况', () => {
      shiftState.meituanRevenue = '500';
      shiftState.expenses = 100;

      const internetFee = safeNumber(shiftState.internetFee);
      const merchandiseSales = safeNumber(shiftState.merchandiseSales);
      const meituanRevenue = safeNumber(shiftState.meituanRevenue);
      const expenses = safeNumber(shiftState.expenses);

      const amountDue = calculateAmountDue(internetFee, merchandiseSales, meituanRevenue, expenses);
      expect(amountDue).toBe(-300); // 100 + 200 - 500 - 100
    });

    it('应该格式化应缴金额显示', () => {
      const internetFee = safeNumber(shiftState.internetFee);
      const merchandiseSales = safeNumber(shiftState.merchandiseSales);
      const meituanRevenue = safeNumber(shiftState.meituanRevenue);
      const expenses = safeNumber(shiftState.expenses);

      const amountDue = calculateAmountDue(internetFee, merchandiseSales, meituanRevenue, expenses);
      const formatted = formatAuto(amountDue);
      expect(formatted).toBe('220');
    });

    it('应该处理小数应缴金额', () => {
      shiftState.internetFee = '100.5';
      shiftState.merchandiseSales = 200.25;
      shiftState.meituanRevenue = '50.75';
      shiftState.expenses = 30.5;

      const internetFee = safeNumber(shiftState.internetFee);
      const merchandiseSales = safeNumber(shiftState.merchandiseSales);
      const meituanRevenue = safeNumber(shiftState.meituanRevenue);
      const expenses = safeNumber(shiftState.expenses);

      const amountDue = calculateAmountDue(internetFee, merchandiseSales, meituanRevenue, expenses);
      expect(amountDue).toBe(219.5); // 100.5 + 200.25 - 50.75 - 30.5
    });
  });

  describe('财务模块边界情况', () => {
    it('应该处理极大的金额', () => {
      const largeAmount = 999999999;
      const result = calculateFinancePay(largeAmount, largeAmount / 2);
      expect(result).toBe(largeAmount / 2);
    });

    it('应该处理极小的金额', () => {
      const smallAmount = 0.01;
      const result = calculateFinancePay(smallAmount, 0);
      expect(result).toBe(smallAmount);
    });

    it('应该处理多个支出行的累计', () => {
      const expenses = [
        { amount: 100, barPay: 30 },
        { amount: 200, barPay: 50 },
        { amount: 300, barPay: 100 },
      ];

      let totalFinancePay = 0;
      let totalAmount = 0;
      let totalBarPay = 0;

      expenses.forEach(exp => {
        totalAmount += safeNumber(exp.amount);
        totalBarPay += safeNumber(exp.barPay);
        totalFinancePay += calculateFinancePay(exp.amount, exp.barPay);
      });

      expect(totalAmount).toBe(600);
      expect(totalBarPay).toBe(180);
      expect(totalFinancePay).toBe(420);
    });

    it('应该处理支出为 0 但吧台支付不为 0 的情况', () => {
      // 这种情况不太可能发生，但应该处理
      const result = calculateFinancePay(0, 100);
      expect(result).toBe(0);
    });
  });
});
