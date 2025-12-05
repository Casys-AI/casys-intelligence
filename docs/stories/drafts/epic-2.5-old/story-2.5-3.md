# Story 2.5-3: AIL/HIL Integration

**Epic:** 2.5 - Adaptive DAG Feedback Loops **Story ID:** 2.5-3 **Status:** drafted **Estimated
Effort:** 2-3 heures **Priority:** P1 (Depends on 2.5-1, 2.5-2)

---

## User Story

**As a** developer building interactive agent workflows, **I want** agent-in-the-loop (AIL) and
human-in-the-loop (HIL) decision points during execution, **So that** workflows can adapt
dynamically based on runtime discoveries and human approvals.

---

## Acceptance Criteria

1. ✅ Agent decision points (AIL) implemented
2. ✅ Human approval checkpoints (HIL) implemented
3. ✅ Command injection: `replan_dag` command supported
4. ✅ DAGSuggester.replanDAG() integration for dynamic re-planning
5. ✅ Decision types: `approve`, `reject`, `modify`, `change_plan`
6. ✅ Decisions stored in `state.decisions[]` with timestamps
7. ✅ Multi-turn conversation support (context preserved across turns)
8. ✅ Unit tests validating AIL/HIL decision flow
9. ✅ Integration tests with DAGSuggester re-planning

---

## Tasks / Subtasks

### Phase 1: Decision Infrastructure (1h)

