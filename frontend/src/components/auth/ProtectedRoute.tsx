import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireAdmin = false, requireSuperAdmin = false }) => {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-navy">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-teal"></div>
      </div>
    );
  }

  // Redirect to landing if no session AND no mock profile
  if (!session && !profile) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Redirect Platform Admins to platform dashboard
  if (profile?.role === 'platform_admin') {
    return <Navigate to="/platform" replace />;
  }


  // Handle Super Admin / Owner-only routes
  if (requireSuperAdmin && profile?.role !== 'superadmin' && profile?.role !== 'owner') {
    return <Navigate to="/dashboard" replace />;
  }

  // Handle Admin-only routes
  if (requireAdmin && profile?.role !== 'admin' && profile?.role !== 'superadmin' && profile?.role !== 'owner') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;

};

export default ProtectedRoute;
