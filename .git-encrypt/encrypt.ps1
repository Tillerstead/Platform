# Git Encryption Filter - Encrypt proprietary files before commit
# Uses AES-256 encryption with a key file

param(
    [Parameter(Mandatory=$false)]
    [string]$KeyFile = "$PSScriptRoot\encryption.key"
)

$ErrorActionPreference = "Stop"

# Read the key
if (-not (Test-Path $KeyFile)) {
    Write-Error "Encryption key not found at: $KeyFile"
    exit 1
}

$key = Get-Content $KeyFile -Raw
$keyBytes = [System.Text.Encoding]::UTF8.GetBytes($key.Trim())

# Ensure key is 32 bytes for AES-256
if ($keyBytes.Length -lt 32) {
    $keyBytes = $keyBytes + (New-Object byte[] (32 - $keyBytes.Length))
} elseif ($keyBytes.Length -gt 32) {
    $keyBytes = $keyBytes[0..31]
}

# Read stdin
$inputBytes = @()
$input = [System.Console]::OpenStandardInput()
$buffer = New-Object byte[] 4096
while (($bytesRead = $input.Read($buffer, 0, $buffer.Length)) -gt 0) {
    $inputBytes += $buffer[0..($bytesRead-1)]
}

# Encrypt using AES
$aes = [System.Security.Cryptography.Aes]::Create()
$aes.Key = $keyBytes
$aes.GenerateIV()

$encryptor = $aes.CreateEncryptor()
$encryptedBytes = $encryptor.TransformFinalBlock($inputBytes, 0, $inputBytes.Length)

# Output: IV + encrypted data (base64 encoded for git storage)
$output = $aes.IV + $encryptedBytes
$base64 = [Convert]::ToBase64String($output)

# Write to stdout
[System.Console]::Write($base64)

$aes.Dispose()
