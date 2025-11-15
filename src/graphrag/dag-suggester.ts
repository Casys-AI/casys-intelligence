/**
 * DAG Suggester
 *
 * Combines vector search and graph algorithms to suggest optimal DAG structures
 * for workflow execution.
 *
 * @module graphrag/dag-suggester
 */

import * as log from "@std/log";
import type { VectorSearch } from "../vector/search.ts";
import type { GraphRAGEngine } from "./graph-engine.ts";
import type {
  WorkflowIntent,
  SuggestedDAG,
  DependencyPath,
  DAGStructure,
} from "./types.ts";

/**
 * DAG Suggester
 *
 * Orchestrates vector search for semantic candidate selection and graph algorithms
 * for dependency inference and DAG construction.
 */
export class DAGSuggester {
  constructor(
    private graphEngine: GraphRAGEngine,
    private vectorSearch: VectorSearch,
  ) {}

  /**
   * Get GraphRAGEngine instance for feedback loop (Story 2.5-3 Task 4)
   *
   * Exposes GraphRAGEngine to allow ControlledExecutor to call
   * updateFromExecution() after workflow completion.
   *
   * @returns GraphRAGEngine instance
   */
  getGraphEngine(): GraphRAGEngine {
    return this.graphEngine;
  }

  /**
   * Suggest DAG structure for a given workflow intent
   *
   * Process:
   * 1. Vector search for semantic candidates (top-10)
   * 2. Rank by PageRank for importance
   * 3. Build DAG using graph topology
   * 4. Calculate confidence score
   * 5. Find alternative tools from same community
   *
   * @param intent - Workflow intent with natural language description
   * @returns Suggested DAG with confidence, rationale, and alternatives, or null if confidence too low
   */
  async suggestDAG(intent: WorkflowIntent): Promise<SuggestedDAG | null> {
    try {
      // 1. Vector search for semantic candidates
      const candidates = await this.vectorSearch.searchTools(intent.text, 10, 0.6);

      if (candidates.length === 0) {
        log.info(`No semantic candidates found for intent: "${intent.text}"`);
        return null;
      }

      // 2. Rank by PageRank (Graphology)
      const rankedCandidates = candidates
        .map((c) => ({
          ...c,
          pageRank: this.graphEngine.getPageRank(c.toolId),
        }))
        .sort((a, b) => b.pageRank - a.pageRank)
        .slice(0, 5);

      log.debug(
        `Ranked candidates by PageRank: ${rankedCandidates.map((c) => `${c.toolId} (${c.pageRank.toFixed(3)})`).join(", ")}`,
      );

      // 3. Build DAG using graph topology (Graphology)
      const dagStructure = this.graphEngine.buildDAG(
        rankedCandidates.map((c) => c.toolId),
      );

      // 4. Extract dependency paths for explainability
      const dependencyPaths = this.extractDependencyPaths(rankedCandidates.map((c) => c.toolId));

      // 5. Calculate confidence
      const confidence = this.calculateConfidence(rankedCandidates, dependencyPaths);

      if (confidence < 0.50) {
        log.info(`Confidence too low (${confidence.toFixed(2)}) for intent: "${intent.text}"`);
        return null;
      }

      // 6. Find alternatives from same community (Graphology)
      const alternatives = this.graphEngine
        .findCommunityMembers(rankedCandidates[0].toolId)
        .slice(0, 3);

      // 7. Generate rationale
      const rationale = this.generateRationale(rankedCandidates, dependencyPaths);

      return {
        dagStructure,
        confidence,
        rationale,
        dependencyPaths,
        alternatives,
      };
    } catch (error) {
      log.error(`DAG suggestion failed: ${error}`);
      return null;
    }
  }

  /**
   * Extract dependency paths for explainability
   *
   * Finds paths between tools and generates explanations for dependencies.
   *
   * @param toolIds - Array of tool IDs in the DAG
   * @returns Array of dependency paths with explanations
   */
  private extractDependencyPaths(toolIds: string[]): DependencyPath[] {
    const paths: DependencyPath[] = [];

    for (let i = 0; i < toolIds.length; i++) {
      for (let j = 0; j < i; j++) {
        const fromTool = toolIds[j];
        const toTool = toolIds[i];

        const path = this.graphEngine.findShortestPath(fromTool, toTool);

        if (path && path.length <= 4) {
          paths.push({
            from: fromTool,
            to: toTool,
            path: path,
            hops: path.length - 1,
            explanation: this.explainPath(path),
            confidence: this.calculatePathConfidence(path.length),
          });
        }
      }
    }

    return paths;
  }

