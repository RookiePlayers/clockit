# GitHub Actions Auto-Deploy Setup

This guide will set up automatic deployments to Cloud Run when you push to the `main` branch.

## Overview

**Two workflows**:
1. **deploy-api.yml** - Deploys `clockit_api` when files change
2. **deploy-socket.yml** - Deploys `clockit-server` when files change

**Triggers**:
- Push to `main` branch
- Changes in respective directories
- Manual workflow dispatch

---

## Step 1: Create Google Cloud Service Account

This service account will be used by GitHub Actions to deploy to Cloud Run.

```bash
# Set your project ID (same as Firebase)
export PROJECT_ID=your-firebase-project-id

# Set project
gcloud config set project $PROJECT_ID

# Create service account
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions Deployment"

# Grant necessary permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.editor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/viewer"
```

## Step 2: Create Service Account Key

```bash
# Create and download key
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions@$PROJECT_ID.iam.gserviceaccount.com

# Display the key (you'll need to copy this)
cat github-actions-key.json
```

**⚠️ Important**:
- Copy the **entire JSON** output
- Keep this secure - it provides access to your GCP project
- Don't commit this file to git (it's in `.gitignore`)

## Step 3: Add GitHub Repository Secrets

Go to your GitHub repository:

**Settings → Secrets and variables → Actions → New repository secret**

Add these **two secrets**:

### Secret 1: GCP_PROJECT_ID

- **Name**: `GCP_PROJECT_ID`
- **Value**: Your Firebase project ID (e.g., `clockit-prod-123456`)

### Secret 2: GCP_SA_KEY

- **Name**: `GCP_SA_KEY`
- **Value**: The **entire contents** of `github-actions-key.json`

**Example**:
```json
{
  "type": "service_account",
  "project_id": "clockit-prod-123456",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "github-actions@clockit-prod-123456.iam.gserviceaccount.com",
  ...
}
```

**Copy the entire JSON** including the curly braces.

---

## Step 4: Test the Workflows

### Option A: Push to Main

```bash
# Make a small change
echo "# Test" >> clockit_api/README.md

# Commit and push
git add .
git commit -m "test: trigger API deployment"
git push origin main
```

**What happens**:
1. GitHub detects changes in `clockit_api/**`
2. Triggers `deploy-api.yml` workflow
3. Builds Docker image
4. Deploys to Cloud Run
5. Comments on PR with deployment URL (if PR)

### Option B: Manual Trigger

1. Go to **Actions** tab in GitHub
2. Select **Deploy API to Cloud Run** or **Deploy Socket Server to Cloud Run**
3. Click **Run workflow**
4. Select `main` branch
5. Click **Run workflow**

---

## Step 5: Monitor Deployments

### GitHub Actions UI

**Repository → Actions**

You'll see:
- ✅ Successful deployments (green check)
- ❌ Failed deployments (red X)
- 🟡 In-progress deployments (yellow dot)

Click on any workflow run to see:
- Build logs
- Deployment logs
- Service URL
- Error messages (if failed)

### Cloud Console

