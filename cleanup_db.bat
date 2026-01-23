@echo off
echo ========================================
echo     Smarticafe 数据库清理脚本
echo ========================================
echo.

echo [1/3] 停止 Smarticafe 进程...
taskkill /f /im smarticafe.exe 2>nul
taskkill /f /im node.exe 2>nul
echo 进程已停止。
echo.

echo [2/3] 删除数据库文件...
if exist "%APPDATA%\com.aszeromo.smarticafe\smarticafe.db" (
    del /f /q "%APPDATA%\com.aszeromo.smarticafe\smarticafe.db"
    echo 数据库文件已删除。
) else (
    echo 数据库文件不存在或已被删除。
)
echo.

echo [3/3] 清理完成！
echo.
echo 现在您可以重新启动系统进行测试。
echo.
echo 按任意键退出...
pause >nul