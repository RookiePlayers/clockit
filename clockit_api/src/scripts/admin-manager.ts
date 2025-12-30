#!/usr/bin/env node
/**
 * Interactive Admin Manager
 * Beautiful CLI for managing admin users
 *
 * Usage:
 *   npm run admin-manager
 */

import { prompt } from 'enquirer';
import chalk from 'chalk';
import { getAuth } from '../config/firebase-admin';
import { RBACService } from '../services/rbac.service';
import { FeatureGroupService } from '../services/feature-group.service';
import { FirestoreService } from '../services/firestore.service';
import {
  DEFAULT_FEATURE_ENTITLEMENTS,
  ALL_FEATURE_GROUPS,
} from './feature-seed.defaults';
import { Role } from '../types/rbac.types';

const adminAuth = getAuth();

// Fancy console messages
const log = {
  success: (msg: string) => console.log(chalk.green('✔'), msg),
  error: (msg: string) => console.log(chalk.red('✖'), msg),
  info: (msg: string) => console.log(chalk.blue('ℹ'), msg),
  warning: (msg: string) => console.log(chalk.yellow('⚠'), msg),
  header: (msg: string) => console.log(chalk.bold.cyan('\n' + msg)),
  divider: () => console.log(chalk.gray('─'.repeat(60))),
};

interface MenuChoice {
  name: string;
  message: string;
  value: string;
}

async function showMainMenu(): Promise<string> {
  log.header('🔐 Admin Manager');
  log.divider();

  const choices: MenuChoice[] = [
    { name: '1', message: '👑 Create Super Admin', value: 'create' },
    { name: '2', message: '📋 List All Admins', value: 'list' },
    { name: '3', message: '👥 List All Users with Roles', value: 'list-all' },
    { name: '4', message: '⬇️  Demote Admin to User', value: 'demote' },
    { name: '5', message: '🔍 Check User Role', value: 'check' },
    { name: '6', message: '🔄 Backfill User Roles', value: 'backfill' },
    { name: '7', message: '🌱 Seed Default Feature Group', value: 'seed-feature-group' },
    { name: '8', message: '🌱 Seed Default Feature Entitlements', value: 'seed-feature-entitlements' },
    { name: '9', message: '🚪 Exit', value: 'exit' },
  ];

  const response = await prompt<{ action: string }>({
    type: 'select',
    name: 'action',
    message: 'What would you like to do?',
    choices: choices.map(c => ({ name: c.value, message: c.message })),
  });

  return response.action;
}

