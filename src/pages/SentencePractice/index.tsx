import AIChatDialog from './components/AIChatDialog'
import AnalysisPanel from './components/AnalysisPanel'
import DiffView from './components/DiffView'
import InputArea from './components/InputArea'
import SentencePanel from './components/SentencePanel'
import { useAISentence } from './hooks/useAISentence'
import CacheManagementPanel from '@/components/CacheManagementPanel'
import Tooltip from '@/components/Tooltip'
import { CHAPTER_LENGTH } from '@/constants'
import useSentenceKeySounds from '@/hooks/useSentenceKeySounds'
import { currentChapterAtom, currentDictIdAtom, currentDictInfoAtom, isIgnoreCaseAtom, sentenceRandomConfigAtom } from '@/store'
import type { AIDifficulty, AIStyle } from '@/store/aiConfig'
import { aiConfigAtom, aiDifficultyAtom, aiStyleAtom, sentenceProgressAtom } from '@/store/aiConfig'
import { sentenceErrorCorrectTargetAtom } from '@/store/aiConfig'
import { sentenceChapterSnapshotAtom } from '@/store/aiConfig'
import type { FavoriteSentence } from '@/store/favorites'
import { favoriteSentencesAtom } from '@/store/favorites'
import {
  sentenceJumpTargetAtom,
  sentenceErrorRefreshTokenAtom,
  typingSettingsOpenAtom,
  finishedSentenceChaptersAtom,
} from '@/store/uiState'
import { sentenceToMarkdown } from '@/utils/aiService'
import { getErrorBankEntries, increaseErrorCorrectCount, markSentenceAsError, removeCacheEntry } from '@/utils/sentenceCacheDB'
import type { ISentenceCacheEntry } from '@/utils/sentenceCacheDB'
import shuffle from '@/utils/shuffle'
import { wordListFetcher } from '@/utils/wordListFetcher'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMatch, useNavigate, useSearchParams } from 'react-router-dom'
import useSWR from 'swr'

function normalizeSentence(value: string, ignoreCase: boolean): string {
  const trimmed = value.trim()
  return ignoreCase ? trimmed.toLowerCase() : trimmed
}

