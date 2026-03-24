import type { FavoriteSentence } from '@/store/favorites'
import { favoriteSentencesAtom } from '@/store/favorites'
import type { ISentenceCacheEntry } from '@/utils/sentenceCacheDB'
import { getAllCacheEntries, removeCacheEntries } from '@/utils/sentenceCacheDB'
import { useAtomValue } from 'jotai'
import { useCallback, useEffect, useMemo, useState } from 'react'

export default function CacheManagementPanel({ onClose }: { onClose: () => void }) {
  const [entries, setEntries] = useState<ISentenceCacheEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [confirmClearAll, setConfirmClearAll] = useState(false)
  const favorites = useAtomValue(favoriteSentencesAtom)

  const favoriteKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const f of favorites) keys.add(`${f.dictId}__${f.word}`)
    return keys
  }, [favorites])

  const loadEntries = useCallback(() => {
    setLoading(true)
    getAllCacheEntries()
      .then((e) => {
        setEntries(e)
        setSelected(new Set())
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  const isFavorited = useCallback((entry: ISentenceCacheEntry) => favoriteKeys.has(`${entry.dictId}__${entry.word}`), [favoriteKeys])

  const selectableEntries = useMemo(() => entries.filter((e) => !isFavorited(e)), [entries, isFavorited])

  const handleToggle = (id: number) => {
    const entry = entries.find((e) => e.id === id)
    if (entry && isFavorited(entry)) return
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSelectAll = () => {
    if (selected.size === selectableEntries.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(selectableEntries.map((e) => e.id!)))
    }
  }

  const handleDeleteSelected = async () => {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    await removeCacheEntries(ids)
    loadEntries()
  }

  const handleClearAll = async () => {
    if (!confirmClearAll) {
      setConfirmClearAll(true)
      return
    }
    const deletableIds = selectableEntries.map((e) => e.id).filter((id): id is number => typeof id === 'number')
    if (deletableIds.length > 0) {
      await removeCacheEntries(deletableIds)
    }
    setConfirmClearAll(false)
    loadEntries()
  }

  const formatDate = (ts: number) => {
    const d = new Date(ts)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-800"
        style={{ maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-lg">🗃️</span>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">缓存管理</h2>
              <p className="text-xs text-gray-400">共 {entries.length} 条缓存</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-2 dark:border-gray-700">
          <button
            onClick={handleSelectAll}
            className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {selected.size === selectableEntries.length && selectableEntries.length > 0 ? '取消全选' : '全选'}
          </button>
          <button
            onClick={handleDeleteSelected}
            disabled={selected.size === 0}
            className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-30 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            删除选中（{selected.size}）
          </button>
          <div className="flex-1" />
          <button
            onClick={handleClearAll}
            className={`rounded px-2 py-1 text-xs ${
              confirmClearAll ? 'bg-red-500 text-white' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            {confirmClearAll ? '确认清空全部' : '清空全部'}
          </button>
        </div>

        {/* Entry list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-400">加载中…</div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">暂无缓存数据</div>
          ) : (
            entries.map((entry) => {
              const fav = isFavorited(entry)
              return (
                <div
                  key={entry.id}
                  onClick={() => handleToggle(entry.id!)}
                  className={`flex cursor-pointer items-start gap-3 border-b border-gray-100 px-5 py-3 transition-colors dark:border-gray-700 ${
                    selected.has(entry.id!) ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  } ${fav ? 'cursor-default opacity-60' : ''}`}
                >
                  {/* Checkbox */}
                  <div className="mt-0.5 flex-shrink-0">
                    {fav ? (
                      <span title="已收藏，不可删除" className="text-yellow-500" style={{ fontSize: 14 }}>
                        ★
                      </span>
                    ) : (
                      <input
                        type="checkbox"
                        checked={selected.has(entry.id!)}
                        onChange={() => handleToggle(entry.id!)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-3.5 w-3.5 rounded border-gray-300"
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{entry.word}</span>
                      {entry.isError && (
                        <span className="rounded bg-red-100 px-1 text-[10px] text-red-600 dark:bg-red-900/30 dark:text-red-400">错题</span>
                      )}
                      <span className="text-[10px] text-gray-400">{entry.dictId}</span>
                    </div>
                    <div
                      className="mt-0.5 text-xs text-gray-500 dark:text-gray-400"
                      style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}
                    >
                      {entry.sentenceData.sentence}
                    </div>
                  </div>

                  {/* Date */}
                  <span className="flex-shrink-0 text-[10px] text-gray-400">{formatDate(entry.createdAt)}</span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
