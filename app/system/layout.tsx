import type { Metadata } from 'next';
import { Archivo, Homemade_Apple, Inter, Playfair_Display } from 'next/font/google';
import localFont from 'next/font/local';
import { SiteLogo } from '../components/SiteLogo';

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-archivo',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const homemadeApple = Homemade_Apple({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-homemade-apple',
});

const jetbrains = localFont({
  src: './fonts/JetBrainsMono-Variable.woff2',
  weight: '100 800',
  variable: '--font-jetbrains',
  display: 'swap',
  adjustFontFallback: false,
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: '600',
  variable: '--font-playfair',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Design System — Maximillian Piras',
};

export default function SystemLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`system-layout ${archivo.variable} ${inter.variable} ${homemadeApple.variable} ${jetbrains.variable} ${playfair.variable}`}>
      <SiteLogo
        href="/"
        ariaLabel="Back to maximin.design"
        spin
        className="system-logo"
        lottieClassName="system-logo-lottie"
      />
      {children}
    </div>
  );
}
