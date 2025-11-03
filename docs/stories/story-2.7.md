# Story 2.7: End-to-End Tests & Production Hardening

**Epic:** 2 - DAG Execution & Production Readiness
**Story ID:** 2.7
**Status:** TODO
**Estimated Effort:** 6-8 hours

---

## User Story

**As a** developer shipping production software,
**I want** comprehensive E2E tests et production hardening,
**So that** AgentCards is reliable et users don't experience bugs.

---

## Acceptance Criteria

1. E2E test suite créé avec Deno.test
2. Test scenarios: migration, vector search, DAG execution, gateway proxying
3. Mock MCP servers pour testing (fixtures)
4. Integration tests avec real BGE-Large model
5. Performance regression tests (benchmark suite)
6. Memory leak detection tests (long-running daemon)
7. CI configuration updated pour run E2E tests
8. Code coverage report >80% (unit + integration)
9. Load testing: 15+ MCP servers, 100+ tools
10. Documentation: README updated avec installation, usage, troubleshooting

---

## Prerequisites

- Story 2.6 (error handling) completed
- All Epic 2 stories completed

---

## Technical Notes

### E2E Test Suite Structure
```typescript
// tests/e2e/
├── 01-init.test.ts           // Migration and initialization
├── 02-discovery.test.ts      // MCP server discovery
├── 03-embeddings.test.ts     // Embedding generation
├── 04-vector-search.test.ts  // Semantic search
├── 05-graph-engine.test.ts   // GraphRAG with Graphology
├── 06-dag-execution.test.ts  // Parallel execution
├── 07-gateway.test.ts        // MCP gateway integration
├── 08-health-checks.test.ts  // Health monitoring
└── 09-full-workflow.test.ts  // Complete user journey
```

### Mock MCP Server
```typescript
// tests/fixtures/mock-mcp-server.ts
export class MockMCPServer {
  private tools = new Map<string, MockTool>();
  private callCount = new Map<string, number>();

  constructor(public serverId: string) {}

  addTool(name: string, handler: (args: any) => any, delay: number = 0): void {
    this.tools.set(name, { name, handler, delay });
  }

  async listTools(): Promise<ToolSchema[]> {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: `Mock tool ${tool.name}`,
      inputSchema: {
        type: "object",
        properties: {
          input: { type: "string" },
        },
      },
    }));
  }

  async callTool(name: string, args: any): Promise<any> {
    const tool = this.tools.get(name);

    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    // Track call count
    this.callCount.set(name, (this.callCount.get(name) || 0) + 1);

    // Simulate delay
    if (tool.delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, tool.delay));
    }

    return tool.handler(args);
  }

  getCallCount(toolName: string): number {
    return this.callCount.get(toolName) || 0;
  }

  reset(): void {
    this.callCount.clear();
  }
}

interface MockTool {
  name: string;
  handler: (args: any) => any;
  delay: number;
}
```

### E2E Test: Full User Journey
```typescript
// tests/e2e/09-full-workflow.test.ts
Deno.test("E2E: Complete user journey", async (t) => {
  // Setup
  const testDir = await Deno.makeTempDir();
  const db = await initializeTestDatabase(testDir);

  // Create mock MCP servers
  const filesystemServer = new MockMCPServer("filesystem");
  filesystemServer.addTool("read", (args) => ({ content: "mock file content" }));
  filesystemServer.addTool("write", (args) => ({ success: true }));

  const jsonServer = new MockMCPServer("json");
  jsonServer.addTool("parse", (args) => JSON.parse(args.json));
  jsonServer.addTool("stringify", (args) => JSON.stringify(args.obj));

  const mcpClients = new Map([
    ["filesystem", filesystemServer],
    ["json", jsonServer],
  ]);

  await t.step("1. Initialize and discover servers", async () => {
    // Test server discovery
    const schemas = await extractSchemas(filesystemServer);
    assertEquals(schemas.length, 2);

    await storeSchemas(db, "filesystem", schemas);
  });

  await t.step("2. Generate embeddings", async () => {
    const embeddingModel = await loadEmbeddingModel();
    await generateEmbeddings(db, embeddingModel);

    const embeddingCount = await db.query(
      "SELECT COUNT(*) as count FROM tool_embedding"
    );
    assert(embeddingCount[0].count > 0);
  });

  await t.step("3. Vector search", async () => {
    const vectorSearch = new VectorSearch(db, embeddingModel);
    const results = await vectorSearch.searchTools("read a file", 5);

    assert(results.length > 0);
    assert(results[0].toolName.includes("read"));
  });

  await t.step("4. Build graph", async () => {
    const graphEngine = new GraphRAGEngine(db);
    await graphEngine.syncFromDatabase();

    const stats = graphEngine.getStats();
    assert(stats.nodeCount >= 2);
  });

  await t.step("5. Execute workflow", async () => {
    const executor = new ParallelExecutor(mcpClients);

    const workflow: DAGStructure = {
      tasks: [
        {
          id: "read",
          tool: "filesystem:read",
          arguments: { path: "/test.json" },
          depends_on: [],
        },
        {
          id: "parse",
          tool: "json:parse",
          arguments: { json: "$OUTPUT[read].content" },
          depends_on: ["read"],
        },
      ],
    };

    const result = await executor.execute(workflow);

    assertEquals(result.results.length, 2);
    assertEquals(result.errors.length, 0);
    assert(result.parallelizationLayers === 2);
  });

  await t.step("6. Gateway integration", async () => {
    const gateway = new AgentCardsGateway(db, mcpClients);

    // Test list_tools
    const tools = await gateway.handleRequest({
      method: "tools/list",
      params: { query: "read files" },
    });

    assert(tools.tools.length > 0);

    // Test call_tool
    const callResult = await gateway.handleRequest({
      method: "tools/call",
      params: {
        name: "filesystem:read",
        arguments: { path: "/test.txt" },
      },
    });

    assert(callResult.content);
  });

  // Cleanup
  await Deno.remove(testDir, { recursive: true });
});
```

