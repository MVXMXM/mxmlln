import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Spline',
  description: 'Generated from Spline',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
);
}
