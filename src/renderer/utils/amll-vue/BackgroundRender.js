import { defineComponent, ref, onMounted, onUnmounted, watch, computed, h } from 'vue'
import { SimpleBackgroundRenderer } from '../amll-bg-render.js'

export default defineComponent({
  name: 'BackgroundRender',
  props: {
    album: {
      type: [String, Object],
      required: false
    },
    albumIsVideo: {
      type: Boolean,
      required: false
    },
    fps: {
      type: Number,
      required: false,
      default: 30
    },
    playing: {
      type: Boolean,
      required: false,
      default: true
    },
    flowSpeed: {
      type: Number,
      required: false,
      default: 2
    },
    hasLyric: {
      type: Boolean,
      required: false,
      default: true
    },
    lowFreqVolume: {
      type: Number,
      required: false
    },
    renderScale: {
      type: Number,
      required: false,
      default: 0.5
    }
  },
  emits: [],
  setup(props, { expose }) {
    const canvasRef = ref(null)
    const wrapperEl = ref(null)
    let bgRender = null

    // 初始化背景渲染器
    const initRenderer = () => {
      if (!canvasRef.value) return
      
      try {
        bgRender = new SimpleBackgroundRenderer(canvasRef.value)
        
        // 设置属性
        bgRender.setRenderScale(props.renderScale)
        bgRender.setFlowSpeed(props.flowSpeed)
        bgRender.setFPS(props.fps)
        bgRender.setHasLyric(props.hasLyric)
        
        if (props.lowFreqVolume !== undefined) {
          bgRender.setLowFreqVolume(props.lowFreqVolume)
        }
        
        // 设置专辑图片
        if (props.album) {
          bgRender.setAlbum(props.album, props.albumIsVideo)
        }
        
        // 设置播放状态
        if (props.playing) {
          bgRender.resume()
        } else {
          bgRender.pause()
        }
        
        console.log('背景渲染器初始化成功')
      } catch (error) {
        console.error('背景渲染器初始化失败:', error)
      }
    }

    // 监听属性变化
    watch(() => props.album, (newAlbum) => {
      if (bgRender && newAlbum) {
        bgRender.setAlbum(newAlbum, props.albumIsVideo)
      }
    })

    watch(() => props.playing, (playing) => {
      if (bgRender) {
        if (playing) {
          bgRender.resume()
        } else {
          bgRender.pause()
        }
      }
    })

    watch(() => props.fps, (fps) => {
      if (bgRender && fps !== undefined) {
        bgRender.setFPS(fps)
      }
    })

    watch(() => props.flowSpeed, (speed) => {
      if (bgRender && speed !== undefined) {
        bgRender.setFlowSpeed(speed)
      }
    })

    watch(() => props.renderScale, (scale) => {
      if (bgRender && scale !== undefined) {
        bgRender.setRenderScale(scale)
      }
    })

    watch(() => props.hasLyric, (hasLyric) => {
      if (bgRender && hasLyric !== undefined) {
        bgRender.setHasLyric(hasLyric)
      }
    })

    watch(() => props.lowFreqVolume, (volume) => {
      if (bgRender && volume !== undefined) {
        bgRender.setLowFreqVolume(volume)
      }
    })

    onMounted(() => {
      initRenderer()
    })

    onUnmounted(() => {
      if (bgRender) {
        bgRender.dispose()
        bgRender = null
      }
    })

    expose({
      bgRender: computed(() => bgRender),
      wrapperEl
    })

    return {
      canvasRef,
      wrapperEl
    }
  },
  render() {
    return h('div', {
      ref: 'wrapperEl',
      style: {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: '-1'
      }
    }, [
      h('canvas', {
        ref: 'canvasRef',
        style: {
          width: '100%',
          height: '100%',
          display: 'block'
        }
      })
    ])
  }
})
