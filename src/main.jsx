import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { FilterProvider } from './context/FilterContext'
import { SourceProvider } from './context/SourceContext'
import { ComparisonProvider } from './context/ComparisonContext'
import { MetricTraceProvider } from './context/MetricTraceContext'
import { MarketSearchProvider } from './context/MarketSearchContext'
import { WatchlistProvider } from './context/WatchlistContext'
import { ChangeCenterProvider } from './context/ChangeCenterContext'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <FilterProvider>
            <SourceProvider>
              <ComparisonProvider>
                <MetricTraceProvider>
                  <MarketSearchProvider>
                    <WatchlistProvider>
                      <ChangeCenterProvider>
                        <App />
                      </ChangeCenterProvider>
                    </WatchlistProvider>
                  </MarketSearchProvider>
                </MetricTraceProvider>
              </ComparisonProvider>
            </SourceProvider>
          </FilterProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
