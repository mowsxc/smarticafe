# 📚 文档导航中心

欢迎来到 Smarticafe Pro 文档中心！这里是您了解项目的完整指南。

---

## 🚀 快速开始

### 新人必读（按顺序）
1. [README.md](../README.md) - 项目概览与技术栈
2. [KNOWLEDGE_BASE.md](../KNOWLEDGE_BASE.md) - 核心知识库（含验券/消费数据内嵌方案）
3. [UI_DESIGN_SPEC.md](./UI_DESIGN_SPEC.md) - UI/UX 设计规范
4. [MODULES_PLAN.md](./MODULES_PLAN.md) - 四大模块完善计划
5. [BACKUP_STATUS.md](./BACKUP_STATUS.md) - 当前系统状态

### 开发者必读
1. [WORK_LOG.md](./collaborations/WORK_LOG.md) - 详细工作日志
2. [BACKUP_ROLLBACK.md](./BACKUP_ROLLBACK.md) - 备份与回滚指南
3. [MEITUAN_FIX_GUIDE.md](../MEITUAN_FIX_GUIDE.md) - 美团模块实现细节

---

## 📂 文档分类

### 📖 核心文档
| 文档 | 用途 | 更新频率 |
|------|------|----------|
| [README.md](../README.md) | 项目概览、技术栈、账号说明 | 重大功能更新时 |
| [KNOWLEDGE_BASE.md](../KNOWLEDGE_BASE.md) | 项目核心知识库（含外链内嵌/权限/踩坑） | 规则或关键实现变更时 |
| [UI_DESIGN_SPEC.md](./UI_DESIGN_SPEC.md) | UI设计规范、颜色、字体 | 设计变更时 |
| [MODULES_PLAN.md](./MODULES_PLAN.md) | 四大模块完善计划 | 模块开发期间 |

### 🔧 开发文档
| 文档 | 用途 | 更新频率 |
|------|------|----------|
| [WORK_LOG.md](./collaborations/WORK_LOG.md) | 每日工作记录 | 每日工作后 |
| [FRONTEND_LOG.md](./collaborations/FRONTEND_LOG.md) | 前端开发日志 | 前端修改时 |
| [BACKEND_LOG.md](./collaborations/BACKEND_LOG.md) | 后端开发日志 | 后端修改时 |
| [UI_UX_LOG.md](./collaborations/UI_UX_LOG.md) | UI/UX 修改日志 | UI修改时 |
| [REQUIREMENTS_LOG.md](./collaborations/REQUIREMENTS_LOG.md) | 需求变更日志 | 需求变更时 |

### 🛡️ 运维文档
| 文档 | 用途 | 更新频率 |
|------|------|----------|
| [BACKUP_ROLLBACK.md](./BACKUP_ROLLBACK.md) | 备份回滚完整指南 | 系统变更时 |
| [BACKUP_STATUS.md](./BACKUP_STATUS.md) | 当前备份状态报告 | 每次检查点 |

### 📝 实现细节
| 文档 | 用途 | 更新频率 |
|------|------|----------|
| [MEITUAN_FIX_GUIDE.md](../MEITUAN_FIX_GUIDE.md) | 美团模块完整实现说明 | 功能完成时 |

---

## 🎯 按需求查找文档

### 我想了解...

#### "项目是什么？用了什么技术？"
→ [README.md](../README.md)

#### "UI 应该怎么设计？颜色、字体、间距规范是什么？"
→ [UI_DESIGN_SPEC.md](./UI_DESIGN_SPEC.md)

#### "收银台的四大模块是什么？目前进展如何？"
→ [MODULES_PLAN.md](./MODULES_PLAN.md)

#### "今天做了什么？项目进度如何？"
→ [WORK_LOG.md](./collaborations/WORK_LOG.md)

#### "出问题了，怎么回滚到之前的版本？"
→ [BACKUP_ROLLBACK.md](./BACKUP_ROLLBACK.md)

#### "美团模块是怎么实现的？"
→ [MEITUAN_FIX_GUIDE.md](../MEITUAN_FIX_GUIDE.md)

