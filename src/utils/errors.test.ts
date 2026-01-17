import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SmartTestError,
  InvalidArgsError,
  FileNotFoundError,
  ProviderError,
  ProviderNotAvailableError,
  GenerationError,
  ValidationError,
  TestRunError,
  SelfHealingExhaustedError,
  ParseError,
  TimeoutError,
  withTimeout,
  getErrorMessage,
  isSmartTestError,
  getExitCode,
  toSmartTestError,
  formatError,
  toAgentError,
  withRetry,
  assertArgs,
  assertDefined,
} from './errors.js';
import { ExitCode } from '../types.js';

vi.mock('../types.js');

describe('SmartTestError', () => {
  it('should create a new SmartTestError instance', () => {
    const error = new SmartTestError('Test message', ExitCode.INVALID_ARGS);
    expect(error.message).toBe('Test message');
    expect(error.code).toBe(ExitCode.INVALID_ARGS);
    expect(error.recoverable).toBe(false);
  });

  it('should create a new SmartTestError instance with recoverable option', () => {
    const error = new SmartTestError('Test message', ExitCode.INVALID_ARGS, { recoverable: true });
    expect(error.message).toBe('Test message');
    expect(error.code).toBe(ExitCode.INVALID_ARGS);
    expect(error.recoverable).toBe(true);
  });

  it('should create a new SmartTestError instance with details option', () => {
    const error = new SmartTestError('Test message', ExitCode.INVALID_ARGS, { details: { test: 'details' } });
    expect(error.message).toBe('Test message');
    expect(error.code).toBe(ExitCode.INVALID_ARGS);
    expect(error.recoverable).toBe(false);
    expect(error.details).toEqual({ test: 'details' });
  });

  it('should create a new SmartTestError instance with cause option', () => {
    const cause = new Error('Cause message');
    const error = new SmartTestError('Test message', ExitCode.INVALID_ARGS, { cause });
    expect(error.message).toBe('Test message');
    expect(error.code).toBe(ExitCode.INVALID_ARGS);
    expect(error.recoverable).toBe(false);
    expect(error.cause).toBe(cause);
  });
});

describe('InvalidArgsError', () => {
  it('should create a new InvalidArgsError instance', () => {
    const error = new InvalidArgsError('Test message');
    expect(error.message).toBe('Test message');
    expect(error.code).toBe(ExitCode.INVALID_ARGS);
    expect(error.recoverable).toBe(false);
  });

  it('should create a new InvalidArgsError instance with details option', () => {
    const error = new InvalidArgsError('Test message', { test: 'details' });
    expect(error.message).toBe('Test message');
    expect(error.code).toBe(ExitCode.INVALID_ARGS);
    expect(error.recoverable).toBe(false);
    expect(error.details).toEqual({ test: 'details' });
  });
});

describe('FileNotFoundError', () => {
  it('should create a new FileNotFoundError instance', () => {
    const error = new FileNotFoundError('test/file/path');
    expect(error.message).toBe('File not found: test/file/path');
    expect(error.code).toBe(ExitCode.FILE_NOT_FOUND);
    expect(error.recoverable).toBe(false);
    expect(error.filePath).toBe('test/file/path');
  });

  it('should create a new FileNotFoundError instance with details option', () => {
    const error = new FileNotFoundError('test/file/path', { test: 'details' });
    expect(error.message).toBe('File not found: test/file/path');
    expect(error.code).toBe(ExitCode.FILE_NOT_FOUND);
    expect(error.recoverable).toBe(false);
    expect(error.filePath).toBe('test/file/path');
    expect(error.details).toEqual({ test: 'details' });
  });
});

