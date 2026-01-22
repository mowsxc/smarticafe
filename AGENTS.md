# PROJECT KNOWLEDGE BASE

**Generated**: 2026-01-21
**Project**: SMARTICAFE v2.0.0 (智慧门店管理系统)
**Brand**: 创新意电竞馆 (草场地)
**Stack**: Vue 3.5.13 + TypeScript 5.6.2 + Tauri 2.9.1 + Supabase 2.39.0

## OVERVIEW
智慧电竞馆门店管理系统，支持收银、商品管理、交班、美团验券、财务管理等全流程业务。

## 构建命令

### 前端开发
```bash
npm run dev              # Vite 开发服务器 (端口 32520)
npm run build            # TypeScript 检查 + 生产构建
npm run preview          # 预览生产构建
vue-tsc --noEmit         # 仅 TypeScript 类型检查
```

### Tauri 桌面应用
```bash
npm run tauri dev        # 完整 Tauri 应用开发
npm run tauri build      # 生产 Tauri 应用
```

### 测试命令
```bash
npm run test             # 运行所有测试 (Vitest)
npm run test:watch       # 监听模式运行测试
npm test path/to/test.spec.ts  # 运行单个测试文件
```

## 项目结构
```
smarticafe-v2.0.0/
├── src/
│   ├── views/                  # 页面组件 (19个文件)
│   │   ├── CashierView.vue      # 收银台主界面
│   │   ├── ShiftRecordsView.vue # 交班记录
│   │   ├── ProductsView.vue     # 商品管理
│   │   ├── FinanceView.vue      # 财务管理
│   │   ├── MeituanView.vue     # 美团管理
│   │   ├── UsersView.vue        # 用户管理
│   │   ├── backend/             # 后端管理页面 (5个文件)
│   │   └── ...
│   ├── stores/                 # Pinia 状态管理
│   │   ├── auth.ts             # 认证系统 (318行)
│   │   ├── app.ts              # 应用状态 (83行)
│   │   ├── cart.ts             # 购物车 (126行)
│   │   └── theme.ts           # 主题管理
│   ├── api/                    # API 接口层
│   │   ├── types.ts            # 类型定义 (256行)
│   │   ├── products.ts         # 商品API
│   │   ├── meituan.ts         # 美团API
│   │   ├── shift.ts            # 交班API
│   │   ├── finance.ts          # 财务API
│   │   └── originalShift.ts   # 原始班次数据 (417行)
│   ├── services/supabase/      # 数据库同步服务
│   │   ├── client.ts           # 客户端配置 (578行)
│   │   └── adapters.ts         # 数据适配器 (433行)
│   ├── components/             # Vue组件
│   │   ├── pos/               # 收银相关组件
│   │   ├── meituan/           # 美团相关组件
│   │   ├── ui/                # UI基础组件
│   │   └── ...
│   ├── utils/                  # 工具函数
│   ├── composables/           # 组合式函数
│   └── layout/               # 布局组件
├── src-tauri/                # Tauri 后端 (Rust)
└── tests/                    # 测试文件
```

## 核心业务模块

### 1. 认证系统 (auth.ts)
**用户角色和权限：**
- `admin`: 超管 (莫健) - 所有权限
- `boss`: 股东 - 财务、商品、设置权限
- `employee`: 员工 - 收银、交班权限

**登录方式：**
- 员工免密登录：['黄河', '刘杰', '贾政华', '秦佳', '史红']
- 股东密码登录：朱晓培 (30%), 莫健 (25%)
- 代持股东：莫健使用 `mojian_拼音` 格式代持登录

### 2. 收银系统 (CashierView.vue)
**双模式界面：**
- `handover`: 交班模式 (库存管理、财务统计)
- `sales`: 销售模式 (商品销售、购物车)

**权限控制：**
- 只读模式：非接班人且非超管
- 编辑权限：接班人本人或超管

### 3. 美团集成 (router/index.ts)
**外部链接集成：**
- 验券管理：美团商家平台验券页面
- 消费数据：美团订单数据统计页面

### 4. 数据同步 (services/supabase/)
**离线优先架构：**
- 本地 SQLite 作为主数据库
- Supabase 作为云端备份
- 队列式同步，网络恢复自动同步

## 代码规范

### TypeScript 配置
- **严格模式**: 启用 (strict: true)
- **未使用变量**: 启用检查
- **路径别名**: @ → ./src

### 导入组织
```typescript
// 1. Vue 生态系统
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

// 2. 外部库  
import { createClient } from '@supabase/supabase-js'
import { open } from '@tauri-apps/plugin-shell'

// 3. 内部模块
import { fetchProducts } from '@/api/products'
import type { Product } from '@/api/types'
```

### Vue 组件模式
```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Product } from '@/api/types'

interface Props {
  item: Product
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false
})

const state = ref(initialValue)
const computedValue = computed(() => deriveFromState(state.value))
</script>
```

## 环境配置
```bash
# .env.local
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 数据库表结构
- `auth_sessions` - 登录会话记录
- `products` - 商品列表
- `orders` - 销售订单
- `order_items` - 订单明细
- `shift_records` - 交班记录
- `meituan_orders` - 美团订单

## 开发注意事项
- 所有业务操作先写本地 SQLite，再同步到 Supabase
- 网络失败时系统可正常离线工作
- 代持股东不显示登录入口，只能通过莫健代持登录
- 股东结构以代码中 auth.ts 为准