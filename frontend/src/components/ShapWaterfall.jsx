const FEATURE_LABELS = {
  current_ratio: 'Current Ratio', quick_ratio: 'Quick Ratio', cash_ratio: 'Cash Ratio',
  de_ratio: 'D/E Ratio', da_ratio: 'D/A Ratio', interest_coverage: 'Interest Coverage',
  asset_turnover: 'Asset Turnover', receivable_days: 'Receivable Days',
  cfo_debt: 'CFO/Debt', cfo_margin: 'CFO Margin', cf_volatility: 'CF Volatility',
  gdp_growth: 'GDP Growth', lending_rate: 'Lending Rate', cpi: 'CPI',
  working_capital_ratio: 'Working Capital Ratio',
}

export default function ShapWaterfall({ items }) {
  if (!items || items.length === 0) return null
  const maxAbs = Math.max(...items.map((i) => Math.abs(i.impact)), 0.001)

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => {
        const widthPct = (Math.abs(item.impact) / maxAbs) * 100
        const isUp = item.direction === 'tang_rui_ro'
        return (
          <div key={item.feature} className="flex items-center gap-3">
            <div className="w-36 text-xs text-slate-400 shrink-0">
              {FEATURE_LABELS[item.feature] || item.feature}
            </div>
            <div className="flex-1 h-5 bg-slate-800 rounded relative overflow-hidden">
              <div
                className={`h-full rounded ${isUp ? 'bg-red-400' : 'bg-emerald-400'}`}
                style={{ width: `${widthPct}%` }}
              />
            </div>
            <div className={`w-16 text-xs text-right shrink-0 ${isUp ? 'text-red-400' : 'text-emerald-400'}`}>
              {isUp ? '+' : ''}{item.impact.toFixed(3)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
