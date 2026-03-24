import type { SentenceData } from './aiService'
import Dexie from 'dexie'
import type { Table } from 'dexie'

const FALLBACK_CACHE_KEY = 'sentenceCacheFallbackV1'

export interface ISentenceCacheEntry {
  id?: number
  dictId: string
  word: string
  sentenceData: SentenceData
  isError: boolean // true = user got this sentence wrong (error bank)
  errorCorrectCount?: number
  createdAt: number
}

class SentenceCacheDB extends Dexie {
  sentenceCache!: Table<ISentenceCacheEntry, number>

  constructor() {
    super('SentenceCacheDB')
    this.version(1).stores({
      sentenceCache: '++id,dictId,word,isError,[dictId+word],[dictId+isError]',
    })
  }
}

export const sentenceCacheDB = new SentenceCacheDB()

function readFallbackCache(): ISentenceCacheEntry[] {
  try {
    const raw = localStorage.getItem(FALLBACK_CACHE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ISentenceCacheEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeFallbackCache(entries: ISentenceCacheEntry[]): void {
  try {
    localStorage.setItem(FALLBACK_CACHE_KEY, JSON.stringify(entries))
  } catch {
    // Ignore storage quota failures; IndexedDB path may still work.
  }
}

function upsertFallbackEntry(dictId: string, word: string, sentenceData: SentenceData, isError: boolean): ISentenceCacheEntry[] {
  const entries = readFallbackCache().filter((e) => !(e.dictId === dictId && e.word === word))
  entries.push({
    id: -Date.now(), // negative id to avoid collision with Dexie auto-increment ids
    dictId,
    word,
    sentenceData,
    isError,
    errorCorrectCount: 0,
    createdAt: Date.now(),
  })
  writeFallbackCache(entries)
  return entries
}

function updateFallbackErrorCorrectCount(id: number, correctCount: number): number {
  const entries = readFallbackCache().map((e) => {
    if (e.id !== id) return e
    return { ...e, errorCorrectCount: Math.max(0, correctCount) }
  })
  writeFallbackCache(entries)
  return entries.find((e) => e.id === id)?.errorCorrectCount ?? 0
}

function removeFallbackById(id: number): void {
  const entries = readFallbackCache().filter((e) => e.id !== id)
  writeFallbackCache(entries)
}

function removeFallbackByIds(ids: number[]): void {
  if (ids.length === 0) return
  const idSet = new Set(ids)
  const entries = readFallbackCache().filter((e) => e.id === undefined || !idSet.has(e.id))
  writeFallbackCache(entries)
}

function dedupeEntries(entries: ISentenceCacheEntry[]): ISentenceCacheEntry[] {
  const map = new Map<string, ISentenceCacheEntry>()
  for (const entry of entries) {
    map.set(`${entry.dictId}__${entry.word}`, entry)
  }
  return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt)
}

/** Get cached sentence for a word (non-error cache first, then error bank) */
export async function getCachedSentence(dictId: string, word: string): Promise<ISentenceCacheEntry | undefined> {
  try {
    const cached = await sentenceCacheDB.sentenceCache.where('[dictId+word]').equals([dictId, word]).first()
    if (cached) return cached
  } catch {
    // Fallback handled below.
  }
  return readFallbackCache().find((e) => e.dictId === dictId && e.word === word)
}

/** Save a sentence to cache */
export async function cacheSentence(dictId: string, word: string, sentenceData: SentenceData, isError = false): Promise<void> {
  const createdAt = Date.now()
  const entry: ISentenceCacheEntry = { dictId, word, sentenceData, isError, errorCorrectCount: 0, createdAt }
  upsertFallbackEntry(dictId, word, sentenceData, isError)

  try {
    // Remove existing cache for this word+dict (replace strategy)
    await sentenceCacheDB.sentenceCache.where('[dictId+word]').equals([dictId, word]).delete()
    await sentenceCacheDB.sentenceCache.add(entry)
  } catch {
    // Keep fallback cache so sentence still persists across refresh.
  }
}

/** Mark a sentence as error (wrong answer) */
export async function markSentenceAsError(dictId: string, word: string, sentenceData: SentenceData): Promise<void> {
  await cacheSentence(dictId, word, sentenceData, true)
}

/** Increase correct-pass count in error bank, return latest count */
export async function increaseErrorCorrectCount(id: number): Promise<number> {
  try {
    const entry = await sentenceCacheDB.sentenceCache.get(id)
    const next = (entry?.errorCorrectCount ?? 0) + 1
    if (entry) {
      await sentenceCacheDB.sentenceCache.update(id, { errorCorrectCount: next })
    }
    updateFallbackErrorCorrectCount(id, next)
    return next
  } catch {
    const fallback = readFallbackCache().find((e) => e.id === id)
    const next = (fallback?.errorCorrectCount ?? 0) + 1
    return updateFallbackErrorCorrectCount(id, next)
  }
}

/** Get all error bank entries for a dict */
export async function getErrorBankEntries(dictId: string): Promise<ISentenceCacheEntry[]> {
  try {
    // Use filter() instead of compound index because IndexedDB does not support boolean keys;
    // `[dictId+isError]` with a boolean field would never match using equals([dictId, 1]).
    const dbEntries = await sentenceCacheDB.sentenceCache
      .where('dictId')
      .equals(dictId)
      .filter((e) => e.isError)
      .toArray()
    const fallbackEntries = readFallbackCache().filter((e) => e.dictId === dictId && e.isError)
    return dedupeEntries(dbEntries.concat(fallbackEntries))
  } catch {
    return readFallbackCache().filter((e) => e.dictId === dictId && e.isError)
  }
}

/** Remove a specific cache entry */
export async function removeCacheEntry(id: number): Promise<void> {
  removeFallbackById(id)
  try {
    await sentenceCacheDB.sentenceCache.delete(id)
  } catch {
    // Fallback already removed.
  }
}

/** Remove all non-favorited cache entries */
export async function clearAllCache(): Promise<void> {
  writeFallbackCache([])
  try {
    await sentenceCacheDB.sentenceCache.clear()
  } catch {
    // Fallback already cleared.
  }
}

/** Get all cache entries (for management panel) */
export async function getAllCacheEntries(): Promise<ISentenceCacheEntry[]> {
  const fallbackEntries = readFallbackCache()
  try {
    const dbEntries = await sentenceCacheDB.sentenceCache.orderBy('createdAt').reverse().toArray()
    return dedupeEntries(dbEntries.concat(fallbackEntries))
  } catch {
    return fallbackEntries.sort((a, b) => b.createdAt - a.createdAt)
  }
}

/** Remove multiple cache entries by id */
export async function removeCacheEntries(ids: number[]): Promise<void> {
  removeFallbackByIds(ids)
  try {
    await sentenceCacheDB.sentenceCache.bulkDelete(ids)
  } catch {
    // Fallback already removed.
  }
}
