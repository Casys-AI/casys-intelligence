# Story 3.4: `agentcards:execute_code` MCP Tool

**Epic:** 3 - Agent Code Execution & Local Processing
**Story ID:** 3.4
**Status:** drafted
**Estimated Effort:** 4-6 heures

---

## User Story

**As a** Claude Code user,
**I want** a new MCP tool that executes my TypeScript code in AgentCards sandbox,
**So that** I can process data locally instead of loading everything into context.

---

## Acceptance Criteria

1. ✅ New MCP tool registered: `agentcards:execute_code`
2. ✅ Input schema: `{ code: string, intent?: string, context?: object }`
3. ✅ Intent-based mode: vector search → inject relevant tools → execute code
4. ✅ Explicit mode: Execute provided code with specified context
5. ✅ Output schema: `{ result: any, logs: string[], metrics: object }`
6. ✅ Error handling: Syntax errors, runtime errors, timeout errors
7. ✅ Integration with gateway: Tool appears in `list_tools` response
8. ✅ Example workflow: Claude writes code → executes via tool → receives result
9. ✅ Documentation: README updated with code execution examples

---

## Tasks / Subtasks

### Phase 1: MCP Tool Registration (1-2h)

- [ ] **Task 1: Define tool schema** (AC: #1, #2, #5)
  - [ ] Créer schema JSON pour `agentcards:execute_code`
  - [ ] Input: `{ code: string, intent?: string, context?: Record<string, unknown> }`
  - [ ] Output: `{ result: unknown, logs: string[], metrics: { executionTimeMs: number, inputSizeBytes: number, outputSizeBytes: number } }`
  - [ ] Valider schema avec JSON Schema validator

- [ ] **Task 2: Register tool in gateway** (AC: #7)
  - [ ] Modifier `src/mcp/gateway-server.ts`
  - [ ] Ajouter `agentcards:execute_code` dans `list_tools` response
  - [ ] Créer handler `handleExecuteCode()` dans gateway
  - [ ] Router tool call vers sandbox executor

### Phase 2: Intent-Based & Explicit Modes (2h)

- [ ] **Task 3: Intent-based mode** (AC: #3)
  - [ ] Si `intent` fourni: utiliser vector search pour tools pertinents
  - [ ] Injecter top-k tools dans code context (via Story 3.2)
  - [ ] Exemple: `intent: "Analyze GitHub commits"` → inject `github` tools
  - [ ] Exécuter code avec tools injectés

- [ ] **Task 4: Explicit mode** (AC: #4)
  - [ ] Si `context` fourni: utiliser context directement
  - [ ] Pas de vector search (tools explicitement spécifiés)
  - [ ] Exemple: `context: { data: [...] }` → exécute avec data fournie
  - [ ] Supporter mix: intent + context custom

### Phase 3: Error Handling & Output (1-2h)

- [ ] **Task 5: Error handling** (AC: #6)
  - [ ] Capturer syntax errors → return `{ error: { type: "SyntaxError", message: "..." } }`
  - [ ] Capturer runtime errors → return `{ error: { type: "RuntimeError", message: "...", stack: "..." } }`
  - [ ] Capturer timeout errors → return `{ error: { type: "TimeoutError", message: "Execution exceeded 30s" } }`
  - [ ] Format MCP-compliant error response

- [ ] **Task 6: Output formatting** (AC: #5)
  - [ ] Return result avec structured format
  - [ ] Inclure logs capturés (console.log dans sandbox)
  - [ ] Inclure metrics (execution time, data sizes)
  - [ ] JSON-serialize output (validation Story 3.1)

### Phase 4: Example Workflow & Documentation (1h)

- [ ] **Task 7: Example workflow** (AC: #8)
  - [ ] Créer test E2E: Claude calls tool → code exécuté → result returned
  - [ ] Exemple code: "Analyze last week's commits"
  - [ ] Valider workflow complet fonctionne

- [ ] **Task 8: Documentation** (AC: #9)
  - [ ] README section: "Code Execution Mode"
  - [ ] Exemples: Intent-based vs Explicit mode
  - [ ] Best practices: When to use code execution vs direct tool calls
  - [ ] Performance tips: Streaming, batching, filtering locally

---

## Dev Notes

### MCP Tool Schema

**Schema Definition:**
```json
{
  "name": "agentcards:execute_code",
  "description": "Execute TypeScript code in secure sandbox with access to MCP tools. Process large datasets locally before returning results to save context tokens.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "code": {
        "type": "string",
        "description": "TypeScript code to execute in sandbox"
      },
      "intent": {
        "type": "string",
        "description": "Natural language description of task (optional, triggers tool discovery)"
      },
      "context": {
        "type": "object",
        "description": "Custom context/data to inject into sandbox (optional)"
      }
    },
    "required": ["code"]
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "result": {
        "description": "Execution result (JSON-serializable)"
      },
      "logs": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Console logs from code execution"
      },
      "metrics": {
        "type": "object",
        "properties": {
          "executionTimeMs": { "type": "number" },
          "inputSizeBytes": { "type": "number" },
          "outputSizeBytes": { "type": "number" }
        }
      }
    }
  }
}
```

### Example Usage

**Example 1: Intent-Based (Vector Search)**
```typescript
// Claude calls this tool
await mcp.callTool("agentcards:execute_code", {
  intent: "Analyze GitHub commits from last week",
  code: `
    const commits = await github.listCommits({ repo: "anthropics/claude", limit: 1000 });
    const lastWeek = commits.filter(c => isLastWeek(c.date));
    return {
      total: lastWeek.length,
      authors: [...new Set(lastWeek.map(c => c.author))]
    };
  `
});

// AgentCards:
// 1. Vector search: "Analyze GitHub commits" → identifies "github" tools
// 2. Inject github client into sandbox
// 3. Execute code with tools available
// 4. Return result: { total: 42, authors: ["alice", "bob"] }
```

**Example 2: Explicit Context**
```typescript
// Claude provides data directly
await mcp.callTool("agentcards:execute_code", {
  context: {
    commits: [...1000 commits data...]
  },
  code: `
    const lastWeek = commits.filter(c => isLastWeek(c.date));
    return { count: lastWeek.length };
  `
});

// AgentCards:
// 1. No vector search (context explicit)
// 2. Inject commits into sandbox
// 3. Execute code with commits available
// 4. Return result: { count: 42 }
```

**Example 3: Error Handling**
```typescript
// Code with syntax error
await mcp.callTool("agentcards:execute_code", {
  code: `
    const x = ;  // Syntax error
  `
});

// Response:
{
  error: {
    type: "SyntaxError",
    message: "Unexpected token ';'",
    line: 2,
    column: 15
  }
}
```

### Architecture Integration

**Gateway Server Integration:**
```typescript
// src/mcp/gateway-server.ts

private async handleExecuteCode(args: unknown) {
  const { code, intent, context } = args as {
    code: string;
    intent?: string;
    context?: Record<string, unknown>;
  };

  // Intent-based: vector search + tool injection
  let toolContext = context || {};
  if (intent) {
    const relevantTools = await this.vectorSearch.searchTools(intent, 5);
    const injectedTools = await this.contextBuilder.buildContext(relevantTools);
    toolContext = { ...toolContext, ...injectedTools };
  }

  // Execute in sandbox
  const result = await this.sandbox.execute(code, toolContext);

  return {
    result: result.output,
    logs: result.logs || [],
    metrics: {
      executionTimeMs: result.executionTimeMs,
      inputSizeBytes: Buffer.byteLength(code, 'utf8'),
      outputSizeBytes: Buffer.byteLength(JSON.stringify(result.output), 'utf8')
    }
  };
}
```

### Project Structure Alignment

**Modified Modules:**
```
src/mcp/
├── gateway-server.ts      # Add execute_code tool handler (MODIFIED)
├── gateway-handler.ts     # Add code execution logic (MODIFIED)
└── types.ts               # Add CodeExecutionRequest/Response types (MODIFIED)
```

**Integration Points:**
- `src/sandbox/executor.ts`: Reused for code execution (Story 3.1)
- `src/sandbox/context-builder.ts`: Reused for tool injection (Story 3.2)
- `src/sandbox/data-pipeline.ts`: Available for data processing (Story 3.3)
- `src/vector/search.ts`: Reused for intent-based mode

### Testing Strategy

**Test Organization:**
```
tests/integration/
├── code_execution_tool_test.ts    # MCP tool integration tests
└── gateway_code_exec_test.ts      # Gateway handler tests

tests/e2e/
└── claude_code_workflow_test.ts   # Full Claude Code workflow simulation
```

**Test Scenarios:**
1. Intent-based mode: intent → vector search → tools injected → execution
2. Explicit mode: context → execution (no vector search)
3. Mixed mode: intent + context → merge contexts
4. Error handling: syntax error, runtime error, timeout
5. Performance: large dataset processing

### Learnings from Previous Stories

**From Story 3.1 (Sandbox):**
- `CodeSandbox.execute(code, context)` API available
- Timeout 30s enforced
- Memory limit 512MB enforced
[Source: stories/story-3.1.md]

**From Story 3.2 (Tools Injection):**
- `ContextBuilder.buildContext(tools)` generates tool wrappers
- Vector search identifies relevant tools from intent
[Source: stories/story-3.2.md]

**From Story 3.3 (Data Pipeline):**
- Data processing helpers available
- Streaming support for large datasets
- Metrics logging: input/output sizes
[Source: stories/story-3.3.md]

**From Story 2.4 (Gateway):**
- MCP gateway server structure established
- `handleCallTool()` routing pattern
- Tool registration in `list_tools`
[Source: stories/story-2.4.md]

### Documentation Content

**README Section: Code Execution Mode**

```markdown
## Code Execution Mode

AgentCards supports executing TypeScript code directly in a secure sandbox, enabling local data processing before results reach the LLM context.

### When to Use Code Execution

**Use code execution when:**
- Processing large datasets (>100 items)
- Filtering/aggregating data locally
- Complex transformations not supported by single tool

**Use direct tool calls when:**
- Single tool with small result (<10KB)
- No processing needed
- Real-time requirements (<100ms)

### Example: Analyze GitHub Commits

```typescript
// Intent-based (automatic tool discovery)
await mcp.callTool("agentcards:execute_code", {
  intent: "Analyze GitHub commits from last week",
  code: `
    const commits = await github.listCommits({ limit: 1000 });
    const lastWeek = commits.filter(c => new Date(c.date) > Date.now() - 7*24*3600*1000);
    return { count: lastWeek.length, authors: [...new Set(lastWeek.map(c => c.author))] };
  `
});
```

### Performance Tips

1. **Filter early**: Reduce data size before processing
2. **Use streaming**: For datasets >10k items
3. **Batch operations**: Process 1000 items at a time
4. **Return summaries**: Don't return full datasets
```

### Security Considerations

**Sandbox Isolation:**
- Code runs in isolated Deno subprocess (Story 3.1)
- Limited permissions (only `~/.agentcards` read access)
- No network access from sandbox

**Input Validation:**
- Code string validated (no empty, max 100KB)
- Context object validated (JSON-serializable only)
- Intent string sanitized (no code injection)

### Out of Scope (Story 3.4)

- PII detection (Story 3.5)
- Caching (Story 3.6)
- Comprehensive E2E docs (Story 3.7)

### References

- [Epic 3 Overview](../epics.md#Epic-3-Agent-Code-Execution--Local-Processing)
- [Story 3.1 - Sandbox](./story-3.1.md)
- [Story 3.2 - Tools Injection](./story-3.2.md)
- [Story 3.3 - Data Pipeline](./story-3.3.md)
- [Story 2.4 - Gateway](./story-2.4.md)

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
- `tests/integration/code_execution_tool_test.ts`
- `tests/integration/gateway_code_exec_test.ts`
- `tests/e2e/claude_code_workflow_test.ts`

**Files to be Modified (MODIFIED):**
- `src/mcp/gateway-server.ts` (add execute_code tool)
- `src/mcp/gateway-handler.ts` (add code execution logic)
- `src/mcp/types.ts` (add types)
- `README.md` (add Code Execution Mode section)

**Files to be Deleted (DELETED):**
- None

---

## Change Log

- **2025-11-09**: Story drafted by BMM workflow, based on Epic 3 requirements
