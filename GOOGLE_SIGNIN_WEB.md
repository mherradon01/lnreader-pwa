# Google Sign-In Web Setup

This document explains how to set up Google Sign-In for the web version of LNReader.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Setup Steps](#setup-steps)
- [How It Works](#how-it-works)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- A Google Cloud Project
- OAuth 2.0 credentials configured
- Node.js 20+ and pnpm 9.15.0 installed

## Setup Steps

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Drive API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google Drive API"
   - Click "Enable"

### 2. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Select "Web application" as the application type
4. Configure the following:
   - **Name**: LNReader Web
   - **Authorized JavaScript origins**: 
     - `http://localhost:3000` (for development)
     - `https://your-production-domain.com` (for production)
   - **Authorized redirect URIs**: (not needed for GIS)
5. Click "Create"
6. Copy the **Client ID** (it looks like `xxxx.apps.googleusercontent.com`)

### 3. Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Select "External" user type (unless you have Google Workspace)
3. Fill in the required fields:
   - App name: LNReader
   - User support email: your email
   - Developer contact: your email
4. Add scopes:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `.../auth/drive.file`
5. Add test users (your email) if the app is in testing mode

### 4. Set Environment Variable

Set the `GOOGLE_CLIENT_ID` environment variable before building:

```bash
# Development
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com pnpm web:dev

# Production build
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com pnpm web:build
```

Or create a `.env` file (don't commit this to git!):

```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### 5. Vercel Deployment

If deploying to Vercel, add the environment variable in Vercel's project settings:

1. Go to your Vercel project
2. Settings → Environment Variables
3. Add `GOOGLE_CLIENT_ID` with your client ID value

## How It Works

The web implementation uses Google Identity Services (GIS) for OAuth2 authentication:

1. User clicks "Sign In" button
2. Google OAuth popup opens
3. User grants permission to access their Google Drive
4. Access token is stored in localStorage
5. Token is used to make Google Drive API requests

## Scopes Used

- `https://www.googleapis.com/auth/userinfo.profile` - Get user profile info
- `https://www.googleapis.com/auth/userinfo.email` - Get user email
- `https://www.googleapis.com/auth/drive.file` - Access files created by LNReader in Google Drive

## Troubleshooting

### "Google Identity Services failed to load"
- Make sure you have internet connectivity
- Check if the GIS script is blocked by any browser extension
- Verify the script tag in index.html is present

### "Failed to sign in with Google"
- Verify your Client ID is correct
- Check if your domain is in the authorized JavaScript origins
- Make sure the OAuth consent screen is configured properly
- Ensure the Google Drive API is enabled

### Token expires quickly
- Google access tokens expire after 1 hour
- The app should handle token refresh automatically
- If issues persist, try signing out and back in

## Security Notes

**⚠️ Important Security Considerations:**

1. **Never commit credentials:** Don't add `.env` files to git
2. **Restrict origins:** Only add trusted domains to authorized origins
3. **Use HTTPS in production:** OAuth requires HTTPS for security
4. **Minimal scopes:** Only request necessary permissions
5. **Regular audits:** Review OAuth consent screen and permissions regularly

## Additional Resources

- [Google Identity Services Documentation](https://developers.google.com/identity/gsi/web)
- [Google Drive API Documentation](https://developers.google.com/drive)
- [OAuth 2.0 Best Practices](https://developers.google.com/identity/protocols/oauth2/web-server#security-considerations)

### Token expired errors
- The implementation automatically handles token refresh
- If issues persist, try signing out and signing in again
