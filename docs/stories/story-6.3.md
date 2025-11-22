# Story 6.3: Live Metrics & Analytics Panel

**Status:** drafted
**Epic:** 6 - Real-time Graph Monitoring & Observability
**Estimate:** 2-3h

## User Story

As a developer, I want to see live metrics about graph health and recommendations so that I can monitor system performance and debug issues.

## Background

Actuellement, les métriques du graphe (edge count, PageRank, communities) sont invisibles. Impossible de répondre aux questions :
- Combien d'edges le graphe a-t-il appris aujourd'hui ?
- Quels sont les 10 outils les plus importants (PageRank) ?
- Quelle est la densité actuelle du graphe ?
- Quel est le workflow success rate ?

Un panel de métriques live permet de monitorer la santé du système et d'identifier rapidement les problèmes de performance ou de recommandations.

## Acceptance Criteria

- [ ] **AC1:** Metrics panel dans dashboard (sidebar ou overlay)
- [ ] **AC2:** Live metrics affichés: edge count, node count, density, alpha adaptatif, PageRank top 10, communities count, workflow success rate
- [ ] **AC3:** Graphiques time-series (Chart.js/Recharts): edge count over time, average confidence score over time, workflow execution rate
- [ ] **AC4:** API endpoint: `GET /api/metrics` retourne JSON
- [ ] **AC5:** Auto-refresh toutes les 5s (ou via SSE)
- [ ] **AC6:** Export metrics: bouton "Download CSV"
- [ ] **AC7:** Date range selector: last 1h, 24h, 7d
- [ ] **AC8:** Tests: vérifier que metrics endpoint retourne données correctes

## Technical Design

### Metrics Data Structure

```typescript
// GET /api/metrics
interface MetricsData {
  current: {
    edge_count: number;
    node_count: number;
    density: number;
    alpha: number;
    communities_count: number;
    workflow_success_rate: number;  // last 24h
  };
  top_tools: Array<{
    tool_id: string;
    tool_name: string;
    server: string;
    pagerank: number;
  }>;
  timeseries: {
    timestamps: string[];  // ISO 8601
    edge_counts: number[];
    avg_confidence_scores: number[];
    workflow_rates: number[];  // workflows/hour
  };
}
```

### Frontend Implementation (Chart.js)

```html
<!-- Add to public/dashboard.html -->
<div id="metrics-panel">
  <h2>Live Metrics</h2>

  <!-- Current Stats -->
  <div class="stats-grid">
    <div class="stat-card">
      <h3>Edges</h3>
      <p id="edge-count">-</p>
    </div>
    <div class="stat-card">
      <h3>Density</h3>
      <p id="density">-</p>
    </div>
    <div class="stat-card">
      <h3>Alpha</h3>
      <p id="alpha">-</p>
    </div>
  </div>

  <!-- Top Tools by PageRank -->
  <div class="top-tools">
    <h3>Top 10 Tools (PageRank)</h3>
    <ol id="top-tools-list"></ol>
  </div>

  <!-- Time-Series Chart -->
  <canvas id="edge-chart"></canvas>

  <!-- Export Button -->
  <button onclick="exportMetrics()">Download CSV</button>
</div>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
  // Fetch metrics
  async function updateMetrics() {
    const data = await fetch('/api/metrics?range=24h').then(r => r.json());

    // Update stats
    document.getElementById('edge-count').textContent = data.current.edge_count;
    document.getElementById('density').textContent = (data.current.density * 100).toFixed(2) + '%';
    document.getElementById('alpha').textContent = data.current.alpha.toFixed(3);

    // Update top tools list
    const list = document.getElementById('top-tools-list');
    list.innerHTML = data.top_tools
      .map(t => `<li>${t.tool_name} (${t.pagerank.toFixed(4)})</li>`)
      .join('');

    // Update chart
    renderTimeSeriesChart(data.timeseries);
  }

  function renderTimeSeriesChart(timeseries) {
    const ctx = document.getElementById('edge-chart');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: timeseries.timestamps,
        datasets: [{
          label: 'Edge Count',
          data: timeseries.edge_counts,
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }

  function exportMetrics() {
    fetch('/api/metrics?format=csv')
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `metrics-${Date.now()}.csv`;
        a.click();
      });
  }

  // Auto-refresh every 5s
  setInterval(updateMetrics, 5000);
  updateMetrics();
</script>
```

