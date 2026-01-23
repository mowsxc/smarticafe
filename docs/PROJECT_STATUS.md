# 项目状态

> 本文件用于记录当前代码已实现的内容与当前进展。

## 当前状态

- 代码基于 `src/`（前端）与 `src-tauri/`（桌面端）实现。
- 支持可选的 Supabase 云同步能力（由环境变量/配置决定）。
- 收银台协同采用云端 `shifts(status=active)` + `shift_live` 作为实时真源。

## 最新更新 (2026-01-23)

### UI 重构 - 交付级品质升级

本次重构采用**Premium Fintech**设计理念，全面提升界面视觉效果：

#### 1. 启动画面 (`public/splash.html`)
- ✅ 多层环境光效系统（3个动画光斑）
- ✅ 精致Logo渐变 + 双环脉冲效果
- ✅ 进度条发光动画
- ✅ 随机化加载状态文本
- ✅ 品牌Typography优化

#### 2. 安装引导页 (`src/views/SetupView.vue`)
- ✅ 全新进度步进器设计
- ✅ 精致卡片光影效果（shimmer + glow）
- ✅ 流畅步骤切换动画
- ✅ 成功状态粒子特效
- ✅ 统一设计语言和组件系统

#### 3. 全局设计系统 (`src/style.css`)
- ✅ 完整设计令牌（颜色、间距、圆角、阴影）
- ✅ 多层阴影系统（xs/sm/md/lg/xl/2xl）
- ✅ 玻璃态组件库（glass-card, glass-panel, frosted）
- ✅ 按钮/输入系统
- ✅ 动画关键帧库
- ✅ Vue过渡预设

#### 4. 收银台增强样式 (`src/styles/cashier-enhanced.css`)
- ✅ 表格视觉升级
- ✅ 统计栏交互效果
- ✅ 状态标签系统
- ✅ 面板头部设计
- ✅ Meituan表格优化

## 已完成（以代码为准）

- 基础页面与模块路由
- 账号配置示例：`src/config/accounts.example.ts`
- 收银台实时协同：所有登录用户进入收银台看到"当前实时班次"（`shift_live`）
- 权限硬限制：仅超管与当班人员可编辑；其他角色只读但实时订阅回显
- 动态品牌系统：品牌名、门店名数据库持久化
- 首航引导流程：首次安装向导
- UI重构：启动画面、安装引导页、全局样式升级

## 进行中

- UI 提示：只读/可编辑/同步状态（避免用户误以为可编辑或同步失败）
- 主布局头部优化
- 收银台应用增强样式

## 下一步

- 补齐收银台顶部/显眼位置状态条：当前班次、只读/可编辑、云端连接/同步状态
- 交班历史（`shift_records`）继续作为唯一历史查看入口（收银台不提供历史切换）
- 登录面板视觉升级
- 深色模式支持

## 核心产品规则（必须遵守）

- 收银台永远展示"当前实时班次"的数据（不是历史查看入口）
- 历史班次只能去"交班历史/shift_records"查看
- 只有超管(admin)与当班人员（active shift employee）有权限编辑收银台
- 实现上避免依赖每台设备本地 `currentDate/currentShift/currentEmployee` 作为协同 key，应以云端 active shift 为准

## 代码实现落点

- `src/views/CashierView.vue`：启动读取云端 active shift，并基于该 key 读/订阅/写入 `shift_live`
- `src/layout/MainLayout.vue`：收紧"班次信息编辑"入口，仅超管允许修改（防止本地切换导致协同不一致）
- `src/views/SetupView.vue`：首航安装引导（已升级视觉效果）
- `public/splash.html`：启动画面（已升级视觉效果）
