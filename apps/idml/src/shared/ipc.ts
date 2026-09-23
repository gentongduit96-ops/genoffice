export const IDML_CHANNELS = {
  CONSUME_PENDING: 'idml:consume-pending',
  READ_FILE: 'idml:read-file',
  OPEN_DIALOG: 'idml:open-dialog',
  SAVE: 'idml:save',
  SAVE_REQUEST: 'idml:save-request',
  SAVE_REQUEST_ACK: 'idml:save-request-ack',
  DIRTY_CHANGED: 'idml:dirty-changed',
  CLOSE_SAVE_REQUEST: 'idml:close-save-request',
  CLOSE_SAVE_RESULT: 'idml:close-save-result',
  FILE_RENAMED: 'idml:file-renamed',
  GET_LANGUAGE: 'app:get-language',
  LANGUAGE_CHANGED: 'app:language-changed',
  GET_THEME: 'app:get-theme',
  THEME_CHANGED: 'app:theme-changed',
} as const

export interface SaveIdmlRequest {
  filePath?: string
  arrayBuffer: ArrayBuffer
}

export interface SaveIdmlResult {
  success: boolean
  filePath?: string
  error?: string
}

export interface OpenIdmlFileResult {
  filePath: string
  arrayBuffer: ArrayBuffer
}

export interface IdmlApi {
  consumePendingPath: () => Promise<string | undefined>
  readFile: (filePath: string) => Promise<ArrayBuffer>
  openFileDialog: () => Promise<OpenIdmlFileResult | undefined>
  save: (req: SaveIdmlRequest) => Promise<SaveIdmlResult>
  onSaveRequested: (callback: () => void) => () => void
  sendSaveAck: (result: SaveIdmlResult) => void
  setDirty: (isDirty: boolean) => void
  onCloseSaveRequested: (callback: () => void) => () => void
  sendCloseSaveResult: (saveResult: 'saved' | 'discarded' | 'cancelled') => void
  onFileRenamed: (callback: (newPath: string) => void) => () => void
  getLanguage: () => Promise<string>
  onLanguageChanged: (callback: (lang: string) => void) => () => void
  getTheme: () => Promise<'light' | 'dark'>
  onThemeChanged: (callback: (theme: 'light' | 'dark') => void) => () => void
}