#### "验券管理/消费数据如何在 Tauri 主窗口内嵌打开？"
→ [KNOWLEDGE_BASE.md](../KNOWLEDGE_BASE.md)

#### "当前系统状态如何？有备份吗？"
→ [BACKUP_STATUS.md](./BACKUP_STATUS.md)

---

## 📅 文档更新记录

### 最近更新（2026-01-16）
- ✅ 创建 `MODULES_PLAN.md` - 四大模块完善计划
- ✅ 创建 `BACKUP_ROLLBACK.md` - 备份回滚指南
- ✅ 创建 `BACKUP_STATUS.md` - 系统状态报告
- ✅ 更新 `WORK_LOG.md` - 详细工作日志
- ✅ 创建 `DOCS_INDEX.md` - 本文档导航中心
- ✅ 更新 `KNOWLEDGE_BASE.md` - 补充验券管理/消费数据主窗口内嵌方案（webview.Webview）

### 历史更新
- 2026-01-XX: 创建 `UI_DESIGN_SPEC.md`
- 2026-01-XX: 创建项目 `README.md`

---

## 🔍 文档维护规范

### 更新触发条件
1. **每日工作后** → 更新 `WORK_LOG.md`
2. **功能完成后** → 创建实现细节文档
3. **设计变更时** → 更新 `UI_DESIGN_SPEC.md`
4. **Git提交前** → 确保相关文档已更新
5. **重大里程碑** → 创建状态报告

### 文档编写规范
- 使用清晰的标题层级（# ## ###）
- 添加表情符号增强可读性 (✅ ❌ 🚧 📝 等)
- 使用表格展示结构化信息
- 保持专业但友好的语言风格
- 提供具体的代码示例和命令

### 文档检查清单
- [ ] 标题清晰，层级合理
- [ ] 日期和时间准确
- [ ] 代码示例正确可运行
- [ ] 链接有效，路径正确
- [ ] 表格格式美观
- [ ] 拼写和语法检查

---

## 🎓 推荐阅读路径

### 路径 1: 新加入的开发者
1. README.md (了解项目)
2. UI_DESIGN_SPEC.md (了解设计规范)
3. WORK_LOG.md (了解最新进展)
4. MODULES_PLAN.md (了解待办任务)

### 路径 2: 接手美团模块开发
1. MEITUAN_FIX_GUIDE.md (实现细节)
2. CashierView.vue 源码
3. WORK_LOG.md (最新修改)

### 路径 3: 系统维护和部署
1. BACKUP_STATUS.md (系统状态)
2. BACKUP_ROLLBACK.md (回滚指南)
3. README.md (安装和运行)

### 路径 4: UI/UX 设计师
1. UI_DESIGN_SPEC.md (设计规范)
2. UI_UX_LOG.md (修改历史)
3. 浏览器实际运行效果

---

## 💡 文档使用技巧

### 快速搜索
使用 VS Code 的全局搜索 (Ctrl+Shift+F) 在所有文档中查找关键词。

### Markdown 预览
在 VS Code 中按 `Ctrl+Shift+V` 预览 Markdown 效果。

### Git 集成
所有文档都已纳入Git版本控制，可以查看历史版本和差异。

### 链接跳转
点击文档中的相对链接可以快速跳转到其他文档。

---

## 📞 文档反馈

如果您发现文档有误、过时或需要补充，请：
1. 直接编辑并提交 Git commit
2. 在 commit message 中说明修改原因
3. 更新本文档的"文档更新记录"部分

---

## ✨ 文档哲学

> "好的文档就是最好的团队成员。"

我们相信：
- 📖 **文档即代码** - 文档和代码同等重要
- 🔄 **实时更新** - 文档应该与代码同步更新
- 🎯 **面向用户** - 文档应该易于理解和使用
- 🛡️ **永不过时** - 通过Git确保历史可追溯

---

**最后更新**: 2026-01-16 20:35  
**维护者**: AI Assistant & Smarticafe Team  
**反馈方式**: Git Commit  

✅ **所有文档已就绪，开发无忧！**
