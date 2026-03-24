import styles from './index.module.css'
import { currentDictIdAtom } from '@/store'
import { sentenceErrorCorrectTargetAtom } from '@/store/aiConfig'
import { getErrorBankEntries } from '@/utils/sentenceCacheDB'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import { useAtom, useAtomValue } from 'jotai'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function SentenceErrorPracticeSetting() {
  const dictId = useAtomValue(currentDictIdAtom)
  const [sentenceErrorCorrectTarget, setSentenceErrorCorrectTarget] = useAtom(sentenceErrorCorrectTargetAtom)
  const [errorCount, setErrorCount] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    getErrorBankEntries(dictId)
      .then((entries) => {
        if (!cancelled) setErrorCount(entries.length)
      })
      .catch(() => {
        if (!cancelled) setErrorCount(0)
      })

    return () => {
      cancelled = true
    }
  }, [dictId])

  return (
    <ScrollArea.Root className="flex-1 select-none overflow-y-auto ">
      <ScrollArea.Viewport className="h-full w-full px-3">
        <div className={styles.tabContent}>
          <div className={styles.section}>
            <span className={styles.sectionLabel}>句子移除次数</span>
            <span className={styles.sectionDescription}>错误练习中，连续正确达到该次数后会自动移除该题。</span>
            <div className={styles.block}>
              <label className={styles.blockLabel}>达标次数（1-10）</label>
              <input
                type="number"
                min={1}
                max={10}
                value={sentenceErrorCorrectTarget}
                onChange={(e) => {
                  const next = Number(e.target.value)
                  if (Number.isNaN(next)) return
                  setSentenceErrorCorrectTarget(Math.min(10, Math.max(1, next)))
                }}
                className="w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>
          </div>

          <div className={styles.section}>
            <span className={styles.sectionLabel}>错误练习入口</span>
            <span className={styles.sectionDescription}>先预览当前错词，再进入句子错误练习。</span>
            <div className={styles.block}>
              <button
                type="button"
                onClick={() => navigate('/sentence-practice?mode=errorbank')}
                disabled={errorCount === 0}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                开始错误练习（{errorCount}）
              </button>
            </div>
          </div>
        </div>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar className="flex touch-none select-none bg-transparent " orientation="vertical"></ScrollArea.Scrollbar>
    </ScrollArea.Root>
  )
}
