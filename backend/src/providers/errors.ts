/**
 * Custom error classes for cloud provider operations
 */

export abstract class CloudProviderError extends Error {
  public readonly providerType: string;
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly retryable: boolean;

  constructor(
    message: string,
    providerType: string,
    code: string,
    statusCode?: number,
    retryable: boolean = false
  ) {
    super(message);
    this.name = this.constructor.name;
    this.providerType = providerType;
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Authentication related errors
 */
export class AuthenticationError extends CloudProviderError {
  constructor(
    message: string,
    providerType: string,
    statusCode?: number
  ) {
    super(message, providerType, 'AUTHENTICATION_ERROR', statusCode, false);
  }
}

/**
 * Authorization related errors (access denied, insufficient permissions)
 */
export class AuthorizationError extends CloudProviderError {
  constructor(
    message: string,
    providerType: string,
    statusCode?: number
  ) {
    super(message, providerType, 'AUTHORIZATION_ERROR', statusCode, false);
  }
}

/**
 * Network related errors (timeout, connection failed)
 */
export class NetworkError extends CloudProviderError {
  constructor(
    message: string,
    providerType: string,
    statusCode?: number,
    retryable: boolean = true
  ) {
    super(message, providerType, 'NETWORK_ERROR', statusCode, retryable);
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends CloudProviderError {
  public readonly retryAfter?: number; // seconds

  constructor(
    message: string,
    providerType: string,
    retryAfter?: number,
    statusCode?: number
  ) {
    super(message, providerType, 'RATE_LIMIT_ERROR', statusCode, true);
    this.retryAfter = retryAfter;
  }
}

/**
 * File or folder not found errors
 */
export class NotFoundError extends CloudProviderError {
  public readonly path: string;

  constructor(
    message: string,
    providerType: string,
    path: string,
    statusCode?: number
  ) {
    super(message, providerType, 'NOT_FOUND_ERROR', statusCode, false);
    this.path = path;
  }
}

/**
 * File already exists errors
 */
export class FileExistsError extends CloudProviderError {
  public readonly path: string;

  constructor(
    message: string,
    providerType: string,
    path: string,
    statusCode?: number
  ) {
    super(message, providerType, 'FILE_EXISTS_ERROR', statusCode, false);
    this.path = path;
  }
}

/**
 * Insufficient storage space errors
 */
export class InsufficientStorageError extends CloudProviderError {
  public readonly required: number;
  public readonly available: number;

  constructor(
    message: string,
    providerType: string,
    required: number,
    available: number,
    statusCode?: number
  ) {
    super(message, providerType, 'INSUFFICIENT_STORAGE_ERROR', statusCode, false);
    this.required = required;
    this.available = available;
  }
}

/**
 * Invalid file or operation errors
 */
export class InvalidOperationError extends CloudProviderError {
  constructor(
    message: string,
    providerType: string,
    statusCode?: number
  ) {
    super(message, providerType, 'INVALID_OPERATION_ERROR', statusCode, false);
  }
}

/**
 * File size limit exceeded errors
 */
export class FileSizeLimitError extends CloudProviderError {
  public readonly fileSize: number;
  public readonly maxSize: number;

  constructor(
    message: string,
    providerType: string,
    fileSize: number,
    maxSize: number,
    statusCode?: number
  ) {
    super(message, providerType, 'FILE_SIZE_LIMIT_ERROR', statusCode, false);
    this.fileSize = fileSize;
    this.maxSize = maxSize;
  }
}

/**
 * Unsupported operation errors
 */
export class UnsupportedOperationError extends CloudProviderError {
  public readonly operation: string;

  constructor(
    message: string,
    providerType: string,
    operation: string,
    statusCode?: number
  ) {
    super(message, providerType, 'UNSUPPORTED_OPERATION_ERROR', statusCode, false);
    this.operation = operation;
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends CloudProviderError {
  constructor(
    message: string,
    providerType: string
  ) {
    super(message, providerType, 'CONFIGURATION_ERROR', undefined, false);
  }
}

/**
 * Upload/download corruption or verification errors
 */
export class IntegrityError extends CloudProviderError {
  public readonly expectedChecksum?: string;
  public readonly actualChecksum?: string;

  constructor(
    message: string,
    providerType: string,
    expectedChecksum?: string,
    actualChecksum?: string,
    statusCode?: number
  ) {
    super(message, providerType, 'INTEGRITY_ERROR', statusCode, true);
    this.expectedChecksum = expectedChecksum;
    this.actualChecksum = actualChecksum;
  }
}

/**
 * Temporary service unavailable errors
 */
export class ServiceUnavailableError extends CloudProviderError {
  constructor(
    message: string,
    providerType: string,
    statusCode?: number,
    retryable: boolean = true
  ) {
    super(message, providerType, 'SERVICE_UNAVAILABLE_ERROR', statusCode, retryable);
  }
}

/**
 * Generic API errors for cases not covered by specific error types
 */
export class APIError extends CloudProviderError {
  public readonly response?: any;

  constructor(
    message: string,
    providerType: string,
    statusCode?: number,
    response?: any,
    retryable: boolean = false
  ) {
    super(message, providerType, 'API_ERROR', statusCode, retryable);
    this.response = response;
  }
}

/**
 * Utility function to create appropriate error from HTTP response
 */
export function createErrorFromResponse(
  response: any,
  providerType: string,
  operation?: string
): CloudProviderError {
  const status = response.status || response.statusCode;
  const message = response.message || response.error || response.data?.error || 'Unknown error';
  
  switch (status) {
    case 400:
      return new InvalidOperationError(message, providerType, status);
    case 401:
      return new AuthenticationError(message, providerType, status);
    case 403:
      return new AuthorizationError(message, providerType, status);
    case 404:
      return new NotFoundError(message, providerType, operation || 'unknown', status);
    case 409:
      return new FileExistsError(message, providerType, operation || 'unknown', status);
    case 413:
      return new FileSizeLimitError(message, providerType, 0, 0, status);
    case 429:
      const retryAfter = response.headers?.['retry-after'] || response.retryAfter;
      return new RateLimitError(message, providerType, retryAfter, status);
    case 500:
    case 502:
    case 503:
    case 504:
      return new ServiceUnavailableError(message, providerType, status);
    default:
      const retryable = status >= 500 || status === 408 || status === 429;
      return new APIError(message, providerType, status, response, retryable);
  }
}

/**
 * Type guard to check if error is a CloudProviderError
 */
export function isCloudProviderError(error: any): error is CloudProviderError {
  return error instanceof CloudProviderError;
}

/**
 * Type guard to check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  return isCloudProviderError(error) && error.retryable;
}

/**
 * Extract error details for logging/debugging
 */
export function extractErrorDetails(error: any): Record<string, any> {
  if (isCloudProviderError(error)) {
    return {
      name: error.name,
      message: error.message,
      code: error.code,
      providerType: error.providerType,
      statusCode: error.statusCode,
      retryable: error.retryable,
      stack: error.stack
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  return {
    error: String(error)
  };
}