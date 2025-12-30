# Deploy Clockit with Vercel + Google Cloud Run

## Perfect Combo: Already using Firebase? Use Cloud Run!

**Why Cloud Run:**
- ✅ **FREE tier**: 2 million requests/month
- ✅ **Scales to zero**: Pay nothing when idle
- ✅ **Fast cold starts**: ~1 second (vs 50s on Render)
- ✅ **Same GCP account**: Already using Firebase
- ✅ **Global deployment**: 33 regions worldwide
- ✅ **Container-based**: Full control

## Cost: **$0-5/month**

**Comparison**:
- Cloud Run: **$0-5/mo**
- Railway: **$20/mo** ❌ Too expensive
- Render: $0-7/mo (with limitations)

## Quick Start (TL;DR)

```bash
# 1. Enable APIs
gcloud services enable run.googleapis.com cloudbuild.googleapis.com

# 2. Deploy
cd clockit_api
gcloud run deploy clockit-api --source . --region us-central1 --allow-unauthenticated

# 3. Get URL
gcloud run services describe clockit-api --region us-central1 --format 'value(status.url)'

# 4. Add URL to Vercel as NEXT_PUBLIC_API_URL
```

That's it! Full guide below.

---

## Step 1: Prerequisites

```bash
# Install gcloud CLI (if not already installed)
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Login
gcloud auth login

# Set project (use your Firebase project ID)
gcloud config set project your-firebase-project-id
```

## Step 2: Enable Required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  containerregistry.googleapis.com
```

## Step 3: Deploy Backend to Cloud Run

### Option A: Quick Deploy (Recommended for First Time)

```bash
# Navigate to API directory
cd clockit_api

# Deploy (Cloud Run will build from Dockerfile automatically)
gcloud run deploy clockit-api \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production" \
  --max-instances 10 \
  --min-instances 0 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 60s

# Get your URL
gcloud run services describe clockit-api \
  --region us-central1 \
  --format 'value(status.url)'
```

**Output**: `https://clockit-api-abc123xyz-uc.a.run.app`

**Save this URL** - you'll need it for Vercel!

### Option B: Auto-Deploy via GitHub Actions

See `.github/workflows/deploy-cloud-run.yml` for automatic deployments on push to `main`.

## Step 4: Add Environment Variables

### Method 1: Using Secret Manager (Recommended)

```bash
# Create secrets
echo -n "your-firebase-project-id" | \
  gcloud secrets create FIREBASE_PROJECT_ID --data-file=-

echo -n "your-service-account@project.iam.gserviceaccount.com" | \
  gcloud secrets create FIREBASE_CLIENT_EMAIL --data-file=-

cat firebase-private-key.txt | \
  gcloud secrets create FIREBASE_PRIVATE_KEY --data-file=-

# Update Cloud Run to use secrets
gcloud run services update clockit-api \
  --region us-central1 \
  --update-secrets="FIREBASE_PROJECT_ID=FIREBASE_PROJECT_ID:latest,FIREBASE_CLIENT_EMAIL=FIREBASE_CLIENT_EMAIL:latest,FIREBASE_PRIVATE_KEY=FIREBASE_PRIVATE_KEY:latest"
```

### Method 2: Plain Environment Variables (Simpler)

```bash
gcloud run services update clockit-api \
  --region us-central1 \
  --set-env-vars="FIREBASE_PROJECT_ID=your-project-id,FIREBASE_CLIENT_EMAIL=your-email,NODE_ENV=production"
```

## Step 5: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Add environment variables:

```bash
# API URL from Cloud Run (from Step 3)
NEXT_PUBLIC_API_URL=https://clockit-api-abc123xyz-uc.a.run.app/api/v1

# Firebase config (same as before)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

4. Deploy!

## Step 6: Update CORS

```bash
gcloud run services update clockit-api \
  --region us-central1 \
  --update-env-vars="ALLOWED_ORIGINS=https://your-app.vercel.app,https://clockit.app"
```

## Cost Breakdown

### Free Tier (Monthly)
- 2 million requests
- 360,000 GB-seconds
- 180,000 vCPU-seconds

### Real-World Usage
- **10k requests/day** = FREE ✅
- **50k requests/day** = ~$1/month
- **200k requests/day** = ~$5/month

### Example App Cost
Small Clockit app with 100 users:
- ~5k requests/day
- ~150k requests/month
- **Cost: $0** (within free tier!)

## Key Features

### Auto-Scaling
```bash
# Scales automatically from 0 to max instances
# Configure:
gcloud run services update clockit-api \
  --min-instances 0 \    # Scale to zero when idle
  --max-instances 10      # Max concurrent instances
