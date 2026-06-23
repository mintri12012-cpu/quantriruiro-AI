import { useEffect, useState } from 'react'
import { Radar } from 'react-chartjs-2'
import {
  Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend,
} from 'chart.js'
import { api } from '../api'

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const COLORS = ['#00B4D8', '#fb923c', '#f472b6']

export default function Compare() {
  const [companies, setCompanies] = useState([])
  const [selected, setSelected] = useState([])
  const [result, setResult] = useState(null)

  useEffect(() => {
    api.portfolio().then((res) => {
      setCompanies(res.companies)
      const demo = res.companies.filter((c) => c.is_demo).map((c) => c.company_id)
      setSelected(demo.length ? demo : res.companies.slice(0, 3).map((c) => c.company_id))
    })
  }, [])

  useEffect(() => {
    if (selected.length) api.compare(selected).then(setResult)
    else setResult(null)
  }, [selected])

  function toggle(id) {
    setSelected((s) => {
      if (s.includes(id)) return s.filter((x) => x !== id)
      if (s.length >= 3) return s
      return [...s, id]
    })
  }

  const chartData = result && {
    labels: result.labels.map((l) => l.label),
    datasets: result.companies.map((c, i) => ({
      label: c.ten_cong_ty,
      data: result.labels.map((l) => c.scores[l.key]),
      borderColor: COLORS[i], backgroundColor: COLORS[i] + '33', pointBackgroundColor: COLORS[i],
    })),
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-teal text-xs font-bold uppercase tracking-wide">🕸️ So sánh doanh nghiệp (Radar)</div>

      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
        <div className="text-[11px] text-slate-400 uppercase mb-2">Chọn tối đa 3 doanh nghiệp</div>
        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
          {companies.map((c) => (
            <button
              key={c.company_id}
              onClick={() => toggle(c.company_id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                selected.includes(c.company_id)
                  ? 'bg-teal/20 text-teal border-teal/40'
                  : 'bg-slate-900 text-slate-400 border-slate-700'
              }`}
            >
              {c.is_demo && '⭐'} {c.ten_cong_ty}
            </button>
          ))}
        </div>
      </div>

      {chartData && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6">
          <div className="max-w-xl mx-auto">
            <Radar
              data={chartData}
              options={{
                scales: {
                  r: {
                    angleLines: { color: '#334155' }, grid: { color: '#334155' },
                    pointLabels: { color: '#94a3b8', font: { size: 11 } },
                    ticks: { color: '#475569', backdropColor: 'transparent', stepSize: 25 },
                    suggestedMin: 0, suggestedMax: 100,
                  },
                },
                plugins: { legend: { position: 'bottom', labels: { color: '#cbd5e1' } } },
              }}
            />
          </div>
          <p className="text-[11px] text-slate-500 text-center mt-3">
            Mỗi trục là percentile trong danh mục (100 = tốt nhất). Hình to & đều = tài chính lành mạnh; hình lệch/nhỏ = rủi ro tập trung ở một vài mặt.
          </p>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {result.companies.map((c, i) => (
              <div key={c.company_id} className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center">
                <div className="text-xs font-bold" style={{ color: COLORS[i] }}>{c.ten_cong_ty}</div>
                <div className="text-lg font-extrabold text-white mt-1">{c.pd_percent}%</div>
                <div className="text-[10px] text-slate-500">PD score</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
