'use client'

// Lightweight, safe markdown-ish renderer for "Sobre" content.
// Supports: # H1, ## H2, ### H3, **bold**, *italic*, - lists, blank lines, paragraphs.
// Escapes raw HTML to avoid XSS.
function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}
function inline(s) {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
}

export function RichText({ source, className = '' }) {
  const lines = String(source || '').split('\n')
  const out = []
  let listBuf = []
  const flushList = () => {
    if (listBuf.length) {
      out.push(`<ul class="my-3 ml-5 list-disc space-y-1">${listBuf.map((i) => `<li>${inline(i)}</li>`).join('')}</ul>`)
      listBuf = []
    }
  }
  for (const raw of lines) {
    const line = raw.trim()
    if (line.startsWith('- ')) { listBuf.push(line.slice(2)); continue }
    flushList()
    if (!line) { out.push(''); continue }
    if (line.startsWith('### ')) { out.push(`<h3 class="mt-4 mb-2 text-lg font-semibold">${inline(line.slice(4))}</h3>`); continue }
    if (line.startsWith('## ')) { out.push(`<h2 class="mt-5 mb-2 text-xl font-bold text-brand">${inline(line.slice(3))}</h2>`); continue }
    if (line.startsWith('# ')) { out.push(`<h1 class="mt-3 mb-3 text-2xl font-bold">${inline(line.slice(2))}</h1>`); continue }
    out.push(`<p class="my-2 leading-relaxed">${inline(line)}</p>`)
  }
  flushList()
  return <div className={`prose-richtext text-foreground ${className}`} dangerouslySetInnerHTML={{ __html: out.filter(Boolean).join('\n') }} />
}

export default RichText