```

### Fast Cold Starts
- **~1 second** cold start
- Much faster than Render (50s) or other platforms

### Global Deployment
Deploy to 33 regions:
```bash
# List regions
gcloud run regions list

# Deploy to specific region
gcloud run deploy clockit-api --region europe-west1
```

## Monitoring

### View Logs
```bash
# Real-time logs
gcloud run services logs read clockit-api --region us-central1 --follow

# Filter errors
gcloud run services logs read clockit-api \
  --region us-central1 \
  --filter="severity>=ERROR"
```

### View Metrics
Cloud Console → Cloud Run → clockit-api → Metrics

See:
- Request count
- Latency (p50, p95, p99)
- CPU/Memory usage
- Error rate

## Auto-Deploy with GitHub Actions

The workflow in `.github/workflows/deploy-cloud-run.yml` will:

1. Build your Docker image
2. Push to Google Container Registry
3. Deploy to Cloud Run
4. Comment on PRs with deployment URL

**Setup**:

1. Create service account:
```bash
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions"

# Grant permissions
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:github-actions@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

# Create key
gcloud iam service-accounts keys create key.json \
  --iam-account=github-actions@PROJECT_ID.iam.gserviceaccount.com
```

2. Add to GitHub secrets:
   - `GCP_PROJECT_ID`: Your project ID
   - `GCP_SA_KEY`: Contents of `key.json`

3. Push to `main` → Auto-deploy!

## Custom Domain (Optional)

```bash
# Map custom domain
gcloud beta run domain-mappings create \
  --service clockit-api \
  --domain api.clockit.app \
  --region us-central1

# Add DNS records (Cloud Run will show you which ones)
```

SSL is automatic!

## Troubleshooting

### Build Fails
```bash
# Check build logs
gcloud builds list --limit=5
gcloud builds log BUILD_ID
```

### Service Won't Start
```bash
# Check logs
gcloud run services logs read clockit-api --region us-central1 --limit=100

# Describe service
gcloud run services describe clockit-api --region us-central1
```

### CORS Errors
1. Check `ALLOWED_ORIGINS` env var includes your Vercel URL
2. Verify exact URL match (https, no trailing slash)
3. Check CORS middleware in your Express app

## Quick Commands

```bash
# Deploy
gcloud run deploy clockit-api --source ./clockit_api --region us-central1

# Update env vars
gcloud run services update clockit-api \
  --region us-central1 \
  --set-env-vars="KEY=value"

# View logs
gcloud run services logs read clockit-api --region us-central1 --follow

# Get URL
gcloud run services describe clockit-api \
  --region us-central1 \
  --format 'value(status.url)'

# Delete service
gcloud run services delete clockit-api --region us-central1
```

## Comparison

| Feature | Cloud Run | Railway | Render Free |
|---------|-----------|---------|-------------|
| **Free Tier** | 2M req/mo | ❌ None | 750 hrs |
| **Cost** | $0-5/mo | $20/mo | $0 (sleeps) |
| **Cold Start** | ~1s | N/A | ~50s |
| **Auto Scale** | ✅ 0-1000+ | ❌ Manual | ❌ No |
| **Regions** | 33 | 4 | 1 |
| **SSL** | ✅ Auto | ✅ Auto | ✅ Auto |

**Winner**: Cloud Run 🏆

## Summary

✅ **Cost**: $0-5/month (vs Railway $20/mo)
✅ **Performance**: Fast cold starts, auto-scaling
✅ **Integration**: Same GCP account as Firebase
✅ **Simplicity**: One command to deploy
✅ **Monitoring**: Built-in logs and metrics

## Files Created

- [cloudbuild.yaml](cloudbuild.yaml) - Cloud Build config
- [clockit_api/.gcloudignore](clockit_api/.gcloudignore) - Build ignore
- [.github/workflows/deploy-cloud-run.yml](.github/workflows/deploy-cloud-run.yml) - Auto-deploy

🚀 **Deploy to Cloud Run - it's free and fast!**
