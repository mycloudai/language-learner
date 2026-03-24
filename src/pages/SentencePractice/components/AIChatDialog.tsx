import { aiConfigAtom } from '@/store/aiConfig'
import type { LanguageType } from '@/typings'
import { askTeacher } from '@/utils/aiService'
import { useAtomValue } from 'jotai'
import { useCallback, useEffect, useRef, useState } from 'react'

interface Message {
  role: 'user' | 'ai'
  content: string
}

interface Props {
  word: string
  sentence: string
  targetWordUsage: string
  language?: LanguageType
  onClose: () => void
}

export default function AIChatDialog({ word, sentence, targetWordUsage, language, onClose }: Props) {
  const aiConfig = useAtomValue(aiConfigAtom)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async () => {
    const q = input.trim()
    if (!q || loading) return
    setInput('')
    const updated: Message[] = [...messages, { role: 'user', content: q }]
    setMessages(updated)
    setLoading(true)
    try {
      const result = await askTeacher({
        provider: aiConfig.provider,
        apiKey: aiConfig.apiKey,
        baseUrl: aiConfig.baseUrl,
        model: aiConfig.model,
        sentence,
        word,
        targetWordUsage,
        question: q,
        requestMode: 'server',
        language,
      })
      setMessages([...updated, { role: 'ai', content: result.answer }])
    } catch (err) {
      setMessages([...updated, { role: 'ai', content: `出错了：${err instanceof Error ? err.message : String(err)}` }])
    } finally {
      setLoading(false)
    }
  }, [input, messages, loading, aiConfig, sentence, word, targetWordUsage])

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex max-h-[70vh] w-96 flex-col rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800"
      style={{ maxWidth: 'calc(100vw - 2rem)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="shrink-0 text-blue-500"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">向老师提问</span>
          </div>
          <div className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">关于单词 &quot;{word}&quot;</div>
        </div>
        <button
          onClick={onClose}
          className="ml-2 shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Context */}
      <div className="border-b border-gray-100 bg-blue-50/60 px-4 py-2 dark:border-gray-700 dark:bg-blue-900/10">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400">练习句：</div>
        <div className="mt-0.5 line-clamp-2 text-xs italic text-gray-700 dark:text-gray-300">{sentence}</div>
      </div>

      {/* Messages */}
      <div className="min-h-[100px] flex-1 overflow-y-auto px-4 py-3" style={{ maxHeight: 320 }}>
        {messages.length === 0 && (
          <div className="mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
            <div>可以问语法、词义、翻译等问题</div>
            <div className="mt-1 text-gray-300 dark:text-gray-600">例：这个词在这里是什么词性？</div>
          </div>
        )}
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed ${
                  m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                <span className="animate-pulse">老师正在思考…</span>
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 border-t border-gray-200 px-3 py-2 dark:border-gray-700">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendMessage()
            }
          }}
          placeholder="有什么不明白的？"
          className="flex-1 rounded-lg border border-gray-200 bg-transparent px-3 py-1.5 text-sm placeholder-gray-400 outline-none focus:border-blue-400 dark:border-gray-600 dark:text-white dark:placeholder-gray-500"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
        >
          发送
        </button>
      </div>
    </div>
  )
}
