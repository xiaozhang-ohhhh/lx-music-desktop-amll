<template lang="pug">
.root(:class="$style.root" @mousedown="handleMouseDown")
  .info(:class="$style.info")
    .title(:class="$style.title" :title="title") {{ title }}
    .sub(:class="$style.sub" :title="subTitle") {{ subTitle }}
  .controls(:class="$style.controls")
    button.btn(:class="$style.btn" @click.stop="send('prev')") ⏮
    button.btn(:class="$style.btn" @click.stop="send('toggle_play')") {{ isPlay ? '⏸' : '▶' }}
    button.btn(:class="$style.btn" @click.stop="send('next')") ⏭
  .progress(:class="$style.progress")
    input.slider(:class="$style.slider" type="range" min="0" :max="Math.max(duration, 0)" step="0.05" :value="seeking ? seekValue : currentTime" @mousedown.stop @touchstart.stop @input="handleSeekInput" @change="handleSeekCommit")
    .time(:class="$style.time")
      span {{ fmt(currentTime) }}
      span {{ fmt(duration) }}
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { WIN_MINI_PLAYER_RENDERER_EVENT_NAME } from '@common/ipcNames'
import { rendererOn, rendererOff, rendererSend } from '@common/rendererIpc'

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

const port = ref<Electron.IpcRendererEvent['ports'][0] | null>(null)

const name = ref('')
const singer = ref('')
const album = ref('')
const isPlay = ref(false)
const currentTime = ref(0)
const duration = ref(0)

let baseTime = 0
let basePerf = 0
let rafId: number | null = null

const seeking = ref(false)
const seekValue = ref(0)

const title = computed(() => name.value || 'LX Music')
const subTitle = computed(() => {
  const s = singer.value
  const a = album.value
  return a ? `${s} - ${a}` : s
})

const fmt = (t: number) => {
  if (!t || Number.isNaN(t)) return '00:00'
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const send = (action: MiniPlayerAction['action'], data?: number) => {
  if (!port.value) return
  const payload: any = { action }
  if (data != null) payload.data = data
  port.value.postMessage(payload)
}

const handleSeekInput = (e: Event) => {
  const v = parseFloat((e.target as HTMLInputElement).value)
  seeking.value = true
  seekValue.value = Number.isNaN(v) ? 0 : v
}

const handleSeekCommit = () => {
  if (!seeking.value) return
  seeking.value = false
  send('seek', seekValue.value)
}

const handleMouseDown = (e: MouseEvent) => {
  // Only start drag if not clicking on interactive elements
  if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).tagName === 'INPUT') return
  
  // Request window to be draggable
  rendererSend(WIN_MINI_PLAYER_RENDERER_EVENT_NAME.request_main_window_channel)
}

onMounted(() => {
  const provide = ({ event }: any) => {
    const [p] = event.ports
    port.value = p
    p.onmessage = ({ data }: { data: MiniPlayerStatus }) => {
      if (!data || data.action !== 'status') return
      name.value = data.data.name
      singer.value = data.data.singer
      album.value = data.data.album ?? ''
      isPlay.value = data.data.isPlay
      duration.value = data.data.duration
      baseTime = data.data.currentTime
      basePerf = performance.now()
      if (!seeking.value) currentTime.value = baseTime
    }
    send('get_status')
  }

  const tick = () => {
    rafId = requestAnimationFrame(tick)
    if (seeking.value) return
    if (!isPlay.value) return
    const d = duration.value
    const now = performance.now()
    const t = baseTime + Math.max(0, (now - basePerf) / 1000)
    currentTime.value = d > 0 ? Math.min(t, d) : t
  }
  rafId = requestAnimationFrame(tick)

  rendererOn(WIN_MINI_PLAYER_RENDERER_EVENT_NAME.provide_main_window_channel, provide)
  rendererSend(WIN_MINI_PLAYER_RENDERER_EVENT_NAME.request_main_window_channel)

  onBeforeUnmount(() => {
    rendererOff(WIN_MINI_PLAYER_RENDERER_EVENT_NAME.provide_main_window_channel, provide)
    if (rafId != null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  })
})
</script>

<style module lang="less">
.root {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 12px;
  height: 56px;
  width: 100%;
  background: rgba(30, 30, 30, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  user-select: none;
  cursor: move;
  overflow: hidden;
  box-sizing: border-box;
  -webkit-app-region: drag; /* Enable window dragging */
  
  /* Hide all scrollbars */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}
.root::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}

.info {
  flex: 1;
  min-width: 0;
  max-width: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
}

.title {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.sub {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  -webkit-app-region: no-drag; /* Prevent buttons from being draggable */
}
.btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.progress {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 120px;
  flex-shrink: 0;
  overflow: hidden;
}

.slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  -webkit-app-region: no-drag; /* Prevent slider from being draggable */
}
.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  background: #fff;
  border-radius: 50%;
  cursor: pointer;
}
.slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  background: #fff;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

.time {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
}
</style>
