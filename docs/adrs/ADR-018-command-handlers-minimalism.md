# ADR-018: Command Handlers Minimalism - Replan-First Architecture

## Status
**PROPOSED** - 2025-11-24

## Context

### Problem Statement

During implementation of Epic 2.5 (Adaptive DAG Feedback Loops), a gap emerged between architectural documentation and actual requirements for command handlers in the `ControlledExecutor`.

**Documents analyzed:**
1. `docs/architecture.md` - Details only `replan_dag` (line 875-888)
2. `docs/spikes/spike-agent-human-dag-feedback-loop.md` - Lists 6 commands but tests only `abort` (line 1136)
3. `docs/spikes/spike-dag-strategy.md` - No mention of commands
4. `docs/stories/story-2.5-4.md` - Proposes 8 command handlers (4 existing + 4 new)

**Currently implemented (verified via code audit):**
- ✅ `continue` - Resume paused workflow
- ✅ `abort` - Terminate workflow with reason
- ✅ `replan_dag` - Dynamic task injection via GraphRAG query
- ✅ `approval_response` - Human approval for HIL checkpoints

**Proposed in Story 2.5-4 but NOT implemented:**
- ❌ `inject_tasks` - Manual task injection
- ❌ `skip_layer` - Skip execution layers
- ❌ `modify_args` - Modify task arguments
- ❌ `checkpoint_response` - Custom checkpoint logic

### Evidence-Based Analysis

#### 1. Architecture.md Specification
- **Mentions**: Only `replan_dag` with implementation details (line 875-888)
- **Example**: `inject_tasks` shown as example (line 622) but NOT specified
- **Others**: No mention of skip_layer, modify_args, checkpoint_response

#### 2. Spike Testing Reality
From `spike-agent-human-dag-feedback-loop.md`:
- **Lists** (line 688-697): 6 command types
- **Tests** (line 1136 AC): Only `abort` command
- **Conclusion**: Spike over-scoped - only 1/6 commands validated

#### 3. E2E Test Usage
```bash
# Actual commands used in tests
rg "enqueueCommand" tests/integration/ tests/e2e/
```
**Result**: Only 4 commands used (continue, abort, replan_dag, approval_response)

#### 4. Use Case Coverage Analysis

| Use Case | Architectural Need | Current Solution | New Handler Needed? |
|----------|-------------------|------------------|---------------------|
| **Progressive Discovery** | Agent discovers XML files, needs parser | `replan_dag` queries GraphRAG → adds xml:parse | ❌ No (replan_dag covers it) |
| **Human Safety Check** | Approve DELETE operation | `approval_response` + approve/reject | ❌ No (already exists) |
| **Multi-Turn Refinement** | Agent adjusts plan after results | `replan_dag` queries GraphRAG → new tasks | ❌ No (replan_dag covers it) |
| **Error Recovery** | Task fails, need recovery strategy | `abort` OR `replan_dag` with new approach | ❌ No (composition covers it) |
| **Manual Task Injection** | Developer wants explicit control | `inject_tasks` with task objects | ⚠️ Maybe (but replan_dag preferred) |
| **Skip Unnecessary Work** | Analysis fails, skip viz layer | Safe-to-fail branches (Epic 3.5) | ❌ No (architectural pattern) |
| **Runtime Param Correction** | Human corrects wrong argument | `modify_args` before execution | ⚠️ Maybe (HIL correction workflow) |
| **Custom Checkpoint Logic** | Rollback or retry after checkpoint | `approval_response` + composition | ❌ No (composition sufficient) |

**Key Insight:** `replan_dag` with GraphRAG is the **architectural pattern** for dynamic workflow modification.

## Decision

### Core Principle: Replan-First Architecture

**We adopt a minimalist command handler set centered on `replan_dag` as the primary mechanism for dynamic workflow adaptation.**

### Approved Command Handlers (4 only)

#### 1. `continue` - Resume Control
```typescript
interface ContinueCommand {
  type: "continue";
  reason?: string;
}
```
**Purpose**: Resume paused workflow after AIL/HIL decision
**Use Case**: Agent/Human approves continuation
**Status**: ✅ Implemented, tested

#### 2. `abort` - Workflow Termination
```typescript
interface AbortCommand {
  type: "abort";
  reason: string;
}
```
**Purpose**: Graceful workflow termination
**Use Case**: Unrecoverable error, user cancellation, safety concern
**Status**: ✅ Implemented, tested

#### 3. `replan_dag` - Dynamic Workflow Adaptation (PRIMARY)
```typescript
interface ReplanDAGCommand {
  type: "replan_dag";
  new_requirement: string;           // Natural language goal
  available_context: Record<string, unknown>; // Discovered data
}
```
**Purpose**: Intent-based workflow replanning via GraphRAG
**Use Case**:
- Progressive discovery (found XML, need parser)
- Conditional branching (language detected → specific linter)
- Error recovery (API failed → try alternative)
**Implementation**: `DAGSuggester.replanDAG()` queries knowledge graph
**Status**: ✅ Implemented, tested
**Why This is Better**:
- Uses GraphRAG intelligence (not manual task construction)
- Learns patterns over time
- Type-safe (GraphRAG validates tools exist)
- Optimized paths (PageRank ranking)