**[Cloud Run Console](https://console.cloud.google.com/run)**

- View all services
- See deployment history
- Monitor metrics
- View logs

---

## Workflow Features

### Path-Based Triggers

Workflows only run when relevant files change:

**deploy-api.yml** triggers on:
- Changes to `clockit_api/**`
- Changes to `cloudbuild-api.yaml`
- Changes to workflow file itself

**deploy-socket.yml** triggers on:
- Changes to `clockit-server/**`
- Changes to `cloudbuild-socket.yaml`
- Changes to workflow file itself

**Example**:
```bash
# Only deploys API (not socket)
git add clockit_api/src/index.ts
git commit -m "fix: API endpoint"
git push

# Only deploys socket (not API)
git add clockit-server/src/index.ts
git commit -m "fix: WebSocket handler"
git push

# Deploys both
git add clockit_api/src/index.ts clockit-server/src/index.ts
git commit -m "fix: both services"
git push
```

### Deployment Summary

Each deployment shows a summary in the Actions UI:

```
## Deployment Summary

✅ Service: clockit-api
🌍 Region: us-central1
🔗 URL: https://clockit-api-xyz-uc.a.run.app
📦 Commit: abc123def456
```

### PR Comments

When deploying from a pull request, the workflow automatically comments with the deployment URL:

```
🚀 API deployed to Cloud Run

URL: https://clockit-api-xyz-uc.a.run.app
Commit: abc123def456
```

---

## Troubleshooting

### "Permission Denied" Error

**Cause**: Service account doesn't have required permissions

**Fix**:
```bash
# Re-run permission grants from Step 1
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"
```

### "Invalid Credentials" Error

**Cause**: `GCP_SA_KEY` secret is incorrect

**Fix**:
1. Regenerate key: `gcloud iam service-accounts keys create github-actions-key.json ...`
2. Copy **entire JSON** including `{` and `}`
3. Update GitHub secret

### Build Fails

**Cause**: Docker build error or missing dependencies

**Fix**:
1. Check workflow logs in GitHub Actions
2. Test build locally:
   ```bash
   cd clockit_api
   docker build -t test-build .
   ```
3. Fix errors and push again

### Deployment Hangs

**Cause**: Cloud Run can't start the service

**Fix**:
1. Check Cloud Run logs:
   ```bash
   gcloud run services logs read clockit-api --region us-central1 --limit=100
   ```
2. Verify environment variables are set
3. Test locally: `npm start`

---

## Advanced Configuration

### Change Region

Edit workflow files and change `REGION`:

```yaml
env:
  REGION: europe-west1  # Change from us-central1
```

### Add Environment Variables

**Option 1: Via Workflow** (for non-sensitive data):

Edit `cloudbuild-api.yaml`:
```yaml
- '--set-env-vars'
- 'NODE_ENV=production,API_KEY=abc123'
```

**Option 2: Via Secret Manager** (for sensitive data):

```bash
# Create secret
echo -n "super-secret-value" | gcloud secrets create API_KEY --data-file=-

# Update cloudbuild-api.yaml
- '--update-secrets'
- 'API_KEY=API_KEY:latest'
```

### Add Build Steps

Edit `cloudbuild-api.yaml` to add custom build steps:

```yaml
steps:
  # Run tests before building
  - name: 'node:18'
    entrypoint: npm
    args: ['test']
    dir: 'clockit_api'

  # Existing build steps...
```

### Conditional Deployments

Deploy only on specific branches:

```yaml
on:
  push:
    branches:
      - main
      - production  # Add more branches
```

---

## Cost Optimization

### Prevent Accidental Deployments

Add manual approval for production:

```yaml
jobs:
  deploy:
    environment:
      name: production
      url: ${{ steps.get-url.outputs.url }}
    # ... rest of job
```

Then in GitHub:
**Settings → Environments → production → Required reviewers**

### Limit Concurrent Builds

Add concurrency control:

```yaml
concurrency:
  group: deploy-api-${{ github.ref }}
  cancel-in-progress: true
```

This cancels previous deployments if a new one starts.

---

## Security Best Practices

1. ✅ **Use Secret Manager** for sensitive env vars
2. ✅ **Limit service account permissions** (principle of least privilege)
3. ✅ **Rotate keys regularly** (every 90 days)
4. ✅ **Enable branch protection** on `main`
5. ✅ **Require PR reviews** before merging

### Rotate Service Account Key

```bash
# List existing keys
gcloud iam service-accounts keys list \
  --iam-account=github-actions@$PROJECT_ID.iam.gserviceaccount.com

# Delete old key
gcloud iam service-accounts keys delete KEY_ID \
  --iam-account=github-actions@$PROJECT_ID.iam.gserviceaccount.com

# Create new key
gcloud iam service-accounts keys create github-actions-key-new.json \
  --iam-account=github-actions@$PROJECT_ID.iam.gserviceaccount.com

# Update GitHub secret with new key
```

---

## Quick Reference

### Enable Workflows

```bash
# Workflows are in:
.github/workflows/deploy-api.yml
.github/workflows/deploy-socket.yml

# They auto-run on push to main when files change
```

### Manually Trigger

```bash
# Via GitHub UI:
Actions → Select workflow → Run workflow

# Via GitHub CLI:
gh workflow run deploy-api.yml
gh workflow run deploy-socket.yml
```

### View Logs

```bash
# GitHub Actions logs:
# Repository → Actions → Click on workflow run

# Cloud Run logs:
gcloud run services logs read clockit-api --region us-central1 --follow
gcloud run services logs read clockit-socket --region us-central1 --follow
```

---

## Files Created

- ✅ `.github/workflows/deploy-api.yml` - API deployment workflow
- ✅ `.github/workflows/deploy-socket.yml` - Socket deployment workflow

---

## Summary

✅ **Automatic deployments** on push to `main`
✅ **Path-based triggers** - only deploy what changed
✅ **PR comments** with deployment URLs
✅ **Deployment summaries** in Actions UI
✅ **Secure** - uses service account with limited permissions

🚀 **Push to main → Auto-deploy to Cloud Run!**
