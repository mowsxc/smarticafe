# Smarticafe UI 设计规范 v2.0

> 本文档记录 Smarticafe 系统各页面的设计标准和视觉风格指南

## 设计理念

采用 **Premium Fintech** 风格 - 高级金融科技感的现代设计

### 核心原则

1. **精致感** - 多层阴影、光影效果营造深度
2. **呼吸感** - 充足的留白和8px网格间距
3. **响应感** - 微动画反馈每一次交互
4. **一致性** - 统一的设计语言贯穿全站

---

## 设计令牌 (Design Tokens)

### 颜色系统

```css
/* 品牌色 */
--brand-orange: #FF6633;      /* 主色调 */
--brand-orange-light: #FF8855; /* 亮色 */
--brand-orange-deep: #E85A2C;  /* 深色 */
--brand-orange-glow: rgba(255, 102, 51, 0.35); /* 发光 */

/* 功能色 */
--color-success: #10B981;     /* 成功/在线 */
--color-warning: #F59E0B;     /* 警告 */
--color-error: #EF4444;       /* 错误/危险 */
--color-info: #3B82F6;        /* 信息/云端 */

/* 中性色 */
--gray-50 ~ --gray-950;       /* 完整灰阶 */
```

### 间距系统 (8px Grid)

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
```

### 圆角系统

```css
--radius-sm: 6px;    /* 小按钮、标签 */
--radius-md: 8px;    /* 输入框 */
--radius-lg: 12px;   /* 按钮 */
--radius-xl: 16px;   /* 卡片 */
--radius-2xl: 20px;  /* 面板 */
--radius-3xl: 24px;  /* 主容器 */
--radius-full: 9999px; /* 圆形/胶囊 */
```

### 阴影系统 (多层递进)

```css
/* 基础阴影 */
--shadow-xs: 0 1px 2px rgba(0,0,0,0.03);
--shadow-sm: 0 1px 2px + 0 2px 4px;
--shadow-md: 0 2px 4px + 0 4px 8px + 0 8px 16px;
--shadow-lg: 0 4px 8px + 0 8px 16px + 0 16px 32px;
--shadow-xl: 0 8px 16px + 0 16px 32px + 0 32px 64px;

/* 发光阴影 */
--glow-orange: 0 0 24px rgba(255,102,51,0.35);
--glow-success: 0 0 24px rgba(16,185,129,0.35);
```

### 动画缓动

```css
--ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);   /* 标准 */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* 弹性 */
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);   /* 减速 */
```

---

## 页面设计规范

### 1. 启动画面 (Splash Screen)

**文件**: `public/splash.html`

#### 视觉元素
- **Logo**: 88x88px 圆角矩形(24px), 135°渐变(#FF8855 → #E85A2C)
- **光环**: 双层脉冲动画, 2.5s周期
- **标题**: 28px/800 weight, 暗色渐变文字
- **副标题**: 11px/700 weight, 大写字母, 3px字间距

#### 交互效果
- 页面进入: 1.2s透明度+位移动画
- Logo: 浮动动画 4s周期
- 进度条: 发光滑块跟随
- 环境光: 3个光斑漂移动画(8s周期)

#### 移动端适配
- 光斑尺寸缩小至300px
- Logo缩小至72px

---

### 2. 安装引导页 (Setup View)

**文件**: `src/views/SetupView.vue`

#### 布局结构
- **容器**: max-width 540px, 居中对齐
- **步进器**: 3步水平布局, 进度轨道连接
- **卡片**: 32px圆角, 48px内边距

#### 步进器设计
- **圆点**: 40px直径, 实心圆
- **光圈**: 48px直径, 与圆点同心, 脉冲动画
- **进度轨道**: 3px高度, 橙色渐变填充
- **标签**: 11px大写字母

#### 表单设计
- **Section标签**: SVG线条图标 + 光效 + 大写文字
- **图标**: 20px, 线条风格(stroke-width: 1.8)
- **图标光效**: focus时显示发光动画
- **输入框**: 48px高度, 12px圆角, 聚焦时橙色边框+光晕

#### 按钮设计
- **主按钮**: 56px高度, 16px圆角, 渐变背景, 悬停上浮
- **次按钮**: 56px高度, 灰色背景, 悬停加深

#### 移动端适配 (< 768px)
- 表单双列 → 单列布局
- 按钮组垂直排列
- 步进器标签字号减小
- 卡片内边距减小至28px
- 光效动画简化(性能优化)

---

### 3. 登录面板 (Login Panel)

**文件**: `src/components/LoginPanel.vue`

#### 布局结构
- **覆盖层**: 深色半透明 + 12px模糊
- **卡片**: max-width 460px, 32px圆角

#### 品牌区
- **Logo**: 80px, 动态首字母, 脉冲光环
- **标题**: 26px/800 weight
- **副标题**: 10px大写, 橙色

#### 员工快速登录
- **网格**: 自适应填充, min 80px
- **按钮**: 16px圆角, 悬停上浮+发光

#### 股东登录
- **双列布局**: 2个选择卡片
- **选中状态**: 深色背景反转, 橙色勾选图标
- **密码框**: 圆形提交按钮, 聚焦发光

#### 会话状态
- **底栏**: 绿色渐变背景
- **状态点**: 8px圆点, 发光脉冲

---

### 4. 收银台 (Cashier View)

**文件**: `src/views/CashierView.vue`

#### 布局结构
- **双列网格**: 左侧盘点表, 右侧记账/交班
- **面板**: 24px圆角, 玻璃态效果

#### 表格设计
- **表头**: 44px高度, 11px大写字母, 置顶吸附
- **行**: 48px高度, 悬停高亮+左侧橙色指示条
- **输入框**: 透明背景, 聚焦时白色背景

#### 统计栏
- **毛玻璃效果**: 95%透明度 + 12px模糊
- **数值**: 13px粗体, 不同颜色区分类型

#### 按钮
- **导入按钮**: 橙色渐变, 发光阴影
- **模式切换**: 胶囊切换器, 选中项白色背景

---

## 动画规范

### 过渡类型

| 类型 | 时长 | 缓动 | 用途 |
|------|------|------|------|
| 快速 | 150ms | ease-out | hover, focus |
| 标准 | 250ms | smooth | 状态切换 |
| 慢速 | 400ms | spring | 页面切换 |
| 弹性 | 500ms | spring | 成功反馈 |

### 常用动画

```css
/* 浮动 */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

/* 脉冲光环 */
@keyframes ring-pulse {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.2); opacity: 0.15; }
}

/* 发光呼吸 */
@keyframes glow-pulse {
  0%, 100% { opacity: 0.3; transform: scale(0.9); }
  50% { opacity: 0.5; transform: scale(1.1); }
}
```

---

## 响应式断点

| 断点 | 宽度 | 主要调整 |
|------|------|----------|
| Desktop Large | > 1440px | 增大间距 |
| Desktop | > 1024px | 默认设计 |
| Tablet | 768-1024px | 缩小元素 |
| Mobile Large | 480-768px | 单列布局 |
| Mobile Small | < 480px | 紧凑模式 |

---

## 无障碍规范

- **Focus可见**: 2px橙色轮廓, 2px偏移
- **减少动画**: 尊重 prefers-reduced-motion
- **高对比度**: 支持 prefers-contrast: high
- **触摸目标**: 最小44x44px (移动端)

---

## 更新日志

### v2.0.0 (2026-01-23)
- 建立完整设计系统
- 重构启动画面、安装引导、登录面板
- 添加移动端响应式适配
- 添加图标光效交互
- 修复步进器光圈居中问题
