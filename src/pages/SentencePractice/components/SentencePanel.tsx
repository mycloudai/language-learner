import { highlightWord } from '../utils'
import { generateWordSoundSrc } from '@/hooks/usePronunciation'
import { pronunciationConfigAtom } from '@/store'
import type { SentenceData } from '@/utils/aiService'
import { useAtomValue } from 'jotai'
import { useCallback, useEffect, useRef, useState } from 'react'

// Online lookup URLs for a word
function lookupLinks(word: string) {
  const enc = encodeURIComponent(word)
  return [
    { label: 'Cambridge', url: `https://dictionary.cambridge.org/dictionary/english/${enc}` },
    { label: 'M-W', url: `https://www.merriam-webster.com/dictionary/${enc}` },
    { label: 'Google 翻译', url: `https://translate.google.com/?sl=en&tl=zh-CN&text=${enc}&op=translate` },
    { label: '百度翻译', url: `https://fanyi.baidu.com/mtpe-individual/transText?aldtype=85&ext_channel=Aldtype#/en/zh/${enc}` },
  ]
}

interface Popover {
  word: string
  definition?: string
  left: number
  top: number
}

export default function SentencePanel({ word, data, loading }: { word: string; data: SentenceData | null; loading: boolean }) {
  const pronunciationConfig = useAtomValue(pronunciationConfigAtom)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [popover, setPopover] = useState<Popover | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const playWordPronunciation = useCallback(
    (target: string) => {
      const src = generateWordSoundSrc(target, pronunciationConfig.type)
      if (!src) return
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
      const audio = new Audio(src)
      audio.preload = 'auto'
      audio.volume = pronunciationConfig.volume
      audio.playbackRate = pronunciationConfig.rate
      audioRef.current = audio
      audio.play().catch(() => {})
    },
    [pronunciationConfig.rate, pronunciationConfig.type, pronunciationConfig.volume],
  )

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const handleWordClick = useCallback(
    (token: string, e: React.MouseEvent<HTMLSpanElement>) => {
      const cleanWord = token.replace(/[^a-zA-Z'-]/g, '').toLowerCase()
      if (!cleanWord) return

      playWordPronunciation(cleanWord)

      if (popover?.word === cleanWord) {
        setPopover(null)
        return
      }

      const note = data?.vocabNotes.find((n) => n.word.toLowerCase() === cleanWord)
      const rect = e.currentTarget.getBoundingClientRect()
      const cRect = containerRef.current?.getBoundingClientRect()
      setPopover({
        word: cleanWord,
        definition: note?.explanation,
        left: rect.left - (cRect?.left ?? 0),
        top: rect.bottom - (cRect?.top ?? 0) + 6,
      })
    },
    [data, playWordPronunciation, popover],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>AI 正在生成句子...</span>
        </div>
      </div>
    )
  }

  if (!data) return null

  const parts = highlightWord(data.sentence, word)

  return (
    <div className="vsc-sentence-panel space-y-4 rounded-xl">
      {/* Sentence display */}
      <div
        className="relative rounded-xl p-6 dark:bg-gray-700/60"
        ref={containerRef}
        onClick={(e) => {
          const el = e.target as HTMLElement
          if (el.tagName === 'DIV' || el.tagName === 'P') setPopover(null)
        }}
      >
        <p className="select-text text-xl leading-relaxed tracking-wide" style={{ fontFamily: "'Courier New', Consolas, monospace" }}>
          {parts.map((part, i) =>
            part.isTarget ? (
              <span
                key={i}
                className="cursor-pointer font-bold text-blue-600 underline decoration-blue-400 decoration-2 underline-offset-4 hover:opacity-80 dark:text-blue-400"
                onClick={(e) => handleWordClick(part.text, e)}
                title="点击发音 🔊"
              >
                {part.text}
              </span>
            ) : (
              part.text.split(/([a-zA-Z'-]+)/).map((chunk, j) =>
                /^[a-zA-Z'-]+$/.test(chunk) ? (
                  <span
                    key={`${i}-${j}`}
                    className="cursor-pointer text-gray-800 hover:text-blue-500 hover:underline dark:text-gray-200"
                    onClick={(e) => handleWordClick(chunk, e)}
                    title="点击发音 🔊"
                  >
                    {chunk}
                  </span>
                ) : (
                  <span key={`${i}-${j}`} className="text-gray-800 dark:text-gray-200">
                    {chunk}
                  </span>
                ),
              )
            ),
          )}
        </p>

        {/* Word popover */}
        {popover && (
          <div
            className="absolute z-20 min-w-[180px] max-w-[280px] rounded-lg border border-gray-200 bg-white p-3 shadow-xl dark:border-gray-600 dark:bg-gray-700"
            style={{ left: Math.max(0, Math.min(popover.left, (containerRef.current?.clientWidth ?? 500) - 200)), top: popover.top }}
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 dark:text-white">{popover.word}</span>
              <button
                onClick={() => playWordPronunciation(popover.word)}
                className="ml-auto rounded p-1 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-gray-600"
                title="播放发音"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                </svg>
              </button>
              <button onClick={() => setPopover(null)} className="rounded px-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600">
                ×
              </button>
            </div>

            {popover.definition ? (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{popover.definition}</p>
            ) : (
              <>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">本句中无释义，可在线查询：</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {lookupLinks(popover.word).map((link) => (
                    <a
                      key={link.label}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded border border-blue-200 px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/30"
                    >
                      {link.label} ↗
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Target word usage */}
      <div className="rounded-lg px-4 py-3 dark:bg-blue-900/40">
        <span className="text-sm font-medium text-blue-800 dark:text-blue-200">📖 {word}：</span>
        <span className="text-sm text-blue-700 dark:text-blue-300">{data.targetWordUsage}</span>
      </div>
    </div>
  )
}
