import { BaseProvider } from '../base-provider'
import { AutocompleteInput, AutocompleteMatch, AutocompleteUpdateCallback } from '../types'
import { searchHistory, type HistoryEntry } from '@/app/services/history'
import { getStringSimilarity } from '../utils/string-similarity'

export class HistoryProvider extends BaseProvider {
  name = 'HistoryProvider'

  start(input: AutocompleteInput, onResults: AutocompleteUpdateCallback): void {
    const inputText = input.text
    const inputTextLowered = inputText.toLowerCase()

    if (!inputText) {
      onResults([])
      return
    }

    const url = this.getURLFromInput(inputText)
    if (url) {
      const typedURLMatch: AutocompleteMatch = {
        providerName: this.name,
        relevance: 1300,
        contents: inputText,
        description: 'Open URL',
        destinationUrl: url,
        type: 'url-what-you-typed',
        isDefault: true,
      }
      onResults([typedURLMatch], true)
    }

    const history = searchHistory(inputText, 20)
    const results: AutocompleteMatch[] = []

    for (const entry of history) {
      const urlLower = entry.url.toLowerCase()
      const titleLower = entry.title?.toLowerCase() ?? ''

      const urlSimilarity = getStringSimilarity(inputTextLowered, urlLower)
      const titleSimilarity = titleLower ? getStringSimilarity(inputTextLowered, titleLower) : 0
      const bestSimilarity = Math.max(urlSimilarity, titleSimilarity)

      const isPrefixMatch =
        urlLower.startsWith(inputTextLowered) ||
        urlLower.startsWith('http://' + inputTextLowered) ||
        urlLower.startsWith('https://' + inputTextLowered)

      if (bestSimilarity > 0 || isPrefixMatch) {
        const similarityScore = Math.ceil(900 + bestSimilarity * 300)
        let relevance = similarityScore + entry.typedCount * 10 + entry.visitCount

        if (
          urlLower === inputTextLowered ||
          urlLower === 'http://' + inputTextLowered ||
          urlLower === 'https://' + inputTextLowered
        ) {
          relevance = Math.max(relevance + 200, 1400)
        } else if (isPrefixMatch) {
          relevance = Math.max(relevance + 50, similarityScore + 50)
        }

        relevance = Math.min(relevance, 1450)

        results.push({
          providerName: this.name,
          relevance: relevance,
          contents: entry.title || entry.url,
          description: entry.url,
          destinationUrl: entry.url,
          type: 'history-url',
          inlineCompletion: isPrefixMatch && entry.url.length > inputText.length ? entry.url : undefined,
          isDefault: relevance > 1400,
        })
      }
    }

    results.sort((a, b) => b.relevance - a.relevance)
    onResults(results)
  }

  stop(): void {
    // No ongoing operations
  }

  private getURLFromInput(input: string): string | null {
    const trimmed = input.trim()
    if (!trimmed) return null

    try {
      // Try parsing as URL
      const url = new URL(trimmed)
      return url.toString()
    } catch {
      // If it looks like a domain, add https://
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
