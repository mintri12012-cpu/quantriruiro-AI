import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js'

ChartJS.register(ArcElement, Tooltip)

export default function GaugeChart({ percent, color }) {
  const remaining = 100 - percent
  const data = {
    datasets: [{
      data: [percent, remaining],
      backgroundColor: [color, '#1e293b'],
      borderWidth: 0,
      circumference: 270,
      rotation: 225,
    }],
  }
  const options = {
    cutout: '78%',
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    animation: { duration: 600 },
  }
  return (
    <div className="w-40 h-40">
      <Doughnut data={data} options={options} />
    </div>
  )
}
