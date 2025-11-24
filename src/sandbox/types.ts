/**
 * Type definitions for Deno Sandbox Executor
 *
 * This module provides TypeScript interfaces for secure code execution
 * in an isolated Deno subprocess environment.
 */

/**
 * Configuration options for the sandbox executor
 */
export interface SandboxConfig {
  /**
   * Maximum execution time in milliseconds
   * @default 30000 (30 seconds)
   */
  timeout?: number;

  /**
   * Maximum heap memory in megabytes
   * @default 512
   */
  memoryLimit?: number;

  /**
   * Additional read paths to allow (beyond temp file)
   * Use with caution - each path increases attack surface
   * @default []
   */
  allowedReadPaths?: string[];

  /**
   * PII protection configuration
   * @default { enabled: true, types: all, detokenizeOutput: false }
   */
  piiProtection?: {
    /** Whether PII protection is enabled */
    enabled: boolean;
    /** Which PII types to detect */
    types?: Array<"email" | "phone" | "credit_card" | "ssn" | "api_key">;
    /** Whether to detokenize output (default: false - safer) */
    detokenizeOutput?: boolean;
  };

  /**
   * Code execution cache configuration
   * @default { enabled: true, maxEntries: 100, ttlSeconds: 300, persistence: false }
   */
  cacheConfig?: {
    /** Whether caching is enabled */
    enabled: boolean;
    /** Maximum number of cache entries (LRU eviction) */
    maxEntries?: number;
    /** Time-to-live for cache entries in seconds */
    ttlSeconds?: number;
    /** Whether to persist cache to PGlite */
    persistence?: boolean;
  };
}

/**
 * Structured error types that can occur during code execution
 */
export type ErrorType =
  | "SyntaxError"
  | "RuntimeError"
  | "TimeoutError"
  | "MemoryError"
  | "PermissionError"
  | "SecurityError"
  | "ResourceLimitError";

/**
 * Structured error information
 */
export interface StructuredError {
  /**
   * Type of error that occurred
   */
  type: ErrorType;

  /**
   * Human-readable error message (sanitized)
   */
  message: string;

  /**
   * Stack trace (optional, sanitized to remove host paths)
   */
  stack?: string;
}

/**
 * Result of code execution in the sandbox
 */
export interface ExecutionResult {
  /**
   * Whether the code executed successfully
   */
  success: boolean;

  /**
   * The return value of the executed code (if successful)
   * Must be JSON-serializable
   */
  result?: unknown;

  /**
   * Error information (if execution failed)
   */
  error?: StructuredError;

  /**
   * Execution time in milliseconds
   */
  executionTimeMs: number;

  /**
   * Memory used in megabytes (if available)
   */
  memoryUsedMb?: number;
}

/**
 * Internal command execution output
 * @internal
 */
export interface CommandOutput {
  success: boolean;
  code: number;
  stdout: string;
  stderr: string;
}
