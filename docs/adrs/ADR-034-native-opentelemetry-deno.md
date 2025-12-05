# ADR-034: Native OpenTelemetry Integration (Deno 2.2+)

**Status:** Proposed
**Date:** 2025-12-05
**Deciders:** Architecture Team
**Tags:** observability, telemetry, deno, otel

## Context

AgentCards dispose actuellement d'une infrastructure de télémétrie custom:

- `src/telemetry/logger.ts` - Logging structuré avec niveaux
- `src/telemetry/telemetry.ts` - Métriques et spans custom
- `src/telemetry/index.ts` - Exports centralisés
- Sentry integration (ADR-011) pour error tracking
- Stack monitoring: Prometheus + Grafana + Loki (`monitoring/`)

**Problème:** Notre implémentation custom nécessite du code boilerplate pour:
- Créer des spans manuellement
- Propager le context entre services
- Exporter vers différents backends

**Opportunité:** Deno 2.2 (Février 2025) introduit OpenTelemetry natif via `--unstable-otel`.

## Decision

Adopter OpenTelemetry natif de Deno pour simplifier l'observabilité et améliorer la qualité des traces.

### Fonctionnalités Deno OTEL

```bash
# Activation simple via flag
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317 \
deno run --unstable-otel src/main.ts serve
```

**Traces automatiques:**
- HTTP requests (fetch, Deno.serve)
- Database queries (si supporté)
- Console logs convertis en OTEL logs

**Configuration via variables d'environnement:**
```bash
OTEL_SERVICE_NAME=agentcards
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
OTEL_EXPORTER_OTLP_PROTOCOL=grpc  # ou http/protobuf
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1  # 10% sampling en prod
```

### Architecture Cible

```
┌─────────────────────────────────────────────────────────────┐
│  AgentCards (Deno --unstable-otel)                          │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ MCP Gateway │  │ DAG Engine  │  │ Sandbox Executor    │  │
│  │  (traces)   │  │  (traces)   │  │  (traces)           │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                    │             │
│         └────────────────┼────────────────────┘             │
│                          ▼                                  │
│              ┌───────────────────────┐                      │
│              │ OTEL Auto-Instrumentation                    │
│              │ (spans, metrics, logs)│                      │
│              └───────────┬───────────┘                      │
└──────────────────────────┼──────────────────────────────────┘
                           │ OTLP (gRPC/HTTP)
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  OTEL Collector (optionnel, ou direct vers backends)         │
└──────────────────────────┬───────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   ┌──────────┐     ┌──────────┐      ┌──────────┐
   │  Tempo   │     │ Prometheus│      │  Loki    │
   │ (traces) │     │ (metrics) │      │  (logs)  │
   └──────────┘     └──────────┘      └──────────┘
         │                 │                 │
         └─────────────────┼─────────────────┘
                           ▼
                    ┌──────────────┐
                    │   Grafana    │
                    │ (dashboards) │
                    └──────────────┘
```

### Migration Progressive

#### Phase 1: Activation (Quick Win)

```diff
# deno.json tasks
- "dev:api": "deno run --watch --allow-all src/main.ts serve"
+ "dev:api": "deno run --watch --allow-all --unstable-otel src/main.ts serve"
```

```yaml
# docker-compose.yml - ajout OTEL collector
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    ports:
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP
    volumes:
      - ./monitoring/otel-config.yaml:/etc/otelcol/config.yaml
```

#### Phase 2: Custom Spans (Enhancement)

```typescript
// src/telemetry/otel.ts - wrapper pour spans custom
import { trace } from "npm:@opentelemetry/api";

const tracer = trace.getTracer("agentcards", "0.1.0");

export function withSpan<T>(
  name: string,
  fn: () => Promise<T>,
  attributes?: Record<string, string>
): Promise<T> {
  return tracer.startActiveSpan(name, async (span) => {
    if (attributes) {
      span.setAttributes(attributes);
    }
    try {
      return await fn();
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

// Usage dans DAG executor
await withSpan("dag.execute", async () => {
  // ...
}, { "dag.task_count": String(tasks.length) });
```

#### Phase 3: Performance API Integration (Native Timing)

Le codebase utilise **60+ occurrences** du pattern manuel:
```typescript
const startTime = performance.now();
await doWork();
const duration = performance.now() - startTime;
```

Avec `performance.mark/measure` + OTEL, ces métriques sont auto-exportées:

