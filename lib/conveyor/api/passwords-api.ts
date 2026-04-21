import { ConveyorApi } from '@/lib/preload/shared'

export class PasswordsApi extends ConveyorApi {
  list = (origin?: string) => this.invoke('passwords:list', origin)

  get = (id: string) => this.invoke('passwords:get', id)

  save = (cred: { origin: string; username: string; password: string }) => this.invoke('passwords:save', cred)

  update = (id: string, patch: { username?: string; password?: string }) => this.invoke('passwords:update', id, patch)

  remove = (id: string) => this.invoke('passwords:remove', id)

  importCsv = (rows: Array<{ name?: string; url: string; username: string; password: string; note?: string }>) =>
    this.invoke('passwords:importCsv', rows)

  findForUrl = (url: string) => this.invoke('passwords:findForUrl', url)

  verifyAuth = () => this.invoke('passwords:verifyAuth')

  revealPassword = (id: string) => this.invoke('passwords:revealPassword', id)

  dismissSavePrompt = (origin: string) => this.invoke('passwords:dismissSavePrompt', origin)

  neverSaveForOrigin = (origin: string) => this.invoke('passwords:neverSaveForOrigin', origin)

  isNeverSaveOrigin = (origin: string) => this.invoke('passwords:isNeverSaveOrigin', origin)
}
