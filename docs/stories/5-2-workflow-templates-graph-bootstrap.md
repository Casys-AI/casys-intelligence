# Story 5.2: Workflow Templates & Graph Bootstrap

Status: drafted

## Story

As a user,
I want to define workflow patterns in a simple YAML file,
so that the system can learn my common tool sequences and speculate effectively.

## Acceptance Criteria

1. Simple YAML format in `config/workflow-templates.yaml`:
   - Just `workflows: [{ name, steps: [tool1, tool2] }]`
   - No confidence scores (system calculates)
   - No parallel/sequential (gateway decides)
2. `agentcards workflows sync` CLI command imports YAML → DB
3. Entries marked with `source: 'user'` in `tool_dependency` table
4. Auto-sync on startup if file changed (checksum comparison)
5. Validation: unknown tools logged as warnings (not errors)
6. Bootstrap: if graph empty (0 edges), sync runs automatically
7. Tests cover parsing, sync, and bootstrap scenarios

## Tasks / Subtasks

- [ ] Task 1: Define YAML schema and parser (AC: #1, #5)
  - [ ] 1.1: Define TypeScript interface `WorkflowTemplate { name: string, steps: string[] }`
  - [ ] 1.2: Create `WorkflowLoader.loadFromYaml(path)` using std/yaml
  - [ ] 1.3: Validate steps array (min 2 tools per workflow)
  - [ ] 1.4: Log warnings for unknown tool IDs (don't fail)

- [ ] Task 2: Implement sync to DB (AC: #2, #3)
  - [ ] 2.1: Convert workflow steps to edges: `[A, B, C]` → `(A→B), (B→C)`
  - [ ] 2.2: Upsert to `tool_dependency` table with `source: 'user'`
  - [ ] 2.3: Set initial confidence: 0.90 for user-defined patterns
  - [ ] 2.4: Preserve existing `observed_count` on upsert (don't reset)

- [ ] Task 3: Create CLI command (AC: #2, #4)
  - [ ] 3.1: Add `agentcards workflows sync` to CLI
  - [ ] 3.2: Store file checksum in DB (`adaptive_config` table)
  - [ ] 3.3: On startup, compare checksum → auto-sync if changed
  - [ ] 3.4: Add `--force` flag to sync even if unchanged

- [ ] Task 4: Bootstrap on empty graph (AC: #6)
  - [ ] 4.1: Check edge count in `tool_dependency` on startup
  - [ ] 4.2: If 0 edges and file exists → auto-run sync
  - [ ] 4.3: Log: "Bootstrapping graph from workflow-templates.yaml"

- [ ] Task 5: Add tests (AC: #7)
  - [ ] 5.1: Unit test: YAML parsing with valid/invalid formats
  - [ ] 5.2: Unit test: steps → edges conversion
  - [ ] 5.3: Integration test: sync creates DB entries with source='user'
  - [ ] 5.4: Integration test: auto-bootstrap when graph empty
  - [ ] 5.5: Unit test: checksum comparison triggers/skips sync

## Dev Notes

### Architecture Context

Story 5-2 provides the **user interface** for defining workflow patterns. Story 3.5-1 **consumes** these patterns for speculation.

**Separation of concerns:**
- 5-2 = YAML file format + sync to DB
- 3.5-1 = Speculation engine + learning + export

### Simple YAML Format (decided in 3.5-1 brainstorm)

```yaml
# config/workflow-templates.yaml
workflows:
  - name: parse_file
    steps: [file:read, json:parse]

  - name: web_research
    steps: [web:search, web:fetch, text:summarize]

  - name: analyze_screenshot
    steps: [screenshot:capture, image:analyze, text:extract]
```

**Design decisions:**
- No `confidence` in YAML → system calculates from success rate
- No `parallel`/`sequential` → gateway optimizes automatically
- Just tool sequences → simplest possible format for users

### Edges Conversion

```
steps: [A, B, C, D]
        ↓
edges: (A→B), (B→C), (C→D)
```

Each consecutive pair becomes an edge in `tool_dependency`.

### DB Schema (existing)

```sql
-- From migration 003
CREATE TABLE tool_dependency (
  from_tool_id TEXT NOT NULL,
  to_tool_id TEXT NOT NULL,
  observed_count INTEGER DEFAULT 1,
  confidence_score REAL DEFAULT 0.5,
  last_observed TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (from_tool_id, to_tool_id)
);
```

**Note:** Need to add `source` column via migration:
```sql
ALTER TABLE tool_dependency ADD COLUMN source TEXT DEFAULT 'learned';
```

### Source Values

- `'user'` = Defined in workflow-templates.yaml (this story)
- `'learned'` = Discovered by speculation (Story 3.5-1)

### References

- [Source: docs/epics.md#story-52-workflow-templates-graph-bootstrap]
- [Source: docs/stories/3.5-1-dag-suggester-speculative-execution.md] (architecture decisions)
- [Source: src/db/migrations/003_graphrag_tables.sql]
- [Source: src/graphrag/graph-engine.ts]

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

