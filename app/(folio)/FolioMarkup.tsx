import fs from 'node:fs'
import path from 'node:path'

function folioBody() {
  const file = fs.readFileSync(path.join(process.cwd(), 'public/portfolio.html'), 'utf8')
  const bodyStart = file.indexOf('<body>')
  const bodyEnd = file.lastIndexOf('</body>')
  if (bodyStart === -1 || bodyEnd === -1) throw new Error('portfolio.html is missing a body')

  let html = file.slice(bodyStart + '<body>'.length, bodyEnd)
  const navStart = html.indexOf('<!-- Nav Bar -->')
  const mainStart = html.indexOf('<!-- Main Content -->')
  if (navStart === -1 || mainStart === -1 || mainStart < navStart) {
    throw new Error('portfolio.html nav markers moved')
  }
  html = html.slice(0, navStart) + html.slice(mainStart)

  return html.replace(/<script\b[\s\S]*?<\/script>/gi, '')
}

export function FolioMarkup() {
  return <div className="folio-markup" dangerouslySetInnerHTML={{ __html: folioBody() }} />
}
