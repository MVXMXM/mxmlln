import fs from 'node:fs'
import path from 'node:path'

function folioBody() {
  const file = fs.readFileSync(path.join(process.cwd(), 'public/portfolio.html'), 'utf8')
  const bodyStart = file.indexOf('<body>')
  const bodyEnd = file.lastIndexOf('</body>')
  if (bodyStart === -1 || bodyEnd === -1) throw new Error('portfolio.html is missing a body')

  let html = file.slice(bodyStart + '<body>'.length, bodyEnd)
  const navStart = html.indexOf('<!-- Nav Bar -->')
  const fadeStart = html.indexOf('<div class="bottomFade"')
  if (navStart === -1 || fadeStart === -1 || fadeStart < navStart) {
    throw new Error('portfolio.html nav markers moved')
  }
  html = html.slice(0, navStart) + html.slice(fadeStart)

  const overlayStart = html.indexOf('<div class="navBarOverlay"')
  const overlayEnd = overlayStart === -1 ? -1 : html.indexOf('</div>', overlayStart)
  if (overlayStart !== -1 && overlayEnd !== -1) {
    html = html.slice(0, overlayStart) + html.slice(overlayEnd + '</div>'.length)
  }

  return html.replace(/<script\b[\s\S]*?<\/script>/gi, '')
}

export function FolioMarkup() {
  return <div className="folio-markup" dangerouslySetInnerHTML={{ __html: folioBody() }} />
}
