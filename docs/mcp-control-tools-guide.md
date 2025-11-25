# MCP Control Tools Guide

**AgentCards MCP Control Tools** - External Agent API for Adaptive Workflow Execution

## Overview

AgentCards provides **4 MCP meta-tools** that enable external agents (like Claude Code) to control workflow execution with per-layer validation, progressive discovery, and adaptive replanning.

**Use Case:** Build adaptive workflows that pause after each execution layer, allow inspection of results, and dynamically adjust the DAG based on discovered context.

**Architecture:** Level 1 (External MCP Agents) → MCP meta-tools → Level 2 (Internal CommandQueue) → ControlledExecutor

See [ADR-020: AIL Control Protocol](./adrs/ADR-020-ail-control-protocol.md) for architectural details.

---

## Quick Start

### 1. Execute with Per-Layer Validation

Start a workflow that pauses after each layer:

```typescript
const response = await mcp.callTool("agentcards:execute_dag", {
  intent: "Analyze codebase for TypeScript errors",
  config: { per_layer_validation: true }
});

// Response:
{
  status: "layer_complete",
  workflow_id: "550e8400-e29b-41d4-a716-446655440000",
  checkpoint_id: "chk_12345",
  layer_results: [
    { task_id: "task-1", status: "success", output: {...} }
  ],
  options: ["continue", "replan", "abort"]
}
```

### 2. Continue to Next Layer

Resume execution after validation:

```typescript
const response = await mcp.callTool("agentcards:continue", {
  workflow_id: "550e8400-e29b-41d4-a716-446655440000",
  reason: "Validation passed"  // optional
});

// Response: Same format, next layer results or completion
```

### 3. Replan Based on Discoveries

Dynamically add tasks mid-workflow:

```typescript
const response = await mcp.callTool("agentcards:replan", {
  workflow_id: "550e8400-e29b-41d4-a716-446655440000",
  new_requirement: "Add XML parser - discovered data.xml file",
  available_context: { discovered_files: ["data.xml"] }  // optional
});

// Response:
{
  status: "replanned",
  new_tasks: [
    { id: "task-xml-parser", tool: "xml:parse", ... }
  ],
  options: ["continue", "abort"]
}
```

### 4. Abort Workflow

Stop execution gracefully:

```typescript
const response = await mcp.callTool("agentcards:abort", {
  workflow_id: "550e8400-e29b-41d4-a716-446655440000",
  reason: "User cancelled operation"
});

// Response:
{
  status: "aborted",
  partial_results: [...],
  completed_layers: 2,
  reason: "User cancelled operation"
}
```

---

## Tool Reference

### `agentcards:execute_dag`

**Purpose:** Execute a workflow with optional per-layer validation.

**Input:**
```typescript
{
  intent?: string,           // Natural language description (for AI-suggested DAG)
  workflow?: DAGStructure,   // Explicit DAG structure
  config?: {
    per_layer_validation?: boolean  // Pause after each layer (default: false)
  }
}
```

**Output (per_layer_validation: false):**
```typescript
{
  status: "complete",
  results: TaskResult[],
  workflow_id: string
}
```

**Output (per_layer_validation: true):**
```typescript
{
  status: "layer_complete",
  workflow_id: string,
  checkpoint_id: string,
  layer_results: TaskResult[],
  options: ["continue", "replan", "abort"]
}
```

**Example:**
```typescript
// Intent-based (AI suggests DAG)
await mcp.callTool("agentcards:execute_dag", {
  intent: "Search codebase for security vulnerabilities",
  config: { per_layer_validation: true }
});

// Explicit DAG
await mcp.callTool("agentcards:execute_dag", {
  workflow: {
    tasks: [
      { id: "task-1", tool: "grep:search", arguments: {...}, depends_on: [] },
      { id: "task-2", tool: "analyzer:lint", arguments: {...}, depends_on: ["task-1"] }
    ]
  },
  config: { per_layer_validation: true }
});
```

---

### `agentcards:continue`

**Purpose:** Continue workflow execution to the next layer.

**Input:**
```typescript
{
  workflow_id: string,  // Required: Workflow ID from execute_dag
  reason?: string       // Optional: Reason for continuing
}
```

