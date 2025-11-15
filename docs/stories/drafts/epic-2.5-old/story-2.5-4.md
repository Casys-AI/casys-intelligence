# Story 2.5-4: Speculative Execution + GraphRAG Feedback Loop

**Epic:** 2.5 - Adaptive DAG Feedback Loops
**Story ID:** 2.5-4
**Status:** drafted
**Estimated Effort:** 3-4 heures
**Priority:** P1 (Depends on 2.5-1, 2.5-2, 2.5-3)

---

## User Story

**As a** developer building intelligent agent workflows,
**I want** speculative execution based on GraphRAG predictions with continuous learning,
**So that** workflows execute faster (0ms latency) and improve over time from usage patterns.

---

## Acceptance Criteria

1. ✅ DAGSuggester.predictNextNodes() implemented
2. ✅ Confidence-based speculative execution (threshold >0.7)
3. ✅ GraphRAGEngine.updateFromExecution() integration for feedback learning
4. ✅ Speculative tasks execute in background during agent thinking
5. ✅ Results ready when agent confirms (0ms perceived latency)
6. ✅ Failed speculations handled gracefully (no workflow interruption)
7. ✅ Learning cycle: Execution → Update graph → Better predictions
8. ✅ Performance metrics: Success rate, waste rate, latency reduction
9. ✅ Integration tests validating complete feedback loop

---

## Tasks / Subtasks

### Phase 1: Speculative Prediction (1-1.5h)

