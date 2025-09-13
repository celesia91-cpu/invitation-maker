# test-frontend.ps1 - Test frontend locally

Write-Host "Testing frontend locally..." -ForegroundColor Green

# Check which frontend is active
if (Test-Path "index.html") {
    $indexContent = Get-Content "index.html" -Raw
    if ($indexContent -match 'id="root"') {
        Write-Host "[SUCCESS] React frontend detected" -ForegroundColor Green
        $frontendType = "React"
    } else {
        Write-Host "[SUCCESS] Legacy frontend detected" -ForegroundColor Green
        $frontendType = "Legacy"
    }
} else {
    Write-Host "[ERROR] No index.html found" -ForegroundColor Red
    exit 1
}

Write-Host "Starting local server for $frontendType frontend..." -ForegroundColor Yellow
Write-Host "Open http://localhost:3000 in your browser" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop server" -ForegroundColor Yellow
Write-Host ""

# Start local server
if (Get-Command npx -ErrorAction SilentlyContinue) {
    npx http-server -p 3000 -c-1
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    python -m http.server 3000
} else {
    Write-Host "[ERROR] No suitable HTTP server found" -ForegroundColor Red
    Write-Host "Install Node.js (for npx http-server) or Python" -ForegroundColor Yellow
    exit 1
}
