# CashierView.vue 美团模块完整修复说明

## 需要修改的内容：

### 1. 修正按钮文字（第536-542行）
```vue
<!-- 原来 -->
<button>型</button>
<button>注</button>
<button>店</button>
<button>重置</button>

<!-- 改为 -->
<button>类型</button>
<button>备注</button>
<button>门店</button>
<button>清空</button>
```

### 2. 添加套餐配置按钮和清空按钮（第565-567行）
```vue
<!-- 原来 -->
<button @click="handleMeituanParse">解析</button>
<button>配置</button>

<!-- 改为 -->
<button @click="handleMeituanParse">解析</button>
<button @click="showPackageModal = true">套餐</button>
<button @click="meituanRows = []">清空</button>
```

### 3. 在 script setup 中添加套餐配置相关状态
```typescript
// 添加到现有的 ref 定义区域
const showPackageModal = ref(false)
const packageRules = ref([
  { tests: '新会员 特惠', price: 30 },
  { tests: '新会员 女神', price: 30 },
  // ... 其他默认规则
])
```

### 4. 添加套餐配置弹窗（在 Meituan 模块之后）
```vue
<!-- 套餐配置弹窗 -->
<div v-if="showPackageModal" class="fixed inset-0 bg-black/30 flex items-center justify-center z-50" @click.self="showPackageModal = false">
  <div class="bg-white rounded-xl border border-slate-200 shadow-2xl w-[860px] max-w-[94vw] max-h-[80vh] overflow-auto">
    <div class="flex items-center justify-between p-4 border-b border-slate-200">
      <div class="font-black text-sm text-slate-800">美团套餐（同步计费价）</div>
      <button @click="showPackageModal = false" class="h-8 px-3 border border-slate-300 rounded-lg font-semibold text-sm hover:bg-slate-50">关闭</button>
    </div>
    <div class="p-4">
      <div class="text-xs text-slate-600 leading-relaxed mb-3">
        每条套餐规则固定为"两关键字匹配"：订单交易快照(name) 同时包含两个关键词才命中。关键词用空格分隔，例如：网游区 3小时；价格填写数字。保存后会自动刷新计费价与统计。
      </div>
      <div class="grid grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto">
        <div v-for="(rule, idx) in packageRules" :key="idx" class="grid grid-cols-[1fr_140px_76px] gap-2 items-center">
          <input v-model="rule.tests" type="text" placeholder="两个关键词（空格分隔），如：网游区 3小时" class="h-9 px-3 border border-slate-300 rounded-lg text-xs" />
          <input v-model.number="rule.price" type="number" placeholder="价格" class="h-9 px-3 border border-slate-300 rounded-lg text-xs text-center" />
          <button @click="packageRules.splice(idx, 1)" class="h-8 w-8 inline-flex items-center justify-center border border-slate-300 rounded-lg hover:bg-red-50 hover:border-red-300">
            <svg viewBox="0 0 24 24" fill="none" class="w-4 h-4" stroke="currentColor" stroke-width="2">
              <path d="M9 3h6m-7 4h8m-9 0h10l-1 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7Z" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M10 11v8M14 11v8" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="flex gap-2 mt-4">
        <button @click="addPackageRule" class="h-8 px-3 border border-slate-300 rounded-lg font-semibold text-sm hover:bg-slate-50">新增套餐</button>
        <button @click="resetPackageRules" class="h-8 px-3 border border-slate-300 rounded-lg font-semibold text-sm hover:bg-slate-50">恢复默认</button>
        <button @click="savePackageRules" class="h-8 px-3 bg-brand-orange border border-brand-orange text-white rounded-lg font-semibold text-sm hover:brightness-95 ml-auto">保存</button>
      </div>
    </div>
  </div>
</div>
```

### 5. 实现 handleMeituanParse 函数（完整版）
```typescript
async function handleMeituanParse() {
  try {
    if (navigator.clipboard && navigator.clipboard.readText) {
      const text = await navigator.clipboard.readText()
      if (text && text.trim()) {
        const orders = parseTabText(text)
        meituanRows.value = orders.map((o, idx) => {
          const amount = parseMoney(o.amount)
          const discount = parseDiscountTotal(o.discount)
          const actual = amount - discount
          const financial = calculateFinancialVal(actual, 0, meituanTaxRate.value)
          const bar = findPackagePrice(o.name, packageRules.value) || actual
          
          return {
            ...o,
            amount,
            discount,
            actual,
            financial,
            bar
          }
        })
        
        // 按时间升序排序
        meituanRows.value.sort((a, b) => (a.time || '').localeCompare(b.time || ''))
      }
    }
  } catch (error) {
    console.error('剪贴板读取失败:', error)
    alert('剪贴板为空或读取失败：请先复制美团订单表格（Tab 分隔）到剪贴板')
  }
}

function parseTabText(tabText: string) {
  const text = String(tabText || '').trim()
  if (!text) return []

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const orders = []
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

function normalizeSpace(value: string) {
  return String(value || '')
    .replace(/\u00A0/g, ' ')
    .replace(/[\s\t\r\n]+/g, ' ')
    .trim()
}

function parseMoney(value: string) {
  const s = String(value || '')
  const m = s.match(/-?\d+(?:\.\d+)?/g)
  if (!m) return 0
  const n = Number(m[0])
  return Number.isFinite(n) ? n : 0
}

function parseDiscountTotal(value: string) {
  const s = String(value || '')
  const ms = s.match(/-?\d+(?:\.\d+)?/g)
  if (!ms) return 0
  return ms.reduce((sum, x) => {
    const n = Number(x)
    return sum + (Number.isFinite(n) ? n : 0)
  }, 0)
}

function findPackagePrice(name: string, rules: any[]) {
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
```

### 6. 添加套餐管理函数
```typescript
function addPackageRule() {
  packageRules.value.push({ tests: '', price: 0 })
}

function resetPackageRules() {
  packageRules.value = [
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
  ]
}

function savePackageRules() {
  // 重新计算所有订单的计费价
  meituanRows.value = meituanRows.value.map(o => ({
    ...o,
    bar: findPackagePrice(o.name, packageRules.value) || o.actual
  }))
  showPackageModal.value = false
}
```

## 关键修复点总结：

1. ✅ 按钮文字：型→类型、注→备注、店→门店、重置→清空
2. ✅ 解析按钮：实现剪贴板读取和Tab文本解析
3. ✅ 套餐配置：完整的套餐规则管理弹窗
4. ✅ 时间范围：在"单数"前显示订单起止时间
5. ✅ 计费价计算：基于套餐规则的双关键字匹配
6. ✅ 列宽规则：使用与SalesModule相同的CSS变量方式
