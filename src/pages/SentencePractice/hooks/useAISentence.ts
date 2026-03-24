import { aiConfigAtom, aiDifficultyAtom, aiStyleAtom, aiUserContextAtom } from '@/store/aiConfig'
import { favoriteSentencesAtom } from '@/store/favorites'
import type { LanguageType } from '@/typings'
import type { SentenceData } from '@/utils/aiService'
import { generateSentence } from '@/utils/aiService'
import { cacheSentence, getCachedSentence } from '@/utils/sentenceCacheDB'
import { useAtomValue } from 'jotai'
import { useCallback, useEffect, useRef, useState } from 'react'

interface UseAISentenceResult {
  data: SentenceData | null
  loading: boolean
  error: string | null
  generate: (word: string, trans: string, dictId: string, language?: LanguageType) => Promise<void>
  regenerate: (word: string, trans: string, dictId: string, language?: LanguageType) => Promise<void>
  prefetch: (word: string, trans: string, dictId: string, language?: LanguageType) => void
}

// Prefetch store: keyed by `${dictId}__${word}`
const prefetchCache = new Map<string, Promise<SentenceData>>()
const RATE_LIMIT_COOLDOWN_MS = 15000
const RATE_LIMIT_RETRY_COUNT = 3
const RATE_LIMIT_RETRY_DELAY_MS = 500

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  const normalized = msg.toLowerCase()
  return (
    normalized.includes('rate_limit') ||
    normalized.includes('429') ||
    normalized.includes('too many requests') ||
    normalized.includes('限流')
  )
}

