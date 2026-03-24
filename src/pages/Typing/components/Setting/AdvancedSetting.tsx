import styles from './index.module.css'
import { isShowAnswerOnHoverAtom, isShowPrevAndNextWordAtom, isTextSelectableAtom, randomConfigAtom } from '@/store'
import { Switch } from '@headlessui/react'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import { useAtom } from 'jotai'
import { useCallback } from 'react'

export default function AdvancedSetting() {
  const [isShowPrevAndNextWord, setIsShowPrevAndNextWord] = useAtom(isShowPrevAndNextWordAtom)
  const [isTextSelectable, setIsTextSelectable] = useAtom(isTextSelectableAtom)
  const [isShowAnswerOnHover, setIsShowAnswerOnHover] = useAtom(isShowAnswerOnHoverAtom)
  const [randomConfig, setRandomConfig] = useAtom(randomConfigAtom)

  const onToggleLastAndNextWord = useCallback(
    (checked: boolean) => {
      setIsShowPrevAndNextWord(checked)
    },
    [setIsShowPrevAndNextWord],
  )

  const onToggleTextSelectable = useCallback(
    (checked: boolean) => {
      setIsTextSelectable(checked)
    },
    [setIsTextSelectable],
  )
  const onToggleShowAnswerOnHover = useCallback(
    (checked: boolean) => {
      setIsShowAnswerOnHover(checked)
    },
    [setIsShowAnswerOnHover],
  )

  const onToggleRandom = useCallback(
    (checked: boolean) => {
      setRandomConfig((prev) => ({ ...prev, isOpen: checked }))
    },
    [setRandomConfig],
  )

  return (
    <ScrollArea.Root className="flex-1 select-none overflow-y-auto ">
      <ScrollArea.Viewport className="h-full w-full px-3">
        <div className={styles.tabContent}>
          <div className={styles.section}>
            <span className={styles.sectionLabel}>练习时展示上一个/下一个单词</span>
            <span className={styles.sectionDescription}>开启后，练习中会在上方展示上一个/下一个单词</span>
            <div className={styles.switchBlock}>
              <Switch checked={isShowPrevAndNextWord} onChange={onToggleLastAndNextWord} className="switch-root">
                <span aria-hidden="true" className="switch-thumb" />
              </Switch>
              <span className="text-right text-xs font-normal leading-tight text-gray-600">{`展示单词已${
                isShowPrevAndNextWord ? '开启' : '关闭'
              }`}</span>
            </div>
          </div>
          <div className={styles.section}>
            <span className={styles.sectionLabel}>是否允许选择文本</span>
            <span className={styles.sectionDescription}>开启后，可以通过鼠标选择文本 </span>
            <div className={styles.switchBlock}>
              <Switch checked={isTextSelectable} onChange={onToggleTextSelectable} className="switch-root">
                <span aria-hidden="true" className="switch-thumb" />
              </Switch>
              <span className="text-right text-xs font-normal leading-tight text-gray-600">{`选择文本已${
                isTextSelectable ? '开启' : '关闭'
              }`}</span>
            </div>
          </div>
          <div className={styles.section}>
            <span className={styles.sectionLabel}>是否允许默写模式下显示提示</span>
            <span className={styles.sectionDescription}>开启后，可以通过鼠标 hover 单词显示正确答案 </span>
            <div className={styles.switchBlock}>
              <Switch checked={isShowAnswerOnHover} onChange={onToggleShowAnswerOnHover} className="switch-root">
                <span aria-hidden="true" className="switch-thumb" />
              </Switch>
              <span className="text-right text-xs font-normal leading-tight text-gray-600">{`显示提示已${
                isShowAnswerOnHover ? '开启' : '关闭'
              }`}</span>
            </div>
          </div>
          <div className={styles.section}>
            <span className={styles.sectionLabel}>章节乱序</span>
            <span className={styles.sectionDescription}>开启后，单词练习中本章单词将以固定随机顺序展示。</span>
            <div className={styles.switchBlock}>
              <Switch checked={randomConfig.isOpen} onChange={onToggleRandom} className="switch-root">
                <span aria-hidden="true" className="switch-thumb" />
              </Switch>
              <span className="text-right text-xs font-normal leading-tight text-gray-600">{`随机已${
                randomConfig.isOpen ? '开启' : '关闭'
              }`}</span>
            </div>
          </div>
        </div>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar className="flex touch-none select-none bg-transparent " orientation="vertical"></ScrollArea.Scrollbar>
    </ScrollArea.Root>
  )
}
