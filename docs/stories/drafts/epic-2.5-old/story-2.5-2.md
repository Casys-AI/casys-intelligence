# Story 2.5-2: Checkpoint & Resume

**Epic:** 2.5 - Adaptive DAG Feedback Loops
**Story ID:** 2.5-2
**Status:** drafted
**Estimated Effort:** 2-3 heures
**Priority:** P1 (Depends on 2.5-1)

---

## User Story

**As a** developer running long-running agent workflows,
**I want** the ability to checkpoint execution state and resume from failures,
**So that** workflows can recover gracefully from crashes without losing progress.

---

## Acceptance Criteria

1. ✅ `WorkflowState` persistence to PGlite implemented
2. ✅ Checkpoint saved after each layer completion
3. ✅ Resume from checkpoint restores full state (tasks, decisions, context)
4. ✅ Checkpoint pruning strategy to prevent unbounded growth
5. ✅ `checkpoint_id` generated and stored in state
6. ✅ Resume API: `executor.resumeFromCheckpoint(checkpointId)`
7. ✅ Unit tests validating checkpoint/resume correctness
8. ✅ Performance: Checkpoint save <50ms
9. ✅ Storage: Checkpoint size <100KB for typical workflows

---

## Tasks / Subtasks

### Phase 1: Checkpoint Infrastructure (1-1.5h)

