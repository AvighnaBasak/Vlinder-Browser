import { ElectronBlocker } from '@ghostery/adblocker-electron'
import { Session } from 'electron'

type BlockerInstanceType = 'all' | 'adsAndTrackers' | 'adsOnly'

let Store: any = null
let store: any = null

// Initialize electron-store using dynamic import (ESM module)
async function initStore() {
  if (!Store) {
    const ElectronStore = await import('electron-store')
    Store = ElectronStore.default
    store = new Store({
      name: 'lux-config',
    })
  }
  return store
}

/**
 * ContentBlocker class manages ad and tracking content blocking functionality
 */
class ContentBlocker {
  private blockerInstancePromise: Promise<ElectronBlocker> | undefined = undefined
  private blockerInstanceType: BlockerInstanceType | undefined = undefined
  private blockedSession: Session | undefined = undefined

  /**
   * Creates or returns existing blocker instance of the specified type
   */
  private async createBlockerInstance(type: BlockerInstanceType): Promise<ElectronBlocker> {
    if (this.blockerInstancePromise && this.blockerInstanceType === type) {
      return this.blockerInstancePromise
    }

    if (this.blockerInstancePromise) {
      await this.disableBlocker()
    }

    switch (type) {
      case 'all':
        this.blockerInstancePromise = ElectronBlocker.fromPrebuiltFull()
        break
      case 'adsAndTrackers':
        this.blockerInstancePromise = ElectronBlocker.fromPrebuiltAdsAndTracking()
        break
      case 'adsOnly':
        this.blockerInstancePromise = ElectronBlocker.fromPrebuiltAdsOnly()
        break
    }

    this.blockerInstanceType = type
    return this.blockerInstancePromise as Promise<ElectronBlocker>
  }

  /**
   * Disables content blocking on the session
   */
  private async disableBlocker(): Promise<void> {
    if (!this.blockerInstancePromise || !this.blockedSession) return

    try {
      const blocker = await this.blockerInstancePromise
      blocker.disableBlockingInSession(this.blockedSession)
    } catch (error) {
      // Ignore errors when trying to disable blocking that wasn't enabled
    }

    this.blockedSession = undefined
    this.blockerInstancePromise = undefined
    this.blockerInstanceType = undefined
  }

  /**
   * Enables content blocking for a specific session
   */
  private async enableBlockerForSession(blockerType: BlockerInstanceType, session: Session): Promise<void> {
    const blocker = await this.createBlockerInstance(blockerType)
    if (!blocker) return

    // check if session is already blocked
    if (this.blockedSession === session) return

    // set blocked session
    this.blockedSession = session

    // enable blocking in session
    blocker.enableBlockingInSession(session)
  }

  /**
   * Updates content blocker configuration based on user settings
   */
  public async updateConfig(session: Session): Promise<void> {
    const s = await initStore()
    const adBlocker = s.get('adBlocker', 'disabled') as string

    switch (adBlocker) {
      case 'all':
      case 'adsAndTrackers':
      case 'adsOnly':
        await this.enableBlockerForSession(adBlocker as BlockerInstanceType, session)
        break
      default:
        await this.disableBlocker()
    }
  }

  /**
   * Initializes content blocker for the given session
   */
  public async initialize(session: Session): Promise<void> {
    // Initial configuration
    await this.updateConfig(session)
  }
}

// Export singleton instance
export const contentBlocker = new ContentBlocker()
