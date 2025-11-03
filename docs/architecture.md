# Decision Architecture - AgentCards

## Executive Summary

AgentCards est un MCP gateway intelligent qui optimise le contexte LLM (<5% vs 30-50%) et parallélise l'exécution des workflows (5x speedup) via vector search sémantique et DAG execution. L'architecture repose sur Deno 2+ pour la runtime, PGlite (PostgreSQL WASM) avec pgvector pour le vector search HNSW, et une implémentation custom du DAG executor. Le système est zero-config, portable (single-file database), et supporte 15+ MCP servers simultanément.

## Project Initialization

**First Story (1.1):** Initialize project using Deno's official tooling:

```bash
deno init agentcards
cd agentcards
```

**What This Provides:**
- `deno.json` - Configuration file with tasks, imports, and compiler options
- `main.ts` - Entry point template
- `main_test.ts` - Testing setup with Deno.test
- Standard Deno conventions: TypeScript by default, ES modules

**Deno Version:** 2.5 (latest) / 2.2 (LTS)

**Additional Setup Required:**
- CLI structure (commands: init, serve, status) via cliffy
- Project organization (src/, tests/, docs/)
- Dependencies centralization (deps.ts pattern)
- PGlite database initialization

---

## Decision Summary

| Category | Decision | Version | Affects Epics | Rationale |
| -------- | -------- | ------- | ------------- | --------- |
| Runtime | Deno | 2.5 / 2.2 LTS | Epic 1, Epic 2 | PROVIDED BY INIT - TypeScript native, secure by default, npm compat |
| Database | PGlite | 0.3.11 | Epic 1 | Embedded PostgreSQL WASM, portable single-file, 3MB footprint |
| Vector Search | pgvector (HNSW) | Built-in PGlite | Epic 1 | Production-ready ANN search, <100ms P95, supports cosine/L2/IP |
| Embeddings | @huggingface/transformers | 2.17.2 | Epic 1 | BGE-Large-EN-v1.5 local inference, Deno compatible, 1024-dim vectors |
| MCP Protocol | @modelcontextprotocol/sdk | latest | Epic 1, Epic 2 | Official TypeScript SDK, 10.5k stars, stdio + SSE transport |
| CLI Framework | cliffy | latest | Epic 1 | Type-safe args parsing, auto-help, shell completions, Deno-first |
| Configuration | std/yaml | Deno std | Epic 1 | Standard YAML parsing for config.yaml |
| Logging | std/log | Deno std | Epic 1 | Structured logging with levels (error/warn/info/debug) |
| DAG Execution | Custom (zero deps) | N/A | Epic 2 | Topological sort + Promise.all, no external dependency |
| Graph Algorithms | Graphology | latest | Epic 2 | True PageRank, Louvain, bidirectional search - "NetworkX of JavaScript" |
| SSE Streaming | Native ReadableStream | Deno built-in | Epic 2 | Server-Sent Events for progressive results |
| Process Management | Deno.Command | Deno built-in | Epic 1 | stdio subprocess for MCP server communication |
| Testing | Deno.test | Deno built-in | Epic 1, Epic 2 | Native testing + benchmarks, >80% coverage target |
| HTTP Server | Deno.serve | Deno 2+ built-in | Epic 2 | Modern HTTP server API for gateway (if needed) |

---

## Project Structure

