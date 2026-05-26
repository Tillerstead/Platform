#!/usr/bin/env node
/**
 * Security Setup Verification
 * Checks that all security features are properly configured
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REQUIRED_FILES = [
  'admin/security.js',
  'admin/auth-enhanced.js',
  'admin/public/security.html',
  'admin/public/security-app.js',
  'SECURITY-GUIDE.md',
];

const REQUIRED_PACKAGES = ['helmet', 'express-rate-limit', 'speakeasy', 'qrcode'];

async function checkFile(filePath) {
  try {
    const fullPath = path.join(__dirname, '..', filePath);
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
}

async function checkPackageJson() {
  try {
    const pkgPath = path.join(__dirname, '..', 'package.json');
    const content = await fs.readFile(pkgPath, 'utf8');
    const pkg = JSON.parse(content);

    const missing = [];
    for (const packageName of REQUIRED_PACKAGES) {
      if (!pkg.dependencies[packageName]) {
        missing.push(packageName);
      }
    }

    return missing;
  } catch (error) {
    console.error('Failed to read package.json:', error.message);
    return REQUIRED_PACKAGES;
  }
}

async function main() {
  console.log('\n🔐 Security Features Verification\n');
  console.log('━'.repeat(50));

  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

  console.log('\n📦 Node.js Version');
  if (majorVersion >= 18) {
    console.log(`  ✅ ${nodeVersion} (OK)`);
  } else {
    console.log(`  ❌ ${nodeVersion} (Require >= 18.0.0)`);
    process.exit(1);
  }

  // Check required files
  console.log('\n📁 Required Files');
  let allFilesPresent = true;

  for (const file of REQUIRED_FILES) {
    const exists = await checkFile(file);
    const status = exists ? '✅' : '❌';
    console.log(`  ${status} ${file}`);
    if (!exists) allFilesPresent = false;
  }

  if (!allFilesPresent) {
    console.log('\n❌ Some required files are missing!');
    process.exit(1);
  }

  // Check package dependencies
  console.log('\n📦 Dependencies');
  const missingPackages = await checkPackageJson();

  if (missingPackages.length === 0) {
    console.log('  ✅ All security packages present in package.json');
  } else {
    console.log('  ❌ Missing packages:');
    missingPackages.forEach(pkg => console.log(`     - ${pkg}`));
    console.log('\n  Run: npm install');
    process.exit(1);
  }

  // Check if node_modules exists
  try {
    await fs.access(path.join(__dirname, '..', 'node_modules'));
    console.log('  ✅ node_modules directory exists');
  } catch {
    console.log('  ⚠️  node_modules not found');
    console.log('     Run: npm install');
  }

  // Check config directory
  console.log('\n📂 Directories');
  try {
    await fs.access(path.join(__dirname, '..', 'config'));
    console.log('  ✅ config directory exists');
  } catch {
    console.log('  ℹ️  config directory will be created on first use');
  }

  try {
    await fs.access(path.join(__dirname, '..', 'logs'));
    console.log('  ✅ logs directory exists');
  } catch {
    console.log('  ℹ️  logs directory will be created on first use');
  }

  // Security recommendations
  console.log('\n🔒 Security Recommendations\n');
  console.log('  1. Change default admin password');
  console.log('     Use: node admin/generate-password.js');
  console.log('');
  console.log('  2. Set SESSION_SECRET environment variable');
  console.log('     Create .env file with random secret');
  console.log('');
  console.log('  3. Enable Two-Factor Authentication');
  console.log('     Visit: http://localhost:3001/security');
  console.log('');
  console.log('  4. Review and configure IP whitelist (optional)');
  console.log('     Use for restricting access to specific IPs');
  console.log('');
  console.log('  5. In production, set NODE_ENV=production');
  console.log('     Enables HTTPS-only secure cookies');

  // Quick start guide
  console.log('\n🚀 Quick Start\n');
  console.log('  1. Install dependencies:');
  console.log('     npm install\n');
  console.log('  2. Start admin server:');
  console.log('     npm run admin\n');
  console.log('  3. Access security dashboard:');
  console.log('     http://localhost:3001/security\n');
  console.log('  4. Read full documentation:');
  console.log('     SECURITY-GUIDE.md\n');

  console.log('━'.repeat(50));
  console.log('✅ Security features verification complete!\n');
}

main().catch(error => {
  console.error('\n❌ Verification failed:', error.message);
  process.exit(1);
});
