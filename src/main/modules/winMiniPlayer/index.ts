import initRendererEvent from './rendererEvent'
import { APP_EVENT_NAMES } from '@common/constants'
import { HOTKEY_MINI_PLAYER } from '@common/hotKey'
import { closeWindow, createWindow, isExistWindow } from './main'

export default () => {
  initRendererEvent()

  global.lx.event_app.on('main_window_inited', () => {
    // no-op: mini player window is toggled by hotkey
  })

  global.lx.event_app.on('main_window_close', () => {
    closeWindow()
  })

  global.lx.event_app.on('hot_key_down', ({ type, key }) => {
    const info = global.lx.hotKey.config.global.keys[key]
    if (!info || info.type != APP_EVENT_NAMES.winMiniPlayerName) return

    switch (info.action) {
      case HOTKEY_MINI_PLAYER.toggle_visible.action:
        if (isExistWindow()) closeWindow()
        else createWindow()
        break
      default:
        break
    }
  })
}

export * from './main'
export * from './rendererEvent'
