import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import logo from '@/assets/logo.png'; // Make sure this path matches your logo location

const Index = () => {
  const { isAuthenticated, role, loading, initializing } = useAuth();

  // 🚀 WEB ENHANCEMENT: Show a branded loading screen instead of a blank white page
  // We check both 'loading' and 'initializing' to ensure we don't redirect prematurely
  if (loading || initializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-6">
        <div className="w-24 h-24 rounded-[2rem] bg-white shadow-xl border border-slate-100 flex items-center justify-center p-4 animate-pulse">
          <img src={logo} alt="Hamro Kishan" className="w-full h-full object-contain" />
        </div>
        <div className="flex items-center text-emerald-600 gap-2 font-bold tracking-widest uppercase text-sm">
          <Loader2 className="animate-spin" size={18} />
          <span>Starting Workspace...</span>
        </div>
      </div>
    );
  }

  // If not authenticated after loading finishes, send to login
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Route based on role
  switch (role) {
    case 'farmer': return <Navigate to="/farmer" replace />;
    case 'buyer':  return <Navigate to="/buyer"  replace />;
    case 'expert': return <Navigate to="/expert" replace />;
    case 'admin':  return <Navigate to="/admin"  replace />;
    default:       return <Navigate to="/login"  replace />;
  }
};

export default Index;
