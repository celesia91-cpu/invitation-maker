# replace-frontend.ps1 - Replace legacy frontend with React version

Write-Host "Replacing legacy frontend with React version..." -ForegroundColor Green

# Step 1: Create backup of legacy files
Write-Host "[STEP 1] Creating backup of legacy files..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "backup\legacy-frontend" -Force | Out-Null

if (Test-Path "index.html") { Copy-Item "index.html" "backup\legacy-frontend\" -Force }
if (Test-Path "main.js") { Copy-Item "main.js" "backup\legacy-frontend\" -Force }
if (Test-Path "styles") { Copy-Item "styles" "backup\legacy-frontend\" -Recurse -Force }
Get-ChildItem -Path "." -Filter "*.js" | Copy-Item -Destination "backup\legacy-frontend\" -Force
Get-ChildItem -Path "." -Filter "*.css" | Copy-Item -Destination "backup\legacy-frontend\" -Force

Write-Host "[SUCCESS] Backup created in backup\legacy-frontend\" -ForegroundColor Green

# Step 2: Build React frontend
Write-Host "[STEP 2] Building React frontend..." -ForegroundColor Yellow
Set-Location "frontend"
npm install
npm run build
Set-Location ".."

Write-Host "[SUCCESS] React build completed" -ForegroundColor Green

# Step 3: Remove legacy files
Write-Host "[STEP 3] Removing legacy files..." -ForegroundColor Yellow

if (Test-Path "index.html") { Remove-Item "index.html" -Force }
if (Test-Path "main.js") { Remove-Item "main.js" -Force }
if (Test-Path "auth-ui-manager.js") { Remove-Item "auth-ui-manager.js" -Force }
if (Test-Path "slide-manager.js") { Remove-Item "slide-manager.js" -Force }
if (Test-Path "text-manager.js") { Remove-Item "text-manager.js" -Force }
if (Test-Path "event-handlers.js") { Remove-Item "event-handlers.js" -Force }
if (Test-Path "collapsible-groups.js") { Remove-Item "collapsible-groups.js" -Force }

Write-Host "[SUCCESS] Legacy files removed" -ForegroundColor Green

# Step 4: Move React build to root
Write-Host "[STEP 4] Moving React build to root level..." -ForegroundColor Yellow

Copy-Item "frontend\dist\index.html" "." -Force
if (Test-Path "frontend\dist\assets") { Copy-Item "frontend\dist\assets" "." -Recurse -Force }
if (Test-Path "frontend\dist\static") { Copy-Item "frontend\dist\static" "." -Recurse -Force }

# Copy other dist files
Get-ChildItem -Path "frontend\dist" -File | Where-Object { $_.Extension -match '\.(js|css|ico)$' } | Copy-Item -Destination "." -Force

Write-Host "[SUCCESS] React files moved to root" -ForegroundColor Green

# Step 5: Update paths in index.html
Write-Host "[STEP 5] Updating paths in index.html..." -ForegroundColor Yellow
if (Test-Path "index.html") {
    (Get-Content "index.html") -replace '="/assets/', '="./assets/' | Set-Content "index.html"
}
Write-Host "[SUCCESS] Paths updated" -ForegroundColor Green

# Step 6: Copy static files
Write-Host "[STEP 6] Copying necessary static files..." -ForegroundColor Yellow
if (Test-Path "frontend\public\styles.css") { 
    Copy-Item "frontend\public\styles.css" "." -Force
    Write-Host "[SUCCESS] Copied styles.css" -ForegroundColor Green
}

if (Test-Path "frontend\public") {
    Get-ChildItem -Path "frontend\public" -File | Where-Object { $_.Extension -match '\.(css|ico|png|jpg|svg)$' } | Copy-Item -Destination "." -Force
    Write-Host "[SUCCESS] Copied public assets" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== FRONTEND REPLACEMENT COMPLETE ===" -ForegroundColor Green
Write-Host ""
Write-Host "What was done:" -ForegroundColor White
Write-Host "  - Legacy files backed up to backup\legacy-frontend\" -ForegroundColor White
Write-Host "  - React app built and moved to root level" -ForegroundColor White
Write-Host "  - Legacy HTML/JS files removed" -ForegroundColor White
Write-Host "  - Asset paths updated for root deployment" -ForegroundColor White
Write-Host ""
Write-Host "Your React app is now the main frontend!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Test your app locally: .\test-frontend.ps1" -ForegroundColor White
Write-Host "2. If working, deploy to Cloudflare: .\deploy-react.ps1" -ForegroundColor White
Write-Host "3. If issues, restore from backup: .\restore-frontend.ps1" -ForegroundColor White
