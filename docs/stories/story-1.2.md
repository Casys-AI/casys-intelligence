# Story 1.2: PGlite Database Foundation with pgvector

**Epic:** 1 - Project Foundation & Context Optimization Engine
**Story ID:** 1.2
**Status:** TODO
**Estimated Effort:** 3-4 hours

---

## User Story

**As a** developer,
**I want** a PGlite database with pgvector extension configured,
**So that** I can store embeddings vectoriels et perform semantic search efficiently.

---

## Acceptance Criteria

1. PGlite database initialization dans `~/.agentcards/.agentcards.db`
2. pgvector extension loaded et operational
3. Database schema créé avec tables:
   - `tool_embedding` (tool_id, embedding vector(1024), metadata)
   - `tool_schema` (tool_id, schema_json, server_id, cached_at)
   - `config` (key, value pour metadata)
4. Vector index HNSW créé sur tool_embedding.embedding avec pgvector
5. Basic CRUD operations testés (insert, query, update, delete)
6. Database migration system en place pour schema evolution future

---

## Prerequisites

- Story 1.1 (project setup) completed

---

## Technical Notes

### PGlite Setup
```typescript
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite/vector";

const db = new PGlite("~/.agentcards/.agentcards.db", {
  extensions: { vector }
});

await db.exec("CREATE EXTENSION IF NOT EXISTS vector;");
```

### Database Schema (Migration 001)
```sql
-- Tool embeddings for semantic search
CREATE TABLE tool_embedding (
  tool_id TEXT PRIMARY KEY,
  server_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  embedding vector(1024) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- HNSW index for fast vector search
CREATE INDEX idx_tool_embedding_hnsw
ON tool_embedding
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Tool schemas cache
CREATE TABLE tool_schema (
  tool_id TEXT PRIMARY KEY,
  server_id TEXT NOT NULL,
  schema_json JSONB NOT NULL,
  cached_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (tool_id) REFERENCES tool_embedding(tool_id)
);

-- Configuration key-value store
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Migration System
```typescript
interface Migration {
  version: number;
  name: string;
  up: (db: PGlite) => Promise<void>;
  down: (db: PGlite) => Promise<void>;
}

async function runMigrations(db: PGlite, migrations: Migration[]) {
  // Implementation here
}
```

### Performance Targets
- HNSW index build: <5 seconds for 1000 embeddings
- Vector query: <100ms P95 for cosine similarity search
- Database file size: ~50MB for 1000 tools with embeddings

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] PGlite database operational with pgvector
- [ ] HNSW index created and verified
- [ ] Unit tests for CRUD operations passing
- [ ] Migration system tested with up/down migrations
- [ ] Documentation for database schema added
- [ ] Code reviewed and merged

---

## References

- [PGlite Documentation](https://github.com/electric-sql/pglite)
- [pgvector Extension](https://github.com/pgvector/pgvector)
- [HNSW Index Tuning](https://github.com/pgvector/pgvector#hnsw)
