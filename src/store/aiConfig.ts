import type { Word } from '@/typings'
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

export type AIProvider = 'openai' | 'anthropic' | 'anthropic-compatible' | 'custom'
export type AIDifficulty = 'easy' | 'medium' | 'hard'
export type AIStyle = 'formal' | 'spoken'
export type AIRequestMode = 'server' | 'local'

export interface AIConfig {
  provider: AIProvider
  apiKey: string
  baseUrl: string
  model: string
  isConfigured: boolean
  requestMode: AIRequestMode
}

export interface AIUserContext {
  profession: string
  scenario: string
}

export interface SentenceProgress {
  dictId: string
  chapter: number
  wordIndex: number
}

export const aiConfigAtom = atomWithStorage<AIConfig>('aiConfig', {
  provider: 'openai',
  apiKey: '',
  baseUrl: '',
  model: 'gpt-4o-mini',
  isConfigured: false,
  requestMode: 'server',
})

export const aiDifficultyAtom = atomWithStorage<AIDifficulty>('aiDifficulty', 'medium')
export const aiStyleAtom = atomWithStorage<AIStyle>('aiStyle', 'formal')
export const aiUserContextAtom = atomWithStorage<AIUserContext>('aiUserContext', {
  profession: '',
  scenario: '',
})

export const sentenceProgressAtom = atomWithStorage<SentenceProgress>('sentenceProgress', {
  dictId: 'cet4',
  chapter: 0,
  wordIndex: 0,
})

export const isAIConfiguredAtom = atom((get) => get(aiConfigAtom).isConfigured)

export interface SentenceMasteryEntry {
  attempts: number
  correct: number // typed sentence exactly correct
}

// Key format: `${dictId}__${word}`
export const sentenceMasteryAtom = atomWithStorage<Record<string, SentenceMasteryEntry>>('sentenceMasteryData', {})

// Strengthen configs
export const wordStrengthenCorrectTargetAtom = atomWithStorage<number>('wordStrengthenCorrectTarget', 2)
export const sentenceErrorCorrectTargetAtom = atomWithStorage<number>('sentenceErrorCorrectTarget', 2)

export interface SentenceChapterSnapshot {
  dictId: string
  chapter: number
  words: Word[]
}

export const sentenceChapterSnapshotAtom = atom<SentenceChapterSnapshot>({
  dictId: '',
  chapter: 0,
  words: [],
})
