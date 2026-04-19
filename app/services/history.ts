export interface HistoryEntry {
  id: string
  url: string
  title: string
  visitCount: number
  typedCount: number
  lastVisitTime: number
  platformId?: string // Track which platform this visit was from
}

const STORAGE_KEY = 'browser-history'
const MAX_HISTORY_ENTRIES = 10000 // Maximum number of history entries
const MAX_AGE_DAYS = 90 // Keep history for 90 days

/**
 * Normalize URL for history storage (remove trailing slashes, etc.)
 */
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    // Remove trailing slash unless it's root
    if (urlObj.pathname !== '/' && urlObj.pathname.endsWith('/')) {
      urlObj.pathname = urlObj.pathname.slice(0, -1)
    }
    return urlObj.toString()
  } catch {
    return url
  }
}

/**
 * Load history from localStorage
 */
export function loadHistory(): HistoryEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    const entries: HistoryEntry[] = JSON.parse(stored)
    
    // Filter out old entries and validate
    const now = Date.now()
    const maxAge = MAX_AGE_DAYS * 24 * 60 * 60 * 1000
    return entries
      .filter((entry) => {
        // Keep entry if it's within max age
        return now - entry.lastVisitTime < maxAge
      })
      .slice(0, MAX_HISTORY_ENTRIES) // Limit total entries
  } catch {
    return []
  }
}

/**
 * Save history to localStorage
 */
export function saveHistory(entries: HistoryEntry[]): void {
  try {
    // Limit to max entries and sort by last visit time (most recent first)
    const sorted = entries
      .sort((a, b) => b.lastVisitTime - a.lastVisitTime)
      .slice(0, MAX_HISTORY_ENTRIES)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted))
  } catch {
    // Ignore storage errors
  }
}

/**
 * Add or update a history entry
 */
export function addHistoryEntry(
  url: string,
  title: string = '',
  isTyped: boolean = false,
  platformId?: string
): void {
  const normalizedUrl = normalizeUrl(url)
  if (!normalizedUrl || normalizedUrl === 'about:blank') return

  const entries = loadHistory()
  const existingIndex = entries.findIndex((e) => e.url === normalizedUrl)

  if (existingIndex >= 0) {
    // Update existing entry
    const existing = entries[existingIndex]
    existing.visitCount += 1
    existing.lastVisitTime = Date.now()
    if (title && title.trim()) {
      existing.title = title
    }
    if (isTyped) {
      existing.typedCount += 1
    }
    if (platformId) {
      existing.platformId = platformId
    }
  } else {
    // Create new entry
    const newEntry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url: normalizedUrl,
      title: title || normalizedUrl,
      visitCount: 1,
      typedCount: isTyped ? 1 : 0,
      lastVisitTime: Date.now(),
      platformId,
    }
    entries.push(newEntry)
  }

  saveHistory(entries)
}

/**
 * Get history entries matching a query
 */
export function searchHistory(query: string, limit: number = 50): HistoryEntry[] {
  if (!query || !query.trim()) return []
  
  const entries = loadHistory()
  const queryLower = query.toLowerCase().trim()
  
  return entries
    .filter((entry) => {
      const urlLower = entry.url.toLowerCase()
      const titleLower = entry.title.toLowerCase()
      return urlLower.includes(queryLower) || titleLower.includes(queryLower)
    })
    .slice(0, limit)
}

/**
 * Get all history entries sorted by last visit time
 */
export function getAllHistory(limit?: number): HistoryEntry[] {
  const entries = loadHistory()
  if (limit) {
    return entries.slice(0, limit)
  }
  return entries
}

/**
 * Get history for a specific platform
 */
export function getPlatformHistory(platformId: string, limit: number = 100): HistoryEntry[] {
  const entries = loadHistory()
  return entries
    .filter((entry) => entry.platformId === platformId)
    .slice(0, limit)
}

/**
 * Delete a history entry by URL
 */
export function deleteHistoryEntry(url: string): void {
  const entries = loadHistory()
  const normalizedUrl = normalizeUrl(url)
  const filtered = entries.filter((e) => e.url !== normalizedUrl)
  saveHistory(filtered)
}

/**
 * Delete multiple history entries by URLs
 */
export function deleteHistoryEntries(urls: string[]): void {
  const entries = loadHistory()
  const normalizedUrls = new Set(urls.map(normalizeUrl))
  const filtered = entries.filter((e) => !normalizedUrls.has(e.url))
  saveHistory(filtered)
}

/**
 * Clear all history
 */
export function clearHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore errors
  }
}

/**
 * Clear history older than specified days
 */
export function clearOldHistory(days: number = MAX_AGE_DAYS): void {
  const entries = loadHistory()
  const now = Date.now()
  const maxAge = days * 24 * 60 * 60 * 1000
  const filtered = entries.filter((entry) => now - entry.lastVisitTime < maxAge)
  saveHistory(filtered)
}

/**
 * Get history statistics
 */
export function getHistoryStats(): { totalEntries: number; totalVisits: number; oldestEntry: number | null } {
  const entries = loadHistory()
  const totalVisits = entries.reduce((sum, entry) => sum + entry.visitCount, 0)
  const oldestEntry = entries.length > 0 
    ? Math.min(...entries.map((e) => e.lastVisitTime))
    : null
  
  return {
    totalEntries: entries.length,
    totalVisits,
    oldestEntry,
  }
}