#### 4. `approval_response` - Human-in-the-Loop
```typescript
interface ApprovalResponseCommand {
  type: "approval_response";
  checkpoint_id: string;
  approved: boolean;
  feedback?: string;
}
```
**Purpose**: Human approval/rejection at checkpoints
**Use Case**: Critical operations (DELETE, WRITE), safety validation
**Status**: ✅ Implemented, tested

### Deferred Command Handlers (Explicit YAGNI)

#### ❌ `inject_tasks` - NOT NEEDED
**Reason**: Redundant with `replan_dag`
```typescript
// INSTEAD OF: Manual task construction
executor.enqueueCommand({
  type: "inject_tasks",
  tasks: [
    { id: "parse_xml", tool: "xml:parse", arguments: {...}, depends_on: [...] }
  ]
});

// USE: Intent-based replanning
executor.enqueueCommand({
  type: "replan_dag",
  new_requirement: "parse XML files found in directory",
  available_context: { xml_files: ["data.xml", "config.xml"] }
});
// → DAGSuggester queries GraphRAG → finds xml:parse → injects tasks
// → Safer, smarter, learns patterns
```
**Evidence**: 0 E2E tests use inject_tasks, architecture.md only shows as example

#### ❌ `skip_layer` - NOT NEEDED
**Reason**: Architectural pattern covers this (Safe-to-fail branches)
```typescript
// INSTEAD OF: Explicit skip command
executor.enqueueCommand({
  type: "skip_layer",
  target: "next",
  reason: "analysis failed, skip visualization"
});

// USE: Safe-to-fail task pattern (Epic 3.5)
{
  id: "visualize",
  tool: "viz:create",
  side_effects: false,  // ← Marked safe-to-fail
  depends_on: ["analyze"]
}
// → If analyze fails, visualize skips naturally
// → No explicit command needed
```
**Evidence**: 0 architectural requirement, 0 E2E tests

#### ❌ `modify_args` - DEFER to Epic 4
**Reason**: Theoretical use case, no proven need
```typescript
// POSSIBLE FUTURE: HIL correction workflow
executor.enqueueCommand({
  type: "modify_args",
  task_id: "create_issue",
  new_arguments: { assignee: "correct-username" },
  merge_strategy: "merge"
});
```
**Decision**: Defer until HIL correction workflow emerges in production
**Evidence**: 0 E2E tests, not mentioned in architecture.md

#### ❌ `checkpoint_response` - NOT NEEDED
**Reason**: Composition of existing handlers sufficient
```typescript
// INSTEAD OF: Complex checkpoint_response
executor.enqueueCommand({
  type: "checkpoint_response",
  checkpoint_id: "chk123",
  action: "modify_and_continue",
  modifications: [...]
});

// USE: Composition
executor.enqueueCommand({ type: "approval_response", checkpoint_id: "chk123", approved: true });
// If modifications needed:
executor.enqueueCommand({ type: "replan_dag", new_requirement: "adjust approach" });
```
**Evidence**: 0 architectural spec, 0 E2E tests

## Consequences

### Positive

✅ **Architectural Clarity**
- Single pattern: `replan_dag` for all dynamic adaptation
- Clear intent: "What do you want?" not "Build this task object"
- GraphRAG intelligence utilized

✅ **Reduced Complexity**
- 4 handlers instead of 8 (50% reduction)
- Less code to maintain (Story 2.5-4: 4h vs 16h)
- Easier to reason about

✅ **Better Long-Term Design**
- GraphRAG learns from replan patterns
- Intent-based API more stable than low-level task construction
- Type-safe (GraphRAG validates tools)

✅ **YAGNI Principle**
- Don't build what's not tested
- Don't build what's not specified
- Don't build what can be composed

✅ **Documentation Harmony**
- architecture.md aligns with implementation
- Story 2.5-4 scope reduced to essentials
- No contradiction between docs

### Negative

⚠️ **Perceived Limitation**
- Developers may expect low-level `inject_tasks` control
- **Mitigation**: Document `replan_dag` as preferred pattern

⚠️ **Future Modification Cost**
- If `modify_args` needed later, must add handler
- **Mitigation**: Architecture supports addition (extensible registry)

⚠️ **Learning Curve**
- Intent-based replanning vs manual task construction
- **Mitigation**: Examples in docs, better UX long-term

### Neutral

🔄 **Story 2.5-4 Scope Change**
- From: 8 handlers (16h) → 4h (race fix + registry improvement)
- Impact: Faster to Epic 3.5 (speculation - THE feature)

## Implementation Plan

