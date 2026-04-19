import { ConveyorApi } from '@/lib/preload/shared'

export class ShortcutsApi extends ConveyorApi {
  getShortcuts = () => this.invoke('shortcuts:get-all')

  setShortcut = (actionId: string, shortcut: string) => this.invoke('shortcuts:set', actionId, shortcut)

  resetShortcut = (actionId: string) => this.invoke('shortcuts:reset', actionId)

  onShortcutsUpdated = (callback: (shortcuts: any[]) => void) => {
    const handler = (_event: any, shortcuts: any[]) => {
      callback(shortcuts)
    }
    this.renderer.on('shortcuts:on-changed', handler)

    // Return cleanup function
    return () => {
      this.renderer.removeListener('shortcuts:on-changed', handler)
    }
  }
}