### Backend Implementation

```typescript
// src/mcp/gateway-server.ts
app.get("/api/metrics", async (req) => {
  const url = new URL(req.url);
  const range = url.searchParams.get("range") || "24h"; // 1h, 24h, 7d
  const format = url.searchParams.get("format") || "json";

  // Calculate time range
  const now = Date.now();
  const rangeMs = parseRange(range); // "24h" → 86400000ms
  const startTime = new Date(now - rangeMs);

  // Fetch timeseries from database
  const timeseries = await db.query(`
    SELECT
      date_trunc('hour', created_at) as timestamp,
      COUNT(*) as edge_count,
      AVG(confidence_score) as avg_confidence
    FROM tool_dependency
    WHERE created_at >= $1
    GROUP BY timestamp
    ORDER BY timestamp
  `, [startTime]);

  // Get current stats
  const stats = graphEngine.getStats();
  const edgeCount = graphEngine.getEdgeCount();
  const density = edgeCount / (stats.nodeCount * (stats.nodeCount - 1));
  const alpha = Math.max(0.5, 1.0 - density * 2);

  // Get top tools by PageRank
  const topTools = Array.from({ length: stats.nodeCount }, (_, i) => {
    const toolId = /* get tool id from graph */;
    return {
      tool_id: toolId,
      tool_name: /* ... */,
      server: /* ... */,
      pagerank: graphEngine.getPageRank(toolId)
    };
  })
    .sort((a, b) => b.pagerank - a.pagerank)
    .slice(0, 10);

  const metricsData = {
    current: {
      edge_count: edgeCount,
      node_count: stats.nodeCount,
      density,
      alpha,
      communities_count: new Set(Object.values(graphEngine.communities)).size,
      workflow_success_rate: /* calculate from DB */
    },
    top_tools: topTools,
    timeseries: {
      timestamps: timeseries.map(t => t.timestamp),
      edge_counts: timeseries.map(t => t.edge_count),
      avg_confidence_scores: timeseries.map(t => t.avg_confidence)
    }
  };

  if (format === "csv") {
    return new Response(convertToCSV(metricsData), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=metrics.csv"
      }
    });
  }

  return Response.json(metricsData);
});
```

## Implementation Notes

- Chart.js pour time-series (simple, CDN-friendly)
- Metrics calculés depuis DB + GraphRAGEngine
- Auto-refresh toutes les 5s via `setInterval`
- CSV export pour analyse externe (Excel, Google Sheets)
- Date range selector pour historical analysis

## Files to Create/Modify

- `public/dashboard.html` - Add metrics panel
- `src/mcp/gateway-server.ts` - Add `/api/metrics` endpoint
- `src/graphrag/graph-engine.ts` - Add `getTopToolsByPageRank()` method
- `tests/integration/metrics_api_test.ts` - API tests

## Test Plan

```bash
# Test 1: Metrics API
curl http://localhost:8080/api/metrics?range=24h
# → Should return JSON with current + timeseries

# Test 2: CSV Export
curl http://localhost:8080/api/metrics?format=csv > metrics.csv
# → Should download CSV file

# Test 3: Real-time updates
# Open dashboard → execute workflow → metrics should update within 5s

# Test 4: Date range
curl http://localhost:8080/api/metrics?range=1h
# → Should return only last hour data
```

## Dependencies

- Story 6.2: Dashboard HTML exists
- GraphRAGEngine: PageRank, communities, getStats()
