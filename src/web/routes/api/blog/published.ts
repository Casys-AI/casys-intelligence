import { getPosts, type Post } from "../../../utils/posts.ts";

interface WebhookPayload {
  event: "post_published";
  post: {
    slug: string;
    title: string;
    url: string;
    snippet: string;
    tags: string[];
    date: string;
  };
  feedUrl: string;
  timestamp: string;
}

const SITE_URL = "https://intelligence.casys.ai";

export const handler = {
  async GET(_req: Request): Promise<Response> {
    try {
      // GET: Returns latest published posts info (for Make.com polling)
      const posts = await getPosts();
      const latestPosts = posts.slice(0, 5);

      return new Response(
        JSON.stringify({
          posts: latestPosts.map((post) => ({
            slug: post.slug,
            title: post.title,
            url: `${SITE_URL}/blog/${post.slug}`,
            snippet: post.snippet,
            tags: post.tags,
            date: post.date.toISOString(),
          })),
          feedUrl: `${SITE_URL}/blog/feed.xml`,
          updatedAt: new Date().toISOString(),
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=300",
          },
        }
      );
    } catch (error) {
      console.error("Error in published API:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch posts" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },

  async POST(req: Request): Promise<Response> {
    try {
      // POST: Webhook trigger for external services (e.g., after deploy)
      // Body can optionally specify which post was published
      let body: { slug?: string } = {};
      try {
        body = await req.json();
      } catch {
        // No body is fine, we'll return latest post
      }

      const posts = await getPosts();

      let targetPost: Post | undefined;
      if (body.slug) {
        targetPost = posts.find((p) => p.slug === body.slug);
      } else {
        targetPost = posts[0]; // Latest post
      }

      if (!targetPost) {
        return new Response(
          JSON.stringify({ error: "Post not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      const payload: WebhookPayload = {
        event: "post_published",
        post: {
          slug: targetPost.slug,
          title: targetPost.title,
          url: `${SITE_URL}/blog/${targetPost.slug}`,
          snippet: targetPost.snippet,
          tags: targetPost.tags,
          date: targetPost.date.toISOString(),
        },
        feedUrl: `${SITE_URL}/blog/feed.xml`,
        timestamp: new Date().toISOString(),
      };

      // Note: In production, this would trigger external webhooks
      // For now, just return the payload that would be sent
      return new Response(JSON.stringify(payload), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error in webhook POST:", error);
      return new Response(
        JSON.stringify({ error: "Failed to process webhook" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
