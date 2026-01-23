@echo off
chcp 65001 >nul
title Smarticafe 清理并重启工具

echo.
echo ╔══════════════════════════════════════╗
echo ║     Smarticafe 清理并重启工具         ║
echo ╚══════════════════════════════════════╝
echo.

echo [1/5] 检查当前状态...
tasklist /fi "imagename eq smarticafe.exe" 2>nul | find "smarticafe.exe" >nul
if %errorlevel%==0 (
    echo   ✓ Smarticafe 桌面应用正在运行
) else (
    echo   - Smarticafe 桌面应用未运行
)

if exist "%APPDATA%\com.aszeromo.smarticafe\smarticafe.db" (
    echo   ✓ 数据库文件存在
) else (
    echo   - 数据库文件不存在
)
echo.

echo [2/5] 停止所有相关进程...
taskkill /f /im smarticafe.exe 2>nul
taskkill /f /im node.exe 2>nul
timeout /t 1 /nobreak >nul
echo   ✓ 进程已停止
echo.

echo [3/5] 删除数据库文件...
if exist "%APPDATA%\com.aszeromo.smarticafe\smarticafe.db" (
    del /f /q "%APPDATA%\com.aszeromo.smarticafe\smarticafe.db"
    echo   ✓ 数据库文件已删除
) else (
    echo   - 数据库文件不存在
)
echo.

echo [4/5] 启动开发环境...
echo   正在启动 Tauri 开发环境...
echo   (这可能需要一些时间，请稍候...)
echo.

REM 检查npm是否存在
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo   ❌ 未找到 npm，请确保已安装 Node.js
    goto :error
)

REM 启动Tauri开发环境
start "Smarticafe Dev" cmd /c "npm run tauri dev"

echo   ✓ 开发环境已启动
echo.

echo [5/5] 启动完成！
echo.
echo ╔══════════════════════════════════════╗
echo ║              访问地址                  ║
echo ╠══════════════════════════════════════╣
echo ║ 电脑本地: http://localhost:32520      ║
echo ║ 网络访问: http://192.168.1.168:32520  ║
echo ║ API服务器: http://localhost:32521     ║
echo ╚══════════════════════════════════════╝
echo.
echo 提示：
echo • 等待几秒钟让应用完全启动
echo • 首次访问会显示初始化界面
echo • 手机端可以访问网络地址进行多端同步测试
echo.

goto :success

:error
echo.
echo ❌ 启动失败！
echo 请检查：
echo • Node.js 是否正确安装
echo • 项目依赖是否已安装 (npm install)
echo • 端口 32520 和 32521 是否被占用
echo.
pause
exit /b 1

:success
echo 按任意键退出...
pause >nul