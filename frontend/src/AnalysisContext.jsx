import { createContext, useContext, useState } from 'react'

const AnalysisContext = createContext(null)

export function AnalysisProvider({ children }) {
  const [current, setCurrent] = useState(null)
  const [history, setHistory] = useState([])
  return (
    <AnalysisContext.Provider value={{ current, setCurrent, history, setHistory }}>
      {children}
    </AnalysisContext.Provider>
  )
}

export function useAnalysis() {
  return useContext(AnalysisContext)
}