```
agentcards/
├── deno.json                    # Deno config, tasks, imports
├── deps.ts                      # Centralized dependencies
├── mod.ts                       # Public API exports
├── main.ts                      # CLI entry point
│
├── src/
│   ├── cli/                     # CLI commands (Epic 1)
│   │   ├── commands/
│   │   │   ├── init.ts          # Story 1.7 - Migration tool
│   │   │   ├── serve.ts         # Story 2.4 - Gateway server
│   │   │   └── status.ts        # Story 2.5 - Health checks
│   │   └── main.ts              # cliffy CLI setup
│   │
│   ├── db/                      # Database layer (Epic 1)
│   │   ├── client.ts            # PGlite initialization
│   │   ├── migrations/          # SQL schema evolution
│   │   │   └── 001_initial.sql  # Story 1.2 - Initial schema
│   │   └── queries.ts           # Prepared queries
│   │
│   ├── vector/                  # Vector search (Epic 1)
│   │   ├── embeddings.ts        # Story 1.4 - BGE model inference
│   │   ├── search.ts            # Story 1.5 - Semantic search
│   │   └── index.ts             # HNSW index management
│   │
│   ├── mcp/                     # MCP protocol (Epic 1, 2)
│   │   ├── discovery.ts         # Story 1.3 - Server discovery
│   │   ├── client.ts            # MCP SDK wrapper
│   │   ├── gateway.ts           # Story 2.4 - Gateway server
│   │   └── types.ts             # MCP type definitions
│   │
│   ├── dag/                     # DAG execution (Epic 2)
│   │   ├── builder.ts           # Story 2.1 - Dependency graph
│   │   ├── executor.ts          # Story 2.2 - Parallel execution
│   │   └── types.ts             # DAG node/edge types
│   │
│   ├── streaming/               # SSE streaming (Epic 2)
│   │   ├── sse.ts               # Story 2.3 - Event stream
│   │   └── types.ts             # Event types
│   │
│   ├── config/                  # Configuration (Epic 1)
│   │   ├── loader.ts            # YAML config loading
│   │   ├── validator.ts         # Config schema validation
│   │   └── types.ts             # Config interfaces
│   │
│   ├── telemetry/               # Observability (Epic 1)
│   │   ├── logger.ts            # Story 1.8 - std/log wrapper
│   │   ├── metrics.ts           # Context/latency tracking
│   │   └── types.ts             # Metric definitions
│   │
│   └── utils/                   # Shared utilities
│       ├── errors.ts            # Story 2.6 - Custom error types
│       ├── retry.ts             # Retry logic with backoff
│       └── validation.ts        # Input validation helpers
│
├── tests/                       # Test suite
│   ├── unit/                    # Unit tests
│   ├── integration/             # Integration tests
│   ├── e2e/                     # Story 2.7 - E2E scenarios
│   ├── benchmarks/              # Performance tests
│   └── fixtures/                # Mock data, MCP servers
│
├── docs/                        # Documentation
│   ├── architecture.md          # This file
│   ├── PRD.md                   # Product requirements
│   ├── epics.md                 # Epic breakdown
│   └── api/                     # API documentation
│
└── .agentcards/                 # User data directory (created at runtime)
    ├── config.yaml              # User configuration
    ├── agentcards.db            # PGlite database file
    └── logs/                    # Application logs
        └── agentcards.log
```

---

## Epic to Architecture Mapping

| Epic | Module | Key Components | Stories |
|------|--------|----------------|---------|
| **Epic 1: Foundation & Context Optimization** | `src/db/`, `src/vector/`, `src/mcp/`, `src/cli/`, `src/telemetry/` | PGlite client, Vector search, Embeddings, MCP discovery, Migration tool | 1.1-1.8 |
| **Epic 2: DAG Execution & Production** | `src/dag/`, `src/streaming/`, `src/mcp/gateway.ts`, `tests/e2e/` | DAG builder, Parallel executor, SSE streaming, MCP gateway, Health checks | 2.1-2.7 |

**Boundaries:**
- **Epic 1** delivers: Standalone context optimization (vector search functional, <5% context)
- **Epic 2** builds on: Epic 1 complete, adds DAG parallelization + production hardening

---

## Technology Stack Details

### Core Technologies

**Runtime Environment:**
- Deno 2.5 (latest) or 2.2 (LTS)
- TypeScript 5.7+ (via Deno)
- ES2022 target

**Database & Vector Search:**
- PGlite 0.3.11 (PostgreSQL 17 WASM)
- pgvector extension (HNSW index)
- IndexedDB persistence (browser) / Filesystem (Deno)

**ML & Embeddings:**
- @huggingface/transformers 2.17.2
- BGE-Large-EN-v1.5 model (1024-dim embeddings)
- ONNX Runtime (WASM backend)

**MCP Integration:**
- @modelcontextprotocol/sdk (official)
- stdio transport (primary)
- SSE transport (optional)

### Integration Points

**External Systems:**
- **MCP Servers (15+):** stdio subprocess via `Deno.Command`
- **Claude Code:** Reads `~/.config/Claude/claude_desktop_config.json`
- **File System:** Config in `~/.agentcards/`, logs, database

