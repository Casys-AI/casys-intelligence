# Story 2.3: SSE Streaming pour Progressive Results

**Epic:** 2 - DAG Execution & Production Readiness
**Story ID:** 2.3
**Status:** TODO
**Estimated Effort:** 3-4 hours

---

## User Story

**As a** user waiting for workflow results,
**I want** to see results streamed progressively as they complete,
**So that** I get feedback immediately instead of waiting for all tools to finish.

---

## Acceptance Criteria

1. SSE (Server-Sent Events) implementation pour streaming
2. Event types définis: `task_start`, `task_complete`, `execution_complete`, `error`
3. Results streamés dès disponibilité (pas de wait-all-then-return)
4. Event payload: tool_id, status, result, timestamp
5. Client-side handling simulé dans tests
6. Graceful degradation si SSE unavailable (fallback to batch response)
7. Max event buffer size pour éviter memory leaks

---

## Prerequisites

- Story 2.2 (parallel executor) completed

---

## Technical Notes

### SSE Event Types
```typescript
// src/dag/streaming.ts
export type SSEEvent =
  | TaskStartEvent
  | TaskCompleteEvent
  | ExecutionCompleteEvent
  | ErrorEvent;

interface TaskStartEvent {
  type: "task_start";
  data: {
    taskId: string;
    tool: string;
    timestamp: string;
  };
}

interface TaskCompleteEvent {
  type: "task_complete";
  data: {
    taskId: string;
    tool: string;
    status: "success" | "error";
    output?: any;
    error?: string;
    executionTimeMs: number;
    timestamp: string;
  };
}

interface ExecutionCompleteEvent {
  type: "execution_complete";
  data: {
    totalTasks: number;
    successCount: number;
    errorCount: number;
    totalExecutionTimeMs: number;
    speedup: number;
    timestamp: string;
  };
}

interface ErrorEvent {
  type: "error";
  data: {
    taskId?: string;
    error: string;
    timestamp: string;
  };
}
```

### Streaming Executor
```typescript
export class StreamingExecutor extends ParallelExecutor {
  /**
   * Execute DAG with SSE streaming
   */
  async executeWithStreaming(
    dag: DAGStructure,
    eventStream: WritableStream<SSEEvent>
  ): Promise<ExecutionResult> {
    const writer = eventStream.getWriter();
    const startTime = performance.now();

    try {
      const layers = this.topologicalSort(dag);
      const results = new Map<string, TaskResult>();
      const errors: TaskError[] = [];

      for (const layer of layers) {
        // Execute layer in parallel with streaming
        const layerPromises = layer.map(async (task) => {
          // Send task_start event
          await writer.write({
            type: "task_start",
            data: {
              taskId: task.id,
              tool: task.tool,
              timestamp: new Date().toISOString(),
            },
          });

          try {
            const result = await this.executeTask(task, results);

            // Send task_complete event (success)
            await writer.write({
              type: "task_complete",
              data: {
                taskId: task.id,
                tool: task.tool,
                status: "success",
                output: result,
                executionTimeMs: result.executionTimeMs,
                timestamp: new Date().toISOString(),
              },
            });

            return { task, result, status: "success" };
          } catch (error) {
            // Send task_complete event (error)
            await writer.write({
              type: "task_complete",
              data: {
                taskId: task.id,
                tool: task.tool,
                status: "error",
                error: error.message,
                executionTimeMs: 0,
                timestamp: new Date().toISOString(),
              },
            });

            return { task, error, status: "error" };
          }
        });

        // Wait for layer to complete
        const layerResults = await Promise.allSettled(layerPromises);

        // Collect results
        for (const settledResult of layerResults) {
          if (settledResult.status === "fulfilled") {
            const { task, result, status, error } = settledResult.value;

            if (status === "success") {
              results.set(task.id, {
                taskId: task.id,
                status: "success",
                output: result,
                executionTimeMs: result.executionTimeMs,
              });
            } else {
              errors.push({
                taskId: task.id,
                error: error.message,
                status: "error",
              });
              results.set(task.id, {
                taskId: task.id,
                status: "error",
                error: error.message,
              });
            }
          }
        }
      }

      const totalTime = performance.now() - startTime;
      const speedup = this.calculateSpeedup({
        results: Array.from(results.values()),
        executionTimeMs: totalTime,
        parallelizationLayers: layers.length,
        errors,
      });

      // Send execution_complete event
      await writer.write({
        type: "execution_complete",
        data: {
          totalTasks: dag.tasks.length,
          successCount: results.size - errors.length,
          errorCount: errors.length,
          totalExecutionTimeMs: totalTime,
          speedup,
          timestamp: new Date().toISOString(),
        },
      });

      return {
        results: Array.from(results.values()),
        executionTimeMs: totalTime,
        parallelizationLayers: layers.length,
        errors,
      };
    } finally {
      await writer.close();
    }
  }
}
```

