# Smarticafe 一键清理并启动开发环境
# 使用方法: .\start_dev.ps1

Write-Host "🚀 Smarticafe 一键清理并启动开发环境" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan
Write-Host ""

# 1. 停止相关进程
Write-Host "[1/4] 停止相关进程..." -ForegroundColor Yellow
try {
    Get-Process -Name "smarticafe" -ErrorAction SilentlyContinue | Stop-Process -Force
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "   ✓ 进程已停止" -ForegroundColor Green
} catch {
    Write-Host "   - 无相关进程运行" -ForegroundColor Gray
}
Write-Host ""

# 2. 删除数据库文件
Write-Host "[2/4] 清理数据库文件..." -ForegroundColor Yellow
$dbPath = "$env:APPDATA\com.aszeromo.smarticafe\smarticafe.db"
if (Test-Path $dbPath) {
    Remove-Item $dbPath -Force
    Write-Host "   ✓ 数据库文件已删除" -ForegroundColor Green
} else {
    Write-Host "   - 数据库文件不存在" -ForegroundColor Gray
}
Write-Host ""

# 3. 设置项目目录
Write-Host "[3/4] 设置项目环境..." -ForegroundColor Yellow
$projectRoot = "E:\smarticafe\smarticafe-v2.0.0"
if (-not (Test-Path "$projectRoot\package.json")) {
    Write-Host "   ❌ 项目路径不存在: $projectRoot" -ForegroundColor Red
    Write-Host "   请检查项目是否在正确位置" -ForegroundColor Red
    exit 1
}
Write-Host "   ✓ 项目目录: $projectRoot" -ForegroundColor Green

# 检查npm
try {
    $npmVersion = npm --version 2>$null
    Write-Host "   ✓ npm 版本: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ 未找到 npm，请确保已安装 Node.js" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 4. 启动开发环境
Write-Host "[4/4] 启动 Tauri 开发环境..." -ForegroundColor Yellow
Write-Host "   正在启动开发服务器..." -ForegroundColor Cyan
Write-Host ""

# 切换到项目目录并启动
Set-Location $projectRoot
Start-Process -FilePath "cmd" -ArgumentList "/c npm run tauri dev" -NoNewWindow

Write-Host ""
Write-Host "🎉 启动完成！" -ForegroundColor Green
Write-Host ""
Write-Host "╔══════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║              访问地址                  ║" -ForegroundColor Cyan
Write-Host "╠══════════════════════════════════════╣" -ForegroundColor Cyan
Write-Host "║ 电脑本地: http://localhost:32520      ║" -ForegroundColor White
Write-Host "║ 网络访问: http://192.168.1.168:32520  ║" -ForegroundColor White
Write-Host "║ API服务器: http://localhost:32521     ║" -ForegroundColor White
Write-Host "╚══════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 提示：" -ForegroundColor Yellow
Write-Host "   • 等待 10-15 秒让应用完全启动"
Write-Host "   • 首次访问会显示初始化界面"
Write-Host "   • 手机端访问网络地址进行多端同步测试"
Write-Host ""
Write-Host "按 Enter 键退出..." -ForegroundColor Gray
Read-Host