**Internal Communication:**
- CLI → DB: PGlite SQL queries
- CLI → Vector: Semantic search API
- Gateway → MCP Servers: stdio protocol
- Executor → Tools: Async function calls
- Streaming → Client: SSE events

---

## Novel Pattern Designs

### Pattern 1: DAG Builder with JSON Schema Dependency Detection

**Problem:** Automatically detect dependencies between MCP tools to enable parallel execution without manual dependency specification.

**Challenge:** MCP tools expose input/output schemas as JSON Schema. Need to infer which outputs feed into which inputs semantically.

**Solution Architecture:**

**Components:**
1. **Schema Analyzer** (`dag/builder.ts`)
   - Parses JSON Schema for each tool
   - Extracts parameter names and types
   - Identifies required vs optional parameters

2. **Dependency Detector**
   - Matches output property names to input parameter names (string matching)
   - Type compatibility check (string → string, object → object, etc.)
   - Builds directed edge if `tool_A.output.property` matches `tool_B.input.param`

3. **DAG Constructor**
   - Nodes: Tool invocations with inputs
   - Edges: Data flow dependencies
   - Cycle detection (invalid DAG → error)
   - Topological sort for execution order

**Data Flow:**
```typescript
// Example: 3 tools workflow
Tool A (filesystem:read) → output: { content: string }
Tool B (json:parse)      → input: { jsonString: string }, output: { parsed: object }
Tool C (github:create)   → input: { data: object }

// Detected dependencies:
A.output.content → B.input.jsonString  (string → string match)
B.output.parsed  → C.input.data        (object → object match)

// DAG:
A → B → C (sequential execution required)
```

**Implementation Guide for Agents:**

```typescript
interface DAGNode {
  toolId: string;
  inputs: Record<string, unknown>;
  dependencies: string[]; // Tool IDs this node depends on
}

interface DAGEdge {
  from: string;  // Source tool ID
  to: string;    // Target tool ID
  dataPath: string; // e.g., "output.content → input.jsonString"
}

// Story 2.1 AC: Custom topological sort (no external deps)
function buildDAG(tools: Tool[]): { nodes: DAGNode[], edges: DAGEdge[] } {
  // 1. Analyze schemas
  // 2. Detect dependencies via name/type matching
  // 3. Construct graph
  // 4. Validate (no cycles)
  // 5. Topological sort
}
```

**Edge Cases:**
- No dependencies → All tools run in parallel
- Partial dependencies → Mixed parallel/sequential
- Circular dependencies → Reject workflow, return error
- Ambiguous matches → Conservative (assume dependency)

**Affects Epics:** Epic 2 (Story 2.1, 2.2)

---

### Pattern 2: Context Budget Management

**Problem:** Maintain <5% context consumption while supporting 15+ MCP servers dynamically.

**Solution:**

**Context Budget Tracker:**
```typescript
interface ContextBudget {
  totalTokens: number;      // LLM context window (e.g., 200k)
  budgetTokens: number;     // Allocated for tool schemas (5% = 10k)
  usedTokens: number;       // Currently loaded schemas
  availableTokens: number;  // Remaining budget
}

// Dynamic loading strategy
function loadTools(query: string, budget: ContextBudget): Tool[] {
  const candidates = vectorSearch(query, topK = 20);

  const selected: Tool[] = [];
  let tokens = 0;

  for (const tool of candidates) {
    const toolTokens = estimateTokens(tool.schema);
    if (tokens + toolTokens <= budget.availableTokens) {
      selected.push(tool);
      tokens += toolTokens;
    } else {
      break; // Budget exhausted
    }
  }

  return selected;
}
```

**Affects Epics:** Epic 1 (Story 1.6)

---

### Pattern 3: Speculative Execution with GraphRAG (THE Feature)

**Problem:** Reduce latency by executing workflows optimistically before Claude responds, when confidence is high enough.

**Vision:** The gateway should perform actions BEFORE Claude's call, not just suggest them. Have results ready immediately when user confirms.

**Solution Architecture:**

**Components:**

