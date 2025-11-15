# Story 2.5-6: Adaptive Thresholds Learning

**Epic:** 2.5 - Adaptive DAG Feedback Loops
**Story ID:** 2.5-6
**Status:** drafted
**Estimated Effort:** 2-3 heures
**Priority:** P1 (Depends on 2.5-4, 2.5-5)

---

## User Story

**As a** developer building self-improving agent workflows,
**I want** adaptive thresholds that automatically adjust based on speculation success rates,
**So that** the system finds optimal confidence thresholds per context without manual tuning.

---

## Acceptance Criteria

1. ✅ AdaptiveThresholdManager class implemented
2. ✅ Context-aware threshold storage (different thresholds per workflow type)
3. ✅ Learning algorithm: adjust based on success rate (target: 85%)
4. ✅ Conservative start: initial threshold = 0.92, gradually lower if safe
5. ✅ PGlite table `adaptive_thresholds` for persistence
6. ✅ Integration with SpeculativeExecutor (dynamic threshold usage)
7. ✅ Integration with Loop 3 meta-learning (threshold updates)
8. ✅ Metrics: threshold convergence, success rate per context
9. ✅ Unit tests validating learning algorithm

---

## Tasks / Subtasks

### Phase 1: Threshold Storage & Data Model (0.5-1h)

