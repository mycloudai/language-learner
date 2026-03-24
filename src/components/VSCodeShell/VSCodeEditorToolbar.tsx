/**
 * VSCodeEditorToolbar
 * A thin toolbar rendered INSIDE the Typing page (within TypingContext.Provider).
 * Only visible in VS Code mode. Provides access to key features that are normally
 * in the hidden header: translation toggle, dictation, sound, loop, skip, settings.
 */
import Tooltip from '@/components/Tooltip'
import LoopWordSwitcher from '@/pages/Typing/components/LoopWordSwitcher'
import Setting from '@/pages/Typing/components/Setting/index'
import SoundSwitcher from '@/pages/Typing/components/SoundSwitcher'
import WordDictationSwitcher from '@/pages/Typing/components/WordDictationSwitcher'
import { TypingContext, TypingStateActionType } from '@/pages/Typing/store'
import { CTRL } from '@/utils'
import { useContext } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import IconLanguage from '~icons/tabler/language'
import IconLanguageOff from '~icons/tabler/language-off'

export default function VSCodeEditorToolbar() {
  const ctx = useContext(TypingContext)

  const toggleTrans = () => {
    if (ctx?.dispatch) {
      ctx.dispatch({ type: TypingStateActionType.TOGGLE_TRANS_VISIBLE })
    }
  }

  useHotkeys('ctrl+shift+v', toggleTrans, { enableOnFormTags: true, preventDefault: true }, [ctx])

  return (
    <div className="vsc-editor-toolbar">
      {/* Translation toggle */}
      <Tooltip content={`开关释义显示（${CTRL} + Shift + V）`} placement="bottom">
        <button
          type="button"
          className={`vsc-editor-toolbar-btn ${ctx?.state.isTransVisible ? 'vsc-editor-toolbar-btn--active' : ''}`}
          onClick={toggleTrans}
          title={`开关释义显示 (${CTRL}+Shift+V)`}
        >
          {ctx?.state.isTransVisible ? <IconLanguage /> : <IconLanguageOff />}
        </button>
      </Tooltip>

      <div className="vsc-editor-toolbar-sep" />

      {/* Sound switcher */}
      <Tooltip content="音效设置" placement="bottom">
        <span className="vsc-editor-toolbar-btn">
          <SoundSwitcher />
        </span>
      </Tooltip>

      {/* Loop word */}
      <Tooltip content="设置单个单词循环" placement="bottom">
        <span className="vsc-editor-toolbar-btn">
          <LoopWordSwitcher />
        </span>
      </Tooltip>

      {/* Dictation mode */}
      <Tooltip content={`开关默写模式（${CTRL} + V）`} placement="bottom">
        <span className="vsc-editor-toolbar-btn">
          <WordDictationSwitcher />
        </span>
      </Tooltip>

      <div className="vsc-editor-toolbar-sep" />

      {/* Settings */}
      <Tooltip content="设置" placement="bottom">
        <span className="vsc-editor-toolbar-btn">
          <Setting />
        </span>
      </Tooltip>
    </div>
  )
}
