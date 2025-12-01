# Story 1.2: MCP Servers Configuration

Status: drafted

## Story

As a **playground user**,
I want **MCP servers pre-configured**,
so that **I can run demos without manual server setup**.

## Acceptance Criteria

1. `playground/config/mcp-servers.json` contient 3 servers Tier 1:
   - `@modelcontextprotocol/server-filesystem` (parallélisation lecture fichiers)
   - `@modelcontextprotocol/server-memory` (knowledge graph local)
   - `@modelcontextprotocol/server-sequential-thinking` (branchement DAG)
2. Paths configurés pour le workspace Codespace (relatifs ou absolus selon le contexte)
3. Documentation inline expliquant chaque server (commentaires dans la config JSON)

## Tasks / Subtasks

- [ ] Task 1: Create configuration directory structure (AC: #1)
  - [ ] Create `playground/config/` directory if not exists
  - [ ] Verify directory is accessible in Codespace environment

- [ ] Task 2: Create MCP servers configuration file (AC: #1, #2)
  - [ ] Create `playground/config/mcp-servers.json`
  - [ ] Configure `@modelcontextprotocol/server-filesystem` with Codespace workspace paths
  - [ ] Configure `@modelcontextprotocol/server-memory` (no special path required)
  - [ ] Configure `@modelcontextprotocol/server-sequential-thinking` (no special path required)
  - [ ] Use correct command format (`npx`, `uvx`) per server type

- [ ] Task 3: Add inline documentation (AC: #3)
  - [ ] Add JSON comments explaining each server's purpose
  - [ ] Document filesystem server's allowed paths
  - [ ] Document memory server's knowledge graph capabilities
  - [ ] Document sequential-thinking server's branching features
  - [ ] Add reference to research document for more details

- [ ] Task 4: Validate configuration
  - [ ] Verify JSON syntax is valid
  - [ ] Test that paths resolve correctly in Codespace
  - [ ] Verify server commands match official MCP documentation

## Dev Notes

### Requirements Context

**From PRD (FR015):**
- Playground must include 3 MCP servers Tier 1 (no API key required)
- Servers demonstrate: parallel file reading, local knowledge graph, DAG branching

**From Research Document:**
- Comprehensive analysis of 40+ MCP servers completed ([docs/research/mcp-servers-playground-analysis.md](../research/mcp-servers-playground-analysis.md))
- Tier 1 servers selected based on: no API key, parallelization support, GraphRAG patterns, ease of setup
- Configuration examples provided in research section 4.2

### Architecture Constraints

**MCP Server Configuration Format:**
- Standard JSON format with `mcpServers` object
- Each server has: `command` (executable), `args` (array), optional `env` (object)
- Filesystem server requires explicit allowed paths for security

**Codespace Environment:**
- Workspace root: `/workspaces/AgentCards` (or similar)
- Node.js and Python available via devcontainer
- `npx` for npm packages, `uvx` for Python packages

### Project Structure Notes

**Target Location:**
- `playground/config/mcp-servers.json` (new file)
- Directory: `playground/config/` (create if missing)

**Related Files:**
- Reference: `docs/research/mcp-servers-playground-analysis.md` (server specifications)
- Prerequisite: Story 1.1 devcontainer must be complete

### Testing Strategy

**Validation Steps:**
1. JSON syntax validation (linting)
2. Path resolution verification (filesystem server paths exist)
3. Command availability check (npx, uvx executables)
4. Integration test: load config in MCP client (future story)

### References

- [PRD: FR015 - MCP Servers Tier 1](../PRD-playground.md#functional-requirements)
- [Research: MCP Servers Analysis](../research/mcp-servers-playground-analysis.md)
- [Research: Section 4.2 - Configuration Minimale](../research/mcp-servers-playground-analysis.md#42-configuration-intermédiaire-graphrag)
- [MCP Official Documentation](https://modelcontextprotocol.io/docs)

### Previous Story Context

**Story 1.1 Status:** done

**Learnings from Story 1.1 (Devcontainer Configuration):**
- ✅ Devcontainer successfully configured with Deno 2.1.4
- ✅ Jupyter and Deno extensions pre-installed
- ✅ Ports 3000 and 8888 exposed and accessible
- ✅ Post-create script (`post-create.sh`) handles dependency installation
- ✅ Dockerfile includes Deno + Jupyter + Python stack

**Infrastructure Available:**
- Codespace environment is fully operational
- Node.js available for `npx` commands (filesystem, memory, sequential-thinking servers)
- Python available for `uvx` commands (if needed for future servers)
- Workspace root accessible at `/workspaces/AgentCards` or similar

**For This Story:**
- Leverage existing devcontainer infrastructure
- MCP servers can be tested immediately in Codespace
- No additional environment setup required

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

<!-- Will be filled during implementation -->

### Debug Log References

<!-- Will be filled during implementation -->

### Completion Notes List

<!-- Will be filled during implementation -->

### File List

<!-- Will be filled during implementation -->
