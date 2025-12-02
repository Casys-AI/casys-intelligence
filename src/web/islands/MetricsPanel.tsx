/**
 * MetricsPanel Island - Story 6.3
 *
 * Interactive panel displaying live metrics about graph health and recommendations.
 * Fetches data from /api/metrics endpoint and updates via polling or SSE.
 *
 * @module web/islands/MetricsPanel
 */

import { useEffect, useState, useRef } from "preact/hooks";

// =============================================================================
// Types
// =============================================================================

interface MetricsPanelProps {
  apiBase: string;
  position?: "sidebar" | "overlay";
}

type MetricsTimeRange = "1h" | "24h" | "7d";

interface TimeSeriesPoint {
  timestamp: string;
  value: number;
}

interface GraphMetricsResponse {
  current: {
    node_count: number;
    edge_count: number;
    density: number;
    adaptive_alpha: number;
    communities_count: number;
    pagerank_top_10: Array<{ tool_id: string; score: number }>;
  };
  timeseries: {
    edge_count: TimeSeriesPoint[];
    avg_confidence: TimeSeriesPoint[];
    workflow_rate: TimeSeriesPoint[];
  };
  period: {
    range: MetricsTimeRange;
    workflows_executed: number;
    workflows_success_rate: number;
    new_edges_created: number;
    new_nodes_added: number;
  };
}

// =============================================================================
// MetricsPanel Component
// =============================================================================

