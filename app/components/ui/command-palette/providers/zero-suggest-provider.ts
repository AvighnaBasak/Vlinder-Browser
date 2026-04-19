import { BaseProvider } from '../base-provider'
import { AutocompleteInput, AutocompleteMatch, AutocompleteUpdateCallback } from '../types'
import { getAllHistory, type HistoryEntry } from '@/app/services/history'

export class ZeroSuggestProvider extends BaseProvider {
  name = 'ZeroSuggestProvider'

  start(input: AutocompleteInput, onResults: AutocompleteUpdateCallback): void {
    if (input.text.trim() !== '') {
      onResults([])
      return
    }

    const findSuggestions = async () => {
      // Get most visited sites from history
      const history = getAllHistory(100)
      const results: AutocompleteMatch[] = []

      // Suggest top 8 most visited sites
      const mostVisited = history
        .sort((a, b) => {
          // Sort by visit count, then by typed count, then by recency
          if (b.visitCount !== a.visitCount) {
            return b.visitCount - a.visitCount
          }
          if (b.typedCount !== a.typedCount) {
            return b.typedCount - a.typedCount
          }
          return b.lastVisitTime - a.lastVisitTime
        })
        .slice(0, 8)

      mostVisited.forEach((entry, index) => {
        results.push({
          providerName: this.name,
          relevance: 700 - index * 30,
          contents: entry.title || entry.url,
          description: entry.url,
          destinationUrl: entry.url,
          type: 'zero-suggest',
        })
      })

      onResults(results)
    }

    findSuggestions()
  }

  stop(): void {
    // No ongoing operations
  }
}
