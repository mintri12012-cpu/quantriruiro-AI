import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import Landing from './pages/Landing.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Portfolio from './pages/Portfolio.jsx'
import Alerts from './pages/Alerts.jsx'
import RiskAnalytics from './pages/RiskAnalytics.jsx'
import Overview from './pages/Overview.jsx'
import Approvals from './pages/Approvals.jsx'
import Documents from './pages/Documents.jsx'
import Reports from './pages/Reports.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Landing />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="portfolio" element={<Portfolio />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="risk-analytics" element={<RiskAnalytics />} />
          <Route path="overview" element={<Overview />} />
          <Route path="approvals" element={<Approvals />} />
          <Route path="documents" element={<Documents />} />
          <Route path="reports" element={<Reports />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
