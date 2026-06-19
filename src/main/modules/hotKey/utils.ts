import { globalShortcut } from 'electron'
import { log } from '@common/utils'

export const handleKeyDown = (key: string) => {
  if (!global.lx.hotKey.enable) return
  log.info('[HotKey] Received hotkey:', key)
  global.lx.event_app.hot_key_down({ type: 'global', key })
}

const transformedKeyRxp = /(^|\+)[a-z]/g

const normalizeAcceleratorKey = (key: string): string => {
  switch (key) {
    case ',':
    case '，':
    case '､':
    case '‚':
      return 'Comma'
    case '.':
    case '。':
    case '．':
      return 'Period'
    case '/':
    case '／':
      return 'Slash'
    case '\\':
    case '＼':
      return 'Backslash'
    case ';':
    case '；':
      return 'Semicolon'
    case "'":
    case '’':
    case '‘':
      return 'Quote'
    case '[':
    case '【':
      return 'BracketLeft'
    case ']':
    case '】':
      return 'BracketRight'
    default:
      return key
  }
}

export const transformedKey = (key: string): string => {
  if (key.includes('arrow')) key = key.replace(/arrow/g, '')

  const tokens = key.split('+').filter(Boolean).map(k => {
    if (k === 'mod') return 'CommandOrControl'
    return normalizeAcceleratorKey(k)
  })

  return tokens.join('+').replace(transformedKeyRxp, l => l.toUpperCase())
}

export const registerHotkey = ({ key, info }: LX.RegisterKeyInfo): boolean => {
  let targetKey = global.lx.hotKey.state.get(key)
  if (targetKey?.status) return true
  const transKey = transformedKey(key)
  // console.log('Register key:', transKey)
  if (targetKey) {
    targetKey.info = info
  } else {
    targetKey = {
      status: false,
      info,
    }
    global.lx.hotKey.state.set(key, targetKey)
  }
  try {
    const status = targetKey.status = globalShortcut.isRegistered(transKey)
      ? false
      : globalShortcut.register(transKey, () => {
        handleKeyDown(key)
      })
    return status
  } catch (err) {
    log.info('Register hot key failed:', key, transKey, err)
    targetKey.status = false
    return false
  }
}

export const unRegisterHotkey = (key: string) => {
  let transKey = transformedKey(key)
  // console.log('Unregister key:', transKey)
  globalShortcut.unregister(transKey)
  global.lx.hotKey.state.delete(key)
}

export const unRegisterHotkeyAll = () => {
  global.lx.hotKey.state.clear()
  globalShortcut.unregisterAll()
}


const handleRegisterHotkey = (data: LX.RegisterKeyInfo) => {
  let ret = registerHotkey(data)
  if (!ret) log.info('Register hot key failed:', data.key)
}


export const init = (isForce = false) => {
  unRegisterHotkeyAll()
  if (!isForce && !global.lx.hotKey.config.global.enable) return
  // global.lx.hotKey.state = {}
  // console.log(global.lx.hotKey.config.global.keys)
  for (const key of Object.keys(global.lx.hotKey.config.global.keys)) {
    try {
      handleRegisterHotkey({ key, info: global.lx.hotKey.config.global.keys[key] })
    } catch (err) {
      log.info(err)
    }
  }
}
