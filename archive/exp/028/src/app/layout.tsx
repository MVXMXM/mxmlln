import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MXMLLN EXP 028",
  description: "Lil web tests",
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

