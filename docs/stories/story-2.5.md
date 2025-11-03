# Story 2.5: Health Checks & MCP Server Monitoring

**Epic:** 2 - DAG Execution & Production Readiness
**Story ID:** 2.5
**Status:** TODO
**Estimated Effort:** 3-4 hours

---

## User Story

**As a** developer,
**I want** AgentCards to monitor MCP server health et report issues,
**So that** I know which servers are down or misconfigured.

---

## Acceptance Criteria

1. Health check implementation au startup (ping chaque MCP server)
2. Periodic health checks (every 5 minutes) durant runtime
3. Health status tracking: healthy, degraded, down
4. Console warnings pour servers unavailable
5. Automatic retry logic (3 attempts) avant marking server down
6. Health status API: `agentcards status` CLI command
7. Logs structured avec server_id, status, last_check timestamp

---

## Prerequisites

- Story 2.4 (gateway integration) completed

---

## Technical Notes

### Health Check Service
```typescript
// src/health/health-checker.ts
export type HealthStatus = "healthy" | "degraded" | "down";

export interface ServerHealth {
  serverId: string;
  serverName: string;
  status: HealthStatus;
  lastCheck: Date;
  lastSuccess: Date | null;
  consecutiveFailures: number;
  latencyMs: number | null;
  errorMessage: string | null;
}

export class HealthChecker {
  private healthMap = new Map<string, ServerHealth>();
  private checkInterval: number | null = null;
  private readonly CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;

  constructor(private mcpClients: Map<string, MCPClient>) {}

  /**
   * Perform initial health check at startup
   */
  async initialHealthCheck(): Promise<void> {
    console.log("🏥 Performing initial health check...\n");

    for (const [serverId, client] of this.mcpClients) {
      const health = await this.checkServer(serverId, client);
      this.healthMap.set(serverId, health);

      // Log status
      const icon = this.getStatusIcon(health.status);
      console.log(
        `${icon} ${health.serverName} (${serverId}): ${health.status}`
      );

      if (health.errorMessage) {
        console.log(`   └─ ${health.errorMessage}`);
      }
    }

    const summary = this.getHealthSummary();
    console.log(`\n📊 Health summary: ${summary.healthy}/${summary.total} servers healthy\n`);

    if (summary.down > 0) {
      console.warn(
        `⚠️  Warning: ${summary.down} server(s) are down. Some tools may be unavailable.`
      );
    }
  }

  /**
   * Start periodic health checks
   */
  startPeriodicChecks(): void {
    console.log("🔄 Starting periodic health checks (every 5 minutes)");

    this.checkInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.CHECK_INTERVAL_MS);
  }

  /**
   * Stop periodic health checks
   */
  stopPeriodicChecks(): void {
    if (this.checkInterval !== null) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Perform health check on all servers
   */
  private async performHealthCheck(): Promise<void> {
    console.log("🏥 Running scheduled health check...");

    for (const [serverId, client] of this.mcpClients) {
      const previousHealth = this.healthMap.get(serverId);
      const health = await this.checkServer(serverId, client);

      // Detect status change
      if (previousHealth && previousHealth.status !== health.status) {
        this.logStatusChange(previousHealth, health);
      }

      this.healthMap.set(serverId, health);
    }

    const summary = this.getHealthSummary();
    console.log(`✓ Health check complete: ${summary.healthy}/${summary.total} healthy`);
  }

  /**
   * Check individual server with retries
   */
  private async checkServer(
    serverId: string,
    client: MCPClient
  ): Promise<ServerHealth> {
    const serverName = client.serverName || serverId;
    let consecutiveFailures = 0;
    let lastError: string | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const startTime = performance.now();

        // Ping server (list_tools is a good health check)
        await client.listTools();

        const latency = performance.now() - startTime;

        return {
          serverId,
          serverName,
          status: "healthy",
          lastCheck: new Date(),
          lastSuccess: new Date(),
          consecutiveFailures: 0,
          latencyMs: latency,
          errorMessage: null,
        };
      } catch (error) {
        consecutiveFailures++;
        lastError = error.message;

        // Retry with delay
        if (attempt < this.MAX_RETRIES) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.RETRY_DELAY_MS * attempt)
          );
        }
      }
    }

    // All retries failed
    const previousHealth = this.healthMap.get(serverId);

    return {
      serverId,
      serverName,
      status: "down",
      lastCheck: new Date(),
      lastSuccess: previousHealth?.lastSuccess || null,
      consecutiveFailures: (previousHealth?.consecutiveFailures || 0) + 1,
      latencyMs: null,
      errorMessage: lastError,
    };
  }

  /**
   * Get health status for a specific server
   */
  getServerHealth(serverId: string): ServerHealth | undefined {
    return this.healthMap.get(serverId);
  }

  /**
   * Get all server health statuses
   */
  getAllHealth(): ServerHealth[] {
    return Array.from(this.healthMap.values());
  }

  /**
   * Get health summary
   */
  getHealthSummary(): {
    total: number;
    healthy: number;
    degraded: number;
    down: number;
  } {
    const statuses = Array.from(this.healthMap.values());

    return {
      total: statuses.length,
      healthy: statuses.filter((s) => s.status === "healthy").length,
      degraded: statuses.filter((s) => s.status === "degraded").length,
      down: statuses.filter((s) => s.status === "down").length,
    };
  }

  private getStatusIcon(status: HealthStatus): string {
    switch (status) {
      case "healthy":
        return "✓";
      case "degraded":
        return "⚠️ ";
      case "down":
        return "✗";
    }
  }

  private logStatusChange(
    previous: ServerHealth,
    current: ServerHealth
  ): void {
    const icon = this.getStatusIcon(current.status);
    console.warn(
      `${icon} ${current.serverName}: ${previous.status} → ${current.status}`
    );

    if (current.errorMessage) {
      console.warn(`   └─ ${current.errorMessage}`);
    }
  }
}
```

