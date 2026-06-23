import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function Alerts() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.alerts().then((res) => {
      setAlerts(res.alerts)
      setLoading(false)
    })
  }, [])

  return (
    <div>
      <div className="text-teal text-xs font-bold uppercase tracking-wide mb-4">⚠️ Lịch sử cảnh báo</div>
      {loading && <div className="text-slate-500 text-sm">Đang tải...</div>}
      {!loading && alerts.length === 0 && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-10 text-center text-slate-500">
          Không có cảnh báo nào ở thời điểm hiện tại.
        </div>
      )}
      <div className="flex flex-col gap-3">
        {alerts.map((a) => (
          <div
            key={a.company_id}
            className={`flex items-center justify-between gap-4 rounded-xl p-4 border ${
              a.color === 'red' ? 'bg-red-950/40 border-red-800' : 'bg-orange-950/40 border-orange-800'
            }`}
          >
            <div>
              <div className="font-bold text-white text-sm">
                {a.color === 'red' ? '🚨' : '⚠️'} {a.ten_cong_ty}
                {a.is_demo && <span className="ml-2 text-xs text-teal">⭐ Demo</span>}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Điểm PD giảm/tăng đột ngột tại {a.quarter} — hiện tại {a.pd_percent}%
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className={`font-bold text-lg ${a.delta_percent > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {a.delta_percent > 0 ? '+' : ''}{a.delta_percent}đ
              </div>
              <button
                onClick={() => navigate('/dashboard', { state: { companyId: a.company_id } })}
                className="text-xs px-3 py-1.5 rounded-lg bg-teal/15 text-teal font-semibold hover:bg-teal/25"
              >
                Xem chi tiết
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
