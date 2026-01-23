@echo off
echo [Smarticafe] 一键清理并启动开发环境
echo.

REM 停止进程
echo [1/3] 停止相关进程...
taskkill /f /im smarticafe.exe 2>nul >nul
taskkill /f /im node.exe 2>nul >nul
echo        ✓ 进程已停止

REM 删除数据库
echo [2/3] 清理数据库...
if exist "%APPDATA%\com.aszeromo.smarticafe\smarticafe.db" (
    del /f /q "%APPDATA%\com.aszeromo.smarticafe\smarticafe.db" >nul
    echo        ✓ 数据库已清理
) else (
    echo        - 数据库不存在
)

REM 启动开发环境
echo [3/3] 启动开发环境...
echo        正在启动 Tauri...
cd /d E:\smarticafe\smarticafe-v2.0.0
start cmd /c "npm run tauri dev"

echo.
echo ✅ 启动完成！
echo.
echo 访问地址:
echo   本地: http://localhost:32520
echo   网络: http://192.168.1.168:32520
echo.
echo 等待10秒让应用启动完成...
timeout /t 10 /nobreak >nul
echo.
echo 现在可以开始测试了！