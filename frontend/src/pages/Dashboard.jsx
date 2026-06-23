import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../api'
import { useAnalysis } from '../AnalysisContext'
import GaugeChart from '../components/GaugeChart'
import ShapWaterfall from '../components/ShapWaterfall'
import TimeSeriesChart from '../components/TimeSeriesChart'

const FIELD_GROUPS = [
  { title: 'Thanh khoản', fields: [
    ['current_ratio', 'Current Ratio (khả năng thanh toán)'],
    ['quick_ratio', 'Quick Ratio (thanh toán nhanh)'],
    ['cash_ratio', 'Cash Ratio (tỷ lệ tiền mặt)'],
  ] },
  { title: 'Đòn bẩy', fields: [
    ['de_ratio', 'D/E Ratio (nợ/vốn chủ)'],
    ['da_ratio', 'D/A Ratio (nợ/tài sản)'],
    ['interest_coverage', 'Interest Coverage (khả năng trả lãi)'],
  ] },
  { title: 'Hoạt động', fields: [
    ['asset_turnover', 'Asset Turnover (vòng quay tài sản)'],
    ['receivable_days', 'Receivable Days (số ngày thu hồi nợ)'],
  ] },
  { title: 'Dòng tiền', fields: [
    ['cfo_debt', 'CFO/Debt (dòng tiền/nợ)'],
    ['cfo_margin', 'CFO Margin (biên dòng tiền)'],
    ['cf_volatility', 'CF Volatility (độ biến động dòng tiền)'],
    ['working_capital_ratio', 'Working Capital Ratio (vốn lưu động)'],
  ] },
  { title: 'Vĩ mô', fields: [
    ['gdp_growth', 'GDP Growth (%) (tăng trưởng GDP)'],
    ['lending_rate', 'Lending Rate (%) (lãi suất cho vay)'],
    ['cpi', 'CPI (%) (lạm phát)'],
  ] },
]

const DEFAULTS = {
  ten_cong_ty: 'Cty_Demo_001', nganh: 'San xuat', current_ratio: 1.5, quick_ratio: 1.2, cash_ratio: 0.5,
  de_ratio: 2.0, da_ratio: 0.5, interest_coverage: 3.0, asset_turnover: 0.8,
  receivable_days: 45, cfo_debt: 0.2, cfo_margin: 0.1, cf_volatility: 0.1,
  working_capital_ratio: 0.25, gdp_growth: 6.5, lending_rate: 9.0, cpi: 4.0,
}

const NGANH_OPTIONS = ['San xuat', 'Thuong mai', 'Bat dong san', 'Dich vu']

const BENCHMARK_LABELS = {
  current_ratio: 'Current Ratio', quick_ratio: 'Quick Ratio', de_ratio: 'D/E Ratio',
  cfo_margin: 'CFO Margin', asset_turnover: 'Asset Turnover',
}

