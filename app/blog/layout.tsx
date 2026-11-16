import type { Metadata } from "next";
import { Archivo, Homemade_Apple, JetBrains_Mono } from "next/font/google";
import { BlogLogo } from "./BlogLogo";
import "./blog.css";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-archivo",
});

const homemadeApple = Homemade_Apple({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-homemade-apple",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
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
    <div className={`blog-layout ${archivo.variable} ${homemadeApple.variable} ${jetbrains.variable}`}>
      <BlogLogo />
      {children}
    </div>
  );
}
