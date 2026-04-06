import { formatBlogDate, getAllPosts } from '@/lib/blog';
import Link from 'next/link';
import Minimap from './Minimap';

export default function BlogIndex() {
  const posts = getAllPosts();

  return (
    <main className="blog-index">
      <Minimap selector=".blog-post-preview[id]" />
      <div className="blog-index-title-block">
        <div className="blog-index-title-script">Words by Maximillian Piras</div>
        <h1>Form follows functionality.</h1>
      </div>
      {posts.length === 0 ? (
        <p className="blog-empty">Nothing here yet.</p>
      ) : (
        <div className="blog-post-list">
          {posts.map((post) => (
            <Link
              key={post.slug}
              id={post.slug}
              href={`/blog/${post.slug}`}
              className="blog-post-preview"
              data-minimap-label={post.title}
            >
              <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
              <h2>{post.title}</h2>
              {post.description && <p>{post.description}</p>}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
