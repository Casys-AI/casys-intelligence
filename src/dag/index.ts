/**
 * DAG Execution Module
 *
 * Provides parallel execution of DAG workflows with automatic parallelization
 * and SSE streaming for progressive results.
 *
 * @module dag
 */

export { ParallelExecutor } from "./executor.ts";
export type {
  DAGExecutionResult,
  ExecutorConfig,
  TaskError,
  TaskResult,
  ToolExecutor,
} from "./types.ts";

// SSE Streaming
export { BufferedEventStream, StreamingExecutor } from "./streaming.ts";
export type {
  BufferedStreamConfig,
  ErrorEvent,
  ExecutionCompleteEvent,
  SSEEvent,
  TaskCompleteEvent,
  TaskStartEvent,
} from "./streaming.ts";