- [ ] **Task 1: Define Decision types** (AC: #5, #6)
  - [ ] Create `src/dag/types.ts` decision interfaces:
    ```typescript
    interface Decision {
      id: string; // UUID
      type: "ail" | "hil"; // Agent or Human
      action: "approve" | "reject" | "modify" | "change_plan";
      taskId?: string; // Task being decided on
      requirement?: string; // For change_plan: new requirement
      reasoning: string; // Why this decision
      timestamp: number;
      metadata?: Record<string, any>;
    }
    ```
  - [ ] Add `decisions: Decision[]` to WorkflowState (already in 2.5-1)

- [ ] **Task 2: Implement decision checkpoint pattern** (AC: #2)
  - [ ] Method: `awaitDecision(checkpoint: DecisionCheckpoint): Promise<Decision>`
  - [ ] Pause execution, emit event: `{ type: "decision_required", checkpoint }`
  - [ ] Wait for decision via commandQueue
  - [ ] Resume execution after decision received

### Phase 2: Agent-in-the-Loop (AIL) (0.5-1h)

- [ ] **Task 3: Implement AIL decision points** (AC: #1)
  - [ ] Agent observes task result via eventStream
  - [ ] Agent analyzes result and decides next action
  - [ ] Agent injects decision command:
    ```typescript
    commandQueue.enqueue({
      type: "agent_decision",
      decision: {
        type: "ail",
        action: "change_plan",
        reasoning: "Found XML files, need parser",
        requirement: "parse XML files",
      },
    });
    ```
  - [ ] Executor processes decision and triggers replan

- [ ] **Task 4: AIL example patterns** (AC: #1)
  - [ ] Pattern 1: "Discovery-driven" - Task discovers new data type → Agent adds tools
  - [ ] Pattern 2: "Validation-driven" - Task result fails validation → Agent corrects
  - [ ] Pattern 3: "Optimization-driven" - Agent observes slow path → Agent finds faster route

### Phase 3: Human-in-the-Loop (HIL) (0.5-1h)

- [ ] **Task 5: Implement HIL approval checkpoints** (AC: #2)
  - [ ] Decorator: `@requireHumanApproval` for sensitive tasks
  - [ ] Before task execution, pause and request approval:
    ```typescript
    const decision = await this.awaitDecision({
      type: "hil",
      taskId: task.id,
      message: "Approve deployment to production?",
      options: ["approve", "reject", "modify"],
    });
    ```
  - [ ] Resume only if approved

- [ ] **Task 6: HIL UI/CLI integration point** (AC: #2)
  - [ ] Emit event with approval request details
  - [ ] Accept decision via external API (future: CLI prompt or web UI)
  - [ ] Store human decision in state.decisions[]

### Phase 4: Dynamic Re-planning with DAGSuggester (1h)

- [ ] **Task 7: Integrate DAGSuggester.replanDAG()** (AC: #3, #4)
  - [ ] Implement `handleReplanCommand(cmd: ReplanCommand)`:
    ```typescript
    private async handleReplanCommand(cmd: ReplanCommand) {
      // DAGSuggester re-queries GraphRAG for new tools
      const updatedDAG = await this.dagSuggester.replanDAG(
        this.currentDAG,
        {
          completedTasks: this.state.tasks,
          newRequirement: cmd.requirement,
          availableContext: this.state.context
        }
      );

      // Merge new nodes into current DAG
      this.mergeDynamicNodes(updatedDAG.newNodes);

      // Emit event
      this.eventStream.emit({
        type: 'dag_replanned',
        newNodes: updatedDAG.newNodes,
        reasoning: updatedDAG.reasoning
      });
    }
    ```

- [ ] **Task 8: Implement DAG node injection** (AC: #4)
  - [ ] Method: `mergeDynamicNodes(newNodes: DAGNode[])`
  - [ ] Add new nodes to current DAG structure
  - [ ] Recalculate layers (topological sort)
  - [ ] Validate no cycles introduced
  - [ ] Update execution queue

### Phase 5: Multi-Turn Support (0.5h)

- [ ] **Task 9: Implement multi-turn conversation** (AC: #7)
  - [ ] Store agent/human messages in `state.messages[]`
  - [ ] Preserve context across decision points
  - [ ] Example flow:
    ```
    Agent: "I found XML files. Should I parse them?"
    Human: "Yes, but skip large files >10MB"
    Agent: "Acknowledged. Filtering by size..."
    → Context preserved in state.context
    ```

### Phase 6: Testing & Validation (0.5h)

- [ ] **Task 10: Unit tests for AIL/HIL** (AC: #8)
  - [ ] Test: AIL decision triggers replan
  - [ ] Test: HIL approval pauses/resumes execution
  - [ ] Test: Rejected HIL stops workflow gracefully
  - [ ] Test: Multi-turn context preservation
  - [ ] Test: Concurrent decisions handled correctly

- [ ] **Task 11: Integration tests with DAGSuggester** (AC: #9)
  - [ ] Test: Replan adds XML parser after discovery
  - [ ] Test: Replan integrates new tools correctly
  - [ ] Test: DAG remains valid after replan (no cycles)

---

## Dev Notes

### Architecture: DAGSuggester Re-queries GraphRAG

**⚠️ CRITICAL FLOW:**

```
Runtime Discovery (e.g., XML files found)
    ↓
Agent Decision (AIL)
    ↓
commandQueue.enqueue({ type: 'replan_dag', requirement: 'parse XML' })
    ↓
ControlledExecutor.handleReplanCommand()
    ↓
DAGSuggester.replanDAG(currentDAG, newContext)
    ↓ queries
GraphRAGEngine.vectorSearch('parse XML')
    ↓ returns
Relevant tools: [xml:parse]
    ↓
GraphRAGEngine.buildDAG([...existing, xml:parse])
    ↓ returns
Updated DAG structure
    ↓
ControlledExecutor.mergeDynamicNodes(new nodes)
    ↓
Execution continues with augmented DAG
```

**Key Insight:** DAGSuggester is the workflow layer that **queries** GraphRAG knowledge graph. This
story integrates them for dynamic adaptation.

### Decision Patterns

**Pattern 1: Discovery-Driven (AIL)**

```typescript
// Agent observes task result
eventStream.subscribe((event) => {
  if (event.type === "task_completed" && event.taskId === "list_dir") {
    const files = event.result.files;
    const hasXML = files.some((f) => f.endsWith(".xml"));

    if (hasXML) {
      // Agent decides to add XML parser
      commandQueue.enqueue({
        type: "replan_dag",
        requirement: "parse XML files",
        reasoning: "Discovered XML files in directory",
      });
    }
  }
});
```

**Pattern 2: Human Approval (HIL)**

```typescript
// Before dangerous operation
if (task.requiresApproval) {
  const decision = await this.awaitDecision({
    type: "hil",
    taskId: task.id,
    message: `Deploy ${task.inputs.service} to production?`,
    context: { service: task.inputs.service, env: "prod" },
  });

  if (decision.action === "reject") {
    throw new Error("Deployment rejected by human");
  }
}
```

### Project Structure

**Modified Files:**

```
src/dag/controlled-executor.ts   # Add AIL/HIL logic, replan handler
src/dag/types.ts                 # Decision interfaces
```

**New Files:**

```
src/dag/decision-manager.ts      # Decision orchestration
```

### Integration Points

- **Story 2.5-1**: Uses commandQueue and eventStream
- **Story 2.5-2**: Decisions are checkpointed
- **Story 2.5-4**: Speculative execution respects decisions
- **DAGSuggester**: New method `replanDAG()` (extends existing class)
- **GraphRAGEngine**: Uses existing methods (vectorSearch, buildDAG)

### Multi-Turn Context Example

```typescript
// Turn 1: Agent discovers XML
state.messages.push({
  role: "agent",
  content: "Found XML files in data/. Should I parse them?",
  timestamp: Date.now(),
});

// Turn 2: Human responds
state.messages.push({
  role: "human",
  content: "Yes, but skip files larger than 10MB",
  timestamp: Date.now(),
});

// Turn 3: Agent acknowledges
state.context.fileFilter = { maxSize: 10 * 1024 * 1024 };
state.messages.push({
  role: "agent",
  content: "Filtering XML files by size...",
  timestamp: Date.now(),
});
```

### Error Handling

**Failed Replan:**

- DAGSuggester returns null → Log error, continue without replan
- GraphRAG timeout → Fall back to manual tool selection
- Invalid DAG (cycle detected) → Reject replan, continue with original DAG

**Rejected Decisions:**

- HIL rejects → Stop workflow, emit `workflow_cancelled` event
- AIL invalid decision → Log warning, ignore decision

### Performance Considerations

- **Replan latency:** <200ms (DAGSuggester + GraphRAG query)
- **Decision overhead:** Minimal (just store in state.decisions[])
- **Multi-turn context:** Prune old messages if >100 messages

---

## Related Documents

- **ADR-007**: DAG Adaptive Feedback Loops (docs/adrs/ADR-007-dag-adaptive-feedback-loops.md)
- **Architecture**: Pattern 4 - Adaptive DAG Feedback Loop (docs/architecture.md)
- **Story 2.5-1**: Event Stream + Command Queue (prerequisite)
- **Story 2.5-2**: Checkpoint & Resume (prerequisite)
- **DAGSuggester**: src/graphrag/dag-suggester.ts (will extend with replanDAG method)
- **GraphRAGEngine**: src/graphrag/graph-engine.ts (existing methods)

---

## Definition of Done

- [ ] All acceptance criteria met (9/9)
- [ ] Code reviewed and approved
- [ ] Unit tests passing (>90% coverage)
- [ ] Integration tests with DAGSuggester validated
- [ ] AIL decision pattern working
- [ ] HIL approval checkpoint working
- [ ] Replan latency <200ms
- [ ] Documentation updated (inline comments + usage examples)
- [ ] No breaking changes to existing executor