export default function SentencePractice() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isSentenceStrengthenRoute = useMatch('/sentence-strengthen')
  const isErrorBankMode = !!isSentenceStrengthenRoute || searchParams.get('mode') === 'errorbank'
  const dictInfo = useAtomValue(currentDictInfoAtom)
  const dictId = useAtomValue(currentDictIdAtom)
  const currentChapter = useAtomValue(currentChapterAtom)
  const randomConfig = useAtomValue(sentenceRandomConfigAtom)
  const isIgnoreCase = useAtomValue(isIgnoreCaseAtom)
  const aiConfig = useAtomValue(aiConfigAtom)
  const [difficulty, setDifficulty] = useAtom(aiDifficultyAtom)
  const [style, setStyle] = useAtom(aiStyleAtom)
  const [progress, setProgress] = useAtom(sentenceProgressAtom)
  const [sentenceErrorCorrectTarget] = useAtom(sentenceErrorCorrectTargetAtom)
  const setSentenceChapterSnapshot = useSetAtom(sentenceChapterSnapshotAtom)
  const setFinishedSentenceChapters = useSetAtom(finishedSentenceChaptersAtom)

  const [showCachePanel, setShowCachePanel] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [errorBankAllDone, setErrorBankAllDone] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [lastSubmitCorrect, setLastSubmitCorrect] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState(false)
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [favorites, setFavorites] = useAtom(favoriteSentencesAtom)
  const errorBankTotalRef = useRef(0)
  const openTypingSettings = useSetAtom(typingSettingsOpenAtom)
  const [sentenceJumpTarget, setSentenceJumpTarget] = useAtom(sentenceJumpTargetAtom)
  const [, playBeepSound, playHintSound] = useSentenceKeySounds()
  const bumpSentenceErrorRefresh = useSetAtom(sentenceErrorRefreshTokenAtom)

  // Error bank mode state
  const [errorBankEntries, setErrorBankEntries] = useState<ISentenceCacheEntry[]>([])
  const [errorBankIndex, setErrorBankIndex] = useState(0)
  const [errorBankCount, setErrorBankCount] = useState(0)
  const [celebrationWord, setCelebrationWord] = useState<string | null>(null)

  const { data: wordList } = useSWR(dictInfo.url, wordListFetcher)

  // Determine current word index from independent progress
  const effectiveChapter = progress.dictId === dictId ? progress.chapter : currentChapter
  const effectiveWordIndex = progress.dictId === dictId ? progress.wordIndex : 0

  const words = useMemo(() => {
    if (!wordList) return []
    const chapterWords = wordList.slice(effectiveChapter * CHAPTER_LENGTH, (effectiveChapter + 1) * CHAPTER_LENGTH)
    if (!randomConfig.isOpen || isErrorBankMode) return chapterWords
    return shuffle(chapterWords)
  }, [wordList, effectiveChapter, randomConfig.isOpen, isErrorBankMode, dictId])

  useEffect(() => {
    setSentenceChapterSnapshot({
      dictId,
      chapter: effectiveChapter,
      words: words.map((word, index) => ({
        ...word,
        index,
      })),
    })
  }, [dictId, effectiveChapter, words, setSentenceChapterSnapshot])

  const currentWord = words[effectiveWordIndex] || null
  const currentWordTrans = useMemo(() => currentWord?.trans?.join('; ') || '', [currentWord])

  const { data: sentenceData, loading, error, generate, regenerate } = useAISentence()

  const refreshErrorBankCount = useCallback(() => {
    getErrorBankEntries(dictId)
      .then((entries) => setErrorBankCount(entries.length))
      .catch(() => setErrorBankCount(0))
  }, [dictId])

  // Resolve one-time jump target from favorites so shuffled chapters can still land on the correct word.
  useEffect(() => {
    if (!sentenceJumpTarget) return
    if (sentenceJumpTarget.dictId !== dictId) return
    if (words.length === 0) return

    const idx = words.findIndex((w) => w.name === sentenceJumpTarget.word)
    if (idx >= 0 && idx !== effectiveWordIndex) {
      setProgress({ dictId, chapter: effectiveChapter, wordIndex: idx })
    }
    setSentenceJumpTarget(null)
  }, [sentenceJumpTarget, dictId, words, effectiveWordIndex, setProgress, effectiveChapter, setSentenceJumpTarget])

  // Load error bank entries when in error bank mode
  useEffect(() => {
    if (isErrorBankMode) {
      getErrorBankEntries(dictId)
        .then((entries) => {
          errorBankTotalRef.current = entries.length
          setErrorBankEntries(entries)
          setErrorBankCount(entries.length)
          setErrorBankIndex(0)
          setErrorBankAllDone(false)
        })
        .catch(() => {})
      return
    }
    refreshErrorBankCount()
  }, [isErrorBankMode, dictId, refreshErrorBankCount])

  // In error bank mode, the "currentWord" is synthetic from error bank
  const errorBankCurrentEntry = isErrorBankMode ? errorBankEntries[errorBankIndex] : null

  useEffect(() => {
    if (!celebrationWord) return
    const timer = setTimeout(() => setCelebrationWord(null), 1800)
    return () => clearTimeout(timer)
  }, [celebrationWord])

  // Effective display values — error bank overrides normal flow
  const displaySentenceData = isErrorBankMode ? errorBankCurrentEntry?.sentenceData ?? null : sentenceData
  const displayWord = isErrorBankMode
    ? errorBankCurrentEntry
      ? { name: errorBankCurrentEntry.word, trans: [] as string[] }
      : null
    : currentWord
  const displayLoading = isErrorBankMode ? false : loading
  const displayError = isErrorBankMode ? (errorBankEntries.length === 0 ? '错题库为空' : null) : error

  const resetInput = useCallback(() => {
    setInputValue('')
    setSubmitted(false)
    setLastSubmitCorrect(false)
  }, [])

  // Generate sentence for current word (skip in error bank mode — it uses cached data)
  useEffect(() => {
    if (isErrorBankMode) return
    if (currentWord && aiConfig.isConfigured) {
      generate(currentWord.name, currentWordTrans, dictId, dictInfo.language)
      resetInput()
    }
  }, [
    currentWord?.name,
    currentWordTrans,
    aiConfig.isConfigured,
    isErrorBankMode,
    dictId,
    dictInfo.language,
    effectiveChapter,
    effectiveWordIndex,
    generate,
    resetInput,
  ])

  const handleSubmit = useCallback(() => {
    if (inputValue.trim() && displaySentenceData) {
      const isCorrect = normalizeSentence(inputValue, isIgnoreCase) === normalizeSentence(displaySentenceData.sentence, isIgnoreCase)
      setSubmitted(true)
      setLastSubmitCorrect(isCorrect)
      if (isCorrect) playHintSound()
      else playBeepSound()

      // Record wrong sentence immediately so user doesn't need to click "next" to enter error bank.
      if (!isCorrect && !isErrorBankMode && currentWord && sentenceData) {
        markSentenceAsError(dictId, currentWord.name, sentenceData).finally(() => {
          refreshErrorBankCount()
          bumpSentenceErrorRefresh((t) => t + 1)
        })
      }
    }
  }, [
    inputValue,
    displaySentenceData,
    isIgnoreCase,
    isErrorBankMode,
    currentWord,
    sentenceData,
    dictId,
    refreshErrorBankCount,
    playHintSound,
    playBeepSound,
    bumpSentenceErrorRefresh,
  ])

  const handleNext = useCallback(() => {
    if (isErrorBankMode) {
      // Error bank mode: if correct, remove from error bank
      if (submitted && displaySentenceData && displayWord) {
        const isCorrect = normalizeSentence(inputValue, isIgnoreCase) === normalizeSentence(displaySentenceData.sentence, isIgnoreCase)
        if (isCorrect && errorBankCurrentEntry?.id) {
          const currentEntryId = errorBankCurrentEntry.id
          increaseErrorCorrectCount(currentEntryId)
            .then((nextCorrectCount) => {
              if (nextCorrectCount >= sentenceErrorCorrectTarget) {
                removeCacheEntry(currentEntryId).catch(() => {})
                setErrorBankEntries((prev) => {
                  const removedIndex = prev.findIndex((entry) => entry.id === currentEntryId)
                  const nextEntries = prev.filter((entry) => entry.id !== currentEntryId)
                  setErrorBankIndex((current) => {
                    if (nextEntries.length === 0) return 0
                    if (removedIndex >= 0 && current > removedIndex) return current - 1
                    return current % nextEntries.length
                  })
                  if (nextEntries.length === 0) {
                    setErrorBankAllDone(true)
                  }
                  return nextEntries
                })
                setCelebrationWord(errorBankCurrentEntry.word)
                refreshErrorBankCount()
                bumpSentenceErrorRefresh((t) => t + 1)
                return
              }
              setErrorBankEntries((prev) =>
                prev.map((entry) => (entry.id === currentEntryId ? { ...entry, errorCorrectCount: nextCorrectCount } : entry)),
              )
              setErrorBankIndex((i) => (errorBankEntries.length > 0 ? (i + 1) % errorBankEntries.length : 0))
            })
            .catch(() => {
              setErrorBankIndex((i) => (errorBankEntries.length > 0 ? (i + 1) % errorBankEntries.length : 0))
            })
        } else {
          setErrorBankIndex((i) => (errorBankEntries.length > 0 ? (i + 1) % errorBankEntries.length : 0))
        }
      } else {
        setErrorBankIndex((i) => (errorBankEntries.length > 0 ? (i + 1) % errorBankEntries.length : 0))
      }
      resetInput()
      return
    }

    const nextIndex = effectiveWordIndex + 1
    if (nextIndex >= words.length) {
      // Move to next chapter — mark current chapter as finished
      if (!isErrorBankMode) {
        setFinishedSentenceChapters((prev) => {
          const existing = prev[dictId] ?? []
          if (existing.includes(effectiveChapter)) return prev
          return { ...prev, [dictId]: [...existing, effectiveChapter] }
        })
      }
      const nextChapter = effectiveChapter + 1
      if (nextChapter >= dictInfo.chapterCount) {
        setProgress({ dictId, chapter: 0, wordIndex: 0 })
      } else {
        setProgress({ dictId, chapter: nextChapter, wordIndex: 0 })
      }
    } else {
      setProgress({ dictId, chapter: effectiveChapter, wordIndex: nextIndex })
    }
    resetInput()
  }, [
    isErrorBankMode,
    submitted,
    displaySentenceData,
    displayWord,
    currentWord,
    inputValue,
    dictId,
    effectiveWordIndex,
    effectiveChapter,
    words.length,
    dictInfo.chapterCount,
    setProgress,
    errorBankCurrentEntry,
    errorBankEntries.length,
    isIgnoreCase,
    sentenceErrorCorrectTarget,
    refreshErrorBankCount,
    resetInput,
    bumpSentenceErrorRefresh,
    setFinishedSentenceChapters,
  ])

  const handlePrev = useCallback(() => {
    if (isErrorBankMode) {
      if (errorBankIndex > 0) {
        setErrorBankIndex((idx) => Math.max(0, idx - 1))
      }
      resetInput()
      return
    }

    if (effectiveWordIndex > 0) {
      setProgress({ dictId, chapter: effectiveChapter, wordIndex: effectiveWordIndex - 1 })
    } else if (effectiveChapter > 0) {
      setProgress({ dictId, chapter: effectiveChapter - 1, wordIndex: CHAPTER_LENGTH - 1 })
    }
    resetInput()
  }, [isErrorBankMode, errorBankIndex, effectiveWordIndex, effectiveChapter, dictId, setProgress, resetInput])

  // Auto-advance on correct submission after 1s
  useEffect(() => {
    if (submitted && lastSubmitCorrect) {
      autoAdvanceRef.current = setTimeout(() => {
        handleNext()
      }, 1000)
      return () => {
        if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current)
      }
    }
  }, [submitted, lastSubmitCorrect, handleNext])

  const handleRegenerate = useCallback(() => {
    if (currentWord && aiConfig.isConfigured) {
      regenerate(currentWord.name, currentWordTrans, dictId, dictInfo.language)
      resetInput()
    }
  }, [currentWord, currentWordTrans, aiConfig.isConfigured, regenerate, dictId, dictInfo.language, resetInput])

  const handleCopyMarkdown = useCallback(async () => {
    // Use display values so this works in both normal and error-bank modes.
    const sdToUse = displaySentenceData
    const wordName = displayWord?.name
    if (!sdToUse || !wordName) return
    const md = sentenceToMarkdown(wordName, sdToUse)
    try {
      await navigator.clipboard.writeText(md)
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = md
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2000)
    }
  }, [displaySentenceData, displayWord])

  const isFavorited = useMemo(() => {
    // Use display values so favorite state is accurate in both normal and error-bank modes.
    const wordName = displayWord?.name
    const sd = displaySentenceData
    if (!sd || !wordName) return false
    return favorites.some((f) => f.word === wordName && f.dictId === dictId && f.sentence === sd.sentence)
  }, [favorites, displaySentenceData, displayWord, dictId])

  const handleToggleFavorite = useCallback(() => {
    // Use display values so toggling works in both normal and error-bank modes.
    const sd = displaySentenceData
    const wordName = displayWord?.name
    if (!sd || !wordName) return
    const favDictId = isErrorBankMode ? errorBankCurrentEntry?.dictId ?? dictId : dictId
    if (isFavorited) {
      setFavorites((prev) => prev.filter((f) => !(f.word === wordName && f.dictId === favDictId && f.sentence === sd.sentence)))
    } else {
      const newFav: FavoriteSentence = {
        id: `${Date.now()}_${wordName}`,
        word: wordName,
        dictId: favDictId,
        dictName: dictInfo.name,
        sentence: sd.sentence,
        targetWordUsage: sd.targetWordUsage,
        sentenceData: sd, // store full AI response so favorites act as cache
        chapter: effectiveChapter,
        wordIndex: effectiveWordIndex,
        createdAt: Date.now(),
      }
      setFavorites((prev) => [...prev, newFav])
    }
  }, [
    displaySentenceData,
    displayWord,
    isErrorBankMode,
    errorBankCurrentEntry,
    isFavorited,
    dictId,
    dictInfo.name,
    effectiveChapter,
    effectiveWordIndex,
    setFavorites,
  ])

  return (
    <div className="sentence-practice-page flex min-h-screen flex-col bg-white dark:bg-gray-900">
      {/* Header - always visible including in VS Code mode */}
      <header className="sentence-practice-header flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-2 dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
          <h1 className="text-sm font-medium text-gray-900 dark:text-white">AI 句子练习</h1>
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
            {isErrorBankMode ? `错题库 · ${errorBankEntries.length} 题` : `${dictInfo.name} · 第 ${effectiveChapter + 1} 章`}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {/* Difficulty toggle */}
          <div className="flex rounded-lg bg-gray-100 p-0.5 dark:bg-gray-700">
            {(['easy', 'medium', 'hard'] as AIDifficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`rounded-md px-2.5 py-1 text-xs ${
                  difficulty === d
                    ? 'bg-white font-medium text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {{ easy: '简单', medium: '中等', hard: '困难' }[d]}
              </button>
            ))}
          </div>

          {/* Style toggle */}
          <div className="flex rounded-lg bg-gray-100 p-0.5 dark:bg-gray-700">
            {(['formal', 'spoken'] as AIStyle[]).map((s) => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                className={`rounded-md px-2.5 py-1 text-xs ${
                  style === s
                    ? 'bg-white font-medium text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {{ formal: '书面', spoken: '口语' }[s]}
              </button>
            ))}
          </div>

          {/* Cache manager */}
          <Tooltip content="缓存管理" placement="bottom">
            <button
              onClick={() => setShowCachePanel(true)}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              title="缓存管理"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7" />
                <path d="M9 12h6" />
                <rect x="2" y="3" width="20" height="4" rx="1" />
              </svg>
            </button>
          </Tooltip>

          {/* Settings: always route to the same typing settings dialog */}
          <Tooltip content="打开单词设置" placement="bottom">
            <button
              onClick={() => {
                openTypingSettings(true)
              }}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              title="打开单词设置"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </Tooltip>
        </div>
      </header>

      {/* Main content: full-width in VS Code mode, capped otherwise */}
      <div className={`sentence-content mx-auto flex w-full max-w-none flex-1 flex-col gap-4 px-6 py-6`}>
        {/* Word header */}
        {displayWord && (
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{displayWord.name}</h2>
              <p className="text-sm text-gray-700 dark:text-gray-300">{displayWord.trans?.join('; ')}</p>
              {isErrorBankMode && errorBankCurrentEntry && (
                <p className="mt-1 text-xs text-red-500 dark:text-red-400">
                  错题通过：{errorBankCurrentEntry.errorCorrectCount ?? 0}/{sentenceErrorCorrectTarget}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {isErrorBankMode ? `${errorBankIndex + 1} / ${errorBankEntries.length}` : `${effectiveWordIndex + 1} / ${words.length}`}
                </span>
                <Tooltip content="上一个" placement="bottom">
                  <button
                    onClick={handlePrev}
                    disabled={isErrorBankMode ? errorBankIndex <= 0 : effectiveWordIndex === 0 && effectiveChapter === 0}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"
                    title="上一个"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </Tooltip>
                <Tooltip content="下一个" placement="bottom">
                  <button
                    onClick={handleNext}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="下一个"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>
        )}

        {/* Sentence panel */}
        {displayWord && <SentencePanel word={displayWord.name} data={displaySentenceData} loading={displayLoading} />}

        {/* Error display */}
        {displayError && !displayLoading && (
          <div className="flex items-start gap-3 rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
            <span className="mt-0.5 text-base">⚠️</span>
            <div className="flex-1">
              <p className="text-sm text-red-600 dark:text-red-400">{displayError}</p>
              {displayWord && !isErrorBankMode && (
                <button
                  onClick={handleRegenerate}
                  className="mt-2 flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-700 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                >
                  <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                      clipRule="evenodd"
                    />
                  </svg>
                  重试
                </button>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        {displaySentenceData && displayWord && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleRegenerate}
              disabled={displayLoading || isErrorBankMode}
              className="flex items-center gap-2 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 shadow-sm shadow-amber-100 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
            >
              <svg className={`h-3.5 w-3.5 ${displayLoading ? 'animate-spin' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                  clipRule="evenodd"
                />
              </svg>
              重新生成
            </button>

            {submitted && !lastSubmitCorrect && (
              <>
                <button
                  onClick={resetInput}
                  className="flex items-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  重新输入
                </button>
                <button
                  onClick={handleNext}
                  disabled={displayLoading}
                  className="flex items-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  title="下一个词"
                >
                  下一个词
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </>
            )}

            <button
              onClick={handleCopyMarkdown}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
              </svg>
              {copyFeedback ? '已复制！' : '复制 MD'}
            </button>
            {/* Favorite — prominent */}
            <button
              onClick={handleToggleFavorite}
              className={`flex items-center gap-1.5 rounded-lg border-2 px-4 py-2 text-sm font-semibold transition-all ${
                isFavorited
                  ? 'border-amber-400 bg-amber-50 text-amber-600 shadow-sm shadow-amber-200 dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-400 dark:shadow-amber-900/20'
                  : 'border-amber-300 text-amber-500 hover:border-amber-400 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-900/20'
              }`}
              title={isFavorited ? '取消收藏' : '收藏该句子（收藏后会缓存保留）'}
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill={isFavorited ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              {isFavorited ? '已收藏' : '收藏'}
            </button>
            {/* Ask teacher */}
            <button
              onClick={() => setShowChat((v) => !v)}
              className={`ml-auto flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs ${
                showChat
                  ? 'border-blue-300 bg-blue-50 text-blue-600 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
              title="向老师提问"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              提问老师
            </button>
          </div>
        )}

        {/* Input area */}
        {displaySentenceData && !submitted && (
          <InputArea
            disabled={displayLoading || !displaySentenceData}
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}
            sentence={displaySentenceData.sentence}
          />
        )}

        {/* Diff view */}
        {submitted && displaySentenceData && (
          <DiffView input={inputValue} target={displaySentenceData.sentence} isCorrect={lastSubmitCorrect} />
        )}

        {/* Analysis panel */}
        {displaySentenceData && <AnalysisPanel data={displaySentenceData} />}

        {/* Auto-advance hint */}
        {submitted && lastSubmitCorrect && <div className="text-center text-sm text-green-600 dark:text-green-400">自动跳转中…</div>}

        {celebrationWord && (
          <div className="pointer-events-none fixed inset-x-0 top-6 z-40 flex justify-center px-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-lg dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              🎉 {celebrationWord} 已达标，已从错误练习中移除！
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCachePanel && <CacheManagementPanel onClose={() => setShowCachePanel(false)} />}

      {/* Error bank all-done celebration */}
      {isErrorBankMode && errorBankAllDone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl dark:bg-gray-800">
            <div className="mb-4 text-5xl">🎉</div>
            <h3 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">太棒了！</h3>
            <p className="mb-1 text-gray-600 dark:text-gray-300">
              共完成 <strong>{errorBankTotalRef.current}</strong> 道错题练习
            </p>
            <p className="mb-6 text-sm text-gray-400 dark:text-gray-500">所有句子错题均已达标，继续保持！</p>
            <button
              onClick={() => {
                setErrorBankAllDone(false)
                navigate('/sentence-practice')
              }}
              className="w-full rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white shadow-sm hover:bg-emerald-600"
            >
              返回句子练习
            </button>
          </div>
        </div>
      )}

      {/* AI Chat — floating dialog bottom-right */}
      {showChat && displaySentenceData && displayWord && (
        <AIChatDialog
          word={displayWord.name}
          sentence={displaySentenceData.sentence}
          targetWordUsage={displaySentenceData.targetWordUsage}
          language={dictInfo.language}
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  )
}