async function createSuperAdmin() {
  log.header('👑 Create Super Admin');
  log.divider();

  try {
    const users = await RBACService.listAllUsersWithRoles();

    if (users.length === 0) {
      log.warning('No users found');
      log.info('💡 Users must sign up in the app first');
      return;
    }

    const sortedUsers = [...users].sort((a, b) => {
      const emailA = a.email || '';
      const emailB = b.email || '';
      if (emailA && emailB) {
        return emailA.localeCompare(emailB);
      }
      return a.uid.localeCompare(b.uid);
    });

    const userOptions = sortedUsers.map((user) => {
      const emailLabel = user.email || 'No email';
      const uidShort = `${user.uid.substring(0, 8)}...`;
      return {
        name: user.uid,
        message: `${emailLabel} (${uidShort}) [${user.role}]`,
      };
    });

    const { userId } = await prompt<{ userId: string }>({
      type: 'select',
      name: 'userId',
      message: 'Pick a user to promote:',
      choices: userOptions,
    });

    log.info(`Fetching user details...${chalk.gray(` (${userId})`)}`);
    const userRecord = await adminAuth.getUser(userId);
    const currentRole = await RBACService.getUserRole(userRecord.uid);

    // Check current role
    if (currentRole === Role.SUPER_ADMIN) {
      log.warning('User is already a super admin!');
      return;
    }

    if (currentRole === Role.ADMIN) {
      log.warning('User is already an admin!');

      const { proceed } = await prompt<{ proceed: boolean }>({
        type: 'confirm',
        name: 'proceed',
        message: 'User is already an admin. Promote to super admin?',
        initial: false,
      });

      if (!proceed) {
        log.info('Operation cancelled');
        return;
      }
    } else {
      log.info(`Current role: ${chalk.yellow(currentRole)}`);
    }

    // Confirm
    log.divider();
    console.log(chalk.bold('\nUser Details:'));
    console.log(chalk.gray('  Email:       ') + chalk.white(userRecord.email || 'N/A'));
    console.log(chalk.gray('  UID:         ') + chalk.white(userRecord.uid));
    console.log(chalk.gray('  Current Role:') + chalk.yellow(` ${currentRole}`));
    console.log(chalk.gray('  New Role:    ') + chalk.green.bold(` ${Role.SUPER_ADMIN}`));
    log.divider();

    const { confirm } = await prompt<{ confirm: boolean }>({
      type: 'confirm',
      name: 'confirm',
      message: chalk.bold.yellow('Grant super admin privileges to this user?'),
      initial: false,
    });

    if (!confirm) {
      log.info('Operation cancelled');
      return;
    }

    // Set admin role
    log.info('Setting super admin role...');
    await RBACService.setUserRole({
      userId: userRecord.uid,
      role: Role.SUPER_ADMIN,
    });

    log.divider();
    log.success(chalk.bold('Super admin privileges granted successfully! 🎉'));
    log.divider();
    log.warning('⚠️  User needs to sign out and back in to see changes');

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('no user record')) {
        log.error('No user found with that selection');
        log.info('💡 User must sign up in the app first');
      } else {
        log.error(`Error: ${error.message}`);
      }
    }
  }
}

async function listAdmins() {
  log.header('📋 Admin Users');
  log.divider();

  try {
    const users = await RBACService.listAllUsersWithRoles();
    const admins = users.filter(u => u.role === Role.ADMIN || u.role === Role.SUPER_ADMIN);

    if (admins.length === 0) {
      log.warning('No admin users found');
      log.info('💡 Create one with the "Create Super Admin" option');
      return;
    }

    console.log(chalk.bold(`\nFound ${chalk.green(admins.length)} admin${admins.length === 1 ? '' : 's'}:\n`));

    admins.forEach((admin, index) => {
      const number = chalk.gray(`${index + 1}.`);
      const email = chalk.cyan(admin.email || 'No email');
      const uid = chalk.gray(`(${admin.uid})`);
      const role = admin.role === Role.SUPER_ADMIN
        ? chalk.magenta.bold(`[${admin.role}]`)
        : chalk.green.bold(`[${admin.role}]`);

      console.log(`  ${number} ${email} ${uid} ${role}`);
      if (admin.teamId) {
        console.log(chalk.gray(`     Team: ${admin.teamId}`));
      }
    });

    log.divider();
    console.log(chalk.bold(`Total: ${chalk.green(admins.length)} admin${admins.length === 1 ? '' : 's'}\n`));

  } catch (error) {
    log.error('Failed to list admins');
    if (error instanceof Error) {
      console.error(chalk.red(error.message));
    }
  }
}

