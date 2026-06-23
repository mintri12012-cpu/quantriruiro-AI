import { api } from '../api'

export default function Reports() {
  return (
    <div className="flex flex-col gap-5">
      <div className="text-teal text-xs font-bold uppercase tracking-wide">📑 Báo cáo tổng hợp</div>

      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6">
        <div className="text-white font-bold text-sm mb-2">Xuất báo cáo danh mục rủi ro</div>
        <p className="text-slate-400 text-xs mb-5">
          Bao gồm: mã CK, tên doanh nghiệp, ngành, quý, PD score, mức rủi ro, EAD ước tính, trạng thái phê duyệt — cho toàn bộ danh mục hiện hành.
        </p>
        <div className="flex gap-3">
          <a
            href={api.exportReportUrl('csv')}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-br from-teal to-indigo-500 font-bold text-white text-sm"
          >
            ⬇️ Xuất CSV
          </a>
          <a
            href={api.exportReportUrl('xlsx')}
            className="px-5 py-2.5 rounded-lg bg-slate-700 font-bold text-white text-sm"
          >
            ⬇️ Xuất Excel (.xlsx)
          </a>
        </div>
      </div>
    </div>
  )
}
