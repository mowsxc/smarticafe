# Smarticafe UI 设计规范 v2.1

> 本文档记录 Smarticafe 系统各页面的设计标准、视觉风格及交互规范
> 更新日期：2026-01-24

---

## 🎨 设计理念

### Premium Fintech 风格
采用高级金融科技感的现代设计，强调：
- **精致感** - 多层阴影、光影效果营造空间深度
- **呼吸感** - 充足留白、8px网格规范
- **响应感** - 微动画反馈每一次交互
- **一致性** - 统一设计语言贯穿全站

---

## 📐 设计令牌 (Design Tokens)

### 颜色系统

#### 品牌色
| Token | 值 | 用途 |
|-------|-----|------|
| `--brand-orange` | `#FF6633` | 主色调 |
| `--brand-orange-light` | `#FF8855` | 亮色/渐变起点 |
| `--brand-orange-deep` | `#E85A2C` | 深色/渐变终点 |
| `--brand-orange-glow` | `rgba(255,102,51,0.25)` | 发光效果 |

#### 语义色
| Token | 值 | 用途 |
|-------|-----|------|
| `--color-success` | `#10B981` | 成功/在线/正数 |
| `--color-warning` | `#F59E0B` | 警告/提醒 |
| `--color-error` | `#EF4444` | 错误/危险/负数 |
| `--color-info` | `#3B82F6` | 信息/云端 |

#### 中性色
| Token | 值 | 用途 |
|-------|-----|------|
| `--gray-50` | `#F9FAFB` | 背景浅色 |
| `--gray-100` | `#F3F4F6` | 输入框背景 |
| `--gray-400` | `#9CA3AF` | 占位符/次要文字 |
| `--gray-700` | `#374151` | 正文 |
| `--gray-900` | `#111827` | 标题/强调文字 |

### 间距系统 (8px Grid)

```css
--space-1: 4px;   /* 微间距 */
--space-2: 8px;   /* 基础单元 */
--space-3: 12px;  /* 小间距 */
--space-4: 16px;  /* 标准间距 */
--space-6: 24px;  /* 中等间距 */
--space-8: 32px;  /* 大间距 */
--space-12: 48px; /* 超大间距 */
```

### 字体系统

#### 字体家族
- **主字体**: `'Zoho Puvi', 'PingFang SC', 'Microsoft YaHei', system-ui`
- **等宽字体**: `'SF Mono', 'Monaco', 'Consolas', monospace`

#### 字号层级
| Token | 大小 | 用途 |
|-------|------|------|
| `--text-xs` | 10px | 辅助标签、徽章 |
| `--text-sm` | 11px | 次要文字、表头 |
| `--text-base` | 13px | 正文基础 |
| `--text-md` | 14px | 表单输入 |
| `--text-lg` | 16px | 面板标题 |
| `--text-xl` | 20px | 摘要数值 |
| `--text-2xl` | 24px | 页面标题 |

### 圆角系统

| Token | 值 | 用途 |
|-------|-----|------|
| `--radius-sm` | 6px | 小标签 |
| `--radius-md` | 8px | 输入框 |
| `--radius-lg` | 12px | 按钮 |
| `--radius-xl` | 16px | 卡片 |
| `--radius-2xl` | 20px | 面板 |
| `--radius-3xl` | 24px | 主容器 |
| `--radius-full` | 9999px | 胶囊/圆形 |

### 阴影系统

```css
/* 基础阴影 - 多层叠加 */
--shadow-sm: 
  0 1px 2px rgba(0,0,0,0.04),
  0 2px 4px rgba(0,0,0,0.02);

--shadow-md: 
  0 2px 8px rgba(0,0,0,0.04),
  0 4px 16px rgba(0,0,0,0.04);

--shadow-lg: 
  0 4px 16px rgba(0,0,0,0.05),
  0 8px 32px rgba(0,0,0,0.05);

/* 面板阴影 - 带边框 */
--shadow-panel: 
  0 0 0 1px rgba(0,0,0,0.04),
  0 4px 24px rgba(0,0,0,0.04);

/* 发光阴影 */
--shadow-glow: 0 4px 20px rgba(255,102,51,0.25);
```

