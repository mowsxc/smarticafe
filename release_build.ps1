$ErrorActionPreference = "Stop"

# 1. Update Version Info (Skipped for now, using 2.0.0)
$VERSION = "2.0.0"
Write-Host "🚀 Starting Build Process for Smarticafe v$VERSION..." -ForegroundColor Cyan

# 2. Build Frontend
Write-Host "📦 Building Frontend..." -ForegroundColor Yellow
Start-Process npm -ArgumentList "run", "build" -Wait -NoNewWindow
if ($LastExitCode -ne 0) { throw "Frontend build failed" }

# 3. Build Tauri App
Write-Host "🦀 Building Tauri Application..." -ForegroundColor Yellow
Start-Process npm -ArgumentList "run", "tauri", "build" -Wait -NoNewWindow
if ($LastExitCode -ne 0) { throw "Tauri build failed" }

# 4. Prepare Output Directory
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$OutputDir = Join-Path $DesktopPath "Smarticafe_Release_v$VERSION"
if (Test-Path $OutputDir) { Remove-Item $OutputDir -Recurse -Force }
New-Item -ItemType Directory -Path $OutputDir | Out-Null

# 5. Copy Artifacts
$TargetDir = "src-tauri/target/release/bundle/nsis"
if (Test-Path $TargetDir) {
    Get-ChildItem $TargetDir -Filter "*.exe" | Copy-Item -Destination $OutputDir
    Write-Host "✅ Copied NSIS Installer to $OutputDir" -ForegroundColor Green
} else {
    Write-Warning "NSIS bundle not found. Checking MSI..."
    $MsiDir = "src-tauri/target/release/bundle/msi"
    if (Test-Path $MsiDir) {
        Get-ChildItem $MsiDir -Filter "*.msi" | Copy-Item -Destination $OutputDir
        Write-Host "✅ Copied MSI Installer to $OutputDir" -ForegroundColor Green
    }
}

Write-Host "🎉 Build Complete! Artifacts are on your Desktop." -ForegroundColor Cyan
Write-Host "📂 Location: $OutputDir"
