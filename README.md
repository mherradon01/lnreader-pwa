<p align="center">
  <a href="https://lnreader.app">
    <img src="./.github/readme-images/icon_new.png" align="center" width="128" />
  </a>
</p>

<h1 align="center">LNReader</h1>

<p align="center">
  LNReader is a free and open source light novel reader for the web (Progressive Web App).
</p>

<div align="center">
  <a href="https://discord.gg/QdcWN4MD63">
    <img alt="Discord Chat" src="https://img.shields.io/discord/835746409357246465.svg?logo=discord&logoColor=white&logoWidth=20&labelColor=5865F2&color=4752C4&label=discord&style=flat">
  </a>
  <a href="https://github.com/LNReader/lnreader/releases">
    <img alt="GitHub Downloads" src="https://img.shields.io/github/downloads/LNReader/lnreader/total?label=downloads&labelColor=27303D&color=0D1117&logo=github&logoColor=FFFFFF&style=flat">
  </a>
</div>

<div align="center">
  <img alt="GitHub Actions Workflow Status" src="https://img.shields.io/github/actions/workflow/status/LNReader/lnreader/build.yml?labelColor=27303D&style=flat">
  <a href="https://github.com/LNReader/lnreader/blob/main/LICENSE">
    <img alt="GitHub" src="https://img.shields.io/github/license/LNReader/lnreader?labelColor=27303D&color=1a73e8&style=flat">
  </a>
  <a title="Crowdin" target="_blank" href="https://crowdin.com/project/lnreader">
    <img src="https://badges.crowdin.net/lnreader/localized.svg">
  </a>
</div>

## 📖 Table of Contents

- [About](#about)
- [Installation](#installation)
- [Features](#features)
- [Screenshots](#screenshots)
- [Plugins](#plugins)
- [Translation](#translation)
- [Contributing](#contributing)
- [Documentation](#documentation)

<h2 align="center">About</h2>

LNReader is a Progressive Web App (PWA) that allows you to read light novels from various sources. It works on any device with a modern web browser and can be installed like a native app.

<h2 align="center">Installation</h2>

Access LNReader through any modern web browser and install it as a Progressive Web App:

### How to Install

**On Desktop (Chrome/Edge):**
1. Visit the app URL in your browser
2. Look for the install icon (⊕) in the address bar
3. Click it and follow the prompts

**On Mobile (Android):**
1. Open the app URL in Chrome
2. Tap the menu (⋮) button
3. Select "Add to Home screen"

**On Mobile (iOS/Safari):**
1. Open the app URL in Safari
2. Tap the Share button
3. Scroll and tap "Add to Home Screen"

### Features
- ✅ Works on desktop and mobile browsers
- ✅ Installable on any device (works like a native app)
- ✅ Offline reading support with service workers
- ✅ Cross-platform (Windows, macOS, Linux, iOS, Android)
- ✅ Auto-updates when new versions are deployed
- ✅ No app store required

**Running locally:**
```bash
# Install dependencies (requires Node.js 20+ and pnpm 9.15.0)
pnpm install

# Development mode (http://localhost:3000)
pnpm web:dev

# Build for production
pnpm web:build

# Serve production build (http://localhost:3001)
pnpm web:serve
```

See [QUICKSTART.md](./QUICKSTART.md) for detailed setup guide and [MIGRATION.md](./MIGRATION.md) for technical migration details.

<h2 align="center">Screenshots</h2>

<p align="center">
  <img src="./.github/readme-images/screenshots.png" align="center" />
</p>

## Plugins

LNReader does not have any affiliation with the content providers available.

Plugin requests should be created at [lnreader-plugins](https://github.com/LNReader/lnreader-plugins).

## Translation

Help translate LNReader into your language on [Crowdin](https://crowdin.com/project/lnreader).

## Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) before submitting pull requests.

### Development Setup

See [QUICKSTART.md](./QUICKSTART.md) for development setup instructions.

## Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - Quick start guide for users and developers
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Contribution guidelines and development setup
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment guide for production
- **[GOOGLE_SIGNIN_WEB.md](./GOOGLE_SIGNIN_WEB.md)** - Google Sign-In setup guide
- **[CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)** - Community guidelines

## License

LNReader is licensed under the [GPL-3.0 License](./LICENSE).

## Support

- **Discord:** [Join our community](https://discord.gg/QdcWN4MD63)
- **Issues:** [GitHub Issues](https://github.com/LNReader/lnreader/issues)
- **Plugins:** [lnreader-plugins](https://github.com/LNReader/lnreader-plugins)

## Building & Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

## License

[MIT](https://github.com/LNReader/lnreader/blob/main/LICENSE)
