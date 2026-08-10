import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { isAbsolute, resolve } from 'node:path'

export class DataPathResolver {
  readonly dataDir: string

  constructor(dataDir = process.env.DATA_DIR ?? 'data') {
    this.dataDir = resolve(dataDir)
  }

  resolve(...segments: string[]) {
    return resolve(this.dataDir, ...segments)
  }

  resolveConfigured(configuredPath: string | undefined, fallbackRelativePath: string) {
    if (!configuredPath) return this.resolve(fallbackRelativePath)
    return isAbsolute(configuredPath) ? configuredPath : resolve(configuredPath)
  }

  async ensureDataDirectory() {
    await mkdir(this.dataDir, { recursive: true })
    return this.dataDir
  }

  async isWritable() {
    const probe = this.resolve(`.write-probe-${randomUUID()}`)
    try {
      await this.ensureDataDirectory()
      await writeFile(probe, 'ok', { encoding: 'utf8', flag: 'wx' })
      await unlink(probe)
      return true
    } catch {
      await unlink(probe).catch(() => undefined)
      return false
    }
  }
}
