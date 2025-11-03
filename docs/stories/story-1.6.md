# Story 1.6: On-Demand Schema Loading & Context Optimization

**Epic:** 1 - Project Foundation & Context Optimization Engine
**Story ID:** 1.6
**Status:** TODO
**Estimated Effort:** 3-4 hours

---

## User Story

**As a** Claude Code user,
**I want** AgentCards to load only relevant tool schemas based on my query,
**So that** my context window is not saturated by unused tool schemas.

---

## Acceptance Criteria

1. Integration semantic search avec schema loading
2. Workflow: query → vector search → retrieve top-k tools → load schemas
3. Schemas retournés uniquement pour matched tools (pas all-at-once)
4. Context usage measurement et logging (<5% target)
5. Comparison metric affiché: before (30-50%) vs after (<5%)
6. Cache hit pour frequently used tools (évite reloading)
7. Performance: Total query-to-schema latency <200ms P95

---

## Prerequisites

- Story 1.5 (vector search) completed

---

## Technical Notes

### Context Optimization Workflow
```typescript
class ContextOptimizer {
  constructor(
    private vectorSearch: VectorSearch,
    private schemaLoader: SchemaLoader
  ) {}

  async getRelevantSchemas(
    userQuery: string,
    topK: number = 5
  ): Promise<ToolSchema[]> {
    // 1. Semantic search for relevant tools
    const searchResults = await this.vectorSearch.searchTools(userQuery, topK);

    // 2. Load only matched schemas
    const schemas = searchResults.map(result => result.schema);

    // 3. Log context usage
    await this.logContextUsage(schemas);

    return schemas;
  }

  private async logContextUsage(schemas: ToolSchema[]): Promise<void> {
    const totalTokens = this.estimateTokens(schemas);
    const contextUsagePct = (totalTokens / 200000) * 100; // Claude 200k context

    console.log(`📊 Context usage: ${contextUsagePct.toFixed(2)}% (${totalTokens} tokens)`);

    // Store metric in database
    await this.db.exec(`
      INSERT INTO metrics (metric_name, value, timestamp)
      VALUES ('context_usage_pct', $1, NOW())
    `, [contextUsagePct]);
  }

  private estimateTokens(schemas: ToolSchema[]): number {
    // Rough estimate: ~500 tokens per tool schema
    return schemas.length * 500;
  }
}
```

### Before vs After Comparison
```typescript
async function showContextComparison(): Promise<void> {
  // Scenario: User has 100 tools across 15 MCP servers

  // BEFORE (all-at-once loading)
  const beforeTokens = 100 * 500; // 50,000 tokens
  const beforePct = (beforeTokens / 200000) * 100; // 25%

  // AFTER (on-demand loading, top-5 match)
  const afterTokens = 5 * 500; // 2,500 tokens
  const afterPct = (afterTokens / 200000) * 100; // 1.25%

  console.log(`
📊 Context Usage Comparison:
   BEFORE: ${beforePct}% (${beforeTokens} tokens) - 100 tools loaded
   AFTER:  ${afterPct}% (${afterTokens} tokens) - 5 relevant tools
   SAVINGS: ${(beforePct - afterPct).toFixed(2)}% context recovered
  `);
}
```

### Schema Caching Strategy
```typescript
class SchemaCache {
  private cache = new Map<string, { schema: ToolSchema; hits: number }>();
  private readonly MAX_CACHE_SIZE = 50;

  get(toolId: string): ToolSchema | undefined {
    const entry = this.cache.get(toolId);
    if (entry) {
      entry.hits++;
      return entry.schema;
    }
    return undefined;
  }

  set(toolId: string, schema: ToolSchema): void {
    // LRU eviction if cache full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const lruKey = this.findLRU();
      this.cache.delete(lruKey);
    }

    this.cache.set(toolId, { schema, hits: 1 });
  }

  private findLRU(): string {
    let minHits = Infinity;
    let lruKey = "";

    for (const [key, value] of this.cache.entries()) {
      if (value.hits < minHits) {
        minHits = value.hits;
        lruKey = key;
      }
    }

    return lruKey;
  }
}
```

### Performance Targets
- Vector search: <100ms (from Story 1.5)
- Schema loading from cache/DB: <50ms
- Token estimation: <10ms
- **Total latency P95: <200ms**

### Metrics Tracked
```sql
CREATE TABLE metrics (
  id SERIAL PRIMARY KEY,
  metric_name TEXT NOT NULL,
  value REAL NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Metrics to track:
-- - context_usage_pct (target: <5%)
-- - query_latency_ms (target: <200ms)
-- - tools_loaded_count (target: 5-10 per query)
-- - cache_hit_rate (target: >60%)
```

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] On-demand schema loading working
- [ ] Context usage <5% verified for typical queries
- [ ] Before/after comparison displayed to user
- [ ] Schema caching implemented with LRU eviction
- [ ] P95 latency <200ms verified
- [ ] Metrics logged to database
- [ ] Unit and integration tests passing
- [ ] Documentation with usage examples
- [ ] Code reviewed and merged

---

## References

- [Claude 3 Context Window](https://docs.anthropic.com/claude/docs/models-overview)
- [Token Estimation Techniques](https://github.com/dqbd/tiktoken)
- [LRU Cache Implementation](https://en.wikipedia.org/wiki/Cache_replacement_policies#LRU)
