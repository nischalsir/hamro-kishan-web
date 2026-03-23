import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import logo from '@/assets/logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { nepalLocations, farmTypeOptions as farmTypes } from '@/data/mock';

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

const provincesList = Object.keys(nepalLocations);

const roles: { value: AppRole; label: string; emoji: string }[] = [
  { value: 'farmer', label: 'Farmer [किसान]',   emoji: '🧑‍🌾' },
  { value: 'buyer',  label: 'Buyer [खरिदकर्ता]', emoji: '🛒'  },
  { value: 'expert', label: 'Expert [विशेषज्ञ]', emoji: '👨‍🔬' },
];

type EntityType = 'individual' | 'farm';

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

const sanitizePhone = (phone: string): string =>
  phone.replace(/\D/g, '').replace(/^0+/, '').slice(0, 10);

// ---------------------------------------------------------------------------
// LocationFields - Stable component outside Register
// ---------------------------------------------------------------------------

interface LocationFieldsProps {
  province: string;
  district: string;
  municipality: string;
  availableDistricts: string[];
  availableMunicipalities: string[];
  onProvinceChange: (v: string) => void;
  onDistrictChange: (v: string) => void;
  onMunicipalityChange: (v: string) => void;
}

const LocationFields: React.FC<LocationFieldsProps> = ({
  province,
  district,
  municipality,
  availableDistricts,
  availableMunicipalities,
  onProvinceChange,
  onDistrictChange,
  onMunicipalityChange,
}) => (
  <>
    <div>
      <Label className="text-xs font-semibold text-foreground">Province [प्रदेश] *</Label>
      <Select value={province} onValueChange={onProvinceChange}>
        <SelectTrigger className="mt-1 h-12 rounded-xl border-input bg-muted/50 text-foreground focus:bg-background focus:border-primary transition-colors">
          <SelectValue placeholder="Select your province" />
        </SelectTrigger>
        <SelectContent>
          {provincesList.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>

    <div className="grid grid-cols-2 gap-3">
      <div>
        <Label className="text-xs font-semibold text-foreground">District [जिल्ला] *</Label>
        <Select value={district} onValueChange={onDistrictChange} disabled={!province}>
          <SelectTrigger className="mt-1 h-12 rounded-xl border-input bg-muted/50 text-foreground focus:bg-background focus:border-primary transition-colors">
            <SelectValue placeholder={province ? 'Select district' : 'Province first'} />
          </SelectTrigger>
          <SelectContent>
            {availableDistricts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs font-semibold text-foreground">Local Level *</Label>
        <Select value={municipality} onValueChange={onMunicipalityChange} disabled={!district}>
          <SelectTrigger className="mt-1 h-12 rounded-xl border-input bg-muted/50 text-foreground focus:bg-background focus:border-primary transition-colors">
            <SelectValue placeholder={district ? 'Select' : 'District first'} />
          </SelectTrigger>
          <SelectContent>
            {availableMunicipalities.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  </>
);

// ---------------------------------------------------------------------------
// COMPONENT
// ---------------------------------------------------------------------------

const Register: React.FC = () => {
  const { register, isAuthenticated, role, loading, initializing } = useAuth();
  const navigate = useNavigate();

  // ── Animation stages ─────────────────────────────────────────────────────
  const [logoStage, setLogoStage] = useState<'hidden' | 'popping' | 'dropping' | 'wave' | 'settled'>('hidden');
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const [isDesktop, setIsDesktop] = useState(false);

  const [bgImage] = useState(() => Math.floor(Math.random() * 10) + 1);

  // ── Core fields ──────────────────────────────────────────────────────────
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,24}$/;
  const isPasswordValid = passwordRegex.test(password);
  const showPasswordError = password.length > 0 && !isPasswordValid;
  const [showPassword, setShowPassword] = useState(false);
  const [name,         setName]         = useState('');
  const [phone,        setPhone]        = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole>('farmer');

  // ── UI state ─────────────────────────────────────────────────────────────
  const [error,          setError]          = useState('');
  const [submitting,     setSubmitting]     = useState(false);
  const [acceptedTerms,  setAcceptedTerms]  = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // ── Location fields ──────────────────────────────────────────────────────
  const [province,     setProvince]     = useState('');
  const [district,     setDistrict]     = useState('');
  const [municipality, setMunicipality] = useState('');

  // ── Farmer fields ────────────────────────────────────────────────────────
  const [entityType,       setEntityType]       = useState<EntityType>('individual');
  const [farmBusinessName, setFarmBusinessName] = useState('');
  const [wardNumber,       setWardNumber]       = useState('');
  const [toleName,         setToleName]         = useState('');
  const [farmType,         setFarmType]         = useState('');

  // ── Buyer fields ─────────────────────────────────────────────────────────
  const [buyerBusinessName, setBuyerBusinessName] = useState('');

  // ── Expert fields ────────────────────────────────────────────────────────
  const [specialization,  setSpecialization]  = useState('');
  const [experienceYears, setExperienceYears] = useState('');

  // ── Derived location lists ───────────────────────────────────────────────
  const availableDistricts      = province ? Object.keys(nepalLocations[province] ?? {}) : [];
  const availableMunicipalities = province && district ? (nepalLocations[province][district] ?? []) : [];

  // ── Detect screen size ────────────────────────────────────────────────────
  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 768); // md breakpoint
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // ── Animation sequence ───────────────────────────────────────────────────
  useEffect(() => {
    const t0 = setTimeout(() => setLogoStage('popping'),  200);
    const t1 = setTimeout(() => setLogoStage('dropping'), 1000);
    const t4 = setTimeout(() => setStage(1),              1050);
    const t5 = setTimeout(() => setStage(2),              1600);
    const t2 = setTimeout(() => setLogoStage('wave'),     2000);
    const t3 = setTimeout(() => setLogoStage('settled'),  3200);

    return () => { 
      clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); 
      clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); 
    };
  }, []);

  // ── Auto-navigate after registration ─────────────────────────────────────
  useEffect(() => {
    if (initializing || loading) return;
    if (isAuthenticated && role) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, role, loading, initializing, navigate]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleRoleChange = (val: AppRole) => {
    setSelectedRole(val);
    setProvince(''); setDistrict(''); setMunicipality('');
  };

  const handleProvinceChange = (val: string) => {
    setProvince(val); setDistrict(''); setMunicipality('');
  };

  const handleDistrictChange = (val: string) => {
    setDistrict(val); setMunicipality('');
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validateAndBuildPayload = (): object | null => {
    setError('');

    if (!acceptedTerms) {
      setError('You must accept the Terms & Privacy Policy to register.');
      return null;
    }
    if (!name.trim()) { setError('Please enter your full name.'); return null; }
    if (!email.trim()) { setError('Please enter your email address.'); return null; }
    if (!password) { setError('Please create a password.'); return null; }
    if (!isPasswordValid) { 
      setError('Password must be 8-24 characters and include at least 1 uppercase letter, 1 number, and 1 special character.'); 
      return null; 
    }

    const cleanPhone = sanitizePhone(phone);
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit phone number (e.g. 9812345678).');
      return null;
    }

    if (selectedRole === 'farmer') {
      if (!province || !district || !municipality || !wardNumber || !farmType) {
        setError('Please fill in all required farmer location details.');
        return null;
      }
      if (entityType === 'farm' && !farmBusinessName.trim()) {
        setError('Please enter your farm / business name.');
        return null;
      }
      return {
        entityType,
        farmBusinessName: entityType === 'farm' ? farmBusinessName : undefined,
        province, district, municipality,
        wardNumber,
        toleName: toleName || undefined,
        farmType,
      };
    }

    if (selectedRole === 'buyer') {
      if (!buyerBusinessName.trim()) {
        setError('Please enter your business / shop name.');
        return null;
      }
      if (!province || !district || !municipality) {
        setError('Please fill in all required buyer location details.');
        return null;
      }
      return { buyerBusinessName, province, district, municipality };
    }

    if (selectedRole === 'expert') {
      if (!specialization.trim()) {
        setError('Please enter your area of specialization.');
        return null;
      }
      const years = parseInt(experienceYears, 10);
      if (!experienceYears || isNaN(years) || years < 0) {
        setError('Please enter a valid number of years of experience.');
        return null;
      }
      return { specialization, experienceYears: years };
    }

    return null;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const roleDetails = validateAndBuildPayload();
    if (!roleDetails) return;

    setSubmitting(true);
    setError('');

    try {
      const formattedPhone = `+977${sanitizePhone(phone)}`;
      const { error: regError } = await register(
        email.trim(), 
        password, 
        name.trim(), 
        formattedPhone, 
        selectedRole, 
        roleDetails as any,
      );
      
      if (regError) { 
        setError(regError); 
        setSubmitting(false);
        return; 
      }
      
      // Let useEffect handle navigation
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
      setSubmitting(false);
    }
  };

  // ── Desktop logo style ────────────────────────────────────────────────────
  const desktopLogoStyle = (): React.CSSProperties => {
    switch (logoStage) {
      case 'hidden':
        return {
          transform: 'scale(0)',
          opacity: 0,
        };
      case 'popping':
        return {
          transform: 'scale(1.2)',
          opacity: 1,
          transition: 'transform 0.7s cubic-bezier(0.34, 1.5, 0.64, 1), opacity 0.4s ease',
        };
      case 'dropping':
      case 'wave':
      case 'settled':
        return {
          transform: 'scale(1)',
          opacity: 1,
          transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        };
      default:
        return {};
    }
  };

  // ── Mobile logo style (original) ──────────────────────────────────────────
  const mobileLogoStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = { position: 'absolute', left: '50%' };

    switch (logoStage) {
      case 'hidden':
        return {
          ...base,
          top: '50%',
          transform: 'translate(-50%, -50%) scale(0)',
          opacity: 0,
          transition: 'none',
        };
      case 'popping':
        return {
          ...base,
          top: '50%',
          transform: 'translate(-50%, -50%) scale(1.4)', 
          opacity: 1,
          transition: 'transform 0.7s cubic-bezier(0.34, 1.5, 0.64, 1), opacity 0.4s ease',
        };
      case 'dropping':
      case 'wave':
      case 'settled':
        return {
          ...base,
          top: '56px',
          transform: 'translate(-50%, 0) scale(1)', 
          opacity: 1,
          transition: 'top 0.9s cubic-bezier(0.16, 1, 0.3, 1), transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
        };
      default:
        return base;
    }
  };

  const taglineStyle: React.CSSProperties = {
    opacity: (logoStage === 'wave' || logoStage === 'settled') ? 1 : 0,
    transform: (logoStage === 'wave' || logoStage === 'settled') ? 'translateY(0)' : 'translateY(6px)',
    transition: 'opacity 0.6s ease, transform 0.6s ease',
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black">

      <style>{`
        @keyframes greenRipple {
          0% { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(3.5); opacity: 0; }
        }
        
        /* Custom scrollbar for the form */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>

      {/* ── BACKGROUND IMAGE (responsive) ── */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          transition: 'transform 1.0s cubic-bezier(0.33, 1, 0.68, 1)',
          transform: !isDesktop && stage >= 1 ? 'translateY(-4%)' : 'translateY(0)',
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
            background: isDesktop 
              ? 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.85) 100%)'
              : 'linear-gradient(to bottom, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.18) 52%, rgba(0,0,0,0) 100%)',
          }}
        />
      </div>

      {/* ── DESKTOP LAYOUT ── */}
      {isDesktop ? (
        <div className="relative z-10 min-h-screen flex items-center justify-center p-8">
          <div 
            className="w-full max-w-5xl"
            style={{
              opacity: stage === 2 ? 1 : 0,
              transform: stage === 2 ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.8s ease, transform 0.8s ease',
            }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              {/* Left Side - Branding */}
              <div className="text-white space-y-8">
                <div className="flex items-center gap-4">
                  <div 
                    className="relative w-24 h-24"
                    style={desktopLogoStyle()}
                  >
                    {logoStage === 'wave' && (
                      <div
                        className="absolute inset-0 rounded-2xl bg-green-500 pointer-events-none"
                        style={{ animation: 'greenRipple 1.2s ease-out forwards' }}
                      />
                    )}
                    <div
                      className="absolute inset-0 rounded-2xl overflow-hidden"
                      style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.45), 0 0 0 2px rgba(255,255,255,0.2)' }}
                    >
                      <img src={logo} alt="Hamro Kishan" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <div style={taglineStyle}>
                    <h1 className="text-5xl font-black tracking-wide" style={{ textShadow: '0 2px 24px rgba(0,0,0,0.8)' }}>
                      Hamro Kishan
                    </h1>
                    <p className="text-white/80 text-lg font-medium tracking-wider" style={{ textShadow: '0 1px 12px rgba(0,0,0,0.6)' }}>
                      हाम्रो किसान — Our Farmer
                    </p>
                  </div>
                </div>

                <div className="space-y-4" style={taglineStyle}>
                  <h2 className="text-3xl font-bold">Connect. Trade. Grow.</h2>
                  <p className="text-lg text-white/90 leading-relaxed">
                    Join thousands of farmers, buyers, and agricultural experts building Nepal's digital farming community.
                  </p>
                  <div className="flex gap-4 pt-4">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">🧑‍🌾</span>
                      <span className="text-sm">Farmers</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">🛒</span>
                      <span className="text-sm">Buyers</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">👨‍🔬</span>
                      <span className="text-sm">Experts</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side - Registration Form */}
              <div className="bg-card/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
                <div>
                  <h2 className="text-2xl font-black text-foreground tracking-tight">
                    Join Hamro Kishan 🌾
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create your account [खाता बनाउनुहोस्]
                  </p>
                </div>

                {/* Form content - reused from mobile */}
                <form
                  onSubmit={handleSubmit}
                  noValidate
                  className="mt-6 space-y-4"
                  style={{ pointerEvents: submitting ? 'none' : 'auto' }}
                >
                  {/* ── ROLE SELECTOR ── */}
                  <div>
                    <Label className="text-[13px] font-bold text-foreground">
                      I am a [म हुँ]{' '}
                      <span className="font-normal text-muted-foreground">*</span>
                    </Label>
                    <Select value={selectedRole} onValueChange={val => handleRoleChange(val as AppRole)}>
                      <SelectTrigger className="mt-1 h-12 rounded-xl border-input bg-muted/50 text-foreground focus:bg-background focus:border-primary transition-colors">
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map(r => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.emoji} {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* ── CORE FIELDS ── */}
                  <div className="space-y-3.5">
                    <div>
                      <Label htmlFor="fullName" className="text-[13px] font-bold text-foreground">
                        Full Name [पूरा नाम]{' '}
                        <span className="font-normal text-muted-foreground">*</span>
                      </Label>
                      <Input
                        id="fullName"
                        placeholder="e.g. Ram Bahadur Thapa"
                        autoComplete="name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="mt-1 h-12 rounded-xl border-input bg-muted/50 text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-primary transition-colors"
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <Label htmlFor="email" className="text-[13px] font-bold text-foreground">
                        Email [इमेल]{' '}
                        <span className="font-normal text-muted-foreground">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="mt-1 h-12 rounded-xl border-input bg-muted/50 text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-primary transition-colors"
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <Label htmlFor="password" className={`text-[13px] font-bold ${showPasswordError ? 'text-destructive' : 'text-foreground'}`}>
                        Password [पासवर्ड]{' '}
                        <span className="font-normal text-muted-foreground">*</span>
                      </Label>
                      <div className="relative mt-1">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="e.g. Kishan@123"
                          autoComplete="new-password"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          maxLength={24}
                          className={`h-12 rounded-xl pr-11 focus:bg-background transition-colors ${
                            showPasswordError
                              ? 'border-2 border-destructive bg-destructive/5 text-destructive focus:border-destructive placeholder:text-destructive/50'
                              : isPasswordValid
                                ? 'border-2 border-emerald-500 bg-emerald-500/5 text-foreground focus:border-emerald-500'
                                : 'border-input bg-muted/50 text-foreground placeholder:text-muted-foreground focus:border-primary'
                          }`}
                          disabled={submitting}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(v => !v)}
                          className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors ${
                            showPasswordError ? 'text-destructive hover:text-destructive/70' : 'text-muted-foreground hover:text-primary'
                          }`}
                          disabled={submitting}
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

                    <div>
                      <Label htmlFor="phone" className="text-[13px] font-bold text-foreground">
                        Phone Number [फोन नम्बर]{' '}
                        <span className="font-normal text-muted-foreground">*</span>
                      </Label>
                      <div className="relative mt-1">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">
                          +977
                        </span>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="98XXXXXXXX"
                          autoComplete="tel"
                          value={phone}
                          onChange={e => setPhone(sanitizePhone(e.target.value))}
                          className="h-12 rounded-xl border-input bg-muted/50 text-foreground placeholder:text-muted-foreground pl-[52px] tracking-wider focus:bg-background focus:border-primary transition-colors"
                          maxLength={10}
                          disabled={submitting}
                          inputMode="numeric"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ── ROLE-SPECIFIC DETAILS ── */}
                  {selectedRole === 'farmer' && (
                    <div className="space-y-3.5 pt-4 border-t border-border/50">
                      <p className="text-sm font-bold text-primary">Farmer Details [किसान विवरण]</p>

                      <div>
                        <Label className="text-[13px] font-bold text-foreground">Entity Type *</Label>
                        <Select value={entityType} onValueChange={v => setEntityType(v as EntityType)}>
                          <SelectTrigger className="mt-1 h-12 rounded-xl border-input bg-muted/50 text-foreground focus:bg-background focus:border-primary transition-colors">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="individual">👤 Individual</SelectItem>
                            <SelectItem value="farm">🏡 Farm / Business</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {entityType === 'farm' && (
                        <div>
                          <Label className="text-[13px] font-bold text-foreground">Farm / Business Name *</Label>
                          <Input
                            placeholder="e.g. Green Valley Farm"
                            value={farmBusinessName}
                            onChange={e => setFarmBusinessName(e.target.value)}
                            className="mt-1 h-12 rounded-xl border-input bg-muted/50 text-foreground focus:bg-background focus:border-primary transition-colors"
                            disabled={submitting}
                          />
                        </div>
                      )}

                      <LocationFields
                        province={province}
                        district={district}
                        municipality={municipality}
                        availableDistricts={availableDistricts}
                        availableMunicipalities={availableMunicipalities}
                        onProvinceChange={handleProvinceChange}
                        onDistrictChange={handleDistrictChange}
                        onMunicipalityChange={setMunicipality}
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-[13px] font-bold text-foreground">Ward No. *</Label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="e.g. 5"
                            value={wardNumber}
                            onChange={e => setWardNumber(e.target.value.replace(/\D/g, '').slice(0, 2))}
                            className="mt-1 h-12 rounded-xl border-input bg-muted/50 text-foreground focus:bg-background focus:border-primary transition-colors"
                            disabled={submitting}
                          />
                        </div>
                        <div>
                          <Label className="text-[13px] font-bold text-foreground">Tole</Label>
                          <Input
                            placeholder="e.g. Shantinagar"
                            value={toleName}
                            onChange={e => setToleName(e.target.value)}
                            className="mt-1 h-12 rounded-xl border-input bg-muted/50 text-foreground focus:bg-background focus:border-primary transition-colors"
                            disabled={submitting}
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-[13px] font-bold text-foreground">Farm Type *</Label>
                        <Select value={farmType} onValueChange={setFarmType}>
                          <SelectTrigger className="mt-1 h-12 rounded-xl border-input bg-muted/50 text-foreground focus:bg-background focus:border-primary transition-colors">
                            <SelectValue placeholder="Select your farm type" />
                          </SelectTrigger>
                          <SelectContent>
                            {farmTypes.map(ft => <SelectItem key={ft} value={ft}>{ft}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {selectedRole === 'buyer' && (
                    <div className="space-y-3.5 pt-4 border-t border-border/50">
                      <p className="text-sm font-bold text-primary">Buyer Details [खरिदकर्ता विवरण]</p>
                      <div>
                        <Label className="text-[13px] font-bold text-foreground">Business / Shop Name *</Label>
                        <Input
                          placeholder="e.g. Kathmandu Fresh Mart"
                          value={buyerBusinessName}
                          onChange={e => setBuyerBusinessName(e.target.value)}
                          className="mt-1 h-12 rounded-xl border-input bg-muted/50 text-foreground focus:bg-background focus:border-primary transition-colors"
                          disabled={submitting}
                        />
                      </div>
                      <LocationFields
                        province={province}
                        district={district}
                        municipality={municipality}
                        availableDistricts={availableDistricts}
                        availableMunicipalities={availableMunicipalities}
                        onProvinceChange={handleProvinceChange}
                        onDistrictChange={handleDistrictChange}
                        onMunicipalityChange={setMunicipality}
                      />
                    </div>
                  )}

                  {selectedRole === 'expert' && (
                    <div className="space-y-3.5 pt-4 border-t border-border/50">
                      <p className="text-sm font-bold text-primary">Expert Details [विशेषज्ञ विवरण]</p>
                      <div>
                        <Label className="text-[13px] font-bold text-foreground">Specialization *</Label>
                        <Input
                          placeholder="e.g. Soil Science, Plant Pathology"
                          value={specialization}
                          onChange={e => setSpecialization(e.target.value)}
                          className="mt-1 h-12 rounded-xl border-input bg-muted/50 text-foreground focus:bg-background focus:border-primary transition-colors"
                          disabled={submitting}
                        />
                      </div>
                      <div>
                        <Label className="text-[13px] font-bold text-foreground">Years of Experience *</Label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="e.g. 5"
                          value={experienceYears}
                          onChange={e => setExperienceYears(e.target.value.replace(/\D/g, '').slice(0, 2))}
                          className="mt-1 h-12 rounded-xl border-input bg-muted/50 text-foreground focus:bg-background focus:border-primary transition-colors"
                          disabled={submitting}
                        />
                      </div>
                    </div>
                  )}

                  {/* ── TERMS CHECKBOX ── */}
                  <div className="flex items-start space-x-3 bg-muted/40 p-3 rounded-xl border border-border/50">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={acceptedTerms}
                      onChange={e => setAcceptedTerms(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-border shrink-0 accent-primary"
                      disabled={submitting}
                    />
                    <Label htmlFor="terms" className="text-[11px] text-muted-foreground leading-snug font-medium cursor-pointer">
                      I agree to the{' '}
                      <button
                        type="button"
                        onClick={() => setShowTermsModal(true)}
                        className="text-primary font-bold hover:underline"
                        disabled={submitting}
                      >
                        Terms & Privacy Policy
                      </button>
                      , including making my contact details visible to other users.
                    </Label>
                  </div>

                  {/* ── ERROR MESSAGE ── */}
                  {error && (
                    <div role="alert" className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
                      <p className="text-destructive text-sm font-semibold text-center">{error}</p>
                    </div>
                  )}

                  {/* ── SUBMIT BUTTON ── */}
                  <Button
                    type="submit"
                    className="w-full font-black text-[15px] rounded-xl shadow-lg"
                    style={{ height: '50px', marginTop: '8px' }}
                    disabled={submitting}
                  >
                    {submitting
                      ? <><span className="animate-spin mr-2">⏳</span>Creating Account...</>
                      : <><UserPlus size={18} className="mr-2" />Register [दर्ता गर्नुहोस्]</>
                    }
                  </Button>

                  <p className="text-center text-[13px] text-muted-foreground pt-1">
                    Already have an account?{' '}
                    <Link 
                      to="/login" 
                      className="font-black text-primary hover:underline"
                      onClick={(e) => submitting && e.preventDefault()}
                    >
                      Login [लगइन]
                    </Link>
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── MOBILE LAYOUT (Original) ── */
        <>
          {/* ── LOGO ── */}
          <div style={mobileLogoStyle()} className="z-10 w-20 h-20">
            
            {logoStage === 'wave' && (
              <div
                className="absolute inset-0 rounded-[1.35rem] bg-green-500 pointer-events-none"
                style={{ animation: 'greenRipple 1.2s ease-out forwards' }}
              />
            )}

            <div
              className="absolute inset-0 rounded-[1.35rem] overflow-hidden"
              style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.45), 0 0 0 2px rgba(255,255,255,0.2)' }}
            >
              <img src={logo} alt="Hamro Kishan" className="w-full h-full object-cover" />
            </div>
          </div>

          {/* ── APP NAME + TAGLINE ── */}
          <div
            className="absolute inset-x-0 z-10 flex flex-col items-center"
            style={{ top: '148px', ...taglineStyle }}
          >
            <h1
              className="text-white font-black text-[1.6rem] tracking-wide"
              style={{ textShadow: '0 2px 16px rgba(0,0,0,0.6)' }}
            >
              Hamro Kishan
            </h1>
            <p
              className="text-white/75 text-[13px] font-medium mt-1 tracking-wider"
              style={{ textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}
            >
              हाम्रो किसान — Our Farmer
            </p>
          </div>

          {/* ── CARD ── */}
          <div
            className="absolute inset-x-0 bottom-0 z-20"
            style={{
              transform: stage >= 1 ? 'translateY(0)' : 'translateY(110%)',
              transition: 'transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div
              className="bg-card rounded-t-[2.25rem] px-6 pt-6 pb-8 shadow-2xl overflow-y-auto custom-scrollbar"
              style={{ maxHeight: '75vh' }}
            >
              <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5" />

              {/* ── HEADER ── */}
              <div
                style={{
                  opacity: stage === 2 ? 1 : 0,
                  transform: stage === 2 ? 'translateY(0)' : 'translateY(10px)',
                  transition: 'opacity 0.6s ease 0.05s, transform 0.6s ease 0.05s',
                }}
              >
                <h2 className="text-[1.35rem] font-black text-foreground tracking-tight">
                  Join Hamro Kishan 🌾
                </h2>
                <p className="text-[13px] text-muted-foreground mt-0.5">
                  Create your account [खाता बनाउनुहोस्]
                </p>
              </div>

              {/* ── FORM - Same as desktop ── */}
              <form
                onSubmit={handleSubmit}
                noValidate
                className="mt-5 space-y-4"
                style={{
                  opacity: stage === 2 ? 1 : 0,
                  transform: stage === 2 ? 'translateY(0)' : 'translateY(14px)',
                  transition: 'opacity 0.6s ease 0.12s, transform 0.6s ease 0.12s',
                  pointerEvents: submitting ? 'none' : 'auto',
                }}
              >
                {/* Rest of the form - same content as desktop version above */}
                {/* I'll include the complete form here for mobile too */}
                
                {/* ── ROLE SELECTOR ── */}
                <div>
                  <Label className="text-[13px] font-bold text-foreground">
                    I am a [म हुँ]{' '}
                    <span className="font-normal text-muted-foreground">*</span>
                  </Label>
                  <Select value={selectedRole} onValueChange={val => handleRoleChange(val as AppRole)}>
                    <SelectTrigger className="mt-1 h-12 rounded-xl border-input bg-muted/50 text-foreground focus:bg-background focus:border-primary transition-colors">
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map(r => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.emoji} {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* ── CORE FIELDS ── */}
                <div className="space-y-3.5">
                  <div>
                    <Label htmlFor="fullName-mobile" className="text-[13px] font-bold text-foreground">
                      Full Name [पूरा नाम]{' '}
                      <span className="font-normal text-muted-foreground">*</span>
                    </Label>
                    <Input
                      id="fullName-mobile"
                      placeholder="e.g. Ram Bahadur Thapa"
                      autoComplete="name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="mt-1 h-12 rounded-xl border-input bg-muted/50 text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-primary transition-colors"
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <Label htmlFor="email-mobile" className="text-[13px] font-bold text-foreground">
                      Email [इमेल]{' '}
                      <span className="font-normal text-muted-foreground">*</span>
                    </Label>
                    <Input
                      id="email-mobile"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="mt-1 h-12 rounded-xl border-input bg-muted/50 text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-primary transition-colors"
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <Label htmlFor="password-mobile" className={`text-[13px] font-bold ${showPasswordError ? 'text-destructive' : 'text-foreground'}`}>
                      Password [पासवर्ड]{' '}
                      <span className="font-normal text-muted-foreground">*</span>
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        id="password-mobile"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="e.g. Kishan@123"
                        autoComplete="new-password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        maxLength={24}
                        className={`h-12 rounded-xl pr-11 focus:bg-background transition-colors ${
                          showPasswordError
                            ? 'border-2 border-destructive bg-destructive/5 text-destructive focus:border-destructive placeholder:text-destructive/50'
                            : isPasswordValid
                              ? 'border-2 border-emerald-500 bg-emerald-500/5 text-foreground focus:border-emerald-500'
                              : 'border-input bg-muted/50 text-foreground placeholder:text-muted-foreground focus:border-primary'
                        }`}
                        disabled={submitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors ${
                          showPasswordError ? 'text-destructive hover:text-destructive/70' : 'text-muted-foreground hover:text-primary'
                        }`}
                        disabled={submitting}
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

                  <div>
                    <Label htmlFor="phone-mobile" className="text-[13px] font-bold text-foreground">
                      Phone Number [फोन नम्बर]{' '}
                      <span className="font-normal text-muted-foreground">*</span>
                    </Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">
                        +977
                      </span>
                      <Input
                        id="phone-mobile"
                        type="tel"
                        placeholder="98XXXXXXXX"
                        autoComplete="tel"
                        value={phone}
                        onChange={e => setPhone(sanitizePhone(e.target.value))}
                        className="h-12 rounded-xl border-input bg-muted/50 text-foreground placeholder:text-muted-foreground pl-[52px] tracking-wider focus:bg-background focus:border-primary transition-colors"
                        maxLength={10}
                        disabled={submitting}
                        inputMode="numeric"
                      />
                    </div>
                  </div>
                </div>

                {/* ── ROLE-SPECIFIC DETAILS (same as desktop) ── */}
                {selectedRole === 'farmer' && (
                  <div className="space-y-3.5 pt-4 border-t border-border/50">
                    <p className="text-sm font-bold text-primary">Farmer Details [किसान विवरण]</p>

                    <div>
                      <Label className="text-[13px] font-bold text-foreground">Entity Type *</Label>
                      <Select value={entityType} onValueChange={v => setEntityType(v as EntityType)}>
                        <SelectTrigger className="mt-1 h-12 rounded-xl border-input bg-muted/50 text-foreground focus:bg-background focus:border-primary transition-colors">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="individual">👤 Individual</SelectItem>
                          <SelectItem value="farm">🏡 Farm / Business</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {entityType === 'farm' && (
                      <div>
                        <Label className="text-[13px] font-bold text-foreground">Farm / Business Name *</Label>
                        <Input
                          placeholder="e.g. Green Valley Farm"
                          value={farmBusinessName}
                          onChange={e => setFarmBusinessName(e.target.value)}
                          className="mt-1 h-12 rounded-xl border-input bg-muted/50 text-foreground focus:bg-background focus:border-primary transition-colors"
                          disabled={submitting}
                        />
                      </div>
                    )}

                    <LocationFields
                      province={province}
                      district={district}
                      municipality={municipality}
                      availableDistricts={availableDistricts}
                      availableMunicipalities={availableMunicipalities}
                      onProvinceChange={handleProvinceChange}
                      onDistrictChange={handleDistrictChange}
                      onMunicipalityChange={setMunicipality}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[13px] font-bold text-foreground">Ward No. *</Label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="e.g. 5"
                          value={wardNumber}
                          onChange={e => setWardNumber(e.target.value.replace(/\D/g, '').slice(0, 2))}
                          className="mt-1 h-12 rounded-xl border-input bg-muted/50 text-foreground focus:bg-background focus:border-primary transition-colors"
                          disabled={submitting}
                        />
                      </div>
                      <div>
                        <Label className="text-[13px] font-bold text-foreground">Tole</Label>
                        <Input
                          placeholder="e.g. Shantinagar"
                          value={toleName}
                          onChange={e => setToleName(e.target.value)}
                          className="mt-1 h-12 rounded-xl border-input bg-muted/50 text-foreground focus:bg-background focus:border-primary transition-colors"
                          disabled={submitting}
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-[13px] font-bold text-foreground">Farm Type *</Label>
                      <Select value={farmType} onValueChange={setFarmType}>
                        <SelectTrigger className="mt-1 h-12 rounded-xl border-input bg-muted/50 text-foreground focus:bg-background focus:border-primary transition-colors">
                          <SelectValue placeholder="Select your farm type" />
                        </SelectTrigger>
                        <SelectContent>
                          {farmTypes.map(ft => <SelectItem key={ft} value={ft}>{ft}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {selectedRole === 'buyer' && (
                  <div className="space-y-3.5 pt-4 border-t border-border/50">
                    <p className="text-sm font-bold text-primary">Buyer Details [खरिदकर्ता विवरण]</p>
                    <div>
                      <Label className="text-[13px] font-bold text-foreground">Business / Shop Name *</Label>
                      <Input
                        placeholder="e.g. Kathmandu Fresh Mart"
                        value={buyerBusinessName}
                        onChange={e => setBuyerBusinessName(e.target.value)}
                        className="mt-1 h-12 rounded-xl border-input bg-muted/50 text-foreground focus:bg-background focus:border-primary transition-colors"
                        disabled={submitting}
                      />
                    </div>
                    <LocationFields
                      province={province}
                      district={district}
                      municipality={municipality}
                      availableDistricts={availableDistricts}
                      availableMunicipalities={availableMunicipalities}
                      onProvinceChange={handleProvinceChange}
                      onDistrictChange={handleDistrictChange}
                      onMunicipalityChange={setMunicipality}
                    />
                  </div>
                )}

                {selectedRole === 'expert' && (
                  <div className="space-y-3.5 pt-4 border-t border-border/50">
                    <p className="text-sm font-bold text-primary">Expert Details [विशेषज्ञ विवरण]</p>
                    <div>
                      <Label className="text-[13px] font-bold text-foreground">Specialization *</Label>
                      <Input
                        placeholder="e.g. Soil Science, Plant Pathology"
                        value={specialization}
                        onChange={e => setSpecialization(e.target.value)}
                        className="mt-1 h-12 rounded-xl border-input bg-muted/50 text-foreground focus:bg-background focus:border-primary transition-colors"
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <Label className="text-[13px] font-bold text-foreground">Years of Experience *</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="e.g. 5"
                        value={experienceYears}
                        onChange={e => setExperienceYears(e.target.value.replace(/\D/g, '').slice(0, 2))}
                        className="mt-1 h-12 rounded-xl border-input bg-muted/50 text-foreground focus:bg-background focus:border-primary transition-colors"
                        disabled={submitting}
                      />
                    </div>
                  </div>
                )}

                {/* ── TERMS CHECKBOX ── */}
                <div className="flex items-start space-x-3 bg-muted/40 p-3 rounded-xl border border-border/50">
                  <input
                    type="checkbox"
                    id="terms-mobile"
                    checked={acceptedTerms}
                    onChange={e => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-border shrink-0 accent-primary"
                    disabled={submitting}
                  />
                  <Label htmlFor="terms-mobile" className="text-[11px] text-muted-foreground leading-snug font-medium cursor-pointer">
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-primary font-bold hover:underline"
                      disabled={submitting}
                    >
                      Terms & Privacy Policy
                    </button>
                    , including making my contact details visible to other users.
                  </Label>
                </div>

                {/* ── ERROR MESSAGE ── */}
                {error && (
                  <div role="alert" className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
                    <p className="text-destructive text-sm font-semibold text-center">{error}</p>
                  </div>
                )}

                {/* ── SUBMIT BUTTON ── */}
                <Button
                  type="submit"
                  className="w-full font-black text-[15px] rounded-xl shadow-lg"
                  style={{ height: '50px', marginTop: '8px' }}
                  disabled={submitting}
                >
                  {submitting
                    ? <><span className="animate-spin mr-2">⏳</span>Creating Account...</>
                    : <><UserPlus size={18} className="mr-2" />Register [दर्ता गर्नुहोस्]</>
                  }
                </Button>

                <p className="text-center text-[13px] text-muted-foreground pt-1">
                  Already have an account?{' '}
                  <Link 
                    to="/login" 
                    className="font-black text-primary hover:underline"
                    onClick={(e) => submitting && e.preventDefault()}
                  >
                    Login [लगइन]
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </>
      )}

      {/* ── TERMS MODAL (shared between mobile and desktop) ── */}
      <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
        <DialogContent className="max-w-md mx-auto w-[95%] rounded-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-5 pb-3 border-b border-border/50 bg-muted/20">
            <DialogTitle className="text-lg font-bold text-primary">Legal Agreements</DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto p-5 space-y-8 text-sm text-muted-foreground custom-scrollbar">
            <section className="space-y-4">
              <h3 className="text-base font-black text-foreground border-b border-border/50 pb-2">
                Terms & Conditions
              </h3>
              <p className="leading-relaxed">
                Welcome to Hamro Kishan. By registering, you agree to the following terms:
              </p>
              <div className="space-y-1.5">
                <h4 className="font-bold text-foreground">1. Platform Role</h4>
                <p className="leading-relaxed text-xs">
                  Hamro Kishan acts as a digital bridge connecting farmers, buyers, and agricultural experts.
                  We do not handle payments, logistics, deliveries, or quality assurance.
                  All transactions are solely between the interacting parties.
                </p>
              </div>
              <div className="space-y-1.5">
                <h4 className="font-bold text-foreground">2. User Obligations</h4>
                <p className="leading-relaxed text-xs">
                  You agree to provide accurate information. Fraudulent listings, impersonation, or selling
                  illegal items will result in immediate account termination and potential legal action.
                </p>
              </div>
              <div className="space-y-1.5">
                <h4 className="font-bold text-foreground">3. Limitation of Liability</h4>
                <p className="leading-relaxed text-xs">
                  Hamro Kishan is not liable for financial losses, crop damages, or disputes arising from
                  interactions on this platform. Users proceed at their own risk.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-base font-black text-foreground border-b border-border/50 pb-2">
                Privacy Policy
              </h3>
              <div className="space-y-1.5">
                <h4 className="font-bold text-foreground">1. Information We Collect</h4>
                <p className="leading-relaxed text-xs">
                  We collect your Full Name, Phone Number, Email Address, and Location
                  (Province, District, Municipality) to build your agricultural profile.
                </p>
              </div>
              <div className="space-y-1.5">
                <h4 className="font-bold text-foreground">2. Public Information</h4>
                <p className="leading-relaxed text-xs">
                  <strong className="text-foreground">Important:</strong> Your Phone Number, Full Name,
                  and Location will be publicly visible to other registered users so they can contact you.
                  By registering, you explicitly consent to this.
                </p>
              </div>
              <div className="space-y-1.5">
                <h4 className="font-bold text-foreground">3. Data Usage</h4>
                <p className="leading-relaxed text-xs">
                  Your data is used solely to facilitate Hamro Kishan features. We do not sell
                  your personal data to third-party marketing agencies.
                </p>
              </div>
            </section>
          </div>

          <div className="p-5 border-t border-border/50 bg-background">
            <Button
              className="w-full h-12 text-base font-bold shadow-md"
              onClick={() => { setAcceptedTerms(true); setShowTermsModal(false); }}
            >
              I Agree to All Terms [म सहमत छु]
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Register;