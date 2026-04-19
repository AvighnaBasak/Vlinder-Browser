import { AutocompleteProvider } from './base-provider'
import { AutocompleteInput, AutocompleteMatch, AutocompleteUpdateCallback } from './types'
import { ZeroSuggestProvider } from './providers/zero-suggest-provider'

interface MatchWithProvider {
  match: AutocompleteMatch
  provider: string
}

export class AutocompleteController {
  private providers: AutocompleteProvider[]
  private matches: MatchWithProvider[] = []
  private onUpdate: AutocompleteUpdateCallback
  private activeProviders: number = 0
  public currentInput: AutocompleteInput | null = null
  private currentRequestId: string = ''

  constructor(providers: AutocompleteProvider[], onUpdate: AutocompleteUpdateCallback) {
    this.providers = providers
    this.onUpdate = onUpdate
  }

  start(input: AutocompleteInput): void {
    this.stop()

    this.currentInput = input
    this.matches = []
    this.activeProviders = 0

    const requestId = `${Date.now()}-${Math.random()}`
    this.currentRequestId = requestId

    // Special handling for ZeroSuggest on focus
    if (input.type === 'focus' && input.text === '') {
      const zeroSuggestProvider = this.providers.find((p) => p instanceof ZeroSuggestProvider)
      if (zeroSuggestProvider) {
        this.activeProviders++
        zeroSuggestProvider.start(input, (results, continuous) => {
          this.onProviderResults(zeroSuggestProvider, requestId, results, continuous)
        })
      }
    } else {
      // Start all relevant providers for non-focus/non-empty input
      this.providers.forEach((provider) => {
        if (provider instanceof ZeroSuggestProvider) return

        this.activeProviders++
        provider.start(input, (results, continuous) => {
          this.onProviderResults(provider, requestId, results, continuous)
        })
      })
    }

    // Initial update
    this.updateResults()
  }

  stop(): void {
    if (this.activeProviders > 0) {
      this.providers.forEach((provider) => provider.stop())
      this.activeProviders = 0
      this.currentInput = null
      this.matches = []
    }
  }

  private onProviderResults(
    provider: AutocompleteProvider,
    requestId: string,
    matches: AutocompleteMatch[],
    continuous?: boolean
  ): void {
    if (requestId !== this.currentRequestId) {
      return
    }

    if (this.activeProviders === 0) {
      return
    }

    // Add new matches
    matches.forEach((match) => {
      this.matches.push({ match, provider: provider.name })
    })

    if (!continuous) {
      this.activeProviders--
    }

    this.updateResults()

    if (this.activeProviders === 0) {
      // All providers finished
    }
  }

  private updateResults(): void {
    // Deduplicate by URL
    const seen = new Set<string>()
    const unique: MatchWithProvider[] = []

    for (const item of this.matches) {
      const key = item.match.destinationUrl
      if (!seen.has(key)) {
        seen.add(key)
        unique.push(item)
      } else {
        // Keep the one with higher relevance
        const existing = unique.find((u) => u.match.destinationUrl === key)
        if (existing && item.match.relevance > existing.match.relevance) {
          const index = unique.indexOf(existing)
          unique[index] = item
        }
      }
    }

    // Sort by relevance
    unique.sort((a, b) => b.match.relevance - a.match.relevance)

    // Return top matches (limit to 12)
    const topMatches = unique.slice(0, 12).map((item) => item.match)

    this.onUpdate(topMatches)
  }
}
