# 收银区四大模块完善计划

## 当前状态分析

### ✅ 已完成模块
1. **美团订单模块（MeituanModule）**
   - ✅ 解析功能（剪贴板读取）
   - ✅ 13列表格展示
   - ✅ 去重逻辑与持久化
   - ✅ 套餐配置逻辑 (Logic Engine 2.0)
2. **视觉系统 2.0 (UI/UX Premium)**
   - ✅ Spring 弹性曲线系统与高级玻璃拟态
   - ✅ 无缝模式切换布局 (Seamless Mode)
   - ✅ 全系统物理交互反馈 (Scale 0.96)

### 🏃 进行中 (In Progress)

#### 1. 售货清单模块（SalesModule）
**当前问题**：
- ❌ 缺少产品选择下拉联想
- ❌ 缺少自动计算逻辑（小计、计费价、财务价、利润）
- ❌ 缺少汇总统计（计费价合计、财务价合计、利润合计）
- ❌ 缺少对外事件触发（salesListUpdated）
- ❌ 缺少数据持久化

**需要实现**：
1. 产品下拉联想（datalist）
2. 单价、数量输入后自动计算
3. 计费价 = 单价 × 数量
4. 财务价计算逻辑
5. 利润计算逻辑
6. 底部汇总行
7. 事件触发给交班模块

#### 2. 交班助手模块（ShiftModule）
**当前问题**：
- ❌ 缺少监听器（salesListUpdated、meituanOrdersUpdated）
- ❌ "售货"字段未自动同步
- ❌ "美团"字段未自动同步
- ❌ "支出"字段未自动同步
- ❌ "应缴"计算逻辑不完整
- ❌ 缺少数据持久化

**需要实现**：
1. 监听美团模块更新 → 自动更新"美团"字段
2. 监听售货模块更新 → 自动更新"售货"字段
3. 监听财务模块更新 → 自动更新"支出"字段
4. 应缴 = 网费 + 售货 + 美团 - 支出
5. 数据保存到localStorage

#### 3. 财务记账模块（AccountingModule）
**当前问题**：
- ❌ 缺少自动计算（吧台支付合计、财务支付合计）
- ❌ 缺少对外事件触发（accountingUpdated）
- ❌ 入账表逻辑不完整
- ❌ 缺少数据持久化

**需要实现**：
1. 支出表自动计算合计
2. 入账表自动计算合计
3. 吧台支付合计 → 触发事件给交班模块
4. 数据保存到localStorage

## 实现优先级

### Phase 1: 修复字体加载（优先）
1. 重启开发服务器
2. 验证字体加载状态

### Phase 2: 完善售货清单模块
1. 添加产品联想输入（datalist）
2. 实现自动计算逻辑
3. 添加汇总统计
4. 实现事件触发
5. 添加数据持久化

### Phase 3: 完善财务记账模块
1. 实现支出/入账自动计算
2. 添加事件触发
3. 数据持久化

### Phase 4: 完善交班助手模块
1. 添加事件监听器
2. 实现字段自动同步
3. 完善应缴计算
4. 数据持久化

### Phase 5: 模块联动测试
1. 测试售货清单 → 交班助手
2. 测试美团订单 → 交班助手
3. 测试财务记账 → 交班助手
4. 完整流程测试

## 技术要点

### 事件系统
```typescript
// 售货清单触发
window.dispatchEvent(new CustomEvent('salesListUpdated', {
  detail: {
    stats: {
      totalBilling: 1234.56  // 计费价合计
    }
  }
}))

// 美团订单触发（已实现）
window.dispatchEvent(new CustomEvent('meituanOrdersUpdated', {
  detail: {
    stats: {
      totalBar: 567.89  // 计费价合计
    }
  }
}))

// 财务记账触发
window.dispatchEvent(new CustomEvent('accountingUpdated', {
  detail: {
    stats: {
      barPayTotal: 123.45  // 吧台支付合计
    }
  }
}))
```

### 数据持久化
```typescript
// 售货清单
localStorage.setItem('sales-list-data', JSON.stringify(salesData))

// 交班助手
localStorage.setItem('shift-assistant-data', JSON.stringify(shiftData))

// 财务记账
localStorage.setItem('finance-accounting-data', JSON.stringify(accountingData))
```

### 计算公式
```typescript
// 售货清单
计费价 = 单价 × 数量
财务价 = 计费价 × (1 - 税率)  // 或按具体业务逻辑
利润 = 财务价 - 成本价

// 交班助手
应缴 = 网费 + 售货 + 美团 - 支出
```

## 🎨 视觉系统维护规范 (Visual System Maintenance)

### 核心原则
1. **Glassmorphism Consistency**: 所有新弹窗必须继承 `.glass-card` 或 `.glass-panel`，背景模糊度固定为 `blur(24px)`。
2. **Motion Fidelity**: 过渡动画强制使用 `style.css` 预定义的 Transition 类 (`fade`, `scale`, `slide-up`)，严禁混合使用 ad-hoc CSS 动画。
3. **Data Typography**: 收银台内的所有数字（库存、金额、时间）必须强制包裹在 `font-mono` 类中，以确保 DINpro 字体生效。

---

> 此方案将随开发进度持续更新。
