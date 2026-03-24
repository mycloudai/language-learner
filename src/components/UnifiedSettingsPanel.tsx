import type { AIConfig, AIDifficulty, AIProvider, AIStyle, AIUserContext } from '@/store/aiConfig'
import { aiConfigAtom, aiDifficultyAtom, aiStyleAtom, aiUserContextAtom } from '@/store/aiConfig'
import { listModels, testConnection } from '@/utils/aiService'
import type { ExportProgress, ImportProgress } from '@/utils/db/data-export'
import { exportUnifiedBackupBlob, importUnifiedBackupFromFile } from '@/utils/unifiedDataBackup'
import { useAtom } from 'jotai'
import { useCallback, useEffect, useMemo, useState } from 'react'

// ── Constants ────────────────────────────────────────────────────

const PROVIDER_OPTIONS: { value: AIProvider; label: string }[] = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'custom', label: 'OpenAI 兼容（DeepSeek、Ollama 等）' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'anthropic-compatible', label: 'Anthropic 兼容' },
]

const MODEL_PRESETS: Record<AIProvider, string[]> = {
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-sonnet-4-5', 'claude-haiku-4-5', 'claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
  'anthropic-compatible': [],
  custom: [],
}

const DIFFICULTY_OPTIONS: { value: AIDifficulty; label: string }[] = [
  { value: 'easy', label: '简单' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '困难' },
]

const STYLE_OPTIONS: { value: AIStyle; label: string }[] = [
  { value: 'formal', label: '书面语' },
  { value: 'spoken', label: '口语' },
]

type SettingsTab = 'ai' | 'data'

interface Props {
  onClose: () => void
  defaultTab?: SettingsTab
}

// ── Main panel ───────────────────────────────────────────────────

