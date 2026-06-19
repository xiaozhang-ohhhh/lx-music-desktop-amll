<template lang="pug">
transition(enter-active-class="animated slideInRight" leave-active-class="animated slideOutDown" @after-enter="handleAfterEnter" @after-leave="handleAfterLeave")
  div(v-if="isShowPlayerDetail" :class="[$style.container, { fullscreen: isFullscreen }]" @contextmenu="handleContextMenu")
    div(:class="$style.bg" ref="bgContainer")
    ControlBtnsLeftHeader(v-if="appSetting['common.controlBtnPosition'] == 'left'")
    ControlBtnsRightHeader(v-else)
    div(:class="[$style.main, {[$style.showComment]: isShowPlayComment}]")
      div.left(:class="$style.left")
        div(:class="$style.info")
          img(v-if="musicInfo.pic" :class="$style.img" :src="musicInfo.pic")
          div.description(:class="['scroll', $style.description]")
            p {{ musicInfo.name }}
            p {{ musicInfo.singer }}{{ musicInfo.album ? ` - ${musicInfo.album}` : '' }}

      div(:class="$style.lyricPane")
        transition(enter-active-class="animated fadeIn" leave-active-class="animated fadeOut")
          LyricPlayer(v-if="visibled")
      music-comment(v-if="visibled" :class="$style.comment" :show="isShowPlayComment" :music-info="playMusicInfo.musicInfo" @close="hideComment")
    transition(enter-active-class="animated fadeIn" leave-active-class="animated fadeOut")
      play-bar(v-if="visibled && appSetting['playDetail.isShowPlayBar']")
    transition(enter-active-class="animated-slow fadeIn" leave-active-class="animated-slow fadeOut")
      common-audio-visualizer(v-if="appSetting['player.audioVisualization'] && visibled")
</template>


<script>
// 导入原版AMLL背景渲染
import { BackgroundRender, MeshGradientRenderer } from '@applemusic-like-lyrics/core'
import { onBeforeUnmount, onMounted, ref, watch } from '@common/utils/vueTools'
import { isFullscreen } from '@renderer/store'
import {
  isShowPlayerDetail,
  isShowPlayComment,
  musicInfo,
  playMusicInfo,
} from '@renderer/store/player/state'
import {
  setShowPlayerDetail,
  setShowPlayComment,
  setShowPlayLrcSelectContentLrc,
} from '@renderer/store/player/action'
import { getAnalyser, getAudioContext } from '@renderer/plugins/player'
import LyricPlayer from './LyricPlayer.vue'
import PlayBar from './PlayBar.vue'
import MusicComment from './components/MusicComment/index.vue'
import ControlBtnsLeftHeader from './ControlBtnsLeftHeader.vue'
import ControlBtnsRightHeader from './ControlBtnsRightHeader.vue'
import { registerAutoHideMounse, unregisterAutoHideMounse } from './autoHideMounse'
import { appSetting } from '@renderer/store/setting'
import { closeWindow, maxWindow, minWindow, setFullScreen } from '@renderer/utils/ipc'

