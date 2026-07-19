import { ArrowRight } from 'lucide-react'

interface FlowStep {
  label: string
  note?: string
}

interface FlowDiagramProps {
  steps: FlowStep[]
  compact?: boolean
}

export function FlowDiagram({ steps, compact = false }: FlowDiagramProps) {
  return (
    <div className={`flow-diagram${compact ? ' flow-diagram--compact' : ''}`} aria-label="系统流程">
      {steps.map((step, index) => (
        <div className="flow-diagram__group" key={step.label}>
          <div className="flow-diagram__step">
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{step.label}</strong>
            {step.note && <small>{step.note}</small>}
          </div>
          {index < steps.length - 1 && <ArrowRight className="flow-diagram__arrow" size={18} aria-hidden="true" />}
        </div>
      ))}
    </div>
  )
}
