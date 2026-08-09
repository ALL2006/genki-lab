import { randomUUID } from 'node:crypto'
import { appendFile, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'

export class CorruptJsonFileError extends Error {
  constructor(readonly filePath: string, cause: unknown) {
    super(`JSON数据文件损坏，已保留原文件：${filePath}`, { cause })
    this.name = 'CorruptJsonFileError'
  }
}

async function logStorageError(filePath: string, operation: string, error: unknown) {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  const line = `${new Date().toISOString()}\t${operation}\t${basename(filePath)}\t${message.replace(/[\r\n]+/g, ' ')}\n`
  await appendFile(join(dirname(filePath), 'repository-errors.log'), line, 'utf8').catch(() => undefined)
}

export async function readJsonStrict<T>(filePath: string): Promise<T> {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as T
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw error
    await logStorageError(filePath, 'read', error)
    if (error instanceof SyntaxError) throw new CorruptJsonFileError(filePath, error)
    throw error
  }
}

export async function writeJsonAtomic(filePath: string, value: unknown) {
  await mkdir(dirname(filePath), { recursive: true })
  const temporaryPath = join(dirname(filePath), `.${basename(filePath)}.${randomUUID()}.tmp`)
  try {
    await writeFile(temporaryPath, JSON.stringify(value, null, 2), { encoding: 'utf8', flag: 'wx' })
    await rename(temporaryPath, filePath)
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined)
    await logStorageError(filePath, 'write', error)
    throw error
  }
}