export default {
  name: 'CorePlayDetail',
  components: {
    ControlBtnsLeftHeader,
    ControlBtnsRightHeader,
    LyricPlayer,
    PlayBar,
    MusicComment,
  },
  
  
  setup() {
    const visibled = ref(false)
    const bgContainer = ref(null)
    let bgRenderer = null
    let bgCanvas = null
    let initTimer = null
    let resizeObserver = null

    let clickTime = 0
    
    // 音频分析器相关
    const analyser = getAnalyser()
    let audioDataArray = null
    let audioAnimationId = null
    
    analyser.fftSize = 2048

    // 关键改动：用 BiquadFilterNode 高通滤波器物理移除 bass
    // 音频图：analyser -> kickHighpass(150Hz) -> kickAnalyser -> silentGain(0) -> destination
    // kickAnalyser 只能看到 150Hz 以上的信号，bass 被物理移除
    // silentGain(0) 防止额外音频输出
    let kickAnalyser = null
    let kickHighpass = null
    let kickDataArray = null
    let silentGain = null

    // AMLL背景渲染器初始化
    const initAMLLBackground = () => {
      if (!bgContainer.value || bgRenderer) return
      
      // 直接使用musicInfo.pic
      if (!musicInfo.pic) {
        initTimer = setTimeout(initAMLLBackground, 1000)
        return
      }
      
      try {
        // 创建canvas
        const canvas = document.createElement('canvas')
        bgCanvas = canvas
        canvas.id = 'amll-canvas'
        canvas.style.cssText = `
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
          pointer-events: none !important;
          z-index: 1 !important;
          background: transparent !important;
          display: block !important;
          transform: translateZ(0) !important;
          will-change: transform !important;
          backface-visibility: hidden !important;
          -webkit-backface-visibility: hidden !important;
          -webkit-transform: translateZ(0) !important;
        `
        
        bgContainer.value.appendChild(canvas)
        
        // 设置canvas尺寸
        const updateCanvasSize = () => {
          if (!bgContainer.value || !bgCanvas) return
          const rect = bgContainer.value.getBoundingClientRect()
          const dpr = window.devicePixelRatio || 1
          bgCanvas.width = Math.round(rect.width * dpr)
          bgCanvas.height = Math.round(rect.height * dpr)
          bgCanvas.style.width = rect.width + 'px'
          bgCanvas.style.height = rect.height + 'px'
        }
        updateCanvasSize()

        // ResizeObserver 自动调整 canvas 尺寸
        resizeObserver = new ResizeObserver(() => {
          updateCanvasSize()
          if (bgRenderer?.setRenderScale) bgRenderer.setRenderScale(0.5)
        })
        resizeObserver.observe(bgContainer.value)
        
        // 初始化音频数据数组
        if (analyser && !audioDataArray) {
          audioDataArray = new Uint8Array(analyser.frequencyBinCount)
          rebuildFreqBins()
        }
        
        const meshRenderer = new MeshGradientRenderer(canvas)
        bgRenderer = new BackgroundRender(meshRenderer, canvas)
        
        // WebGL 优化已由 MeshGradientRenderer 内部处理，无需重复查询扩展
        
        bgRenderer.setRenderScale(1.0)
        bgRenderer.setFlowSpeed(0.8)
        bgRenderer.setFPS(60)  
        bgRenderer.setHasLyric(true)
        bgRenderer.setLowFreqVolume(0) 
        
        // 设置专辑封面
        bgRenderer.setAlbum(musicInfo.pic)
        
        // 启动渲染
        if (bgRenderer.resume) {
          bgRenderer.resume()
        }
        
        // 立即启动音频分析，确保实时传输
        if (!audioAnimationId && analyser) {
          audioAnalysisLoop()
        }
        
      } catch (error) {
        // 静默处理错误
      }
    }

    const initKickDetector = () => {
      try {
        const ctx = getAudioContext()
        if (!ctx) return

        // 高通滤波器：80Hz 以下切掉（只移除 sub-bass，保留底鼓主体）
        kickHighpass = ctx.createBiquadFilter()
        kickHighpass.type = 'highpass'
        kickHighpass.frequency.value = 80
        kickHighpass.Q.value = 0.7

        // 独立 analyser，只分析高通后的信号
        kickAnalyser = ctx.createAnalyser()
        kickAnalyser.fftSize = 2048
        // 给一点 smoothing，降低无鼓时量化抖动导致的误触发
        kickAnalyser.smoothingTimeConstant = 0.12
        kickDataArray = new Uint8Array(kickAnalyser.frequencyBinCount)

        // 静音增益节点，防止额外音频输出
        silentGain = ctx.createGain()
        silentGain.gain.value = 0

        // 连接：analyser -> highpass -> kickAnalyser -> silentGain -> destination
        analyser.connect(kickHighpass)
        kickHighpass.connect(kickAnalyser)
        kickAnalyser.connect(silentGain)
        silentGain.connect(ctx.destination)
      } catch (e) {
        kickAnalyser = null
        kickHighpass = null
        kickDataArray = null
        silentGain = null
      }
    }
    initKickDetector()

    let lastAudioAnalysisTime = 0
    const audioAnalysisIntervalMs = 1000 / 60

    // 底鼓检测：自适应基线 + 严格触发脉冲（无鼓时尽量贴近 0）
    let prevEnergy = 0
    let pulseEnv = 0
    let kickBaseline = 0
    let fluxBaseline = 0
    let kickPeakHold = 0
    let silentFrames = 0
    let hardMute = false
    let lowFreqSmoothed = 0

    let kickStartBin = 0
    let kickEndBin = 0
    let midStartBin = 0
    let midEndBin = 0
    const rebuildFreqBins = () => {
      const an = kickAnalyser || analyser
      const arr = kickDataArray || audioDataArray
      if (!an || !arr) {
        kickStartBin = 0
        kickEndBin = 0
        midStartBin = 0
        midEndBin = 0
        return
      }

      const fftSize = an.fftSize || 2048
      const actualSampleRate = an.context?.sampleRate || 48000
      const freqResolution = actualSampleRate / fftSize

      // 这里的频段应当匹配 highpass(80Hz) 之后的 analyser
      // 选择 90-170Hz：尽量贴近底鼓/低频瞬态，减少人声/氛围垫底误触发
      kickStartBin = Math.max(0, Math.floor(90 / freqResolution))
      kickEndBin = Math.min(arr.length - 1, Math.floor(170 / freqResolution))

      // 中频参考段（人声/和弦主体常在此），用于抑制无鼓段落的“跟随跳动”
      midStartBin = Math.max(0, Math.floor(220 / freqResolution))
      midEndBin = Math.min(arr.length - 1, Math.floor(900 / freqResolution))

      prevEnergy = 0
      pulseEnv = 0
      kickBaseline = 0
      fluxBaseline = 0
      kickPeakHold = 0
      silentFrames = 0
      hardMute = false
      lowFreqSmoothed = 0
    }
    
    const calculateLowFreqVolume = () => {
      // 优先使用高通滤波后的 analyser（bass 已物理移除），降级到原始 analyser
      const an = kickAnalyser || analyser
      const arr = kickDataArray || audioDataArray
      if (!an || !arr) return 0
      
      an.getByteFrequencyData(arr)

      if (!kickEndBin) rebuildFreqBins()
      if (!kickEndBin) return 0

      // 计算 kick 频段能量（bass 已被移除）
      let energy = 0
      let count = 0
      for (let i = kickStartBin; i <= kickEndBin; i++) {
        energy += arr[i]
        count++
      }
      const avg = count > 0 ? (energy / count) : 0

      // 计算中频参考能量（用于抑制人声/氛围导致的误跳）
      let midEnergy = 0
      let midCount = 0
      for (let i = midStartBin; i <= midEndBin; i++) {
        midEnergy += arr[i]
        midCount++
      }
      const midAvg = midCount > 0 ? (midEnergy / midCount) : 0
      const kickToMidRatio = avg / (midAvg + 1)

      // 计算单帧 flux
      const fluxRaw = avg - prevEnergy
      prevEnergy = avg

      // 正向瞬态（只关心上升沿）
      const flux = avg < 8 ? 0 : Math.max(0, fluxRaw)

      // 自适应基线（上升慢、下降稍快）：平衡抑制抖动与响应速度
      const kickBaseLerp = avg > kickBaseline ? 0.03 : 0.18
      kickBaseline += (avg - kickBaseline) * kickBaseLerp
      const fluxBaseLerp = flux > fluxBaseline ? 0.06 : 0.24
      fluxBaseline += (flux - fluxBaseline) * fluxBaseLerp

      const kickExcess = Math.max(0, avg - kickBaseline)
      const fluxExcess = Math.max(0, flux - fluxBaseline)

      if (kickPeakHold > 0) kickPeakHold--

      // 静音/近静音段：进入 hard mute，避免任何轻微跳动
      const nearSilent = avg < 7 && midAvg < 9
      if (nearSilent) silentFrames++
      else silentFrames = 0
      if (!hardMute && silentFrames > 16) hardMute = true

      // 触发条件（平衡捕捉与抑制）：
      // 1) kick 绝对能量
      // 2) kick 相对中频占比（防纯人声/和弦伪触发）
      // 3) flux 相对基线超额（瞬态）
      // 4) 冷却结束
      const kickGate = Math.max(4.5, kickBaseline * 0.32)
      const fluxGate = Math.max(0.85, fluxBaseline * 1.45)
      const canTrigger = avg > 12 && kickToMidRatio > 0.78 && kickExcess > kickGate && fluxExcess > fluxGate && kickPeakHold === 0

      // 强瞬态直通：即使占比一般，只要 flux 明显爆发也认定为鼓
      const strongTransient = flux > Math.max(4.0, fluxBaseline * 2.8) && avg > 13 && kickPeakHold === 0

      if (canTrigger || strongTransient) {
        const triggerStrength = Math.min(
          1,
          (kickExcess / 22) * 0.45 + (fluxExcess / 6) * 0.55 + (strongTransient ? 0.1 : 0)
        )
        pulseEnv = Math.max(pulseEnv, Math.max(0.25, triggerStrength))
        // 4 帧冷却：在抑制误触发与捕捉密集鼓点间平衡
        kickPeakHold = 4
        hardMute = false
        silentFrames = 0
      }

      // 触发脉冲包络：有触发时抬升，无触发时中速衰减
      pulseEnv *= 0.78

      // hard mute 强制归零
      if (hardMute) pulseEnv = 0

      // 映射到 [0, 2.0]
      let out = Math.pow(Math.max(0, Math.min(1, pulseEnv)), 0.82) * 2.0

      // 超低值直接归零
      if (out < 0.018) out = 0
      return Math.min(2.0, Math.max(0, out))
    }

    // 音频分析循环 - 高频率更新
    const audioAnalysisLoop = () => {
      if (!bgRenderer || !visibled.value || document.hidden) {
        audioAnimationId = null
        return
      }

      const now = performance.now()
      if (now - lastAudioAnalysisTime >= audioAnalysisIntervalMs) {
        lastAudioAnalysisTime = now
        const lowFreqVolume = calculateLowFreqVolume()

        // 输出再做一次平滑：上升更快、下降更慢；idle 时快速归零
        if (lowFreqVolume === 0) {
          lowFreqSmoothed = lowFreqSmoothed * 0.72
        } else {
          const delta = lowFreqVolume - lowFreqSmoothed
          // 强瞬态时直接贴近目标，减少“拖沓”
          if (delta > 0.18) {
            lowFreqSmoothed = lowFreqSmoothed + delta * 0.85
          } else {
            const smoothFactor = lowFreqVolume > lowFreqSmoothed ? 0.55 : 0.18
            lowFreqSmoothed = lowFreqSmoothed + delta * smoothFactor
          }
        }
        if (lowFreqSmoothed < 0.01) lowFreqSmoothed = 0
        
        // 实时传递给AMLL
        if (bgRenderer.setLowFreqVolume) {
          bgRenderer.setLowFreqVolume(lowFreqSmoothed-4.3)
        }
      }
      
      // 使用高频率更新，确保实时性
      audioAnimationId = requestAnimationFrame(audioAnalysisLoop)
    }

    const hide = () => {
      setShowPlayerDetail(false)
    }
    
    const handleContextMenu = () => {
      if (window.performance.now() - clickTime > 400) {
        clickTime = window.performance.now()
        return
      }
      clickTime = 0
      hide()
    }

    const hideComment = () => {
      setShowPlayComment(false)
    }

    const handleAfterEnter = () => {
      if (isFullscreen.value) registerAutoHideMounse()
      visibled.value = true
      
      // 延迟初始化AMLL背景
      initTimer = setTimeout(initAMLLBackground, 500)
    }

    const handleAfterLeave = () => {
      setShowPlayLrcSelectContentLrc(false)
      hideComment(false)
      visibled.value = false
      unregisterAutoHideMounse()

      cleanupBackground()
    }

    const cleanupBackground = () => {
      if (initTimer) {
        clearTimeout(initTimer)
        initTimer = null
      }

      if (resizeObserver) {
        resizeObserver.disconnect()
        resizeObserver = null
      }

      if (audioAnimationId) {
        cancelAnimationFrame(audioAnimationId)
        audioAnimationId = null
      }

      if (bgRenderer) {
        try { bgRenderer.dispose() } catch (e) {}
        bgRenderer = null
      }

      if (bgCanvas && bgCanvas.parentNode) {
        bgCanvas.parentNode.removeChild(bgCanvas)
      }
      bgCanvas = null

      audioDataArray = null
      kickStartBin = 0
      kickEndBin = 0

      // 断开 kick 检测链路
      if (kickHighpass) {
        try { analyser.disconnect(kickHighpass) } catch (e) {}
      }
      if (silentGain) {
        try { silentGain.disconnect() } catch (e) {}
      }
      kickAnalyser = null
      kickHighpass = null
      silentGain = null
      kickDataArray = null
    }

    // 监听专辑图片变化
    watch(() => musicInfo.pic, (newPic) => {
      if (bgRenderer && newPic) {
        bgRenderer.setAlbum(newPic)
        // 封面变化时不需要重新初始化，只更新封面
      }
    })

    // 监听音频上下文变化，重新计算采样率参数
    // sampleRate 在 audioContext 生命周期内不会变，只在初始化时计算一次即可

    // 监听播放状态
    watch(visibled, (visible) => {
      if (!bgRenderer) return
      if (visible) {
        bgRenderer.resume()
        bgRenderer.setFPS(60)
        if (!audioAnimationId && analyser) audioAnalysisLoop()
      } else {
        bgRenderer.pause()
      }
    })

    const handleVisibilityChange = () => {
      if (!bgRenderer) return
      if (document.hidden) {
        try { bgRenderer.pause() } catch (e) {}
        if (audioAnimationId) {
          cancelAnimationFrame(audioAnimationId)
          audioAnimationId = null
        }
      } else if (visibled.value) {
        try { bgRenderer.resume() } catch (e) {}
        bgRenderer.setFPS(60)
        if (!audioAnimationId && analyser) audioAnalysisLoop()
      }
    }

    onMounted(() => {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    })

    onBeforeUnmount(() => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      cleanupBackground()
    })

    watch(isFullscreen, isFullscreen => {
      (isFullscreen ? registerAutoHideMounse : unregisterAutoHideMounse)()
    })

    return {
      appSetting,
      playMusicInfo,
      isShowPlayerDetail,
      isShowPlayComment,
      musicInfo,
      hide,
      handleContextMenu,
      hideComment,
      handleAfterEnter,
      handleAfterLeave,
      visibled,
      isFullscreen,
      bgContainer,
      fullscreenExit() {
        void setFullScreen(false).then((fullscreen) => {
          isFullscreen.value = fullscreen
        })
      },
      min() {
        minWindow()
      },
      max() {
        maxWindow()
      },
      close() {
        closeWindow()
      },
    }
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

@control-btn-width: @height-toolbar * .26;

.container {
  position: absolute;
  display: flex;
  flex-flow: column nowrap;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  background-color: var(--color-content-background);
  z-index: 10;
  // -webkit-app-region: drag;
  overflow: hidden;
  border-radius: @radius-border;
  color: var(--color-font);
  // border-left: 12px solid var(--color-primary-alpha-900);
  -webkit-app-region: no-drag;
  contain: strict;

  box-sizing: border-box;

  * {
    box-sizing: border-box;
  }
}
.bg {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  background: var(--background-image) var(--background-image-position) no-repeat;
  background-size: var(--background-image-size);
  // background-size: 110% 110%;
  // filter: blur(60px);
  opacity: 1;
  z-index: -1;
  pointer-events: none;
  overflow: hidden;

  &:before {
    content: '';
    display: block;
    width: 100%;
    height: 100%;
    background-color: var(--color-app-background);
    z-index: -1;
    opacity: 0; // 大幅降低透明度
  }
  &:after {
    position: absolute;
    left: 0;
    top: 0;
    content: '';
    display: block;
    width: 100%;
    height: 100%;
    /* 使用 2% 不透明度的超轻量 SVG 噪点背景进行 Dithering（图像抖动），从物理上完美平滑色阶，消除大面积模糊带来的色彩断带 */
    background: rgba(0, 0, 0, 0.16) url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.02'/%3E%3C/svg%3E");
    /* 将模糊半径调整至 80px，既能保证色彩完全柔和混合，又能大幅提升显卡渲染精度与帧率，彻底避免 300px 极限模糊导致的浏览器像素精度断带 */
    backdrop-filter: blur(300px) brightness(1.2);
    -webkit-backdrop-filter: blur(300px) brightness(0.9);
    z-index: 2;
  }
}
// .bg2 {
//   position: absolute;
//   width: 100%;
//   height: 100%;
//   top: 0;
//   left: 0;
//   z-index: -1;
//   background-color: rgba(255, 255, 255, .8);
// }

.main {
  flex: auto;
  min-height: 0;
  overflow: hidden;
  display: flex;
  align-items: stretch;
  margin: 0 auto;
  max-width: 1440px;
  padding: 0 56px;
  gap: 56px;
  position: relative;

  :global {
    .left {
      flex: 0 0 380px;
      min-width: 380px;
    }
  }

  &.showComment {
    :global {
      .left {
        flex-basis: 300px;
        .description p {
          font-size: 12px;
        }
      }
      .comment {
        opacity: 1;
        transform: scaleX(1);
      }
    }

    .lyricPane {
      flex-basis: 520px;
    }

    :global {
      .right {
        .lyricSelectContent {
          font-size: 14px;
        }
      }
    }
  }
}

.lyricPane {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-flow: column nowrap;
  height: 100%;
  overflow: hidden;
  min-width: 560px;
}

.lyricPane :global(.right) {
  flex: 1 1 auto !important;
  min-width: 0 !important;
  min-height: 0 !important;
  height: 100% !important;
  width: 100% !important;
  flex-basis: auto !important;
}
.left {
  flex: 0 0 380px;
  display: flex;
  flex-flow: column nowrap;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 48px 0 32px;
  overflow: hidden;
  transition: flex-basis @transition-normal;
  position: relative;
}

.info {
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
  align-items: flex-start;
  width: 100%;
  max-width: 380px;
  min-height: 0;
  position: relative;
  z-index: 3;
  padding: 0;
}
.img {
  width: 100%;
  aspect-ratio: 1 / 1;
  height: auto;
  border-radius: 26px;
  opacity: 1;
  object-fit: cover;
  display: block;
  margin: 0;
}
.description {
  width: 100%;
  max-width: 380px;
  margin-top: 18px;
  padding-bottom: 0;
  min-height: 0;
  text-align: left;
  
  /* 歌曲名（第一行） */
  p:first-of-type {
    color: #ffffff;  /* 纯白 */
    font-weight: bold;  /* 加粗 */
    font-size: 20px;  /* 最大字号 */
    opacity: 1;
    margin-bottom: 10px;
  }
  
  /* 第二行 */
  p:nth-of-type(2) {
    font-size: 15px;  /* 稍微小一点 */
    color: #ffffffa3;   /* 80%不透明度 */
    opacity: 0.6;
    margin-bottom: 6px;
  }
  
  /* 第三行 */
  p:nth-of-type(3) {
    font-size: 14px;  /* 再小一点 */
    color: #ffffffa3;   /* 60%不透明度 */
    opacity: 0.6;
    margin-bottom: 4px;
  }
}

:global(.fullscreen) {
  .main {
    padding: 0 56px;
    gap: 100px;
    max-width: 1760px;
    overflow: visible;

    :global {
      .left {
        flex: 0 0 600px;
        min-width: 600px;
      }
    }
  }

  :global {
    .left {
      justify-content: center;
      padding: 0;
    }
  }

  .info {
    max-width: 600px;
  }

  .lyricPane {
    min-width: 1000px;
  }

  .img {
    border-radius: 32px;
  }

  .description {
    max-width: 600px;

    p:first-of-type {
      font-size: 20px;
    }

    p:nth-of-type(2) {
      font-size: 15px;
    }

    p:nth-of-type(3) {
      font-size: 14px;
    }
  }
}


.comment {
  position: absolute;
  right: 0;
  top: 0;
  width: 50%;
  height: 100%;
  opacity: 1;
  margin-left: 10px;
  transform: scaleX(0);
}


</style>
