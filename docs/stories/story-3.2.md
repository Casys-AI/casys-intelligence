# Story 3.2: MCP Tools Injection into Code Context

**Epic:** 3 - Agent Code Execution & Local Processing
**Story ID:** 3.2
**Status:** drafted
**Estimated Effort:** 6-8 heures

---

## User Story

**As an** agent,
**I want** access to MCP tools within my code execution environment,
**So that** I can call tools directly from my TypeScript code instead of via JSON-RPC.

---

## Acceptance Criteria

1. ✅ Tool injection system créé (`src/sandbox/context-builder.ts`)
2. ✅ MCP clients wrapped as TypeScript functions accessible in sandbox
3. ✅ Code context includes: `const github = { listCommits: async (...) => ... }`
4. ✅ Vector search used to identify relevant tools (only inject top-k, not all)
5. ✅ Type definitions generated for injected tools (TypeScript autocomplete support)
6. ✅ Tool calls from sandbox routed through existing MCP gateway
7. ✅ Error propagation: MCP errors surfaced as JavaScript exceptions
8. ✅ Integration test: Agent code calls `github.listCommits()` successfully
9. ✅ Security: No eval() or dynamic code generation in injection

---

## Tasks / Subtasks

### Phase 1: Context Builder Foundation (2-3h)