export default function UnifiedSettingsPanel({ onClose, defaultTab = 'ai' }: Props) {
  const [tab, setTab] = useState<SettingsTab>(defaultTab)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="flex w-full max-w-xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-800"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-500">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">设置</h2>
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

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {[
            { key: 'ai' as const, icon: '🤖', label: 'AI 设置' },
            { key: 'data' as const, icon: '💾', label: '数据管理' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                tab === t.key
                  ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">{tab === 'ai' ? <AISettingsSection /> : <DataManagementSection />}</div>
      </div>
    </div>
  )
}

// ── AI Settings Tab ──────────────────────────────────────────────

export function AISettingsSection() {
  const [aiConfig, setAiConfig] = useAtom(aiConfigAtom)
  const [difficulty, setDifficulty] = useAtom(aiDifficultyAtom)
  const [style, setStyle] = useAtom(aiStyleAtom)
  const [userContext, setUserContext] = useAtom(aiUserContextAtom)

  const [localConfig, setLocalConfig] = useState<AIConfig>({ ...aiConfig, requestMode: 'server' })
  const [localDifficulty, setLocalDifficulty] = useState<AIDifficulty>(difficulty)
  const [localStyle, setLocalStyle] = useState<AIStyle>(style)
  const [localContext, setLocalContext] = useState<AIUserContext>(userContext)
  const [customModelInput, setCustomModelInput] = useState(aiConfig.model || '')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [fetchedModels, setFetchedModels] = useState<string[]>([])
  const [fetchingModels, setFetchingModels] = useState(false)
  const [fetchModelError, setFetchModelError] = useState<string | null>(null)

  // atomWithStorage may hydrate asynchronously on first load; keep local form state synced.
  useEffect(() => {
    setLocalConfig({ ...aiConfig, requestMode: 'server' })
    setCustomModelInput(aiConfig.model || '')
  }, [aiConfig])

  useEffect(() => {
    setLocalDifficulty(difficulty)
  }, [difficulty])

  useEffect(() => {
    setLocalStyle(style)
  }, [style])

  useEffect(() => {
    setLocalContext(userContext)
  }, [userContext])

  const needsBaseUrl = localConfig.provider === 'custom' || localConfig.provider === 'anthropic-compatible'

  const allModels = useMemo(() => {
    const presets = MODEL_PRESETS[localConfig.provider] || []
    if (fetchedModels.length === 0) return presets
    return Array.from(new Set(presets.concat(fetchedModels))).sort()
  }, [fetchedModels, localConfig.provider])

  const handleTestConnection = useCallback(async () => {
    setTesting(true)
    setTestResult(null)
    try {
      await testConnection({
        provider: localConfig.provider,
        apiKey: localConfig.apiKey,
        baseUrl: localConfig.baseUrl,
        model: localConfig.model,
        requestMode: 'server',
      })
      setTestResult({ ok: true, message: '✅ 连接成功' })
    } catch (err) {
      setTestResult({ ok: false, message: `❌ ${err instanceof Error ? err.message : String(err)}` })
    } finally {
      setTesting(false)
    }
  }, [localConfig])

  const handleFetchModels = useCallback(async () => {
    setFetchingModels(true)
    setFetchModelError(null)
    setFetchedModels([])
    try {
      const models = await listModels({
        provider: localConfig.provider,
        apiKey: localConfig.apiKey,
        baseUrl: localConfig.baseUrl,
        requestMode: 'server',
      })
      setFetchedModels(models)
      if (models.length > 0 && !models.includes(localConfig.model)) {
        setLocalConfig((c) => ({ ...c, model: models[0] }))
        setCustomModelInput(models[0])
      }
    } catch (err) {
      setFetchModelError(err instanceof Error ? err.message : String(err))
    } finally {
      setFetchingModels(false)
    }
  }, [localConfig])

  const persistConfig = useCallback(
    (updater: (prev: AIConfig) => AIConfig) => {
      setLocalConfig((prev) => {
        const next: AIConfig = { ...updater(prev), requestMode: 'server' }
        setAiConfig({ ...next, isConfigured: Boolean(next.apiKey.trim()) })
        return next
      })
    },
    [setAiConfig],
  )

  const selectClasses =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
  const inputClasses = selectClasses
  const labelClasses = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1'

  return (
    <div className="space-y-5 px-6 py-5">
      {/* Provider */}
      <div>
        <label className={labelClasses}>AI 提供商</label>
        <select
          value={localConfig.provider}
          onChange={(e) => {
            const p = e.target.value as AIProvider
            const nextModel = MODEL_PRESETS[p][0] || ''
            persistConfig((c) => ({ ...c, provider: p, model: nextModel || c.model }))
            setCustomModelInput(nextModel)
            setFetchedModels([])
            setTestResult(null)
          }}
          className={selectClasses}
        >
          {PROVIDER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* API Key + Base URL */}
      <div className={needsBaseUrl ? 'grid grid-cols-2 gap-4' : ''}>
        <div>
          <label className={labelClasses}>API Key</label>
          <input
            type="password"
            value={localConfig.apiKey}
            onChange={(e) => {
              persistConfig((c) => ({ ...c, apiKey: e.target.value }))
              setTestResult(null)
            }}
            placeholder={localConfig.provider.startsWith('anthropic') ? 'sk-ant-...' : 'sk-...'}
            className={inputClasses}
          />
        </div>
        {needsBaseUrl && (
          <div>
            <label className={labelClasses}>Base URL</label>
            <input
              type="text"
              value={localConfig.baseUrl}
              onChange={(e) => persistConfig((c) => ({ ...c, baseUrl: e.target.value }))}
              placeholder="https://api.example.com"
              className={inputClasses}
            />
          </div>
        )}
      </div>

      {/* Model */}
      <div>
        <div className="flex items-center justify-between">
          <label className={labelClasses}>模型</label>
          <button
            onClick={handleFetchModels}
            disabled={fetchingModels || !localConfig.apiKey}
            className="mb-1 flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-40 dark:text-blue-400 dark:hover:bg-blue-900/20"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className={fetchingModels ? 'animate-spin' : ''}
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            {fetchingModels ? '获取中...' : '从API获取'}
          </button>
        </div>
        {fetchModelError && <p className="mb-1 text-[10px] text-red-500">{fetchModelError}</p>}
        <input
          id="unified-model-input"
          type="text"
          list="unified-model-datalist"
          value={customModelInput}
          onChange={(e) => {
            setCustomModelInput(e.target.value)
            persistConfig((c) => ({ ...c, model: e.target.value }))
          }}
          placeholder="输入或选择模型ID"
          className={`${inputClasses} w-full`}
        />
        {allModels.length > 0 && (
          <datalist id="unified-model-datalist">
            {allModels.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        )}
      </div>

      {/* Test connection */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleTestConnection}
          disabled={testing || !localConfig.apiKey || !localConfig.model}
          className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {testing ? (
            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          )}
          {testing ? '测试中...' : '测试连接'}
        </button>
        {testResult && (
          <span className={`text-xs ${testResult.ok ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>{testResult.message}</span>
        )}
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700" />

      {/* Difficulty + Style */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClasses}>难度</label>
          <div className="flex rounded-lg bg-gray-100 p-0.5 dark:bg-gray-700">
            {DIFFICULTY_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => {
                  setLocalDifficulty(o.value)
                  setDifficulty(o.value)
                }}
                className={`flex-1 rounded-md py-1.5 text-xs font-medium transition ${
                  localDifficulty === o.value
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={labelClasses}>风格</label>
          <div className="flex rounded-lg bg-gray-100 p-0.5 dark:bg-gray-700">
            {STYLE_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => {
                  setLocalStyle(o.value)
                  setStyle(o.value)
                }}
                className={`flex-1 rounded-md py-1.5 text-xs font-medium transition ${
                  localStyle === o.value
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* User context */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClasses}>你的职业（可选）</label>
          <input
            type="text"
            value={localContext.profession}
            onChange={(e) => {
              setLocalContext((c) => {
                const next = { ...c, profession: e.target.value }
                setUserContext(next)
                return next
              })
            }}
            placeholder="如：工程师、医生"
            className={inputClasses}
          />
        </div>
        <div>
          <label className={labelClasses}>练习场景（可选）</label>
          <input
            type="text"
            value={localContext.scenario}
            onChange={(e) => {
              setLocalContext((c) => {
                const next = { ...c, scenario: e.target.value }
                setUserContext(next)
                return next
              })
            }}
            placeholder="如：技术面试、学术写作"
            className={inputClasses}
          />
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
        <p className="text-[10px] text-gray-400">输入即自动保存到浏览器本地，API Key 不会上传。</p>
      </div>
    </div>
  )
}

// ── Data Management Tab ──────────────────────────────────────────

interface SectionState {
  exporting: boolean
  exportPct: number
  importing: boolean
  importPct: number
  message: string | null
  isError: boolean
}

const initSection = (): SectionState => ({ exporting: false, exportPct: 0, importing: false, importPct: 0, message: null, isError: false })

export function DataManagementSection() {
  const [unified, setUnified] = useState<SectionState>(initSection)

  const handleUnifiedExport = useCallback(async () => {
    setUnified((s) => ({ ...s, exporting: true, exportPct: 0, message: null, isError: false }))
    try {
      const blob = await exportUnifiedBackupBlob(({ totalRows, completedRows, done }: ExportProgress) => {
        if (done) return true
        if (totalRows) {
          const pct = Math.floor((completedRows / totalRows) * 100)
          setUnified((s) => ({ ...s, exportPct: pct }))
        }
        return true
      })

      const [{ saveAs }] = await Promise.all([import('file-saver')])
      const dateTag = new Date().toISOString().slice(0, 10)
      saveAs(blob, `MyCloudAI-Learner-Backup-${dateTag}.gz`)

      setUnified((s) => ({
        ...s,
        exporting: false,
        exportPct: 100,
        message: '统一导出完成：已导出单个 .gz 备份文件。提示：AI API Key 出于安全原因不会被导出。',
        isError: false,
      }))
    } catch (err) {
      setUnified((s) => ({
        ...s,
        exporting: false,
        message: `统一导出失败：${err instanceof Error ? err.message : String(err)}`,
        isError: true,
      }))
    }
  }, [])

  const handleUnifiedImport = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/gzip,.gz'
    input.onchange = async () => {
      const file = input.files?.[0]

      if (!file) {
        setUnified((s) => ({
          ...s,
          message: '请选择统一备份的 .gz 文件进行导入。',
          isError: true,
        }))
        return
      }

      setUnified((s) => ({ ...s, importing: true, importPct: 0, message: null, isError: false }))

      try {
        const sentenceResult = await importUnifiedBackupFromFile(
          file,
          () => undefined,
          ({ totalRows, completedRows, done }: ImportProgress) => {
            if (done) {
              setUnified((s) => ({ ...s, importPct: 100 }))
              return true
            }
            if (totalRows) {
              const pct = Math.floor((completedRows / totalRows) * 100)
              setUnified((s) => ({ ...s, importPct: pct }))
            }
            return true
          },
        )

        const reminder = '导入后请在设置中重新确认 AI API Key。'
        const warningText = sentenceResult.warnings.length ? `\n⚠️ ${sentenceResult.warnings.join('\n')}` : ''
        setUnified((s) => ({
          ...s,
          importing: false,
          importPct: 100,
          message: `统一导入完成：已恢复打字数据和 ${sentenceResult.count} 条收藏句子。\n${reminder}${warningText}\n页面将在 2 秒后刷新。`,
          isError: false,
        }))
        setTimeout(() => window.location.reload(), 2000)
      } catch (err) {
        setUnified((s) => ({
          ...s,
          importing: false,
          message: `统一导入失败：${err instanceof Error ? err.message : String(err)}`,
          isError: true,
        }))
      }
    }
    input.click()
  }, [])

  return (
    <div className="space-y-5 px-6 py-5">
      <DataSection
        title="统一备份"
        icon="🧩"
        description="导出为单个 .gz 文件，包含打字数据与句子收藏数据。导入同一个 .gz 文件即可完整恢复。"
        warningImport="导入会覆盖当前打字数据和句子收藏数据。注意：AI API Key 不会导入，需在设置中重新配置。"
        state={unified}
        onExport={handleUnifiedExport}
        onImport={handleUnifiedImport}
      />
    </div>
  )
}

function DataSection({
  title,
  icon,
  description,
  warningImport,
  state,
  onExport,
  onImport,
}: {
  title: string
  icon: string
  description: string
  warningImport?: string
  state: SectionState
  onExport: () => void
  onImport: () => void
}) {
  return (
    <div className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <span className="text-sm font-semibold text-gray-800 dark:text-white">{title}</span>
      </div>
      <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">{description}</p>
      {warningImport && <p className="text-xs font-medium text-red-500 dark:text-red-400">{warningImport}</p>}

      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <button
            onClick={onExport}
            disabled={state.exporting}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {state.exporting ? `导出中 ${state.exportPct}%` : '导出'}
          </button>
          <button
            onClick={onImport}
            disabled={state.importing}
            className="rounded-lg border border-gray-300 px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {state.importing ? `导入中 ${state.importPct}%` : '导入'}
          </button>
        </div>
        {state.exporting && state.exportPct > 0 && <ProgressBar pct={state.exportPct} />}
        {state.importing && state.importPct > 0 && <ProgressBar pct={state.importPct} />}
        {state.message && (
          <p className={`whitespace-pre-line text-xs ${state.isError ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
            {state.message}
          </p>
        )}
      </div>
    </div>
  )
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
      <div className="h-full bg-indigo-400 transition-all duration-300" style={{ width: `${pct}%` }} />
    </div>
  )
}
