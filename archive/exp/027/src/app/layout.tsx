import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MXMLLN EXP 027",
  description: "ChatBar component",
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

