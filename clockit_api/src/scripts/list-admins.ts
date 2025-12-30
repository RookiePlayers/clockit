#!/usr/bin/env node
/**
 * List Admins Script
 * Lists all users with admin role
 *
 * Usage:
 *   npm run list-admins
 */

import { RBACService } from '../services/rbac.service';
import { Role } from '../types/rbac.types';

async function listAdmins() {
  try {
    console.log('🔍 Fetching all users with roles...\n');

    const users = await RBACService.listAllUsersWithRoles();
    const admins = users.filter(u => u.role === Role.ADMIN || u.role === Role.SUPER_ADMIN);

    if (admins.length === 0) {
      console.log('ℹ️  No admin users found.');
      console.log('\n💡 Create an admin with:');
      console.log('   npm run create-admin <email>');
      return;
    }

    console.log(`✅ Found ${admins.length} admin${admins.length === 1 ? '' : 's'}:\n`);

    admins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.email || 'No email'}`);
      console.log(`   UID: ${admin.uid}`);
      console.log(`   Role: ${admin.role}`);
      if (admin.teamId) {
        console.log(`   Team: ${admin.teamId}`);
      }
      console.log('');
    });

    console.log(`Total: ${admins.length} admin${admins.length === 1 ? '' : 's'}`);

  } catch (error) {
    console.error('❌ Error listing admins:', error);
    process.exit(1);
  }
}

listAdmins()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