**Output:**
```typescript
{
  status: "layer_complete" | "complete",
  workflow_id: string,
  checkpoint_id?: string,      // If layer_complete
  layer_results?: TaskResult[], // If layer_complete
  results?: TaskResult[],      // If complete
  options?: string[]           // If layer_complete
}
```

**Usage:**
- Call after receiving `layer_complete` status
- Workflow proceeds to next layer
- Returns `complete` when all layers finished

**Errors:**
- `INVALID_PARAMS`: Missing or invalid workflow_id
- `NOT_FOUND`: Workflow expired or doesn't exist (1h TTL)

---

### `agentcards:abort`

**Purpose:** Stop workflow execution gracefully.

**Input:**
```typescript
{
  workflow_id: string,  // Required
  reason: string        // Required: Why aborting
}
```

**Output:**
```typescript
{
  status: "aborted",
  workflow_id: string,
  partial_results: TaskResult[],
  completed_layers: number,
  reason: string
}
```

**Cleanup:**
- Cleans up workflow state (in-memory + DB)
- Returns all completed task results
- Cannot resume after abort

---

### `agentcards:replan`

**Purpose:** Dynamically add tasks to the workflow based on discovered context.

**Input:**
```typescript
{
  workflow_id: string,          // Required
  new_requirement: string,      // Required: Natural language description
  available_context?: object    // Optional: Context data for GraphRAG
}
```

**Output:**
```typescript
{
  status: "replanned",
  workflow_id: string,
  new_tasks: TaskDefinition[],
  options: ["continue", "abort"]
}
```

**How it works:**
1. GraphRAG analyzes new_requirement + available_context
2. Suggests new tasks to add to the DAG
3. Updates workflow DAG in database
4. Returns new tasks for review
5. Call `continue` to execute new tasks

**Example Use Case:**
```typescript
// Layer 1 discovers XML files
const layer1 = await execute({ intent: "List project files", ... });
// → discovers: data.xml, config.xml

// Replan to add XML processing
const replan = await mcp.callTool("agentcards:replan", {
  workflow_id: layer1.workflow_id,
  new_requirement: "Parse XML files for configuration data",
  available_context: { discovered_files: ["data.xml", "config.xml"] }
});
// → GraphRAG adds: xml:parse, xml:validate tasks

// Continue with updated DAG
const layer2 = await mcp.callTool("agentcards:continue", {
  workflow_id: layer1.workflow_id
});
```

---

### `agentcards:approval_response`

**Purpose:** Respond to Human-in-the-Loop (HIL) approval checkpoints.

**Input:**
```typescript
{
  workflow_id: string,      // Required
  checkpoint_id: string,    // Required: From decision_required event
  approved: boolean,        // Required: true = approve, false = reject
  feedback?: string         // Optional: Feedback for rejection
}
```

**Output (approved: true):**
```typescript
{
  status: "layer_complete" | "complete",
  workflow_id: string,
  // ... continues execution
}
```

**Output (approved: false):**
```typescript
{
  status: "rejected",
  workflow_id: string,
  checkpoint_id: string,
  feedback?: string
}
```

**How it works:**
1. Workflow reaches `decision_required` event (e.g., "Delete production database?")
2. Workflow pauses, returns checkpoint_id
3. Human approves/rejects via this tool
4. Workflow continues or stops based on approval

**Example:**
```typescript
// Execute workflow with HIL checkpoints
const response = await execute({
  intent: "Migrate database schema",
  config: { per_layer_validation: true }
});

// Workflow pauses at critical operation
if (response.checkpoint_type === "approval_required") {
  // Prompt human for approval
  const approved = confirm(`Approve: ${response.decision_context}?`);

  await mcp.callTool("agentcards:approval_response", {
    workflow_id: response.workflow_id,
    checkpoint_id: response.checkpoint_id,
    approved: approved,
    feedback: approved ? "" : "Too risky for production"
  });
}
```

---

## Workflow Patterns

### Pattern 1: Progressive Validation

Inspect results after each layer, continue only if valid:

