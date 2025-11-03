# Story 2.6: Error Handling & Resilience

**Epic:** 2 - DAG Execution & Production Readiness
**Story ID:** 2.6
**Status:** TODO
**Estimated Effort:** 4-5 hours

---

## User Story

**As a** developer,
**I want** robust error handling throughout AgentCards,
**So that** the system degrades gracefully instead of crashing.

---

## Acceptance Criteria

1. Try-catch wrappers autour de all async operations
2. Error types définis: MCPServerError, VectorSearchError, DAGExecutionError
3. User-friendly error messages avec suggestions de resolution
4. Rollback capability pour failed migrations
5. Partial workflow success (return succès même si some tools fail)
6. Timeout handling (default 30s per tool execution)
7. Rate limiting pour prevent MCP server overload
8. Error logs persistés pour post-mortem analysis

---

## Prerequisites

- Story 2.5 (health checks) completed

---

## Technical Notes

### Custom Error Types
```typescript
// src/errors/error-types.ts

/**
 * Base error class for AgentCards
 */
export class AgentCardsError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = false,
    public suggestion?: string
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * MCP Server connection/communication errors
 */
export class MCPServerError extends AgentCardsError {
  constructor(
    public serverId: string,
    message: string,
    public originalError?: Error
  ) {
    super(
      message,
      "MCP_SERVER_ERROR",
      true, // Recoverable - can continue with other servers
      `Check server configuration for '${serverId}' or run 'agentcards status'`
    );
  }
}

/**
 * Vector search errors
 */
export class VectorSearchError extends AgentCardsError {
  constructor(message: string, public query?: string) {
    super(
      message,
      "VECTOR_SEARCH_ERROR",
      true,
      "Try a different query or check database integrity"
    );
  }
}

/**
 * DAG execution errors
 */
export class DAGExecutionError extends AgentCardsError {
  constructor(
    message: string,
    public taskId?: string,
    public recoverable: boolean = false
  ) {
    super(
      message,
      "DAG_EXECUTION_ERROR",
      recoverable,
      recoverable
        ? "This task failed but workflow continues"
        : "Workflow execution halted"
    );
  }
}

/**
 * Database errors
 */
export class DatabaseError extends AgentCardsError {
  constructor(message: string, public operation: string) {
    super(
      message,
      "DATABASE_ERROR",
      false, // Not recoverable - database is critical
      "Check database file permissions and integrity"
    );
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends AgentCardsError {
  constructor(message: string, public configKey?: string) {
    super(
      message,
      "CONFIGURATION_ERROR",
      false,
      "Run 'agentcards init' to reconfigure"
    );
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends AgentCardsError {
  constructor(
    public operation: string,
    public timeoutMs: number
  ) {
    super(
      `Operation '${operation}' timed out after ${timeoutMs}ms`,
      "TIMEOUT_ERROR",
      true,
      "Increase timeout or check server responsiveness"
    );
  }
}
```

