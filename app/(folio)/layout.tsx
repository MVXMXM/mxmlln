import type { ReactNode } from 'react'
import type { Viewport } from 'next'
import './folio.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 0.75,
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function FolioLayout({ children }: { children: ReactNode }) {
  return (
    <div className="folio-page">
      <link rel="stylesheet" href="/css/StyleMatters.2024.css" />
      <link rel="stylesheet" href="/components/NavBar.css" />
      <link rel="stylesheet" href="/css/ProgressiveBlur.css" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,100..900;1,100..900&family=Homemade+Apple&family=Playfair+Display+SC:ital,wght@0,400;0,700;0,900;1,400;1,700;1,900&display=swap"
      />
      {children}
    </div>
  )
}
