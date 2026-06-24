import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function Landing() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api.riskOverview().then((res) => {
      setStats({
        total: res.total,
        cao: res.by_risk_level['Cao'] || 0,
        nganh: res.by_nganh.length,
      })
    })
  }, [])

  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center pt-8 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-teal bg-teal/10 border border-teal/30 rounded-full px-3 py-1 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
            Dữ liệu BCTC thật qua vnstock · XGBoost + SHAP
          </div>
          <h1 className="text-4xl md:text-[44px] font-extrabold text-white leading-[1.1] mb-5">
            Định giá rủi ro vỡ nợ<br />cho doanh nghiệp SME<br />
            <span className="text-teal">trong vài giây.</span>
          </h1>
          <p className="text-slate-400 text-[15px] leading-relaxed mb-8 max-w-md">
            Nhập chỉ số tài chính hoặc chọn doanh nghiệp có sẵn — hệ thống trả về xác suất vỡ nợ (PD),
            giải thích bằng SHAP, so sánh trung vị ngành và cảnh báo sớm khi rủi ro tăng đột biến.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-7 py-3 rounded-lg bg-teal text-navy font-bold text-sm hover:brightness-110 transition"
            >
              Bắt đầu phân tích →
            </button>
            <button
              onClick={() => navigate('/demo')}
              className="px-7 py-3 rounded-lg border border-slate-700 text-slate-300 font-semibold text-sm hover:border-teal hover:text-teal transition"
            >
              Xem demo 3 hồ sơ mẫu
            </button>
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
          <div className="text-[11px] text-slate-500 uppercase tracking-wide mb-4">Danh mục đang theo dõi — trực tiếp</div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-slate-900 rounded-xl p-4">
              <div className="text-3xl font-extrabold text-white">{stats ? stats.total : '—'}</div>
              <div className="text-[11px] text-slate-500 mt-1">Doanh nghiệp</div>
            </div>
            <div className="bg-slate-900 rounded-xl p-4">
              <div className="text-3xl font-extrabold text-red-400">{stats ? stats.cao : '—'}</div>
              <div className="text-[11px] text-slate-500 mt-1">Đang ở mức Cao</div>
            </div>
          </div>
          <div className="space-y-2.5">
            {[
              ['Mô hình', 'XGBoost (AUC ≈ 0.91) + SHAP'],
              ['Nguồn dữ liệu', 'BCTC thật qua vnstock, 4 quý gần nhất'],
              ['Ngành theo dõi', stats ? `${stats.nganh} nhóm ngành` : '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-xs py-2 border-b border-slate-800 last:border-none">
                <span className="text-slate-500">{k}</span>
                <span className="text-slate-300 font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-slate-800 rounded-2xl overflow-hidden mt-4 border border-slate-800">
        {[
          ['01', 'Nhập / chọn DN', 'Điền chỉ số tài chính hoặc chọn từ danh mục có sẵn'],
          ['02', 'Tính PD + SHAP', 'XGBoost trả điểm rủi ro, SHAP chỉ ra yếu tố ảnh hưởng'],
          ['03', 'So sánh & cảnh báo', 'Đối chiếu trung vị ngành, theo dõi biến động theo quý'],
          ['04', 'Quản trị danh mục', 'Stress test, Expected Loss/VaR, phê duyệt hồ sơ'],
        ].map(([num, title, desc]) => (
          <div key={num} className="bg-slate-900/80 p-5">
            <div className="text-teal/50 text-xs font-bold mb-3">{num}</div>
            <div className="font-bold text-white text-sm mb-1.5">{title}</div>
            <div className="text-slate-500 text-xs leading-relaxed">{desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
