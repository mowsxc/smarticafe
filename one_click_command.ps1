# 一键清理并启动 Smarticafe 开发环境 (完整路径版本)
# 在 PowerShell 中执行：
# .\one_click_command.ps1

Write-Host "🚀 一键清理并启动 Smarticafe 开发环境" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan

# 完整的一行命令
$command = 'Get-Process -Name "smarticafe","node" -ErrorAction SilentlyContinue | Stop-Process -Force; $db="$env:APPDATA\com.aszeromo.smarticafe\smarticafe.db"; if(Test-Path $db){Remove-Item $db -Force}; Set-Location "E:\smarticafe\smarticafe-v2.0.0"; Start-Process -FilePath "cmd" -ArgumentList "/c npm run tauri dev" -NoNewWindow'

Write-Host "执行命令:" -ForegroundColor Yellow
Write-Host $command -ForegroundColor White
Write-Host ""

# 执行命令
Invoke-Expression $command

Write-Host ""
Write-Host "✅ 命令执行完成！" -ForegroundColor Green
Write-Host ""
Write-Host "访问地址:" -ForegroundColor Cyan
Write-Host "  本地: http://localhost:32520" -ForegroundColor White
Write-Host "  网络: http://192.168.1.168:32520" -ForegroundColor White
Write-Host ""
Read-Host "按 Enter 键退出"