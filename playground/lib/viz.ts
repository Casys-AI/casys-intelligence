/**
 * Visualization Helpers for AgentCards Playground
 *
 * Mermaid diagram generators for DAGs, GraphRAG, and execution timelines.
 * Use in Jupyter notebooks to visualize workflow structures and execution.
 */

import type { DAGWorkflow, DAGTask } from "../../src/dag/types.ts";

/**
 * Edge representation for GraphRAG visualization
 */
export interface ToolEdge {
  source: string;
  target: string;
  weight: number;
  relationship?: string;
}

/**
 * Execution event for timeline visualization
 */
export interface ExecutionEvent {
  type: "task_start" | "task_complete" | "task_error" | "layer_start" | "layer_complete" | "decision";
  taskId?: string;
  layerIdx?: number;
  timestamp: number;
  status?: "success" | "error" | "pending";
  decisionType?: "ail" | "hil";
  outcome?: string;
}

/**
 * Convert DAG workflow to Mermaid diagram
 *
 * @example
 * ```typescript
 * const mermaid = dagToMermaid(workflow);
 * console.log(mermaid);
 * // Copy output to markdown cell with ```mermaid fence
 * ```
 */
export function dagToMermaid(dag: DAGWorkflow): string {
  const lines: string[] = ["graph TD"];

  // Track nodes without dependencies (entry points)
  const entryNodes = new Set<string>();
  const hasIncoming = new Set<string>();

  // First pass: identify relationships
  for (const task of dag.tasks) {
    if (!task.dependencies || task.dependencies.length === 0) {
      entryNodes.add(task.id);
    }
    for (const dep of task.dependencies || []) {
      hasIncoming.add(task.id);
    }
  }

  // Add standalone nodes (no deps)
  for (const task of dag.tasks) {
    if (entryNodes.has(task.id) && !hasIncoming.has(task.id)) {
      const label = formatTaskLabel(task);
      lines.push(`    ${task.id}[${label}]`);
    }
  }

  // Add edges
  for (const task of dag.tasks) {
    const label = formatTaskLabel(task);
    for (const dep of task.dependencies || []) {
      lines.push(`    ${dep} --> ${task.id}[${label}]`);
    }
  }

  return lines.join("\n");
}

/**
 * Convert DAG layers to Mermaid subgraph diagram
 * Shows parallel execution groups (fan-in/fan-out patterns)
 *
 * @example
 * ```typescript
 * const layers = executor.topologicalSort(dag);
 * const mermaid = layersToMermaid(layers);
 * ```
 */
export function layersToMermaid(layers: DAGTask[][]): string {
  const lines: string[] = ["graph TD"];

  // Create subgraphs for each layer
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    const layerLabel = layer.length > 1 ? "Parallel" : "Sequential";
    lines.push(`    subgraph L${i}["Layer ${i} - ${layerLabel}"]`);

    for (const task of layer) {
      const label = formatTaskLabel(task);
      lines.push(`        ${task.id}[${label}]`);
    }

    lines.push(`    end`);
  }

  // Add inter-layer edges
  for (let i = 0; i < layers.length; i++) {
    for (const task of layers[i]) {
      for (const dep of task.dependencies || []) {
        lines.push(`    ${dep} --> ${task.id}`);
      }
    }
  }

  return lines.join("\n");
}

/**
 * Convert GraphRAG tool relationships to Mermaid diagram
 * Shows tool co-usage patterns with weighted edges
 *
 * @example
 * ```typescript
 * const edges = await graphEngine.getRelatedTools("search_tools");
 * const mermaid = graphragToMermaid(edges);
 * ```
 */
export function graphragToMermaid(
  edges: ToolEdge[],
  options?: { minWeight?: number; maxNodes?: number }
): string {
  const minWeight = options?.minWeight ?? 0.1;
  const maxNodes = options?.maxNodes ?? 20;

  // Filter by weight
  const filteredEdges = edges
    .filter((e) => e.weight >= minWeight)
    .slice(0, maxNodes);

  const lines: string[] = ["graph LR"];

  for (const edge of filteredEdges) {
    const weightLabel = edge.weight.toFixed(2);
    const relationship = edge.relationship || "co-used";
    lines.push(`    ${sanitizeId(edge.source)} -->|${relationship}: ${weightLabel}| ${sanitizeId(edge.target)}`);
  }

  if (filteredEdges.length === 0) {
    lines.push(`    empty[No edges above threshold ${minWeight}]`);
  }

  return lines.join("\n");
}

/**
 * Convert execution events to Mermaid sequence diagram
 * Shows task execution timeline with decision points
 *
 * @example
 * ```typescript
 * const events: ExecutionEvent[] = [];
 * for await (const event of executor.executeStream(dag, "wf-1")) {
 *   events.push(mapToExecutionEvent(event));
 * }
 * const mermaid = executionTimelineToMermaid(events);
 * ```
 */
