import fs from 'node:fs'
import path from 'node:path'

function folioBody() {
  const file = fs.readFileSync(path.join(process.cwd(), 'content/folio/portfolio.html'), 'utf8')
  const bodyStart = file.indexOf('<body>')
  const bodyEnd = file.lastIndexOf('</body>')
  if (bodyStart === -1 || bodyEnd === -1) throw new Error('folio portfolio markup is missing a body')

  const html = file.slice(bodyStart + '<body>'.length, bodyEnd)
  return html.replace(/<script\b[\s\S]*?<\/script>/gi, '')
}

export function FolioMarkup() {
  return <div className="folio-markup" dangerouslySetInnerHTML={{ __html: folioBody() }} />
}
