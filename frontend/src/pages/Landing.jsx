import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()
  return (
    <div className="max-w-3xl mx-auto text-center mt-16">
      <div className="text-5xl mb-4">🏦</div>
      <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
        PD Scoring Dashboard
      </h1>
      <p className="text-slate-400 mb-2">
        Hệ thống đánh giá xác suất vỡ nợ (PD) cho doanh nghiệp SME tại Việt Nam,
      </p>
      <p className="text-slate-400 mb-8">
        kết hợp mô hình <span className="text-teal font-semibold">XGBoost + SHAP</span> và{' '}
        <span className="text-teal font-semibold">AI Chatbot</span> hỗ trợ cán bộ tín dụng ngân hàng.
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="px-8 py-3 rounded-xl bg-gradient-to-br from-teal to-indigo-500 font-bold text-white shadow-lg hover:opacity-90 transition"
        >
          🔍 Bắt đầu phân tích
        </button>
        <button
          onClick={() => navigate('/demo')}
          className="px-8 py-3 rounded-xl bg-slate-800 border border-slate-700 font-bold text-white shadow-lg hover:bg-slate-700 transition"
        >
          ▶ Xem demo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-14 text-left">
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
          <div className="text-2xl mb-2">📊</div>
          <div className="font-bold text-white text-sm mb-1">Dashboard phân tích</div>
          <div className="text-slate-400 text-xs">Nhập chỉ số tài chính, nhận điểm PD và giải thích SHAP ngay lập tức.</div>
        </div>
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
          <div className="text-2xl mb-2">🗂️</div>
          <div className="font-bold text-white text-sm mb-1">Quản lý danh mục</div>
          <div className="text-slate-400 text-xs">Theo dõi PD score của toàn bộ doanh nghiệp trong danh mục tín dụng.</div>
        </div>
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
          <div className="text-2xl mb-2">⚠️</div>
          <div className="font-bold text-white text-sm mb-1">Cảnh báo sớm</div>
          <div className="text-slate-400 text-xs">Phát hiện doanh nghiệp có điểm PD tăng đột biến theo quý.</div>
        </div>
      </div>
    </div>
  )
}
