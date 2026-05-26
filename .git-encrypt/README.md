# Git Encryption System for Tillerstead.com

## Overview

This directory contains the encryption system that protects proprietary
TillerPro Suite and calculator files in the Tillerstead.com repository. Files
are automatically encrypted before being committed to Git and decrypted when
checked out.

## How It Works

The system uses **AES-256 encryption** with Git's clean/smudge filter mechanism:

- **Clean filter (encrypt.ps1)**: Encrypts files before they're committed to the
  repository
- **Smudge filter (decrypt.ps1)**: Decrypts files when they're checked out from
  the repository
- **Encryption key**: A secure 256-bit key stored locally (NOT committed to Git)

## Protected Files

The following proprietary files are encrypted:

### TillerPro Suite

- `tillerpro.html` - Main TillerPro page
- `assets/js/tillerpro-config.js` - Configuration and logic
- `assets/css/pages/tillerpro.css` - Styling
- `_includes/sections/tillerpro-banner.html` - Banner component

### Calculator System - Backend

- `tillerstead-toolkit/backend/app/calculators/*.py` - All calculator
  implementations
- `tillerstead-toolkit/backend/app/api/calculators.py` - API endpoints

### Calculator System - Frontend

- `assets/js/build-calculators.js` - Calculator builder
- `assets/js/financing-calculator.js` - Financing calculator
- `assets/js/adapters/*-calculator-adapter.js` - All calculator adapters

### Calculator Components

- `_includes/tools/*-calculator.html` - Calculator HTML components
- `tools/pricing-calculator.html` - Pricing calculator

### Documentation

- `tillerstead-toolkit/CALCULATOR_SYSTEM.md` - System documentation
- `tillerstead-toolkit/CALCULATOR_ROADMAP.md` - Development roadmap

### Tests

- `tests/calculator-formulas.test.js` - Proprietary formula tests

## Setup Instructions

### Initial Setup (First Time)

1. Run the setup script:

   ```powershell
   .\.git-encrypt\setup-encryption.ps1
   ```

2. **CRITICAL**: Back up your encryption key:
   - Location: `.git-encrypt/encryption.key`
   - Store in password manager (1Password, LastPass, etc.)
   - Keep offline backup in secure location
   - **Without this key, encrypted files cannot be decrypted!**

3. Verify encryption is working:

   ```powershell
   # Stage a protected file
   git add tillerpro.html

   # View the staged (encrypted) version
   git diff --cached tillerpro.html
   # Should show encrypted base64 content
   ```

### Team Member Setup (Cloning Repository)

When a team member clones the repository:

1. Obtain the encryption key from secure storage
2. Place it at `.git-encrypt/encryption.key`
3. Run setup script:
   ```powershell
   .\.git-encrypt\setup-encryption.ps1
   ```
4. Checkout files to decrypt them:
   ```powershell
   git checkout HEAD -- .
   ```

## Security Features

✅ **AES-256 Encryption**: Military-grade encryption  
✅ **Automatic**: Encrypts on commit, decrypts on checkout  
✅ **Key Not Committed**: Encryption key is in `.gitignore`  
✅ **Build Compatible**: Decrypted files work normally in builds  
✅ **Git History Protected**: All commits contain encrypted versions

## Important Notes

### ⚠️ Key Management

- **NEVER commit** the `encryption.key` file
- **ALWAYS back up** the key in multiple secure locations
- **ROTATE key** if compromised (requires re-encrypting all files)
- **SHARE securely** with authorized team members only

### 🔒 What's Protected

- Proprietary calculation algorithms
- Business logic and formulas
- Pricing models and strategies
- Custom implementations
- Trade secrets

### ✅ What's NOT Encrypted

- Public-facing content
- Standard HTML/CSS (non-proprietary)
- Configuration files
- Documentation (non-proprietary)
- Build scripts
- Dependencies

## Build Process

The encryption system is **transparent to the build process**:

1. Files are decrypted in your working directory
2. Jekyll/build tools see normal, unencrypted files
3. Build process works exactly as before
4. Only Git commits contain encrypted versions

## Troubleshooting

### "Decryption key not found" error

**Solution**: Run `.git-encrypt/setup-encryption.ps1` to configure filters

### Files appear as base64 gibberish

**Cause**: Encryption key is missing or incorrect  
**Solution**:

1. Verify `encryption.key` exists and is correct
2. Run `git checkout HEAD -- [filename]` to re-decrypt

### Build fails with encrypted content

**Cause**: Git filters not configured  
**Solution**: Run setup script and checkout files again

### Need to share with new team member

**Steps**:

1. Securely share the `encryption.key` file
2. They run `setup-encryption.ps1`
3. They run `git checkout HEAD -- .`

## Key Rotation (If Compromised)

If the encryption key is compromised:

1. Generate new key:

   ```powershell
   Remove-Item .git-encrypt/encryption.key
   .\.git-encrypt\setup-encryption.ps1
   ```

2. Re-encrypt all files:

   ```powershell
   git rm --cached -r .
   git add .
   git commit -m "Rotate encryption key"
   ```

3. Notify all team members to update their keys

## Technical Details

- **Algorithm**: AES-256-CBC
- **Key Size**: 256 bits (32 bytes)
- **IV**: Randomly generated per file
- **Encoding**: Base64 (for Git storage)
- **Filter**: Git clean/smudge mechanism

## Support

For issues or questions:

- Check this README
- Review `.gitattributes` for encryption rules
- Test with: `git diff --cached [file]`
- Contact repository administrator

---

**© 2026 Tillerstead LLC. All Rights Reserved.**  
**This encryption system protects trade secrets under the New Jersey Uniform
Trade Secrets Act.**
