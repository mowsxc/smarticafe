# 模块清单与入口定位

> 目的：让协作者/AI 快速定位“某功能的真实代码入口”。

## 入口

- 应用入口：`src/main.ts`
- 路由入口：`src/router/index.ts`
- 主布局：`src/layout/MainLayout.vue`

## 主要页面（views）

- 登录：`src/views/LoginView.vue`
- 收银：`src/views/CashierView.vue`
- 交班：`src/views/ShiftView.vue`、`src/views/ShiftRecordsView.vue`
- 财务：`src/views/FinanceView.vue`
- 商品：`src/views/ProductsView.vue`
- 权限/用户：`src/views/PermissionsView.vue`、`src/views/UsersView.vue`
- 美团：`src/views/MeituanView.vue`

## 状态（stores）

- 认证与权限：`src/stores/auth.ts`
- 购物车：`src/stores/cart.ts`
- 设置：`src/stores/settings.ts`

## 外部服务/接口（api）

- API 汇总入口：`src/api/index.ts`
- 班次/交班：`src/api/shift.ts`、`src/api/originalShift.ts`
- 商品：`src/api/products.ts`
- 财务：`src/api/finance.ts`
- 美团：`src/api/meituan.ts`

## 关键工具

- 售货清单解析：`src/utils/saleSheetParser.ts`
