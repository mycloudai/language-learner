import type { SentenceData } from '@/utils/aiService'
import { atomWithStorage } from 'jotai/utils'

export interface FavoriteSentence {
  id: string
  word: string
  dictId: string
  dictName: string
  sentence: string
  targetWordUsage: string
  sentenceData?: SentenceData // full AI response for cache restoration
  chapter: number
  wordIndex: number
  createdAt: number
}

export const favoriteSentencesAtom = atomWithStorage<FavoriteSentence[]>('favoriteSentences', [])
