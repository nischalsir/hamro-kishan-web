// ═══════════════════════════════════════════════════════════════════════════
// EXPERT DASHBOARD (Web Optimized)
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  LogOut, AlertTriangle, CheckCircle, Send, Home, MessageSquare,
  User, ShieldAlert, ShieldCheck, ShieldEllipsis, Clock, XCircle,
  Cloud, CloudRain, CloudLightning, CloudFog, CloudSnow, CloudDrizzle, 
  Sun, Droplets, Thermometer, Activity, FileText, BarChart2, Phone, 
  MessageCircle, Bug, Sprout, Wind, X, Camera, MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

// --- VERIFICATION BADGE ---
const VerificationBadge: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'verified') return <Badge className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-3 py-1"><ShieldCheck size={14} className="mr-1.5" /> Verified Expert</Badge>;
  if (status === 'pending') return <Badge variant="secondary" className="bg-amber-100 text-amber-700 font-bold px-3 py-1"><ShieldEllipsis size={14} className="mr-1.5" /> Verification Pending</Badge>;
  if (status === 'rejected') return <Badge variant="destructive" className="font-bold px-3 py-1"><XCircle size={14} className="mr-1.5" /> Verification Rejected</Badge>;
  return <Badge variant="destructive" className="bg-red-100 text-red-700 border-none font-bold px-3 py-1"><ShieldAlert size={14} className="mr-1.5" /> Action Required: Verify ID</Badge>;
};

// --- WEATHER MAPPERS & CALCULATORS (Condensed for brevity, logic unchanged) ---
const getWeatherDetails = (code: number) => {
  const map: any = { 0: { Icon: Sun, c: "text-amber-500", l: "Clear", a: "animate-[spin_8s_linear_infinite]" }, 1: { Icon: Sun, c: "text-amber-400", l: "Mainly Clear", a: "animate-[spin_8s_linear_infinite]" }, 2: { Icon: Cloud, c: "text-slate-400", l: "Partly Cloudy", a: "animate-pulse" }, 3: { Icon: Cloud, c: "text-slate-500", l: "Overcast", a: "animate-pulse" }, 61: { Icon: CloudRain, c: "text-blue-500", l: "Rain", a: "animate-bounce", r: true }, 95: { Icon: CloudLightning, c: "text-purple-500", l: "Storm", a: "animate-bounce", t: true } };
  const res = map[code] ?? { Icon: Sun, c: "text-amber-500", l: "Clear", a: "" };
  return { Icon: res.Icon, color: res.c, label: res.l, animate: res.a, isRaining: !!res.r, isSnowing: !!res.s, isThunderstorm: !!res.t };
};

const calculateDiseaseRisks = (temp: number, hum: number, w: any) => {
  const risks: any[] = [];
  if (hum > 85 && temp > 25) risks.push({ level: 'high', type: 'Fungal Risk', msg: 'High risk of late blight', adv: 'Preventive fungicides needed', icon: AlertTriangle, c: 'text-red-600', bg: 'bg-red-50' });
  if (w.isRaining && temp > 20 && hum > 70) risks.push({ level: 'medium', type: 'Bacterial Risk', msg: 'Wet conditions favor blight', adv: 'Avoid working in wet fields', icon: Droplets, c: 'text-orange-600', bg: 'bg-orange-50' });
  if (temp > 30 && hum < 50 && !w.isRaining) risks.push({ level: 'medium', type: 'Pest Activity', msg: 'Hot, dry weather favors pests', adv: 'Scout for aphids and mites', icon: Bug, c: 'text-amber-600', bg: 'bg-amber-50' });
  if (risks.length === 0) risks.push({ level: 'low', type: 'Optimal Conditions', msg: 'Weather is favorable', adv: 'Standard maintenance', icon: CheckCircle, c: 'text-green-600', bg: 'bg-green-50' });
  return risks;
};

