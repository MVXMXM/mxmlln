import type { Metadata } from "next";
import { Archivo, Homemade_Apple, Playfair_Display } from "next/font/google";
import { BlogLogo } from "./BlogLogo";
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

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "Blog by Maximillian Piras",
  description: "Writing on software design (UX, UI, AI & so on).",
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`blog-layout ${archivo.variable} ${homemadeApple.variable} ${playfair.variable}`}>
      <BlogLogo />
      {children}
    </div>
  );
}
