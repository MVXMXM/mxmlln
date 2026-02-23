import { getAllPosts } from '@/lib/blog';
import Link from 'next/link';

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function BlogIndex() {
  const posts = getAllPosts();

  return (
    <main className="blog-index">
      <h1>Words by Maximillian Piras</h1>
      {posts.length === 0 ? (
        <p className="blog-empty">Nothing here yet.</p>
      ) : (
        <div className="blog-post-list">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="blog-post-preview"
            >
              <time dateTime={post.date}>{formatDate(post.date)}</time>
              <h2>{post.title}</h2>
              {post.description && <p>{post.description}</p>}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
