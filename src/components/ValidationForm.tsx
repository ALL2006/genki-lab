import { Send, LockKeyhole } from 'lucide-react'

interface ValidationFormProps {
  disabled?: boolean
  onSubmit?: () => void
}

const selectFields = [
  { label: '产品兴趣', placeholder: '待产品概念确定' },
  { label: '口味偏好', placeholder: '待口味方案接入' },
  { label: '包装选择', placeholder: '待包装方案接入' },
  { label: '饮用场景', placeholder: '待场景选项接入' },
  { label: '购买意愿', placeholder: '待量表配置' },
  { label: '价格接受度', placeholder: '待价格区间配置' },
]

export function ValidationForm({ disabled = true, onSubmit }: ValidationFormProps) {
  return (
    <form className="validation-form" onSubmit={(event) => { event.preventDefault(); onSubmit?.() }}>
      <div className="validation-form__notice"><LockKeyhole size={16} /> 产品概念确定后开放填写</div>
      <div className="validation-form__grid">
        {selectFields.map((field) => (
          <label key={field.label}>
            <span>{field.label}</span>
            <select disabled={disabled} defaultValue="">
              <option value="">{field.placeholder}</option>
            </select>
          </label>
        ))}
      </div>
      <label className="validation-form__feedback">
        <span>开放式建议</span>
        <textarea disabled={disabled} rows={4} placeholder="产品概念确定后，可在此填写真实反馈。" />
      </label>
      <div className="validation-form__footer">
        <small>当前表单仅展示字段结构，不收集或提交数据。</small>
        <button className="primary-button" type="submit" disabled={disabled}>提交反馈 <Send size={16} /></button>
      </div>
    </form>
  )
}