### 动画缓动

| Token | 值 | 用途 |
|-------|-----|------|
| `--ease-smooth` | `cubic-bezier(0.4, 0, 0.2, 1)` | 标准过渡 |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | 弹性动画 |
| `--ease-out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | 快速减速 |

| 时长 | 值 | 用途 |
|------|-----|------|
| Fast | 150ms | hover、focus |
| Normal | 250ms | 状态切换 |
| Slow | 400ms | 页面过渡 |

---

## 📄 页面设计规范

### 1. 启动画面 (Splash Screen)

**文件**: `public/splash.html`

#### 布局
- 全屏居中布局
- 背景：纯白 + 3个环境光斑

#### 视觉元素
| 元素 | 规格 |
|------|------|
| Logo | 88×88px, 圆角24px, 135°渐变 |
| 光环 | 双层脉冲, 2.5s周期 |
| 标题 | 28px/800, 暗色渐变 |
| 副标题 | 11px/700, 大写, 3px字间距 |
| 进度条 | 200×4px, 发光效果 |

#### 动画
- 页面进入：1.2s透明度+位移
- Logo浮动：4s周期
- 光斑漂移：8s周期
- 进度发光：跟随进度

---

### 2. 安装向导 (Setup View)

**文件**: `src/views/SetupView.vue`

#### 布局
- 容器：max-width 540px, 居中
- 步进器：7步水平布局
- 卡片：32px圆角, 48px内边距

#### 步进器设计
| 元素 | 规格 |
|------|------|
| 圆点 | 40px直径, 实心圆 |
| 光圈 | 48px直径, **中心对齐**, 脉冲动画 |
| 轨道 | 3px高度, 橙色渐变填充 |
| 标签 | 11px大写字母 |

#### 表单设计
| 元素 | 规格 |
|------|------|
| Section标签 | SVG线条图标(20px) + 光效 + 大写文字 |
| 图标光效 | focus时显示发光, 脉冲2s |
| 输入框 | 48px高度, 12px圆角, 聚焦橙色边框+光晕 |

#### 按钮
| 类型 | 规格 |
|------|------|
| 主按钮 | 56px高度, 16px圆角, 渐变背景, 悬停上浮2px |
| 次按钮 | 56px高度, 灰色背景, 悬停加深 |

#### 移动端适配
| 断点 | 调整 |
|------|------|
| < 768px | 单列表单, 按钮垂直排列 |
| < 480px | 紧凑模式, 字号减小 |

---

### 3. 登录面板 (Login Panel)

**文件**: `src/components/LoginPanel.vue`

#### 布局
- 覆盖层：深色半透明 + 12px模糊
- 卡片：max-width 460px, 32px圆角

#### 品牌区
| 元素 | 规格 |
|------|------|
| Logo | 80px, 动态首字母, 脉冲光环 |
| 标题 | 26px/800 |
| 副标题 | 10px大写, 橙色 |

#### 员工快速登录
- 网格：自适应填充, min 80px
- 按钮：16px圆角, 悬停上浮3px + 发光

#### 股东登录
- 双列布局：2个选择卡片
- 选中状态：深色背景反转, 橙色勾选图标
- 密码框：圆形提交按钮, 聚焦发光

#### 会话状态
- 底栏：绿色渐变背景
- 状态点：8px圆点, 发光脉冲

---

### 4. 收银台 (Cashier View)

**文件**: `src/views/CashierView.vue`  
**样式**: `src/styles/cashier-enhanced.css`

#### 布局结构
| 区域 | 规格 |
|------|------|
| 容器间距 | 16px (移动端12px) |
| 面板圆角 | 24px (移动端20px) |
| 面板内边距 | 20px (移动端16px) |

#### 面板系统
```css
.cv-panel {
  background: white;
  border-radius: 24px;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.04), 0 4px 24px rgba(0,0,0,0.04);
}

