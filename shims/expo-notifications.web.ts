// Web shim for expo-notifications
// Uses the Web Notifications API where available

export const DEFAULT_ACTION_IDENTIFIER = 'expo.modules.notifications.actions.DEFAULT';

export enum AndroidNotificationPriority {
  MIN = 'min',
  LOW = 'low',
  DEFAULT = 'default',
  HIGH = 'high',
  MAX = 'max',
}

export enum IosAuthorizationStatus {
  NOT_DETERMINED = 0,
  DENIED = 1,
  AUTHORIZED = 2,
  PROVISIONAL = 3,
  EPHEMERAL = 4,
}

interface NotificationContent {
  title?: string | null;
  subtitle?: string | null;
  body?: string | null;
  data?: Record<string, unknown>;
  sound?: boolean | string | null;
  badge?: number | null;
}

interface NotificationRequest {
  content: NotificationContent;
  trigger: null | { seconds: number } | { date: Date | number };
  identifier?: string;
}

interface NotificationPermissionsStatus {
  status: 'granted' | 'denied' | 'undetermined';
  expires: 'never';
  granted: boolean;
  canAskAgain: boolean;
  ios?: {
    status: IosAuthorizationStatus;
    allowsDisplayInNotificationCenter: boolean;
    allowsDisplayOnLockScreen: boolean;
    allowsDisplayInCarPlay: boolean;
    allowsAlert: boolean;
    allowsBadge: boolean;
    allowsSound: boolean;
    allowsCriticalAlerts: boolean;
    allowsAnnouncements: boolean;
    providesAppNotificationSettings: boolean;
  };
}

// Request permissions using Web Notifications API
export async function requestPermissionsAsync(): Promise<NotificationPermissionsStatus> {
  if (!('Notification' in window)) {
    return {
      status: 'denied',
      expires: 'never',
      granted: false,
      canAskAgain: false,
    };
  }

  const permission = await Notification.requestPermission();
  
  return {
    status: permission === 'granted' ? 'granted' : permission === 'denied' ? 'denied' : 'undetermined',
    expires: 'never',
    granted: permission === 'granted',
    canAskAgain: permission === 'default',
  };
}

export async function getPermissionsAsync(): Promise<NotificationPermissionsStatus> {
  if (!('Notification' in window)) {
    return {
      status: 'denied',
      expires: 'never',
      granted: false,
      canAskAgain: false,
    };
  }

  const permission = Notification.permission;
  
  return {
    status: permission === 'granted' ? 'granted' : permission === 'denied' ? 'denied' : 'undetermined',
    expires: 'never',
    granted: permission === 'granted',
    canAskAgain: permission === 'default',
  };
}

// Schedule a notification
export async function scheduleNotificationAsync(
  request: NotificationRequest
): Promise<string> {
  const identifier = request.identifier || Math.random().toString(36).substring(2);
  
  if (!('Notification' in window)) {
    console.debug('Web Notifications API not supported');
    return identifier;
  }

  if (Notification.permission !== 'granted') {
    console.debug('Notification permission not granted');
    return identifier;
  }

  const showNotification = () => {
    const notification = new Notification(request.content.title || '', {
      body: request.content.body || undefined,
      icon: '/favicon.ico',
      tag: identifier,
      data: request.content.data,
    });

    // Store reference for potential dismissal
    _activeNotifications.set(identifier, notification);

    notification.onclose = () => {
      _activeNotifications.delete(identifier);
    };
  };

  if (request.trigger === null) {
    // Immediate notification
    showNotification();
  } else if ('seconds' in request.trigger) {
    // Delayed notification
    setTimeout(showNotification, request.trigger.seconds * 1000);
  } else if ('date' in request.trigger) {
    // Scheduled notification
    const date = request.trigger.date instanceof Date 
      ? request.trigger.date.getTime() 
      : request.trigger.date;
    const delay = date - Date.now();
    if (delay > 0) {
      setTimeout(showNotification, delay);
    } else {
      showNotification();
    }
  }

  return identifier;
}

// Store for active notifications
const _activeNotifications = new Map<string, Notification>();

