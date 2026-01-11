import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Experiments - Maximillian Piras",
  description: "AI UX Experiments - A collection of interactive experiments exploring the intersection of AI and user experience design.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