### SSE HTTP Handler
```typescript
// src/server/sse-handler.ts
export async function handleSSERequest(
  request: Request,
  dag: DAGStructure
): Promise<Response> {
  const { readable, writable } = new TransformStream();

  // Start execution in background
  (async () => {
    const encoder = new TextEncoder();
    const writer = writable.getWriter();

    try {
      const eventStream = new WritableStream<SSEEvent>({
        write(event) {
          // Format as SSE
          const sseData = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
          return writer.write(encoder.encode(sseData));
        },
      });

      const executor = new StreamingExecutor(mcpClients);
      await executor.executeWithStreaming(dag, eventStream);
    } catch (error) {
      // Send error event
      const errorData = `event: error\ndata: ${JSON.stringify({
        error: error.message,
        timestamp: new Date().toISOString(),
      })}\n\n`;
      await writer.write(encoder.encode(errorData));
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
```

### Client-Side Example
```typescript
// Example: Consuming SSE stream
async function consumeWorkflowStream(workflowUrl: string) {
  const eventSource = new EventSource(workflowUrl);

  eventSource.addEventListener("task_start", (event) => {
    const data = JSON.parse(event.data);
    console.log(`🔄 Starting: ${data.tool}`);
  });

  eventSource.addEventListener("task_complete", (event) => {
    const data = JSON.parse(event.data);
    if (data.status === "success") {
      console.log(`✓ Completed: ${data.tool} (${data.executionTimeMs}ms)`);
    } else {
      console.log(`✗ Failed: ${data.tool} - ${data.error}`);
    }
  });

  eventSource.addEventListener("execution_complete", (event) => {
    const data = JSON.parse(event.data);
    console.log(`\n✅ Workflow complete!`);
    console.log(`   Success: ${data.successCount}/${data.totalTasks}`);
    console.log(`   Time: ${data.totalExecutionTimeMs}ms`);
    console.log(`   Speedup: ${data.speedup.toFixed(2)}x`);
    eventSource.close();
  });

  eventSource.addEventListener("error", (event) => {
    const data = JSON.parse(event.data);
    console.error(`❌ Error: ${data.error}`);
    eventSource.close();
  });
}
```

### Graceful Degradation (Fallback)
```typescript
// If client doesn't support SSE, fall back to batch response
export async function handleWorkflowRequest(
  request: Request,
  dag: DAGStructure
): Promise<Response> {
  const acceptsSSE = request.headers.get("Accept")?.includes("text/event-stream");

  if (acceptsSSE) {
    // SSE streaming
    return handleSSERequest(request, dag);
  } else {
    // Batch response (wait for all results)
    const executor = new ParallelExecutor(mcpClients);
    const result = await executor.execute(dag);

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  }
}
```

### Memory Management
```typescript
// Limit event buffer size to prevent memory leaks
class BufferedEventStream extends WritableStream<SSEEvent> {
  private buffer: SSEEvent[] = [];
  private readonly MAX_BUFFER_SIZE = 1000;

  constructor(private downstream: WritableStream<SSEEvent>) {
    super({
      write: async (event) => {
        this.buffer.push(event);

        // Flush if buffer full
        if (this.buffer.length >= this.MAX_BUFFER_SIZE) {
          await this.flush();
        }

        return this.downstream.getWriter().write(event);
      },
    });
  }

  async flush() {
    // Could persist to disk or log
    console.warn(`Event buffer flushed (${this.buffer.length} events)`);
    this.buffer = [];
  }
}
```

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] SSE streaming implemented
- [ ] Event types defined and documented
- [ ] StreamingExecutor working correctly
- [ ] Progressive results delivered (not batched)
- [ ] Graceful degradation to batch mode
- [ ] Memory management with buffer limits
- [ ] Unit tests for streaming events
- [ ] Integration test with mock SSE client
- [ ] Documentation updated
- [ ] Code reviewed and merged

---

## References

- [Server-Sent Events (SSE)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [EventSource API](https://developer.mozilla.org/en-US/docs/Web/API/EventSource)
- [Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API)
