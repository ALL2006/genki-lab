import { access, link, mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { gunzipSync } from 'node:zlib'

export interface DataBootstrapResult {
  initialized: boolean
  targetPath: string
  seedPath: string
}

export async function bootstrapDataFile(targetPath: string, seedPath = resolve('data/bootstrap/mock-db.seed.json.gz.base64')): Promise<DataBootstrapResult> {
  await mkdir(dirname(targetPath), { recursive: true })
  try {
    await access(targetPath)
    console.info(`[bootstrap] skipped ${targetPath}; persistent data already exists`)
    return { initialized: false, targetPath, seedPath }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  const temporaryPath = resolve(dirname(targetPath), `.${basename(targetPath)}.bootstrap-${randomUUID()}.tmp`)

  try {
    const compressedSeed = Buffer.from((await readFile(seedPath, 'utf8')).replace(/\s+/g, ''), 'base64')
    const seedData = gunzipSync(compressedSeed)
    JSON.parse(seedData.toString('utf8'))
    await writeFile(temporaryPath, seedData, { flag: 'wx' })
    try {
      await link(temporaryPath, targetPath)
      console.info(`[bootstrap] initialized ${targetPath} from image seed ${seedPath}`)
      return { initialized: true, targetPath, seedPath }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      console.info(`[bootstrap] skipped ${targetPath}; persistent data already exists`)
      return { initialized: false, targetPath, seedPath }
    }
  } finally {
    await unlink(temporaryPath).catch(() => undefined)
  }
}
