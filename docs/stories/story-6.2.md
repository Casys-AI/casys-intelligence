# Story 6.2: Interactive Graph Visualization Dashboard

**Status:** drafted
**Epic:** 6 - Real-time Graph Monitoring & Observability
**Estimate:** 3-4h

## User Story

As a power user, I want a web interface to visualize the tool dependency graph so that I can understand which tools are used together.

## Background

Le GraphRAGEngine maintient un graphe de dépendances entre outils, mais ce graphe est invisible. Impossible de comprendre visuellement pourquoi `playwright_screenshot` est recommandé après `playwright_navigate`, ou de voir les clusters de tools liés.

Un dashboard interactif avec force-directed graph layout permet de visualiser instantanément la structure du graphe, les communities, et les patterns d'usage.

## Acceptance Criteria

- [ ] **AC1:** Page HTML statique: `public/dashboard.html`
- [ ] **AC2:** Force-directed graph layout avec D3.js ou Cytoscape.js
- [ ] **AC3:** Nodes = tools (couleur par server, taille par PageRank)
- [ ] **AC4:** Edges = dépendances (épaisseur par confidence_score)
- [ ] **AC5:** Interactions: zoom, pan, drag nodes
- [ ] **AC6:** Click sur node → affiche details (name, server, PageRank, neighbors)
- [ ] **AC7:** Real-time updates via SSE (nouveaux edges animés)
- [ ] **AC8:** Légende interactive (filtres par server)
- [ ] **AC9:** Performance: render <500ms pour 200 nodes
- [ ] **AC10:** Endpoint static: `GET /dashboard` sert le HTML
- [ ] **AC11:** Mobile responsive (optionnel mais nice-to-have)

## Technical Design

### Technology Stack

**Option A: D3.js (Force Simulation)**
- Pros: Full control, powerful, standard
- Cons: Steeper learning curve, more code

**Option B: Cytoscape.js**
- Pros: Graph-specific, easier API, good performance
- Cons: Less flexible for custom viz

**Recommendation:** Cytoscape.js pour rapidité d'implémentation

### Graph Data Structure

```typescript
// GET /api/graph endpoint
interface GraphData {
  nodes: Array<{
    id: string;           // "filesystem:read_file"
    label: string;        // "read_file"
    server: string;       // "filesystem"
    pagerank: number;     // 0.0 - 1.0
    community?: string;   // "cluster_1"
  }>;
  edges: Array<{
    source: string;       // "filesystem:list_directory"
    target: string;       // "filesystem:read_file"
    weight: number;       // confidence_score 0.0 - 1.0
    count: number;        // observed_count
  }>;
  meta: {
    edge_count: number;
    node_count: number;
    density: number;
  };
}
```

### Frontend Implementation

```html
<!-- public/dashboard.html -->
<!DOCTYPE html>
<html>
<head>
  <title>AgentCards Graph Dashboard</title>
  <script src="https://unpkg.com/cytoscape@3.26.0/dist/cytoscape.min.js"></script>
  <style>
    #cy {
      width: 100%;
      height: 100vh;
      background: #f5f5f5;
    }
    #node-details {
      position: absolute;
      top: 20px;
      right: 20px;
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
  </style>
</head>
<body>
  <div id="cy"></div>
  <div id="node-details" style="display: none;"></div>

  <script>
    // Fetch graph data
    fetch('/api/graph')
      .then(res => res.json())
      .then(data => renderGraph(data));

    // SSE for real-time updates
    const events = new EventSource('/events/stream');
    events.addEventListener('edge_created', (e) => {
      const event = JSON.parse(e.data);
      addEdgeToGraph(event.data);
    });

    function renderGraph(data) {
      const cy = cytoscape({
        container: document.getElementById('cy'),
        elements: [
          ...data.nodes.map(n => ({
            data: { id: n.id, label: n.label, server: n.server, pagerank: n.pagerank }
          })),
          ...data.edges.map(e => ({
            data: { source: e.source, target: e.target, weight: e.weight }
          }))
        ],
        style: [
          {
            selector: 'node',
            style: {
              'background-color': 'data(server)',
              'label': 'data(label)',
              'width': 'mapData(pagerank, 0, 1, 20, 60)',
              'height': 'mapData(pagerank, 0, 1, 20, 60)'
            }
          },
          {
            selector: 'edge',
            style: {
              'width': 'mapData(weight, 0, 1, 1, 5)',
              'curve-style': 'bezier',
              'target-arrow-shape': 'triangle'
            }
          }
        ],
        layout: {
          name: 'cose',
          animate: true,
          animationDuration: 500
        }
      });

      // Click handler
      cy.on('tap', 'node', (evt) => {
        const node = evt.target;
        showNodeDetails(node.data());
      });
    }

    function showNodeDetails(nodeData) {
      const details = document.getElementById('node-details');
      details.innerHTML = `
        <h3>${nodeData.label}</h3>
        <p>Server: ${nodeData.server}</p>
        <p>PageRank: ${nodeData.pagerank.toFixed(4)}</p>
      `;
      details.style.display = 'block';
    }
  </script>
</body>
</html>
```

### Backend Endpoints

```typescript
// src/mcp/gateway-server.ts
app.get("/dashboard", async () => {
  const html = await Deno.readTextFile("public/dashboard.html");
  return new Response(html, {
    headers: { "Content-Type": "text/html" }
  });
});

app.get("/api/graph", async () => {
  const nodes = graphEngine.getStats();
  const edges = /* fetch from DB or graph */;

  return Response.json({
    nodes: nodes.map(n => ({
      id: n.toolId,
      label: n.toolName,
      server: n.serverId,
      pagerank: graphEngine.getPageRank(n.toolId),
      community: graphEngine.getCommunity(n.toolId)
    })),
    edges: edges.map(e => ({
      source: e.from,
      target: e.to,
      weight: e.confidence,
      count: e.observed_count
    })),
    meta: {
      edge_count: graphEngine.getEdgeCount(),
      node_count: nodes.length,
      density: /* calculate */
    }
  });
});
```

## Implementation Notes

- Page HTML statique servie depuis `/dashboard`
- Cytoscape.js chargé via CDN (pas de build step)
- SSE connection pour updates temps réel
- Color palette par server (filesystem=blue, playwright=green, etc.)
- PageRank visualisé via node size

## Files to Create/Modify

- `public/dashboard.html` - Main dashboard HTML
- `src/mcp/gateway-server.ts` - Add `/dashboard` and `/api/graph` endpoints
- `src/graphrag/graph-engine.ts` - Add `getGraphData()` method

## Test Plan

```bash
# Test 1: Access dashboard
open http://localhost:8080/dashboard
# → Should render graph with all nodes

# Test 2: Interaction
# Click on a node → details panel should appear

# Test 3: Real-time update
# Execute a workflow in another terminal
# → New edge should appear animated in graph

# Test 4: Performance
# Load graph with 200 nodes
# → Should render in <500ms
```

## Dependencies

- Story 6.1: SSE events stream (for real-time updates)
- ADR-014: HTTP transport
