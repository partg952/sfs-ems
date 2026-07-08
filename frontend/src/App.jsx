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
import AssetsPage from './pages/assets/AssetsPage'
import ShiftsPage from './pages/shifts/ShiftsPage'
import LedgerPage from './pages/ledger/LedgerPage'
import AdvancePage from './pages/ledger/AdvancePage'
import FinePage from './pages/ledger/FinePage'
import AttendancePage from './pages/payroll/AttendancePage'
import PayrollPage from './pages/payroll/PayrollPage'
import ReportsPage from './pages/reports/ReportsPage'
import SalarySlip from './pages/reports/SalarySlip'
import LeavePage from './pages/leave/LeavePage'
import GrievancePage from './pages/grievances/GrievancePage'

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
      <Route path="/ledger/advances" element={
        <ProtectedRoute>
          <Layout><AdvancePage /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/ledger/fines" element={
        <ProtectedRoute>
          <Layout><FinePage /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/payroll" element={
        <ProtectedRoute>
          <Layout><PayrollPage /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/grievances" element={
        <ProtectedRoute>
          <Layout><GrievancePage /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/leave" element={
        <ProtectedRoute>
          <Layout><LeavePage /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/reports" element={
        <ProtectedRoute>
          <Layout><ReportsPage /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/reports/slip/:employeeId/:month/:year" element={
        <ProtectedRoute>
          <Layout><SalarySlip /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/payroll/attendance" element={
        <ProtectedRoute>
          <Layout><AttendancePage /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/ledger" element={
        <ProtectedRoute>
          <Layout><LedgerPage /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/shifts" element={
        <ProtectedRoute>
          <Layout><ShiftsPage /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/assets" element={
        <ProtectedRoute>
          <Layout><AssetsPage /></Layout>
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