### 1. Update Story 2.5-4 (NOW)
**Old Scope (16h):**
- AC1: inject_tasks handler (4h)
- AC2: skip_layer handler (2h)
- AC3: modify_args handler (2h)
- AC4: checkpoint_response handler (2h)
- AC5: Registry (2h)
- AC6: Integration tests (3h)
- AC7: Documentation (1h)

**New Scope (4h):**
- AC1: Fix BUG-001 race condition (2h)
- AC2: Improve command registry error handling (2h)
- Document ADR-018 decision

### 2. Update Documentation (2h)

**Files to update:**
- ✅ `docs/adrs/ADR-018-command-handlers-minimalism.md` (this file)
- 📝 `docs/architecture.md` - Remove inject_tasks example, clarify replan-first
- 📝 `docs/stories/story-2.5-4.md` - Reduce scope per ADR-018
- 📝 `docs/spikes/spike-agent-human-dag-feedback-loop.md` - Add note referencing ADR-018
- 📝 `docs/engineering-backlog.md` - Add deferred handlers as "Future Enhancement" section

### 3. Code Changes (None required)
- ✅ Current implementation already follows this ADR
- ✅ 4 handlers implemented correctly
- ✅ No deprecated code to remove

### 4. Testing (Validate coverage)
```bash
# Verify all 4 handlers tested
rg "enqueueCommand.*continue" tests/
rg "enqueueCommand.*abort" tests/
rg "enqueueCommand.*replan_dag" tests/
rg "enqueueCommand.*approval_response" tests/

# Verify deferred handlers NOT tested (as expected)
rg "enqueueCommand.*inject_tasks" tests/  # Should be 0
rg "enqueueCommand.*skip_layer" tests/    # Should be 0
```

## Alternatives Considered

### Alternative A: Implement All 8 Handlers (Status Quo Story 2.5-4)
**Pros**: Complete command coverage, no future additions needed
**Cons**:
- 50% are YAGNI (not tested, not specified)
- 16h implementation time vs 4h
- Duplicates `replan_dag` functionality
- Violates YAGNI principle
**Verdict**: ❌ Rejected - over-engineering

### Alternative B: Only Keep `replan_dag` (Ultra-Minimal)
**Pros**: Maximum simplicity, force replan-first
**Cons**:
- Need `abort` for unrecoverable errors
- Need `continue` for checkpoint resume
- Need `approval_response` for HIL
**Verdict**: ❌ Rejected - too restrictive

### Alternative C: Hybrid (Keep 4 + Add modify_args)
**Pros**: Covers HIL correction workflow proactively
**Cons**:
- No evidence HIL correction needed yet
- Can add later if needed (extensible)
- Violates YAGNI
**Verdict**: ❌ Rejected - defer until proven need

## Success Metrics

### Immediate (Week 1)
- ✅ Story 2.5-4 completed in 4h (not 16h)
- ✅ All documentation harmonized (no contradictions)
- ✅ ADR-018 approved and published

### Short-term (Month 1)
- ✅ 0 requests for inject_tasks/skip_layer/modify_args in user feedback
- ✅ `replan_dag` usage covers all dynamic adaptation needs
- ✅ Epic 3.5 (speculation) delivered faster (4 days saved)

### Long-term (Month 3)
- ✅ GraphRAG learning from replan patterns shows improvement
- ✅ No need to add deferred handlers
- ✅ Architecture pattern validated in production

## Related Documents

- **ADR-007**: 3-Loop Learning Architecture (replan_dag fits Loop 2)
- **ADR-010**: Task Types (replan creates new tasks dynamically)
- **ADR-016**: REPL-style Sandbox (safe-to-fail pattern for skip_layer)
- **Story 2.5-3**: AIL/HIL Integration (uses replan_dag + approval_response)
- **Epic 2.5 PRD**: Adaptive feedback loops (replan-first architecture)
- **Spike**: Agent-Human DAG Feedback Loop (over-scoped, corrected here)

## Future Review

**Conditions to reconsider deferred handlers:**

**`inject_tasks`**: If users report "replan_dag too slow/unpredictable"
- **Threshold**: >10 user complaints in 3 months
- **Mitigation**: Optimize GraphRAG query speed first

**`skip_layer`**: If safe-to-fail pattern insufficient
- **Threshold**: >5 use cases where conditional skip needed
- **Mitigation**: Enhance safe-to-fail logic first

**`modify_args`**: If HIL correction workflow emerges
- **Threshold**: >3 user requests for argument modification
- **Mitigation**: Implement with clear use case documentation

**Review Date**: 2026-02-24 (3 months post-Epic 2.5 completion)

---

## Approval

**Author**: BMad + Claude Sonnet 4.5
**Date**: 2025-11-24
**Status**: PROPOSED

**Reviewers**:
- [ ] Winston (Architect) - Architecture alignment
- [ ] John (PM) - User experience impact
- [ ] Mary (BA) - Requirements completeness

**Approval Required**: BMad (Tech Lead)

---

**Decision**: Adopt **Replan-First Architecture** with 4 core command handlers, defer 4 unproven handlers per YAGNI principle.
