import type { Metadata } from "next";
import './blog.css';

export const metadata: Metadata = {
  title: "Blog — Maximillian Piras",
  description: "Writing on software design.",
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="blog-layout">
      <div className="blog-logo">
        <a href="/blog">
          <img src="/assets/Sig2026.gif" alt="MXMLLN" width={100} height={100} />
        </a>
      </div>
      {children}
    </div>
  );
}