### CLI Command: `agentcards status`
```typescript
// src/cli/status.ts
export const statusCommand = new Command()
  .name("status")
  .description("Show health status of all MCP servers")
  .option("--json", "Output in JSON format")
  .option("--watch", "Watch mode (refresh every 30s)")
  .action(async (options) => {
    const db = await initializeDatabase();
    const mcpClients = await discoverAndConnectMCPServers(db);
    const healthChecker = new HealthChecker(mcpClients);

    if (options.watch) {
      // Watch mode
      while (true) {
        console.clear();
        await displayHealthStatus(healthChecker, options.json);
        await new Promise((resolve) => setTimeout(resolve, 30000));
      }
    } else {
      // One-time check
      await healthChecker.initialHealthCheck();
      await displayHealthStatus(healthChecker, options.json);
    }
  });

async function displayHealthStatus(
  healthChecker: HealthChecker,
  jsonOutput: boolean
): Promise<void> {
  const allHealth = healthChecker.getAllHealth();
  const summary = healthChecker.getHealthSummary();

  if (jsonOutput) {
    console.log(JSON.stringify({ summary, servers: allHealth }, null, 2));
    return;
  }

  // Human-readable output
  console.log("╔════════════════════════════════════════════════╗");
  console.log("║         AgentCards Health Status              ║");
  console.log("╚════════════════════════════════════════════════╝\n");

  console.log(`📊 Summary: ${summary.healthy}/${summary.total} servers healthy\n`);

  for (const health of allHealth) {
    const icon = getStatusIcon(health.status);
    const statusColor = getStatusColor(health.status);

    console.log(`${icon} ${health.serverName} (${health.serverId})`);
    console.log(`   Status: ${statusColor(health.status)}`);
    console.log(`   Last check: ${formatDate(health.lastCheck)}`);

    if (health.latencyMs !== null) {
      console.log(`   Latency: ${health.latencyMs.toFixed(1)}ms`);
    }

    if (health.errorMessage) {
      console.log(`   Error: ${health.errorMessage}`);
    }

    if (health.consecutiveFailures > 0) {
      console.log(`   Consecutive failures: ${health.consecutiveFailures}`);
    }

    console.log("");
  }

  if (summary.down > 0) {
    console.warn(
      `⚠️  ${summary.down} server(s) are down. Run 'agentcards init' to reconfigure.`
    );
  }
}

function getStatusIcon(status: HealthStatus): string {
  return status === "healthy" ? "✓" : status === "degraded" ? "⚠️ " : "✗";
}

function getStatusColor(status: HealthStatus): (text: string) => string {
  return status === "healthy"
    ? (text) => `\x1b[32m${text}\x1b[0m` // Green
    : status === "degraded"
    ? (text) => `\x1b[33m${text}\x1b[0m` // Yellow
    : (text) => `\x1b[31m${text}\x1b[0m`; // Red
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
}
```

### Integration with Gateway
```typescript
// src/mcp/gateway-server.ts
export class AgentCardsGateway {
  private healthChecker: HealthChecker;

  async start(): Promise<void> {
    // Initialize health checker
    this.healthChecker = new HealthChecker(this.mcpClients);

    // Initial health check
    await this.healthChecker.initialHealthCheck();

    // Start periodic checks
    this.healthChecker.startPeriodicChecks();

    // Start MCP server
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.log("✓ AgentCards gateway started");
  }

  async stop(): Promise<void> {
    this.healthChecker.stopPeriodicChecks();
    await this.server.close();
  }

  // Filter out down servers from tool listings
  private async handleListTools(request: any): Promise<any> {
    const healthyServers = this.healthChecker
      .getAllHealth()
      .filter((h) => h.status === "healthy")
      .map((h) => h.serverId);

    // Only return tools from healthy servers
    const tools = await this.loadToolsFromServers(healthyServers);

    return { tools };
  }
}
```

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] HealthChecker service implemented
- [ ] Initial health check at startup working
- [ ] Periodic health checks (5 min interval) working
- [ ] Retry logic (3 attempts) implemented
- [ ] `agentcards status` CLI command working
- [ ] Watch mode for real-time monitoring
- [ ] JSON output option for scripting
- [ ] Health status logged to database
- [ ] Integration with gateway (filter down servers)
- [ ] Unit tests passing
- [ ] Documentation updated
- [ ] Code reviewed and merged

---

## References

- [Health Check Patterns](https://microservices.io/patterns/observability/health-check-api.html)
- [Exponential Backoff](https://en.wikipedia.org/wiki/Exponential_backoff)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
