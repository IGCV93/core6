/**
 * Retry Logic with Exponential Backoff
 * Implements infinite retry for transient errors, immediate fail for permanent errors
 */

/**
 * Retry configuration
 */
export interface RetryConfig {
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  timeout: number;
  onRetry?: (attempt: number, error: any, nextDelay: number) => void;
}

/**
 * Error classification result
 */
interface ErrorClassification {
  isRetryable: boolean;
  errorType: 'rate_limit' | 'server_error' | 'network_error' | 'timeout' | 'auth_error' | 'client_error' | 'parsing_error' | 'unknown';
  statusCode?: number;
  message: string;
}

/**
 * Default configurations
 */
export const DEFAULT_OCR_RETRY_CONFIG: RetryConfig = {
  initialDelayMs: 1000,      // Start with 1 second
  maxDelayMs: 30000,         // Cap at 30 seconds
  backoffMultiplier: 2,      // Double each time
  timeout: 30000             // 30 second timeout per attempt
};

export const DEFAULT_POLL_RETRY_CONFIG: RetryConfig = {
  initialDelayMs: 2000,      // Start with 2 seconds
  maxDelayMs: 60000,         // Cap at 60 seconds
  backoffMultiplier: 2,      // Double each time
  timeout: 60000             // 60 second timeout per attempt
};

/**
 * Classify error to determine if it's retryable
 */
export function classifyError(error: any): ErrorClassification {
  // Anthropic SDK error with status code
  if (error?.status) {
    const status = error.status;
    
    // Rate limit - definitely retry
    if (status === 429) {
      return {
        isRetryable: true,
        errorType: 'rate_limit',
        statusCode: status,
        message: 'Rate limit exceeded'
      };
    }
    
    // Server errors (5xx) - retry
    if (status >= 500 && status < 600) {
      return {
        isRetryable: true,
        errorType: 'server_error',
        statusCode: status,
        message: 'Server error occurred'
      };
    }
    
    // Authentication errors - don't retry
    if (status === 401 || status === 403) {
      return {
        isRetryable: false,
        errorType: 'auth_error',
        statusCode: status,
        message: 'Authentication failed. Check your API key in .env.local'
      };
    }
    
    // Client errors (4xx except 429) - don't retry
    if (status >= 400 && status < 500) {
      return {
        isRetryable: false,
        errorType: 'client_error',
        statusCode: status,
        message: 'Invalid request'
      };
    }
  }
  
  // Network errors - retry
  if (error?.code) {
    const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED', 'EPIPE', 'EHOSTUNREACH'];
    if (retryableCodes.includes(error.code)) {
      return {
        isRetryable: true,
        errorType: 'network_error',
        message: 'Network connection error'
      };
    }
  }
  
  // Timeout errors - retry
  if (error?.message?.toLowerCase().includes('timeout') || 
      error?.name === 'TimeoutError' ||
      error?.code === 'ETIMEDOUT') {
    return {
      isRetryable: true,
      errorType: 'timeout',
      message: 'Request timed out'
    };
  }
  
  // Parsing errors (might be transient response issue) - retry
  if (error?.message?.includes('JSON') || 
      error?.message?.includes('parse') ||
      error?.message?.includes('No JSON found')) {
    return {
      isRetryable: true,
      errorType: 'parsing_error',
      message: 'Failed to parse API response'
    };
  }
  
  // Invalid image errors - don't retry
  if (error?.message?.includes('Invalid or blank image') ||
      error?.message?.includes('blank') ||
      error?.message?.includes('white')) {
    return {
      isRetryable: false,
      errorType: 'client_error',
      message: 'Invalid image provided'
    };
  }
  
  // Unknown error - default to retryable (conservative approach)
  // Better to retry too much than too little
  return {
    isRetryable: true,
    errorType: 'unknown',
    message: error?.message || 'Unknown error occurred'
  };
}

/**
 * Calculate delay for next retry attempt with exponential backoff
 */
export function calculateDelay(attempt: number, config: RetryConfig): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry wrapper for async functions
 * INFINITE RETRY for transient errors, immediate fail for permanent errors
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  let attempt = 0;
  
  while (true) {
    attempt++;
    
    try {
      // Execute the function
      const result = await fn();
      return result;
      
    } catch (error) {
      // Classify the error
      const classification = classifyError(error);
      
      // If not retryable (permanent error), fail immediately
      if (!classification.isRetryable) {
        console.error('Permanent error, not retrying:', classification.message);
        throw error;
      }
      
      // Calculate delay for next retry
      const delay = calculateDelay(attempt, config);
      
      
      // Call retry callback if provided (for UI updates)
      if (config.onRetry) {
        config.onRetry(attempt, error, delay);
      }
      
      // Wait before retrying
      await sleep(delay);
      
      // Loop continues - will retry indefinitely until success or permanent error
    }
  }
}

/**
 * Get user-friendly error message based on error classification
 */
export function getUserFriendlyErrorMessage(error: any): string {
  const classification = classifyError(error);
  
  switch (classification.errorType) {
    case 'rate_limit':
      return 'API rate limit reached. The system will automatically retry. Please wait...';
    case 'server_error':
      return 'Anthropic API is experiencing issues. The system will automatically retry. Please wait...';
    case 'network_error':
      return 'Network connection issue detected. The system will automatically retry. Please check your internet connection.';
    case 'timeout':
      return 'Request timed out. The system will automatically retry. Please wait...';
    case 'auth_error':
      return 'API authentication failed. Please check your API key in .env.local and restart the server.';
    case 'client_error':
      return 'Invalid image provided. Please upload a clear screenshot of an Amazon product page.';
    case 'parsing_error':
      return 'Failed to parse API response. The system will automatically retry.';
    default:
      return 'An error occurred. The system will automatically retry. Please wait...';
  }
}

/**
 * Format delay time for display
 */
export function formatDelay(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  } else {
    return `${(ms / 60000).toFixed(1)}m`;
  }
}

