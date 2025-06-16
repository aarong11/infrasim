# Cloudflare Deployment Guide for InfraSim

This guide covers deploying the InfraSim app to Cloudflare, with the frontend on Cloudflare Pages and the backend API on Cloudflare Workers.

## 🏗️ Architecture Overview

- **Frontend**: React/Next.js app deployed to Cloudflare Pages (static)
- **Backend**: LangChain-based API deployed to Cloudflare Workers (serverless)
- **Routing**: All `/api/*` calls route from Pages to Workers

## 📋 Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Wrangler CLI**: Install globally or use the project's local version
3. **Node.js 18+**: Required for building and deploying
4. **API Keys**: Lambda Labs, OpenAI, or Anthropic keys for LLM functionality

## 🚀 Quick Deploy

### 1. Install Dependencies
```bash
yarn install
```

### 2. Configure Wrangler
```bash
# Login to Cloudflare
npx wrangler login

# Get your account ID
npx wrangler whoami
```

### 3. Update Configuration
Edit `wrangler.toml` and replace:
- `zone_name = "your-domain.com"` with your actual domain
- Update environment variables in Cloudflare dashboard

### 4. Build and Deploy
```bash
# Build frontend for Pages
yarn build:pages

# Deploy Pages
yarn deploy:pages

# Deploy Worker
yarn deploy:worker

# Or deploy everything at once
yarn deploy:all
```

## 🔧 Local Development with Cloudflare

### Start Local Cloudflare Environment
```bash
# Start both Next.js dev server and Wrangler dev server
yarn dev:cf

# Or start individually:
yarn dev:worker      # Cloudflare Worker at http://localhost:8787
yarn next:dev        # Next.js frontend at http://localhost:3000
```

## 🌍 Environment Variables

### Cloudflare Workers (Backend)
Set these in the Cloudflare dashboard under Workers > Settings > Variables:

```bash
LAMBDA_LABS_API_KEY=secret_rng_...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
NODE_ENV=production
```

### Cloudflare Pages (Frontend)
Set these in the Cloudflare dashboard under Pages > Settings > Environment Variables:

```bash
NEXT_PUBLIC_API_URL=https://your-worker-domain.workers.dev
NODE_ENV=production
```

## 🔄 CI/CD with GitHub Actions

The included GitHub Actions workflow (`.github/workflows/deploy.yml`) automatically deploys on push to main/develop branches.

### Required GitHub Secrets:
- `CLOUDFLARE_API_TOKEN`: Create at cloudflare.com/profile/api-tokens
- `CLOUDFLARE_ACCOUNT_ID`: Found in Workers dashboard
- `CLOUDFLARE_WORKER_URL`: Your worker's URL (e.g., https://infrasim-api.workers.dev)
- `LAMBDA_LABS_API_KEY`: Your Lambda Labs API key
- `OPENAI_API_KEY`: Your OpenAI API key
- `ANTHROPIC_API_KEY`: Your Anthropic API key

## 📁 Project Structure for Deployment

```
infrasim/
├── src/                    # Next.js app source
│   ├── app/               # App Router pages and API routes
│   ├── components/        # React components
│   ├── core/             # Business logic
│   └── config/api.ts     # API configuration for Cloudflare
├── worker/               # Cloudflare Worker source
│   └── index.ts         # Worker entry point
├── out/                 # Built static files for Pages
├── wrangler.toml        # Worker configuration
├── wrangler.pages.toml  # Pages configuration
└── .github/workflows/   # CI/CD automation
```

## 🛠️ Advanced Configuration

### Custom Domain Setup
1. Add your domain to Cloudflare
2. Update `wrangler.toml` with your zone name
3. Configure DNS records for Pages and Workers

### Database Integration
For persistent storage, consider:
- Cloudflare D1 (SQLite)
- Cloudflare KV (Key-Value)
- External database with connection pooling

### Monitoring and Logs
- Use Cloudflare Analytics
- Worker logs available in dashboard
- Add structured logging to your Worker

## 🔍 Troubleshooting

### Common Issues:

1. **Worker Deployment Fails**
   - Check API token permissions
   - Verify account ID is correct
   - Ensure all required secrets are set

2. **Pages Build Fails**
   - Check `next.config.js` export configuration
   - Verify all dependencies are installed
   - Check for server-side code in client components

3. **API Calls Fail**
   - Verify `NEXT_PUBLIC_API_URL` environment variable
   - Check CORS headers in Worker
   - Ensure Worker routes are configured correctly

### Debug Commands:
```bash
# Test Worker locally
yarn dev:worker

# Check Pages build
yarn build:pages

# View deployment logs
npx wrangler tail

# Test API endpoints
curl https://your-worker.workers.dev/api/health
```

## 📚 Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)

## 🎯 Performance Tips

1. **Worker Optimization**:
   - Minimize cold start time
   - Use streaming for large responses
   - Implement proper caching

2. **Pages Optimization**:
   - Enable Cloudflare's optimization features
   - Use proper image optimization
   - Implement service worker for offline support

3. **Cost Optimization**:
   - Monitor Worker execution time
   - Use KV for caching expensive operations
   - Implement request batching where possible