  /**
   * Explain a dependency path
   *
   * @param path - Array of tool IDs representing the path
   * @returns Human-readable explanation
   */
  private explainPath(path: string[]): string {
    if (path.length === 2) {
      return `Direct dependency: ${path[0]} → ${path[1]}`;
    } else {
      const intermediate = path.slice(1, -1).join(" → ");
      return `Transitive: ${path[0]} → ${intermediate} → ${path[path.length - 1]}`;
    }
  }

  /**
   * Calculate path confidence based on hop count
   *
   * Direct paths (1 hop) have highest confidence, decreasing with distance.
   *
   * @param hops - Number of hops in the path
   * @returns Confidence score between 0 and 1
   */
  private calculatePathConfidence(hops: number): number {
    if (hops === 1) return 0.95;
    if (hops === 2) return 0.80;
    if (hops === 3) return 0.65;
    return 0.50;
  }

  /**
   * Calculate overall confidence score
   *
   * Combines semantic similarity, PageRank importance, and dependency path strength.
   *
   * @param candidates - Ranked candidate tools with scores
   * @param dependencyPaths - Extracted dependency paths
   * @returns Confidence score between 0 and 1
   */
  private calculateConfidence(
    candidates: Array<{ score: number; pageRank: number }>,
    dependencyPaths: DependencyPath[],
  ): number {
    if (candidates.length === 0) return 0;

    // Semantic score (top candidate)
    const semanticScore = candidates[0].score;

    // PageRank score (average of top 3)
    const pageRankScore = candidates.slice(0, 3).reduce((sum, c) => sum + c.pageRank, 0) /
      Math.min(3, candidates.length);

    // Path strength (average confidence of all paths)
    const pathStrength = dependencyPaths.length > 0
      ? dependencyPaths.reduce((sum, p) => sum + (p.confidence || 0.5), 0) / dependencyPaths.length
      : 0.5;

    // Weighted combination
    // Semantic: 50%, PageRank: 30%, Path strength: 20%
    return semanticScore * 0.5 + pageRankScore * 0.3 + pathStrength * 0.2;
  }

  /**
   * Generate human-readable rationale for the suggested DAG
   *
   * @param candidates - Ranked candidate tools
   * @param dependencyPaths - Extracted dependency paths
   * @returns Rationale text
   */
  private generateRationale(
    candidates: Array<{ toolId: string; score: number; pageRank: number }>,
    dependencyPaths: DependencyPath[],
  ): string {
    const topTool = candidates[0];
    const parts: string[] = [];

    // Semantic match
    parts.push(`Based on semantic similarity (${(topTool.score * 100).toFixed(0)}%)`);

    // PageRank importance
    if (topTool.pageRank > 0.01) {
      parts.push(`PageRank importance (${(topTool.pageRank * 100).toFixed(1)}%)`);
    }

    // Dependency strength
    if (dependencyPaths.length > 0) {
      const directDeps = dependencyPaths.filter((p) => p.hops === 1).length;
      parts.push(`${dependencyPaths.length} dependency paths (${directDeps} direct)`);
    }

    return parts.join(" and ") + ".";
  }