- [ ] **Task 1: Create checkpoint schema in PGlite** (AC: #1)
  - [ ] Create migration `src/db/migrations/006_workflow_checkpoints.sql`:
    ```sql
    CREATE TABLE workflow_checkpoints (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      layer_index INTEGER NOT NULL,
      state JSONB NOT NULL,
      -- state contains: { messages, tasks, decisions, context }
      dag_structure JSONB NOT NULL,
      execution_config JSONB NOT NULL
    );
    CREATE INDEX idx_checkpoints_workflow ON workflow_checkpoints(workflow_id, timestamp DESC);
    ```
  - [ ] Add checkpoint queries to `src/db/queries.ts`

- [ ] **Task 2: Implement checkpoint save logic** (AC: #2, #5)
  - [ ] Create `src/dag/checkpoint-manager.ts`
  - [ ] Method: `saveCheckpoint(state: WorkflowState, dag: DAGStructure, layerIndex: number)`
  - [ ] Generate unique `checkpoint_id` (UUID v4)
  - [ ] Serialize state to JSON
  - [ ] Save to PGlite with transaction
  - [ ] Update `state.checkpoint_id` after save

### Phase 2: Resume Logic (1h)

- [ ] **Task 3: Implement resume from checkpoint** (AC: #3, #6)
  - [ ] Method in `ControlledExecutor`: `resumeFromCheckpoint(checkpointId: string)`
  - [ ] Load checkpoint from PGlite
  - [ ] Deserialize state, DAG structure, config
  - [ ] Restore WorkflowState with reducers
  - [ ] Calculate remaining layers to execute
  - [ ] Continue execution from saved layer_index

- [ ] **Task 4: Integrate checkpoint saves in execution loop** (AC: #2)
  - [ ] Save checkpoint after each layer completion
  - [ ] Emit event: `{ type: "checkpoint_saved", checkpoint_id, timestamp }`
  - [ ] Handle checkpoint save failures gracefully (log error, continue execution)

### Phase 3: Pruning & Optimization (0.5-1h)

- [ ] **Task 5: Implement checkpoint pruning strategy** (AC: #4)
  - [ ] Keep only N most recent checkpoints per workflow (default: 5)
  - [ ] Delete old checkpoints on new save
  - [ ] Method: `pruneOldCheckpoints(workflowId: string, keepCount: number)`
  - [ ] Run pruning async (don't block execution)

- [ ] **Task 6: Optimize checkpoint size** (AC: #9)
  - [ ] Only store completed tasks (not pending/speculative)
  - [ ] Compress large context values (e.g., large JSON blobs)
  - [ ] Target: <100KB per checkpoint
  - [ ] Log warning if checkpoint >500KB

### Phase 4: Testing & Validation (0.5h)

- [ ] **Task 7: Unit tests for checkpoint/resume** (AC: #7)
  - [ ] Test: Save checkpoint → Resume → State matches exactly
  - [ ] Test: Multi-layer workflow → Checkpoint after layer 2 → Resume continues from layer 3
  - [ ] Test: Resume with modified DAG (should handle gracefully)
  - [ ] Test: Checkpoint pruning keeps only N recent
  - [ ] Test: Failed checkpoint save doesn't crash execution

- [ ] **Task 8: Performance validation** (AC: #8)
  - [ ] Benchmark: Checkpoint save <50ms (P95)
  - [ ] Benchmark: Resume latency <100ms
  - [ ] Test with large state (1000 tasks) → Still <50ms save

---

## Dev Notes

### Database Schema Details

**Checkpoint Table:**
```sql
CREATE TABLE workflow_checkpoints (
  id TEXT PRIMARY KEY,              -- UUID v4
  workflow_id TEXT NOT NULL,        -- Group checkpoints by workflow
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  layer_index INTEGER NOT NULL,     -- Resume from this layer
  state JSONB NOT NULL,             -- WorkflowState serialized
  dag_structure JSONB NOT NULL,     -- DAG at checkpoint time
  execution_config JSONB NOT NULL   -- Config (speculation, timeout, etc.)
);
```

**State Serialization:**
```typescript
const serialized = {
  messages: state.messages,
  tasks: state.tasks.map(t => ({
    taskId: t.taskId,
    result: t.result,
    timestamp: t.timestamp,
    duration: t.duration
  })),
  decisions: state.decisions,
  context: state.context,
  checkpoint_id: checkpoint_id
};
```

### Resume Logic Flow

```typescript
async resumeFromCheckpoint(checkpointId: string): Promise<DAGExecutionResult> {
  // 1. Load checkpoint
  const checkpoint = await this.checkpointManager.load(checkpointId);

  // 2. Restore state
  this.state = {
    messages: checkpoint.state.messages,
    tasks: checkpoint.state.tasks,
    decisions: checkpoint.state.decisions,
    context: checkpoint.state.context,
    checkpoint_id: checkpointId
  };

  // 3. Restore DAG and config
  this.currentDAG = checkpoint.dag_structure;
  this.config = checkpoint.execution_config;

  // 4. Calculate remaining layers
  const completedLayers = checkpoint.layer_index;
  const remainingLayers = this.layers.slice(completedLayers);

  // 5. Continue execution
  return await this.executeRemainingLayers(remainingLayers);
}
```

### Pruning Strategy

**Conservative approach:**
- Keep last 5 checkpoints per workflow
- Delete older checkpoints on new save
- Async pruning (doesn't block execution)

**Rationale:**
- 5 checkpoints = ~5 layers of history
- Enough for debugging and recovery
- Prevents unbounded growth

### Project Structure

**New Files:**
```
src/dag/
├── checkpoint-manager.ts    # Checkpoint save/load/prune logic

src/db/migrations/
└── 006_workflow_checkpoints.sql
```

**Modified Files:**
```
src/dag/controlled-executor.ts   # Add resumeFromCheckpoint()
src/db/queries.ts                # Checkpoint queries
```

### Integration Points

- **Story 2.5-1**: Uses WorkflowState from state management
- **Story 2.5-3**: AIL/HIL decisions are checkpointed
- **Story 2.5-4**: Speculative tasks NOT checkpointed (only confirmed tasks)

### Error Handling

**Checkpoint Save Failures:**
- Log error (don't crash)
- Continue execution without checkpoint
- Emit event: `{ type: "checkpoint_failed", error }`

**Resume Failures:**
- Invalid checkpoint_id → Throw error
- Corrupted state → Throw error (can't recover)
- DAG structure mismatch → Warn, attempt best-effort resume

### Performance Considerations

**Checkpoint Frequency:**
- After each layer (not after each task)
- Trade-off: Granularity vs overhead
- 10 layers = 10 checkpoints (~500ms total overhead)

**Optimization:**
- Use JSONB for efficient storage/retrieval
- Index on (workflow_id, timestamp DESC) for fast pruning
- Async pruning to avoid blocking
- Compress large context values if needed

---

## Related Documents

- **ADR-007**: DAG Adaptive Feedback Loops (docs/adrs/ADR-007-dag-adaptive-feedback-loops.md)
- **Architecture**: Pattern 4 - Adaptive DAG Feedback Loop (docs/architecture.md)
- **Story 2.5-1**: Event Stream + Command Queue + State Management (prerequisite)
- **PGlite Docs**: Database persistence layer

---

## Definition of Done

- [ ] All acceptance criteria met (9/9)
- [ ] Code reviewed and approved
- [ ] Unit tests passing (>90% coverage)
- [ ] Checkpoint save performance <50ms
- [ ] Resume correctness validated
- [ ] Pruning strategy working
- [ ] Documentation updated (inline comments + usage examples)
- [ ] Migration script tested on existing database
