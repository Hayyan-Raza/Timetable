# GitHub Push Helper Script
# This script will help you push your code to GitHub using a Personal Access Token

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GitHub Push Helper" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "To push your code, you need a Personal Access Token from GitHub." -ForegroundColor Yellow
Write-Host ""
Write-Host "If you don't have one yet:" -ForegroundColor Green
Write-Host "1. Open: https://github.com/settings/tokens/new" -ForegroundColor White
Write-Host "2. Note: 'TimeTable Dashboard Push'" -ForegroundColor White
Write-Host "3. Expiration: 90 days (or your preference)" -ForegroundColor White
Write-Host "4. Select scope: Check 'repo' (Full control of private repositories)" -ForegroundColor White
Write-Host "5. Click 'Generate token' and copy it" -ForegroundColor White
Write-Host ""

$token = Read-Host "Enter your GitHub Personal Access Token (starts with ghp_)"

if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host "Error: No token provided!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Pushing to GitHub..." -ForegroundColor Cyan

# Push using the token
$repoUrl = "https://$token@github.com/Syed-Hayyan-Raza/TimeTable.git"
git push -u $repoUrl main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  SUCCESS! Code pushed to GitHub!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "View your repository at:" -ForegroundColor Cyan
    Write-Host "https://github.com/Syed-Hayyan-Raza/TimeTable" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "Push failed. Please check the error above." -ForegroundColor Red
}

Write-Host ""
Read-Host "Press Enter to exit"
