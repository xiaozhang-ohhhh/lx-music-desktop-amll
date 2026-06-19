/**
 * 歌词解析工具
 * 重写版本：简洁高效的空格处理
 */

// 判断字符是否为中文（包含中文标点符号）
const isChinese = (char) => /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(char)

// 解析时间标签
const parseTimeTag = (timeTag) => {
  // 支持多种时间格式
  let match = timeTag.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\]/)
  if (!match) match = timeTag.match(/\[(\d{2}):(\d{2})\]/)
  if (!match) match = timeTag.match(/\[(\d+):(\d{2})\.(\d{2,3})\]/)
  if (!match) match = timeTag.match(/\[(\d+):(\d+)\]/)
  if (!match) return 0
  
  const minutes = parseInt(match[1])
  const seconds = parseInt(match[2])
  const milliseconds = match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3)) : 0
  
  return (minutes * 60 + seconds) * 1000 + milliseconds
}

// 构建翻译歌词索引（支持 [offset:]、一行多个时间标签、重复时间戳）
const buildTlrcIndex = (tlrcText) => {
  const index = {
    offsetMs: 0,
    map: new Map(), // timeMs -> string[]
    times: [],
  }

  if (!tlrcText) return index

  const offsetMatch = tlrcText.match(/^\[offset:([+-]?\d+)\]$/m)
  if (offsetMatch) index.offsetMs = parseInt(offsetMatch[1]) || 0

  const lines = tlrcText.split('\n')
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith('[offset:')) continue

    const timeTags = line.match(/\[[\d:.]+\]/g)
    if (!timeTags || !timeTags.length) continue

    const content = line.replace(/\[[\d:.]+\]/g, '').trim()
    if (!content || content === '//') continue

    for (const tag of timeTags) {
      const t = parseTimeTag(tag) + index.offsetMs
      if (!index.map.has(t)) index.map.set(t, [])
      index.map.get(t).push(content)
    }
  }

  index.times = Array.from(index.map.keys()).sort((a, b) => a - b)
  return index
}

// 查找翻译：优先精确命中，其次在容差内找最近
const findTranslation = (tlrcIndex, timeMs, toleranceMs = 800) => {
  if (!tlrcIndex || !tlrcIndex.times || !tlrcIndex.times.length) return ''

  const exact = tlrcIndex.map.get(timeMs)
  if (exact && exact.length) return exact[0]

  const times = tlrcIndex.times
  // 二分找最近
  let lo = 0
  let hi = times.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const v = times[mid]
    if (v === timeMs) {
      const arr = tlrcIndex.map.get(v)
      return arr && arr.length ? arr[0] : ''
    }
    if (v < timeMs) lo = mid + 1
    else hi = mid - 1
  }

  const candidates = []
  if (hi >= 0) candidates.push(times[hi])
  if (lo < times.length) candidates.push(times[lo])
  if (!candidates.length) return ''

  let bestTime = null
  let bestDiff = Infinity
  for (const t of candidates) {
    const d = Math.abs(t - timeMs)
    if (d < bestDiff) {
      bestDiff = d
      bestTime = t
    }
  }

  if (bestTime != null && bestDiff <= toleranceMs) {
    const arr = tlrcIndex.map.get(bestTime)
    return arr && arr.length ? arr[0] : ''
  }

  return ''
}

const isShortInterjectionLine = (line) => {
  if (!line) return false
  const text = String(line).replace(/[\s\u200b\uFEFF]/g, '')
  if (!text) return false
  if (text.length <= 2) return true
  // 语气词/拟声/口头词倾向：避免用大容差去吃掉不相干的翻译
  if (/^[嗯恩哦噢啊呀哈嘿哎唉诶呃哼欸…]+$/u.test(text)) return true
  return false
}

