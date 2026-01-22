# 项目状态

> 本文件用于记录当前代码已实现的内容与当前进展。

## 当前状态

- 代码基于 `src/`（前端）与 `src-tauri/`（桌面端）实现。
- 支持可选的 Supabase 云同步能力（由环境变量/配置决定）。
- 收银台协同采用云端 `shifts(status=active)` + `shift_live` 作为实时真源。

## 已完成（以代码为准）

- 基础页面与模块路由
- 账号配置示例：`src/config/accounts.example.ts`
- 收银台实时协同：所有登录用户进入收银台看到“当前实时班次”（`shift_live`）
- 权限硬限制：仅超管与当班人员可编辑；其他角色只读但实时订阅回显

## 进行中

- UI 提示：只读/可编辑/同步状态（避免用户误以为可编辑或同步失败）

## 下一步

- 补齐收银台顶部/显眼位置状态条：当前班次、只读/可编辑、云端连接/同步状态
- 交班历史（`shift_records`）继续作为唯一历史查看入口（收银台不提供历史切换）

## 本次更新说明

- 固化产品规则（必须遵守）：
  - 收银台永远展示“当前实时班次”的数据（不是历史查看入口）
  - 历史班次只能去“交班历史/shift_records”查看
  - 只有超管(admin)与当班人员（active shift employee）有权限编辑收银台
  - 实现上避免依赖每台设备本地 `currentDate/currentShift/currentEmployee` 作为协同 key，应以云端 active shift 为准
- 代码实现落点：
  - `src/views/CashierView.vue`：启动读取云端 active shift，并基于该 key 读/订阅/写入 `shift_live`
  - `src/layout/MainLayout.vue`：收紧“班次信息编辑”入口，仅超管允许修改（防止本地切换导致协同不一致）
