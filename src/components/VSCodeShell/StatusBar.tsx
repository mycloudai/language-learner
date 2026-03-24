import ChapterProgressPanel from './ChapterProgressPanel'
import { LANG_PRON_MAP } from '@/resources/soundResource'
import { currentChapterAtom, currentDictInfoAtom, isReviewModeAtom, phoneticConfigAtom, pronunciationConfigAtom } from '@/store'
import { sentenceProgressAtom } from '@/store/aiConfig'
import { finishedSentenceChaptersAtom, finishedWordChaptersAtom } from '@/store/uiState'
import type { PronunciationType } from '@/typings'
import { PRONUNCIATION_PHONETIC_MAP } from '@/typings'
import { useAtom, useAtomValue } from 'jotai'
import { useCallback, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export default function StatusBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const isSentencePage = location.pathname.startsWith('/sentence')

  const currentDictInfo = useAtomValue(currentDictInfoAtom)
  const isReviewMode = useAtomValue(isReviewModeAtom)
  const [currentChapter, setCurrentChapter] = useAtom(currentChapterAtom)
  const [progress, setProgress] = useAtom(sentenceProgressAtom)

  const [pronunciationConfig, setPronunciationConfig] = useAtom(pronunciationConfigAtom)
  const [phoneticConfig, setPhoneticConfig] = useAtom(phoneticConfigAtom)

  const finishedWordChapters = useAtomValue(finishedWordChaptersAtom)
  const finishedSentenceChapters = useAtomValue(finishedSentenceChaptersAtom)
  const [showProgress, setShowProgress] = useState(false)

  const pronunciationList = useMemo(() => LANG_PRON_MAP[currentDictInfo.language]?.pronunciation ?? [], [currentDictInfo.language])

  // Chapter navigation helpers (kept for reference; direct select onChange replaces prev/next buttons)
  const typingChapterCount = currentDictInfo.chapterCount
  const sentenceChapterCount = currentDictInfo.chapterCount

  const displayChapter = isSentencePage ? progress.chapter : currentChapter
  const displayChapterCount = isSentencePage ? sentenceChapterCount : typingChapterCount

  const onChangePronType = useCallback(
    (pron: PronunciationType) => {
      const item = pronunciationList.find((p) => p.pron === pron)
      if (!item) return
      setPronunciationConfig((old) => ({ ...old, type: item.pron, name: item.name }))
      const phoneticType = PRONUNCIATION_PHONETIC_MAP[pron]
      if (phoneticType) setPhoneticConfig((old) => ({ ...old, type: phoneticType }))
    },
    [pronunciationList, setPronunciationConfig, setPhoneticConfig],
  )

  const togglePronunciation = useCallback(() => {
    setPronunciationConfig((old) => ({ ...old, isOpen: !old.isOpen }))
  }, [setPronunciationConfig])

  const togglePhonetic = useCallback(() => {
    setPhoneticConfig((old) => ({ ...old, isOpen: !old.isOpen }))
  }, [setPhoneticConfig])

  return (
    <>
      <div className="vsc-statusbar">
        <div className="vsc-statusbar-left">
          <div className="vsc-statusbar-item" title="Source Control">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5z" />
            </svg>
            <span>main</span>
          </div>
          <div className="vsc-statusbar-item">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="8" r="4" />
            </svg>
            <span>0</span>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M7 1v6H1v2h6v6h2V9h6V7H9V1z" />
            </svg>
            <span>0</span>
          </div>

          {/* Mode switcher */}
          <div className="vsc-statusbar-item vsc-statusbar-mode" style={{ gap: 0, padding: 0 }}>
            <span
              onClick={() => navigate('/')}
              title="单词打字练习"
              style={{
                padding: '0 8px',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                background: !isSentencePage ? 'rgba(255,255,255,0.15)' : undefined,
                fontWeight: !isSentencePage ? 600 : undefined,
              }}
            >
              ⌨ 单词
            </span>
            <span
              onClick={() => navigate('/sentence-practice')}
              title="AI 句子练习"
              style={{
                padding: '0 8px',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                background: isSentencePage ? 'rgba(255,255,255,0.15)' : undefined,
                fontWeight: isSentencePage ? 600 : undefined,
              }}
            >
              🤖 句子
            </span>
          </div>

          {/* Chapter navigation — dropdown for quick switching */}
          {!isReviewMode && displayChapterCount > 1 && (
            <div className="vsc-statusbar-item" style={{ padding: '0 2px' }}>
              <select
                value={displayChapter}
                onChange={(e) => {
                  const ch = Number(e.target.value)
                  if (isSentencePage) {
                    setProgress((p) => ({ ...p, chapter: ch, wordIndex: 0 }))
                  } else {
                    setCurrentChapter(ch)
                  }
                }}
                title={`第 ${displayChapter + 1} 章 / 共 ${displayChapterCount} 章`}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'inherit',
                  fontSize: 12,
                  cursor: 'pointer',
                  outline: 'none',
                  padding: '0 2px',
                }}
              >
                {Array.from({ length: displayChapterCount }, (_, i) => (
                  <option key={i} value={i} style={{ background: '#1e1e1e', color: '#cccccc' }}>
                    第 {i + 1} 章
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Chapter progress button */}
          {!isReviewMode && (
            <div
              className="vsc-statusbar-item"
              title="查看章节完成进度"
              onClick={() => setShowProgress(true)}
              style={{ cursor: 'pointer', gap: 4 }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span>进度</span>
            </div>
          )}
        </div>

        <div className="vsc-statusbar-right">
          {/* Pronunciation controls - shown on all pages when language has pron list */}
          {pronunciationList.length > 0 && (
            <>
              {/* Phonetic toggle - only relevant on typing page */}
              {!isSentencePage && (
                <>
                  <div
                    className="vsc-statusbar-item"
                    onClick={togglePhonetic}
                    title={`音标 ${phoneticConfig.isOpen ? '已开启' : '已关闭'}`}
                    style={{ opacity: phoneticConfig.isOpen ? 1 : 0.5 }}
                  >
                    <span style={{ fontFamily: 'serif', fontSize: 12 }}>ipa</span>
                  </div>
                </>
              )}

              {/* Pronunciation type selector - shown on all pages */}
              {pronunciationList.map((item) => (
                <div
                  key={item.pron}
                  className="vsc-statusbar-item"
                  onClick={() => onChangePronType(item.pron)}
                  title={`切换到${item.name}`}
                  style={{
                    background: pronunciationConfig.type === item.pron ? 'rgba(255,255,255,0.2)' : undefined,
                    fontWeight: pronunciationConfig.type === item.pron ? 700 : undefined,
                  }}
                >
                  {item.name}
                </div>
              ))}

              {/* Pronunciation on/off */}
              <div
                className="vsc-statusbar-item"
                onClick={togglePronunciation}
                title={`发音 ${pronunciationConfig.isOpen ? '已开启' : '已关闭'}`}
                style={{ opacity: pronunciationConfig.isOpen ? 1 : 0.5 }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                </svg>
              </div>
            </>
          )}

          <div className="vsc-statusbar-item">
            <span>Ln 42, Col 18</span>
          </div>
          <div className="vsc-statusbar-item">
            <span>Spaces: 2</span>
          </div>
          <div className="vsc-statusbar-item">
            <span>UTF-8</span>
          </div>
          <div className="vsc-statusbar-item">
            <span>TypeScript</span>
          </div>
        </div>
      </div>

      {showProgress && (
        <ChapterProgressPanel
          dictId={currentDictInfo.id}
          dictName={currentDictInfo.name}
          dictUrl={currentDictInfo.url}
          chapterCount={currentDictInfo.chapterCount}
          isSentencePage={isSentencePage}
          finishedWordChapters={finishedWordChapters[currentDictInfo.id] ?? []}
          finishedSentenceChapters={finishedSentenceChapters[currentDictInfo.id] ?? []}
          onClose={() => setShowProgress(false)}
        />
      )}
    </>
  )
}
