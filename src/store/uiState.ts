import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

// Shared open state so sentence page can route into the same typing settings dialog.
export const typingSettingsOpenAtom = atom(false)

export interface SentenceJumpTarget {
  dictId: string
  word: string
}

// One-time jump target used when entering sentence practice from favorites.
export const sentenceJumpTargetAtom = atom<SentenceJumpTarget | null>(null)

// Bumped whenever a word is mastered in strengthen mode so the sidebar error panel refreshes.
export const wordStrengthenRefreshTokenAtom = atom(0)

// Bumped whenever a sentence is added to / removed from the error bank so the sidebar refreshes.
export const sentenceErrorRefreshTokenAtom = atom(0)

/**
 * Tracks which chapters the user has typed through at least once, per dict.
 * Key: dictId  Value: array of chapter indices that have been fully completed.
 * "Completed" = FINISH_CHAPTER fired while not in review/strengthen mode.
 * Combined with the error-bank check to determine if a chapter is fully mastered.
 */
export const finishedWordChaptersAtom = atomWithStorage<Record<string, number[]>>('finishedWordChapters', {})

/**
 * Tracks which sentence-practice chapters the user has advanced past at least once, per dict.
 * Key: dictId  Value: array of chapter indices that have been swept through.
 * "Swept" = user advanced to the next chapter (reached last word and moved on).
 */
export const finishedSentenceChaptersAtom = atomWithStorage<Record<string, number[]>>('finishedSentenceChapters', {})
