# 📦 备份系统使用指南

## 🚀 快速开始

### 创建备份（3秒完成）
```powershell
.\backup.ps1
```

### 恢复备份（查看所有）
```powershell
.\restore.ps1
```

### 恢复到指定备份
```powershell
.\restore.ps1 2026-01-15_2102_checkpoint
```

---

## 📋 当前备份

### 最新备份
- **名称**: `2026-01-16_2002_51_incremental`
- **时间**: 2026-01-16 20:02
- **包含**: 
  - ✅ 美团模块（100%完成）
  - ✅ Zoho Puvi字体系统
  - ✅ 完整文档体系
  - ✅ 备份/恢复脚本
  - ✅ 表格列宽自适应（均分→平摊→必要时缩放）
  - ✅ 全项目表格应用（CashierView/ProductsView/PermissionsView）
  - ✅ 修复内容贴边问题
  - ✅ 修复 CashierView runtime TDZ 报错

---

## 💡 使用场景

### 开始新功能前
```powershell
# 1. 创建备份
.\backup.ps1

# 2. 开发新功能
# ...修改代码...

# 3. 如果出错，恢复
.\restore.ps1 <刚才的备份>
```

### 测试危险操作前
```powershell
# 1. 备份
.\backup.ps1

# 2. 测试
# ...可能会破坏项目的操作...

# 3. 出问题了？立即恢复
.\restore.ps1 <备份名>
```

### 每日工作结束
```powershell
# 养成习惯：每天下班前备份
.\backup.ps1

# 第二天上班可以从任何一天的备份开始
```

---

## 📂 备份位置

所有备份保存在：
```
D:\rust\smarticafe-pro\backups\
```

可以直接打开文件夹查看和管理备份。

---

## ⚡ 注意事项

### 备份后需要做什么？
❌ **不需要**做任何事情！备份自动完成。

### 恢复后需要做什么？
✅ **必须**运行以下命令：
```powershell
npm install
npm run tauri dev
```

### 为什么？
因为备份会跳过 `node_modules` 文件夹（太大了），恢复后需要重新安装依赖。

---

## 🔍 完整文档

详细的备份系统说明请查看：
- 📖 [BACKUP_ROLLBACK.md](./docs/BACKUP_ROLLBACK.md)

---

**创建时间**: 2026-01-16 21:02
**系统状态**: ✅ 正常运行
**自动备份测试**: 2026-01-17 00:08 完整测试  
