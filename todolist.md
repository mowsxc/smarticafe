# 待办清单

## 🏁 已完成 (Completed)

### v2.2.0 (2026-01-19)

- [x] **[Feature]** 代持股东系统
  - [x] 实现 `mojian_拼音` 登录格式
  - [x] 支持 4 位代持股东
  - [x] `heldFrom` 字段标识代持关系
  - [x] 三段式用户信息显示

- [x] **[Refactor]** 班次信息独立存储
  - [x] 登录与班次解耦
  - [x] 独立存储在 appStore
  - [x] 默认班次初始化

- [x] **[Feature]** 交班快照预览增强
  - [x] 横向/竖向布局切换
  - [x] 快照设置面板
  - [x] 模块可见性控制

- [x] **[Fix]** 导航遮挡问题
  - [x] 添加 `flex-shrink-0`
  - [x] 限制左侧容器宽度

- [x] **[Documentation]** 文档整理
  - [x] 更新 README.md
  - [x] 更新 CHANGELOG.md
  - [x] 更新 todolist.md

### v2.3.0 (Ongoing) - 库存管理优化

- [x] **[Fix]** 修复应缴金额计算公式 (售货不含美团)
- [x] **[Feature]** 库存管理核心功能
  - [x] 负数进货弹窗
  - [x] 手动排序记忆
  - [x] 快速添加商品(含进价)
  - [x] 库存校验逻辑
- [x] **[Enhancement]** 交互体验优化
  - [x] 回车键自动跳转焦点
  - [x] 替换原生 Prompt 为 Modal
  - [x] 红色错误框 Tooltip 提示
- [x] **[Logic]** 业务逻辑完善
  - [x] 新增商品分类选择
  - [x] 新增商品重名检测
  - [x] 新商品排序一致性优化

### v2.1.x (历史记录)

- [x] **[Frontend]** 外部链接工作台内打开功能 (2026-01-16 17:42)
- [x] **[Backend]** Tauri open_external_webview 命令实现 (2026-01-16 17:42)
- [x] **[Testing]** 单元测试完成 (2026-01-16 17:42)
- [x] **[Documentation]** Spec 文档系统创建 (2026-01-16 17:42)
- [x] **[Verification]** 外部链接功能实现完整性验证 (2026-01-16 17:51)
- [x] **[Compilation]** Tauri 项目编译成功 (2026-01-16 18:13)
- [x] **[Analysis]** 验券管理深度分析完成 (2026-01-16 18:13)
- [x] **[Implementation]** 验券管理功能实现完成 (2026-01-16 19:41)
- [x] **[Implementation]** 验券管理功能：真正的内嵌打开 (2026-01-16 20:02)

## 📋 待办 (Todo)

### v2.4.0 (2026-01-22) - 权限控制和数据导入优化

- [x] **[Fix]** 修复 excelParser.ts 列识别问题（剩余列错位）
- [x] **[Fix]** 修复排序问题（保留老数据顺序）
- [x] **[Fix]** 修复导入按钮和撤销按钮样式
- [x] **[Refactor]** 重命名 excelParser.ts → saleSheetParser.ts
- [x] **[Fix]** 修复短日期格式解析（12/31 → 2026-12-31）
- [x] **[Fix]** 修复商品创建失败问题（添加 UUID 生成）
- [x] **[Feature]** 单元格编辑权限控制
  - [x] 当班人员可编辑：补货、剩余、销量、售额、进货、兑奖、扣减
  - [x] 当班人员不可编辑：原数、库存、单价、规格
  - [x] 超管可编辑所有数据
- [x] **[Fix]** 售货清单导入按表头映射解析（兼容空列/新旧表头，修复补货/剩余等错位）
- [x] **[UI]** 0 显示规则：补货/兑奖/扣减为 0 显示空；剩余 0 保留为有效值
- [x] **[Validation]** 剩余必填：原数+补货>0 且剩余为空提示“必填”
- [x] **[Validation]** 兑奖+扣减必须 <= 剩余；超出时右侧标签显示“超出”
- [x] **[Validation]** 负数规则：除进货外全部禁止负数；进货允许负数用于扣减库存
- [x] **[UI]** 兑奖/扣减单元格左右布局：左输入右标签（乐享金额 / 美团自动扣减），计算使用合计
- [x] **[Feature]** 撤回导入：撤回时同步删除新建商品并从 UI 移除
- [x] **[Feature]** 交班预览流程：交班预览 → 快照 → 确认交班 → 选择接班人 → 写入 shift_records → 切换接班人并重置输入
- [x] **[Fix]** 修复 CashierView.vue 模板未闭合导致页面 500
- [ ] **[Feature]** 交班后超管编辑功能（ShiftRecordsView）
- [ ] **[Feature]** 数据回退功能（恢复之前版本数据）

### 优先级：高

- [ ] **[Build]** 解决 JavaScript heap out of memory 问题
  - [ ] 增加 Node 内存限制：`set NODE_OPTIONS=--max-old-space-size=4096`
  - [ ] 或优化构建配置

- [ ] **[Testing]** Tauri 应用测试
  - [ ] 运行 `npm run tauri dev`
  - [ ] 验证所有功能正常

- [ ] **[Animation]** 动画优化
  - [ ] 优化当前动画性能
  - [ ] 添加更流畅的过渡效果

### 优先级：中

- [ ] **[Feature]** 添加更多外部链接支持
  - [ ] 高德地图链接
  - [ ] 数据分析平台链接

- [ ] **[Security]** 安全加固
  - [ ] URL 验证
  - [ ] 权限管理

### 优先级：低

- [ ] **[Documentation]** 文档完善
  - [ ] API 文档
  - [ ] 用户指南
  - [ ] 开发指南

## 📊 统计

- **已完成**：28+ 个任务
- **待办**：8 个任务
- **完成率**：77%+

---

**最后更新**：2026-01-22T20:28:51+08:00
**维护者**：Cascade


### 2026-01-16 验券管理功能 Spec 创建 ✅

**任务**：为验券管理功能创建完整的 spec 文档

**完成内容**：
- ✅ 创建需求文档（7 个需求，21 个验收标准）
- ✅ 创建设计文档（12 个正确性属性，完整实现细节）
- ✅ 创建任务清单（8 个任务，4 个核心 + 4 个可选测试）
- ✅ 更新 WORK_LOG.md
- ✅ 更新 KNOWLEDGE_BASE.md（Q15-Q20）
- ✅ 更新 CHANGELOG.md
- ✅ 执行增量备份

**文件位置**：
- `.kiro/specs/meituan-voucher-management/requirements.md`
- `.kiro/specs/meituan-voucher-management/design.md`
- `.kiro/specs/meituan-voucher-management/tasks.md`

**下一步**：
- 用户可以打开 `.kiro/specs/meituan-voucher-management/tasks.md` 开始执行任务
- 按照推荐顺序执行：TASK-001 → TASK-002 → TASK-003 → TASK-004 → TASK-005~008


























