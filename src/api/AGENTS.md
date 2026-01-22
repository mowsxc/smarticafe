# API Layer

**Purpose**: 业务逻辑和类型定义

## OVERVIEW
TypeScript API函数和类型定义，支持商品、美团、交班、财务等业务领域。

## STRUCTURE
```
src/api/
├── index.ts              # API统一入口
├── types.ts              # 核心类型定义 (256行)
├── products.ts           # 商品管理API
├── meituan.ts           # 美团集成API
├── shift.ts              # 交班计算API
├── finance.ts            # 财务管理API
└── originalShift.ts      # 原始班次数据 (417行)
```

## WHERE TO LOOK
| 业务域 | 文件 | 用途 |
|--------|------|-------|
| 商品管理 | products.ts | CRUD操作、库存管理 |
| 美团订单 | meituan.ts | 订单解析、财务价计算 |
| 交班计算 | shift.ts | 班次统计、应交金额 |
| 财务数据 | finance.ts | 收支管理、统计报表 |
| 核心类型 | types.ts | 所有业务接口定义 |

## 核心类型 (types.ts)

### 业务实体
```typescript
// 商品
interface Product {
  id: string
  name: string
  category: string
  unit_price: number
  stock: number
  spec: number
  on_shelf?: boolean
}

// 美团订单
interface MeituanOrder {
  id: number
  name: string
  type: string
  amount: number
  discount: number
  financial: number  // 财务价（自动计算）
  time: string
  phone: string
  store: string
}

// 交班状态
interface ShiftState {
  internetFee: string | number      // 网费
  salesRevenue: number               // 售货收入
  meituanRevenue: string | number    // 美团收入
  expenditure: number                // 支出
  income: number                     // 入账
  amountDue: number                  // 应交金额
}
```

### 用户权限 (stores/auth.ts)
```typescript
interface User {
  id: string
  username: string
  role: 'admin' | 'boss' | 'employee'
  displayName: string
  equityPercentage?: number
  heldFrom?: string | null  // 代持来源
}
```

## CONVENTIONS
- 所有API函数返回Promise<T>
- 统一错误处理模式
- 类型安全的参数和返回值
- 通过services层访问Supabase

## ANTI-PATTERNS
- NEVER直接调用Supabase（使用services层）
- DON'T混合UI逻辑和API函数
- AVOID使用any类型（使用严格TypeScript）

## UNIQUE STYLES
- 领域模块化API结构
- 集中式类型定义
- 旧版本兼容层（originalShift.ts）
- 美团数据自动解析和财务价计算