# Story 2.2: Parallel Execution Engine

**Epic:** 2 - DAG Execution & Production Readiness
**Story ID:** 2.2
**Status:** TODO
**Estimated Effort:** 4-5 hours

---

## User Story

**As a** power user,
**I want** workflows with independent tools to execute in parallel,
**So that** I save time instead of waiting for sequential execution.

---

## Acceptance Criteria

1. Parallel executor module créé (`src/dag/executor.ts`)
2. DAG traversal avec identification des nodes exécutables en parallèle
3. Promise.all utilisé pour parallel execution de independent branches
4. Sequential execution pour dependent tools (respect topological order)
5. Partial success handling: continue execution même si un tool fail
6. Results aggregation: successes + errors retournés avec codes
7. Performance measurement: latency avant/après parallélisation
8. Target: P95 latency <3 secondes pour workflow 5-tools
9. Benchmarks tests validant 3-5x speedup sur workflows parallélisables

---

## Prerequisites

- Story 2.1 (GraphRAG Engine with Graphology) completed

---

## Technical Notes

### Parallel Executor Implementation
```typescript
// src/dag/executor.ts
export class ParallelExecutor {
  constructor(private mcpClients: Map<string, MCPClient>) {}

  /**
   * Execute DAG with automatic parallelization
   */
  async execute(dag: DAGStructure): Promise<ExecutionResult> {
    const startTime = performance.now();

    // 1. Topological sort to get execution layers
    const layers = this.topologicalSort(dag);

    // 2. Execute layer by layer
    const results = new Map<string, TaskResult>();
    const errors: TaskError[] = [];

    for (const layer of layers) {
      console.log(`⚡ Executing layer with ${layer.length} tasks in parallel`);

      // Execute all tasks in this layer in parallel
      const layerResults = await Promise.allSettled(
        layer.map((task) => this.executeTask(task, results))
      );

      // Collect results
      for (let i = 0; i < layer.length; i++) {
        const task = layer[i];
        const result = layerResults[i];

        if (result.status === "fulfilled") {
          results.set(task.id, {
            taskId: task.id,
            status: "success",
            output: result.value,
            executionTimeMs: result.value.executionTimeMs,
          });
        } else {
          const error = {
            taskId: task.id,
            error: result.reason.message,
            status: "error",
          };
          errors.push(error);
          results.set(task.id, error);
        }
      }
    }

    const totalTime = performance.now() - startTime;

    return {
      results: Array.from(results.values()),
      executionTimeMs: totalTime,
      parallelizationLayers: layers.length,
      errors,
    };
  }

  /**
   * Topological sort to identify parallel execution layers
   */
  private topologicalSort(dag: DAGStructure): Task[][] {
    const layers: Task[][] = [];
    const completed = new Set<string>();
    const remaining = new Map(dag.tasks.map((t) => [t.id, t]));

    while (remaining.size > 0) {
      // Find tasks with all dependencies satisfied
      const ready: Task[] = [];

      for (const [taskId, task] of remaining) {
        const allDepsSatisfied = task.depends_on.every((depId) =>
          completed.has(depId)
        );

        if (allDepsSatisfied) {
          ready.push(task);
        }
      }

      if (ready.length === 0 && remaining.size > 0) {
        throw new Error("Circular dependency detected in DAG");
      }

      // Add ready tasks as a new layer
      layers.push(ready);

      // Mark as completed and remove from remaining
      for (const task of ready) {
        completed.add(task.id);
        remaining.delete(task.id);
      }
    }

    return layers;
  }

  /**
   * Execute a single task
   */
  private async executeTask(
    task: Task,
    previousResults: Map<string, TaskResult>
  ): Promise<any> {
    const startTime = performance.now();

    // 1. Resolve arguments (substitute $OUTPUT references)
    const resolvedArgs = this.resolveArguments(task.arguments, previousResults);

    // 2. Get MCP client for tool's server
    const [serverId, toolName] = task.tool.split(":");
    const client = this.mcpClients.get(serverId);

    if (!client) {
      throw new Error(`MCP client not found for server: ${serverId}`);
    }

    // 3. Execute tool via MCP
    const output = await client.callTool(toolName, resolvedArgs);

    const executionTime = performance.now() - startTime;

    return {
      ...output,
      executionTimeMs: executionTime,
    };
  }

  /**
   * Resolve $OUTPUT[task_id] references in arguments
   */
  private resolveArguments(
    args: Record<string, any>,
    previousResults: Map<string, TaskResult>
  ): Record<string, any> {
    const resolved: Record<string, any> = {};

    for (const [key, value] of Object.entries(args)) {
      if (typeof value === "string" && value.startsWith("$OUTPUT[")) {
        // Extract task ID: $OUTPUT[task1] or $OUTPUT[task1].property
        const match = value.match(/\$OUTPUT\[([^\]]+)\](\.(.+))?/);
        if (match) {
          const taskId = match[1];
          const property = match[3];

          const result = previousResults.get(taskId);
          if (!result || result.status === "error") {
            throw new Error(`Dependency ${taskId} failed or not found`);
          }

          // Get output or nested property
          resolved[key] = property
            ? this.getNestedProperty(result.output, property)
            : result.output;
        }
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  private getNestedProperty(obj: any, path: string): any {
    return path.split(".").reduce((acc, part) => acc?.[part], obj);
  }

  /**
   * Calculate speedup compared to sequential execution
   */
  calculateSpeedup(result: ExecutionResult): number {
    // Sequential time = sum of all task times
    const sequentialTime = result.results.reduce(
      (sum, r) => sum + (r.executionTimeMs || 0),
      0
    );

    // Parallel time = actual execution time
    const parallelTime = result.executionTimeMs;

    return sequentialTime / parallelTime;
  }
}

interface ExecutionResult {
  results: TaskResult[];
  executionTimeMs: number;
  parallelizationLayers: number;
  errors: TaskError[];
}

interface TaskResult {
  taskId: string;
  status: "success" | "error";
  output?: any;
  error?: string;
  executionTimeMs?: number;
}

interface TaskError {
  taskId: string;
  error: string;
  status: "error";
}
```

