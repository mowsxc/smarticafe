@echo off
echo [Smarticafe] 快速重置数据库...
taskkill /f /im smarticafe.exe 2>nul >nul
taskkill /f /im node.exe 2>nul >nul
if exist "%APPDATA%\com.aszeromo.smarticafe\smarticafe.db" del /f /q "%APPDATA%\com.aszeromo.smarticafe\smarticafe.db"
echo [Smarticafe] 清理完成！现在可以运行: npm run tauri dev