/**
 * Smart AI Test Suit - Error Handling Utilities
 * Custom error classes and error handling utilities.
 */

import { ExitCode, type ExitCodeValue, type AgentError } from '../types.js';

// =============================================================================
// Base Error Class
// =============================================================================

export class SmartTestError extends Error {
  public readonly code: ExitCodeValue;
  public readonly recoverable: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    code: ExitCodeValue,
    options?: {
      recoverable?: boolean;
      details?: unknown;
      cause?: Error;
    }
  ) {
    super(message, { cause: options?.cause });
    this.name = 'SmartTestError';
    this.code = code;
    this.recoverable = options?.recoverable ?? false;
    this.details = options?.details;

    // Maintains proper stack trace for where error was thrown (V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toAgentError(): AgentError {
    return {
      code: this.code.toString(),
      message: this.message,
      details: this.details,
      recoverable: this.recoverable,
    };
  }
}

// =============================================================================
// Specific Error Classes
// =============================================================================

export class InvalidArgsError extends SmartTestError {
  constructor(message: string, details?: unknown) {
    super(message, ExitCode.INVALID_ARGS, { recoverable: false, details });
    this.name = 'InvalidArgsError';
  }
}

export class FileNotFoundError extends SmartTestError {
  public readonly filePath: string;

  constructor(filePath: string, details?: unknown) {
    super(`File not found: ${filePath}`, ExitCode.FILE_NOT_FOUND, {
      recoverable: false,
      details,
    });
    this.name = 'FileNotFoundError';
    this.filePath = filePath;
  }
}

export class ProviderError extends SmartTestError {
  public readonly providerName: string;

  constructor(
    providerName: string,
    message: string,
    options?: { cause?: Error; details?: unknown }
  ) {
    super(`[${providerName}] ${message}`, ExitCode.PROVIDER_ERROR, {
      recoverable: true,
      details: options?.details,
      cause: options?.cause,
    });
    this.name = 'ProviderError';
    this.providerName = providerName;
  }
}

export class ProviderNotAvailableError extends ProviderError {
  constructor(providerName: string) {
    super(providerName, 'Provider is not available. Check API key or connection.');
    this.name = 'ProviderNotAvailableError';
  }
}

export class GenerationError extends SmartTestError {
  public readonly sourceFile: string;

  constructor(
    sourceFile: string,
    message: string,
    options?: { cause?: Error; details?: unknown }
  ) {
    super(message, ExitCode.GENERATION_FAILED, {
      recoverable: true,
      details: options?.details,
      cause: options?.cause,
    });
    this.name = 'GenerationError';
    this.sourceFile = sourceFile;
  }
}

export class ValidationError extends SmartTestError {
  public readonly issues: string[];

  constructor(issues: string[], details?: unknown) {
    super(
      `Validation failed with ${issues.length} issue(s)`,
      ExitCode.VALIDATION_FAILED,
      { recoverable: true, details }
    );
    this.name = 'ValidationError';
    this.issues = issues;
  }
}

export class TestRunError extends SmartTestError {
  public readonly failureCount: number;

  constructor(
    failureCount: number,
    message: string,
    options?: { cause?: Error; details?: unknown }
  ) {
    super(message, ExitCode.TEST_RUN_FAILED, {
      recoverable: true,
      details: options?.details,
      cause: options?.cause,
    });
    this.name = 'TestRunError';
    this.failureCount = failureCount;
  }
}

export class SelfHealingExhaustedError extends SmartTestError {
  public readonly attempts: number;
  public readonly remainingFailures: number;

  constructor(attempts: number, remainingFailures: number) {
    super(
      `Self-healing exhausted after ${attempts} attempts. ${remainingFailures} test(s) still failing.`,
      ExitCode.SELF_HEAL_EXHAUSTED,
      { recoverable: false }
    );
    this.name = 'SelfHealingExhaustedError';
    this.attempts = attempts;
    this.remainingFailures = remainingFailures;
  }
}

export class ParseError extends SmartTestError {
  public readonly filePath?: string;

  constructor(message: string, filePath?: string, cause?: Error) {
    super(message, ExitCode.GENERATION_FAILED, {
      recoverable: false,
      cause,
      details: { filePath },
    });
    this.name = 'ParseError';
    this.filePath = filePath;
  }
}

export class TimeoutError extends SmartTestError {
  public readonly timeoutMs: number;

  constructor(operation: string, timeoutMs: number) {
    super(
      `Operation "${operation}" timed out after ${timeoutMs}ms`,
      ExitCode.PROVIDER_ERROR,
      { recoverable: true }
    );
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

// =============================================================================
// Error Utility Functions
// =============================================================================

/**
 * Wraps an async operation with a timeout
 */
export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new TimeoutError(operationName, timeoutMs));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([operation, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

/**
 * Safely extracts error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return String(error);
}

/**
 * Checks if an error is a SmartTestError
 */
export function isSmartTestError(error: unknown): error is SmartTestError {
  return error instanceof SmartTestError;
}

/**
 * Gets the exit code for an error
 */
export function getExitCode(error: unknown): ExitCodeValue {
  if (isSmartTestError(error)) {
    return error.code;
  }
  // Default to generation failed for unexpected errors
  return ExitCode.GENERATION_FAILED;
}

/**
 * Converts any error to SmartTestError
 */
export function toSmartTestError(error: unknown): SmartTestError {
  if (isSmartTestError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new SmartTestError(error.message, ExitCode.GENERATION_FAILED, {
      cause: error,
      recoverable: false,
    });
  }

  return new SmartTestError(String(error), ExitCode.GENERATION_FAILED, {
    recoverable: false,
  });
}

/**
 * Formats an error for display
 */
export function formatError(error: unknown, verbose = false): string {
  const smartError = toSmartTestError(error);
  const lines: string[] = [];

  lines.push(`Error: ${smartError.message}`);

  if (verbose) {
    lines.push(`  Code: ${smartError.code}`);
    lines.push(`  Type: ${smartError.name}`);
    lines.push(`  Recoverable: ${smartError.recoverable}`);

    if (smartError.details) {
      lines.push(`  Details: ${JSON.stringify(smartError.details, null, 2)}`);
    }

    if (smartError.stack) {
      lines.push(`  Stack:\n${smartError.stack}`);
    }

    if (smartError.cause) {
      lines.push(`  Cause: ${getErrorMessage(smartError.cause)}`);
    }
  }

  return lines.join('\n');
}

/**
 * Creates an AgentError from any error
 */
export function toAgentError(error: unknown): AgentError {
  const smartError = toSmartTestError(error);
  return smartError.toAgentError();
}

/**
 * Retries an operation with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    shouldRetry?: (error: unknown) => boolean;
  }
): Promise<T> {
  const {
    maxRetries,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    shouldRetry = (e) => toSmartTestError(e).recoverable,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      // Exponential backoff with jitter
      const delay = Math.min(
        baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelayMs
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Asserts a condition, throwing InvalidArgsError if false
 */
export function assertArgs(
  condition: boolean,
  message: string,
  details?: unknown
): asserts condition {
  if (!condition) {
    throw new InvalidArgsError(message, details);
  }
}

/**
 * Asserts a value is not null/undefined
 */
export function assertDefined<T>(
  value: T | null | undefined,
  name: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new InvalidArgsError(`${name} is required but was not provided`);
  }
}
