# Clockit Deployment Guide

## Overview

Clockit is deployed as a monorepo with:
- **Frontend (clockit_website)** → Vercel
- **Backend (clockit_api)** → Railway
- **Database & Auth** → Firebase

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
    │   Railway    │   │    Vercel    │
    │   (API)      │◄──┤  (Frontend)  │
    │ Port: 3001   │   │   Next.js    │
    └──────┬───────┘   └──────────────┘
           │
           │ Firebase Admin SDK
           ▼
    ┌──────────────┐
    │   Firebase   │
    │  Auth + DB   │
    └──────────────┘
```

## Prerequisites

- GitHub account
- Vercel account (free tier)
- Railway account ($5/month)
- Firebase project set up

## Step 1: Deploy Backend to Railway

### 1.1 Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project"

### 1.2 Deploy from GitHub

1. Click **"Deploy from GitHub repo"**
2. Select your `clockit` repository
3. Railway will detect the monorepo structure

### 1.3 Configure the Service

1. **Root Directory**: Set to `clockit_api`
2. **Build Command**: `npm install && npm run build`
3. **Start Command**: `npm start`
4. **Port**: Railway auto-detects from `PORT` env variable

### 1.4 Add Environment Variables

In Railway dashboard, add these variables:

```bash
# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# API Configuration
NODE_ENV=production
PORT=3001  # Railway will override this

# CORS (allow your Vercel domain)
ALLOWED_ORIGINS=https://your-app.vercel.app,https://clockit.app
```

### 1.5 Get Your API URL

After deployment, Railway provides a URL like:
```
https://clockit-api-production.up.railway.app
```

**Save this URL** - you'll need it for the frontend.

## Step 2: Deploy Frontend to Vercel

### 2.1 Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "Add New Project"

### 2.2 Import GitHub Repository

1. Click **"Import Git Repository"**
2. Select your `clockit` repository
3. Vercel auto-detects Next.js

### 2.3 Configure Build Settings

Vercel should auto-detect from `vercel.json`, but verify:

- **Framework Preset**: Next.js
- **Root Directory**: `clockit_website`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### 2.4 Add Environment Variables

In Vercel dashboard → Settings → Environment Variables:

```bash
# Firebase Client SDK (Public)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# API URL (from Railway)
NEXT_PUBLIC_API_URL=https://clockit-api-production.up.railway.app/api/v1
```

### 2.5 Deploy

Click **"Deploy"** and Vercel will:
1. Build your Next.js app
2. Deploy to edge network
3. Provide a URL like `https://clockit-xyz.vercel.app`

## Step 3: Configure Custom Domain (Optional)

### For Frontend (Vercel)

1. Go to Vercel → Project Settings → Domains
2. Add your domain: `clockit.app`
3. Add DNS records (Vercel provides instructions)
4. SSL is automatic

### For Backend (Railway)

1. Go to Railway → Project Settings → Domains
2. Add custom domain: `api.clockit.app`
3. Add DNS CNAME record pointing to Railway
4. SSL is automatic

### Update CORS

After adding custom domains, update Railway environment variables:

```bash
ALLOWED_ORIGINS=https://clockit.app,https://www.clockit.app
```

And update Vercel:

```bash
NEXT_PUBLIC_API_URL=https://api.clockit.app/api/v1
```

## Step 4: Set Up Automatic Deployments

### 4.1 Enable GitHub Integration

Both Vercel and Railway auto-deploy on push to `main`:

**Vercel**:
- Auto-deploys `clockit_website/**` changes
- Creates preview deployments for PRs

**Railway**:
- Auto-deploys `clockit_api/**` changes
- No preview deployments (on free tier)

### 4.2 Path-Based Deployments

The GitHub Actions workflows in `.github/workflows/` ensure:

- Frontend changes → Only redeploy Vercel
- Backend changes → Only redeploy Railway
- Both updated → Both redeploy

## Step 5: Monitor Deployments

### Vercel Dashboard

- **Deployments**: See all builds and previews
- **Logs**: Real-time build and runtime logs
- **Analytics**: Page views, performance metrics

### Railway Dashboard

- **Deployments**: Build history
- **Logs**: Application logs (stdout/stderr)
- **Metrics**: CPU, memory, network usage

## Troubleshooting

### Frontend Build Fails

