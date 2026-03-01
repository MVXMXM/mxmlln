import type { Metadata } from "next";
import { Archivo, Homemade_Apple } from "next/font/google";
import "./blog.css";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-archivo",
});

const homemadeApple = Homemade_Apple({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-homemade-apple",
});

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
    <div className={`blog-layout ${archivo.variable} ${homemadeApple.variable}`}>
      <div className="blog-logo">
        <a href="/blog">
          <img src="/assets/Sig2026.gif" alt="MXMLLN" width={100} height={100} />
        </a>
      </div>
      {children}
    </div>
  );
}