async function listAllUsers() {
  log.header('👥 All Users with Roles');
  log.divider();

  try {
    const users = await RBACService.listAllUsersWithRoles();

    if (users.length === 0) {
      log.warning('No users found');
      return;
    }

    console.log(chalk.bold(`\nFound ${chalk.cyan(users.length)} user${users.length === 1 ? '' : 's'}:\n`));

    // Group by role
    const byRole: Record<string, typeof users> = {};
    users.forEach(user => {
      if (!byRole[user.role]) {
        byRole[user.role] = [];
      }
      byRole[user.role].push(user);
    });

    // Display by role
    Object.entries(byRole).forEach(([role, roleUsers]) => {
      const roleColor = role === Role.SUPER_ADMIN ? 'magenta' :
        role === Role.ADMIN ? 'green' :
          role === Role.USER ? 'blue' :
            role === Role.TEAM_ADMIN ? 'yellow' : 'gray';

      console.log(chalk.bold[roleColor](`\n${role.toUpperCase()} (${roleUsers.length})`));

      roleUsers.forEach((user, index) => {
        const number = chalk.gray(`  ${index + 1}.`);
        const email = chalk.white(user.email || 'No email');
        const uid = chalk.gray(`(${user.uid.substring(0, 8)}...)`);

        console.log(`  ${number} ${email} ${uid}`);
      });
    });

    log.divider();
    console.log(chalk.bold(`Total: ${chalk.cyan(users.length)} user${users.length === 1 ? '' : 's'}\n`));

  } catch (error) {
    log.error('Failed to list users');
    if (error instanceof Error) {
      console.error(chalk.red(error.message));
    }
  }
}

async function demoteAdmin() {
  log.header('⬇️  Demote Admin to User');
  log.divider();

  // Get email
  const { email } = await prompt<{ email: string }>({
    type: 'input',
    name: 'email',
    message: 'Enter admin email to demote:',
    validate: (input: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(input) || 'Please enter a valid email address';
    },
  });

  try {
    // Check if user exists
    const userRecord = await adminAuth.getUserByEmail(email);
    log.success(`Found user: ${chalk.cyan(userRecord.uid)}`);

    // Check current role
    const currentRole = await RBACService.getUserRole(userRecord.uid);

    if (currentRole !== Role.ADMIN && currentRole !== Role.SUPER_ADMIN) {
      log.warning(`User is not an admin (current role: ${chalk.yellow(currentRole)})`);
      log.info('No changes needed');
      return;
    }

    // Confirm
    log.divider();
    console.log(chalk.bold('\nUser Details:'));
    console.log(chalk.gray('  Email:       ') + chalk.white(userRecord.email || 'N/A'));
    console.log(chalk.gray('  UID:         ') + chalk.white(userRecord.uid));
    console.log(chalk.gray('  Current Role:') + chalk.green(` ${currentRole}`));
    console.log(chalk.gray('  New Role:    ') + chalk.yellow(` ${Role.USER}`));
    log.divider();

    const { confirm } = await prompt<{ confirm: boolean }>({
      type: 'confirm',
      name: 'confirm',
      message: chalk.bold.yellow('Remove admin privileges from this user?'),
      initial: false,
    });

    if (!confirm) {
      log.info('Operation cancelled');
      return;
    }

    // Demote to user
    log.info('Removing admin privileges...');
    await RBACService.setUserRole({
      userId: userRecord.uid,
      role: Role.USER,
    });

    log.divider();
    log.success(chalk.bold('Admin privileges removed successfully!'));
    log.divider();
    log.warning('⚠️  User needs to sign out and back in to see changes');

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('no user record')) {
        log.error(`No user found with email "${email}"`);
      } else {
        log.error(`Error: ${error.message}`);
      }
    }
  }
}

