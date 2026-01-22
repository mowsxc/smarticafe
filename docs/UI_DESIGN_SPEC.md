# 创新意电竞馆 (Smart Esports Pro) - UI/UX 设计规范 (Design Specifications)

> 基于 [B端产品设计规范](https://www.woshipm.com/pd/5280210.html) 与 "原子设计 (Atomic Design)" 理论构建。

本规范旨在确保 `smarticafe-pro` 系统在快速迭代中保持体验的一致性、专业性与高效性。系统采用 **Tauri + Vue 3** 架构，原生支持离线收银与高性能交互。

---

## 1. 设计原则 (Design Principles)

*   **一致性 (Consistency)**：遵循“少即是多 (Less is More)”原则。减少不必要的样式变体，降低用户认知负荷（如：按钮仅提供 Primary, Secondary, Ghost 三种）。
*   **原子化 (Atomic)**：界面由 原子(Atoms) -> 分子(Molecules) -> 组织(Organisms) -> 模板(Templates) 构成。
*   **容错与反馈 (Forgiveness & Feedback)**：所有操作（点击、扫码）必须在 **0.2s** 内给予微动画反馈；验券成功/失败必须有明确的色相区分（绿/红）。
*   **数据优先 (Data First)**：收银台核心数字（金额、时间）强制使用等宽数字字体 (Monospace/DINpro)，确保快速扫视下的易读性。

---

## 2. 视觉规范 (Visual Language)

### 2.1 字体 (Typography)

*   **主字体**：`Zoho Puvi` (全站统一) - 现代化、专业、易读
    *   **适用范围**：中英文、数字、字母、标点符号
    *   **字重**：Thin (100) - Extrablack (950)，共 11 个字重
    *   **字重映射**：
        *   100 (Thin) - 300 (Light): 辅助文字
        *   400 (Regular): 正文
        *   500 (Medium) - 600 (Semibold): 强调文字
        *   700 (Bold) - 800 (Extrabold): 标题
        *   900 (Black) - 950 (Extrablack): 超大标题
*   **字阶 (Scale)**：
    *   **H1 (页面标题)**: 20px / Bold (如：收银台、品牌名)
    *   **H2 (模块标题)**: 16px / Bold (如：当前订单、商品分类)
    *   **Body (正文)**: 14px / Regular (标准字号)
    *   **Caption (辅助)**: 12px / Regular (如：备注、库存标签)
    *   **Tiny (微标)**: 10px / Bold (如：垂直地址牌 "草场地")
*   **行高**：正文行高设定为字号的 **1.5倍**。
*   **字间距**：0.015em（防止笔画粘连）

### 2.2 色彩 (Color System)

使用 HCL 色彩空间逻辑，确保感官明度一致。

*   **品牌主色 (Brand)**：
    *   `Brand-Orange`: `#ff6633` (活力、电竞感、警告) - 用于主按钮、Logo背景、高亮状态。
    *   `Brand-Dark`: `#1a1a1a` (专业、沉稳) - 用于收银结算栏、顶栏文字。
*   **语义色 (Semantic)**：
    *   `Success`: `#22c55e` (绿色) - 验券通过、支付成功。
    *   `Error`: `#ef4444` (红色) - 库存不足、券码无效。
    *   `Warning`: `#f59e0b` (橙色) - 库存预警、网络断开。
*   **中性色 (Neutral)**：
    *   `Bg-Page`: `#f5f6f8` (浅灰背景，降低长期注视疲劳)。
    *   `Text-Main`: `rgba(0,0,0,0.88)`。
    *   `Text-Sub`: `rgba(0,0,0,0.45)`。

### 2.3 阴影 (Shadows) & 层级 (Elevation)

阴影不仅仅是装饰，更是只有 **层级 (Z-Index)** 的隐喻。

*   **Level S (常规可交互)**: `0 1px 2px rgba(0,0,0,0.05)` —— 适用于：商品卡片、输入框 (Default)。
*   **Level M (悬浮/下拉)**: `0 4px 6px rgba(0,0,0,0.1)` —— 适用于：商品卡片 (Hover)、下拉菜单。
*   **Level L (模态/抽屉)**: `0 10px 15px rgba(0,0,0,0.1)` —— 适用于：**美团验券抽屉**、交班弹窗。**它是页面上最高的层级。**

### 2.4 间距与栅格 (Spacing & Grid)

严个遵循 **8点网格系统 (8-Point Grid)**。所有 Margin, Padding, Width, Height 尽量为 8 的倍数。

*   **xs**: 4px (微调整)
*   **sm**: 8px (标准间距)
*   **md**: 16px (模块间距)
*   **lg**: 24px (大模块分隔)
*   **xl**: 32px (页面边距)

---

## 3. 核心交互规范 (Interaction Spec)

### 3.1 布局模式 (Layout)
*   **顶栏 (Topbar)**：承载 品牌Identity + 全局状态(时间/网络) + 身份切换。高度固定 **56px**。
*   **双栏收银 (Split View)**：
    *   **左侧 (Left)**：商品展示区。Grid 布局。
    *   **侧边 (Sidebar)**：一级导航。收缩为图标，悬浮显示 Tooltip。
    *   **右侧抽屉 (Right Drawer)**：**“非干扰式”设计**。验券时不遮挡左侧商品区，宽度固定 **400px**，从右侧滑入。

### 3.2 微交互 (Micro-interactions)
*   **点击反馈**：所有按钮在 `:active` 状态下必须 `scale(0.95)` 或 `translateY(1px)`，给用户“由于按压而下沉”的物理质感。
*   **悬停反馈**：可点击元素在 `:hover` 时应有 色彩变亮 或 阴影加深 (S -> M)。
*   **过渡动画**：抽屉滑出、页面切换使用 `cubic-bezier(0.4, 0, 0.2, 1)` 曲线，时长 **0.3s**。

---

## 4. 远程与容灾架构 (Remote & Architecture)

### 4.1 本地优先 (Local First / Offline Capable)
*   **断网收银**：系统核心依赖 **Local SQLite**。即使外网断开，收银台仍可正常读写本地库，保证业务不中断。
*   **数据同步**：网络恢复后，后端自动通过 Queue 将积压的 `Order` 推送至云端/备用服务器。

### 4.2 远程监督 (Remote Supervision)
*   **技术方案**：
    *   **公网IP直连**（如果有）：在 `vite.config` / `tauri.conf` 中配置 AllowList。
    *   **Open P2P (推荐)**：使用虚拟局域网技术（如 Zerotier / Tailscale / Frp），建立安全的 P2P 隧道。
*   **影子账号 (Shadow Account)**：
    *   远程登录时，根据密码不同，前端自动切换 `User Profile` 显示（如显示“路秋勉 (12%)”），并仅拉取该股东权限下的报表数据。

---

---

## 5. 极致美学 2.0 (Premium UI 2.0)

针对 Pro 版本进行的深度视觉重构，旨在提供“超越工具”的情绪价值。

### 5.1 物理弹性系统 (Spring Motion)
*   **核心曲线**：不再使用 `ease-in-out`，统一使用 `cubic-bezier(0.34, 1.56, 0.64, 1)` (Spring Out) 曲线。
*   **按压感**：所有交互元素（卡片、按钮）点击时强制执行 `scale(0.96)`，并在释放时伴随微弱的弹性回正。

### 5.2 深度玻璃拟态 (Liquid Glass)
*   **材质**：`backdrop-blur(24px)` + `rgba(255, 255, 255, 0.4)` 背景。
*   **边框微光**：玻璃边缘增加 `1px border: white/60` 与 `inset 0 0 0 1px: white/50`，模拟真实玻璃的侧缘反光。
*   **悬浮感**：核心容器（如 `LoginPanel`, `SnapshotModal`）通过 `shadow-[0_20px_50px_rgba(0,0,0,0.1)]` 与背景产生明显的空间分离。

### 5.3 无缝模式语义 (Seamless Mode Transitions)
*   **组件模式**：使用 Vue `<Transition>` 的 `mode="out-in"` 确保旧模式完全消失后再滑入新模式。
*   **视觉平滑**：模式切换时，通过 `indicator` 元素在背景上的平滑位移，为用户提供清晰的视觉重心引导。

---

> 此文档即为 `smarticafe-pro` 的视觉与交互验收标准。