### Error Handler Utility
```typescript
// src/errors/error-handler.ts
import * as log from "https://deno.land/std/log/mod.ts";

export class ErrorHandler {
  /**
   * Handle error with logging and user-friendly message
   */
  static handle(error: Error, context?: string): void {
    const logger = log.getLogger("error");

    if (error instanceof AgentCardsError) {
      // Custom error - log with context
      logger.error(
        `[${error.code}] ${error.message}`,
        {
          code: error.code,
          recoverable: error.recoverable,
          context,
        }
      );

      // Show user-friendly message
      if (error.recoverable) {
        console.warn(`⚠️  ${error.message}`);
      } else {
        console.error(`❌ ${error.message}`);
      }

      if (error.suggestion) {
        console.log(`💡 Suggestion: ${error.suggestion}`);
      }
    } else {
      // Unknown error - log full stack
      logger.error(`Unexpected error: ${error.message}`, {
        stack: error.stack,
        context,
      });

      console.error(`❌ Unexpected error: ${error.message}`);
      console.log(`💡 Please report this issue with logs from ~/.agentcards/logs/`);
    }
  }

  /**
   * Wrap async operation with error handling
   */
  static async wrapAsync<T>(
    operation: () => Promise<T>,
    context: string,
    fallback?: T
  ): Promise<T | undefined> {
    try {
      return await operation();
    } catch (error) {
      this.handle(error, context);

      if (fallback !== undefined) {
        return fallback;
      }

      throw error; // Re-throw if no fallback
    }
  }

  /**
   * Persist error to database for post-mortem analysis
   */
  static async logToDatabase(
    db: PGlite,
    error: Error,
    context?: Record<string, any>
  ): Promise<void> {
    try {
      await db.exec(
        `
        INSERT INTO error_log (error_type, message, stack, context, timestamp)
        VALUES ($1, $2, $3, $4, NOW())
      `,
        [
          error.name,
          error.message,
          error.stack || null,
          JSON.stringify(context || {}),
        ]
      );
    } catch (dbError) {
      // If database logging fails, just log to console
      console.error("Failed to log error to database:", dbError);
    }
  }
}
```

### Timeout Wrapper
```typescript
// src/utils/timeout.ts

/**
 * Execute operation with timeout
 */
export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new TimeoutError(operationName, timeoutMs));
    }, timeoutMs);
  });

  return Promise.race([operation, timeoutPromise]);
}

// Usage example
const result = await withTimeout(
  client.callTool("slow-tool", args),
  30000, // 30s timeout
  "slow-tool execution"
);
```

### Rate Limiter
```typescript
// src/utils/rate-limiter.ts

export class RateLimiter {
  private requestCounts = new Map<string, number[]>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(maxRequests: number = 10, windowMs: number = 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if request is allowed
   */
  async checkLimit(serverId: string): Promise<boolean> {
    const now = Date.now();
    const requests = this.requestCounts.get(serverId) || [];

    // Remove old requests outside window
    const validRequests = requests.filter((time) => now - time < this.windowMs);

    if (validRequests.length >= this.maxRequests) {
      return false; // Rate limit exceeded
    }

    // Add current request
    validRequests.push(now);
    this.requestCounts.set(serverId, validRequests);

    return true;
  }

  /**
   * Wait until request is allowed (with backoff)
   */
  async waitForSlot(serverId: string): Promise<void> {
    while (!(await this.checkLimit(serverId))) {
      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

// Usage in executor
export class ParallelExecutor {
  private rateLimiter = new RateLimiter(10, 1000); // 10 req/sec per server

  private async executeTask(task: Task): Promise<any> {
    const [serverId] = task.tool.split(":");

    // Rate limit check
    await this.rateLimiter.waitForSlot(serverId);

    // Execute with timeout
    return await withTimeout(
      this.doExecuteTask(task),
      30000,
      `task ${task.id}`
    );
  }
}
```

### Graceful Degradation in Vector Search
```typescript
// src/vector/vector-search.ts
export class VectorSearch {
  async searchTools(
    query: string,
    topK: number = 5
  ): Promise<SearchResult[]> {
    try {
      // Try vector search first
      return await this.vectorSearchInternal(query, topK);
    } catch (error) {
      // Fallback: keyword search
      console.warn("⚠️  Vector search failed, falling back to keyword search");

      try {
        return await this.keywordSearchFallback(query, topK);
      } catch (fallbackError) {
        throw new VectorSearchError(
          "Both vector and keyword search failed",
          query
        );
      }
    }
  }

  private async keywordSearchFallback(
    query: string,
    topK: number
  ): Promise<SearchResult[]> {
    // Simple keyword matching
    const results = await this.db.query(
      `
      SELECT tool_id, tool_name, ts.schema_json
      FROM tool_embedding te
      JOIN tool_schema ts ON te.tool_id = ts.tool_id
      WHERE tool_name ILIKE $1 OR ts.schema_json::text ILIKE $1
      LIMIT $2
    `,
      [`%${query}%`, topK]
    );

    return results.map((r) => ({
      toolId: r.tool_id,
      toolName: r.tool_name,
      score: 0.5, // Fixed score for keyword match
      schema: JSON.parse(r.schema_json),
    }));
  }
}
```

