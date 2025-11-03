# AgentCards 🃏

[![CI](https://github.com/YOUR_USERNAME/agentcards/workflows/CI/badge.svg)](https://github.com/YOUR_USERNAME/agentcards/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Deno Version](https://img.shields.io/badge/deno-2.5.x-blue.svg)](https://deno.land)

**MCP Server Context Optimization Engine** - Semantic context loading for Model Context Protocol
servers using local embeddings and vector search.

## 🚀 Quick Start

### Prerequisites

- [Deno](https://deno.land/) 2.5.x or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/agentcards.git
cd agentcards

# Run the application
deno task dev
```

### Running Tests

```bash
# Run all tests
deno task test

# Run tests with coverage
deno test --allow-all --coverage=coverage
deno coverage coverage
```

## 🎯 Features

- **🔍 Semantic Vector Search** - Fast, local context retrieval using PGLite + pgvector
- **🧠 Local Embeddings** - BGE-Large-EN-v1.5 model for privacy-first embedding generation
- **📊 MCP Schema Discovery** - Automatic extraction and indexing of MCP server capabilities
- **⚡ On-Demand Loading** - Smart context optimization to stay within token budgets
- **🔄 Parallel Execution** - DAG-based orchestration for multi-server queries
- **💾 Embedded Database** - Zero-config PostgreSQL with WASM (PGLite)

## 📁 Project Structure

```
agentcards/
├── src/
│   ├── main.ts          # Entry point
│   ├── db/              # Database modules (PGLite + pgvector)
│   ├── mcp/             # MCP client/server logic
│   ├── vector/          # Embedding & semantic search
│   └── cli/             # CLI commands
├── tests/
│   ├── unit/            # Unit tests
│   └── integration/     # Integration tests
├── docs/                # Documentation
├── .github/workflows/   # CI/CD pipelines
└── deno.json            # Deno configuration
```

## 🛠️ Development

### Available Commands

```bash
# Development mode with hot reload
deno task dev

# Run linter
deno task lint

# Format code
deno task fmt

# Type checking
deno task check

# Run benchmarks
deno task bench

# Build binary
deno task build
```

### Code Quality

- **Linting**: Deno's built-in linter with recommended rules
- **Formatting**: 100-char line width, 2-space indentation, semicolons enforced
- **Type Safety**: Strict TypeScript with no implicit any
- **Testing**: >80% coverage target with Deno.test

## 📚 Documentation

- [Product Requirements Document](docs/PRD.md)
- [Architecture Decisions](docs/architecture.md)
- [Epic Breakdown](docs/epics.md)

## 🔒 Security

AgentCards runs locally with explicit Deno permissions. Review the permission flags in `deno.json`
tasks before running.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Deno](https://deno.land/)
- Powered by [PGLite](https://github.com/electric-sql/pglite)
- Embeddings via [Transformers.js](https://github.com/xenova/transformers.js)
- MCP SDK by [Anthropic](https://github.com/modelcontextprotocol)

---

**Note:** Replace `YOUR_USERNAME` in the badges with your actual GitHub username once the repository
is created.
