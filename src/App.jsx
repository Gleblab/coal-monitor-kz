import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Layout } from './components/Layout'
import { getPageSkeletonVariant, PageSkeleton } from './components/PageSkeleton'
import { ScenarioProvider } from './context/ScenarioContext'

const OverviewPage = lazy(() =>
  import('./pages/OverviewPage').then((module) => ({ default: module.OverviewPage })),
)
const EnergyRolePage = lazy(() =>
  import('./pages/EnergyRolePage').then((module) => ({ default: module.EnergyRolePage })),
)
const ResourcesPage = lazy(() =>
  import('./pages/ResourcesPage').then((module) => ({ default: module.ResourcesPage })),
)
const ProductionPage = lazy(() =>
  import('./pages/ProductionPage').then((module) => ({ default: module.ProductionPage })),
)
const GeographyPage = lazy(() =>
  import('./pages/GeographyPage').then((module) => ({ default: module.GeographyPage })),
)
const OutlookPage = lazy(() =>
  import('./pages/OutlookPage').then((module) => ({ default: module.OutlookPage })),
)
const InfrastructureIntelligencePage = lazy(() =>
  import('./pages/InfrastructureIntelligencePage').then((module) => ({
    default: module.InfrastructureIntelligencePage,
  })),
)
const ConcentrationPage = lazy(() =>
  import('./pages/ConcentrationPage').then((module) => ({ default: module.ConcentrationPage })),
)
const DynamicsPage = lazy(() =>
  import('./pages/DynamicsPage').then((module) => ({ default: module.DynamicsPage })),
)
const RetailPage = lazy(() =>
  import('./pages/RetailPage').then((module) => ({ default: module.RetailPage })),
)
const SourcesPage = lazy(() =>
  import('./pages/SourcesPage').then((module) => ({ default: module.SourcesPage })),
)
const CompaniesPage = lazy(() =>
  import('./pages/CompaniesPage').then((module) => ({ default: module.CompaniesPage })),
)
const ExportsPage = lazy(() =>
  import('./pages/ExportsPage').then((module) => ({ default: module.ExportsPage })),
)
const ConstraintsPage = lazy(() =>
  import('./pages/ConstraintsPage').then((module) => ({ default: module.ConstraintsPage })),
)

function PageFallback() {
  const { pathname } = useLocation()
  return <PageSkeleton variant={getPageSkeletonVariant(pathname)} />
}

export default function App() {
  return (
    <ScenarioProvider>
    <Layout>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/energy-role" element={<EnergyRolePage />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/production" element={<ProductionPage />} />
          <Route path="/geography" element={<GeographyPage />} />
          <Route path="/outlook" element={<OutlookPage />} />
          <Route path="/outlook/infrastructure" element={<InfrastructureIntelligencePage />} />
          <Route path="/concentration" element={<ConcentrationPage />} />
          <Route path="/dynamics" element={<DynamicsPage />} />
          <Route path="/retail" element={<RetailPage />} />
          <Route path="/sources" element={<SourcesPage />} />
          <Route path="/companies" element={<CompaniesPage />} />
          <Route path="/exports" element={<ExportsPage />} />
          <Route path="/constraints" element={<ConstraintsPage />} />
          <Route path="/risks" element={<Navigate to="/constraints" replace />} />
          <Route path="/prices" element={<Navigate to="/retail" replace />} />
          <Route path="/producers" element={<Navigate to="/concentration" replace />} />
          <Route path="/news" element={<Navigate to="/sources" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
    </ScenarioProvider>
  )
}
