import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateAmountDue,
  calculateSales,
  calculateRevenue,
  formatAuto,
} from '../../utils/validation';

/**
 * 应缴金额计算逻辑测试
 * 测试交班模块的核心计算：应缴 = (网费 + 售货) - (美团 + 支出)
 * 
 * Validates: Requirements 4.2, 4.3, 4.4
 */
describe('应缴金额计算逻辑 - Amount Due Module', () => {
  describe('基础计算 - calculateAmountDue', () => {
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

    it('应该处理混合类型输入', () => {
      expect(calculateAmountDue(100, '200', 50, '30')).toBe(220);
    });
  });

  describe('交班计算完整流程', () => {
    interface ShiftData {
      wangfei: string | number;
      shouhuo: number;
      meituan: string | number;
      zhichu: number;
    }

    let shiftData: ShiftData;

    beforeEach(() => {
      shiftData = {
        wangfei: '100',
        shouhuo: 200,
        meituan: '50',
        zhichu: 30,
      };
    });

    it('应该计算标准交班应缴', () => {
      const yingjiao = calculateAmountDue(
        shiftData.wangfei,
        shiftData.shouhuo,
        shiftData.meituan,
        shiftData.zhichu
      );
      expect(yingjiao).toBe(220);
    });

    it('应该处理网费为空的情况', () => {
      shiftData.wangfei = '';
      const yingjiao = calculateAmountDue(
        shiftData.wangfei,
        shiftData.shouhuo,
        shiftData.meituan,
        shiftData.zhichu
      );
      expect(yingjiao).toBe(120); // 0 + 200 - 50 - 30
    });

    it('应该处理美团为空的情况', () => {
      shiftData.meituan = '';
      const yingjiao = calculateAmountDue(
        shiftData.wangfei,
        shiftData.shouhuo,
        shiftData.meituan,
        shiftData.zhichu
      );
      expect(yingjiao).toBe(270); // 100 + 200 - 0 - 30
    });

    it('应该处理网费和美团都为空的情况', () => {
      shiftData.wangfei = '';
      shiftData.meituan = '';
      const yingjiao = calculateAmountDue(
        shiftData.wangfei,
        shiftData.shouhuo,
        shiftData.meituan,
        shiftData.zhichu
      );
      expect(yingjiao).toBe(170); // 0 + 200 - 0 - 30
    });

    it('应该处理需要补款的情况', () => {
      shiftData.meituan = '500';
      shiftData.zhichu = 100;
      const yingjiao = calculateAmountDue(
        shiftData.wangfei,
        shiftData.shouhuo,
        shiftData.meituan,
        shiftData.zhichu
      );
      expect(yingjiao).toBe(-300); // 100 + 200 - 500 - 100
    });

    it('应该处理高支出情况', () => {
      shiftData.zhichu = 500;
      const yingjiao = calculateAmountDue(
        shiftData.wangfei,
        shiftData.shouhuo,
        shiftData.meituan,
        shiftData.zhichu
      );
      expect(yingjiao).toBe(-250); // 100 + 200 - 50 - 500
    });

    it('应该处理高美团金额情况', () => {
      shiftData.meituan = '1000';
      const yingjiao = calculateAmountDue(
        shiftData.wangfei,
        shiftData.shouhuo,
        shiftData.meituan,
        shiftData.zhichu
      );
      expect(yingjiao).toBe(-730); // 100 + 200 - 1000 - 30
    });
  });

  describe('应缴金额与盘点数据的联动', () => {
    interface HandoverRow {
      original: number;
      restock: number | '';
      remaining: number | '';
      redeem: number | '';
      loss: number | '';
      unitPrice: number;
    }

    let rows: HandoverRow[];
    let wangfei: number;
    let meituan: number;
    let zhichu: number;

    beforeEach(() => {
      rows = [
        {
          original: 100,
          restock: 20,
          remaining: 30,
          redeem: 5,
          loss: 2,
          unitPrice: 10,
        },
        {
          original: 50,
          restock: 10,
          remaining: 20,
          redeem: 2,
          loss: 1,
          unitPrice: 20,
        },
      ];
      wangfei = 100;
      meituan = 50;
      zhichu = 30;
    });

    it('应该计算盘点销售额并用于应缴计算', () => {
      let totalRevenue = 0;
      rows.forEach(row => {
        const sales = calculateSales(
          row.original,
          row.restock,
          row.remaining
        );
        const revenue = calculateRevenue(sales, row.redeem, row.loss, row.unitPrice, 0);
        totalRevenue += revenue;
      });

      // 第一行：(100+20)-(30+5+2) = 83, 83*10 = 830
      // 第二行：(50+10)-(20+2+1) = 37, 37*20 = 740
      // 总销售额 = 1570
      expect(totalRevenue).toBe(1570);

      const shouhuo = totalRevenue;
      const yingjiao = calculateAmountDue(wangfei, shouhuo, meituan, zhichu);
      expect(yingjiao).toBe(1590); // 100 + 1570 - 50 - 30
    });

    it('应该处理未盘点商品的情况', () => {
      // 第一行未盘点
      rows[0].remaining = '';

      let totalRevenue = 0;
      rows.forEach(row => {
        const sales = calculateSales(
          row.original,
          row.restock,
          row.remaining
        );
        const revenue = calculateRevenue(sales, row.redeem, row.loss, row.unitPrice, 0);
        totalRevenue += revenue;
      });

      // 第一行：未盘点，销量 = 0，销售额 = 0
      // 第二行：(50+10)-(20+2+1) = 37, 37*20 = 740
      // 总销售额 = 740
      expect(totalRevenue).toBe(740);

      const shouhuo = totalRevenue;
      const yingjiao = calculateAmountDue(wangfei, shouhuo, meituan, zhichu);
      expect(yingjiao).toBe(760); // 100 + 740 - 50 - 30
    });

    it('应该处理所有商品都未盘点的情况', () => {
      rows.forEach(row => {
        row.remaining = '';
      });

      let totalRevenue = 0;
      rows.forEach(row => {
        const sales = calculateSales(
          row.original,
          row.restock,
          row.remaining
        );
        const revenue = calculateRevenue(sales, row.redeem, row.loss, row.unitPrice, 0);
        totalRevenue += revenue;
      });

      expect(totalRevenue).toBe(0);

      const shouhuo = totalRevenue;
      const yingjiao = calculateAmountDue(wangfei, shouhuo, meituan, zhichu);
      expect(yingjiao).toBe(20); // 100 + 0 - 50 - 30
    });
  });

  describe('应缴金额显示格式化', () => {
    it('应该格式化正数应缴', () => {
      const yingjiao = calculateAmountDue(100, 200, 50, 30);
      const formatted = formatAuto(yingjiao);
      expect(formatted).toBe('220');
    });

    it('应该格式化负数应缴（需要补款）', () => {
      const yingjiao = calculateAmountDue(100, 200, 500, 30);
      // formatAuto 不处理负数，直接返回格式化后的字符串
      const formatted = formatAuto(yingjiao);
      expect(formatted).toBe('-230');
    });

    it('应该格式化 0 应缴', () => {
      const yingjiao = calculateAmountDue(100, 200, 100, 200);
      const formatted = formatAuto(yingjiao);
      expect(formatted).toBe('');
    });

    it('应该格式化小数应缴', () => {
      const yingjiao = calculateAmountDue(100.5, 200.25, 50.75, 30.5);
      const formatted = formatAuto(yingjiao);
      expect(formatted).toBe('219.5');
    });

    it('应该格式化带小数的应缴', () => {
      const yingjiao = calculateAmountDue(100.5, 200.5, 50.25, 30.25);
      const formatted = formatAuto(yingjiao);
      expect(formatted).toBe('220.5');
    });
  });

  describe('应缴金额边界情况', () => {
    it('应该处理极大的金额', () => {
      const largeAmount = 999999999;
      const yingjiao = calculateAmountDue(largeAmount, largeAmount, 0, 0);
      expect(yingjiao).toBe(largeAmount * 2);
    });

    it('应该处理极小的金额', () => {
      const smallAmount = 0.01;
      const yingjiao = calculateAmountDue(smallAmount, smallAmount, 0, 0);
      expect(yingjiao).toBe(smallAmount * 2);
    });

    it('应该处理混合的极端情况', () => {
      const yingjiao = calculateAmountDue(999999999, 0.01, 0, 0);
      expect(yingjiao).toBeCloseTo(999999999.01, 2);
    });

    it('应该处理所有参数都是字符串的情况', () => {
      const yingjiao = calculateAmountDue('100', '200', '50', '30');
      expect(yingjiao).toBe(220);
    });

    it('应该处理混合类型的参数', () => {
      const yingjiao = calculateAmountDue(100, '200', 50, '30');
      expect(yingjiao).toBe(220);
    });

    it('应该处理包含空字符串的参数', () => {
      const yingjiao = calculateAmountDue('', '200', '', '30');
      expect(yingjiao).toBe(170); // 0 + 200 - 0 - 30
    });

    it('应该处理包含 null 的参数', () => {
      const yingjiao = calculateAmountDue(null, 200, null, 30);
      expect(yingjiao).toBe(170); // 0 + 200 - 0 - 30
    });

    it('应该处理包含 undefined 的参数', () => {
      const yingjiao = calculateAmountDue(undefined, 200, undefined, 30);
      expect(yingjiao).toBe(170); // 0 + 200 - 0 - 30
    });
  });

  describe('应缴金额实际场景模拟', () => {
    it('场景 1：正常交班，有盈余', () => {
      // 网费 100，售货 500，美团 200，支出 50
      const yingjiao = calculateAmountDue(100, 500, 200, 50);
      expect(yingjiao).toBe(350); // 100 + 500 - 200 - 50
      expect(formatAuto(yingjiao)).toBe('350');
    });

    it('场景 2：美团金额较大，需要补款', () => {
      // 网费 100，售货 300，美团 600，支出 100
      const yingjiao = calculateAmountDue(100, 300, 600, 100);
      expect(yingjiao).toBe(-300); // 100 + 300 - 600 - 100
      expect(formatAuto(yingjiao)).toBe('-300');
    });

    it('场景 3：支出较大，需要补款', () => {
      // 网费 100，售货 200，美团 50，支出 500
      const yingjiao = calculateAmountDue(100, 200, 50, 500);
      expect(yingjiao).toBe(-250); // 100 + 200 - 50 - 500
      expect(formatAuto(yingjiao)).toBe('-250');
    });

    it('场景 4：完全平衡', () => {
      // 网费 100，售货 200，美团 150，支出 150
      const yingjiao = calculateAmountDue(100, 200, 150, 150);
      expect(yingjiao).toBe(0); // 100 + 200 - 150 - 150
      expect(formatAuto(yingjiao)).toBe('');
    });

    it('场景 5：没有网费和美团', () => {
      // 网费 0，售货 300，美团 0，支出 50
      const yingjiao = calculateAmountDue(0, 300, 0, 50);
      expect(yingjiao).toBe(250); // 0 + 300 - 0 - 50
      expect(formatAuto(yingjiao)).toBe('250');
    });

    it('场景 6：只有网费', () => {
      // 网费 100，售货 0，美团 0，支出 0
      const yingjiao = calculateAmountDue(100, 0, 0, 0);
      expect(yingjiao).toBe(100); // 100 + 0 - 0 - 0
      expect(formatAuto(yingjiao)).toBe('100');
    });
  });
});
