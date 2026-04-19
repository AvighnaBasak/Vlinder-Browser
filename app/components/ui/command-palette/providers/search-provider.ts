import { BaseProvider } from '../base-provider'
import { AutocompleteInput, AutocompleteMatch, AutocompleteUpdateCallback } from '../types'
import { getStringSimilarity } from '../utils/string-similarity'

export class SearchProvider extends BaseProvider {
  name = 'SearchProvider'
  private abortController: AbortController | null = null

  start(input: AutocompleteInput, onResults: AutocompleteUpdateCallback): void {
    const inputText = input.text

    if (!inputText) {
      onResults([])
      return
    }

    const url = this.getURLFromInput(inputText)

    // Add verbatim match immediately
    const verbatimMatch: AutocompleteMatch = {
      providerName: this.name,
      relevance: url ? 1250 : 1300,
      contents: inputText,
      description: url ? 'Open URL' : `Search for "${inputText}"`,
      destinationUrl: url || this.createSearchUrl(inputText),
      type: url ? 'url-what-you-typed' : 'verbatim',
      isDefault: true,
    }
    onResults([verbatimMatch], true)

    // Fetch remote suggestions asynchronously via Electron main process (bypasses CORS)
    this.abortController = new AbortController()
    const abortSignal = this.abortController.signal

    this.fetchSuggestions(inputText, abortSignal)
      .then((suggestions) => {
        if (abortSignal.aborted) return

        const results: AutocompleteMatch[] = []
        suggestions.forEach((suggestion, index) => {
          const baseRelevance = 800 - index * 50
          const similarity = getStringSimilarity(inputText, suggestion)
          const relevance = Math.min(1000, Math.ceil(baseRelevance + similarity * 200))

          results.push({
            providerName: this.name,
            relevance: relevance,
            contents: suggestion,
            destinationUrl: this.createSearchUrl(suggestion),
            type: 'search-query',
          })
        })
        onResults(results)
      })
      .catch((error) => {
        if (abortSignal.aborted) return
        // Silently handle errors - history suggestions will still work
        onResults([])
      })
  }

  stop(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }

  private async fetchSuggestions(query: string, signal?: AbortSignal): Promise<string[]> {
    try {
      // Use Electron's main process to fetch suggestions (bypasses CORS)
      const electronAPI = (window as any)?.electronAPI
      if (!electronAPI || !electronAPI.getSearchSuggestions) {
        return []
      }

      // Check if already aborted
      if (signal?.aborted) {
        return []
      }

      // Create an abortable promise
      let abortHandler: (() => void) | null = null
      const abortPromise = new Promise<never>((_, reject) => {
        if (signal) {
          abortHandler = () => {
            reject(new Error('Aborted'))
          }
          signal.addEventListener('abort', abortHandler)
        }
      })

      try {
        const suggestions = await Promise.race([
          electronAPI.getSearchSuggestions(query),
          abortPromise,
        ]) as string[]

        // Clean up abort listener
        if (signal && abortHandler) {
          signal.removeEventListener('abort', abortHandler)
        }

        return suggestions || []
      } catch (error) {
        // Clean up abort listener
        if (signal && abortHandler) {
          signal.removeEventListener('abort', abortHandler)
        }
        throw error
      }
    } catch (error) {
      if (error instanceof Error && (error.name === 'AbortError' || error.message === 'Aborted')) {
        return []
      }
      return []
    }
  }

  private createSearchUrl(query: string): string {
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`
  }

  private getURLFromInput(input: string): string | null {
    const trimmed = input.trim()
    if (!trimmed) return null

    try {
      const url = new URL(trimmed)
      return url.toString()
    } catch {
      if (trimmed.includes('.') && !trimmed.includes(' ')) {
        try {
          return `https://${trimmed}`
        } catch {
          return null
        }
      }
      return null
    }
  }
}
