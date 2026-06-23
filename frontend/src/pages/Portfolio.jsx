import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

const badgeClass = {
  green: 'bg-emerald-950 text-emerald-400 border-emerald-800',
  orange: 'bg-orange-950 text-orange-400 border-orange-800',
  red: 'bg-red-950 text-red-400 border-red-800',
}

export default function Portfolio() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.portfolio().then((res) => {
      setCompanies(res.companies)
      setLoading(false)
    })
  }, [])

  return (
    <div>
      <div className="text-teal text-xs font-bold uppercase tracking-wide mb-4">🗂️ Quản lý danh mục doanh nghiệp</div>
      {loading && <div className="text-slate-500 text-sm">Đang tải...</div>}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] text-slate-500 uppercase border-b border-slate-700">
              <th className="p-3">Doanh nghiệp</th>
              <th className="p-3">Ngành</th>
              <th className="p-3">Quý</th>
              <th className="p-3">PD %</th>
              <th className="p-3">Mức rủi ro</th>
              <th className="p-3">Delta quý</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.company_id} className="border-b border-slate-800 last:border-none">
                <td className="p-3 font-semibold text-white">
                  {c.is_demo && <span className="mr-1">⭐</span>}{c.ten_cong_ty}
                </td>
                <td className="p-3 text-slate-400">{c.nganh}</td>
                <td className="p-3 text-slate-500">{c.quarter}</td>
                <td className="p-3 font-bold text-teal">{c.pd_percent}%</td>
                <td className="p-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${badgeClass[c.color]}`}>
                    {c.risk_level}
                  </span>
                </td>
                <td className={`p-3 ${c.delta_percent > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {c.delta_percent != null ? `${c.delta_percent > 0 ? '+' : ''}${c.delta_percent}đ` : '—'}
                </td>
                <td className="p-3">
                  <button
                    onClick={() => navigate('/dashboard', { state: { companyId: c.company_id } })}
                    className="text-xs px-3 py-1.5 rounded-lg bg-teal/15 text-teal font-semibold hover:bg-teal/25"
                  >
                    Xem chi tiết
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
