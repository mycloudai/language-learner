import type { AIDifficulty, AIRequestMode, AIStyle, AIUserContext } from '@/store/aiConfig'
import type { LanguageType } from '@/typings'

export interface SentenceData {
  sentence: string
  grammarPoints: { point: string; explanation: string }[]
  vocabNotes: { word: string; explanation: string }[]
  targetWordUsage: string
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

// Map LanguageType to human-readable name for AI prompts
const LANGUAGE_NAMES: Record<string, { name: string; teacherRole: string }> = {
  en: { name: '英语', teacherRole: '英语教学助手' },
  de: { name: '德语', teacherRole: '德语教学助手' },
  ja: { name: '日语', teacherRole: '日语教学助手' },
  romaji: { name: '日语', teacherRole: '日语教学助手' },
  kk: { name: '哈萨克语', teacherRole: '哈萨克语教学助手' },
  hapin: { name: '哈萨克语', teacherRole: '哈萨克语教学助手' },
  id: { name: '印尼语', teacherRole: '印尼语教学助手' },
  code: { name: '编程', teacherRole: '编程教学助手' },
}

function getLanguageInfo(language?: LanguageType) {
  return LANGUAGE_NAMES[language || 'en'] || LANGUAGE_NAMES.en
}

// ---------- Server mode helpers (requests go through our Express proxy) ----------

async function serverFetch(path: string, body: Record<string, unknown>): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function normalizeServerErrorMessage(payload: unknown, status: number): string {
  const raw = payload as { error?: unknown; message?: unknown }
  const candidates = [raw?.error, raw?.message].filter((v) => v !== undefined)

  const texts = candidates.map((v) => {
    if (typeof v === 'string') return v
    if (v && typeof v === 'object') {
      const obj = v as { message?: unknown; code?: unknown; type?: unknown; error?: unknown }
      if (typeof obj.message === 'string') return obj.message
      if (obj.error && typeof obj.error === 'object' && typeof (obj.error as { message?: unknown }).message === 'string') {
        return (obj.error as { message: string }).message
      }
      return JSON.stringify(v)
    }
    return String(v)
  })

  const merged = texts.join(' | ')
  return merged || `API error: ${status}`
}

// ---------- Local mode helpers (browser calls AI provider directly) ----------

function buildOpenAIHeaders(apiKey: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }
}

function buildAnthropicHeaders(apiKey: string) {
  return { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }
}

async function localCallAI(params: {
  provider: string
  apiKey: string
  baseUrl: string
  model: string
  systemPrompt: string
  userPrompt: string
  maxTokens?: number
  temperature?: number
}): Promise<string> {
  const { provider, apiKey, baseUrl, model, systemPrompt, userPrompt, maxTokens = 1024, temperature = 0.8 } = params

  try {
    if (provider === 'anthropic' || provider === 'anthropic-compatible') {
      const url = baseUrl || 'https://api.anthropic.com'
      const resp = await fetch(`${url}/v1/messages`, {
        method: 'POST',
        headers: buildAnthropicHeaders(apiKey),
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: `${systemPrompt}\n\n${userPrompt}` }],
        }),
      })
      if (!resp.ok) throw new Error(`Anthropic API error: ${await resp.text()}`)
      const data = await resp.json()
      return data.content?.[0]?.text || ''
    } else {
      const url = baseUrl || 'https://api.openai.com'
      const resp = await fetch(`${url}/v1/chat/completions`, {
        method: 'POST',
        headers: buildOpenAIHeaders(apiKey),
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature,
          max_tokens: maxTokens,
        }),
      })
      if (!resp.ok) throw new Error(`AI API error: ${await resp.text()}`)
      const data = await resp.json()
      return data.choices?.[0]?.message?.content || ''
    }
  } catch (err) {
    if (err instanceof TypeError && (err.message === 'Failed to fetch' || err.message.includes('NetworkError'))) {
      throw new Error('本地模式请求失败（CORS 跨域限制）。大部分云端 AI 服务不支持浏览器直接请求，请切换到服务器模式。')
    }
    throw err
  }
}

