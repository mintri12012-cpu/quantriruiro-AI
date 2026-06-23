import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import GaugeChart from '../components/GaugeChart'
import ShapWaterfall from '../components/ShapWaterfall'
import TimeSeriesChart from '../components/TimeSeriesChart'

const STEPS = [
  {
    id: 'DEMO_HEALTHY',
    caption: '✅ Doanh nghiệp khỏe mạnh',
    desc: 'Thanh khoản tốt, dòng tiền ổn định qua 8 quý — PD score duy trì ở mức rất thấp. Đây là hồ sơ "an toàn" điển hình mà cán bộ tín dụng có thể phê duyệt nhanh.',
  },
  {
    id: 'DEMO_MEDIUM',
    caption: '⚠️ Rủi ro đang tăng dần',
    desc: 'Đòn bẩy (D/E) tăng liên tục qua các quý, biên dòng tiền thu hẹp — PD score leo từ ~30% lên hơn 40%, chuyển từ "Thấp" sang "Trung bình". Cần theo dõi sát.',
  },
  {
    id: 'DEMO_DISTRESS',
    caption: '🚨 Cảnh báo nguy cơ vỡ nợ',
    desc: 'Quý gần nhất, PD score nhảy vọt — hệ thống tự động phát hiện delta > 15 điểm và kích hoạt cảnh báo đỏ. SHAP cho thấy chính xác yếu tố nào đẩy rủi ro lên cao.',
  },
]

const AUTO_MS = 7000

export default function GuidedDemo() {
  const [step, setStep] = useState(0)
  const [data, setData] = useState(null)
  const [history, setHistory] = useState([])
  const [playing, setPlaying] = useState(true)
  const [progress, setProgress] = useState(0)
  const timerRef = useRef(null)
  const startRef = useRef(0)

  async function loadStep(i) {
    const s = STEPS[i]
    const company = await api.company(s.id)
    const result = await api.predict({ ten_cong_ty: company.ten_cong_ty, nganh: company.nganh, ...company })
    const hist = await api.history(s.id)
    setData(result)
    setHistory(hist.history)
  }

  useEffect(() => { loadStep(step) }, [step])

  useEffect(() => {
    if (!playing) return
    startRef.current = Date.now()
    setProgress(0)
    const tick = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - startRef.current) / AUTO_MS) * 100)
      setProgress(pct)
      if (pct >= 100) {
        clearInterval(tick)
        setStep((s) => (s + 1) % STEPS.length)
      }
    }, 100)
    timerRef.current = tick
    return () => clearInterval(tick)
  }, [step, playing])

  const badgeClass = {
    green: 'bg-emerald-950 text-emerald-400 border-emerald-800',
    orange: 'bg-orange-950 text-orange-400 border-orange-800',
    red: 'bg-red-950 text-red-400 border-red-800',
  }

  const s = STEPS[step]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="text-teal text-xs font-bold uppercase tracking-wide">▶ Demo dẫn chuyện — Hành trình rủi ro của 3 doanh nghiệp</div>
        <button
          onClick={() => setPlaying((p) => !p)}
          className="px-4 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300"
        >
          {playing ? '⏸ Tạm dừng' : '▶ Tiếp tục tự động'}
        </button>
      </div>

      <div className="flex gap-2">
        {STEPS.map((st, i) => (
          <button
            key={st.id}
            onClick={() => setStep(i)}
            className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden"
          >
            <div
              className="h-full bg-teal transition-all"
              style={{ width: i < step ? '100%' : i === step ? `${progress}%` : '0%' }}
            />
          </button>
        ))}
      </div>

      <div key={step} className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 animate-[fadeIn_0.4s_ease]">
        <div className="text-xl font-extrabold text-white">{s.caption}</div>
        <p className="text-slate-400 text-sm mt-2 max-w-2xl">{s.desc}</p>
      </div>

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6">
            <div className="text-lg font-bold text-white mb-3">{data.ten_cong_ty}</div>
            <div className="flex gap-5 items-center">
              <GaugeChart percent={data.pd_percent} color={
                data.color === 'green' ? '#4ade80' : data.color === 'orange' ? '#fb923c' : '#f87171'
              } />
              <div className="flex-1">
                <div className="text-4xl font-extrabold text-white">{data.pd_percent}%</div>
                <div className={`inline-block mt-3 px-4 py-1 rounded-full text-xs font-bold border ${badgeClass[data.color]}`}>
                  Rủi ro {data.risk_level.toUpperCase()}
                </div>
              </div>
            </div>
            {history.length > 0 && (
              <div className="mt-5">
                <TimeSeriesChart history={history} />
              </div>
            )}
          </div>

          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6">
            <div className="text-teal text-xs font-bold uppercase tracking-wide mb-4">🔬 SHAP — Vì sao điểm số này?</div>
            <ShapWaterfall items={data.shap_top5} />
          </div>
        </div>
      )}

      <div className="flex justify-center gap-3">
        <button
          onClick={() => { setStep((step - 1 + STEPS.length) % STEPS.length); setPlaying(false) }}
          className="px-5 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-300"
        >← Trước</button>
        <button
          onClick={() => { setStep((step + 1) % STEPS.length); setPlaying(false) }}
          className="px-5 py-2 rounded-lg bg-gradient-to-br from-teal to-indigo-500 text-sm font-bold text-white"
        >Tiếp theo →</button>
      </div>
    </div>
  )
}
