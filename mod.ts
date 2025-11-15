/**
 * AgentCards - Public API Exports
 *
 * This module exports the public API for AgentCards.
 *
 * @module mod
 */

export { main } from "./src/main.ts";

// Sandbox executor for secure code execution
export { DenoSandboxExecutor } from "./src/sandbox/executor.ts";
export type {
  SandboxConfig,
  ExecutionResult,
  StructuredError,
  ErrorType,
} from "./src/sandbox/types.ts";

// Tool context builder for MCP tool injection
export {
  ContextBuilder,
  wrapMCPClient,
  MCPToolError,
  InvalidToolNameError,
} from "./src/sandbox/context-builder.ts";
export type { ToolContext, ToolFunction } from "./src/sandbox/context-builder.ts";

// DAG Execution with Adaptive Feedback Loops (Epic 2.5)
export { ParallelExecutor } from "./src/dag/executor.ts";
export { ControlledExecutor } from "./src/dag/controlled-executor.ts";
export { CheckpointManager } from "./src/dag/checkpoint-manager.ts";
export type {
  DAGExecutionResult,
  ExecutorConfig,
  TaskError,
  TaskResult,
  ToolExecutor,
  ExecutionEvent,
  Command,
  Checkpoint,
} from "./src/dag/types.ts";
export {
  createInitialState,
  getStateSnapshot,
  updateState,
  validateStateInvariants,
  messagesReducer,
  tasksReducer,
  decisionsReducer,
  contextReducer,
} from "./src/dag/state.ts";
export type {
  WorkflowState,
  StateUpdate,
  Message,
  Decision,
} from "./src/dag/state.ts";
export { EventStream } from "./src/dag/event-stream.ts";
export type { EventStreamStats } from "./src/dag/event-stream.ts";
export { CommandQueue, AsyncQueue, isValidCommand } from "./src/dag/command-queue.ts";
