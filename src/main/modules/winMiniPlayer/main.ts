import path from 'node:path'
import { BrowserWindow } from 'electron'
import { getPlatform } from '@common/utils'
import { mainSend } from '@common/mainIpc'
import { encodePath } from '@common/utils/electron'

let browserWindow: Electron.BrowserWindow | null = null

const winEvent = () => {
  if (!browserWindow) return

  browserWindow.on('closed', () => {
    browserWindow = null
  })

  browserWindow.once('ready-to-show', () => {
    showWindow()
  })
}

export const createWindow = () => {
  closeWindow()

  const { shouldUseDarkColors, theme } = global.lx.theme

  browserWindow = new BrowserWindow({
    height: 75,
    width: 480,
    useContentSize: false,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    roundedCorners: false,
    show: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      contextIsolation: false,
      webSecurity: false,
      sandbox: false,
      nodeIntegration: true,
      enableWebSQL: false,
      webgl: false,
      spellcheck: false,
      backgroundThrottling: false,
    },
  })

  const winURL = process.env.NODE_ENV !== 'production'
    ? 'http://localhost:9082/mini-player.html'
    : `file://${path.join(encodePath(__dirname), 'mini-player.html')}`

  void browserWindow.loadURL(winURL + `?os=${getPlatform()}&dark=${shouldUseDarkColors}&theme=${encodeURIComponent(JSON.stringify(theme))}`)

  winEvent()
}

export const isExistWindow = (): boolean => !!browserWindow

export const closeWindow = () => {
  if (!browserWindow) return
  browserWindow.close()
}

export const showWindow = () => {
  if (!browserWindow) return
  browserWindow.show()
}

export const sendEvent = <T = any>(name: string, params?: T) => {
  if (!browserWindow) return
  mainSend(browserWindow, name, params)
}

export const getMainFrame = (): Electron.WebFrameMain | null => {
  if (!browserWindow) return null
  return browserWindow.webContents.mainFrame
}
