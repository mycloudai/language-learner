import { currentDictIdAtom, currentDictInfoAtom } from '@/store'
import { sentenceErrorCorrectTargetAtom, wordStrengthenCorrectTargetAtom } from '@/store/aiConfig'
import { db } from '@/utils/db'
import { getErrorBankEntries } from '@/utils/sentenceCacheDB'
import { wordListFetcher } from '@/utils/wordListFetcher'
import { useAtomValue } from 'jotai'
import { useEffect, useState } from 'react'
import useSWR from 'swr'

// ── Shared error-bank content ────────────────────────────────────
function ErrorBankContent({
  words,
  totalWords,
  correctTarget,
  emptyMsg,
}: {
  words: { word: string; correctCount: number }[] | null
  totalWords: number
  correctTarget: number
  emptyMsg: string
}) {
  if (words === null) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-400">
        <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        加载中…
      </div>
    )
  }
  if (words.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">
        {emptyMsg}
        <div className="mt-1 text-xs text-gray-300 dark:text-gray-600">答错后会自动加入错题库</div>
      </div>
    )
  }
  const coverage = totalWords > 0 ? Math.round((words.length / totalWords) * 100) : 0
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>错题库总数</span>
        <span className="font-medium text-red-500 dark:text-red-400">{words.length} 词</span>
      </div>
      {totalWords > 0 && (
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>错题覆盖</span>
            <span>{coverage}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
            <div className="h-full rounded-full bg-red-400 transition-all" style={{ width: `${Math.max(1, coverage)}%` }} />
          </div>
        </div>
      )}
      <div className="text-xs text-gray-400 dark:text-gray-500">
        答对 <span className="font-medium text-gray-600 dark:text-gray-300">{correctTarget}</span> 次后移出错题库
      </div>
      <div>
        <div className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
          待复习（{Math.min(words.length, 50)} / {words.length} 个）
        </div>
        <div className="space-y-1.5">
          {words.slice(0, 50).map((w) => (
            <div key={w.word} className="flex items-center gap-3">
              <span className="flex-1 font-mono text-xs text-gray-800 dark:text-gray-200">{w.word}</span>
              <span className="shrink-0 text-[10px] text-gray-400">
                已对 {w.correctCount} / {correctTarget} 次
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Typing tab: derive error bank from IndexedDB wordRecords ─────
function TypingTabContent({ dictId, totalWords, correctTarget }: { dictId: string; totalWords: number; correctTarget: number }) {
  const [words, setWords] = useState<{ word: string; correctCount: number }[] | null>(null)

  useEffect(() => {
    let cancelled = false
    db.wordRecords
      .where('dict')
      .equals(dictId)
      .toArray()
      .then((records) => {
        if (cancelled) return
        const sorted = [...records].sort((a, b) => a.timeStamp - b.timeStamp)
        const stats = new Map<string, { consecutiveClean: number; hadWrong: boolean }>()
        sorted.forEach((r) => {
          const prev = stats.get(r.word) ?? { consecutiveClean: 0, hadWrong: false }
          const isClean = r.wrongCount === 0
          stats.set(r.word, {
            consecutiveClean: !isClean ? 0 : prev.hadWrong ? prev.consecutiveClean + 1 : 0,
            hadWrong: prev.hadWrong || !isClean,
          })
        })
        const result: { word: string; correctCount: number }[] = []
        stats.forEach(({ consecutiveClean, hadWrong }, word) => {
          if (hadWrong && consecutiveClean < correctTarget) {
            result.push({ word, correctCount: consecutiveClean })
          }
        })
        result.sort((a, b) => a.correctCount - b.correctCount)
        setWords(result)
      })
      .catch(() => {
        if (!cancelled) setWords([])
      })
    return () => {
      cancelled = true
    }
  }, [dictId, correctTarget])

  return <ErrorBankContent words={words} totalWords={totalWords} correctTarget={correctTarget} emptyMsg="打字错题库为空，继续加油！" />
}

// ── Sentence tab: use sentenceCacheDB error bank directly ────────
function SentenceTabContent({ dictId, totalWords, correctTarget }: { dictId: string; totalWords: number; correctTarget: number }) {
  const [words, setWords] = useState<{ word: string; correctCount: number }[] | null>(null)

  useEffect(() => {
    let cancelled = false
    getErrorBankEntries(dictId)
      .then((entries) => {
        if (cancelled) return
        setWords(
          entries.map((e) => ({ word: e.word, correctCount: e.errorCorrectCount ?? 0 })).sort((a, b) => a.correctCount - b.correctCount),
        )
      })
      .catch(() => {
        if (!cancelled) setWords([])
      })
    return () => {
      cancelled = true
    }
  }, [dictId])

  return <ErrorBankContent words={words} totalWords={totalWords} correctTarget={correctTarget} emptyMsg="句子错题库为空，继续加油！" />
}

// ── Main panel ───────────────────────────────────────────────────
export default function MasteryAnalysisPanel({
  onClose,
  defaultTab = 'typing',
}: {
  onClose: () => void
  defaultTab?: 'typing' | 'sentence'
}) {
  const dictId = useAtomValue(currentDictIdAtom)
  const dictInfo = useAtomValue(currentDictInfoAtom)
  const { data: wordList } = useSWR(dictInfo.url, wordListFetcher)
  const wordCorrectTarget = useAtomValue(wordStrengthenCorrectTargetAtom)
  const sentenceCorrectTarget = useAtomValue(sentenceErrorCorrectTargetAtom)
  const [tab, setTab] = useState<'typing' | 'sentence'>(defaultTab)
  const totalWords = wordList?.length ?? 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-800"
        style={{ maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">错题库</h2>
              <p className="text-xs text-gray-400">{dictInfo.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {(['typing', 'sentence'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                tab === t
                  ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {t === 'typing' ? '⌨️ 打字练习' : '💬 句子练习'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === 'typing' ? (
            <TypingTabContent dictId={dictId} totalWords={totalWords} correctTarget={wordCorrectTarget} />
          ) : (
            <SentenceTabContent dictId={dictId} totalWords={totalWords} correctTarget={sentenceCorrectTarget} />
          )}
        </div>
      </div>
    </div>
  )
}
