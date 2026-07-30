import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

import LoginPage       from './pages/LoginPage'
import Dashboard       from './pages/Dashboard'
import EmployeeList    from './pages/employees/EmployeeList'
import EmployeeProfile from './pages/employees/EmployeeProfile'
import EmployeeForm    from './pages/employees/EmployeeForm'
import PayrollPage     from './pages/payroll/PayrollPage'
import AttendancePage  from './pages/payroll/AttendancePage'
import LedgerPage      from './pages/ledger/LedgerPage'
import AdvancePage     from './pages/ledger/AdvancePage'
import FinePage        from './pages/ledger/FinePage'
import AssetsPage      from './pages/assets/AssetsPage'
import ReportsPage     from './pages/reports/ReportsPage'
import SalarySlip      from './pages/reports/SalarySlip'
import AdminPage       from './pages/admin/AdminPage'
import ClientsPage     from './pages/clients/ClientsPage'
import LeavePage       from './pages/leave/LeavePage'
import GrievancePage   from './pages/grievances/GrievancePage'
import ShiftsPage      from './pages/shifts/ShiftsPage'
import SelfPayslips    from './pages/self/SelfPayslips'
import SelfSlip        from './pages/self/SelfSlip'
import SelfLeave       from './pages/self/SelfLeave'
import SelfGrievances  from './pages/self/SelfGrievances'
import AIInsightsPage   from './pages/ai/AIInsightsPage'
import AttendanceReportsPage      from './pages/attendance-reports/AttendanceReportsPage'
import EthnicAttendanceReport     from './pages/attendance-reports/EthnicAttendanceReport'
import ProductAttendanceReport    from './pages/attendance-reports/ProductAttendanceReport'
import ProductShiftAttendanceReport from './pages/attendance-reports/ProductShiftAttendanceReport'
import MusterRollReport           from './pages/attendance-reports/MusterRollReport'
import DownloadsPage              from './pages/attendance-reports/DownloadsPage'

// Every non-EMPLOYEE route below lists its roles explicitly (never `roles`
// left unset) so a self-service EMPLOYEE login can never reach the full
// employee roster, payroll, or any other HR-facing screen.
const ALL_HR_ROLES = ['SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF', 'ACCOUNTS', 'VIEWER']

// Punch-attendance report generator module shares the Payroll/Reports access
// tier and is gated identically on the backend (VIEWER excluded).
const REPORT_GEN_ROLES = ['SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF', 'ACCOUNTS']

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Dashboard branches internally by role (EMPLOYEE sees a self-service summary) */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout><Dashboard /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/employees" element={
        <ProtectedRoute roles={ALL_HR_ROLES}>
          <Layout><EmployeeList /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/employees/new" element={
        <ProtectedRoute roles={['SUPER_ADMIN','HR_MANAGER','HR_STAFF']}>
          <Layout><EmployeeForm /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/employees/:id" element={
        <ProtectedRoute roles={ALL_HR_ROLES}>
          <Layout><EmployeeProfile /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/employees/:id/edit" element={
        <ProtectedRoute roles={['SUPER_ADMIN','HR_MANAGER','HR_STAFF']}>
          <Layout><EmployeeForm /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/payroll" element={
        <ProtectedRoute roles={['SUPER_ADMIN','HR_MANAGER','HR_STAFF','ACCOUNTS']}>
          <Layout><PayrollPage /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/payroll/attendance" element={
        <ProtectedRoute roles={['SUPER_ADMIN','HR_MANAGER','HR_STAFF']}>
          <Layout><AttendancePage /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/ledger" element={
        <ProtectedRoute roles={['SUPER_ADMIN','HR_MANAGER','HR_STAFF']}>
          <Layout><LedgerPage /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/ledger/advances" element={
        <ProtectedRoute roles={['SUPER_ADMIN','HR_MANAGER','HR_STAFF']}>
          <Layout><AdvancePage /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/ledger/fines" element={
        <ProtectedRoute roles={['SUPER_ADMIN','HR_MANAGER','HR_STAFF']}>
          <Layout><FinePage /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/assets" element={
        <ProtectedRoute roles={['SUPER_ADMIN','HR_MANAGER','HR_STAFF']}>
          <Layout><AssetsPage /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/clients" element={
        <ProtectedRoute roles={ALL_HR_ROLES}>
          <Layout><ClientsPage /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/leave" element={
        <ProtectedRoute roles={['SUPER_ADMIN','HR_MANAGER','HR_STAFF']}>
          <Layout><LeavePage /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/grievances" element={
        <ProtectedRoute roles={['SUPER_ADMIN','HR_MANAGER','HR_STAFF']}>
          <Layout><GrievancePage /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/shifts" element={
        <ProtectedRoute roles={['SUPER_ADMIN','HR_MANAGER','HR_STAFF','ACCOUNTS']}>
          <Layout><ShiftsPage /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/reports" element={
        <ProtectedRoute roles={['SUPER_ADMIN','HR_MANAGER','ACCOUNTS']}>
          <Layout><ReportsPage /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/reports/slip/:employeeId/:month/:year" element={
        <ProtectedRoute roles={ALL_HR_ROLES}>
          <Layout><SalarySlip /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/ai-insights" element={
        <ProtectedRoute roles={ALL_HR_ROLES}>
          <Layout><AIInsightsPage /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/attendance-reports" element={
        <ProtectedRoute roles={REPORT_GEN_ROLES}>
          <Layout><AttendanceReportsPage /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/attendance-reports/ethnic" element={
        <ProtectedRoute roles={REPORT_GEN_ROLES}>
          <Layout><EthnicAttendanceReport /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/attendance-reports/product" element={
        <ProtectedRoute roles={REPORT_GEN_ROLES}>
          <Layout><ProductAttendanceReport /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/attendance-reports/product-shift" element={
        <ProtectedRoute roles={REPORT_GEN_ROLES}>
          <Layout><ProductShiftAttendanceReport /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/attendance-reports/muster-roll" element={
        <ProtectedRoute roles={REPORT_GEN_ROLES}>
          <Layout><MusterRollReport /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/attendance-reports/downloads" element={
        <ProtectedRoute roles={REPORT_GEN_ROLES}>
          <Layout><DownloadsPage /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/admin" element={
        <ProtectedRoute roles={['SUPER_ADMIN']}>
          <Layout><AdminPage /></Layout>
        </ProtectedRoute>
      } />

      {/* Self-service (EMPLOYEE role only) */}
      <Route path="/self/payslips" element={
        <ProtectedRoute roles={['EMPLOYEE']}>
          <Layout><SelfPayslips /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/self/payslips/slip/:month/:year" element={
        <ProtectedRoute roles={['EMPLOYEE']}>
          <Layout><SelfSlip /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/self/leave" element={
        <ProtectedRoute roles={['EMPLOYEE']}>
          <Layout><SelfLeave /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/self/grievances" element={
        <ProtectedRoute roles={['EMPLOYEE']}>
          <Layout><SelfGrievances /></Layout>
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
