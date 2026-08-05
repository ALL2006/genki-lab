import type { RawItem, TrendSignal } from '../../shared/types.js'
import type { AIProvider, EvidenceInputItem, GeneratedProductConcept, GeneratedTrendSignal } from './AIProvider.js'

function evidence(item: RawItem) {
  return [{ sourceItemId: item.id, quote: item.rawText }]
}

export class MockAIProvider implements AIProvider {
  readonly name = 'mock' as const
  readonly model = 'mock-evidence-v1'
  readonly mode = 'mock' as const
  readonly isAutomated = true
  readonly isDemo = true
  readonly delivery = 'synchronous' as const

  async analyzeEvidence(items: EvidenceInputItem[]) {
    const flavorLabels = ['清爽', '甜度适中', '过甜', '甜味不足', '代糖味明显', '后味明显', '气泡感强', '气泡感弱', '果味自然', '香精感明显', '口味寡淡', '口味浓郁', '酸味适中', '过酸', '冰镇后更好喝']
    const sceneLabels = ['日常解渴', '吃饭佐餐', '火锅烧烤', '运动健身', '工作学习', '通勤', '聚会', '户外旅行', '下午茶', '控糖减脂', '熬夜']
    const negativeLabels = ['过甜', '甜味不足', '代糖味明显', '后味明显', '气泡感弱', '香精感明显', '口味寡淡', '过酸', '价格偏高', '关注甜味剂', '关注添加剂']
    const outputs = items.map((item) => {
      const role = item.sourceKind === 'consumer_comment'
        ? 'consumer_evidence'
        : item.dataSourceType === 'brand_news' || item.dataSourceType === 'public_product'
          ? 'market_evidence'
          : 'background_evidence'
      const flavors = flavorLabels.filter((label) => item.rawText.includes(label.replace('明显', '').replace('适中', '')))
      const scenes = sceneLabels.filter((label) => item.rawText.includes(label.slice(0, 2)))
      const negativeSignals = negativeLabels.filter((label) => item.rawText.includes(label.replace('明显', '').replace('关注', '')))
      const positiveSignals = ['好喝', '喜欢', '清爽', '满意', '回购'].filter((label) => item.rawText.includes(label))
      const quote = item.rawText.trim().slice(0, 120)
      return {
        itemId: item.id,
        evidenceRole: role,
        relevanceScore: role === 'consumer_evidence' ? 0.8 : 0.65,
        relevanceReason: 'MockAIProvider 仅按固定关键词生成，用于离线回归，不代表真实模型判断。',
        brands: [],
        productCategories: [],
        flavors,
        consumerNeeds: [],
        scenes,
        positiveSignals,
        negativeSignals,
        riskSignals: negativeSignals,
        signalType: role === 'consumer_evidence' ? 'consumer_preference' : role === 'market_evidence' ? 'product_launch' : 'safety_context',
        evidenceQuotes: quote ? [{ quote, supports: '原始文本片段' }] : [],
        confidence: 0.6,
        eligibleForConceptGeneration: role === 'consumer_evidence' && Boolean(quote),
      }
    })
    return {
      outputs,
      rawResponse: { provider: this.name, outputs },
      retryCount: 0,
      tokenUsage: null,
      outputCharacters: JSON.stringify(outputs).length,
    }
  }