  /**
   * Replan DAG by incorporating new tools from GraphRAG (Story 2.5-3 Task 3)
   *
   * Called during runtime when agent discovers new requirements.
   * Queries GraphRAG for relevant tools and merges them into existing DAG.
   *
   * Flow:
   * 1. Query GraphRAG vector search for new requirement
   * 2. Rank tools by PageRank importance
   * 3. Build new DAG nodes from top-k tools
   * 4. Merge with existing DAG (preserve completed layers)
   * 5. Validate no cycles introduced
   *
   * Performance target: <200ms P95
   *
   * @param currentDAG - Current DAG structure
   * @param context - Replanning context (completed tasks, new requirement, etc.)
   * @returns Augmented DAG structure with new nodes
   */
  async replanDAG(
    currentDAG: DAGStructure,
    context: {
      completedTasks: Array<{ taskId: string; status: string }>;
      newRequirement: string;
      availableContext: Record<string, unknown>;
    },
  ): Promise<DAGStructure> {
    const startTime = performance.now();

    try {
      log.info(
        `Replanning DAG with new requirement: "${context.newRequirement}"`,
      );

      // 1. Query GraphRAG vector search for relevant tools
      const candidates = await this.vectorSearch.searchTools(
        context.newRequirement,
        5, // Top-5 candidates
        0.5, // Lower threshold for replanning (more permissive)
      );

      if (candidates.length === 0) {
        log.warn("No relevant tools found for replanning requirement");
        // Return current DAG unchanged
        return currentDAG;
      }

      // 2. Rank by PageRank importance
      const rankedCandidates = candidates
        .map((c) => ({
          ...c,
          pageRank: this.graphEngine.getPageRank(c.toolId),
        }))
        .sort((a, b) => b.pageRank - a.pageRank)
        .slice(0, 3); // Top-3 for replanning

      log.debug(
        `Ranked replan candidates: ${
          rankedCandidates.map((c) => `${c.toolId} (PR: ${c.pageRank.toFixed(3)})`).join(", ")
        }`,
      );

      // 3. Build new tasks from candidates
      const existingTaskIds = currentDAG.tasks.map((t) => t.id);
      const newTasks = rankedCandidates.map((candidate, idx) => {
        const newTaskId = `replan_task_${existingTaskIds.length + idx}`;

        // Infer dependencies from context (completed tasks provide outputs)
        const dependsOn: string[] = [];

        // Simple heuristic: new tasks depend on last successful task
        const lastSuccessfulTask = context.completedTasks
          .filter((t) => t.status === "success")
          .slice(-1)[0];

        if (lastSuccessfulTask) {
          dependsOn.push(lastSuccessfulTask.taskId);
        }

        return {
          id: newTaskId,
          tool: candidate.toolId,
          arguments: context.availableContext || {},
          depends_on: dependsOn,
        };
      });

      // 4. Merge new tasks with existing DAG
      const augmentedDAG: DAGStructure = {
        tasks: [...currentDAG.tasks, ...newTasks],
      };

      // 5. Validate no cycles introduced
      // Simple cycle detection: topological sort should succeed
      try {
        this.validateDAGNoCycles(augmentedDAG);
      } catch (error) {
        log.error(`Cycle detected in replanned DAG: ${error}`);
        // Reject replan, return original DAG
        return currentDAG;
      }

      const replanTime = performance.now() - startTime;
      log.info(
        `✓ DAG replanned: added ${newTasks.length} new tasks (${replanTime.toFixed(1)}ms)`,
      );

      return augmentedDAG;
    } catch (error) {
      log.error(`DAG replanning failed: ${error}`);
      // Graceful degradation: return current DAG unchanged
      return currentDAG;
    }
  }

  /**
   * Validate DAG has no cycles using topological sort
   *
   * Throws error if cycle detected.
   *
   * @param dag - DAG structure to validate
   */
  private validateDAGNoCycles(dag: DAGStructure): void {
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, string[]>();

    // Build adjacency list and in-degree map
    for (const task of dag.tasks) {
      inDegree.set(task.id, task.depends_on.length);
      for (const dep of task.depends_on) {
        if (!adjList.has(dep)) adjList.set(dep, []);
        adjList.get(dep)!.push(task.id);
      }
    }

    // Kahn's algorithm (topological sort)
    const queue: string[] = [];
    for (const [taskId, degree] of inDegree.entries()) {
      if (degree === 0) queue.push(taskId);
    }

    const sorted: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      sorted.push(current);

      const neighbors = adjList.get(current) || [];
      for (const neighbor of neighbors) {
        const newDegree = inDegree.get(neighbor)! - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) queue.push(neighbor);
      }
    }

    if (sorted.length !== dag.tasks.length) {
      throw new Error(
        `Cycle detected: topological sort produced ${sorted.length} tasks, expected ${dag.tasks.length}`,
      );
    }
  }
}
