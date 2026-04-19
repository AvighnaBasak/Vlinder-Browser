import { AutocompleteInput, AutocompleteMatch, AutocompleteUpdateCallback } from './types'

export interface AutocompleteProvider {
  name: string
  start(input: AutocompleteInput, onResults: AutocompleteUpdateCallback): void
  stop(): void
}

export abstract class BaseProvider implements AutocompleteProvider {
  abstract name: string

  abstract start(input: AutocompleteInput, onResults: AutocompleteUpdateCallback): void

  abstract stop(): void
}