  async analyzeLegacy(items: RawItem[]): Promise<GeneratedTrendSignal[]> {
    return items.map((item, index) => {
      const templates: Array<Omit<GeneratedTrendSignal, 'sourceItemIds' | 'evidence'>> = [
        {
          trendName: '清爽气泡 × 冰镇场景', brand: '多品牌', productCategory: '气泡饮料',
          flavors: ['清爽', '细密气泡'], consumerNeeds: ['解渴', '轻盈口感'], scenes: ['下午学习', '通勤'],
          sentiment: 'positive', signalType: 'scene', confidence: 0.88,
          risk: '该结论来自模拟资料，且真实样本的场景标签仍偏少。',
        },
        {
          trendName: '葡萄果味需要强化自然感', brand: '元气森林及竞品', productCategory: '果味气泡水',
          flavors: ['青提', '葡萄'], consumerNeeds: ['真实果味', '避免香精感'], scenes: ['日常解渴'],
          sentiment: 'mixed', signalType: 'flavor', confidence: 0.84,
          risk: '葡萄偏好不能直接证明青提茉莉组合已被市场验证。',
        },
        {
          trendName: '低负担不应牺牲口感', brand: '无糖饮料品类', productCategory: '零糖饮料',
          flavors: ['轻甜'], consumerNeeds: ['零糖', '配料透明', '无代糖后味'], scenes: ['控糖减脂', '日常饮用'],
          sentiment: 'mixed', signalType: 'health', confidence: 0.86,
          risk: '健康表达必须合规，不能将概念测试等同于功效验证。',
        },
        {
          trendName: '轻花香复合风味进入概念测试', brand: '多品牌', productCategory: '果味气泡茶',
          flavors: ['青提', '茉莉'], consumerNeeds: ['风味层次', '轻盈回味'], scenes: ['下午放松', '轻社交'],
          sentiment: 'mixed', signalType: 'flavor', confidence: 0.78,
          risk: '花香过重可能产生香水感，需要测试不同强度。',
        },
        {
          trendName: '竞品新品采用场景化小步验证', brand: '竞品集合', productCategory: '即饮饮料',
          flavors: [], consumerNeeds: ['场景匹配', '快速验证'], scenes: ['通勤', '学习', '轻社交'],
          sentiment: 'neutral', signalType: 'competitor', confidence: 0.8,
          risk: '仅为方法信号，不代表具体竞品销量或市场表现。',
        },
      ]
      const template = templates[index % templates.length]
      return { ...template, sourceItemIds: [item.id], evidence: evidence(item) }
    })
  }

  async generateProducts(signals: TrendSignal[]): Promise<GeneratedProductConcept[]> {
    const sourceSignalIds = signals.map((signal) => signal.id)
    return [
      {
        sourceSignalIds,
        productName: '青提茉莉轻气泡茶',
        flavorCombination: ['青提', '轻茉莉', '细密气泡'],
        targetAudience: '18—25岁学生与初入职场人群',
        scenes: ['下午学习', '日常通勤', '轻松休息'],
        valueProposition: '用自然青提清甜和轻茉莉回味，提供不腻、轻盈的低负担气泡体验。',
        sellingPoints: ['青提清甜', '茉莉轻香', '细密气泡', '0糖概念方向'],
        risks: ['花香强度需验证', '避免香精感', '0糖表达需合规审核'],
        aiScore: 91,
      },
      {
        sourceSignalIds,
        productName: '青提白茶微气泡',
        flavorCombination: ['青提', '白茶', '柔和气泡'],
        targetAudience: '偏好低甜与茶感的年轻消费者',
        scenes: ['办公室', '佐餐', '通勤'],
        valueProposition: '以更克制的茶感和微气泡降低甜腻感，强调日常耐喝。',
        sellingPoints: ['茶感清晰', '微酸鲜活', '柔和气泡'],
        risks: ['可能被评价为口味寡淡', '产品差异化需要进一步验证'],
        aiScore: 84,
      },
      {
        sourceSignalIds,
        productName: '葡萄柚茉莉爽气泡',
        flavorCombination: ['葡萄柚', '茉莉', '强气泡'],
        targetAudience: '喜欢鲜明酸感与强刺激气泡的Z世代消费者',
        scenes: ['聚会', '火锅烧烤', '户外'],
        valueProposition: '用葡萄柚酸感和强气泡建立更有冲击力的解腻体验。',
        sellingPoints: ['酸爽解腻', '强气泡', '聚会场景明确'],
        risks: ['与青提方向证据关联较弱', '酸度接受度分化'],
        aiScore: 79,
      },
    ]
  }
}
