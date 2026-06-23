import { useEffect, useState } from 'react'
import { api } from '../api'

const TABS = [
  { key: 'Tat_ca', label: 'Tất cả' },
  { key: 'Cho_xu_ly', label: 'Chờ xử lý' },
  { key: 'Dang_xu_ly', label: 'Đang xử lý' },
  { key: 'Soan_thao', label: 'Soạn thảo' },
  { key: 'Da_duyet', label: 'Đã duyệt' },
  { key: 'Da_dong', label: 'Đã đóng' },
  { key: 'Da_huy', label: 'Đã hủy' },
]

const NEXT_STATUS = {
  Cho_xu_ly: 'Dang_xu_ly', Dang_xu_ly: 'Da_duyet', Soan_thao: 'Cho_xu_ly',
  Da_duyet: 'Da_duyet', Da_dong: 'Da_dong', Da_huy: 'Da_huy',
}
const NEXT_LABEL = {
  Cho_xu_ly: 'Bắt đầu xử lý', Dang_xu_ly: 'Duyệt', Soan_thao: 'Gửi chờ xử lý',
  Da_duyet: '✓ Đã duyệt', Da_dong: '🔒 Đã đóng', Da_huy: '✕ Đã hủy',
}
const TERMINAL = ['Da_duyet', 'Da_dong', 'Da_huy']

const badgeClass = {
  green: 'bg-emerald-950 text-emerald-400 border-emerald-800',
  orange: 'bg-orange-950 text-orange-400 border-orange-800',
  red: 'bg-red-950 text-red-400 border-red-800',
}

export default function Approvals() {
  const [tab, setTab] = useState('Tat_ca')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    api.approvals(tab === 'Tat_ca' ? null : tab).then((res) => {
      setData(res)
      setLoading(false)
    })
  }

  useEffect(load, [tab])

  async function advance(companyId, current) {
    const next = NEXT_STATUS[current]
    if (next === current) return
    await api.updateStatus(companyId, next)
    load()
  }

  async function setStatus(companyId, status) {
    await api.updateStatus(companyId, status)
    load()
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="text-teal text-xs font-bold uppercase tracking-wide">✅ Phê duyệt hồ sơ rủi ro</div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              tab === t.key ? 'bg-teal/20 text-teal border border-teal/40' : 'bg-slate-800/60 text-slate-400 border border-slate-700'
            }`}
          >
            {t.label} {data && t.key !== 'Tat_ca' ? `(${data.counts[t.key] ?? 0})` : ''}
          </button>
        ))}
      </div>

      {loading && <div className="text-slate-500 text-sm">Đang tải...</div>}

      {!loading && data && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-slate-500 uppercase border-b border-slate-700">
                <th className="p-3">Doanh nghiệp</th>
                <th className="p-3">Ngành</th>
                <th className="p-3">PD %</th>
                <th className="p-3">Mức rủi ro</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.companies.map((c) => (
                <tr key={c.company_id} className="border-b border-slate-800 last:border-none">
                  <td className="p-3 font-semibold text-white">
                    {c.is_demo && <span className="mr-1">⭐</span>}{c.ten_cong_ty}
                  </td>
                  <td className="p-3 text-slate-400">{c.nganh}</td>
                  <td className="p-3 font-bold text-teal">{c.pd_percent}%</td>
                  <td className="p-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${badgeClass[c.color]}`}>
                      {c.risk_level}
                    </span>
                  </td>
                  <td className="p-3 text-slate-300">{c.status_label}</td>
                  <td className="p-3 flex gap-1.5">
                    <button
                      disabled={TERMINAL.includes(c.status)}
                      onClick={() => advance(c.company_id, c.status)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-teal/15 text-teal font-semibold hover:bg-teal/25 disabled:opacity-40"
                    >
                      {NEXT_LABEL[c.status]}
                    </button>
                    {!TERMINAL.includes(c.status) && (
                      <>
                        <button
                          onClick={() => setStatus(c.company_id, 'Da_dong')}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-700 text-slate-300 font-semibold hover:bg-slate-600"
                          title="Đóng hồ sơ"
                        >🔒</button>
                        <button
                          onClick={() => setStatus(c.company_id, 'Da_huy')}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-red-950 text-red-400 font-semibold hover:bg-red-900"
                          title="Hủy hồ sơ"
                        >✕</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
