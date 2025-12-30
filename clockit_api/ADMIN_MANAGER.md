# 🔐 Interactive Admin Manager

Beautiful, interactive CLI tool for managing admin users in Clockit.

## Quick Start

```bash
cd clockit_api
npm run admin
```

![Admin Manager Screenshot](https://via.placeholder.com/800x400/1e293b/ffffff?text=Admin+Manager+CLI)

## Features

### 👑 Create Super Admin
- Interactive user email input with validation
- Shows current user details and role
- Confirmation prompt before granting admin access
- Beautiful colored output

### 📋 List All Admins
- Display all users with admin role
- Shows email, UID, and team info
- Clean, formatted table output

### 👥 List All Users with Roles
- View all users grouped by role
- See role distribution at a glance
- Sorted by role for easy scanning

### ⬇️ Demote Admin to User
- Safely remove admin privileges
- Shows before/after role comparison
- Confirmation prompt to prevent accidents

### 🔍 Check User Role

- Look up any user's role and permissions
- View user metadata (creation time, display name, etc.)
- See sample permissions
- Detailed permission breakdown

### 🔄 Backfill User Roles

- Sync all Firebase Auth users to Firestore role documents
- Shows current role distribution before backfill
- Progress tracking for large user bases
- Useful for migrating existing users to RBAC system
- Does NOT change existing roles, only creates missing Firestore documents

### 🚪 Exit
- Gracefully exit the application
- Ctrl+C handling for clean shutdown

## Usage Examples

### Creating a Super Admin

```bash
$ npm run admin

╔════════════════════════════════════════════════════════════╗
║              🔐 CLOCKIT ADMIN MANAGER 🔐                   ║
╚════════════════════════════════════════════════════════════╝

? What would you like to do?
  👑 Create Super Admin
  📋 List All Admins
  👥 List All Users with Roles
  ⬇️  Demote Admin to User
  🔍 Check User Role
  🔄 Backfill User Roles
  🚪 Exit

? Enter user email: admin@example.com

ℹ Looking up user: admin@example.com
✔ Found user: abc123xyz
ℹ Current role: user

────────────────────────────────────────────────────────────

User Details:
  Email:        admin@example.com
  UID:          abc123xyz
  Current Role: user
  New Role:     admin

────────────────────────────────────────────────────────────

? Grant admin privileges to this user? Yes

ℹ Setting admin role...
────────────────────────────────────────────────────────────
✔ Admin privileges granted successfully! 🎉
────────────────────────────────────────────────────────────
⚠ User needs to sign out and back in to see changes
```

### Listing Admins

```bash
Found 3 admins:

  1. admin@example.com (abc123xyz) [admin]
  2. superadmin@example.com (def456uvw) [admin]
     Team: team-engineering
  3. owner@example.com (ghi789rst) [admin]

────────────────────────────────────────────────────────────
Total: 3 admins
```

### Checking User Role

```bash
User Information:
  Email:        user@example.com
  UID:          xyz789abc
  Display Name: John Doe
  Created:      Mon Dec 30 2024 10:00:00 GMT
  Role:         user
  Permissions:  15 permissions

  Sample Permissions:
    • create     Upload
    • read       Upload
    • update     Upload
    • delete     Upload
    • create     Session
    ... and 10 more
```

### Backfilling User Roles

```bash
🔄 Backfill User Roles
────────────────────────────────────────────────────────────
ℹ Fetching all Firebase Auth users...

Found 150 users

Current role distribution:
  user: 145 users
  admin: 3 users
  super_admin: 2 users

────────────────────────────────────────────────────────────

⚠️  This will:
  • Create/update Firestore role documents for all users
  • Sync custom claims with Firestore
  • NOT change any existing roles
  • Set default USER role for users without custom claims
────────────────────────────────────────────────────────────

? Backfill 150 users? Yes

ℹ Starting backfill...
  Processed 10/150 users...
  Processed 20/150 users...
  ...
  Processed 150/150 users...

────────────────────────────────────────────────────────────
✔ Backfill complete! ✨
────────────────────────────────────────────────────────────

Results:
  Total users:    150
  Processed:      150
  Updated:        150

Role distribution after backfill:
  user: 145 users
  admin: 3 users
  super_admin: 2 users
```

## Menu Options

| Option | Description | Requires Confirmation |
|--------|-------------|----------------------|
| 👑 Create Super Admin | Grant admin privileges to a user | ✅ Yes |
| 📋 List All Admins | View all users with admin role | ❌ No |
| 👥 List All Users | View all users grouped by role | ❌ No |
| ⬇️ Demote Admin | Remove admin privileges | ✅ Yes |
| 🔍 Check User Role | Look up user's role and permissions | ❌ No |
| 🔄 Backfill User Roles | Sync all users to Firestore role documents | ✅ Yes |
| 🚪 Exit | Exit the application | ❌ No |

## Features

### Email Validation
- Validates email format before lookup
- Shows helpful error messages
- Prevents typos and invalid inputs

### User Confirmation
- All destructive actions require confirmation
- Shows detailed before/after comparison
- Easy to cancel if you change your mind

### Error Handling
- Clear, friendly error messages
- Suggestions for common issues
- Graceful handling of missing users

### Beautiful UI
- Color-coded output (green for success, red for errors, yellow for warnings)
- Clear section dividers
- Professional formatting
- Easy-to-read tables

### Keyboard Shortcuts
- **Arrow Keys**: Navigate menu options
- **Enter**: Select option / Confirm
- **Ctrl+C**: Exit at any time
- **Escape**: Cancel current operation

## Color Guide

- 🟢 **Green**: Success messages, admin role
- 🔵 **Blue**: Info messages, user role
- 🟡 **Yellow**: Warnings, team admin role
- 🔴 **Red**: Errors, critical actions
- ⚪ **Gray**: Dividers, secondary info
- 🔵 **Cyan**: Highlighted values, headers

## Tips

1. **First Time Setup**
   - User must sign up in your app first
   - Then use this tool to grant admin access
   - User must sign out/in to see changes

2. **Bulk Operations**
   - For creating multiple admins, use the CLI scripts
   - This tool is best for one-off admin management

3. **Safety First**
   - Always verify the email before confirming
   - Check current role to avoid duplicates
   - Confirmation prompts prevent accidents

4. **Role Changes**
   - Changes are immediate in Firebase
   - User must refresh their token (sign out/in)
   - Check Firebase Console to verify

## Comparison with Other Methods

| Method | Interactive | Validation | Pretty Output | Best For |
|--------|-------------|------------|---------------|----------|
| **npm run admin** | ✅ Yes | ✅ Yes | ✅ Yes | One-off admin management |
| npm run create-admin | ❌ No | ✅ Yes | ⚠️ Basic | Quick admin creation |
| npm run list-admins | ❌ No | N/A | ⚠️ Basic | Checking admin list |
| HTTP API | ❌ No | ✅ Yes | ❌ JSON | Automation / CI/CD |

## Troubleshooting

### "No user found with email"
- User must sign up in the app first
- Check for typos in email address
- Verify email in Firebase Console

### "User is already an admin"
- Tool detects this and asks if you want to continue
- Safe to proceed if you're unsure
- No harm in re-granting admin access

### "User needs to sign out and back in"
- This is normal - Firebase caches tokens
- User must sign out and sign back in
- Or call `user.getIdToken(true)` to force refresh

### Script hangs or freezes
- Press Ctrl+C to exit
- Check your internet connection
- Verify Firebase credentials are correct

## Security Notes

⚠️ **Important Security Considerations:**

1. **Access Control**
   - Only run this on trusted machines
   - Don't share Firebase credentials
   - Keep service account JSON secure

2. **Audit Trail**
   - All role changes are logged in Firestore
   - Check `UserRoles` collection for history
   - Monitor admin access regularly

3. **Production Use**
   - Restrict who can run this script
   - Use separate Firebase projects for dev/prod
   - Consider 2FA for admin accounts

## Related Commands

```bash
# Quick admin creation (non-interactive)
npm run create-admin user@example.com

# List all admins (non-interactive)
npm run list-admins

# Remove admin role (non-interactive)
npm run remove-admin user@example.com
```

## Dependencies

- **enquirer**: Interactive prompts
- **chalk**: Colored terminal output
- **ts-node**: TypeScript execution
- **firebase-admin**: Firebase Admin SDK

## Need Help?

- 📖 Read [ADMIN_SETUP.md](../ADMIN_SETUP.md) for detailed setup guide
- 📖 Read [RBAC_GUIDE.md](../RBAC_GUIDE.md) for RBAC documentation
- 📖 Read [ADMIN_QUICK_START.md](../ADMIN_QUICK_START.md) for quick reference

---

**Made with ❤️ for easy admin management**
