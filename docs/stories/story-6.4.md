# Story 6.4: Graph Explorer & Search Interface

**Status:** drafted
**Epic:** 6 - Real-time Graph Monitoring & Observability
**Estimate:** 2-3h

## User Story

As a user, I want to search and explore the graph interactively so that I can find specific tools and understand their relationships.

## Background

Avec 61+ tools dans le graphe, naviguer manuellement devient difficile. Les utilisateurs ont besoin de :
- Chercher un outil par nom ("playwright")
- Trouver le chemin le plus court entre 2 outils
- Filtrer les edges par confidence score
- Explorer les outils liés via Adamic-Adar
- Exporter le graphe pour analyse externe

Un interface de graph explorer permet de naviguer intelligemment dans le graphe et de découvrir les patterns cachés.

## Acceptance Criteria

- [ ] **AC1:** Search bar dans dashboard: recherche par tool name/description
- [ ] **AC2:** Autocomplete suggestions pendant typing
- [ ] **AC3:** Click sur résultat → highlight node dans graph
- [ ] **AC4:** "Find path" feature: sélectionner 2 nodes → affiche shortest path
- [ ] **AC5:** Filtres interactifs: par server, par confidence score, par date
- [ ] **AC6:** Adamic-Adar visualization: hover sur node → affiche related tools avec scores
- [ ] **AC7:** Export graph data: bouton "Export JSON/GraphML"
- [ ] **AC8:** Breadcrumb navigation: retour à vue complète après zoom
- [ ] **AC9:** Keyboard shortcuts: `/` pour focus search, `Esc` pour clear selection
- [ ] **AC10:** API endpoint: `GET /api/tools/search?q=screenshot` pour autocomplete

## Technical Design

### Search & Autocomplete

```html
<!-- Add to public/dashboard.html -->
<div id="search-container">
  <input
    type="text"
    id="search-input"
    placeholder="Search tools (press / to focus)"
    autocomplete="off"
  />
  <div id="autocomplete-results"></div>
</div>

<script>
  const searchInput = document.getElementById('search-input');
  const autocompleteResults = document.getElementById('autocomplete-results');

  // Keyboard shortcut: / to focus
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput.focus();
    }
    if (e.key === 'Escape') {
      clearSelection();
      searchInput.value = '';
    }
  });

  // Autocomplete on input
  let debounceTimer;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const query = e.target.value;
      if (query.length < 2) {
        autocompleteResults.innerHTML = '';
        return;
      }

      fetch(`/api/tools/search?q=${encodeURIComponent(query)}`)
        .then(r => r.json())
        .then(results => {
          autocompleteResults.innerHTML = results
            .map(tool => `
              <div class="autocomplete-item" data-tool-id="${tool.id}">
                <strong>${tool.name}</strong> <span>${tool.server}</span>
              </div>
            `)
            .join('');

          // Click handler
          document.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => {
              const toolId = item.dataset.toolId;
              highlightNode(toolId);
            });
          });
        });
    }, 300);
  });

  function highlightNode(toolId) {
    // Cytoscape: highlight node
    cy.nodes().removeClass('highlighted');
    const node = cy.getElementById(toolId);
    node.addClass('highlighted');

    // Animate zoom to node
    cy.animate({
      center: { eles: node },
      zoom: 2
    }, {
      duration: 500
    });
  }
</script>
```

### Find Path Feature

```html
<div id="path-finder">
  <h3>Find Shortest Path</h3>
  <select id="from-tool"></select>
  <span>→</span>
  <select id="to-tool"></select>
  <button onclick="findPath()">Find Path</button>
</div>

<script>
  function findPath() {
    const from = document.getElementById('from-tool').value;
    const to = document.getElementById('to-tool').value;

    fetch(`/api/graph/path?from=${from}&to=${to}`)
      .then(r => r.json())
      .then(data => {
        if (data.path) {
          highlightPath(data.path);
        } else {
          alert('No path found between these tools');
        }
      });
  }

  function highlightPath(path) {
    // Cytoscape: highlight path nodes + edges
    cy.elements().removeClass('path-highlighted');

    path.forEach((toolId, i) => {
      cy.getElementById(toolId).addClass('path-highlighted');

      if (i < path.length - 1) {
        const edge = cy.edges(`[source="${toolId}"][target="${path[i+1]}"]`);
        edge.addClass('path-highlighted');
      }
    });

    // Zoom to fit path
    const pathElements = cy.elements('.path-highlighted');
    cy.animate({
      fit: { eles: pathElements, padding: 50 }
    }, {
      duration: 500
    });
  }
</script>
```

### Interactive Filters