/* 右上角装饰光斑 */
.cv-panel::before {
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, var(--brand-glow) 0%, transparent 70%);
  filter: blur(40px);
  opacity: 0.3;
}
```

#### 班次徽章
| 元素 | 规格 |
|------|------|
| 容器 | 16px圆角, 玻璃态背景 |
| 日期 | 等宽字体, 灰色 |
| 班次 | 橙色, 800字重 |
| 状态点 | 8px, 脉冲动画 |

#### 统计栏
| 元素 | 规格 |
|------|------|
| 容器 | 6px内边距, 16px圆角 |
| 项目 | 8px×12px内边距, hover背景加深 |
| 标签 | 11px, 灰色, hover变橙色 |
| 数值 | 13px/800, 颜色按类型 |

#### 表格设计
| 元素 | 规格 |
|------|------|
| 表头高度 | 44px |
| 表头样式 | 11px大写, 渐变背景, 置顶吸附 |
| 行高度 | 52px |
| 行悬停 | 左侧3px橙色指示条 + 淡橙背景 |
| 输入框 | 36px高度, 居中, focus发光 |

#### 按钮系统
| 类型 | 规格 |
|------|------|
| 主按钮 | 40px高度, 12px圆角, 渐变+发光阴影 |
| 次按钮 | 40px高度, 白色背景, 边框 |
| 小按钮 | 32px高度, 10px圆角 |

#### 模式切换
- 容器：4px内边距, 14px圆角, 灰色背景
- 选项：32px高度, 10px圆角
- 激活：白色背景, 橙色文字, 阴影

---

## 🎬 动画规范

### 关键帧

```css
/* 浮动 */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

/* 脉冲光环 */
@keyframes ring-pulse {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.2); opacity: 0.15; }
}

/* 发光呼吸 */
@keyframes glow-pulse {
  0%, 100% { opacity: 0.3; transform: scale(0.95); }
  50% { opacity: 0.5; transform: scale(1.05); }
}

/* 状态点脉冲 */
@keyframes status-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(0.9); opacity: 0.7; }
}
```

### 过渡规范

| 类型 | 时长 | 缓动 | 属性 |
|------|------|------|------|
| Hover | 150ms | ease-out | all |
| Focus | 150ms | ease-out | border, shadow |
| 状态切换 | 250ms | smooth | all |
| 页面过渡 | 400ms | spring | opacity, transform |
| 弹性反馈 | 500ms | spring | transform |

---

## 📱 响应式断点

| 断点 | 宽度 | 主要调整 |
|------|------|----------|
| Desktop XL | > 1440px | 增大间距和字号 |
| Desktop | > 1024px | 默认设计 |
| Tablet | 768-1024px | 缩小元素, 调整间距 |
| Mobile L | 480-768px | 单列布局, 垂直按钮 |
| Mobile S | < 480px | 紧凑模式, 最小字号 |

---

## ♿ 无障碍规范

### Focus 可见性
```css
:focus-visible {
  outline: 2px solid var(--brand-orange);
  outline-offset: 2px;
}
```

### 减少动画
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 触摸目标
- 最小尺寸：44×44px (移动端)
- 按钮间距：至少8px

---

## 📝 更新日志

### v2.1 (2026-01-24)
- 新增收银台完整设计系统 (`cashier-enhanced.css`)
- 统一字体字号规范
- 完善表格/按钮/表单控件样式
- 添加班次徽章、统计栏组件规范
- 增强响应式适配

### v2.0 (2026-01-23)
- 建立完整设计系统
- 重构启动画面、安装引导、登录面板
- 修复步进器光圈居中问题
- 添加SVG线条图标光效交互
