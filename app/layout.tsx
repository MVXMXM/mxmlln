import type { Metadata } from "next";
import { Archivo, Homemade_Apple } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-archivo",
  display: "swap",
});

const homemadeApple = Homemade_Apple({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-homemade-apple",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Interaction Sketchbook - Maximillian Piras",
  description: "Interaction Sketchbook — a collection of interactive experiments exploring the intersection of AI and user experience design.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${archivo.variable} ${homemadeApple.variable}`}>
      <body>{children}</body>
    </html>
  );
}
