import { throttle } from '@common/utils'
import { watch } from '@common/utils/vueTools'
import { onNewMiniPlayerProcess } from '@renderer/utils/ipc'
import { isPlay, musicInfo } from '@renderer/store/player/state'
import { playProgress } from '@renderer/store/player/playProgress'
import { getCurrentTime } from '@renderer/plugins/player'
import { togglePlay, playNext, playPrev } from '@renderer/core/player'

let miniPlayerPort: Electron.IpcRendererEvent['ports'][0] | null = null
let statusTimer: ReturnType<typeof setInterval> | null = null

type MiniPlayerAction =
  | { action: 'get_status' }
  | { action: 'toggle_play' }
  | { action: 'next' }
  | { action: 'prev' }
  | { action: 'seek', data: number }

type MiniPlayerStatus = {
  action: 'status'
  data: {
    name: string
    singer: string
    album?: string
    isPlay: boolean
    currentTime: number
    duration: number
  }
}

const postStatus = () => {
  if (!miniPlayerPort) return
  const currentTime = getCurrentTime()
  const payload: MiniPlayerStatus = {
    action: 'status',
    data: {
      name: musicInfo.name,
      singer: musicInfo.singer,
      album: musicInfo.album,
      isPlay: isPlay.value,
      currentTime,
      duration: playProgress.maxPlayTime,
    },
  }
  miniPlayerPort.postMessage(payload)
}

const throttledPostStatus = throttle(postStatus, 200)

const handleMiniPlayerMessage = (msg: MiniPlayerAction) => {
  switch (msg.action) {
    case 'get_status':
      postStatus()
      break
    case 'toggle_play':
      togglePlay()
      postStatus()
      break
    case 'next':
      void playNext()
      break
    case 'prev':
      void playPrev()
      break
    case 'seek':
      if (typeof msg.data === 'number' && !Number.isNaN(msg.data)) {
        window.app_event.setProgress(Math.max(0, Math.min(msg.data, playProgress.maxPlayTime)))
      }
      break
  }
}

export const init = () => {
  onNewMiniPlayerProcess(({ event }) => {
    const [port] = event.ports
    miniPlayerPort = port

    port.onmessage = ({ data }) => {
      handleMiniPlayerMessage(data)
    }

    port.onmessageerror = (event) => {
      console.log('miniPlayer onmessageerror', event)
    }

    postStatus()
  })

  watch(() => playProgress.nowPlayTime, () => {
    throttledPostStatus()
  })

  window.app_event.on('musicToggled', throttledPostStatus)
  window.app_event.on('play', throttledPostStatus)
  window.app_event.on('pause', throttledPostStatus)
  window.app_event.on('stop', throttledPostStatus)
  window.app_event.on('setProgress', throttledPostStatus)

  if (!statusTimer) {
    statusTimer = setInterval(() => {
      if (!miniPlayerPort) return
      if (!isPlay.value) return
      throttledPostStatus()
    }, 250)
  }
}
