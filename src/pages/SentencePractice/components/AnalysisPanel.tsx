import type { SentenceData } from '@/utils/aiService'
import { useState } from 'react'

export default function AnalysisPanel({ data }: { data: SentenceData }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        <span>📝 知识点分析</span>
        <svg className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-gray-200 p-4 dark:border-gray-700">
          {/* Grammar Points */}
          {data.grammarPoints.length > 0 && (
            <div className="mb-4">
              <h4 className="mb-2 text-sm font-semibold text-gray-600 dark:text-gray-400">语法点</h4>
              <div className="space-y-2">
                {data.grammarPoints.map((gp, i) => (
                  <div key={i} className="rounded-lg bg-purple-50 px-3 py-2 dark:bg-purple-900/20">
                    <span className="text-sm font-medium text-purple-700 dark:text-purple-300">{gp.point}</span>
                    <p className="mt-0.5 text-sm text-purple-600 dark:text-purple-400">{gp.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vocabulary Notes */}
          {data.vocabNotes.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-600 dark:text-gray-400">词汇注释</h4>
              <div className="space-y-2">
                {data.vocabNotes.map((vn, i) => (
                  <div key={i} className="rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-900/20">
                    <span className="text-sm font-bold text-amber-800 dark:text-amber-300">{vn.word}</span>
                    <span className="ml-2 text-sm text-amber-700 dark:text-amber-300">{vn.explanation}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
