import { electronAPI } from '@electron-toolkit/preload'
import { AppApi } from './app-api'
import { WindowApi } from './window-api'
import { ConfigApi } from './config-api'
import { ShortcutsApi } from './shortcuts-api'
import { PasswordsApi } from './passwords-api'

export const conveyor = {
  app: new AppApi(electronAPI),
  window: new WindowApi(electronAPI),
  config: new ConfigApi(electronAPI),
  shortcuts: new ShortcutsApi(electronAPI),
  passwords: new PasswordsApi(electronAPI),
}

export type ConveyorApi = typeof conveyor
