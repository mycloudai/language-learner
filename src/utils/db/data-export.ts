import { db } from '.'
import { getCurrentDate, recordDataAction } from '..'

export type ExportProgress = {
  totalRows?: number
  completedRows: number
  done: boolean
}

export type ImportProgress = {
  totalRows?: number
  completedRows: number
  done: boolean
}

export async function exportDatabaseCompressedBlob(callback: (exportProgress: ExportProgress) => boolean): Promise<Blob> {
  const [pako] = await Promise.all([import('pako'), import('dexie-export-import')])

  const blob = await db.export({
    progressCallback: ({ totalRows, completedRows, done }) => {
      return callback({ totalRows, completedRows, done })
    },
  })

  const json = await blob.text()
  const compressed = pako.gzip(json)
  const binary = new Uint8Array(compressed)
  return new Blob([binary.buffer])
}

export async function exportDatabase(callback: (exportProgress: ExportProgress) => boolean) {
  const [{ saveAs }, compressedBlob] = await Promise.all([import('file-saver'), exportDatabaseCompressedBlob(callback)])
  const [wordCount, chapterCount] = await Promise.all([db.wordRecords.count(), db.chapterRecords.count()])

  const currentDate = getCurrentDate()
  saveAs(compressedBlob, `MyCloudAI-Learner-User-Data-${currentDate}.gz`)
  recordDataAction({ type: 'export', size: compressedBlob.size, wordCount, chapterCount })
}

export async function importDatabase(onStart: () => void, callback: (importProgress: ImportProgress) => boolean) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'application/gzip'
  input.addEventListener('change', async () => {
    const file = input.files?.[0]
    if (!file) return

    await importDatabaseFromFile(file, onStart, callback)
  })

  input.click()
}

export async function importDatabaseFromFile(file: File, onStart: () => void, callback: (importProgress: ImportProgress) => boolean) {
  const compressed = await file.arrayBuffer()
  await importDatabaseFromCompressedBuffer(compressed, onStart, callback, file.size)
}

export async function importDatabaseFromCompressedBuffer(
  compressed: ArrayBuffer,
  onStart: () => void,
  callback: (importProgress: ImportProgress) => boolean,
  sourceSize = compressed.byteLength,
) {
  const [pako] = await Promise.all([import('pako'), import('dexie-export-import')])

  onStart()

  const json = pako.ungzip(compressed, { to: 'string' })
  const blob = new Blob([json])

  await db.import(blob, {
    acceptVersionDiff: true,
    acceptMissingTables: true,
    acceptNameDiff: false,
    acceptChangedPrimaryKey: false,
    overwriteValues: true,
    clearTablesBeforeImport: true,
    progressCallback: ({ totalRows, completedRows, done }) => {
      return callback({ totalRows, completedRows, done })
    },
  })

  const [wordCount, chapterCount] = await Promise.all([db.wordRecords.count(), db.chapterRecords.count()])
  recordDataAction({ type: 'import', size: sourceSize, wordCount, chapterCount })
}
