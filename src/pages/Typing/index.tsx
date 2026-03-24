import Layout from '../../components/Layout'
import { DictChapterButton } from './components/DictChapterButton'
import PronunciationSwitcher from './components/PronunciationSwitcher'
import ResultScreen from './components/ResultScreen'
import Speed from './components/Speed'
import StartButton from './components/StartButton'
import Switcher from './components/Switcher'
import WordList from './components/WordList'
import WordPanel from './components/WordPanel'
import { useConfetti } from './hooks/useConfetti'
import { useWordList } from './hooks/useWordList'
import { TypingContext, TypingStateActionType, initialState, typingReducer } from './store'
import Header from '@/components/Header'
import Tooltip from '@/components/Tooltip'
import VSCodeEditorToolbar from '@/components/VSCodeShell/VSCodeEditorToolbar'
import { idDictionaryMap } from '@/resources/dictionary'
import {
  currentChapterAtom,
  currentDictIdAtom,
  isReviewModeAtom,
  randomConfigAtom,
  reviewModeInfoAtom,
  typingChapterSnapshotAtom,
  typingWordIndexAtom,
  typingWordIndexJumpTokenAtom,
} from '@/store'
import { finishedWordChaptersAtom, wordStrengthenRefreshTokenAtom } from '@/store/uiState'
import { IsDesktop, isLegal } from '@/utils'
import { useSaveChapterRecord } from '@/utils/db'
import { useMixPanelChapterLogUploader } from '@/utils/mixpanel'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useImmerReducer } from 'use-immer'

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

