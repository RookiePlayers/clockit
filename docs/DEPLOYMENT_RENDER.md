# Deploy Clockit with Vercel + Render

## Cost: **$0-7/month** (vs Railway's $20/month)

## Architecture

```
┌─────────────────────────────────────┐
│      GitHub Monorepo (Main)         │
│  ┌──────────────┐  ┌──────────────┐ │
│  │ clockit_api  │  │clockit_website│ │
│  └──────┬───────┘  └──────┬────────┘ │
└─────────┼──────────────────┼─────────┘
          │                  │
          │ Auto Deploy      │ Auto Deploy
          ▼                  ▼
    ┌──────────────┐   ┌──────────────┐
    │   Render     │   │    Vercel    │
    │   (API)      │◄──┤  (Frontend)  │
    │   FREE!      │   │   FREE!      │
    └──────┬───────┘   └──────────────┘
           │
           ▼
    ┌──────────────┐
    │   Firebase   │
    │  Auth + DB   │
    │   FREE!      │
    └──────────────┘
```

## Step 1: Deploy Backend to Render (FREE)

### 1.1 Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up with GitHub (no credit card required!)
3. Click **"New +"** → **"Blueprint"**

### 1.2 Connect Repository

1. Click **"Connect a repository"**
2. Authorize Render to access your GitHub
3. Select your `clockit` repository

### 1.3 Deploy with Blueprint

Render will auto-detect `render.yaml` and:

