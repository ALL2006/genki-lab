import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { ConceptsPage } from './pages/ConceptsPage'
import { DataSourcesPage } from './pages/DataSourcesPage'
import { DashboardPage } from './pages/DashboardPage'
import { TrendsPage } from './pages/TrendsPage'
import { ValidationPage } from './pages/ValidationPage'
import { EvaluationPage } from './pages/EvaluationPage'
import { AnalysisBatchesPage } from './pages/AnalysisBatchesPage'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/data-sources" element={<DataSourcesPage />} />
          <Route path="/trends" element={<TrendsPage />} />
          <Route path="/concepts" element={<ConceptsPage />} />
          <Route path="/validation" element={<ValidationPage />} />
          <Route path="/analysis-batches" element={<AnalysisBatchesPage />} />
          <Route path="/evaluation" element={<EvaluationPage />} />
          <Route path="/research" element={<Navigate to="/data-sources" replace />} />
          <Route path="/content" element={<Navigate to="/concepts" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