- [ ] **Task 1: Define threshold storage schema** (AC: #2, #5)
  - [ ] Create migration `src/db/migrations/006_adaptive_thresholds.sql`:
    ```sql
    CREATE TABLE IF NOT EXISTS adaptive_thresholds (
      context_hash TEXT PRIMARY KEY,
      context_keys JSONB NOT NULL,     -- For debugging (e.g., {"workflowType": "data_analysis"})
      threshold REAL NOT NULL,
      success_rate REAL NOT NULL,
      sample_count INTEGER DEFAULT 0,  -- Number of speculations evaluated
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),

      CONSTRAINT valid_threshold CHECK (threshold >= 0.7 AND threshold <= 0.95),
      CONSTRAINT valid_success_rate CHECK (success_rate >= 0.0 AND success_rate <= 1.0)
    );

    CREATE INDEX idx_adaptive_threshold_updated ON adaptive_thresholds(updated_at DESC);
    CREATE INDEX idx_adaptive_threshold_context ON adaptive_thresholds USING GIN (context_keys);
    ```

- [ ] **Task 2: Define ThresholdConfig interface** (AC: #3, #4)
  - [ ] Add to `src/learning/types.ts`:
    ```typescript
    export interface ThresholdConfig {
      initial: number;          // 0.92 (conservative start)
      min: number;              // 0.70 (don't go below)
      max: number;              // 0.95 (don't exceed)
      targetSuccessRate: number; // 0.85 (goal)
      targetWasteRate: number;   // 0.15 (max acceptable waste)
      learningRate: number;     // 0.02 (adjustment step)
      evaluationWindow: number; // 50 (samples before adjustment)
    }

    export interface ThresholdRecord {
      contextHash: string;
      contextKeys: Record<string, any>;
      threshold: number;
      successRate: number;
      sampleCount: number;
      updatedAt: Date;
    }
    ```

### Phase 2: AdaptiveThresholdManager Implementation (1-1.5h)

- [ ] **Task 3: Implement AdaptiveThresholdManager class** (AC: #1, #3)
  - [ ] Create `src/learning/adaptive-threshold-manager.ts`:
    ```typescript
    export class AdaptiveThresholdManager {
      private cache: Map<string, ThresholdRecord> = new Map();

      constructor(
        private db: PGliteClient,
        private config: ThresholdConfig = {
          initial: 0.92,
          min: 0.70,
          max: 0.95,
          targetSuccessRate: 0.85,
          targetWasteRate: 0.15,
          learningRate: 0.02,
          evaluationWindow: 50
        }
      ) {}

      // Get threshold for context (with caching)
      async getThreshold(context: Record<string, any>): Promise<number> {
        const contextHash = this.hashContext(context);

        // Check cache
        if (this.cache.has(contextHash)) {
          return this.cache.get(contextHash)!.threshold;
        }

        // Query database
        const result = await this.db.query(`
          SELECT * FROM adaptive_thresholds
          WHERE context_hash = $1
        `, [contextHash]);

        if (result.rows.length > 0) {
          const record = this.deserialize(result.rows[0]);
          this.cache.set(contextHash, record);
          return record.threshold;
        }

        // No record: return initial threshold
        return this.config.initial;
      }

      // Update threshold based on speculation outcomes
      async updateFromEpisodes(
        context: Record<string, any>,
        episodes: EpisodicEvent[]
      ): Promise<void> {
        const contextHash = this.hashContext(context);

        // Filter speculation events
        const speculationEvents = episodes.filter(
          e => e.event_type === 'speculation_start' && e.data.prediction
        );

        if (speculationEvents.length < this.config.evaluationWindow) {
          // Not enough samples, skip update
          return;
        }

        // Calculate success rate
        const successful = speculationEvents.filter(e =>
          e.data.prediction?.wasCorrect === true
        ).length;
        const successRate = successful / speculationEvents.length;

        // Get current threshold
        const currentThreshold = await this.getThreshold(context);

        // Apply learning algorithm
        const newThreshold = this.adjustThreshold(
          currentThreshold,
          successRate
        );

        // Save to database
        await this.saveThreshold(
          contextHash,
          context,
          newThreshold,
          successRate,
          speculationEvents.length
        );

        console.log(`[AdaptiveThreshold] Context: ${contextHash}, Success: ${(successRate * 100).toFixed(1)}%, Threshold: ${currentThreshold.toFixed(3)} → ${newThreshold.toFixed(3)}`);
      }

      // Learning algorithm
      private adjustThreshold(
        currentThreshold: number,
        successRate: number
      ): number {
        let newThreshold = currentThreshold;

        if (successRate > 0.90) {
          // Too conservative (success >90%)
          // Lower threshold to speculate more
          newThreshold = Math.max(
            this.config.min,
            currentThreshold - this.config.learningRate
          );
        } else if (successRate < 0.80) {
          // Too aggressive (success <80%)
          // Raise threshold to speculate less
          newThreshold = Math.min(
            this.config.max,
            currentThreshold + this.config.learningRate
          );
        }
        // else: success rate is in target range (80-90%), no change

        return newThreshold;
      }

      private hashContext(context: Record<string, any>): string {
        // Hash based on key features only
        const keys = ['workflowType', 'domain', 'complexity'];
        const signature = keys
          .map(k => `${k}:${context[k] ?? 'default'}`)
          .join('|');
        return signature;
      }

      private async saveThreshold(
        contextHash: string,
        context: Record<string, any>,
        threshold: number,
        successRate: number,
        sampleCount: number
      ): Promise<void> {
        await this.db.query(`
          INSERT INTO adaptive_thresholds (
            context_hash,
            context_keys,
            threshold,
            success_rate,
            sample_count,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, NOW())
          ON CONFLICT (context_hash) DO UPDATE SET
            threshold = $3,
            success_rate = $4,
            sample_count = adaptive_thresholds.sample_count + $5,
            updated_at = NOW()
        `, [
          contextHash,
          JSON.stringify(context),
          threshold,
          successRate,
          sampleCount
        ]);

        // Update cache
        this.cache.set(contextHash, {
          contextHash,
          contextKeys: context,
          threshold,
          successRate,
          sampleCount,
          updatedAt: new Date()
        });
      }

      private deserialize(row: any): ThresholdRecord {
        return {
          contextHash: row.context_hash,
          contextKeys: row.context_keys,
          threshold: row.threshold,
          successRate: row.success_rate,
          sampleCount: row.sample_count,
          updatedAt: new Date(row.updated_at)
        };
      }
    }
    ```

### Phase 3: Integration with SpeculativeExecutor (0.5h)

- [ ] **Task 4: Use adaptive threshold in speculation** (AC: #6)
  - [ ] Modify `src/dag/speculative-executor.ts`:
    ```typescript
    export class SpeculativeExecutor {
      constructor(
        private executor: ParallelExecutor,
        private adaptiveThresholds: AdaptiveThresholdManager
      ) {}

      async start(
        predictions: PredictedNode[],
        context: Record<string, any>
      ): Promise<void> {
        // Get adaptive threshold for context
        const threshold = await this.adaptiveThresholds.getThreshold(context);

        console.log(`[Speculation] Using adaptive threshold: ${threshold.toFixed(3)} for context:`, context);

        // Only speculate on high-confidence predictions
        const highConfidence = predictions.filter(
          p => p.confidence > threshold
        );

        for (const pred of highConfidence) {
          this.executeInBackground(pred);
        }
      }
    }
    ```

### Phase 4: Integration with Loop 3 Meta-Learning (0.5h)

- [ ] **Task 5: Update thresholds after workflow completion** (AC: #7)
  - [ ] Extend `src/graphrag/graph-engine.ts`:
    ```typescript
    export class GraphRAGEngine {
      constructor(
        private storage: GraphStorage,
        private adaptiveThresholds: AdaptiveThresholdManager
      ) {}

      async updateFromExecution(execution: WorkflowExecution): Promise<void> {
        // Existing GraphRAG update logic
        await this.updateGraphFromExecution(execution);

        // NEW: Update adaptive thresholds
        const episodes = await this.episodicMemory.getWorkflowEvents(
          execution.workflow_id
        );

        await this.adaptiveThresholds.updateFromEpisodes(
          execution.context,
          episodes
        );
      }
    }
    ```

### Phase 5: Metrics & Observability (0.5h)

- [ ] **Task 6: Implement threshold convergence metrics** (AC: #8)
  - [ ] Method: `getThresholdMetrics()`
    ```typescript
    async getThresholdMetrics(): Promise<{
      contexts: Array<{
        context: string;
        threshold: number;
        successRate: number;
        sampleCount: number;
        converged: boolean;
      }>;
    }> {
      const result = await this.db.query(`
        SELECT
          context_hash,
          context_keys,
          threshold,
          success_rate,
          sample_count
        FROM adaptive_thresholds
        ORDER BY updated_at DESC
      `);

      return {
        contexts: result.rows.map(row => ({
          context: row.context_hash,
          threshold: row.threshold,
          successRate: row.success_rate,
          sampleCount: row.sample_count,
          converged: this.isConverged(row.threshold, row.success_rate)
        }))
      };
    }

    private isConverged(threshold: number, successRate: number): boolean {
      // Converged if success rate is in target range (80-90%)
      return successRate >= 0.80 && successRate <= 0.90;
    }
    ```

### Phase 6: Testing & Validation (0.5h)

- [ ] **Task 7: Unit tests** (AC: #9)
  - [ ] Test: Initial threshold = 0.92
  - [ ] Test: Success rate >90% → Lower threshold
  - [ ] Test: Success rate <80% → Raise threshold
  - [ ] Test: Success rate 80-90% → No change (converged)
  - [ ] Test: Threshold bounds respected (min: 0.7, max: 0.95)
  - [ ] Test: Context-aware thresholds (different per workflow type)

- [ ] **Task 8: Integration tests**
  - [ ] Test: Week 1 (conservative) → Week 2 (lowered) → Week 3 (optimal)
  - [ ] Test: Multiple contexts learn independently
  - [ ] Test: Persistence across restarts

---

## Dev Notes

### Learning Algorithm Visualization

```
┌─────────────────────────────────────────────────────────┐
│        Adaptive Threshold Learning Algorithm            │
└─────────────────────────────────────────────────────────┘

INITIAL STATE (Week 1):
  Threshold: 0.92 (conservative)
  Speculations: 10
  Successful: 9 (90%)
  → Success rate too high (>90%)
  → Lower threshold: 0.92 → 0.90

WEEK 2:
  Threshold: 0.90
  Speculations: 50
  Successful: 44 (88%)
  → Success rate too high (>90%)
  → Lower threshold: 0.90 → 0.88

WEEK 3:
  Threshold: 0.88
  Speculations: 50
  Successful: 42 (84%)
  → Success rate in target range (80-90%)
  → Keep threshold: 0.88 ✅ CONVERGED

WEEK 4 (Drift):
  Threshold: 0.88
  Speculations: 50
  Successful: 38 (76%)
  → Success rate too low (<80%)
  → Raise threshold: 0.88 → 0.90 (re-converge)
```

### Context-Aware Thresholds

Different workflow types converge to different optimal thresholds:

```typescript
// Example contexts after convergence:

{
  workflowType: 'data_analysis',
  threshold: 0.82,  // Stable, predictable workflows
  successRate: 0.86
}

{
  workflowType: 'web_scraping',
  threshold: 0.91,  // Unpredictable, dynamic websites
  successRate: 0.84
}

{
  workflowType: 'api_integration',
  threshold: 0.78,  // Very predictable REST APIs
  successRate: 0.89
}
```

### Performance Considerations

**Write Performance:**
- Threshold updates: Once per workflow (~50-100 workflows/day)
- Database upsert: <5ms
- Cache update: Instant

**Read Performance:**
- Cached lookups: <1ms (Map.get)
- Database miss: <5ms (indexed query)
- No impact on speculation latency

**Convergence Time:**
- Evaluation window: 50 speculations
- Typical workflow: 3-5 speculations
- Convergence: ~10-15 workflows (~1-2 weeks)

### Example Scenario: Data Analysis Workflows

```
WEEK 1: Initial conservative threshold
  Context: { workflowType: 'data_analysis' }
  Threshold: 0.92
  Speculations: 10 (confidence >0.92)
  Success: 9/10 (90%)
  → Lower threshold: 0.92 → 0.90

WEEK 2: More aggressive speculation
  Threshold: 0.90
  Speculations: 50 (confidence >0.90)
  Success: 44/50 (88%)
  → Lower threshold: 0.90 → 0.88

WEEK 3: Approaching optimal
  Threshold: 0.88
  Speculations: 50 (confidence >0.88)
  Success: 42/50 (84%)
  → CONVERGED ✅ (success rate in 80-90% target)

WEEK 4+: Stable operation
  Threshold: 0.88 (stable)
  Success: ~85% consistently
  → No further adjustments (occasional re-convergence if drift)
```

### Error Handling

**Learning Failures:**
- Not enough samples → Skip update, wait for more data
- Database error → Log, use cached threshold
- Invalid success rate (NaN) → Skip update, log warning

**Threshold Bounds:**
- Always clamp to [0.7, 0.95] range
- Never exceed bounds even with extreme data
- Log warning if trying to exceed bounds

### Project Structure

**New Files:**
```
src/learning/
└── adaptive-threshold-manager.ts  # AdaptiveThresholdManager class

src/db/migrations/
└── 006_adaptive_thresholds.sql    # PGlite schema
```

**Modified Files:**
```
src/dag/speculative-executor.ts    # Use adaptive threshold
src/graphrag/graph-engine.ts       # Update thresholds in Loop 3
```

---

## Related Documents

- **ADR-007**: DAG Adaptive Feedback Loops (docs/adrs/ADR-007-dag-adaptive-feedback-loops.md)
- **Architecture**: Pattern 4 - Adaptive DAG Feedback Loop (docs/architecture.md)
- **Spike**: CoALA Comparison - Section 5.1 Confidence Adaptative (docs/spikes/spike-coala-comparison-adaptive-feedback.md)
- **Story 2.5-4**: Speculative Execution (uses adaptive threshold)
- **Story 2.5-5**: Episodic Memory (provides data for learning)

---

## Definition of Done

- [ ] All acceptance criteria met (9/9)
- [ ] Code reviewed and approved
- [ ] Unit tests passing (>90% coverage)
- [ ] Integration tests validating learning algorithm
- [ ] PGlite migration tested
- [ ] Threshold convergence validated (simulated 3-week test)
- [ ] Context-aware thresholds working
- [ ] Metrics tracking implemented
- [ ] Documentation updated (inline comments + learning algorithm explanation)
- [ ] No breaking changes to existing SpeculativeExecutor
