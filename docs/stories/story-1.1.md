# Story 1.1: Project Setup & Repository Structure

**Epic:** 1 - Project Foundation & Context Optimization Engine
**Story ID:** 1.1
**Status:** review
**Estimated Effort:** 2-3 hours

---

## User Story

**As a** developer,
**I want** a clean Deno project structure with CI/CD configured,
**So that** I can start development with proper tooling and automation in place.

---

## Acceptance Criteria

1. Repository initialisé avec structure Deno standard (src/, tests/, docs/)
2. GitHub Actions CI configuré (lint, typecheck, tests)
3. deno.json configuré avec tasks scripts (test, lint, fmt, dev)
4. README.md avec badges CI et quick start guide
5. .gitignore approprié pour Deno projects
6. License MIT et CODE_OF_CONDUCT.md

---

## Prerequisites

**None** - This is the first story

---

## Technical Notes

### Directory Structure
```
agentcards/
├── src/
│   ├── main.ts          # Entry point
│   ├── db/              # Database modules
│   ├── mcp/             # MCP client/server logic
│   ├── vector/          # Embedding & search
│   └── cli/             # CLI commands
├── tests/
│   ├── unit/
│   └── integration/
├── docs/
│   ├── PRD.md
│   ├── architecture.md
│   └── epics.md
├── .github/
│   └── workflows/
│       └── ci.yml
├── deno.json
├── README.md
├── LICENSE
└── .gitignore
```

### deno.json Configuration
```json
{
  "tasks": {
    "dev": "deno run --watch --allow-all src/main.ts",
    "test": "deno test --allow-all",
    "lint": "deno lint",
    "fmt": "deno fmt",
    "check": "deno check src/**/*.ts"
  },
  "fmt": {
    "useTabs": false,
    "lineWidth": 100,
    "semiColons": true
  },
  "lint": {
    "rules": {
      "tags": ["recommended"]
    }
  }
}
```

### GitHub Actions CI
- Run on: push, pull_request to main branch
- Jobs: lint, typecheck, test
- Deno version: 2.5.x

---

## Tasks/Subtasks

### Implementation Tasks
- [x] 1. Créer l'arborescence standard Deno (src/, tests/, docs/, .github/workflows/)
- [x] 2. Configurer deno.json avec tasks scripts (test, lint, fmt, dev, check) et options de formatage
- [x] 3. Implémenter GitHub Actions CI avec jobs: lint, typecheck, test (Deno 2.5.x)
- [x] 4. Créer README.md avec badges CI et quick start guide
- [x] 5. Ajouter .gitignore pour projets Deno
- [x] 6. Ajouter LICENSE (MIT) et CODE_OF_CONDUCT.md

---

## Definition of Done

- [x] All acceptance criteria met
- [x] CI pipeline passing (lint, typecheck, tests)
- [x] README.md provides clear quick start instructions
- [ ] Code reviewed and merged to main (pending review)
- [x] Documentation updated

---

## Dev Agent Record

### Debug Log
**2025-11-03** - Story implementation started
- Context file loaded successfully
- Tasks section added from context file
- Beginning implementation of project setup

### Completion Notes
**2025-11-03** - All implementation tasks completed successfully

**Implementation Summary:**
- ✅ Created complete Deno project structure with all required directories (src/, tests/, docs/, .github/workflows/)
- ✅ Configured deno.json with all required tasks (dev, test, lint, fmt, check, bench, build)
- ✅ Implemented GitHub Actions CI with three jobs: lint, typecheck, and test using Deno 2.5.x
- ✅ Created comprehensive README.md with CI badges, quick start guide, and full documentation
- ✅ Added .gitignore with appropriate patterns for Deno projects
- ✅ Added MIT LICENSE and Contributor Covenant CODE_OF_CONDUCT.md

**Testing:**
- Written 48 comprehensive tests covering all 6 acceptance criteria
- All tests passing (48 passed | 0 failed)
- Linting: ✅ Passed (8 files checked)
- Type checking: ✅ Passed
- Formatting: ✅ All project files formatted

**Technical Decisions:**
- Used Deno standard library (@std) for assertions and YAML parsing
- Configured strict TypeScript compiler options for better type safety
- Set up comprehensive test coverage for project structure, CI config, deno.json, documentation, and .gitignore
- Included coverage reporting in CI pipeline

---

## File List

### Created Files
- `src/main.ts` - Application entry point
- `src/main_test.ts` - Tests for main module
- `mod.ts` - Public API exports
- `deno.json` - Deno configuration with tasks, formatting, and linting rules
- `.github/workflows/ci.yml` - GitHub Actions CI workflow
- `README.md` - Project documentation with badges and quick start
- `.gitignore` - Git ignore patterns for Deno projects
- `LICENSE` - MIT License
- `CODE_OF_CONDUCT.md` - Contributor Covenant Code of Conduct
- `tests/unit/project_structure_test.ts` - Tests for directory structure (AC1)
- `tests/unit/ci_configuration_test.ts` - Tests for CI configuration (AC2)
- `tests/unit/deno_config_test.ts` - Tests for deno.json (AC3)
- `tests/unit/documentation_test.ts` - Tests for README and LICENSE (AC4, AC6)
- `tests/unit/gitignore_test.ts` - Tests for .gitignore (AC5)

### Created Directories
- `src/` - Source code directory
- `src/db/` - Database modules
- `src/mcp/` - MCP client/server logic
- `src/vector/` - Embedding & search modules
- `src/cli/` - CLI commands
- `tests/` - Test directory
- `tests/unit/` - Unit tests
- `tests/integration/` - Integration tests
- `.github/workflows/` - GitHub Actions workflows

---

## Change Log
- 2025-11-03: Story marked ready-for-dev, implementation started
- 2025-11-03: All implementation tasks completed - project structure, CI/CD, tests, and documentation
- 2025-11-03: All 48 tests passing, linting and type checking successful

### Context Reference
- [Story Context](1-1-project-setup-repository-structure.context.xml) - Generated 2025-11-03

---

## References

- [Deno Project Structure Best Practices](https://deno.land/manual/basics/modules)
- [GitHub Actions for Deno](https://github.com/denoland/setup-deno)
