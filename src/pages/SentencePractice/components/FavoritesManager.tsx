import { dictionaryResources } from '@/resources/dictionary'
import { currentDictIdAtom } from '@/store'
import { sentenceProgressAtom } from '@/store/aiConfig'
import type { FavoriteSentence } from '@/store/favorites'
import { favoriteSentencesAtom } from '@/store/favorites'
import { sentenceJumpTargetAtom } from '@/store/uiState'
import { cacheSentence } from '@/utils/sentenceCacheDB'
import { useAtom } from 'jotai'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function FavoritesManager({ onClose }: { onClose: () => void }) {
  const [favorites, setFavorites] = useAtom(favoriteSentencesAtom)
  const [, setCurrentDictId] = useAtom(currentDictIdAtom)
  const [, setProgress] = useAtom(sentenceProgressAtom)
  const [, setSentenceJumpTarget] = useAtom(sentenceJumpTargetAtom)
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const byDict = useMemo(() => {
    const map = new Map<string, FavoriteSentence[]>()
    for (const f of favorites) {
      if (!map.has(f.dictId)) map.set(f.dictId, [])
      map.get(f.dictId)!.push(f)
    }
    return map
  }, [favorites])

  const handleDelete = (id: string) => {
    if (confirmDelete === id) {
      setFavorites((prev) => prev.filter((f) => f.id !== id))
      setConfirmDelete(null)
    } else {
      setConfirmDelete(id)
    }
  }

  const handlePractice = (f: FavoriteSentence) => {
    setCurrentDictId(f.dictId)
    setSentenceJumpTarget({ dictId: f.dictId, word: f.word })
    if (f.sentenceData) {
      cacheSentence(f.dictId, f.word, f.sentenceData).catch(() => {})
    }
    setProgress({ dictId: f.dictId, chapter: f.chapter, wordIndex: f.wordIndex })
    onClose()
    navigate('/sentence-practice')
  }

  const handleDeleteAll = (dictId: string) => {
    setFavorites((prev) => prev.filter((f) => f.dictId !== dictId))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="flex w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-800"
        style={{ maxHeight: '80vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-500">
              <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">收藏的句子</h2>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
              {favorites.length} 个
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {favorites.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-gray-300 dark:text-gray-600"
              >
                <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
              </svg>
              <div className="text-sm text-gray-400 dark:text-gray-500">还没有收藏的句子</div>
              <div className="text-xs text-gray-300 dark:text-gray-600">在句子练习中点击 ☆ 收藏生成的句子</div>
            </div>
          ) : (
            <div className="space-y-8">
              {Array.from(byDict.entries()).map(([dictId, favs]) => {
                const dictName = dictionaryResources.find((d) => d.id === dictId)?.name ?? dictId
                return (
                  <div key={dictId}>
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">{dictName}</span>
                        <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-400 dark:bg-gray-700 dark:text-gray-500">
                          {favs.length}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteAll(dictId)}
                        className="text-xs text-red-400 hover:text-red-600 dark:hover:text-red-300"
                      >
                        清空该词书
                      </button>
                    </div>

                    <div className="space-y-2">
                      {favs
                        .slice()
                        .reverse()
                        .map((f) => (
                          <div
                            key={f.id}
                            className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-700/50"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">{f.word}</span>
                                <span className="text-xs text-gray-400 dark:text-gray-500">第 {f.chapter + 1} 章</span>
                              </div>
                              <div className="mt-1 line-clamp-2 text-xs italic text-gray-600 dark:text-gray-300">{f.sentence}</div>
                              {f.targetWordUsage && (
                                <div className="mt-1 line-clamp-1 text-xs text-blue-500 dark:text-blue-400">{f.targetWordUsage}</div>
                              )}
                            </div>
                            <div className="flex shrink-0 flex-col gap-1">
                              <button
                                onClick={() => handlePractice(f)}
                                className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
                              >
                                练习
                              </button>
                              <button
                                onClick={() => handleDelete(f.id)}
                                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                                  confirmDelete === f.id
                                    ? 'bg-red-500 text-white'
                                    : 'border border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-500 dark:border-gray-600 dark:text-gray-400'
                                }`}
                              >
                                {confirmDelete === f.id ? '确认删除' : '删除'}
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
