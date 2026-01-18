# Contributing Guide

This project is maintained on a minimal basis - primarily for major bug fixes encountered during use. This guide provides setup instructions for anyone who wants to fork the project or contribute fixes.

## Table of Contents

- [Setting Up Your Environment](#setting-up-your-environment)
- [Development Workflow](#development-workflow)
- [Code Quality](#code-quality)

## Setting Up Your Environment

After forking to your own GitHub account, follow these steps to get started:

```bash
# Prerequisites
node --version >= 20      (use nvm for version management [recommended])
pnpm --version = 9.15.0   (install via: npm install -g pnpm@9.15.0)

# Clone your fork to your local machine
git clone https://github.com/<your-account-name>/lnreader-pwa.git

# Navigate to the project directory
cd lnreader-pwa

# Install dependencies
pnpm install
```

## Development Workflow

### Running the Development Server

```bash
# Start the development server (opens at http://localhost:3000)
pnpm web:dev
```

The app will open in your browser with hot-reload enabled. Changes to source files will automatically refresh the app.

### Building for Production

```bash
# Build the production bundle
pnpm web:build

# Test the production build locally (opens at http://localhost:3001)
pnpm web:serve
```

### Testing PWA Features

To test PWA installation and offline functionality:

1. Build the production version: `pnpm web:build`
2. Serve it locally: `pnpm web:serve`
3. Open in Chrome and use the install button
4. Test offline mode by stopping the server after installation

## Code Quality

This codebase's linting rules are enforced using [ESLint](http://eslint.org/).

It is recommended that you install an eslint plugin for your editor of choice when working on this
codebase, however you can always check to see if the source code is compliant by running:

```bash
pnpm run lint

# auto-fix issues
pnpm run lint:fix

# check formatting
pnpm run format:check

# auto-format code
pnpm run format

# type checking
pnpm run type-check
```
