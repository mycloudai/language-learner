import styles from './index.module.css'
import { wordStrengthenCorrectTargetAtom } from '@/store/aiConfig'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import { useAtom } from 'jotai'
import { useNavigate } from 'react-router-dom'

export default function WordStrengthenSetting() {
  const [correctTarget, setCorrectTarget] = useAtom(wordStrengthenCorrectTargetAtom)
  const navigate = useNavigate()

  return (
    <ScrollArea.Root className="flex-1 select-none overflow-y-auto ">
      <ScrollArea.Viewport className="h-full w-full px-3">
        <div className={styles.tabContent}>
          <div className={styles.section}>
            <span className={styles.sectionLabel}>单词移除次数</span>
            <span className={styles.sectionDescription}>错误练习中，单词连续正确达到该次数后会从本轮移除。</span>
            <div className={styles.block}>
              <label className={styles.blockLabel}>达标次数（1-10）</label>
              <input
                type="number"
                min={1}
                max={10}
                value={correctTarget}
                onChange={(e) => {
                  const next = Number(e.target.value)
                  if (Number.isNaN(next)) return
                  setCorrectTarget(Math.min(10, Math.max(1, next)))
                }}
                className="w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>
          </div>

          <div className={styles.section}>
            <span className={styles.sectionLabel}>错误练习入口</span>
            <span className={styles.sectionDescription}>快速进入当前词书的“需要加强”错误练习页面。</span>
            <div className={styles.block}>
              <button
                type="button"
                onClick={() => navigate('/word-strengthen')}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600"
              >
                开始错误练习
              </button>
            </div>
          </div>
        </div>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar className="flex touch-none select-none bg-transparent " orientation="vertical"></ScrollArea.Scrollbar>
    </ScrollArea.Root>
  )
}
