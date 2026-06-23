import { useEffect, useMemo, useState } from 'react'
import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { api } from '../api'

ChartJS.register(ArcElement, Tooltip, Legend)

const RISK_COLORS = { 'Thấp': '#4ade80', 'Trung bình': '#fb923c', 'Cao': '#f87171' }
const NGANH_COLORS = ['#00B4D8', '#6366f1', '#f472b6', '#facc15']
const LIKELIHOOD_LABELS = ['1 - Rất thấp', '2 - Thấp', '3 - Trung bình', '4 - Cao', '5 - Rất cao']
const IMPACT_LABELS = ['5 - Rất cao', '4 - Cao', '3 - Trung bình', '2 - Thấp', '1 - Rất thấp']

function cellColor(likelihood, impact) {
  const score = likelihood + impact
  if (score <= 4) return { level: 'Thấp', color: '#86efac' }
  if (score <= 6) return { level: 'Trung bình', color: '#fde047' }
  if (score <= 8) return { level: 'Cao', color: '#fb923c' }
  return { level: 'Rất cao', color: '#f87171' }
}

function DonutCard({ title, total, labels, data, colors }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
      <div className="text-center text-[11px] text-slate-400 uppercase tracking-wide mb-3">{title}</div>
      <div className="relative w-full max-w-[220px] mx-auto">
        <Doughnut
          data={{ labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] }}
          options={{ plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', boxWidth: 10, font: { size: 10 } } } }, cutout: '65%' }}
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ bottom: '22%' }}>
          <div className="text-3xl font-extrabold text-teal">{total}</div>
        </div>
      </div>
    </div>
  )
}

export default function Overview() {
  const [data, setData] = useState(null)
  const [riskFilter, setRiskFilter] = useState('Tất cả')
  const [nganhFilter, setNganhFilter] = useState('Tất cả')
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.riskOverview().then(setData)
  }, [])

  const filteredRows = useMemo(() => {
    if (!data) return []
    return data.rows.filter((r) =>
      (riskFilter === 'Tất cả' || r.risk_level === riskFilter) &&
      (nganhFilter === 'Tất cả' || r.nganh === nganhFilter) &&
      (search.trim() === '' ||
        r.company_id.toLowerCase().includes(search.toLowerCase()) ||
        r.ten_cong_ty.toLowerCase().includes(search.toLowerCase()))
    )
  }, [data, riskFilter, nganhFilter, search])

  if (!data) return <div className="text-slate-500 text-sm">Đang tải...</div>

  const total = filteredRows.length
  const riskCounts = { 'Thấp': 0, 'Trung bình': 0, 'Cao': 0 }
  const nganhCounts = {}
  let demoCount = 0
  const grid = {}
  filteredRows.forEach((r) => {
    riskCounts[r.risk_level] = (riskCounts[r.risk_level] || 0) + 1
    nganhCounts[r.nganh] = (nganhCounts[r.nganh] || 0) + 1
    if (r.is_demo) demoCount++
    const key = `${r.impact}-${r.likelihood}`
    grid[key] = grid[key] || []
    grid[key].push(r)
  })

  const nganhLabels = Object.keys(nganhCounts)
  const nganhOptions = ['Tất cả', ...new Set(data.rows.map((r) => r.nganh))]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-teal text-xs font-bold uppercase tracking-wide">📍 Tổng quan hồ sơ rủi ro hiện hành</div>
        <div className="flex flex-wrap gap-2">
          <select
            value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300"
          >
            {['Tất cả', 'Thấp', 'Trung bình', 'Cao'].map((o) => <option key={o}>{o}</option>)}
          </select>
          <select
            value={nganhFilter} onChange={(e) => setNganhFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300"
          >
            {nganhOptions.map((o) => <option key={o}>{o}</option>)}
          </select>
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Tìm nhanh mã/tên..."
            className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300 outline-none focus:border-teal"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <DonutCard
          title="Theo cấp độ rủi ro" total={total}
          labels={Object.keys(riskCounts)} data={Object.values(riskCounts)}
          colors={Object.keys(riskCounts).map((k) => RISK_COLORS[k])}
        />
        <DonutCard
          title="SL rủi ro theo ngành" total={total}
          labels={nganhLabels} data={nganhLabels.map((n) => nganhCounts[n])}
          colors={NGANH_COLORS}
        />
        <DonutCard
          title="Theo loại (demo / thực)" total={total}
          labels={['Doanh nghiệp thực', 'Minh hoạ (demo)']}
          data={[total - demoCount, demoCount]}
          colors={['#00B4D8', '#f472b6']}
        />
      </div>

      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 overflow-x-auto">
        <div className="text-white font-bold text-sm mb-4">
          🗺️ Bản đồ nhiệt (Likelihood × Impact = PD × EAD) — {total} doanh nghiệp
        </div>
        <table className="border-collapse w-full text-xs min-w-[700px]">
          <tbody>
            {IMPACT_LABELS.map((impLabel, idx) => {
              const impact = 5 - idx
              return (
                <tr key={impact}>
                  <td className="pr-2 text-right text-slate-500 whitespace-nowrap w-28">{impLabel}</td>
                  {LIKELIHOOD_LABELS.map((_, lidx) => {
                    const likelihood = lidx + 1
                    const items = grid[`${impact}-${likelihood}`] || []
                    const { color } = cellColor(likelihood, impact)
                    return (
                      <td key={likelihood} className="border border-slate-900 p-1 align-top" style={{ width: '18%' }}>
                        <div
                          className="rounded-md p-2 min-h-[56px] text-slate-900 text-[10px] font-semibold flex flex-wrap gap-1 content-start"
                          style={{ backgroundColor: items.length ? color : '#1e293b' }}
                        >
                          {items.slice(0, 4).map((it) => (
                            <span key={it.company_id} className="bg-white/60 rounded px-1">{it.company_id}</span>
                          ))}
                          {items.length > 4 && <span className="bg-white/60 rounded px-1">+{items.length - 4}</span>}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
            <tr>
              <td></td>
              {LIKELIHOOD_LABELS.map((l) => (
                <td key={l} className="text-center text-slate-500 pt-1">{l}</td>
              ))}
            </tr>
          </tbody>
        </table>
        <div className="flex gap-4 mt-3 text-[11px] text-slate-400">
          <span><span className="inline-block w-3 h-3 rounded-sm mr-1" style={{ background: '#86efac' }} />Thấp</span>
          <span><span className="inline-block w-3 h-3 rounded-sm mr-1" style={{ background: '#fde047' }} />Trung bình</span>
          <span><span className="inline-block w-3 h-3 rounded-sm mr-1" style={{ background: '#fb923c' }} />Cao</span>
          <span><span className="inline-block w-3 h-3 rounded-sm mr-1" style={{ background: '#f87171' }} />Rất cao</span>
        </div>
        <div className="text-[11px] text-slate-500 mt-2">
          Trục ngang: Khả năng xảy ra (PD score) — Trục dọc: Mức độ ảnh hưởng (EAD, dư nợ tín dụng ước tính)
        </div>
      </div>
    </div>
  )
}
