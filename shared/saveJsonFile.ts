export const DEFAULT_BATCH_EXPORT_FILE_NAME = 'B2-PILOT-01-input.json'

interface JsonFileWritable {
  write(data: Blob): Promise<void>
  close(): Promise<void>
}

interface JsonFileHandle {
  name?: string
  createWritable(): Promise<JsonFileWritable>
}

export interface JsonSaveFilePickerOptions {
  suggestedName: string
  excludeAcceptAllOption: boolean
  types: Array<{
    description: string
    accept: Record<string, string[]>
  }>
}

export type JsonSaveFilePicker = (options: JsonSaveFilePickerOptions) => Promise<JsonFileHandle>

interface SaveJsonFileOptions {
  getBlob: () => Blob | Promise<Blob>
  fileName?: string
  showSaveFilePicker?: JsonSaveFilePicker
  fallbackDownload: (blob: Blob, fileName: string) => void
}

export interface SaveJsonFileResult {
  fileName: string
  mode: 'saved' | 'downloaded'
}

export async function saveJsonFile({
  getBlob,
  fileName = DEFAULT_BATCH_EXPORT_FILE_NAME,
  showSaveFilePicker,
  fallbackDownload,
}: SaveJsonFileOptions): Promise<SaveJsonFileResult> {
  if (!showSaveFilePicker) {
    const blob = await getBlob()
    fallbackDownload(blob, fileName)
    return { fileName, mode: 'downloaded' }
  }

  const handle = await showSaveFilePicker({
    suggestedName: fileName,
    excludeAcceptAllOption: true,
    types: [{
      description: 'JSON 文件',
      accept: { 'application/json': ['.json'] },
    }],
  })
  const blob = await getBlob()
  const writable = await handle.createWritable()
  await writable.write(blob)
  await writable.close()
  return { fileName: handle.name || fileName, mode: 'saved' }
}
