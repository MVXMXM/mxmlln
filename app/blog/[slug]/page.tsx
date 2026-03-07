import { notFound } from 'next/navigation';
import { getAllSlugs, getPostBySlug } from '@/lib/blog';
import { MDXRemote } from 'next-mdx-remote/rsc';
import type { MDXComponents } from 'mdx/types';
import BlogImage from './BlogImage';
import Minimap from '../Minimap';

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function HeadingWithId(Tag: 'h2' | 'h3') {
  return function Heading(props: any) {
    const text = typeof props.children === 'string'
      ? props.children
      : String(props.children);
    const id = slugify(text);
    return <Tag id={id} {...props} />;
  };
}

const mdxComponents: MDXComponents = {
  img: BlogImage,
  h2: HeadingWithId('h2'),
  h3: HeadingWithId('h3'),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  a: ({ href, children, ...rest }: any) => {
    const isExternal = (href || '').startsWith('http') || (href || '').startsWith('//');
    return (
      <a
        href={href}
        {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        {...rest}
      >
        {children}
      </a>
    );
  },
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
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(month)}/${pad(day)}/${year}`;
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  return (
    <article className="blog-post">
      <Minimap />
      <header className="blog-post-header">
        <div className="blog-post-header-meta">
          Maximillian Piras{'  •  '}<time dateTime={post.date}>{formatDate(post.date)}</time>{'  •  '}{post.location ?? 'NYC'}
        </div>
        <h1>{post.title}</h1>
        {post.originalPublication && (
          <p className="originally-published">
            Originally published in{' '}
            <a href={post.originalPublication.url} target="_blank" rel="noopener noreferrer">
              {post.originalPublication.name}
            </a>
            {post.additionalPublications?.map((pub, i) => (
              <span key={i}>
                {' & '}
                <a href={pub.url} target="_blank" rel="noopener noreferrer">
                  {pub.name}
                </a>
              </span>
            ))}
          </p>
        )}
      </header>
      <div className="blog-prose">
        <MDXRemote source={post.content} components={mdxComponents} />
      </div>
    </article>
  );
}