describe('ProviderError', () => {
  it('should create a new ProviderError instance', () => {
    const error = new ProviderError('test-provider', 'Test message');
    expect(error.message).toBe('[test-provider] Test message');
    expect(error.code).toBe(ExitCode.PROVIDER_ERROR);
    expect(error.recoverable).toBe(true);
    expect(error.providerName).toBe('test-provider');
  });

  it('should create a new ProviderError instance with cause option', () => {
    const cause = new Error('Cause message');
    const error = new ProviderError('test-provider', 'Test message', { cause });
    expect(error.message).toBe('[test-provider] Test message');
    expect(error.code).toBe(ExitCode.PROVIDER_ERROR);
    expect(error.recoverable).toBe(true);
    expect(error.providerName).toBe('test-provider');
    expect(error.cause).toBe(cause);
  });

  it('should create a new ProviderError instance with details option', () => {
    const error = new ProviderError('test-provider', 'Test message', { details: { test: 'details' } });
    expect(error.message).toBe('[test-provider] Test message');
    expect(error.code).toBe(ExitCode.PROVIDER_ERROR);
    expect(error.recoverable).toBe(true);
    expect(error.providerName).toBe('test-provider');
    expect(error.details).toEqual({ test: 'details' });
  });
});

describe('ProviderNotAvailableError', () => {
  it('should create a new ProviderNotAvailableError instance', () => {
    const error = new ProviderNotAvailableError('test-provider');
    expect(error.message).toBe('[test-provider] Provider is not available. Check API key or connection.');
    expect(error.code).toBe(ExitCode.PROVIDER_ERROR);
    expect(error.recoverable).toBe(true);
    expect(error.providerName).toBe('test-provider');
  });
});

describe('GenerationError', () => {
  it('should create a new GenerationError instance', () => {
    const error = new GenerationError('test/source/file', 'Test message');
    expect(error.message).toBe('Test message');
    expect(error.code).toBe(ExitCode.GENERATION_FAILED);
    expect(error.recoverable).toBe(true);
    expect(error.sourceFile).toBe('test/source/file');
  });

  it('should create a new GenerationError instance with cause option', () => {
    const cause = new Error('Cause message');
    const error = new GenerationError('test/source/file', 'Test message', { cause });
    expect(error.message).toBe('Test message');
    expect(error.code).toBe(ExitCode.GENERATION_FAILED);
    expect(error.recoverable).toBe(true);
    expect(error.sourceFile).toBe('test/source/file');
    expect(error.cause).toBe(cause);
  });

  it('should create a new GenerationError instance with details option', () => {
    const error = new GenerationError('test/source/file', 'Test message', { details: { test: 'details' } });
    expect(error.message).toBe('Test message');
    expect(error.code).toBe(ExitCode.GENERATION_FAILED);
    expect(error.recoverable).toBe(true);
    expect(error.sourceFile).toBe('test/source/file');
    expect(error.details).toEqual({ test: 'details' });
  });
});

describe('ValidationError', () => {
  it('should create a new ValidationError instance', () => {
    const error = new ValidationError(['issue1', 'issue2']);
    expect(error.message).toBe('Validation failed with 2 issue(s)');
    expect(error.code).toBe(ExitCode.VALIDATION_FAILED);
    expect(error.recoverable).toBe(true);
    expect(error.issues).toEqual(['issue1', 'issue2']);
  });

  it('should create a new ValidationError instance with details option', () => {
    const error = new ValidationError(['issue1', 'issue2'], { test: 'details' });
    expect(error.message).toBe('Validation failed with 2 issue(s)');
    expect(error.code).toBe(ExitCode.VALIDATION_FAILED);
    expect(error.recoverable).toBe(true);
    expect(error.issues).toEqual(['issue1', 'issue2']);
    expect(error.details).toEqual({ test: 'details' });
  });
});

describe('TestRunError', () => {
  it('should create a new TestRunError instance', () => {
    const error = new TestRunError(2, 'Test message');
    expect(error.message).toBe('Test message');
    expect(error.code).toBe(ExitCode.TEST_RUN_FAILED);
    expect(error.recoverable).toBe(true);
    expect(error.failureCount).toBe(2);
  });

  it('should create a new TestRunError instance with cause option', () => {
    const cause = new Error('Cause message');
    const error = new TestRunError(2, 'Test message', { cause });
    expect(error.message).toBe('Test message');
    expect(error.code).toBe(ExitCode.TEST_RUN_FAILED);
    expect(error.recoverable).toBe(true);
    expect(error.failureCount).toBe(2);
    expect(error.cause).toBe(cause);
  });

  it('should create a new TestRunError instance with details option', () => {
    const error = new TestRunError(2, 'Test message', { details: { test: 'details' } });
    expect(error.message).toBe('Test message');
    expect(error.code).toBe(ExitCode.TEST_RUN_FAILED);
    expect(error.recoverable).toBe(true);
    expect(error.failureCount).toBe(2);
    expect(error.details).toEqual({ test: 'details' });
  });
});

