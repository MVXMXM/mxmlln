import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SVG Transition Test",
  description: "SVG mask transition animation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

