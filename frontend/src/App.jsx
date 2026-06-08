import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import EmployeeList from './pages/employees/EmployeeList'
import EmployeeProfile from './pages/employees/EmployeeProfile'
import EmployeeForm from './pages/employees/EmployeeForm'
import ClientsPage from './pages/clients/ClientsPage'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/employees/:id" element={
        <ProtectedRoute>
          <Layout><EmployeeProfile /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/employees/new" element={
        <ProtectedRoute>
          <Layout><EmployeeForm /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/employees/:id/edit" element={
        <ProtectedRoute>
          <Layout><EmployeeForm /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/clients" element={
        <ProtectedRoute>
          <Layout><ClientsPage /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/employees" element={
        <ProtectedRoute>
          <Layout><EmployeeList /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout><Dashboard /></Layout>
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