```typescript
let response = await execute({ intent: "...", config: { per_layer_validation: true } });

while (response.status === "layer_complete") {
  // Validate layer results
  const valid = validateResults(response.layer_results);

  if (!valid) {
    // Abort on validation failure
    await mcp.callTool("agentcards:abort", {
      workflow_id: response.workflow_id,
      reason: "Validation failed"
    });
    break;
  }

  // Continue to next layer
  response = await mcp.callTool("agentcards:continue", {
    workflow_id: response.workflow_id
  });
}

console.log("Workflow complete:", response.results);
```

### Pattern 2: Adaptive Discovery

Adjust workflow based on discovered context:

```typescript
let response = await execute({
  intent: "Analyze project structure",
  config: { per_layer_validation: true }
});

while (response.status === "layer_complete") {
  // Analyze results for new requirements
  const discoveries = analyzeResults(response.layer_results);

  if (discoveries.needsAdditionalProcessing) {
    // Dynamically add tasks
    response = await mcp.callTool("agentcards:replan", {
      workflow_id: response.workflow_id,
      new_requirement: discoveries.requirement,
      available_context: discoveries.context
    });
  }

  // Continue with updated DAG
  response = await mcp.callTool("agentcards:continue", {
    workflow_id: response.workflow_id
  });
}
```

### Pattern 3: Human Approval Gates

Add human checkpoints for critical operations:

```typescript
let response = await execute({
  intent: "Deploy to production",
  config: { per_layer_validation: true }
});

while (response.status === "layer_complete") {
  // Check if approval required
  if (response.checkpoint_type === "approval_required") {
    const approved = await promptHuman(response.decision_context);

    response = await mcp.callTool("agentcards:approval_response", {
      workflow_id: response.workflow_id,
      checkpoint_id: response.checkpoint_id,
      approved: approved
    });

    if (!approved) {
      break; // Stop if rejected
    }
  } else {
    // Auto-continue non-critical layers
    response = await mcp.callTool("agentcards:continue", {
      workflow_id: response.workflow_id
    });
  }
}
```

---

## State Management

### Workflow Lifecycle

1. **Create:** `execute_dag` with `per_layer_validation: true`
   - Generates workflow_id (UUID)
   - Persists DAG to database (TTL: 1 hour)
   - Stores in-memory state (ActiveWorkflows Map)

2. **Control:** `continue` / `replan` / `abort`
   - Retrieves workflow by workflow_id (in-memory first, DB fallback)
   - Executes command via CommandQueue
   - Updates state and checkpoint

3. **Complete:** Workflow finishes or aborts
   - Cleans up in-memory state
   - Deletes DAG from database
   - Returns final results

### State Persistence

**In-Memory (Fast Path):**
- ActiveWorkflows Map: workflow_id → ActiveWorkflow
- Persists during workflow execution
- Lost on server restart

**Database (Fallback):**
- Table: `workflow_dags` (workflow_id, dag, intent, expires_at)
- Survives server restart
- Auto-cleanup after 1 hour (TTL)

**Checkpoints:**
- Managed by CheckpointManager
- Persists execution state between layers
- Used for resume after restart

---

## Error Handling

### Common Errors

**INVALID_PARAMS:**
- Missing required parameter (workflow_id, reason, etc.)
- Invalid workflow_id format

**NOT_FOUND:**
- Workflow expired (>1h TTL)
- Workflow doesn't exist
- No checkpoints found for workflow

**INTERNAL_ERROR:**
- CheckpointManager not initialized
- GraphRAG failure during replan
- Database error

### Error Response Format

```typescript
{
  error: {
    code: number,        // MCPErrorCodes enum
    message: string,     // Human-readable message
    data?: {             // Optional debug info
      workflow_id?: string,
      checkpoint_id?: string
    }
  }
}
```

### Retry Strategy

**Transient Errors (INTERNAL_ERROR):**
- Retry with exponential backoff
- Max 3 retries

**Permanent Errors (INVALID_PARAMS, NOT_FOUND):**
- Don't retry
- Fix parameters or start new workflow

---

## Performance Considerations

### Workflow TTL

- **Default:** 1 hour
- **Rationale:** MCP sessions are typically short-lived
- **Cleanup:** Automatic via `expires_at` column