- [ ] **Task 1: Implement DAGSuggester.predictNextNodes()** (AC: #1)
  - [ ] Extend `src/graphrag/dag-suggester.ts` with new method:
    ```typescript
    async predictNextNodes(
      state: WorkflowState,
      completed: TaskResult[]
    ): Promise<PredictedNode[]> {
      // 1. Get last completed tool
      const lastTool = completed[completed.length - 1]?.toolId;

      // 2. Query GraphRAG for community members (tools often used after)
      const neighbors = this.graphEngine.findCommunityMembers(lastTool);

      // 3. Get PageRank scores for confidence
      const predictions = neighbors.map(toolId => ({
        toolId,
        confidence: this.graphEngine.getPageRank(toolId),
        reasoning: `Often follows ${lastTool} (PageRank: ${score})`
      }));

      // 4. Filter by confidence >0.7
      return predictions.filter(p => p.confidence > 0.7);
    }
    ```

- [ ] **Task 2: Implement speculative executor** (AC: #2, #4)
  - [ ] Create `src/dag/speculative-executor.ts`
  - [ ] Method: `executeSpeculatively(predictions: PredictedNode[])`
  - [ ] Execute high-confidence predictions in background
  - [ ] Store results in temporary cache (not state yet)
  - [ ] Timeout after 5s if not confirmed

### Phase 2: Confidence-Based Execution (1h)

- [ ] **Task 3: Implement confidence threshold logic** (AC: #2)
  - [ ] Config: `speculation: { enabled: boolean, threshold: number }`
  - [ ] Default threshold: 0.7 (70% confidence)
  - [ ] Only speculate if confidence > threshold
  - [ ] Adaptive threshold (future enhancement)

- [ ] **Task 4: Integrate speculation in ControlledExecutor** (AC: #4, #5)
  - [ ] Before each layer execution:
    ```typescript
    if (config.speculation.enabled) {
      // Predict next nodes
      const predictions = await this.dagSuggester.predictNextNodes(
        this.state,
        this.state.tasks
      );

      // Execute speculatively
      this.speculativeExecutor.start(predictions);
    }
    ```
  - [ ] When agent confirms, retrieve cached results instantly
  - [ ] If results ready → 0ms latency ✨

- [ ] **Task 5: Handle failed speculations** (AC: #6)
  - [ ] Speculation timeout → Discard, continue normally
  - [ ] Speculation error → Log, don't fail workflow
  - [ ] Wrong prediction → Discard, execute correct task
  - [ ] Emit event: `{ type: 'speculation_wasted', prediction, reason }`

### Phase 3: GraphRAG Feedback Learning (1-1.5h)

- [ ] **Task 6: Integrate GraphRAGEngine.updateFromExecution()** (AC: #3, #7)
  - [ ] After workflow completion, call:
    ```typescript
    await this.graphEngine.updateFromExecution({
      workflow_id: this.executionId,
      executed_dag: this.currentDAG,
      execution_results: this.state.tasks,
      decisions: this.state.decisions,  // Learn from AIL/HIL choices
      timestamp: new Date(),
      success: result.success
    });
    ```
  - [ ] GraphRAGEngine updates knowledge graph:
    - Extract tool co-occurrence from executed DAG
    - Strengthen edges for successful paths
    - Weaken edges for failed paths
    - Store user preferences from decisions
    - Recompute PageRank weights
    - Persist to PGlite

- [ ] **Task 7: Implement learning patterns** (AC: #7)
  - [ ] Pattern 1: Tool co-occurrence
    ```typescript
    // If tasks A → B executed successfully, strengthen edge
    graph.addEdge(toolA, toolB, { weight: currentWeight + 1 });
    ```
  - [ ] Pattern 2: User preferences
    ```typescript
    // If human always skips CSV parser, lower its PageRank
    if (decision.action === 'reject' && tool === 'csv:parse') {
      adjustPageRankWeight(tool, -0.05);
    }
    ```
  - [ ] Pattern 3: Error avoidance
    ```typescript
    // If tools A+B fail together, lower edge weight
    if (taskA.failed && taskB.failed) {
      graph.updateEdge(toolA, toolB, { weight: weight * 0.8 });
    }
    ```

### Phase 4: Metrics & Observability (0.5-1h)

- [ ] **Task 8: Implement speculation metrics** (AC: #8)
  - [ ] Track metrics:
    ```typescript
    interface SpeculationMetrics {
      totalSpeculations: number;
      successfulSpeculations: number;  // Confirmed by agent
      wastedSpeculations: number;      // Discarded/wrong
      latencyReduction: number;        // ms saved
      successRate: number;             // %
      wasteRate: number;               // %
    }
    ```
  - [ ] Store metrics in PGlite (opt-in telemetry)
  - [ ] Emit metrics events for observability

- [ ] **Task 9: Add speculation logging** (AC: #8)
  - [ ] Log speculation attempts (debug level)
  - [ ] Log successful speculations (info level)
  - [ ] Log wasted speculations (warn level)
  - [ ] Include: prediction, confidence, outcome, latency

### Phase 5: Testing & Validation (0.5h)

- [ ] **Task 10: Integration tests for feedback loop** (AC: #9)
  - [ ] Test: Week 1 execution → Graph updated → Week 2 better predictions
  - [ ] Test: Speculation success → Results ready instantly
  - [ ] Test: Wrong speculation → Graceful fallback
  - [ ] Test: Learning from decisions → Graph reflects preferences
  - [ ] Test: Complete feedback cycle validates

---

## Dev Notes

### Complete Feedback Loop Architecture

```
┌──────────────────────────────────────────────────────────┐
│          Complete Adaptive Feedback Loop                 │
└──────────────────────────────────────────────────────────┘

PHASE 1: PREDICTION (GraphRAG → Speculation)
  ControlledExecutor executing Layer 1
      ↓
  DAGSuggester.predictNextNodes(state, completedTasks)
      ↓ queries
  GraphRAGEngine.findCommunityMembers(lastTool)
  GraphRAGEngine.getPageRank(candidates)
      ↓ returns
  Predictions: [{ toolId: 'xml:parse', confidence: 0.85 }]
      ↓
  SpeculativeExecutor.start(predictions)
  → Executes xml:parse in background

PHASE 2: CONFIRMATION (Agent decides)
  Agent sees Layer 1 results
      ↓
  Agent: "Yes, need XML parser" (confirms speculation)
      ↓
  ControlledExecutor retrieves cached result
      ↓
  0ms latency! ✨ (result already ready)

PHASE 3: LEARNING (Execution → Knowledge Graph)
  Workflow completes
      ↓
  GraphRAGEngine.updateFromExecution({
    executed_dag,
    execution_results,
    decisions
  })
      ↓
  Updates knowledge graph:
  ✓ Add edge: list_dir → xml:parse (co-occurrence)
  ✓ Strengthen edge weight (success pattern)
  ✓ Update PageRank: xml:parse rank increases
  ✓ Persist to PGlite
      ↓
  Knowledge graph enriched

NEXT WORKFLOW: Improved predictions
  Same scenario occurs
      ↓
  Confidence now 0.92 (was 0.85)
      ↓
  Speculation happens automatically
      ↓
  Even faster! 🚀
```

### DAGSuggester Extension

**New method to add:**
```typescript
// src/graphrag/dag-suggester.ts
export class DAGSuggester {
  // ✅ EXISTS
  async suggestDAG(intent: WorkflowIntent): Promise<SuggestedDAG | null>

  // ✅ NEW (Story 2.5-3)
  async replanDAG(currentDAG, newContext): Promise<DAGStructure>

  // ✅ NEW (This story)
  async predictNextNodes(
    state: WorkflowState,
    completed: TaskResult[]
  ): Promise<PredictedNode[]> {
    const lastTool = completed[completed.length - 1]?.toolId;
    if (!lastTool) return [];

    // Query GraphRAG for tools that often follow
    const neighbors = this.graphEngine.findCommunityMembers(lastTool);

    // Score by PageRank
    const predictions = neighbors.map(toolId => ({
      task: { toolId, inputs: {} },  // Simplified for speculation
      confidence: this.graphEngine.getPageRank(toolId),
      reasoning: `Often follows ${lastTool} based on historical patterns`
    }));

    // Filter high-confidence only
    return predictions
      .filter(p => p.confidence > 0.7)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);  // Top 3 predictions max
  }
}
```

### GraphRAGEngine Usage

**Existing methods used:**
```typescript
// src/graphrag/graph-engine.ts
export class GraphRAGEngine {
  // For prediction
  findCommunityMembers(toolId: string): string[]
  getPageRank(toolId: string): number

  // For learning
  async updateFromExecution(execution: WorkflowExecution): Promise<void> {
    // Extract executed path
    const path = execution.execution_results.map(r => r.toolId);

    // Update edges (co-occurrence)
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];

      if (this.graph.hasEdge(from, to)) {
        const edge = this.graph.getEdgeAttributes(from, to);
        this.graph.setEdgeAttribute(from, to, 'weight', edge.weight + 1);
      } else {
        this.graph.addEdge(from, to, { weight: 1 });
      }
    }

    // Recompute PageRank
    this.pageRanks = pagerank(this.graph, { weighted: true });

    // Persist updated graph to PGlite
    await this.persistGraphToDB();
  }
}
```

### Speculative Execution Flow

```typescript
class SpeculativeExecutor {
  private cache: Map<string, { result: any, timestamp: number }> = new Map();

  async start(predictions: PredictedNode[]): Promise<void> {
    for (const pred of predictions) {
      // Execute in background, don't await
      this.executeInBackground(pred);
    }
  }

  private async executeInBackground(pred: PredictedNode): Promise<void> {
    try {
      const result = await Promise.race([
        this.executor.executeTask(pred.task),
        this.timeout(5000)  // 5s timeout
      ]);

      // Cache result
      this.cache.set(pred.task.toolId, {
        result,
        timestamp: Date.now()
      });
    } catch (error) {
      // Speculation failed, log and continue
      logger.debug(`Speculation failed for ${pred.task.toolId}:`, error);
    }
  }

  getCached(toolId: string): any | null {
    const cached = this.cache.get(toolId);
    if (!cached) return null;

    // Check if still valid (< 10s old)
    if (Date.now() - cached.timestamp > 10000) {
      this.cache.delete(toolId);
      return null;
    }

    return cached.result;
  }
}
```

### Learning Example

**Week 1:**
```
User executes: list_dir → discovers XML → manually adds xml:parse → analyze
GraphRAG learns: list_dir → xml:parse (edge weight: 1)
PageRank: xml:parse = 0.05 (low)
```

**Week 2:**
```
Same pattern: list_dir → xml:parse → analyze
GraphRAG learns: list_dir → xml:parse (edge weight: 2)
PageRank: xml:parse = 0.12 (medium)
Confidence for speculation: 0.75 > 0.7 → Speculate!
```

**Week 3:**
```
Speculation succeeds again
Edge weight: 3, PageRank: 0.18
Confidence: 0.92 → Very high
Speculation happens automatically, 0ms latency
```

### Project Structure

**New Files:**
```
src/dag/
└── speculative-executor.ts      # Speculative execution logic
```

**Modified Files:**
```
src/dag/controlled-executor.ts   # Add speculation integration
src/graphrag/dag-suggester.ts    # Add predictNextNodes()
src/graphrag/graph-engine.ts     # updateFromExecution() already exists
```

### Performance Targets

- **Prediction latency:** <50ms (GraphRAG query)
- **Speculation speedup:** 23-30% (based on research)
- **Success rate target:** >85% (waste <15%)
- **Learning overhead:** <100ms per workflow

### Error Handling

**Failed Predictions:**
- GraphRAG query fails → Skip speculation, continue normally
- No predictions (confidence too low) → Normal execution

**Failed Speculations:**
- Task errors → Log, discard result, execute normally
- Timeout → Discard, execute normally
- Wrong prediction → Discard (waste), execute correct task

**Learning Failures:**
- updateFromExecution() fails → Log error, don't block workflow
- Graph corruption → Fallback to read-only mode

---

## Related Documents

- **ADR-007**: DAG Adaptive Feedback Loops (docs/adrs/ADR-007-dag-adaptive-feedback-loops.md)
- **Architecture**: Pattern 4 - Adaptive DAG Feedback Loop (docs/architecture.md)
- **Research Report**: Technical Research 2025-11-13 (docs/research-technical-2025-11-13.md)
- **Story 2.5-1**: Event Stream + Command Queue (prerequisite)
- **Story 2.5-2**: Checkpoint & Resume (prerequisite)
- **Story 2.5-3**: AIL/HIL Integration (prerequisite)

---

## Definition of Done

- [ ] All acceptance criteria met (9/9)
- [ ] Code reviewed and approved
- [ ] Unit tests passing (>90% coverage)
- [ ] Integration tests validating complete feedback loop
- [ ] Speculation working with >85% success rate
- [ ] GraphRAG learning cycle validated
- [ ] Performance targets met (prediction <50ms, speedup 23-30%)
- [ ] Metrics tracking implemented
- [ ] Documentation updated (inline comments + usage guide)
- [ ] No regression in non-speculative workflows
