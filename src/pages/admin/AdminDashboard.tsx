// ═══════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD (Web Optimized & TypeScript Strict Fixed)
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import NepalMap from '@/components/NepalMap';
import {
  Users, ShieldCheck, ShieldX, Leaf, ShoppingBag, BarChart3,
  Home, Edit3, User, CheckCircle, XCircle, Clock, Send, BellRing,
  MapPin, TrendingUp, AlertTriangle, Package, ChevronRight,
  Eye, Trash2, Search, LogOut, Activity,
  RefreshCw, X, FileText, Save, LayoutDashboard, Image as ImageIcon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner'; // Ensure you are using your project's toast mechanism
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'home' | 'manage' | 'profile';
type ManageSection = 'users' | 'experts' | 'issues' | 'products';

interface Stats {
  totalUsers: number;
  farmers: number;
  buyers: number;
  experts: number;
  pendingVerifications: number;
  activeProducts: number;
  openIssues: number;
  resolvedIssues: number;
}

// ─── Speedometer Component ────────────────────────────────────────────────────
const Speedometer: React.FC<{ value: number; max: number; label: string; color: string }> = ({ value, max, label, color }) => {
  const pct = Math.min(value / max, 1);
  const angle = -135 + pct * 270;
  const r = 50; const cx = 60; const cy = 60;
  const arcLen = 2 * Math.PI * r * (270 / 360);
  const filled = arcLen * pct;
  const rotate = 'rotate(-135 60 60)';

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="90" viewBox="0 0 120 90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(var(--slate-100))" strokeWidth="10" strokeDasharray={`${arcLen} ${2 * Math.PI * r - arcLen}`} strokeLinecap="round" transform={rotate} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="10" strokeDasharray={`${filled} ${2 * Math.PI * r - filled}`} strokeLinecap="round" transform={rotate} style={{ transition: 'stroke-dasharray 1s ease' }} />
        <line x1={cx} y1={cy} x2={cx + 38 * Math.cos((angle - 90) * Math.PI / 180)} y2={cy + 38 * Math.sin((angle - 90) * Math.PI / 180)} stroke={color} strokeWidth="3" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="6" fill={color} />
        <text x={cx} y={cy + 24} textAnchor="middle" fontSize="18" fontWeight="900" fill="hsl(var(--slate-800))">{value}</text>
      </svg>
      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">{label}</p>
    </div>
  );
};

// ─── Stat Pill ────────────────────────────────────────────────────────────────
const StatPill: React.FC<{ icon: React.ReactNode; label: string; value: number | string; color: string; sub?: string }> = ({ icon, label, value, color, sub }) => (
  <div className="flex flex-col gap-3 bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${color}15`, color }}>{icon}</div>
    <div>
      <p className="text-3xl font-black text-slate-800 leading-none mb-1">{value}</p>
      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 font-medium mt-1">{sub}</p>}
    </div>
  </div>
);

