# Smarticafe Pro v2.2.0

创新意电竞馆收银管理系统 - 桌面应用 (Tauri + Vue 3 + TypeScript)

## 🆕 v2.2.0 核心功能

### ✨ 代持股东系统完整实现
- 支持 `mojian_拼音` 登录格式保护隐私
- 4位代持股东完整支持
- `heldFrom` 字段标识代持关系

### ✨ 美团深度集成
- 内嵌WebView在Tauri应用中显示美团页面
- 4级降级策略确保兼容性
- 自动计算财务价和计费价

### ✨ 交班快照预览增强
- 快照内容实时预览
- HTML快照自动保存
- 交班数据完整性验证

### ✨ 导航布局优化修复
- 美团验券管理正确显示
- 外部链接处理优化
- 菜单高亮状态修复

## 🏢 股权结构 (v2.2.0)

| 股东 | 股份 | 类型 | 登录方式 | 状态 |
|------|------|------|----------|------|
| **朱晓培** | **30%** | 明面股东 | `zhuxiaopei` | ✅ 已实现 |
| **莫健** | **25%** | 明面股东/超管 | `laoban` / `chaoguan` | ✅ 已实现 |
| 崔国丽 | 20% | 代持股东 | `mojian_cuiguoli` | ✅ 已实现 |
| 路秋勉 | 13% | 代持股东 | `mojian_luqiumian` | ✅ 已实现 |
| 曹梦思 | 10% | 代持股东 | `mojian_caomengsi` | ✅ 已实现 |
| 莫艳菲 | 2% | 代持股东 | `mojian_moyanfei` | ✅ 已实现 |

**总计**: 朱晓培 30% + 莫健 25% + 代持 45% = 100%

## 👥 用户列表

### 正式员工（可登录 + 可接班）
- 黄河
- 刘杰
- 贾政华
- 秦佳
- 史红

### 明面股东（可登录 + 可接班）
- 莫健（超管，25%）
- 朱晓培（30%）

### 代持股东（不显示登录入口，莫健代持）
- 崔国丽（20%）
- 路秋勉（13%）
- 曹梦思（10%）
- 莫艳菲（2%）

## 🔐 登录方式

### 快速登录（员工）
点击员工名字即可登录，无需密码。

### 股东登录
1. **莫健（超管）** - 点击"莫健"按钮，输入密码：
   - `laoban` → 莫健 股东身份（25%）
   - `chaoguan` → 莫健 超管身份

2. **朱晓培（股东）** - 点击"朱晓培"按钮，输入密码：
   - `zhuxiaopei` → 朱晓培 股东身份（30%）

3. **代持股东** - 莫健登录后，使用格式 `mojian_姓名拼音`：
   - `mojian_cuiguoli` → 崔国丽（代持，20%）
   - `mojian_luqiumian` → 路秋勉（代持，13%）
   - `mojian_caomengsi` → 曹梦思（代持，10%）
   - `mojian_moyanfei` → 莫艳菲（代持，2%）

## 🔄 交班逻辑

### 当班人 vs 登录人
- **当班人**：当前班次负责人，显示在头部左侧（格式：`2026-01-01 白班 黄河`）
- **登录人**：当前登录账户，显示在头部右侧（格式：`员工 黄河` 或 `股东 莫健 25%`）

### 接班人列表
可接班顶班人员：`['黄河', '刘杰', '贾政华', '秦佳', '史红', '莫健', '朱晓培']`

### 权限控制
- **接班人本人**：可编辑收银台
- **超管莫健**：可查看所有数据
- **其他登录人**：只读模式（不可编辑）

## 🗄️ 数据库配置

### Supabase
- **Project ID**: `<your_project_ref>`
- **URL**: `https://<your_project_ref>.supabase.co`
- **Anon/Publishable Key**: `<your_anon_or_publishable_key>`
- **Service Role Key**: `<never_commit_service_role_key>`

### 数据表
- `auth_sessions` - 登录会话记录
- `products` - 商品列表
- `sales_orders` - 销售订单
- `sales_items` - 订单明细
- `accounting_entries` - 财务条目
- `shift_records` - 交班记录
- `meituan_orders` - 美团订单

## 🚀 技术栈

- **前端**: Vue 3.5.13 + TypeScript 5.6.2
- **桌面**: Tauri 2.9.1 + Rust
- **状态**: Pinia 2.2.4
- **样式**: Tailwind CSS 4.1.18  
- **数据库**: SQLite + Supabase
- **测试**: Vitest 2.1.8 + Playwright

## 🚀 快速开始

### 环境要求
- Node.js 18+
- Rust 1.70+
- Windows 10/11 (推荐)

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
# 前端开发服务器
npm run dev

# 完整 Tauri 应用
npm run tauri dev
```

### 构建生产版本
```bash
# TypeScript 检查 + 前端构建
npm run build

# Tauri 桌面应用构建
npm run tauri build
```

### 测试
```bash
# 运行所有测试
npm run test

# 监听模式
npm run test:watch

