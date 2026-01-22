# Views Layer

**Purpose**: 页面级组件和路由管理

## OVERVIEW
Vue 3 Composition API页面，基于角色的访问控制和状态管理。

## STRUCTURE
```
src/views/
├── CashierView.vue         # 收银台主界面（核心业务）
├── ShiftRecordsView.vue    # 交班记录管理
├── ProductsView.vue        # 商品管理
├── FinanceView.vue         # 财务管理和报表
├── MeituanView.vue         # 美团集成页面
├── UsersView.vue          # 用户管理
├── PermissionsView.vue     # 权限管理
├── SettingsView.vue        # 系统设置
├── LoginView.vue          # 登录页面
├── ExternalPage.vue       # 外部页面容器
└── backend/               # 后台管理页面
    ├── BackUsersView.vue   # 后台用户管理
    ├── BackFinanceView.vue # 后台财务管理
    ├── BackSettingsView.vue# 后台设置
    ├── BackPermsView.vue  # 后台权限
    └── BackShiftView.vue  # 后台交班
```

## WHERE TO LOOK
| 功能模块 | 视图文件 | 权限要求 |
|---------|---------|---------|
| POS收银 | CashierView.vue | view_cashier |
| 交班管理 | ShiftRecordsView.vue | view_shift |
| 商品管理 | ProductsView.vue | admin_only, view_products |
| 财务管理 | FinanceView.vue | boss_only, view_finance |
| 用户管理 | UsersView.vue | admin_only, view_users |
| 系统设置 | SettingsView.vue | admin_only, view_settings |

## 核心业务页面

### CashierView.vue - 双模式界面
```typescript
// 模式切换
const mode = ref<'handover' | 'sales'>('handover')

// handover: 交班模式
// - 库存管理（补货、剩余、兑奖、扣减）
// - 财务统计（网费、售货、美团、支出）

// sales: 销售模式  
// - 商品展示和搜索
// - 购物车管理
// - 收银结账
```

### 权限控制
```typescript
// 只读模式控制
const isReadonly = computed(() => {
  const isSuccessor = app.currentEmployee === auth.userProfile?.name
  const isAdmin = auth.currentUser?.role === 'admin'
  return !auth.isAuthenticated || (!isSuccessor && !isAdmin)
})
```

## 路由配置 (router/index.ts)

### 页面权限
```typescript
// 员工权限：收银台、交班记录
employee: ['view_cashier', 'view_shift', 'view_data', 'view_handover']

// 股东权限：+财务、商品、设置
boss: [...employee, 'view_finance', 'view_products', 'view_settings']

// 超管权限：所有功能
admin: ['*']
```

### 外部集成
```typescript
// 美团验券管理
https://e.dianping.com/app/merchant-platform/[验券链接]

// 美团消费数据  
https://e.dianping.com/app/merchant-platform/[数据链接]
```

## CONVENTIONS
- Composition API + <script setup>语法
- 基于角色的访问控制
- Pinia状态管理集成
- 路由权限守卫

## ANTI-PATTERNS
- NEVER混合业务逻辑和表示层
- DON'T绕过认证状态管理
- AVOID直接API调用（使用composables）

## UNIQUE STYLES
- 员工vs股东登录流程
- 交班快照预览功能
- 美团WebView内嵌集成
- 实时财务数据计算
- 接班人权限控制机制