export function useAISentence(): UseAISentenceResult {
  const aiConfig = useAtomValue(aiConfigAtom)
  const difficulty = useAtomValue(aiDifficultyAtom)
  const style = useAtomValue(aiStyleAtom)
  const userContext = useAtomValue(aiUserContextAtom)
  const favorites = useAtomValue(favoriteSentencesAtom)

  const [data, setData] = useState<SentenceData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const generationIdRef = useRef(0)
  const rateLimitedUntilRef = useRef(0)
  const runtimeCacheRef = useRef<Map<string, SentenceData>>(new Map())

  // On mount, clear the module-level prefetch cache to avoid stale failed/pending promises
  // from a previous page visit causing false rate-limit errors immediately on re-mount.
  useEffect(() => {
    prefetchCache.clear()
  }, [])

  const markRateLimited = useCallback((err: unknown) => {
    if (!isRateLimitError(err)) return
    rateLimitedUntilRef.current = Date.now() + RATE_LIMIT_COOLDOWN_MS
  }, [])

  const getCooldownMessage = useCallback(() => {
    const leftMs = rateLimitedUntilRef.current - Date.now()
    const leftSec = Math.max(1, Math.ceil(leftMs / 1000))
    return `AI 请求过于频繁，请在 ${leftSec} 秒后重试，或先使用已缓存句子。`
  }, [])

  const doGenerate = useCallback(
    async (word: string, trans: string, dictId: string, language?: LanguageType): Promise<SentenceData> => {
      let lastError: unknown = null
      for (let attempt = 1; attempt <= RATE_LIMIT_RETRY_COUNT; attempt += 1) {
        try {
          const result = await generateSentence({
            provider: aiConfig.provider,
            apiKey: aiConfig.apiKey,
            baseUrl: aiConfig.baseUrl,
            model: aiConfig.model,
            word,
            trans,
            difficulty,
            style,
            userContext,
            requestMode: aiConfig.requestMode,
            language,
          })
          // Cache the generated sentence
          await cacheSentence(dictId, word, result).catch(() => {})
          return result
        } catch (err) {
          lastError = err
          markRateLimited(err)
          // Retry on ANY error (network, server, rate-limit, parse failures).
          // Only bail out after the final attempt.
          if (attempt >= RATE_LIMIT_RETRY_COUNT) {
            throw err
          }
          await sleep(RATE_LIMIT_RETRY_DELAY_MS)
        }
      }
      throw lastError instanceof Error ? lastError : new Error(String(lastError))
    },
    [aiConfig, difficulty, style, userContext, markRateLimited],
  )

  const fetchSentence = useCallback(
    async (word: string, trans: string, dictId: string, skipFavoriteCheck: boolean, skipCache: boolean, language?: LanguageType) => {
      const genId = ++generationIdRef.current
      const cacheKey = `${dictId}__${word}`
      setLoading(true)
      setError(null)

      // 1. Runtime cache first (fastest, no IO)
      if (!skipCache) {
        const runtimeCached = runtimeCacheRef.current.get(cacheKey)
        if (runtimeCached) {
          if (genId === generationIdRef.current) {
            setData(runtimeCached)
            setLoading(false)
          }
          return
        }
      }

      // 2. IndexedDB cache
      if (!skipCache) {
        try {
          const cached = await getCachedSentence(dictId, word)
          if (cached) {
            runtimeCacheRef.current.set(cacheKey, cached.sentenceData)
            if (genId === generationIdRef.current) {
              setData(cached.sentenceData)
              setLoading(false)
            }
            return
          }
        } catch {
          // Cache miss, proceed to generate
        }
      }

      // 3. Favorites as fallback cache
      if (!skipFavoriteCheck) {
        const fav = favorites.find((f) => f.word === word && f.dictId === dictId && f.sentenceData)
        if (fav?.sentenceData) {
          runtimeCacheRef.current.set(cacheKey, fav.sentenceData)
          cacheSentence(dictId, word, fav.sentenceData).catch(() => {})
          if (genId === generationIdRef.current) {
            setData(fav.sentenceData)
            setLoading(false)
          }
          return
        }
      }

      // 3.5. Respect the rate-limit cooldown ONLY when coming from a prefetch failure.
      // For user-initiated generate() calls (word switch), we always attempt a fresh real
      // request below so the user is never silently stuck on an old error.
      // The doGenerate retry loop (3 attempts × 500 ms) handles the actual throttling.

      // 4. Check prefetch store. Regenerate should always bypass this step.
      const prefetchKey = `${dictId}__${word}`
      if (!skipCache) {
        const prefetchPromise = prefetchCache.get(prefetchKey)
        if (prefetchPromise) {
          prefetchCache.delete(prefetchKey)
          try {
            const result = await prefetchPromise
            runtimeCacheRef.current.set(cacheKey, result)
            if (genId === generationIdRef.current) {
              setData(result)
              setLoading(false)
            }
            return
          } catch {
            // Prefetch failed — fall through to a fresh generate attempt below.
            prefetchCache.delete(prefetchKey)
          }
        }
      }

      setData(null)

      try {
        const result = await doGenerate(word, trans, dictId, language)
        runtimeCacheRef.current.set(cacheKey, result)
        if (genId === generationIdRef.current) {
          setData(result)
        }
      } catch (err) {
        if (genId === generationIdRef.current) {
          markRateLimited(err)
          setError(err instanceof Error ? err.message : String(err))
        }
      } finally {
        if (genId === generationIdRef.current) {
          setLoading(false)
        }
      }
    },
    [favorites, doGenerate, getCooldownMessage, markRateLimited],
  )

  const generate = useCallback(
    (word: string, trans: string, dictId: string, language?: LanguageType) => fetchSentence(word, trans, dictId, false, false, language),
    [fetchSentence],
  )

  const regenerate = useCallback(
    (word: string, trans: string, dictId: string, language?: LanguageType) => fetchSentence(word, trans, dictId, true, true, language),
    [fetchSentence],
  )

  /** Pre-generate a sentence in the background (fire-and-forget).
   *  Checks favorites and IndexedDB cache first to avoid unnecessary API calls. */
  const prefetch = useCallback(
    (word: string, trans: string, dictId: string, language?: LanguageType) => {
      const key = `${dictId}__${word}`
      if (prefetchCache.has(key)) return
      if (Date.now() < rateLimitedUntilRef.current) return
      if (runtimeCacheRef.current.has(key)) return

      const promise = (async (): Promise<SentenceData> => {
        // 1. IndexedDB cache
        const cached = await getCachedSentence(dictId, word).catch(() => null)
        if (cached) {
          runtimeCacheRef.current.set(key, cached.sentenceData)
          return cached.sentenceData
        }
        // 2. Favorites fallback
        const fav = favorites.find((f) => f.word === word && f.dictId === dictId && f.sentenceData)
        if (fav?.sentenceData) {
          runtimeCacheRef.current.set(key, fav.sentenceData)
          cacheSentence(dictId, word, fav.sentenceData).catch(() => {})
          return fav.sentenceData
        }
        // 3. Generate via API (single call, no double-invoke)
        const result = await doGenerate(word, trans, dictId, language)
        runtimeCacheRef.current.set(key, result)
        return result
      })()

      prefetchCache.set(key, promise)
      // Keep successful prefetches for 60s; delete failures immediately so
      // a subsequent generate() call always starts a fresh attempt.
      promise
        .then(() => {
          setTimeout(() => prefetchCache.delete(key), 60000)
        })
        .catch(() => {
          prefetchCache.delete(key)
        })
    },
    [doGenerate, favorites],
  )

  return { data, loading, error, generate, regenerate, prefetch }
}