async function checkUserRole() {
  log.header('🔍 Check User Role');
  log.divider();

  // Get email
  const { email } = await prompt<{ email: string }>({
    type: 'input',
    name: 'email',
    message: 'Enter user email:',
    validate: (input: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(input) || 'Please enter a valid email address';
    },
  });

  try {
    // Check if user exists
    const userRecord = await adminAuth.getUserByEmail(email);

    // Get role and permissions
    const role = await RBACService.getUserRole(userRecord.uid);
    const permissions = await RBACService.getUserPermissions(userRecord.uid);

    log.divider();
    console.log(chalk.bold('\nUser Information:'));
    console.log(chalk.gray('  Email:       ') + chalk.white(userRecord.email || 'N/A'));
    console.log(chalk.gray('  UID:         ') + chalk.white(userRecord.uid));
    console.log(chalk.gray('  Display Name:') + chalk.white(userRecord.displayName || 'N/A'));
    console.log(chalk.gray('  Created:     ') + chalk.white(userRecord.metadata.creationTime || 'N/A'));

    const roleColor = role === Role.SUPER_ADMIN ? 'magenta' :
      role === Role.ADMIN ? 'green' :
        role === Role.USER ? 'blue' :
          role === Role.TEAM_ADMIN ? 'yellow' : 'gray';
    console.log(chalk.gray('  Role:        ') + chalk[roleColor].bold(role));

    console.log(chalk.gray(`  Permissions: `) + chalk.white(`${permissions.length} permission${permissions.length === 1 ? '' : 's'}`));

    // Show sample permissions
    if (permissions.length > 0) {
      console.log(chalk.gray('\n  Sample Permissions:'));
      permissions.slice(0, 5).forEach(perm => {
        const action = chalk.cyan(perm.action.padEnd(10));
        const subject = chalk.white(perm.subject);
        console.log(chalk.gray('    •') + ` ${action} ${subject}`);
      });
      if (permissions.length > 5) {
        console.log(chalk.gray(`    ... and ${permissions.length - 5} more`));
      }
    }
    log.divider();

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('no user record')) {
        log.error(`No user found with email "${email}"`);
      } else {
        log.error(`Error: ${error.message}`);
      }
    }
  }
}

