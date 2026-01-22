# 🔄 本地备份与回滚系统

## 📅 最后更新时间
**2026-01-15 21:01** - 建立本地文件备份系统

---

## 🎯 系统说明

本项目使用**本地文件复制**的方式进行备份，无需Git或其他版本控制系统。

### 优势
- ✅ 简单直观，不需要学习Git
- ✅ 备份即复制，恢复即粘贴
- ✅ 可视化管理，直接查看备份文件夹
- ✅ 完全本地，不依赖网络
- ✅ 自动排除无用文件（node_modules等）

---

## 💾 备份操作

### 创建备份

```powershell
# 在项目根目录运行
.\backup.ps1
```

**执行效果**：
- 📦 自动创建 `backups/` 文件夹
- 📁 创建带时间戳的备份目录（如 `2026-01-15_2100_checkpoint`）
- 📄 复制所有源代码和配置文件
- ⏭️ 自动跳过 `node_modules`、`dist` 等大文件夹
- 📝 生成备份信息文件 `BACKUP_INFO.md`

**备份结构**：
```
smarticafe-pro/
  ├── src/
  ├── docs/
  ├── ...
  └── backups/
      ├── 2026-01-15_2100_checkpoint/
      │   ├── src/
      │   ├── docs/
      │   ├── package.json
      │   └── BACKUP_INFO.md
      └── 2026-01-15_1900_checkpoint/
          └── ...
```

---

## 🔙 恢复操作

### 查看所有备份

```powershell
# 列出所有可用备份
.\restore.ps1
```

**输出示例**：
```
📋 可用的备份：

[1] 2026-01-15_2100_checkpoint
    时间: 2026-01-15 21:00

[2] 2026-01-15_1900_checkpoint
    时间: 2026-01-15 19:00

💡 使用方法: .\restore.ps1 <备份名称>
```

### 恢复到指定备份

```powershell
# 恢复到2100的备份点
.\restore.ps1 2026-01-15_2100_checkpoint
```

**执行流程**：
1. ⚠️ 显示警告确认
2. 🗑️ 删除当前文件
3. 📁 从备份复制所有文件
4. ✅ 完成恢复
5. 💡 提示重新安装依赖

---

## 📋 备份策略

### 何时创建备份？

**必须备份**：
- ✅ 开始重大功能开发前
- ✅ 修改核心文件之前（如 CashierView.vue）
- ✅ 每日工作结束时
- ✅ 测试新功能前

**建议备份**：
- ✅ 完成一个模块后
- ✅ UI大幅调整后
- ✅ 依赖包更新后

**备份命名建议**：
```powershell
# 在备份后手动重命名文件夹，添加描述
backups/2026-01-15_2100_checkpoint/
→ backups/2026-01-15_2100_meituan_complete/

backups/2026-01-15_1900_checkpoint/
→ backups/2026-01-15_1900_font_system/
```

---

## 🗂️ 备份管理

### 查看备份占用空间

```powershell
# 查看backups文件夹大小
Get-ChildItem backups -Recurse | Measure-Object -Property Length -Sum
```

### 删除旧备份

```powershell
# 手动删除不需要的备份
Remove-Item backups/2026-01-14_1000_checkpoint -Recurse -Force
```

### 保留策略建议

- **保留最近7天**的所有备份
- **保留重要里程碑**备份（如模块完成）
- **每周清理一次**旧备份节省空间

---

## 🚨 紧急恢复流程

### 场景1: 代码完全损坏

```powershell
# 1. 查看可用备份
.\restore.ps1

# 2. 恢复到最新备份
.\restore.ps1 <最新备份名>

# 3. 重新安装依赖
npm install

# 4. 重启开发服务器
npm run tauri dev
```

### 场景2: 只想恢复某个文件

```powershell
# 不用脚本，直接手动复制
# 从: backups/2026-01-15_2100_checkpoint/src/views/CashierView.vue
# 到:  src/views/CashierView.vue
Copy-Item backups\2026-01-15_2100_checkpoint\src\views\CashierView.vue src\views\CashierView.vue -Force
```

### 场景3: 数据库损坏

```powershell
# 1. 从备份恢复数据库文件
Copy-Item backups\<backup-name>\src-tauri\smarticafe.db src-tauri\smarticafe.db -Force

# 2. 重启应用
npm run tauri dev
```

---

## 📊 自动排除的文件夹

备份脚本会自动跳过以下文件夹（节省空间和时间）：

- `node_modules/` - npm依赖包（可重新安装）
- `dist/` - 构建产物（可重新构建）
- `.vite/` - Vite缓存
- `src-tauri/target/` - Rust编译产物
- `backups/` - 备份文件夹本身
- `.git/` - Git仓库（如果存在）

**注意**：恢复后需要重新运行 `npm install` 安装依赖！

---

## ✅ 备份检查清单

### 备份前检查
- [ ] 所有修改已保存
- [ ] 开发服务器已停止
- [ ] 确认备份目的（功能完成/重大修改前）

### 备份后验证
- [ ] `backups/` 文件夹中出现新备份
- [ ] `BACKUP_INFO.md` 文件存在
- [ ] 备份大小合理（通常10-50MB）

### 恢复后检查
- [ ] 文件已恢复到目标状态
- [ ] 运行 `npm install`
- [ ] 开发服务器正常启动
- [ ] 功能正常工作

---

## 🔍 故障排查

### 问题：备份脚本无法运行

**解决方案**：
```powershell
# PowerShell执行策略问题
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned

# 然后重新运行
.\backup.ps1
```

### 问题：恢复后应用无法启动

**解决方案**：
```powershell
# 1. 重新安装依赖
npm install

# 2. 清理缓存
Remove-Item .vite -Recurse -Force

# 3. 重启
npm run tauri dev
```

### 问题：备份文件夹太大

**解决方案**：
- 检查是否意外包含了 `node_modules`
- 删除旧备份
- 修改 `backup.ps1` 添加更多排除项

---

## 📝 高级用法

### 给备份添加描述

编辑备份文件夹中的 `BACKUP_INFO.md`，添加详细说明：

```markdown
# 备份信息

**备份时间**: 2026-01-15 21:00
**备份名称**: 2026-01-15_2100_meituan_complete

## 此备份包含
- ✅ 美团模块100%完成
- ✅ 套餐配置系统
- ✅ 完整的13列表格
- ✅ Zoho Puvi字体系统

## 可回滚原因
- 美团模块功能完整且测试通过
- 字体系统稳定
- 适合作为后续开发的基准点
```

### 批量备份

```powershell
# 每小时自动备份一次（可用任务计划程序）
while ($true) {
    .\backup.ps1
    Start-Sleep -Seconds 3600
}
```

---

## 💡 最佳实践

1. **频繁备份** - 宁可多备份，不要少备份
2. **描述清晰** - 重命名备份文件夹，添加功能描述
3. **定期清理** - 每周删除不需要的旧备份
4. **验证备份** - 偶尔测试恢复功能确保可用
5. **多地备份** - 重要备份可复制到其他硬盘

---

## 🎯 快速参考

| 操作 | 命令 |
|------|------|
| 创建备份 | `.\backup.ps1` |
| 查看备份 | `.\restore.ps1` |
| 恢复备份 | `.\restore.ps1 <备份名>` |
| 重装依赖 | `npm install` |
| 重启服务 | `npm run tauri dev` |

---

**最后更新**: 2026-01-15 21:01  
**系统类型**: 本地文件备份  
**依赖**: PowerShell 5.0+  

✅ **本地备份系统已就绪，开发无忧！**
