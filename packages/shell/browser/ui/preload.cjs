const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel, data) => {
    const validChannels = [
      'clear-history', 
      'delete-history-entries', 
      'apply-theme',
      'apply-background',
      'open-url-in-tab',
      'update-history-file',
      'update-bookmarks-file',
      'save-bookmark',
      'pause-download',
      'resume-download',
      'cancel-download',
      'ai-panel-state'
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  invoke: (channel, data) => {
    const validInvoke = ['get-history', 'clear-history-invoke', 'delete-history-entries-invoke', 'get-downloads', 'clear-downloads', 'delete-downloads', 'get-bookmarks', 'get-openrouter-key', 'save-openrouter-key']
    if (validInvoke.includes(channel)) {
      return ipcRenderer.invoke(channel, data)
    }
  },
  on: (channel, handler) => {
    const valid = ['history-updated', 'download-updated', 'focus-address-bar']
    if (valid.includes(channel) && typeof handler === 'function') {
      ipcRenderer.on(channel, (_event, ...args) => handler(...args))
    }
  }
});


