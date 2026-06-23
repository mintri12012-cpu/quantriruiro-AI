import { useEffect, useState } from 'react'
import { api } from '../api'

export default function Documents() {
  const [companies, setCompanies] = useState([])
  const [companyId, setCompanyId] = useState('')
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    api.portfolio().then((res) => {
      setCompanies(res.companies)
      if (res.companies.length) setCompanyId(res.companies[0].company_id)
    })
  }, [])

  useEffect(() => {
    if (companyId) api.listDocuments(companyId).then((res) => setFiles(res.files))
  }, [companyId])

  async function handleUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      await api.uploadDocument(companyId, file)
      const res = await api.listDocuments(companyId)
      setFiles(res.files)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleDelete(name) {
    await api.deleteDocument(companyId, name)
    setFiles((f) => f.filter((d) => d.name !== name))
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="text-teal text-xs font-bold uppercase tracking-wide">📁 Quản lý tài liệu</div>

      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <label className="text-xs text-slate-400">Doanh nghiệp:</label>
          <select
            value={companyId} onChange={(e) => setCompanyId(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white"
          >
            {companies.map((c) => (
              <option key={c.company_id} value={c.company_id}>{c.ten_cong_ty}</option>
            ))}
          </select>

          <label className="ml-auto px-4 py-2 rounded-lg bg-gradient-to-br from-teal to-indigo-500 font-bold text-white text-xs cursor-pointer">
            {uploading ? '⏳ Đang tải lên...' : '⬆️ Tải lên tài liệu'}
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>

        {files.length === 0 && (
          <div className="text-slate-500 text-sm text-center py-8">Chưa có tài liệu nào cho doanh nghiệp này.</div>
        )}

        {files.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-slate-500 uppercase border-b border-slate-700">
                <th className="p-2">Tên file</th>
                <th className="p-2">Kích thước</th>
                <th className="p-2">Ngày tải lên</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.name} className="border-b border-slate-800 last:border-none">
                  <td className="p-2 font-semibold text-white">📄 {f.name}</td>
                  <td className="p-2 text-slate-400">{f.size_kb} KB</td>
                  <td className="p-2 text-slate-400">{f.uploaded_at}</td>
                  <td className="p-2 flex gap-2">
                    <a
                      href={api.documentUrl(companyId, f.name)} target="_blank" rel="noreferrer"
                      className="text-xs px-3 py-1.5 rounded-lg bg-teal/15 text-teal font-semibold hover:bg-teal/25"
                    >Tải xuống</a>
                    <button
                      onClick={() => handleDelete(f.name)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-red-950 text-red-400 font-semibold hover:bg-red-900"
                    >Xoá</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
