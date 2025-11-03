# AgentCards - Epic Breakdown

**Author:** BMad
**Date:** 2025-11-03
**Project Level:** 2
**Target Scale:** 2 epics, 13-15 stories total

---

## Overview

Ce document fournit le breakdown détaillé des epics pour AgentCards, complétant la [PRD](./PRD.md) stratégique.

Chaque epic inclut:
- Expanded goal et value proposition
- Complete story breakdown avec user stories
- Acceptance criteria pour chaque story
- Story sequencing et dependencies

**Epic Sequencing Principles:**
- Epic 1 établit l'infrastructure fondamentale et context optimization
- Epic 2 ajoute la parallélisation et production readiness
- Stories dans epics sont vertically sliced et sequentially ordered
- No forward dependencies - chaque story build uniquement sur previous work

---

## Epic 1: Project Foundation & Context Optimization Engine

**Expanded Goal (2-3 sentences):**

Établir l'infrastructure projet Deno avec CI/CD, implémenter le système de vector search sémantique via PGlite + pgvector, et créer le moteur de context optimization qui réduit la consommation de contexte de 30-50% à <5%. Ce premier epic livre un système fonctionnel permettant le chargement on-demand des tool schemas MCP, validant la proposition de valeur principale d'AgentCards et établissant les foundations pour la parallélisation (Epic 2).

**Value Delivery:**

À la fin de cet epic, un développeur peut installer AgentCards, migrer sa configuration MCP, et observer immédiatement une réduction du contexte à <5%, récupérant 90% de sa fenêtre conversationnelle pour usage utile.

---

### Story Breakdown - Epic 1

**Story 1.1: Project Setup & Repository Structure**

As a developer,
I want a clean Deno project structure with CI/CD configured,
So that I can start development with proper tooling and automation in place.

**Acceptance Criteria:**
1. Repository initialisé avec structure Deno standard (src/, tests/, docs/)
2. GitHub Actions CI configuré (lint, typecheck, tests)
3. deno.json configuré avec tasks scripts (test, lint, fmt, dev)
4. README.md avec badges CI et quick start guide
5. .gitignore approprié pour Deno projects
6. License MIT et CODE_OF_CONDUCT.md

**Prerequisites:** None

---

**Story 1.2: PGlite Database Foundation with pgvector**

As a developer,
I want a PGlite database with pgvector extension configured,
So that I can store embeddings vectoriels et perform semantic search efficiently.

**Acceptance Criteria:**
1. PGlite database initialization dans `~/.agentcards/.agentcards.db`
2. pgvector extension loaded et operational
3. Database schema créé avec tables:
   - `tool_embedding` (tool_id, embedding vector(1024), metadata)
   - `tool_schema` (tool_id, schema_json, server_id, cached_at)
   - `config` (key, value pour metadata)
4. Vector index HNSW créé sur tool_embedding.embedding avec pgvector
5. Basic CRUD operations testés (insert, query, update, delete)
6. Database migration system en place pour schema evolution future

**Prerequisites:** Story 1.1 (project setup)

---

**Story 1.3: MCP Server Discovery & Schema Extraction**

As a power user with 15+ MCP servers,
I want AgentCards to automatically discover my MCP servers and extract their tool schemas,
So that I don't have to manually configure each server.

**Acceptance Criteria:**
1. MCP server discovery via stdio et SSE protocols
2. Connection établie avec chaque discovered server
3. Tool schemas extracted via MCP protocol `list_tools` call
4. Schemas parsed et validated (input/output schemas, descriptions)
5. Schemas stockés dans PGlite `tool_schema` table
6. Error handling pour servers unreachable ou invalid schemas
7. Console output affiche nombre de servers discovered et tools extracted
8. Support au minimum 15 MCP servers simultanément

**Prerequisites:** Story 1.2 (database foundation)

---

**Story 1.4: Embeddings Generation with BGE-Large-EN-v1.5**

As a developer,
I want tool schemas to be converted into vector embeddings using BGE-Large-EN-v1.5 locally,
So that I can perform semantic search without relying on external APIs.

**Acceptance Criteria:**
1. BGE-Large-EN-v1.5 model downloaded et loaded (via @xenova/transformers)
2. Tool schemas (name + description + parameters) concatenés en text input
3. Embeddings (1024-dim) générés pour chaque tool
4. Embeddings stockés dans `tool_embeddings` table avec metadata
5. Progress bar affichée durant génération (peut prendre ~60s pour 100+ tools)
6. Embeddings cachés (pas de régénération si schema unchanged)
7. Total generation time <2 minutes pour 200 tools

**Prerequisites:** Story 1.3 (schema extraction)

---

**Story 1.5: Semantic Vector Search Implementation**

