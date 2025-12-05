// @ts-nocheck
import { page } from "fresh";
import { Head } from "fresh/runtime";
import { getPosts, formatDate, type Post } from "../../utils/posts.ts";

export const handler = {
  async GET(_ctx: any) {
    try {
      const posts = await getPosts();
      return page({ posts });
    } catch (error) {
      console.error("Error loading posts:", error);
      return page({ posts: [] });
    }
  },
};

export default function BlogIndex({ data }: { data: { posts: Post[] } }) {
  const { posts } = data;

  return (
    <>
      <Head>
        <title>Blog - CAI</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta
          name="description"
          content="Engineering insights, technical deep-dives, and lessons learned building Collective Agentic Intelligence."
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <link rel="alternate" type="application/atom+xml" title="CAI Blog Feed" href="/blog/feed.xml" />
      </Head>

      <div class="page">
        <header class="header">
          <div class="header-inner">
            <a href="/" class="logo">
              <span class="logo-mark">CAI</span>
              <span class="logo-text">Collective Agentic Intelligence</span>
            </a>
            <nav class="nav">
              <a href="/" class="nav-link">Home</a>
              <a href="/blog" class="nav-link nav-link-active">Blog</a>
              <a href="/dashboard" class="nav-link">Dashboard</a>
              <a href="/blog/feed.xml" class="nav-link nav-link-rss" title="RSS Feed">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="6.18" cy="17.82" r="2.18"/>
                  <path d="M4 4.44v2.83c7.03 0 12.73 5.7 12.73 12.73h2.83c0-8.59-6.97-15.56-15.56-15.56zm0 5.66v2.83c3.9 0 7.07 3.17 7.07 7.07h2.83c0-5.47-4.43-9.9-9.9-9.9z"/>
                </svg>
              </a>
            </nav>
          </div>
        </header>

        <main class="blog-main">
          <div class="container">
            <div class="blog-header">
              <span class="section-label">Engineering Blog</span>
              <h1 class="blog-title">Insights & Deep Dives</h1>
              <p class="blog-desc">
                Technical explorations, debugging stories, and lessons learned building CAI.
              </p>
            </div>

            <div class="posts-grid">
              {posts.length === 0 ? (
                <p class="no-posts">No posts yet. Check back soon!</p>
              ) : (
                posts.map((post: Post) => (
                  <article class="post-card" key={post.slug}>
                    <div class="post-meta">
                      <span class="post-category">{post.category}</span>
                      <time class="post-date">{formatDate(post.date)}</time>
                    </div>
                    <h2 class="post-title">
                      <a href={`/blog/${post.slug}`}>{post.title}</a>
                    </h2>
                    <p class="post-snippet">{post.snippet}</p>
                    <div class="post-footer">
                      <div class="post-tags">
                        {post.tags.slice(0, 3).map((tag) => (
                          <span class="post-tag" key={tag}>#{tag}</span>
                        ))}
                      </div>
                      <a href={`/blog/${post.slug}`} class="post-read-more">
                        Read more →
                      </a>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </main>

        <footer class="footer">
          <div class="footer-inner">
            <div class="footer-brand">
              <span class="logo-mark">CAI</span>
              <span class="footer-tagline">Collective Agentic Intelligence</span>
            </div>
            <div class="footer-links">
              <a href="https://casys.ai" target="_blank" rel="noopener">Casys.ai</a>
              <a href="https://github.com/Casys-AI/casys-intelligence" target="_blank" rel="noopener">GitHub</a>
              <a href="/dashboard">Dashboard</a>
            </div>
          </div>
        </footer>

        <style>{`
          :root {
            --bg: #08080a;
            --bg-elevated: #0f0f12;
            --bg-card: #141418;
            --accent: #FFB86F;
            --accent-dim: rgba(255, 184, 111, 0.1);
            --accent-medium: rgba(255, 184, 111, 0.2);
            --purple: #a78bfa;
            --green: #4ade80;
            --text: #f0ede8;
            --text-muted: #a8a29e;
            --text-dim: #6b6560;
            --border: rgba(255, 184, 111, 0.08);
            --border-strong: rgba(255, 184, 111, 0.15);
            --font-display: 'Instrument Serif', Georgia, serif;
            --font-sans: 'Geist', -apple-system, system-ui, sans-serif;
            --font-mono: 'Geist Mono', monospace;
          }

          * { margin: 0; padding: 0; box-sizing: border-box; }

          .page {
            min-height: 100vh;
            background: var(--bg);
            color: var(--text);
            font-family: var(--font-sans);
            display: flex;
            flex-direction: column;
          }

          .container {
            max-width: 1000px;
            margin: 0 auto;
            padding: 0 2rem;
          }

          /* Header */
          .header {
            position: sticky;
            top: 0;
            z-index: 100;
            padding: 1rem 2rem;
            background: rgba(8, 8, 10, 0.9);
            backdrop-filter: blur(20px);
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
            display: flex;
            align-items: center;
            gap: 1rem;
            text-decoration: none;
          }

          .logo-mark {
            font-family: var(--font-display);
            font-size: 1.5rem;
            color: var(--accent);
          }

          .logo-text {
            font-size: 0.75rem;
            color: var(--text-dim);
            letter-spacing: 0.1em;
            text-transform: uppercase;
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
            transition: color 0.2s;
          }

          .nav-link:hover, .nav-link-active {
            color: var(--accent);
          }

          .nav-link-rss {
            display: flex;
            padding: 0.5rem;
            border-radius: 6px;
          }

          .nav-link-rss:hover {
            background: var(--accent-dim);
          }

          /* Blog Main */
          .blog-main {
            flex: 1;
            padding: 6rem 0 4rem;
          }

          .blog-header {
            text-align: center;
            margin-bottom: 4rem;
          }

          .section-label {
            display: inline-block;
            font-family: var(--font-mono);
            font-size: 0.7rem;
            color: var(--accent);
            text-transform: uppercase;
            letter-spacing: 0.15em;
            padding: 0.5rem 1rem;
            background: var(--accent-dim);
            border-radius: 4px;
            margin-bottom: 1.5rem;
          }

          .blog-title {
            font-family: var(--font-display);
            font-size: 3rem;
            font-weight: 400;
            margin-bottom: 1rem;
          }

          .blog-desc {
            font-size: 1.125rem;
            color: var(--text-muted);
            max-width: 500px;
            margin: 0 auto;
          }

          /* Posts Grid */
          .posts-grid {
            display: grid;
            gap: 2rem;
          }

          .no-posts {
            text-align: center;
            color: var(--text-muted);
            padding: 4rem;
          }

          .post-card {
            padding: 2rem;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 12px;
            transition: all 0.2s;
          }

          .post-card:hover {
            border-color: var(--accent);
            transform: translateY(-2px);
          }

          .post-meta {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1rem;
          }

          .post-category {
            font-family: var(--font-mono);
            font-size: 0.7rem;
            color: var(--accent);
            text-transform: uppercase;
            letter-spacing: 0.1em;
            padding: 0.25rem 0.75rem;
            background: var(--accent-dim);
            border-radius: 4px;
          }

          .post-date {
            font-size: 0.875rem;
            color: var(--text-dim);
          }

          .post-title {
            font-family: var(--font-display);
            font-size: 1.5rem;
            font-weight: 400;
            margin-bottom: 0.75rem;
          }

          .post-title a {
            color: var(--text);
            text-decoration: none;
          }

          .post-title a:hover {
            color: var(--accent);
          }

          .post-snippet {
            font-size: 1rem;
            color: var(--text-muted);
            line-height: 1.6;
            margin-bottom: 1.5rem;
          }

          .post-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .post-tags {
            display: flex;
            gap: 0.5rem;
          }

          .post-tag {
            font-family: var(--font-mono);
            font-size: 0.75rem;
            color: var(--text-dim);
          }

          .post-read-more {
            font-size: 0.875rem;
            color: var(--accent);
            text-decoration: none;
            font-weight: 500;
          }

          .post-read-more:hover {
            text-decoration: underline;
          }

          /* Footer */
          .footer {
            padding: 2rem;
            border-top: 1px solid var(--border);
          }

          .footer-inner {
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .footer-brand {
            display: flex;
            align-items: center;
            gap: 1rem;
          }

          .footer-tagline {
            font-size: 0.75rem;
            color: var(--text-dim);
            text-transform: uppercase;
            letter-spacing: 0.1em;
          }

          .footer-links {
            display: flex;
            gap: 2rem;
          }

          .footer-links a {
            color: var(--text-muted);
            text-decoration: none;
            font-size: 0.875rem;
          }

          .footer-links a:hover {
            color: var(--accent);
          }

          @media (max-width: 768px) {
            .header { padding: 1rem; }
            .logo-text { display: none; }
            .nav { gap: 1rem; }
            .blog-main { padding: 4rem 0 2rem; }
            .blog-title { font-size: 2rem; }
            .post-card { padding: 1.5rem; }
            .post-footer { flex-direction: column; align-items: flex-start; gap: 1rem; }
            .footer-inner { flex-direction: column; gap: 1.5rem; text-align: center; }
          }
        `}</style>
      </div>
    </>
  );
}
