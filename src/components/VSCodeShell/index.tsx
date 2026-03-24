import ActivityBar from './ActivityBar'
import EditorTabs from './EditorTabs'
import FileExplorer from './FileExplorer'
import StatusBar from './StatusBar'
import TitleBar from './TitleBar'
import './vscode.css'
import { currentDictInfoAtom, isReviewModeAtom, reviewModeInfoAtom } from '@/store'
import { useAtomValue, useSetAtom } from 'jotai'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

// Sanitize HTML special chars so dictInfo values are XSS-safe
function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Build a fake TypeScript code scaffold HTML string (syntax-highlighted)
function makeScaffoldHtml(dictId: string, dictName: string): string {
  const id = esc(dictId)
  const name = esc(dictName)
  const kw = (t: string) => `<span style="color:#569cd6">${t}</span>`
  const str = (t: string) => `<span style="color:#ce9178">${t}</span>`
  const cmt = (t: string) => `<span style="color:#6a9955">${t}</span>`
  const typ = (t: string) => `<span style="color:#4ec9b0">${t}</span>`
  const fn = (t: string) => `<span style="color:#dcdcaa">${t}</span>`
  const num = (t: string) => `<span style="color:#b5cea8">${t}</span>`
  const prop = (t: string) => `<span style="color:#9cdcfe">${t}</span>`
  const lines = [
    `${kw('import')} { ${typ('WordTrainer')}, ${typ('SessionConfig')}, ${typ('ProgressTracker')} } ${kw('from')} ${str(
      `'./${id}.service'`,
    )}`,
    `${kw('import')} { ${typ('PronunciationEngine')} } ${kw('from')} ${str("'@/audio/pronunciation'")}`,
    `${kw('import type')} { ${typ('WordEntry')}, ${typ('ChapterStats')} } ${kw('from')} ${str("'../types'")}`,
    ``,
    cmt(`// ─────────────────────────────────────────────`),
    cmt(`//  ${name}  —  Vocabulary Practice Session`),
    cmt(`// ─────────────────────────────────────────────`),
    ``,
    `${kw('const')} config: ${typ('SessionConfig')} = {`,
    `  ${prop('dictId')}: ${str(`'${id}'`)},`,
    `  ${prop('mode')}: ${str("'active'")},`,
    `  ${prop('maxRetries')}: ${num('3')},`,
    `  ${prop('shuffleWords')}: ${kw('false')},`,
    `}`,
    ``,
    `${kw('const')} trainer = ${kw('new')} ${typ('WordTrainer')}(config)`,
    `${kw('const')} audio  = ${kw('new')} ${typ('PronunciationEngine')}({ ${prop('locale')}: ${str("'en-US'")} })`,
    ``,
    cmt('/**'),
    cmt(' * Type each word accurately to advance to the next.'),
    cmt(' * Press  Tab  to reveal the translation hint.'),
    cmt(' * Press  Ctrl+J  to hear the pronunciation.'),
    cmt(' */'),
    `${kw('async function')} ${fn('practice')}(${prop('entry')}: ${typ('WordEntry')}): ${typ('Promise')}<${typ('ChapterStats')}> {`,
    `  ${kw('const')} { ${prop('word')}, ${prop('trans')}, ${prop('usphone')} } = ${prop('entry')}`,
    ``,
    cmt('  // ▼ type the highlighted word below to continue ▼'),
    ``,
    `  ${kw('await')} audio.${fn('speak')}(${prop('word')}, { ${prop('rate')}: ${num('0.85')} })`,
    `  ${kw('await')} trainer.${fn('record')}({ ${prop('word')}, ${prop('correct')}: ${kw('true')}, ${prop('timeMs')}: ${num('0')} })`,
    `  ${kw('return')} trainer.${fn('getStats')}()`,
    `}`,
    ``,
    `${kw('const')} ${prop('session')} = ${kw('await')} ${fn('practice')}(trainer.${fn('current')}())`,
    cmt('// ›  0 errors  ·  streak: 7  ·  wpm: 42'),
    `${fn('console')}.${fn('log')}(${str("'Chapter complete:'")}, ${prop('session')})`,
    `trainer.${fn('start')}()`,
    `  .${fn('then')}((${prop('stats')}) => ${fn('console')}.${fn('log')}(${str("'Done'")} , ${prop('stats')}))`,
    `  .${fn('catch')}((${prop('err')})  => ${fn('console')}.${fn('error')}(${prop('err')}))`,
  ]
  return lines.join('\n')
}

