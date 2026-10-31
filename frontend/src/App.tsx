import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/home/Dashboard';
import HiringOnboarding from './pages/home/HiringOnboarding';
import Offboarding from './pages/home/Offboarding';
import RoleHierarchy from './pages/home/RoleHierarchy';
import SkillsLearning from './pages/home/SkillsLearning';
import Updates from './pages/home/Updates';
import Settings from './pages/home/Settings';
import CalendarPage from './pages/home/Calendar';
import AdminManagement from './pages/home/AdminManagement';
import EmployeeManagement from './pages/home/EmployeeManagement';

// My Space
import Profile from './pages/myspace/Profile';
import Attendance from './pages/myspace/Attendance';
import Leaves from './pages/myspace/Leaves';
import HelpDesk from './pages/myspace/HelpDesk';
import Resignation from './pages/myspace/Resignation';

// Finance
import PayDocs from './pages/finance/PayDocs';
import Loans from './pages/finance/Loans';
import TaxInformation from './pages/finance/TaxInformation';

// Assets
import Equipment from './pages/assets/Equipment';
import Query from './pages/assets/Query';

// Performance
import Performance from './pages/performance/Performance';
// import Goals from './pages/performance/Goals';
// import Analytics from './pages/performance/Analytics';

import LandingPage from './pages/LandingPage';
import ResetPassword from './pages/ResetPassword';
import Plans from './pages/Plans';
import { AuthProvider } from './context/AuthContext';
import { TenantProvider, TenantGate } from './context/TenantContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import SubscriptionGate from './components/auth/SubscriptionGate';
import PlatformRoute from './components/auth/PlatformRoute';
import PlatformLayout from './components/layout/PlatformLayout';
import PlatformDashboard from './pages/platform/PlatformDashboard';
import PlatformUsers from './pages/platform/PlatformUsers';
import AuditLogs from './pages/platform/AuditLogs';
import GlobalSettings from './pages/platform/GlobalSettings';

// Platform dashboard: customer CRM, billing verification and payment rails
import PlatformCustomers from './pages/platform/Customers';
import PlatformCustomerDetail from './pages/platform/CustomerDetail';
import PlatformRevenueMetrics from './pages/platform/RevenueMetrics';
import PlatformPaymentVerifications from './pages/platform/PaymentVerifications';
import PlatformBillingSettings from './pages/platform/BillingSettings';

import { useEffect } from 'react';
import ErrorBoundary from './components/common/ErrorBoundary';

const LoginWorkspaceRouter = () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('workspace') === 'owner') {
    return <Navigate to="/platform" replace />;
  }
  return <Navigate to="/" replace />;
};

function App() {
  useEffect(() => {
    // Purge cached fake records from previous versions to ensure production cleanliness
    if (!localStorage.getItem('fake_data_purged_v4')) {
      const keysToPurge = [
        'hr_equipment', 'all_equipment', 'software_licenses', 'hr_licenses', 'hr_assets_queries', 'asset_queries',
        'hr_loan_applications', 'hr_support_tickets', 'hr_leave_requests', 
        'hr_courses_assigned', 'hr_payroll_ledger', 'hr_employee_attendance', 'hr_attendance_logs',
        'hr_offboarding_requests', 'hr_offboarding_checklists',
        'hr_role_hierarchy'
      ];
      keysToPurge.forEach(k => localStorage.removeItem(k));
      localStorage.setItem('fake_data_purged_v4', 'true');
    }
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <TenantProvider>
          <Router>
          <Routes>
            {/* Public Landing Page & Common Auth */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginWorkspaceRouter />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* Commercial Plans & Indian Rails Billing - Routed to Settings */}
            <Route path="/plans" element={<Navigate to="/dashboard/settings?tab=billing" replace />} />
            <Route path="/owner" element={<Navigate to="/platform/customers" replace />} />

            {/* Platform Dashboard Routes */}
            <Route path="/platform" element={
              <PlatformRoute>
                <PlatformLayout />
              </PlatformRoute>
            }>
              <Route index element={<PlatformDashboard />} />
              <Route path="customers" element={<PlatformCustomers />} />
              <Route path="customers/new" element={<PlatformCustomerDetail />} />
              <Route path="customers/:slug" element={<PlatformCustomerDetail />} />
              <Route path="metrics" element={<PlatformRevenueMetrics />} />
              <Route path="verifications" element={<PlatformPaymentVerifications />} />
              <Route path="billing-settings" element={<PlatformBillingSettings />} />
              <Route path="organizations" element={<Navigate to="/platform/customers" replace />} />
              <Route path="payments" element={<Navigate to="/platform/verifications" replace />} />
              <Route path="users" element={<PlatformUsers />} />
              <Route path="audit-logs" element={<AuditLogs />} />
              <Route path="settings" element={<GlobalSettings />} />
            </Route>
          
          {/* Protected Dashboard Routes (Guarded by TenantGate & SubscriptionGate) */}
          <Route path="/dashboard" element={
            <TenantGate>
              <ProtectedRoute>
                <SubscriptionGate>
                  <DashboardLayout />
                </SubscriptionGate>
              </ProtectedRoute>
            </TenantGate>
          }>
            <Route index element={<Dashboard />} />
            
            {/* Admin Features */}
            <Route path="hiring" element={
              <ProtectedRoute requireAdmin>
                <HiringOnboarding />
              </ProtectedRoute>
            } />
            <Route path="offboarding" element={
              <ProtectedRoute requireAdmin>
                <Offboarding />
              </ProtectedRoute>
            } />
            <Route path="hierarchy" element={<RoleHierarchy />} />
            <Route path="skills" element={<SkillsLearning />} />
            <Route path="updates" element={
              <ProtectedRoute requireAdmin>
                <Updates />
              </ProtectedRoute>
            } />
            <Route path="settings" element={<Settings />} />
            
            {/* Super Admin Features */}
            <Route path="admins" element={
              <ProtectedRoute requireSuperAdmin>
                <AdminManagement />
              </ProtectedRoute>
            } />
            <Route path="employees" element={
              <ProtectedRoute requireSuperAdmin>
                <EmployeeManagement />
              </ProtectedRoute>
            } />
            
            {/* My Space Group */}
            <Route path="myspace">
              <Route index element={<Navigate to="/dashboard/myspace/profile" replace />} />
              <Route path="profile" element={<Profile />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="leaves" element={<Leaves />} />
              <Route path="resignation" element={<Resignation />} />
              <Route path="helpdesk" element={<HelpDesk />} />
            </Route>

            {/* Finance Group */}
            <Route path="finance">
              <Route index element={<PayDocs />} />
              <Route path="loans" element={<Loans />} />
              <Route path="tax" element={<TaxInformation />} />
            </Route>

            {/* Assets Group */}
            <Route path="assets">
              <Route index element={<Equipment />} />
              <Route path="equipment" element={<Equipment />} />
              <Route path="query" element={
                <ProtectedRoute requireAdmin>
                  <Query />
                </ProtectedRoute>
              } />
            </Route>
            <Route path="performance" element={<Performance />} />
            <Route path="calendar" element={<CalendarPage />} />

            {/* Flat links for backward compatibility if needed */}
            <Route path="profile" element={<Profile />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="leaves" element={<Leaves />} />
            <Route path="helpdesk" element={<HelpDesk />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      </TenantProvider>
    </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
