import type { Metadata } from 'next'
import Script from 'next/script'
import { FolioMarkup } from './FolioMarkup'
import { FolioScripts } from './FolioScripts'
import { HomeDock } from './HomeDock'

const description =
  'The design portfolio of Maximillian Piras: product design for tech startups (user experience & user interfaces) focused on AI, branding, animation, & illustration.'

export const metadata: Metadata = {
  title: 'Maximillian Piras, Design Portfolio',
  description,
  icons: { icon: 'https://www.maximin.design/MXMLLN.ico' },
  openGraph: {
    title: 'Design Portfolio by Maximillian Piras',
    description,
    url: 'https://www.maximin.design',
    siteName: 'Maximillian Piras',
    images: ['https://www.maximin.design/og.png'],
    type: 'website',
  },
}

export default function Page() {
  return (
    <>
      <FolioMarkup />
      <HomeDock />
      <FolioScripts />
      <Script src="https://www.googletagmanager.com/gtag/js?id=UA-36917341-6" strategy="afterInteractive" />
      <Script id="folio-gtag" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','UA-36917341-6');`}
      </Script>
    </>
  )
}
