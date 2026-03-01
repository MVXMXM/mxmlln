import { getAllPosts } from '@/lib/blog';
import Link from 'next/link';

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(month)}/${pad(day)}/${year}`;
}

export default function BlogIndex() {
  const posts = getAllPosts();

  return (
    <main className="blog-index">
      <div className="blog-index-title-block">
        <div className="blog-index-title-script">Words by Maximillian Piras</div>
        <h1>Designer&apos;s Log</h1>
      </div>
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
              <time dateTime={post.date}>{formatDate(post.date)} • {' '}{post.location ?? 'NYC'}</time>
              <h2>{post.title}</h2>
              {post.description && <p>{post.description}</p>}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
