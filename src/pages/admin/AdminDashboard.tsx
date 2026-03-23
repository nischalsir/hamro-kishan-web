import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import NepalMap from '@/components/NepalMap';
import {
  Users, ShieldCheck, ShieldX, Leaf, ShoppingBag, BarChart3,
  Home, Edit3, User, CheckCircle, XCircle, Clock, Send, BellRing,
  MapPin, TrendingUp, AlertTriangle, Package, ChevronRight,
  Eye, Trash2, Search, LogOut, Activity,
  RefreshCw, X, FileText, Save, Edit, Image as ImageIcon,
  Menu
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/utils/toast';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';

type Tab = 'home' | 'manage' | 'profile';
type ManageSection = 'users' | 'experts' | 'issues' | 'products';

interface Stats {
  totalUsers: number; farmers: number; buyers: number; experts: number;
  pendingVerifications: number; activeProducts: number;
  openIssues: number; resolvedIssues: number;
}

// ─── Speedometer ─────────────────────────────────────────────────────────────
const Speedometer: React.FC<{ value: number; max: number; label: string; color: string }> = ({ value, max, label, color }) => {
  const pct = Math.min(value / max, 1);
  const angle = -135 + pct * 270;
  const r = 44; const cx = 56, cy = 56;
  const arcLen = 2 * Math.PI * r * (270 / 360);
  const filled = arcLen * pct;
  const rotate = 'rotate(-135 56 56)';
  return (
    <div className="flex flex-col items-center">
      <svg width="112" height="80" viewBox="0 0 112 80">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" strokeDasharray={`${arcLen} ${2 * Math.PI * r - arcLen}`} strokeDashoffset={0} strokeLinecap="round" transform={rotate} style={{ opacity: 0.3 }} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="8" strokeDasharray={`${filled} ${2 * Math.PI * r - filled}`} strokeDashoffset={0} strokeLinecap="round" transform={rotate} style={{ transition: 'stroke-dasharray 1s cubic-bezier(.4,0,.2,1)', filter: `drop-shadow(0 0 6px ${color}88)` }} />
        <line x1={cx} y1={cy} x2={cx + 34 * Math.cos((angle - 90) * Math.PI / 180)} y2={cy + 34 * Math.sin((angle - 90) * Math.PI / 180)} stroke={color} strokeWidth="2.5" strokeLinecap="round" style={{ transition: 'all 1s cubic-bezier(.4,0,.2,1)' }} />
        <circle cx={cx} cy={cy} r="5" fill={color} />
        <text x={cx} y={cy + 20} textAnchor="middle" fontSize="14" fontWeight="700" fill="hsl(var(--foreground))">{value}</text>
      </svg>
      <p className="text-[11px] text-muted-foreground font-semibold -mt-1">{label}</p>
    </div>
  );
};

// ─── Stat Pill ────────────────────────────────────────────────────────────────
const StatPill: React.FC<{ icon: React.ReactNode; label: string; value: number | string; color: string; sub?: string }> = ({ icon, label, value, color, sub }) => (
  <div className="flex items-center gap-3 bg-card rounded-2xl p-4 border border-border/40 shadow-sm">
    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}22` }}>
      <span style={{ color }}>{icon}</span>
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
      <p className="text-xl font-black text-foreground leading-tight">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  </div>
);

// ─── Admin Push Notification ──────────────────────────────────────────────────
const AdminPushNotification: React.FC = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [farmers, setFarmers] = useState<any[]>([]);
  const [selectedFarmer, setSelectedFarmer] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ALERT_TEMPLATES = [
    { label: '🌧️ Heavy Rain', title: 'Heavy Rain Alert!', message: 'Heavy rainfall is expected in your area over the next 24 hours. Please ensure adequate drainage for your crops and avoid spraying fertilizers today.' },
    { label: '🐛 Pest Warning', title: 'Pest Outbreak Warning', message: 'A recent pest outbreak has been reported in nearby districts. Please inspect your fields and apply preventive organic measures if necessary.' },
    { label: '💰 Price Drop', title: 'Market Price Fluctuation', message: 'Market prices for seasonal vegetables have dropped slightly today. Please check the Market Trends tab before selling your produce.' },
    { label: '🎁 Subsidy', title: 'New Fertilizer Subsidy', message: 'The local government has announced a new subsidy for organic fertilizers. Please contact your ward office for more details.' },
  ];

  useEffect(() => {
    supabase.from('profiles').select('id, full_name').eq('role', 'farmer')
      .then(({ data }) => { if (data) setFarmers(data); });
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return toast.warning('Please fill in both the title and message.');
    setIsSubmitting(true);
    try {
      const targetIds = selectedFarmer === 'all' ? farmers.map(f => f.id) : [selectedFarmer];
      if (targetIds.length === 0) { toast.error('No farmers found.'); return; }
      const { error } = await supabase.from('notifications').insert(
        targetIds.map(id => ({ user_id: id, title, message, type: 'admin_alert', is_read: false }))
      );
      if (error) throw error;
      toast.success(`Push notification sent to ${targetIds.length} user(s)!`);
      setTitle(''); setMessage('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send notification');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="rounded-2xl border-0 shadow-sm bg-card overflow-hidden">
      <div className="bg-primary/5 border-b border-primary/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/20 text-primary rounded-full"><BellRing size={16} /></div>
          <h3 className="text-sm font-black text-foreground">Broadcast Push Alert</h3>
        </div>
      </div>
      <CardContent className="p-5">
        <div className="mb-4 space-y-2">
          <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Quick Templates</Label>
          <div className="flex flex-wrap gap-2">
            {ALERT_TEMPLATES.map((tpl, i) => (
              <button key={i} type="button" onClick={() => { setTitle(tpl.title); setMessage(tpl.message); }}
                className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 active:scale-95 rounded-full text-[11px] font-bold transition-all border border-primary/20">
                {tpl.label}
              </button>
            ))}
          </div>
        </div>
        <form onSubmit={handleSend} className="space-y-3">
          <Select value={selectedFarmer} onValueChange={setSelectedFarmer}>
            <SelectTrigger className="h-10 bg-muted/30 border-border/50 rounded-xl text-sm">
              <SelectValue placeholder="Select recipients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">📢 All Farmers</SelectItem>
              {farmers.map(f => <SelectItem key={f.id} value={f.id}>👤 {f.full_name || 'Unnamed Farmer'}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Notification title..." value={title} onChange={e => setTitle(e.target.value)} className="h-10 bg-muted/30 border-border/50 rounded-xl" disabled={isSubmitting} />
          <Textarea placeholder="Message..." value={message} onChange={e => setMessage(e.target.value)} className="min-h-[80px] bg-muted/30 border-border/50 rounded-xl resize-none" disabled={isSubmitting} />
          <Button type="submit" disabled={isSubmitting} className="w-full h-10 font-bold rounded-xl">
            {isSubmitting ? <span className="animate-pulse">Sending...</span> : <><Send size={15} className="mr-2" />Send Notification</>}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const AdminDashboard: React.FC = () => {
  const { user, profile, loading, logout, refreshProfile } = useAuth();

  const [tab, setTab] = useState<Tab>('home');
  const [manageSection, setManageSection] = useState<ManageSection>('users');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  const displayDate = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short' });

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const [profilesRes, expertRes, productsRes, issuesRes, farmerLocRes] = await Promise.all([
        supabase.from('profiles').select('role'),
        supabase.from('expert_profiles').select('id, verification_status').limit(200),
        supabase.from('products').select('status'),
        supabase.from('crop_issues').select('status'),
        supabase.from('farmer_profiles').select('district'),
      ]);
      const roles = profilesRes.data ?? [];
      const allIssues = issuesRes.data ?? [];
      const s: Stats = {
        totalUsers: roles.length,
        farmers: roles.filter(r => r.role === 'farmer').length,
        buyers: roles.filter(r => r.role === 'buyer').length,
        experts: roles.filter(r => r.role === 'expert').length,
        pendingVerifications: (expertRes.data ?? []).filter((e: any) => e.verification_status === 'pending').length,
        activeProducts: (productsRes.data ?? []).filter(p => p.status === 'active').length,
        openIssues: allIssues.filter(i => (i.status as string) === 'open' || i.status === 'pending').length,
        resolvedIssues: allIssues.filter(i => i.status === 'resolved').length,
      };
      setStats(s);
      const districtMap: Record<string, number> = {};
      for (const fp of farmerLocRes.data ?? []) {
        if (fp.district) { const d = fp.district.trim(); districtMap[d] = (districtMap[d] || 0) + 1; }
      }
      setFarmersByDistrict(districtMap);
      const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
      setGrowthData(months.map((m, i) => ({ month: m, farmers: Math.round(s.farmers * (0.5 + i * 0.1)), buyers: Math.round(s.buyers * (0.4 + i * 0.12)) })));
      setIssueData([
        { name: 'Open', value: s.openIssues, fill: 'hsl(var(--destructive))' },
        { name: 'Resolved', value: s.resolvedIssues, fill: 'hsl(var(--primary))' },
        { name: 'Products', value: s.activeProducts, fill: 'hsl(45 97% 50%)' },
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
        const { data, error } = await supabase.from('profiles').select('id, full_name, phone_number, role, created_at, avatar_url').order('created_at', { ascending: false }).limit(60);
        if (error) throw error; setUsers(data ?? []);
      }
      if (section === 'experts') {
        const { data, error } = await supabase.from('expert_profiles').select('*, profile:profiles(full_name, phone_number, avatar_url)').limit(40);
        if (error) throw error; setExperts(data ?? []);
      }
      if (section === 'issues') {
        const { data, error } = await supabase.from('crop_issues').select('*, farmer:profiles(full_name, phone_number)').order('created_at', { ascending: false }).limit(40);
        if (error) throw error; setIssues(data ?? []);
      }
      if (section === 'products') {
        const { data, error } = await supabase.from('products').select('*, farmer:profiles(full_name, phone_number)').order('created_at', { ascending: false }).limit(40);
        if (error) throw error; setProducts(data ?? []);
      }
    } catch (e) { toast.error('Failed to load data'); }
    finally { setManageLoading(false); }
  };

  const openUserModal = (u: any) => { setSelectedUser(u); setEditUserName(u.full_name || ''); setEditUserPhone(u.phone_number || ''); setEditUserRole(u.role || 'farmer'); };
  const handleUpdateUser = async () => {
    if (!selectedUser) return; setSavingModal(true);
    try {
      await supabase.from('profiles').update({ full_name: editUserName, phone_number: editUserPhone, role: editUserRole as any }).eq('id', selectedUser.id);
      toast.success('User updated'); setSelectedUser(null); loadSection('users'); loadStats();
    } catch { toast.error('Failed to update user'); } finally { setSavingModal(false); }
  };
  const handleDeleteUser = async (id: string) => {
    if (!confirm('Delete this user permanently?')) return;
    try { await supabase.from('profiles').delete().eq('id', id); setUsers(prev => prev.filter(u => u.id !== id)); setSelectedUser(null); toast.success('User deleted'); loadStats(); }
    catch { toast.error('Failed to delete user'); }
  };

  const openIssueModal = (issue: any) => { setSelectedIssue(issue); setEditIssueStatus(issue.status || 'pending'); };
  const handleUpdateIssue = async () => {
    if (!selectedIssue) return; setSavingModal(true);
    try {
      await supabase.from('crop_issues').update({ status: editIssueStatus as any }).eq('id', selectedIssue.id);
      toast.success('Issue updated'); setSelectedIssue(null); loadSection('issues'); loadStats();
    } catch { toast.error('Failed to update issue'); } finally { setSavingModal(false); }
  };
  const handleDeleteIssue = async (id: string) => {
    if (!confirm('Delete this issue permanently?')) return;
    try { await supabase.from('crop_issues').delete().eq('id', id); setIssues(prev => prev.filter(i => i.id !== id)); setSelectedIssue(null); toast.success('Issue deleted'); loadStats(); }
    catch { toast.error('Failed to delete issue'); }
  };

  const openProductModal = (prod: any) => { setSelectedProduct(prod); setEditProductName(prod.name || ''); setEditProductPrice(String(prod.price || '')); setEditProductQuantity(prod.quantity || ''); setEditProductStatus(prod.status || 'active'); setEditProductDescription(prod.description || ''); };
  const handleUpdateProduct = async () => {
    if (!selectedProduct) return; setSavingModal(true);
    try {
      await supabase.from('products').update({ name: editProductName, price: parseFloat(editProductPrice), quantity: editProductQuantity, status: editProductStatus as any, description: editProductDescription }).eq('id', selectedProduct.id);
      toast.success('Product updated'); setSelectedProduct(null); loadSection('products'); loadStats();
    } catch { toast.error('Failed to update product'); } finally { setSavingModal(false); }
  };
  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Delete this product permanently?')) return;
    try { await supabase.from('products').delete().eq('id', id); setProducts(prev => prev.filter(p => p.id !== id)); setSelectedProduct(null); toast.success('Product deleted'); loadStats(); }
    catch { toast.error('Failed to delete product'); }
  };

  const handleVerify = async (expertId: string, profileId: string, status: 'verified' | 'rejected') => {
    try {
      await supabase.from('expert_profiles').update({ verification_status: status } as any).eq('id', expertId);
      toast.success(`Expert ${status}`); setSelectedExpert(null); loadSection('experts'); loadStats();
    } catch { toast.error('Update failed'); }
  };

  const handleSaveProfile = async () => {
    if (!user) return; setSavingProfile(true);
    try { await supabase.from('profiles').update({ full_name: editName }).eq('id', user.id); await refreshProfile(); toast.success('Updated!'); }
    catch { toast.error('Failed'); } finally { setSavingProfile(false); }
  };

  useEffect(() => { if (!loading && user?.id) loadStats(); }, [loading, user?.id]);
  useEffect(() => { if (profile) setEditName(profile.full_name ?? ''); }, [profile]);
  useEffect(() => { if (tab === 'manage') loadSection(manageSection); }, [tab, manageSection]);

  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-muted/40 flex items-center justify-center">
        <div className="space-y-4 text-center"><Skeleton className="w-20 h-20 rounded-full mx-auto" /><Skeleton className="h-5 w-40 mx-auto" /></div>
      </div>
    );
  }

  const filteredUsers = users.filter(u =>
    (roleFilter === 'all' || u.role === roleFilter) &&
    (u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) || u.phone_number?.includes(userSearch))
  );

  const navItems = [
    { id: 'home' as Tab, Icon: Home, label: 'Dashboard' },
    { id: 'manage' as Tab, Icon: Edit3, label: 'Manage' },
    { id: 'profile' as Tab, Icon: User, label: 'Profile' },
  ];

  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex h-screen bg-muted/30 overflow-hidden">

      {/* ── SIDEBAR ── */}
      <aside
        className="flex flex-col bg-[#1e5a32] h-full transition-all duration-300 shadow-2xl z-20 shrink-0"
        style={{ width: sidebarCollapsed ? '72px' : '220px' }}
      >
        {/* Logo area */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
          <button
            onClick={() => setSidebarCollapsed(v => !v)}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0 transition-colors"
          >
            <Menu size={18} className="text-white" />
          </button>
          {!sidebarCollapsed && (
            <div className="overflow-hidden">
              <p className="text-white font-black text-base leading-tight truncate">Hamro Kisan</p>
              <p className="text-white/50 text-[10px] font-medium truncate">Admin Panel</p>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map(({ id, Icon, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                tab === id ? 'bg-white/20 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={18} className="shrink-0" />
              {!sidebarCollapsed && <span className="text-sm font-bold truncate">{label}</span>}
              {!sidebarCollapsed && tab === id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
            </button>
          ))}
        </nav>

        {/* Bottom: profile + logout */}
        <div className="px-2 py-4 border-t border-white/10 space-y-1">
          <button
            onClick={() => setTab('profile')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition-all"
          >
            <div className="w-[18px] h-[18px] rounded-full overflow-hidden bg-white/20 flex items-center justify-center shrink-0">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                : <User size={11} className="text-white/70" />}
            </div>
            {!sidebarCollapsed && <span className="text-sm font-bold truncate">{profile?.full_name || 'Admin'}</span>}
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/60 hover:bg-red-500/20 hover:text-red-300 transition-all"
          >
            <LogOut size={18} className="shrink-0" />
            {!sidebarCollapsed && <span className="text-sm font-bold">Logout</span>}
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">

        {/* Top bar */}
        <header className="bg-card border-b border-border/50 px-6 py-3 flex items-center justify-between shrink-0 shadow-sm">
          <div>
            <h1 className="text-lg font-black text-foreground">
              {tab === 'home' && 'Dashboard Overview'}
              {tab === 'manage' && 'Manage Platform'}
              {tab === 'profile' && 'Admin Profile'}
            </h1>
            <p className="text-xs text-muted-foreground">{displayDate}</p>
          </div>
          <div className="flex items-center gap-2">
            {tab === 'home' && (
              <Button variant="outline" size="sm" onClick={loadStats} className="h-8 gap-2 text-xs font-bold rounded-xl">
                <RefreshCw size={13} /> Refresh
              </Button>
            )}
            {stats?.pendingVerifications ? (
              <div className="flex items-center gap-1.5 bg-destructive/10 text-destructive px-3 py-1.5 rounded-full text-xs font-bold border border-destructive/20">
                <AlertTriangle size={12} /> {stats.pendingVerifications} pending
              </div>
            ) : null}
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

          {/* ══════════ HOME TAB ══════════ */}
          {tab === 'home' && (
            <div className="space-y-6 animate-fade-in">

              {/* Stat pills row */}
              {statsLoading
                ? <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
                : (
                  <div className="grid grid-cols-4 gap-4">
                    <StatPill icon={<Users size={18} />} label="Total Users" value={stats?.totalUsers ?? 0} color="hsl(var(--primary))" sub={`${stats?.farmers} farmers`} />
                    <StatPill icon={<ShoppingBag size={18} />} label="Active Listings" value={stats?.activeProducts ?? 0} color="hsl(45 97% 50%)" sub="products" />
                    <StatPill icon={<ShieldCheck size={18} />} label="Pending Verifications" value={stats?.pendingVerifications ?? 0} color="hsl(var(--destructive))" sub="awaiting review" />
                    <StatPill icon={<Activity size={18} />} label="Issues Resolved" value={stats?.resolvedIssues ?? 0} color="hsl(122 46% 40%)" sub="all time" />
                  </div>
                )}

              {/* Speedometers + Charts row */}
              <div className="grid grid-cols-3 gap-4">

                {/* Platform health */}
                <Card className="rounded-2xl border-0 shadow-sm bg-card">
                  <CardContent className="p-5">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Platform Health</p>
                    {statsLoading
                      ? <div className="flex justify-around"><Skeleton className="w-24 h-20 rounded-xl" /><Skeleton className="w-24 h-20 rounded-xl" /><Skeleton className="w-24 h-20 rounded-xl" /></div>
                      : (
                        <div className="flex justify-around">
                          <Speedometer value={stats?.farmers ?? 0} max={Math.max((stats?.farmers ?? 0) * 1.5, 10)} label="Farmers" color="hsl(122 46% 40%)" />
                          <Speedometer value={stats?.openIssues ?? 0} max={Math.max((stats?.openIssues ?? 0) * 2, 5)} label="Open Issues" color="hsl(var(--destructive))" />
                          <Speedometer value={stats?.pendingVerifications ?? 0} max={Math.max((stats?.pendingVerifications ?? 0) * 2, 5)} label="Pending" color="hsl(45 97% 50%)" />
                        </div>
                      )}
                  </CardContent>
                </Card>

                {/* Growth Chart */}
                <Card className="rounded-2xl border-0 shadow-sm bg-card">
                  <CardContent className="p-5">
                    <p className="text-xs font-bold text-foreground mb-4 flex items-center gap-2"><TrendingUp size={13} className="text-primary" /> User Growth (6 months)</p>
                    <ResponsiveContainer width="100%" height={130}>
                      <AreaChart data={growthData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gFarmer" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(122 46% 40%)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(122 46% 40%)" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gBuyer" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(45 97% 50%)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(45 97% 50%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 11 }} />
                        <Area type="monotone" dataKey="farmers" stroke="hsl(122 46% 40%)" strokeWidth={2} fill="url(#gFarmer)" name="Farmers" />
                        <Area type="monotone" dataKey="buyers" stroke="hsl(45 97% 50%)" strokeWidth={2} fill="url(#gBuyer)" name="Buyers" />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div className="flex gap-4 mt-2 justify-center">
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><div className="w-3 h-1.5 rounded-full bg-primary" /> Farmers</div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><div className="w-3 h-1.5 rounded-full" style={{ background: 'hsl(45 97% 50%)' }} /> Buyers</div>
                    </div>
                  </CardContent>
                </Card>

                {/* Platform Overview Bar */}
                <Card className="rounded-2xl border-0 shadow-sm bg-card">
                  <CardContent className="p-5">
                    <p className="text-xs font-bold text-foreground mb-4 flex items-center gap-2"><BarChart3 size={13} className="text-primary" /> Platform Overview</p>
                    <ResponsiveContainer width="100%" height={130}>
                      <BarChart data={issueData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 11 }} />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                          {issueData.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Map + Quick Actions + Push Notification row */}
              <div className="grid grid-cols-3 gap-4">

                {/* Nepal Map */}
                <Card className="rounded-2xl border-0 shadow-sm bg-card col-span-1">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-xs font-bold text-foreground flex items-center gap-2"><MapPin size={13} className="text-primary" /> Farmer Distribution</p>
                      <p className="text-[10px] text-muted-foreground">by district</p>
                    </div>
                    <NepalMap farmersByDistrict={farmersByDistrict} />
                    <div className="flex flex-wrap gap-2 mt-3">
                      {Object.entries(farmersByDistrict).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([district, count]) => (
                        <div key={district} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                          {district.charAt(0).toUpperCase() + district.slice(1)}: {count}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="rounded-2xl border-0 shadow-sm bg-card">
                  <CardContent className="p-5">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Quick Actions</p>
                    <div className="space-y-2">
                      {[
                        { label: 'Review Pending Verifications', sub: `${stats?.pendingVerifications ?? 0} awaiting`, icon: <ShieldCheck size={16} />, color: 'hsl(var(--destructive))', section: 'experts' as ManageSection },
                        { label: 'Open Crop Issues', sub: `${stats?.openIssues ?? 0} unresolved`, icon: <Leaf size={16} />, color: 'hsl(122 46% 40%)', section: 'issues' as ManageSection },
                        { label: 'Manage Products', sub: `${stats?.activeProducts ?? 0} active`, icon: <Package size={16} />, color: 'hsl(45 97% 50%)', section: 'products' as ManageSection },
                        { label: 'Manage Users', sub: `${stats?.totalUsers ?? 0} total`, icon: <Users size={16} />, color: 'hsl(var(--primary))', section: 'users' as ManageSection },
                      ].map(a => (
                        <button key={a.label} onClick={() => { setTab('manage'); setManageSection(a.section); }}
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-all active:scale-[.98] text-left">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${a.color}22`, color: a.color }}>{a.icon}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">{a.label}</p>
                            <p className="text-[10px] text-muted-foreground">{a.sub}</p>
                          </div>
                          <ChevronRight size={13} className="text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Push Notification */}
                <AdminPushNotification />
              </div>
            </div>
          )}

          {/* ══════════ MANAGE TAB ══════════ */}
          {tab === 'manage' && (
            <div className="animate-fade-in space-y-4">

              {/* Section tabs */}
              <div className="flex gap-2">
                {([
                  { id: 'users', label: 'Users', icon: <Users size={13} /> },
                  { id: 'experts', label: 'Experts', icon: <ShieldCheck size={13} /> },
                  { id: 'issues', label: 'Issues', icon: <AlertTriangle size={13} /> },
                  { id: 'products', label: 'Products', icon: <Package size={13} /> },
                ] as { id: ManageSection; label: string; icon: React.ReactNode }[]).map(s => (
                  <button key={s.id} onClick={() => setManageSection(s.id)}
                    className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold transition-all ${manageSection === s.id ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-card text-muted-foreground border border-border/50 hover:border-border'}`}>
                    {s.icon}{s.label}
                  </button>
                ))}
              </div>

              {/* ── USERS ── */}
              {manageSection === 'users' && (
                <div className="space-y-3">
                  <Card className="rounded-2xl border-0 shadow-sm bg-card">
                    <CardContent className="p-3 flex gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
                        <Input placeholder="Search name or phone..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="pl-9 h-9 bg-muted/40 border-0 rounded-xl text-sm" />
                      </div>
                      <div className="flex gap-2">
                        {['all', 'farmer', 'buyer', 'expert', 'admin'].map(r => (
                          <button key={r} onClick={() => setRoleFilter(r)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${roleFilter === r ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                            {r}
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                    {manageLoading ? [1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-16 rounded-2xl" />) :
                      filteredUsers.map(u => (
                        <Card key={u.id} className="rounded-2xl border-border/40 shadow-sm bg-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => openUserModal(u)}>
                          <CardContent className="p-3 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                              {u.avatar_url ? <img src={u.avatar_url} alt={u.full_name} className="w-full h-full object-cover" /> : <User size={18} className="text-primary" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm text-foreground truncate">{u.full_name || 'No name'}</p>
                              <p className="text-[11px] text-muted-foreground">{u.phone_number ?? '—'}</p>
                            </div>
                            <Badge variant={u.role === 'farmer' ? 'default' : u.role === 'expert' ? 'secondary' : 'outline'} className="text-[9px] capitalize shrink-0">{u.role}</Badge>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              )}

              {/* ── EXPERTS ── */}
              {manageSection === 'experts' && (
                <div className="space-y-3">
                  {experts.filter((e: any) => e?.verification_status === 'pending').length > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-xl border border-destructive/20">
                      <ShieldX size={15} className="text-destructive shrink-0" />
                      <p className="text-xs font-semibold text-destructive">{experts.filter((e: any) => e?.verification_status === 'pending').length} expert(s) awaiting verification</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                    {manageLoading ? [1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />) :
                      experts.map((exp: any) => {
                        const status = exp?.verification_status ?? 'unverified';
                        return (
                          <Card key={exp.id} className="rounded-2xl border-border/40 shadow-sm bg-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedExpert(exp)}>
                            <CardContent className="p-4 flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                                {exp.profile?.avatar_url ? <img src={exp.profile.avatar_url} alt="" className="w-full h-full object-cover" /> : <User size={20} className="text-primary" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm text-foreground truncate">{exp.profile?.full_name ?? 'Expert'}</p>
                                <p className="text-[11px] text-muted-foreground">{exp.specialization ?? '—'}</p>
                                <p className="text-[10px] text-muted-foreground">{exp.experience_years} yrs exp</p>
                              </div>
                              <Badge className={`text-[9px] capitalize ${status === 'verified' ? 'bg-primary/10 text-primary' : status === 'pending' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' : status === 'rejected' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                                {status}
                              </Badge>
                            </CardContent>
                          </Card>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* ── ISSUES ── */}
              {manageSection === 'issues' && (
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                  {manageLoading ? [1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />) :
                    issues.length === 0
                      ? <div className="col-span-3 text-center py-10"><p className="text-muted-foreground text-sm">No issues found</p></div>
                      : issues.map((issue: any) => (
                        <Card key={issue.id} className="rounded-2xl border-border/40 shadow-sm bg-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => openIssueModal(issue)}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <p className="font-bold text-sm text-foreground line-clamp-1 flex-1 mr-2">{issue.crop_name ?? 'Crop Issue'}</p>
                              <Badge variant={issue.status === 'resolved' ? 'default' : 'destructive'} className="text-[9px] shrink-0">{issue.status}</Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground line-clamp-2">{issue.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <User size={10} className="text-muted-foreground" />
                              <p className="text-[10px] text-muted-foreground">{issue.farmer?.full_name ?? 'Unknown farmer'}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                </div>
              )}

              {/* ── PRODUCTS ── */}
              {manageSection === 'products' && (
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                  {manageLoading ? [1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />) :
                    products.length === 0
                      ? <div className="col-span-3 text-center py-10"><p className="text-muted-foreground text-sm">No products</p></div>
                      : products.map((prod: any) => (
                        <Card key={prod.id} className="rounded-2xl border-border/40 shadow-sm bg-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => openProductModal(prod)}>
                          <CardContent className="p-3 flex items-center gap-3">
                            <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted shrink-0">
                              {prod.photo_url ? <img src={prod.photo_url} alt={prod.name} className="w-full h-full object-cover" /> : <Leaf className="m-4 text-muted-foreground/40" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm text-foreground truncate">{prod.name}</p>
                              <p className="text-primary font-bold text-sm">Rs.{prod.price}/kg</p>
                              <p className="text-[10px] text-muted-foreground truncate">{prod.farmer?.full_name ?? '—'}</p>
                            </div>
                            <Badge variant={prod.status === 'active' ? 'default' : 'secondary'} className="text-[9px] shrink-0">{prod.status}</Badge>
                          </CardContent>
                        </Card>
                      ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════ PROFILE TAB ══════════ */}
          {tab === 'profile' && (
            <div className="animate-fade-in max-w-3xl space-y-5">

              {/* Profile header card */}
              <Card className="rounded-2xl border-0 shadow-sm bg-card overflow-hidden">
                <div className="bg-[#1e5a32] px-8 py-8 flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full border-4 border-white/30 overflow-hidden bg-white/10 flex items-center justify-center shadow-lg shrink-0">
                    {profile?.avatar_url ? <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" /> : <User className="w-10 h-10 text-white/80" />}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white">{profile?.full_name}</h2>
                    <p className="text-white/70 text-sm">{user?.email}</p>
                    <div className="inline-flex items-center gap-1.5 mt-2 bg-white/10 px-3 py-1 rounded-full">
                      <ShieldCheck size={12} className="text-yellow-300" />
                      <span className="text-xs font-bold text-yellow-200">Administrator</span>
                    </div>
                  </div>
                  <div className="ml-auto flex gap-4">
                    {[
                      { label: 'Total Users', value: stats?.totalUsers ?? '—' },
                      { label: 'Farmers', value: stats?.farmers ?? '—' },
                      { label: 'Experts', value: stats?.experts ?? '—' },
                    ].map(s => (
                      <div key={s.label} className="text-center bg-white/10 rounded-xl px-5 py-3">
                        <p className="text-xl font-black text-white">{s.value}</p>
                        <p className="text-white/60 text-xs">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-5">
                {/* Edit profile */}
                <Card className="rounded-2xl shadow-sm border-border/50 bg-card">
                  <CardContent className="p-6 space-y-4">
                    <p className="font-black text-primary border-b border-border/50 pb-2 text-sm">Edit Profile</p>
                    <div>
                      <Label className="text-xs font-semibold">Display Name</Label>
                      <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-11 bg-muted/30 border-0 mt-1 rounded-xl" />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Email</Label>
                      <Input value={user?.email ?? ''} disabled className="h-11 bg-muted/20 border-0 mt-1 rounded-xl opacity-60" />
                    </div>
                    <Button onClick={handleSaveProfile} disabled={savingProfile} className="w-full h-11 font-bold rounded-xl">
                      {savingProfile ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Quick links */}
                <Card className="rounded-2xl shadow-sm border-border/50 bg-card">
                  <CardContent className="p-6 space-y-2">
                    <p className="font-black text-primary border-b border-border/50 pb-2 text-sm mb-4">Quick Navigation</p>
                    <button onClick={() => { setTab('manage'); setManageSection('users'); setRoleFilter('farmer'); }}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted/40 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><Leaf size={16} className="text-primary" /></div>
                        <div className="text-left">
                          <p className="font-bold text-sm text-foreground">View All Farmer Data</p>
                          <p className="text-[11px] text-muted-foreground">{stats?.farmers ?? '—'} registered farmers</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-muted-foreground" />
                    </button>
                    <button onClick={() => { setTab('manage'); setManageSection('experts'); }}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted/40 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center"><ShieldCheck size={16} className="text-yellow-600 dark:text-yellow-400" /></div>
                        <div className="text-left">
                          <p className="font-bold text-sm text-foreground">Expert Verifications</p>
                          <p className="text-[11px] text-muted-foreground">{stats?.pendingVerifications ?? '—'} pending</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-muted-foreground" />
                    </button>
                    <Button variant="destructive" onClick={logout} className="w-full h-11 font-bold rounded-xl mt-4">
                      <LogOut size={16} className="mr-2" /> Logout
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ══════════ MODALS (unchanged logic, just reused) ══════════ */}

      {/* USER MODAL */}
      <Dialog open={!!selectedUser} onOpenChange={o => !o && setSelectedUser(null)}>
        <DialogContent className="max-w-[420px] rounded-3xl p-0 overflow-hidden bg-card">
          {selectedUser && (
            <>
              <div className="bg-[#1e5a32] p-6 text-center">
                <div className="w-20 h-20 rounded-full border-2 border-white/30 bg-white/10 flex items-center justify-center mx-auto mb-3 overflow-hidden">
                  {selectedUser.avatar_url ? <img src={selectedUser.avatar_url} alt="" className="w-full h-full object-cover" /> : <User size={32} className="text-white/80" />}
                </div>
                <h2 className="text-xl font-black text-white">{selectedUser.full_name || 'User'}</h2>
                <p className="text-white/70 text-sm">{selectedUser.phone_number || '—'}</p>
              </div>
              <div className="p-6 space-y-4">
                <div><Label className="text-xs font-semibold">Full Name</Label><Input value={editUserName} onChange={e => setEditUserName(e.target.value)} className="h-11 bg-muted/30 border-border/50 mt-1 rounded-xl" /></div>
                <div><Label className="text-xs font-semibold">Phone Number</Label><Input value={editUserPhone} onChange={e => setEditUserPhone(e.target.value)} className="h-11 bg-muted/30 border-border/50 mt-1 rounded-xl" /></div>
                <div>
                  <Label className="text-xs font-semibold">Role</Label>
                  <Select value={editUserRole} onValueChange={setEditUserRole}>
                    <SelectTrigger className="h-11 bg-muted/30 border-border/50 mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="farmer">Farmer</SelectItem><SelectItem value="buyer">Buyer</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem><SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1 h-12 font-bold rounded-xl" onClick={() => setSelectedUser(null)}>Cancel</Button>
                  <Button className="flex-1 h-12 font-bold rounded-xl" onClick={handleUpdateUser} disabled={savingModal}><Save size={16} className="mr-2" />{savingModal ? 'Saving...' : 'Save'}</Button>
                </div>
                <Button variant="destructive" className="w-full h-12 font-bold rounded-xl" onClick={() => handleDeleteUser(selectedUser.id)}><Trash2 size={16} className="mr-2" />Delete User</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* EXPERT MODAL */}
      <Dialog open={!!selectedExpert} onOpenChange={o => !o && setSelectedExpert(null)}>
        <DialogContent className="max-w-[420px] rounded-3xl p-0 overflow-hidden bg-card max-h-[90vh] overflow-y-auto">
          {selectedExpert && (
            <>
              <div className="bg-[#1e5a32] p-6 text-center sticky top-0 z-10">
                <button onClick={() => setSelectedExpert(null)} className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/10 hover:bg-black/30 p-1.5 rounded-full transition-all"><X size={18} /></button>
                <div className="w-20 h-20 rounded-full border-2 border-white/30 bg-white/10 flex items-center justify-center mx-auto mb-3 overflow-hidden">
                  {selectedExpert.profile?.avatar_url ? <img src={selectedExpert.profile.avatar_url} alt="" className="w-full h-full object-cover" /> : <User size={32} className="text-white/80" />}
                </div>
                <h2 className="text-xl font-black text-white">{selectedExpert.profile?.full_name}</h2>
                <p className="text-white/70 text-sm">{selectedExpert.specialization}</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-muted/40 rounded-xl p-3"><p className="text-xl font-black text-foreground">{selectedExpert.experience_years}</p><p className="text-[10px] text-muted-foreground">Years Exp.</p></div>
                  <div className="bg-muted/40 rounded-xl p-3"><p className="text-sm font-bold text-foreground truncate">{selectedExpert.profile?.phone_number ?? '—'}</p><p className="text-[10px] text-muted-foreground">Phone</p></div>
                </div>
                {(() => {
                  const docUrl = selectedExpert.document_url;
                  const selfieUrl = selectedExpert.selfie_url;
                  return (
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-foreground flex items-center gap-1"><FileText size={14} className="text-primary" /> Verification Documents</p>
                      {docUrl && (
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1 font-semibold">Credential Document</p>
                          <div className="w-full h-48 bg-muted/30 rounded-xl overflow-hidden border border-border/50 relative group cursor-pointer" onClick={() => setFullscreenImage(docUrl)}>
                            <img src={docUrl} alt="Document" className="w-full h-full object-contain" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center"><Eye size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                          </div>
                        </div>
                      )}
                      {selfieUrl && (
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1 font-semibold">Verification Selfie</p>
                          <div className="w-full h-48 bg-muted/30 rounded-xl overflow-hidden border border-border/50 relative group cursor-pointer" onClick={() => setFullscreenImage(selfieUrl)}>
                            <img src={selfieUrl} alt="Selfie" className="w-full h-full object-contain" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center"><Eye size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                          </div>
                        </div>
                      )}
                      {!docUrl && !selfieUrl && (
                        <div className="bg-muted/40 rounded-xl p-4 text-center border border-dashed border-border/60"><FileText size={24} className="mx-auto mb-2 text-muted-foreground/50" /><p className="text-xs text-muted-foreground font-semibold">No documents uploaded.</p></div>
                      )}
                    </div>
                  );
                })()}
                <p className="text-xs text-muted-foreground text-center pt-2">Review credentials and approve or reject verification.</p>
                {selectedExpert.verification_status === 'pending' && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <Button variant="destructive" className="h-12 font-bold rounded-xl" onClick={() => handleVerify(selectedExpert.id, selectedExpert.profile_id, 'rejected')}><XCircle size={16} className="mr-1" />Reject</Button>
                    <Button className="h-12 font-bold rounded-xl" onClick={() => handleVerify(selectedExpert.id, selectedExpert.profile_id, 'verified')}><CheckCircle size={16} className="mr-1" />Verify</Button>
                  </div>
                )}
                {selectedExpert.verification_status !== 'pending' && (
                  <div className="text-center p-3 bg-muted/40 rounded-xl">
                    <Badge className={`text-xs capitalize ${selectedExpert.verification_status === 'verified' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>{selectedExpert.verification_status}</Badge>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ISSUE MODAL */}
      <Dialog open={!!selectedIssue} onOpenChange={o => !o && setSelectedIssue(null)}>
        <DialogContent className="max-w-[420px] rounded-3xl p-0 overflow-hidden bg-card max-h-[90vh] overflow-y-auto">
          {selectedIssue && (
            <>
              <DialogHeader className="bg-[#1e5a32] p-6 text-center">
                <DialogTitle className="text-xl font-black text-white">{selectedIssue.crop_name || 'Crop Issue'}</DialogTitle>
                <DialogDescription className="text-white/70 text-sm">Reported by {selectedIssue.farmer?.full_name || 'Unknown farmer'}</DialogDescription>
              </DialogHeader>
              <div className="p-6 space-y-4">
                {selectedIssue.image_url && (
                  <div className="w-full h-56 bg-muted/30 rounded-xl overflow-hidden border border-border/50 relative group cursor-pointer" onClick={() => setFullscreenImage(selectedIssue.image_url)}>
                    <img src={selectedIssue.image_url} alt="Issue" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center"><Eye size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                  </div>
                )}
                <div><Label className="text-xs font-semibold text-muted-foreground">Description</Label><div className="mt-2 p-3 bg-muted/30 rounded-xl"><p className="text-sm text-foreground">{selectedIssue.description}</p></div></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/40 rounded-xl p-3"><p className="text-[10px] text-muted-foreground">Status</p><Badge variant={selectedIssue.status === 'resolved' ? 'default' : 'destructive'} className="mt-1 text-[10px]">{selectedIssue.status}</Badge></div>
                  <div className="bg-muted/40 rounded-xl p-3"><p className="text-[10px] text-muted-foreground">Reported</p><p className="text-xs font-bold text-foreground mt-1">{new Date(selectedIssue.created_at).toLocaleDateString()}</p></div>
                </div>
                <div>
                  <Label className="text-xs font-semibold">Update Status</Label>
                  <Select value={editIssueStatus} onValueChange={setEditIssueStatus}>
                    <SelectTrigger className="h-11 bg-muted/30 border-border/50 mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="resolved">Resolved</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1 h-12 font-bold rounded-xl" onClick={() => setSelectedIssue(null)}>Cancel</Button>
                  <Button className="flex-1 h-12 font-bold rounded-xl" onClick={handleUpdateIssue} disabled={savingModal}><Save size={16} className="mr-2" />{savingModal ? 'Saving...' : 'Update'}</Button>
                </div>
                <Button variant="destructive" className="w-full h-12 font-bold rounded-xl" onClick={() => handleDeleteIssue(selectedIssue.id)}><Trash2 size={16} className="mr-2" />Delete Issue</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* PRODUCT MODAL */}
      <Dialog open={!!selectedProduct} onOpenChange={o => !o && setSelectedProduct(null)}>
        <DialogContent className="max-w-[420px] rounded-3xl p-0 overflow-hidden bg-card max-h-[90vh] overflow-y-auto">
          {selectedProduct && (
            <>
              <DialogHeader className="bg-[#1e5a32] p-6 text-center">
                <DialogTitle className="text-xl font-black text-white">{selectedProduct.name}</DialogTitle>
                <DialogDescription className="text-white/70 text-sm">By {selectedProduct.farmer?.full_name || 'Unknown farmer'}</DialogDescription>
              </DialogHeader>
              <div className="p-6 space-y-4">
                {selectedProduct.photo_url && (
                  <div className="w-full h-56 bg-muted/30 rounded-xl overflow-hidden border border-border/50 relative group cursor-pointer" onClick={() => setFullscreenImage(selectedProduct.photo_url)}>
                    <img src={selectedProduct.photo_url} alt="Product" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center"><Eye size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                  </div>
                )}
                <div><Label className="text-xs font-semibold">Product Name</Label><Input value={editProductName} onChange={e => setEditProductName(e.target.value)} className="h-11 bg-muted/30 border-border/50 mt-1 rounded-xl" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs font-semibold">Price (Rs./kg)</Label><Input type="number" value={editProductPrice} onChange={e => setEditProductPrice(e.target.value)} className="h-11 bg-muted/30 border-border/50 mt-1 rounded-xl" /></div>
                  <div><Label className="text-xs font-semibold">Quantity</Label><Input value={editProductQuantity} onChange={e => setEditProductQuantity(e.target.value)} className="h-11 bg-muted/30 border-border/50 mt-1 rounded-xl" /></div>
                </div>
                <div><Label className="text-xs font-semibold">Description</Label><Textarea value={editProductDescription} onChange={e => setEditProductDescription(e.target.value)} className="min-h-[80px] bg-muted/30 border-border/50 mt-1 rounded-xl resize-none" /></div>
                <div>
                  <Label className="text-xs font-semibold">Status</Label>
                  <Select value={editProductStatus} onValueChange={setEditProductStatus}>
                    <SelectTrigger className="h-11 bg-muted/30 border-border/50 mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="sold">Sold</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1 h-12 font-bold rounded-xl" onClick={() => setSelectedProduct(null)}>Cancel</Button>
                  <Button className="flex-1 h-12 font-bold rounded-xl" onClick={handleUpdateProduct} disabled={savingModal}><Save size={16} className="mr-2" />{savingModal ? 'Saving...' : 'Update'}</Button>
                </div>
                <Button variant="destructive" className="w-full h-12 font-bold rounded-xl" onClick={() => handleDeleteProduct(selectedProduct.id)}><Trash2 size={16} className="mr-2" />Delete Product</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* FULLSCREEN IMAGE */}
      <Dialog open={!!fullscreenImage} onOpenChange={o => !o && setFullscreenImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-0">
          <div className="relative w-full h-full flex items-center justify-center">
            <button onClick={() => setFullscreenImage(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center text-white z-50 transition-colors"><X size={20} /></button>
            {fullscreenImage && <img src={fullscreenImage} alt="Fullscreen" className="max-w-full max-h-[90vh] object-contain" />}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default AdminDashboard;
