import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/common/ProtectedRoute';

// Pages
import { LandingPage } from './pages/public/LandingPage';
import { StoreDashboard } from './pages/store/StoreDashboard';
import { OptometristDashboard } from './pages/optometrist/OptometristDashboard';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { CustomerListPage } from './pages/customer/CustomerListPage';
import { CustomerRegisterPage } from './pages/customer/CustomerRegisterPage';
import { CustomerProfilePage } from './pages/customer/CustomerProfilePage';
import { InterviewPage } from './pages/interview/InterviewPage';
import { ScreeningPage } from './pages/screening/ScreeningPage';
import { ScreeningReviewPage } from './pages/screening/ScreeningReviewPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 3, // 3 minutes
      refetchOnWindowFocus: false,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* Store Operator Protected Routes */}
              <Route
                path="/store"
                element={
                  <ProtectedRoute allowedRoles={['STORE_OPERATOR', 'ADMIN']}>
                    <StoreDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customers"
                element={
                  <ProtectedRoute allowedRoles={['STORE_OPERATOR', 'ADMIN']}>
                    <CustomerListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customers/new"
                element={
                  <ProtectedRoute allowedRoles={['STORE_OPERATOR', 'ADMIN']}>
                    <CustomerRegisterPage />
                  </ProtectedRoute>
                }
              />

              {/* Shared Customer Profile (Operator, Optometrist, Admin) */}
              <Route
                path="/customers/:id"
                element={
                  <ProtectedRoute allowedRoles={['STORE_OPERATOR', 'OPTOMETRIST', 'ADMIN']}>
                    <CustomerProfilePage />
                  </ProtectedRoute>
                }
              />

              {/* Milestone 3: Voice Interview Engine */}
              <Route
                path="/customers/:id/interview"
                element={
                  <ProtectedRoute allowedRoles={['STORE_OPERATOR', 'ADMIN']}>
                    <InterviewPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/interview/:id"
                element={
                  <ProtectedRoute allowedRoles={['STORE_OPERATOR', 'ADMIN']}>
                    <InterviewPage />
                  </ProtectedRoute>
                }
              />

              {/* Milestone 4: Preliminary Vision Screening Engine (Tumbling-E & Amsler Grid) */}
              <Route
                path="/customers/:id/screening"
                element={
                  <ProtectedRoute allowedRoles={['STORE_OPERATOR', 'ADMIN']}>
                    <ScreeningPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/screening/:id"
                element={
                  <ProtectedRoute allowedRoles={['STORE_OPERATOR', 'ADMIN']}>
                    <ScreeningPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/screenings/:id/review"
                element={
                  <ProtectedRoute allowedRoles={['STORE_OPERATOR', 'OPTOMETRIST', 'ADMIN']}>
                    <ScreeningReviewPage />
                  </ProtectedRoute>
                }
              />

              {/* Optometrist Protected Routes */}
              <Route
                path="/optometrist"
                element={
                  <ProtectedRoute allowedRoles={['OPTOMETRIST', 'ADMIN']}>
                    <OptometristDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Admin Protected Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