### Performance Regression Tests
```typescript
// tests/benchmarks/performance.bench.ts
Deno.bench("Vector search latency", async (b) => {
  const vectorSearch = await setupVectorSearch();

  b.start();
  for (let i = 0; i < 100; i++) {
    await vectorSearch.searchTools("read files", 5);
  }
  b.end();
});

Deno.bench("Graph sync from DB", async (b) => {
  const graphEngine = await setupGraphEngine();

  b.start();
  await graphEngine.syncFromDatabase();
  b.end();
});

Deno.bench("PageRank computation", async (b) => {
  const graphEngine = await setupGraphEngine();
  await graphEngine.syncFromDatabase();

  b.start();
  graphEngine.calculatePageRank();
  b.end();
});

Deno.bench("Parallel execution (5 tasks)", async (b) => {
  const executor = await setupExecutor();
  const dag = createTestDAG(5);

  b.start();
  await executor.execute(dag);
  b.end();
});
```

### Memory Leak Detection
```typescript
// tests/memory/leak-detection.test.ts
Deno.test("Memory leak: Long-running daemon", async () => {
  const gateway = await setupGateway();

  const initialMemory = Deno.memoryUsage().heapUsed;

  // Simulate 1000 requests
  for (let i = 0; i < 1000; i++) {
    await gateway.handleRequest({
      method: "tools/list",
      params: { query: `query ${i}` },
    });

    // Force GC every 100 requests
    if (i % 100 === 0) {
      globalThis.gc?.();
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  const finalMemory = Deno.memoryUsage().heapUsed;
  const memoryGrowth = finalMemory - initialMemory;

  // Memory growth should be < 50MB for 1000 requests
  assert(
    memoryGrowth < 50 * 1024 * 1024,
    `Memory leak detected: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB growth`
  );
});
```

### Load Testing
```typescript
// tests/load/stress-test.ts
Deno.test("Load test: 15 servers, 100 tools", async () => {
  const servers: MockMCPServer[] = [];

  // Create 15 mock servers
  for (let i = 0; i < 15; i++) {
    const server = new MockMCPServer(`server-${i}`);

    // Add 6-7 tools per server (~100 total)
    for (let j = 0; j < 7; j++) {
      server.addTool(`tool-${j}`, (args) => ({ result: `output-${j}` }), 50);
    }

    servers.push(server);
  }

  const db = await setupTestDatabase();
  const mcpClients = new Map(servers.map((s) => [s.serverId, s]));

  // Test: Discover all servers
  const startDiscovery = performance.now();
  for (const server of servers) {
    const schemas = await server.listTools();
    await storeSchemas(db, server.serverId, schemas);
  }
  const discoveryTime = performance.now() - startDiscovery;

  console.log(`✓ Discovery time: ${discoveryTime.toFixed(1)}ms`);
  assert(discoveryTime < 5000, "Discovery too slow"); // <5s

  // Test: Generate embeddings for all tools
  const embeddingModel = await loadEmbeddingModel();
  const startEmbeddings = performance.now();
  await generateEmbeddings(db, embeddingModel);
  const embeddingsTime = performance.now() - startEmbeddings;

  console.log(`✓ Embeddings time: ${(embeddingsTime / 1000).toFixed(1)}s`);
  assert(embeddingsTime < 120000, "Embeddings too slow"); // <2min

  // Test: Vector search performance
  const vectorSearch = new VectorSearch(db, embeddingModel);
  const latencies: number[] = [];

  for (let i = 0; i < 100; i++) {
    const start = performance.now();
    await vectorSearch.searchTools(`query ${i}`, 5);
    latencies.push(performance.now() - start);
  }

  latencies.sort((a, b) => a - b);
  const p95 = latencies[Math.floor(latencies.length * 0.95)];

  console.log(`✓ Vector search P95: ${p95.toFixed(1)}ms`);
  assert(p95 < 100, "Vector search P95 too high");
});
```

