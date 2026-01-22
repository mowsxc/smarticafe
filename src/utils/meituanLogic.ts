import { toast } from '../composables/useToast';

export interface MeituanPackageRule {
  tests: string;
  price: number;
}

export interface MeituanParsedOrder {
  name: string;
  type: string;
  coupon: string;
  amount: string;
  discount: string;
  time: string;
  phone: string;
  remark: string;
  store: string;
}

export interface MeituanTimePoint {
  date: string;
  time: string;
  full: string;
}

export const meituanLogic = {
  // 解析剪贴板内容
  async parseFromClipboard(): Promise<MeituanParsedOrder[]> {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          return this.parseTabText(text);
        }
      }
    } catch (error) {
      console.error('剪贴板读取失败:', error);
      toast.error('剪贴板为空或读取失败：请先复制美团订单表格（Tab 分隔）到剪贴板');
    }
    return [];
  },

  // 解析Tab分隔的文本
  parseTabText(tabText: string): MeituanParsedOrder[] {
    const text = String(tabText || '').trim();
    if (!text) return [];

    const lines = text.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
    const orders: MeituanParsedOrder[] = [];
    
    // 时间正则：YYYY-MM-DD HH:mm:ss
    const timeRe = /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/;

    for (const line of lines) {
      const cols = line.split(/\t/);
      const safe = (i: number) => (cols[i] !== undefined ? this.normalizeSpace(cols[i]) : '');

      // 使用时间列作为锚点
      const timeIdx = cols.findIndex((c) => timeRe.test(this.normalizeSpace(c)));

      // 跳过表头
      const maybeHeader = safe(0) + safe(1) + safe(2);
      if (maybeHeader.includes('交易') && maybeHeader.includes('券')) continue;

      if (timeIdx !== -1) {
        // 时间列找到了，动态切片
        const discountPart = cols.slice(4, timeIdx).map((x: string) => this.normalizeSpace(x)).filter(Boolean);
        const storePart = cols.slice(timeIdx + 3).map((x: string) => this.normalizeSpace(x)).filter(Boolean);
        
        orders.push({
          name: safe(0),
          type: safe(1),
          coupon: safe(2),
          amount: safe(3),
          discount: discountPart.length ? discountPart.join(' ') : '-',
          time: safe(timeIdx),
          phone: safe(timeIdx + 1),
          remark: safe(timeIdx + 2),
          store: storePart.length ? storePart.join(' ') : safe(timeIdx + 3),
        });
      } else {
        // 回退到固定列
        orders.push({
          name: safe(0),
          type: safe(1),
          coupon: safe(2),
          amount: safe(3),
          discount: safe(4),
          time: safe(5),
          phone: safe(6),
          remark: safe(7),
          store: safe(8),
        });
      }
    }

    return orders;
  },

  // 标准化空格
  normalizeSpace(value: string) {
    return String(value || '')
      .replace(/\u00A0/g, ' ')
      .replace(/[\s\t\r\n]+/g, ' ')
      .trim();
  },

  // 解析金额
  parseMoney(value: string) {
    const s = String(value || '');
    const m = s.match(/-?\d+(?:\.\d+)?/g);
    if (!m) return 0;
    const n = Number(m[0]);
    return Number.isFinite(n) ? n : 0;
  },

  // 解析折扣总额（多个数值相加）
  parseDiscountTotal(value: string) {
    const s = String(value || '');
    const ms = s.match(/-?\d+(?:\.\d+)?/g);
    if (!ms) return 0;
    return ms.reduce((sum: number, x: string) => {
      const n = Number(x);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
  },

  // 计算财务价
  calculateFinancialVal(amount: number, discount: number, taxRate = 0.07) {
    const a = Number(amount || 0);
    const d = Number(discount || 0);
    const base = a - d;
    const v = base * (1 - taxRate);
    // 使用 1e-9 epsilon 向上取整到分
    return Math.ceil((v - 1e-9) * 100) / 100;
  },

  // 默认套餐规则
  getDefaultPackageRules(): MeituanPackageRule[] {
    return [
      { tests: '新会员 特惠', price: 30 },
      { tests: '新会员 女神', price: 30 },
      { tests: '新会员 超值', price: 100 },
      { tests: '5070 3小时', price: 34 },
      { tests: '5070 4小时', price: 44 },
      { tests: '5070 包天', price: 110 },
      { tests: '网游区 3小时', price: 26 },
      { tests: '网游区 4小时', price: 36 },
      { tests: '网游区 包天', price: 90 },
      { tests: '网游区 包早', price: 25 },
      { tests: '网游区 包夜', price: 45 },
      { tests: '普通区 包夜', price: 30 },
      { tests: '普通区 包天', price: 70 },
      { tests: '老会员 生日', price: 66 },
      { tests: '电竞区 通宵', price: 55 },
      { tests: '1000 送500', price: 1000 },
      { tests: '100 送20', price: 100 },
    ];
  },

  // 查找套餐价格
  findPackagePrice(name: string, packageRules: MeituanPackageRule[]) {
    const n = this.normalizeSpace(name);
    if (!n) return null;
    
    for (const rule of packageRules) {
      const tests = rule.tests.split(/\s+/).filter(Boolean);
      if (tests.length === 2 && tests[0] && tests[1]) {
        if (n.includes(tests[0]) && n.includes(tests[1])) {
          return rule.price;
        }
      }
    }
    return null;
  },

  // 格式化金额（自动去除尾部0）
  formatAuto(num: number) {
    const n = Number(num || 0);
    if (!Number.isFinite(n)) return '0';
    if (n === 0) return '0';
    const s = String(n);
    if (s.includes('e') || s.includes('E')) {
      const fixed = n.toFixed(8);
      return fixed.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
    }
    return s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
  },

  // 统计可乐数量
  countCokes(orders: MeituanParsedOrder[]) {
    let total = 0;
    const keywords = ['可口可乐', '可乐', 'Coke', 'coke'];
    
    for (const order of orders) {
      const text = [order.name, order.type, order.remark].join(' ');
      if (!keywords.some(k => text.includes(k))) continue;
      
      // 尝试提取数量
      let qty = 0;
      for (const kw of keywords) {
        const re1 = new RegExp(`${kw}\\s*[xX×\\*]\\s*(\\d+)`);
        const re2 = new RegExp(`${kw}[^\\d]{0,4}(\\d+)\\s*(?:瓶|听|罐|杯|份|个)`);
        const m1 = text.match(re1);
        const m2 = text.match(re2);
        if (m1 && m1[1]) qty = Math.max(qty, Number(m1[1]));
        if (m2 && m2[1]) qty = Math.max(qty, Number(m2[1]));
      }
      total += qty > 0 ? qty : 1;
    }
    
    return total;
  },

  // 计算时间范围
  getTimeRange(orders: MeituanParsedOrder[]): string {
    const times = orders
      .map((o: MeituanParsedOrder) => {
        const match = String(o.time || '').match(/(\d{2}-\d{2})\s+(\d{2}:\d{2})/);
        return match ? { date: match[1], time: match[2], full: String(o.time || '') } : null;
      })
      .filter((x): x is MeituanTimePoint => !!x)
      .sort((a: MeituanTimePoint, b: MeituanTimePoint) => a.full.localeCompare(b.full));

    if (times.length === 0) return '';
    
    const first = times[0];
    const last = times[times.length - 1];
    
    return `${first.date} ${first.time} ~ ${last.time}`;
  }
};