// Cancel a scheduled notification
export async function cancelScheduledNotificationAsync(identifier: string): Promise<void> {
  const notification = _activeNotifications.get(identifier);
  if (notification) {
    notification.close();
    _activeNotifications.delete(identifier);
  }
}

// Cancel all scheduled notifications
export async function cancelAllScheduledNotificationsAsync(): Promise<void> {
  _activeNotifications.forEach((notification) => notification.close());
  _activeNotifications.clear();
}

// Dismiss a notification
export async function dismissNotificationAsync(identifier: string): Promise<void> {
  return cancelScheduledNotificationAsync(identifier);
}

// Dismiss all notifications
export async function dismissAllNotificationsAsync(): Promise<void> {
  return cancelAllScheduledNotificationsAsync();
}

// Get all scheduled notifications (simplified - web doesn't support this well)
export async function getAllScheduledNotificationsAsync(): Promise<NotificationRequest[]> {
  return [];
}

// Set notification handler
let _notificationHandler: {
  handleNotification: (notification: unknown) => Promise<{
    shouldShowAlert: boolean;
    shouldPlaySound: boolean;
    shouldSetBadge: boolean;
  }>;
} | null = null;

export function setNotificationHandler(handler: typeof _notificationHandler): void {
  _notificationHandler = handler;
}

// Get the notification handler
export function getNotificationHandler(): typeof _notificationHandler {
  return _notificationHandler;
}

// Set badge count (not supported on most web browsers)
export async function setBadgeCountAsync(badgeCount: number): Promise<boolean> {
  if ('setAppBadge' in navigator) {
    try {
      if (badgeCount === 0) {
        await (navigator as any).clearAppBadge();
      } else {
        await (navigator as any).setAppBadge(badgeCount);
      }
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

// Get badge count
export async function getBadgeCountAsync(): Promise<number> {
  return 0;
}

// Add notification listeners (simplified for web)
export function addNotificationReceivedListener(
  listener: (event: unknown) => void
): { remove: () => void } {
  return { remove: () => {} };
}

export function addNotificationResponseReceivedListener(
  listener: (event: unknown) => void
): { remove: () => void } {
  return { remove: () => {} };
}

export function addNotificationsDroppedListener(
  listener: () => void
): { remove: () => void } {
  return { remove: () => {} };
}

// Remove all listeners
export function removeAllNotificationListeners(): void {
  // No-op for web
}

// Set notification channel (Android only, no-op on web)
export async function setNotificationChannelAsync(
  channelId: string,
  channel: unknown
): Promise<unknown> {
  return null;
}

// Get notification channels
export async function getNotificationChannelsAsync(): Promise<unknown[]> {
  return [];
}

// Delete notification channel
export async function deleteNotificationChannelAsync(channelId: string): Promise<void> {
  // No-op
}

// Set notification category (iOS only, no-op on web)
export async function setNotificationCategoryAsync(
  categoryId: string,
  actions: unknown[] = []
): Promise<void> {
  // No-op for web
}

// Get notification categories
export async function getNotificationCategoriesAsync(): Promise<unknown[]> {
  return [];
}

// Present notification immediately (alias for scheduleNotificationAsync with null trigger)
export async function presentNotificationAsync(
  content: NotificationContent
): Promise<string> {
  return scheduleNotificationAsync({
    content,
    trigger: null,
  });
}

export default {
  DEFAULT_ACTION_IDENTIFIER,
  AndroidNotificationPriority,
  IosAuthorizationStatus,
  requestPermissionsAsync,
  getPermissionsAsync,
  scheduleNotificationAsync,
  cancelScheduledNotificationAsync,
  cancelAllScheduledNotificationsAsync,
  dismissNotificationAsync,
  dismissAllNotificationsAsync,
  getAllScheduledNotificationsAsync,
  setNotificationHandler,
  getNotificationHandler,
  setBadgeCountAsync,
  getBadgeCountAsync,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  addNotificationsDroppedListener,
  removeAllNotificationListeners,
  setNotificationChannelAsync,
  getNotificationChannelsAsync,
  deleteNotificationChannelAsync,
  setNotificationCategoryAsync,
  getNotificationCategoriesAsync,
  presentNotificationAsync,
};