// 带状态的翻译匹配：
// - 同一条翻译时间戳尽量只匹配一次（避免多句原文重复命中同一条翻译）
// - 对短语气词行使用更严格的容差，降低误匹配
const findTranslationForLine = (tlrcIndex, timeMs, lineText, state, toleranceMs = 800) => {
  if (!tlrcIndex || !tlrcIndex.times || !tlrcIndex.times.length) return ''

  const strictTolerance = isShortInterjectionLine(lineText) ? 200 : toleranceMs

  // 精确命中允许重复（因为精确对齐通常是正确的）
  const exact = tlrcIndex.map.get(timeMs)
  if (exact && exact.length) return exact[0]

  // 对于逐字/TTML 等时间戳通常完全一致的场景，只做精确匹配即可
  if (state?.exactOnly) return ''

  const usedTimes = state?.usedTimes
  const times = tlrcIndex.times

  // 二分找插入点
  let lo = 0
  let hi = times.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const v = times[mid]
    if (v < timeMs) lo = mid + 1
    else hi = mid - 1
  }

  // 以时间接近度排序候选，优先选择未使用过的时间
  const candidates = []
  for (let i = hi; i >= 0 && candidates.length < 6; i--) candidates.push(times[i])
  for (let i = lo; i < times.length && candidates.length < 12; i++) candidates.push(times[i])

  const uniq = Array.from(new Set(candidates))
  uniq.sort((a, b) => Math.abs(a - timeMs) - Math.abs(b - timeMs))

  let bestTime = null
  let bestDiff = Infinity
  for (const t of uniq) {
    const d = Math.abs(t - timeMs)
    if (d > strictTolerance) continue
    if (usedTimes && usedTimes.has(t)) continue
    bestTime = t
    bestDiff = d
    break
  }

  // 如果都用过了，允许在严格容差内复用“最接近”的（兜底，避免完全没翻译）
  if (bestTime == null) {
    for (const t of uniq) {
      const d = Math.abs(t - timeMs)
      if (d > strictTolerance) continue
      bestTime = t
      bestDiff = d
      break
    }
  }

  if (bestTime != null && bestDiff <= strictTolerance) {
    if (usedTimes) usedTimes.add(bestTime)
    const arr = tlrcIndex.map.get(bestTime)
    return arr && arr.length ? arr[0] : ''
  }

  return ''
}

// 解析 TTML 时间格式 (00:00.000)
const parseTtmlTime = (timeStr) => {
  const match = timeStr.match(/(\d{2}):(\d{2})\.(\d{3})/)
  if (!match) return 0
  
  const minutes = parseInt(match[1])
  const seconds = parseInt(match[2])
  const milliseconds = parseInt(match[3])
  
  return (minutes * 60 + seconds) * 1000 + milliseconds
}

// 解析 ESLRC 时间格式 (支持毫秒和微秒)
const parseEslrcTime = (timeStr) => {
  // ESLRC 支持多种时间格式：
  // [00:00.000] 标准毫秒
  // [00:00.000000] 微秒精度
  // [00:00:00.000] 带小时
  const hourMatch = timeStr.match(/\[(\d{1,2}):(\d{2}):(\d{2})\.(\d{1,6})\]/)
  if (hourMatch) {
    const hours = parseInt(hourMatch[1])
    const minutes = parseInt(hourMatch[2])
    const seconds = parseInt(hourMatch[3])
    const milliseconds = parseInt(hourMatch[4].padEnd(6, '0').slice(0, 3))
    return ((hours * 60 + minutes) * 60 + seconds) * 1000 + milliseconds
  }

  const normalMatch = timeStr.match(/\[(\d{1,2}):(\d{2})\.(\d{1,6})\]/)
  if (normalMatch) {
    const minutes = parseInt(normalMatch[1])
    const seconds = parseInt(normalMatch[2])
    const milliseconds = parseInt(normalMatch[3].padEnd(6, '0').slice(0, 3))
    return (minutes * 60 + seconds) * 1000 + milliseconds
  }

  const noMsMatch = timeStr.match(/\[(\d{1,2}):(\d{2})\]/)
  if (noMsMatch) {
    const minutes = parseInt(noMsMatch[1])
    const seconds = parseInt(noMsMatch[2])
    return (minutes * 60 + seconds) * 1000
  }

  return 0
}

