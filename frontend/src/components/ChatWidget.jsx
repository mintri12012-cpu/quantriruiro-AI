import { useState } from 'react'
import { api } from '../api'
import { useAnalysis } from '../AnalysisContext'

export default function ChatWidget() {
  const { current, history } = useAnalysis()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    { from: 'bot', text: '👋 Xin chào! Tôi là AI Credit Advisor. Hãy phân tích một doanh nghiệp trước, sau đó hỏi tôi bất kỳ câu hỏi nào về kết quả nhé!' },
  ])
  const [loading, setLoading] = useState(false)

  function buildContext() {
    if (!current) return 'Chưa có kết quả phân tích nào.'
    const shapSummary = (current.shap_top5 || [])
      .map((s) => `${s.feature} (${s.direction === 'tang_rui_ro' ? '+' : '-'}${Math.abs(s.impact).toFixed(3)})`)
      .join(', ')
    const histSummary = (history || []).map((h) => `${h.quarter}: ${h.pd_percent}%`).join(' | ')
    return `Doanh nghiệp: ${current.ten_cong_ty}
PD Score: ${current.pd_score} (${current.pd_percent}%)
Mức rủi ro: ${current.risk_level}
Dự báo: ${current.default_prediction === 1 ? 'Có nguy cơ vỡ nợ' : 'An toàn'}
Top features (SHAP): ${shapSummary}
Lịch sử PD theo quý: ${histSummary}`
  }

  async function send() {
    const msg = input.trim()
    if (!msg || loading) return
    setInput('')
    setMessages((m) => [...m, { from: 'user', text: msg }])
    setLoading(true)
    try {
      const res = await api.chat(msg, buildContext())
      setMessages((m) => [...m, { from: 'bot', text: res.reply }])
    } catch {
      setMessages((m) => [...m, { from: 'error', text: 'Lỗi kết nối API' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-teal to-indigo-500 shadow-lg flex items-center justify-center text-2xl z-50"
      >
        💬
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 w-90 max-w-[90vw] h-120 bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden z-50">
          <div className="px-5 py-4 bg-gradient-to-br from-teal to-indigo-500 flex justify-between items-center">
            <div>
              <div className="font-bold text-white text-sm">🤖 AI Credit Advisor</div>
              <div className="text-[11px] text-white/80">Powered by Gemini</div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white text-xl">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`rounded-xl px-3 py-2.5 text-sm max-w-[85%] ${
                  m.from === 'user'
                    ? 'bg-teal text-white self-end'
                    : m.from === 'error'
                    ? 'text-red-400 text-xs'
                    : 'bg-slate-900 text-slate-300 border-l-2 border-teal'
                }`}
              >
                {m.text}
              </div>
            ))}
            {loading && <div className="text-slate-500 text-xs">⏳ Đang suy nghĩ...</div>}
          </div>
          <div className="p-3 border-t border-slate-700 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Hỏi về kết quả phân tích..."
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm outline-none"
            />
            <button onClick={send} className="px-4 py-2 bg-gradient-to-br from-teal to-indigo-500 rounded-lg font-bold">▶</button>
          </div>
        </div>
      )}
    </>
  )
}
