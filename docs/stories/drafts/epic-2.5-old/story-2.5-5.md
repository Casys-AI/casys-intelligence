# Story 2.5-5: Episodic Memory Foundation

**Epic:** 2.5 - Adaptive DAG Feedback Loops
**Story ID:** 2.5-5
**Status:** drafted
**Estimated Effort:** 3-4 heures
**Priority:** P1 (Depends on 2.5-1, 2.5-2)

---

## User Story

**As a** developer building adaptive agent workflows,
**I want** episodic memory to capture and retrieve execution events,
**So that** Loop 2 adaptation decisions can be informed by similar past situations and Loop 3 can learn optimal patterns.

---

## Acceptance Criteria

1. ✅ EpisodicMemoryStore class implemented with capture/query operations
2. ✅ PGlite table `episodic_events` created with proper indexing
3. ✅ Events captured: speculation_start, task_complete, ail_decision, hil_decision
4. ✅ Async batch writes (non-blocking, flush on workflow completion)
5. ✅ Context-aware retrieval: query similar past situations by context vector
6. ✅ Retention policy: prune events older than 30 days
7. ✅ Integration with ControlledExecutor (Loop 1 capture)
8. ✅ Integration with DAGSuggester (Loop 2 retrieval)
9. ✅ Unit tests validating capture, retrieval, and pruning

---

## Tasks / Subtasks

### Phase 1: Data Model & Storage (1-1.5h)

