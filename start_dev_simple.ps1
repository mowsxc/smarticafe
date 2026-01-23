# 一键清理并启动 Smarticafe 开发环境
# 使用方法: .\start_dev_simple.ps1

Write-Host "🔄 清理并启动 Smarticafe..." -ForegroundColor Cyan

# 停止进程
Get-Process -Name "smarticafe","node" -ErrorAction SilentlyContinue | Stop-Process -Force

# 删除数据库
$dbPath = "$env:APPDATA\com.aszeromo.smarticafe\smarticafe.db"
if (Test-Path $dbPath) { Remove-Item $dbPath -Force }

# 启动开发环境
$projectRoot = "E:\smarticafe\smarticafe-v2.0.0"
Set-Location $projectRoot
Start-Process -FilePath "cmd" -ArgumentList "/c npm run tauri dev" -NoNewWindow

Write-Host "✅ 完成！访问: http://localhost:32520" -ForegroundColor Green