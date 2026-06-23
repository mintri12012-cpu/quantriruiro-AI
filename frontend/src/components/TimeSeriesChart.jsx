import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip,
} from 'chart.js'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip)

export default function TimeSeriesChart({ history }) {
  if (!history || history.length === 0) return null

  const colorOf = (pct) => (pct < 30 ? '#4ade80' : pct < 60 ? '#fb923c' : '#f87171')

  const data = {
    labels: history.map((h) => h.quarter),
    datasets: [{
      label: 'PD Score (%)',
      data: history.map((h) => h.pd_percent),
      backgroundColor: history.map((h) => colorOf(h.pd_percent)),
      borderRadius: 6,
      borderSkipped: false,
    }],
  }
  const options = {
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } },
      y: {
        ticks: { color: '#64748b' }, grid: { color: '#1e293b' }, beginAtZero: true, max: 100,
      },
    },
  }
  return <Bar data={data} options={options} height={100} />
}