# 运行单个测试
npm test path/to/test.spec.ts
```

## 📁 项目结构

```
smarticafe-v2.0.0/
├── src/
│   ├── components/             # Vue组件
│   │   ├── ui/                # UI基础组件 (按钮、输入框、卡片等)
│   │   ├── pos/               # 收银相关组件 (商品卡片、购物车项)
│   │   ├── meituan/           # 美团相关组件
│   │   ├── LoginPanel.vue     # 登录面板
│   │   ├── SnapshotModal.vue  # 交班快照
│   │   └── UserInfoCard.vue   # 用户信息卡片
│   ├── views/                  # 页面组件
│   │   ├── CashierView.vue    # 收银台主视图
│   │   ├── ProductsView.vue   # 商品管理
│   │   ├── FinanceView.vue    # 财务管理
│   │   ├── UsersView.vue      # 用户管理
│   │   ├── MeituanView.vue    # 美团管理
│   │   ├── SettingsView.vue   # 系统设置
│   │   └── backend/           # 后端管理页面
│   ├── stores/                 # Pinia状态管理
│   │   ├── auth.ts             # 认证状态（股权结构）
│   │   ├── app.ts              # 应用状态（班次信息）
│   │   ├── theme.ts            # 主题状态
│   │   └── cart.ts             # 购物车状态
│   ├── api/                    # API接口层
│   │   ├── types.ts            # 类型定义
│   │   ├── products.ts         # 商品API
│   │   ├── meituan.ts          # 美团API
│   │   ├── shift.ts            # 交班API
│   │   └── finance.ts          # 财务API
│   ├── services/               # 服务层
│   │   └── supabase/           # Supabase集成
│   │       ├── client.ts       # 客户端配置
│   │       └── adapters.ts     # 数据适配器
│   ├── utils/                  # 工具函数
│   │   ├── validation.ts       # 验证工具
│   │   ├── tauri.ts            # Tauri工具
│   │   ├── migration.ts        # 数据迁移
│   │   └── errorHandler.ts     # 错误处理
│   ├── layout/                 # 布局组件
│   │   └── MainLayout.vue      # 主布局
│   └── router/                 # 路由配置
│       └── index.ts
├── src-tauri/                  # Tauri后端 (Rust)
│   ├── src/
│   │   ├── lib.rs              # 主要Rust代码 (15200+行)
│   │   ├── http_server.rs       # HTTP API服务
│   │   └── main.rs             # 入口文件
│   ├── capabilities/            # Tauri权限配置
│   └── tauri.conf.json         # Tauri配置
├── tests/                      # 测试文件
│   ├── integration/            # 集成测试
│   └── __tests__/              # 单元测试
├── docs/                       # 文档
│   ├── AGENTS.md               # AI开发指南
│   ├── SUPABASE_RLS.md         # RLS策略配置
│   └── API.md                  # API接口文档
├── .env.local                  # 本地环境变量（敏感）
├── .env.example                # 环境变量模板
└── README.md                   # 本文档

## 🔒 安全配置

### Supabase RLS 策略

项目使用 Supabase Row Level Security (RLS) 保护数据库安全：

- **Service Role Key**: 用于所有写入操作（绕过 RLS）
- **Anon Key**: 用于浏览器端读取操作（受 RLS 限制）

详细配置请参考：[docs/SUPABASE_RLS.md](./docs/SUPABASE_RLS.md)

### 同步架构

```
本地应用 (SQLite)
  → 同步队列 (localStorage)
  → SyncService.sync()
  → Supabase Admin (Service Role)
  → Supabase 云端 (PostgreSQL)
```

## ⚠️ 重要提醒

1. **代持股东不显示登录入口** - 崔国丽等人不显示在登录界面，只能通过莫健代持登录
2. **接班人必须是明面人员** - 代持股东不能被选为接班人
3. **股权数据以本文件为准** - 如有变更，请同步更新本文档和代码

## 📝 更新日志

### v2.2.0 (2026-01-19) - 当前版本
**🆕 核心功能**
- ✨ 代持股东系统完整实现 (崔国丽/路秋勉/曹梦思/莫艳菲)
- ✨ 美团深度集成 (内嵌WebView + 4级降级策略)
- ✨ 交班快照预览增强 (HTML快照 + 数据验证)
- ✨ 导航布局优化修复 (美团验券正确显示)

**🔧 技术改进**
- 升级到 Vue 3.5.13 + TypeScript 5.6.2
- 升级到 Tauri 2.9.1 (支持更多原生功能)
- 完善测试体系 (Vitest + Playwright)
- 优化构建性能和代码分割

### v2.1.0 (2026-01-15)
- 新增商品管理模块
- 实现基础收银功能
- 添加用户权限控制
- 集成 Supabase 云端同步

### v2.0.0 (2026-01-01)
- 初始版本发布
- 基础架构搭建
- Vue 3 + Tauri 技术栈集成
- 本地 SQLite 数据库实现

---
**最后更新**: 2026-01-20 (文档同步)
