# Story 1.4: Embeddings Generation with BGE-Large-EN-v1.5

**Epic:** 1 - Project Foundation & Context Optimization Engine
**Story ID:** 1.4
**Status:** TODO
**Estimated Effort:** 3-4 hours

---

## User Story

**As a** developer,
**I want** tool schemas to be converted into vector embeddings using BGE-Large-EN-v1.5 locally,
**So that** I can perform semantic search without relying on external APIs.

---

## Acceptance Criteria

1. BGE-Large-EN-v1.5 model downloaded et loaded (via @xenova/transformers)
2. Tool schemas (name + description + parameters) concatenés en text input
3. Embeddings (1024-dim) générés pour chaque tool
4. Embeddings stockés dans `tool_embeddings` table avec metadata
5. Progress bar affichée durant génération (peut prendre ~60s pour 100+ tools)
6. Embeddings cachés (pas de régénération si schema unchanged)
7. Total generation time <2 minutes pour 200 tools

---

## Prerequisites

- Story 1.3 (schema extraction) completed

---

## Technical Notes

### BGE-Large-EN-v1.5 Model Loading
```typescript
import { pipeline } from "@xenova/transformers";

class EmbeddingModel {
  private model: any;

  async load(): Promise<void> {
    console.log("🔄 Loading BGE-Large-EN-v1.5 model...");
    this.model = await pipeline(
      "feature-extraction",
      "BAAI/bge-large-en-v1.5"
    );
    console.log("✓ Model loaded successfully");
  }

  async encode(text: string): Promise<number[]> {
    const output = await this.model(text, {
      pooling: "mean",
      normalize: true,
    });
    return Array.from(output.data);
  }
}
```

### Text Concatenation for Tool Schemas
```typescript
function schemaToText(schema: ToolSchema): string {
  // Concatenate: name + description + parameter names + parameter descriptions
  const parts = [
    schema.name,
    schema.description,
    ...Object.entries(schema.inputSchema.properties || {}).map(
      ([name, prop]) => `${name}: ${prop.description || ""}`
    ),
  ];
  return parts.filter(Boolean).join(" | ");
}
```

### Embedding Generation with Progress
```typescript
async function generateEmbeddings(
  db: PGlite,
  model: EmbeddingModel
): Promise<void> {
  // 1. Fetch all schemas from tool_schema table
  const schemas = await db.query("SELECT * FROM tool_schema");

  // 2. Initialize progress bar
  const progress = new ProgressBar(schemas.length);

  // 3. Generate embeddings
  for (const schema of schemas) {
    // Check if embedding already exists (caching)
    const existing = await db.query(
      "SELECT tool_id FROM tool_embedding WHERE tool_id = $1",
      [schema.tool_id]
    );

    if (existing.length > 0) {
      progress.increment();
      continue;
    }

    // Generate embedding
    const text = schemaToText(JSON.parse(schema.schema_json));
    const embedding = await model.encode(text);

    // Store in database
    await db.exec(`
      INSERT INTO tool_embedding (tool_id, server_id, tool_name, embedding, metadata)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      schema.tool_id,
      schema.server_id,
      JSON.parse(schema.schema_json).name,
      `[${embedding.join(",")}]`,
      JSON.stringify({ cached_at: new Date().toISOString() })
    ]);

    progress.increment();
  }

  console.log("✓ Embeddings generated successfully");
}
```

### Caching Strategy
- Check if `tool_id` exists in `tool_embedding` table
- Skip if embedding exists AND schema hasn't changed
- Invalidate cache if `tool_schema.cached_at` > `tool_embedding.created_at`

### Performance Benchmarks
- Single embedding generation: ~300-500ms
- Batch of 100 tools: ~40-60 seconds
- Batch of 200 tools: ~80-120 seconds (meets <2 min target)

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] BGE-Large-EN-v1.5 model loaded successfully
- [ ] Embeddings generated for all tool schemas
- [ ] Progress bar displays during generation
- [ ] Caching mechanism prevents re-generation
- [ ] Performance target achieved (<2 min for 200 tools)
- [ ] Unit tests for embedding generation passing
- [ ] Documentation updated
- [ ] Code reviewed and merged

---

## References

- [BGE-Large-EN-v1.5 Model](https://huggingface.co/BAAI/bge-large-en-v1.5)
- [@xenova/transformers](https://github.com/xenova/transformers.js)
- [Sentence Embeddings Best Practices](https://www.sbert.net/)