1. Create a web service for `clockit_api`
2. Set up environment variables (you'll add them next)
3. Deploy automatically

**Service settings**:
- **Name**: clockit-api
- **Plan**: Free (or Starter $7/mo for always-on)
- **Region**: Choose closest to users
- **Build Command**: Auto-detected from `render.yaml`
- **Start Command**: Auto-detected from `render.yaml`

### 1.4 Add Environment Variables

In Render dashboard → clockit-api → Environment:

```bash
# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n

# Node Environment
NODE_ENV=production

# CORS (will update after Vercel deployment)
ALLOWED_ORIGINS=https://your-app.vercel.app
```

**Important for `FIREBASE_PRIVATE_KEY`**:
- Click "Add Environment Variable"
- Paste the FULL private key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
- Keep the `\n` newlines in the key

### 1.5 Get Your API URL

After deployment (takes ~5 mins), Render provides:

**Free tier**:
```
https://clockit-api.onrender.com
```

**Custom domain** (optional, free):
```
https://api.clockit.app
```

**Save this URL** - you need it for Vercel!

### 1.6 Add Health Check Endpoint (Optional)

Add to your Express app (`clockit_api/src/index.ts` or similar):

```typescript
// Health check for Render
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});
```

This prevents your service from spinning down on the free tier.

## Step 2: Deploy Frontend to Vercel (FREE)

**Follow the same steps as before** - nothing changes!

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Vercel auto-detects `clockit_website`
4. Add environment variables:

```bash
# API URL from Render
NEXT_PUBLIC_API_URL=https://clockit-api.onrender.com/api/v1

# Firebase (same as before)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

5. Deploy!

## Step 3: Update CORS

After Vercel deployment, update Render environment variables:

```bash
# In Render dashboard
ALLOWED_ORIGINS=https://your-app.vercel.app,https://clockit.app
```

Then click **"Manual Deploy"** → **"Deploy latest commit"**

## Free Tier Limitations

### Render Free Tier

**Limitations**:
- ⚠️ **Spins down after 15 minutes of inactivity**
- ⚠️ **50-second cold start** on first request after sleep
- ⚠️ 750 hours/month (enough for 1 service)
- ✅ 512 MB RAM
- ✅ Custom domains
- ✅ Automatic SSL

**Workarounds**:
1. Add health check endpoint
2. Use cron job to ping every 14 minutes (UptimeRobot, cron-job.org)
3. Upgrade to Starter plan ($7/mo) for always-on

### Vercel Free Tier

**Limitations**:
- ✅ **No spin-down** - always fast
- ✅ 100 GB bandwidth/month
- ✅ Unlimited deployments
- ✅ Automatic SSL

**No workarounds needed** - Vercel free tier is excellent!

## Preventing Render Sleep (Free Solutions)

### Option 1: UptimeRobot (Recommended)

1. Sign up at [uptimerobot.com](https://uptimerobot.com) (free)
2. Create new monitor:
   - **Type**: HTTP(s)
   - **URL**: `https://clockit-api.onrender.com/health`
   - **Interval**: 5 minutes
3. This pings your API every 5 minutes, keeping it awake

### Option 2: Cron-job.org

1. Sign up at [cron-job.org](https://cron-job.org) (free)
2. Create cron job:
   - **URL**: `https://clockit-api.onrender.com/health`
   - **Schedule**: Every 14 minutes
3. Keeps service awake

### Option 3: GitHub Actions Cron

Add to `.github/workflows/keep-alive.yml`:

```yaml
name: Keep Render Service Alive

on:
  schedule:
    - cron: '*/14 * * * *' # Every 14 minutes

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping API
        run: curl https://clockit-api.onrender.com/health
```

## Cost Comparison

| Service | Free Tier | Paid Tier | Notes |
|---------|-----------|-----------|-------|
| **Render** | $0 (with sleep) | $7/mo (always-on) | Best value |
| Railway | ❌ None | $20/mo | Too expensive |
| Vercel | ✅ $0 (generous) | $20/mo | Great for frontend |
| Fly.io | ✅ $0 (3 VMs) | $5/mo | More complex |

### Recommended Setup

**Starting Out** (Free):
- Vercel: $0
- Render: $0 (with UptimeRobot)
- Firebase: $0
- **Total: $0/month** 🎉

**Production** ($7/mo):
- Vercel: $0 (free tier is enough)
- Render Starter: $7/mo (always-on)
- Firebase: $0 (Spark plan)
- **Total: $7/month** 💰

**Scale Up** ($27/mo):
- Vercel Pro: $20/mo (better analytics)
- Render Starter: $7/mo
- Firebase Blaze: ~$5/mo (pay-as-you-go)
- **Total: $32/month**

## Auto-Deploy Setup

### Render Auto-Deploy

Render automatically deploys when:
- You push to `main` branch
- `clockit_api/**` or `render.yaml` changes

### GitHub Actions (Optional)

Use the workflow in [.github/workflows/deploy-backend-render.yml](.github/workflows/deploy-backend-render.yml)

1. Get deploy hook URL from Render:
   - Dashboard → clockit-api → Settings → Deploy Hook
   - Copy the URL

2. Add to GitHub secrets:
   - Repository Settings → Secrets → New secret
   - Name: `RENDER_DEPLOY_HOOK_URL`
   - Value: Your deploy hook URL

3. Push to main → Auto-deploy!

## Custom Domains (Free)

### Backend (Render)

1. Render Dashboard → clockit-api → Settings → Custom Domains
2. Add: `api.clockit.app`
3. Add CNAME record in your DNS:
   ```
   api.clockit.app → clockit-api.onrender.com
   ```
4. SSL is automatic!

### Frontend (Vercel)

Same as before - Vercel makes it easy!

## Troubleshooting

### Service Won't Start

1. Check build logs in Render dashboard
2. Verify environment variables are set correctly
3. Test locally: `cd clockit_api && npm run build && npm start`
4. Check `PORT` is not hardcoded (Render uses port 10000)

### Cold Starts Taking Too Long

**Free tier**: 30-50 second cold start is normal
**Solution**: Upgrade to Starter ($7/mo) or use UptimeRobot

### CORS Errors

1. Verify `ALLOWED_ORIGINS` includes your Vercel URL
2. Check exact URL (https, no trailing slash)
3. Redeploy after changing env vars

### Build Failing

1. Check `render.yaml` paths are correct
2. Ensure `package.json` has `build` script
3. Check Node version compatibility (Render uses Node 18 by default)

## Migration from Railway

If you're already on Railway:

1. Export environment variables from Railway
2. Set up Render with `render.yaml`
3. Add environment variables to Render
4. Deploy to Render
5. Update Vercel's `NEXT_PUBLIC_API_URL`
6. Test thoroughly
7. Delete Railway service

## Alternative: Fly.io (Also Great)

If Render doesn't work for you, try **Fly.io**:

**Pros**:
- Free tier: 3 VMs with 256 MB RAM each
- No sleep/cold starts on free tier
- Global edge deployment
- Very fast

**Cons**:
- More complex setup (requires `fly.toml`)
- Command-line heavy
- Learning curve

**Quick Fly.io setup**:
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Deploy from clockit_api directory
cd clockit_api
fly launch
fly deploy
```

## Summary

✅ **Render Free Tier**: $0/month (with 15-min sleep)
✅ **Render Starter**: $7/month (always-on)
✅ **Easy Migration**: Same Docker/Node.js setup as Railway
✅ **Auto-Deploy**: GitHub integration built-in
✅ **Custom Domains**: Free SSL included
✅ **Better Value**: Save $13/month vs Railway

🚀 **Deploy to Render instead of Railway - it's basically the same but way cheaper!**
