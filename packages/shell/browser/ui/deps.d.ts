// Ambient declaration for the preload-exposed API
// Ensures references like window.electronAPI are typed

export {}

declare global {
  interface Window {
    electronAPI?: {
      send(channel: string, data?: unknown): void
      invoke<T = unknown>(channel: string, data?: unknown): Promise<T>
      on(channel: string, handler: (...args: any[]) => void): void
    }
  }
}
