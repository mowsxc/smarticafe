# 前端开发日志 (Frontend Dev Log)

> 记录前端架构决策、组件开发、API 对接进度。

## 2026-01-15 架构搭建

### 📦 技术栈
*   **Core**: Vue 3 (Composition API) + TypeScript
*   **State**: Pinia (Auth, Cart, AppState)
*   **Style**: TailwindCSS (Utility-first) + PostCSS
*   **Build**: Vite

### 🛠️ 变更记录
*   **[Init]** 初始化项目，配置 Tailwind 主题色 (`brand-orange`, `brand-dark`) 和字体 (`DINpro`)。
*   **[Layout]** 开发 `MainLayout.vue`，实现 Split View (收银/导航) + Right Drawer (美团验券) 布局。
*   **[API]** 封装 `src/utils/tauri.ts` 统一通讯层。完成 `api/products.ts` 对接。
*   **[Migration]** 成功将商品列表从 Mock 切换为 Rust/SQLite 实时数据。
*   **[Security]** 移除 App.vue 中的硬编码自动登录，改为在内存中由用户/表单驱动。

### ⏳ 待办事项
1.  **Feature**: 实现 `CartStore` 处理购物车状态，对接 `pos_checkout` 命令。
2.  **UI**: 完善商品搜索功能（支持拼音/名称模糊搜索）。
3.  **Components**: 抽离 `ProductCard.vue` 和 `CartPanel.vue` 组件，提高代码复用性。

---
