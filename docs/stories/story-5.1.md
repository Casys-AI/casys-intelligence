# Story 5.1: Search Tools - Semantic + Graph Hybrid

**Status:** review
**Epic:** 5 - Intelligent Tool Discovery & Graph-Based Recommendations
**Estimate:** 2-3h

## User Story

As an AI agent, I want to search for relevant tools using natural language so that I can discover tools without knowing exact names or matching strict confidence thresholds.

## Background

The `execute_workflow` tool uses strict confidence thresholds (0.50) which blocks valid tool matches. For example, "screenshot" returns 0.48 confidence for `playwright_screenshot` - failing by 0.02.

A dedicated `search_tools` tool provides pure semantic search with graph-based re-ranking, returning ranked results without arbitrary cutoffs.

## Acceptance Criteria

- [x] **AC1:** `search_tools` MCP tool exposed via gateway
- [x] **AC2:** Accepts `query` (string) and optional `limit` (default 10)
- [x] **AC3:** Returns tools with semantic similarity scores
- [x] **AC4:** Integrates Adamic-Adar graph relatedness for re-ranking
- [x] **AC5:** Adaptive alpha based on graph density (edges count)

## Technical Design

### Algorithm

```
finalScore = α × semanticScore + (1-α) × graphRelatedness

Where α adapts to graph density:
- 0 edges: α = 1.0 (pure semantic)
- <50 edges: α = 0.8
- <200 edges: α = 0.6
- ≥200 edges: α = 0.5
```

### Graph Methods Added to GraphRAGEngine

1. `getEdgeCount()` - For adaptive alpha
2. `getNeighbors(toolId, direction)` - Get connected tools
3. `computeAdamicAdar(toolId, limit)` - Find related tools via common neighbors
4. `adamicAdarBetween(tool1, tool2)` - Pairwise similarity
5. `computeGraphRelatedness(toolId, contextTools)` - Max relatedness score
6. `bootstrapFromTemplates(templates)` - Cold start solution

### Response Format

```json
{
  "tools": [
    {
      "id": "playwright:playwright_screenshot",
      "name": "playwright_screenshot",
      "server": "playwright",
      "description": "Take a screenshot...",
      "score": 0.64,
      "semantic_score": 0.64,
      "graph_score": 0
    }
  ],
  "meta": {
    "query": "screenshot",
    "alpha": 1,
    "graph_edges": 0
  }
}
```

## Implementation Notes

- Uses existing `searchTools()` from SchemaExtractor for semantic search
- Graph re-ranking via GraphRAGEngine Adamic-Adar
- No threshold blocking - returns top-K results
- Spike research: `docs/spikes/spike-search-tools-graph-traversal.md`

## Files Modified

- `src/graphrag/graph-engine.ts` - Added 6 new methods
- `src/mcp/gateway-server.ts` - Added `search_tools` tool and handler

## Test Results

```bash
# "screenshot" query
curl -X POST http://localhost:8080/message -d '{"method":"tools/call","params":{"name":"search_tools","arguments":{"query":"screenshot"}}}'
# → playwright:playwright_screenshot (64%)

# "list files" query
curl -X POST http://localhost:8080/message -d '{"method":"tools/call","params":{"name":"search_tools","arguments":{"query":"list files"}}}'
# → filesystem:list_directory (72%)
```

## Dependencies

- Story 1.4: Embeddings generation (semantic search)
- Story 1.5: Vector search implementation