### CI Configuration Update
```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Deno
        uses: denoland/setup-deno@v1
        with:
          deno-version: v2.5.x

      - name: Check formatting
        run: deno fmt --check

      - name: Lint
        run: deno lint

      - name: Type check
        run: deno check src/**/*.ts

      - name: Unit tests
        run: deno test --allow-all tests/unit/

      - name: Integration tests
        run: deno test --allow-all tests/integration/

      - name: E2E tests
        run: deno test --allow-all tests/e2e/

      - name: Coverage
        run: |
          deno test --allow-all --coverage=cov_profile
          deno coverage cov_profile --lcov > coverage.lcov

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage.lcov

  benchmark:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Deno
        uses: denoland/setup-deno@v1

      - name: Run benchmarks
        run: deno bench --allow-all tests/benchmarks/

      - name: Check performance regression
        run: |
          deno run --allow-all tests/benchmarks/check-regression.ts
```

### Code Coverage Requirements
```typescript
// tests/coverage/coverage-check.ts
const MIN_COVERAGE = 80;

const coverageReport = await Deno.readTextFile("cov_profile/coverage.json");
const coverage = JSON.parse(coverageReport);

const totalLines = coverage.totals.lines.total;
const coveredLines = coverage.totals.lines.covered;
const coveragePct = (coveredLines / totalLines) * 100;

console.log(`Code coverage: ${coveragePct.toFixed(2)}%`);

if (coveragePct < MIN_COVERAGE) {
  console.error(`❌ Coverage ${coveragePct.toFixed(2)}% below ${MIN_COVERAGE}% threshold`);
  Deno.exit(1);
} else {
  console.log(`✓ Coverage target met`);
}
```

### Documentation Updates
```markdown
# README.md updates

## Installation

### Prerequisites
- Deno 2.5 or higher
- 15+ MCP servers configured (optional for full experience)

### Quick Start

1. **Install AgentCards**
   ```bash
   deno install --allow-all -n agentcards https://deno.land/x/agentcards/cli.ts
   ```

2. **Initialize configuration**
   ```bash
   agentcards init
   ```

3. **Start gateway**
   ```bash
   agentcards serve
   ```

4. **Update Claude Desktop config**
   ```json
   {
     "mcpServers": {
       "agentcards": {
         "command": "agentcards",
         "args": ["serve"]
       }
     }
   }
   ```

## Troubleshooting

### MCP Server Not Connecting
- Check server health: `agentcards status`
- Verify configuration: `~/.agentcards/config.yaml`
- Check logs: `~/.agentcards/logs/agentcards.log`

### Vector Search Slow
- Check database file permissions
- Verify HNSW index: `agentcards debug --check-index`
- Re-generate embeddings: `agentcards init --force-embeddings`

### Memory Issues
- Limit tool count: reduce `context.topK` in config
- Clear cache: `agentcards cache clear`
```

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] E2E test suite complete (9 test files)
- [ ] Mock MCP servers implemented
- [ ] Performance regression tests in CI
- [ ] Memory leak detection tests passing
- [ ] Load testing with 15 servers, 100 tools
- [ ] Code coverage >80%
- [ ] CI updated with all test stages
- [ ] README documentation complete
- [ ] Troubleshooting guide added
- [ ] All tests passing in CI
- [ ] Code reviewed and merged

---

## References

- [Deno Testing](https://deno.land/manual/testing)
- [Deno Benchmarking](https://deno.land/manual/tools/benchmarker)
- [Code Coverage Best Practices](https://martinfowler.com/bliki/TestCoverage.html)
- [E2E Testing Patterns](https://martinfowler.com/bliki/BroadStackTest.html)
