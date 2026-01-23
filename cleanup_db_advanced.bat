@echo off
chcp 65001 >nul
title Smarticafe 数据库清理工具

echo.
echo ╔══════════════════════════════════════╗
echo ║        Smarticafe 数据库清理工具      ║
echo ╚══════════════════════════════════════╝
echo.

echo [步骤 1/4] 检查当前状态...
echo.

REM 检查进程
echo 正在运行的进程:
tasklist /fi "imagename eq smarticafe.exe" 2>nul | find "smarticafe.exe" >nul
if %errorlevel%==0 (
    echo   ✓ 发现 Smarticafe 桌面应用正在运行
) else (
    echo   - Smarticafe 桌面应用未运行
)

tasklist /fi "imagename eq node.exe" 2>nul | find "node.exe" >nul
if %errorlevel%==0 (
    echo   ✓ 发现 Node.js 进程正在运行
) else (
    echo   - Node.js 进程未运行
)
echo.

REM 检查数据库文件
if exist "%APPDATA%\com.aszeromo.smarticafe\smarticafe.db" (
    echo   ✓ 数据库文件存在
    for %%A in ("%APPDATA%\com.aszeromo.smarticafe\smarticafe.db") do echo   文件大小: %%~zA 字节
) else (
    echo   - 数据库文件不存在
)
echo.

echo [步骤 2/4] 停止相关进程...
taskkill /f /im smarticafe.exe 2>nul
taskkill /f /im node.exe 2>nul
timeout /t 2 /nobreak >nul
echo   ✓ 进程已停止
echo.

echo [步骤 3/4] 清理数据库和缓存...
if exist "%APPDATA%\com.aszeromo.smarticafe\smarticafe.db" (
    del /f /q "%APPDATA%\com.aszeromo.smarticafe\smarticafe.db"
    echo   ✓ 数据库文件已删除
) else (
    echo   - 数据库文件不存在，跳过删除
)

REM 清理可能的缓存文件
if exist "%APPDATA%\com.aszeromo.smarticafe\*.db-*" (
    del /f /q "%APPDATA%\com.aszeromo.smarticafe\*.db-*"
    echo   ✓ 数据库临时文件已清理
)

echo.

echo [步骤 4/4] 清理完成！
echo.
echo ╔══════════════════════════════════════╗
echo ║              清理结果                  ║
echo ╠══════════════════════════════════════╣
echo ║ ✓ 所有 Smarticafe 进程已停止          ║
echo ║ ✓ 数据库文件已删除                   ║
echo ║ ✓ 临时文件已清理                     ║
echo ╚══════════════════════════════════════╝
echo.
echo 现在您可以：
echo   1. 运行 npm run tauri dev 启动开发环境
echo   2. 访问 http://localhost:32520 开始测试
echo   3. 或访问 http://192.168.1.168:32520 进行多端测试
echo.
echo 按任意键退出...
pause >nul