```html
<div id="filters-panel">
  <h3>Filters</h3>

  <!-- Server Filter -->
  <div class="filter-group">
    <label>Servers</label>
    <div id="server-checkboxes"></div>
  </div>

  <!-- Confidence Score Filter -->
  <div class="filter-group">
    <label>Min Confidence Score: <span id="confidence-value">0.5</span></label>
    <input
      type="range"
      id="confidence-slider"
      min="0"
      max="1"
      step="0.1"
      value="0.5"
    />
  </div>

  <!-- Date Filter -->
  <div class="filter-group">
    <label>Edges created after</label>
    <input type="date" id="date-filter" />
  </div>

  <button onclick="applyFilters()">Apply Filters</button>
  <button onclick="resetFilters()">Reset</button>
</div>

<script>
  function applyFilters() {
    const selectedServers = Array.from(
      document.querySelectorAll('#server-checkboxes input:checked')
    ).map(cb => cb.value);

    const minConfidence = parseFloat(document.getElementById('confidence-slider').value);
    const afterDate = document.getElementById('date-filter').value;

    // Filter nodes
    cy.nodes().forEach(node => {
      const server = node.data('server');
      const visible = selectedServers.length === 0 || selectedServers.includes(server);
      node.style('display', visible ? 'element' : 'none');
    });

    // Filter edges
    cy.edges().forEach(edge => {
      const weight = edge.data('weight');
      const visible = weight >= minConfidence;
      edge.style('display', visible ? 'element' : 'none');
    });
  }

  function resetFilters() {
    cy.elements().style('display', 'element');
    document.getElementById('confidence-slider').value = 0.5;
    document.getElementById('date-filter').value = '';
    document.querySelectorAll('#server-checkboxes input').forEach(cb => cb.checked = false);
  }
</script>
```

### Adamic-Adar Tooltip

```html
<script>
  cy.on('mouseover', 'node', (evt) => {
    const node = evt.target;
    const toolId = node.data('id');

    // Fetch related tools via Adamic-Adar
    fetch(`/api/graph/related?tool=${toolId}&limit=5`)
      .then(r => r.json())
      .then(related => {
        showTooltip(evt.renderedPosition, `
          <h4>Related Tools (Adamic-Adar)</h4>
          <ul>
            ${related.map(t => `<li>${t.tool_name} (${t.score.toFixed(3)})</li>`).join('')}
          </ul>
        `);
      });
  });

  cy.on('mouseout', 'node', () => {
    hideTooltip();
  });
</script>
```

### Export Functionality

```html
<div id="export-panel">
  <h3>Export Graph</h3>
  <button onclick="exportGraph('json')">Export JSON</button>
  <button onclick="exportGraph('graphml')">Export GraphML</button>
  <button onclick="exportGraph('cytoscape')">Export Cytoscape.js</button>
</div>

<script>
  function exportGraph(format) {
    fetch(`/api/graph/export?format=${format}`)
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `agentcards-graph.${format}`;
        a.click();
      });
  }
</script>
```

### Backend Endpoints

```typescript
// src/mcp/gateway-server.ts

// Autocomplete search
app.get("/api/tools/search", async (req) => {
  const url = new URL(req.url);
  const query = url.searchParams.get("q") || "";

  const results = await vectorSearch.searchTools(query, 10, 0.0);
  return Response.json(results.map(r => ({
    id: r.toolId,
    name: r.toolName,
    server: r.serverId,
    score: r.score
  })));
});

// Find shortest path
app.get("/api/graph/path", async (req) => {
  const url = new URL(req.url);
  const from = url.searchParams.get("from") || "";
  const to = url.searchParams.get("to") || "";

  const path = graphEngine.findShortestPath(from, to);

  return Response.json({
    path: path || null,
    length: path ? path.length : 0
  });
});

// Related tools (Adamic-Adar)
app.get("/api/graph/related", async (req) => {
  const url = new URL(req.url);
  const toolId = url.searchParams.get("tool") || "";
  const limit = parseInt(url.searchParams.get("limit") || "10");

  const related = graphEngine.computeAdamicAdar(toolId, limit);

  return Response.json(related);
});

// Export graph
app.get("/api/graph/export", async (req) => {
  const url = new URL(req.url);
  const format = url.searchParams.get("format") || "json";

  const graphData = graphEngine.exportGraph(format);

  return new Response(graphData, {
    headers: {
      "Content-Type": format === "json" ? "application/json" : "application/xml",
      "Content-Disposition": `attachment; filename=graph.${format}`
    }
  });
});
```

## Implementation Notes

- Autocomplete avec debounce (300ms) pour éviter trop de requêtes
- Keyboard shortcuts pour UX rapide (/, Esc)
- Adamic-Adar tooltip on hover (async fetch)
- Export formats: JSON (standard), GraphML (Gephi), Cytoscape.js (portable)

## Files to Create/Modify

- `public/dashboard.html` - Add search, filters, export UI
- `src/mcp/gateway-server.ts` - Add API endpoints
- `src/graphrag/graph-engine.ts` - Add `exportGraph()` method
- `public/styles.css` - Styling pour autocomplete, filters

## Test Plan

```bash
# Test 1: Autocomplete
# Type "playwright" in search bar
# → Should show playwright_navigate, playwright_screenshot, etc.

# Test 2: Find path
curl http://localhost:8080/api/graph/path?from=filesystem:list_directory&to=filesystem:read_file
# → Should return path: ["filesystem:list_directory", "filesystem:read_file"]

# Test 3: Related tools
curl http://localhost:8080/api/graph/related?tool=filesystem:read_file&limit=5
# → Should return Adamic-Adar scores

# Test 4: Export
curl http://localhost:8080/api/graph/export?format=json > graph.json
# → Should download valid JSON graph
```

## Dependencies

- Story 6.3: Dashboard with metrics panel
- GraphRAGEngine: findShortestPath(), computeAdamicAdar()
