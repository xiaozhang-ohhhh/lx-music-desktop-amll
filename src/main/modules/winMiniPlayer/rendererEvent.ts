import { registerRendererEvents as common } from '@main/modules/commonRenderers/common'
import { mainOn } from '@common/mainIpc'
import { WIN_MINI_PLAYER_RENDERER_EVENT_NAME } from '@common/ipcNames'
import { sendNewMiniPlayerClient } from '@main/modules/winMain'
import { getMainFrame, sendEvent } from './main'
import { MessageChannelMain } from 'electron'

export default () => {
  common(sendEvent)

  mainOn(WIN_MINI_PLAYER_RENDERER_EVENT_NAME.request_main_window_channel, ({ event }) => {
    if (event.senderFrame !== getMainFrame()) return
    const { port1, port2 } = new MessageChannelMain()
    sendNewMiniPlayerClient(port1)
    event.senderFrame?.postMessage(WIN_MINI_PLAYER_RENDERER_EVENT_NAME.provide_main_window_channel, null, [port2])
  })
}

export const sendMainWindowInitedEvent = () => {
  sendEvent(WIN_MINI_PLAYER_RENDERER_EVENT_NAME.main_window_inited)
}
