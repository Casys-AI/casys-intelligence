# Story 6.1: Real-time Events Stream (SSE)

**Status:** drafted
**Epic:** 6 - Real-time Graph Monitoring & Observability
**Estimate:** 2-3h

## User Story

As a developer monitoring AgentCards, I want to receive graph events in real-time via Server-Sent Events so that I can observe how the system learns without polling.

## Background

Le GraphRAGEngine apprend continuellement des workflows exécutés, mais ce processus est invisible. Les développeurs ne peuvent pas voir quand un edge est créé, quand le PageRank est recalculé, ou quels workflows sont en cours d'exécution.

Un stream SSE d'événements temps réel permet d'observer le système vivant, facilitant le debugging et la compréhension du comportement du graphe.

## Acceptance Criteria

- [ ] **AC1:** SSE endpoint créé: `GET /events/stream`
- [ ] **AC2:** EventEmitter intégré dans GraphRAGEngine
- [ ] **AC3:** Event types: `graph_synced`, `edge_created`, `edge_updated`, `workflow_executed`, `metrics_updated`
- [ ] **AC4:** Event payload: timestamp, event_type, data (tool_ids, scores, etc.)
- [ ] **AC5:** Reconnection automatique si connexion perdue (client-side retry logic)
- [ ] **AC6:** Heartbeat events toutes les 30s pour maintenir la connexion
- [ ] **AC7:** Max 100 clients simultanés (éviter DoS)
- [ ] **AC8:** CORS headers configurés pour permettre frontend local
- [ ] **AC9:** Tests: curl stream endpoint, vérifier format events
- [ ] **AC10:** Documentation: Event schema et exemples

## Technical Design

### Event Schema

```typescript
interface GraphEvent {
  timestamp: string; // ISO 8601
  event_type: "graph_synced" | "edge_created" | "edge_updated" | "workflow_executed" | "metrics_updated";
  data: {
    // Variant selon event_type
    tool_ids?: string[];
    from_tool?: string;
    to_tool?: string;
    confidence_score?: number;
    edge_count?: number;
    node_count?: number;
  };
}
```

### SSE Implementation

```typescript
// src/mcp/sse-server.ts
export class SSEEventStream {
  private clients: Set<Response> = new Set();

  async handleStream(req: Request): Promise<Response> {
    const stream = new ReadableStream({
      start: (controller) => {
        // Setup SSE headers
        // Send heartbeat every 30s
        // Forward events from GraphRAGEngine
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}
```

### Integration with GraphRAGEngine

```typescript
// src/graphrag/graph-engine.ts
export class GraphRAGEngine {
  private eventEmitter = new EventTarget();

  async updateFromExecution(execution: WorkflowExecution): Promise<void> {
    // ... existing logic ...

    // Emit event
    this.eventEmitter.dispatchEvent(new CustomEvent("edge_created", {
      detail: { from_tool, to_tool, confidence_score }
    }));
  }
}
```

## Response Format

SSE stream format:

```
event: edge_created
data: {"timestamp":"2025-11-22T10:30:00Z","event_type":"edge_created","data":{"from_tool":"filesystem:list_directory","to_tool":"filesystem:read_file","confidence_score":0.55}}

event: heartbeat
data: {"timestamp":"2025-11-22T10:30:30Z","event_type":"heartbeat"}

event: metrics_updated
data: {"timestamp":"2025-11-22T10:31:00Z","event_type":"metrics_updated","data":{"edge_count":3,"node_count":61}}
```

## Implementation Notes

- Utilise Deno's `ReadableStream` pour SSE
- EventEmitter pattern dans GraphRAGEngine
- Heartbeat pour éviter timeout des proxies
- Max clients pour éviter memory leaks

## Files to Create/Modify

- `src/mcp/sse-server.ts` - SSE endpoint implementation
- `src/graphrag/graph-engine.ts` - EventEmitter integration
- `src/cli/commands/serve.ts` - Mount SSE endpoint
- `tests/integration/sse_events_test.ts` - Integration tests

## Test Plan

```bash
# Test 1: Basic stream connection
curl -N http://localhost:8080/events/stream
# Should receive heartbeat events every 30s

# Test 2: Execute workflow and observe events
# Terminal 1: curl stream endpoint
# Terminal 2: execute workflow via MCP
# → Should see edge_created event in Terminal 1

# Test 3: Reconnection
# Kill server, restart → client should reconnect automatically
```

## Dependencies

- Epic 5 completed (GraphRAGEngine with updateFromExecution)
- HTTP transport (ADR-014) for SSE endpoint
