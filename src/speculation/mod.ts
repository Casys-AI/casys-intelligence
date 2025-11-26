/**
 * Speculation Module
 *
 * Story 3.5-1: DAG Suggester & Speculative Execution
 *
 * This module provides speculative execution capabilities:
 * - SpeculationManager: Manages speculation triggers and feedback loops
 * - SpeculativeExecutor: Executes predictions in isolated sandboxes
 *
 * @module speculation
 */

// Core components
export { SpeculationManager, DEFAULT_SPECULATION_CONFIG } from "./speculation-manager.ts";
export type { SpeculationOutcome } from "./speculation-manager.ts";

export { SpeculativeExecutor } from "./speculative-executor.ts";
export type { SpeculativeExecutorConfig } from "./speculative-executor.ts";

// Re-export types from graphrag for convenience
export type {
  PredictedNode,
  SpeculationConfig,
  SpeculationCache,
  SpeculationMetrics,
  CompletedTask,
  WorkflowPredictionState,
} from "../graphrag/types.ts";
