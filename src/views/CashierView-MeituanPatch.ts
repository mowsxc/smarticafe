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

export interface MeituanOrderRow extends Omit<MeituanParsedOrder, 'amount' | 'discount'> {
  amount: number;
  discount: number;
  actual: number;
  financial: number;
  bar: number;
}

export interface MeituanStats {
  barTotal: number;
  cokes: number;
  range: string;
}

export function normalizeSpace(value: string) {
  return String(value || '')
    .replace(/\u00A0/g, ' ')
    .replace(/[\s\t\r\n]+/g, ' ')
    .trim()
}

export function parseMoney(value: string) {
  const s = String(value || '')
  const m = s.match(/-?\d+(?:\.\d+)?/g)
  if (!m) return 0
  const n = Number(m[0])
  return Number.isFinite(n) ? n : 0
}

export function parseDiscountTotal(value: string) {
  const s = String(value || '')
  const ms = s.match(/-?\d+(?:\.\d+)?/g)
  if (!ms) return 0
  return ms.reduce((sum, x) => {
    const n = Number(x)
    return sum + (Number.isFinite(n) ? n : 0)
  }, 0)
}

export function findPackagePrice(name: string, rules: MeituanPackageRule[]) {
  const n = normalizeSpace(name)
  if (!n) return null
  
  for (const rule of rules) {
    const tests = rule.tests.split(/\s+/).filter(Boolean)
    if (tests.length === 2 && tests[0] && tests[1]) {
      if (n.includes(tests[0]) && n.includes(tests[1])) {
        return rule.price
      }
    }
  }
  return null
}

export function parseTabText(tabText: string): MeituanParsedOrder[] {
  const text = String(tabText || '').trim()
  if (!text) return []

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const orders: MeituanParsedOrder[] = []
  const timeRe = /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/

  for (const line of lines) {
    const cols = line.split(/\t/)
    const safe = (i: number) => (cols[i] !== undefined ? normalizeSpace(cols[i]) : '')

    const timeIdx = cols.findIndex((c) => timeRe.test(normalizeSpace(c)))
    const maybeHeader = safe(0) + safe(1) + safe(2)
    if (maybeHeader.includes('交易') && maybeHeader.includes('券')) continue

    if (timeIdx !== -1) {
      const discountPart = cols.slice(4, timeIdx).map(x => normalizeSpace(x)).filter(Boolean)
      const storePart = cols.slice(timeIdx + 3).map(x => normalizeSpace(x)).filter(Boolean)
      
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
      })
    } else {
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
      })
    }
  }

  return orders
}

export function buildMeituanRows(
  orders: MeituanParsedOrder[],
  opts: {
    taxRate: number;
    rules: MeituanPackageRule[];
    calculateFinancialVal: (actual: number, _unused: number, taxRate: number) => number;
  }
): MeituanOrderRow[] {
  const rows = orders.map((o) => {
    const amount = parseMoney(o.amount)
    const discount = parseDiscountTotal(o.discount)
    const actual = amount - discount
    const financial = opts.calculateFinancialVal(actual, 0, opts.taxRate)
    const bar = findPackagePrice(o.name, opts.rules) || actual
    return {
      ...o,
      amount,
      discount,
      actual,
      financial,
      bar,
    }
  })

  rows.sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')))
  return rows
}

export function computeMeituanStats(rows: MeituanOrderRow[]): MeituanStats {
  const barTotal = rows.reduce((sum, o) => sum + (o.bar || 0), 0)

  let cokes = 0
  const keywords = ['可口可乐', '可乐', 'Coke', 'coke']
  for (const o of rows) {
    const text = [o.name, o.type, o.remark].join(' ')
    if (!keywords.some((k) => text.includes(k))) continue

    let qty = 0
    for (const kw of keywords) {
      const re1 = new RegExp(`${kw}\\s*[xX×\\*]\\s*(\\d+)`)
      const re2 = new RegExp(`${kw}[^\\d]{0,4}(\\d+)\\s*(?:瓶|听|罐|杯|份|个)`)
      const m1 = text.match(re1)
      const m2 = text.match(re2)
      if (m1 && m1[1]) qty = Math.max(qty, Number(m1[1]))
      if (m2 && m2[1]) qty = Math.max(qty, Number(m2[1]))
    }
    cokes += qty > 0 ? qty : 1
  }

  let range = ''
  const times = rows
    .map((o) => {
      const match = String(o.time || '').match(/(\d{2}-\d{2})\s+(\d{2}:\d{2})/)
      return match ? { date: match[1], time: match[2], full: String(o.time || '') } : null
    })
    .filter((x): x is { date: string; time: string; full: string } => !!x)
    .sort((a, b) => a.full.localeCompare(b.full))

  if (times.length > 0) {
    const first = times[0]
    const last = times[times.length - 1]
    range = `${first.date} ${first.time} ~ ${last.time}`
  }

  return { barTotal, cokes, range }
}
