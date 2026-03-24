import { TypingContext, TypingStateActionType } from '../../store'
import AnalysisButton from '../AnalysisButton'
import ErrorBookButton from '../ErrorBookButton'
import HandPositionIllustration from '../HandPositionIllustration'
import LoopWordSwitcher from '../LoopWordSwitcher'
import Setting from '../Setting'
import SoundSwitcher from '../SoundSwitcher'
import WordDictationSwitcher from '../WordDictationSwitcher'
import MasteryAnalysisPanel from '@/components/MasteryAnalysisPanel'
import Tooltip from '@/components/Tooltip'
import { isOpenDarkModeAtom } from '@/store'
import { CTRL } from '@/utils'
import { useAtom } from 'jotai'
import { useContext, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import IconMoon from '~icons/heroicons/moon-solid'
import IconSun from '~icons/heroicons/sun-solid'
import IconLanguage from '~icons/tabler/language'
import IconLanguageOff from '~icons/tabler/language-off'

export default function Switcher() {
  const [isOpenDarkMode, setIsOpenDarkMode] = useAtom(isOpenDarkModeAtom)
  const { state, dispatch } = useContext(TypingContext) ?? {}
  const [showMastery, setShowMastery] = useState(false)

  const changeDarkModeState = () => {
    setIsOpenDarkMode((old) => !old)
  }

  const changeTransVisibleState = () => {
    if (dispatch) {
      dispatch({ type: TypingStateActionType.TOGGLE_TRANS_VISIBLE })
    }
  }

  useHotkeys(
    'ctrl+shift+v',
    () => {
      changeTransVisibleState()
    },
    { enableOnFormTags: true, preventDefault: true },
    [],
  )

  return (
    <>
      <div className="flex items-center justify-center gap-2">
        <Tooltip content="音效设置" placement="bottom">
          <SoundSwitcher />
        </Tooltip>

        <Tooltip className="h-7 w-7" content="设置单个单词循环" placement="bottom">
          <LoopWordSwitcher />
        </Tooltip>

        <Tooltip className="h-7 w-7" content={`开关默写模式（${CTRL} + V）`} placement="bottom">
          <WordDictationSwitcher />
        </Tooltip>
        <Tooltip className="h-7 w-7" content={`开关释义显示（${CTRL} + Shift + V）`} placement="bottom">
          <button
            className={`p-[2px] ${state?.isTransVisible ? 'text-indigo-500' : 'text-gray-500'} text-lg focus:outline-none`}
            type="button"
            onClick={(e) => {
              changeTransVisibleState()
              e.currentTarget.blur()
            }}
            aria-label={`开关释义显示（${CTRL} + Shift + V）`}
          >
            {state?.isTransVisible ? <IconLanguage /> : <IconLanguageOff />}
          </button>
        </Tooltip>

        <Tooltip content="错题本" placement="bottom">
          <ErrorBookButton />
        </Tooltip>

        <Tooltip className="h-7 w-7" content="查看数据统计" placement="bottom">
          <AnalysisButton />
        </Tooltip>

        <Tooltip className="h-7 w-7" content="开关深色模式" placement="bottom">
          <button
            className={`p-[2px] text-lg text-indigo-500 focus:outline-none`}
            type="button"
            onClick={(e) => {
              changeDarkModeState()
              e.currentTarget.blur()
            }}
            aria-label="开关深色模式"
          >
            {isOpenDarkMode ? <IconMoon className="icon" /> : <IconSun className="icon" />}
          </button>
        </Tooltip>
        <Tooltip className="h-7 w-7" content="指法图示" placement="bottom">
          <HandPositionIllustration></HandPositionIllustration>
        </Tooltip>

        <Tooltip className="h-7 w-7" content="单词掌握分析" placement="bottom">
          <button
            className="p-[2px] text-lg text-gray-500 hover:text-blue-500 focus:outline-none"
            type="button"
            onClick={(e) => {
              setShowMastery(true)
              e.currentTarget.blur()
            }}
            aria-label="单词掌握分析"
          >
            <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </button>
        </Tooltip>

        <Tooltip content="设置" placement="bottom">
          <Setting showDialog={false} />
        </Tooltip>
      </div>
      {showMastery && <MasteryAnalysisPanel onClose={() => setShowMastery(false)} />}
    </>
  )
}