// Build a fake Python/TypeScript AI inference scaffold for sentence practice
function makeSentenceScaffoldHtml(dictId: string): string {
  const id = esc(dictId)
  const kw = (t: string) => `<span style="color:#569cd6">${t}</span>`
  const str = (t: string) => `<span style="color:#ce9178">${t}</span>`
  const cmt = (t: string) => `<span style="color:#6a9955">${t}</span>`
  const typ = (t: string) => `<span style="color:#4ec9b0">${t}</span>`
  const fn = (t: string) => `<span style="color:#dcdcaa">${t}</span>`
  const num = (t: string) => `<span style="color:#b5cea8">${t}</span>`
  const prop = (t: string) => `<span style="color:#9cdcfe">${t}</span>`
  const lines = [
    `${kw('import')} { ${typ('OpenAI')} } ${kw('from')} ${str("'openai'")}`,
    `${kw('import')} { ${typ('SentenceCache')} } ${kw('from')} ${str(`'./${id}.cache'`)}`,
    ``,
    cmt('// Sentence-practice AI inference pipeline'),
    ``,
    `${kw('const')} client = ${kw('new')} ${typ('OpenAI')}({ ${prop('apiKey')}: ${fn('process')}.${prop('env')}.${prop(
      'OPENAI_API_KEY',
    )} })`,
    `${kw('const')} cache  = ${kw('new')} ${typ('SentenceCache')}({ ${prop('ttl')}: ${num('86400')} })`,
    ``,
    `${kw('interface')} ${typ('SentenceResult')} {`,
    `  ${prop('sentence')}      : ${kw('string')}`,
    `  ${prop('translation')}   : ${kw('string')}`,
    `  ${prop('targetWord')}    : ${kw('string')}`,
    `  ${prop('vocabNotes')}    : ${typ('VocabNote')}[]`,
    `  ${prop('targetWordUsage')}: ${kw('string')}`,
    `}`,
    ``,
    `${kw('async function')} ${fn('generateSentence')}(`,
    `  ${prop('word')}      : ${kw('string')},`,
    `  ${prop('definition')}: ${kw('string')},`,
    `  ${prop('difficulty')}: ${str("'easy'")} | ${str("'medium'")} | ${str("'hard'")}`,
    `): ${typ('Promise')}<${typ('SentenceResult')}> {`,
    ``,
    `  ${kw('const')} ${prop('cached')} = ${kw('await')} cache.${fn('get')}(${prop('word')}, ${prop('difficulty')})`,
    `  ${kw('if')} (${prop('cached')}) ${kw('return')} ${prop('cached')}`,
    ``,
    `  ${kw('const')} ${prop('response')} = ${kw('await')} client.chat.completions.${fn('create')}({`,
    `    ${prop('model')}: ${str("'gpt-4o-mini'")},`,
    `    ${prop('messages')}: [{ ${prop('role')}: ${str("'user'")}, ${prop('content')}: ${fn('buildPrompt')}(${prop('word')}) }],`,
    `    ${prop('temperature')}: ${num('0.7')},`,
    `  })`,
    ``,
    `  ${kw('const')} ${prop('result')} = ${fn('parseResponse')}(${prop('response')}.choices[${num('0')}].message.content!)`,
    `  ${kw('await')} cache.${fn('set')}(${prop('word')}, ${prop('difficulty')}, ${prop('result')})`,
    `  ${kw('return')} ${prop('result')}`,
    `}`,
  ]
  return lines.join('\n')
}

