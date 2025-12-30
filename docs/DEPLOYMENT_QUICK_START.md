# Clockit Deployment - Quick Start

## Recommended: Vercel + Google Cloud Run

**Total Cost: $0-5/month** 🎉

## Quick Deploy (10 minutes total)

### Backend: Cloud Run (~5 min)

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com
cd clockit_api
gcloud run deploy clockit-api --source . --region us-central1 --allow-unauthenticated
```

**Get URL**:
```bash
gcloud run services describe clockit-api --region us-central1 --format 'value(status.url)'
# Output: https://clockit-api-xyz-uc.a.run.app
```

### Frontend: Vercel (~5 min)

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repo
3. Add: `NEXT_PUBLIC_API_URL=https://clockit-api-xyz-uc.a.run.app/api/v1`
4. Deploy!

## Why Cloud Run vs Railway?

- **Cloud Run**: $0-5/month, 2M requests free
- **Railway**: $20/month, no free tier

**Savings: $15-20/month** 💰

## Full Guides

- [DEPLOYMENT_CLOUD_RUN.md](DEPLOYMENT_CLOUD_RUN.md) - Complete Cloud Run guide
- [DEPLOYMENT_RENDER.md](DEPLOYMENT_RENDER.md) - Alternative (Render.com)

🚀 **Deploy now!**
