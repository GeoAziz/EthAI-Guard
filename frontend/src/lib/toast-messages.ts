/**
 * Day 30 Polish: Centralized toast messages for consistency
 * Ensures uniform error messages and success toasts across the application
 */

export interface ToastMessage {
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
}

export const toastMessages = {
  // Auth messages
  auth: {
    loginSuccess: {
      title: 'Welcome back!',
      description: "You've been successfully logged in.",
    },
    loginFailed: {
      title: 'Authentication Failed',
      description: 'Please check your email and password.',
      variant: 'destructive' as const,
    },
    registerSuccess: {
      title: 'Account Created',
      description: 'Welcome to EthixAI! Your account is ready.',
    },
    registerFailed: {
      title: 'Registration Failed',
      description: 'Unable to create your account. Please try again.',
      variant: 'destructive' as const,
    },
    sessionExpired: {
      title: 'Session Expired',
      description: 'Please log in again to continue.',
      variant: 'destructive' as const,
    },
    unauthorized: {
      title: 'Unauthorized Access',
      description: "You don't have permission to perform this action.",
      variant: 'destructive' as const,
    },
  },

  // Upload messages
  upload: {
    success: {
      title: 'Upload Complete',
      description: 'Your dataset has been uploaded successfully.',
    },
    invalidFormat: {
      title: 'Invalid File Format',
      description: 'Please upload a CSV file.',
      variant: 'destructive' as const,
    },
    tooLarge: {
      title: 'File Too Large',
      description: 'Maximum file size is 50MB. Please upload a smaller file.',
      variant: 'destructive' as const,
    },
    failed: {
      title: 'Upload Failed',
      description: 'Unable to upload your dataset. Please try again.',
      variant: 'destructive' as const,
    },
  },

  // Analysis messages
  analysis: {
    started: {
      title: 'Analysis Started',
      description: 'Your dataset is being analyzed for fairness and compliance.',
    },
    complete: {
      title: 'Analysis Complete',
      description: 'Results are ready to view.',
    },
    failed: {
      title: 'Analysis Failed',
      description: 'Unable to complete the analysis. Please try again.',
      variant: 'destructive' as const,
    },
    fairnessViolation: {
      title: 'Fairness Violation Detected',
      description: 'Your model has fairness issues that need attention.',
      variant: 'destructive' as const,
    },
  },

  // Data quality messages
  dataQuality: {
    missingColumns: {
      title: 'Missing Required Columns',
      description: "Your dataset must include a 'target' column.",
      variant: 'destructive' as const,
    },
    invalidData: {
      title: 'Invalid Data Format',
      description: 'Please check your dataset for formatting errors.',
      variant: 'destructive' as const,
    },
  },

  // Network messages
  network: {
    offline: {
      title: 'Connection Lost',
      description: 'Please check your internet connection.',
      variant: 'destructive' as const,
    },
    timeout: {
      title: 'Request Timeout',
      description: 'The server took too long to respond. Please try again.',
      variant: 'destructive' as const,
    },
    serverError: {
      title: 'Server Error',
      description: 'Something went wrong. Our team has been notified.',
      variant: 'destructive' as const,
    },
  },

  // Generic messages
  generic: {
    success: {
      title: 'Success',
      description: 'Operation completed successfully.',
    },
    error: {
      title: 'Error',
      description: 'Something went wrong. Please try again.',
      variant: 'destructive' as const,
    },
  },
};

/**
 * Helper to get Firebase error-specific messages
 */
export function getFirebaseErrorMessage(errorCode: string): ToastMessage {
  const errorMessages: Record<string, ToastMessage> = {
    'auth/user-not-found': {
      title: 'Account Not Found',
      description: 'No account exists with this email address.',
      variant: 'destructive',
    },
    'auth/wrong-password': {
      title: 'Incorrect Password',
      description: 'The password you entered is incorrect.',
      variant: 'destructive',
    },
    'auth/invalid-email': {
      title: 'Invalid Email',
      description: 'Please enter a valid email address.',
      variant: 'destructive',
    },
    'auth/user-disabled': {
      title: 'Account Disabled',
      description: 'This account has been disabled. Contact support for help.',
      variant: 'destructive',
    },
    'auth/too-many-requests': {
      title: 'Too Many Attempts',
      description: 'Access temporarily blocked due to too many failed attempts.',
      variant: 'destructive',
    },
    'auth/email-already-in-use': {
      title: 'Email Already Registered',
      description: 'An account with this email already exists.',
      variant: 'destructive',
    },
    'auth/weak-password': {
      title: 'Weak Password',
      description: 'Please choose a stronger password (at least 8 characters).',
      variant: 'destructive',
    },
    'auth/operation-not-allowed': {
      title: 'Operation Not Allowed',
      description: 'This authentication method is disabled. Contact support.',
      variant: 'destructive',
    },
  };

  return errorMessages[errorCode] || toastMessages.auth.loginFailed;
}

/**
 * Helper to get HTTP status code messages
 */
export function getHttpErrorMessage(status: number): ToastMessage {
  const statusMessages: Record<number, ToastMessage> = {
    400: {
      title: 'Invalid Request',
      description: 'The request could not be processed. Please check your input.',
      variant: 'destructive',
    },
    401: toastMessages.auth.sessionExpired,
    403: toastMessages.auth.unauthorized,
    404: {
      title: 'Not Found',
      description: 'The requested resource could not be found.',
      variant: 'destructive',
    },
    422: {
      title: 'Validation Error',
      description: 'Please check your input and try again.',
      variant: 'destructive',
    },
    429: {
      title: 'Too Many Requests',
      description: 'Please wait a moment before trying again.',
      variant: 'destructive',
    },
    500: toastMessages.network.serverError,
    502: {
      title: 'Bad Gateway',
      description: 'The server is temporarily unavailable. Please try again later.',
      variant: 'destructive',
    },
    503: {
      title: 'Service Unavailable',
      description: 'The service is temporarily down for maintenance.',
      variant: 'destructive',
    },
  };

  return statusMessages[status] || toastMessages.generic.error;
}
