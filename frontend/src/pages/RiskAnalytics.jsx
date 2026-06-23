import { useEffect, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend,
} from 'chart.js'
import { api } from '../api'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const fmt = (n) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(n)

export default function RiskAnalytics() {
  const [gdpShock, setGdpShock] = useState(0)
  const [lendingShock, setLendingShock] = useState(0)
  const [stress, setStress] = useState(null)
  const [stressLoading, setStressLoading] = useState(false)

  const [lgd, setLgd] = useState(0.45)
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    api.riskSummary(lgd).then(setSummary)
  }, [lgd])

  async function runStressTest() {
    setStressLoading(true)
    try {
      const res = await api.stressTest(gdpShock, lendingShock)
      setStress(res)
    } finally {
      setStressLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-teal text-xs font-bold uppercase tracking-wide">🧪 Risk Analytics</div>

      {/* Expected Loss / VaR */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-white font-bold text-sm">💰 Expected Loss / VaR danh mục</div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <label>LGD (Loss Given Default)</label>
            <input
              type="number" step="0.05" min="0.1" max="0.9" value={lgd}
              onChange={(e) => setLgd(parseFloat(e.target.value) || 0.45)}
              className="w-20 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white"
            />
          </div>
        </div>
        {summary && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                <div className="text-[11px] text-slate-500 uppercase">Tổng EAD</div>
                <div className="text-lg font-bold text-teal mt-1">{fmt(summary.total_ead)} tỷ</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                <div className="text-[11px] text-slate-500 uppercase">Expected Loss</div>
                <div className="text-lg font-bold text-orange-400 mt-1">{fmt(summary.total_el)} tỷ</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                <div className="text-[11px] text-slate-500 uppercase">EL / EAD</div>
                <div className="text-lg font-bold text-orange-400 mt-1">{summary.el_percent}%</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                <div className="text-[11px] text-slate-500 uppercase">VaR (99%, ước tính)</div>
                <div className="text-lg font-bold text-red-400 mt-1">{fmt(summary.var99)} tỷ</div>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mb-4">
              * VaR 99% là ước tính đơn giản hoá (EL + z₉₉·EAD·LGD·√(PD·(1-PD))) cho mục đích minh hoạ, không phải mô hình Basel IRB đầy đủ.
            </p>

            <div className="text-white font-bold text-sm mb-3">📊 Concentration risk theo ngành</div>
            <Bar
              data={{
                labels: summary.by_industry.map((g) => g.nganh),
                datasets: [{
                  label: 'EAD (tỷ đồng)',
                  data: summary.by_industry.map((g) => g.ead),
                  backgroundColor: '#00B4D8',
                  borderRadius: 6,
                }],
              }}
              options={{
                plugins: { legend: { display: false } },
                scales: {
                  x: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } },
                  y: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } },
                },
              }}
              height={90}
            />
            <table className="w-full text-sm mt-4">
              <thead>
                <tr className="text-left text-[11px] text-slate-500 uppercase border-b border-slate-700">
                  <th className="p-2">Ngành</th>
                  <th className="p-2">Số DN</th>
                  <th className="p-2">EAD (tỷ)</th>
                  <th className="p-2">% Portfolio</th>
                  <th className="p-2">PD trung bình</th>
                </tr>
              </thead>
              <tbody>
                {summary.by_industry.map((g) => (
                  <tr key={g.nganh} className="border-b border-slate-800 last:border-none">
                    <td className="p-2 font-semibold text-white">{g.nganh}</td>
                    <td className="p-2 text-slate-400">{g.count}</td>
                    <td className="p-2 text-teal">{fmt(g.ead)}</td>
                    <td className={`p-2 ${g.pct_of_portfolio > 40 ? 'text-red-400 font-bold' : 'text-slate-400'}`}>
                      {g.pct_of_portfolio}% {g.pct_of_portfolio > 40 && '⚠️'}
                    </td>
                    <td className="p-2 text-slate-400">{g.avg_pd_percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* Stress test */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6">
        <div className="text-white font-bold text-sm mb-4">⚡ Stress Test — Mô phỏng kịch bản vĩ mô</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-[11px] text-slate-400 uppercase mb-1">
              Shock GDP Growth: {gdpShock > 0 ? '+' : ''}{gdpShock}đ
            </label>
            <input
              type="range" min="-3" max="3" step="0.5" value={gdpShock}
              onChange={(e) => setGdpShock(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 uppercase mb-1">
              Shock Lending Rate: {lendingShock > 0 ? '+' : ''}{lendingShock}đ
            </label>
            <input
              type="range" min="-2" max="5" step="0.5" value={lendingShock}
              onChange={(e) => setLendingShock(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
        <button
          onClick={runStressTest} disabled={stressLoading}
          className="px-5 py-2.5 rounded-lg bg-gradient-to-br from-teal to-indigo-500 font-bold text-white disabled:opacity-50"
        >
          {stressLoading ? '⏳ Đang chạy...' : '🚀 Chạy Stress Test'}
        </button>

        {stress && (
          <div className="mt-5">
            <div className="grid grid-cols-3 gap-3 mb-4">
              {['Thấp', 'Trung bình', 'Cao'].map((bucket) => (
                <div key={bucket} className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                  <div className="text-[11px] text-slate-500 uppercase">{bucket}</div>
                  <div className="text-lg font-bold text-white mt-1">
                    {stress.bucket_before[bucket]} → <span className="text-teal">{stress.bucket_after[bucket]}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-[11px] text-slate-500 uppercase mb-2">Top doanh nghiệp bị ảnh hưởng nhiều nhất</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-slate-500 uppercase border-b border-slate-700">
                  <th className="p-2">Doanh nghiệp</th>
                  <th className="p-2">PD trước</th>
                  <th className="p-2">PD sau</th>
                  <th className="p-2">Delta</th>
                </tr>
              </thead>
              <tbody>
                {stress.companies.slice(0, 8).map((c) => (
                  <tr key={c.company_id} className="border-b border-slate-800 last:border-none">
                    <td className="p-2 font-semibold text-white">{c.ten_cong_ty}</td>
                    <td className="p-2 text-slate-400">{c.baseline_pd_percent}%</td>
                    <td className="p-2 text-slate-400">{c.shocked_pd_percent}%</td>
                    <td className={`p-2 font-bold ${c.delta_percent > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {c.delta_percent > 0 ? '+' : ''}{c.delta_percent}đ
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
