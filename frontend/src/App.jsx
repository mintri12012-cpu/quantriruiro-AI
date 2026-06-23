import { Outlet } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import ChatWidget from './components/ChatWidget'
import { AnalysisProvider } from './AnalysisContext'

function App() {
  return (
    <AnalysisProvider>
      <div className="flex min-h-screen bg-[#0f1726]">
        <Sidebar />
        <main className="flex-1 p-6 md:p-10 pt-16 md:pt-10">
          <Outlet />
        </main>
        <ChatWidget />
      </div>
    </AnalysisProvider>
  )
}

export default App
