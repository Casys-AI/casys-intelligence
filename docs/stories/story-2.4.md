# Story 2.4: MCP Gateway Integration avec Claude Code

**Epic:** 2 - DAG Execution & Production Readiness
**Story ID:** 2.4
**Status:** TODO
**Estimated Effort:** 5-6 hours

---

## User Story

**As a** Claude Code user,
**I want** AgentCards to act as a transparent MCP gateway,
**So that** Claude can interact with all my MCP servers via a single entry point.

---

## Acceptance Criteria

1. MCP protocol server implementation (stdio mode primary)
2. AgentCards expose MCP server interface compatible avec Claude Code
3. Requests de Claude interceptés par gateway
4. Vector search → load schemas → execute tools → return results
5. Transparent proxying: Claude voit AgentCards comme un seul MCP server
6. Support `list_tools`, `call_tool`, `get_prompt` methods (MCP spec)
7. Error handling: MCP-compliant error responses
8. Integration test avec mock Claude client

---

## Prerequisites

- Story 2.3 (SSE streaming) completed
- Story 1.6 (context optimization) completed

---

## Technical Notes

### MCP Server Implementation
```typescript
// src/mcp/gateway-server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

export class AgentCardsGateway {
  private server: Server;
  private graphEngine: GraphRAGEngine;
  private vectorSearch: VectorSearch;
  private executor: StreamingExecutor;

  constructor(
    private db: PGlite,
    private mcpClients: Map<string, MCPClient>
  ) {
    this.server = new Server(
      {
        name: "agentcards",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
          prompts: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Handler: list_tools
    this.server.setRequestHandler("tools/list", async (request) => {
      return await this.handleListTools(request);
    });

    // Handler: call_tool
    this.server.setRequestHandler("tools/call", async (request) => {
      return await this.handleCallTool(request);
    });

    // Handler: get_prompt (optional)
    this.server.setRequestHandler("prompts/get", async (request) => {
      return await this.handleGetPrompt(request);
    });
  }

  /**
   * Handler: list_tools
   * Returns relevant tools based on optional query context
   */
  private async handleListTools(request: any): Promise<any> {
    try {
      // If query context provided, use semantic search
      const query = request.params?.query;

      let tools: ToolSchema[];

      if (query) {
        // Semantic search for relevant tools
        const results = await this.vectorSearch.searchTools(query, 10);
        tools = results.map((r) => r.schema);
      } else {
        // Return all tools (cache warning: context saturation)
        console.warn("⚠️  list_tools without query - returning all tools");
        tools = await this.loadAllTools();
      }

      return {
        tools: tools.map((schema) => ({
          name: schema.name,
          description: schema.description,
          inputSchema: schema.inputSchema,
        })),
      };
    } catch (error) {
      return {
        error: {
          code: -32603,
          message: `Failed to list tools: ${error.message}`,
        },
      };
    }
  }

  /**
   * Handler: call_tool
   * Supports both single tool and workflow execution
   */
  private async handleCallTool(request: any): Promise<any> {
    try {
      const { name, arguments: args } = request.params;

      // Check if this is a workflow request
      if (name === "agentcards:execute_workflow") {
        return await this.handleWorkflowExecution(args);
      }

      // Single tool execution (proxy to underlying MCP server)
      const [serverId, toolName] = name.split(":");
      const client = this.mcpClients.get(serverId);

      if (!client) {
        return {
          error: {
            code: -32602,
            message: `Unknown server: ${serverId}`,
          },
        };
      }

      const result = await client.callTool(toolName, args);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        error: {
          code: -32603,
          message: `Tool execution failed: ${error.message}`,
        },
      };
    }
  }

  /**
   * Workflow execution with GraphRAG assistance
   */
  private async handleWorkflowExecution(args: any): Promise<any> {
    const { intent, workflow } = args;

    // Case 1: Explicit workflow provided
    if (workflow) {
      const result = await this.executor.execute(workflow);
      return this.formatExecutionResult(result);
    }

    // Case 2: Intent-based (GraphRAG suggestion)
    if (intent) {
      const suggester = new DAGSuggester(this.graphEngine, this.vectorSearch);
      const suggestion = await suggester.suggestDAG({ text: intent });

      if (!suggestion) {
        return {
          error: {
            code: -32603,
            message: "No workflow pattern found. Please provide explicit workflow.",
          },
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              mode: "suggestion",
              suggested_dag: suggestion.dagStructure,
              confidence: suggestion.confidence,
              rationale: suggestion.rationale,
              alternatives: suggestion.alternatives,
            }, null, 2),
          },
        ],
      };
    }

    return {
      error: {
        code: -32602,
        message: "Either 'intent' or 'workflow' must be provided",
      },
    };
  }

  private formatExecutionResult(result: ExecutionResult): any {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            status: "completed",
            results: result.results,
            execution_time_ms: result.executionTimeMs,
            parallelization_layers: result.parallelizationLayers,
            errors: result.errors,
          }, null, 2),
        },
      ],
    };
  }

  /**
   * Start gateway server with stdio transport
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.log("✓ AgentCards gateway started (stdio mode)");
    console.log("  Claude Code can now connect to agentcards");
  }
}
```

