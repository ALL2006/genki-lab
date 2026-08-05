import type { AIProvider, EvidenceInputItem } from './AIProvider.js'

export class ManualJsonAIProvider implements AIProvider {
  readonly name = 'manual-json' as const
  readonly model = null
  readonly mode = 'manual_import' as const
  readonly isAutomated = false
  readonly isDemo = false
  readonly delivery = 'manual' as const

  async analyzeEvidence(_items: EvidenceInputItem[]): Promise<never> {
    throw new Error('ManualJsonAIProvider 不直接调用模型：请导出批次，在豆包企业版处理后通过 /api/ai-results/import 导入。')
  }
}

