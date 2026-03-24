import { currentChapterAtom, currentDictIdAtom, currentDictInfoAtom, reviewModeInfoAtom } from '@/store'
import { wordStrengthenCorrectTargetAtom } from '@/store/aiConfig'
import type { Word } from '@/typings'
import { db } from '@/utils/db'
import { ReviewRecord } from '@/utils/db/record'
import type { IWordRecord } from '@/utils/db/record'
import { wordListFetcher } from '@/utils/wordListFetcher'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useSWR from 'swr'

interface WeakWordEntry {
  word: string
  attempts: number
  consecutiveCleanAfterLastWrong: number
  mastery: number
}

export default function WordStrengthenPage() {
  const dictInfo = useAtomValue(currentDictInfoAtom)
  const dictId = useAtomValue(currentDictIdAtom)
  const setCurrentChapter = useSetAtom(currentChapterAtom)
  const setReviewModeInfo = useSetAtom(reviewModeInfoAtom)
  const [correctTarget] = useAtom(wordStrengthenCorrectTargetAtom)
  const navigate = useNavigate()

  const { data: wordList } = useSWR(dictInfo.url, wordListFetcher)
  const [loading, setLoading] = useState(true)
  const [weakEntries, setWeakEntries] = useState<WeakWordEntry[]>([])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    db.wordRecords
      .where('dict')
      .equals(dictId)
      .toArray()
      .then((records) => {
        if (cancelled) return
        const map = new Map<string, IWordRecord[]>()
        for (const r of records) {
          const entries = map.get(r.word) ?? []
          entries.push(r)
          map.set(r.word, entries)
        }

        const list = Array.from(map.entries())
          .map(([word, wordRecords]) => {
            const sorted = [...wordRecords].sort((a, b) => a.timeStamp - b.timeStamp)
            let attempts = 0
            let cleanAttempts = 0
            let hadWrong = false
            let consecutiveCleanAfterLastWrong = 0

            for (const record of sorted) {
              attempts += 1
              if (record.wrongCount === 0) {
                cleanAttempts += 1
                if (hadWrong) {
                  consecutiveCleanAfterLastWrong += 1
                }
              } else {
                hadWrong = true
                consecutiveCleanAfterLastWrong = 0
              }
            }

            const mastery = attempts > 0 ? Math.round((cleanAttempts / attempts) * 100) : 0
            return {
              word,
              attempts,
              consecutiveCleanAfterLastWrong,
              mastery,
              hadWrong,
            }
          })
          .filter((item) => item.hadWrong && item.consecutiveCleanAfterLastWrong < correctTarget)
          .sort((a, b) => {
            if (a.consecutiveCleanAfterLastWrong !== b.consecutiveCleanAfterLastWrong) {
              return a.consecutiveCleanAfterLastWrong - b.consecutiveCleanAfterLastWrong
            }
            return a.mastery - b.mastery
          })

        setWeakEntries(list)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [dictId, correctTarget])

  const selectableWords = useMemo<Word[]>(() => {
    if (!wordList) return []
    const wordMap = new Map(wordList.map((w) => [w.name, w]))
    return weakEntries.map((item) => wordMap.get(item.word)).filter((w): w is Word => Boolean(w))
  }, [wordList, weakEntries])

  const startStrengthen = useCallback(() => {
    if (selectableWords.length === 0) return

    const record = new ReviewRecord(dictId, selectableWords)
    setCurrentChapter(0)
    setReviewModeInfo({
      isReviewMode: true,
      mode: 'strengthen',
      strengthenTargetCorrectCount: correctTarget,
      reviewRecord: record,
    })
    navigate('/')
  }, [selectableWords, dictId, setCurrentChapter, setReviewModeInfo, correctTarget, navigate])

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-4 px-4 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">需要加强错误练习</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {dictInfo.name} · 连续正确达标 {correctTarget} 次后移除
          </p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          返回练习
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        {loading ? (
          <div className="py-8 text-center text-sm text-gray-400">统计中…</div>
        ) : weakEntries.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">当前没有打错过的单词，继续保持。</div>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">待加强 {weakEntries.length} 个</span>
              <button
                onClick={startStrengthen}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
              >
                开始错误练习
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {weakEntries.map((entry) => (
                <div
                  key={entry.word}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-gray-100 py-2 text-sm dark:border-gray-700"
                >
                  <span className="font-mono text-gray-800 dark:text-gray-100">{entry.word}</span>
                  <span className="text-gray-500 dark:text-gray-400">{entry.mastery}%</span>
                  <span className="text-xs text-gray-400">
                    连续正确 {entry.consecutiveCleanAfterLastWrong}/{correctTarget}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
