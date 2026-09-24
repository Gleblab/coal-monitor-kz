import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { OverviewPage } from './pages/OverviewPage'
import { ResourcesPage } from './pages/ResourcesPage'
import { ProductionPage } from './pages/ProductionPage'
import { ConcentrationPage } from './pages/ConcentrationPage'
import { DynamicsPage } from './pages/DynamicsPage'
import { RetailPage } from './pages/RetailPage'
import { EnergyRolePage } from './pages/EnergyRolePage'
import { SourcesPage } from './pages/SourcesPage'
import { OutlookPage } from './pages/OutlookPage'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/energy-role" element={<EnergyRolePage />} />
        <Route path="/resources" element={<ResourcesPage />} />
        <Route path="/production" element={<ProductionPage />} />
        <Route path="/outlook" element={<OutlookPage />} />
        <Route path="/concentration" element={<ConcentrationPage />} />
        <Route path="/dynamics" element={<DynamicsPage />} />
        <Route path="/retail" element={<RetailPage />} />
        <Route path="/sources" element={<SourcesPage />} />
        <Route path="/prices" element={<Navigate to="/retail" replace />} />
        <Route path="/producers" element={<Navigate to="/concentration" replace />} />
        <Route path="/news" element={<Navigate to="/sources" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
