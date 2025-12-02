import { page } from "fresh";
import { Head } from "fresh/runtime";
import GraphVisualization from "../islands/GraphVisualization.tsx";
import MetricsPanel from "../islands/MetricsPanel.tsx";

export const handler = {
  GET(_ctx: any) {
    return page();
  },
};

export default function Dashboard() {
  const apiBase = "http://localhost:3001";

  return (
    <>
      <Head>
        <title>AgentCards - Graph Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script src="https://cdn.jsdelivr.net/npm/cytoscape@3.30.4/dist/cytoscape.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: #030712; font-family: system-ui, sans-serif; }

          /* Main Layout (Story 6.3) */
          .dashboard-layout { display: flex; width: 100vw; height: 100vh; overflow: hidden; }
          .graph-section { flex: 1; position: relative; min-width: 0; }
          .graph-container { width: 100%; height: 100%; overflow: hidden; position: relative; }
          .graph-canvas { width: 100%; height: 100%; }

          /* Graph Legend */
          .legend { position: absolute; top: 20px; right: 20px; background: rgba(0,0,0,0.8); padding: 16px; border-radius: 8px; border: 1px solid #374151; backdrop-filter: blur(8px); z-index: 10; }
          .legend h3 { font-size: 12px; font-weight: 600; color: #9ca3af; text-transform: uppercase; margin-bottom: 12px; }
          .legend-item { display: flex; align-items: center; gap: 8px; padding: 4px 0; cursor: pointer; }
          .legend-item.hidden { opacity: 0.3; }
          .legend-dot { width: 12px; height: 12px; border-radius: 50%; }
          .legend-label { color: #e5e7eb; font-size: 14px; }
          .node-details { position: absolute; bottom: 20px; left: 20px; background: rgba(0,0,0,0.9); padding: 16px; border-radius: 8px; border: 1px solid #374151; min-width: 250px; z-index: 10; }
          .node-details h3 { color: #3b82f6; font-size: 18px; margin-bottom: 8px; }
          .node-details p { color: #9ca3af; font-size: 14px; margin: 4px 0; }
          .node-details .close { position: absolute; top: 8px; right: 8px; color: #6b7280; cursor: pointer; }

          /* Metrics Panel (Story 6.3) */
          .metrics-panel { width: 320px; background: #111827; border-left: 1px solid #374151; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
          .metrics-panel.overlay { position: absolute; right: 0; top: 0; height: 100%; z-index: 20; }

          .metrics-header { display: flex; justify-content: space-between; align-items: center; }
          .metrics-header h2 { color: #f3f4f6; font-size: 18px; font-weight: 600; }
          .metrics-header-actions { display: flex; gap: 8px; }
          .btn-icon { background: transparent; border: none; color: #9ca3af; cursor: pointer; padding: 4px; border-radius: 4px; }
          .btn-icon:hover { background: #374151; color: #f3f4f6; }
          .btn-icon svg { width: 16px; height: 16px; }

          /* Date Range Selector */
          .date-range-selector { display: flex; gap: 4px; background: #1f2937; border-radius: 6px; padding: 4px; }
          .date-range-btn { flex: 1; padding: 6px 12px; border: none; background: transparent; color: #9ca3af; font-size: 12px; font-weight: 500; border-radius: 4px; cursor: pointer; }
          .date-range-btn.active { background: #3b82f6; color: white; }
          .date-range-btn:hover:not(.active) { background: #374151; }

          /* Loading & Error States */
          .metrics-loading, .metrics-error { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 24px; color: #9ca3af; }
          .loading-spinner { width: 24px; height: 24px; border: 2px solid #374151; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
          .metrics-error { color: #f87171; }
          .metrics-error button { margin-top: 8px; padding: 6px 12px; background: #374151; border: none; color: #f3f4f6; border-radius: 4px; cursor: pointer; }

          /* Metrics Grid */
          .metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .metric-card { background: #1f2937; border-radius: 6px; padding: 12px; }
          .metric-label { display: block; font-size: 11px; color: #9ca3af; text-transform: uppercase; margin-bottom: 4px; }
          .metric-value { display: block; font-size: 24px; font-weight: 600; color: #f3f4f6; }

          /* Alpha Indicator */
          .alpha-indicator { background: #1f2937; border-radius: 6px; padding: 12px; }
          .alpha-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
          .alpha-bar { height: 6px; background: #374151; border-radius: 3px; overflow: hidden; }
          .alpha-fill { height: 100%; background: linear-gradient(90deg, #8b5cf6, #3b82f6); border-radius: 3px; transition: width 0.3s ease; }
          .alpha-value { font-size: 12px; color: #9ca3af; text-align: right; margin-top: 4px; }

          /* Workflow Stats */
          .workflow-stats { background: #1f2937; border-radius: 6px; padding: 12px; }
          .stat-row { display: flex; justify-content: space-between; padding: 4px 0; }
          .stat-label { font-size: 13px; color: #9ca3af; }
          .stat-value { font-size: 13px; font-weight: 500; color: #f3f4f6; }

          /* Color utilities */
          .text-green-400 { color: #4ade80; }
          .text-yellow-400 { color: #facc15; }
          .text-red-400 { color: #f87171; }
          .text-blue-400 { color: #60a5fa; }
          .text-purple-400 { color: #c084fc; }

          /* PageRank Section */
          .pagerank-section { background: #1f2937; border-radius: 6px; padding: 12px; }
          .pagerank-section h3 { font-size: 12px; color: #9ca3af; text-transform: uppercase; margin-bottom: 8px; }
          .pagerank-list { max-height: 200px; overflow-y: auto; }
          .pagerank-item { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 12px; }
          .pagerank-rank { color: #6b7280; width: 24px; }
          .pagerank-tool { flex: 1; color: #e5e7eb; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .pagerank-score { color: #9ca3af; font-family: monospace; }
          .pagerank-empty { color: #6b7280; font-size: 12px; padding: 8px 0; }

          /* Chart Section */
          .chart-section { background: #1f2937; border-radius: 6px; padding: 12px; }
          .chart-tabs { display: flex; gap: 4px; margin-bottom: 12px; }
          .chart-tab { flex: 1; padding: 6px 8px; border: none; background: #374151; color: #9ca3af; font-size: 11px; border-radius: 4px; cursor: pointer; }
          .chart-tab.active { background: #3b82f6; color: white; }
          .chart-container { height: 150px; }

          /* Last Updated */
          .last-updated { font-size: 11px; color: #6b7280; text-align: center; }

          /* Collapsed Panel */
          .metrics-panel-collapsed { position: fixed; right: 16px; top: 50%; transform: translateY(-50%); background: #1f2937; border: 1px solid #374151; border-radius: 8px; padding: 12px; cursor: pointer; z-index: 20; }
          .metrics-panel-collapsed:hover { background: #374151; }
          .metrics-panel-collapsed svg { width: 20px; height: 20px; color: #9ca3af; }

          /* Mobile Responsive (Story 6.3 AC: mobile responsive) */
          @media (max-width: 768px) {
            .dashboard-layout { flex-direction: column; }
            .metrics-panel { width: 100%; max-height: 50vh; border-left: none; border-top: 1px solid #374151; }
            .graph-section { height: 50vh; }
          }
        `}</style>
      </Head>

      <div class="dashboard-layout">
        <div class="graph-section">
          <div class="graph-container">
            <GraphVisualization apiBase={apiBase} />
          </div>
        </div>
        <MetricsPanel apiBase={apiBase} position="sidebar" />
      </div>
    </>
  );
}
