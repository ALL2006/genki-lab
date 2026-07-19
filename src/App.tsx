import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { ConceptsPage } from './pages/ConceptsPage'
import { ContentPage } from './pages/ContentPage'
import { DashboardPage } from './pages/DashboardPage'
import { ResearchPage } from './pages/ResearchPage'
import { TrendsPage } from './pages/TrendsPage'
import { ValidationPage } from './pages/ValidationPage'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/research" element={<ResearchPage />} />
          <Route path="/trends" element={<TrendsPage />} />
          <Route path="/concepts" element={<ConceptsPage />} />
          <Route path="/content" element={<ContentPage />} />
          <Route path="/validation" element={<ValidationPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
