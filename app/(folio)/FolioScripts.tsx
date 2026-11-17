'use client'

import { useEffect } from 'react'

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = false
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(src))
    document.body.appendChild(script)
  })
}

function initIntroLottie() {
  const lottie = window.lottie
  const container = document.getElementById('introLoader')
  const fallback = document.getElementById('introLoaderFallback')
  if (!lottie || !container) return
  const anim = lottie.loadAnimation({
    container,
    renderer: 'svg',
    loop: true,
    autoplay: true,
    path: '/assets/WebIntro.json',
  })
  anim.addEventListener('DOMLoaded', () => {
    if (fallback) fallback.style.display = 'none'
  })
}

function mountOverlayScroll() {
  document.documentElement.classList.add('overlayScroll')
  return loadScript('/components/ScrollThumb.js').then(() => {
    window.mountScrollThumb?.()
  })
}

export function FolioScripts() {
  useEffect(() => {
    // portfolio.html sets this on <html>. The root layout owns that element here.
    mountOverlayScroll()

    const releaseScroll = () => {
      document.documentElement.classList.remove('overlayScroll')
      window.disposeScrollThumb?.()
    }

    if (window.__folioBootStarted) return releaseScroll
    window.__folioBootStarted = true

    async function boot() {
      await loadScript('https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js')
      await loadScript('/js/IntenseImages/intense.js')
      await loadScript('/components/FolioEngine.js')
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie_light.min.js')
      initIntroLottie()
    }

    boot().catch(() => {
      document.querySelector('.folio-dock')?.classList.add('is-in')
    })

    return releaseScroll
  }, [])

  return null
}