export function executionTimelineToMermaid(events: ExecutionEvent[]): string {
  const lines: string[] = ["sequenceDiagram"];
  lines.push("    participant E as Executor");
  lines.push("    participant T as Tasks");
  lines.push("    participant D as Decisions");

  for (const event of events) {
    switch (event.type) {
      case "layer_start":
        lines.push(`    Note over E: Layer ${event.layerIdx} start`);
        break;
      case "task_start":
        lines.push(`    E->>T: Start ${event.taskId}`);
        break;
      case "task_complete":
        lines.push(`    T-->>E: ${event.taskId} complete`);
        break;
      case "task_error":
        lines.push(`    T--xE: ${event.taskId} failed`);
        break;
      case "decision":
        const actor = event.decisionType === "hil" ? "Human" : "Agent";
        lines.push(`    E->>D: ${event.decisionType?.toUpperCase()} checkpoint`);
        lines.push(`    D-->>E: ${actor}: ${event.outcome}`);
        break;
      case "layer_complete":
        lines.push(`    Note over E: Layer ${event.layerIdx} complete`);
        break;
    }
  }

  return lines.join("\n");
}

/**
 * Convert GraphRAG edge evolution to comparison diagram
 * Shows before/after weights for learning visualization
 *
 * @example
 * ```typescript
 * const before = await graphEngine.getEdges("tool_a");
 * // ... execute workflow ...
 * const after = await graphEngine.getEdges("tool_a");
 * const mermaid = graphragEvolutionToMermaid(before, after);
 * ```
 */
export function graphragEvolutionToMermaid(
  before: ToolEdge[],
  after: ToolEdge[]
): string {
  const lines: string[] = ["graph TB"];

  // Create maps for comparison
  const beforeMap = new Map(before.map((e) => [`${e.source}-${e.target}`, e.weight]));
  const afterMap = new Map(after.map((e) => [`${e.source}-${e.target}`, e.weight]));

  // Get all unique edges
  const allKeys = new Set([...beforeMap.keys(), ...afterMap.keys()]);

  lines.push(`    subgraph Before["Before Execution"]`);
  for (const edge of before.slice(0, 10)) {
    lines.push(`        B_${sanitizeId(edge.source)} -->|${edge.weight.toFixed(2)}| B_${sanitizeId(edge.target)}`);
  }
  lines.push(`    end`);

  lines.push(`    subgraph After["After Execution (Learning)"]`);
  for (const edge of after.slice(0, 10)) {
    const key = `${edge.source}-${edge.target}`;
    const beforeWeight = beforeMap.get(key) || 0;
    const delta = edge.weight - beforeWeight;
    const deltaStr = delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2);
    lines.push(`        A_${sanitizeId(edge.source)} -->|${edge.weight.toFixed(2)} (${deltaStr})| A_${sanitizeId(edge.target)}`);
  }
  lines.push(`    end`);

  return lines.join("\n");
}

/**
 * Generate a simple stats summary for console output
 */
export function dagStats(dag: DAGWorkflow): string {
  const totalTasks = dag.tasks.length;
  const withDeps = dag.tasks.filter((t) => t.dependencies && t.dependencies.length > 0).length;
  const entryPoints = totalTasks - withDeps;

  return `DAG Stats:
  - Total tasks: ${totalTasks}
  - Entry points: ${entryPoints}
  - With dependencies: ${withDeps}
  - Workflow ID: ${dag.id || "N/A"}`;
}

// --- Helper functions ---

function formatTaskLabel(task: DAGTask): string {
  const toolName = task.tool_name || task.id;
  // Truncate long names
  return toolName.length > 20 ? toolName.substring(0, 17) + "..." : toolName;
}

function sanitizeId(id: string): string {
  // Mermaid IDs can't have special characters
  return id.replace(/[^a-zA-Z0-9_]/g, "_");
}

/**
 * Helper to map ControlledExecutor events to ExecutionEvent format
 */
export function mapExecutorEvent(event: Record<string, unknown>): ExecutionEvent | null {
  const type = event.type as string;
  const timestamp = (event.timestamp as number) || Date.now();

  switch (type) {
    case "layer_start":
      return { type: "layer_start", layerIdx: event.layer as number, timestamp };
    case "task_start":
      return { type: "task_start", taskId: event.task_id as string, timestamp };
    case "task_complete":
      return { type: "task_complete", taskId: event.task_id as string, timestamp, status: "success" };
    case "task_error":
      return { type: "task_error", taskId: event.task_id as string, timestamp, status: "error" };
    case "layer_complete":
      return { type: "layer_complete", layerIdx: event.layer as number, timestamp };
    case "hil_checkpoint":
    case "ail_decision":
      return {
        type: "decision",
        decisionType: type === "hil_checkpoint" ? "hil" : "ail",
        outcome: event.outcome as string,
        timestamp,
      };
    default:
      return null;
  }
}
