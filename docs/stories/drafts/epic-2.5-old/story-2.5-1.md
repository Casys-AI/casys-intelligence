# Story 2.5-1: Event Stream + Command Queue + State Management

**Epic:** 2.5 - Adaptive DAG Feedback Loops
**Story ID:** 2.5-1
**Status:** drafted
**Estimated Effort:** 3-4 heures
**Priority:** P0 (Foundation for AIL/HIL)

---

## User Story

**As a** developer building agent workflows,
**I want** a controlled DAG executor with event stream observability and command queue control,
**So that** agents and humans can monitor execution in real-time and inject control commands dynamically.

---

## Acceptance Criteria

1. ✅ `ControlledExecutor` class created extending `ParallelExecutor`
2. ✅ Event stream implemented with `TransformStream` for real-time monitoring
3. ✅ Command queue implemented with `AsyncQueue` for non-blocking control
4. ✅ State management with MessagesState-inspired reducers
5. ✅ Events emitted: `task_started`, `task_completed`, `state_updated`, `command_received`
6. ✅ Commands supported: `inject_tasks`, `pause`, `resume`, `cancel`
7. ✅ State reducers: `add_messages`, `add_tasks`, `add_decisions`, `merge_context`
8. ✅ Unit tests validating event stream correctness
9. ✅ Unit tests validating command injection during execution

---

## Tasks / Subtasks

### Phase 1: ControlledExecutor Foundation (1-1.5h)