function parseAIJSON(text: string): unknown {
  let jsonStr = text.trim()
  const mdMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (mdMatch) {
    jsonStr = mdMatch[1].trim()
  } else {
    const start = jsonStr.indexOf('{')
    const end = jsonStr.lastIndexOf('}')
    if (start !== -1 && end > start) jsonStr = jsonStr.slice(start, end + 1)
  }
  return JSON.parse(jsonStr)
}

// ---------- Public API ----------

export async function generateSentence(params: {
  provider: string
  apiKey: string
  baseUrl: string
  model: string
  word: string
  trans: string
  difficulty: AIDifficulty
  style: AIStyle
  userContext: AIUserContext
  requestMode?: AIRequestMode
  language?: LanguageType
}): Promise<SentenceData> {
  const { requestMode = 'server', language, ...rest } = params
  const langInfo = getLanguageInfo(language)

  if (requestMode === 'local') {
    const difficultyPrompts: Record<string, string> = {
      easy: '生成一个简单的日常生活句子，使用基础词汇和简单语法结构。',
      medium: '生成一个中等难度的职场/日常工作句子，使用常见的商务或专业词汇。',
      hard: '生成一个高难度的学术/专业句子，使用较为复杂的语法结构和专业术语。',
    }
    const stylePrompts: Record<string, string> = {
      formal: '使用正式的书面语风格。',
      spoken: `使用口语化的风格，像${langInfo.name}母语者日常对话一样，可以包含缩写。若使用了缩写或俚语，必须在vocabNotes中解释。`,
    }
    const ctxParts: string[] = []
    if (rest.userContext.profession) ctxParts.push(`职业：${rest.userContext.profession}`)
    if (rest.userContext.scenario) ctxParts.push(`场景：${rest.userContext.scenario}`)
    const contextPrompt = ctxParts.length ? `用户背景：${ctxParts.join('，')}。请生成与该背景相关的句子。` : ''

    const systemPrompt = `你是一个专业的${langInfo.teacherRole}。根据给定的${langInfo.name}单词生成练习句子和知识点分析。
要求：
1. ${difficultyPrompts[rest.difficulty] || difficultyPrompts.medium}
2. ${stylePrompts[rest.style] || stylePrompts.formal}
3. ${contextPrompt}
4. 句子必须包含目标单词。
5. 返回严格的JSON格式：
{"sentence":"...","grammarPoints":[{"point":"...","explanation":"..."}],"vocabNotes":[{"word":"...","explanation":"..."}],"targetWordUsage":"..."}
注意：grammarPoints 2-3条，vocabNotes 不含目标词，targetWordUsage 用中文解释。`

    const userPrompt = `目标单词：${rest.word}\n单词释义：${rest.trans}\n只返回JSON。`
    const MAX_RETRIES = 3
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const text = await localCallAI({
        provider: rest.provider,
        apiKey: rest.apiKey,
        baseUrl: rest.baseUrl,
        model: rest.model,
        systemPrompt,
        userPrompt,
      })
      try {
        return parseAIJSON(text) as SentenceData
      } catch {
        if (attempt === MAX_RETRIES) {
          throw new Error(`AI 返回了 ${MAX_RETRIES} 次无法解析的 JSON，请重试`)
        }
      }
    }
    throw new Error('Unreachable')
  }

  // Server mode - include language in request body
  const body = { ...rest, language } as unknown as Record<string, unknown>
  const resp = await serverFetch('/ai/generate-sentence', body)
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText }))
    throw new Error(normalizeServerErrorMessage(err, resp.status))
  }
  return resp.json()
}

export async function testConnection(params: {
  provider: string
  apiKey: string
  baseUrl: string
  model: string
  requestMode?: AIRequestMode
}): Promise<{ status: string }> {
  const { requestMode = 'server', ...rest } = params

  if (requestMode === 'local') {
    await localCallAI({ ...rest, systemPrompt: '', userPrompt: 'Hi', maxTokens: 10 })
    return { status: 'ok' }
  }

  const resp = await serverFetch('/ai/test-connection', rest as unknown as Record<string, unknown>)
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText }))
    throw new Error(normalizeServerErrorMessage(err, resp.status))
  }
  return resp.json()
}

