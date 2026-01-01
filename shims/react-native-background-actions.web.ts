// Web implementation for react-native-background-actions
// Uses async execution to simulate background tasks on web

interface BackgroundTaskOptions {
  taskName: string;
  taskTitle: string;
  taskDesc: string;
  taskIcon?: { name: string; type: string };
  color?: string;
  linkingURI?: string;
  parameters?: Record<string, unknown>;
}

type TaskFunction = (parameters?: Record<string, unknown>) => Promise<void>;

let _isRunning = false;
let _currentTask: Promise<void> | null = null;
let _abortController: AbortController | null = null;

const BackgroundService = {
  start: async (task: TaskFunction, options: BackgroundTaskOptions) => {
    if (_isRunning) {
      console.warn('BackgroundService: A task is already running');
      return;
    }

    _isRunning = true;
    _abortController = new AbortController();

    // Show browser notification if supported
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(options.taskTitle, {
        body: options.taskDesc,
        icon: '/favicon.ico',
      });
    }

    // Run the task asynchronously
    _currentTask = task(options.parameters)
      .catch((error) => {
        console.error('BackgroundService task error:', error);
        throw error;
      })
      .finally(() => {
        _isRunning = false;
        _currentTask = null;
        _abortController = null;
      });

    return _currentTask;
  },

  stop: async () => {
    if (_abortController) {
      _abortController.abort();
    }
    _isRunning = false;
    _currentTask = null;
    _abortController = null;
  },

  updateNotification: async (options: { taskDesc?: string; taskTitle?: string }) => {
    // On web, we can't update notifications easily, but we can log for debugging
    if (options.taskDesc || options.taskTitle) {
      console.debug('BackgroundService:', options.taskTitle || '', options.taskDesc || '');
    }
  },

  isRunning: () => _isRunning,
};

export default BackgroundService;
