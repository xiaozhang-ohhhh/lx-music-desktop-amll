import { ref, onMounted, onBeforeUnmount, watch } from '@common/utils/vueTools'
import { throttle, formatPlayTime2 } from '@common/utils/common'
import { play } from '@renderer/core/player/action'

export default ({ isPlay, lyric, playProgress, isShowLyricProgressSetting, offset }) => {
  const dom_lyric = ref(null)
  const dom_skip_line = ref(null)
  const isMsDown = ref(false)
  const isStopScroll = ref(false)
  const timeStr = ref('--/--')

  let time = -1
  let dom_pre_line = null
  let point = { x: null, y: null }

  const handleSkipPlay = () => {
    if (time == -1) return
    handleSkipMouseLeave()
    isStopScroll.value = false
    window.app_event.setProgress(time)
    if (!isPlay.value) play()
  }

  const handleSkipMouseEnter = () => {}
  const handleSkipMouseLeave = () => {}

  const throttleSetTime = throttle(() => {
    if (!dom_skip_line.value) return
    const rect = dom_skip_line.value.getBoundingClientRect()
    point.x = rect.x
    point.y = rect.y
    let dom = document.elementFromPoint(point.x, point.y)
    if (dom_pre_line === dom) return
    
    // AMLL 的歌词行结构不同，需要调整选择逻辑
    if (dom?.classList?.contains('amll-lyric-line')) {
      // 尝试从 AMLL 行获取时间
      time = -1
      timeStr.value = '--:--'
    } else {
      time = -1
      timeStr.value = '--:--'
    }
    dom_pre_line = dom
  })

  const setTime = () => {
    if (isShowLyricProgressSetting.value) throttleSetTime()
  }

  // AMLL 自己处理滚动，这个函数可以简化
  const handleScrollLrc = () => {}

  const handleLyricDown = (y) => {
    isMsDown.value = true
  }

  const handleLyricMouseDown = event => {
    handleLyricDown(event.clientY)
  }

  const handleLyricTouchStart = event => {
    if (event.changedTouches.length) {
      const touch = event.changedTouches[0]
      handleLyricDown(touch.clientY)
    }
  }

  const handleMouseMsUp = () => {
    isMsDown.value = false
  }

  const handleMove = () => {
    // AMLL 自己处理拖动，这里可以留空或添加自定义逻辑
  }

  const handleMouseMsMove = event => {
    handleMove(event.clientY)
  }

  const handleTouchMove = (e) => {
    if (e.changedTouches.length) {
      const touch = e.changedTouches[0]
      handleMove(touch.clientY)
    }
  }

  const handleWheel = (event) => {
    // AMLL 自己处理滚轮，这里可以留空
    event.preventDefault()
  }

  onMounted(() => {
    document.addEventListener('mousemove', handleMouseMsMove)
    document.addEventListener('mouseup', handleMouseMsUp)
    document.addEventListener('touchmove', handleTouchMove)
    document.addEventListener('touchend', handleMouseMsUp)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('mousemove', handleMouseMsMove)
    document.removeEventListener('mouseup', handleMouseMsUp)
    document.removeEventListener('touchmove', handleTouchMove)
    document.removeEventListener('touchend', handleMouseMsUp)
  })

  return {
    dom_lyric,
    dom_skip_line,
    isStopScroll,
    isMsDown,
    timeStr,
    handleLyricMouseDown,
    handleLyricTouchStart,
    handleWheel,
    handleSkipPlay,
    handleSkipMouseEnter,
    handleSkipMouseLeave,
    handleScrollLrc,
  }
}