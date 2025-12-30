#!/usr/bin/env node
/**
 * Create Admin Script
 * Creates an admin user by setting Firebase custom claims
 *
 * Usage:
 *   npm run create-admin <email>
 *   npm run create-admin user@example.com
 */

import { getAuth } from '../config/firebase-admin';
import { RBACService } from '../services/rbac.service';
import { Role } from '../types/rbac.types';

const adminAuth = getAuth();

async function createAdmin(email: string) {
  try {
    console.log(`🔍 Looking up user with email: ${email}`);

    // Get user by email
    const userRecord = await adminAuth.getUserByEmail(email);
    console.log(`✅ Found user: ${userRecord.uid}`);

    // Set admin role
    console.log('🔐 Setting admin role...');
    await RBACService.setUserRole({
      userId: userRecord.uid,
      role: Role.ADMIN,
    });

    console.log('✅ Successfully granted admin privileges!');
    console.log('\nAdmin Details:');
    console.log(`  Email: ${userRecord.email}`);
    console.log(`  UID: ${userRecord.uid}`);
    console.log(`  Role: ${Role.ADMIN}`);
    console.log('\n⚠️  User needs to refresh their token to see changes.');
    console.log('   They can do this by signing out and signing back in.');

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('no user record')) {
        console.error(`❌ Error: No user found with email "${email}"`);
        console.log('\n💡 Make sure the user has signed up first.');
      } else {
        console.error(`❌ Error: ${error.message}`);
      }
    } else {
      console.error('❌ Unknown error occurred');
    }
    process.exit(1);
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('❌ Error: Email address required');
  console.log('\nUsage:');
  console.log('  npm run create-admin <email>');
  console.log('\nExample:');
  console.log('  npm run create-admin admin@example.com');
  process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  console.error(`❌ Error: Invalid email format "${email}"`);
  process.exit(1);
}

createAdmin(email)
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
