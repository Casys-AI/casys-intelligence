# Story 1.7: Migration Tool (`agentcards init`)

**Epic:** 1 - Project Foundation & Context Optimization Engine
**Story ID:** 1.7
**Status:** TODO
**Estimated Effort:** 4-5 hours

---

## User Story

**As a** power user with existing MCP configuration,
**I want** to migrate my mcp.json configuration to AgentCards automatically,
**So that** I don't have to manually reconfigure everything.

---

## Acceptance Criteria

1. CLI command `agentcards init` implemented
2. Detection automatique du claude_desktop_config.json path (OS-specific)
3. Parsing du mcp.json existant et extraction des MCP servers
4. Generation de `~/.agentcards/config.yaml` avec servers migrés
5. Embeddings generation triggered automatiquement post-migration
6. Console output avec instructions pour éditer mcp.json
7. Template affiché pour nouvelle config mcp.json (juste agentcards gateway)
8. Rollback capability si erreur durant migration
9. Dry-run mode (`--dry-run`) pour preview changes

---

## Prerequisites

- Story 1.6 (context optimization functional) completed

---

## Technical Notes

### CLI Command Implementation
```typescript
// src/cli/init.ts
import { Command } from "@cliffy/command";

export const initCommand = new Command()
  .name("init")
  .description("Migrate existing MCP configuration to AgentCards")
  .option("--dry-run", "Preview changes without applying them")
  .option("--config <path:string>", "Path to MCP config file")
  .action(async (options) => {
    const migrator = new ConfigMigrator();

    if (options.dryRun) {
      await migrator.previewMigration(options.config);
    } else {
      await migrator.migrate(options.config);
    }
  });
```

### Auto-Detection of MCP Config Path
```typescript
function detectMCPConfigPath(): string {
  const os = Deno.build.os;

  switch (os) {
    case "darwin": // macOS
      return `${Deno.env.get("HOME")}/Library/Application Support/Claude/claude_desktop_config.json`;
    case "linux":
      return `${Deno.env.get("HOME")}/.config/Claude/claude_desktop_config.json`;
    case "windows":
      return `${Deno.env.get("APPDATA")}\\Claude\\claude_desktop_config.json`;
    default:
      throw new Error(`Unsupported OS: ${os}`);
  }
}
```

### MCP Config Parsing
```typescript
interface MCPConfig {
  mcpServers: Record<string, {
    command: string;
    args?: string[];
    env?: Record<string, string>;
  }>;
}

async function parseMCPConfig(configPath: string): Promise<MCPConfig> {
  const content = await Deno.readTextFile(configPath);
  return JSON.parse(content);
}
```

### AgentCards Config Generation
```typescript
interface AgentCardsConfig {
  servers: Array<{
    id: string;
    name: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
    protocol: "stdio" | "sse";
  }>;
  context: {
    topK: number;
    minScore: number;
  };
  telemetry: {
    enabled: boolean;
  };
}

async function generateAgentCardsConfig(
  mcpConfig: MCPConfig
): Promise<AgentCardsConfig> {
  const servers = Object.entries(mcpConfig.mcpServers).map(
    ([name, config], index) => ({
      id: `server-${index}`,
      name,
      command: config.command,
      args: config.args,
      env: config.env,
      protocol: "stdio" as const,
    })
  );

  return {
    servers,
    context: {
      topK: 5,
      minScore: 0.7,
    },
    telemetry: {
      enabled: false, // Opt-in
    },
  };
}
```

### Migration Workflow
```typescript
class ConfigMigrator {
  async migrate(configPath?: string): Promise<void> {
    console.log("🔄 Starting AgentCards migration...\n");

    try {
      // 1. Detect MCP config
      const mcpConfigPath = configPath || detectMCPConfigPath();
      console.log(`✓ Found MCP config: ${mcpConfigPath}`);

      // 2. Parse existing config
      const mcpConfig = await parseMCPConfig(mcpConfigPath);
      console.log(`✓ Parsed ${Object.keys(mcpConfig.mcpServers).length} servers\n`);

      // 3. Generate AgentCards config
      const agentCardsConfig = await generateAgentCardsConfig(mcpConfig);
      const configDir = `${Deno.env.get("HOME")}/.agentcards`;
      await Deno.mkdir(configDir, { recursive: true });
      await Deno.writeTextFile(
        `${configDir}/config.yaml`,
        YAML.stringify(agentCardsConfig)
      );
      console.log(`✓ Generated AgentCards config: ${configDir}/config.yaml\n`);

      // 4. Discover servers and extract schemas
      console.log("🔍 Discovering MCP servers and extracting schemas...");
      await this.discoverAndExtractSchemas(agentCardsConfig);

      // 5. Generate embeddings
      console.log("\n🧠 Generating embeddings...");
      await this.generateEmbeddings();

      // 6. Display new MCP config template
      console.log("\n✅ Migration complete!\n");
      this.displayNewMCPConfig();

    } catch (error) {
      console.error("❌ Migration failed:", error.message);
      await this.rollback();
      throw error;
    }
  }

  private displayNewMCPConfig(): void {
    console.log("📝 Update your MCP config with:\n");
    console.log(JSON.stringify({
      mcpServers: {
        agentcards: {
          command: "agentcards",
          args: ["serve"],
        },
      },
    }, null, 2));
    console.log("\nℹ️  AgentCards now acts as a gateway to all your MCP servers!");
  }

  private async rollback(): Promise<void> {
    console.log("🔄 Rolling back migration...");
    // Remove generated config and database
    const configDir = `${Deno.env.get("HOME")}/.agentcards`;
    try {
      await Deno.remove(configDir, { recursive: true });
      console.log("✓ Rollback complete");
    } catch {
      // Ignore if already removed
    }
  }
}
```

### Dry-Run Preview
```typescript
async previewMigration(configPath?: string): Promise<void> {
  console.log("🔍 DRY RUN - No changes will be made\n");

  const mcpConfigPath = configPath || detectMCPConfigPath();
  const mcpConfig = await parseMCPConfig(mcpConfigPath);
  const agentCardsConfig = await generateAgentCardsConfig(mcpConfig);

  console.log("📊 Migration Preview:\n");
  console.log(`  MCP Config: ${mcpConfigPath}`);
  console.log(`  Servers to migrate: ${agentCardsConfig.servers.length}`);
  console.log(`\n  Servers:`);
  agentCardsConfig.servers.forEach(server => {
    console.log(`    - ${server.name} (${server.command})`);
  });

  console.log(`\n  AgentCards config will be created at:`);
  console.log(`    ~/.agentcards/config.yaml`);

  console.log(`\n  Run without --dry-run to apply migration`);
}
```

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] `agentcards init` command working
- [ ] Auto-detection of MCP config on macOS, Linux, Windows
- [ ] Config migration successful with all server configs
- [ ] Embeddings automatically generated post-migration
- [ ] Dry-run mode tested and working
- [ ] Rollback capability tested
- [ ] Clear console output with instructions
- [ ] Unit and integration tests passing
- [ ] Documentation updated with migration guide
- [ ] Code reviewed and merged

---

## References

- [Cliffy CLI Framework](https://cliffy.io/)
- [YAML for Deno](https://deno.land/std/yaml)
- [Claude Desktop Config Location](https://claude.ai/docs)
