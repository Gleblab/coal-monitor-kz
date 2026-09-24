import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { FilterProvider } from './context/FilterContext'
import { SourceProvider } from './context/SourceContext'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <FilterProvider>
        <SourceProvider>
          <App />
        </SourceProvider>
      </FilterProvider>
    </BrowserRouter>
  </StrictMode>,
)