export async function listModels(params: {
  provider: string
  apiKey: string
  baseUrl: string
  requestMode?: AIRequestMode
}): Promise<string[]> {
  const { requestMode = 'server', ...rest } = params

  if (requestMode === 'local') {
    if (rest.provider === 'anthropic') {
      return [
        'claude-opus-4-5',
        'claude-sonnet-4-5',
        'claude-haiku-4-5',
        'claude-sonnet-4-20250514',
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'claude-3-haiku-20240307',
      ]
    }
    const url = rest.baseUrl || 'https://api.openai.com'
    try {
      const resp = await fetch(`${url}/v1/models`, { headers: buildOpenAIHeaders(rest.apiKey) })
      if (!resp.ok) throw new Error(`Failed to fetch models: ${await resp.text()}`)
      const data = await resp.json()
      return (data.data || [])
        .map((m: { id: string }) => m.id)
        .filter((id: unknown) => typeof id === 'string')
        .sort() as string[]
    } catch (err) {
      if (err instanceof TypeError && (err.message === 'Failed to fetch' || err.message.includes('NetworkError'))) {
        throw new Error('本地模式获取模型列表失败（CORS 跨域限制），请切换到服务器模式或手动输入模型名称。')
      }
      throw err
    }
  }

  const resp = await serverFetch('/ai/list-models', rest as unknown as Record<string, unknown>)
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText }))
    throw new Error(normalizeServerErrorMessage(err, resp.status))
  }
  const data = await resp.json()
  return data.models as string[]
}

export function sentenceToMarkdown(word: string, data: SentenceData): string {
  let md = `## ${word}\n\n`
  md += `**Sentence:** ${data.sentence}\n\n`
  md += `**目标单词用法:** ${data.targetWordUsage}\n\n`

  if (data.grammarPoints.length > 0) {
    md += `### 语法点\n\n`
    data.grammarPoints.forEach((gp, i) => {
      md += `${i + 1}. **${gp.point}**: ${gp.explanation}\n`
    })
    md += '\n'
  }

  if (data.vocabNotes.length > 0) {
    md += `### 词汇注释\n\n`
    data.vocabNotes.forEach((vn) => {
      md += `- **${vn.word}**: ${vn.explanation}\n`
    })
    md += '\n'
  }

  return md
}

export async function askTeacher(params: {
  provider: string
  apiKey: string
  baseUrl: string
  model: string
  sentence: string
  word: string
  targetWordUsage: string
  question: string
  requestMode?: AIRequestMode
  language?: LanguageType
}): Promise<{ answer: string }> {
  const { requestMode = 'server', language, ...rest } = params
  const langInfo = getLanguageInfo(language)

  if (requestMode === 'local') {
    const systemPrompt = `你是一位专业的${langInfo.name}老师，学生正在练习${langInfo.name}句子。请用中文简洁清晰地回答学生的问题。
如果问题涉及语法、词义或翻译，请结合给出的句子具体解释，不超过200字。`
    const userPrompt = `我正在练习这个${langInfo.name}句子：\n"${rest.sentence}"\n\n目标词 "${rest.word}" 的用法：${
      rest.targetWordUsage || '（未提供）'
    }\n\n我的问题：${rest.question}`
    const answer = await localCallAI({
      provider: rest.provider,
      apiKey: rest.apiKey,
      baseUrl: rest.baseUrl,
      model: rest.model,
      systemPrompt,
      userPrompt,
      maxTokens: 512,
      temperature: 0.7,
    })
    return { answer }
  }

  const body = { ...rest, language } as unknown as Record<string, unknown>
  const resp = await serverFetch('/ai/ask-teacher', body)
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText }))
    throw new Error(normalizeServerErrorMessage(err, resp.status))
  }
  return resp.json()
}
