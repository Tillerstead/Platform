# Setup Git Encryption for Tillerstead.com Repository
# This script initializes encryption for proprietary files

$ErrorActionPreference = "Stop"

Write-Host "=== Tillerstead.com Git Encryption Setup ===" -ForegroundColor Cyan
Write-Host ""

$repoRoot = Split-Path -Parent $PSScriptRoot
$encryptDir = "$repoRoot\.git-encrypt"
$keyFile = "$encryptDir\encryption.key"

# Create encryption directory if it doesn't exist
if (-not (Test-Path $encryptDir)) {
    New-Item -ItemType Directory -Path $encryptDir -Force | Out-Null
}

# Generate encryption key if it doesn't exist
if (-not (Test-Path $keyFile)) {
    Write-Host "Generating new encryption key..." -ForegroundColor Yellow
    
    # Generate a secure random key
    $rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::Create()
    $keyBytes = New-Object byte[] 32
    $rng.GetBytes($keyBytes)
    $key = [Convert]::ToBase64String($keyBytes)
    
    Set-Content -Path $keyFile -Value $key -NoNewline
    Write-Host "[OK] Encryption key generated: $keyFile" -ForegroundColor Green
    Write-Host ""
    Write-Host "IMPORTANT: Back up this key file securely!" -ForegroundColor Red
    Write-Host "Store it in a password manager or secure location." -ForegroundColor Red
    Write-Host "Without this key, encrypted files cannot be decrypted!" -ForegroundColor Red
    Write-Host ""
} else {
    Write-Host "[OK] Encryption key already exists" -ForegroundColor Green
}

# Configure Git filters
Write-Host "Configuring Git filters..." -ForegroundColor Yellow

$encryptScript = "$encryptDir\encrypt.ps1"
$decryptScript = "$encryptDir\decrypt.ps1"

# Set up git filter
git config filter.tillerstead-encrypt.clean "powershell.exe -ExecutionPolicy Bypass -File `"$encryptScript`""
git config filter.tillerstead-encrypt.smudge "powershell.exe -ExecutionPolicy Bypass -File `"$decryptScript`""
git config filter.tillerstead-encrypt.required true

Write-Host "[OK] Git filters configured" -ForegroundColor Green
Write-Host ""

# Check if .gitattributes has encryption rules
$gitattributesPath = "$repoRoot\.gitattributes"
$hasEncryptionRules = $false

if (Test-Path $gitattributesPath) {
    $content = Get-Content $gitattributesPath -Raw
    if ($content -match "filter=tillerstead-encrypt") {
        $hasEncryptionRules = $true
    }
}

if (-not $hasEncryptionRules) {
    Write-Host "Adding encryption rules to .gitattributes..." -ForegroundColor Yellow
    
    $encryptionRules = @"

# === PROPRIETARY FILE ENCRYPTION ===
# TillerPro Suite and Calculator files are encrypted before commit
# Requires .git-encrypt/encryption.key to decrypt

# TillerPro Suite
tillerpro.html filter=tillerstead-encrypt
assets/js/tillerpro-config.js filter=tillerstead-encrypt
assets/css/pages/tillerpro.css filter=tillerstead-encrypt
_includes/sections/tillerpro-banner.html filter=tillerstead-encrypt

# Calculator System - Backend
tillerstead-toolkit/backend/app/calculators/*.py filter=tillerstead-encrypt
tillerstead-toolkit/backend/app/api/calculators.py filter=tillerstead-encrypt

# Calculator System - Frontend
assets/js/build-calculators.js filter=tillerstead-encrypt
assets/js/financing-calculator.js filter=tillerstead-encrypt
assets/js/adapters/*-calculator-adapter.js filter=tillerstead-encrypt

# Calculator HTML Components
_includes/tools/*-calculator.html filter=tillerstead-encrypt
tools/pricing-calculator.html filter=tillerstead-encrypt

# Calculator Documentation (contains proprietary formulas)
tillerstead-toolkit/CALCULATOR_SYSTEM.md filter=tillerstead-encrypt
tillerstead-toolkit/CALCULATOR_ROADMAP.md filter=tillerstead-encrypt

# Test files with proprietary logic
tests/calculator-formulas.test.js filter=tillerstead-encrypt
"@
    
    Add-Content -Path $gitattributesPath -Value $encryptionRules
    Write-Host "Encryption rules added to .gitattributes" -ForegroundColor Green
} else {
    Write-Host "Encryption rules already in .gitattributes" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Back up your encryption key: $keyFile" -ForegroundColor White
Write-Host "2. Add .git-encrypt/encryption.key to .gitignore (already done)" -ForegroundColor White
Write-Host "3. Test encryption: git add [file]; git diff --cached [file]" -ForegroundColor White
Write-Host "4. Commit changes: git commit -m 'Add encryption for proprietary files'" -ForegroundColor White
Write-Host ""
Write-Host "Files will be encrypted automatically on commit and decrypted on checkout." -ForegroundColor Yellow
Write-Host ""
