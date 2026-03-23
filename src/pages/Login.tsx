import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LogIn, Eye, EyeOff, ArrowRight } from 'lucide-react';
import logo from '@/assets/logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner'; // Using Sonner for the web-optimized toasts

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [logoStage, setLogoStage] = useState<'hidden' | 'popping' | 'dropping' | 'wave' | 'settled'>('hidden');
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const [bgImage] = useState(() => Math.floor(Math.random() * 10) + 1);

  const { login, isAuthenticated, loading, role, initializing } = useAuth();
  const navigate = useNavigate();

  // ── ANIMATION SEQUENCE ────────────────────────────────────────────────
  useEffect(() => {
    const sequence = [
      { s: 'popping', t: 200 }, { s: 'dropping', t: 1200 }, { s: 'wave', t: 2200 }, { s: 'settled', t: 3500 }
    ];
    sequence.forEach(step => setTimeout(() => setLogoStage(step.s as any), step.t));
    setTimeout(() => setStage(1), 1250);
    setTimeout(() => setStage(2), 2000);
  }, []);

  // ── AUTH REDIRECT ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!initializing && !loading && isAuthenticated && role) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, role, loading, initializing, navigate]);

  // ── FORM SUBMIT ───────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { 
      toast.warning('Please fill in both email and password.'); 
      return; 
    }
    
    setSubmitting(true);
    const { error: loginError } = await login(email, password);
    setSubmitting(false);
    
    if (loginError) {
      toast.error(loginError);
    } else {
      toast.success('Welcome back to Hamro Kishan!');
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-white md:flex">
      <style>{`
        @keyframes greenRipple {
          0% { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(3.5); opacity: 0; }
        }
      `}</style>

      {/* ── LEFT PANEL: CINEMATIC HERO (Desktop Only) ── */}
      <div className="hidden md:block md:w-[45%] lg:w-[55%] relative overflow-hidden">
        <img
          src={`/assets/others/${bgImage}.jpg`}
          alt="Farmer"
          className="w-full h-full object-cover animate-in fade-in duration-1000"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-emerald-950/20 to-transparent p-16 flex flex-col justify-end">
          <h1 className="text-white text-5xl font-black mb-4 tracking-tighter leading-tight">
            Connecting Nepal's <br /> Agriculture.
          </h1>
          <p className="text-emerald-50/70 text-lg font-medium max-w-md">
            The digital home for farmers, experts, and buyers. Empowering local communities through technology.
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL / MOBILE OVERLAY ── */}
      <div className="flex-1 relative flex flex-col h-screen overflow-hidden">
        
        {/* Mobile Header Image Overlay */}
        <div className="md:hidden absolute inset-0 w-full h-full -z-10">
            <img src={`/assets/others/${bgImage}.jpg`} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
        </div>

        {/* ── LOGO & BRANDING ── */}
        <div className="relative z-10 pt-16 md:pt-20 flex flex-col items-center shrink-0">
          <div 
            className="w-20 h-20 rounded-[1.5rem] overflow-hidden shadow-2xl border-4 border-white/20 relative"
            style={{ 
              transform: logoStage === 'popping' ? 'scale(1.4)' : 'scale(1)',
              transition: 'transform 0.8s cubic-bezier(0.34, 1.5, 0.64, 1)'
            }}
          >
            {logoStage === 'wave' && (
               <div className="absolute inset-0 bg-emerald-500 pointer-events-none" style={{ animation: 'greenRipple 1.2s ease-out forwards' }} />
            )}
            <img src={logo} className="w-full h-full object-cover" />
          </div>
          <h2 className="text-white md:text-slate-900 font-black text-2xl mt-5 tracking-tight">Hamro Kishan</h2>
          <p className="text-white/60 md:text-emerald-600 text-[10px] font-black uppercase tracking-[0.2em]">हाम्रो किसान</p>
        </div>

        {/* ── THE LOGIN CARD ── */}
        <div 
          className="flex-1 mt-10 bg-white md:bg-transparent rounded-t-[3rem] md:rounded-none shadow-2xl md:shadow-none overflow-y-auto z-20"
          style={{
            transform: stage >= 1 ? 'translateY(0)' : 'translateY(110%)',
            transition: 'transform 1s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div className="max-w-[400px] mx-auto px-8 py-12 md:py-8">
            <div className="md:hidden w-12 h-1 bg-slate-200 rounded-full mx-auto mb-10" />
            
            <header className="mb-10 text-center md:text-left">
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Welcome back</h3>
                <p className="text-slate-500 font-bold text-sm mt-1">Please enter your details to login.</p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="name@company.com"
                  className="h-14 rounded-2xl bg-slate-50 border-none px-5 text-base focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all" 
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <Button variant="link" size="sm" asChild className="p-0 h-auto font-bold text-emerald-600 hover:text-emerald-700">
                    <Link to="/forgot-password">
                      Forgot?
                    </Link>
                  </Button>
                </div>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    placeholder="••••••••"
                    className="h-14 rounded-2xl bg-slate-50 border-none px-5 text-base focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all" 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  type="submit" 
                  disabled={submitting} 
                  className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg shadow-xl shadow-emerald-200 transition-all active:scale-95"
                >
                  {submitting ? 'Authenticating...' : 'Login to Dashboard'}
                </Button>
              </div>

              <div className="pt-6 text-center">
                <p className="text-sm font-bold text-slate-400">
                  New to our platform? <br className="md:hidden" />
                  <Link to="/register" className="text-emerald-600 hover:text-emerald-700 underline ml-1">
                    Create an account
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;