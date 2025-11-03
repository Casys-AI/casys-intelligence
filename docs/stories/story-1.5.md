# Story 1.5: Semantic Vector Search Implementation

**Epic:** 1 - Project Foundation & Context Optimization Engine
**Story ID:** 1.5
**Status:** TODO
**Estimated Effort:** 3-4 hours

---

## User Story

**As a** developer,
**I want** to search for relevant tools using natural language queries,
**So that** I can find the right tools without knowing their exact names.

---

## Acceptance Criteria

1. Query embedding génération (même modèle BGE-Large-EN-v1.5)
2. Cosine similarity search sur vector index (<100ms query time P95)
3. API: `searchTools(query: string, topK: number)` → tool_ids + scores
4. Top-k results returned sorted par relevance score (default k=5)
5. Configurable similarity threshold (default 0.7)
6. Unit tests validant accuracy avec sample queries
7. Benchmark test confirmant P95 <100ms pour 1000+ vectors

---

## Prerequisites

- Story 1.4 (embeddings generation) completed

---

## Technical Notes

### Semantic Search API
```typescript
interface SearchResult {
  toolId: string;
  serverId: string;
  toolName: string;
  score: number;
  schema: ToolSchema;
}

class VectorSearch {
  constructor(
    private db: PGlite,
    private embeddingModel: EmbeddingModel
  ) {}

  async searchTools(
    query: string,
    topK: number = 5,
    minScore: number = 0.7
  ): Promise<SearchResult[]> {
    // 1. Generate query embedding
    const queryEmbedding = await this.embeddingModel.encode(query);

    // 2. Perform cosine similarity search with pgvector
    const results = await this.db.query(`
      SELECT
        te.tool_id,
        te.server_id,
        te.tool_name,
        ts.schema_json,
        1 - (te.embedding <=> $1::vector) AS score
      FROM tool_embedding te
      JOIN tool_schema ts ON te.tool_id = ts.tool_id
      WHERE 1 - (te.embedding <=> $1::vector) >= $2
      ORDER BY te.embedding <=> $1::vector
      LIMIT $3
    `, [
      `[${queryEmbedding.join(",")}]`,
      minScore,
      topK
    ]);

    // 3. Parse and return results
    return results.map(row => ({
      toolId: row.tool_id,
      serverId: row.server_id,
      toolName: row.tool_name,
      score: parseFloat(row.score),
      schema: JSON.parse(row.schema_json)
    }));
  }
}
```

### pgvector Cosine Similarity
- Operator: `<=>` (cosine distance)
- Score conversion: `1 - distance` = similarity (0-1 range)
- HNSW index automatically used for fast queries

### Sample Test Queries
```typescript
// Test 1: File operations
const results1 = await vectorSearch.searchTools("read a file", 5);
// Expected: filesystem:read, filesystem:read_file, etc.

// Test 2: GitHub operations
const results2 = await vectorSearch.searchTools("create a pull request", 5);
// Expected: github:create_pull_request, github:create_pr, etc.

// Test 3: Database queries
const results3 = await vectorSearch.searchTools("query database records", 5);
// Expected: database:query, database:select, sql:execute, etc.
```

### Performance Optimization
- **HNSW index parameters:**
  - `m = 16`: number of connections per layer
  - `ef_construction = 64`: index build quality
  - `ef_search = 40`: search quality (configurable at query time)

- **Query optimization:**
  - Limit results with `LIMIT` clause
  - Filter by similarity threshold early
  - Use prepared statements for repeated queries

### Benchmark Tests
```typescript
Deno.test("Vector search performance P95 <100ms", async () => {
  const latencies: number[] = [];

  for (let i = 0; i < 100; i++) {
    const start = performance.now();
    await vectorSearch.searchTools("random query", 5);
    const end = performance.now();
    latencies.push(end - start);
  }

  latencies.sort((a, b) => a - b);
  const p95 = latencies[Math.floor(latencies.length * 0.95)];

  assert(p95 < 100, `P95 latency ${p95}ms exceeds 100ms target`);
});
```

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] `searchTools` API implemented and tested
- [ ] Cosine similarity search working with pgvector
- [ ] P95 latency <100ms verified with benchmark tests
- [ ] Unit tests for sample queries passing
- [ ] Accuracy validated (relevant results returned)
- [ ] Documentation with usage examples
- [ ] Code reviewed and merged

---

## References

- [pgvector Cosine Similarity](https://github.com/pgvector/pgvector#cosine-similarity)
- [HNSW Algorithm](https://arxiv.org/abs/1603.09320)
- [Vector Search Best Practices](https://www.pinecone.io/learn/vector-search/)
