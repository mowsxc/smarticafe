import { createApp } from "vue";
import { createPinia } from "pinia";
import router from "./router";
import App from "./App.vue";
import "./style.css";
import { initSupabaseSync, supabase } from "./services/supabase/client";
import { tauriCmd } from "./utils/tauri";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

// Initialize Supabase sync service for cloud backup and multi-device sync
initSupabaseSync().catch((error) => {
  console.error("Failed to initialize Supabase sync service:", error);
  // App continues to work offline even if sync fails
});

type CloudProduct = {
  id: string
  name: string
  category: string
  unit_price: number
  cost_price: number
  spec: number
  on_shelf: number
  stock: number
  is_active: boolean
  created_at: string
  updated_at: string
}

type CloudShiftRecord = {
  id: string
  date_ymd: string
  shift: string
  employee: string
  wangfei: number
  shouhuo: number
  meituan: number
  zhichu: number
  income: number
  yingjiao: number
  created_at: string
}

type CloudSalesOrder = {
  id: string
  date_ymd: string
  shift: string
  employee: string
  total_revenue: number
  total_profit: number
  created_at: string
  updated_at: string
}

type CloudSalesItem = {
  id: string
  order_id: string
  product_name: string
  original: number | null
  restock: number | null
  remaining: number | null
  redeem: number | null
  redeem_mode: number | null
  loss: number | null
  purchase: number | null
  stock_prev: number | null
  stock: number | null
  sales: number | null
  revenue: number | null
  unit_price: number | null
  cost_price: number | null
  spec: number | null
  created_at: string
}

type CloudAccountingEntry = {
  id: string
  date_ymd: string
  shift: string
  employee: string
  entry_type: string
  item: string
  amount: number
  bar_pay: number
  finance_pay: number
  created_at: string
}

type CloudMeituanOrder = {
  id: string
  date_ymd: string
  shift: string
  employee: string
  coupon_no: string | null
  raw_text: string
  amount: number
  discount: number
  financial: number
  bar_total: number
  created_at: string
}

type CloudAuthAccount = {
  id: string
  pick_name: string
  pass_salt: string
  pass_hash: string
  role: string
  identity: string
  display_name: string
  equity: number
  is_active: number
  created_at: string
  updated_at: string
}

const toTs = (iso: string): number => {
  const ms = Date.parse(String(iso || ''))
  if (!Number.isFinite(ms)) return 0
  return Math.floor(ms / 1000)
}

const readAdminToken = (): string => {
  try {
    const raw = localStorage.getItem('auth_user')
    if (!raw) return ''
    const u = JSON.parse(raw)
    return String(u?.token || '').trim()
  } catch {
    return ''
  }
}

const fetchAll = async <T = any>(table: string, select: string): Promise<T[]> => {
  if (!supabase) throw new Error('cloud_not_enabled')
  const pageSize = 1000
  let from = 0
  const out: T[] = []

  for (;;) {
    const to = from + pageSize - 1
    const { data, error } = await (supabase as any)
      .from(table)
      .select(select)
      .range(from, to)

    if (error) throw error
    const rows = Array.isArray(data) ? data : []
    out.push(...(rows as T[]))
    if (rows.length < pageSize) break
    from += pageSize
  }
  return out
}