As a developer,
I want to search for relevant tools using natural language queries,
So that I can find the right tools without knowing their exact names.

**Acceptance Criteria:**
1. Query embedding génération (même modèle BGE-Large-EN-v1.5)
2. Cosine similarity search sur vector index (<100ms query time P95)
3. API: `searchTools(query: string, topK: number)` → tool_ids + scores
4. Top-k results returned sorted par relevance score (default k=5)
5. Configurable similarity threshold (default 0.7)
6. Unit tests validant accuracy avec sample queries
7. Benchmark test confirmant P95 <100ms pour 1000+ vectors

**Prerequisites:** Story 1.4 (embeddings generation)

---

**Story 1.6: On-Demand Schema Loading & Context Optimization**

As a Claude Code user,
I want AgentCards to load only relevant tool schemas based on my query,
So that my context window is not saturated by unused tool schemas.

**Acceptance Criteria:**
1. Integration semantic search avec schema loading
2. Workflow: query → vector search → retrieve top-k tools → load schemas
3. Schemas retournés uniquement pour matched tools (pas all-at-once)
4. Context usage measurement et logging (<5% target)
5. Comparison metric affiché: before (30-50%) vs after (<5%)
6. Cache hit pour frequently used tools (évite reloading)
7. Performance: Total query-to-schema latency <200ms P95

**Prerequisites:** Story 1.5 (vector search)

---

**Story 1.7: Migration Tool (`agentcards init`)**

As a power user with existing MCP configuration,
I want to migrate my mcp.json configuration to AgentCards automatically,
So that I don't have to manually reconfigure everything.

**Acceptance Criteria:**
1. CLI command `agentcards init` implemented
2. Detection automatique du claude_desktop_config.json path (OS-specific)
3. Parsing du mcp.json existant et extraction des MCP servers
4. Generation de `~/.agentcards/config.yaml` avec servers migrés
5. Embeddings generation triggered automatiquement post-migration
6. Console output avec instructions pour éditer mcp.json
7. Template affiché pour nouvelle config mcp.json (juste agentcards gateway)
8. Rollback capability si erreur durant migration
9. Dry-run mode (`--dry-run`) pour preview changes

**Prerequisites:** Story 1.6 (context optimization functional)

---

**Story 1.8: Basic Logging & Telemetry Backend**

As a developer,
I want structured logging et métriques telemetry opt-in,
So that I can debug issues et measure success metrics (context usage, latency).

**Acceptance Criteria:**
1. Structured logging avec std/log (Deno standard library)
2. Log levels: error, warn, info, debug
3. Log output: console + file (`~/.agentcards/logs/agentcards.log`)
4. Telemetry table dans PGlite: `metrics` (timestamp, metric_name, value)
5. Metrics tracked: context_usage_pct, query_latency_ms, tools_loaded_count
6. Opt-in consent prompt au premier launch (telemetry disabled by default)
7. CLI flag `--telemetry` pour enable/disable
8. Privacy: aucune data sensitive (queries, schemas) ne quitte local machine

**Prerequisites:** Story 1.7 (migration tool ready)

---

## Epic 2: DAG Execution & Production Readiness

**Expanded Goal (2-3 sentences):**

Implémenter le système de DAG execution pour parallélisation intelligente des workflows multi-tools, intégrer AgentCards comme MCP gateway avec Claude Code, et hardening production avec health checks, error handling robuste, et tests end-to-end. Ce second epic livre un système production-ready capable de réduire la latence des workflows de 5x à 1x via parallélisation, complétant ainsi la double value proposition d'AgentCards (context + speed).

**Value Delivery:**

À la fin de cet epic, un développeur peut exécuter des workflows cross-MCP complexes avec parallélisation automatique, observant des gains de performance 3-5x sur workflows typiques, le tout via une gateway stable et fiable intégrée à Claude Code.

---

### Story Breakdown - Epic 2

**Story 2.1: Dependency Graph Construction (DAG Builder)**

As a developer,
I want AgentCards to automatically construct a dependency graph from tool input/output schemas,
So that independent tools can be identified for parallel execution.

**Acceptance Criteria:**
1. DAG builder module créé (`src/dag/builder.ts`)
2. Parsing des tool input/output schemas (JSON Schema format)
3. Dependency detection: tool B depends on tool A si output_A matches input_B
4. DAG representation: nodes (tools) + edges (dependencies)
5. Topological sort implementation (custom, zero external dependency)
6. Detection de cycles (DAG invalide) avec error reporting
7. Unit tests avec sample workflows (sequential, parallel, mixed)
8. API: `buildDAG(tools: Tool[])` → DAG graph object

**Prerequisites:** Epic 1 complété (context optimization functional)

---

