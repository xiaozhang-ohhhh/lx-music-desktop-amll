// 简化版AMLL背景渲染器 - JavaScript版本
class SimpleBackgroundRenderer {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.isPlaying = false
    this.albumImage = null
    this.animationId = null
    this.time = 0
    
    // 渲染设置
    this.renderScale = 1.5
    this.flowSpeed = 0.5
    this.staticMode = false
    this.fps = 60
    this.lastFrameTime = 0
    
    this.init()
  }
  
  init() {
    this.resize()
    window.addEventListener('resize', () => this.resize())
  }
  
  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect()
    this.canvas.width = rect.width * this.renderScale
    this.canvas.height = rect.height * this.renderScale
    this.canvas.style.width = rect.width + 'px'
    this.canvas.style.height = rect.height + 'px'
  }
  
  setRenderScale(scale) {
    this.renderScale = scale
    this.resize()
  }
  
  setFlowSpeed(speed) {
    this.flowSpeed = speed
  }
  
  setStaticMode(enable) {
    this.staticMode = enable
  }
  
  setFPS(fps) {
    this.fps = fps
  }
  
  pause() {
    this.isPlaying = false
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }
  
  resume() {
    this.isPlaying = true
    this.render()
  }
  
  setLowFreqVolume(volume) {
    // 简化版本，暂不实现
  }
  
  setHasLyric(hasLyric) {
    // 简化版本，暂不实现
  }
  
  async setAlbum(source) {
    try {
      if (typeof source === 'string') {
        this.albumImage = new Image()
        this.albumImage.crossOrigin = 'anonymous'
        await new Promise((resolve, reject) => {
          this.albumImage.onload = resolve
          this.albumImage.onerror = reject
          this.albumImage.src = source
        })
      } else if (source instanceof HTMLImageElement) {
        this.albumImage = source
      }
      
      console.log('专辑图片设置成功:', source)
    } catch (error) {
      console.error('专辑图片设置失败:', error)
    }
  }
  
  render() {
    if (!this.isPlaying) return
    
    const now = performance.now()
    const deltaTime = now - this.lastFrameTime
    const targetFrameTime = 1000 / this.fps
    
    if (deltaTime >= targetFrameTime) {
      this.time += deltaTime * 0.001 * this.flowSpeed
      this.draw()
      this.lastFrameTime = now
    }
    
    this.animationId = requestAnimationFrame(() => this.render())
  }
  
  draw() {
    const { width, height } = this.canvas
    const ctx = this.ctx
    
    // 清空画布
    ctx.clearRect(0, 0, width, height)
    
    if (!this.albumImage) {
      // 如果没有图片，绘制渐变背景
      const gradient = ctx.createLinearGradient(0, 0, width, height)
      gradient.addColorStop(0, 'rgba(100, 100, 255, 0.3)')
      gradient.addColorStop(0.5, 'rgba(255, 100, 200, 0.3)')
      gradient.addColorStop(1, 'rgba(100, 255, 200, 0.3)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)
      return
    }
    
    // 绘制模糊的专辑图片背景
    ctx.save()
    
    // 应用模糊效果
    ctx.filter = 'blur(80px) brightness(0.7)'
    
    // 计算图片绘制位置和大小
    const imgAspect = this.albumImage.width / this.albumImage.height
    const canvasAspect = width / height
    
    let drawWidth, drawHeight, drawX, drawY
    
    if (imgAspect > canvasAspect) {
      drawHeight = height
      drawWidth = drawHeight * imgAspect
      drawX = (width - drawWidth) / 2
      drawY = 0
    } else {
      drawWidth = width
      drawHeight = drawWidth / imgAspect
      drawX = 0
      drawY = (height - drawHeight) / 2
    }
    
    // 添加动态效果
    if (!this.staticMode) {
      const offsetX = Math.sin(this.time) * 20
      const offsetY = Math.cos(this.time * 0.8) * 20
      drawX += offsetX
      drawY += offsetY
    }
    
    ctx.drawImage(this.albumImage, drawX, drawY, drawWidth, drawHeight)
    ctx.restore()
    
    // 添加渐变叠加层
    const overlay = ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) / 2
    )
    overlay.addColorStop(0, 'rgba(255, 255, 255, 0.1)')
    overlay.addColorStop(0.5, 'rgba(0, 0, 0, 0.2)')
    overlay.addColorStop(1, 'rgba(0, 0, 0, 0.4)')
    
    ctx.fillStyle = overlay
    ctx.fillRect(0, 0, width, height)
  }
  
  dispose() {
    this.pause()
    window.removeEventListener('resize', () => this.resize())
    this.albumImage = null
  }
}

class BackgroundRender {
  constructor(renderer, canvas) {
    this.renderer = renderer
    this.element = canvas
    
    // 设置canvas样式
    canvas.style.pointerEvents = 'none'
    canvas.style.zIndex = '-1'
    canvas.style.contain = 'strict'
    canvas.style.position = 'absolute'
    canvas.style.top = '0'
    canvas.style.left = '0'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
  }
  
  static new(RendererClass) {
    const canvas = document.createElement('canvas')
    const renderer = new RendererClass(canvas)
    return new BackgroundRender(renderer, canvas)
  }
  
  setRenderScale(scale) {
    this.renderer.setRenderScale(scale)
  }
  
  setFlowSpeed(speed) {
    this.renderer.setFlowSpeed(speed)
  }
  
  setStaticMode(enable) {
    this.renderer.setStaticMode(enable)
  }
  
  setFPS(fps) {
    this.renderer.setFPS(fps)
  }
  
  pause() {
    this.renderer.pause()
  }
  
  resume() {
    this.renderer.resume()
  }
  
  setLowFreqVolume(volume) {
    this.renderer.setLowFreqVolume(volume)
  }
  
  setHasLyric(hasLyric) {
    this.renderer.setHasLyric(hasLyric)
  }
  
  setAlbum(source, isVideo) {
    return this.renderer.setAlbum(source)
  }
  
  getElement() {
    return this.element
  }
  
  dispose() {
    this.renderer.dispose()
    this.element.remove()
  }
}

// 导出
export { BackgroundRender, SimpleBackgroundRenderer }
