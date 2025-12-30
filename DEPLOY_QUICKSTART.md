# Quick Deploy Guide

## Setup: Firebase Hosting + Cloud Run

**Frontend**: Firebase Hosting (already deployed) ✅
**Backend**: Cloud Run (2 services to deploy)

---

## Deploy Both Services (5 minutes each)

### 1. Enable APIs (one-time)

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com
```

### 2. Deploy API Server

```bash
cd clockit_api
gcloud run deploy clockit-api --source . --region us-central1 --allow-unauthenticated
```

**Get URL**:
```bash
gcloud run services describe clockit-api --region us-central1 --format 'value(status.url)'
```

### 3. Deploy Socket Server

```bash
cd ../clockit-server
gcloud run deploy clockit-socket --source . --region us-central1 --allow-unauthenticated --timeout 3600s --session-affinity
```

**Get URL**:
```bash
gcloud run services describe clockit-socket --region us-central1 --format 'value(status.url)'
```

### 4. Update Frontend Config

Add these URLs to your Firebase Hosting environment config:

```
API_URL=https://clockit-api-xyz-uc.a.run.app
SOCKET_URL=https://clockit-socket-xyz-uc.a.run.app
```

---

## Cost

- **Free tier**: 2M requests/month (both services combined)
- **Light usage**: $0-1/month
- **Heavy usage**: $0-5/month

**Much cheaper than Railway ($20/mo)!**

---

## Full Guide

See [DEPLOY.md](DEPLOY.md) for complete documentation including:
- Environment variables setup
- Auto-deploy with GitHub Actions
- Monitoring and logging
- WebSocket configuration
- Troubleshooting

---

🚀 **That's it! Your API and Socket servers are deployed.**
