import React from 'react';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import type { AppRole } from '@/contexts/AuthContext';

// Import your logo
import logo from '@/assets/logo.png';

// --- Page imports ---
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import NotFound from './pages/NotFound';
import FarmerLayout from './components/FarmerLayout';

// 🚀 Farmer Pages
import { 
  FarmerHome, 
  FarmerMarket, 
  FarmerAdvisory, 
  FarmerProfile 
} from './pages/farmer';

// --- Other Role Pages ---
import BuyerDashboard from './pages/buyer/BuyerDashboard';
import ExpertDashboard from './pages/expert/ExpertDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';

// Sound utility
export const playIosSound = () => {
  const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  audio.volume = 0.4;
  audio.play().catch(e => console.log('Audio muted by browser policy:', e));
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60,
    },
  },
});

// ---------------------------------------------------------------------------
// 🚀 LOADING SCREEN (Web-Optimized)
// ---------------------------------------------------------------------------
const LoadingScreen: React.FC = () => (
  <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background overflow-hidden">
    <style>{`
      @keyframes slide-logo {
        0% { transform: translateX(85px); }
        100% { transform: translateX(0); }
      }
      @keyframes fade-text {
        0% { opacity: 0; max-width: 0; margin-left: 0; }
        100% { opacity: 1; max-width: 300px; margin-left: 16px; }
      }
      .yt-logo-anim {
        animation: slide-logo 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) 0.5s forwards;
        transform: translateX(85px); 
      }
      .yt-text-anim {
        animation: fade-text 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) 0.5s forwards;
        opacity: 0;
        max-width: 0;
        overflow: hidden;
        white-space: nowrap;
      }
    `}</style>
    
    <div className="flex items-center justify-center scale-110 sm:scale-125">
      <img 
        src="/load.png" 
        alt="Hamro Kishan Logo" 
        className="w-20 h-20 sm:w-24 sm:h-24 object-contain yt-logo-anim drop-shadow-xl"
      />
      <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-foreground yt-text-anim pt-1">
        Hamro Kishan
      </h1>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// AUTH HELPERS (RoleRouter, ProtectedRoute, PublicRoute)
// ---------------------------------------------------------------------------
const RoleRouter: React.FC = () => {
  const { isAuthenticated, role, loading, initializing } = useAuth();
  if (initializing || loading) return <LoadingScreen />;
  if (!isAuthenticated || !role) return <Navigate to="/login" replace />;

  const roleRouteMap: Record<AppRole, string> = {
    farmer: '/farmer',
    buyer: '/buyer',
    expert: '/expert',
    admin: '/admin',
  };
  return <Navigate to={roleRouteMap[role]} replace />;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: AppRole[] }> = ({ children, allowedRoles }) => {
  const { isAuthenticated, role, loading, initializing } = useAuth();
  if (initializing || loading) return <LoadingScreen />;
  if (!isAuthenticated || !role) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, role, initializing } = useAuth();
  if (initializing) return <LoadingScreen />;
  if (isAuthenticated && role) return <Navigate to="/" replace />;
  return <>{children}</>;
};

// ---------------------------------------------------------------------------
// MAIN APP COMPONENT
// ---------------------------------------------------------------------------
const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        
        {/* WEB-OPTIMIZED DYNAMIC ISLAND (SONNER) */}
        <Sonner 
          position="top-center" 
          style={{ top: '24px' }} // Slightly higher for web visibility
          toastOptions={{
            unstyled: true,
            // Increased width and padding for web layout
            className: "flex w-full min-w-[360px] sm:min-w-[420px] max-w-[500px] items-center gap-4 rounded-2xl bg-[#1a1c1e]/80 px-5 py-4 text-white backdrop-blur-3xl border border-white/10 shadow-2xl transition-all duration-500 ease-out",
            classNames: {
              icon: "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/5 border border-white/10 overflow-hidden shadow-lg",
              content: "flex flex-col gap-0.5 ml-2",
              title: "text-[16px] font-bold tracking-tight text-white",
              description: "text-[14px] text-white/60 font-medium leading-tight",
            }
          }}
          icons={{
            success: <img src={logo} className="w-full h-full object-cover scale-110" />,
            error: <img src={logo} className="w-full h-full object-cover scale-110 grayscale" />,
          }}
        />

        <BrowserRouter>
          <Routes>
            {/* Auth Routes */}
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />

            {/* Role-based entry point */}
            <Route path="/" element={<RoleRouter />} />

            {/* Farmer Web Portal (Nested) */}
            <Route
              path="/farmer"
              element={
                <ProtectedRoute allowedRoles={['farmer']}>
                  <FarmerLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<FarmerHome />} />
              <Route path="market" element={<FarmerMarket />} />
              <Route path="advisory" element={<FarmerAdvisory />} />
              <Route path="profile" element={<FarmerProfile />} />
            </Route>

            {/* Other Dashboards */}
            <Route path="/buyer" element={<ProtectedRoute allowedRoles={['buyer']}><BuyerDashboard /></ProtectedRoute>} />
            <Route path="/expert" element={<ProtectedRoute allowedRoles={['expert']}><ExpertDashboard /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;