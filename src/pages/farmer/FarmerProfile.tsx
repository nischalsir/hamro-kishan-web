// ═══════════════════════════════════════════════════════════════════════════
// FARMER PROFILE PAGE (Web Optimized)
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { nepalLocations, farmTypeOptions } from '@/data/mock';
import {
  Camera, Save, User, Phone, Bug, MessageCircle, LogOut, X, MapPin, Sprout, ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { provincesList, compressImage } from './shared';

export const FarmerProfile: React.FC = () => {
  const { user, profile, farmerProfile, logout, refreshProfile, loading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bugDesc, setBugDesc] = useState('');
  const [showBugDialog, setShowBugDialog] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [farmType, setFarmType] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [wardNumber, setWardNumber] = useState('');
  const [toleName, setToleName] = useState('');

  const availableDistricts = useMemo(() => province ? Object.keys(nepalLocations[province] ?? {}) : [], [province]);
  const availableMunicipalities = useMemo(() => province && district ? (nepalLocations[province][district] ?? []) : [], [province, district]);

  useEffect(() => {
    if (profile) {
      setName(profile.full_name ?? '');
      setPhone(profile.phone_number ?? '');
      if (profile.avatar_url) setAvatarPreview(profile.avatar_url);
    }
  }, [profile]);

  useEffect(() => {
    if (farmerProfile) {
      setFarmType(farmerProfile.farm_type ?? '');
      setProvince(farmerProfile.province ?? '');
      setDistrict(farmerProfile.district ?? '');
      setMunicipality(farmerProfile.municipality ?? '');
      setWardNumber(farmerProfile.ward_number ?? '');
      setToleName(farmerProfile.tole_name ?? '');
    }
  }, [farmerProfile]);

  const handleProvinceChange = (val: string) => { setProvince(val); setDistrict(''); setMunicipality(''); };
  const handleDistrictChange = (val: string) => { setDistrict(val); setMunicipality(''); };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (avatarPreview?.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  useEffect(() => {
    return () => { if (avatarPreview?.startsWith('blob:')) URL.revokeObjectURL(avatarPreview); };
  }, [avatarPreview]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      let avatarUrl = profile?.avatar_url ?? null;
      if (avatarFile) {
        const compressed = await compressImage(avatarFile);
        const ext = compressed.type.split('/')[1] ?? 'jpg';
        const path = `${user.id}/avatar-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('avatars').upload(path, compressed, { upsert: true });
        if (!upErr) avatarUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
      }
      await (supabase as any).from('profiles').upsert({
        id: user.id, full_name: name || user.email?.split('@')[0],
        phone_number: phone, avatar_url: avatarUrl, role: profile?.role ?? 'farmer',
      });
      
      const { data: existing } = await (supabase as any).from('farmer_profiles').select('id').eq('profile_id', user.id).maybeSingle();
      
      const farmerData = { farm_type: farmType, province, district, municipality, ward_number: wardNumber, tole_name: toleName };
      if (existing) {
        await (supabase as any).from('farmer_profiles').update(farmerData).eq('profile_id', user.id);
      } else {
        await (supabase as any).from('farmer_profiles').insert([{ profile_id: user.id, ...farmerData }]);
      }
      
      await refreshProfile();
      toast.success('Profile updated successfully!');
      setAvatarFile(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save profile');
      console.error(err);
    } finally { setSaving(false); }
  };

  const submitBugReport = () => {
    if (!bugDesc) return;
    window.location.href = `mailto:nischalpandey.dev@gmail.com?subject=Hamro Kisan Bug Report&body=Farmer ID: ${user?.id}%0D%0A%0D%0ADescription:%0D%0A${encodeURIComponent(bugDesc)}`;
    setShowBugDialog(false);
    setBugDesc('');
  };

  const isLoading = loading && !farmerProfile;

  return (
    <div className="min-h-full bg-slate-50/50 pb-20 lg:pb-8">
      
      {/* ── WEB HERO HEADER ── */}
      <div className="bg-gradient-to-r from-emerald-700 to-teal-800 pt-12 pb-32 px-6 shadow-md relative overflow-hidden">
        {/* Abstract Background pattern for Web */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
        
        <div className="max-w-5xl mx-auto relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar Section */}
          <div className="relative group">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl border-4 border-white/20 overflow-hidden bg-white/10 flex items-center justify-center shadow-2xl backdrop-blur-sm transition-transform group-hover:scale-105">
              {avatarPreview ? <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" /> : <User className="w-16 h-16 text-white/80" />}
            </div>
            <button
              aria-label="Change profile picture"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-3 -right-3 w-12 h-12 rounded-2xl bg-white text-emerald-700 flex items-center justify-center shadow-xl hover:bg-slate-50 transition-colors border border-slate-100"
            >
              <Camera size={20} />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>

          {/* Title Section */}
          <div className="text-center md:text-left mt-2 md:mt-6">
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">{name || 'Your Profile'}</h2>
            <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
              <ShieldCheck size={16} className="text-emerald-300" />
              <p className="text-emerald-50 text-sm font-semibold tracking-wide">{user?.email}</p>
            </div>
            <div className="mt-4 hidden md:inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20 text-xs font-bold text-white uppercase tracking-widest">
              <Sprout size={14} /> Registered Farmer
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT GRID ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-20 relative z-20">
        
        {isLoading ? (
          /* Loading Skeletons */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
               <Card className="rounded-3xl border-none shadow-xl"><CardContent className="p-8 space-y-4"><Skeleton className="h-8 w-40" /><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></CardContent></Card>
            </div>
            <div className="space-y-6">
               <Card className="rounded-3xl border-none shadow-xl"><CardContent className="p-8 space-y-4"><Skeleton className="h-8 w-40" /><Skeleton className="h-14 w-full" /></CardContent></Card>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            
            {/* LEFT COLUMN: Main Form */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Personal Details Card */}
              <Card className="rounded-[2rem] shadow-xl shadow-slate-200/50 border-none bg-white overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg text-slate-800"><User className="text-emerald-600" size={20}/> Personal Details</CardTitle>
                  <CardDescription>Update your contact information and farm classification.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 md:p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Full Name [नाम]</Label>
                      <Input value={name} onChange={e => setName(e.target.value)} className="h-14 rounded-2xl bg-slate-50 border-none px-4 text-base focus:bg-white focus:ring-2 focus:ring-emerald-500/20" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Phone [फोन]</Label>
                      <Input value={phone} onChange={e => setPhone(e.target.value)} className="h-14 rounded-2xl bg-slate-50 border-none px-4 text-base focus:bg-white focus:ring-2 focus:ring-emerald-500/20" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Farm Type [खेत प्रकार]</Label>
                    <Select value={farmType} onValueChange={setFarmType}>
                      <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-none px-4 text-base focus:bg-white focus:ring-2 focus:ring-emerald-500/20">
                        <SelectValue placeholder="Select classification" />
                      </SelectTrigger>
                      <SelectContent>{farmTypeOptions.map(ft => <SelectItem key={ft} value={ft}>{ft}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Location Card */}
              <Card className="rounded-[2rem] shadow-xl shadow-slate-200/50 border-none bg-white overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg text-slate-800"><MapPin className="text-emerald-600" size={20}/> Location Details</CardTitle>
                  <CardDescription>Where is your farm located?</CardDescription>
                </CardHeader>
                <CardContent className="p-6 md:p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Province</Label>
                      <Select value={province} onValueChange={handleProvinceChange}>
                        <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-none px-4 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{provincesList.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">District</Label>
                      <Select value={district} onValueChange={handleDistrictChange} disabled={!province}>
                        <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-none px-4 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{availableDistricts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Municipality</Label>
                      <Select value={municipality} onValueChange={setMunicipality} disabled={!district}>
                        <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-none px-4 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{availableMunicipalities.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Ward No.</Label>
                      <Input type="text" inputMode="numeric" pattern="[0-9]*" value={wardNumber} onChange={e => setWardNumber(e.target.value.replace(/\D/g, '').slice(0, 2))} className="h-14 rounded-2xl bg-slate-50 border-none px-4 text-base focus:bg-white focus:ring-2 focus:ring-emerald-500/20" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tole</Label>
                      <Input value={toleName} onChange={e => setToleName(e.target.value)} placeholder="e.g. Shantinagar" className="h-14 rounded-2xl bg-slate-50 border-none px-4 text-base focus:bg-white focus:ring-2 focus:ring-emerald-500/20" />
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* RIGHT COLUMN: Actions & Support */}
            <div className="space-y-6">
              
              {/* Save Card */}
              <Card className="rounded-[2rem] shadow-xl shadow-slate-200/50 border-none bg-white p-6">
                <Button 
                  className="w-full h-14 text-base font-black shadow-lg shadow-emerald-200 rounded-2xl bg-emerald-600 hover:bg-emerald-700 transition-all active:scale-95" 
                  onClick={handleSave} 
                  disabled={saving || isLoading}
                >
                  <Save size={20} className="mr-2" />{saving ? 'Saving...' : 'Save Profile'}
                </Button>
                <p className="text-center text-[11px] font-bold text-slate-400 mt-4 uppercase tracking-wider">Keep your info up to date</p>
              </Card>

              {/* Support Card */}
              <Card className="rounded-[2rem] shadow-xl shadow-slate-200/50 border-none bg-white overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                  <CardTitle className="text-base text-slate-800">Support & Contact</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <a href="tel:+9779765344761" className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-emerald-50 transition-colors group border border-slate-100">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform"><Phone size={20} /></div>
                    <div><p className="font-bold text-sm text-slate-800">Call Support</p><p className="text-xs text-slate-500">+977-9765344761</p></div>
                  </a>
                  
                  <a href="https://wa.me/9779765344761" target="_blank" rel="noreferrer" className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-green-50 transition-colors group border border-slate-100">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform"><MessageCircle size={20} /></div>
                    <div><p className="font-bold text-sm text-slate-800">WhatsApp</p><p className="text-xs text-slate-500">Chat with our team</p></div>
                  </a>

                  <button onClick={() => setShowBugDialog(true)} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-red-50 transition-colors group border border-slate-100 text-left">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform"><Bug size={20} /></div>
                    <div><p className="font-bold text-sm text-slate-800">Report a Bug</p><p className="text-xs text-slate-500">Let the developer know</p></div>
                  </button>
                </CardContent>
              </Card>

              {/* Danger Zone */}
              <div className="pt-4">
                <Button variant="outline" className="w-full h-14 text-sm font-bold rounded-2xl text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700" onClick={logout}>
                  <LogOut size={18} className="mr-2" /> Sign Out
                </Button>
              </div>

            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-12 pb-6">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">© {new Date().getFullYear()} Hamro Kishan. All rights reserved.</p>
          <p className="text-[10px] text-slate-300 mt-2 font-black">SYSTEM V1.0.1</p>
        </div>
      </div>

      {/* ── BUG REPORT MODAL ── */}
      <Dialog open={showBugDialog} onOpenChange={setShowBugDialog}>
        <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center">
            <DialogTitle className="font-black text-xl text-slate-800 flex items-center gap-2">
              <Bug className="text-red-500" /> Report Issue
            </DialogTitle>
            <button onClick={() => setShowBugDialog(false)} className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-full shadow-sm"><X size={18} /></button>
          </div>
          <div className="p-6 space-y-6 bg-white">
            <p className="text-sm font-semibold text-slate-500">Describe what went wrong. This will open your email client to send a message directly to our developers.</p>
            <Textarea 
              placeholder="I tried to upload a photo but it said..." 
              value={bugDesc} 
              onChange={e => setBugDesc(e.target.value)} 
              className="bg-slate-50 border-slate-200 resize-none h-32 rounded-2xl focus-visible:ring-emerald-500 p-4" 
            />
            <Button onClick={submitBugReport} disabled={!bugDesc} className="w-full h-14 font-black rounded-2xl bg-slate-900 hover:bg-slate-800 text-white shadow-lg">
              Draft Email Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};