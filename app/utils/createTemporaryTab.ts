import { Tab } from '@/app/types/tab'

export function createTemporaryTab(url: string, title?: string): Tab {
  const id = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  // For new tabs from links, use domain as initial name - it will be updated when page loads
  // Only use provided title if it's meaningful (not empty, not just domain)
  const hostname = safeHostname(url)
  const name = (title && title.trim() && title.trim() !== hostname) 
    ? title.trim() 
    : hostname || 'New Tab'
  return {
    id,
    name,
    url,
    logoUrl: `https://www.google.com/s2/favicons?domain=${hostname || ''}&sz=64`,
    isTemporary: true,
  }
}

function safeHostname(u: string): string | null {
  try {
    return new URL(u).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}