- [ ] **Task 1: Define EpisodicEvent interface** (AC: #3)
  - [ ] Create `src/learning/types.ts`:
    ```typescript
    export interface EpisodicEvent {
      id: string;              // UUID
      workflow_id: string;
      event_type: 'speculation_start' | 'task_complete' | 'ail_decision' | 'hil_decision';
      task_id?: string;
      timestamp: number;       // Unix timestamp
      data: {
        // Flexible JSONB for context
        context?: Record<string, any>;

        // For speculation events
        prediction?: {
          toolId: string;
          confidence: number;
          reasoning: string;
        };

        // For task completion
        result?: {
          status: 'success' | 'error';
          output?: unknown;
          executionTimeMs?: number;
        };

        // For AIL/HIL decisions
        decision?: {
          type: 'ail' | 'hil';
          action: string;
          reasoning: string;
        };
      };
    }
    ```

- [ ] **Task 2: Create PGlite migration** (AC: #2)
  - [ ] File: `src/db/migrations/005_episodic_memory.sql`
    ```sql
    -- Episodic events table
    CREATE TABLE IF NOT EXISTS episodic_events (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      task_id TEXT,
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      data JSONB NOT NULL,

      -- Indexes for performance
      CONSTRAINT valid_event_type CHECK (
        event_type IN ('speculation_start', 'task_complete', 'ail_decision', 'hil_decision')
      )
    );

    CREATE INDEX idx_episodic_workflow_time ON episodic_events(workflow_id, timestamp DESC);
    CREATE INDEX idx_episodic_type_time ON episodic_events(event_type, timestamp DESC);
    CREATE INDEX idx_episodic_timestamp ON episodic_events(timestamp DESC);

    -- GIN index for JSONB context queries
    CREATE INDEX idx_episodic_data_context ON episodic_events USING GIN ((data->'context'));
    ```

### Phase 2: EpisodicMemoryStore Implementation (1-1.5h)

- [ ] **Task 3: Implement EpisodicMemoryStore class** (AC: #1, #4)
  - [ ] Create `src/learning/episodic-memory.ts`:
    ```typescript
    export class EpisodicMemoryStore {
      private buffer: EpisodicEvent[] = [];
      private flushTimer?: NodeJS.Timeout;

      constructor(
        private db: PGliteClient,
        private config = {
          batchSize: 100,
          flushIntervalMs: 5000,
          retentionDays: 30
        }
      ) {}

      // Non-blocking capture
      async capture(event: Omit<EpisodicEvent, 'id'>): Promise<void> {
        const enrichedEvent: EpisodicEvent = {
          ...event,
          id: generateUUID()
        };

        this.buffer.push(enrichedEvent);

        // Auto-flush if buffer full
        if (this.buffer.length >= this.config.batchSize) {
          await this.flush();
        }
      }

      // Batch write to PGlite
      async flush(): Promise<void> {
        if (this.buffer.length === 0) return;

        const events = [...this.buffer];
        this.buffer = [];

        await this.db.transaction(async (tx) => {
          for (const event of events) {
            await tx.query(`
              INSERT INTO episodic_events (id, workflow_id, event_type, task_id, timestamp, data)
              VALUES ($1, $2, $3, $4, to_timestamp($5 / 1000.0), $6)
            `, [
              event.id,
              event.workflow_id,
              event.event_type,
              event.task_id,
              event.timestamp,
              JSON.stringify(event.data)
            ]);
          }
        });
      }

      // Query for workflow
      async getWorkflowEvents(workflowId: string): Promise<EpisodicEvent[]> {
        const result = await this.db.query(`
          SELECT * FROM episodic_events
          WHERE workflow_id = $1
          ORDER BY timestamp ASC
        `, [workflowId]);

        return result.rows.map(this.deserialize);
      }

      private deserialize(row: any): EpisodicEvent {
        return {
          id: row.id,
          workflow_id: row.workflow_id,
          event_type: row.event_type,
          task_id: row.task_id,
          timestamp: new Date(row.timestamp).getTime(),
          data: row.data
        };
      }
    }
    ```

- [ ] **Task 4: Implement context-aware retrieval** (AC: #5)
  - [ ] Method: `retrieveRelevant(context, options)`
    ```typescript
    async retrieveRelevant(
      context: Record<string, any>,
      options: {
        k?: number;           // Top-k results (default: 5)
        eventTypes?: string[]; // Filter by event types
        since?: Date;          // Only recent events
      } = {}
    ): Promise<EpisodicEvent[]> {
      const k = options.k ?? 5;
      const eventTypes = options.eventTypes ?? [];

      // Simple similarity: match on context keys
      // Future: vector embeddings for semantic similarity
      const contextKeys = Object.keys(context);

      let query = `
        SELECT *,
          (
            SELECT COUNT(*)
            FROM jsonb_object_keys(data->'context') AS key
            WHERE key = ANY($1)
          ) AS similarity_score
        FROM episodic_events
        WHERE 1=1
      `;

      const params: any[] = [contextKeys];
      let paramIndex = 2;

      if (eventTypes.length > 0) {
        query += ` AND event_type = ANY($${paramIndex})`;
        params.push(eventTypes);
        paramIndex++;
      }

      if (options.since) {
        query += ` AND timestamp >= $${paramIndex}`;
        params.push(options.since);
        paramIndex++;
      }

      query += `
        ORDER BY similarity_score DESC, timestamp DESC
        LIMIT $${paramIndex}
      `;
      params.push(k);

      const result = await this.db.query(query, params);
      return result.rows.map(this.deserialize);
    }
    ```

- [ ] **Task 5: Implement retention policy** (AC: #6)
  - [ ] Method: `pruneOldEvents()`
    ```typescript
    async pruneOldEvents(): Promise<number> {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

      const result = await this.db.query(`
        DELETE FROM episodic_events
        WHERE timestamp < $1
        RETURNING id
      `, [cutoffDate]);

      const deletedCount = result.rowCount ?? 0;
      console.log(`[EpisodicMemory] Pruned ${deletedCount} events older than ${this.config.retentionDays} days`);

      return deletedCount;
    }

    // Schedule automatic pruning
    startPruningSchedule(): void {
      // Run daily at 2am
      const interval = 24 * 60 * 60 * 1000; // 24 hours
      setInterval(() => this.pruneOldEvents(), interval);
    }
    ```

### Phase 3: Integration with Loop 1 (ControlledExecutor) (0.5-1h)

- [ ] **Task 6: Integrate capture in ControlledExecutor** (AC: #7)
  - [ ] Modify `src/dag/controlled-executor.ts`:
    ```typescript
    export class ControlledExecutor extends ParallelExecutor {
      private episodicMemory: EpisodicMemoryStore;

      constructor(
        config: ExecutorConfig,
        episodicMemory: EpisodicMemoryStore
      ) {
        super(config);
        this.episodicMemory = episodicMemory;
      }

      protected async executeTask(
        task: Task,
        previousResults: TaskResult[]
      ): Promise<TaskResult> {
        // Capture task start
        await this.episodicMemory.capture({
          workflow_id: this.executionId,
          event_type: 'task_complete', // Will update after
          task_id: task.id,
          timestamp: Date.now(),
          data: {
            context: this.getCurrentContext()
          }
        });

        // Execute task (parent implementation)
        const result = await super.executeTask(task, previousResults);

        // Capture task completion
        await this.episodicMemory.capture({
          workflow_id: this.executionId,
          event_type: 'task_complete',
          task_id: task.id,
          timestamp: Date.now(),
          data: {
            context: this.getCurrentContext(),
            result: {
              status: result.status,
              output: result.output,
              executionTimeMs: result.executionTimeMs
            }
          }
        });

        return result;
      }

      // Override to flush episodic memory
      async execute(dag: DAGStructure): Promise<ExecutionResult> {
        const result = await super.execute(dag);

        // Flush episodic memory on completion
        await this.episodicMemory.flush();

        return result;
      }

      private getCurrentContext(): Record<string, any> {
        return {
          workflowType: this.state.context.workflowType,
          completedTasks: this.state.tasks.length,
          currentLayer: this.currentLayer,
          // Add relevant context keys
        };
      }
    }
    ```

### Phase 4: Integration with Loop 2 (DAGSuggester) (0.5h)

- [ ] **Task 7: Add episodic retrieval to DAGSuggester** (AC: #8)
  - [ ] Extend `src/graphrag/dag-suggester.ts`:
    ```typescript
    export class DAGSuggester {
      constructor(
        private graphEngine: GraphRAGEngine,
        private vectorSearch: VectorSearch,
        private episodicMemory: EpisodicMemoryStore // NEW
      ) {}

      // NEW: Get adaptation context from episodic memory
      async getAdaptationContext(
        state: WorkflowState
      ): Promise<{
        relevantEpisodes: EpisodicEvent[];
        contextBoost: Map<string, number>;
      }> {
        // Query similar past situations
        const relevantEpisodes = await this.episodicMemory.retrieveRelevant(
          state.context,
          {
            k: 5,
            eventTypes: ['task_complete', 'ail_decision'],
            since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        );

        // Calculate context boost for tool predictions
        const contextBoost = new Map<string, number>();

        for (const episode of relevantEpisodes) {
          // If similar context had successful task, boost that tool
          if (episode.event_type === 'task_complete' &&
              episode.data.result?.status === 'success') {
            const toolId = episode.task_id?.split('_')[0]; // Extract tool from task_id
            if (toolId) {
              const currentBoost = contextBoost.get(toolId) ?? 0;
              contextBoost.set(toolId, currentBoost + 0.02); // +2% per success
            }
          }
        }

        return { relevantEpisodes, contextBoost };
      }

      // UPDATED: Use episodic context in predictions
      async predictNextNodes(
        state: WorkflowState,
        completed: TaskResult[]
      ): Promise<PredictedNode[]> {
        // Get episodic context
        const { contextBoost } = await this.getAdaptationContext(state);

        // Get GraphRAG predictions (existing logic)
        const predictions = await this.getPredictionsFromGraphRAG(state, completed);

        // Apply episodic boost
        return predictions.map(pred => ({
          ...pred,
          confidence: Math.min(
            1.0,
            pred.confidence + (contextBoost.get(pred.task.toolId) ?? 0)
          )
        }));
      }
    }
    ```

### Phase 5: Testing & Validation (0.5h)

- [ ] **Task 8: Unit tests** (AC: #9)
  - [ ] Test: Capture events in buffer
  - [ ] Test: Flush batch writes to PGlite
  - [ ] Test: Query workflow events
  - [ ] Test: Retrieve relevant by context similarity
  - [ ] Test: Prune old events (retention policy)
  - [ ] Test: Non-blocking capture (doesn't slow execution)

- [ ] **Task 9: Integration tests**
  - [ ] Test: ControlledExecutor captures events during execution
  - [ ] Test: DAGSuggester retrieves episodic context
  - [ ] Test: Episodic boost improves predictions
  - [ ] Test: Complete workflow → events persisted → queryable

---

## Dev Notes

### Architecture: Episodic Memory as Loop 1→2→3 Bridge

```
┌─────────────────────────────────────────────────────────┐
│            Episodic Memory Architecture                 │
└─────────────────────────────────────────────────────────┘

LOOP 1 (Execution): CAPTURE
  ControlledExecutor executing tasks
      ↓ captures
  EpisodicMemoryStore.capture({ type: 'task_complete', ... })
      ↓ buffers
  In-memory buffer (non-blocking)
      ↓ flush on workflow completion
  PGlite episodic_events table

LOOP 2 (Adaptation): RETRIEVE
  DAGSuggester.replanDAG() needs context
      ↓ queries
  EpisodicMemoryStore.retrieveRelevant(currentContext)
      ↓ returns
  Similar past situations (last 7 days)
      ↓ applies
  Context boost to predictions (+2% per past success)

LOOP 3 (Meta-Learning): ANALYZE
  GraphRAGEngine.updateFromExecution()
      ↓ queries
  EpisodicMemoryStore.getWorkflowEvents(workflowId)
      ↓ analyzes
  Speculation success rates, decision patterns
      ↓ updates
  Adaptive thresholds, GraphRAG weights
```

### Performance Considerations

**Write Performance:**
- Non-blocking capture: events buffered in memory
- Batch inserts: 100 events/transaction (~10ms)
- Async flush: doesn't block workflow execution

**Read Performance:**
- Indexed queries: (workflow_id, timestamp) → <5ms
- Context similarity: Simple key matching (no vector search yet)
- Top-k limit: Max 5 episodes retrieved

**Storage:**
- JSONB compression: ~500 bytes/event average
- 1000 workflows/month × 50 events/workflow = 50K events
- Storage: ~25MB/month, ~300MB/year
- Retention policy: Auto-prune >30 days

### Future Enhancements (Not in This Story)

1. **Vector embeddings for semantic similarity** (Story 2.5-7?)
   - Embed context → Vector(384)
   - pgvector for similarity search
   - More accurate context matching

2. **Episodic compression** (Story 2.5-8?)
   - Compress routine successes → summaries
   - Keep failures & edge cases (high learning value)
   - Reduce storage by 70%

3. **Multi-modal episodes** (Future)
   - Screenshots, error logs, user feedback
   - Rich context for debugging

### Error Handling

**Capture Failures:**
- Buffer full → Force flush synchronously
- Flush fails → Log error, retry once, then discard
- Don't fail workflow on episodic memory errors

**Query Failures:**
- retrieveRelevant() fails → Return empty array, log error
- Don't block adaptation on episodic query errors
- Graceful degradation: use GraphRAG only

### Project Structure

**New Files:**
```
src/learning/
├── episodic-memory.ts         # EpisodicMemoryStore class
└── types.ts                    # EpisodicEvent interface

src/db/migrations/
└── 005_episodic_memory.sql     # PGlite schema
```

**Modified Files:**
```
src/dag/controlled-executor.ts  # Add capture integration
src/graphrag/dag-suggester.ts   # Add retrieval integration
```

---

## Related Documents

- **ADR-007**: DAG Adaptive Feedback Loops (docs/adrs/ADR-007-dag-adaptive-feedback-loops.md)
- **Architecture**: Pattern 4 - Adaptive DAG Feedback Loop (docs/architecture.md)
- **Spike**: CoALA Comparison (docs/spikes/spike-coala-comparison-adaptive-feedback.md)
- **Story 2.5-3**: AIL/HIL Integration (captures decision events)
- **Story 2.5-4**: Speculative Execution (captures speculation events)
- **Story 2.5-6**: Adaptive Thresholds (consumes episodic events)

---

## Definition of Done

- [ ] All acceptance criteria met (9/9)
- [ ] Code reviewed and approved
- [ ] Unit tests passing (>90% coverage)
- [ ] Integration tests validating capture & retrieval
- [ ] PGlite migration tested
- [ ] Batch writes <10ms latency
- [ ] Non-blocking capture validated (no execution slowdown)
- [ ] Retention policy working (auto-prune >30 days)
- [ ] Documentation updated (inline comments + usage guide)
- [ ] No breaking changes to existing executor
