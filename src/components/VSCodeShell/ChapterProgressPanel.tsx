/**
 * ChapterProgressPanel
 * Modal showing per-chapter completion status for the current dictionary.
 *
 * Unified logic (word AND sentence modes):
 *   "已完成"      chapter practiced ≥1 time  AND  no error-bank entries for that chapter
 *   "有错题待复习" chapter practiced ≥1 time  AND  has error-bank entries for that chapter
 *   "未开始"      chapter never practiced
 *
 * Word mode:     error bank is queried from IndexedDB wordRecords (has chapter field).
 * Sentence mode: full word list is fetched to map error-bank words → chapter index.
 */
import { CHAPTER_LENGTH } from '@/constants'
import { wordStrengthenCorrectTargetAtom } from '@/store/aiConfig'
import { db } from '@/utils/db'
import { getErrorBankEntries } from '@/utils/sentenceCacheDB'
import { wordListFetcher } from '@/utils/wordListFetcher'
import { useAtomValue } from 'jotai'
import { useEffect, useState } from 'react'

interface Props {
  dictId: string
  dictName: string
  dictUrl: string
  chapterCount: number
  isSentencePage: boolean
  finishedWordChapters: number[]
  finishedSentenceChapters: number[]
  onClose: () => void
}

export default function ChapterProgressPanel({
  dictId,
  dictName,
  dictUrl,
  chapterCount,
  isSentencePage,
  finishedWordChapters,
  finishedSentenceChapters,
  onClose,
}: Props) {
  const correctTarget = useAtomValue(wordStrengthenCorrectTargetAtom)
  /**
   * Set of chapter indices that contain ≥1 unmastered error.
   * null = loading in progress.
   */
  const [chaptersWithErrors, setChaptersWithErrors] = useState<Set<number> | null>(null)

  useEffect(() => {
    setChaptersWithErrors(null)

    if (!isSentencePage) {
      // ─── Word mode: use IndexedDB wordRecords (have chapter field) ─────────
      db.wordRecords
        .where('dict')
        .equals(dictId)
        .toArray()
        .then((records) => {
          const sorted = [...records].sort((a, b) => a.timeStamp - b.timeStamp)
          const wordStats = new Map<string, { chapter: number; consecutiveClean: number; hadWrong: boolean }>()
          sorted.forEach((r) => {
            // chapter=-1 means strengthen/review record — still count toward clean streak
            const prev = wordStats.get(r.word) ?? { chapter: -1, consecutiveClean: 0, hadWrong: false }
            const isClean = r.wrongCount === 0
            // Only update the stored chapter from real chapter records
            const chapter = r.chapter !== null && r.chapter >= 0 ? r.chapter : prev.chapter
            wordStats.set(r.word, {
              chapter,
              consecutiveClean: !isClean ? 0 : prev.hadWrong ? prev.consecutiveClean + 1 : 0,
              hadWrong: prev.hadWrong || !isClean,
            })
          })
          const errorChapters = new Set<number>()
          wordStats.forEach(({ chapter, consecutiveClean, hadWrong }) => {
            if (chapter < 0) return // word never appeared in a real chapter
            if (hadWrong && consecutiveClean < correctTarget) {
              errorChapters.add(chapter)
            }
          })
          setChaptersWithErrors(errorChapters)
        })
        .catch(() => setChaptersWithErrors(new Set()))
    } else {
      // ─── Sentence mode: load full word list + error bank, map words → chapters
      Promise.all([wordListFetcher(dictUrl), getErrorBankEntries(dictId)])
        .then(([allWords, errorEntries]) => {
          const errorWordSet = new Set(errorEntries.map((e) => e.word))
          const errorChapters = new Set<number>()
          allWords.forEach((w, idx) => {
            if (errorWordSet.has(w.name)) {
              errorChapters.add(Math.floor(idx / CHAPTER_LENGTH))
            }
          })
          setChaptersWithErrors(errorChapters)
        })
        .catch(() => setChaptersWithErrors(new Set()))
    }
  }, [dictId, dictUrl, isSentencePage, correctTarget])

  const finishedSet = new Set(isSentencePage ? finishedSentenceChapters : finishedWordChapters)
  const isLoaded = chaptersWithErrors !== null
  const completedCount = isLoaded ? Array.from(finishedSet).filter((ch) => !chaptersWithErrors!.has(ch)).length : 0
  const pendingCount = isLoaded ? Array.from(finishedSet).filter((ch) => chaptersWithErrors!.has(ch)).length : 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'var(--vsc-sidebar-bg, #252526)',
          border: '1px solid var(--vsc-border, #3c3c3c)',
          borderRadius: 8,
          padding: '20px 24px',
          minWidth: 340,
          maxWidth: 480,
          maxHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          color: 'var(--vsc-text, #cccccc)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              {isSentencePage ? '句子练习' : '单词练习'}进度 — {dictName}
            </div>
            <div style={{ fontSize: 11, color: 'var(--vsc-text-dim, #858585)', marginTop: 2 }}>
              {isLoaded ? (
                <>
                  已完成 {completedCount} / {chapterCount} 章
                  {pendingCount > 0 && <span style={{ marginLeft: 6, color: '#e5c07b' }}>({pendingCount} 章有错题待复习)</span>}
                </>
              ) : (
                '加载中…'
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 18, lineHeight: 1, padding: 4 }}
          >
            ×
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ background: 'var(--vsc-input-bg, #3c3c3c)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${(completedCount / Math.max(chapterCount, 1)) * 100}%`,
              background: '#4ec9b0',
              borderRadius: 4,
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        {/* Chapter list */}
        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {Array.from({ length: chapterCount }, (_, i) => {
            const isDone = finishedSet.has(i)
            const hasError = isLoaded && chaptersWithErrors!.has(i)

            let statusIcon = '○'
            let statusColor = 'var(--vsc-text-dim, #858585)'
            let statusLabel = '未开始'

            if (isDone) {
              if (!isLoaded) {
                statusIcon = '…'
                statusColor = '#858585'
                statusLabel = '检查中'
              } else if (hasError) {
                statusIcon = '!'
                statusColor = '#e06c75'
                statusLabel = '有错题'
              } else {
                statusIcon = '✓'
                statusColor = '#4ec9b0'
                statusLabel = '已完成'
              }
            }

            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 6px',
                  borderRadius: 4,
                  fontSize: 12,
                  background: isDone ? (hasError ? 'rgba(224,108,117,0.05)' : 'rgba(78,201,176,0.05)') : undefined,
                }}
              >
                <span style={{ color: statusColor, fontWeight: 700, width: 14, textAlign: 'center', flexShrink: 0 }}>{statusIcon}</span>
                <span style={{ flex: 1 }}>第 {i + 1} 章</span>
                <span style={{ fontSize: 10, color: statusColor }}>{statusLabel}</span>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div
          style={{
            fontSize: 10,
            color: 'var(--vsc-text-dim, #858585)',
            borderTop: '1px solid var(--vsc-border, #3c3c3c)',
            paddingTop: 8,
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <span>
            <span style={{ color: '#4ec9b0' }}>✓</span> 已完成（无错题）
          </span>
          <span>
            <span style={{ color: '#e06c75' }}>!</span> 已练习，有错题待复习
          </span>
          <span>
            <span style={{ color: '#858585' }}>○</span> 未开始
          </span>
        </div>
      </div>
    </div>
  )
}