export default function MetricsPanel({ apiBase: _apiBase, position = "sidebar" }: MetricsPanelProps) {
  // Hard-code gateway URL - Fresh props don't serialize Deno.env properly
  const apiBase = "http://localhost:3001";

  const [metrics, setMetrics] = useState<GraphMetricsResponse | null>(null);
  const [dateRange, setDateRange] = useState<MetricsTimeRange>("24h");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [activeChart, setActiveChart] = useState<"edges" | "confidence" | "workflows">("edges");

  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null);

  // Fetch metrics from API
  const fetchMetrics = async () => {
    try {
      const res = await fetch(`${apiBase}/api/metrics?range=${dateRange}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data: GraphMetricsResponse = await res.json();
      setMetrics(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch metrics");
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and polling setup
  useEffect(() => {
    fetchMetrics();

    // Poll every 5 seconds
    const interval = setInterval(fetchMetrics, 5000);

    // SSE for real-time updates
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`${apiBase}/events/stream`);

      eventSource.addEventListener("metrics_updated", (event: any) => {
        const data = JSON.parse(event.data);
        setMetrics((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            current: {
              ...prev.current,
              edge_count: data.edge_count ?? prev.current.edge_count,
              node_count: data.node_count ?? prev.current.node_count,
              density: data.density ?? prev.current.density,
              pagerank_top_10: data.pagerank_top_10 ?? prev.current.pagerank_top_10,
              communities_count: data.communities_count ?? prev.current.communities_count,
            },
          };
        });
        setLastUpdated(new Date());
      });

      eventSource.onerror = () => {
        // Silent failure - polling will continue
        console.warn("SSE connection error, falling back to polling");
      };
    } catch {
      // SSE not supported or connection failed - polling handles updates
    }

    return () => {
      clearInterval(interval);
      eventSource?.close();
    };
  }, [dateRange]);

  // Chart rendering with Chart.js
  useEffect(() => {
    if (typeof window === "undefined" || !chartRef.current || !metrics) return;

    // @ts-ignore - Chart.js loaded from CDN
    const Chart = window.Chart;
    if (!Chart) {
      console.warn("Chart.js not loaded");
      return;
    }

    // Destroy existing chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    // Select data based on active chart
    let chartData: TimeSeriesPoint[] = [];
    let label = "";
    let color = "";

    switch (activeChart) {
      case "edges":
        chartData = metrics.timeseries.edge_count;
        label = "Edge Count";
        color = "rgb(59, 130, 246)"; // blue-500
        break;
      case "confidence":
        chartData = metrics.timeseries.avg_confidence;
        label = "Avg Confidence";
        color = "rgb(16, 185, 129)"; // green-500
        break;
      case "workflows":
        chartData = metrics.timeseries.workflow_rate;
        label = "Workflows/Hour";
        color = "rgb(245, 158, 11)"; // amber-500
        break;
    }

    const ctx = chartRef.current.getContext("2d");
    chartInstanceRef.current = new Chart(ctx, {
      type: activeChart === "workflows" ? "bar" : "line",
      data: {
        labels: chartData.map((p) =>
          new Date(p.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        ),
        datasets: [
          {
            label,
            data: chartData.map((p) => p.value),
            borderColor: color,
            backgroundColor: activeChart === "workflows" ? color : `${color}33`,
            fill: activeChart !== "workflows",
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          x: {
            grid: { color: "#374151" },
            ticks: { color: "#9ca3af", maxRotation: 45 },
          },
          y: {
            grid: { color: "#374151" },
            ticks: { color: "#9ca3af" },
            beginAtZero: true,
          },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [metrics, activeChart]);

  // Export CSV function
  const exportMetricsCSV = () => {
    if (!metrics) return;

    const headers = ["timestamp", "edge_count", "avg_confidence", "workflow_rate"];
    const maxLen = Math.max(
      metrics.timeseries.edge_count.length,
      metrics.timeseries.avg_confidence.length,
      metrics.timeseries.workflow_rate.length
    );

    const rows: string[][] = [];
    for (let i = 0; i < maxLen; i++) {
      rows.push([
        metrics.timeseries.edge_count[i]?.timestamp || "",
        String(metrics.timeseries.edge_count[i]?.value || ""),
        String(metrics.timeseries.avg_confidence[i]?.value || ""),
        String(metrics.timeseries.workflow_rate[i]?.value || ""),
      ]);
    }

    // Add current metrics as summary row
    rows.push([]);
    rows.push(["# Current Metrics"]);
    rows.push(["node_count", String(metrics.current.node_count)]);
    rows.push(["edge_count", String(metrics.current.edge_count)]);
    rows.push(["density", String(metrics.current.density.toFixed(6))]);
    rows.push(["adaptive_alpha", String(metrics.current.adaptive_alpha.toFixed(4))]);
    rows.push(["communities_count", String(metrics.current.communities_count)]);

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `agentcards-metrics-${dateRange}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  };

  // Helper to format success rate color
  const getSuccessRateColor = (rate: number): string => {
    if (rate >= 90) return "text-green-400";
    if (rate >= 70) return "text-yellow-400";
    return "text-red-400";
  };

  // Helper to format alpha indicator
  const getAlphaIndicator = (alpha: number): { label: string; color: string } => {
    if (alpha >= 0.9) return { label: "Semantic", color: "text-blue-400" };
    if (alpha >= 0.7) return { label: "Balanced", color: "text-green-400" };
    return { label: "Graph-heavy", color: "text-purple-400" };
  };

  if (collapsed) {
    return (
      <div
        class="metrics-panel-collapsed"
        onClick={() => setCollapsed(false)}
        title="Expand metrics panel"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
    );
  }

  return (
    <div class={`metrics-panel ${position}`}>
      {/* Header */}
      <div class="metrics-header">
        <h2>Metrics</h2>
        <div class="metrics-header-actions">
          <button class="btn-icon" onClick={exportMetricsCSV} title="Download CSV">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          <button class="btn-icon" onClick={() => setCollapsed(true)} title="Collapse panel">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div class="date-range-selector">
        {(["1h", "24h", "7d"] as MetricsTimeRange[]).map((range) => (
          <button
            key={range}
            class={`date-range-btn ${dateRange === range ? "active" : ""}`}
            onClick={() => setDateRange(range)}
          >
            {range}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div class="metrics-loading">
          <div class="loading-spinner" />
          <span>Loading metrics...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div class="metrics-error">
          <span>Error: {error}</span>
          <button onClick={fetchMetrics}>Retry</button>
        </div>
      )}

      {/* Metrics Content */}
      {metrics && !loading && (
        <>
          {/* Current Metrics Grid */}
          <div class="metrics-grid">
            <div class="metric-card">
              <span class="metric-label">Nodes</span>
              <span class="metric-value">{metrics.current.node_count}</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">Edges</span>
              <span class="metric-value">{metrics.current.edge_count}</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">Density</span>
              <span class="metric-value">{(metrics.current.density * 100).toFixed(2)}%</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">Communities</span>
              <span class="metric-value">{metrics.current.communities_count}</span>
            </div>
          </div>

          {/* Alpha Indicator */}
          <div class="alpha-indicator">
            <div class="alpha-header">
              <span class="metric-label">Adaptive Alpha</span>
              <span class={getAlphaIndicator(metrics.current.adaptive_alpha).color}>
                {getAlphaIndicator(metrics.current.adaptive_alpha).label}
              </span>
            </div>
            <div class="alpha-bar">
              <div
                class="alpha-fill"
                style={{ width: `${metrics.current.adaptive_alpha * 100}%` }}
              />
            </div>
            <div class="alpha-value">{metrics.current.adaptive_alpha.toFixed(3)}</div>
          </div>

          {/* Workflow Success Rate */}
          <div class="workflow-stats">
            <div class="stat-row">
              <span class="stat-label">Workflows ({dateRange})</span>
              <span class="stat-value">{metrics.period.workflows_executed}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Success Rate</span>
              <span class={`stat-value ${getSuccessRateColor(metrics.period.workflows_success_rate)}`}>
                {metrics.period.workflows_success_rate.toFixed(1)}%
              </span>
            </div>
            <div class="stat-row">
              <span class="stat-label">New Edges</span>
              <span class="stat-value">{metrics.period.new_edges_created}</span>
            </div>
          </div>

          {/* PageRank Top 10 */}
          <div class="pagerank-section">
            <h3>Top Tools (PageRank)</h3>
            <div class="pagerank-list">
              {metrics.current.pagerank_top_10.map((tool, idx) => (
                <div key={tool.tool_id} class="pagerank-item">
                  <span class="pagerank-rank">#{idx + 1}</span>
                  <span class="pagerank-tool" title={tool.tool_id}>
                    {tool.tool_id.split("__").pop() || tool.tool_id}
                  </span>
                  <span class="pagerank-score">{tool.score.toFixed(4)}</span>
                </div>
              ))}
              {metrics.current.pagerank_top_10.length === 0 && (
                <div class="pagerank-empty">No tools yet</div>
              )}
            </div>
          </div>

          {/* Time Series Chart */}
          <div class="chart-section">
            <div class="chart-tabs">
              <button
                class={`chart-tab ${activeChart === "edges" ? "active" : ""}`}
                onClick={() => setActiveChart("edges")}
              >
                Edges
              </button>
              <button
                class={`chart-tab ${activeChart === "confidence" ? "active" : ""}`}
                onClick={() => setActiveChart("confidence")}
              >
                Confidence
              </button>
              <button
                class={`chart-tab ${activeChart === "workflows" ? "active" : ""}`}
                onClick={() => setActiveChart("workflows")}
              >
                Workflows
              </button>
            </div>
            <div class="chart-container">
              <canvas ref={chartRef} />
            </div>
          </div>

          {/* Last Updated */}
          {lastUpdated && (
            <div class="last-updated">
              Updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
        </>
      )}
    </div>
  );
}
