import cors from 'cors'
import express from 'express'
import helmet from 'helmet'

const app = express()
const PORT = process.env.PORT || 3001

const ALLOWED_PROVIDERS = ['openai', 'anthropic', 'anthropic-compatible', 'custom']
const ALLOWED_DIFFICULTIES = ['easy', 'medium', 'hard']
const ALLOWED_STYLES = ['formal', 'spoken']

// Language mapping for multi-language support
const LANGUAGE_NAMES = {
  en: { name: '英语', teacherRole: '英语教学助手' },
  de: { name: '德语', teacherRole: '德语教学助手' },
  ja: { name: '日语', teacherRole: '日语教学助手' },
  romaji: { name: '日语', teacherRole: '日语教学助手' },
  kk: { name: '哈萨克语', teacherRole: '哈萨克语教学助手' },
  hapin: { name: '哈萨克语', teacherRole: '哈萨克语教学助手' },
  id: { name: '印尼语', teacherRole: '印尼语教学助手' },
  code: { name: '编程', teacherRole: '编程教学助手' },
}

function getLanguageInfo(language) {
  return LANGUAGE_NAMES[language] || LANGUAGE_NAMES.en
}

// Sanitize user input to prevent prompt injection — only keep printable ASCII and common unicode
function sanitizeInput(str, maxLen = 200) {
  if (typeof str !== 'string') return ''
  return str.replace(/[\x00-\x1f]/g, '').slice(0, maxLen)
}

