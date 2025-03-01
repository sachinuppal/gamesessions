import { PostgrestError } from '@supabase/supabase-js';

// Error types
export enum ErrorType {
  CONNECTION = 'CONNECTION',
  AUTHENTICATION = 'AUTHENTICATION',
  DATABASE = 'DATABASE',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN'
}

// Error structure
export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: any;
}

// Function to determine if an error is a connection error
export const isConnectionError = (error: any): boolean => {
  if (!error) return false;
  
  // Check for specific connection error patterns
  const errorMessage = error.message || error.toString();
  return (
    errorMessage.includes('network error') ||
    errorMessage.includes('Failed to fetch') ||
    errorMessage.includes('connect error') ||
    errorMessage.includes('connection failure') ||
    errorMessage.includes('503') ||
    errorMessage.includes('upstream connect error')
  );
};

// Function to determine if an error is a timeout error
export const isTimeoutError = (error: any): boolean => {
  if (!error) return false;
  
  const errorMessage = error.message || error.toString();
  return (
    errorMessage.includes('timeout') ||
    errorMessage.includes('timed out') ||
    errorMessage.includes('abort') ||
    error.name === 'AbortError' ||
    error.name === 'TimeoutError'
  );
};

// Parse Supabase errors into a standardized format
export const parseSupabaseError = (error: PostgrestError | Error | unknown): AppError => {
  // Handle timeout errors
  if (isTimeoutError(error)) {
    return {
      type: ErrorType.TIMEOUT,
      message: 'The operation timed out. Please try again later.',
      originalError: error
    };
  }
  
  // Handle connection errors
  if (isConnectionError(error)) {
    return {
      type: ErrorType.CONNECTION,
      message: 'Unable to connect to the database. Please check your internet connection and try again.',
      originalError: error
    };
  }
  
  // Handle authentication errors
  if (error instanceof Error && 
      (error.message.includes('auth') || error.message.includes('Authentication'))) {
    return {
      type: ErrorType.AUTHENTICATION,
      message: 'Authentication error. Please sign in again.',
      originalError: error
    };
  }
  
  // Handle database errors
  if (error instanceof Error && error.message.includes('database')) {
    return {
      type: ErrorType.DATABASE,
      message: 'Database error occurred. Please try again later.',
      originalError: error
    };
  }
  
  // Default unknown error
  return {
    type: ErrorType.UNKNOWN,
    message: error instanceof Error ? error.message : 'An unexpected error occurred',
    originalError: error
  };
};

// Retry mechanism for Supabase operations
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 2,
  delay: number = 500
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Only retry on connection errors, not on timeouts
      if (!isConnectionError(error) || isTimeoutError(error)) {
        throw parseSupabaseError(error);
      }
      
      // Wait before retrying (with exponential backoff)
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
      }
    }
  }
  
  // If we've exhausted all retries
  throw parseSupabaseError(lastError);
};

// Error display component helper
export const getErrorDisplayMessage = (error: AppError): string => {
  switch (error.type) {
    case ErrorType.CONNECTION:
      return 'Connection to the server failed. Please check your internet connection and try again.';
    case ErrorType.AUTHENTICATION:
      return 'Your session has expired. Please sign in again.';
    case ErrorType.DATABASE:
      return 'We encountered a problem with our database. Please try again later.';
    case ErrorType.TIMEOUT:
      return 'The operation took too long to complete. Please try again later.';
    case ErrorType.UNKNOWN:
    default:
      return 'Something went wrong. Please try again later.';
  }
};