describe('SelfHealingExhaustedError', () => {
  it('should create a new SelfHealingExhaustedError instance', () => {
    const error = new SelfHealingExhaustedError(3, 2);
    expect(error.message).toBe('Self-healing exhausted after 3 attempts. 2 test(s) still failing.');
    expect(error.code).toBe(ExitCode.SELF_HEAL_EXHAUSTED);
    expect(error.recoverable).toBe(false);
    expect(error.attempts).toBe(3);
    expect(error.remainingFailures).toBe(2);
  });
});

describe('ParseError', () => {
  it('should create a new ParseError instance', () => {
    const error = new ParseError('Test message');
    expect(error.message).toBe('Test message');
    expect(error.code).toBe(ExitCode.GENERATION_FAILED);
    expect(error.recoverable).toBe(false);
  });

  it('should create a new ParseError instance with filePath option', () => {
    const error = new ParseError('Test message', 'test/file/path');
    expect(error.message).toBe('Test message');
    expect(error.code).toBe(ExitCode.GENERATION_FAILED);
    expect(error.recoverable).toBe(false);
    expect(error.filePath).toBe('test/file/path');
  });

  it('should create a new ParseError instance with cause option', () => {
    const cause = new Error('Cause message');
    const error = new ParseError('Test message', undefined, cause);
    expect(error.message).toBe('Test message');
    expect(error.code).toBe(ExitCode.GENERATION_FAILED);
    expect(error.recoverable).toBe(false);
    expect(error.cause).toBe(cause);
  });
});

describe('TimeoutError', () => {
  it('should create a new TimeoutError instance', () => {
    const error = new TimeoutError('test-operation', 1000);
    expect(error.message).toBe('Operation "test-operation" timed out after 1000ms');
    expect(error.code).toBe(ExitCode.PROVIDER_ERROR);
    expect(error.recoverable).toBe(true);
    expect(error.timeoutMs).toBe(1000);
  });
});

describe('withTimeout', () => {
  it('should resolve with the result of the operation', async () => {
    const operation = Promise.resolve('Test result');
    const result = await withTimeout(operation, 1000, 'test-operation');
    expect(result).toBe('Test result');
  });

  it('should reject with a TimeoutError if the operation times out', async () => {
    const operation = new Promise((resolve) => {
      setTimeout(() => {
        resolve('Test result');
      }, 2000);
    });
    await expect(withTimeout(operation, 1000, 'test-operation')).rejects.toThrow(TimeoutError);
  });
});

describe('getErrorMessage', () => {
  it('should return the message of an Error instance', () => {
    const error = new Error('Test message');
    expect(getErrorMessage(error)).toBe('Test message');
  });

  it('should return the string value of a non-Error instance', () => {
    expect(getErrorMessage('Test message')).toBe('Test message');
  });

  it('should return the string representation of a non-Error, non-string instance', () => {
    expect(getErrorMessage({ test: 'details' })).toBe('[object Object]');
  });
});

describe('isSmartTestError', () => {
  it('should return true for a SmartTestError instance', () => {
    const error = new SmartTestError('Test message', ExitCode.INVALID_ARGS);
    expect(isSmartTestError(error)).toBe(true);
  });

  it('should return false for a non-SmartTestError instance', () => {
    const error = new Error('Test message');
    expect(isSmartTestError(error)).toBe(false);
  });
});

describe('getExitCode', () => {
  it('should return the code of a SmartTestError instance', () => {
    const error = new SmartTestError('Test message', ExitCode.INVALID_ARGS);
    expect(getExitCode(error)).toBe(ExitCode.INVALID_ARGS);
  });

  it('should return the default code for a non-SmartTestError instance', () => {
    const error = new Error('Test message');
    expect(getExitCode(error)).toBe(ExitCode.GENERATION_FAILED);
  });
});