// 解析 ESLRC 歌词
export const parseEslrcLyrics = (eslrcText, tlrcText) => {
  if (!eslrcText) return []
  
  const lines = eslrcText.split('\n').filter(line => line.trim())
  const lyrics = []

  const tlrcIndex = buildTlrcIndex(tlrcText)
  const tlrcState = { usedTimes: new Set(), exactOnly: true }
  
  // ESLRC 元数据
  const metadata = {}
  
  lines.forEach((line, index) => {
    line = line.trim()
    
    // 解析元数据 (以 [key:value] 格式)
    const metaMatch = line.match(/^\[(\w+):(.+)\]$/)
    if (metaMatch) {
      metadata[metaMatch[1]] = metaMatch[2]
      return
    }
    
    // 解析时间标签和歌词
    // 支持多种时间格式：
    // [00:00.000]<word1,time1><word2,time2>歌词内容
    // [00:00.000]歌词内容
    // [00:00.000][00:05.000]歌词内容 (时间范围)
    const timeMatch = line.match(/^(\[[\d:.]+\])(.*)$/)
    if (!timeMatch) return
    
    const timeTags = timeMatch[1]
    let content = timeMatch[2].replace(/^[ \t]+/, '').replace(/[ \t]+$/, '')
    
    // 解析多个时间标签 (支持时间范围)
    const timeMatches = timeTags.match(/\[[\d:.]+\]/g)
    if (!timeMatches) return
    
    const lineStartTime = parseEslrcTime(timeMatches[0])
    const endTime = timeMatches[1] ? parseEslrcTime(timeMatches[1]) : startTime + 3000 // 默认3秒
    
    // 检查内容是否为空（包括纯空格）
    const cleanContent = content.replace(/^[ \t]+/, '').replace(/[ \t]+$/, '')
    if (!cleanContent) return
    
    // 检查是否是逐字歌词 (包含 <word,time> 标记)
    const wordRegex = /<([^,]+),(\d+)>/g
    const words = []
    let wordMatch
    let lastTime = startTime
    
    // 先提取所有逐字标记
    const wordTags = []
    while ((wordMatch = wordRegex.exec(content)) !== null) {
      wordTags.push({
        text: wordMatch[1],
        time: parseInt(wordMatch[2])
      })
    }
    
    if (wordTags.length > 0) {
      // 处理逐字歌词
      wordTags.forEach((tag, i) => {
        const wordStartTime = startTime + tag.time
        const nextTime = i < wordTags.length - 1 ? wordTags[i + 1].time : endTime - startTime
        const duration = nextTime - tag.time
        
        words.push({
          text: tag.text,
          startTime: wordStartTime,
          duration: Math.max(duration, 1)
        })
      })
      
      // 移除逐字标记，获取纯文本
      content = content.replace(/<[^>]+>/g, '')
    } else {
      // 普通歌词，按字符分割
      const chars = cleanContent.split('')
      const charDuration = (endTime - startTime) / chars.length
      
      chars.forEach((char, i) => {
        words.push({
          text: char,
          startTime: startTime + (i * charDuration),
          duration: charDuration
        })
      })
    }
    
    // 处理翻译歌词
    const translationText = findTranslationForLine(tlrcIndex, startTime, cleanContent, tlrcState)
    
    lyrics.push({
      line: cleanContent,
      words,
      startTime,
      endTime,
      translatedLyric: translationText,
      romanLyric: '',
      isBG: false,
      isDuet: false
    })
  })
  
  return lyrics.filter(l => l.words.length > 0)
}

// 修正后的 parseTtmlLyrics
export const parseTtmlLyrics = (ttmlText, tlrcText) => {
  if (!ttmlText) return []
  
  const lyrics = []
  const tlrcIndex = buildTlrcIndex(tlrcText)
  const tlrcState = { usedTimes: new Set(), exactOnly: true }
  
  // 直接提取所有 <p> 标签
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi
  let pMatch
  
  while ((pMatch = pRegex.exec(ttmlText)) !== null) {
    const pTag = pMatch[0]
    const pContent = pMatch[1]
    
    // 提取 begin 和 end 属性
    const beginMatch = pTag.match(/begin=["']([^"']+)["']/i)
    const endMatch = pTag.match(/end=["']([^"']+)["']/i)
    
    if (!beginMatch) continue
    
    const lineStartTime = parseTtmlTime(beginMatch[1])
    const lineEndTime = endMatch ? parseTtmlTime(endMatch[1]) : lineStartTime + 3000
    
    // 提取该 <p> 内的所有 <span> 标签
    const spans = []
    const spanRegex = /<span[^>]*>([\s\S]*?)<\/span>/gi
    let spanMatch
    
    while ((spanMatch = spanRegex.exec(pContent)) !== null) {
      spans.push({
        fullTag: spanMatch[0],
        text: spanMatch[1].trim()
      })
    }
    
    const words = []
    
    if (spans.length > 0) {
      // 有 <span> 标签，解析每个 span
      spans.forEach(span => {
        const spanBeginMatch = span.fullTag.match(/begin=["']([^"']+)["']/i)
        const spanEndMatch = span.fullTag.match(/end=["']([^"']+)["']/i)
        const text = span.text
        
        if (!text) return
        
        const wordStartTime = spanBeginMatch ? parseTtmlTime(spanBeginMatch[1]) : lineStartTime
        const wordEndTime = spanEndMatch ? parseTtmlTime(spanEndMatch[1]) : wordStartTime + 100
        
        words.push({
          word: text,  // ✅ 改为 word，与其他函数一致
          startTime: wordStartTime,
          endTime: wordEndTime  // ✅ 改为 endTime，与其他函数一致
        })
      })
    } else {
      // 没有 <span>，直接使用 <p> 内的文本内容
      let text = pContent
        .replace(/<[^>]+>/g, '')
        .replace(/\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/g, '')
        .trim()
      
      if (text) {
        words.push({
          word: text,  // ✅ 改为 word
          startTime: lineStartTime,
          endTime: lineEndTime  // ✅ 使用整行的结束时间
        })
      }
    }
    
    if (words.length > 0) {
      const lineText = words.map(w => w.word).join('')  // ✅ 使用 word
      const translationText = findTranslationForLine(tlrcIndex, lineStartTime, lineText, tlrcState)
      
      lyrics.push({
        line: lineText,
        words: words,
        startTime: lineStartTime,
        endTime: lineEndTime,
        translatedLyric: translationText,
        romanLyric: '',
        isBG: false,
        isDuet: false
      })
    }
  }
  
  return lyrics
}


// 解析LRC歌词
export const parseLRCLyrics = (lrcText, tlrcText) => {
  const lines = lrcText.split('\n').filter(line => line.trim())
  
  // 先解析所有歌词行，获取时间信息
  const parsedLines = []
  lines.forEach((line, index) => {
    // 支持多种时间格式
    let timeMatch = line.match(/^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)$/)
    if (!timeMatch) timeMatch = line.match(/^\[(\d{2}):(\d{2})\](.*)$/)
    if (!timeMatch) timeMatch = line.match(/^\[(\d+):(\d{2})\.(\d{2,3})\](.*)$/)
    if (!timeMatch) timeMatch = line.match(/^\[(\d+):(\d+)\](.*)$/)
    if (!timeMatch) return
    
    const lineStartTime = parseTimeTag(`[${timeMatch[1]}:${timeMatch[2]}.${timeMatch[3] || '00'}]`)
    const content = timeMatch[4].replace(/^[ \t]+/, '').replace(/[ \t]+$/, '')
    
    // 检查内容是否为空
    if (!content) return
    
    // 调试：检查LRC歌词中是否包含中文冒号
    if (content.includes('：')) {
      console.log('LRC发现中文冒号:', content)
    }
    
    parsedLines.push({
      startTime: lineStartTime,
      content: content,
      originalIndex: index
    })
  })
  
  // 按开始时间排序
  parsedLines.sort((a, b) => a.startTime - b.startTime)
  
  // 处理翻译歌词
  const tlrcIndex = buildTlrcIndex(tlrcText)
  const tlrcState = { usedTimes: new Set() }
  
  // 构建最终歌词数据，设置结束时间为下一句开始时间
  return parsedLines.map((line, index) => {
    // 结束时间 = 下一句开始时间，如果没有下一句则为开始时间+3秒
    const endTime = index < parsedLines.length - 1 ? parsedLines[index + 1].startTime : line.startTime + 3000
    
    // 查找翻译歌词
    const translationText = findTranslationForLine(tlrcIndex, line.startTime, line.content, tlrcState)
    
    return {
      startTime: line.startTime,
      endTime: endTime,
      words: [{
        word: line.content,
        startTime: line.startTime,
        endTime: endTime
      }],
      translatedLyric: translationText,
      romanLyric: '',
      isBG: false,
      isDuet: false
    }
  })
}

// 解析逐字歌词 - 重写版本
export const parseWordLyrics = (lxlrc, tlrcText) => {
  const lines = lxlrc.split('\n').filter(line => line.trim())

  const tlrcIndex = buildTlrcIndex(tlrcText)
  const tlrcState = { usedTimes: new Set(), exactOnly: true }
  
  return lines.map((line, index) => {
    // 支持多种时间格式
    let timeMatch = line.match(/^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)$/)
    if (!timeMatch) timeMatch = line.match(/^\[(\d{2}):(\d{2})\](.*)$/)
    if (!timeMatch) timeMatch = line.match(/^\[(\d+):(\d{2})\.(\d{2,3})\](.*)$/)
    if (!timeMatch) timeMatch = line.match(/^\[(\d+):(\d+)\](.*)$/)
    if (!timeMatch) return null
    
    const lineStartTime = parseTimeTag(`[${timeMatch[1]}:${timeMatch[2]}.${timeMatch[3] || '00'}]`)
    let content = timeMatch[4].replace(/^[ \t]+/, '').replace(/[ \t]+$/, '')
    
    // 检查内容是否为空
    if (!content) return null
    
    // 处理翻译歌词：根据时间匹配对应的翻译
    const translationText = findTranslationForLine(tlrcIndex, lineStartTime, content, tlrcState)
    
    // 解析逐字格式：保持每个时间戳后的文本原样透传
    const words = []
    const wordRegex = /<(\d+),(\d+)>([^<]*)/g
    let match

    while ((match = wordRegex.exec(content)) !== null) {
      const wordOffset = parseInt(match[1])
      const wordDuration = parseInt(match[2])
      const wordText = match[3]

      if (!wordText || wordText.length === 0) continue

      const startTime = lineStartTime + wordOffset
      const endTime = startTime + Math.max(wordDuration, 1)

      words.push({
        word: wordText,
        startTime,
        endTime,
      })
    }

    // 没有逐字标记时，退化为整行
    if (!words.length) {
      const text = content.replace(/<(\d+),(\d+)>/g, '')
      if (!text) return null
      words.push({
        word: text,
        startTime: lineStartTime,
        endTime: lineStartTime + 3000,
      })
    }

    const endTime = Math.max(...words.map(w => w.endTime))

    return {
      startTime: lineStartTime,
      endTime,
      words,
      translatedLyric: translationText,
      romanLyric: '',
      isBG: false,
      isDuet: false,
    }
  }).filter(line => line !== null)
}

export const parseLyrics = (lyricText, lyricType, tlrcText) => {
  const __DEBUG_PARSE_LYRICS__ = false
  if (__DEBUG_PARSE_LYRICS__) {
    console.log('===== parseLyrics 开始 =====')
    console.log('lyricType:', lyricType)
    console.log('tlrcText 长度:', tlrcText?.length || 0)
    console.log('lyricText 长度:', lyricText?.length || 0)
  }
  if (__DEBUG_PARSE_LYRICS__) console.log('lyricText 前200字符:', lyricText?.substring(0, 200))
  
  if (!lyricText) {
    if (__DEBUG_PARSE_LYRICS__) console.log('lyricText 为空，返回 []')
    return []
  }
  
  try {
    // 检查是否包含 <p 标签
    const hasPTag = lyricText.includes('<p ') || lyricText.includes('<p>')
    
    if (hasPTag) {
      if (__DEBUG_PARSE_LYRICS__) console.log('检测到 <p 标签，使用 TTML 解析器')
      const result = parseTtmlLyrics(lyricText, tlrcText)
      if (__DEBUG_PARSE_LYRICS__) console.log('TTML 解析结果行数:', result.length)
      if (__DEBUG_PARSE_LYRICS__) {
        if (result.length > 0) {
          console.log('第一行示例:', JSON.stringify(result[0], null, 2))
        }
        console.log('===== parseLyrics 结束 =====')
      }
      return result
    }
    
    // 其次检查其他格式
    if (__DEBUG_PARSE_LYRICS__) console.log('使用 lyricType 解析:', lyricType)
    let result = []
    switch (lyricType) {
      case 'ttml':
        result = parseTtmlLyrics(lyricText, tlrcText)
        break
      case 'eslrc':
        result = parseEslrcLyrics(lyricText, tlrcText)
        break
      case 'word':
        result = parseWordLyrics(lyricText, tlrcText)
        break
      case 'lrc':
      default:
        result = parseLRCLyrics(lyricText, tlrcText)
        break
    }
    
    if (__DEBUG_PARSE_LYRICS__) console.log('解析结果行数:', result.length)
    if (__DEBUG_PARSE_LYRICS__) {
      if (result.length > 0) {
        console.log('第一行示例:', JSON.stringify(result[0], null, 2))
      }
      console.log('===== parseLyrics 结束 =====')
    }
    return result
    
  } catch (error) {
    if (__DEBUG_PARSE_LYRICS__) {
      console.error('歌词解析失败:', error)
      console.log('===== parseLyrics 异常结束 =====')
    }
    return []
  }
  
}