const App: React.FC = () => {
  const [state, dispatch] = useImmerReducer(typingReducer, structuredClone(initialState))
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const { words } = useWordList()
  const navigate = useNavigate()

  const [currentDictId, setCurrentDictId] = useAtom(currentDictIdAtom)
  const [currentChapter, setCurrentChapter] = useAtom(currentChapterAtom)
  const [typingWordIndex, setTypingWordIndex] = useAtom(typingWordIndexAtom)
  const typingWordIndexJumpToken = useAtomValue(typingWordIndexJumpTokenAtom)
  const setTypingChapterSnapshot = useSetAtom(typingChapterSnapshotAtom)
  const randomConfig = useAtomValue(randomConfigAtom)
  const chapterLogUploader = useMixPanelChapterLogUploader(state)
  const saveChapterRecord = useSaveChapterRecord()

  const reviewModeInfo = useAtomValue(reviewModeInfoAtom)
  const isReviewMode = useAtomValue(isReviewModeAtom)
  const setReviewModeInfo = useSetAtom(reviewModeInfoAtom)
  const setFinishedWordChapters = useSetAtom(finishedWordChaptersAtom)
  const bumpStrengthenRefresh = useSetAtom(wordStrengthenRefreshTokenAtom)

  useEffect(() => {
    // 检测用户设备
    if (!IsDesktop()) {
      setTimeout(() => {
        alert(
          ' MyCloudAI Learner 目的为提高键盘工作者的英语输入效率，目前暂未适配移动端，希望您使用桌面端浏览器访问。如您使用的是 Ipad 等平板电脑设备，可以使用外接键盘使用本软件。',
        )
      }, 500)
    }
  }, [])

  // 在组件挂载和currentDictId改变时，检查当前字典是否存在，如果不存在，则将其重置为默认值
  useEffect(() => {
    const id = currentDictId
    if (!(id in idDictionaryMap)) {
      setCurrentDictId('cet4')
      setCurrentChapter(0)
      return
    }
  }, [currentDictId, setCurrentChapter, setCurrentDictId])

  const skipWord = useCallback(() => {
    dispatch({ type: TypingStateActionType.SKIP_WORD })
  }, [dispatch])

  useEffect(() => {
    const onBlur = () => {
      dispatch({ type: TypingStateActionType.SET_IS_TYPING, payload: false })
    }
    window.addEventListener('blur', onBlur)

    return () => {
      window.removeEventListener('blur', onBlur)
    }
  }, [dispatch])

  useEffect(() => {
    state.chapterData.words?.length > 0 ? setIsLoading(false) : setIsLoading(true)
  }, [state.chapterData.words])

  useEffect(() => {
    if (!state.isTyping) {
      const onKeyDown = (e: KeyboardEvent) => {
        if (isEditableTarget(e.target)) return

        if (!isLoading && e.key !== 'Enter' && (isLegal(e.key) || e.key === ' ') && !e.altKey && !e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          dispatch({ type: TypingStateActionType.SET_IS_TYPING, payload: true })
        }
      }
      window.addEventListener('keydown', onKeyDown)

      return () => window.removeEventListener('keydown', onKeyDown)
    }
  }, [state.isTyping, isLoading, dispatch])

  useEffect(() => {
    if (words !== undefined) {
      const initialIndex = isReviewMode && reviewModeInfo.reviewRecord?.index ? reviewModeInfo.reviewRecord.index : typingWordIndex

      dispatch({
        type: TypingStateActionType.SETUP_CHAPTER,
        payload: {
          words,
          shouldShuffle: randomConfig.isOpen,
          initialIndex,
          strengthenConfig: {
            enabled: isReviewMode && reviewModeInfo.mode === 'strengthen',
            targetCorrectCount: reviewModeInfo.strengthenTargetCorrectCount ?? 2,
          },
        },
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words])

  useEffect(() => {
    // 当用户完成章节后且完成 word Record 数据保存，记录 chapter Record 数据,
    if (state.isFinished && !state.isSavingRecord) {
      chapterLogUploader()
      saveChapterRecord(state)
      // Reset word index on chapter completion
      setTypingWordIndex(0)
      // Mark chapter as finished (only in normal practice, not review/strengthen mode)
      if (!isReviewMode) {
        setFinishedWordChapters((prev) => {
          const existing = prev[currentDictId] ?? []
          if (existing.includes(currentChapter)) return prev
          return { ...prev, [currentDictId]: [...existing, currentChapter] }
        })
      }
      // After strengthen session completes, reliably bump the sidebar error panel refresh token.
      // We do it here (parent component) because WordPanel is already unmounted when isFinished=true,
      // so its own effect would never fire.
      if (state.strengthenSession.enabled) {
        bumpStrengthenRefresh((t) => t + 1)
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isFinished, state.isSavingRecord])

  // Persist word index as the user progresses
  useEffect(() => {
    if (state.chapterData.words.length > 0 && !state.isFinished) {
      setTypingWordIndex(state.chapterData.index)
    }
  }, [state.chapterData.index, state.chapterData.words.length, state.isFinished, setTypingWordIndex])

  // Keep sidebar progress list in sync with the real runtime order (including random mode).
  // Skip during strengthen session so the chapter word list stays intact in the sidebar.
  useEffect(() => {
    if (state.strengthenSession.enabled) return
    setTypingChapterSnapshot({
      dictId: currentDictId,
      chapter: currentChapter,
      words: state.chapterData.words,
    })
  }, [currentDictId, currentChapter, state.chapterData.words, state.strengthenSession.enabled, setTypingChapterSnapshot])

  // Apply jump only when sidebar explicitly requests it, avoid fighting normal NEXT_WORD flow.
  const lastHandledJumpTokenRef = useRef(0)
  useEffect(() => {
    if (typingWordIndexJumpToken <= 0) return
    if (typingWordIndexJumpToken === lastHandledJumpTokenRef.current) return
    lastHandledJumpTokenRef.current = typingWordIndexJumpToken
    if (state.chapterData.words.length === 0 || state.isFinished) return
    const clampedIndex = Math.max(0, Math.min(typingWordIndex, state.chapterData.words.length - 1))
    if (clampedIndex === state.chapterData.index) return
    dispatch({ type: TypingStateActionType.SKIP_2_WORD_INDEX, newIndex: clampedIndex })
  }, [dispatch, state.chapterData.index, state.chapterData.words.length, state.isFinished, typingWordIndex, typingWordIndexJumpToken])

  useEffect(() => {
    // 启动计时器
    let intervalId: number
    if (state.isTyping) {
      intervalId = window.setInterval(() => {
        dispatch({ type: TypingStateActionType.TICK_TIMER })
      }, 1000)
    }
    return () => clearInterval(intervalId)
  }, [state.isTyping, dispatch])

  useConfetti(state.isFinished && !state.strengthenSession.enabled)

  const handleExitStrengthen = useCallback(() => {
    setCurrentChapter(0)
    setReviewModeInfo((old) => ({ ...old, isReviewMode: false, mode: 'classic', reviewRecord: undefined }))
    navigate('/')
  }, [setCurrentChapter, setReviewModeInfo, navigate])

  const isStrengthenFinished = state.isFinished && state.strengthenSession.enabled

  return (
    <TypingContext.Provider value={{ state: state, dispatch }}>
      {state.isFinished && !state.strengthenSession.enabled && <ResultScreen />}
      {isStrengthenFinished && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl dark:bg-gray-800">
            <div className="mb-4 text-5xl">🎉</div>
            <h3 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">太棒了！</h3>
            <p className="mb-1 text-gray-600 dark:text-gray-300">本轮错误练习已全部完成</p>
            <p className="mb-6 text-sm text-gray-400 dark:text-gray-500">共 {state.chapterData.wordCount} 次练习，继续保持！</p>
            <button
              onClick={handleExitStrengthen}
              className="w-full rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white shadow-sm hover:bg-orange-600"
            >
              返回单词练习
            </button>
          </div>
        </div>
      )}
      <Layout>
        <Header>
          <DictChapterButton />
          <PronunciationSwitcher />
          <Switcher />
          <StartButton isLoading={isLoading} />
          <Tooltip content="跳过该词">
            <button
              className={`${
                state.isShowSkip ? 'bg-orange-400' : 'invisible w-0 bg-gray-300 px-0 opacity-0'
              } my-btn-primary transition-all duration-300 `}
              onClick={skipWord}
            >
              Skip
            </button>
          </Tooltip>
        </Header>
        {/* VS Code mode toolbar — replaces the hidden header controls */}
        <VSCodeEditorToolbar />
        <div className="container mx-auto flex h-full flex-1 flex-col items-center justify-center pb-5">
          <div className="container relative mx-auto flex h-full flex-col items-center">
            <div className="container flex flex-grow items-center justify-center">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center ">
                  <div
                    className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid  border-indigo-400 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                    role="status"
                  ></div>
                </div>
              ) : (
                !state.isFinished && <WordPanel />
              )}
            </div>
            <Speed />
          </div>
        </div>
      </Layout>
      <WordList />
    </TypingContext.Provider>
  )
}

export default App