const AgronomicWeatherWidget = () => {
  const [w, setW] = useState<any>(null);
  useEffect(() => {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=27.7172&longitude=85.3240&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto').then(r => r.json()).then(d => setW({ t: Math.round(d.current.temperature_2m), h: d.current.relative_humidity_2m, c: d.current.weather_code, s: Math.round(d.current.wind_speed_10m) })).catch(() => {});
  }, []);
  if (!w) return <Skeleton className="w-full h-40 rounded-3xl" />;
  const details = getWeatherDetails(w.c);
  const risks = calculateDiseaseRisks(w.t, w.h, details);

  return (
    <div className="space-y-4">
      <Card className="rounded-3xl border-none shadow-lg bg-gradient-to-br from-slate-800 to-slate-900 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -z-10" />
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-300 text-xs font-bold uppercase tracking-widest flex items-center gap-1"><MapPin size={12}/> Kathmandu Hub</p>
              <h2 className="text-5xl font-black mt-2">{w.t}°</h2>
              <p className="text-blue-200 font-medium mt-1">{details.label}</p>
            </div>
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20">
              <details.Icon size={32} className={`${details.color} ${details.animate}`} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-white/10">
             <div><p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Humidity</p><p className="font-bold">{w.h}%</p></div>
             <div><p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Wind</p><p className="font-bold">{w.s} km/h</p></div>
          </div>
        </CardContent>
      </Card>
      
      {risks.map((r, i) => (
        <div key={i} className={`${r.bg} rounded-2xl p-4 flex gap-3 border border-white/50 shadow-sm`}>
          <div className="mt-1 shrink-0"><r.icon size={20} className={r.c} /></div>
          <div>
            <div className="flex items-center gap-2 mb-1"><h4 className={`text-sm font-black ${r.c}`}>{r.type}</h4></div>
            <p className="text-xs text-slate-600 font-medium">{r.msg}</p>
            <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-wide">Advice: {r.adv}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

// --- MAIN DASHBOARD COMPONENT ---
export const ExpertDashboard: React.FC = () => {
  const { user, profile, expertProfile, loading, logout, refreshProfile } = useAuth();

  const [currentTab, setCurrentTab] = useState<'home' | 'advice' | 'profile'>('home');
  const [adviceView, setAdviceView] = useState<'pending' | 'resolved'>('pending');
  const [issues, setIssues] = useState<any[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);

  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
  const [solution, setSolution] = useState('');
  const [tips, setTips] = useState('');
  const [submittingAdvice, setSubmittingAdvice] = useState(false);

  const [docFile, setDocFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [uploadingVerification, setUploadingVerification] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [stats, setStats] = useState({ total: 0, pending: 0, resolved: 0, advice: 0 });

  const verificationStatus = ((expertProfile as any)?.verification_status ?? 'unverified') as 'unverified' | 'pending' | 'verified' | 'rejected';
  const isVerified = verificationStatus === 'verified';

  const fetchIssues = async () => {
    setLoadingIssues(true);
    try {
      const { data, error } = await supabase.from('crop_issues').select(`*, profiles (full_name, phone_number), expert_advice (solution, preventive_tips)`).order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      setIssues(data ?? []);
      const { data: adv } = await supabase.from('expert_advice').select('id');
      setStats({ total: data?.length ?? 0, pending: data?.filter(i => i.status === 'pending').length ?? 0, resolved: data?.filter(i => i.status === 'resolved').length ?? 0, advice: adv?.length ?? 0 });
    } catch (err) { toast.error('Failed to load crop issues'); } finally { setLoadingIssues(false); }
  };

  useEffect(() => { if (!loading && user?.id) fetchIssues(); }, [loading, user?.id]);
  useEffect(() => { if (profile) { setEditName(profile.full_name ?? ''); setEditPhone(profile.phone_number ?? ''); } }, [profile]);

  const handleSubmitAdvice = async () => {
    if (!selectedIssue || !solution || !user) return;
    setSubmittingAdvice(true);
    try {
      await supabase.from('expert_advice').insert({ issue_id: selectedIssue.id, expert_id: user.id, solution, preventive_tips: tips || null });
      await supabase.from('crop_issues').update({ status: 'resolved' }).eq('id', selectedIssue.id);
      toast.success('Advice submitted successfully!');
      setSelectedIssue(null); setSolution(''); setTips(''); fetchIssues(); setAdviceView('resolved');
    } catch (e) { toast.error('Failed to submit advice'); } finally { setSubmittingAdvice(false); }
  };

  const handleVerificationUpload = async () => {
    if (!user || !docFile || !selfieFile) return;
    setUploadingVerification(true);
    try {
      const dPath = `${user.id}/id_doc_${Date.now()}.${docFile.name.split('.').pop()}`;
      await supabase.storage.from('expert_documents').upload(dPath, docFile);
      const sPath = `${user.id}/selfie_${Date.now()}.${selfieFile.name.split('.').pop()}`;
      await supabase.storage.from('expert_documents').upload(sPath, selfieFile);
      
      const dUrl = supabase.storage.from('expert_documents').getPublicUrl(dPath).data.publicUrl;
      const sUrl = supabase.storage.from('expert_documents').getPublicUrl(sPath).data.publicUrl;
      
      await supabase.from('expert_profiles').update({ verification_status: 'pending', document_url: dUrl, selfie_url: sUrl } as any).eq('profile_id', user.id);
      toast.success('Documents submitted!'); await refreshProfile();
    } catch (e) { toast.error('Upload failed'); } finally { setUploadingVerification(false); }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingAvatar(true);
      if (!e.target.files?.length) throw new Error('Select an image');
      const file = e.target.files[0];
      const path = `${user?.id}-${Math.random()}.${file.name.split('.').pop()}`;
      await supabase.storage.from('avatars').upload(path, file);
      const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', user?.id);
      toast.success('Picture updated!'); await refreshProfile();
    } catch (err: any) { toast.error(err.message); } finally { setUploadingAvatar(false); }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try { await supabase.from('profiles').update({ full_name: editName, phone_number: editPhone }).eq('id', user.id); await refreshProfile(); toast.success('Profile updated!'); } 
    catch (e) { toast.error('Save failed'); } finally { setSavingProfile(false); }
  };

  const pendingIssues = issues.filter(i => i.status === 'pending');
  const resolvedIssues = issues.filter(i => i.status === 'resolved');

  if (loading && !expertProfile) return <div className="min-h-screen flex items-center justify-center"><Skeleton className="w-24 h-24 rounded-full" /></div>;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12 flex flex-col md:flex-row gap-6">
      
      {/* ── WEB SIDEBAR (Navigation & Profile Snippet) ── */}
      <div className="w-full md:w-64 lg:w-72 shrink-0 space-y-6 md:min-h-screen md:bg-white md:border-r border-slate-200 md:p-6">
        
        {/* Profile Snippet */}
        <div className="text-center pt-6 pb-4 md:border-b border-slate-100">
          <div className="relative w-24 h-24 mx-auto mb-4">
            <div className="w-full h-full rounded-full border-4 border-slate-50 overflow-hidden bg-slate-100 flex items-center justify-center shadow-lg">
              {uploadingAvatar ? <div className="animate-spin h-8 w-8 border-b-2 border-emerald-500 rounded-full" /> : 
               profile?.avatar_url ? <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" /> : <User className="w-10 h-10 text-slate-400" />}
            </div>
            {currentTab === 'profile' && (
              <Label className="absolute bottom-0 right-0 bg-emerald-600 text-white p-2 rounded-full cursor-pointer shadow-lg hover:bg-emerald-700 transition-colors border-2 border-white">
                <Camera size={14} />
                <Input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
              </Label>
            )}
          </div>
          <h2 className="text-lg font-black text-slate-800 flex items-center justify-center gap-2">
            {profile?.full_name}
          </h2>
          <p className="text-emerald-600 font-bold text-xs mt-1 uppercase tracking-widest">{expertProfile?.specialization ?? 'Agronomist'}</p>
          <div className="mt-3 flex justify-center"><VerificationBadge status={verificationStatus} /></div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex flex-col gap-2 mt-6">
          <button onClick={() => setCurrentTab('home')} className={`flex items-center gap-3 w-full text-left px-4 py-3.5 rounded-2xl font-bold transition-all ${currentTab === 'home' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'}`}>
            <Home size={20} className={currentTab === 'home' ? 'text-emerald-500' : 'text-slate-400'} /> Dashboard
          </button>
          <button onClick={() => setCurrentTab('advice')} className={`flex items-center justify-between w-full text-left px-4 py-3.5 rounded-2xl font-bold transition-all ${currentTab === 'advice' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'}`}>
            <div className="flex items-center gap-3"><MessageSquare size={20} className={currentTab === 'advice' ? 'text-emerald-500' : 'text-slate-400'} /> Provide Advice</div>
            {stats.pending > 0 && <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{stats.pending}</span>}
          </button>
          <button onClick={() => setCurrentTab('profile')} className={`flex items-center gap-3 w-full text-left px-4 py-3.5 rounded-2xl font-bold transition-all ${currentTab === 'profile' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'}`}>
            <User size={20} className={currentTab === 'profile' ? 'text-emerald-500' : 'text-slate-400'} /> Account Settings
          </button>
          
          <div className="mt-12 pt-6 border-t border-slate-100">
            <Button variant="ghost" onClick={logout} className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700">
              <LogOut size={18} className="mr-3" /> Sign Out
            </Button>
          </div>
        </div>

        {/* Mobile Navigation (Pill Selector) */}
        <div className="md:hidden flex gap-2 bg-white p-2 rounded-2xl shadow-sm mx-4">
          {(['home', 'advice', 'profile'] as const).map(t => (
            <button key={t} onClick={() => setCurrentTab(t)} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all capitalize relative ${currentTab === t ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500'}`}>
              {t} {t === 'advice' && stats.pending > 0 && <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full" />}
            </button>
          ))}
        </div>
      </div>

      {/* ── WEB MAIN CONTENT AREA ── */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 md:py-8 space-y-6">

        {/* =================== HOME TAB =================== */}
        {currentTab === 'home' && (
          <div className="space-y-6">
            {!isVerified && (
              <div className={`p-5 rounded-3xl border flex items-start gap-4 shadow-sm ${verificationStatus === 'pending' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                <div className={`mt-1 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${verificationStatus === 'pending' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
                   {verificationStatus === 'pending' ? <Clock size={20}/> : <ShieldAlert size={20}/>}
                </div>
                <div>
                  <h3 className={`text-lg font-black ${verificationStatus === 'pending' ? 'text-amber-800' : 'text-red-800'}`}>Verification Action Required</h3>
                  <p className={`text-sm mt-1 ${verificationStatus === 'pending' ? 'text-amber-700' : 'text-red-700'}`}>
                    {verificationStatus === 'pending' ? 'Your documents are under review by an admin. You will be notified shortly.' : 'You must upload your ID and a selfie to verify your identity before advising farmers.'}
                  </p>
                  {verificationStatus !== 'pending' && <Button className="mt-3 bg-red-600 hover:bg-red-700" onClick={() => setCurrentTab('profile')}>Start Verification</Button>}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Analytics Summary */}
              <div className="md:col-span-2 grid grid-cols-2 gap-4">
                <Card onClick={() => { setCurrentTab('advice'); setAdviceView('pending'); }} className="border-none shadow-md rounded-3xl cursor-pointer hover:-translate-y-1 transition-all bg-gradient-to-br from-amber-50 to-orange-50 group">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm text-amber-500 group-hover:scale-110 transition-transform"><AlertTriangle size={24} /></div>
                    <p className="text-4xl font-black text-slate-800 mb-1">{stats.pending}</p>
                    <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">Pending Cases</p>
                  </CardContent>
                </Card>
                <Card onClick={() => { setCurrentTab('advice'); setAdviceView('resolved'); }} className="border-none shadow-md rounded-3xl cursor-pointer hover:-translate-y-1 transition-all bg-gradient-to-br from-emerald-50 to-teal-50 group">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm text-emerald-500 group-hover:scale-110 transition-transform"><CheckCircle size={24} /></div>
                    <p className="text-4xl font-black text-slate-800 mb-1">{stats.resolved}</p>
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Resolved Cases</p>
                  </CardContent>
                </Card>
              </div>

              {/* Weather Block */}
              <div className="md:col-span-1"><AgronomicWeatherWidget /></div>
            </div>

            {/* Recent Pending Issues Preview */}
            {pendingIssues.length > 0 && (
              <Card className="border-none shadow-md rounded-3xl bg-white overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg text-slate-800 flex items-center gap-2"><FileText size={20} className="text-blue-500"/> Urgent Consultations</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setCurrentTab('advice')} className="text-blue-600 font-bold">View All</Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100">
                    {pendingIssues.slice(0, 3).map(issue => (
                      <div key={issue.id} className="p-5 hover:bg-slate-50 transition-colors flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0"><Sprout size={20} /></div>
                        <div className="flex-1">
                          <h4 className="font-black text-slate-800">{issue.crop_name}</h4>
                          <p className="text-sm text-slate-500 line-clamp-1 mt-0.5">{issue.description}</p>
                        </div>
                        <Button size="sm" onClick={() => { setCurrentTab('advice'); setSelectedIssue(issue); }} className="bg-slate-900 hover:bg-slate-800 rounded-lg">Solve</Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* =================== ADVICE TAB =================== */}
        {currentTab === 'advice' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-xl font-black text-slate-800 ml-2">Consultation Board</h3>
              <div className="flex gap-2 bg-slate-50 p-1.5 rounded-2xl">
                <button onClick={() => setAdviceView('pending')} className={`px-6 py-2 text-sm font-bold rounded-xl transition-all ${adviceView === 'pending' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  Pending ({pendingIssues.length})
                </button>
                <button onClick={() => setAdviceView('resolved')} className={`px-6 py-2 text-sm font-bold rounded-xl transition-all ${adviceView === 'resolved' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  Resolved ({resolvedIssues.length})
                </button>
              </div>
            </div>

            {!isVerified && adviceView === 'pending' ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
                <ShieldAlert className="mx-auto text-red-400 mb-4" size={56} />
                <p className="text-slate-800 font-black text-2xl">Verification Required</p>
                <p className="text-base text-slate-500 mt-2 max-w-md mx-auto">To protect farmers, you must complete your profile verification before you can provide official advice.</p>
                <Button className="mt-6 font-bold h-12 px-8 rounded-xl" onClick={() => setCurrentTab('profile')}>Complete Verification</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {loadingIssues ? (
                  [1, 2].map(i => <Skeleton key={i} className="h-64 rounded-3xl" />)
                ) : (adviceView === 'pending' ? pendingIssues : resolvedIssues).length === 0 ? (
                  <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                    <CheckCircle className="mx-auto text-emerald-200 mb-4" size={56} />
                    <p className="text-slate-500 font-bold text-lg">No {adviceView} issues found.</p>
                  </div>
                ) : (
                  (adviceView === 'pending' ? pendingIssues : resolvedIssues).map(issue => (
                    <Card key={issue.id} className="border-none shadow-md rounded-3xl bg-white overflow-hidden flex flex-col h-full hover:shadow-lg transition-shadow">
                      {issue.image_url && (
                        <div className="h-48 w-full bg-slate-100 overflow-hidden relative">
                          <img src={issue.image_url} alt="Crop issue" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <CardContent className="p-6 flex-1 flex flex-col">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">{issue.crop_name}</p>
                            <p className="font-bold text-slate-800 flex items-center gap-1.5"><User size={14} className="text-slate-400"/> {issue.profiles?.full_name}</p>
                          </div>
                          <Badge variant={issue.status === 'pending' ? 'outline' : 'default'} className={`text-[10px] uppercase font-black px-2 py-1 ${issue.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-100 text-emerald-700'}`}>
                            {issue.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed mb-6 flex-1">"{issue.description}"</p>
                        
                        {adviceView === 'pending' ? (
                          <Button className="w-full font-bold h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white mt-auto" onClick={() => setSelectedIssue(issue)}>
                            <Send size={16} className="mr-2" /> Provide Solution
                          </Button>
                        ) : (
                          <div className="mt-auto border-t border-slate-100 pt-4 bg-emerald-50/50 -mx-6 -mb-6 p-6">
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Your Solution</p>
                            <p className="text-sm font-semibold text-slate-700 leading-relaxed">
                              {issue.expert_advice?.[0]?.solution ?? 'No details recorded.'}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* =================== PROFILE TAB =================== */}
        {currentTab === 'profile' && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <Card className="rounded-3xl border-none shadow-md overflow-hidden bg-white">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <CardTitle className="text-lg text-slate-800 flex items-center gap-2"><User size={20} className="text-emerald-600"/> Edit Profile</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Full Name</Label>
                    <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-12 bg-slate-50 border-none rounded-xl font-medium" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Phone Number</Label>
                    <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} className="h-12 bg-slate-50 border-none rounded-xl font-medium" inputMode="tel" />
                  </div>
                </div>
                <Button onClick={handleSaveProfile} disabled={savingProfile} className="w-full h-14 font-black rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200">
                  {savingProfile ? 'Saving...' : 'Save Profile Changes'}
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-none shadow-md overflow-hidden bg-white">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <CardTitle className="text-lg text-slate-800 flex items-center gap-2"><ShieldCheck size={20} className="text-blue-500"/> Trust & Verification</CardTitle>
                <CardDescription>Upload credentials to gain farmer trust.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {(verificationStatus === 'unverified' || verificationStatus === 'rejected') ? (
                  <div className="space-y-5">
                    {verificationStatus === 'rejected' && (
                       <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm font-bold border border-red-100 mb-4">Your previous verification was rejected. Please upload clear, valid documents.</div>
                    )}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Upload ID Document (Citizenship/License)</Label>
                      <Input type="file" accept="image/*,.pdf" onChange={e => setDocFile(e.target.files?.[0] ?? null)} className="h-14 pt-4 bg-slate-50 border-none rounded-xl cursor-pointer" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Upload Selfie (Must match ID)</Label>
                      <Input type="file" accept="image/*" capture="user" onChange={e => setSelfieFile(e.target.files?.[0] ?? null)} className="h-14 pt-4 bg-slate-50 border-none rounded-xl cursor-pointer" />
                    </div>
                    <Button onClick={handleVerificationUpload} disabled={!docFile || !selfieFile || uploadingVerification} className="w-full h-14 font-black rounded-xl bg-slate-900 hover:bg-slate-800 text-white">
                      {uploadingVerification ? 'Uploading...' : 'Submit for Verification'}
                    </Button>
                  </div>
                ) : verificationStatus === 'pending' ? (
                  <div className="text-center py-10 bg-amber-50 rounded-2xl border border-amber-100">
                    <Clock className="mx-auto text-amber-500 mb-3" size={32} />
                    <p className="text-lg font-black text-amber-800">Under Review</p>
                    <p className="text-sm text-amber-600 mt-2 max-w-sm mx-auto">We are currently verifying your documents. This usually takes 24–48 hours. You will be notified once complete.</p>
                  </div>
                ) : (
                  <div className="text-center py-10 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <ShieldCheck className="mx-auto text-emerald-500 mb-3" size={48} />
                    <p className="text-xl font-black text-emerald-800">Verified Expert</p>
                    <p className="text-sm text-emerald-600 mt-2">Your credentials have been verified. You can now provide advice to farmers.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="md:hidden pt-8"><Button variant="outline" className="w-full text-red-600 border-red-200 bg-white h-14 rounded-xl font-bold" onClick={logout}><LogOut size={18} className="mr-2"/> Logout</Button></div>
          </div>
        )}
      </div>

      {/* ── ADVICE MODAL ── */}
      <Dialog open={!!selectedIssue} onOpenChange={o => !o && setSelectedIssue(null)}>
        <DialogContent className="max-w-xl w-[95%] rounded-[2rem] p-8 border-none shadow-2xl">
          <DialogHeader><DialogTitle className="text-2xl font-black text-slate-800">Provide Expert Advice</DialogTitle></DialogHeader>
          {selectedIssue && (
            <div className="space-y-6 mt-4">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Farmer's Report: {selectedIssue.crop_name}</p>
                <p className="text-sm font-semibold text-slate-700 leading-relaxed">"{selectedIssue.description}"</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Diagnosis & Solution *</Label>
                <Textarea value={solution} onChange={e => setSolution(e.target.value)} placeholder="Explain clearly what is wrong and step-by-step how to fix it..." className="mt-1 resize-none h-32 rounded-xl bg-white border border-slate-200 focus-visible:ring-emerald-500 p-4" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Preventive Tips (Optional)</Label>
                <Textarea value={tips} onChange={e => setTips(e.target.value)} placeholder="Advice to prevent this happening again..." className="mt-1 resize-none h-20 rounded-xl bg-white border border-slate-200 focus-visible:ring-emerald-500 p-4" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 h-14 rounded-xl font-bold border-slate-200 hover:bg-slate-50" onClick={() => setSelectedIssue(null)}>Cancel</Button>
                <Button className="flex-1 h-14 font-black rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg" onClick={handleSubmitAdvice} disabled={!solution || submittingAdvice}>
                  {submittingAdvice ? 'Submitting...' : 'Submit Solution'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExpertDashboard;