import { parseLyrics } from '@renderer/utils/lyricParser'

export const parseLyricsInWorker = (lyricText: string, lyricType: string, tlrcText?: string) => {
  return parseLyrics(lyricText, lyricType, tlrcText)
}