- [ ] **Task 1: Create ControlledExecutor class** (AC: #1)
  - [ ] Create `src/dag/controlled-executor.ts`
  - [ ] Extend `ParallelExecutor` class
  - [ ] Add constructor with config: `{ enableEvents: boolean, enableCommands: boolean }`
  - [ ] Export in `mod.ts`

- [ ] **Task 2: Implement WorkflowState interface** (AC: #4)
  - [ ] Create `src/dag/types.ts` with `WorkflowState` interface:
    ```typescript
    interface WorkflowState {
      messages: Message[];      // Agent/human messages
      tasks: TaskResult[];      // Completed tasks
      decisions: Decision[];    // AIL/HIL decisions
      context: Record<string, any>;  // Shared context
      checkpoint_id?: string;   // Resume capability
    }
    ```
  - [ ] Implement state reducers pattern (MessagesState-inspired)

### Phase 2: Event Stream Implementation (1h)

- [ ] **Task 3: Implement event stream with TransformStream** (AC: #2, #5)
  - [ ] Create `eventStream: TransformStream<ExecutionEvent>`
  - [ ] Emit events:
    - `{ type: "task_started", taskId, timestamp }`
    - `{ type: "task_completed", taskId, result, timestamp }`
    - `{ type: "state_updated", state, timestamp }`
    - `{ type: "layer_completed", layerIndex, results }`
  - [ ] Implement `.subscribe(callback)` method for consumers
  - [ ] Implement `.getReader()` for streaming to clients

- [ ] **Task 4: Add observability hooks** (AC: #5)
  - [ ] Emit event before/after each layer execution
  - [ ] Emit event on state updates
  - [ ] Track execution timeline with timestamps

### Phase 3: Command Queue Implementation (1-1.5h)

- [ ] **Task 5: Implement AsyncQueue for commands** (AC: #3, #6)
  - [ ] Create `src/dag/async-queue.ts` with `AsyncQueue<T>` class
  - [ ] Methods: `enqueue(item)`, `dequeue()`, `isEmpty()`, `size()`
  - [ ] Non-blocking: `dequeue()` returns Promise that resolves when item available
  - [ ] Support timeout: `dequeue(timeout)` throws if no item after timeout

- [ ] **Task 6: Implement command processing** (AC: #6)
  - [ ] Create `commandQueue: AsyncQueue<Command>`
  - [ ] Process commands between layers:
    ```typescript
    private async processCommands() {
      while (!this.commandQueue.isEmpty()) {
        const cmd = await this.commandQueue.dequeue(100); // 100ms timeout
        await this.handleCommand(cmd);
      }
    }
    ```
  - [ ] Implement command handlers:
    - `inject_tasks`: Add new tasks to current DAG
    - `pause`: Set execution state to paused
    - `resume`: Resume paused execution
    - `cancel`: Terminate execution gracefully

### Phase 4: State Management with Reducers (0.5-1h)

- [ ] **Task 7: Implement state reducers** (AC: #7)
  - [ ] Create reducer functions:
    ```typescript
    const reducers = {
      messages: (existing, update) => [...existing, ...update],  // append
      tasks: (existing, update) => [...existing, ...update],     // append
      decisions: (existing, update) => [...existing, ...update], // append
      context: (existing, update) => ({ ...existing, ...update }) // merge
    };
    ```
  - [ ] Implement `updateState(update: Partial<WorkflowState>)` method
  - [ ] Emit `state_updated` event after each update

- [ ] **Task 8: Integrate state updates in execution loop**
  - [ ] Update state after each task completion
  - [ ] Update state when commands modify DAG
  - [ ] Ensure state consistency during concurrent operations

### Phase 5: Testing & Validation (0.5-1h)

- [ ] **Task 9: Unit tests for event stream** (AC: #8)
  - [ ] Test: Events emitted in correct order
  - [ ] Test: Multiple subscribers receive same events
  - [ ] Test: Event stream survives task failures
  - [ ] Test: Timeline correctness (timestamps monotonic)

- [ ] **Task 10: Unit tests for command queue** (AC: #9)
  - [ ] Test: Command injection during execution
  - [ ] Test: `inject_tasks` adds nodes to DAG mid-execution
  - [ ] Test: `pause` stops execution, `resume` continues
  - [ ] Test: `cancel` terminates gracefully
  - [ ] Test: Command queue handles concurrent enqueues

---

## Dev Notes

### Architecture Clarification: Graph vs DAG

**⚠️ CRITICAL DISTINCTION:**

- **GraphRAG (Knowledge Graph)** = Permanent knowledge base
  - Nodes: Available tools in the system
  - Edges: Tool relationships (co-occurrence, dependencies)
  - Storage: PGlite (persistent)
  - Managed by: `GraphRAGEngine` (src/graphrag/graph-engine.ts)

- **DAG (Workflow Execution Graph)** = Ephemeral execution plan
  - Nodes: Specific tasks to execute now
  - Edges: Execution order dependencies
  - Storage: In-memory + checkpoints
  - Created by: `DAGSuggester` (src/graphrag/dag-suggester.ts)

This story implements the **DAG execution layer** with control mechanisms.

### Project Structure

**New Files:**
```
src/dag/
├── controlled-executor.ts   # ControlledExecutor class
├── async-queue.ts           # AsyncQueue implementation
├── types.ts                 # WorkflowState, Command, Event interfaces
└── state-reducers.ts        # State management helpers
```

**Modified Files:**
```
src/dag/executor.ts          # ParallelExecutor (base class)
mod.ts                       # Export new classes
```

### Integration Points

- **Story 2.5-2**: Checkpoint system will persist WorkflowState to PGlite
- **Story 2.5-3**: AIL/HIL will inject commands via commandQueue
- **Story 2.5-4**: Speculative execution will use eventStream for triggers
- **GraphRAG**: No direct integration yet (comes in Story 2.5-4)

### Implementation References

**LangGraph MessagesState Pattern** (v1.0, 2025):
```typescript
// Inspired by LangGraph's automatic state reducers
// https://langchain-ai.github.io/langgraph/reference/state/#messagesstate
const reducers = {
  messages: (existing, update) => [...existing, ...update],  // append
  tasks: (existing, update) => [...existing, ...update],
  decisions: (existing, update) => [...existing, ...update],
  context: (existing, update) => ({ ...existing, ...update })
};
```

**AsyncQueue Pattern** (ai-zen/async-queue):
```typescript
// Custom implementation based on proven patterns
// Non-blocking dequeue with Promise-based API
class AsyncQueue<T> {
  private queue: T[] = [];
  private waiting: ((value: T) => void)[] = [];

  enqueue(item: T): void {
    if (this.waiting.length > 0) {
      const resolve = this.waiting.shift()!;
      resolve(item);
    } else {
      this.queue.push(item);
    }
  }

  dequeue(timeout?: number): Promise<T> {
    if (this.queue.length > 0) {
      return Promise.resolve(this.queue.shift()!);
    }
    return new Promise((resolve, reject) => {
      this.waiting.push(resolve);
      if (timeout) {
        setTimeout(() => reject(new Error("Timeout")), timeout);
      }
    });
  }
}
```

### Testing Strategy

**Test Files:**
```
tests/unit/dag/
├── controlled-executor.test.ts
├── async-queue.test.ts
└── state-reducers.test.ts
```

**Test Scenarios:**
1. Event stream correctness (order, content, timing)
2. Command injection mid-execution
3. State consistency during concurrent updates
4. Pause/resume/cancel behavior
5. Error handling and recovery

### Performance Considerations

- Event stream overhead: <5ms per event
- Command queue latency: <10ms from enqueue to process
- State update frequency: After each task (not per-event)
- Memory: WorkflowState should be <1MB for typical workflows

---

## Related Documents

- **ADR-007**: DAG Adaptive Feedback Loops (docs/adrs/ADR-007-dag-adaptive-feedback-loops.md)
- **Architecture**: Pattern 4 - Adaptive DAG Feedback Loop (docs/architecture.md)
- **Research Report**: Technical Research 2025-11-13 (docs/research-technical-2025-11-13.md)
- **Spike Document**: Agent-Human DAG Feedback Loop (docs/spikes/spike-agent-human-dag-feedback-loop.md)
- **Base Class**: ParallelExecutor (src/dag/executor.ts)

---

## Definition of Done

- [ ] All acceptance criteria met (9/9)
- [ ] Code reviewed and approved
- [ ] Unit tests passing (>90% coverage)
- [ ] Integration with ParallelExecutor validated
- [ ] Event stream performance <5ms overhead
- [ ] Command queue latency <10ms
- [ ] Documentation updated (inline comments + architecture notes)
- [ ] No breaking changes to existing DAG executor
