import { page } from "fresh";
import { Head } from "fresh/runtime";

import { GraphRAGIllustration, DAGIllustration, SandboxIllustration, SearchIllustration } from "../components/FeatureIllustrations.tsx";
import ArchitectureDiagram from "../components/ArchitectureDiagram.tsx";

export const handler = {
  GET(_ctx: any) {
    return page();
  },
};

export default function LandingPage() {
  return (
    <>
      <Head>
        <title>CAI - Collective Agentic Intelligence</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta
          name="description"
          content="Intelligent MCP Gateway with emergent capabilities. Your AI agents learn, adapt, and evolve from every execution."
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div class="page">
        {/* Subtle Background */}
        <div class="bg-gradient" />

        {/* Navigation */}
        <header class="header">
          <div class="header-inner">
            <a href="/" class="logo">
              <span class="logo-mark">CAI</span>
            </a>
            <nav class="nav">
              <a href="#features" class="nav-link">Features</a>
              <a href="/dashboard" class="nav-link">Dashboard</a>
              <a href="https://github.com/Casys-AI/casys-intelligence" class="nav-link" target="_blank" rel="noopener">
                GitHub
              </a>
              <a href="https://casys.ai" class="nav-link nav-link-accent" target="_blank" rel="noopener">
                Casys.ai
              </a>
            </nav>
          </div>
        </header>

        {/* Hero */}
        <main class="hero">
          <div class="hero-content">
            <p class="hero-eyebrow">by Casys.ai</p>
            <h1 class="hero-title">
              Collective<br />
              <span class="hero-title-accent">Agentic</span><br />
              Intelligence
            </h1>
            <p class="hero-desc">
              An intelligent MCP gateway where AI capabilities emerge from execution.
              Your agents learn, adapt, and evolve through GraphRAG-powered memory.
            </p>
            <div class="hero-actions">
              <a href="/dashboard" class="btn btn-primary">
                Open Dashboard
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>
              <a href="https://github.com/Casys-AI/casys-intelligence" class="btn btn-ghost" target="_blank" rel="noopener">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                View Source
              </a>
            </div>
          </div>

          {/* Stats */}
          <div class="stats">
            <div class="stat">
              <span class="stat-value">&lt;5%</span>
              <span class="stat-label">Context Usage</span>
            </div>
            <div class="stat">
              <span class="stat-value">5×</span>
              <span class="stat-label">Faster Workflows</span>
            </div>
            <div class="stat">
              <span class="stat-value">15+</span>
              <span class="stat-label">MCP Servers</span>
            </div>
          </div>
        </main>

        {/* Features */}
        <section id="features" class="features">
          <div class="features-header">
            <h2 class="section-title">Emergent Capabilities</h2>
            <p class="section-desc">
              Every execution strengthens the neural pathways. Tools that work together become permanently connected.
            </p>
          </div>
         {/* Features Section */}
        <section class="features-section">
          <div class="container">
            
            {/* Feature 1: Hyper Graph Memory */}
            <div class="feature-row">
              <div class="feature-visual">
                <GraphRAGIllustration />
              </div>
              <div class="feature-content">
                <h3 class="feature-title">Hyper Graph Memory</h3>
                <p class="feature-desc">
                  Beyond simple RAG. A self-learning hyper graph that connects your tools, data, and execution history to provide context-aware recommendations.
                </p>
              </div>
            </div>

            {/* Feature 2: Intelligent DAG Orchestration */}
            <div class="feature-row reverse">
              <div class="feature-visual">
                <DAGIllustration />
              </div>
              <div class="feature-content">
                <h3 class="feature-title">Intelligent DAG Orchestration</h3>
                <p class="feature-desc">
                  Don't just run tools. AgentCards analyzes your intent and auto-suggests optimal, parallel Directed Acyclic Graphs for 5x faster execution.
                </p>
              </div>
            </div>

            {/* Feature 3: MCP-Native Sandbox */}
            <div class="feature-row">
              <div class="feature-visual">
                <SandboxIllustration />
              </div>
              <div class="feature-content">
                <h3 class="feature-title">MCP-Native Sandbox</h3>
                <p class="feature-desc">
                  Execute TypeScript that directly wraps and orchestrates MCP tools. Filter, aggregate, and transform data <em>before</em> it hits the LLM context.
                </p>
              </div>
            </div>

            {/* Feature 4: Semantic Discovery */}
            <div class="feature-row reverse">
              <div class="feature-visual">
                <SearchIllustration />
              </div>
              <div class="feature-content">
                <h3 class="feature-title">Semantic Discovery</h3>
                <p class="feature-desc">
                  Stop memorizing tool names. Find the right tool for the job using semantic embeddings (BGE) that understand natural language intent.
                </p>
              </div>
            </div>

          </div>
        </section>
        </section>

        {/* How it Works */}
        <section class="section-dark">
          <div class="container">
            <div class="section-header">
              <h2 class="section-title">How It Works</h2>
              <p class="section-desc">
                AgentCards sits between your LLM and your tools, providing a secure, intelligent layer for execution and memory.
              </p>
            </div>
            
            <div class="architecture-diagram">
              <ArchitectureDiagram />
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section class="section">
          <div class="container">
            <div class="section-header">
              <h2 class="section-title">Built for Builders</h2>
              <p class="section-desc">
                Whether you're building autonomous agents or enhancing existing workflows, AgentCards provides the infrastructure you need.
              </p>
            </div>

            <div class="use-cases-grid">
              <div class="use-case-card">
                <div class="use-case-icon">🔍</div>
                <h3 class="use-case-title">Codebase Analysis</h3>
                <p class="use-case-desc">
                  Map entire projects in seconds. Parallel file reading combined with local aggregation allows you to summarize 10k+ files instantly.
                </p>
              </div>

              <div class="use-case-card">
                <div class="use-case-icon">⚡</div>
                <h3 class="use-case-title">Data Pipelines</h3>
                <p class="use-case-desc">
                  Wrap SQL and Filesystem MCPs in a single script. Transform and migrate data securely within the sandbox without leaving your infra.
                </p>
              </div>

              <div class="use-case-card">
                <div class="use-case-icon">🤝</div>
                <h3 class="use-case-title">Human-in-the-Loop</h3>
                <p class="use-case-desc">
                  Pause complex DAGs at critical checkpoints. Review proposed plans and approve sensitive actions before execution continues.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer class="footer">
          <div class="footer-inner">
            <span class="footer-brand">
              <span class="logo-mark">CAI</span>
              <span class="footer-sep">—</span>
              <a href="https://casys.ai" target="_blank" rel="noopener">Casys.ai</a>
            </span>
            <span class="footer-copy">Collective Agentic Intelligence</span>
          </div>
        </footer>

        <style>{`
          :root {
            --bg: #0a0908;
            --bg-elevated: #12110f;
            --accent: #FFB86F;
            --accent-dim: rgba(255, 184, 111, 0.1);
            --accent-medium: rgba(255, 184, 111, 0.2);
            --text: #f5f0ea;
            --text-muted: #d5c3b5;
            --text-dim: #8a8078;
            --border: rgba(255, 184, 111, 0.1);
            --font-sans: 'DM Sans', -apple-system, sans-serif;
            --font-mono: 'JetBrains Mono', monospace;
          }

          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          .page {
            min-height: 100vh;
            background: var(--bg);
            color: var(--text);
            font-family: var(--font-sans);
            position: relative;
            overflow-x: hidden;
          }

          .bg-gradient {
            position: fixed;
            inset: 0;
            z-index: 0;
            background:
              radial-gradient(ellipse 80% 50% at 50% -20%, rgba(255, 184, 111, 0.08), transparent),
              radial-gradient(ellipse 60% 40% at 100% 100%, rgba(255, 184, 111, 0.04), transparent);
          }

          /* Header */
          .header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 100;
            padding: 1.25rem 2rem;
            background: rgba(10, 9, 8, 0.85);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid var(--border);
          }

          .header-inner {
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .logo {
            text-decoration: none;
          }

          .logo-mark {
            font-weight: 700;
            font-size: 1.125rem;
            color: var(--accent);
            letter-spacing: 0.05em;
          }

          .nav {
            display: flex;
            align-items: center;
            gap: 2rem;
          }

          .nav-link {
            color: var(--text-muted);
            text-decoration: none;
            font-size: 0.875rem;
            font-weight: 500;
            transition: color 0.2s ease;
          }

          .nav-link:hover {
            color: var(--text);
          }

          .nav-link-accent {
            color: var(--accent);
            padding: 0.5rem 1rem;
            border: 1px solid var(--border);
            border-radius: 6px;
            transition: all 0.2s ease;
          }

          .nav-link-accent:hover {
            background: var(--accent-dim);
            border-color: var(--accent-medium);
            color: var(--accent);
          }

          /* Hero */
          .hero {
            position: relative;
            z-index: 10;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 8rem 2rem 4rem;
            max-width: 1200px;
            margin: 0 auto;
          }

          .hero-content {
            max-width: 720px;
          }

          .hero-eyebrow {
            font-size: 0.75rem;
            font-weight: 500;
            color: var(--accent);
            text-transform: uppercase;
            letter-spacing: 0.15em;
            margin-bottom: 1.5rem;
            font-family: var(--font-mono);
          }

          .hero-title {
            font-size: clamp(3rem, 8vw, 5rem);
            font-weight: 700;
            line-height: 1.05;
            letter-spacing: -0.03em;
            margin-bottom: 1.5rem;
            color: var(--text);
          }

          .hero-title-accent {
            color: var(--accent);
          }

          .hero-desc {
            font-size: 1.125rem;
            line-height: 1.7;
            color: var(--text-muted);
            max-width: 540px;
            margin-bottom: 2.5rem;
          }

          .hero-actions {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
          }

          .btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.875rem 1.5rem;
            font-size: 0.9rem;
            font-weight: 600;
            font-family: var(--font-sans);
            text-decoration: none;
            border-radius: 8px;
            transition: all 0.2s ease;
            cursor: pointer;
            border: none;
          }

          .btn-primary {
            background: var(--accent);
            color: var(--bg);
          }

          .btn-primary:hover {
            filter: brightness(1.1);
            transform: translateY(-1px);
          }

          .btn-ghost {
            background: transparent;
            color: var(--text-muted);
            border: 1px solid var(--border);
          }

          .btn-ghost:hover {
            background: var(--accent-dim);
            border-color: var(--accent-medium);
            color: var(--text);
          }

          /* Stats */
          .stats {
            display: flex;
            gap: 3rem;
            margin-top: 4rem;
            padding-top: 2rem;
            border-top: 1px solid var(--border);
          }

          .stat {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
          }

          .stat-value {
            font-size: 1.75rem;
            font-weight: 700;
            font-family: var(--font-mono);
            color: var(--text);
          }

          .stat-label {
            font-size: 0.75rem;
            color: var(--text-dim);
            text-transform: uppercase;
            letter-spacing: 0.1em;
          }

          /* Features */
          .features {
            position: relative;
            z-index: 10;
            padding: 6rem 2rem;
            max-width: 1200px;
            margin: 0 auto;
          }

          .section-title {
            font-size: 2rem;
            font-weight: 700;
            letter-spacing: -0.02em;
            margin-bottom: 0.75rem;
          }

          .section-desc {
            font-size: 1rem;
            color: var(--text-muted);
            max-width: 480px;
            line-height: 1.6;
            margin-bottom: 3rem;
          }

          .features-header {
            text-align: center;
            margin-bottom: 5rem;
          }

          .features-list {
            display: flex;
            flex-direction: column;
            gap: 6rem;
          }

          .feature-row {
            display: flex;
            align-items: center;
            gap: 4rem;
          }

          .feature-row.reverse {
            flex-direction: row-reverse;
          }

          .feature-visual {
            flex: 1;
            aspect-ratio: 4/3;
            background: var(--bg-elevated);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 2rem;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow: hidden;
          }

          .feature-visual::before {
            content: '';
            position: absolute;
            inset: 0;
            background: radial-gradient(circle at center, var(--accent-dim) 0%, transparent 70%);
            opacity: 0.5;
          }

          .feature-content {
            flex: 1;
          }

          .feature-title {
            font-size: 1.75rem;
            font-weight: 700;
            margin-bottom: 1rem;
            color: var(--text);
          }

          .feature-desc {
            font-size: 1.125rem;
            color: var(--text-muted);
            line-height: 1.7;
          }

          /* Footer */
          .footer {
            position: relative;
            z-index: 10;
            padding: 2rem;
            border-top: 1px solid var(--border);
          }

          .footer-inner {
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.875rem;
            color: var(--text-dim);
          }

          .footer-brand {
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }

          .footer-brand a {
            color: var(--accent);
            text-decoration: none;
          }

          .footer-brand a:hover {
            text-decoration: underline;
          }

          .footer-sep {
            color: var(--text-dim);
            opacity: 0.5;
          }

          .footer-copy {
            font-family: var(--font-mono);
            font-size: 0.75rem;
            letter-spacing: 0.05em;
          }

          /* Mobile */
          @media (max-width: 768px) {
            .header {
              padding: 1rem 1.25rem;
            }

            .nav {
              gap: 1rem;
            }

            .nav-link:not(.nav-link-accent) {
              display: none;
            }

            .hero {
              padding: 6rem 1.25rem 3rem;
            }

            .hero-title {
              font-size: 2.5rem;
            }

            .stats {
              flex-direction: column;
              gap: 1.5rem;
            }

            .features {
              padding: 4rem 1.25rem;
            }

            .features-header {
              text-align: left;
              margin-bottom: 3rem;
            }

            .features-list {
              gap: 4rem;
            }

            .feature-row,
            .feature-row.reverse {
              flex-direction: column;
              gap: 2rem;
            }

            .feature-visual {
              width: 100%;
            }

            .footer-inner {
              flex-direction: column;
              gap: 0.75rem;
              text-align: center;
            }
          }

          /* New Sections */
          .section {
            padding: 6rem 2rem;
          }

          .section-dark {
            padding: 6rem 2rem;
            background: var(--bg-elevated);
            border-top: 1px solid var(--border);
            border-bottom: 1px solid var(--border);
          }

          .container {
            max-width: 1200px;
            margin: 0 auto;
          }

          .section-header {
            text-align: center;
            margin-bottom: 4rem;
          }

          .architecture-diagram {
            width: 100%;
            aspect-ratio: 2/1;
            background: var(--bg);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 2rem;
            position: relative;
            overflow: hidden;
          }

          .use-cases-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
          }

          .use-case-card {
            padding: 2rem;
            background: var(--bg-elevated);
            border: 1px solid var(--border);
            border-radius: 12px;
            transition: all 0.2s ease;
          }

          .use-case-card:hover {
            border-color: var(--accent);
            transform: translateY(-4px);
          }

          .use-case-icon {
            font-size: 2.5rem;
            margin-bottom: 1.5rem;
          }

          .use-case-title {
            font-size: 1.25rem;
            font-weight: 700;
            margin-bottom: 1rem;
            color: var(--text);
          }

          .use-case-desc {
            font-size: 1rem;
            color: var(--text-muted);
            line-height: 1.6;
          }

          /* Smooth scroll */
          html {
            scroll-behavior: smooth;
            scroll-padding-top: 80px;
          }

          /* Selection */
          ::selection {
            background: var(--accent);
            color: var(--bg);
          }
        `}</style>
      </div>
    </>
  );
}
