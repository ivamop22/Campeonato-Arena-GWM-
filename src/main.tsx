import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import { Toaster } from 'sonner'
import { AuthProvider } from './lib/auth'
import { ProtectedRoute } from './app/components/auth/ProtectedRoute'
import LoginPage from './app/pages/LoginPage'
import SuperAdminPage from './app/pages/SuperAdminPage'
import AdminPage from './app/pages/AdminPage'
import PlayerPage from './app/pages/PlayerPage'
import UnauthorizedPage from './app/pages/UnauthorizedPage'
import './styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route
            path="/superadmin/*"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <SuperAdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/player/*"
            element={
              <ProtectedRoute allowedRoles={['player']}>
                <PlayerPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="top-right" />
    </AuthProvider>
  </StrictMode>,
)
