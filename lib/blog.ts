import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

export function formatBlogDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(month)}/${pad(day)}/${year}`;
}

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  description: string;
  tags?: string[];
  originalPublication?: { name: string; url: string };
  additionalPublications?: { name: string; url: string }[];
  location?: string;
  content: string;
}

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.mdx'));

  const posts = files.map((filename) => {
    const slug = filename.replace(/\.mdx$/, '');
    const filePath = path.join(BLOG_DIR, filename);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(raw);

    return {
      slug,
      title: data.title || slug,
      date: data.date || '',
      description: data.description || '',
      tags: data.tags || [],
      originalPublication: data.originalPublication || undefined,
      additionalPublications: data.additionalPublications || undefined,
      location: data.location ?? 'NYC',
      content,
    };
  });

  return posts.sort((a, b) => (a.date > b.date ? -1 : 1));
}

export function getPostBySlug(slug: string): BlogPost | null {
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);

  return {
    slug,
    title: data.title || slug,
    date: data.date || '',
    description: data.description || '',
    tags: data.tags || [],
    originalPublication: data.originalPublication || undefined,
    additionalPublications: data.additionalPublications || undefined,
    location: data.location ?? 'NYC',
    content,
  };
}

export function getAllSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter(f => f.endsWith('.mdx'))
    .map(f => f.replace(/\.mdx$/, ''));
}

function countTagOverlap(a: BlogPost, b: BlogPost): number {
  const tags = new Set((a.tags ?? []).map((t) => t.toLowerCase()));
  return (b.tags ?? []).filter((t) => tags.has(t.toLowerCase())).length;
}

/**
 * Up to `limit` posts to show after an article: prefer tag overlap (score, then newer),
 * then chronological neighbors (older, newer, older+1, …) for the rest.
 */
export function getSuggestedNextPosts(currentSlug: string, limit = 2): BlogPost[] {
  const all = getAllPosts();
  const current = all.find((p) => p.slug === currentSlug);
  if (!current) return [];

  const others = all.filter((p) => p.slug !== currentSlug);
  if (others.length === 0) return [];

  const scored = others.map((post) => ({
    post,
    overlap: countTagOverlap(current, post),
  }));

  scored.sort((a, b) => {
    if (b.overlap !== a.overlap) return b.overlap - a.overlap;
    return b.post.date.localeCompare(a.post.date);
  });

  const result: BlogPost[] = [];
  const used = new Set<string>();

  for (const { post, overlap } of scored) {
    if (result.length >= limit) break;
    if (overlap > 0) {
      result.push(post);
      used.add(post.slug);
    }
  }

  const idx = all.findIndex((p) => p.slug === currentSlug);
  if (idx >= 0) {
    const chronological: BlogPost[] = [];
    for (let d = 1; d < all.length; d++) {
      if (idx + d < all.length) chronological.push(all[idx + d]);
      if (idx - d >= 0) chronological.push(all[idx - d]);
    }
    for (const post of chronological) {
      if (result.length >= limit) break;
      if (!used.has(post.slug)) {
        result.push(post);
        used.add(post.slug);
      }
    }
  }

  for (const { post } of scored) {
    if (result.length >= limit) break;
    if (!used.has(post.slug)) {
      result.push(post);
      used.add(post.slug);
    }
  }

  return result.slice(0, limit);
}