### Error Log Schema
```sql
-- Migration: Add error logging table
CREATE TABLE error_log (
  id SERIAL PRIMARY KEY,
  error_type TEXT NOT NULL,
  message TEXT NOT NULL,
  stack TEXT,
  context JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_error_log_timestamp ON error_log (timestamp DESC);
CREATE INDEX idx_error_log_type ON error_log (error_type);
```

### Rollback Capability for Migrations
```typescript
// src/db/migrator.ts
export class DatabaseMigrator {
  async migrate(): Promise<void> {
    const currentVersion = await this.getCurrentVersion();

    try {
      for (const migration of this.migrations) {
        if (migration.version > currentVersion) {
          console.log(`⬆️  Migrating to version ${migration.version}...`);

          await migration.up(this.db);

          await this.updateVersion(migration.version);

          console.log(`✓ Migration ${migration.version} complete`);
        }
      }
    } catch (error) {
      console.error(`❌ Migration failed: ${error.message}`);
      console.log(`🔄 Rolling back...`);

      // Rollback to previous version
      await this.rollback(currentVersion);

      throw new DatabaseError(
        `Migration failed and was rolled back to version ${currentVersion}`,
        "migration"
      );
    }
  }

  private async rollback(targetVersion: number): Promise<void> {
    const currentVersion = await this.getCurrentVersion();

    for (let v = currentVersion; v > targetVersion; v--) {
      const migration = this.migrations.find((m) => m.version === v);

      if (migration && migration.down) {
        console.log(`⬇️  Rolling back migration ${v}...`);
        await migration.down(this.db);
      }
    }

    await this.updateVersion(targetVersion);
    console.log(`✓ Rollback complete (version ${targetVersion})`);
  }
}
```

### Integration Tests for Error Handling
```typescript
Deno.test("Error handling - MCP server unreachable", async () => {
  const executor = new ParallelExecutor(mcpClients);

  // Mock unreachable server
  const dag: DAGStructure = {
    tasks: [
      {
        id: "t1",
        tool: "unreachable-server:tool",
        arguments: {},
        depends_on: [],
      },
    ],
  };

  const result = await executor.execute(dag);

  assert(result.errors.length === 1);
  assert(result.errors[0].taskId === "t1");
});

Deno.test("Error handling - timeout", async () => {
  const slowOperation = new Promise((resolve) => setTimeout(resolve, 5000));

  await assertRejects(
    async () => {
      await withTimeout(slowOperation, 1000, "slow-op");
    },
    TimeoutError,
    "timed out after 1000ms"
  );
});

Deno.test("Error handling - rate limiting", async () => {
  const rateLimiter = new RateLimiter(5, 1000); // 5 req/sec

  // First 5 should succeed
  for (let i = 0; i < 5; i++) {
    assert(await rateLimiter.checkLimit("test-server"));
  }

  // 6th should fail
  assert(!(await rateLimiter.checkLimit("test-server")));
});
```

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Custom error types defined and documented
- [ ] ErrorHandler utility implemented
- [ ] Timeout wrapper working
- [ ] Rate limiter implemented
- [ ] Graceful degradation for vector search
- [ ] Error logging to database
- [ ] Rollback capability for migrations
- [ ] All async operations wrapped with error handling
- [ ] User-friendly error messages with suggestions
- [ ] Integration tests for error scenarios
- [ ] Documentation updated
- [ ] Code reviewed and merged

---

## References

- [Error Handling Best Practices](https://nodejs.org/en/docs/guides/error-handling)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Rate Limiting Algorithms](https://en.wikipedia.org/wiki/Rate_limiting)
- [Graceful Degradation](https://developer.mozilla.org/en-US/docs/Glossary/Graceful_degradation)