export default function Dashboard() {
  const location = useLocation()
  const { current, setCurrent, history, setHistory } = useAnalysis()
  const [form, setForm] = useState(DEFAULTS)
  const [loading, setLoading] = useState(false)
  const [companyId, setCompanyId] = useState(null)
  const [benchmark, setBenchmark] = useState(null)

  useEffect(() => {
    const preselect = location.state?.companyId
    if (preselect) loadCompany(preselect)
  }, [location.state])

  async function loadCompany(id) {
    const data = await api.company(id)
    if (data.error) return
    setForm({ ten_cong_ty: data.ten_cong_ty, ...Object.fromEntries(
      Object.entries(data).filter(([k]) => !['company_id', 'ten_cong_ty'].includes(k))
    ) })
    setCompanyId(id)
    await runPredict({ ten_cong_ty: data.ten_cong_ty, ...data }, id)
  }

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function runPredict(payload, cid) {
    setLoading(true)
    try {
      const result = await api.predict(payload)
      setCurrent(result)
      const idToUse = cid ?? companyId
      if (idToUse) {
        const h = await api.history(idToUse)
        setHistory(h.history)
      } else {
        setHistory([])
      }
      if (payload.nganh) {
        const b = await api.benchmark(payload.nganh)
        setBenchmark(b.error ? null : b)
      }
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    const payload = { ...form }
    Object.keys(payload).forEach((k) => {
      if (k !== 'ten_cong_ty' && k !== 'nganh') payload[k] = parseFloat(payload[k])
    })
    runPredict(payload, companyId)
  }

  const badgeClass = {
    green: 'bg-emerald-950 text-emerald-400 border-emerald-800',
    orange: 'bg-orange-950 text-orange-400 border-orange-800',
    red: 'bg-red-950 text-red-400 border-red-800',
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6">
      <form onSubmit={handleSubmit} className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 h-fit">
        <div className="text-teal text-xs font-bold uppercase tracking-wide mb-4">📋 Nhập thông tin doanh nghiệp</div>
        <div className="mb-3">
          <label className="block text-[11px] text-slate-400 uppercase mb-1">Tên doanh nghiệp</label>
          <input
            value={form.ten_cong_ty}
            onChange={(e) => update('ten_cong_ty', e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm outline-none focus:border-teal"
          />
        </div>
        <div className="mb-3">
          <label className="block text-[11px] text-slate-400 uppercase mb-1">Ngành</label>
          <select
            value={form.nganh}
            onChange={(e) => update('nganh', e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm outline-none focus:border-teal"
          >
            {NGANH_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        {FIELD_GROUPS.map((group) => (
          <div key={group.title} className="mb-3">
            <div className="text-[10px] text-slate-500 uppercase mb-1.5">{group.title}</div>
            <div className="grid grid-cols-2 gap-2">
              {group.fields.map(([key, label]) => (
                <div key={key}>
                  <label className="block text-[11px] text-slate-400 mb-1">{label}</label>
                  <input
                    type="number" step="0.01"
                    value={form[key]}
                    onChange={(e) => update(key, e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm outline-none focus:border-teal"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
        <button
          type="submit" disabled={loading}
          className="w-full mt-3 py-3 rounded-lg bg-gradient-to-br from-teal to-indigo-500 font-bold text-white disabled:opacity-50"
        >
          {loading ? '⏳ Đang phân tích...' : '🔍 PHÂN TÍCH RỦI RO'}
        </button>
      </form>

      <div className="flex flex-col gap-5">
        {!current && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-12 text-center text-slate-600">
            <div className="text-5xl mb-3">📊</div>
            <p className="text-sm">Nhập thông tin doanh nghiệp và nhấn <strong>Phân tích rủi ro</strong> để xem kết quả</p>
          </div>
        )}

        {current && (
          <>
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="text-xl font-bold text-white">{current.ten_cong_ty}</div>
                <button
                  onClick={() => {
                    const payload = { ...form }
                    Object.keys(payload).forEach((k) => {
                      if (k !== 'ten_cong_ty' && k !== 'nganh') payload[k] = parseFloat(payload[k])
                    })
                    api.downloadReportPdf(payload)
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-teal/15 text-teal font-semibold hover:bg-teal/25"
                >📄 Xuất PDF</button>
              </div>
              <div className="flex gap-5 items-center">
                <GaugeChart percent={current.pd_percent} color={
                  current.color === 'green' ? '#4ade80' : current.color === 'orange' ? '#fb923c' : '#f87171'
                } />
                <div className="flex-1">
                  <div className="text-4xl font-extrabold text-white">{current.pd_percent}%</div>
                  <div className="text-xs text-slate-500 mt-1">Xác suất vỡ nợ</div>
                  <div className={`inline-block mt-3 px-5 py-1.5 rounded-full text-sm font-bold border ${badgeClass[current.color]}`}>
                    {current.color === 'green' ? '✅' : current.color === 'orange' ? '⚠️' : '🚨'} Rủi ro {current.risk_level.toUpperCase()}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2.5 mt-4">
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                  <div className="text-[11px] text-slate-500 uppercase">PD Score</div>
                  <div className="text-lg font-bold text-teal mt-1">{current.pd_score}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                  <div className="text-[11px] text-slate-500 uppercase">Mức rủi ro</div>
                  <div className="text-lg font-bold text-teal mt-1">{current.risk_level}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                  <div className="text-[11px] text-slate-500 uppercase">Dự báo</div>
                  <div className="text-lg font-bold text-teal mt-1">{current.default_prediction === 1 ? '⚠️ Vỡ nợ' : '✅ An toàn'}</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6">
              <div className="text-teal text-xs font-bold uppercase tracking-wide mb-4">
                🔬 SHAP — Top 5 yếu tố ảnh hưởng
              </div>
              <ShapWaterfall items={current.shap_top5} />
            </div>

            {benchmark && (
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6">
                <div className="text-teal text-xs font-bold uppercase tracking-wide mb-4">
                  📐 So sánh với trung vị ngành "{benchmark.nganh}" ({benchmark.sample_size} DN)
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] text-slate-500 uppercase border-b border-slate-700">
                      <th className="p-2">Chỉ số</th>
                      <th className="p-2">Doanh nghiệp</th>
                      <th className="p-2">Trung vị ngành</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(BENCHMARK_LABELS).map(([key, label]) => (
                      <tr key={key} className="border-b border-slate-800 last:border-none">
                        <td className="p-2 text-slate-400">{label}</td>
                        <td className="p-2 font-semibold text-white">{form[key]}</td>
                        <td className="p-2 text-teal">{benchmark.median[key]?.toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="p-2 text-slate-400">PD Score</td>
                      <td className="p-2 font-semibold text-white">{current.pd_percent}%</td>
                      <td className="p-2 text-teal">{benchmark.median_pd_percent}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {history.length > 0 && (
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6">
                <div className="text-teal text-xs font-bold uppercase tracking-wide mb-4">
                  📈 PD Score theo quý
                </div>
                <TimeSeriesChart history={history} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