1. **GraphRAG Engine** (`dag/builder.ts`)
   - Uses Graphology for true graph algorithms (not pseudo-SQL)
   - PageRank for tool importance ranking
   - Louvain community detection for related tools
   - Bidirectional shortest path for dependency chains
   - Hybrid: PGlite stores edges, Graphology computes metrics

2. **Three Execution Modes**
   - `explicit_required` (confidence < 0.70): No pattern found, Claude must provide explicit workflow
   - `suggestion` (0.70-0.85): Good pattern found, suggest DAG to Claude
   - `speculative_execution` (>0.85): High confidence, execute immediately and have results ready

3. **Adaptive Threshold Learning**
   - Start conservative (0.92 threshold)
   - Track success rates over 50-100 executions
   - Adjust thresholds based on user acceptance patterns
   - Target: >95% success rate, <10% waste

4. **Safety Checks**
   - Never speculate on dangerous operations (delete, deploy, payment, send_email)
   - Cost/resource limits (<$0.10 estimated cost, <5s execution time)
   - Graceful fallback to suggestion mode on failure

**Data Flow:**

```typescript
// User Intent → Gateway Handler
const intent = {
  naturalLanguageQuery: "Read all JSON files and create a summary report"
};

// Step 1: Vector search + GraphRAG suggestion
const suggestion = await suggester.suggestDAG(intent);
// { confidence: 0.92, dagStructure: {...}, explanation: "..." }

// Step 2: Mode determination
if (suggestion.confidence >= 0.85 && !isDangerous(suggestion.dagStructure)) {
  // 🚀 SPECULATIVE: Execute optimistically
  const results = await executor.execute(suggestion.dagStructure);

  return {
    mode: "speculative_execution",
    results: results,  // Already executed!
    confidence: 0.92,
    note: "✨ Results prepared speculatively - ready immediately"
  };
}

// Step 3: Claude sees completed results in <300ms (vs 2-5s sequential execution)
```

**Graphology Integration:**

```typescript
import Graph from "npm:graphology";
import { pagerank } from "npm:graphology-metrics/centrality/pagerank";
import { louvain } from "npm:graphology-communities-louvain";
import { bidirectional } from "npm:graphology-shortest-path/bidirectional";

export class GraphRAGEngine {
  private graph: Graph;
  private pageRanks: Record<string, number> = {};

  async syncFromDatabase(): Promise<void> {
    // Load tool nodes and dependency edges from PGlite
    // Compute PageRank, communities
    this.pageRanks = pagerank(this.graph, { weighted: true });
  }

  findDependencyPath(from: string, to: string): string[] | null {
    return bidirectional(this.graph, from, to);
  }

  suggestWorkflow(intent: WorkflowIntent): SuggestedDAG {
    // Use vector search + graph metrics to suggest optimal DAG
    // PageRank = tool importance
    // Communities = related tools cluster
    // Paths = dependency chains
  }
}
```

**Performance Targets:**

- Graph sync from DB: <50ms
- PageRank computation: <100ms
- Shortest path query: <1ms
- Total suggestion time: <200ms
- Speculative execution: <300ms (4-5x faster than sequential)

**Database Schema:**

```sql
-- Simple storage, Graphology does the computation
CREATE TABLE tool_dependency (
  from_tool_id TEXT,
  to_tool_id TEXT,
  observed_count INTEGER,
  confidence_score REAL,
  PRIMARY KEY (from_tool_id, to_tool_id)
);

-- 90% simpler than recursive CTEs approach
-- Let Graphology handle PageRank, Louvain, paths
```

**Explainability:**

When Claude asks "why this DAG?", extract dependency paths:

```typescript
const explanation = {
  directDependencies: ["filesystem:read → json:parse"],
  transitiveDependencies: [
    "filesystem:read → json:parse → github:create (2 hops)"
  ],
  pageRankScores: {
    "filesystem:read": 0.15,
    "json:parse": 0.12
  }
};
```

**Edge Cases:**

- Dangerous operations → Always fall back to suggestion mode with warning
- Low confidence (0.70-0.85) → Suggestion mode, let Claude decide
- Very low confidence (<0.70) → Explicit workflow required
- Speculative execution fails → Return error, fall back to suggestion

**Key Benefits:**

