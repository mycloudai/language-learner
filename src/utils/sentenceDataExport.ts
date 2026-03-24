import type { FavoriteSentence } from '@/store/favorites'

export interface SentenceExportData {
  version: '1.3' | '1.4' | '1.5'
  exportedAt: string
  note: string
  data: {
    favorites: FavoriteSentence[]
    aiDifficulty: string
    aiStyle: string
    sentenceProgress: unknown
    aiUserContext: unknown
    sentenceMasteryData: unknown
    wordStrengthenCorrectTarget?: number
    sentenceErrorCorrectTarget?: number
    sentenceRandomConfig?: unknown
    randomConfig?: unknown
    keySoundsConfig?: unknown
    hintSoundsConfig?: unknown
    sentenceKeySoundsConfig?: unknown
    sentenceHintSoundsConfig?: unknown
    loopWordConfig?: unknown
    pronunciationConfig?: unknown
    phoneticConfig?: unknown
    fontSizeConfig?: unknown
    wordDictationConfig?: unknown
    finishedWordChapters?: unknown
    finishedSentenceChapters?: unknown
    isIgnoreCase?: unknown
    isShowPrevAndNextWord?: unknown
    isShowAnswerOnHover?: unknown
    isTextSelectable?: unknown
    isOpenDarkMode?: unknown
    currentDict?: unknown
    currentChapter?: unknown
    typingWordIndex?: unknown
    aiConfig: {
      provider: string
      baseUrl: string
      model: string
      requestMode: string
    } | null
    // apiKey is intentionally excluded
  }
}

function readLocalStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function buildSentenceExportData(): SentenceExportData {
  // Extract AI config without apiKey
  const rawAiConfig = readLocalStorage<Record<string, unknown>>('aiConfig', {})
  const safeAiConfig = rawAiConfig
    ? {
        provider: String(rawAiConfig.provider || ''),
        baseUrl: String(rawAiConfig.baseUrl || ''),
        model: String(rawAiConfig.model || ''),
        requestMode: String(rawAiConfig.requestMode || 'server'),
      }
    : null

  return {
    version: '1.5',
    exportedAt: new Date().toISOString(),
    note: '仅收藏的句子及其完整AI分析数据会被导出。非收藏句子即使有缓存也不会导出。AI API Key 出于安全原因不导出，导入后需重新配置。',
    data: {
      favorites: readLocalStorage<FavoriteSentence[]>('favoriteSentences', []),
      aiDifficulty: readLocalStorage<string>('aiDifficulty', 'medium'),
      aiStyle: readLocalStorage<string>('aiStyle', 'formal'),
      sentenceProgress: readLocalStorage<unknown>('sentenceProgress', {}),
      aiUserContext: readLocalStorage<unknown>('aiUserContext', {}),
      sentenceMasteryData: readLocalStorage<unknown>('sentenceMasteryData', {}),
      wordStrengthenCorrectTarget: readLocalStorage<number>('wordStrengthenCorrectTarget', 2),
      sentenceErrorCorrectTarget: readLocalStorage<number>('sentenceErrorCorrectTarget', 2),
      sentenceRandomConfig: readLocalStorage<unknown>('sentenceRandomConfig', { isOpen: false }),
      randomConfig: readLocalStorage<unknown>('randomConfig', { isOpen: false }),
      keySoundsConfig: readLocalStorage<unknown>('keySoundsConfig', null),
      hintSoundsConfig: readLocalStorage<unknown>('hintSoundsConfig', null),
      sentenceKeySoundsConfig: readLocalStorage<unknown>('sentenceKeySoundsConfig', null),
      sentenceHintSoundsConfig: readLocalStorage<unknown>('sentenceHintSoundsConfig', null),
      loopWordConfig: readLocalStorage<unknown>('loopWordConfig', null),
      pronunciationConfig: readLocalStorage<unknown>('pronunciation', null),
      phoneticConfig: readLocalStorage<unknown>('phoneticConfig', null),
      fontSizeConfig: readLocalStorage<unknown>('fontsize', null),
      wordDictationConfig: readLocalStorage<unknown>('wordDictationConfig', null),
      finishedWordChapters: readLocalStorage<unknown>('finishedWordChapters', {}),
      finishedSentenceChapters: readLocalStorage<unknown>('finishedSentenceChapters', {}),
      isIgnoreCase: readLocalStorage<unknown>('isIgnoreCase', true),
      isShowPrevAndNextWord: readLocalStorage<unknown>('isShowPrevAndNextWord', true),
      isShowAnswerOnHover: readLocalStorage<unknown>('isShowAnswerOnHover', true),
      isTextSelectable: readLocalStorage<unknown>('isTextSelectable', false),
      isOpenDarkMode: readLocalStorage<unknown>('isOpenDarkModeAtom', null),
      currentDict: readLocalStorage<unknown>('currentDict', null),
      currentChapter: readLocalStorage<unknown>('currentChapter', null),
      typingWordIndex: readLocalStorage<unknown>('typingWordIndex', null),
      aiConfig: safeAiConfig,
    },
  }
}

