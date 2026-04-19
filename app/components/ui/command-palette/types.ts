export interface AutocompleteInput {
  text: string
  currentURL?: string
  type: 'focus' | 'keystroke'
  preventInlineAutocomplete?: boolean
}

export interface AutocompleteMatch {
  providerName: string
  relevance: number
  contents: string
  description?: string
  destinationUrl: string
  type: 'history-url' | 'zero-suggest' | 'verbatim' | 'url-what-you-typed' | 'search-query' | 'open-tab'
  isDefault?: boolean
  inlineCompletion?: string
}

export type AutocompleteUpdateCallback = (results: AutocompleteMatch[], continuous?: boolean) => void
