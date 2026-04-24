import { useState, useEffect, useCallback } from 'react'
import { Plus, X, Save, Globe } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { cn } from '@/lib/utils'

export interface QuickLink {
  id: string
  name: string
  url: string
  favicon?: string
}

const MAX_QUICK_LINKS = 5

const defaultQuickLinks: QuickLink[] = [
  {
    id: 'google',
    name: 'Google',
    url: 'https://www.google.com',
    favicon: 'https://www.google.com/favicon.ico',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    url: 'https://www.youtube.com',
    favicon: 'https://www.youtube.com/favicon.ico',
  },
  {
    id: 'github',
    name: 'GitHub',
    url: 'https://github.com',
    favicon: 'https://github.com/favicon.ico',
  },
  {
    id: 'reddit',
    name: 'Reddit',
    url: 'https://www.reddit.com',
    favicon: 'https://www.reddit.com/favicon.ico',
  },
]

function parseFaviconFromHtml(html: string, baseUrl: string): string | null {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const selectors = [
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
    'link[rel="apple-touch-icon"]',
    'link[rel="apple-touch-icon-precomposed"]',
  ]
  for (const sel of selectors) {
    const el = doc.querySelector(sel)
    const href = el?.getAttribute('href')
    if (href) {
      try {
        return new URL(href, baseUrl).href
      } catch {}
    }
  }
  return null
}

interface QuickLinksProps {
  className?: string
  onLinkClick?: (url: string) => void
}

