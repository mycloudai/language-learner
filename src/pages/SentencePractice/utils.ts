// Compute character-level diff between user input and target sentence
export interface DiffChar {
  char: string
  type: 'correct' | 'wrong' | 'missing' | 'extra'
}

export function computeDiff(input: string, target: string): { inputDiff: DiffChar[]; targetDiff: DiffChar[] } {
  const inputDiff: DiffChar[] = []
  const targetDiff: DiffChar[] = []

  const maxLen = Math.max(input.length, target.length)

  for (let i = 0; i < maxLen; i++) {
    const inputChar = input[i]
    const targetChar = target[i]

    if (i < input.length && i < target.length) {
      if (inputChar === targetChar) {
        inputDiff.push({ char: inputChar, type: 'correct' })
        targetDiff.push({ char: targetChar, type: 'correct' })
      } else {
        inputDiff.push({ char: inputChar, type: 'wrong' })
        targetDiff.push({ char: targetChar, type: 'wrong' })
      }
    } else if (i >= input.length) {
      targetDiff.push({ char: targetChar, type: 'missing' })
    } else {
      inputDiff.push({ char: inputChar, type: 'extra' })
    }
  }

  return { inputDiff, targetDiff }
}

// Highlight target word in sentence — only matches whole words (word-boundary check)
export function highlightWord(sentence: string, word: string): { text: string; isTarget: boolean }[] {
  const parts: { text: string; isTarget: boolean }[] = []
  const lowerSentence = sentence.toLowerCase()
  const lowerWord = word.toLowerCase()

  let lastIndex = 0
  let searchFrom = 0

  while (searchFrom < lowerSentence.length) {
    const idx = lowerSentence.indexOf(lowerWord, searchFrom)
    if (idx === -1) break

    // Word-boundary check: surrounding characters must not be word characters
    const before = idx === 0 ? '' : lowerSentence[idx - 1]
    const after = idx + lowerWord.length >= lowerSentence.length ? '' : lowerSentence[idx + lowerWord.length]
    const isBoundaryBefore = before === '' || /\W/.test(before)
    const isBoundaryAfter = after === '' || /\W/.test(after)

    if (isBoundaryBefore && isBoundaryAfter) {
      if (idx > lastIndex) {
        parts.push({ text: sentence.slice(lastIndex, idx), isTarget: false })
      }
      parts.push({ text: sentence.slice(idx, idx + word.length), isTarget: true })
      lastIndex = idx + word.length
      searchFrom = lastIndex
    } else {
      // Skip this non-whole-word match
      searchFrom = idx + 1
    }
  }

  if (lastIndex < sentence.length) {
    parts.push({ text: sentence.slice(lastIndex), isTarget: false })
  }

  if (parts.length === 0) {
    parts.push({ text: sentence, isTarget: false })
  }

  return parts
}
