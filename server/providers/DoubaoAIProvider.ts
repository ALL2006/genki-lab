import type { RawItem, TrendSignal } from '../../shared/types.js'
import type { AIProvider, EvidenceInputItem, GeneratedProductConcept, GeneratedTrendSignal } from './AIProvider.js'

export class DoubaoAIProvider implements AIProvider {
  readonly name = 'ark-doubao' as const
  readonly model = null
  readonly mode = 'api' as const
  readonly isAutomated = true
  readonly isDemo = false
  readonly delivery = 'synchronous' as const
  private unavailable(): never {
    throw new Error('DoubaoAIProvider 尚未接入：第二阶段需配置模型端点、密钥、结构化输出 Schema 与重试策略。')
  }
  async analyzeEvidence(_items: EvidenceInputItem[]): Promise<never> { return this.unavailable() }
  async analyzeLegacy(_items: RawItem[]): Promise<GeneratedTrendSignal[]> { return this.unavailable() }
  async generateProducts(_signals: TrendSignal[]): Promise<GeneratedProductConcept[]> { return this.unavailable() }
}
