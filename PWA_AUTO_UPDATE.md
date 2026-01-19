# PWA Auto-Update Implementation

## Overview
Implemented a complete PWA auto-update system that allows devices to automatically detect and notify users when a new version of LNReader is available, enabling seamless updates.

## How It Works

### 1. Service Worker Update Detection
The service worker (`src-sw.js`) now:
- Listens for `message` events from the client
- Responds to `SKIP_WAITING` messages to activate new versions immediately
- Automatically skips the waiting period during installation

### 2. Service Worker Registration Enhancement (`index.web.tsx`)
Updated the service worker registration to:
- Check for updates when the page loads via `registration.update()`
- Listen for `updatefound` events
- Detect when a new service worker enters the `installed` state
- Show a confirmation dialog asking the user to reload
- Send a `SKIP_WAITING` message to activate the new version

### 3. Update Detection Hook (`src/hooks/common/useServiceWorkerUpdate.ts`)
Created a custom React hook that:
- Monitors for service worker updates
- Detects when a new SW is waiting to be activated
- Provides a `skipWaiting()` function to activate updates
- Checks for updates periodically (every hour)
- Listens to controller changes to know when the update is active

### 4. Update Notification Component (`src/components/PWAUpdateNotification.tsx`)
A new Snackbar component that:
- Displays when an update is available
- Shows a message: "New update available"
- Includes an "Update" button that:
  - Activates the new service worker
  - Reloads the page to load the new version
- Auto-dismisses after 5 seconds (unless the user taps Update)

### 5. App Integration (`App.web.tsx`)
Integrated the update system into the main web app by:
- Importing the `useServiceWorkerUpdate` hook
- Monitoring for update availability
- Showing the notification component when updates are available
- Passing the `skipWaiting` function to handle user clicks

## Files Modified

1. **src-sw.js** - Added message event listener for PWA updates
2. **index.web.tsx** - Enhanced service worker registration with update detection
3. **src/hooks/common/useServiceWorkerUpdate.ts** - NEW: Custom hook for update detection
4. **src/components/PWAUpdateNotification.tsx** - NEW: Notification UI component
5. **App.web.tsx** - Integrated PWA update feature
6. **src/hooks/index.ts** - Exported the new hook
7. **src/components/index.ts** - Exported the new component

## Features

✅ **Automatic Detection** - Detects new versions as soon as they're deployed
✅ **Non-Intrusive** - Uses snackbar notification (not a modal popup)
✅ **User Control** - Users can dismiss or update at their convenience
✅ **Smart Caching** - Leverages Workbox's precaching for efficient updates
✅ **Periodic Checks** - Checks for updates every hour automatically
✅ **Fallback Support** - Works with native browser service worker fallbacks

## User Experience

When a new version is deployed:
1. The service worker detects the changes (via regular checks or on page load)
2. A snackbar appears at the bottom saying "New update available"
3. User can tap "Update" to reload immediately with the new version
4. Or they can dismiss it and update later

The update happens automatically when the new service worker is installed, but requires a page reload to take effect.

## Technical Details

- Uses the Service Worker Cache API with Workbox for efficient caching
- Updates are checked on page load and every 60 minutes afterward
- Implements the `SKIP_WAITING` pattern for immediate activation
- Properly handles service worker lifecycle events
- Fully compatible with web PWA standards

## Browser Support

Works on all modern browsers that support:
- Service Workers (Chrome, Firefox, Safari 15+, Edge)
- Web App Manifest
- Cache API

## Testing

To test the update feature:
1. Make changes to the code and deploy a new version
2. Open the app in a browser
3. The snackbar should appear when the new SW is detected
4. Click "Update" to reload with the new version