```typescript
// src/telemetry/perf.ts - Wrapper Performance API
export function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  attributes?: Record<string, string>
): Promise<T> {
  const markStart = `${name}-start`;
  const markEnd = `${name}-end`;

  performance.mark(markStart);

  return fn()
    .then((result) => {
      performance.mark(markEnd);
      const measure = performance.measure(name, markStart, markEnd);

      // Optionnel: log structuré avec attributs
      if (attributes) {
        console.debug(JSON.stringify({
          type: "measure",
          name,
          duration: measure.duration,
          ...attributes
        }));
      }

      return result;
    })
    .finally(() => {
      // Cleanup marks
      performance.clearMarks(markStart);
      performance.clearMarks(markEnd);
    });
}

// Usage - remplace le pattern manuel
await measureAsync("dag.task.execute", async () => {
  return await executor.run(task);
}, { taskId: task.id, layer: String(layer) });
```

**PerformanceObserver pour collecte centralisée:**

```typescript
// src/telemetry/perf-observer.ts
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    // Auto-collecté par OTEL si --unstable-otel actif
    // Sinon, export manuel vers Prometheus/logs
    metrics.histogram("operation_duration_ms", entry.duration, {
      operation: entry.name,
    });
  }
});

// Observer toutes les mesures
observer.observe({ entryTypes: ["measure"] });

export { observer };
```

**Fichiers à refactorer (priorité haute):**

| Fichier | Occurrences | Impact |
|---------|-------------|--------|
| `src/sandbox/executor.ts` | 8 | Timing sandbox execution |
| `src/graphrag/graph-engine.ts` | 6 | Graph sync/compute |
| `src/sandbox/worker-bridge.ts` | 5 | RPC calls |
| `src/vector/embeddings.ts` | 5 | Embedding generation |
| `src/dag/streaming.ts` | 4 | Task streaming |

#### Phase 4: Coexistence avec Sentry

```typescript
// Sentry reste pour error tracking enrichi
// OTEL pour traces distribuées
// Performance API pour métriques de timing

// src/telemetry/index.ts
export { initSentry } from "./sentry.ts";      // Garde Sentry
export { withSpan } from "./otel.ts";          // Ajoute OTEL spans
export { measureAsync } from "./perf.ts";      // Performance timing
```

### Intégration Points Clés

| Composant | Traces Automatiques | Spans Custom Recommandés |
|-----------|---------------------|--------------------------|
| `src/mcp/gateway-server.ts` | HTTP requests | Tool execution duration |
| `src/dag/executor.ts` | - | Task execution, layer timing |
| `src/sandbox/worker-bridge.ts` | - | Code execution, RPC calls |
| `src/graphrag/graph-engine.ts` | - | Graph queries, suggestions |
| `src/vector/search.ts` | - | Embedding generation, search |

### Configuration Recommandée

```yaml
# monitoring/otel-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 1s
    send_batch_size: 1024

exporters:
  otlp/tempo:
    endpoint: tempo:4317
    tls:
      insecure: true
  prometheus:
    endpoint: 0.0.0.0:8889
  loki:
    endpoint: http://loki:3100/loki/api/v1/push

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/tempo]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [loki]
```

## Consequences

### Positives

- **Zero-code traces** pour HTTP et fetch
- **Standard OTEL** compatible avec tout l'écosystème (Jaeger, Zipkin, Datadog, etc.)
- **Propagation automatique** du context entre services
- **Moins de code custom** dans `src/telemetry/`
- **Corrélation logs/traces/metrics** native

### Negatives

- Flag `--unstable-otel` requis (sera stable dans Deno 2.3+)
- Overhead potentiel en production (sampling recommandé)
- Nécessite OTEL Collector ou backend compatible

### Risks

| Risk | Mitigation |
|------|------------|
| API unstable change | Pin Deno version, test avant upgrade |
| Performance overhead | Sampling 10% en prod, 100% en dev |
| Sentry duplication | Configurer Sentry pour ignorer les errors déjà tracées |

## Implementation

### Story Proposée

**Story: Native OTEL Integration**

1. Ajouter `--unstable-otel` aux tasks dev/prod dans `deno.json`
2. Créer `monitoring/otel-config.yaml` pour le collector
3. Mettre à jour `docker-compose.yml` avec OTEL collector
4. Créer `src/telemetry/otel.ts` avec helper `withSpan()`
5. Instrumenter les 5 composants clés (gateway, dag, sandbox, graphrag, vector)
6. Dashboard Grafana avec traces Tempo

**Estimation:** 1-2 jours

**Prerequisites:** Deno 2.2+ (vérifier version actuelle)

## References

- [Deno Blog: Built-in OpenTelemetry](https://deno.com/blog/v2.2)
- [Deno OTEL Documentation](https://docs.deno.com/runtime/fundamentals/telemetry/)
- [OpenTelemetry Specification](https://opentelemetry.io/docs/specs/otel/)
- [ADR-011: Sentry Integration](./accepted/ADR-011-sentry-integration.md)
- `src/telemetry/` - Current telemetry implementation
- `monitoring/` - Prometheus/Grafana/Loki stack
