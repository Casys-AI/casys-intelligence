import { extract } from "@std/front-matter/yaml";
import { render } from "@deno/gfm";
import { dirname, join } from "@std/path";

// Import Prism language support for syntax highlighting
import "npm:prismjs@1.29.0/components/prism-typescript.js";
import "npm:prismjs@1.29.0/components/prism-javascript.js";
import "npm:prismjs@1.29.0/components/prism-bash.js";
import "npm:prismjs@1.29.0/components/prism-json.js";
import "npm:prismjs@1.29.0/components/prism-yaml.js";
import "npm:prismjs@1.29.0/components/prism-jsx.js";
import "npm:prismjs@1.29.0/components/prism-tsx.js";

export interface PostFrontmatter {
  title: string;
  slug: string;
  date: string;
  category: string;
  tags: string[];
  snippet: string;
  format?: string;
  language?: string;
  author?: string;
}

export interface Post {
  slug: string;
  title: string;
  date: Date;
  category: string;
  tags: string[];
  snippet: string;
  author: string;
  content: string;
  html: string;
}

// More robust path resolution - works in dev and production
const getPostsDir = (): string => {
  const currentDir = dirname(new URL(import.meta.url).pathname);
  return join(currentDir, "../posts");
};

const POSTS_DIR = getPostsDir();

export async function getPosts(): Promise<Post[]> {
  const posts: Post[] = [];

  for await (const entry of Deno.readDir(POSTS_DIR)) {
    if (entry.isFile && entry.name.endsWith(".md")) {
      const post = await getPostByFilename(entry.name);
      if (post) {
        posts.push(post);
      }
    }
  }

  // Sort by date descending (newest first)
  posts.sort((a, b) => b.date.getTime() - a.date.getTime());

  return posts;
}

export async function getPost(slug: string): Promise<Post | null> {
  // Optimized: read file directly instead of listing all posts
  try {
    // Try reading with slug as filename
    const possiblePaths = [
      join(POSTS_DIR, `${slug}.md`),
      // Try with date prefix (common pattern: YYYY-MM-DD-slug.md)
    ];

    // Also check for files that end with the slug
    for await (const entry of Deno.readDir(POSTS_DIR)) {
      if (entry.isFile && entry.name.endsWith(`${slug}.md`)) {
        possiblePaths.push(join(POSTS_DIR, entry.name));
      }
    }

    // Try each path
    for (const path of possiblePaths) {
      try {
        const content = await Deno.readTextFile(path);
        const filename = path.split("/").pop() || "";
        return await getPostByFilename(filename, content);
      } catch {
        // File doesn't exist, try next path
        continue;
      }
    }

    return null;
  } catch (error) {
    console.error(`Error reading post ${slug}:`, error);
    return null;
  }
}

async function getPostByFilename(filename: string, content?: string): Promise<Post | null> {
  try {
    // If content not provided, read from file
    if (!content) {
      const filePath = join(POSTS_DIR, filename);
      content = await Deno.readTextFile(filePath);
    }

    const { attrs, body } = extract<PostFrontmatter>(content);

    // Validation: Check required fields
    if (!attrs.title || !attrs.date) {
      console.error(`Post ${filename}: Missing required frontmatter (title or date)`);
      return null;
    }

    // Validation: Check date is valid
    const postDate = new Date(attrs.date);
    if (isNaN(postDate.getTime())) {
      console.error(`Post ${filename}: Invalid date format: ${attrs.date}`);
      return null;
    }

    // Validation: Slug should be URL-safe
    const slug = attrs.slug || filename.replace(/\.md$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, "");
    if (!/^[a-z0-9-]+$/.test(slug)) {
      console.warn(`Post ${filename}: Slug contains non-URL-safe characters: ${slug}`);
    }

    // Render markdown to HTML with GFM (includes sanitization)
    const html = render(body);

    return {
      slug,
      title: attrs.title,
      date: postDate,
      category: attrs.category || "general",
      tags: Array.isArray(attrs.tags) ? attrs.tags : [],
      snippet: attrs.snippet || "",
      author: attrs.author || "CAI Team",
      content: body,
      html,
    };
  } catch (error) {
    console.error(`Error parsing post ${filename}:`, error);
    return null;
  }
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
