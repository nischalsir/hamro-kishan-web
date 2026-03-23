// ═══════════════════════════════════════════════════════════════════════════
// FARMER ADVISORY PAGE (Web Optimized)
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { commonDiseases, seasonalRecommendations } from '@/data/mock';
import {
  Camera, Leaf, Search, X, ChevronDown, Stethoscope, BookOpen, CalendarHeart, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

// --- IMAGE COMPRESSION HELPER ---
const compressImage = (file: File): Promise<File> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onerror = reject;
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context unavailable'));
        const MAX = 1024;
        let { width, height } = img;
        if (width > height) { if (width > MAX) { height = Math.round(height * MAX / width); width = MAX; } }
        else { if (height > MAX) { width = Math.round(width * MAX / height); height = MAX; } }
        canvas.width = width; canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => blob ? resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() })) : reject(new Error('Compression failed')),
          'image/jpeg', 0.75,
        );
      };
    };
  });

// --- LAZY IMAGE COMPONENT ---
const LazyImage: React.FC<{ src: string; alt: string; className?: string; fallback?: string; }> = ({ src, alt, className = '', fallback = '/assets/placeholder.jpg' }) => {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const isLocal = src?.includes('assets/') || src?.startsWith('/');

  return (
    <div className="relative w-full h-full bg-slate-100 overflow-hidden">
      {!loaded && !errored && <div className="absolute inset-0 bg-slate-200 animate-pulse" />}
      <img src={errored ? fallback : src} alt={alt} loading={isLocal ? "eager" : "lazy"} decoding={isLocal ? "auto" : "async"} onLoad={() => setLoaded(true)} onError={() => { setErrored(true); setLoaded(true); }} className={`${className} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`} />
    </div>
  );
};

