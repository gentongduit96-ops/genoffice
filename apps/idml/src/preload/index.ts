import { contextBridge, ipcRenderer } from 'electron'
import { IDML_CHANNELS, type IdmlApi, type SaveIdmlRequest, type SaveIdmlResult } from '../shared/ipc.js'

const api: IdmlApi = {
  consumePendingPath: () => ipcRenderer.invoke(IDML_CHANNELS.CONSUME_PENDING),
  readFile: (filePath: string) => ipcRenderer.invoke(IDML_CHANNELS.READ_FILE, filePath),
  openFileDialog: () => ipcRenderer.invoke(IDML_CHANNELS.OPEN_DIALOG),
  save: (req: SaveIdmlRequest) => ipcRenderer.invoke(IDML_CHANNELS.SAVE, req),

  onSaveRequested: (callback) => {
    const handler = () => callback()
    ipcRenderer.on(IDML_CHANNELS.SAVE_REQUEST, handler)
    return () => ipcRenderer.removeListener(IDML_CHANNELS.SAVE_REQUEST, handler)
  },

  sendSaveAck: (result: SaveIdmlResult) => {
    ipcRenderer.send(IDML_CHANNELS.SAVE_REQUEST_ACK, result)
  },

  setDirty: (isDirty: boolean) => {
    ipcRenderer.send(IDML_CHANNELS.DIRTY_CHANGED, isDirty)
  },

  onCloseSaveRequested: (callback) => {
    const handler = () => callback()
    ipcRenderer.on(IDML_CHANNELS.CLOSE_SAVE_REQUEST, handler)
    return () => ipcRenderer.removeListener(IDML_CHANNELS.CLOSE_SAVE_REQUEST, handler)
  },

  sendCloseSaveResult: (saveResult: 'saved' | 'discarded' | 'cancelled') => {
    ipcRenderer.send(IDML_CHANNELS.CLOSE_SAVE_RESULT, saveResult)
  },

  onFileRenamed: (callback) => {
    const handler = (_: unknown, newPath: string) => callback(newPath)
    ipcRenderer.on(IDML_CHANNELS.FILE_RENAMED, handler)
    return () => ipcRenderer.removeListener(IDML_CHANNELS.FILE_RENAMED, handler)
  },

  getLanguage: () => ipcRenderer.invoke(IDML_CHANNELS.GET_LANGUAGE),
  onLanguageChanged: (callback) => {
    const handler = (_: unknown, lang: string) => callback(lang)
    ipcRenderer.on(IDML_CHANNELS.LANGUAGE_CHANGED, handler)
    return () => ipcRenderer.removeListener(IDML_CHANNELS.LANGUAGE_CHANGED, handler)
  },

  getTheme: () => ipcRenderer.invoke(IDML_CHANNELS.GET_THEME),
  onThemeChanged: (callback) => {
    const handler = (_: unknown, theme: 'light' | 'dark') => callback(theme)
    ipcRenderer.on(IDML_CHANNELS.THEME_CHANGED, handler)
    return () => ipcRenderer.removeListener(IDML_CHANNELS.THEME_CHANGED, handler)
  },
}

try {
  contextBridge.exposeInMainWorld('idmlApi', api)
} catch {
  // Safe fallback if already exposed or in pure renderer test mode
  ;(window as unknown as { idmlApi: IdmlApi }).idmlApi = api
}
