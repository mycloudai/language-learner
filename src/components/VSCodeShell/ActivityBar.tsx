import type { ReactNode } from 'react'

type SidebarPanel = 'explorer' | 'search' | 'progress' | 'favorites'
type SidebarPanelWithError = SidebarPanel | 'errorPractice'

interface Props {
  activePanel: SidebarPanelWithError
  onActivatePanel: (panel: SidebarPanelWithError) => void
  isTypingPage: boolean
}

export default function ActivityBar({ activePanel, onActivatePanel, isTypingPage }: Props) {
  const panelIcons: { id: SidebarPanelWithError; label: string; svg: ReactNode; sentenceOnly?: boolean; errorIcon?: boolean }[] = [
    {
      id: 'explorer',
      label: 'Explorer（词书库）',
      svg: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-7-7z" />
          <path d="M13 2v7h7" />
        </svg>
      ),
    },
    {
      id: 'search',
      label: 'Search（单词搜索）',
      svg: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      ),
      sentenceOnly: true,
    },
    {
      id: 'progress',
      label: isTypingPage ? '打字练习进度' : '句子练习进度',
      svg: isTypingPage ? (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" strokeWidth="2" strokeLinecap="round" />
          <line x1="3" y1="12" x2="3.01" y2="12" strokeWidth="2" strokeLinecap="round" />
          <line x1="3" y1="18" x2="3.01" y2="18" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <line x1="9" y1="9" x2="15" y2="9" />
          <line x1="9" y1="13" x2="13" y2="13" />
        </svg>
      ),
    },
    {
      id: 'favorites',
      label: '收藏的句子',
      svg: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
        </svg>
      ),
      sentenceOnly: true,
    },
    {
      id: 'errorPractice',
      label: isTypingPage ? '单词错误练习' : '句子错误练习',
      svg: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4" strokeLinecap="round" />
          <circle cx="12" cy="16" r="0.5" fill="currentColor" strokeWidth="1" />
          <path d="M4.5 4.5c2-2 5-3 7.5-3" strokeLinecap="round" strokeDasharray="2 2" />
          <path d="M19.5 4.5c2 2 3 5 3 7.5" strokeLinecap="round" strokeDasharray="2 2" />
        </svg>
      ),
      errorIcon: true,
    },
  ]

  return (
    <div className="vsc-activitybar">
      {panelIcons
        .filter((icon) => !('sentenceOnly' in icon && icon.sentenceOnly && isTypingPage))
        .map((icon) => (
          <div
            key={icon.id}
            className={`vsc-activitybar-icon ${activePanel === icon.id ? 'vsc-activitybar-icon--active' : ''}`}
            style={icon.errorIcon ? { color: activePanel === icon.id ? '#ff6b6b' : '#e06c75' } : undefined}
            title={icon.label}
            onClick={() => onActivatePanel(icon.id)}
          >
            {icon.svg}
          </div>
        ))}

      {/* Spacer */}
      <div style={{ flex: 1 }} />
    </div>
  )
}
