import { notFound } from 'next/navigation';
import { getAllSlugs, getPostBySlug } from '@/lib/blog';
import { MDXRemote } from 'next-mdx-remote/rsc';
import Link from 'next/link';
import type { MDXComponents } from 'mdx/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BlogImage(props: any) {
  return (
    <figure className="blog-figure">
      <img {...props} />
      {props.alt && <figcaption>{props.alt}</figcaption>}
    </figure>
  );
}

const mdxComponents: MDXComponents = {
  img: BlogImage,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  p: (props: any) => {
    const children = props.children;
    if (
      children &&
      typeof children === 'object' &&
      'type' in children &&
      children.type === BlogImage
    ) {
      return <>{children}</>;
    }
    return <p {...props} />;
  },
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return {
    title: `${post.title} — Maximillian Piras`,
    description: post.description,
  };
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  return (
    <article className="blog-post">
      <Link href="/blog" className="blog-back">
        ← All posts
      </Link>
      <header className="blog-post-header">
        <time dateTime={post.date}>{formatDate(post.date)}</time>
        <h1>{post.title}</h1>
        {post.description && (
          <p className="description">{post.description}</p>
        )}
        {post.originalPublication && (
          <p className="originally-published">
            Originally published in{' '}
            <a href={post.originalPublication.url} target="_blank" rel="noopener noreferrer">
              {post.originalPublication.name}
            </a>
          </p>
        )}
      </header>
      <div className="blog-prose">
        <MDXRemote source={post.content} components={mdxComponents} />
      </div>
    </article>
  );
}