- **Latency:** 0ms perceived wait (results ready when user confirms)
- **Context savings:** Still applies ($5-10/day >> $0.50 waste)
- **User experience:** Feels instantaneous vs 2-5s sequential execution
- **Safety:** Multiple guardrails prevent dangerous speculation

**Affects Epics:** Epic 2 (Story 2.1 - GraphRAG + Speculative Execution)

**Design Philosophy:** Speculative execution is THE feature - the core differentiator. Not optional, not opt-in. Default mode with smart safeguards.

---

## Implementation Patterns

### Naming Conventions

**Files & Directories:**
- Files: `kebab-case.ts` (e.g., `vector-search.ts`)
- Directories: `kebab-case/` (e.g., `mcp/`, `dag/`)
- Test files: `*.test.ts` (co-located with source)
- Benchmark files: `*.bench.ts`

**Code Identifiers:**
- Classes: `PascalCase` (e.g., `VectorSearchEngine`)
- Interfaces/Types: `PascalCase` with `I` prefix for interfaces (e.g., `IConfig`, `ToolSchema`)
- Functions: `camelCase` (e.g., `buildDependencyGraph`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRIES`)
- Private fields: `_camelCase` with underscore prefix

**Database:**
- Tables: `snake_case` singular (e.g., `tool_schema`, `embedding`)
- Columns: `snake_case` (e.g., `tool_id`, `created_at`)
- Indexes: `idx_{table}_{column}` (e.g., `idx_embedding_vector`)

### Code Organization

**Dependency Pattern:**
```typescript
// deps.ts - ALL external dependencies centralized
export { PGlite } from "npm:@electric-sql/pglite@0.3.11";
export { vector } from "npm:@electric-sql/pglite@0.3.11/vector";
export { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.4/command/mod.ts";
export * as log from "https://deno.land/std@0.224.0/log/mod.ts";
// ... all deps here

// Usage in modules
import { PGlite, vector } from "../../deps.ts";
```

**Module Exports:**
```typescript
// mod.ts - Public API (re-exports)
export { VectorSearch } from "./src/vector/search.ts";
export { MCPGateway } from "./src/mcp/gateway.ts";
export type { Config, ToolSchema } from "./src/types.ts";
```

**Test Organization:**
- Unit tests: Co-located with source (`src/vector/search.test.ts`)
- Integration: `tests/integration/vector-db.test.ts`
- E2E: `tests/e2e/migration-workflow.test.ts`

### Error Handling

**Custom Error Hierarchy:**
```typescript
// src/utils/errors.ts
export class AgentCardsError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "AgentCardsError";
  }
}

export class MCPServerError extends AgentCardsError {
  constructor(message: string, public serverId: string) {
    super(message, "MCP_SERVER_ERROR");
  }
}

export class VectorSearchError extends AgentCardsError {
  constructor(message: string) {
    super(message, "VECTOR_SEARCH_ERROR");
  }
}

export class DAGExecutionError extends AgentCardsError {
  constructor(message: string, public toolId?: string) {
    super(message, "DAG_EXECUTION_ERROR");
  }
}
```

**Error Handling Pattern:**
```typescript
// All async operations wrapped in try-catch
async function executeWorkflow(tools: Tool[]): Promise<Result> {
  try {
    const dag = buildDAG(tools);
    const results = await executeDag(dag);
    return { success: true, data: results };
  } catch (error) {
    if (error instanceof DAGExecutionError) {
      logger.error(`DAG execution failed: ${error.message}`, { toolId: error.toolId });
      return { success: false, error: error.message, code: error.code };
    }
    throw error; // Re-throw unknown errors
  }
}

// Timeouts enforced (Story 2.6 AC)
const DEFAULT_TIMEOUT = 30_000; // 30s per tool
```

### Logging Strategy

**Log Levels:**
```typescript
// src/telemetry/logger.ts
import * as log from "std/log";

export const logger = log.getLogger();