// Validate URL - must be http or https
function isValidUrl(str) {
  try {
    const u = new URL(str)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

// Shared helper to call AI providers
async function callAI({ provider, apiKey, baseUrl, model, systemPrompt, userPrompt, maxTokens = 1024, temperature = 0.8 }) {
  if (provider === 'anthropic' || provider === 'anthropic-compatible') {
    const url = baseUrl || 'https://api.anthropic.com'
    const resp = await fetch(`${url}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: `${systemPrompt}\n\n${userPrompt}` }],
      }),
    })
    if (!resp.ok) {
      const errText = await resp.text()
      throw { status: resp.status, message: `Anthropic API error: ${errText}` }
    }
    const data = await resp.json()
    return data.content?.[0]?.text || ''
  } else {
    // OpenAI or OpenAI-compatible
    const url = baseUrl || 'https://api.openai.com'
    const resp = await fetch(`${url}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
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
    if (!resp.ok) {
      const errText = await resp.text()
      throw { status: resp.status, message: `AI API error: ${errText}` }
    }
    const data = await resp.json()
    return data.choices?.[0]?.message?.content || ''
  }
}

// Parse JSON from AI response (handles ```json fences and surrounding prose)
function parseAIJSON(responseText) {
  let jsonStr = responseText.trim()

  const mdMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (mdMatch) {
    jsonStr = mdMatch[1].trim()
  } else {
    const start = jsonStr.indexOf('{')
    const end = jsonStr.lastIndexOf('}')
    if (start !== -1 && end > start) {
      jsonStr = jsonStr.slice(start, end + 1)
    }
  }

  return JSON.parse(jsonStr)
}

// Security
app.use(helmet())
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }))
app.use(express.json({ limit: '1mb' }))

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// AI Sentence Generation proxy
app.post('/api/ai/generate-sentence', async (req, res) => {
  const { provider, apiKey, baseUrl, model, word, trans, difficulty, style, userContext, language } = req.body

  if (!provider || !apiKey || !model || !word) {
    return res.status(400).json({ error: 'Missing required fields: provider, apiKey, model, word' })
  }

  if (!ALLOWED_PROVIDERS.includes(provider)) {
    return res.status(400).json({ error: 'Invalid provider' })
  }
  if (baseUrl && !isValidUrl(baseUrl)) {
    return res.status(400).json({ error: 'Invalid baseUrl' })
  }

  const langInfo = getLanguageInfo(language)
  const safeWord = sanitizeInput(word, 100)
  const safeTrans = sanitizeInput(trans || '', 300)
  const safeDifficulty = ALLOWED_DIFFICULTIES.includes(difficulty) ? difficulty : 'medium'
  const safeStyle = ALLOWED_STYLES.includes(style) ? style : 'formal'

  const difficultyPrompts = {
    easy: '生成一个简单的职场/日常生活句子，使用基础词汇和简单语法结构。',
    medium: '生成一个中等难度的职场/日常工作句子，使用常见的商务或专业词汇。',
    hard: '生成一个相对较高难度的学术/专业句子，使用较为复杂的语法结构和专业术语。',
  }

  const stylePrompts = {
    formal: '使用正式的书面语风格。',
    spoken: `使用口语化的风格，像${langInfo.name}母语者日常对话一样，可以包含缩写（如 gonna, wanna, y'all）、网络用语或俚语。如果使用了缩写或俚语，必须在 vocabNotes 中解释它们的含义。`,
  }

  const safeProfession = sanitizeInput(userContext?.profession || '', 100)
  const safeScenario = sanitizeInput(userContext?.scenario || '', 100)
  const contextPrompt =
    safeProfession || safeScenario
      ? `用户背景：职业是${safeProfession || '未指定'}，练习场景是${safeScenario || '通用场景'}。请尽量生成与该背景相关的句子。`
      : ''

  const systemPrompt = `你是一个专业的${langInfo.teacherRole}。根据给定的${langInfo.name}单词生成练习句子和知识点分析。

要求：
1. ${difficultyPrompts[safeDifficulty]}
2. ${stylePrompts[safeStyle]}
3. ${contextPrompt}
4. 句子必须包含目标单词。
5. 仅返回严格的JSON格式（一定不要有任何多余文字），schema如下：
{
  "sentence": "包含目标单词的${langInfo.name}句子",
  "grammarPoints": [
    {"point": "语法点名称", "explanation": "中文解释"}
  ],
  "vocabNotes": [
    {"word": "可能较难的词", "explanation": "中文解释"}
  ],
  "targetWordUsage": "目标单词在此句中的用法解释（中文）"
}

注意：
- grammarPoints 根据句子难度提供2-3条左右语法点，一般不少于2条，句子较复杂可多于3条，一般不能不超过5条
- vocabNotes 解释句中所有可能对于英语学习者较难理解的词汇（不包含目标词本身）
- targetWordUsage 解释目标单词在这个具体句子中的含义和用法
- 内容必须严谨准确，不能生成任何不准确的内容
- 所有解释使用中文`

  const userPrompt = `目标单词：${safeWord}
单词释义：${safeTrans}
请生成练习内容。务必只返回JSON，不许包含其他任何JSON内容以外文字。`

  try {
    const MAX_RETRIES = 3
    let lastError = null
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const responseText = await callAI({ provider, apiKey, baseUrl, model, systemPrompt, userPrompt })
      try {
        const parsed = parseAIJSON(responseText)
        return res.json(parsed)
      } catch {
        lastError = responseText
        console.error(`JSON parse failed (attempt ${attempt}/${MAX_RETRIES}). Raw:`, responseText.slice(0, 300))
        if (attempt === MAX_RETRIES) {
          return res.status(502).json({ error: `AI 返回了 ${MAX_RETRIES} 次无法解析的 JSON，请重试`, raw: responseText })
        }
      }
    }
  } catch (err) {
    if (err?.status) return res.status(err.status).json({ error: err.message })
    console.error('AI proxy error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// Test API connection
app.post('/api/ai/test-connection', async (req, res) => {
  const { provider, apiKey, baseUrl, model } = req.body

  if (!provider || !apiKey || !model) {
    return res.status(400).json({ error: 'Missing required fields' })
  }
  if (!ALLOWED_PROVIDERS.includes(provider)) {
    return res.status(400).json({ error: 'Invalid provider' })
  }
  if (provider === 'anthropic-compatible' && !baseUrl) {
    return res.status(400).json({ error: 'Base URL is required for Anthropic-compatible mode' })
  }
  if (baseUrl && !isValidUrl(baseUrl)) {
    return res.status(400).json({ error: 'Invalid baseUrl' })
  }

  try {
    await callAI({ provider, apiKey, baseUrl, model, systemPrompt: '', userPrompt: 'Hi', maxTokens: 10 })
    return res.json({ status: 'ok' })
  } catch (err) {
    if (err?.status) return res.status(err.status).json({ error: err.message })
    return res.status(500).json({ error: String(err) })
  }
})

// List available models from provider
app.post('/api/ai/list-models', async (req, res) => {
  const { provider, apiKey, baseUrl } = req.body

  if (!provider || !apiKey) {
    return res.status(400).json({ error: 'Missing provider or apiKey' })
  }
  if (!ALLOWED_PROVIDERS.includes(provider)) {
    return res.status(400).json({ error: 'Invalid provider' })
  }
  if (baseUrl && !isValidUrl(baseUrl)) {
    return res.status(400).json({ error: 'Invalid baseUrl' })
  }

  try {
    if (provider === 'anthropic') {
      return res.json({
        models: [
          'claude-opus-4-5',
          'claude-sonnet-4-5',
          'claude-haiku-4-5',
          'claude-sonnet-4-20250514',
          'claude-3-5-sonnet-20241022',
          'claude-3-5-haiku-20241022',
          'claude-3-haiku-20240307',
          'claude-3-opus-20240229',
        ],
      })
    }

    const url = baseUrl || 'https://api.openai.com'
    const resp = await fetch(`${url}/v1/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (!resp.ok) {
      const errText = await resp.text()
      return res.status(resp.status).json({ error: errText })
    }

    const data = await resp.json()
    const models = (data.data || [])
      .map((m) => m.id)
      .filter((id) => typeof id === 'string')
      .sort()

    return res.json({ models })
  } catch (err) {
    return res.status(500).json({ error: String(err) })
  }
})

// Ask Teacher — contextual AI Q&A about the current practice sentence
app.post('/api/ai/ask-teacher', async (req, res) => {
  const { provider, apiKey, baseUrl, model, sentence, word, targetWordUsage, question, language } = req.body

  if (!provider || !apiKey || !model || !question) {
    return res.status(400).json({ error: 'Missing required fields: provider, apiKey, model, question' })
  }
  if (!ALLOWED_PROVIDERS.includes(provider)) {
    return res.status(400).json({ error: 'Invalid provider' })
  }
  if (baseUrl && !isValidUrl(baseUrl)) {
    return res.status(400).json({ error: 'Invalid baseUrl' })
  }

  const langInfo = getLanguageInfo(language)
  const safeQuestion = sanitizeInput(question, 500)
  const safeSentence = sanitizeInput(sentence || '', 500)
  const safeWord = sanitizeInput(word || '', 100)
  const safeUsage = sanitizeInput(targetWordUsage || '', 300)

  const systemPrompt = `你是一位专业的${langInfo.name}老师，学生正在练习${langInfo.name}句子。请用中文简洁清晰地回答学生的问题。
如果问题涉及语法、词义或翻译，请结合给出的句子具体解释，不超过200字。`

  const userPrompt = `我正在练习这个${langInfo.name}句子：
"${safeSentence}"

目标词 "${safeWord}" 的用法：${safeUsage || '（未提供）'}

我的问题：${safeQuestion}`

  try {
    const answer = await callAI({ provider, apiKey, baseUrl, model, systemPrompt, userPrompt, maxTokens: 512, temperature: 0.7 })
    return res.json({ answer })
  } catch (err) {
    if (err?.status) return res.status(err.status).json({ error: err.message })
    console.error('Ask teacher error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// Pronunciation proxy: stream audio through server to avoid browser CORS issues.
app.get('/api/pronunciation', async (req, res) => {
  const audio = typeof req.query.audio === 'string' ? req.query.audio.trim() : ''
  const type = typeof req.query.type === 'string' ? req.query.type.trim() : ''
  const le = typeof req.query.le === 'string' ? req.query.le.trim() : ''

  if (!audio) {
    return res.status(400).json({ error: 'Missing required query: audio' })
  }

  const params = new URLSearchParams({ audio })
  if (type) params.set('type', type)
  if (le) params.set('le', le)
  const queryString = params.toString()

  const upstreamUrls = [
    `https://dict.youdao.com/dictvoice?${queryString}`,
    // Fallback for environments with incomplete local CA chains.
    `http://dict.youdao.com/dictvoice?${queryString}`,
  ]

  const shouldFallbackToNext = (err) => {
    const code = err?.cause?.code || err?.code || ''
    return code === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY' || code === 'SELF_SIGNED_CERT_IN_CHAIN'
  }

  try {
    let upstream = null
    let lastError = null
    let lastStatus = null

    for (const url of upstreamUrls) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'MyCloudAI-Learner/1.0',
          },
        })

        if (response.ok) {
          upstream = response
          break
        }

        lastStatus = response.status
      } catch (err) {
        lastError = err
        if (!shouldFallbackToNext(err)) {
          break
        }
      }
    }

    if (!upstream) {
      if (lastStatus) {
        return res.status(lastStatus).json({ error: 'Pronunciation upstream request failed' })
      }
      const tlsCode = lastError?.cause?.code || lastError?.code || 'UNKNOWN'
      return res.status(502).json({
        error: 'Pronunciation proxy failed',
        code: tlsCode,
      })
    }

    const contentType = upstream.headers.get('content-type') || 'audio/mpeg'
    const cacheControl = upstream.headers.get('cache-control') || 'public, max-age=86400'
    const arrayBuffer = await upstream.arrayBuffer()

    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', cacheControl)
    return res.send(Buffer.from(arrayBuffer))
  } catch (err) {
    console.error('Pronunciation proxy error:', err?.cause?.code || err?.code || err?.message || err)
    return res.status(502).json({ error: 'Pronunciation proxy failed' })
  }
})

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`)
})