**Recommendation:** Complete workflows within 1 hour or they'll be garbage collected.

### In-Memory State

- **Size:** ~1KB per active workflow
- **Max:** Limited by server memory (~10K concurrent workflows)
- **Fallback:** DB persistence for recovery

**Recommendation:** Use `abort` to explicitly clean up abandoned workflows.

### Checkpoint Overhead

- **Cost:** ~50ms per checkpoint (database write)
- **Frequency:** Once per layer
- **Optimization:** Checkpoints include only essential state

---

## Security & Best Practices

### Input Validation

✅ **All tools validate required parameters:**
- workflow_id: Must exist and not expired
- checkpoint_id: Must match workflow checkpoint
- reason: Required for abort (audit trail)

### Workflow Isolation

✅ **Each workflow_id is isolated:**
- Cannot access other workflows' state
- Cannot interfere with other executions
- Clean separation via UUID

### Rate Limiting

⚠️ **Not implemented in MVP:**
- Consider adding: 10 calls/min per workflow_id
- Prevents abuse and resource exhaustion

### Audit Trail

✅ **All control commands logged:**
- `log.info()` statements in all handlers
- Includes workflow_id, reason, and outcome
- Useful for debugging and compliance

---

## Troubleshooting

### "Workflow not found or expired"

**Cause:** workflow_id doesn't exist or >1h old

**Solution:**
1. Check workflow_id is correct (UUID format)
2. Check workflow age (<1h since creation)
3. Start new workflow if expired

### "No checkpoints found for workflow"

**Cause:** CheckpointManager not initialized or checkpoint lost

**Solution:**
1. Ensure per_layer_validation was enabled
2. Check database connectivity
3. Restart workflow if checkpoints lost

### "Layer complete but can't continue"

**Cause:** In-memory state lost (server restart) and DB fallback failed

**Solution:**
1. Check `workflow_dags` table has entry
2. Verify expires_at is in future
3. Restart workflow if state unrecoverable

---

## Examples

### Complete Example: Adaptive Codebase Analysis

```typescript
import { MCPClient } from "@modelcontextprotocol/sdk";

const mcp = new MCPClient(...);

// Start analysis with per-layer validation
let response = await mcp.callTool("agentcards:execute_dag", {
  intent: "Analyze TypeScript codebase for issues",
  config: { per_layer_validation: true }
});

console.log(`Started workflow: ${response.workflow_id}`);

// Process each layer
while (response.status === "layer_complete") {
  console.log(`Layer ${response.layer_index} complete:`, response.layer_results);

  // Check for discovered issues
  const issues = analyzeLayerResults(response.layer_results);

  if (issues.needsDeepAnalysis) {
    // Add specialized analysis tasks
    console.log("Discovered issues, adding deep analysis...");
    response = await mcp.callTool("agentcards:replan", {
      workflow_id: response.workflow_id,
      new_requirement: `Analyze ${issues.files.join(", ")} for ${issues.type} issues`,
      available_context: { issues }
    });

    // Continue with updated DAG
    response = await mcp.callTool("agentcards:continue", {
      workflow_id: response.workflow_id,
      reason: "Added deep analysis tasks"
    });
  } else {
    // No issues, proceed to next layer
    response = await mcp.callTool("agentcards:continue", {
      workflow_id: response.workflow_id
    });
  }
}

// Workflow complete
console.log("Analysis complete:", response.results);
```

---

## Related Documentation

- [ADR-020: AIL Control Protocol](./adrs/ADR-020-ail-control-protocol.md) - Architecture decision
- [ADR-007: 3-Loop Learning Architecture](./adrs/ADR-007-dag-adaptive-feedback-loops.md) - Conceptual foundation
- [Epic 2.5 Technical Specification](./tech-spec-epic-2.5.md) - Technical details
- [Story 2.5-4](./stories/story-2.5-4.md) - Implementation story

---

## Support & Feedback

**Issues:** Report bugs at [github.com/anthropics/agentcards/issues](https://github.com/anthropics/agentcards/issues)

**Questions:** Join discussions on GitHub Discussions

**Version:** 0.1.0 (MVP)
**Last Updated:** 2025-11-25
