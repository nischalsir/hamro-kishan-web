import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { isAuthenticated, role, loading } = useAuth();

  // Wait for Supabase to restore the session before making any routing decision
  if (loading) return null;

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  switch (role) {
    case 'farmer': return <Navigate to="/farmer" replace />;
    case 'buyer':  return <Navigate to="/buyer"  replace />;
    case 'expert': return <Navigate to="/expert" replace />;
    case 'admin':  return <Navigate to="/admin"  replace />;
    default:       return <Navigate to="/login"  replace />;
  }
};

export default Index;