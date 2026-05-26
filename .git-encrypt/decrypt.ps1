# Git Decryption Filter - Decrypt proprietary files after checkout
# Uses AES-256 decryption with a key file

param(
    [Parameter(Mandatory=$false)]
    [string]$KeyFile = "$PSScriptRoot\encryption.key"
)

$ErrorActionPreference = "Stop"

# Read the key
if (-not (Test-Path $KeyFile)) {
    Write-Error "Decryption key not found at: $KeyFile. Run setup-encryption.ps1 first."
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

# Read stdin (base64 encoded)
$base64Input = [System.Console]::In.ReadToEnd()

try {
    $encryptedData = [Convert]::FromBase64String($base64Input.Trim())
    
    # Extract IV (first 16 bytes) and encrypted content
    $iv = $encryptedData[0..15]
    $encryptedBytes = $encryptedData[16..($encryptedData.Length-1)]
    
    # Decrypt using AES
    $aes = [System.Security.Cryptography.Aes]::Create()
    $aes.Key = $keyBytes
    $aes.IV = $iv
    
    $decryptor = $aes.CreateDecryptor()
    $decryptedBytes = $decryptor.TransformFinalBlock($encryptedBytes, 0, $encryptedBytes.Length)
    
    # Write to stdout
    [System.Console]::OpenStandardOutput().Write($decryptedBytes, 0, $decryptedBytes.Length)
    
    $aes.Dispose()
} catch {
    Write-Error "Decryption failed: $_"
    exit 1
}
