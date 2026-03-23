import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import logo from '@/assets/logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/utils/toast';

const Login: React.FC = () => {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting]     = useState(false);

  const [logoStage, setLogoStage] = useState<'hidden' | 'popping' | 'settled'>('hidden');
  const [stage, setStage] = useState<0 | 1 | 2>(0);

  const [bgImage] = useState(() => Math.floor(Math.random() * 10) + 1);

  const { login, isAuthenticated, loading, role, initializing } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const t0 = setTimeout(() => setLogoStage('popping'), 200);
    const t1 = setTimeout(() => setStage(1), 300);
    const t2 = setTimeout(() => setStage(2), 700);
    const t3 = setTimeout(() => setLogoStage('settled'), 400);

    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  useEffect(() => {
    if (initializing || loading) return;
    if (isAuthenticated && role) navigate('/', { replace: true });
  }, [isAuthenticated, role, loading, initializing, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.warning('Please fill in both email and password.'); return; }
    setSubmitting(true);
    const { error: loginError } = await login(email, password);
    setSubmitting(false);
    if (loginError) {
      toast.error(loginError);
    } else {
      toast.success('Welcome back!');
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black flex">

      {/* ── LEFT: HERO IMAGE PANEL ── */}
      <div
        className="relative flex-1 h-full overflow-hidden"
        style={{
          transform: stage >= 1 ? 'scale(1.03)' : 'scale(1)',
          transition: 'transform 1.4s cubic-bezier(0.33, 1, 0.68, 1)',
        }}
      >
        <img
          src={`/assets/others/${bgImage}.jpg`}
          alt="Farmer in field"
          className="w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to right, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 100%), linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.5) 100%)',
          }}
        />

        {/* Branding overlay on image */}
        <div
          className="absolute bottom-12 left-10 z-10 flex flex-col gap-3"
          style={{
            opacity: stage >= 2 ? 1 : 0,
            transform: stage >= 2 ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.8s ease 0.3s, transform 0.8s ease 0.3s',
          }}
        >
          <p className="text-white/60 text-sm font-medium tracking-widest uppercase">
            हाम्रो किसान
          </p>
          <h2 className="text-white text-4xl font-black leading-tight max-w-xs"
            style={{ textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>
            Empowering<br />Nepali Farmers
          </h2>
          <p className="text-white/70 text-sm max-w-xs leading-relaxed">
            Connect with experts, buy & sell produce, and grow your farm with modern tools.
          </p>
        </div>
      </div>

      {/* ── RIGHT: LOGIN PANEL ── */}
      <div
        className="relative z-20 flex flex-col justify-center bg-card h-full overflow-y-auto"
        style={{
          width: '460px',
          minWidth: '420px',
          transform: stage >= 1 ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.3)',
        }}
      >
        <div className="px-10 py-12 flex flex-col h-full justify-center">

          {/* Logo + App Name */}
          <div
            className="flex items-center gap-4 mb-10"
            style={{
              opacity: logoStage !== 'hidden' ? 1 : 0,
              transform: logoStage !== 'hidden' ? 'translateY(0)' : 'translateY(-12px)',
              transition: 'opacity 0.6s ease, transform 0.6s ease',
            }}
          >
            <div
              className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0"
              style={{ boxShadow: '0 6px 20px rgba(0,0,0,0.2), 0 0 0 1.5px rgba(0,0,0,0.08)' }}
            >
              <img src={logo} alt="Hamro Kishan" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-foreground font-black text-xl tracking-tight leading-tight">
                Hamro Kishan
              </h1>
              <p className="text-muted-foreground text-xs font-medium tracking-wide mt-0.5">
                हाम्रो किसान — Our Farmer
              </p>
            </div>
          </div>

          {/* Heading */}
          <div
            style={{
              opacity: stage >= 2 ? 1 : 0,
              transform: stage >= 2 ? 'translateY(0)' : 'translateY(10px)',
              transition: 'opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s',
            }}
          >
            <h2 className="text-3xl font-black text-foreground tracking-tight">
              Welcome back 👋
            </h2>
            <p className="text-sm text-muted-foreground mt-1.5">
              Login to access your dashboard
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            noValidate
            className="mt-8 space-y-5"
            style={{
              opacity: stage >= 2 ? 1 : 0,
              transform: stage >= 2 ? 'translateY(0)' : 'translateY(14px)',
              transition: 'opacity 0.6s ease 0.18s, transform 0.6s ease 0.18s',
              pointerEvents: submitting ? 'none' : 'auto',
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[13px] font-bold text-foreground">
                Email{' '}
                <span className="font-normal text-muted-foreground">[इमेल]</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                disabled={submitting}
                className="rounded-xl border-input bg-muted/50 text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-primary transition-colors"
                style={{ height: '50px' }}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[13px] font-bold text-foreground">
                  Password{' '}
                  <span className="font-normal text-muted-foreground">[पासवर्ड]</span>
                </Label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] font-bold text-primary hover:underline"
                  onClick={(e) => submitting && e.preventDefault()}
                >
                  Forgot Password? [पासवर्ड बिर्सनुभयो?]
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={submitting}
                  className="rounded-xl border-input bg-muted/50 text-foreground placeholder:text-muted-foreground pr-11 focus:bg-background focus:border-primary transition-colors"
                  style={{ height: '50px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                  disabled={submitting}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full font-black text-[15px] rounded-xl shadow-lg"
              style={{ height: '50px', marginTop: '4px' }}
            >
              {submitting
                ? <><span className="animate-spin mr-2">⏳</span>Logging in...</>
                : <><LogIn size={18} className="mr-2" />Login [लगइन]</>
              }
            </Button>

            <p className="text-center text-[13px] text-muted-foreground pt-1">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-black text-primary hover:underline"
                onClick={(e) => submitting && e.preventDefault()}
              >
                Sign up [दर्ता]
              </Link>
            </p>
          </form>

          {/* Footer */}
          <p
            className="mt-auto pt-10 text-center text-[11px] text-muted-foreground/50"
            style={{
              opacity: stage >= 2 ? 1 : 0,
              transition: 'opacity 0.6s ease 0.4s',
            }}
          >
            © {new Date().getFullYear()} Hamro Kishan. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
