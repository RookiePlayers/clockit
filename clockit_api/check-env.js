#!/usr/bin/env node

/**
 * Environment Configuration Checker
 * Run this to verify your .env.local file is set up correctly
 *
 * Usage: node check-env.js
 */

const fs = require('fs');
const path = require('path');

const ENV_FILE = path.join(__dirname, '.env.local');
const ENV_EXAMPLE = path.join(__dirname, '.env.example');

console.log('🔍 Checking environment configuration...\n');

// Check if .env.local exists
if (!fs.existsSync(ENV_FILE)) {
  console.error('❌ .env.local not found!');
  console.error('\nPlease create it from the example:');
  console.error('  cp .env.example .env.local\n');
  process.exit(1);
}

console.log('✅ .env.local exists');

// Load environment
require('dotenv').config({ path: ENV_FILE });

// Required variables
const REQUIRED = [
  'NODE_ENV',
  'PORT',
  'API_BASE_URL',
  'FIREBASE_SERVICE_ACCOUNT_B64',
  'ALLOWED_ORIGINS',
];

// Optional variables with defaults
const OPTIONAL = [
  'RATE_LIMIT_WINDOW_MS',
  'RATE_LIMIT_MAX_REQUESTS',
  'LOG_LEVEL',
];

let hasErrors = false;

console.log('\n📋 Checking required variables:');
REQUIRED.forEach(key => {
  const value = process.env[key];
  if (!value || value.includes('your_')) {
    console.error(`  ❌ ${key}: Not set or contains placeholder`);
    hasErrors = true;
  } else {
    // Truncate long values for display
    const display = value.length > 50
      ? value.substring(0, 50) + '...'
      : value;
    console.log(`  ✅ ${key}: ${display}`);
  }
});

console.log('\n📋 Optional variables (will use defaults if not set):');
OPTIONAL.forEach(key => {
  const value = process.env[key];
  if (value) {
    console.log(`  ✅ ${key}: ${value}`);
  } else {
    console.log(`  ℹ️  ${key}: Using default`);
  }
});

// Validate Firebase service account
if (process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
  console.log('\n🔐 Validating Firebase service account...');
  try {
    const json = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString('utf-8');
    const account = JSON.parse(json);

    if (account.type === 'service_account') {
      console.log('  ✅ Valid service account JSON');
      console.log(`  ✅ Project ID: ${account.project_id}`);
      console.log(`  ✅ Client Email: ${account.client_email}`);
    } else {
      console.error('  ❌ Invalid service account type');
      hasErrors = true;
    }
  } catch (err) {
    console.error('  ❌ Failed to decode service account:', err.message);
    hasErrors = true;
  }
}

// Final result
console.log('\n' + '='.repeat(60));
if (hasErrors) {
  console.error('❌ Configuration has errors. Please fix them before starting the server.\n');
  process.exit(1);
} else {
  console.log('✅ All checks passed! Your environment is configured correctly.\n');
  console.log('You can now start the server with:');
  console.log('  npm run dev\n');
  process.exit(0);
}
