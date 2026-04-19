import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { QuickLinks } from './QuickLinks'
import { AutocompleteController } from '@/app/components/ui/command-palette/autocomplete-controller'
import { HistoryProvider } from '@/app/components/ui/command-palette/providers/history-provider'
import { SearchProvider } from '@/app/components/ui/command-palette/providers/search-provider'
import { ZeroSuggestProvider } from '@/app/components/ui/command-palette/providers/zero-suggest-provider'
import { AutocompleteMatch } from '@/app/components/ui/command-palette/types'
import VlinderLogo from '@/ui-ref/vlinder-logo.png'

const MAX_SUGGESTIONS = 6

const sanitizeInput = (value: string) => value.replace(/\s+/g, ' ')

function SuggestionIcon({ match }: { match: AutocompleteMatch }) {
  switch (match.type) {
    case 'history-url':
    case 'open-tab':
    case 'url-what-you-typed':
      return <Globe size={18} className="mr-3 text-gray-500" />
    case 'verbatim':
    case 'search-query':
      return <Search size={18} className="mr-3 text-gray-500" />
    default:
      return null
  }
}

interface NewTabPageProps {
  onNavigate?: (url: string) => void
}

export function NewTabPage({ onNavigate }: NewTabPageProps) {
  const suppressNavigationRef = useRef(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [matches, setMatches] = useState<AutocompleteMatch[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const searchRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<AutocompleteController | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const handleSuggestionsUpdate = (updatedMatches: AutocompleteMatch[]) => {
      setMatches(updatedMatches)
    }

    controllerRef.current = new AutocompleteController(
      [new SearchProvider(), new HistoryProvider(), new ZeroSuggestProvider()],
      handleSuggestionsUpdate
    )

    if (controllerRef.current) {
      controllerRef.current.start({
        text: '',
        type: 'focus',
      })
    }

    return () => {
      controllerRef.current?.stop()
    }
  }, [])

  useEffect(() => {
    if (controllerRef.current) {
      controllerRef.current.start({
        text: searchQuery,
        type: 'keystroke',
      })
    }
    setShowSuggestions(searchQuery.length > 0)
    setSelectedIndex(-1)
  }, [searchQuery])

  const handleSuggestionSelect = useCallback(
    (match: AutocompleteMatch) => {
      if (suppressNavigationRef.current) return
      if (onNavigate) {
        onNavigate(match.destinationUrl)
      } else {
        window.open(match.destinationUrl, '_blank')
      }
      setSearchQuery('')
      setShowSuggestions(false)
    },
    [onNavigate]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev < matches.length - 1 ? prev + 1 : prev))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (selectedIndex >= 0 && matches[selectedIndex]) {
          handleSuggestionSelect(matches[selectedIndex])
        } else if (matches.length > 0) {
          handleSuggestionSelect(matches[0])
        } else if (searchQuery.trim()) {
          const url = searchQuery.startsWith('http')
            ? searchQuery
            : `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`
          if (onNavigate) {
            onNavigate(url)
          } else {
            window.open(url, '_blank')
          }
        }
      } else if (e.key === 'Escape') {
        setShowSuggestions(false)
        setSelectedIndex(-1)
      }
    },
    [matches, selectedIndex, searchQuery, handleSuggestionSelect, onNavigate]
  )

  if (!mounted) {
    return <div className="min-h-screen bg-[#1a1a1a]"></div>
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center min-h-screen text-gray-300 p-4 md:p-8 transition-colors duration-300 select-none overflow-auto"
      style={{ background: '#1a1a1a' }}
    >
      <div className="flex flex-col items-center justify-center w-full max-w-lg">
        {/* Vlinder Logo */}
        <div className="animate-fade-in mb-10">
          <img
            src={VlinderLogo}
            alt="Vlinder"
            className="h-14 md:h-18 object-contain"
            style={{ filter: 'brightness(1.1)' }}
          />
        </div>

        {/* Glassmorphism Search Bar */}
        <div className="w-full px-3 sm:px-0 relative mb-10" ref={searchRef}>
          <div className="relative">
            <input
              className={cn(
                'w-full h-11 py-2 px-5 pr-12 text-sm rounded-xl',
                'outline-none border border-white/10',
                'text-gray-200 placeholder-gray-500',
                'focus:border-white/20',
                'font-[JetBrains_Mono]',
                showSuggestions && matches.length > 0 && '!rounded-b-none border-b-0'
              )}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}
              autoFocus
              value={searchQuery}
              onFocus={() => setShowSuggestions(searchQuery.length > 0)}
              onChange={(e) => setSearchQuery(sanitizeInput(e.target.value))}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                suppressNavigationRef.current = true
                setTimeout(() => {
                  suppressNavigationRef.current = false
                  setShowSuggestions(false)
                  setSelectedIndex(-1)
                }, 120)
              }}
              placeholder="Search the web"
              aria-label="Search the web"
            />
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(10px)',
              }}
              onClick={() => {
                if (searchQuery.trim()) {
                  const url = searchQuery.startsWith('http')
                    ? searchQuery
                    : `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`
                  if (onNavigate) onNavigate(url)
                }
              }}
              type="button"
            >
              <Search className="size-3.5 text-gray-400" />
            </button>
          </div>

          {showSuggestions && matches.length > 0 && (
            <div
              className={cn(
                'absolute top-full left-0 right-0 !rounded-t-none rounded-b-xl overflow-hidden z-10',
                'border border-white/10 border-t-0'
              )}
              style={{
                background: 'rgba(20, 20, 20, 0.9)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}
            >
              <div className="max-h-[250px] md:max-h-[300px] overflow-y-auto">
                {matches.slice(0, MAX_SUGGESTIONS).map((match, index) => (
                  <button
                    key={`${match.destinationUrl}-${index}`}
                    onClick={() => handleSuggestionSelect(match)}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleSuggestionSelect(match)
                    }}
                    className={cn(
                      'w-full px-5 py-2.5 flex items-center cursor-pointer text-sm text-left transition-colors duration-150',
                      selectedIndex === index
                        ? 'bg-white/10'
                        : 'hover:bg-white/5'
                    )}
                  >
                    <SuggestionIcon match={match} />
                    <span className="text-gray-300 truncate">{match.contents}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Links */}
        <QuickLinks onLinkClick={onNavigate} />
      </div>
    </div>
  )
}
