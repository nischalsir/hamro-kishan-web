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

  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,24}$/;
  const isPasswordValid = passwordRegex.test(newPassword);
  const showPasswordError = newPassword.length > 0 && !isPasswordValid;

  const [logoStage, setLogoStage] = useState<'hidden' | 'popping' | 'settled'>('hidden');
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const [bgImage] = useState(() => Math.floor(Math.random() * 10) + 1);

  const { sendPasswordResetCode, verifyPasswordResetCode, updatePassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const t0 = setTimeout(() => setLogoStage('popping'), 200);
    const t1 = setTimeout(() => setStage(1), 300);
    const t2 = setTimeout(() => setStage(2), 700);
    const t3 = setTimeout(() => setLogoStage('settled'), 400);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return setError('Please enter your registered email.');
    setSubmitting(true); setError('');
    const { error: sendError } = await sendPasswordResetCode(email);
    setSubmitting(false);
    if (sendError) setError(sendError);
    else setStep(2);
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length < 8) return setError('Please enter the 8-digit code.');
    setSubmitting(true); setError('');
    const { error: verifyError } = await verifyPasswordResetCode(email, code);
    setSubmitting(false);
    if (verifyError) setError('Invalid or expired code. Please try again.');
    else setStep(3);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) return setError('Please create a new password.');
    if (!isPasswordValid) { setError('Password must be 8-24 characters and include at least 1 uppercase letter, 1 number, and 1 special character.'); return; }
    setSubmitting(true); setError('');
    const { error: updateError } = await updatePassword(newPassword);
    setSubmitting(false);
    if (updateError) setError(updateError);
    else setStep(4);
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
          alt="Background"
          className="w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to right, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 100%), linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.5) 100%)',
          }}
        />

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

      {/* ── RIGHT: FORM PANEL ── */}
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
              <img src={logo} alt="Hamro Kisan" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-foreground font-black text-xl tracking-tight leading-tight">
                Hamro Kisan
              </h1>
              <p className="text-muted-foreground text-xs font-medium tracking-wide mt-0.5">
                हाम्रो किसान — Our Farmer
              </p>
            </div>
          </div>

          {/* Back Button */}
          {stage >= 2 && step < 4 && (
            <Link
              to="/login"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm font-semibold mb-6 w-fit"
            >
              <ArrowLeft size={17} /> Back to Login
            </Link>
          )}

          {/* Heading */}
          <div
            style={{
              opacity: stage >= 2 ? 1 : 0,
              transform: stage >= 2 ? 'translateY(0)' : 'translateY(10px)',
              transition: 'opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s',
            }}
          >
            <h2 className="text-3xl font-black text-foreground tracking-tight">
              {step === 1 && 'Reset Password'}
              {step === 2 && 'Verify Code'}
              {step === 3 && 'New Password'}
              {step === 4 && 'Success! 🎉'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
              {step === 1 && 'Enter your email to receive an 8-digit code'}
              {step === 2 && (
                <>
                  We sent an 8-digit code to{' '}
                  <span className="font-bold text-foreground">{email}</span>.<br />
                  <span className="text-primary/80 font-bold text-xs">⚠️ Don't forget to check your spam/junk folder!</span>
                </>
              )}
              {step === 3 && 'Create a secure new password'}
              {step === 4 && 'Your password has been securely reset.'}
            </p>
          </div>

          {/* Form Area */}
          <div
            className="mt-8"
            style={{
              opacity: stage >= 2 ? 1 : 0,
              transform: stage >= 2 ? 'translateY(0)' : 'translateY(14px)',
              transition: 'opacity 0.6s ease 0.18s, transform 0.6s ease 0.18s',
              pointerEvents: submitting ? 'none' : 'auto',
            }}
          >
            {error && (
              <div role="alert" className="p-3 mb-5 bg-destructive/10 border border-destructive/20 rounded-xl">
                <p className="text-destructive text-sm font-semibold text-center">{error}</p>
              </div>
            )}

            {/* STEP 1: EMAIL */}
            {step === 1 && (
              <form onSubmit={handleSendCode} className="space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-bold text-foreground">Email</Label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={submitting}
                    className="rounded-xl border-input bg-muted/50 text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-primary transition-colors"
                    style={{ height: '50px' }}
                  />
                </div>
                <Button type="submit" disabled={submitting} className="w-full font-black text-[15px] rounded-xl shadow-lg" style={{ height: '50px' }}>
                  {submitting ? 'Sending...' : <><Mail size={18} className="mr-2" />Send Code</>}
                </Button>
              </form>
            )}

            {/* STEP 2: CODE */}
            {step === 2 && (
              <form onSubmit={handleVerifyCode} className="space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-bold text-foreground">8-Digit Code</Label>
                  <Input
                    type="text"
                    maxLength={8}
                    placeholder="* * * * * * * *"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    disabled={submitting}
                    className="rounded-xl border-input bg-muted/50 text-foreground text-center tracking-widest text-lg font-bold focus:bg-background focus:border-primary transition-colors"
                    style={{ height: '50px' }}
                  />
                </div>
                <Button type="submit" disabled={submitting} className="w-full font-black text-[15px] rounded-xl shadow-lg" style={{ height: '50px' }}>
                  {submitting ? 'Verifying...' : <><KeyRound size={18} className="mr-2" />Verify Code</>}
                </Button>
              </form>
            )}

            {/* STEP 3: NEW PASSWORD */}
            {step === 3 && (
              <form onSubmit={handleUpdatePassword} className="space-y-5">
                <div>
                  <Label className={`text-[13px] font-bold ${showPasswordError ? 'text-destructive' : 'text-foreground'}`}>
                    New Password
                  </Label>
                  <div className="relative mt-1.5">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="e.g. Kishan@123"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      disabled={submitting}
                      maxLength={24}
                      className={`rounded-xl pr-11 transition-colors ${
                        showPasswordError
                          ? 'border-2 border-destructive bg-destructive/5 text-destructive focus:border-destructive placeholder:text-destructive/50'
                          : isPasswordValid
                            ? 'border-2 border-emerald-500 bg-emerald-500/5 text-foreground focus:border-emerald-500'
                            : 'border-input bg-muted/50 text-foreground placeholder:text-muted-foreground focus:border-primary'
                      }`}
                      style={{ height: '50px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors ${
                        showPasswordError ? 'text-destructive hover:text-destructive/70' : 'text-muted-foreground hover:text-primary'
                      }`}
                    >
                      {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                    </button>
                  </div>
                  <p className={`text-[10px] mt-1.5 leading-tight transition-colors ${
                    showPasswordError
                      ? 'text-destructive font-bold'
                      : isPasswordValid
                        ? 'text-emerald-500 font-bold'
                        : 'text-muted-foreground'
                  }`}>
                    {isPasswordValid
                      ? '✅ Strong password!'
                      : '8-24 chars. Must contain 1 uppercase letter, 1 number, & 1 special character.'}
                  </p>
                </div>
                <Button type="submit" disabled={submitting} className="w-full font-black text-[15px] rounded-xl shadow-lg" style={{ height: '50px' }}>
                  {submitting ? 'Updating...' : <><Lock size={18} className="mr-2" />Save New Password</>}
                </Button>
              </form>
            )}

            {/* STEP 4: SUCCESS */}
            {step === 4 && (
              <div className="text-center space-y-6 pt-2">
                <div className="flex justify-center">
                  <CheckCircle2 size={72} className="text-green-500 animate-in zoom-in duration-500" />
                </div>
                <Button onClick={() => navigate('/')} className="w-full font-black text-[15px] rounded-xl shadow-lg" style={{ height: '50px' }}>
                  Go to Dashboard
                </Button>
              </div>
            )}
          </div>

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

export default ForgotPassword;