export function exportSentenceData(): void {
  const payload = buildSentenceExportData()

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mycloudai-sentence-data-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function importSentenceData(onSuccess: (favoritesCount: number, warnings: string[]) => void, onError: (msg: string) => void): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'application/json,.json'
  input.onchange = () => {
    const file = input.files?.[0]
    if (!file) return
    importSentenceDataFromFile(file, onSuccess, onError)
  }
  input.click()
}

export function importSentenceDataFromFile(
  file: File,
  onSuccess: (favoritesCount: number, warnings: string[]) => void,
  onError: (msg: string) => void,
  options?: { reloadAfterImport?: boolean },
): void {
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target?.result as string) as SentenceExportData
      const { count, warnings } = applySentenceImportData(parsed)
      onSuccess(count, warnings)
      if (options?.reloadAfterImport !== false) {
        // Jotai atoms backed by localStorage won't see these changes until reload
        setTimeout(() => window.location.reload(), 1500)
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : '导入失败')
    }
  }
  reader.readAsText(file)
}

export function applySentenceImportData(parsed: SentenceExportData): { count: number; warnings: string[] } {
  if (!parsed?.data) throw new Error('文件格式不正确，缺少 data 字段')
  const {
    favorites,
    aiDifficulty,
    aiStyle,
    sentenceProgress,
    aiUserContext,
    sentenceMasteryData,
    wordStrengthenCorrectTarget,
    sentenceErrorCorrectTarget,
    sentenceRandomConfig,
    randomConfig,
    keySoundsConfig,
    hintSoundsConfig,
    sentenceKeySoundsConfig,
    sentenceHintSoundsConfig,
    loopWordConfig,
    pronunciationConfig,
    phoneticConfig,
    fontSizeConfig,
    wordDictationConfig,
    finishedWordChapters,
    finishedSentenceChapters,
    isIgnoreCase,
    isShowPrevAndNextWord,
    isShowAnswerOnHover,
    isTextSelectable,
    isOpenDarkMode,
    currentDict,
    currentChapter,
    typingWordIndex,
    aiConfig,
  } = parsed.data
  const warnings: string[] = []

  if (Array.isArray(favorites)) localStorage.setItem('favoriteSentences', JSON.stringify(favorites))
  if (aiDifficulty) localStorage.setItem('aiDifficulty', JSON.stringify(aiDifficulty))
  if (aiStyle) localStorage.setItem('aiStyle', JSON.stringify(aiStyle))
  if (sentenceProgress) localStorage.setItem('sentenceProgress', JSON.stringify(sentenceProgress))
  if (aiUserContext) localStorage.setItem('aiUserContext', JSON.stringify(aiUserContext))
  if (sentenceMasteryData) localStorage.setItem('sentenceMasteryData', JSON.stringify(sentenceMasteryData))
  if (typeof wordStrengthenCorrectTarget === 'number') {
    localStorage.setItem('wordStrengthenCorrectTarget', JSON.stringify(wordStrengthenCorrectTarget))
  }
  if (typeof sentenceErrorCorrectTarget === 'number') {
    localStorage.setItem('sentenceErrorCorrectTarget', JSON.stringify(sentenceErrorCorrectTarget))
  }
  if (sentenceRandomConfig) {
    localStorage.setItem('sentenceRandomConfig', JSON.stringify(sentenceRandomConfig))
  }
  if (randomConfig) {
    localStorage.setItem('randomConfig', JSON.stringify(randomConfig))
  }
  if (keySoundsConfig) {
    localStorage.setItem('keySoundsConfig', JSON.stringify(keySoundsConfig))
  }
  if (hintSoundsConfig) {
    localStorage.setItem('hintSoundsConfig', JSON.stringify(hintSoundsConfig))
  }
  if (sentenceKeySoundsConfig) {
    localStorage.setItem('sentenceKeySoundsConfig', JSON.stringify(sentenceKeySoundsConfig))
  }
  if (sentenceHintSoundsConfig) {
    localStorage.setItem('sentenceHintSoundsConfig', JSON.stringify(sentenceHintSoundsConfig))
  }
  if (loopWordConfig) {
    localStorage.setItem('loopWordConfig', JSON.stringify(loopWordConfig))
  }
  if (pronunciationConfig) {
    localStorage.setItem('pronunciation', JSON.stringify(pronunciationConfig))
  }
  if (phoneticConfig) {
    localStorage.setItem('phoneticConfig', JSON.stringify(phoneticConfig))
  }
  if (fontSizeConfig) {
    localStorage.setItem('fontsize', JSON.stringify(fontSizeConfig))
  }
  if (wordDictationConfig) {
    localStorage.setItem('wordDictationConfig', JSON.stringify(wordDictationConfig))
  }
  if (finishedWordChapters && typeof finishedWordChapters === 'object') {
    localStorage.setItem('finishedWordChapters', JSON.stringify(finishedWordChapters))
  }
  if (finishedSentenceChapters && typeof finishedSentenceChapters === 'object') {
    localStorage.setItem('finishedSentenceChapters', JSON.stringify(finishedSentenceChapters))
  }
  if (isIgnoreCase !== undefined && isIgnoreCase !== null) {
    localStorage.setItem('isIgnoreCase', JSON.stringify(isIgnoreCase))
  }
  if (isShowPrevAndNextWord !== undefined && isShowPrevAndNextWord !== null) {
    localStorage.setItem('isShowPrevAndNextWord', JSON.stringify(isShowPrevAndNextWord))
  }
  if (isShowAnswerOnHover !== undefined && isShowAnswerOnHover !== null) {
    localStorage.setItem('isShowAnswerOnHover', JSON.stringify(isShowAnswerOnHover))
  }
  if (isTextSelectable !== undefined && isTextSelectable !== null) {
    localStorage.setItem('isTextSelectable', JSON.stringify(isTextSelectable))
  }
  if (isOpenDarkMode !== undefined && isOpenDarkMode !== null) {
    localStorage.setItem('isOpenDarkModeAtom', JSON.stringify(isOpenDarkMode))
  }
  if (currentDict !== undefined && currentDict !== null) {
    localStorage.setItem('currentDict', JSON.stringify(currentDict))
  }
  if (currentChapter !== undefined && currentChapter !== null) {
    localStorage.setItem('currentChapter', JSON.stringify(currentChapter))
  }
  if (typingWordIndex !== undefined && typingWordIndex !== null) {
    localStorage.setItem('typingWordIndex', JSON.stringify(typingWordIndex))
  }

  // Restore AI config (provider, baseUrl, model, requestMode) without overwriting apiKey
  if (aiConfig && typeof aiConfig === 'object') {
    const currentConfig = readLocalStorage<Record<string, unknown>>('aiConfig', {})
    const merged = {
      ...currentConfig,
      provider: aiConfig.provider || currentConfig.provider,
      baseUrl: aiConfig.baseUrl || currentConfig.baseUrl,
      model: aiConfig.model || currentConfig.model,
      requestMode: aiConfig.requestMode || currentConfig.requestMode,
    }
    localStorage.setItem('aiConfig', JSON.stringify(merged))
  }

  // Check if API key is configured
  const currentApiKey = readLocalStorage<Record<string, unknown>>('aiConfig', {}).apiKey
  if (!currentApiKey) {
    warnings.push('当前未配置 AI API Key，请在设置中配置后才能使用 AI 句子功能。')
  }

  return { count: Array.isArray(favorites) ? favorites.length : 0, warnings }
}
