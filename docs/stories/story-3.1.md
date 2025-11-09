# Story 3.1: Deno Sandbox Executor Foundation

**Epic:** 3 - Agent Code Execution & Local Processing
**Story ID:** 3.1
**Status:** drafted
**Estimated Effort:** 6-8 heures

---

## User Story

**As a** developer,
**I want** a secure Deno sandbox environment for executing agent-generated code,
**So that** agents can run TypeScript code without compromising system security.

---

## Acceptance Criteria

1. ✅ Sandbox module créé (`src/sandbox/executor.ts`)
2. ✅ Deno subprocess spawned avec permissions explicites (`--allow-env`, `--allow-read=~/.agentcards`)
3. ✅ Code execution isolée (no access to filesystem outside allowed paths)
4. ✅ Timeout enforcement (default 30s, configurable)
5. ✅ Memory limits enforcement (default 512MB heap)
6. ✅ Error capturing et structured error messages
7. ✅ Return value serialization (JSON-compatible outputs only)
8. ✅ Unit tests validating isolation (attempt to access /etc/passwd should fail)
9. ✅ Performance: Sandbox startup <100ms, code execution overhead <50ms

---

## Tasks / Subtasks

### Phase 1: Sandbox Module Foundation (2-3h)

- [ ] **Task 1: Create sandbox module structure** (AC: #1)
  - [ ] Créer `src/sandbox/` directory
  - [ ] Créer `src/sandbox/executor.ts` avec `CodeSandbox` classe
  - [ ] Créer `src/sandbox/types.ts` pour interfaces TypeScript
  - [ ] Exporter module dans `mod.ts`

- [ ] **Task 2: Implement Deno subprocess spawning** (AC: #2)
  - [ ] Utiliser `Deno.Command` pour spawner subprocess isolé
  - [ ] Configurer permissions explicites: `--allow-env`, `--allow-read=~/.agentcards`
  - [ ] Interdire tous les autres accès (no net, no write outside allowed paths)
  - [ ] Gérer stdin/stdout pour communication avec subprocess

- [ ] **Task 3: Implement code execution isolation** (AC: #3)
  - [ ] Wrapper code utilisateur dans module wrapper
  - [ ] Configurer `--no-prompt` pour éviter interactions
  - [ ] Valider que filesystem access limité aux paths autorisés
  - [ ] Tester tentative d'accès `/etc/passwd` → doit fail

### Phase 2: Timeout & Resource Limits (2h)

- [ ] **Task 4: Implement timeout enforcement** (AC: #4)
  - [ ] Timeout par défaut: 30 secondes (configurable)
  - [ ] Utiliser `AbortController` ou timeout mechanism
  - [ ] Tuer subprocess si timeout dépassé
  - [ ] Retourner erreur `TimeoutError` structurée

- [ ] **Task 5: Implement memory limits** (AC: #5)
  - [ ] Limite heap par défaut: 512MB (configurable)
  - [ ] Utiliser `--v8-flags=--max-old-space-size=512` pour heap limit
  - [ ] Monitorer memory usage durant exécution
  - [ ] Retourner erreur `MemoryLimitError` si dépassé

### Phase 3: Error Handling & Serialization (1-2h)

- [ ] **Task 6: Implement error capturing** (AC: #6)
  - [ ] Capturer stderr du subprocess
  - [ ] Parser erreurs TypeScript/Deno
  - [ ] Retourner structured error messages avec:
    - `type`: "SyntaxError" | "RuntimeError" | "TimeoutError" | "MemoryError"
    - `message`: Description claire
    - `stack`: Stack trace (optionnel)
  - [ ] Gérer cas d'erreurs non-catchables (process crash)

- [ ] **Task 7: Implement return value serialization** (AC: #7)
  - [ ] Forcer return value JSON-serializable uniquement
  - [ ] Utiliser `JSON.stringify()` pour validation
  - [ ] Rejeter objets non-serializables (functions, symbols, etc.)
  - [ ] Retourner résultat sous forme: `{ result: any, executionTimeMs: number }`

### Phase 4: Testing & Performance (1-2h)

- [ ] **Task 8: Create unit tests for isolation** (AC: #8)
  - [ ] Test: Tentative lecture `/etc/passwd` → doit fail avec PermissionDenied
  - [ ] Test: Tentative écriture `/tmp/test.txt` → doit fail
  - [ ] Test: Tentative network access (`fetch()`) → doit fail
  - [ ] Test: Lecture `~/.agentcards/` → doit succeed (allowed path)
  - [ ] Test: Timeout enforcement → process killed après 30s
  - [ ] Test: Memory limit → process killed si heap > 512MB

- [ ] **Task 9: Performance benchmarks** (AC: #9)
  - [ ] Benchmark: Sandbox startup time < 100ms
  - [ ] Benchmark: Code execution overhead < 50ms
  - [ ] Créer test avec code simple: `return 1 + 1`
  - [ ] Mesurer: spawning time + execution time + serialization time
  - [ ] Documenter performance dans README

---

## Dev Notes

### Architecture Constraints

**Runtime Environment:**
- Deno 2.5+ required (subprocess API stable)
- TypeScript native support (no transpilation needed)
- Secure by default permissions model

**Sandbox Security Model:**
```typescript
// Allowed permissions (explicit whitelist)
--allow-env              // Environment variables (needed for Deno runtime)
--allow-read=~/.agentcards  // Read access to AgentCards data directory only

// Denied permissions (implicit blacklist)
--deny-write             // No write access anywhere
--deny-net               // No network access
--deny-run               // No subprocess spawning
--deny-ffi               // No FFI/native code
```

**Process Management:**
- Use `Deno.Command` API (stable in Deno 2+)
- stdio transport for code injection & result retrieval
- Graceful cleanup on timeout/error

### Project Structure Alignment

**New Module: `src/sandbox/`**
```
src/sandbox/
├── executor.ts       # CodeSandbox class (main implementation)
├── types.ts          # TypeScript interfaces
└── wrapper.ts        # Code wrapper template (optional helper)
```

**Integration Points:**
- `src/mcp/gateway-server.ts`: Will invoke sandbox via new `agentcards:execute_code` tool (Story 3.4)
- `src/dag/executor.ts`: Code execution can be DAG task type (Story 3.3)
- `src/telemetry/`: Log sandbox metrics (execution time, errors, resource usage)

### Testing Strategy

**Test Organization:**
```
tests/unit/sandbox/
├── executor_test.ts           # Core sandbox functionality
├── isolation_test.ts          # Security isolation tests
├── timeout_test.ts            # Timeout enforcement
├── memory_limit_test.ts       # Memory limit tests
└── serialization_test.ts      # Result serialization tests

tests/benchmarks/
└── sandbox_performance_test.ts
```

**Test Patterns (from Story 2.7):**
- Utiliser helpers de `tests/fixtures/test-helpers.ts` pour DB setup
- Mock subprocess si nécessaire (mais préférer vrais Deno subprocesses)
- Cleanup automatique après chaque test

### Learnings from Previous Story (2.7)

**From Story 2-7-end-to-end-tests-production-hardening (Status: in-progress)**

**Test Infrastructure Created:**
- Mock MCP servers disponibles dans `tests/fixtures/mock-mcp-server.ts`
- Test helpers pour DB, embeddings dans `tests/fixtures/test-helpers.ts`
- Pattern de cleanup avec `try/finally` pour ressources temporaires

**Testing Best Practices:**
- Timeout 30s par défaut pour tests E2E (applicable ici)
- Isolation tests avec DB temporaire par test
- GC forcé dans tests mémoire: `globalThis.gc?.()` pour résultats fiables

**CI/CD Pipeline:**
- Stage séparé pour unit, integration, E2E, memory, load tests
- Coverage >80% requirement (à maintenir)
- Benchmarks automatiques pour suivi performance

**Recommendations:**
- Réutiliser patterns de `tests/unit/health/health_checker_test.ts` pour tests unitaires
- S'inspirer de `tests/benchmarks/` pour benchmarks sandbox performance
- Documenter edge cases (timeout, OOM) dans code comments

[Source: stories/2-7-end-to-end-tests-production-hardening.md#Completion-Notes]

### Performance Targets

| Metric | Target | Rationale |
|--------|--------|-----------|
| Sandbox startup | <100ms | User experience (minimize latency) |
| Execution overhead | <50ms | Minimal penalty vs direct execution |
| Total for simple code | <150ms | Startup + exec + serialization |

**Optimization Strategies:**
- Cache Deno subprocess si possible (difficile, mais explorer)
- Pre-warm subprocess pool (story future si perf insuffisante)
- Minimize code wrapper overhead

### Security Considerations

**Threat Model:**
1. **Malicious code execution**: Sandbox doit empêcher accès filesystem/network
2. **Resource exhaustion**: Timeout + memory limits préviennent DoS
3. **Data leakage**: Aucun accès à données utilisateur hors `~/.agentcards`

**Mitigation:**
- Deno permissions model (whitelist explicite)
- Process isolation (subprocess séparé)
- Timeout + memory limits (resource limits)
- JSON-only serialization (pas d'objets dangereux)

**Out of Scope (Story 3.1):**
- PII detection (Story 3.5)
- Code caching (Story 3.6)
- MCP tools injection (Story 3.2)

### References

- [Epic 3 Overview](../epics.md#Epic-3-Agent-Code-Execution--Local-Processing)
- [Architecture - Security Model](../architecture.md#Security-Architecture)
- [Deno Permissions](https://docs.deno.com/runtime/fundamentals/security/)
- [Deno.Command API](https://docs.deno.com/api/deno/~/Deno.Command)

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
- `src/sandbox/executor.ts`
- `src/sandbox/types.ts`
- `tests/unit/sandbox/executor_test.ts`
- `tests/unit/sandbox/isolation_test.ts`
- `tests/unit/sandbox/timeout_test.ts`
- `tests/unit/sandbox/memory_limit_test.ts`
- `tests/unit/sandbox/serialization_test.ts`
- `tests/benchmarks/sandbox_performance_test.ts`

**Files to be Modified (MODIFIED):**
- `mod.ts` (export sandbox module)
- `README.md` (documentation sandbox usage)

**Files to be Deleted (DELETED):**
- None

---

## Change Log

- **2025-11-09**: Story drafted by BMM workflow, based on Epic 3 requirements