describe('toSmartTestError', () => {
  it('should return the input error if it is already a SmartTestError instance', () => {
    const error = new SmartTestError('Test message', ExitCode.INVALID_ARGS);
    expect(toSmartTestError(error)).toBe(error);
  });

  it('should create a new SmartTestError instance for a non-SmartTestError instance', () => {
    const error = new Error('Test message');
    const smartError = toSmartTestError(error);
    expect(smartError.message).toBe('Test message');
    expect(smartError.code).toBe(ExitCode.GENERATION_FAILED);
    expect(smartError.recoverable).toBe(false);
    expect(smartError.cause).toBe(error);
  });

  it('should create a new SmartTestError instance for a non-Error instance', () => {
    const error = 'Test message';
    const smartError = toSmartTestError(error);
    expect(smartError.message).toBe('Test message');
    expect(smartError.code).toBe(ExitCode.GENERATION_FAILED);
    expect(smartError.recoverable).toBe(false);
  });
});

describe('formatError', () => {
  it('should format a SmartTestError instance', () => {
    const error = new SmartTestError('Test message', ExitCode.INVALID_ARGS);
    const formattedError = formatError(error);
    expect(formattedError).toBe(`Error: Test message`);
  });

  it('should format a non-SmartTestError instance', () => {
    const error = new Error('Test message');
    const formattedError = formatError(error);
    expect(formattedError).toBe(`Error: Test message`);
  });

  it('should include additional details in the formatted error', () => {
    const error = new SmartTestError('Test message', ExitCode.INVALID_ARGS, { details: { test: 'details' } });
    const formattedError = formatError(error, true);
    expect(formattedError).toContain(`Error: Test message`);
    expect(formattedError).toContain(`  Code: ${ExitCode.INVALID_ARGS}`);
    expect(formattedError).toContain(`  Type: SmartTestError`);
    expect(formattedError).toContain(`  Recoverable: false`);
    expect(formattedError).toContain(`  Details: {"test":"details"}`);
  });
});

describe('toAgentError', () => {
  it('should convert a SmartTestError instance to an AgentError', () => {
    const error = new SmartTestError('Test message', ExitCode.INVALID_ARGS);
    const agentError = toAgentError(error);
    expect(agentError.code).toBe('1');
    expect(agentError.message).toBe('Test message');
    expect(agentError.details).toBeUndefined();
    expect(agentError.recoverable).toBe(false);
  });

  it('should convert a non-SmartTestError instance to an AgentError', () => {
    const error = new Error('Test message');
    const agentError = toAgentError(error);
    expect(agentError.code).toBe('1');
    expect(agentError.message).toBe('Test message');
    expect(agentError.details).toBeUndefined();
    expect(agentError.recoverable).toBe(false);
  });
});

describe('withRetry', () => {
  it('should resolve with the result of the operation', async () => {
    const operation = Promise.resolve('Test result');
    const result = await withRetry(operation, { maxRetries: 3 });
    expect(result).toBe('Test result');
  });

  it('should retry the operation if it fails', async () => {
    const operation = () => Promise.reject(new Error('Test error'));
    const result = await withRetry(operation, { maxRetries: 3 });
    expect(result).toBeUndefined();
  });

  it('should reject with the last error if all retries fail', async () => {
    const operation = () => Promise.reject(new Error('Test error'));
    await expect(withRetry(operation, { maxRetries: 3 })).rejects.toThrow(Error);
  });
});

describe('assertArgs', () => {
  it('should not throw if the condition is true', () => {
    assertArgs(true, 'Test message');
    expect(true).toBe(true);
  });

  it('should throw an InvalidArgsError if the condition is false', () => {
    expect(() => assertArgs(false, 'Test message')).toThrow(InvalidArgsError);
  });

  it('should include details in the error message if provided', () => {
    expect(() => assertArgs(false, 'Test message', { test: 'details' })).toThrow(InvalidArgsError);
  });
});

describe('assertDefined', () => {
  it('should not throw if the value is defined', () => {
    assertDefined('Test value', 'Test name');
    expect(true).toBe(true);
  });

  it('should throw an InvalidArgsError if the value is null', () => {
    expect(() => assertDefined(null, 'Test name')).toThrow(InvalidArgsError);
  });

  it('should throw an InvalidArgsError if the value is undefined', () => {
    expect(() => assertDefined(undefined, 'Test name')).toThrow(InvalidArgsError);
  });
});

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.resetAllMocks();
});