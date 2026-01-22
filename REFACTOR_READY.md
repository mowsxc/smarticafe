# 🎯 重构准备完成

## ✅ 已完成的准备工作

### 1. **代码备份**
- ✅ 已提交所有更改到Git
- ✅ 创建标签: `v2.0.0-port-update-20260117-210324`
- ✅ 当前代码已安全保存

### 2. **分支创建**
- ✅ 创建重构分支: `refactor/api-and-naming`
- ✅ 已切换到重构分支
- ✅ 基于最新的master分支

### 3. **文档准备**
- ✅ 代码审查报告: `CODE_REVIEW_REPORT.md`
- ✅ 重构计划: `REFACTOR_PLAN.md`
- ✅ 重构助手脚本: `refactor-helper.ps1`

---

## 📂 当前项目状态

```
分支: refactor/api-and-naming
标签: v2.0.0-port-update-20260117-210324
状态: 准备就绪，可以开始重构
```

---

## 🚀 开始重构

### 方式一：使用重构助手脚本（推荐）

```powershell
# 运行交互式助手
.\refactor-helper.ps1
```

助手提供以下功能：
1. 查看重构计划
2. 查看代码审查报告
3. 创建类型定义文件
4. 生成API模板
5. 运行测试
6. 查看Git状态
7. 提交当前进度

### 方式二：手动执行

#### Step 1: 创建类型定义
```powershell
# 查看重构计划
code REFACTOR_PLAN.md

# 创建类型定义文件
# 参考 REFACTOR_PLAN.md 中的 Step 1
```

#### Step 2: 实现后端API
```powershell
# 编辑后端代码
code src-tauri/src/http_server.rs

# 参考 CODE_REVIEW_REPORT.md 中的示例代码
```

#### Step 3: 更新前端API调用
```powershell
# 创建新的API文件
code src/api/meituan.ts
code src/api/shift.ts
code src/api/finance.ts
```

---

## 📋 重构检查清单

### 阶段一：API完善
- [ ] 添加类型定义文件 (`src/api/types.ts`)
- [ ] 实现美团订单API
- [ ] 实现交班计算API
- [ ] 实现财务记账API
- [ ] 测试所有API端点

### 阶段二：命名规范化
- [ ] 重命名 `wangfei` → `internetFee`
- [ ] 重命名 `shouhuo` → `salesRevenue`
- [ ] 重命名 `meituan` → `meituanRevenue`
- [ ] 重命名 `zhichu` → `expenditure`
- [ ] 重命名 `yingjiao` → `amountDue`
- [ ] 移除所有 `any` 类型

### 阶段三：导航栏重构
- [ ] 分离内部路由和外部链接
- [ ] 更新 `MainLayout.vue`
- [ ] 添加外部工具区域

### 阶段四：代码优化
- [ ] 拆分 `CashierView.vue`
- [ ] 创建独立的模块组件
- [ ] 添加单元测试

---

## 🔄 Git工作流

### 提交规范
使用约定式提交（Conventional Commits）：

```bash
# 功能添加
git commit -m "feat: 添加美团订单API"

# Bug修复
git commit -m "fix: 修复交班计算错误"

# 重构
git commit -m "refactor: 重命名ShiftState变量为英文"

# 文档
git commit -m "docs: 更新API文档"

# 测试
git commit -m "test: 添加美团API单元测试"
```

### 常用命令
```bash
# 查看状态
git status

# 查看差异
git diff

# 暂存所有更改
git add -A

# 提交
git commit -m "your message"

# 查看日志
git log --oneline -10

# 回到master分支（如需要）
git checkout master

# 回到重构分支
git checkout refactor/api-and-naming
```

---

## 📚 相关文档

| 文档 | 说明 |
|------|------|
| [CODE_REVIEW_REPORT.md](./CODE_REVIEW_REPORT.md) | 详细的代码审查报告，列出所有问题 |
| [REFACTOR_PLAN.md](./REFACTOR_PLAN.md) | 完整的重构计划和实施步骤 |
| [KNOWLEDGE_BASE.md](./KNOWLEDGE_BASE.md) | 项目知识库 |
| [CHANGELOG.md](./CHANGELOG.md) | 变更日志 |

---

## ⚠️ 注意事项

1. **保持开发服务器运行**
   - 前端: `npm run dev` (端口 32520)
   - 后端: `npm run tauri dev` (端口 32521)

2. **数据兼容性**
   - 重命名变量时需要添加数据迁移逻辑
   - 保持向后兼容，避免破坏已保存的草稿数据

3. **测试覆盖**
   - 每完成一个阶段，进行完整的功能测试
   - 确保浏览器版和桌面版都能正常工作

4. **提交频率**
   - 建议每完成一个小功能就提交一次
   - 便于回滚和追踪问题

---

## 🆘 遇到问题？

### 常见问题

**Q: 如何回到原来的状态？**
```bash
git checkout master
```

**Q: 如何查看重构前的代码？**
```bash
git show v2.0.0-port-update-20260117-210324:path/to/file
```

**Q: 如何放弃当前更改？**
```bash
git reset --hard HEAD
```

**Q: 如何合并重构分支到master？**
```bash
# 先切换到master
git checkout master

# 合并重构分支
git merge refactor/api-and-naming

# 如果有冲突，解决后提交
git add -A
git commit -m "merge: 合并重构分支"
```

---

## 🎉 准备就绪！

现在你可以开始重构了！建议按照以下顺序进行：

1. 📖 阅读 `REFACTOR_PLAN.md` 了解完整计划
2. 🔧 运行 `.\refactor-helper.ps1` 使用助手工具
3. 💻 开始编码
4. ✅ 定期测试和提交

祝重构顺利！🚀

---

**创建时间**: 2026-01-17 21:03  
**当前分支**: refactor/api-and-naming  
**备份标签**: v2.0.0-port-update-20260117-210324
