import { CHAPTER_LENGTH } from '@/constants'
import { dictionaryResources } from '@/resources/dictionary'
import {
  currentChapterAtom,
  currentDictIdAtom,
  currentDictInfoAtom,
  typingChapterSnapshotAtom,
  typingWordIndexAtom,
  typingWordIndexJumpTokenAtom,
} from '@/store'
import { wordStrengthenCorrectTargetAtom, sentenceChapterSnapshotAtom } from '@/store/aiConfig'
import { sentenceProgressAtom } from '@/store/aiConfig'
import type { FavoriteSentence } from '@/store/favorites'
import { favoriteSentencesAtom } from '@/store/favorites'
import { sentenceJumpTargetAtom, sentenceErrorRefreshTokenAtom, wordStrengthenRefreshTokenAtom } from '@/store/uiState'
import { db } from '@/utils/db'
import { cacheSentence, getErrorBankEntries } from '@/utils/sentenceCacheDB'
import type { ISentenceCacheEntry } from '@/utils/sentenceCacheDB'
import { wordListFetcher } from '@/utils/wordListFetcher'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useSWR from 'swr'

type SidebarPanel = 'explorer' | 'search' | 'progress' | 'favorites'

function ErrorPracticePanel({ isTypingPage }: { isTypingPage: boolean }) {
  const dictInfo = useAtomValue(currentDictInfoAtom)
  const navigate = useNavigate()
  const [sentenceEntries, setSentenceEntries] = useState<ISentenceCacheEntry[]>([])
  const [wordList, setWordList] = useState<{ word: string; mastery: number; correctCount: number }[]>([])
  const [loaded, setLoaded] = useState(false)
  const refreshToken = useAtomValue(wordStrengthenRefreshTokenAtom)
  const sentenceRefreshToken = useAtomValue(sentenceErrorRefreshTokenAtom)
  const [correctTarget] = useAtom(wordStrengthenCorrectTargetAtom)

  useEffect(() => {
    setLoaded(false)
    if (!isTypingPage) {
      getErrorBankEntries(dictInfo.id)
        .then((entries) => {
          setSentenceEntries(entries)
          setLoaded(true)
        })
        .catch(() => setLoaded(true))
    } else {
      db.wordRecords
        .where('dict')
        .equals(dictInfo.id)
        .toArray()
        .then((records) => {
          // Build per-word stats: track consecutive clean attempts after last wrong
          const map = new Map<
            string,
            { totalAttempts: number; wrongCount: number; consecutiveCleanAfterLastWrong: number; hadWrong: boolean }
          >()
          // Sort records by timestamp to get chronological order
          const sorted = [...records].sort((a, b) => a.timeStamp - b.timeStamp)
          sorted.forEach((r) => {
            const prev = map.get(r.word) ?? { totalAttempts: 0, wrongCount: 0, consecutiveCleanAfterLastWrong: 0, hadWrong: false }
            const isClean = r.wrongCount === 0
            const hadWrong = prev.hadWrong || !isClean
            map.set(r.word, {
              totalAttempts: prev.totalAttempts + 1,
              wrongCount: prev.wrongCount + (isClean ? 0 : 1),
              consecutiveCleanAfterLastWrong: !isClean ? 0 : prev.hadWrong ? prev.consecutiveCleanAfterLastWrong + 1 : 0,
              hadWrong,
            })
          })
          const list = Array.from(map.entries())
            .filter(([, v]) => v.hadWrong && v.consecutiveCleanAfterLastWrong < correctTarget)
            .map(([word, v]) => ({
              word,
              mastery: v.totalAttempts > 0 ? Math.round(((v.totalAttempts - v.wrongCount) / v.totalAttempts) * 100) : 0,
              correctCount: v.consecutiveCleanAfterLastWrong,
            }))
            .sort((a, b) => a.mastery - b.mastery)
          setWordList(list)
          setLoaded(true)
        })
        .catch(() => setLoaded(true))
    }
  }, [isTypingPage, dictInfo.id, refreshToken, sentenceRefreshToken, correctTarget])

  const handleStartPractice = () => {
    if (isTypingPage) {
      navigate('/word-strengthen')
    } else {
      navigate('/sentence-strengthen')
    }
  }

  return (
    <div className="vsc-sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="vsc-sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{isTypingPage ? '单词错误练习' : '句子错误练习'}</span>
        {loaded && <span style={{ fontSize: 10, opacity: 0.65 }}>{isTypingPage ? wordList.length : sentenceEntries.length} 题</span>}
      </div>

      {!loaded ? (
        <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--vsc-text-dim)' }}>加载中…</div>
      ) : isTypingPage ? (
        wordList.length === 0 ? (
          <div style={{ padding: '16px 12px', fontSize: 12, color: 'var(--vsc-text-dim)', textAlign: 'center', lineHeight: 1.6 }}>
            暂无錯误单词记录
          </div>
        ) : (
          <>
            <div style={{ padding: '4px 12px 6px' }}>
              <button
                onClick={handleStartPractice}
                style={{
                  width: '100%',
                  padding: '6px 0',
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 4,
                  background: 'var(--vsc-accent)',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                开始错误练习
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
              <div style={{ fontSize: 11, color: 'var(--vsc-text-dim)', padding: '4px 4px 6px' }}>待加强单词</div>
              {wordList.map((item) => (
                <div key={item.word} className="vsc-wordlist-item" style={{ cursor: 'default' }}>
                  <span className="vsc-wordlist-name">{item.word}</span>
                  <span className="vsc-wordlist-trans" style={{ color: item.mastery < 50 ? '#e8736a' : 'var(--vsc-text-dim)' }}>
                    连续正确 {item.correctCount}/{correctTarget}
                  </span>
                </div>
              ))}
            </div>
          </>
        )
      ) : sentenceEntries.length === 0 ? (
        <div style={{ padding: '16px 12px', fontSize: 12, color: 'var(--vsc-text-dim)', textAlign: 'center', lineHeight: 1.6 }}>
          暂无错误句子记录
        </div>
      ) : (
        <>
          <div style={{ padding: '4px 12px 6px' }}>
            <button
              onClick={handleStartPractice}
              style={{
                width: '100%',
                padding: '6px 0',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 4,
                background: 'var(--vsc-accent)',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              开始错误练习
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
            <div style={{ fontSize: 11, color: 'var(--vsc-text-dim)', padding: '4px 4px 6px' }}>待加强句子</div>
            {sentenceEntries.map((entry) => (
              <div key={`${entry.word}-${entry.createdAt}`} className="vsc-wordlist-item" style={{ cursor: 'default' }}>
                <span className="vsc-wordlist-name">{entry.word}</span>
                <span
                  className="vsc-wordlist-trans"
                  style={{
                    fontSize: 11,
                    marginTop: 2,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {entry.sentenceData?.sentence ?? ''}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function groupByCategory(dicts: typeof dictionaryResources): Map<string, typeof dictionaryResources> {
  const map = new Map<string, typeof dictionaryResources>()
  for (const d of dicts) {
    if (!map.has(d.category)) map.set(d.category, [])
    map.get(d.category)!.push(d)
  }
  return map
}

// ── Search panel ────────────────────────────────────────────────
function SearchPanel() {
  const dictInfo = useAtomValue(currentDictInfoAtom)
  const { data: wordList } = useSWR(dictInfo.url, wordListFetcher)
  const [query, setQuery] = useState('')
  const [, setProgress] = useAtom(sentenceProgressAtom)
  const [, setSentenceJumpTarget] = useAtom(sentenceJumpTargetAtom)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || !wordList) return []
    return wordList
      .filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          (w.notation ?? '').toLowerCase().includes(q) ||
          w.trans?.some((t) => t.toLowerCase().includes(q)),
      )
      .slice(0, 60)
  }, [query, wordList])

  const handleJump = (wordName: string) => {
    if (!wordList) return
    const flatIndex = wordList.findIndex((w) => w.name === wordName)
    if (flatIndex < 0) return
    const chapter = Math.floor(flatIndex / CHAPTER_LENGTH)
    // Set chapter so the right words get loaded, then use sentenceJumpTarget to find
    // the exact word in the (possibly shuffled) chapter word list.
    setProgress({ dictId: dictInfo.id, chapter, wordIndex: 0 })
    setSentenceJumpTarget({ dictId: dictInfo.id, word: wordName })
    navigate('/sentence-practice')
  }

  return (
    <div className="vsc-sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="vsc-sidebar-header">搜索单词</div>

      {/* Search input */}
      <div style={{ padding: '0 8px 6px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--vsc-input-bg)',
            border: '1px solid var(--vsc-input-border)',
            borderRadius: 2,
            padding: '3px 8px',
            gap: 6,
          }}
          onClick={() => inputRef.current?.focus()}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--vsc-text-dim)" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索单词或释义…"
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: 'var(--vsc-text)',
              fontSize: 12,
              fontFamily: "'Menlo','Monaco','Consolas',monospace",
            }}
          />
          {query && (
            <span onClick={() => setQuery('')} style={{ cursor: 'pointer', color: 'var(--vsc-text-dim)', fontSize: 14, lineHeight: 1 }}>
              ×
            </span>
          )}
        </div>
        <div style={{ marginTop: 4, fontSize: 11, color: 'var(--vsc-text-dim)' }}>在 {dictInfo.name} 中搜索</div>
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!wordList ? (
          <div style={{ color: 'var(--vsc-text-dim)', fontSize: 12, padding: '8px 12px' }}>加载词库…</div>
        ) : query && results.length === 0 ? (
          <div style={{ color: 'var(--vsc-text-dim)', fontSize: 12, padding: '8px 12px' }}>未找到匹配的单词</div>
        ) : (
          results.map((word, i) => {
            const q = query.toLowerCase()
            const renderHighlight = (s: string) => {
              const idx = s.toLowerCase().indexOf(q)
              if (idx < 0) return <>{s}</>
              return (
                <>
                  {s.slice(0, idx)}
                  <mark style={{ background: '#264f78', color: '#fff', borderRadius: 2, padding: '0 1px' }}>
                    {s.slice(idx, idx + q.length)}
                  </mark>
                  {s.slice(idx + q.length)}
                </>
              )
            }
            return (
              <div
                key={`${word.name}_${i}`}
                className="vsc-wordlist-item vsc-wordlist-item--clickable"
                title="点击从该单词开始句子练习"
                onClick={() => handleJump(word.name)}
              >
                <span className="vsc-wordlist-name">{renderHighlight(word.name)}</span>
                <span className="vsc-wordlist-trans">{renderHighlight(word.trans?.slice(0, 2).join('；') ?? '')}</span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ── Word list panel ──────────────────────────────────────────────
function WordListPanel() {
  const dictInfo = useAtomValue(currentDictInfoAtom)
  const [currentChapter, setCurrentChapter] = useAtom(currentChapterAtom)
  const [typingWordIndex, setTypingWordIndex] = useAtom(typingWordIndexAtom)
  const bumpTypingWordIndexJumpToken = useSetAtom(typingWordIndexJumpTokenAtom)
  const typingChapterSnapshot = useAtomValue(typingChapterSnapshotAtom)
  const { data: wordList } = useSWR(dictInfo.url, wordListFetcher)
  const navigate = useNavigate()
  const activeWordRef = useRef<HTMLDivElement | null>(null)

  const words = useMemo(() => {
    if (
      typingChapterSnapshot.dictId === dictInfo.id &&
      typingChapterSnapshot.chapter === currentChapter &&
      typingChapterSnapshot.words.length > 0
    ) {
      return typingChapterSnapshot.words
    }
    if (!wordList) return []
    return wordList.slice(currentChapter * CHAPTER_LENGTH, (currentChapter + 1) * CHAPTER_LENGTH)
  }, [typingChapterSnapshot, dictInfo.id, currentChapter, wordList])

  const totalWords = wordList?.length ?? 0

  // Auto-scroll to current word
  useEffect(() => {
    activeWordRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [typingWordIndex])

  const handlePrevChapter = () => {
    if (currentChapter > 0) {
      setCurrentChapter(currentChapter - 1)
      setTypingWordIndex(0)
      bumpTypingWordIndexJumpToken((token) => token + 1)
    }
  }
  const handleNextChapter = () => {
    if (currentChapter < dictInfo.chapterCount - 1) {
      setCurrentChapter(currentChapter + 1)
      setTypingWordIndex(0)
      bumpTypingWordIndexJumpToken((token) => token + 1)
    }
  }
  const handleJump = useCallback(() => {
    navigate('/')
  }, [navigate])

  const globalIndex = currentChapter * CHAPTER_LENGTH + typingWordIndex

  const handlePrevWord = () => {
    if (typingWordIndex > 0) {
      setTypingWordIndex(typingWordIndex - 1)
      bumpTypingWordIndexJumpToken((token) => token + 1)
    } else if (currentChapter > 0) {
      setCurrentChapter(currentChapter - 1)
      setTypingWordIndex(CHAPTER_LENGTH - 1)
      bumpTypingWordIndexJumpToken((token) => token + 1)
    }
  }
  const handleNextWord = () => {
    const nextIdx = typingWordIndex + 1
    if (nextIdx >= words.length) {
      if (currentChapter < dictInfo.chapterCount - 1) {
        setCurrentChapter(currentChapter + 1)
        setTypingWordIndex(0)
        bumpTypingWordIndexJumpToken((token) => token + 1)
      }
    } else {
      setTypingWordIndex(nextIdx)
      bumpTypingWordIndexJumpToken((token) => token + 1)
    }
  }

  return (
    <>
      <div className="vsc-sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="vsc-sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>打字练习进度</span>
        </div>

        {/* Current position */}
        <div style={{ padding: '8px 12px 4px', fontSize: 11, color: 'var(--vsc-text-dim)' }}>
          {dictInfo.name} · 第 {currentChapter + 1} 章 · {typingWordIndex + 1}/{words.length}
          {totalWords > 0 && <span style={{ marginLeft: 6, opacity: 0.7 }}>({Math.round((globalIndex / totalWords) * 100)}%)</span>}
        </div>

        {/* Current word */}
        {words[typingWordIndex] && (
          <div
            className="vsc-wordlist-item vsc-wordlist-item--clickable"
            style={{ margin: '0 8px', borderRadius: 4, border: '1px solid var(--vsc-accent)', padding: '6px 8px' }}
            title="点击前往打字练习"
            onClick={handleJump}
          >
            <span className="vsc-wordlist-name" style={{ fontSize: 13 }}>
              {['romaji', 'hapin'].includes(dictInfo.language)
                ? words[typingWordIndex].notation ?? words[typingWordIndex].name
                : words[typingWordIndex].name}
            </span>
            <span className="vsc-wordlist-trans">{words[typingWordIndex].trans?.slice(0, 2).join('；')}</span>
          </div>
        )}

        {/* Word-level navigation */}
        <div style={{ display: 'flex', gap: 6, padding: '8px 12px' }}>
          <button
            onClick={handlePrevWord}
            disabled={typingWordIndex === 0 && currentChapter === 0}
            style={{
              flex: 1,
              padding: '5px 0',
              fontSize: 11,
              borderRadius: 4,
              background: 'var(--vsc-input-bg)',
              border: '1px solid var(--vsc-border)',
              color: 'var(--vsc-text)',
              cursor: 'pointer',
              opacity: typingWordIndex === 0 && currentChapter === 0 ? 0.4 : 1,
            }}
          >
            ← 上一词
          </button>
          <button
            onClick={handleNextWord}
            disabled={currentChapter >= dictInfo.chapterCount - 1 && typingWordIndex >= words.length - 1}
            style={{
              flex: 1,
              padding: '5px 0',
              fontSize: 11,
              borderRadius: 4,
              background: 'var(--vsc-input-bg)',
              border: '1px solid var(--vsc-border)',
              color: 'var(--vsc-text)',
              cursor: 'pointer',
              opacity: currentChapter >= dictInfo.chapterCount - 1 && typingWordIndex >= words.length - 1 ? 0.4 : 1,
            }}
          >
            下一词 →
          </button>
        </div>

        {/* Chapter navigation */}
        <div style={{ display: 'flex', gap: 6, padding: '0 12px 8px' }}>
          <button
            onClick={handlePrevChapter}
            disabled={currentChapter === 0}
            style={{
              flex: 1,
              padding: '4px 0',
              fontSize: 10,
              borderRadius: 4,
              background: 'none',
              border: '1px solid var(--vsc-border)',
              color: 'var(--vsc-text-dim)',
              cursor: 'pointer',
              opacity: currentChapter === 0 ? 0.4 : 1,
            }}
          >
            ← 上一章
          </button>
          <button
            onClick={handleNextChapter}
            disabled={currentChapter >= dictInfo.chapterCount - 1}
            style={{
              flex: 1,
              padding: '4px 0',
              fontSize: 10,
              borderRadius: 4,
              background: 'none',
              border: '1px solid var(--vsc-border)',
              color: 'var(--vsc-text-dim)',
              cursor: 'pointer',
              opacity: currentChapter >= dictInfo.chapterCount - 1 ? 0.4 : 1,
            }}
          >
            下一章 →
          </button>
        </div>

        {/* Word list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
          <div style={{ fontSize: 11, color: 'var(--vsc-text-dim)', padding: '4px 4px 6px' }}>本章单词</div>
          {!wordList ? (
            <div style={{ color: 'var(--vsc-text-dim)', fontSize: 12, padding: '8px 4px' }}>加载中…</div>
          ) : (
            words.map((word, i) => (
              <div
                key={`${word.name}_${i}`}
                ref={i === typingWordIndex ? activeWordRef : undefined}
                className="vsc-wordlist-item vsc-wordlist-item--clickable"
                style={{ background: i === typingWordIndex ? 'var(--vsc-selection)' : undefined }}
                title="点击从该单词开始练习"
                onClick={() => {
                  setTypingWordIndex(i)
                  bumpTypingWordIndexJumpToken((token) => token + 1)
                  navigate('/')
                }}
              >
                <span className="vsc-wordlist-name">
                  {['romaji', 'hapin'].includes(dictInfo.language) ? word.notation ?? word.name : word.name}
                </span>
                <span className="vsc-wordlist-trans">{word.trans?.slice(0, 2).join('；')}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}

// ── Sentence progress panel ─────────────────────────────────────
function SentenceProgressPanel() {
  const dictInfo = useAtomValue(currentDictInfoAtom)
  const dictId = useAtomValue(currentDictIdAtom)
  const [progress, setProgress] = useAtom(sentenceProgressAtom)
  const [, setSentenceJumpTarget] = useAtom(sentenceJumpTargetAtom)
  const sentenceChapterSnapshot = useAtomValue(sentenceChapterSnapshotAtom)
  const { data: wordList } = useSWR(dictInfo.url, wordListFetcher)
  const navigate = useNavigate()
  const activeWordRef = useRef<HTMLDivElement | null>(null)

  const effectiveChapter = progress.dictId === dictId ? progress.chapter : 0
  const effectiveWordIndex = progress.dictId === dictId ? progress.wordIndex : 0

  // Use snapshot (which reflects random order when shuffle is on) when available
  const words = useMemo(() => {
    if (
      sentenceChapterSnapshot.dictId === dictId &&
      sentenceChapterSnapshot.chapter === effectiveChapter &&
      sentenceChapterSnapshot.words.length > 0
    ) {
      return sentenceChapterSnapshot.words
    }
    if (!wordList) return []
    return wordList.slice(effectiveChapter * CHAPTER_LENGTH, (effectiveChapter + 1) * CHAPTER_LENGTH)
  }, [sentenceChapterSnapshot, dictId, effectiveChapter, wordList])

  const totalWords = wordList?.length ?? 0
  const globalIndex = effectiveChapter * CHAPTER_LENGTH + effectiveWordIndex

  // Auto-scroll to current word
  useEffect(() => {
    activeWordRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [effectiveWordIndex])

  const handlePrevChapter = () => {
    if (effectiveChapter > 0) {
      setProgress({ dictId, chapter: effectiveChapter - 1, wordIndex: 0 })
    }
  }
  const handleNextChapter = () => {
    if (effectiveChapter < dictInfo.chapterCount - 1) {
      setProgress({ dictId, chapter: effectiveChapter + 1, wordIndex: 0 })
    }
  }
  const handlePrevWord = () => {
    if (effectiveWordIndex > 0) {
      setProgress({ dictId, chapter: effectiveChapter, wordIndex: effectiveWordIndex - 1 })
    } else if (effectiveChapter > 0) {
      setProgress({ dictId, chapter: effectiveChapter - 1, wordIndex: CHAPTER_LENGTH - 1 })
    }
  }
  const handleNextWord = () => {
    const nextIdx = effectiveWordIndex + 1
    if (nextIdx >= words.length) {
      if (effectiveChapter < dictInfo.chapterCount - 1) {
        setProgress({ dictId, chapter: effectiveChapter + 1, wordIndex: 0 })
      }
    } else {
      setProgress({ dictId, chapter: effectiveChapter, wordIndex: nextIdx })
    }
  }
  const handleJump = useCallback(() => {
    navigate('/sentence-practice')
  }, [navigate])

  return (
    <>
      <div className="vsc-sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="vsc-sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>句子练习进度</span>
        </div>

        {/* Current position */}
        <div style={{ padding: '8px 12px 4px', fontSize: 11, color: 'var(--vsc-text-dim)' }}>
          {dictInfo.name} · 第 {effectiveChapter + 1} 章 · {effectiveWordIndex + 1}/{words.length}
          {totalWords > 0 && <span style={{ marginLeft: 6, opacity: 0.7 }}>({Math.round((globalIndex / totalWords) * 100)}%)</span>}
        </div>

        {/* Current word */}
        {words[effectiveWordIndex] && (
          <div
            className="vsc-wordlist-item vsc-wordlist-item--clickable"
            style={{ margin: '0 8px', borderRadius: 4, border: '1px solid var(--vsc-accent)', padding: '6px 8px' }}
            title="点击前往句子练习"
            onClick={handleJump}
          >
            <span className="vsc-wordlist-name" style={{ fontSize: 13 }}>
              {['romaji', 'hapin'].includes(dictInfo.language)
                ? words[effectiveWordIndex].notation ?? words[effectiveWordIndex].name
                : words[effectiveWordIndex].name}
            </span>
            <span className="vsc-wordlist-trans">{words[effectiveWordIndex].trans?.slice(0, 2).join('；')}</span>
          </div>
        )}

        {/* Word-level navigation */}
        <div style={{ display: 'flex', gap: 6, padding: '8px 12px' }}>
          <button
            onClick={handlePrevWord}
            disabled={effectiveWordIndex === 0 && effectiveChapter === 0}
            style={{
              flex: 1,
              padding: '5px 0',
              fontSize: 11,
              borderRadius: 4,
              background: 'var(--vsc-input-bg)',
              border: '1px solid var(--vsc-border)',
              color: 'var(--vsc-text)',
              cursor: 'pointer',
              opacity: effectiveWordIndex === 0 && effectiveChapter === 0 ? 0.4 : 1,
            }}
          >
            ← 上一词
          </button>
          <button
            onClick={handleNextWord}
            disabled={effectiveChapter >= dictInfo.chapterCount - 1 && effectiveWordIndex >= words.length - 1}
            style={{
              flex: 1,
              padding: '5px 0',
              fontSize: 11,
              borderRadius: 4,
              background: 'var(--vsc-input-bg)',
              border: '1px solid var(--vsc-border)',
              color: 'var(--vsc-text)',
              cursor: 'pointer',
              opacity: effectiveChapter >= dictInfo.chapterCount - 1 && effectiveWordIndex >= words.length - 1 ? 0.4 : 1,
            }}
          >
            下一词 →
          </button>
        </div>

        {/* Chapter navigation */}
        <div style={{ display: 'flex', gap: 6, padding: '0 12px 8px' }}>
          <button
            onClick={handlePrevChapter}
            disabled={effectiveChapter === 0}
            style={{
              flex: 1,
              padding: '4px 0',
              fontSize: 10,
              borderRadius: 4,
              background: 'none',
              border: '1px solid var(--vsc-border)',
              color: 'var(--vsc-text-dim)',
              cursor: 'pointer',
              opacity: effectiveChapter === 0 ? 0.4 : 1,
            }}
          >
            ← 上一章
          </button>
          <button
            onClick={handleNextChapter}
            disabled={effectiveChapter >= dictInfo.chapterCount - 1}
            style={{
              flex: 1,
              padding: '4px 0',
              fontSize: 10,
              borderRadius: 4,
              background: 'none',
              border: '1px solid var(--vsc-border)',
              color: 'var(--vsc-text-dim)',
              cursor: 'pointer',
              opacity: effectiveChapter >= dictInfo.chapterCount - 1 ? 0.4 : 1,
            }}
          >
            下一章 →
          </button>
        </div>

        {/* Word list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
          <div style={{ fontSize: 11, color: 'var(--vsc-text-dim)', padding: '4px 4px 6px' }}>本章单词</div>
          {!wordList ? (
            <div style={{ color: 'var(--vsc-text-dim)', fontSize: 12, padding: '8px 4px' }}>加载中…</div>
          ) : (
            words.map((word, i) => (
              <div
                key={`${word.name}_${i}`}
                ref={i === effectiveWordIndex ? activeWordRef : undefined}
                className="vsc-wordlist-item vsc-wordlist-item--clickable"
                style={{ background: i === effectiveWordIndex ? 'var(--vsc-selection)' : undefined }}
                title="点击从该单词开始句子练习"
                onClick={() => {
                  // Use sentenceJumpTarget so random-mode can resolve the correct shuffled index
                  setProgress({ dictId, chapter: effectiveChapter, wordIndex: 0 })
                  setSentenceJumpTarget({ dictId, word: word.name })
                  navigate('/sentence-practice')
                }}
              >
                <span className="vsc-wordlist-name">
                  {['romaji', 'hapin'].includes(dictInfo.language) ? word.notation ?? word.name : word.name}
                </span>
                <span className="vsc-wordlist-trans">{word.trans?.slice(0, 2).join('；')}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}

// ── Favorites panel ──────────────────────────────────────────────
function FavoritesPanel() {
  const [favorites, setFavorites] = useAtom(favoriteSentencesAtom)
  const [, setCurrentDictId] = useAtom(currentDictIdAtom)
  const [, setProgress] = useAtom(sentenceProgressAtom)
  const [, setSentenceJumpTarget] = useAtom(sentenceJumpTargetAtom)
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const byDict = useMemo(() => {
    const map = new Map<string, FavoriteSentence[]>()
    for (const f of favorites) {
      if (!map.has(f.dictId)) map.set(f.dictId, [])
      map.get(f.dictId)!.push(f)
    }
    return map
  }, [favorites])

  const handleJump = (f: FavoriteSentence) => {
    setCurrentDictId(f.dictId)
    setSentenceJumpTarget({ dictId: f.dictId, word: f.word })
    if (f.sentenceData) {
      cacheSentence(f.dictId, f.word, f.sentenceData).catch(() => {})
    }
    setProgress({ dictId: f.dictId, chapter: f.chapter, wordIndex: f.wordIndex })
    navigate('/sentence-practice')
  }

  const handleDelete = (id: string) => {
    if (confirmDelete === id) {
      setFavorites((prev) => prev.filter((f) => f.id !== id))
      setConfirmDelete(null)
    } else {
      setConfirmDelete(id)
    }
  }

  return (
    <div className="vsc-sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="vsc-sidebar-header">收藏的句子</div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {favorites.length === 0 ? (
          <div style={{ color: 'var(--vsc-text-dim)', fontSize: 12, padding: '16px 12px', textAlign: 'center', lineHeight: '1.6' }}>
            还没有收藏的句子
            <br />
            <span style={{ fontSize: 11, opacity: 0.7 }}>在句子练习中点击 ☆ 收藏</span>
          </div>
        ) : (
          Array.from(byDict.entries()).map(([dictId, favs]) => {
            const dictName = dictionaryResources.find((d) => d.id === dictId)?.name ?? dictId
            return (
              <div key={dictId}>
                <div
                  className="vsc-sidebar-section-header"
                  style={{ padding: '8px 12px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span>{dictName}</span>
                  <span style={{ fontSize: 10, opacity: 0.6 }}>{favs.length}</span>
                </div>
                {favs
                  .slice()
                  .reverse()
                  .map((f) => (
                    <div
                      key={f.id}
                      style={{ padding: '6px 12px', borderBottom: '1px solid var(--vsc-border)', cursor: 'default' }}
                      className="vsc-favorites-item"
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4 }}>
                        <div onClick={() => handleJump(f)} style={{ cursor: 'pointer', minWidth: 0, flex: 1 }}>
                          <div className="vsc-wordlist-name" style={{ fontSize: 12 }}>
                            {f.word}
                          </div>
                          <div
                            className="vsc-wordlist-trans"
                            style={{
                              fontSize: 11,
                              marginTop: 2,
                              overflow: 'hidden',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {f.sentence}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(f.id)}
                          style={{
                            flexShrink: 0,
                            fontSize: 11,
                            padding: '1px 5px',
                            borderRadius: 3,
                            border: confirmDelete === f.id ? 'none' : '1px solid var(--vsc-border)',
                            background: confirmDelete === f.id ? '#c0392b' : 'none',
                            color: confirmDelete === f.id ? '#fff' : 'var(--vsc-text-dim)',
                            cursor: 'pointer',
                          }}
                          title={confirmDelete === f.id ? '再次点击确认删除' : '删除'}
                        >
                          {confirmDelete === f.id ? '确认' : '×'}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ── Explorer panel ───────────────────────────────────────────────
export default function FileExplorer({
  activeFile,
  onSelectFile,
  panel,
  isTypingPage,
}: {
  activeFile: string
  onSelectFile: (name: string) => void
  panel: SidebarPanel | 'errorPractice'
  isTypingPage: boolean
}) {
  const [currentDictId, setCurrentDictId] = useAtom(currentDictIdAtom)
  const setCurrentChapter = useSetAtom(currentChapterAtom)
  const navigate = useNavigate()

  const categories = useMemo(() => groupByCategory(dictionaryResources), [])

  const [expandedCats, setExpandedCats] = useState<Set<string>>(() => {
    const cur = dictionaryResources.find((d) => d.id === currentDictId)
    return new Set(cur ? [cur.category] : ['中国考试'])
  })

  const toggleCat = (cat: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  const handleSelectDict = (id: string) => {
    setCurrentDictId(id)
    setCurrentChapter(0)
    const d = dictionaryResources.find((x) => x.id === id)
    if (d) onSelectFile(`${d.name}.json`)
  }

  const currentDictName = dictionaryResources.find((d) => d.id === currentDictId)?.name ?? 'vocab'

  if (panel === 'search') return <SearchPanel />
  if (panel === 'progress') return isTypingPage ? <WordListPanel /> : <SentenceProgressPanel />
  if (panel === 'favorites') return <FavoritesPanel />
  if (panel === 'errorPractice') return <ErrorPracticePanel isTypingPage={isTypingPage} />

  return (
    <div className="vsc-sidebar">
      <div className="vsc-sidebar-header">资源管理器</div>

      {/* Open Editors */}
      <div className="vsc-sidebar-section">
        <div className="vsc-sidebar-section-header">打开的编辑器</div>

        <div
          className={`vsc-file-item ${activeFile === 'sentence-practice.ts' ? 'vsc-file-item--active' : ''}`}
          style={{ paddingLeft: 24 }}
          onClick={() => navigate('/sentence-practice')}
          title="AI 句子练习"
        >
          <span className="vsc-file-icon vsc-file-icon--ts">TS</span>
          sentence-practice.ts
        </div>

        <div
          className={`vsc-file-item ${activeFile !== 'sentence-practice.ts' ? 'vsc-file-item--active' : ''}`}
          style={{ paddingLeft: 24 }}
          onClick={() => onSelectFile(`${currentDictName}.json`)}
          title={`当前词书: ${currentDictName}`}
        >
          <span className="vsc-file-icon vsc-file-icon--json">{'{}'}</span>
          {currentDictName}.json
        </div>
      </div>

      {/* Dictionary Library */}
      <div className="vsc-sidebar-section" style={{ marginTop: 6 }}>
        <div className="vsc-sidebar-section-header">词书库</div>

        {Array.from(categories.entries()).map(([cat, dicts]) => (
          <div key={cat}>
            <div className="vsc-file-item vsc-file-item--folder" style={{ paddingLeft: 8 }} onClick={() => toggleCat(cat)} title={cat}>
              <span style={{ marginRight: 4, fontSize: 10, opacity: 0.7, flexShrink: 0 }}>{expandedCats.has(cat) ? '▼' : '▶'}</span>
              <span className="vsc-file-icon vsc-file-icon--folder">📁</span>
              <span>{cat}</span>
            </div>

            {expandedCats.has(cat) &&
              dicts.map((d, index) => (
                <div
                  key={`${d.id}_${d.url}_${index}`}
                  className={`vsc-file-item ${currentDictId === d.id ? 'vsc-file-item--active' : ''}`}
                  style={{ paddingLeft: 28 }}
                  onClick={() => handleSelectDict(d.id)}
                  title={d.description}
                >
                  <span className="vsc-file-icon vsc-file-icon--json">{'{}'}</span>
                  <span>{d.name}.json</span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  )
}