// Usage:
logger.error("Critical failure", { context: {...} });
logger.warn("Degraded performance detected");
logger.info("Workflow completed", { duration: 4200 });
logger.debug("Vector search query", { query, results });
```

**Structured Format:**
```json
{
  "timestamp": "2025-11-03T10:30:45.123Z",
  "level": "INFO",
  "message": "Workflow completed",
  "context": {
    "duration_ms": 4200,
    "tools_executed": 5,
    "parallel_branches": 2
  }
}
```

**Log Destinations:**
- Console: INFO level (colorized for terminal)
- File: `~/.agentcards/logs/agentcards.log` (all levels, rotated daily)

---

## Consistency Rules

### Cross-Cutting Patterns

**Date/Time Handling:**
- All timestamps: ISO 8601 format (`2025-11-03T10:30:45.123Z`)
- Library: Native `Date` object, no moment.js
- Storage: PostgreSQL `TIMESTAMPTZ` type

**Async Patterns:**
- All I/O operations: `async/await` (no callbacks)
- Parallel operations: `Promise.all()` for independent tasks
- Sequential: `for...of` with `await` for dependent tasks

**Configuration Access:**
```typescript
// Single source of truth
const config = await loadConfig("~/.agentcards/config.yaml");
// Pass explicitly, no global state
```

**Retries:**
```typescript
// src/utils/retry.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  // Exponential backoff: 1s, 2s, 4s
}
```

---

## Data Architecture

### Database Schema (PGlite)

```sql
-- Story 1.2: Initial schema

