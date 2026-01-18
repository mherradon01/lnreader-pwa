# Web/PWA Deployment Guide

This guide covers deploying the LNReader PWA to production hosting platforms.

## Prerequisites

- **Node.js:** Version 20 or higher (LTS recommended)
- **pnpm:** Version 9.15.0 (exact version required)
- **Hosting:** A service that supports static sites with HTTPS (required for PWA)
- **SSL Certificate:** HTTPS is mandatory for PWA features to work

## Recommended Platforms

Choose a deployment platform based on your needs:

| Platform | Difficulty | Cost | Best For |
|----------|-----------|------|----------|
| Vercel | Easy | Free tier available | Quick deployment, auto-deploy from git |
| Netlify | Easy | Free tier available | Simple hosting with forms/functions |
| Custom Server | Medium | Variable | Full control, custom domain |

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Build the production bundle:**
   ```bash
   pnpm web:build
   ```

   This creates a `web-build/` directory with:
   - Optimized JavaScript bundles
   - Service worker for offline support
   - Static assets (images, fonts, etc.)
   - index.html entry point

3. **Test locally:**
   ```bash
   pnpm web:serve
   ```
   
   Open http://localhost:3001 in your browser (default port for production serve).

## Deployment Options

Choose a deployment platform based on your needs:

| Platform | Difficulty | Cost | Features |
|----------|-----------|------|----------|
| Vercel | Easy | Free tier available | Auto-deploy, CDN, Analytics |
| Netlify | Easy | Free tier available | Auto-deploy, Forms, Functions |
| GitHub Pages | Medium | Free | Simple hosting |
| Custom Server | Hard | Variable | Full control |

### Option 1: Vercel (Recommended)

Vercel offers excellent support for React apps and PWAs.

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Create vercel.json:**
   ```json
   {
     "buildCommand": "pnpm web:build",
     "outputDirectory": "web-build",
     "framework": null,
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ],
     "headers": [
       {
         "source": "/service-worker.js",
         "headers": [
           {
             "key": "Cache-Control",
             "value": "public, max-age=0, must-revalidate"
           }
         ]
       },
       {
         "source": "/(.*)",
         "headers": [
           {
             "key": "X-Content-Type-Options",
             "value": "nosniff"
           },
           {
             "key": "X-Frame-Options",
             "value": "DENY"
           },
           {
             "key": "X-XSS-Protection",
             "value": "1; mode=block"
           }
         ]
       }
     ]
   }
   ```

3. **Deploy:**
   ```bash
   vercel
   ```

### Option 2: Netlify

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Create netlify.toml:**
   ```toml
   [build]
     command = "pnpm web:build"
     publish = "web-build"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200

   [[headers]]
     for = "/service-worker.js"
     [headers.values]
       Cache-Control = "public, max-age=0, must-revalidate"

   [[headers]]
     for = "/*"
     [headers.values]
       X-Frame-Options = "DENY"
       X-Content-Type-Options = "nosniff"
       X-XSS-Protection = "1; mode=block"
   ```

3. **Deploy:**
   ```bash
   netlify deploy --prod
   ```

### Option 3: Custom Server (Nginx)

1. **Build the app:**
   ```bash
   pnpm web:build
   ```

2. **Copy files to server:**
   ```bash
   scp -r web-build/* user@server:/var/www/lnreader
   ```

3. **Configure Nginx:**
   ```nginx
   server {
       listen 80;
       listen [::]:80;
       server_name lnreader.example.com;
       
       # Redirect to HTTPS
       return 301 https://$server_name$request_uri;
   }

   server {
       listen 443 ssl http2;
       listen [::]:443 ssl http2;
       server_name lnreader.example.com;

       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;

       root /var/www/lnreader;
       index index.html;

       # Service worker cache control
       location /service-worker.js {
           add_header Cache-Control "public, max-age=0, must-revalidate";
       }

       # Static assets with long cache
       location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
           expires 1y;
           add_header Cache-Control "public, immutable";
       }

       # Security headers
       add_header X-Frame-Options "DENY" always;
       add_header X-Content-Type-Options "nosniff" always;
       add_header X-XSS-Protection "1; mode=block" always;

       # SPA routing
       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```

4. **Restart Nginx:**
   ```bash
   sudo systemctl restart nginx
   ```

## Post-Deployment Checklist

### 1. Verify HTTPS
- [ ] Site loads over HTTPS
- [ ] No mixed content warnings
- [ ] Valid SSL certificate

### 2. Test PWA Installation
- [ ] Install prompt appears on mobile
- [ ] App installs correctly
- [ ] App icon shows in launcher/home screen
- [ ] App opens in standalone mode

### 3. Test Service Worker
- [ ] Service worker registers successfully
- [ ] Offline mode works
- [ ] Assets are cached
- [ ] Check DevTools > Application > Service Workers

### 4. Performance Testing
- [ ] Run Lighthouse audit (score > 90)
- [ ] Check Core Web Vitals
- [ ] Test on slow 3G connection
- [ ] Verify bundle sizes are reasonable

### 5. Cross-Browser Testing
- [ ] Chrome/Edge (Desktop & Mobile)
- [ ] Safari (Desktop & iOS)
- [ ] Firefox (Desktop & Mobile)

### 6. Functionality Testing
- [ ] Navigation works
- [ ] Core features functional
- [ ] Data persists correctly
- [ ] No console errors

## Continuous Deployment

### GitHub Actions Example

Create `.github/workflows/deploy-web.yml`:

```yaml
name: Deploy Web App

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install pnpm
        run: npm install -g pnpm@9.15.0
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build
        run: pnpm web:build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./web-build
```

## Monitoring

### Analytics
Consider adding:
- Google Analytics
- Plausible Analytics (privacy-friendly)
- Vercel Analytics
- Custom event tracking

### Error Tracking
Recommended tools:
- Sentry
- LogRocket
- Rollbar

### Performance Monitoring
- Google Lighthouse CI
- WebPageTest
- Chrome User Experience Report

## Updating the App

1. **Make changes to code**
2. **Test locally:** `pnpm web:dev`
3. **Build:** `pnpm web:build`
4. **Deploy:** Follow your chosen deployment method
5. **Service worker will automatically update** on user's next visit

## Troubleshooting

### Service Worker Not Updating
- Clear browser cache
- Unregister service worker in DevTools
- Check `Cache-Control` headers

### PWA Not Installable
- Verify HTTPS is working
- Check manifest.json is accessible
- Verify icons are loading
- Check browser console for errors

### Build Errors
- Clear `node_modules` and `pnpm-lock.yaml`
- Run `pnpm install` fresh
- Check Node.js version (needs 20+)

### Performance Issues
- Enable code splitting
- Lazy load routes
- Optimize images
- Review bundle size with `webpack-bundle-analyzer`

## Resources

- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Vercel Docs](https://vercel.com/docs)
- [Netlify Docs](https://docs.netlify.com/)
- [GitHub Pages Docs](https://pages.github.com/)
