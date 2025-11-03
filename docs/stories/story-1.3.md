# Story 1.3: MCP Server Discovery & Schema Extraction

**Epic:** 1 - Project Foundation & Context Optimization Engine
**Story ID:** 1.3
**Status:** TODO
**Estimated Effort:** 4-5 hours

---

## User Story

**As a** power user with 15+ MCP servers,
**I want** AgentCards to automatically discover my MCP servers and extract their tool schemas,
**So that** I don't have to manually configure each server.

---

## Acceptance Criteria

1. MCP server discovery via stdio et SSE protocols
2. Connection établie avec chaque discovered server
3. Tool schemas extracted via MCP protocol `list_tools` call
4. Schemas parsed et validated (input/output schemas, descriptions)
5. Schemas stockés dans PGlite `tool_schema` table
6. Error handling pour servers unreachable ou invalid schemas
7. Console output affiche nombre de servers discovered et tools extracted
8. Support au minimum 15 MCP servers simultanément

---

## Prerequisites

- Story 1.2 (database foundation) completed

---

## Technical Notes

### MCP Server Discovery
```typescript
interface MCPServer {
  id: string;
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  protocol: "stdio" | "sse";
}

async function discoverServers(configPath: string): Promise<MCPServer[]> {
  // Read config file (e.g., ~/.agentcards/config.yaml)
  // Parse and validate server configurations
  // Return list of servers
}
```

### Schema Extraction via MCP Protocol
```typescript
interface ToolSchema {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  outputSchema?: JSONSchema;
}

async function extractSchemas(server: MCPServer): Promise<ToolSchema[]> {
  // 1. Establish connection (stdio or SSE)
  // 2. Send list_tools request
  // 3. Parse response
  // 4. Validate schemas
  // 5. Return tool schemas
}
```

### Storage in Database
```typescript
async function storeSchemas(
  db: PGlite,
  serverId: string,
  schemas: ToolSchema[]
): Promise<void> {
  for (const schema of schemas) {
    const toolId = `${serverId}:${schema.name}`;
    await db.exec(`
      INSERT INTO tool_schema (tool_id, server_id, schema_json, cached_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (tool_id) DO UPDATE SET
        schema_json = $3,
        cached_at = NOW()
    `, [toolId, serverId, JSON.stringify(schema)]);
  }
}
```

### Error Handling
- Connection timeout: 10 seconds per server
- Retry logic: 3 attempts with exponential backoff
- Graceful degradation: Continue with other servers if one fails
- Structured logging: Log errors with server_id and error type

### Console Output Example
```
🔍 Discovering MCP servers...
✓ Found 15 servers in config
✓ Connected to filesystem-server (8 tools)
✓ Connected to github-server (12 tools)
✗ Failed to connect to broken-server (timeout)
✓ Connected to database-server (6 tools)
...
📊 Summary: 14/15 servers connected, 126 tools extracted
```

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Support for both stdio and SSE protocols
- [ ] Schemas extracted and stored in database
- [ ] Error handling tested with unreachable servers
- [ ] Unit and integration tests passing
- [ ] Successfully tested with 15+ MCP servers
- [ ] Documentation updated
- [ ] Code reviewed and merged

---

## References

- [MCP Protocol Specification](https://modelcontextprotocol.io/docs)
- [MCP list_tools Method](https://modelcontextprotocol.io/docs/specification/basic/tools)
- [JSON Schema Validation](https://json-schema.org/)