CREATE TABLE tool_schema (
  tool_id TEXT PRIMARY KEY,
  server_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  input_schema JSONB NOT NULL,
  output_schema JSONB,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tool_embedding (
  tool_id TEXT PRIMARY KEY REFERENCES tool_schema(tool_id) ON DELETE CASCADE,
  embedding vector(1024) NOT NULL,  -- BGE-Large-EN-v1.5 dimensions
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW index for vector similarity search
CREATE INDEX idx_embedding_vector ON tool_embedding
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE TABLE config_metadata (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE telemetry_metrics (
  id SERIAL PRIMARY KEY,
  metric_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  tags JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_metrics_timestamp ON telemetry_metrics(timestamp DESC);
CREATE INDEX idx_metrics_name ON telemetry_metrics(metric_name);
```

### Data Models

```typescript
// src/types.ts

export interface ToolSchema {
  toolId: string;
  serverId: string;
  name: string;
  description: string;
  inputSchema: JSONSchema;
  outputSchema?: JSONSchema;
  cachedAt: Date;
}

export interface ToolEmbedding {
  toolId: string;
  embedding: Float32Array;  // 1024-dim vector
  createdAt: Date;
}

export interface SearchResult {
  toolId: string;
  score: number;  // Cosine similarity [0-1]
  schema: ToolSchema;
}
```

---

## API Contracts

### CLI Commands

```bash
# Story 1.7: Migration tool
agentcards init [--dry-run] [--config <path>]
# Output: Migration summary, instructions

# Story 2.4: Gateway server
agentcards serve [--port <port>] [--stdio]
# Runs MCP gateway server

# Story 2.5: Health checks
agentcards status [--verbose]
# Output: Server health, database size, metrics
```

### Internal APIs

**Vector Search API:**
```typescript
// src/vector/search.ts
export interface VectorSearchAPI {
  search(query: string, topK: number): Promise<SearchResult[]>;
  indexTool(toolId: string, schema: ToolSchema): Promise<void>;
  getEmbedding(text: string): Promise<Float32Array>;
}
```

**DAG Executor API:**
```typescript
// src/dag/executor.ts
export interface DAGExecutorAPI {
  execute(dag: DAG): AsyncGenerator<ExecutionEvent>;
  // Yields events: task_start, task_complete, error
}
```

**MCP Gateway Protocol:**
- Implements MCP specification 2025-06-18
- stdio transport (stdin/stdout)
- Methods: `list_tools`, `call_tool`, `list_resources`

---

## Security Architecture

**Sandboxing:**
- Deno permissions model: Explicit `--allow-read`, `--allow-net`, etc.
- MCP servers run as separate processes (isolated)
- No eval/Function constructor usage

**Data Protection:**
- User queries: Never leave local machine
- Telemetry: Opt-in, anonymized (no PII)
- Database: Local filesystem (`~/.agentcards/agentcards.db`)

**Input Validation:**
- All CLI args validated via cliffy schemas
- MCP responses validated against JSON Schema
- SQL injection: Prevented via parameterized queries (PGlite)

---

## Performance Considerations

### Targets (from NFR001)

- **P95 Latency:** <3 seconds for 5-tool workflow
- **Vector Search:** <100ms P95 (Story 1.5 AC)
- **Context Usage:** <5% of LLM window (Story 1.6 AC)

### Optimization Strategies

**1. Vector Search:**
- HNSW index parameters: `m=16`, `ef_construction=64` (balanced quality/speed)
- Query batch size: 5-10 tools (trade-off recall/latency)

**2. Embeddings Generation:**
- Batch processing: Generate embeddings in parallel (Story 1.4)
- Caching: Never regenerate if schema unchanged
- Model loading: Lazy load BGE model on first query

**3. DAG Execution:**
- Parallel branches: `Promise.all()` for independent tools
- Streaming: SSE events (Story 2.3) for progressive feedback
- Timeouts: 30s per tool, fail fast

**4. Database:**
- PGlite: In-memory mode for CI/tests
- Filesystem persistence: `~/.agentcards/` for production
- Index maintenance: Auto-vacuum disabled (read-heavy)

---

## Deployment Architecture

**Target:** Local-first CLI tool (no server deployment MVP)

**Supported Platforms:**
- macOS (x64, ARM64)
- Linux (x64, ARM64)
- Windows (x64) - via WSL or native Deno

**Distribution:**
```bash
# Installation (future)
deno install -A -n agentcards jsr:@agentcards/cli

# Or via Homebrew (future)
brew install agentcards
```

**Runtime Requirements:**
- Deno 2.2+ (LTS)
- 4GB RAM minimum (BGE model + HNSW index)
- 1GB disk space (database + logs + models)

**Edge Deployment (out of scope MVP):**
- Deno Deploy compatible (architecture edge-ready)
- Future: v1.1+ if demand

---

## Development Environment

### Prerequisites

- Deno 2.2+ ([deno.com](https://deno.com))
- Git 2.30+
- VS Code (recommended) with Deno extension

### Setup Commands

```bash
# Clone repository
git clone https://github.com/username/agentcards.git
cd agentcards

# Initialize Deno project (Story 1.1)
deno task init

# Install dependencies (auto via deno.json imports)

# Run tests
deno task test

# Run benchmarks
deno task bench

# Format code
deno task fmt

# Lint code
deno task lint

# Build (compile to binary)
deno task build

# Run locally
deno task dev -- serve
```

### deno.json Tasks

```json
{
  "tasks": {
    "dev": "deno run -A main.ts",
    "test": "deno test -A",
    "bench": "deno bench -A",
    "fmt": "deno fmt",
    "lint": "deno lint",
    "build": "deno compile -A -o dist/agentcards main.ts"
  }
}
```

---

## Architecture Decision Records (ADRs)

### ADR-001: PGlite over SQLite for Vector Search

**Decision:** Use PGlite (PostgreSQL WASM) with pgvector instead of SQLite + sqlite-vec

**Rationale:**
- sqlite-vec v0.1.0 lacks HNSW index (full-scan only)
- pgvector provides production-ready HNSW + IVFFlat
- PGlite is embedded (3MB WASM), preserves portability requirement
- Deno compatibility verified (npm:@electric-sql/pglite)
- Trade-off: 3MB overhead vs <1MB SQLite, acceptable for performance gain

**Consequences:**
- Enables <100ms P95 vector search (NFR001)
- Single-file portability maintained
- PostgreSQL ecosystem access (future extensions)

**Alternatives Considered:**
- sqlite-vec: Rejected (no HNSW, future-only)
- DuckDB VSS: Rejected (experimental persistence, Deno support unclear)
- Full PostgreSQL: Rejected (breaks zero-config requirement)

---

### ADR-002: Custom DAG Implementation (Zero External Dependencies)

**Decision:** Implement DAG builder and executor from scratch, no external graph libraries

**Rationale:**
- Story 2.1 AC explicitly requires "custom, zero external dependency"
- Topological sort is ~50 LOC (simple algorithm)
- Avoids dependency bloat for single-purpose feature
- Educational value for agents implementing this

**Consequences:**
- Full control over algorithm
- No security vulnerabilities from external deps
- More testing required (edge cases, cycles)

---

### ADR-003: BGE-Large-EN-v1.5 for Local Embeddings

**Decision:** Use BGE-Large-EN-v1.5 via @huggingface/transformers (local inference)

**Rationale:**
- 1024-dim embeddings (good quality/size trade-off)
- Local inference = no API calls, no API keys, privacy preserved
- Deno compatible via npm: prefix
- SOTA open model for semantic search

**Consequences:**
- 4GB RAM requirement (model in memory)
- ~60s initial embedding generation for 200 tools (acceptable per Story 1.4 AC)
- No usage costs (vs OpenAI embeddings API)

---

### ADR-004: stdio Transport Primary, SSE Optional

**Decision:** MCP gateway uses stdio transport as primary, SSE as optional enhancement

**Rationale:**
- MCP servers commonly use stdio (Claude Code default)
- SSE adds complexity (HTTP server required)
- Story 2.4 AC: "stdio mode primary"
- Local CLI tool doesn't need HTTP transport MVP

**Consequences:**
- Simpler architecture (no HTTP server MVP)
- SSE available for future remote deployment
- Gateway compatible with all stdio MCP servers

---

### ADR-005: Graphology for GraphRAG (True Graph Algorithms)

**Decision:** Use Graphology library for graph algorithms instead of pseudo-GraphRAG with recursive CTEs in PostgreSQL

**Context:** User insight: "et networkx ou un truc comme ca?" (what about networkx or something like that?)

**Rationale:**
- Graphology is the "NetworkX of JavaScript" (~100KB)
- True graph algorithms: Real PageRank, Louvain community detection, bidirectional search
- 90% simpler SQL schema (just storage, no recursive CTEs)
- 3-5x performance improvement vs pseudo-SQL approach
- Hybrid architecture: PGlite stores data, Graphology computes metrics
- Better separation of concerns: Storage vs computation

**Consequences:**
- Enables true GraphRAG capabilities for workflow suggestion
- Simplifies database schema dramatically
- Fast graph operations (<100ms PageRank, <1ms shortest path)
- Foundation for speculative execution (THE feature)
- Small dependency footprint (~100KB vs implementing algorithms in SQL)

**Alternatives Considered:**
- Recursive CTEs + pseudo-PageRank: Rejected (90% more complex SQL, 3-5x slower)
- NetworkX (Python): Rejected (language barrier, would need Python runtime)
- Full graph database (Neo4j): Rejected (breaks portability requirement)

**User Confirmation:** "Ouai cest mieux je pense non?" (Yes it's better right?)

---

### ADR-006: Speculative Execution as Default Mode

**Decision:** Make speculative execution the default mode for high-confidence workflows (>0.85), not an optional feature

**Context:** User insight: "et donc les algo graph aident la gateway a performer l action avant meme l appel de claude non ? cetait l idee" (so the graph algorithms help the gateway perform the action even before Claude's call, right? That was the idea)

**Rationale:**
- **THE feature** - core differentiator of AgentCards
- 0ms perceived latency (results ready when user confirms)
- Even with Claude confirmation dialogs, provides instant results vs 2-5s wait
- Context savings ($5-10/day) >> waste from occasional misspeculation ($0.50)
- GraphRAG provides confidence scores for safe speculation
- Multiple safety guardrails prevent dangerous operations

**Consequences:**
- Dramatic improvement in perceived performance
- Requires adaptive threshold learning (start conservative at 0.92)
- Need comprehensive safety checks for dangerous operations
- Metrics tracking for success/acceptance/waste rates
- Graceful fallback to suggestion mode on failure

**Safety Measures:**
- Never speculate on: delete, deploy, payment, send_email operations
- Cost limits: <$0.10 per speculative execution
- Resource limits: <5s execution time
- Confidence threshold: >0.85 minimum (adaptive learning from user feedback)

**User Confirmation:** "Ouai on peut essayer sans speculative mais on va pas se mentir, speculative c est THE feature" (Yeah we can try without speculative but let's be honest, speculative IS THE feature)

**Design Philosophy:** Optimistic execution with smart safeguards > Conservative suggestion-only mode

---

_Generated by BMAD Decision Architecture Workflow v1.3.2_
_Date: 2025-11-03_
_Updated: 2025-11-03 (Added ADR-005, ADR-006 for Graphology & Speculative Execution)_
_For: BMad_
