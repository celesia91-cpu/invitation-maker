# deploy-react.ps1 - Deploy React frontend to Cloudflare

Write-Host "Deploying React frontend to Cloudflare..." -ForegroundColor Green

# Check if React files are at root
if (!(Test-Path "index.html")) {
    Write-Host "[ERROR] No index.html found at root. Did you run .\replace-frontend.ps1 first?" -ForegroundColor Red
    exit 1
}

# Check if it's the React version
$indexContent = Get-Content "index.html" -Raw
if (!($indexContent -match 'id="root"')) {
    Write-Host "[ERROR] index.html doesn't appear to be the React version" -ForegroundColor Red
    Write-Host "Run .\replace-frontend.ps1 first to replace legacy with React" -ForegroundColor Yellow
    exit 1
}

Write-Host "[SUCCESS] React frontend detected at root level" -ForegroundColor Green

# Step 1: Deploy backend to Cloudflare Workers
Write-Host "[STEP 1] Deploying backend to Cloudflare Workers..." -ForegroundColor Yellow
npm run deploy
Write-Host "[SUCCESS] Backend deployed to: https://invitation-maker-api.celesia91.workers.dev" -ForegroundColor Green

# Step 2: Deploy frontend to Cloudflare Pages  
Write-Host "[STEP 2] Deploying React frontend to Cloudflare Pages..." -ForegroundColor Yellow
wrangler pages deploy . --project-name invitation-maker-frontend

Write-Host "[SUCCESS] Frontend deployed to: https://invitation-maker-frontend.pages.dev" -ForegroundColor Green

Write-Host ""
Write-Host "=== DEPLOYMENT COMPLETE ===" -ForegroundColor Green
Write-Host ""
Write-Host "Live URLs:" -ForegroundColor White
Write-Host "  Frontend: https://invitation-maker-frontend.pages.dev" -ForegroundColor Cyan
Write-Host "  Backend:  https://invitation-maker-api.celesia91.workers.dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "CORS is configured for your Pages domain" -ForegroundColor Yellow
Write-Host "Test your app and verify everything works!" -ForegroundColor Green
