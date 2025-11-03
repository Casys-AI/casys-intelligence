# Story 1.8: Basic Logging & Telemetry Backend

**Epic:** 1 - Project Foundation & Context Optimization Engine
**Story ID:** 1.8
**Status:** TODO
**Estimated Effort:** 2-3 hours

---

## User Story

**As a** developer,
**I want** structured logging et métriques telemetry opt-in,
**So that** I can debug issues et measure success metrics (context usage, latency).

---

## Acceptance Criteria

1. Structured logging avec std/log (Deno standard library)
2. Log levels: error, warn, info, debug
3. Log output: console + file (`~/.agentcards/logs/agentcards.log`)
4. Telemetry table dans PGlite: `metrics` (timestamp, metric_name, value)
5. Metrics tracked: context_usage_pct, query_latency_ms, tools_loaded_count
6. Opt-in consent prompt au premier launch (telemetry disabled by default)
7. CLI flag `--telemetry` pour enable/disable
8. Privacy: aucune data sensitive (queries, schemas) ne quitte local machine

---

## Prerequisites

- Story 1.7 (migration tool ready) completed

---

## Technical Notes

### Structured Logging Setup
```typescript
import * as log from "https://deno.land/std/log/mod.ts";

await log.setup({
  handlers: {
    console: new log.handlers.ConsoleHandler("DEBUG", {
      formatter: (record) => {
        return `[${record.levelName}] ${record.datetime.toISOString()} - ${record.msg}`;
      },
    }),

    file: new log.handlers.FileHandler("INFO", {
      filename: `${Deno.env.get("HOME")}/.agentcards/logs/agentcards.log`,
      formatter: (record) => {
        return JSON.stringify({
          level: record.levelName,
          timestamp: record.datetime.toISOString(),
          message: record.msg,
          ...record.args,
        });
      },
    }),
  },

  loggers: {
    default: {
      level: "DEBUG",
      handlers: ["console", "file"],
    },

    // Specific loggers
    mcp: {
      level: "INFO",
      handlers: ["console", "file"],
    },

    vector: {
      level: "DEBUG",
      handlers: ["file"],
    },
  },
});

// Usage
const logger = log.getLogger("default");
logger.info("AgentCards started");
logger.error("Failed to connect to MCP server", { serverId: "github" });
```

### Metrics Table Schema
```sql
CREATE TABLE metrics (
  id SERIAL PRIMARY KEY,
  metric_name TEXT NOT NULL,
  value REAL NOT NULL,
  metadata JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_metrics_name_timestamp
ON metrics (metric_name, timestamp DESC);
```

### Telemetry System
```typescript
class TelemetryService {
  private enabled: boolean;

  constructor(private db: PGlite) {
    this.enabled = this.loadTelemetryPreference();
  }

  async track(metricName: string, value: number, metadata?: Record<string, any>): Promise<void> {
    if (!this.enabled) return;

    await this.db.exec(`
      INSERT INTO metrics (metric_name, value, metadata, timestamp)
      VALUES ($1, $2, $3, NOW())
    `, [metricName, value, JSON.stringify(metadata || {})]);

    log.debug(`Tracked metric: ${metricName} = ${value}`, metadata);
  }

  private loadTelemetryPreference(): boolean {
    try {
      const config = Deno.readTextFileSync(
        `${Deno.env.get("HOME")}/.agentcards/config.yaml`
      );
      const parsed = YAML.parse(config);
      return parsed.telemetry?.enabled ?? false;
    } catch {
      return false; // Default to disabled
    }
  }

  async promptConsent(): Promise<void> {
    console.log("\n📊 Telemetry & Analytics");
    console.log("─────────────────────────");
    console.log("AgentCards can collect anonymous usage metrics to improve the product.");
    console.log("Metrics include: context usage %, query latency, tool counts.");
    console.log("NO sensitive data (queries, schemas, outputs) is collected.\n");

    const response = prompt("Enable telemetry? (y/N):", "N");
    this.enabled = response?.toLowerCase() === "y";

    await this.saveTelemetryPreference(this.enabled);

    if (this.enabled) {
      console.log("✓ Telemetry enabled. Thank you!\n");
    } else {
      console.log("✓ Telemetry disabled. You can enable it later with --telemetry\n");
    }
  }

  private async saveTelemetryPreference(enabled: boolean): Promise<void> {
    const configPath = `${Deno.env.get("HOME")}/.agentcards/config.yaml`;
    const config = YAML.parse(await Deno.readTextFile(configPath));
    config.telemetry = { enabled };
    await Deno.writeTextFile(configPath, YAML.stringify(config));
  }
}
```

### Key Metrics Tracked
```typescript
// 1. Context Usage Percentage
await telemetry.track("context_usage_pct", 2.5, {
  toolsLoaded: 5,
  estimatedTokens: 2500,
});

// 2. Query Latency
await telemetry.track("query_latency_ms", 85, {
  phase: "vector_search",
  toolCount: 5,
});

// 3. Tools Loaded Count
await telemetry.track("tools_loaded_count", 5, {
  queryIntent: "file operations",
});

// 4. Cache Hit Rate
await telemetry.track("cache_hit_rate", 0.65, {
  cacheSize: 50,
  totalRequests: 100,
});

// 5. MCP Server Health
await telemetry.track("mcp_server_health", 0.93, {
  healthyServers: 14,
  totalServers: 15,
});
```

### CLI Integration
```typescript
// Main CLI entry point
const cli = new Command()
  .name("agentcards")
  .version("1.0.0")
  .description("AgentCards - MCP Context Optimizer & Parallel Gateway")
  .globalOption("--telemetry", "Enable telemetry (opt-in)")
  .globalOption("--no-telemetry", "Disable telemetry")
  .action(async (options) => {
    const telemetry = new TelemetryService(db);

    // Override preference if CLI flag provided
    if (options.telemetry !== undefined) {
      await telemetry.saveTelemetryPreference(options.telemetry);
    }

    // Prompt for consent on first run
    if (isFirstRun()) {
      await telemetry.promptConsent();
    }
  });
```

### Privacy Guarantees
**What is tracked:**
- Aggregated metrics (counts, percentages, latencies)
- Tool counts and performance metrics
- Error counts (no error messages)

**What is NOT tracked:**
- User queries or prompts
- Tool schemas or outputs
- File paths or sensitive data
- Personal information

**Local-only:**
- All metrics stored locally in PGlite
- No external API calls
- No third-party analytics services

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Structured logging with console + file output
- [ ] Log rotation implemented (max 10MB per file)
- [ ] Telemetry system with opt-in consent
- [ ] Key metrics tracked (context usage, latency, etc.)
- [ ] CLI flags for telemetry control tested
- [ ] Privacy guarantees documented
- [ ] Unit tests for logging and telemetry
- [ ] Documentation updated
- [ ] Code reviewed and merged

---

## References

- [Deno std/log](https://deno.land/std/log/mod.ts)
- [Structured Logging Best Practices](https://www.loggly.com/ultimate-guide/structured-logging/)
- [Privacy-First Analytics](https://plausible.io/privacy-focused-web-analytics)