// --- DISEASE MODAL COMPONENTS ---
const InfoBlock: React.FC<{ emoji: string; labelEn: string; labelNp: string; text: string; colorClass: string; borderClass: string; labelColorClass: string; }> = ({ emoji, labelEn, labelNp, text, colorClass, borderClass, labelColorClass }) => {
  const [open, setOpen] = useState(true);
  return (
    <div className={`${colorClass} rounded-2xl border ${borderClass} overflow-hidden transition-all`}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/50 transition-colors">
        <span className={`font-black text-xs tracking-wider uppercase ${labelColorClass} flex items-center gap-2`}>
          {emoji} {labelEn} <span className="font-semibold normal-case opacity-70">| {labelNp}</span>
        </span>
        <ChevronDown size={16} className={`${labelColorClass} transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-5 pb-5 animate-in slide-in-from-top-2"><p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{text}</p></div>}
    </div>
  );
};

const DiseaseModal: React.FC<{ disease: any; onClose: () => void }> = ({ disease, onClose }) => (
  <Dialog open={true} onOpenChange={o => !o && onClose()}>
    <DialogContent className="max-w-2xl w-[95%] rounded-[2rem] p-0 overflow-hidden bg-slate-50 border-none shadow-2xl flex flex-col md:flex-row [&>button]:hidden h-[90vh] md:h-[600px]">
      
      {/* Left/Top side: Image and Title */}
      <div className="relative w-full md:w-1/2 h-64 md:h-full shrink-0">
        <LazyImage src={disease.img} alt={disease.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
        
        <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 md:hidden w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white active:scale-90 transition-transform">
          <X size={20} />
        </button>

        <div className="absolute top-6 left-6">
          <span className="text-[11px] font-black uppercase tracking-widest bg-white/20 backdrop-blur-md border border-white/30 text-white px-3 py-1.5 rounded-full shadow-lg">
            {disease.category === 'animal' ? '🐄 Animal Health' : '🌱 Plant Health'}
          </span>
        </div>

        <div className="absolute bottom-6 left-6 right-6">
          <h2 className="text-3xl font-black text-white leading-tight drop-shadow-md">{disease.name}</h2>
          <p className="text-base text-emerald-300 font-bold mt-1">{disease.nepaliName}</p>
          <p className="text-sm font-semibold text-white/70 mt-2 flex items-center gap-1.5"><Leaf size={14}/> {disease.crop}</p>
        </div>
      </div>

      {/* Right/Bottom side: Details */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50 relative">
        <button onClick={onClose} aria-label="Close" className="hidden md:flex absolute top-6 right-6 w-10 h-10 rounded-full bg-white shadow-sm border border-slate-200 items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors z-10">
          <X size={20} />
        </button>

        <InfoBlock emoji="⚠️" labelEn="Symptoms" labelNp="लक्षणहरू" text={disease.symptoms} colorClass="bg-amber-50" borderClass="border-amber-200/60" labelColorClass="text-amber-700" />
        <InfoBlock emoji="🔬" labelEn="Cause" labelNp="कारण" text={disease.cause} colorClass="bg-blue-50" borderClass="border-blue-200/60" labelColorClass="text-blue-700" />
        <InfoBlock emoji="✅" labelEn="Treatment" labelNp="उपचार" text={disease.treatment} colorClass="bg-emerald-50" borderClass="border-emerald-200/60" labelColorClass="text-emerald-700" />
        <InfoBlock emoji="🛡️" labelEn="Prevention" labelNp="रोकथाम" text={disease.prevention} colorClass="bg-purple-50" borderClass="border-purple-200/60" labelColorClass="text-purple-700" />

        <div className="bg-red-50/50 border border-red-100 rounded-2xl p-5 flex gap-4 mt-4">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm border border-red-100"><AlertCircle className="text-red-500" size={20}/></div>
          <div>
            <p className="text-xs font-black text-red-600 uppercase tracking-widest mb-1.5">Professional Consultation Required</p>
            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">This information is for general awareness. For proper diagnosis, always contact a registered agronomist or veterinarian in your local ward.</p>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

type DiseaseCategory = 'all' | 'plant' | 'animal';

export const FarmerAdvisory: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<'issues' | 'library' | 'seasonal'>('issues');
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [issues, setIssues] = useState<any[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(true);
  
  // Report Form State
  const [newCropName, setNewCropName] = useState('');
  const [newIssueDesc, setNewIssueDesc] = useState('');
  const [issueFile, setIssueFile] = useState<File | null>(null);
  const [submittingIssue, setSubmittingIssue] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Library State
  const [searchQuery, setSearchQuery] = useState('');
  const [diseaseCategory, setDiseaseCategory] = useState<DiseaseCategory>('all');
  const [selectedDisease, setSelectedDisease] = useState<any | null>(null);

  const fetchIssues = useCallback(async (silent = false) => {
    if (!user?.id) return;
    if (!silent) setIssuesLoading(true);
    try {
      const { data, error } = await (supabase as any).from('crop_issues').select('*').eq('farmer_id', user.id).order('created_at', { ascending: false }).limit(20);
      if (error) throw error;
      setIssues(data ?? []);
    } catch (e) { console.error(e); } finally { if (!silent) setIssuesLoading(false); }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    fetchIssues();
    const interval = setInterval(() => fetchIssues(true), 60_000);
    return () => clearInterval(interval);
  }, [fetchIssues, user?.id]);

  const handleAddIssue = async () => {
    if (!user?.id) return;
    if (!newCropName || !newIssueDesc) { toast.error('Please provide crop name and description.'); return; }
    setSubmittingIssue(true); setUploadProgress(0);
    let imageUrl: string | null = null;
    try {
      if (issueFile) {
        const progressInterval = setInterval(() => setUploadProgress(p => Math.min(p + 15, 90)), 300);
        const compressed = await compressImage(issueFile);
        const ext = compressed.type.split('/')[1] ?? 'jpg';
        const fileName = `${user.id}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('issue_reports').upload(`reports/${fileName}`, compressed);
        clearInterval(progressInterval); setUploadProgress(100);
        if (upErr) throw upErr;
        imageUrl = supabase.storage.from('issue_reports').getPublicUrl(`reports/${fileName}`).data.publicUrl;
      }
      await (supabase as any).from('crop_issues').insert([{ farmer_id: user.id, crop_name: newCropName, description: newIssueDesc, image_url: imageUrl, status: 'pending' }]);
      toast.success('Problem reported! An expert will review it soon.');
      setShowIssueDialog(false); fetchIssues();
    } catch (e) { toast.error('Failed to submit issue.'); } finally { setSubmittingIssue(false); setNewCropName(''); setNewIssueDesc(''); setIssueFile(null); setTimeout(() => setUploadProgress(0), 500); }
  };

  const currentMonthIndex = new Date().getMonth();
  const recommendedThisMonth = useMemo(() => seasonalRecommendations[currentMonthIndex], [currentMonthIndex]);

  const filteredDiseases = useMemo(() => commonDiseases.filter((d: any) => {
    const q = searchQuery.toLowerCase();
    return (diseaseCategory === 'all' || (d.category ?? 'plant') === diseaseCategory) && (d.name.toLowerCase().includes(q) || d.nepaliName.includes(searchQuery) || d.crop.toLowerCase().includes(q));
  }), [searchQuery, diseaseCategory]);

  return (
    <div className="min-h-full bg-slate-50/50 pb-20 lg:pb-8 flex flex-col md:flex-row gap-6">
      
      {/* ── WEB SIDEBAR (Navigation) ── */}
      <div className="w-full md:w-64 lg:w-72 shrink-0 space-y-6">
        
        {/* Header Block */}
        <div className="bg-gradient-to-br from-emerald-800 to-teal-900 p-6 md:p-8 rounded-3xl shadow-xl text-white relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight relative z-10">Advisory</h1>
          <p className="text-emerald-100/80 text-sm font-bold mt-1 uppercase tracking-widest relative z-10">कृषि सल्लाहकार</p>
        </div>

        {/* Desktop Navigation Menu */}
        <Card className="rounded-3xl shadow-sm border-none bg-white hidden md:block">
          <div className="p-3 flex flex-col gap-1">
            <button onClick={() => setTab('issues')} className={`flex items-center gap-3 w-full text-left px-4 py-3.5 rounded-2xl font-bold transition-all ${tab === 'issues' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
              <Stethoscope size={20} className={tab === 'issues' ? 'text-emerald-500' : 'text-slate-400'} /> My Consultations
            </button>
            <button onClick={() => setTab('library')} className={`flex items-center gap-3 w-full text-left px-4 py-3.5 rounded-2xl font-bold transition-all ${tab === 'library' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
              <BookOpen size={20} className={tab === 'library' ? 'text-emerald-500' : 'text-slate-400'} /> Disease Library
            </button>
            <button onClick={() => setTab('seasonal')} className={`flex items-center gap-3 w-full text-left px-4 py-3.5 rounded-2xl font-bold transition-all ${tab === 'seasonal' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
              <CalendarHeart size={20} className={tab === 'seasonal' ? 'text-emerald-500' : 'text-slate-400'} /> Seasonal Tips
            </button>
          </div>
        </Card>

        {/* Mobile Navigation (Pill Selector) */}
        <div className="md:hidden flex gap-2 bg-white p-2 rounded-2xl shadow-sm overflow-x-auto [&::-webkit-scrollbar]:hidden">
          {(['issues', 'library', 'seasonal'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 min-w-[100px] py-3 text-sm font-bold rounded-xl transition-all capitalize ${tab === t ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500'}`}>
              {t === 'issues' ? 'My Issues' : t}
            </button>
          ))}
        </div>
      </div>

      {/* ── WEB MAIN CONTENT AREA ── */}
      <div className="flex-1 space-y-6 max-w-5xl">

        {/* --- MY ISSUES TAB --- */}
        {tab === 'issues' && (
          <div className="space-y-6 pb-8">
            
            <div className="flex justify-between items-center bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-800">Your Reports</h3>
                <p className="text-xs text-slate-500 font-medium">Track your requests for expert advice.</p>
              </div>
              <Dialog open={showIssueDialog} onOpenChange={setShowIssueDialog}>
                <DialogTrigger asChild>
                  <Button className="h-12 px-6 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold shadow-lg shadow-red-200">
                    <Camera size={18} className="mr-2" /> Report Issue
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md rounded-[2rem] p-8 border-none shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <DialogTitle className="text-2xl font-black text-slate-800">Report Issue</DialogTitle>
                      <p className="text-xs font-bold text-red-500 uppercase tracking-widest mt-1">Get Expert Diagnosis</p>
                    </div>
                    <button onClick={() => setShowIssueDialog(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full"><X size={16}/></button>
                  </div>
                  <div className="space-y-5">
                    <div><Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Crop or Animal Name *</Label><Input value={newCropName} onChange={e => setNewCropName(e.target.value)} placeholder="e.g. Tomato, Buffalo" className="mt-1.5 h-12 rounded-xl bg-slate-50 border-none px-4" /></div>
                    <div><Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Describe the Symptoms *</Label><Textarea value={newIssueDesc} onChange={e => setNewIssueDesc(e.target.value)} placeholder="Leaves are turning yellow, not eating..." className="mt-1.5 resize-none h-28 rounded-xl bg-slate-50 border-none p-4" /></div>
                    <div>
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between">Upload Photo <span className="text-[9px] text-slate-400 normal-case">(Helps experts diagnose)</span></Label>
                      <Input type="file" accept="image/*" onChange={e => setIssueFile(e.target.files?.[0] ?? null)} className="mt-1.5 h-12 pt-3 rounded-xl bg-slate-50 border-none cursor-pointer" />
                      {issueFile && (
                        <div className="mt-3 relative rounded-xl overflow-hidden border border-slate-200 h-40">
                          <img src={URL.createObjectURL(issueFile)} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                    {submittingIssue && <Progress value={uploadProgress} className="w-full h-2 bg-slate-100 [&>div]:bg-red-500" />}
                    <Button disabled={submittingIssue} className="w-full h-14 text-lg font-black shadow-lg rounded-2xl bg-slate-900 hover:bg-slate-800 text-white mt-4" onClick={handleAddIssue}>
                      {submittingIssue ? 'Submitting Report...' : 'Submit to Experts'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {issuesLoading && issues.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><Skeleton className="h-40 rounded-3xl" /><Skeleton className="h-40 rounded-3xl" /></div>
            ) : issues.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-slate-100">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4"><Camera className="text-slate-300" size={32} /></div>
                <h3 className="text-lg font-bold text-slate-700">Healthy Farm!</h3>
                <p className="text-slate-500 mt-1">You haven't reported any issues yet. Click "Report Issue" if you need help.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {issues.map(issue => (
                  <Card key={issue.id} className="border-none shadow-sm overflow-hidden rounded-3xl bg-white hover:shadow-md transition-shadow">
                    <CardContent className="p-0 flex flex-col sm:flex-row h-full">
                      <div className="w-full sm:w-40 h-48 sm:h-auto bg-slate-100 relative shrink-0">
                        {issue.image_url ? <LazyImage src={issue.image_url} alt="Crop Issue" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-slate-50"><Leaf className="text-slate-200" size={40} /></div>}
                      </div>
                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between mb-3 gap-2">
                            <h4 className="font-black text-slate-800 text-lg leading-tight">{issue.crop_name ?? 'Unknown Crop'}</h4>
                            <Badge variant="outline" className={`text-[10px] uppercase font-black px-2 py-1 border-none shrink-0 ${issue.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{issue.status}</Badge>
                          </div>
                          <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">{issue.description}</p>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">Reported on {new Date(issue.created_at).toLocaleDateString()}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- DISEASE LIBRARY TAB --- */}
        {tab === 'library' && (
          <div className="space-y-6 pb-8">
            <Card className="rounded-3xl border-none shadow-sm bg-white p-5 flex flex-col md:flex-row gap-4 items-center">
              <div className="relative w-full flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <Input placeholder="Search diseases or crops (English / Nepali)..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-12 h-14 bg-slate-50 rounded-2xl border-none text-base focus-visible:ring-2 focus-visible:ring-emerald-500/30" />
              </div>
              <div className="flex gap-2 w-full md:w-auto bg-slate-50 p-1.5 rounded-2xl shrink-0 overflow-x-auto">
                {(['all', 'plant', 'animal'] as DiseaseCategory[]).map(cat => (
                  <button key={cat} onClick={() => setDiseaseCategory(cat)} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${diseaseCategory === cat ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    {cat === 'all' ? '🌿 All' : cat === 'plant' ? '🌱 Plant' : '🐄 Animal'}
                  </button>
                ))}
              </div>
            </Card>

            <div className="flex justify-between items-center px-2">
              <h3 className="font-black text-slate-800 text-lg">Knowledge Base</h3>
              {filteredDiseases.length > 0 && <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{filteredDiseases.length} Found</p>}
            </div>

            {filteredDiseases.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-slate-100">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4"><Search className="text-slate-300" size={32} /></div>
                <h3 className="text-lg font-bold text-slate-700">No diseases found</h3>
                <p className="text-slate-500 mt-1">Try adjusting your search terms or category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredDiseases.map((disease: any) => (
                  <Card key={disease.id} className="rounded-3xl overflow-hidden shadow-sm border-none bg-white cursor-pointer hover:-translate-y-1 hover:shadow-xl transition-all group" onClick={() => setSelectedDisease(disease)}>
                    <div className="h-40 relative bg-slate-100 overflow-hidden">
                      <LazyImage src={disease.img} alt={disease.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent pointer-events-none" />
                      <span className="absolute top-4 left-4 text-xs bg-white/90 backdrop-blur-sm text-slate-800 px-3 py-1.5 rounded-full font-black uppercase tracking-wider shadow-sm">
                        {disease.category === 'animal' ? '🐄 Animal' : '🌱 Plant'}
                      </span>
                    </div>
                    <CardContent className="p-5">
                      <h4 className="font-black text-slate-800 text-lg leading-tight line-clamp-1">{disease.name}</h4>
                      <p className="text-sm text-emerald-600 font-bold mt-1 line-clamp-1">{disease.nepaliName}</p>
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 line-clamp-1"><Leaf size={12}/> {disease.crop}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- SEASONAL TIPS TAB --- */}
        {tab === 'seasonal' && (
          <div className="space-y-6 pb-8">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-8 rounded-3xl shadow-lg text-white text-center md:text-left flex flex-col md:flex-row items-center gap-6">
              <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center shrink-0 border-2 border-white/20 backdrop-blur-md">
                <CalendarHeart className="text-white" size={36} />
              </div>
              <div>
                <h3 className="text-2xl md:text-3xl font-black">Recommendations for {recommendedThisMonth?.name}</h3>
                <p className="text-emerald-100 text-sm md:text-base mt-2 font-medium">यस महिना नेपालका लागि सुझाव गरिएका बालीहरू</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {!recommendedThisMonth?.crops?.length ? (
                <div className="col-span-full py-20 text-center bg-white rounded-3xl shadow-sm text-slate-500 font-bold">No recommendations available for this month.</div>
              ) : recommendedThisMonth.crops.map((crop: any, idx: number) => (
                <Card key={idx} className="border-none shadow-sm rounded-3xl bg-white overflow-hidden hover:shadow-md transition-shadow group">
                  <CardContent className="p-6 text-center flex flex-col items-center">
                    <div className="w-24 h-24 mb-4 rounded-full overflow-hidden bg-slate-50 shadow-inner p-1 border-2 border-slate-100 group-hover:border-emerald-200 transition-colors">
                      <div className="w-full h-full rounded-full overflow-hidden relative">
                         <LazyImage src={`/assets/crops/${crop.image}`} alt={crop.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                      </div>
                    </div>
                    <p className="font-black text-slate-800 text-lg">{crop.name}</p>
                    <p className="text-xs text-emerald-600 font-bold uppercase tracking-widest mt-1 bg-emerald-50 px-3 py-1 rounded-full">{crop.np}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

      </div>

      {selectedDisease && <DiseaseModal disease={selectedDisease} onClose={() => setSelectedDisease(null)} />}
    </div>
  );
};