### Partial Success Handling
```typescript
// Continue execution even if some tasks fail
async execute(dag: DAGStructure): Promise<ExecutionResult> {
  // ...
  for (const layer of layers) {
    const layerResults = await Promise.allSettled(layer.map(...));

    // Collect both successes and failures
    for (let i = 0; i < layer.length; i++) {
      if (result.status === "fulfilled") {
        // Success - continue
        results.set(task.id, ...);
      } else {
        // Failure - log but continue with other tasks
        console.warn(`Task ${task.id} failed: ${result.reason.message}`);
        errors.push({
          taskId: task.id,
          error: result.reason.message,
        });

        // Mark as failed so dependent tasks can detect it
        results.set(task.id, {
          taskId: task.id,
          status: "error",
          error: result.reason.message,
        });
      }
    }
  }

  return { results, errors, ... };
}
```

### Performance Benchmarks
```typescript
Deno.test("Parallel execution speedup", async () => {
  const executor = new ParallelExecutor(mcpClients);

  // DAG with 5 independent tasks (100ms each)
  const dag: DAGStructure = {
    tasks: [
      { id: "t1", tool: "mock:delay", arguments: { ms: 100 }, depends_on: [] },
      { id: "t2", tool: "mock:delay", arguments: { ms: 100 }, depends_on: [] },
      { id: "t3", tool: "mock:delay", arguments: { ms: 100 }, depends_on: [] },
      { id: "t4", tool: "mock:delay", arguments: { ms: 100 }, depends_on: [] },
      { id: "t5", tool: "mock:delay", arguments: { ms: 100 }, depends_on: [] },
    ],
  };

  const result = await executor.execute(dag);

  // Sequential would be 500ms, parallel should be ~100ms
  assert(result.executionTimeMs < 150, "Parallel execution too slow");

  const speedup = executor.calculateSpeedup(result);
  assert(speedup > 3, `Speedup ${speedup}x below 3x target`);
});

Deno.test("Mixed parallel + sequential", async () => {
  const executor = new ParallelExecutor(mcpClients);

  // DAG: [t1, t2] → t3 → [t4, t5]
  const dag: DAGStructure = {
    tasks: [
      { id: "t1", tool: "mock:delay", arguments: { ms: 100 }, depends_on: [] },
      { id: "t2", tool: "mock:delay", arguments: { ms: 100 }, depends_on: [] },
      { id: "t3", tool: "mock:delay", arguments: { ms: 100 }, depends_on: ["t1", "t2"] },
      { id: "t4", tool: "mock:delay", arguments: { ms: 100 }, depends_on: ["t3"] },
      { id: "t5", tool: "mock:delay", arguments: { ms: 100 }, depends_on: ["t3"] },
    ],
  };

  const result = await executor.execute(dag);

  // 3 layers: [t1,t2] → [t3] → [t4,t5] = ~300ms
  assert(result.parallelizationLayers === 3);
  assert(result.executionTimeMs < 350);
});
```

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Parallel executor implemented
- [ ] Topological sort working correctly
- [ ] Promise.all used for parallel layers
- [ ] Partial success handling tested
- [ ] $OUTPUT reference resolution working
- [ ] Performance benchmarks passing (3-5x speedup)
- [ ] Unit and integration tests passing
- [ ] Documentation updated
- [ ] Code reviewed and merged

---

## References

- [Topological Sorting](https://en.wikipedia.org/wiki/Topological_sorting)
- [Promise.allSettled](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled)
- [DAG Execution Patterns](https://en.wikipedia.org/wiki/Directed_acyclic_graph#Parallel_computing)