export default function VSCodeShell({ children }: { children: ReactNode }) {
  const [sidebarPanel, setSidebarPanel] = useState<'explorer' | 'search' | 'progress' | 'favorites' | 'errorPractice'>('explorer')
  const dictInfo = useAtomValue(currentDictInfoAtom)
  const reviewModeInfo = useAtomValue(reviewModeInfoAtom)
  const isReviewMode = useAtomValue(isReviewModeAtom)
  const setReviewModeInfo = useSetAtom(reviewModeInfoAtom)
  const location = useLocation()
  const navigate = useNavigate()
  const isSentencePage = location.pathname.startsWith('/sentence-practice') || location.pathname === '/sentence-strengthen'
  const isSentenceErrorMode =
    location.pathname === '/sentence-strengthen' ||
    (location.pathname.startsWith('/sentence-practice') && new URLSearchParams(location.search).get('mode') === 'errorbank')
  const isWordErrorMode = location.pathname === '/word-strengthen'
  const isTypingPage = location.pathname === '/'
  const isWordMode = !isSentencePage
  // User is actively practicing strengthen mode on the typing page
  const isWordInStrengthenMode = isTypingPage && isReviewMode && reviewModeInfo.mode === 'strengthen'

  const handleActivatePanel = useCallback(
    (panel: 'explorer' | 'search' | 'progress' | 'favorites' | 'errorPractice') => {
      if (panel === 'errorPractice') {
        // Toggle: clicking the icon while already in that mode exits it
        if (isSentenceErrorMode) {
          navigate('/sentence-practice')
          // useEffect else-branch will reset panel to 'explorer'
          return
        }
        if (isWordErrorMode) {
          navigate('/')
          return
        }
        if (isWordInStrengthenMode) {
          setReviewModeInfo((old) => ({ ...old, isReviewMode: false, mode: 'classic', reviewRecord: undefined }))
          // useEffect else-branch will reset panel to 'explorer'
          return
        }
        // Enter error practice mode
        if (isSentencePage) {
          navigate('/sentence-strengthen')
        } else {
          navigate('/word-strengthen')
        }
        setSidebarPanel('errorPractice')
        return
      }

      if (isSentenceErrorMode) {
        navigate('/sentence-practice')
      } else if (isWordErrorMode) {
        navigate('/')
      } else if (isWordInStrengthenMode) {
        // Exit strengthen mode when user clicks another sidebar panel
        setReviewModeInfo((old) => ({ ...old, isReviewMode: false, mode: 'classic', reviewRecord: undefined }))
      }
      setSidebarPanel(panel)
    },
    [isSentenceErrorMode, isSentencePage, isWordErrorMode, isWordInStrengthenMode, navigate, setReviewModeInfo],
  )

  useEffect(() => {
    if (isSentenceErrorMode || isWordErrorMode || isWordInStrengthenMode) {
      setSidebarPanel('errorPractice')
    } else {
      // When leaving any error-practice mode, reset icon back to explorer
      setSidebarPanel((prev) => (prev === 'errorPractice' ? 'explorer' : prev))
    }
  }, [isSentenceErrorMode, isWordErrorMode, isWordInStrengthenMode])

  const safeName = useMemo(() => dictInfo.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'vocabulary', [dictInfo.name])

  const openFiles = useMemo(() => [`${safeName}Service.ts`, 'apiClient.ts', 'config.ts'], [safeName])
  const [activeFile, setActiveFile] = useState(openFiles[0])

  useEffect(() => {
    setActiveFile(openFiles[0])
  }, [openFiles])

  // Sidebar resize
  const SIDEBAR_MIN = 160
  const SIDEBAR_MAX = 420
  const [sidebarWidth, setSidebarWidth] = useState(220)
  const isDragging = useRef(false)
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(220)

  const onDragMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      isDragging.current = true
      dragStartX.current = e.clientX
      dragStartWidth.current = sidebarWidth
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      const onMouseMove = (me: MouseEvent) => {
        if (!isDragging.current) return
        const delta = me.clientX - dragStartX.current
        const next = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, dragStartWidth.current + delta))
        setSidebarWidth(next)
      }

      const onMouseUp = () => {
        isDragging.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [sidebarWidth],
  )

  // Always apply vscode-mode class + force dark mode
  useEffect(() => {
    document.documentElement.classList.add('vscode-mode', 'dark')
  }, [])

  // Line numbers for decoration — more for sentence page
  const lineNumbers = useMemo(() => Array.from({ length: 120 }, (_, i) => i + 1), [])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundColor: 'var(--vsc-bg)',
      }}
    >
      <TitleBar filename={activeFile} />

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <ActivityBar activePanel={sidebarPanel} onActivatePanel={handleActivatePanel} isTypingPage={isWordMode} />

        {/* Sidebar with drag-to-resize handle */}
        <div style={{ display: 'flex', flexShrink: 0, position: 'relative', minHeight: 0 }}>
          <div style={{ width: sidebarWidth, display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
            <FileExplorer activeFile={activeFile} onSelectFile={setActiveFile} panel={sidebarPanel} isTypingPage={isWordMode} />
          </div>
          {/* Drag handle */}
          <div
            onMouseDown={onDragMouseDown}
            style={{
              width: 4,
              cursor: 'col-resize',
              background: 'var(--vsc-border)',
              flexShrink: 0,
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'var(--vsc-accent)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'var(--vsc-border)')}
            title="拖拽调整侧边栏宽度"
          />
        </div>

        <div className="vsc-editor-area">
          <EditorTabs activeFile={activeFile} openFiles={openFiles} onSelectFile={setActiveFile} />

          <div className="vsc-breadcrumb">
            <span>src</span>
            <span className="vsc-breadcrumb-separator">›</span>
            <span>{isSentencePage ? 'ai' : 'services'}</span>
            <span className="vsc-breadcrumb-separator">›</span>
            <span>{activeFile}</span>
          </div>

          <div className="vsc-editor-content">
            <div className="vsc-line-numbers">
              {lineNumbers.map((n) => (
                <div key={n} className={n === 42 ? 'active' : ''}>
                  {n}
                </div>
              ))}
            </div>

            <div className={`vsc-editor-main${isTypingPage ? '' : ' vsc-editor-main--full'}`} style={{ position: 'relative' }}>
              {/* Code scaffold — typing page: word trainer boilerplate; sentence page: AI inference code */}
              {/* eslint-disable-next-line react/no-danger */}
              <pre
                aria-hidden
                style={{
                  position: 'absolute',
                  inset: 0,
                  margin: 0,
                  padding: '8px 16px',
                  pointerEvents: 'none',
                  overflow: 'hidden',
                  zIndex: 0,
                  opacity: isTypingPage ? 0.38 : 0.22,
                  fontFamily: "'Menlo', 'Monaco', 'Consolas', monospace",
                  fontSize: '13px',
                  lineHeight: '22px',
                  background: 'none',
                  color: '#d4d4d4',
                  whiteSpace: 'pre',
                }}
                dangerouslySetInnerHTML={{
                  __html: isSentencePage ? makeSentenceScaffoldHtml(dictInfo.id) : makeScaffoldHtml(dictInfo.id, dictInfo.name),
                }}
              />
              <div
                style={{
                  position: 'relative',
                  zIndex: 1,
                  width: '100%',
                  height: isTypingPage ? '100%' : 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isTypingPage ? 'center' : 'stretch',
                  justifyContent: isTypingPage ? 'center' : 'flex-start',
                }}
              >
                {children}
              </div>
            </div>

            <div className="vsc-minimap">
              {[12, 35, 60, 80, 110, 140, 170].map((top) => (
                <div
                  key={top}
                  className="vsc-minimap-block"
                  style={{
                    top: `${top}px`,
                    height: `${10 + Math.random() * 30}px`,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="vsc-panel">
            <div className="vsc-panel-tabs">
              <div className="vsc-panel-tab">Problems</div>
              <div className="vsc-panel-tab">Output</div>
              <div className="vsc-panel-tab vsc-panel-tab--active">Terminal</div>
              <div className="vsc-panel-tab">Debug Console</div>
            </div>
            <div className="vsc-panel-content">
              <div>
                <span className="vsc-terminal-prompt">~/vocabulary-trainer $</span> <span className="vsc-terminal-cmd">npm run dev</span>
              </div>
              <div style={{ color: '#569cd6' }}>VITE v5.0.0 ready in 320 ms</div>
              <div>
                <span style={{ color: '#6a9955' }}>➜</span> Local: <span style={{ color: '#569cd6' }}>http://localhost:5173/</span>
              </div>
              <div>
                <span style={{ color: '#6a9955' }}>➜</span> Network: <span style={{ color: '#569cd6' }}>http://192.168.1.42:5173/</span>
              </div>
              <div style={{ marginTop: 4 }}>
                <span className="vsc-terminal-prompt">~/vocabulary-trainer $</span>{' '}
                <span className="vsc-terminal-cmd" style={{ animation: 'blink 1s step-end infinite' }}>
                  ▊
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <StatusBar />
    </div>
  )
}
