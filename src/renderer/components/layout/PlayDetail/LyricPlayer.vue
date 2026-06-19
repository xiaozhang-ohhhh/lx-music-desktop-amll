<template>
  <div :class="['right', $style.right]" :style="lrcFontSize">
    <div
      v-show="!isShowLrcSelectContent"
      ref="dom_lyric"
      :class="['lyric', $style.lyric, { [$style.draging]: isMsDown }]"
      @contextmenu.stop="handleShowLyricMenu"
    >
      <div :class="['pre', $style.lyricSpace]" />
      <!-- AMLL LyricPlayer 会在这里渲染 -->
      <div ref="dom_lyric_container" :class="$style.lyricPlayerContainer" :style="lyricStyle"></div>
      <div :class="$style.lyricSpace" />
    </div>
    
    <div v-if="isShowLyricProgressSetting" v-show="isStopScroll && !isShowLrcSelectContent" :class="$style.skip">
      <div :class="$style.line" />
      <span :class="$style.label">{{ timeStr }}</span>
    </div>
    
    <div v-if="isShowLrcSelectContent" ref="dom_lrc_select_content" tabindex="-1" :class="[$style.lyricSelectContent, 'select', 'scroll', 'lyricSelectContent']" @contextmenu="handleCopySelectText">
      <div v-for="(info, index) in lyric.lines" :key="index" :class="[$style.lyricSelectline, { [$style.lrcActive]: lyric.line == index }]">
        <span>{{ info.text }}</span>
        <template v-for="(lrc, i) in info.extendedLyrics" :key="i">
          <br>
          <span :class="$style.lyricSelectlineExtended">{{ lrc }}</span>
        </template>
      </div>
    </div>
    
    <LyricMenu v-model="lyricMenuVisible" :xy="lyricMenuXY" :lyric-info="lyricInfo" @update-lyric="handleUpdateLyric" />
  </div>
</template>

<script>
import { clipboardWriteText } from '@common/utils/electron'
import { lyric } from '@renderer/store/player/lyric'
import { playProgress } from '@renderer/store/player/playProgress'
import { isFullscreen } from '@renderer/store'
import { musicInfo as playerMusicInfo } from '@renderer/store/player/state'
import { appSetting } from '@renderer/store/setting'

// 修正 AMLL 导入 - 使用正确的路径
import { LyricPlayer } from '@applemusic-like-lyrics/core'
import '@applemusic-like-lyrics/core/style.css'

import {
  isPlay,
  isShowLrcSelectContent,
  isShowPlayComment,
  playMusicInfo,
} from '@renderer/store/player/state'
import {
  setMusicInfo,
} from '@renderer/store/player/action'
import {
  setCurrentTime,
  getCurrentTime,
} from '@renderer/plugins/player'
import { onMounted, onBeforeUnmount, computed, reactive, ref, nextTick, watch } from '@common/utils/vueTools'
import LyricMenu from './components/LyricMenu.vue'
import { setLyricOffset } from '@renderer/core/lyric'
import useSelectAllLrc from './useSelectAllLrc'