### MCP Configuration for Claude Code
```json
// ~/.config/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "agentcards": {
      "command": "agentcards",
      "args": ["serve"]
    }
  }
}
```

### CLI Command: `agentcards serve`
```typescript
// src/cli/serve.ts
export const serveCommand = new Command()
  .name("serve")
  .description("Start AgentCards MCP gateway server")
  .option("--port <port:number>", "HTTP port (optional, stdio is default)")
  .action(async (options) => {
    // Initialize components
    const db = await initializeDatabase();
    const mcpClients = await discoverAndConnectMCPServers(db);
    const graphEngine = new GraphRAGEngine(db);
    await graphEngine.syncFromDatabase();

    // Start gateway
    const gateway = new AgentCardsGateway(db, mcpClients);
    await gateway.start();

    // Keep process alive
    await new Promise(() => {}); // Run forever
  });
```

### Transparent Proxying Example
```typescript
// Claude Code sees AgentCards as single server with all tools

// Claude's perspective:
// agentcards:filesystem:read
// agentcards:github:create_issue
// agentcards:database:query
// agentcards:execute_workflow (special)

// AgentCards internally routes to:
// filesystem → filesystem-server MCP client
// github → github-server MCP client
// database → database-server MCP client
// execute_workflow → internal DAG executor
```

### Error Handling (MCP-Compliant)
```typescript
// MCP error codes
const MCPErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
};

function formatMCPError(code: number, message: string, data?: any) {
  return {
    error: {
      code,
      message,
      data,
    },
  };
}

// Usage
if (!args.intent && !args.workflow) {
  return formatMCPError(
    MCPErrorCodes.INVALID_PARAMS,
    "Missing required parameter: 'intent' or 'workflow'",
    { received: Object.keys(args) }
  );
}
```

### Integration Test
```typescript
Deno.test("MCP Gateway - list_tools", async () => {
  const gateway = await setupTestGateway();

  const response = await gateway.server.request({
    method: "tools/list",
    params: { query: "read files" },
  });

  assert(response.tools.length > 0);
  assert(response.tools.some((t) => t.name.includes("filesystem")));
});

Deno.test("MCP Gateway - call_tool (single)", async () => {
  const gateway = await setupTestGateway();

  const response = await gateway.server.request({
    method: "tools/call",
    params: {
      name: "filesystem:read",
      arguments: { path: "/test.txt" },
    },
  });

  assert(response.content);
  assert(response.content[0].type === "text");
});

Deno.test("MCP Gateway - execute_workflow", async () => {
  const gateway = await setupTestGateway();

  const workflow = {
    tasks: [
      { id: "t1", tool: "filesystem:read", arguments: { path: "/config.json" }, depends_on: [] },
      { id: "t2", tool: "json:parse", arguments: { json: "$OUTPUT[t1]" }, depends_on: ["t1"] },
    ],
  };

  const response = await gateway.server.request({
    method: "tools/call",
    params: {
      name: "agentcards:execute_workflow",
      arguments: { workflow },
    },
  });

  const result = JSON.parse(response.content[0].text);
  assert(result.status === "completed");
  assert(result.results.length === 2);
});
```

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] MCP server implementation working
- [ ] stdio transport integrated
- [ ] list_tools handler functional
- [ ] call_tool handler functional (single + workflow)
- [ ] Transparent proxying to underlying MCP servers
- [ ] MCP-compliant error responses
- [ ] `agentcards serve` CLI command working
- [ ] Integration tests passing
- [ ] Documentation for Claude Code setup
- [ ] Code reviewed and merged

---

## References

- [MCP Protocol Specification](https://modelcontextprotocol.io/docs/specification)
- [MCP SDK Server](https://github.com/modelcontextprotocol/typescript-sdk)
- [Claude Desktop Configuration](https://docs.anthropic.com/claude/docs/mcp-servers)