async function backfillUserRoles() {
  log.header('🔄 Backfill User Roles');
  log.divider();

  try {
    log.info('Fetching all Firebase Auth users...');
    const allUsers = await RBACService.listAllUsersWithRoles();

    if (allUsers.length === 0) {
      log.warning('No users found');
      log.info('💡 Users must sign up in the app first');
      return;
    }

    console.log(chalk.bold(`\nFound ${chalk.cyan(allUsers.length)} user${allUsers.length === 1 ? '' : 's'}\n`));

    const { targetRole } = await prompt<{ targetRole: Role }>({
      type: 'select',
      name: 'targetRole',
      message: 'Select role to backfill:',
      choices: [
        { name: Role.SUPER_ADMIN, message: 'Super Admin' },
        { name: Role.ADMIN, message: 'Admin' },
        { name: Role.USER, message: 'User' },
        { name: Role.TEAM_ADMIN, message: 'Team Admin' },
        { name: Role.TEAM_MEMBER, message: 'Team Member' },
        { name: Role.GUEST, message: 'Guest' },
      ],
    });

    const { scope } = await prompt<{ scope: 'all' | 'selected' }>({
      type: 'select',
      name: 'scope',
      message: 'Which users should be backfilled?',
      choices: [
        { name: 'all', message: 'All users' },
        { name: 'selected', message: 'Selected users' },
      ],
    });

    const sortedUsers = [...allUsers].sort((a, b) => {
      const emailA = a.email || '';
      const emailB = b.email || '';
      if (emailA && emailB) {
        return emailA.localeCompare(emailB);
      }
      return a.uid.localeCompare(b.uid);
    });

    let usersToBackfill = allUsers;

    if (scope === 'selected') {
      const userChoices = sortedUsers.map((user) => {
        const emailLabel = user.email || 'No email';
        const uidShort = `${user.uid.substring(0, 8)}...`;
        return {
          name: user.uid,
          message: `${emailLabel} (${uidShort}) [${user.role}]`,
        };
      });

      const { selectedUsers } = await prompt<{ selectedUsers: string[] }>({
        type: 'multiselect',
        name: 'selectedUsers',
        message: 'Select users to backfill:',
        choices: userChoices,
      });

      if (selectedUsers.length === 0) {
        log.warning('No users selected');
        return;
      }

      usersToBackfill = allUsers.filter((user) => selectedUsers.includes(user.uid));
    }

    let teamIdOverride: string | undefined;
    if (targetRole === Role.TEAM_ADMIN || targetRole === Role.TEAM_MEMBER) {
      const response = await prompt<{ teamId: string }>({
        type: 'input',
        name: 'teamId',
        message: 'Enter teamId to apply (leave blank to keep existing):',
      });
      teamIdOverride = response.teamId.trim() || undefined;
    }

    // Show summary by role
    const roleCount: Record<string, number> = {};
    allUsers.forEach(user => {
      roleCount[user.role] = (roleCount[user.role] || 0) + 1;
    });

    console.log(chalk.bold('Current role distribution:'));
    Object.entries(roleCount).forEach(([role, count]) => {
      const roleColor = role === Role.SUPER_ADMIN ? 'magenta' :
        role === Role.ADMIN ? 'green' :
          role === Role.USER ? 'blue' :
            role === Role.TEAM_ADMIN ? 'yellow' : 'gray';
      console.log(`  ${chalk[roleColor](role)}: ${count} user${count === 1 ? '' : 's'}`);
    });

    log.divider();
    console.log(chalk.yellow('\n⚠️  This will:'));
    console.log(chalk.gray(`  • Set role to ${targetRole} for ${usersToBackfill.length} user${usersToBackfill.length === 1 ? '' : 's'}`));
    console.log(chalk.gray('  • Create/update Firestore role documents'));
    console.log(chalk.gray('  • Sync custom claims with Firestore'));
    log.divider();

    const { confirm } = await prompt<{ confirm: boolean }>({
      type: 'confirm',
      name: 'confirm',
      message: chalk.bold.yellow(`Backfill ${usersToBackfill.length} user${usersToBackfill.length === 1 ? '' : 's'} to ${targetRole}?`),
      initial: false,
    });

    if (!confirm) {
      log.info('Operation cancelled');
      return;
    }

    log.info('Starting backfill...');

    let processed = 0;
    let updated = 0;
    let errors = 0;

    for (const user of usersToBackfill) {
      try {
        // Re-set the user's role to ensure Firestore document exists
        await RBACService.setUserRole({
          userId: user.uid,
          role: targetRole,
          teamId: targetRole === Role.TEAM_ADMIN || targetRole === Role.TEAM_MEMBER
            ? teamIdOverride ?? user.teamId
            : undefined,
        });
        processed++;
        updated++;

        // Show progress every 10 users
        if (processed % 10 === 0) {
          console.log(chalk.gray(`  Processed ${processed}/${usersToBackfill.length} users...`));
        }
      } catch (error) {
        errors++;
        console.error(chalk.red(`  Error processing user ${user.email || user.uid}: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    }

    log.divider();
    log.success(chalk.bold('Backfill complete! ✨'));
    log.divider();

    console.log(chalk.bold('\nResults:'));
    console.log(chalk.gray('  Total users:    ') + chalk.white(usersToBackfill.length));
    console.log(chalk.gray('  Processed:      ') + chalk.green(processed));
    console.log(chalk.gray('  Updated:        ') + chalk.cyan(updated));
    if (errors > 0) {
      console.log(chalk.gray('  Errors:         ') + chalk.red(errors));
    }

    console.log(chalk.bold('\nRole distribution after backfill:'));
    const updatedUsers = await RBACService.listAllUsersWithRoles();
    const updatedRoleCount: Record<string, number> = {};
    updatedUsers.forEach(user => {
      updatedRoleCount[user.role] = (updatedRoleCount[user.role] || 0) + 1;
    });

    Object.entries(updatedRoleCount).forEach(([role, count]) => {
      const roleColor = role === Role.SUPER_ADMIN ? 'magenta' :
        role === Role.ADMIN ? 'green' :
          role === Role.USER ? 'blue' :
            role === Role.TEAM_ADMIN ? 'yellow' : 'gray';
      console.log(`  ${chalk[roleColor](role)}: ${count} user${count === 1 ? '' : 's'}`);
    });

  } catch (error) {
    log.error('Backfill failed');
    if (error instanceof Error) {
      console.error(chalk.red(error.message));
    }
  }
}

async function seedDefaultFeatureGroup() {
  log.header('🌱 Seed Default Feature Group');
  log.divider();

  try {
    const batch = FirestoreService.batch();
  for(const group of ALL_FEATURE_GROUPS) {
    const existing = await FeatureGroupService.getFeatureGroup(group.id);
    if(existing) {
      log.info(`Feature group already exists: ${group.name} (${group.id})`);
      continue;
    }
    const now = new Date().toISOString();
      const data = {
        ...group,
        createdAt: now,
        updatedAt: now,
      };
      batch.set(
        FirestoreService.doc('FeatureGroups', group.id),
        data
      );
  }

    const commited = await batch.commit();

    log.success(`Seeded feature group: ${commited.length} feature group(s) successfully.`);
    await seedDefaultFeatureEntitlements();
  } catch (error) {
    log.error('Failed to seed default feature group');
    if (error instanceof Error) {
      console.error(chalk.red(error.message));
    }
  }
}

async function seedDefaultFeatureEntitlements() {
  log.header('🌱 Seed Default Feature Entitlements');
  log.divider();

  try {
    for (const entitlement of DEFAULT_FEATURE_ENTITLEMENTS) {
      const existing = await FirestoreService.doc('FeatureEntitlements', entitlement.id).get();
      if (existing.exists) {
        log.info(`Entitlement already exists: ${entitlement.name} (${entitlement.id})`);
        continue;
      }
      await FirestoreService.setDocument(
        `FeatureEntitlements/${entitlement.id}`,
        entitlement
      );
      log.success(`Seeded entitlement: ${entitlement.name} (${entitlement.id})`);
    }
  } catch (error) {
    log.error('Failed to seed default feature entitlements');
    if (error instanceof Error) {
      console.error(chalk.red(error.message));
    }
  }
}

async function main() {
  console.clear();

  // Welcome banner
  console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║') + chalk.bold.white('              🔐 CLOCKIT ADMIN MANAGER 🔐              ') + chalk.bold.cyan('║'));
  console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════════╝'));

  let running = true;

  while (running) {
    try {
      const action = await showMainMenu();

      console.log(); // Add spacing

      switch (action) {
        case 'create':
          await createSuperAdmin();
          break;
        case 'list':
          await listAdmins();
          break;
        case 'list-all':
          await listAllUsers();
          break;
        case 'demote':
          await demoteAdmin();
          break;
        case 'check':
          await checkUserRole();
          break;
        case 'backfill':
          await backfillUserRoles();
          break;
        case 'seed-feature-group':
          await seedDefaultFeatureGroup();
          break;
        case 'seed-feature-entitlements':
          await seedDefaultFeatureEntitlements();
          break;
        case 'exit':
          running = false;
          break;
      }

      if (running && action !== 'exit') {
        // Wait for user to press enter before continuing
        await prompt({
          type: 'input',
          name: 'continue',
          message: chalk.gray('Press Enter to continue...'),
        });
        console.clear();
        console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════════════════════╗'));
        console.log(chalk.bold.cyan('║') + chalk.bold.white('              🔐 CLOCKIT ADMIN MANAGER 🔐              ') + chalk.bold.cyan('║'));
        console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════════╝'));
      }

    } catch (error) {
      if (error instanceof Error && error.message.includes('User force closed')) {
        running = false;
      } else {
        log.error('An error occurred');
        console.error(error);
      }
    }
  }

  console.log();
  log.success('Goodbye! 👋');
  console.log();
  process.exit(0);
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log();
  log.info('Interrupted. Exiting...');
  process.exit(0);
});

// Run the interactive manager
main().catch((error) => {
  console.error(chalk.red('\nFatal error:'), error);
  process.exit(1);
});
