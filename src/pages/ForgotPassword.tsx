import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, KeyRound, Lock, Eye, EyeOff, CheckCircle2, ArrowLeft } from 'lucide-react';
import logo from '@/assets/logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ForgotPassword = () => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Password validation
  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,24}$/;
  const isPasswordValid = passwordRegex.test(newPassword);
  const showPasswordError = newPassword.length > 0 && !isPasswordValid;

  // Animations State
  const [logoStage, setLogoStage] = useState<'hidden' | 'popping' | 'dropping' | 'wave' | 'settled'>('hidden');
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const [bgImage] = useState(() => Math.floor(Math.random() * 10) + 1);

  const { sendPasswordResetCode, verifyPasswordResetCode, updatePassword } = useAuth();
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

  // ── STEP 1: SEND CODE ─────────────────────────────────────────────────
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return setError('Please enter your registered email.');
    
    setSubmitting(true);
    setError('');
    
    const { error: sendError } = await sendPasswordResetCode(email);
    setSubmitting(false);
    
    if (sendError) setError(sendError);
    else setStep(2);
  };

  // ── STEP 2: VERIFY CODE ───────────────────────────────────────────────
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length < 8) return setError('Please enter the full 8-digit code.');
    
    setSubmitting(true);
    setError('');
    
    const { error: verifyError } = await verifyPasswordResetCode(email, code);
    setSubmitting(false);
    
    if (verifyError) setError('Invalid or expired code. Please try again.');
    else setStep(3);
  };

  // ── STEP 3: UPDATE PASSWORD ───────────────────────────────────────────
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) return setError('Please create a new password.');
    if (!isPasswordValid) return setError('Please ensure your password meets the security requirements.');
    
    setSubmitting(true);
    setError('');
    
    const { error: updateError } = await updatePassword(newPassword);
    setSubmitting(false);
    
    if (updateError) setError(updateError);
    else setStep(4);
  };

  // ── RENDER ────────────────────────────────────────────────────────────
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
        <img src={`/assets/others/${bgImage}.jpg`} alt="Background" className="w-full h-full object-cover animate-in fade-in duration-1000" />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-emerald-950/20 to-transparent p-16 flex flex-col justify-end">
          <h1 className="text-white text-5xl font-black mb-4 tracking-tighter leading-tight">
            Secure your <br /> account.
          </h1>
          <p className="text-emerald-50/70 text-lg font-medium max-w-md">
            Get back to growing. Reset your password quickly and securely to access your dashboard.
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
            className="w-20 h-20 rounded-[1.5rem] overflow-hidden shadow-2xl border-4 border-white/20 relative bg-white"
            style={{ 
              transform: logoStage === 'popping' ? 'scale(1.4)' : 'scale(1)',
              transition: 'transform 0.8s cubic-bezier(0.34, 1.5, 0.64, 1)'
            }}
          >
            {logoStage === 'wave' && (
               <div className="absolute inset-0 bg-emerald-500 pointer-events-none z-10" style={{ animation: 'greenRipple 1.2s ease-out forwards' }} />
            )}
            <img src={logo} className="w-full h-full object-cover relative z-20" />
          </div>
          <h2 className="text-white md:text-slate-900 font-black text-2xl mt-5 tracking-tight">Hamro Kishan</h2>
          <p className="text-white/60 md:text-emerald-600 text-[10px] font-black uppercase tracking-[0.2em]">हाम्रो किसान</p>
        </div>

        {/* ── THE FORM CARD ── */}
        <div 
          className="flex-1 mt-10 bg-white md:bg-transparent rounded-t-[3rem] md:rounded-none shadow-2xl md:shadow-none overflow-y-auto z-20"
          style={{
            transform: stage >= 1 ? 'translateY(0)' : 'translateY(110%)',
            transition: 'transform 1s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div className="max-w-[400px] mx-auto px-8 py-12 md:py-8 relative">
            <div className="md:hidden w-12 h-1 bg-slate-200 rounded-full mx-auto mb-10" />

            {/* BACK BUTTON */}
            {stage === 2 && step < 4 && (
               <Link to="/login" className="absolute top-12 md:top-8 left-0 md:-left-12 text-slate-400 hover:text-slate-600 transition-colors bg-white md:bg-transparent p-2 rounded-full md:p-0">
                 <ArrowLeft size={24} />
               </Link>
            )}

            {/* Dynamic Headers */}
            <div style={{ opacity: stage === 2 ? 1 : 0, transition: 'opacity 0.6s ease 0.05s' }}>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight text-center md:text-left">
                {step === 1 && "Reset Password"}
                {step === 2 && "Verify Code"}
                {step === 3 && "New Password"}
                {step === 4 && "Success!"}
              </h3>
              <p className="text-slate-500 font-bold text-sm mt-2 text-center md:text-left leading-relaxed">
                {step === 1 && "Enter your registered email to receive an 8-digit verification code."}
                {step === 2 && (
                  <>
                    We sent an 8-digit code to <span className="text-slate-900">{email}</span>.<br/>
                    <span className="text-emerald-600 font-black mt-1 block text-xs tracking-wide">⚠️ Check your spam folder!</span>
                  </>
                )}
                {step === 3 && "Create a secure new password to protect your account."}
                {step === 4 && "Your password has been securely reset. You can now access your dashboard."}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl animate-in slide-in-from-top-2">
                <p className="text-red-600 text-sm font-bold text-center">{error}</p>
              </div>
            )}

            {/* Forms Container */}
            <div className="mt-8" style={{ opacity: stage === 2 ? 1 : 0, transition: 'opacity 0.6s ease 0.12s' }}>
              
              {/* STEP 1: EMAIL */}
              {step === 1 && (
                <form onSubmit={handleSendCode} className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</Label>
                    <Input
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      disabled={submitting}
                      className="h-14 rounded-2xl bg-slate-50 border-none px-5 text-base focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                  <Button type="submit" disabled={submitting} className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg shadow-xl shadow-emerald-200 transition-all active:scale-95">
                    {submitting ? 'Sending...' : <><Mail size={20} className="mr-2" /> Send Code</>}
                  </Button>
                </form>
              )}

              {/* STEP 2: VERIFY */}
              {step === 2 && (
                <form onSubmit={handleVerifyCode} className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">8-Digit Code</Label>
                    <Input
                      type="text"
                      maxLength={8}
                      placeholder="• • • • • • • •"
                      value={code}
                      onChange={e => setCode(e.target.value.replace(/\D/g, ''))} // Force numbers only
                      disabled={submitting}
                      className="h-14 rounded-2xl bg-slate-50 border-none text-center tracking-[0.5em] text-xl font-black focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                  <Button type="submit" disabled={submitting} className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg shadow-xl shadow-emerald-200 transition-all active:scale-95">
                    {submitting ? 'Verifying...' : <><KeyRound size={20} className="mr-2" /> Verify Code</>}
                  </Button>
                </form>
              )}

              {/* STEP 3: NEW PASSWORD */}
              {step === 3 && (
                <form onSubmit={handleUpdatePassword} className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">New Password</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        disabled={submitting}
                        maxLength={24}
                        className={`h-14 rounded-2xl bg-slate-50 border-none px-5 pr-12 text-base transition-all ${
                          showPasswordError ? 'ring-2 ring-red-500/50 bg-red-50' : 
                          isPasswordValid ? 'ring-2 ring-emerald-500/50 bg-emerald-50' : 
                          'focus:bg-white focus:ring-2 focus:ring-emerald-500/20'
                        }`}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600">
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                    <p className={`text-[11px] font-bold mt-2 ml-1 transition-colors ${
                      showPasswordError ? 'text-red-500' : isPasswordValid ? 'text-emerald-600' : 'text-slate-400'
                    }`}>
                      {isPasswordValid ? '✅ Secure password' : '8-24 chars. Must contain 1 uppercase, 1 number, & 1 special char.'}
                    </p>
                  </div>
                  <Button type="submit" disabled={submitting} className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg shadow-xl shadow-emerald-200 transition-all active:scale-95">
                    {submitting ? 'Updating...' : <><Lock size={20} className="mr-2" /> Save Password</>}
                  </Button>
                </form>
              )}

              {/* STEP 4: SUCCESS */}
              {step === 4 && (
                <div className="text-center space-y-8 pt-4 animate-in fade-in zoom-in duration-500">
                  <div className="flex justify-center">
                    <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center">
                      <CheckCircle2 size={48} className="text-emerald-500" />
                    </div>
                  </div>
                  <Button onClick={() => navigate('/')} className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-lg transition-all active:scale-95">
                    Return to Login
                  </Button>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;