**Story 2.2: Parallel Execution Engine**

As a power user,
I want workflows avec independent tools to execute in parallel,
So that I save time instead of waiting for sequential execution.

**Acceptance Criteria:**
1. Parallel executor module créé (`src/dag/executor.ts`)
2. DAG traversal avec identification des nodes exécutables en parallèle
3. Promise.all utilisé pour parallel execution de independent branches
4. Sequential execution pour dependent tools (respect topological order)
5. Partial success handling: continue execution même si un tool fail
6. Results aggregation: successes + errors retournés avec codes
7. Performance measurement: latency avant/après parallélisation
8. Target: P95 latency <3 secondes pour workflow 5-tools
9. Benchmarks tests validant 3-5x speedup sur workflows parallélisables

**Prerequisites:** Story 2.1 (DAG builder)

---

**Story 2.3: SSE Streaming pour Progressive Results**

As a user waiting for workflow results,
I want to see results streamed progressively as they complete,
So that I get feedback immediately instead of waiting for all tools to finish.

**Acceptance Criteria:**
1. SSE (Server-Sent Events) implementation pour streaming
2. Event types définis: `task_start`, `task_complete`, `execution_complete`, `error`
3. Results streamés dès disponibilité (pas de wait-all-then-return)
4. Event payload: tool_id, status, result, timestamp
5. Client-side handling simulé dans tests
6. Graceful degradation si SSE unavailable (fallback to batch response)
7. Max event buffer size pour éviter memory leaks

**Prerequisites:** Story 2.2 (parallel executor)

---

**Story 2.4: MCP Gateway Integration avec Claude Code**

As a Claude Code user,
I want AgentCards to act as a transparent MCP gateway,
So that Claude can interact with all my MCP servers via a single entry point.

**Acceptance Criteria:**
1. MCP protocol server implementation (stdio mode primary)
2. AgentCards expose MCP server interface compatible avec Claude Code
3. Requests de Claude interceptés par gateway
4. Vector search → load schemas → execute tools → return results
5. Transparent proxying: Claude voit AgentCards comme un seul MCP server
6. Support `list_tools`, `call_tool`, `get_prompt` methods (MCP spec)
7. Error handling: MCP-compliant error responses
8. Integration test avec mock Claude client

**Prerequisites:** Story 2.3 (SSE streaming ready)

---

**Story 2.5: Health Checks & MCP Server Monitoring**

As a developer,
I want AgentCards to monitor MCP server health et report issues,
So that I know which servers are down or misconfigured.

**Acceptance Criteria:**
1. Health check implementation au startup (ping chaque MCP server)
2. Periodic health checks (every 5 minutes) durant runtime
3. Health status tracking: healthy, degraded, down
4. Console warnings pour servers unavailable
5. Automatic retry logic (3 attempts) avant marking server down
6. Health status API: `agentcards status` CLI command
7. Logs structured avec server_id, status, last_check timestamp

**Prerequisites:** Story 2.4 (gateway integration)

---

**Story 2.6: Error Handling & Resilience**

As a developer,
I want robust error handling throughout AgentCards,
So that the system degrades gracefully instead of crashing.

**Acceptance Criteria:**
1. Try-catch wrappers autour de all async operations
2. Error types définis: MCPServerError, VectorSearchError, DAGExecutionError
3. User-friendly error messages avec suggestions de resolution
4. Rollback capability pour failed migrations
5. Partial workflow success (return succès même si some tools fail)
6. Timeout handling (default 30s per tool execution)
7. Rate limiting pour prevent MCP server overload
8. Error logs persistés pour post-mortem analysis

**Prerequisites:** Story 2.5 (health checks)

---

**Story 2.7: End-to-End Tests & Production Hardening**

As a developer shipping production software,
I want comprehensive E2E tests et production hardening,
So that AgentCards is reliable et users don't experience bugs.

**Acceptance Criteria:**
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

**Prerequisites:** Story 2.6 (error handling)

---

## Story Guidelines Reference

**Story Format:**

```
**Story [EPIC.N]: [Story Title]**

As a [user type],
I want [goal/desire],
So that [benefit/value].

**Acceptance Criteria:**
1. [Specific testable criterion]
2. [Another specific criterion]
3. [etc.]

**Prerequisites:** [Dependencies on previous stories, if any]
```

**Story Requirements:**

- **Vertical slices** - Complete, testable functionality delivery
- **Sequential ordering** - Logical progression within epic
- **No forward dependencies** - Only depend on previous work
- **AI-agent sized** - Completable in 2-4 hour focused session
- **Value-focused** - Integrate technical enablers into value-delivering stories

---

**For implementation:** Use the `create-story` workflow to generate individual story implementation plans from this epic breakdown.