export function QuickLinks({ className = '', onLinkClick }: QuickLinksProps) {
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newLinkName, setNewLinkName] = useState('')
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [mounted, setMounted] = useState(false)
  const [failedFavicons, setFailedFavicons] = useState<Set<string>>(new Set())

  useEffect(() => {
    setMounted(true)
    const savedLinks = localStorage.getItem('quickLinks')
    if (savedLinks) {
      try {
        const parsedLinks = JSON.parse(savedLinks)
        setQuickLinks(parsedLinks)
      } catch (error) {
        console.error('Failed to parse saved links:', error)
        setQuickLinks(defaultQuickLinks)
      }
    } else {
      setQuickLinks(defaultQuickLinks)
    }
  }, [])

  useEffect(() => {
    if (mounted && quickLinks.length > 0) {
      localStorage.setItem('quickLinks', JSON.stringify(quickLinks))
    }
  }, [quickLinks, mounted])

  const discoverFavicon = useCallback(async (link: QuickLink) => {
    try {
      const res = await fetch(link.url)
      if (!res.ok) return null
      const html = await res.text()
      return parseFaviconFromHtml(html, link.url)
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    if (!mounted || quickLinks.length === 0) return
    let cancelled = false

    const resolve = async () => {
      const updates: Record<string, string> = {}
      for (const link of quickLinks) {
        if (link.favicon) continue
        const found = await discoverFavicon(link)
        if (cancelled) return
        if (found) updates[link.id] = found
      }
      if (Object.keys(updates).length > 0) {
        setQuickLinks(prev => prev.map(l => updates[l.id] ? { ...l, favicon: updates[l.id] } : l))
      }
    }
    resolve()
    return () => { cancelled = true }
  }, [mounted, quickLinks.length, discoverFavicon])

  const handleAddLink = () => {
    if (newLinkName.trim() && newLinkUrl.trim()) {
      let url = newLinkUrl
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url
      }

      const newLink: QuickLink = {
        id: Date.now().toString(),
        name: newLinkName,
        url: url,
      }

      setQuickLinks([...quickLinks, newLink])
      setNewLinkName('')
      setNewLinkUrl('')
      setIsAddDialogOpen(false)
    }
  }

  const handleDeleteLink = (id: string) => {
    setQuickLinks(quickLinks.filter((link) => link.id !== id))
  }

  const handleLinkClick = (url: string) => {
    if (onLinkClick) {
      onLinkClick(url)
    } else {
      window.open(url, '_blank')
    }
  }

  const getFaviconUrl = (url: string, favicon?: string) => {
    if (favicon) return favicon
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
      return `${urlObj.origin}/favicon.ico`
    } catch {
      return undefined
    }
  }

  const getGoogleFaviconUrl = (url: string) => {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
      return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`
    } catch {
      return undefined
    }
  }

  const displayedLinks = quickLinks.slice(0, MAX_QUICK_LINKS)
  const canAddMore = quickLinks.length < MAX_QUICK_LINKS

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-center gap-3">
        {displayedLinks.map((link, index) => (
          <div key={link.id} className="relative group animate-fade-in-up" data-delay={index * 50}>
            {/* Delete button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDeleteLink(link.id)
              }}
              className="absolute -top-1.5 -right-1.5 z-20 bg-gray-600 hover:bg-gray-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg hover:scale-110"
              aria-label={`Delete ${link.name}`}
            >
              <X className="w-2.5 h-2.5" />
            </button>

            {/* Square shortcut card */}
            <button
              onClick={() => handleLinkClick(link.url)}
              className={cn(
                'relative flex items-center justify-center',
                'w-12 h-12',
                'rounded-xl',
                'border border-white/10',
                'hover:-translate-y-0.5',
                'transition-all duration-200 ease-out',
                'hover:border-white/20',
                'hover:shadow-lg hover:shadow-black/30'
              )}
              style={{
                background: 'rgba(255, 255, 255, 0.07)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
              }}
              title={link.name}
            >
              {getFaviconUrl(link.url, link.favicon) && !failedFavicons.has(link.id) ? (
                <img
                  src={getFaviconUrl(link.url, link.favicon)}
                  alt={link.name}
                  className="w-5 h-5 object-contain"
                  onError={(e) => {
                    const googleUrl = getGoogleFaviconUrl(link.url)
                    const current = e.currentTarget.src
                    if (googleUrl && !current.includes('google.com/s2/favicons')) {
                      e.currentTarget.src = googleUrl
                    } else {
                      setFailedFavicons((prev) => new Set(prev).add(link.id))
                    }
                  }}
                />
              ) : (
                <Globe className="w-5 h-5 text-gray-500" />
              )}
            </button>
          </div>
        ))}

        {/* Plus button - circle */}
        {canAddMore && (
          <button
            onClick={() => setIsAddDialogOpen(true)}
            className={cn(
              'flex items-center justify-center',
              'w-12 h-12',
              'rounded-full',
              'border border-white/10 border-dashed',
              'transition-all duration-200 ease-out',
              'hover:border-white/25 hover:scale-105',
              'animate-fade-in-up'
            )}
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
            }}
            title="Add shortcut"
          >
            <Plus className="w-4 h-4 text-gray-500" />
          </button>
        )}
      </div>

      {/* Add Link Dialog */}
      {isAddDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsAddDialogOpen(false)} />
          <div
            className="relative w-full max-w-sm rounded-2xl shadow-2xl border border-white/10 overflow-hidden animate-scale-in"
            style={{
              background: 'rgba(20, 20, 20, 0.95)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 rounded-xl bg-white/10">
                  <Plus className="w-4 h-4 text-gray-300" />
                </div>
                <h3 className="text-lg font-medium text-gray-200">Add Shortcut</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-xs font-medium text-gray-400 mb-1.5">
                    Name
                  </label>
                  <Input
                    id="name"
                    value={newLinkName}
                    onChange={(e) => setNewLinkName(e.target.value)}
                    className="w-full bg-white/5 border-white/10 text-gray-200 placeholder-gray-600"
                    placeholder="e.g., Google"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newLinkName && newLinkUrl) {
                        handleAddLink()
                      }
                    }}
                    autoFocus
                  />
                </div>
                <div>
                  <label htmlFor="url" className="block text-xs font-medium text-gray-400 mb-1.5">
                    URL
                  </label>
                  <Input
                    id="url"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    className="w-full bg-white/5 border-white/10 text-gray-200 placeholder-gray-600"
                    placeholder="https://example.com"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newLinkName && newLinkUrl) {
                        handleAddLink()
                      }
                    }}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/5">
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  className="border-white/10 text-gray-400 hover:bg-white/5"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddLink}
                  disabled={!newLinkName || !newLinkUrl}
                  className="bg-white/10 hover:bg-white/15 text-gray-200 border border-white/10"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
