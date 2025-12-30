#!/usr/bin/env node
/**
 * Remove Admin Script
 * Removes admin role from a user (reverts to USER role)
 *
 * Usage:
 *   npm run remove-admin <email>
 *   npm run remove-admin admin@example.com
 */

import { getAuth } from '../config/firebase-admin';
import { RBACService } from '../services/rbac.service';
import { Role } from '../types/rbac.types';

const adminAuth = getAuth();

async function removeAdmin(email: string) {
  try {
    console.log(`🔍 Looking up user with email: ${email}`);

    // Get user by email
    const userRecord = await adminAuth.getUserByEmail(email);
    console.log(`✅ Found user: ${userRecord.uid}`);

    // Check current role
    const currentRole = await RBACService.getUserRole(userRecord.uid);
    console.log(`Current role: ${currentRole}`);

    if (currentRole !== Role.ADMIN && currentRole !== Role.SUPER_ADMIN) {
      console.log(`⚠️  User is not an admin (current role: ${currentRole})`);
      console.log('No changes made.');
      return;
    }

    // Revert to USER role
    console.log('🔄 Removing admin role (reverting to USER)...');
    await RBACService.setUserRole({
      userId: userRecord.uid,
      role: Role.USER,
    });

    console.log('✅ Successfully removed admin privileges!');
    console.log('\nUser Details:');
    console.log(`  Email: ${userRecord.email}`);
    console.log(`  UID: ${userRecord.uid}`);
    console.log(`  Old Role: ${currentRole}`);
    console.log(`  New Role: ${Role.USER}`);
    console.log('\n⚠️  User needs to refresh their token to see changes.');

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('no user record')) {
        console.error(`❌ Error: No user found with email "${email}"`);
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
  console.log('  npm run remove-admin <email>');
  console.log('\nExample:');
  console.log('  npm run remove-admin admin@example.com');
  process.exit(1);
}

removeAdmin(email)
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
