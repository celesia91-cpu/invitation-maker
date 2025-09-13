@'
# restore-frontend.ps1 - Restore legacy frontend from backup

Write-Host "🔄 Restoring legacy frontend from backup..." -ForegroundColor Green

# Check if backup exists
if (!(Test-Path "backup\legacy-frontend")) {
    Write-Host "❌ No backup found in backup\legacy-frontend\" -ForegroundColor Red
    Write-Host "Cannot restore - backup directory doesn't exist" -ForegroundColor Red
    exit 1
}

Write-Host "📦 Backup found, proceeding with restore..." -ForegroundColor Yellow

# Step 1: Remove current React files
Write-Host "🗑️ Removing current React files..." -ForegroundColor Yellow
if (Test-Path "index.html") { Remove-Item "index.html" -Force }
if (Test-Path "assets") { Remove-Item "assets" -Recurse -Force }
if (Test-Path "static") { Remove-Item "static" -Recurse -Force }

# Step 2: Restore legacy files
Write-Host "📂 Restoring legacy files..." -ForegroundColor Yellow
Copy-Item "backup\legacy-frontend\*" "." -Recurse -Force

Write-Host "✅ Legacy frontend restored!" -ForegroundColor Green

Write-Host ""
Write-Host "🔙 Rollback complete!" -ForegroundColor Green
Write-Host ""
Write-Host "✅ What was restored:" -ForegroundColor White
Write-Host "  - Legacy index.html" -ForegroundColor White
Write-Host "  - Legacy main.js" -ForegroundColor White
Write-Host "  - All legacy JavaScript modules" -ForegroundColor White
Write-Host "  - Legacy styles" -ForegroundColor White
Write-Host ""
Write-Host "🧪 Test your legacy app: .\test-frontend.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "💡 To try React replacement again:" -ForegroundColor Yellow
Write-Host "1. Fix any issues with React app" -ForegroundColor White
Write-Host "2. Run .\replace-frontend.ps1 again" -ForegroundColor White
'@ | Out-File -FilePath "restore-frontend.ps1" -Encoding UTF8