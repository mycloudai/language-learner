import type { ExportProgress, ImportProgress } from '@/utils/db/data-export'
import { exportDatabaseCompressedBlob, importDatabaseFromCompressedBuffer } from '@/utils/db/data-export'
import type { SentenceExportData } from '@/utils/sentenceDataExport'
import { applySentenceImportData, buildSentenceExportData } from '@/utils/sentenceDataExport'

interface UnifiedBackupData {
  typingDatabaseGzipBase64: string
  sentence: SentenceExportData
}

interface UnifiedBackupPayload {
  version: '1.0'
  exportedAt: string
  note: string
  data: UnifiedBackupData
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function fromBase64(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

export async function exportUnifiedBackupBlob(callback: (exportProgress: ExportProgress) => boolean): Promise<Blob> {
  const [pako, typingBlob] = await Promise.all([import('pako'), exportDatabaseCompressedBlob(callback)])

  const payload: UnifiedBackupPayload = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    note: '统一备份包含打字数据与句子收藏数据。AI API Key 出于安全原因不会导出，导入后请重新设置。',
    data: {
      typingDatabaseGzipBase64: toBase64(await typingBlob.arrayBuffer()),
      sentence: buildSentenceExportData(),
    },
  }

  const compressed = pako.gzip(JSON.stringify(payload))
  const binary = new Uint8Array(compressed)
  return new Blob([binary.buffer], { type: 'application/gzip' })
}

export async function importUnifiedBackupFromFile(
  file: File,
  onStart: () => void,
  callback: (importProgress: ImportProgress) => boolean,
): Promise<{ count: number; warnings: string[] }> {
  const [pako] = await Promise.all([import('pako')])

  const compressed = await file.arrayBuffer()
  const json = pako.ungzip(compressed, { to: 'string' })
  const parsed = JSON.parse(json) as UnifiedBackupPayload

  if (!parsed?.data?.typingDatabaseGzipBase64 || !parsed?.data?.sentence) {
    throw new Error('备份文件格式不正确，缺少必要字段。')
  }

  await importDatabaseFromCompressedBuffer(fromBase64(parsed.data.typingDatabaseGzipBase64), onStart, callback, file.size)

  return applySentenceImportData(parsed.data.sentence)
}