1. Check Vercel build logs
2. Verify all environment variables are set
3. Test locally: `cd clockit_website && npm run build`
4. Check Next.js compatibility

### Backend Deployment Fails

1. Check Railway build logs
2. Verify Dockerfile is correct
3. Test locally: `cd clockit_api && npm run build && npm start`
4. Check port configuration (Railway uses `PORT` env var)

### CORS Errors

1. Verify `ALLOWED_ORIGINS` in Railway includes your Vercel URL
2. Check API routes have CORS middleware
3. Ensure Vercel URL matches exactly (https, no trailing slash)

### Firebase Connection Issues

**Frontend**:
- Verify all `NEXT_PUBLIC_FIREBASE_*` variables are set
- Check Firebase console → Project Settings → General

**Backend**:
- Verify service account credentials
- Check `FIREBASE_PRIVATE_KEY` has proper newlines (`\n`)
- Ensure service account has correct permissions

## Environment Variables Summary

### Railway (Backend)

```bash
# Required
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
NODE_ENV=production
ALLOWED_ORIGINS=

# Optional
PORT=3001
LOG_LEVEL=info
```

### Vercel (Frontend)

```bash
# Required
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_API_URL=

# Optional
NEXT_PUBLIC_GA_ID=
```

## Deployment Checklist

Before going live:

- [ ] Backend deployed to Railway
- [ ] Frontend deployed to Vercel
- [ ] Environment variables configured on both platforms
- [ ] Custom domains configured (if applicable)
- [ ] CORS configured correctly
- [ ] Firebase authentication working
- [ ] API endpoints accessible from frontend
- [ ] Test user can sign up and login
- [ ] Feature flags loading correctly
- [ ] Admin features working for admin users
- [ ] Dashboard displaying data
- [ ] CSV upload working
- [ ] SSL certificates valid
- [ ] Error tracking configured (Sentry, LogRocket, etc.)

## Cost Estimates

### Free Tier (Getting Started)

- **Vercel**: Free (Hobby plan)
  - Unlimited deployments
  - 100 GB bandwidth/month
  - Automatic SSL

- **Railway**: $5/month (Starter)
  - 500 hours execution time
  - 512 MB RAM
  - 1 GB disk

- **Firebase**: Free (Spark plan)
  - 10k document reads/day
  - 20k document writes/day
  - 50k authentications/month

**Total**: ~$5/month

### Production (Paid)

- **Vercel Pro**: $20/month
  - Better performance
  - Advanced analytics
  - Team features

- **Railway**: $20/month (Developer)
  - 2 GB RAM
  - 10 GB disk
  - Priority support

- **Firebase Blaze**: Pay-as-you-go
  - ~$25/month for moderate traffic

**Total**: ~$65/month

## Alternative Deployment Options

### Option 2: Vercel for Both

Deploy both to Vercel using Vercel Serverless Functions:

**Pros**:
- Single platform
- Simpler setup
- Cheaper ($0 for hobby)

**Cons**:
- 10-second timeout on functions
- Cold starts
- Not ideal for long-running processes

### Option 3: Render

Deploy both to Render.com:

**Pros**:
- Monorepo support
- Free tier available
- Good DX

**Cons**:
- Slower than Vercel for static sites
- Free tier has limitations

### Option 4: Self-Hosted (DigitalOcean/AWS)

**Pros**:
- Full control
- Potentially cheaper at scale

**Cons**:
- Requires DevOps knowledge
- More maintenance
- No automatic SSL/CDN

## Support & Resources

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **Firebase Docs**: [firebase.google.com/docs](https://firebase.google.com/docs)

## Quick Deploy Commands

### Deploy Frontend Manually

```bash
# Install Vercel CLI
npm i -g vercel

# From project root
cd clockit_website
vercel --prod
```

### Deploy Backend Manually

```bash
# Install Railway CLI
npm i -g @railway/cli

# From project root
cd clockit_api
railway up
```

## Summary

✅ **Frontend (Vercel)**: Auto-deploys from `main`, preview deploys for PRs
✅ **Backend (Railway)**: Auto-deploys from `main`, custom domain support
✅ **Monorepo**: Both apps in single repo, independent deployments
✅ **Cost-Effective**: ~$5/month to start
✅ **Scalable**: Can upgrade as you grow

🚀 **Ready to deploy!**
