# Quick Start Guide

This guide covers how to use and develop the LNReader Progressive Web App.

## For End Users

### Accessing the Web App

1. **Open in Browser:**
   - Navigate to the web app URL in your browser
   - Works on Chrome, Firefox, Safari, Edge, and other modern browsers
   - Requires a modern browser with JavaScript enabled

2. **Install as App (PWA):**
   
   **On Desktop (Chrome/Edge):**
   - Look for the install icon (⊕) in the address bar
   - Click it and follow the prompts
   - App will be added to your applications

   **On Mobile (Android):**
   - Tap the menu (⋮) button
   - Select "Add to Home screen"
   - Confirm to install

   **On Mobile (iOS/Safari):**
   - Tap the Share button
   - Scroll and tap "Add to Home Screen"
   - Tap "Add" to confirm

3. **Use Offline:**
   - Once installed, the app works offline
   - Previously viewed content is cached
   - Sync when back online

### Features

✅ **Available:**
- Browse and search light novels
- Read chapters with customizable reader settings
- Bookmark and track reading progress
- Manage your library
- Customize app settings and themes
- Offline reading (previously viewed content is cached)
- Works on all platforms (Windows, macOS, Linux, iOS, Android)
- No app store required - install directly from browser

## For Developers

### Development Setup

1. **Prerequisites:**
   ```bash
   # Required:
   - Node.js 20 or higher
   - pnpm 9.15.0 (exact version)
   
   # Install pnpm if not already installed:
   npm install -g pnpm@9.15.0
   
   # Verify installations:
   node --version   # Should be >= 20
   pnpm --version   # Should be 9.15.0
   ```

2. **Clone and Install:**
   ```bash
   git clone <repository-url>
   cd lnreader-pwa
   pnpm install
   ```

3. **Start Development Server:**
   ```bash
   pnpm web:dev
   ```
   
   Opens at http://localhost:3000 with hot reload.

4. **Build for Production:**
   ```bash
   pnpm web:build
   ```
   
   Output in `web-build/` directory.

5. **Test Production Build:**
   ```bash
   pnpm web:serve
   ```

### Project Structure

```
lnreader-pwa/
├── public/              # Static assets
│   ├── index.html       # HTML template
│   ├── manifest.json    # PWA manifest
│   └── *.png           # Icons
├── src/                 # Source code
│   ├── components/      # React components
│   ├── screens/         # Screen components
│   ├── services/        # Business logic
│   └── utils/           # Utilities
├── specs/               # Native module specs
│   └── *.web.ts        # Web implementations
├── shims/               # Web polyfills
│   └── *.web.ts        # Module shims
├── App.web.tsx          # Web-specific app root
├── index.web.tsx        # Web entry point
├── webpack.config.js    # Webpack configuration
├── src-sw.js           # Service worker
└── MIGRATION.md        # Migration details
```

### Key Files

- **webpack.config.js**: Build configuration
- **App.web.tsx**: Web-specific app component
- **index.web.tsx**: Entry point for web
- **public/manifest.json**: PWA configuration
- **src-sw.js**: Service worker for offline support
- **shims/*.web.ts**: Native module replacements

### Development Commands

```bash
# Development
pnpm web:dev              # Start dev server

# Building
pnpm web:build            # Production build

# Testing
pnpm web:serve            # Serve production build
pnpm lint                 # Run linter
pnpm type-check           # TypeScript check

# Android (still available)
pnpm dev:android          # Run on Android
pnpm build:release:android # Build Android APK
```

### Making Changes

1. **Edit source files** in `src/`
2. **Test in browser** via `pnpm web:dev`
3. **Check build** via `pnpm web:build`
4. **Commit changes**

### Adding New Features

For web-compatible features:
1. Write code as normal React Native
2. Test on web with `pnpm web:dev`
3. If using native modules, add web shim in `shims/`

For native-only features:
1. Use Platform.OS checks:
   ```typescript
   if (Platform.OS === 'web') {
     // Web implementation
   } else {
     // Native implementation
   }
   ```

2. Or create platform-specific files:
   ```
   Component.tsx      # Shared
   Component.web.tsx  # Web-specific
   Component.native.tsx # Native-specific
   ```

### Debugging

**Browser DevTools:**
- Console: Check for errors
- Network: Monitor requests
- Application: Service worker, storage
- Performance: Profile performance

**React DevTools:**
- Install React DevTools extension
- Inspect component tree
- Check props and state

**Common Issues:**

1. **Module not found:**
   - Check webpack aliases in `webpack.config.js`
   - May need web-specific shim

2. **Native module error:**
   - Create shim in `shims/` directory
   - Add alias in webpack config

3. **Build fails:**
   - Check Node.js version (20+)
   - Clear `node_modules` and reinstall
   - Check console for specific error

### Testing

1. **Unit Tests** (if added):
   ```bash
   pnpm test
   ```

2. **Manual Testing:**
   - Test in Chrome, Firefox, Safari
   - Test on mobile devices
   - Test offline functionality
   - Test PWA installation

3. **Lighthouse Audit:**
   - Open DevTools
   - Go to Lighthouse tab
   - Run audit
   - Aim for score > 90

### Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full deployment guide.

Quick deploy to Vercel:
```bash
npm install -g vercel
pnpm web:build
vercel
```

### Resources

- **Full Migration Guide:** [MIGRATION.md](./MIGRATION.md)
- **Deployment Guide:** [DEPLOYMENT.md](./DEPLOYMENT.md)
- **React Native Web:** https://necolas.github.io/react-native-web/
- **PWA Docs:** https://web.dev/progressive-web-apps/

### Getting Help

- Check documentation in this repo
- Search existing issues
- Open new issue with:
  - Clear description
  - Steps to reproduce
  - Browser/OS info
  - Console errors

### Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly (Android + Web)
5. Submit pull request

---

**Note:** This is a work in progress. The web version is functional but may have some limitations compared to the native Android app. See MIGRATION.md for details.
