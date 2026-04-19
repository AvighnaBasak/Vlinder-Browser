import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, Clock, Globe, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AutocompleteController } from './command-palette/autocomplete-controller'
import { HistoryProvider } from './command-palette/providers/history-provider'
import { SearchProvider } from './command-palette/providers/search-provider'
import { ZeroSuggestProvider } from './command-palette/providers/zero-suggest-provider'
import { AutocompleteMatch, AutocompleteInput } from './command-palette/types'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onOpenUrl: (url: string) => void
}

export function CommandPalette({ isOpen, onClose, onOpenUrl }: CommandPaletteProps) {
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<AutocompleteMatch[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const controllerRef = useRef<AutocompleteController | null>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Initialize controller
  useEffect(() => {
    if (!controllerRef.current) {
      const providers = [
        new SearchProvider(),
        new HistoryProvider(),
        new ZeroSuggestProvider(),
      ]

      controllerRef.current = new AutocompleteController(providers, (results, continuous) => {
        setSuggestions(results)
        setIsLoading(continuous || false)
        // Reset selected index when new results arrive
        setSelectedIndex(-1)
      })
    }

    return () => {
      if (controllerRef.current) {
        controllerRef.current.stop()
      }
    }
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
      setInputValue('')
      setSuggestions([])
      setSelectedIndex(-1)
      
      // Trigger zero-suggest on focus
      if (controllerRef.current) {
        controllerRef.current.start({
          text: '',
          type: 'focus',
        })
      }
    } else if (!isOpen && controllerRef.current) {
      controllerRef.current.stop()
      setSuggestions([])
      setSelectedIndex(-1)
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    setSelectedIndex(-1)

    if (controllerRef.current) {
      controllerRef.current.start({
        text: value,
        type: 'keystroke',
      })
    }
  }

  const handleSelectSuggestion = useCallback(
    (match: AutocompleteMatch) => {
      // Track history for typed URLs
      if (match.type === 'url-what-you-typed' || match.type === 'history-url') {
        import('@/app/services/history').then(({ addHistoryEntry }) => {
          addHistoryEntry(match.destinationUrl, match.contents, match.type === 'url-what-you-typed')
        })
      }
      onOpenUrl(match.destinationUrl)
      onClose()
    },
    [onOpenUrl, onClose]
  )

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (suggestions.length === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => {
          const next = prev < suggestions.length - 1 ? prev + 1 : 0
          // Scroll into view after state update
          setTimeout(() => {
            const selectedElement = suggestionsRef.current?.querySelector(
              `[data-index="${next}"]`
            ) as HTMLElement
            selectedElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
          }, 0)
          return next
        })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => {
          const next = prev > 0 ? prev - 1 : suggestions.length - 1
          // Scroll into view after state update
          setTimeout(() => {
            const selectedElement = suggestionsRef.current?.querySelector(
              `[data-index="${next}"]`
            ) as HTMLElement
            selectedElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
          }, 0)
          return next
        })
      } else if (e.key === 'Enter') {
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          e.preventDefault()
          handleSelectSuggestion(suggestions[selectedIndex])
        }
        // If no selection, let form submit handle it
      } else if (e.key === 'Tab' && selectedIndex >= 0 && suggestions[selectedIndex]) {
        // Allow tab to autocomplete suggestion
        const match = suggestions[selectedIndex]
        if (match.inlineCompletion) {
          e.preventDefault()
          setInputValue(match.inlineCompletion)
          // Update controller with new value
          if (controllerRef.current) {
            controllerRef.current.start({
              text: match.inlineCompletion,
              type: 'keystroke',
            })
          }
        }
      }
    },
    [suggestions, selectedIndex, handleSelectSuggestion]
  )

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!inputValue.trim()) return

      // If a suggestion is selected, use it
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSelectSuggestion(suggestions[selectedIndex])
        return
      }

      // Use default/verbatim suggestion if available
      const defaultMatch = suggestions.find((m) => m.isDefault)
      if (defaultMatch) {
        handleSelectSuggestion(defaultMatch)
        return
      }

      // Fallback: treat as URL or search
      let url = inputValue.trim()

      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        if (url.includes('.') && !url.includes(' ')) {
          url = `https://${url}`
        } else {
          url = `https://www.google.com/search?q=${encodeURIComponent(url)}`
        }
      }

      try {
        new URL(url)
        // Track as typed visit
        import('@/app/services/history').then(({ addHistoryEntry }) => {
          addHistoryEntry(url, '', true)
        })
        onOpenUrl(url)
        onClose()
      } catch {
        url = `https://www.google.com/search?q=${encodeURIComponent(inputValue.trim())}`
        onOpenUrl(url)
        onClose()
      }
    },
    [inputValue, selectedIndex, suggestions, handleSelectSuggestion, onOpenUrl, onClose]
  )

  // Handle click outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const getMatchIcon = (match: AutocompleteMatch) => {
    switch (match.type) {
      case 'history-url':
      case 'zero-suggest':
        return <Clock className="w-4 h-4" />
      case 'search-query':
      case 'verbatim':
        return <Search className="w-4 h-4" />
      case 'url-what-you-typed':
        return <Globe className="w-4 h-4" />
      default:
        return <Globe className="w-4 h-4" />
    }
  }

  const getMatchTypeLabel = (match: AutocompleteMatch) => {
    switch (match.type) {
      case 'history-url':
        return 'History'
      case 'zero-suggest':
        return 'Frequently visited'
      case 'search-query':
        return 'Search'
      case 'verbatim':
        return 'Search'
      case 'url-what-you-typed':
        return 'URL'
      default:
        return ''
    }
  }

  if (!isOpen) return null

  const hasSuggestions = suggestions.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-30" onClick={handleBackdropClick}>
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-lg" />

      {/* Command palette container */}
      <div className="relative w-full max-w-2xl mx-4 command-palette-enter">
        <div className="bg-black/40 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-700/50 overflow-hidden">
          {/* Input form */}
          <form onSubmit={handleSubmit} className="p-0">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-white/70" />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Search or enter URL..."
                className={cn(
                  'w-full pl-12 pr-12 py-4 text-lg bg-transparent border-none rounded-t-2xl',
                  'focus:outline-none text-white placeholder-white/60',
                  'transition-all duration-200',
                  hasSuggestions && 'rounded-t-2xl rounded-b-none'
                )}
                disabled={isLoading}
              />
              {isLoading && (
                <div className="absolute inset-y-0 right-0 pr-12 flex items-center">
                  <div className="w-5 h-5 border-2 border-white/50 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!isLoading && inputValue && (
                <button
                  type="button"
                  onClick={() => {
                    setInputValue('')
                    setSelectedIndex(-1)
                    if (controllerRef.current) {
                      controllerRef.current.start({ text: '', type: 'focus' })
                    }
                  }}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center hover:bg-white/10 rounded-lg transition-colors"
                  title="Clear"
                >
                  <X className="w-5 h-5 text-white/70" />
                </button>
              )}
            </div>

            {/* Suggestions list */}
            {hasSuggestions && (
              <div
                ref={suggestionsRef}
                className="max-h-96 overflow-y-auto border-t border-gray-700/50 bg-black/30 backdrop-blur-sm"
              >
                {suggestions.map((match, index) => (
                  <button
                    key={`${match.providerName}-${index}`}
                    type="button"
                    data-index={index}
                    onClick={() => handleSelectSuggestion(match)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      'w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-white/10 transition-colors',
                      'border-b border-gray-700/30 last:border-b-0',
                      selectedIndex === index && 'bg-white/15'
                    )}
                  >
                    <div className="mt-0.5 flex-shrink-0 text-white/60">{getMatchIcon(match)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className="font-medium text-white truncate">
                          {match.contents}
                        </div>
                        {match.type && (
                          <span className="text-xs text-white/40 bg-white/10 px-1.5 py-0.5 rounded flex-shrink-0">
                            {getMatchTypeLabel(match)}
                          </span>
                        )}
                      </div>
                      {match.description && match.description !== match.contents && (
                        <div className="text-sm text-white/50 truncate">{match.description}</div>
                      )}
                    </div>
                    <div className="mt-0.5 flex-shrink-0 text-white/40">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}