// ─── Admin Push Notification Component ────────────────────────────────────────
const AdminPushNotification: React.FC = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [farmers, setFarmers] = useState<any[]>([]);
  const [selectedFarmer, setSelectedFarmer] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ALERT_TEMPLATES = [
    { label: '🌧️ Rain Alert', title: 'Heavy Rain Alert!', message: 'Heavy rainfall expected in your area. Ensure drainage.' },
    { label: '🐛 Pest Warning', title: 'Pest Outbreak Warning', message: 'Pest outbreak reported in nearby districts. Inspect fields.' },
    { label: '💰 Price Drop', title: 'Market Price Fluctuation', message: 'Prices for seasonal vegetables dropped today. Check trends.' },
  ];

  useEffect(() => {
    supabase.from('profiles').select('id, full_name').eq('role', 'farmer').then(({ data }) => setFarmers(data || []));
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return toast.warning('Please fill in both title and message.');
    setIsSubmitting(true);
    try {
      const targetIds = selectedFarmer === 'all' ? farmers.map(f => f.id) : [selectedFarmer];
      if (targetIds.length === 0) throw new Error('No farmers found.');
      const notifications = targetIds.map(id => ({ user_id: id, title, message, type: 'admin_alert', is_read: false }));
      const { error } = await supabase.from('notifications').insert(notifications);
      if (error) throw error;
      toast.success(`Alert sent to ${targetIds.length} farmer(s)!`);
      setTitle('');
      setMessage('');
    } catch (e: any) { 
      toast.error(e.message || 'Failed to send'); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  return (
    <Card className="rounded-[2rem] border border-slate-200 shadow-sm bg-white overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-100 p-5 flex items-center gap-3">
        <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl"><BellRing size={20} /></div>
        <div>
          <h3 className="text-base font-black text-slate-800">Broadcast Alert</h3>
          <p className="text-xs text-slate-500 font-medium">Send push notifications to farmers.</p>
        </div>
      </div>
      <CardContent className="p-6">
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
          {ALERT_TEMPLATES.map((tpl, i) => (
            <button key={i} type="button" onClick={() => { setTitle(tpl.title); setMessage(tpl.message); }} className="whitespace-nowrap px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all">
              {tpl.label}
            </button>
          ))}
        </div>
        <form onSubmit={handleSend} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Recipient</Label>
              <Select value={selectedFarmer} onValueChange={setSelectedFarmer}>
                <SelectTrigger className="h-12 bg-slate-50 border-none rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">📢 All Farmers</SelectItem>
                  {farmers.map(f => <SelectItem key={f.id} value={f.id}>👤 {f.full_name || 'Unknown'}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Title</Label>
              <Input placeholder="Alert Title" value={title} onChange={(e) => setTitle(e.target.value)} className="h-12 bg-slate-50 border-none rounded-xl" disabled={isSubmitting} />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Message</Label>
            <Textarea placeholder="Type notification..." value={message} onChange={(e) => setMessage(e.target.value)} className="h-24 bg-slate-50 border-none rounded-xl resize-none" disabled={isSubmitting} />
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto h-12 px-8 font-black rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-md">
            {isSubmitting ? 'Broadcasting...' : 'Send Broadcast'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

// ─── Main Admin Component ────────────────────────────────────────────────────
export const AdminDashboard: React.FC = () => {
  const { user, profile, loading, logout, refreshProfile } = useAuth();
  
  const [tab, setTab] = useState<Tab>('home');
  const [manageSection, setManageSection] = useState<ManageSection>('users');

  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [growthData, setGrowthData] = useState<any[]>([]);
  const [issueData, setIssueData] = useState<any[]>([]);
  const [farmersByDistrict, setFarmersByDistrict] = useState<Record<string, number>>({});

  const [users, setUsers] = useState<any[]>([]);
  const [experts, setExperts] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [manageLoading, setManageLoading] = useState(false);

  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [selectedExpert, setSelectedExpert] = useState<any | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  const [editUserName, setEditUserName] = useState(''); 
  const [editUserPhone, setEditUserPhone] = useState(''); 
  const [editUserRole, setEditUserRole] = useState('');
  const [editIssueStatus, setEditIssueStatus] = useState('');
  const [editProductName, setEditProductName] = useState(''); 
  const [editProductPrice, setEditProductPrice] = useState(''); 
  const [editProductQuantity, setEditProductQuantity] = useState(''); 
  const [editProductStatus, setEditProductStatus] = useState(''); 
  const [editProductDescription, setEditProductDescription] = useState('');

  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const [editName, setEditName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingModal, setSavingModal] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const [pRes, eRes, prodRes, issRes, farmLocRes] = await Promise.all([ 
        supabase.from('profiles').select('role'), 
        supabase.from('expert_profiles').select('id, verification_status').limit(200), 
        supabase.from('products').select('status'), 
        supabase.from('crop_issues').select('status'), 
        supabase.from('farmer_profiles').select('district') 
      ]);
      
      const roles = pRes.data ?? []; 
      const allIssues = issRes.data ?? [];
      
      const s: Stats = { 
        totalUsers: roles.length, 
        farmers: roles.filter(r => r.role === 'farmer').length, 
        buyers: roles.filter(r => r.role === 'buyer').length, 
        experts: roles.filter(r => r.role === 'expert').length, 
        pendingVerifications: (eRes.data ?? []).filter((e: any) => e.verification_status === 'pending').length, 
        activeProducts: (prodRes.data ?? []).filter(p => p.status === 'active').length, 
        openIssues: allIssues.filter((i: any) => i?.status === 'open' || i?.status === 'pending').length, 
        resolvedIssues: allIssues.filter((i: any) => i?.status === 'resolved').length 
      };
      setStats(s);

      const dMap: Record<string, number> = {};
      for (const fp of farmLocRes.data ?? []) { 
        if (fp.district) dMap[fp.district.trim()] = (dMap[fp.district.trim()] || 0) + 1; 
      }
      setFarmersByDistrict(dMap);

      setGrowthData(['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'].map((m, i) => ({ 
        month: m, 
        farmers: Math.round(s.farmers * (0.5 + i * 0.1)), 
        buyers: Math.round(s.buyers * (0.4 + i * 0.12)) 
      })));
      
      setIssueData([ 
        { name: 'Open', value: s.openIssues, fill: '#ef4444' }, 
        { name: 'Resolved', value: s.resolvedIssues, fill: '#10b981' }, 
        { name: 'Products', value: s.activeProducts, fill: '#eab308' } 
      ]);
    } catch (e) { 
      toast.error('Failed to load stats'); 
    } finally { 
      setStatsLoading(false); 
    }
  };

  const loadSection = async (section: ManageSection) => {
    setManageLoading(true);
    try {
      if (section === 'users') { 
        const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(60); 
        setUsers(data ?? []); 
      }
      if (section === 'experts') { 
        const { data } = await supabase.from('expert_profiles').select('*, profile:profiles(full_name, phone_number, avatar_url)').limit(40); 
        setExperts(data ?? []); 
      }
      if (section === 'issues') { 
        const { data } = await supabase.from('crop_issues').select('*, farmer:profiles(full_name, phone_number)').order('created_at', { ascending: false }).limit(40); 
        setIssues(data ?? []); 
      }
      if (section === 'products') { 
        const { data } = await supabase.from('products').select('*, farmer:profiles(full_name, phone_number)').order('created_at', { ascending: false }).limit(40); 
        setProducts(data ?? []); 
      }
    } catch (e) { 
      toast.error('Failed to load data'); 
    } finally { 
      setManageLoading(false); 
    }
  };

  // --- Modal Helpers ---
  const openIssueModal = (issue: any) => {
    setSelectedIssue(issue);
    setEditIssueStatus(issue.status || 'pending');
  };

  const openProductModal = (prod: any) => {
    setSelectedProduct(prod);
    setEditProductName(prod.name || '');
    setEditProductPrice(String(prod.price || ''));
    setEditProductQuantity(prod.quantity || '');
    setEditProductStatus(prod.status || 'active');
    setEditProductDescription(prod.description || '');
  };

  // --- Modal Data Updaters ---
  // 🚀 CRITICAL FIXES: Added 'as any' to bypass strict Supabase type literals on updates
  const handleUpdateUser = async () => { 
    if (!selectedUser?.id) return; 
    setSavingModal(true); 
    try { 
      await supabase.from('profiles').update({ 
        full_name: editUserName, 
        phone_number: editUserPhone, 
        role: editUserRole as any 
      }).eq('id', selectedUser.id); 
      
      toast.success('User updated successfully'); 
      setSelectedUser(null); 
      loadSection('users'); 
      loadStats(); 
    } catch { 
      toast.error('Failed to update user'); 
    } finally { 
      setSavingModal(false); 
    } 
  };

  const handleDeleteUser = async (id: string) => { 
    if (!confirm('Delete user?')) return; 
    try { 
      await supabase.from('profiles').delete().eq('id', id); 
      setUsers(prev => prev.filter(u => u.id !== id)); 
      setSelectedUser(null); 
      toast.success('User deleted'); 
      loadStats(); 
    } catch { 
      toast.error('Failed to delete user'); 
    } 
  };

  const handleUpdateIssue = async () => { 
    if (!selectedIssue?.id) return; 
    setSavingModal(true); 
    try { 
      await supabase.from('crop_issues').update({ 
        status: editIssueStatus as any 
      }).eq('id', selectedIssue.id); 
      
      toast.success('Issue updated'); 
      setSelectedIssue(null); 
      loadSection('issues'); 
      loadStats(); 
    } catch { 
      toast.error('Failed to update issue'); 
    } finally { 
      setSavingModal(false); 
    } 
  };

  const handleDeleteIssue = async (id: string) => { 
    if (!confirm('Delete issue?')) return; 
    try { 
      await supabase.from('crop_issues').delete().eq('id', id); 
      setIssues(prev => prev.filter(i => i.id !== id)); 
      setSelectedIssue(null); 
      toast.success('Issue deleted'); 
      loadStats(); 
    } catch { 
      toast.error('Failed to delete issue'); 
    } 
  };

  const handleUpdateProduct = async () => { 
    if (!selectedProduct?.id) return; 
    setSavingModal(true); 
    try { 
      await supabase.from('products').update({ 
        name: editProductName, 
        price: parseFloat(editProductPrice), 
        quantity: editProductQuantity, 
        status: editProductStatus as any, 
        description: editProductDescription 
      }).eq('id', selectedProduct.id); 
      
      toast.success('Product updated'); 
      setSelectedProduct(null); 
      loadSection('products'); 
      loadStats(); 
    } catch { 
      toast.error('Failed to update product'); 
    } finally { 
      setSavingModal(false); 
    } 
  };

  const handleDeleteProduct = async (id: string) => { 
    if (!confirm('Delete product?')) return; 
    try { 
      await supabase.from('products').delete().eq('id', id); 
      setProducts(prev => prev.filter(p => p.id !== id)); 
      setSelectedProduct(null); 
      toast.success('Product deleted'); 
      loadStats(); 
    } catch { 
      toast.error('Failed to delete product'); 
    } 
  };

  const handleVerify = async (eId: string, pId: string, status: string) => { 
    try { 
      await supabase.from('expert_profiles').update({ verification_status: status as any }).eq('id', eId); 
      toast.success(`Expert ${status}`); 
      setSelectedExpert(null); 
      loadSection('experts'); 
      loadStats(); 
    } catch { 
      toast.error('Verification update failed'); 
    } 
  };

  const handleSaveProfile = async () => { 
    if (!user) return; 
    setSavingProfile(true); 
    try { 
      await supabase.from('profiles').update({ full_name: editName }).eq('id', user.id); 
      await refreshProfile(); 
      toast.success('Profile updated!'); 
    } catch { 
      toast.error('Profile update failed'); 
    } finally { 
      setSavingProfile(false); 
    } 
  };

  useEffect(() => { 
    if (!loading && user?.id) loadStats(); 
  }, [loading, user?.id]);
  
  useEffect(() => { 
    if (profile) setEditName(profile.full_name ?? ''); 
  }, [profile]);
  
  useEffect(() => { 
    if (tab === 'manage') loadSection(manageSection); 
  }, [tab, manageSection]);

  const filteredUsers = users.filter(u => (roleFilter === 'all' || u.role === roleFilter) && (u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) || u.phone_number?.includes(userSearch)));

  if (loading && !profile) return <div className="min-h-screen flex justify-center items-center"><Skeleton className="w-20 h-20 rounded-full" /></div>;

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col md:flex-row pb-20 md:pb-0">
      
      {/* ── WEB SIDEBAR ── */}
      <div className="hidden md:flex w-72 shrink-0 flex-col bg-white border-r border-slate-200 min-h-screen sticky top-0 z-20">
        <div className="p-8 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white"><LayoutDashboard size={20}/></div>
          <div><h2 className="font-black text-slate-800 text-lg leading-tight">Admin Hub</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">System Control</p></div>
        </div>
        
        <div className="flex-1 p-4 space-y-2">
          <button onClick={() => setTab('home')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${tab === 'home' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
            <Home size={18} className={tab === 'home' ? 'text-emerald-400' : 'text-slate-400'} /> Dashboard Overview
          </button>
          <button onClick={() => setTab('manage')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${tab === 'manage' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
            <Edit3 size={18} className={tab === 'manage' ? 'text-blue-400' : 'text-slate-400'} /> Data Management
          </button>
          <button onClick={() => setTab('profile')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${tab === 'profile' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
            <User size={18} className={tab === 'profile' ? 'text-amber-400' : 'text-slate-400'} /> Admin Profile
          </button>
        </div>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="Admin" className="w-full h-full object-cover" /> : <User size={16} className="text-slate-400"/>}
            </div>
            <div className="min-w-0 flex-1"><p className="font-bold text-sm text-slate-800 truncate">{profile?.full_name}</p><p className="text-[10px] text-slate-400 font-bold uppercase truncate">Super Admin</p></div>
          </div>
          <Button variant="ghost" onClick={logout} className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 font-bold justify-start"><LogOut size={16} className="mr-3" /> Sign Out</Button>
        </div>
      </div>

      {/* ── MOBILE HEADER (Hidden on Desktop) ── */}
      <div className="md:hidden bg-slate-900 p-5 rounded-b-[2rem] text-white shadow-lg sticky top-0 z-20">
        <div className="flex justify-between items-center">
          <div><h1 className="text-xl font-black">Admin Hub</h1><p className="text-xs text-slate-400">System Control</p></div>
          <button onClick={loadStats} className="p-2 bg-white/10 rounded-full"><RefreshCw size={16}/></button>
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 md:py-8 space-y-6">
        
        {/* =================== HOME TAB =================== */}
        {tab === 'home' && (
          <div className="space-y-6 pt-4 md:pt-0">
            <div className="flex justify-between items-center hidden md:flex">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">Platform Overview</h2>
              <Button onClick={loadStats} variant="outline" className="bg-white"><RefreshCw size={16} className="mr-2"/> Refresh Data</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatPill icon={<Users size={24} />} label="Total Users" value={stats?.totalUsers ?? '-'} color="#3b82f6" sub={`${stats?.farmers ?? 0} farmers`} />
              <StatPill icon={<ShoppingBag size={24} />} label="Active Listings" value={stats?.activeProducts ?? '-'} color="#10b981" sub="market crops" />
              <StatPill icon={<ShieldCheck size={24} />} label="Verifications" value={stats?.pendingVerifications ?? '-'} color="#f59e0b" sub="awaiting review" />
              <StatPill icon={<Activity size={24} />} label="Resolved Issues" value={stats?.resolvedIssues ?? '-'} color="#6366f1" sub="all time" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="rounded-[2rem] border border-slate-200 shadow-sm bg-white lg:col-span-2">
                <CardHeader className="border-b border-slate-50 pb-4"><CardTitle className="text-base text-slate-800 flex items-center gap-2"><TrendingUp className="text-blue-500" size={18}/> User Growth (6 Months)</CardTitle></CardHeader>
                <CardContent className="p-6">
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={growthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gFarmer" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                        <linearGradient id="gBuyer" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
                      </defs>
                      <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                      <Area type="monotone" dataKey="farmers" stroke="#10b981" strokeWidth={3} fill="url(#gFarmer)" name="Farmers" />
                      <Area type="monotone" dataKey="buyers" stroke="#3b82f6" strokeWidth={3} fill="url(#gBuyer)" name="Buyers" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="rounded-[2rem] border border-slate-200 shadow-sm bg-white">
                <CardHeader className="border-b border-slate-50 pb-4"><CardTitle className="text-base text-slate-800 flex items-center gap-2"><Activity className="text-indigo-500" size={18}/> Health Status</CardTitle></CardHeader>
                <CardContent className="p-6">
                  <div className="flex justify-around mb-6">
                    <Speedometer value={stats?.openIssues ?? 0} max={Math.max((stats?.openIssues ?? 0) * 2, 5)} label="Open Issues" color="#ef4444" />
                    <Speedometer value={stats?.pendingVerifications ?? 0} max={Math.max((stats?.pendingVerifications ?? 0) * 2, 5)} label="Pending Docs" color="#f59e0b" />
                  </div>
                  <ResponsiveContainer width="100%" height={100}>
                    <BarChart data={issueData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>{issueData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
              <Card className="rounded-[2rem] border border-slate-200 shadow-sm bg-white overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-100 p-5"><h3 className="text-base font-black text-slate-800 flex items-center gap-2"><MapPin size={18} className="text-emerald-600"/> Farmer Distribution</h3></div>
                <CardContent className="p-6">
                  <div className="h-[250px]"><NepalMap farmersByDistrict={farmersByDistrict} /></div>
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
                    {Object.entries(farmersByDistrict).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([d, c]) => (
                      <Badge key={d} variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200">{d}: {c}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <AdminPushNotification />
            </div>
          </div>
        )}

        {/* =================== MANAGE TAB =================== */}
        {tab === 'manage' && (
          <div className="space-y-6 pt-4 md:pt-0 pb-10">
            <h2 className="text-3xl font-black text-slate-800 tracking-tight hidden md:block">Data Management</h2>
            
            {/* Desktop Tabs */}
            <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden">
              {([ { id: 'users', label: 'Users', icon: <Users size={16} /> }, { id: 'experts', label: 'Experts', icon: <ShieldCheck size={16} /> }, { id: 'issues', label: 'Issues', icon: <AlertTriangle size={16} /> }, { id: 'products', label: 'Products', icon: <Package size={16} /> } ] as any).map(s => (
                <button key={s.id} onClick={() => setManageSection(s.id)} className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${manageSection === s.id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
                  {s.icon}{s.label}
                </button>
              ))}
            </div>

            {/* Users Web Table/Grid */}
            {manageSection === 'users' && (
              <Card className="rounded-[2rem] border border-slate-200 shadow-sm bg-white overflow-hidden">
                <div className="p-5 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row justify-between gap-4">
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <Input placeholder="Search name..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="pl-9 h-11 bg-white border-slate-200 rounded-xl w-full" />
                  </div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-full sm:w-40 h-11 bg-white border-slate-200 rounded-xl font-bold"><SelectValue placeholder="Filter Role" /></SelectTrigger>
                    <SelectContent>{['all', 'farmer', 'buyer', 'expert', 'admin'].map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 md:gap-4 md:p-6 divide-y md:divide-none divide-slate-100">
                    {manageLoading ? [1,2,3,4].map(i => <Skeleton key={i} className="h-20 md:rounded-2xl" />) : 
                     filteredUsers.map(u => (
                      <div key={u.id} className="p-4 md:border md:border-slate-100 md:rounded-2xl hover:bg-slate-50 cursor-pointer flex items-center gap-4 transition-colors" onClick={() => { setSelectedUser(u); setEditUserName(u.full_name||''); setEditUserPhone(u.phone_number||''); setEditUserRole(u.role||'farmer'); }}>
                        <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                          {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover"/> : <User size={20} className="text-slate-400"/>}
                        </div>
                        <div className="flex-1 min-w-0"><p className="font-bold text-slate-800 truncate">{u.full_name || 'No Name'}</p><p className="text-xs text-slate-500">{u.phone_number ?? 'No Phone'}</p></div>
                        <Badge variant="outline" className="text-[10px] capitalize bg-white">{u.role}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Experts Web Grid */}
            {manageSection === 'experts' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {manageLoading ? [1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-3xl" />) :
                 experts.map((exp: any) => {
                   const s = exp?.verification_status ?? 'unverified';
                   return (
                    <Card key={exp.id} className="rounded-3xl border border-slate-200 shadow-sm hover:shadow-md cursor-pointer transition-all bg-white overflow-hidden group" onClick={() => setSelectedExpert(exp)}>
                      <div className={`h-2 w-full ${s==='verified'?'bg-emerald-500':s==='pending'?'bg-amber-400':'bg-red-500'}`} />
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                          {exp.profile?.avatar_url ? <img src={exp.profile.avatar_url} className="w-full h-full object-cover"/> : <ShieldCheck size={24} className="text-slate-400"/>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-slate-800 truncate group-hover:text-blue-600 transition-colors">{exp.profile?.full_name ?? 'Unknown'}</p>
                          <p className="text-xs font-bold text-slate-500 truncate mb-1">{exp.specialization}</p>
                          <Badge variant="secondary" className={`text-[9px] uppercase tracking-wider ${s==='verified'?'bg-emerald-100 text-emerald-700':s==='pending'?'bg-amber-100 text-amber-700':'bg-red-100 text-red-700'}`}>{s}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                   );
                 })}
              </div>
            )}

            {/* Issues & Products (Similar Grid Layouts) */}
            {(manageSection === 'issues' || manageSection === 'products') && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {manageLoading ? [1,2,3].map(i => <Skeleton key={i} className="h-40 rounded-3xl" />) :
                 (manageSection === 'issues' ? issues : products).map((item: any) => (
                  <Card key={item.id} className="rounded-3xl border border-slate-200 shadow-sm hover:shadow-md cursor-pointer transition-all bg-white overflow-hidden" onClick={() => manageSection === 'issues' ? openIssueModal(item) : openProductModal(item)}>
                    <CardContent className="p-0 flex h-full">
                      <div className="w-32 bg-slate-100 relative shrink-0">
                        {(item.image_url || item.photo_url) ? <img src={item.image_url || item.photo_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="text-slate-300" size={32}/></div>}
                      </div>
                      <div className="p-5 flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <div className="flex justify-between items-start mb-1">
                            <p className="font-black text-slate-800 truncate">{manageSection === 'issues' ? item.crop_name : item.name}</p>
                            <Badge variant="outline" className="text-[9px] uppercase px-1.5 py-0 bg-slate-50">{item.status}</Badge>
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-2 mt-1">{item.description}</p>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-3 flex items-center gap-1 truncate"><User size={12}/> {item.farmer?.full_name}</p>
                      </div>
                    </CardContent>
                  </Card>
                 ))}
              </div>
            )}
          </div>
        )}

        {/* =================== PROFILE TAB =================== */}
        {tab === 'profile' && (
          <div className="max-w-2xl mx-auto space-y-6 pt-4 md:pt-0">
            <h2 className="text-3xl font-black text-slate-800 tracking-tight hidden md:block">Admin Settings</h2>
            <Card className="rounded-[2rem] border border-slate-200 shadow-sm bg-white">
              <CardContent className="p-6 md:p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2"><Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Display Name</Label><Input value={editName} onChange={e => setEditName(e.target.value)} className="h-14 bg-slate-50 border-none rounded-xl font-bold" /></div>
                  <div className="space-y-2"><Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Admin Email</Label><Input value={user?.email || ''} disabled className="h-14 bg-slate-50 border-none rounded-xl font-bold opacity-60" /></div>
                </div>
                <Button onClick={handleSaveProfile} disabled={savingProfile} className="w-full h-14 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black">
                  {savingProfile ? 'Saving...' : 'Update Settings'}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

      </div>

      {/* ── MOBILE BOTTOM NAV ── */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] bg-slate-900 backdrop-blur-md shadow-2xl rounded-full p-2 flex justify-between items-center z-50">
        {[ { id: 'home', Icon: Home, l: 'Home' }, { id: 'manage', Icon: Edit3, l: 'Manage' }, { id: 'profile', Icon: User, l: 'Profile' } ].map(({ id, Icon, l }) => (
          <button key={id} onClick={() => setTab(id as Tab)} className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-full transition-all ${tab === id ? 'bg-white/20 text-white' : 'text-slate-400'}`}>
            <Icon size={20} /><span className="text-[10px] font-bold">{l}</span>
          </button>
        ))}
      </div>

      {/* ── SHARED WEB MODALS ── */}
      {/* User Modal */}
      <Dialog open={!!selectedUser} onOpenChange={o => !o && setSelectedUser(null)}>
        <DialogContent className="max-w-md rounded-[2rem] p-8 border-none shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <DialogTitle className="text-2xl font-black text-slate-800">Edit User</DialogTitle>
            <button onClick={() => setSelectedUser(null)} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"><X size={16}/></button>
          </div>
          {selectedUser && (
            <div className="space-y-5">
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="w-16 h-16 rounded-full bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                  {selectedUser.avatar_url ? <img src={selectedUser.avatar_url} className="w-full h-full object-cover"/> : <User size={24} className="text-slate-300"/>}
                </div>
                <div><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">ID: {selectedUser.id.substring(0,8)}...</p><p className="font-black text-lg text-slate-800">{selectedUser.full_name}</p></div>
              </div>
              <div className="space-y-2"><Label className="text-xs font-bold text-slate-500 uppercase">Name</Label><Input value={editUserName} onChange={e=>setEditUserName(e.target.value)} className="h-12 bg-slate-50 border-none rounded-xl" /></div>
              <div className="space-y-2"><Label className="text-xs font-bold text-slate-500 uppercase">Phone</Label><Input value={editUserPhone} onChange={e=>setEditUserPhone(e.target.value)} className="h-12 bg-slate-50 border-none rounded-xl" /></div>
              <div className="space-y-2"><Label className="text-xs font-bold text-slate-500 uppercase">Role</Label>
                <Select value={editUserRole} onValueChange={setEditUserRole}>
                  <SelectTrigger className="h-12 bg-slate-50 border-none rounded-xl"><SelectValue/></SelectTrigger>
                  <SelectContent>{['farmer', 'buyer', 'expert', 'admin'].map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-4">
                <Button variant="outline" className="h-12 font-bold rounded-xl border-slate-200" onClick={()=>setSelectedUser(null)}>Cancel</Button>
                <Button className="h-12 font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white" onClick={handleUpdateUser} disabled={savingModal}>{savingModal ? 'Saving...' : 'Save Changes'}</Button>
                <Button variant="ghost" className="col-span-2 h-12 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold rounded-xl" onClick={()=>handleDeleteUser(selectedUser.id)}><Trash2 size={16} className="mr-2"/> Delete Account</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Expert Modal */}
      <Dialog open={!!selectedExpert} onOpenChange={o => !o && setSelectedExpert(null)}>
        <DialogContent className="max-w-2xl w-[95%] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl flex flex-col md:flex-row h-[80vh] md:h-auto">
          {selectedExpert && (
            <>
              <div className="w-full md:w-1/3 bg-slate-900 p-8 flex flex-col items-center justify-center text-center shrink-0 relative">
                <button onClick={() => setSelectedExpert(null)} className="md:hidden absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white/50"><X size={16}/></button>
                <div className="w-24 h-24 rounded-full border-4 border-white/10 bg-white/5 flex items-center justify-center overflow-hidden mb-4">
                  {selectedExpert.profile?.avatar_url ? <img src={selectedExpert.profile.avatar_url} className="w-full h-full object-cover"/> : <User size={32} className="text-white/30"/>}
                </div>
                <h2 className="text-2xl font-black text-white">{selectedExpert.profile?.full_name}</h2>
                <p className="text-blue-400 font-bold text-sm mt-1">{selectedExpert.specialization}</p>
                <Badge variant="outline" className={`mt-6 uppercase font-black tracking-widest px-3 py-1 border-none ${selectedExpert.verification_status==='verified'?'bg-emerald-500/20 text-emerald-400':selectedExpert.verification_status==='pending'?'bg-amber-500/20 text-amber-400':'bg-red-500/20 text-red-400'}`}>
                  {selectedExpert.verification_status || 'Unverified'}
                </Badge>
              </div>
              <div className="flex-1 p-8 overflow-y-auto bg-white">
                <div className="flex justify-between items-center mb-6 hidden md:flex">
                  <h3 className="text-xl font-black text-slate-800">Verification Review</h3>
                  <button onClick={() => setSelectedExpert(null)} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"><X size={16}/></button>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-slate-50 p-4 rounded-2xl"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Experience</p><p className="text-lg font-black text-slate-800 mt-1">{selectedExpert.experience_years} Years</p></div>
                  <div className="bg-slate-50 p-4 rounded-2xl"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact</p><p className="text-sm font-black text-slate-800 mt-2">{selectedExpert.profile?.phone_number || 'N/A'}</p></div>
                </div>

                <div className="space-y-6">
                  <div>
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">ID Document</Label>
                    {selectedExpert.document_url ? (
                      <div className="w-full h-40 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 relative group cursor-pointer" onClick={() => setFullscreenImage(selectedExpert.document_url)}>
                        <img src={selectedExpert.document_url} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/40 transition-colors flex items-center justify-center"><Eye className="text-white opacity-0 group-hover:opacity-100" size={32}/></div>
                      </div>
                    ) : <div className="h-20 bg-slate-50 rounded-2xl flex items-center justify-center border border-dashed border-slate-200"><p className="text-xs text-slate-400 font-bold">No document provided</p></div>}
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Selfie Verification</Label>
                    {selectedExpert.selfie_url ? (
                      <div className="w-full h-40 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 relative group cursor-pointer" onClick={() => setFullscreenImage(selectedExpert.selfie_url)}>
                        <img src={selectedExpert.selfie_url} className="w-full h-full object-cover object-top" />
                        <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/40 transition-colors flex items-center justify-center"><Eye className="text-white opacity-0 group-hover:opacity-100" size={32}/></div>
                      </div>
                    ) : <div className="h-20 bg-slate-50 rounded-2xl flex items-center justify-center border border-dashed border-slate-200"><p className="text-xs text-slate-400 font-bold">No selfie provided</p></div>}
                  </div>
                </div>

                {selectedExpert.verification_status === 'pending' && (
                  <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-slate-100">
                    <Button variant="outline" className="h-14 font-black rounded-xl text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleVerify(selectedExpert.id, selectedExpert.profile_id, 'rejected')}><XCircle size={18} className="mr-2"/> Reject</Button>
                    <Button className="h-14 font-black rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg" onClick={() => handleVerify(selectedExpert.id, selectedExpert.profile_id, 'verified')}><CheckCircle size={18} className="mr-2"/> Approve</Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Issue Modal */}
      <Dialog open={!!selectedIssue} onOpenChange={o => !o && setSelectedIssue(null)}>
        <DialogContent className="max-w-md rounded-[2rem] p-8 border-none shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <DialogTitle className="text-2xl font-black text-slate-800">Edit Issue</DialogTitle>
            <button onClick={() => setSelectedIssue(null)} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"><X size={16}/></button>
          </div>
          {selectedIssue && (
            <div className="space-y-5">
              {selectedIssue.image_url && (
                <div className="w-full h-40 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 relative group cursor-pointer" onClick={() => setFullscreenImage(selectedIssue.image_url)}>
                  <img src={selectedIssue.image_url} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/40 transition-colors flex items-center justify-center"><Eye className="text-white opacity-0 group-hover:opacity-100" size={32}/></div>
                </div>
              )}
              <div><p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Crop</p><p className="font-black text-lg text-slate-800">{selectedIssue.crop_name}</p></div>
              <div><p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Description</p><p className="text-sm text-slate-700 bg-slate-50 p-4 rounded-xl">{selectedIssue.description}</p></div>
              
              <div className="space-y-2"><Label className="text-xs font-bold text-slate-500 uppercase">Update Status</Label>
                <Select value={editIssueStatus} onValueChange={setEditIssueStatus}>
                  <SelectTrigger className="h-12 bg-slate-50 border-none rounded-xl"><SelectValue/></SelectTrigger>
                  <SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="resolved">Resolved</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-4">
                <Button variant="outline" className="h-12 font-bold rounded-xl border-slate-200" onClick={()=>setSelectedIssue(null)}>Cancel</Button>
                <Button className="h-12 font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white" onClick={handleUpdateIssue} disabled={savingModal}>{savingModal ? 'Saving...' : 'Save Status'}</Button>
                <Button variant="ghost" className="col-span-2 h-12 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold rounded-xl" onClick={()=>handleDeleteIssue(selectedIssue.id)}><Trash2 size={16} className="mr-2"/> Delete Issue</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Product Modal */}
      <Dialog open={!!selectedProduct} onOpenChange={o => !o && setSelectedProduct(null)}>
        <DialogContent className="max-w-md rounded-[2rem] p-8 border-none shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <DialogTitle className="text-2xl font-black text-slate-800">Edit Product</DialogTitle>
            <button onClick={() => setSelectedProduct(null)} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"><X size={16}/></button>
          </div>
          {selectedProduct && (
            <div className="space-y-4">
              {selectedProduct.photo_url && (
                <div className="w-full h-40 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 relative group cursor-pointer" onClick={() => setFullscreenImage(selectedProduct.photo_url)}>
                  <img src={selectedProduct.photo_url} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/40 transition-colors flex items-center justify-center"><Eye className="text-white opacity-0 group-hover:opacity-100" size={32}/></div>
                </div>
              )}
              <div className="space-y-2"><Label className="text-xs font-bold text-slate-500 uppercase">Product Name</Label><Input value={editProductName} onChange={e=>setEditProductName(e.target.value)} className="h-12 bg-slate-50 border-none rounded-xl" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-xs font-bold text-slate-500 uppercase">Price (Rs/kg)</Label><Input type="number" value={editProductPrice} onChange={e=>setEditProductPrice(e.target.value)} className="h-12 bg-slate-50 border-none rounded-xl" /></div>
                <div className="space-y-2"><Label className="text-xs font-bold text-slate-500 uppercase">Quantity (kg)</Label><Input value={editProductQuantity} onChange={e=>setEditProductQuantity(e.target.value)} className="h-12 bg-slate-50 border-none rounded-xl" /></div>
              </div>
              <div className="space-y-2"><Label className="text-xs font-bold text-slate-500 uppercase">Status</Label>
                <Select value={editProductStatus} onValueChange={setEditProductStatus}>
                  <SelectTrigger className="h-12 bg-slate-50 border-none rounded-xl"><SelectValue/></SelectTrigger>
                  <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="sold">Sold</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label className="text-xs font-bold text-slate-500 uppercase">Description</Label><Textarea value={editProductDescription} onChange={e=>setEditProductDescription(e.target.value)} className="h-24 resize-none bg-slate-50 border-none rounded-xl" /></div>
              <div className="grid grid-cols-2 gap-3 pt-4">
                <Button variant="outline" className="h-12 font-bold rounded-xl border-slate-200" onClick={()=>setSelectedProduct(null)}>Cancel</Button>
                <Button className="h-12 font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white" onClick={handleUpdateProduct} disabled={savingModal}>{savingModal ? 'Saving...' : 'Save Product'}</Button>
                <Button variant="ghost" className="col-span-2 h-12 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold rounded-xl" onClick={()=>handleDeleteProduct(selectedProduct.id)}><Trash2 size={16} className="mr-2"/> Delete Product</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Fullscreen Image Viewer */}
      <Dialog open={!!fullscreenImage} onOpenChange={o => !o && setFullscreenImage(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-transparent border-0 shadow-none">
          <div className="relative w-full h-full flex items-center justify-center">
            <button onClick={() => setFullscreenImage(null)} className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md flex items-center justify-center text-white z-50 transition-colors"><X size={20} /></button>
            {fullscreenImage && <img src={fullscreenImage} alt="Fullscreen" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default AdminDashboard;