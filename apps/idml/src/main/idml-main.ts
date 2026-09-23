import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { app, BrowserWindow, dialog, ipcMain, WebContentsView, type WebContents } from 'electron'
import { IDML_CHANNELS, type SaveIdmlRequest, type SaveIdmlResult } from '../shared/ipc.js'

export interface IdmlRuntimeConfig {
  preloadPath: string
  rendererUrl?: string
  rendererFile: string
}

let runtimeConfig: IdmlRuntimeConfig | null = null
const pendingOpenPaths = new Map<number, string>()
const dirtyStateMap = new Map<number, boolean>()
let ipcRegistered = false

export function configureIdmlRuntime(config: IdmlRuntimeConfig): void {
  runtimeConfig = config
}

function safeHandle(
  channel: string,
  handler: (event: Electron.IpcMainInvokeEvent, ...args: any[]) => any,
): void {
  try {
    ipcMain.removeHandler(channel)
    ipcMain.handle(channel, handler)
  } catch {
    // Ignore if already registered
  }
}

export function registerIdmlIpc(): void {
  if (ipcRegistered) return
  ipcRegistered = true

  safeHandle(IDML_CHANNELS.CONSUME_PENDING, (event) => {
    const id = event.sender.id
    const path = pendingOpenPaths.get(id)
    pendingOpenPaths.delete(id)
    return path
  })

  safeHandle(IDML_CHANNELS.READ_FILE, async (_, filePath: string) => {
    const buffer = await fs.readFile(filePath)
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  })

  safeHandle(IDML_CHANNELS.OPEN_DIALOG, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const options = {
      title: 'Open InDesign Document',
      filters: [
        { name: 'InDesign Markup Language (*.idml)', extensions: ['idml'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile' as const],
    }
    const res = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
    if (res.canceled || res.filePaths.length === 0) return undefined
    const selectedPath = res.filePaths[0]
    const buffer = await fs.readFile(selectedPath)
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    return { filePath: selectedPath, arrayBuffer }
  })

  safeHandle(IDML_CHANNELS.SAVE, async (event, req: SaveIdmlRequest): Promise<SaveIdmlResult> => {
    let targetPath = req.filePath
    if (!targetPath) {
      const win = BrowserWindow.fromWebContents(event.sender)
      const options = {
        title: 'Save InDesign Document',
        filters: [{ name: 'InDesign Markup Language', extensions: ['idml'] }],
      }
      const res = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options)
      if (res.canceled || !res.filePath) {
        return { success: false }
      }
      targetPath = res.filePath
    }

    try {
      const nodeBuf = Buffer.from(req.arrayBuffer)
      await fs.writeFile(targetPath, nodeBuf)
      dirtyStateMap.set(event.sender.id, false)
      return { success: true, filePath: targetPath }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.on(IDML_CHANNELS.DIRTY_CHANGED, (event, isDirty: boolean) => {
    dirtyStateMap.set(event.sender.id, isDirty)
  })

  safeHandle(IDML_CHANNELS.GET_LANGUAGE, () => app.getLocale())
  safeHandle(IDML_CHANNELS.GET_THEME, () => 'light')
}

export function createIdmlView(openPath?: string): WebContentsView {
  registerIdmlIpc()
  if (!runtimeConfig) {
    throw new Error('configureIdmlRuntime must be called before createIdmlView')
  }

  const view = new WebContentsView({
    webPreferences: {
      preload: runtimeConfig.preloadPath,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  })

  if (openPath) {
    pendingOpenPaths.set(view.webContents.id, openPath)
  }

  if (runtimeConfig.rendererUrl) {
    view.webContents.loadURL(runtimeConfig.rendererUrl)
  } else {
    view.webContents.loadFile(runtimeConfig.rendererFile)
  }

  return view
}

export function idmlIsDirty(wcId: number): boolean {
  return dirtyStateMap.get(wcId) ?? false
}

export async function requestIdmlClose(wc: WebContents, parentWindow?: BrowserWindow): Promise<boolean> {
  const isDirty = dirtyStateMap.get(wc.id) ?? false
  if (!isDirty) return true

  const options = {
    type: 'question' as const,
    buttons: ['Save', "Don't Save", 'Cancel'],
    defaultId: 0,
    cancelId: 2,
    title: 'Unsaved Changes',
    message: 'Do you want to save the changes you made to this InDesign document?',
  }
  const res = parentWindow
    ? await dialog.showMessageBox(parentWindow, options)
    : await dialog.showMessageBox(options)

  if (res.response === 2) return false // Cancel

  if (res.response === 0) {
    // Save
    return new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => resolve(false), 5000)
      wc.send(IDML_CHANNELS.SAVE_REQUEST)

      ipcMain.once(IDML_CHANNELS.SAVE_REQUEST_ACK, (_, result: SaveIdmlResult) => {
        clearTimeout(timeout)
        resolve(result.success)
      })
    })
  }

  return true // Discard
}

export function idmlFileRenamed(wc: WebContents, newPath: string): void {
  wc.send(IDML_CHANNELS.FILE_RENAMED, newPath)
}

export function startIdmlStandalone(): void {
  app.whenReady().then(() => {
    const win = new BrowserWindow({
      width: 1280,
      height: 800,
      title: 'GenOffice IDML Editor',
    })

    const isDev = !app.isPackaged
    const devPort = process.env.IDML_DEV_PORT || 5180

    configureIdmlRuntime({
      preloadPath: join(__dirname, '../preload/index.js'),
      rendererUrl: isDev ? `http://localhost:${devPort}` : undefined,
      rendererFile: join(__dirname, '../renderer/index.html'),
    })

    const view = createIdmlView()
    win.contentView.addChildView(view)
    view.setBounds({ x: 0, y: 0, width: 1280, height: 800 })

    win.on('resize', () => {
      const bounds = win.getContentBounds()
      view.setBounds({ x: 0, y: 0, width: bounds.width, height: bounds.height })
    })
  })
}
