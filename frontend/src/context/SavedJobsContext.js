// Simple localStorage-backed helpers for bookmarking jobs.
const KEY = 'outpost_saved_jobs'

export function getSavedIds() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function isSaved(id) {
  return getSavedIds().includes(String(id))
}

export function toggleSaved(id) {
  const ids = getSavedIds()
  const strId = String(id)
  const next = ids.includes(strId) ? ids.filter((x) => x !== strId) : [...ids, strId]
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}
