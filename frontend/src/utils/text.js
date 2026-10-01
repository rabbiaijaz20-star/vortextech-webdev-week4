// Turn Remotive's HTML descriptions into plain text.
// keepBreaks: keep paragraph/list line breaks (detail page). Otherwise one line (card snippets).
export function stripHtml(html, keepBreaks = true) {
  if (!html) return ''
  const withBreaks = html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|ul|ol)>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '\n• ')
  const tmp = document.createElement('div')
  tmp.innerHTML = withBreaks
  const text = tmp.textContent || tmp.innerText || ''
  if (!keepBreaks) return text.replace(/\s+/g, ' ').trim()
  return text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

export function snippet(html, max = 120) {
  const text = stripHtml(html, false)
  if (text.length <= max) return text
  return text.slice(0, max).replace(/\s+\S*$/, '') + '…'
}