export default {
  components: {
    LyricMenu,
  },
  setup() {
    const isShowLyricProgressSetting = computed(() => appSetting['playDetail.isShowLyricProgressSetting'])

    const isRtlLyric = ref(false)

    const detectRtl = (text) => {
      if (!text) return false
      // Only Arabic characters (exclude Hebrew, Syriac, etc.)
      const rtlRxp = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/
      // Count only letter-like characters to avoid punctuation/whitespace skew
      const letters = String(text).match(/[\p{L}\p{M}]/gu) ?? []
      if (!letters.length) return false
      let rtlCount = 0
      for (const ch of letters) {
        if (rtlRxp.test(ch)) rtlCount++
      }
      return (rtlCount / letters.length) > 0.3
    }

    const getCurrentLineText = () => {
      try {
        const lineIndex = lyric.line
        const lines = lyric.lines
        if (lineIndex == null || !Array.isArray(lines) || !lines.length) return ''
        const line = lines[lineIndex]
        if (!line) return ''
        const main = line.text ?? ''
        const ext = Array.isArray(line.extendedLyrics) ? line.extendedLyrics.join(' ') : ''
        return `${main} ${ext}`.trim()
      } catch (e) {
        return ''
      }
    }

    const updateRtlFromCurrentLine = () => {
      const text = getCurrentLineText()
      if (!text) return
      isRtlLyric.value = detectRtl(text)
    }

    watch(() => lyric.line, () => {
      updateRtlFromCurrentLine()
    }, { immediate: true })

    watch(() => lyric.lines, () => {
      updateRtlFromCurrentLine()
    })

    // 动态设置CSS变量
    const lyricStyle = computed(() => {
      return {
        '--lyric-font-weight': appSetting['playDetail.lyric.fontWeight'] || '900',
        '--lyric-direction': isRtlLyric.value ? 'rtl' : 'ltr',
        '--lyric-text-align': 'left',
        '--lyric-left': '5%',
        '--lyric-right': '0',
      }
    })

    // AMLL 播放器实例
    const amllPlayer = ref(null)
    const dom_lyric_container = ref(null)
    
    // 动画循环 - 高性能时间同步
    let animationFrame = null
    let lastRafTime = 0

    // 以播放器进度为基准的时间锚点
    let basePlayTimeMs = 0
    let basePerfTime = 0
    let hasBaseTime = false

    // setCurrentTime 调用节流：只在漂移/seek/低频校准时调用
    let lastSetTimeMs = 0
    let lastSetPerfTime = 0
    let needHardSync = false

    const SYNC_INTERVAL_MS = 200
    const DRIFT_THRESHOLD_MS = 35

    let calcLayoutTimer = null
    const scheduleCalcLayout = (delay = 100) => {
      if (calcLayoutTimer) clearTimeout(calcLayoutTimer)
      calcLayoutTimer = setTimeout(() => {
        if (!amllPlayer.value) return
        try {
          amllPlayer.value.calcLayout(true)
        } catch (e) {
        }
      }, delay)
    }

    // 简单的状态管理
    const isMsDown = ref(false)
    const isStopScroll = ref(false)
    const timeStr = ref('00:00')
    const dom_lyric = ref(null)

    let stopScrollTimer = null
    const updateStopScrollTime = () => {
      if (!isStopScroll.value) return
      const time = Number(getCurrentTime()) || 0
      const minutes = Math.floor(time / 60)
      const seconds = Math.floor(time % 60)
      timeStr.value = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }

    watch(isStopScroll, (val) => {
      if (stopScrollTimer) {
        clearInterval(stopScrollTimer)
        stopScrollTimer = null
      }
      if (!val) {
        timeStr.value = '00:00'
        return
      }
      updateStopScrollTime()
      stopScrollTimer = setInterval(updateStopScrollTime, 250)
    }, { immediate: true })

    const dom_lrc_select_content = useSelectAllLrc()

    watch(isRtlLyric, (isRtl) => {
      if (!amllPlayer.value) return
      try {
        // 始终左对齐，只改变文字方向
        amllPlayer.value.setAlignAnchor('left')
        amllPlayer.value.setAlignPosition(0.35)
      } catch (e) {}
      scheduleCalcLayout(60)
    })

    // 监听歌词显示状态变化，重新计算布局
    watch(() => isShowLrcSelectContent.value, () => {
      scheduleCalcLayout(120)
    })

    // 监听全屏状态变化，重新计算布局
    watch([isFullscreen, isShowPlayComment], () => {
      scheduleCalcLayout(420)
    })

    
    const getCurrentLyricData = () => {
      if (playerMusicInfo.lxlrc) {
        return {
          text: playerMusicInfo.lxlrc,
          type: 'word',
        }
      } else if (playerMusicInfo.lrc) {
        return {
          text: playerMusicInfo.lrc,
          type: 'lrc',
        }
      }
      return {
        text: null,
        type: 'none',
      }
    }

    let lyricParseTimer = null
    let lyricParseReqId = 0
    const scheduleLyricParse = (delay = 80) => {
      if (lyricParseTimer) clearTimeout(lyricParseTimer)
      lyricParseTimer = setTimeout(async () => {
        lyricParseTimer = null
        if (!amllPlayer.value) return

        const reqId = ++lyricParseReqId
        const lyricData = getCurrentLyricData()
        if (!lyricData.text) {
          try { amllPlayer.value.setLyricLines([], 0) } catch (e) {}
          scheduleCalcLayout(80)
          return
        }

        let amllLyrics = []
        try {
          const worker = window.lx?.worker?.main
          if (worker?.parseLyricsInWorker) {
            amllLyrics = await worker.parseLyricsInWorker(lyricData.text, lyricData.type, playerMusicInfo.tlrc)
          }
        } catch (e) {
          return
        }

        if (reqId !== lyricParseReqId) return
        if (!amllPlayer.value) return
        if (!Array.isArray(amllLyrics) || amllLyrics.length === 0) return

        const currentTimeMs = Math.round(Number(playProgress.nowPlayTime) * 1000)
        const validTime = isNaN(currentTimeMs) ? 0 : Math.max(0, currentTimeMs)

        try {
          amllPlayer.value.setLyricLines(amllLyrics, validTime)
        } catch (e) {
          return
        }
        needHardSync = true
        scheduleCalcLayout(80)
      }, delay)
    }

    watch(() => playerMusicInfo.id, (newId, oldId) => {
      if (newId !== oldId && newId) {
        scheduleLyricParse(100)
      }
    }, { immediate: false })

    watch(() => playerMusicInfo.tlrc, (newTlrc, oldTlrc) => {
      if (newTlrc === oldTlrc) return
      scheduleLyricParse(120)
    })

    watch(() => playerMusicInfo.lrc, (newLrc, oldLrc) => {
      if (playerMusicInfo.lxlrc) return
      if (newLrc === oldLrc) return
      scheduleLyricParse(80)
    })

    watch(() => playerMusicInfo.lxlrc, (newLxlrc, oldLxlrc) => {
      if (newLxlrc === oldLxlrc) return
      scheduleLyricParse(80)
    })

    // 节流函数
    const throttle = (func, delay) => {
      let timeoutId
      let lastExecTime = 0
      return function (...args) {
        const currentTime = Date.now()
        
        if (currentTime - lastExecTime > delay) {
          func.apply(this, args)
          lastExecTime = currentTime
        } else {
          clearTimeout(timeoutId)
          timeoutId = setTimeout(() => {
            func.apply(this, args)
            lastExecTime = Date.now()
          }, delay - (currentTime - lastExecTime))
        }
      }
    }

    let nowPlayTimeMs = 0

    // 播放状态同步：使用 playProgress.nowPlayTime
    watch(isPlay, (playing) => {
      if (!amllPlayer.value) return

      try {
        const validTime = nowPlayTimeMs
        const perfNow = performance.now()
        basePlayTimeMs = validTime
        basePerfTime = perfNow
        hasBaseTime = true

        if (playing) {
          try { amllPlayer.value.resume() } catch (e) {}
          amllPlayer.value.setCurrentTime(validTime)
          needHardSync = true
        } else {
          try { amllPlayer.value.pause() } catch (e) {}
          amllPlayer.value.setCurrentTime(validTime)
        }
      } catch (error) {
        // 错误处理
      }
    }, { immediate: true })

    // 监听强制歌词更新事件
    const handleForceUpdate = throttle((event) => {
      const lyricData = getCurrentLyricData()
      
      if (amllPlayer.value && lyricData.text) {
        scheduleLyricParse(0)
      }
    }, 200) // 200ms节流

    // 添加事件监听
    onMounted(() => {
      window.addEventListener('lyric-force-update', handleForceUpdate)
      
      // 初始化时检查歌词
      setTimeout(() => {
        const lyricData = getCurrentLyricData()
        if (lyricData.text) {
          scheduleLyricParse(0)
        }
      }, 200)
    })

    onBeforeUnmount(() => {
      window.removeEventListener('lyric-force-update', handleForceUpdate)

      if (stopScrollTimer) {
        clearInterval(stopScrollTimer)
        stopScrollTimer = null
      }

      lyricParseReqId++
      if (lyricParseTimer) {
        clearTimeout(lyricParseTimer)
        lyricParseTimer = null
      }
    })

    // 时间进度监听：只在 seek/pause 时更新基准锚点
    watch(() => playProgress.nowPlayTime, (time) => {
      const currentTime = Number(time)
      if (isNaN(currentTime) || currentTime < 0) return

      const newTimeMs = Math.round(currentTime * 1000)
      nowPlayTimeMs = newTimeMs
      const perfNow = performance.now()

      const jumpMs = hasBaseTime ? Math.abs(newTimeMs - basePlayTimeMs) : Infinity

      // 暂停时更新锚点
      if (!isPlay.value) {
        if (!hasBaseTime || jumpMs > 500) {
          basePlayTimeMs = newTimeMs
          basePerfTime = perfNow
          hasBaseTime = true
          needHardSync = true
        }
        return
      }

      // 播放中：只在明显跳变（seek）时更新锚点
      if (jumpMs > 500) {
        basePlayTimeMs = newTimeMs
        basePerfTime = perfNow
        hasBaseTime = true
        needHardSync = true
      }
      // 播放中不持续更新锚点
    }, { immediate: true })

    // 高性能动画循环：每帧只 update(delta)，低频 setCurrentTime 校准
    const animate = (rafTime) => {
      const amll = amllPlayer.value
      if (!amll) return
      if (!hasBaseTime) {
        animationFrame = requestAnimationFrame(animate)
        return
      }

      const perfNow = rafTime

      let predictedMs = basePlayTimeMs + (isPlay.value ? (perfNow - basePerfTime) : 0)
      // 动态修正：使用缓存的 nowPlayTimeMs，避免每帧读取响应式并做 Number/round
      if (isPlay.value) {
        const targetMs = nowPlayTimeMs
        if (Math.abs(predictedMs - targetMs) > 100) {
          predictedMs = predictedMs * 0.98 + targetMs * 0.02
        }
      }
      const predictedMsInt = predictedMs <= 0 ? 0 : Math.floor(predictedMs)

      // 需要强制对齐（seek/切歌/恢复播放等）
      if (needHardSync) {
        try {
          amll.setCurrentTime(predictedMsInt)
        } catch (e) {}
        lastSetTimeMs = predictedMsInt
        lastSetPerfTime = perfNow
        needHardSync = false
      } else if (isPlay.value) {
        // 漂移校准：限制 setCurrentTime 调用频率
        const drift = Math.abs(predictedMsInt - lastSetTimeMs)
        const canSync = !lastSetPerfTime || (perfNow - lastSetPerfTime) >= SYNC_INTERVAL_MS
        if (canSync && drift >= DRIFT_THRESHOLD_MS) {
          try {
            amll.setCurrentTime(predictedMsInt)
          } catch (e) {}
          lastSetTimeMs = predictedMsInt
          lastSetPerfTime = perfNow
        }
      }

      // 每帧推进动画（轻量）
      if (lastRafTime) {
        const delta = Math.min(rafTime - lastRafTime, 66)
        amll.update(delta)
      }

      lastRafTime = rafTime
      animationFrame = requestAnimationFrame(animate)
    }

    const startAnimation = () => {
      if (animationFrame) return
      lastRafTime = 0
      animationFrame = requestAnimationFrame(animate)
    }

    const stopAnimation = () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
        animationFrame = null
      }
    }

    const handleVisibilityChange = () => {
      if (document.hidden) stopAnimation()
      else startAnimation()
    }

    const initAMLLPlayer = async () => {
      if (!amllPlayer.value) {
        // 创建 AMLL 播放器
        amllPlayer.value = new LyricPlayer()
        
        // 直接写死配置
        amllPlayer.value.setEnableSpring(true)
        amllPlayer.value.setEnableScale(true)
        amllPlayer.value.setEnableBlur(true)
        // 始终左对齐，只改变文字方向
        amllPlayer.value.setAlignAnchor('left')
        amllPlayer.value.setAlignPosition(0.35)
        
        // 设置歌词行点击事件处理器
        amllPlayer.value.onLineClickedHandler = (event) => {
          if (event.line && event.line.lyricLine && event.line.lyricLine.startTime !== undefined) {
            const timeInSeconds = event.line.lyricLine.startTime / 1000
            setCurrentTime(timeInSeconds)
          }
        }
      }
      
      // 检查容器
      
      if (dom_lyric_container.value && dom_lyric_container.value.clientWidth > 0) {
        // 获取 AMLL 的元素
        const amllElement = amllPlayer.value.getElement()
        
        // 安全地检查元素尺寸
        try {
          // 容器尺寸检查
        } catch (error) {
          // 获取容器尺寸时出错
        }
        
        // 添加到 DOM
        dom_lyric_container.value.appendChild(amllElement)
        
        // 再次检查尺寸
        setTimeout(() => {
          // 尺寸检查
        }, 1000)
        
        return true
      } else {
        return false
      }
    }

    onMounted(async () => {
      // 等待DOM完全渲染
      await nextTick()
      
      // 初始化AMLL播放器
      const success = await initAMLLPlayer()
      if (!success) {
        // 延迟重试
        setTimeout(async () => {
          const retrySuccess = await initAMLLPlayer()
          if (!retrySuccess) {
            // 重试失败
          }
        }, 1000)
        return
      }
      
      // 初始歌词
      if (lyric.lines && lyric.lines.length) {
        // 歌词会在 watch 中自动处理
      }
      
      // 如果有逐字歌词，立即设置
      if (playerMusicInfo.lxlrc) {
        // 触发逐字歌词watch
        setTimeout(() => {
          // 手动触发逐字歌词更新
          const lxlrcEvent = new Event('lxlrc-update')
          window.dispatchEvent(lxlrcEvent)
        }, 100)
      }
      
      startAnimation()

      document.addEventListener('visibilitychange', handleVisibilityChange)
      
      window.app_event.on('musicToggled', updateMusicInfo)
      window.app_event.on('lyricUpdated', updateMusicInfo)
    })

    onBeforeUnmount(() => {
      stopAnimation()

      document.removeEventListener('visibilitychange', handleVisibilityChange)

      if (calcLayoutTimer) {
        clearTimeout(calcLayoutTimer)
        calcLayoutTimer = null
      }
      
      if (amllPlayer.value) {
        amllPlayer.value.dispose()
        amllPlayer.value = null
      }
      
      window.app_event.off('musicToggled', updateMusicInfo)
      window.app_event.off('lyricUpdated', updateMusicInfo)
    })

    watch(() => isShowLrcSelectContent.value, (isShow) => {
      if (isShow) stopAnimation()
      else if (!document.hidden) startAnimation()
    }, { immediate: true })

    const lyricMenuVisible = ref(false)
    const lyricMenuXY = reactive({ x: 0, y: 0 })
    const lyricInfo = reactive({
      lyric: '',
      tlyric: '',
      rlyric: '',
      lxlyric: '',
      rawlyric: '',
      musicInfo: null,
    })
    
    const updateMusicInfo = () => {
      lyricInfo.lyric = playerMusicInfo.lrc
      lyricInfo.tlyric = playerMusicInfo.tlrc
      lyricInfo.rlyric = playerMusicInfo.rlrc
      lyricInfo.lxlyric = playerMusicInfo.lxlrc
      lyricInfo.rawlyric = playerMusicInfo.rawlrc
      lyricInfo.musicInfo = playMusicInfo.musicInfo
    }
    
    const handleShowLyricMenu = event => {
      updateMusicInfo()
      lyricMenuXY.x = event.pageX
      lyricMenuXY.y = event.pageY
      if (lyricMenuVisible.value) return
      void nextTick(() => {
        lyricMenuVisible.value = true
      })
    }
    
    const handleUpdateLyric = ({ lyric, tlyric, rlyric, lxlyric, offset }) => {
      setMusicInfo({ lrc: lyric, tlrc: tlyric, rlrc: rlyric, lxlrc: lxlyric })
      setLyricOffset(offset)
    }

    const lrcFontSize = computed(() => {
      let size = appSetting['playDetail.style.fontSize'] / 100
      if (isFullscreen.value) size *= 1.4
      return {
        '--playDetail-lrc-font-size': (isShowPlayComment.value ? size * 0.82 : size) + 'rem',
      }
    })

    return {
      dom_lyric,
      dom_lyric_container,
      dom_lrc_select_content,
      isMsDown,
      timeStr,
      lyric,
      lrcFontSize,
      isShowLrcSelectContent,
      isShowLyricProgressSetting,
      isStopScroll,
      lyricMenuVisible,
      lyricMenuXY,
      handleShowLyricMenu,
      handleUpdateLyric,
      lyricInfo,
      lyricStyle,
    }
  },
  methods: {
    handleCopySelectText() {
      let str = window.getSelection().toString().trim()
      if (!str.length) return
      clipboardWriteText(str)
    },
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.right {
  flex: 0 0 60%;
  position: relative;
  transition: flex-basis @transition-normal;
  height: 100%;
}

.lyric {
  text-align: center;
  height: 100%;
  width: 100%;
  overflow: hidden;
  font-size: var(--playDetail-lrc-font-size, 16px);
  -webkit-mask-image: linear-gradient(transparent 0%, #fff 20%, #fff 80%, transparent 100%);
  mask-image: linear-gradient(transparent 0%, #fff 20%, #fff 80%, transparent 100%);
  cursor: grab;
  position: relative;
  display: flex;
  flex-direction: column;
  
  &.draging {
    cursor: grabbing;
  }
}

.lyricSpace {
  flex: 0 0 15%;
  height: auto;
  
  &.pre {
    flex: 0 0 30%;
  }
}

.lyricPlayerContainer {
  flex: 1 1 auto;
  width: 100%;
  position: relative;
  min-height: 0;
  
  :global {
    .amll-lyric-player {
      width: 100%;
      height: 90vh;
      position: absolute;
      top: calc(50% - 24px);
      left: var(--lyric-left, 5%);
      right: var(--lyric-right, 0);
      transform: translateY(-50%);
      font-size: var(--playDetail-lrc-font-size, 16px) !important;
      
      color: #ffffff !important;
      
      * {
        direction: var(--lyric-direction, ltr) !important;
        text-align: var(--lyric-text-align, left) !important;
        font-weight: var(--lyric-font-weight, 900) !important;
      }
      
      .amll-lyric-container {
        justify-content: center !important;
      }
      
      /* 歌词行样式 */
      .amll-lyric-line {
        color: #ffffff !important;
        font-weight: var(--lyric-font-weight, 900) !important;
        direction: var(--lyric-direction, ltr) !important;
        text-align: var(--lyric-text-align, left) !important;
        align-self: center !important;
        
        &.active {
          color: #ffffff !important;
          font-weight: var(--lyric-font-weight, 900) !important;
        }
      }
      
      /* 逐字歌词 */
      .amll-lyric-word {
        font-weight: var(--lyric-font-weight, 900) !important;
        
        &.active {
          color: #ffffff !important;
          font-weight: var(--lyric-font-weight, 900) !important;
        }
      }
      
      /* 翻译歌词 */
      .amll-lyric-sub-line {
        color: #ffffff !important;
        direction: var(--lyric-direction, ltr) !important;
        text-align: var(--lyric-text-align, left) !important;
        font-weight: var(--lyric-font-weight, 900) !important;
        
        .amll-lyric-line.active & {
          color: #ffffff !important;
          font-weight: var(--lyric-font-weight, 900) !important;
        }
      }
    }
  }
}

/* 跳过线区域 */
.skip {
  position: absolute;
  top: 30%;
  left: 0;
  width: 100%;
  pointer-events: none;
  z-index: 5;
  
  .line {
    border-top: 2px dotted var(--color-primary-dark-100);
    opacity: .15;
    margin-right: 30px;
    -webkit-mask-image: linear-gradient(90deg, transparent 0%, transparent 15%, #fff 100%);
    mask-image: linear-gradient(90deg, transparent 0%, transparent 15%, #fff 100%);
    width: calc(100% - 30px);
  }
  
  .label {
    position: absolute;
    right: 30px;
    top: -14px;
    font-size: 12px;
    color: var(--color-primary-dark-100);
    opacity: .7;
    background: transparent;
    padding: 2px 4px;
    border-radius: 4px;
  }
  
  .skipBtn {
    position: absolute;
    right: 0;
    top: 0;
    transform: translateY(-50%);
    width: 30px;
    height: 30px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none !important;
    pointer-events: initial;
    transition: @transition-normal opacity;
    opacity: .8;
    border: none;
    cursor: pointer;
    
    &:hover {
      opacity: .6;
    }
    
    svg {
      width: 20px;
      height: 20px;
      fill: var(--color-primary-dark-100);
    }
  }
}

/* 歌词选择区域 */
.lyricSelectContent {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 100%;
  font-size: var(--playDetail-lrc-font-size, 16px);
  z-index: 10;
  color: #ffffff;
  overflow-y: auto;
  background: var(--color-body-bg);
  padding: 5% 0;
  box-sizing: border-box;
  direction: var(--lyric-direction, ltr);

  .lyricSelectline {
    padding: calc(var(--playDetail-lrc-font-size, 16px) / 2) 20px;
    display: block;
    margin-top: 4px;
  }
  
  .lrcActive {
    color: #ffffff !important; /* 强制白色 */
    font-weight: 500;
  }
  
  .lyricSelectline {
    text-align: var(--lyric-text-align, left);
    cursor: pointer;
    
    &:hover {
      background: rgba(255, 255, 255, 0.05);
    }
  }
  
  .lyricSelectlineExtended {
    font-size: 0.8em;
    opacity: 0.7;
    display: block;
    margin-top: 4px;
  }
  
  .lrcActive {
    color: var(--color-primary) !important; /* 使用主题主色 */
    font-weight: 500;
  }
}

/* 响应式调整 */
@media screen and (max-width: 768px) {
  .right {
    flex: 0 0 50%;
  }
  
  .lyricSpace.pre {
    flex: 0 0 20%;
  }
  
  .lyricSpace {
    flex: 0 0 10%;
  }
}

/* 全屏模式调整 */
:global(.fullscreen) {
  .lyricPlayerContainer :global(.amll-lyric-player) {
    font-size: calc(var(--playDetail-lrc-font-size, 16px) * 1.2);
  }
  
  .lyricSpace.pre {
    flex: 0 0 25%;
  }
}
</style>