;(window as any).smarticafeRestoreFromCloud = async () => {
  const token = readAdminToken()
  if (!token) throw new Error('admin_token_missing')
  if (!supabase) throw new Error('cloud_not_enabled')

  const [products, shiftRecords, salesOrders, salesItems, accountingEntries, meituanOrders, authAccounts] = await Promise.all([
    fetchAll<CloudProduct>('products', 'id,name,category,unit_price,cost_price,spec,on_shelf,stock,is_active,created_at,updated_at'),
    fetchAll<CloudShiftRecord>('shift_records', 'id,date_ymd,shift,employee,wangfei,shouhuo,meituan,zhichu,income,yingjiao,created_at'),
    fetchAll<CloudSalesOrder>('sales_orders', 'id,date_ymd,shift,employee,total_revenue,total_profit,created_at,updated_at'),
    fetchAll<CloudSalesItem>('sales_items', 'id,order_id,product_name,original,restock,remaining,redeem,redeem_mode,loss,purchase,stock_prev,stock,sales,revenue,unit_price,cost_price,spec,created_at'),
    fetchAll<CloudAccountingEntry>('accounting_entries', 'id,date_ymd,shift,employee,entry_type,item,amount,bar_pay,finance_pay,created_at'),
    fetchAll<CloudMeituanOrder>('meituan_orders', 'id,date_ymd,shift,employee,coupon_no,raw_text,amount,discount,financial,bar_total,created_at'),
    fetchAll<CloudAuthAccount>('auth_accounts', 'id,pick_name,pass_salt,pass_hash,role,identity,display_name,equity,is_active,created_at,updated_at'),
  ])

  await tauriCmd('db_replace_from_cloud', {
    input: {
      token,
      auth_accounts: authAccounts.map(a => ({
        id: String(a.id),
        pick_name: String(a.pick_name),
        pass_salt: String(a.pass_salt),
        pass_hash: String(a.pass_hash),
        role: String(a.role),
        identity: String(a.identity),
        display_name: String(a.display_name),
        equity: Number(a.equity) || 0,
        is_active: Number(a.is_active) || 1,
        created_at: toTs(String(a.created_at)),
        updated_at: toTs(String(a.updated_at)),
      })),
      products: products.map(p => ({
        id: String(p.id),
        name: String(p.name),
        category: String(p.category ?? '饮品'),
        unit_price: Number(p.unit_price) || 0,
        cost_price: Number(p.cost_price) || 0,
        spec: Number(p.spec) || 0,
        on_shelf: Number(p.on_shelf) || 0,
        stock: Number(p.stock) || 0,
        is_active: !!(p as any).is_active,
        created_at: toTs(String(p.created_at)),
        updated_at: toTs(String(p.updated_at)),
      })),
      shift_records: shiftRecords.map(r => ({
        id: String(r.id),
        date_ymd: String(r.date_ymd),
        shift: String(r.shift),
        employee: String(r.employee),
        wangfei: Number(r.wangfei) || 0,
        shouhuo: Number(r.shouhuo) || 0,
        meituan: Number(r.meituan) || 0,
        zhichu: Number(r.zhichu) || 0,
        income: Number(r.income) || 0,
        yingjiao: Number(r.yingjiao) || 0,
        created_at: toTs(String(r.created_at)),
      })),
      sales_orders: salesOrders.map(o => ({
        id: String(o.id),
        date_ymd: String(o.date_ymd),
        shift: String(o.shift),
        employee: String(o.employee),
        total_revenue: Number(o.total_revenue) || 0,
        total_profit: Number(o.total_profit) || 0,
        created_at: toTs(String(o.created_at)),
        updated_at: toTs(String(o.updated_at)),
      })),
      sales_items: salesItems.map(it => ({
        id: String(it.id),
        order_id: String(it.order_id),
        product_name: String(it.product_name),
        original: it.original == null ? null : Number(it.original),
        restock: it.restock == null ? null : Number(it.restock),
        remaining: it.remaining == null ? null : Number(it.remaining),
        redeem: it.redeem == null ? null : Number(it.redeem),
        redeem_mode: it.redeem_mode == null ? null : Number(it.redeem_mode),
        loss: it.loss == null ? null : Number(it.loss),
        purchase: it.purchase == null ? null : Number(it.purchase),
        stock_prev: it.stock_prev == null ? null : Number(it.stock_prev),
        stock: it.stock == null ? null : Number(it.stock),
        sales: it.sales == null ? null : Number(it.sales),
        revenue: it.revenue == null ? null : Number(it.revenue),
        unit_price: it.unit_price == null ? null : Number(it.unit_price),
        cost_price: it.cost_price == null ? null : Number(it.cost_price),
        spec: it.spec == null ? null : Number(it.spec),
        created_at: toTs(String(it.created_at)),
      })),
      accounting_entries: accountingEntries.map(it => ({
        id: String(it.id),
        date_ymd: String(it.date_ymd),
        shift: String(it.shift),
        employee: String(it.employee),
        entry_type: String(it.entry_type),
        item: String(it.item),
        amount: Number(it.amount) || 0,
        bar_pay: Number(it.bar_pay) || 0,
        finance_pay: Number(it.finance_pay) || 0,
        created_at: toTs(String(it.created_at)),
      })),
      meituan_orders: meituanOrders.map(it => ({
        id: String(it.id),
        date_ymd: String(it.date_ymd),
        shift: String(it.shift),
        employee: String(it.employee),
        coupon_no: it.coupon_no == null ? null : String(it.coupon_no),
        raw_text: String(it.raw_text),
        amount: Number(it.amount) || 0,
        discount: Number(it.discount) || 0,
        financial: Number(it.financial) || 0,
        bar_total: Number(it.bar_total) || 0,
        created_at: toTs(String(it.created_at)),
      })),
    }
  })
}

app.mount("#app");