- [ ] **Task 1: Create context builder module** (AC: #1)
  - [ ] Créer `src/sandbox/context-builder.ts`
  - [ ] Créer interface `ToolContext` avec method signatures
  - [ ] Créer classe `ContextBuilder` pour orchestration
  - [ ] Exporter module dans `mod.ts`

- [ ] **Task 2: MCP client wrapper generation** (AC: #2, #3)
  - [ ] Créer fonction `wrapMCPClient(client: MCPClient): ToolFunctions`
  - [ ] Générer wrappers TypeScript pour chaque tool du client
  - [ ] Format: `const github = { listCommits: async (args) => client.callTool("list_commits", args) }`
  - [ ] Gérer conversion arguments (camelCase ↔ snake_case si nécessaire)
  - [ ] Retourner objet avec méthodes typées

### Phase 2: Vector Search Integration (2h)

- [ ] **Task 3: Vector search for relevant tools** (AC: #4)
  - [ ] Intégrer `VectorSearch` dans `ContextBuilder`
  - [ ] Utiliser intent/query pour identifier top-k tools pertinents (default k=5)
  - [ ] Ne charger que les MCP clients pour tools identifiés
  - [ ] Éviter injection de tous les tools (économie mémoire/contexte)
  - [ ] Logger tools injectés pour debugging

- [ ] **Task 4: Type definitions generation** (AC: #5)
  - [ ] Générer TypeScript type definitions depuis MCP tool schemas
  - [ ] Parser `inputSchema` (JSON Schema) → TypeScript interface
  - [ ] Créer `.d.ts` virtuel pour autocomplete dans sandbox
  - [ ] Supporter types: string, number, boolean, object, array
  - [ ] Handle optionals et required fields

### Phase 3: Gateway Routing & Error Handling (2h)

- [ ] **Task 5: Route tool calls through gateway** (AC: #6)
  - [ ] Wrapper calls doivent utiliser existing MCP gateway infrastructure
  - [ ] Réutiliser `MCPClient.callTool()` méthode (pas de duplication)
  - [ ] Respecter rate limiting et health checks existants
  - [ ] Logger tous les tool calls pour telemetry

- [ ] **Task 6: Error propagation** (AC: #7)
  - [ ] Capturer MCP errors (server errors, tool errors, timeouts)
  - [ ] Convertir en JavaScript exceptions avec stack trace
  - [ ] Préserver error details (code, message, data)
  - [ ] Format: `throw new MCPToolError(toolName, originalError)`
  - [ ] Permettre try/catch dans code agent

### Phase 4: Testing & Integration (1-2h)

- [ ] **Task 7: Integration tests** (AC: #8)
  - [ ] Test: Inject GitHub client → call `github.listCommits()` → receive results
  - [ ] Test: Multiple tools injection (github + filesystem)
  - [ ] Test: Vector search filters tools correctly (only relevant injected)
  - [ ] Test: Error handling (tool fails → exception thrown in sandbox)
  - [ ] Test: Type safety (TypeScript compilation validates signatures)

- [ ] **Task 8: Security validation** (AC: #9)
  - [ ] Audit: No `eval()` usage in context builder
  - [ ] Audit: No `Function()` constructor
  - [ ] Audit: No dynamic code generation (template strings ok, mais pas eval)
  - [ ] Test: Malicious tool name → rejection (e.g., `__proto__`)
  - [ ] Test: Tool wrapper cannot escape sandbox

---

## Dev Notes

### Architecture Integration

**Dependency on Story 3.1:**
- Uses `CodeSandbox` from Story 3.1 for execution environment
- Injects tools via sandbox initialization context
- Tool wrappers execute within sandbox subprocess

**Vector Search Integration (Epic 1):**
- Reuses `VectorSearch` from `src/vector/search.ts`
- Intent-based tool discovery: `vectorSearch.searchTools(intent, topK=5)`
- Only inject top-K relevant tools to minimize context

**MCP Gateway Integration (Epic 2):**
- Tool calls routed through `src/mcp/gateway-server.ts`
- Reuses existing `MCPClient` instances (no new connections)
- Respects health checks and rate limiting from Story 2.5 & 2.6

### Code Injection Pattern

**Example: GitHub Tools Injection**

```typescript
// Vector search identifies "github" as relevant
const relevantTools = await vectorSearch.searchTools(intent, 5);
// Result: ["github:list_commits", "github:get_repo", ...]

// Load MCP client for "github" server
const githubClient = mcpClients.get("github");

// Generate wrapper
const github = {
  listCommits: async (args: { repo: string; limit?: number }) => {
    return await githubClient.callTool("list_commits", args);
  },
  getRepo: async (args: { repo: string }) => {
    return await githubClient.callTool("get_repo", args);
  }
};

// Inject into sandbox context
const sandboxCode = `
  const github = ${JSON.stringify(github)}; // Not actual approach - see below

  // Agent code here
  const commits = await github.listCommits({ repo: "anthropics/claude-code", limit: 10 });
  return commits;
`;
```

**Actual Implementation (Secure):**
- Don't serialize functions (not JSON-safe)
- Instead: Inject tool proxy that communicates with parent process
- Use message passing: sandbox → parent → MCP client → response → sandbox

### Type Generation Example

**Input: MCP Tool Schema**
```json
{
  "name": "list_commits",
  "inputSchema": {
    "type": "object",
    "properties": {
      "repo": { "type": "string" },
      "limit": { "type": "number" }
    },
    "required": ["repo"]
  }
}
```

**Output: TypeScript Type**
```typescript
interface ListCommitsArgs {
  repo: string;
  limit?: number;
}

const github = {
  listCommits: async (args: ListCommitsArgs): Promise<unknown> => { ... }
};
```

### Project Structure Alignment

**New Module: `src/sandbox/context-builder.ts`**
```
src/sandbox/
├── executor.ts           # Story 3.1 - Sandbox execution
├── context-builder.ts    # Story 3.2 - Tool injection (NEW)
├── types.ts              # Shared types
└── wrapper-template.ts   # Helper for code wrapper generation (optional)
```

**Integration Points:**
- `src/sandbox/executor.ts`: Modified to accept `toolContext` parameter
- `src/vector/search.ts`: Reused for tool discovery
- `src/mcp/client.ts`: Reused for tool execution
- `src/mcp/gateway-server.ts`: Future integration (Story 3.4)

### Testing Strategy

**Test Organization:**
```
tests/unit/sandbox/
├── context_builder_test.ts      # Context builder unit tests
├── tool_wrapper_test.ts         # Wrapper generation tests
├── type_generation_test.ts      # TypeScript type gen tests
└── integration_test.ts          # Full flow: inject → execute → result

tests/fixtures/
├── mock-github-client.ts        # Mock MCP client for testing
└── sample-tool-schemas.json     # Sample schemas for type gen
```

**Mock Strategy:**
- Reuse `MockMCPServer` from Story 2.7 (`tests/fixtures/mock-mcp-server.ts`)
- Create minimal GitHub client mock with 2-3 methods
- Validate wrapper calls match expected MCP protocol

### Learnings from Previous Story (3.1)

**From Story 3-1-deno-sandbox-executor-foundation (Status: drafted)**

**Sandbox Infrastructure:**
- `CodeSandbox` class disponible dans `src/sandbox/executor.ts`
- Subprocess isolation avec permissions explicites
- Timeout (30s) et memory limits (512MB) déjà implémentés
- Return value serialization (JSON-only) validée

**Integration Points:**
- Modifier `CodeSandbox.execute()` pour accepter `context` parameter
- Context contient les tool wrappers injectés
- Sandbox peut référencer tools via `const { github } = context;`

**Security Model:**
- No eval/Function constructor (déjà validé en 3.1)
- Tools wrappers doivent respecter mêmes contraintes
- Message passing préféré vs function serialization

**Testing Patterns:**
- Reuse test helpers from Story 2.7 & 3.1
- Isolation tests avec DB temporaire
- Performance benchmarks si overhead significatif

[Source: stories/story-3.1.md#Dev-Notes]

### Performance Considerations

**Overhead Sources:**
1. Vector search for tool discovery (~50ms)
2. Type generation from schemas (~10ms per tool)
3. Wrapper creation (~5ms per tool)
4. **Total overhead: ~100ms for 5 tools** (acceptable)

**Optimization Strategies:**
- Cache generated wrappers per tool schema version
- Lazy type generation (only when needed)
- Batch vector search calls

### Security Considerations

**Threat Model:**
1. **Malicious tool injection**: Vector search must validate tool names
2. **Prototype pollution**: Reject `__proto__`, `constructor` tool names
3. **Code injection**: No eval/Function in wrapper generation

**Mitigation:**
- Whitelist tool name patterns: `[a-z0-9_-]+:[a-z0-9_-]+`
- Sanitize all tool names before injection
- Use message passing (not function serialization)

### Out of Scope (Story 3.2)

- Local data processing (Story 3.3)
- MCP tool registration (Story 3.4)
- PII detection (Story 3.5)
- Caching (Story 3.6)

### References

- [Epic 3 Overview](../epics.md#Epic-3-Agent-Code-Execution--Local-Processing)
- [Story 3.1 - Sandbox Foundation](./story-3.1.md)
- [Vector Search Implementation](./story-1.5.md)
- [MCP Client](./story-1.3.md)

---

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

_To be filled by Dev Agent_

### Debug Log References

_Dev implementation notes, challenges, and solutions go here_

### Completion Notes List

_Key completion notes for next story (patterns, services, deviations) go here_

### File List

**Files to be Created (NEW):**
- `src/sandbox/context-builder.ts`
- `src/sandbox/wrapper-template.ts` (optional)
- `tests/unit/sandbox/context_builder_test.ts`
- `tests/unit/sandbox/tool_wrapper_test.ts`
- `tests/unit/sandbox/type_generation_test.ts`
- `tests/unit/sandbox/integration_test.ts`
- `tests/fixtures/mock-github-client.ts`
- `tests/fixtures/sample-tool-schemas.json`

**Files to be Modified (MODIFIED):**
- `src/sandbox/executor.ts` (accept context parameter)
- `src/sandbox/types.ts` (add ToolContext interface)
- `mod.ts` (export context builder)

**Files to be Deleted (DELETED):**
- None

---

## Change Log

- **2025-11-09**: Story drafted by BMM workflow, based on Epic 3 requirements
