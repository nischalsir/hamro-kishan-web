import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import NepalMap from '@/components/NepalMap';
import {
  Users, ShieldCheck, ShieldX, Leaf, ShoppingBag, BarChart3,
  User, CheckCircle, XCircle, Send, BellRing, MapPin, TrendingUp,
  AlertTriangle, Package, ChevronRight, Eye, Trash2, Search,
  LogOut, Activity, RefreshCw, X, FileText, Save, Menu,
  LayoutDashboard, Sprout, Building2, Star, CircleDot,
  Bell, Settings, ChevronDown, ArrowUpRight, Moon, Sun,
  SlidersHorizontal, MoreHorizontal, Command
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
import { toast } from '@/utils/toast';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';

// ─── Types ─────────────────────────────────────────────────────────────────────
type Profile        = Database['public']['Tables']['profiles']['Row'];
type ExpertProfile  = Database['public']['Tables']['expert_profiles']['Row'];
type FarmerProfile  = Database['public']['Tables']['farmer_profiles']['Row'];
type BuyerProfile   = Database['public']['Tables']['buyer_profiles']['Row'];
type CropIssue      = Database['public']['Tables']['crop_issues']['Row'];
type Product        = Database['public']['Tables']['products']['Row'];
type UserRole       = Database['public']['Enums']['user_role'];
type IssueStatus    = Database['public']['Enums']['issue_status'];
type ProductStatus  = Database['public']['Enums']['product_status'];

type ProfileWithExtras = Profile & {
  farmer_profile?: FarmerProfile | null;
  buyer_profile?:  BuyerProfile  | null;
  expert_profile?: (ExpertProfile & { verification_status: string | null }) | null;
};
type ExpertWithProfile = ExpertProfile & { profile: Profile | null };
type IssueWithFarmer   = CropIssue   & { farmer: Pick<Profile, 'full_name' | 'phone_number'> | null };
type ProductWithFarmer = Product      & { farmer: Pick<Profile, 'full_name' | 'phone_number'> | null };

type NavSection =
  | 'overview' | 'users-all' | 'users-farmers' | 'users-buyers'
  | 'users-experts' | 'issues' | 'products' | 'notifications' | 'profile';

// ─── Role badge colors ──────────────────────────────────────────────────────────
const ROLE_COLORS: Record<string, string> = {
  farmer: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
  buyer:  'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  expert: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800',
  admin:  'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
};
const STATUS_COLORS: Record<string, string> = {
  verified:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending:    'bg-amber-50 text-amber-700 border-amber-200',
  rejected:   'bg-red-50 text-red-700 border-red-200',
  unverified: 'bg-gray-100 text-gray-500 border-gray-200',
  active:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  sold:       'bg-gray-100 text-gray-500 border-gray-200',
  resolved:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  open:       'bg-red-50 text-red-700 border-red-200',
};

// ─── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard: React.FC<{
  label: string; value: number | string; sub: string;
  icon: React.ReactNode; iconBg: string; iconColor: string; trend?: string;
}> = ({ label, value, sub, icon, iconBg, iconColor, trend }) => (
  <div className="bg-card rounded-2xl border border-border/50 p-5 flex items-start justify-between">
    <div>
      <p className="text-sm text-muted-foreground font-medium mb-1">{label}</p>
      <p className="text-3xl font-black text-foreground tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
    <div className="flex flex-col items-end gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
        <span className={iconColor}>{icon}</span>
      </div>
      {trend && (
        <span className="flex items-center gap-0.5 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 px-2 py-0.5 rounded-full">
          <ArrowUpRight size={11} />{trend}
        </span>
      )}
    </div>
  </div>
);

// ─── Avatar Stack ───────────────────────────────────────────────────────────────
const AvatarStack: React.FC<{ users: Profile[] }> = ({ users }) => (
  <div className="flex -space-x-2">
    {users.slice(0, 3).map((u, i) => (
      <div key={i} className="w-7 h-7 rounded-full border-2 border-background overflow-hidden bg-primary/10 flex items-center justify-center">
        {u.avatar_url
          ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
          : <User size={12} className="text-primary" />}
      </div>
    ))}
    {users.length > 3 && (
      <div className="w-7 h-7 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
        +{users.length - 3}
      </div>
    )}
  </div>
);

// ─── Main ──────────────────────────────────────────────────────────────────────
export const AdminDashboard: React.FC = () => {
  const { user, profile, loading, logout, refreshProfile } = useAuth();

  const [section, setSection]               = useState<NavSection>('overview');
  const [sidebarOpen, setSidebarOpen]       = useState(true);
  const [openGroups, setOpenGroups]         = useState<Record<string, boolean>>({ users: true });
  const [search, setSearch]                 = useState('');
  const [cmdOpen, setCmdOpen]               = useState(false);

  // Stats
  const [stats, setStats]         = useState<{
    totalUsers: number; farmers: number; buyers: number; experts: number;
    pendingVerifications: number; activeProducts: number;
    openIssues: number; resolvedIssues: number;
  } | null>(null);
  const [statsLoading, setStatsLoading]   = useState(true);
  const [growthData, setGrowthData]       = useState<any[]>([]);
  const [pieData, setPieData]             = useState<any[]>([]);
  const [farmersByDistrict, setFarmersByDistrict] = useState<Record<string, number>>({});

  // Data
  const [users, setUsers]           = useState<ProfileWithExtras[]>([]);
  const [experts, setExperts]       = useState<ExpertWithProfile[]>([]);
  const [issues, setIssues]         = useState<IssueWithFarmer[]>([]);
  const [products, setProducts]     = useState<ProductWithFarmer[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Modals
  const [selectedUser,    setSelectedUser]    = useState<ProfileWithExtras | null>(null);
  const [selectedExpert,  setSelectedExpert]  = useState<ExpertWithProfile | null>(null);
  const [selectedIssue,   setSelectedIssue]   = useState<IssueWithFarmer | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithFarmer | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Edit
  const [editUserName,  setEditUserName]  = useState('');
  const [editUserPhone, setEditUserPhone] = useState('');
  const [editUserRole,  setEditUserRole]  = useState<UserRole>('farmer');
  const [editIssueStatus,        setEditIssueStatus]        = useState<IssueStatus>('pending');
  const [editProductName,        setEditProductName]        = useState('');
  const [editProductPrice,       setEditProductPrice]       = useState('');
  const [editProductQuantity,    setEditProductQuantity]    = useState('');
  const [editProductStatus,      setEditProductStatus]      = useState<ProductStatus>('active');
  const [editProductDescription, setEditProductDescription] = useState('');

  // Profile
  const [editName,      setEditName]      = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingModal,   setSavingModal]   = useState(false);

  // Push
  const [pushTitle,   setPushTitle]   = useState('');
  const [pushMessage, setPushMessage] = useState('');
  const [pushTarget,  setPushTarget]  = useState<string>('all');
  const [pushFarmers, setPushFarmers] = useState<Profile[]>([]);
  const [pushSending, setPushSending] = useState(false);

  const PUSH_TEMPLATES = [
    { emoji: '🌧️', label: 'Heavy Rain',  title: 'Heavy Rain Alert!',        message: 'Heavy rainfall expected in your area in the next 24 hours. Ensure proper drainage.' },
    { emoji: '🐛', label: 'Pest Warning', title: 'Pest Outbreak Warning',    message: 'A pest outbreak has been reported nearby. Inspect your fields.' },
    { emoji: '💰', label: 'Price Drop',   title: 'Market Price Fluctuation', message: 'Prices have dropped slightly today. Check the Market Trends tab.' },
    { emoji: '🎁', label: 'Subsidy',      title: 'New Fertilizer Subsidy',   message: 'The government announced a new subsidy for organic fertilizers.' },
  ];

  const displayDate = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  const PIE_COLORS = ['#22c55e', '#3b82f6', '#a855f7'];

  // ── Load Stats ──────────────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [profilesRes, expertRes, productsRes, issuesRes, farmerLocRes] = await Promise.all([
        supabase.from('profiles').select('role'),
        supabase.from('expert_profiles').select('id, verification_status').limit(500),
        supabase.from('products').select('status'),
        supabase.from('crop_issues').select('status'),
        supabase.from('farmer_profiles').select('district'),
      ]);
      const roles = profilesRes.data ?? [];
      const allIssues = issuesRes.data ?? [];
      const s = {
        totalUsers:           roles.length,
        farmers:              roles.filter(r => r.role === 'farmer').length,
        buyers:               roles.filter(r => r.role === 'buyer').length,
        experts:              roles.filter(r => r.role === 'expert').length,
        pendingVerifications: (expertRes.data ?? []).filter(e => e.verification_status === 'pending').length,
        activeProducts:       (productsRes.data ?? []).filter(p => p.status === 'active').length,
        openIssues:           allIssues.filter(i => i.status === 'pending').length,
        resolvedIssues:       allIssues.filter(i => i.status === 'resolved').length,
      };
      setStats(s);
      const districtMap: Record<string, number> = {};
      for (const fp of farmerLocRes.data ?? []) {
        if (fp.district) { const d = fp.district.trim(); districtMap[d] = (districtMap[d] || 0) + 1; }
      }
      setFarmersByDistrict(districtMap);
      const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
      setGrowthData(months.map((m, i) => ({
        month: m,
        farmers: Math.round(s.farmers * (0.5 + i * 0.1)),
        buyers:  Math.round(s.buyers  * (0.4 + i * 0.12)),
      })));
      setPieData([
        { name: 'Farmers', value: s.farmers,  fill: PIE_COLORS[0] },
        { name: 'Buyers',  value: s.buyers,   fill: PIE_COLORS[1] },
        { name: 'Experts', value: s.experts,  fill: PIE_COLORS[2] },
      ]);
    } catch { toast.error('Failed to load stats'); }
    finally { setStatsLoading(false); }
  }, []);

  const loadUsers = useCallback(async (roleOverride?: UserRole | 'all') => {
    setDataLoading(true);
    try {
      let q = supabase.from('profiles').select(`*, farmer_profile:farmer_profiles(district, province, farm_name), buyer_profile:buyer_profiles(district, province, business_name), expert_profile:expert_profiles(specialization, experience_years, verification_status)`).order('created_at', { ascending: false }).limit(100);
      const r = roleOverride ?? 'all';
      if (r !== 'all') q = q.eq('role', r);
      const { data, error } = await q;
      if (error) throw error;
      setUsers((data ?? []) as ProfileWithExtras[]);
    } catch { toast.error('Failed to load users'); }
    finally { setDataLoading(false); }
  }, []);

  const loadExperts = useCallback(async () => {
    setDataLoading(true);
    try {
      const { data, error } = await supabase.from('expert_profiles').select('*, profile:profiles(id, full_name, phone_number, avatar_url, created_at)').limit(100);
      if (error) throw error; setExperts((data ?? []) as ExpertWithProfile[]);
    } catch { toast.error('Failed to load experts'); }
    finally { setDataLoading(false); }
  }, []);

  const loadIssues = useCallback(async () => {
    setDataLoading(true);
    try {
      const { data, error } = await supabase.from('crop_issues').select('*, farmer:profiles(full_name, phone_number)').order('created_at', { ascending: false }).limit(100);
      if (error) throw error; setIssues((data ?? []) as IssueWithFarmer[]);
    } catch { toast.error('Failed to load issues'); }
    finally { setDataLoading(false); }
  }, []);

  const loadProducts = useCallback(async () => {
    setDataLoading(true);
    try {
      const { data, error } = await supabase.from('products').select('*, farmer:profiles(full_name, phone_number)').order('created_at', { ascending: false }).limit(100);
      if (error) throw error; setProducts((data ?? []) as ProductWithFarmer[]);
    } catch { toast.error('Failed to load products'); }
    finally { setDataLoading(false); }
  }, []);

  useEffect(() => {
    supabase.from('profiles').select('id, full_name').eq('role', 'farmer').then(({ data }) => { if (data) setPushFarmers(data as Profile[]); });
  }, []);

  useEffect(() => {
    if (section === 'overview') return;
    if (section === 'users-all')     loadUsers('all');
    if (section === 'users-farmers') loadUsers('farmer');
    if (section === 'users-buyers')  loadUsers('buyer');
    if (section === 'users-experts') loadExperts();
    if (section === 'issues')        loadIssues();
    if (section === 'products')      loadProducts();
  }, [section]);

  useEffect(() => { if (!loading && user?.id) loadStats(); }, [loading, user?.id]);
  useEffect(() => { if (profile) setEditName(profile.full_name ?? ''); }, [profile]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const openUserModal = (u: ProfileWithExtras) => { setSelectedUser(u); setEditUserName(u.full_name || ''); setEditUserPhone(u.phone_number || ''); setEditUserRole(u.role); };

  const handleUpdateUser = async () => {
    if (!selectedUser) return; setSavingModal(true);
    try { await supabase.from('profiles').update({ full_name: editUserName, phone_number: editUserPhone, role: editUserRole }).eq('id', selectedUser.id); toast.success('User updated'); setSelectedUser(null); loadUsers(); loadStats(); }
    catch { toast.error('Failed to update user'); } finally { setSavingModal(false); }
  };
  const handleDeleteUser = async (id: string) => {
    if (!confirm('Delete this user permanently?')) return;
    try { await supabase.from('profiles').delete().eq('id', id); setUsers(p => p.filter(u => u.id !== id)); setSelectedUser(null); toast.success('User deleted'); loadStats(); }
    catch { toast.error('Failed'); }
  };
  const handleVerifyExpert = async (expertId: string, status: 'verified' | 'rejected') => {
    try { await supabase.from('expert_profiles').update({ verification_status: status } as any).eq('id', expertId); toast.success(`Expert ${status}`); setSelectedExpert(null); loadExperts(); loadStats(); }
    catch { toast.error('Update failed'); }
  };
  const handleUpdateIssue = async () => {
    if (!selectedIssue) return; setSavingModal(true);
    try { await supabase.from('crop_issues').update({ status: editIssueStatus }).eq('id', selectedIssue.id); toast.success('Issue updated'); setSelectedIssue(null); loadIssues(); loadStats(); }
    catch { toast.error('Failed'); } finally { setSavingModal(false); }
  };
  const handleDeleteIssue = async (id: string) => {
    if (!confirm('Delete this issue?')) return;
    try { await supabase.from('crop_issues').delete().eq('id', id); setIssues(p => p.filter(i => i.id !== id)); setSelectedIssue(null); toast.success('Deleted'); loadStats(); }
    catch { toast.error('Failed'); }
  };
  const handleUpdateProduct = async () => {
    if (!selectedProduct) return; setSavingModal(true);
    try { await supabase.from('products').update({ name: editProductName, price: parseFloat(editProductPrice), quantity: editProductQuantity, status: editProductStatus, description: editProductDescription }).eq('id', selectedProduct.id); toast.success('Product updated'); setSelectedProduct(null); loadProducts(); loadStats(); }
    catch { toast.error('Failed'); } finally { setSavingModal(false); }
  };
  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    try { await supabase.from('products').delete().eq('id', id); setProducts(p => p.filter(x => x.id !== id)); setSelectedProduct(null); toast.success('Deleted'); loadStats(); }
    catch { toast.error('Failed'); }
  };
  const handleSaveProfile = async () => {
    if (!user) return; setSavingProfile(true);
    try { await supabase.from('profiles').update({ full_name: editName }).eq('id', user.id); await refreshProfile(); toast.success('Updated!'); }
    catch { toast.error('Failed'); } finally { setSavingProfile(false); }
  };
  const handleSendPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushTitle || !pushMessage) return toast.warning('Fill in title and message.');
    setPushSending(true);
    try {
      const targetIds = pushTarget === 'all' ? pushFarmers.map(f => f.id) : [pushTarget];
      if (!targetIds.length) { toast.error('No recipients.'); return; }
      const { error } = await supabase.from('notifications').insert(targetIds.map(id => ({ user_id: id, title: pushTitle, message: pushMessage, type: 'admin_alert', is_read: false })));
      if (error) throw error;
      toast.success(`Sent to ${targetIds.length} farmer(s)!`); setPushTitle(''); setPushMessage('');
    } catch (err: any) { toast.error(err.message || 'Failed'); } finally { setPushSending(false); }
  };

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.phone_number?.includes(search)
  );

  const toggleGroup = (key: string) => setOpenGroups(p => ({ ...p, [key]: !p[key] }));

  // ── Nav ────────────────────────────────────────────────────────────────────
  const NAV = [
    {
      group: 'MAIN',
      items: [
        { id: 'overview' as NavSection, label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
      ]
    },
    {
      group: 'USERS',
      collapsible: true,
      items: [
        { id: 'users-all'     as NavSection, label: 'All Users',  icon: <Users size={16} />,    badge: stats?.totalUsers },
        { id: 'users-farmers' as NavSection, label: 'Farmers',    icon: <Sprout size={16} />,   badge: stats?.farmers },
        { id: 'users-buyers'  as NavSection, label: 'Buyers',     icon: <Building2 size={16} />,badge: stats?.buyers },
        { id: 'users-experts' as NavSection, label: 'Experts',    icon: <Star size={16} />,     badge: stats?.experts },
      ]
    },
    {
      group: 'CONTENT',
      items: [
        { id: 'issues'        as NavSection, label: 'Crop Issues', icon: <AlertTriangle size={16} />, badge: stats?.openIssues },
        { id: 'products'      as NavSection, label: 'Products',    icon: <Package size={16} />,       badge: stats?.activeProducts },
        { id: 'notifications' as NavSection, label: 'Push Alerts', icon: <Bell size={16} /> },
      ]
    },
    {
      group: 'SETTINGS',
      items: [
        { id: 'profile' as NavSection, label: 'Profile & Settings', icon: <Settings size={16} /> },
      ]
    },
  ];

  const sectionTitles: Record<NavSection, string> = {
    'overview':      'Dashboard',
    'users-all':     'All Users',
    'users-farmers': 'Farmers',
    'users-buyers':  'Buyers',
    'users-experts': 'Expert Verification',
    'issues':        'Crop Issues',
    'products':      'Products',
    'notifications': 'Push Notifications',
    'profile':       'Profile & Settings',
  };

  if (loading && !profile) return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="space-y-3 text-center"><Skeleton className="w-14 h-14 rounded-2xl mx-auto" /><Skeleton className="h-4 w-28 mx-auto" /></div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex h-screen bg-[hsl(var(--background))] overflow-hidden">

      {/* ══════ SIDEBAR ══════ */}
      <aside className={`flex flex-col bg-card border-r border-border/50 h-full shrink-0 transition-all duration-300 ${sidebarOpen ? 'w-[220px]' : 'w-[56px]'}`}>

        {/* Logo */}
        <div className="h-[56px] flex items-center px-3 border-b border-border/50 gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#1e5a32] flex items-center justify-center shrink-0">
            <Leaf size={16} className="text-white" />
          </div>
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-foreground truncate">Hamro Kisan</p>
              <p className="text-[10px] text-muted-foreground">Admin Console</p>
            </div>
          )}
          <button onClick={() => setSidebarOpen(v => !v)} className="w-6 h-6 rounded-md hover:bg-muted flex items-center justify-center transition-colors shrink-0">
            <Menu size={13} className="text-muted-foreground" />
          </button>
        </div>

        {/* Workspace pill */}
        {sidebarOpen && (
          <div className="px-3 py-2 shrink-0">
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-2.5 py-1.5 cursor-pointer hover:bg-muted transition-colors">
              <div className="w-5 h-5 rounded-md bg-[#1e5a32]/20 flex items-center justify-center shrink-0">
                <Sprout size={11} className="text-[#1e5a32]" />
              </div>
              <span className="text-xs font-bold text-foreground flex-1 truncate">Admin Workspace</span>
              <ChevronDown size={11} className="text-muted-foreground" />
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 [&::-webkit-scrollbar]:hidden space-y-0.5">
          {NAV.map(group => (
            <div key={group.group}>
              {sidebarOpen && (
                <div className="flex items-center justify-between px-2 mt-3 mb-1">
                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">{group.group}</p>
                  {group.collapsible && (
                    <button onClick={() => toggleGroup(group.group)} className="text-muted-foreground/60 hover:text-muted-foreground">
                      <ChevronDown size={11} className={`transition-transform ${openGroups[group.group] ? '' : '-rotate-90'}`} />
                    </button>
                  )}
                </div>
              )}
              {(!group.collapsible || openGroups[group.group] || !sidebarOpen) && group.items.map(item => {
                const active = section === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSection(item.id)}
                    title={!sidebarOpen ? item.label : undefined}
                    className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium transition-all relative
                      ${active ? 'bg-[#1e5a32] text-white' : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'}
                      ${!sidebarOpen ? 'justify-center' : ''}
                    `}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {sidebarOpen && (
                      <>
                        <span className="flex-1 text-left truncate text-[13px]">{item.label}</span>
                        {'badge' in item && item.badge !== undefined && item.badge > 0 && (
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md min-w-[20px] text-center leading-none tabular-nums
                            ${active ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'}`}>
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                    {!sidebarOpen && 'badge' in item && item.badge !== undefined && item.badge > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center">
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="shrink-0 border-t border-border/50 p-2 space-y-1">
          {/* Dark mode placeholder */}
          {sidebarOpen && (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
              <Moon size={14} className="text-muted-foreground" />
              <span className="text-[12px] text-muted-foreground flex-1">Dark Mode</span>
              <div className="w-8 h-4 rounded-full bg-muted border border-border/50 relative cursor-pointer">
                <div className="absolute left-0.5 top-0.5 w-3 h-3 rounded-full bg-muted-foreground/60" />
              </div>
            </div>
          )}
          {/* User */}
          <button onClick={() => setSection('profile')}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/70 transition-colors ${!sidebarOpen ? 'justify-center' : ''}`}>
            <div className="w-7 h-7 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center shrink-0">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : <User size={13} className="text-primary" />}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[12px] font-bold text-foreground truncate">{profile?.full_name || 'Admin'}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
              </div>
            )}
          </button>
          <button onClick={logout} title="Logout"
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 transition-colors ${!sidebarOpen ? 'justify-center' : ''}`}>
            <LogOut size={14} className="shrink-0" />
            {sidebarOpen && <span className="text-[12px] font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* ══════ MAIN ══════ */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">

        {/* Top bar */}
        <header className="h-[56px] bg-card border-b border-border/50 flex items-center px-6 gap-4 shrink-0">
          <h1 className="text-lg font-black text-foreground">{sectionTitles[section]}</h1>
          <div className="flex-1" />

          {/* Search */}
          <button
            onClick={() => setCmdOpen(true)}
            className="flex items-center gap-2 bg-muted/50 hover:bg-muted border border-border/50 rounded-xl px-3 py-1.5 text-sm text-muted-foreground transition-colors w-52"
          >
            <Search size={14} />
            <span className="flex-1 text-left text-[13px]">Search anything</span>
            <kbd className="text-[10px] bg-background border border-border/50 rounded px-1.5 py-0.5 font-mono">⌘K</kbd>
          </button>

          {/* Notification bell */}
          <button className="relative w-9 h-9 rounded-xl hover:bg-muted flex items-center justify-center transition-colors">
            <Bell size={16} className="text-muted-foreground" />
            {stats?.pendingVerifications ? (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                {stats.pendingVerifications}
              </span>
            ) : null}
          </button>

          {/* Refresh */}
          <button onClick={loadStats} className="w-9 h-9 rounded-xl hover:bg-muted flex items-center justify-center transition-colors">
            <RefreshCw size={14} className="text-muted-foreground" />
          </button>

          {/* Avatar */}
          <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center border-2 border-border/50 cursor-pointer" onClick={() => setSection('profile')}>
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : <User size={14} className="text-primary" />}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-[hsl(var(--background))] [&::-webkit-scrollbar]:hidden">
          <div className="p-6 space-y-5">

            {/* ══════════ OVERVIEW ══════════ */}
            {section === 'overview' && (
              <>
                {/* Stat cards */}
                {statsLoading
                  ? <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
                  : (
                    <div className="grid grid-cols-4 gap-4">
                      <StatCard label="Total Users"    value={stats?.totalUsers ?? 0}           sub={`${stats?.farmers} farmers · ${stats?.buyers} buyers`} icon={<Users size={18} />}        iconBg="bg-blue-50 dark:bg-blue-900/20"    iconColor="text-blue-600 dark:text-blue-400"    trend="+12%" />
                      <StatCard label="Active Products" value={stats?.activeProducts ?? 0}        sub="listed by farmers"                                     icon={<ShoppingBag size={18} />}   iconBg="bg-purple-50 dark:bg-purple-900/20" iconColor="text-purple-600 dark:text-purple-400" />
                      <StatCard label="Open Issues"    value={stats?.openIssues ?? 0}            sub="awaiting expert advice"                                 icon={<AlertTriangle size={18} />} iconBg="bg-amber-50 dark:bg-amber-900/20"   iconColor="text-amber-600 dark:text-amber-400"  />
                      <StatCard label="Pending Experts" value={stats?.pendingVerifications ?? 0}  sub="awaiting verification"                                  icon={<ShieldCheck size={18} />}   iconBg="bg-red-50 dark:bg-red-900/20"       iconColor="text-red-600 dark:text-red-400"      />
                    </div>
                  )}

                {/* Charts row */}
                <div className="grid grid-cols-3 gap-4">

                  {/* Growth chart */}
                  <div className="col-span-2 bg-card rounded-2xl border border-border/50 p-5">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-bold text-foreground">User Growth</h3>
                      <div className="flex gap-1">
                        {['Monthly', 'Quarterly', 'Yearly'].map((t, i) => (
                          <button key={t} className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${i === 0 ? 'bg-[#1e5a32] text-white' : 'text-muted-foreground hover:bg-muted'}`}>{t}</button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mb-4">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-2 h-2 rounded-full bg-[#1e5a32] inline-block" />Farmers</span>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Buyers</span>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={growthData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap="35%">
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: 12 }} cursor={{ fill: 'hsl(var(--muted))' }} />
                        <Bar dataKey="farmers" fill="#1e5a32" radius={[4, 4, 0, 0]} name="Farmers" />
                        <Bar dataKey="buyers"  fill="#93c5fd" radius={[4, 4, 0, 0]} name="Buyers" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Pie chart - user breakdown */}
                  <div className="bg-card rounded-2xl border border-border/50 p-5">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-bold text-foreground">User Breakdown</h3>
                      <button className="text-xs text-[#1e5a32] font-bold hover:underline">See All</button>
                    </div>
                    <div className="flex items-center justify-center my-2">
                      <div className="relative">
                        <PieChart width={140} height={140}>
                          <Pie data={pieData} cx={65} cy={65} innerRadius={42} outerRadius={62} dataKey="value" strokeWidth={0}>
                            {pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                          </Pie>
                        </PieChart>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <p className="text-[10px] text-muted-foreground">Total</p>
                          <p className="text-lg font-black text-foreground">{stats?.totalUsers ?? 0}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 mt-2">
                      {[
                        { label: 'Farmers', value: stats?.farmers ?? 0, color: PIE_COLORS[0], pct: Math.round(((stats?.farmers ?? 0) / Math.max(stats?.totalUsers ?? 1, 1)) * 100) },
                        { label: 'Buyers',  value: stats?.buyers  ?? 0, color: PIE_COLORS[1], pct: Math.round(((stats?.buyers  ?? 0) / Math.max(stats?.totalUsers ?? 1, 1)) * 100) },
                        { label: 'Experts', value: stats?.experts ?? 0, color: PIE_COLORS[2], pct: Math.round(((stats?.experts ?? 0) / Math.max(stats?.totalUsers ?? 1, 1)) * 100) },
                      ].map(r => (
                        <div key={r.label} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color }} />
                            {r.label}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="font-bold text-foreground">{r.value}</span>
                            <span className="text-muted-foreground w-8 text-right">{r.pct}%</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom row */}
                <div className="grid grid-cols-3 gap-4">

                  {/* Recent activity */}
                  <div className="bg-card rounded-2xl border border-border/50 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-foreground">Recent Activity</h3>
                      <button onClick={() => setSection('issues')} className="text-xs text-[#1e5a32] font-bold hover:underline">See All</button>
                    </div>
                    <div className="space-y-3">
                      {statsLoading ? [1,2,3,4].map(i => <div key={i} className="flex items-center gap-3"><Skeleton className="w-9 h-9 rounded-xl" /><div className="flex-1 space-y-1"><Skeleton className="h-3 w-3/4" /><Skeleton className="h-2.5 w-1/2" /></div></div>) :
                      [
                        { icon: <Users size={14} />, bg: 'bg-blue-100 dark:bg-blue-900/30', color: 'text-blue-600', label: 'New farmer registered', sub: 'Just now', badge: 'New User', badgeColor: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20' },
                        { icon: <AlertTriangle size={14} />, bg: 'bg-amber-100 dark:bg-amber-900/30', color: 'text-amber-600', label: `${stats?.openIssues ?? 0} open crop issues`, sub: 'Ongoing', badge: 'Pending', badgeColor: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20' },
                        { icon: <ShieldCheck size={14} />, bg: 'bg-purple-100 dark:bg-purple-900/30', color: 'text-purple-600', label: `${stats?.pendingVerifications ?? 0} experts pending`, sub: 'Awaiting review', badge: 'Review', badgeColor: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20' },
                        { icon: <ShoppingBag size={14} />, bg: 'bg-emerald-100 dark:bg-emerald-900/30', color: 'text-emerald-600', label: `${stats?.activeProducts ?? 0} active listings`, sub: 'Products', badge: 'Active', badgeColor: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' },
                      ].map((a, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${a.bg}`}>
                            <span className={a.color}>{a.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-bold text-foreground truncate">{a.label}</p>
                            <p className="text-[11px] text-muted-foreground">{a.sub}</p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${a.badgeColor}`}>{a.badge}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Nepal Map */}
                  <div className="bg-card rounded-2xl border border-border/50 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5"><MapPin size={13} className="text-[#1e5a32]" />Farmer Distribution</h3>
                      <span className="text-[10px] text-muted-foreground">by district</span>
                    </div>
                    <NepalMap farmersByDistrict={farmersByDistrict} />
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {Object.entries(farmersByDistrict).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([d,c]) => (
                        <span key={d} className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 px-2 py-0.5 rounded-md font-semibold capitalize">{d}: {c}</span>
                      ))}
                    </div>
                  </div>

                  {/* Top Products */}
                  <div className="bg-card rounded-2xl border border-border/50 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-foreground">Quick Actions</h3>
                      <div className="flex gap-1">
                        <button className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"><SlidersHorizontal size={13} className="text-muted-foreground" /></button>
                        <button className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"><MoreHorizontal size={13} className="text-muted-foreground" /></button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {[
                        { label: 'Review Verifications', sub: `${stats?.pendingVerifications ?? 0} pending`, icon: <ShieldCheck size={14} />, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', go: 'users-experts' as NavSection },
                        { label: 'Manage Crop Issues',   sub: `${stats?.openIssues ?? 0} open`,    icon: <AlertTriangle size={14} />, color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-900/20',  go: 'issues' as NavSection },
                        { label: 'View All Products',    sub: `${stats?.activeProducts ?? 0} active`, icon: <Package size={14} />,        color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/20',   go: 'products' as NavSection },
                        { label: 'Broadcast Alert',      sub: 'Send to all farmers',                  icon: <BellRing size={14} />,       color: 'text-[#1e5a32]',  bg: 'bg-emerald-50 dark:bg-emerald-900/20', go: 'notifications' as NavSection },
                      ].map(a => (
                        <button key={a.label} onClick={() => setSection(a.go)}
                          className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-all text-left group">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${a.bg}`}>
                            <span className={a.color}>{a.icon}</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-[12px] font-bold text-foreground">{a.label}</p>
                            <p className="text-[11px] text-muted-foreground">{a.sub}</p>
                          </div>
                          <ChevronRight size={13} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ══════════ USER TABLE ══════════ */}
            {(section === 'users-all' || section === 'users-farmers' || section === 'users-buyers') && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 max-w-xs">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Search name or phone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 bg-card border-border/50 rounded-xl text-[13px]" />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">{filteredUsers.length} users</span>
                </div>
                <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/50">
                        {['User', 'Role', 'District', 'Verification', 'Joined', ''].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dataLoading ? Array.from({ length: 7 }).map((_, i) => (
                        <tr key={i} className="border-b border-border/30">
                          {Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 rounded" /></td>)}
                        </tr>
                      )) : filteredUsers.length === 0
                        ? <tr><td colSpan={6} className="text-center py-14 text-muted-foreground text-sm">No users found</td></tr>
                        : filteredUsers.map(u => (
                          <tr key={u.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors group">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center shrink-0">
                                  {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : <User size={14} className="text-primary" />}
                                </div>
                                <div>
                                  <p className="text-[13px] font-bold text-foreground">{u.full_name || '—'}</p>
                                  <p className="text-[11px] text-muted-foreground">{u.phone_number || '—'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border capitalize ${ROLE_COLORS[u.role]}`}>{u.role}</span>
                            </td>
                            <td className="px-4 py-3 text-[12px] text-muted-foreground">
                              {u.farmer_profile?.district || u.buyer_profile?.district || '—'}
                            </td>
                            <td className="px-4 py-3">
                              {u.role === 'expert' && u.expert_profile?.verification_status ? (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${STATUS_COLORS[u.expert_profile.verification_status] || ''}`}>
                                  <CircleDot size={8} />{u.expert_profile.verification_status}
                                </span>
                              ) : <span className="text-[11px] text-muted-foreground">—</span>}
                            </td>
                            <td className="px-4 py-3 text-[12px] text-muted-foreground">
                              {u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB') : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openUserModal(u)} className="w-7 h-7 rounded-lg hover:bg-primary/10 hover:text-primary flex items-center justify-center text-muted-foreground transition-colors"><Eye size={13} /></button>
                                <button onClick={() => handleDeleteUser(u.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 flex items-center justify-center text-muted-foreground transition-colors"><Trash2 size={13} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ══════════ EXPERTS ══════════ */}
            {section === 'users-experts' && (
              <div className="space-y-4">
                {experts.filter(e => e.verification_status === 'pending').length > 0 && (
                  <div className="flex items-center gap-2.5 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl">
                    <ShieldX size={14} className="text-amber-600 shrink-0" />
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-400">{experts.filter(e => e.verification_status === 'pending').length} expert(s) awaiting verification</p>
                  </div>
                )}
                <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/50">
                        {['Expert', 'Specialization', 'Experience', 'Status', ''].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dataLoading ? Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b border-border/30">
                          {Array.from({ length: 5 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 rounded" /></td>)}
                        </tr>
                      )) : experts.map(exp => {
                        const status = exp.verification_status ?? 'unverified';
                        return (
                          <tr key={exp.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors group">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center shrink-0">
                                  {exp.profile?.avatar_url ? <img src={exp.profile.avatar_url} alt="" className="w-full h-full object-cover" /> : <User size={14} className="text-purple-600" />}
                                </div>
                                <div>
                                  <p className="text-[13px] font-bold text-foreground">{exp.profile?.full_name || '—'}</p>
                                  <p className="text-[11px] text-muted-foreground">{exp.profile?.phone_number || '—'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-[13px] text-muted-foreground">{exp.specialization || '—'}</td>
                            <td className="px-4 py-3 text-[13px] text-muted-foreground">{exp.experience_years ? `${exp.experience_years} yrs` : '—'}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${STATUS_COLORS[status] || ''}`}>
                                <CircleDot size={8} />{status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setSelectedExpert(exp)} className="w-7 h-7 rounded-lg hover:bg-primary/10 hover:text-primary flex items-center justify-center text-muted-foreground transition-colors"><Eye size={13} /></button>
                                {status === 'pending' && (
                                  <>
                                    <button onClick={() => handleVerifyExpert(exp.id, 'verified')} className="w-7 h-7 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20 flex items-center justify-center text-muted-foreground transition-colors"><CheckCircle size={13} /></button>
                                    <button onClick={() => handleVerifyExpert(exp.id, 'rejected')} className="w-7 h-7 rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 flex items-center justify-center text-muted-foreground transition-colors"><XCircle size={13} /></button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ══════════ ISSUES ══════════ */}
            {section === 'issues' && (
              <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/50">
                  <h3 className="text-sm font-bold text-foreground">All Crop Issues</h3>
                  <span className="text-xs text-muted-foreground">{issues.length} total</span>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/20">
                      {['Crop', 'Farmer', 'Description', 'Status', 'Reported', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dataLoading ? Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-b border-border/30">{Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 rounded" /></td>)}</tr>
                    )) : issues.length === 0
                      ? <tr><td colSpan={6} className="text-center py-14 text-muted-foreground text-sm">No issues found</td></tr>
                      : issues.map(issue => (
                        <tr key={issue.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors group">
                          <td className="px-4 py-3 text-[13px] font-bold text-foreground">{issue.crop_name || 'Unknown'}</td>
                          <td className="px-4 py-3 text-[13px] text-muted-foreground">{issue.farmer?.full_name || '—'}</td>
                          <td className="px-4 py-3 text-[12px] text-muted-foreground max-w-[200px]">
                            <p className="truncate">{issue.description}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${issue.status === 'resolved' ? STATUS_COLORS.resolved : STATUS_COLORS.open}`}>
                              <CircleDot size={8} />{issue.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[12px] text-muted-foreground">{issue.created_at ? new Date(issue.created_at).toLocaleDateString('en-GB') : '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setSelectedIssue(issue); setEditIssueStatus(issue.status ?? 'pending'); }} className="w-7 h-7 rounded-lg hover:bg-primary/10 hover:text-primary flex items-center justify-center text-muted-foreground transition-colors"><Eye size={13} /></button>
                              <button onClick={() => handleDeleteIssue(issue.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 flex items-center justify-center text-muted-foreground transition-colors"><Trash2 size={13} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ══════════ PRODUCTS ══════════ */}
            {section === 'products' && (
              <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/50">
                  <h3 className="text-sm font-bold text-foreground">All Products</h3>
                  <div className="flex gap-2">
                    <button className="text-[12px] font-bold text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-muted transition-colors"><SlidersHorizontal size={12} />Sort</button>
                    <button className="text-[12px] font-bold text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-muted transition-colors"><Search size={12} />Filter</button>
                  </div>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/20">
                      {['Product', 'Farmer', 'Price', 'Quantity', 'Status', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dataLoading ? Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-b border-border/30">{Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 rounded" /></td>)}</tr>
                    )) : products.length === 0
                      ? <tr><td colSpan={6} className="text-center py-14 text-muted-foreground text-sm">No products</td></tr>
                      : products.map(prod => (
                        <tr key={prod.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors group">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl overflow-hidden bg-muted shrink-0 border border-border/50">
                                {prod.photo_url ? <img src={prod.photo_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Leaf size={16} className="text-muted-foreground/40" /></div>}
                              </div>
                              <div>
                                <p className="text-[13px] font-bold text-foreground">{prod.name}</p>
                                <p className="text-[11px] text-muted-foreground">{prod.category || '—'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[13px] text-muted-foreground">{prod.farmer?.full_name || '—'}</td>
                          <td className="px-4 py-3 text-[13px] font-bold text-foreground">Rs.{prod.price}</td>
                          <td className="px-4 py-3 text-[13px] text-muted-foreground">{prod.quantity || '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${STATUS_COLORS[prod.status ?? 'active']}`}>
                              <CircleDot size={8} />{prod.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setSelectedProduct(prod); setEditProductName(prod.name); setEditProductPrice(String(prod.price)); setEditProductQuantity(prod.quantity || ''); setEditProductStatus(prod.status ?? 'active'); setEditProductDescription(prod.description || ''); }} className="w-7 h-7 rounded-lg hover:bg-primary/10 hover:text-primary flex items-center justify-center text-muted-foreground transition-colors"><Eye size={13} /></button>
                              <button onClick={() => handleDeleteProduct(prod.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 flex items-center justify-center text-muted-foreground transition-colors"><Trash2 size={13} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ══════════ PUSH NOTIFICATIONS ══════════ */}
            {section === 'notifications' && (
              <div className="max-w-2xl space-y-5">
                <div className="bg-card rounded-2xl border border-border/50 p-5">
                  <h3 className="text-sm font-bold text-foreground mb-4">Quick Templates</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {PUSH_TEMPLATES.map((t, i) => (
                      <button key={i} onClick={() => { setPushTitle(t.title); setPushMessage(t.message); }}
                        className="flex items-start gap-3 p-3.5 rounded-xl border border-border/50 hover:border-[#1e5a32]/40 hover:bg-[#1e5a32]/5 transition-all text-left group">
                        <span className="text-xl shrink-0">{t.emoji}</span>
                        <div>
                          <p className="text-[12px] font-bold text-foreground group-hover:text-[#1e5a32] transition-colors">{t.title}</p>
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{t.message}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-card rounded-2xl border border-border/50 p-5">
                  <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2"><BellRing size={14} className="text-[#1e5a32]" />Compose Alert</h3>
                  <form onSubmit={handleSendPush} className="space-y-4">
                    <div>
                      <Label className="text-[12px] font-bold mb-1.5 block">Recipient</Label>
                      <Select value={pushTarget} onValueChange={setPushTarget}>
                        <SelectTrigger className="h-10 bg-muted/30 border-border/50 rounded-xl text-[13px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Farmers ({pushFarmers.length})</SelectItem>
                          {pushFarmers.map(f => <SelectItem key={f.id} value={f.id}>{f.full_name || 'Unnamed'}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[12px] font-bold mb-1.5 block">Title</Label>
                      <Input value={pushTitle} onChange={e => setPushTitle(e.target.value)} placeholder="Notification title..." className="h-10 bg-muted/30 border-border/50 rounded-xl" disabled={pushSending} />
                    </div>
                    <div>
                      <Label className="text-[12px] font-bold mb-1.5 block">Message</Label>
                      <Textarea value={pushMessage} onChange={e => setPushMessage(e.target.value)} placeholder="Write your message..." className="min-h-[100px] bg-muted/30 border-border/50 rounded-xl resize-none" disabled={pushSending} />
                    </div>
                    <Button type="submit" disabled={pushSending} className="w-full h-10 font-bold rounded-xl bg-[#1e5a32] hover:bg-[#1e5a32]/90 gap-2">
                      {pushSending ? 'Sending...' : <><Send size={14} />Send Notification</>}
                    </Button>
                  </form>
                </div>
              </div>
            )}

            {/* ══════════ PROFILE ══════════ */}
            {section === 'profile' && (
              <div className="max-w-3xl space-y-5">
                <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                  <div className="bg-[#1e5a32] px-8 py-8 flex items-center gap-6">
                    <div className="w-20 h-20 rounded-full border-4 border-white/20 overflow-hidden bg-white/10 flex items-center justify-center">
                      {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : <User size={30} className="text-white/80" />}
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-white">{profile?.full_name || 'Admin'}</h2>
                      <p className="text-white/70 text-sm">{user?.email}</p>
                      <div className="inline-flex items-center gap-1.5 mt-2 bg-white/10 px-2.5 py-1 rounded-full">
                        <ShieldCheck size={11} className="text-yellow-300" />
                        <span className="text-[11px] font-bold text-yellow-200">Administrator</span>
                      </div>
                    </div>
                    <div className="ml-auto flex gap-4">
                      {[{ label: 'Users', v: stats?.totalUsers }, { label: 'Farmers', v: stats?.farmers }, { label: 'Experts', v: stats?.experts }].map(s => (
                        <div key={s.label} className="bg-white/10 rounded-xl px-5 py-3 text-center">
                          <p className="text-xl font-black text-white">{s.v ?? '—'}</p>
                          <p className="text-white/60 text-xs">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
                    <h3 className="text-sm font-bold text-[#1e5a32] border-b border-border/50 pb-2">Edit Profile</h3>
                    <div><Label className="text-[12px] font-semibold mb-1.5 block">Display Name</Label><Input value={editName} onChange={e => setEditName(e.target.value)} className="h-11 bg-muted/30 border-border/50 rounded-xl" /></div>
                    <div><Label className="text-[12px] font-semibold mb-1.5 block">Email</Label><Input value={user?.email ?? ''} disabled className="h-11 bg-muted/20 border-border/30 rounded-xl opacity-60" /></div>
                    <Button onClick={handleSaveProfile} disabled={savingProfile} className="w-full h-11 font-bold rounded-xl bg-[#1e5a32] hover:bg-[#1e5a32]/90">{savingProfile ? 'Saving...' : 'Save Changes'}</Button>
                  </div>
                  <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-2">
                    <h3 className="text-sm font-bold text-[#1e5a32] border-b border-border/50 pb-2 mb-4">Quick Links</h3>
                    {[
                      { label: 'View All Farmers', sub: `${stats?.farmers ?? '—'} registered`, go: 'users-farmers' as NavSection },
                      { label: 'Expert Verifications', sub: `${stats?.pendingVerifications ?? '—'} pending`, go: 'users-experts' as NavSection },
                      { label: 'Broadcast Alert', sub: 'Push notifications', go: 'notifications' as NavSection },
                    ].map(a => (
                      <button key={a.label} onClick={() => setSection(a.go)} className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/50 transition-all text-left">
                        <div><p className="text-[13px] font-bold text-foreground">{a.label}</p><p className="text-[11px] text-muted-foreground">{a.sub}</p></div>
                        <ChevronRight size={14} className="text-muted-foreground" />
                      </button>
                    ))}
                    <Button variant="destructive" onClick={logout} className="w-full h-10 font-bold rounded-xl mt-4 gap-2"><LogOut size={14} />Logout</Button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* ══════════ MODALS ══════════ */}

      {/* User */}
      <Dialog open={!!selectedUser} onOpenChange={o => !o && setSelectedUser(null)}>
        <DialogContent className="max-w-[420px] rounded-3xl p-0 overflow-hidden bg-card">
          {selectedUser && (
            <>
              <div className="bg-[#1e5a32] p-6 text-center">
                <div className="w-16 h-16 rounded-full border-2 border-white/20 bg-white/10 flex items-center justify-center mx-auto mb-3 overflow-hidden">
                  {selectedUser.avatar_url ? <img src={selectedUser.avatar_url} alt="" className="w-full h-full object-cover" /> : <User size={26} className="text-white/80" />}
                </div>
                <h2 className="text-lg font-black text-white">{selectedUser.full_name || 'User'}</h2>
                <p className="text-white/60 text-xs">{selectedUser.phone_number || '—'}</p>
              </div>
              <div className="p-6 space-y-4">
                <div><Label className="text-[12px] font-semibold mb-1.5 block">Full Name</Label><Input value={editUserName} onChange={e => setEditUserName(e.target.value)} className="h-11 bg-muted/30 border-border/50 rounded-xl" /></div>
                <div><Label className="text-[12px] font-semibold mb-1.5 block">Phone</Label><Input value={editUserPhone} onChange={e => setEditUserPhone(e.target.value)} className="h-11 bg-muted/30 border-border/50 rounded-xl" /></div>
                <div>
                  <Label className="text-[12px] font-semibold mb-1.5 block">Role</Label>
                  <Select value={editUserRole} onValueChange={v => setEditUserRole(v as UserRole)}>
                    <SelectTrigger className="h-11 bg-muted/30 border-border/50 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="farmer">Farmer</SelectItem><SelectItem value="buyer">Buyer</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem><SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-3"><Button variant="outline" className="flex-1 h-11 rounded-xl" onClick={() => setSelectedUser(null)}>Cancel</Button><Button className="flex-1 h-11 font-bold rounded-xl bg-[#1e5a32] hover:bg-[#1e5a32]/90" onClick={handleUpdateUser} disabled={savingModal}><Save size={14} className="mr-2" />{savingModal ? 'Saving...' : 'Save'}</Button></div>
                <Button variant="destructive" className="w-full h-11 rounded-xl" onClick={() => handleDeleteUser(selectedUser.id)}><Trash2 size={14} className="mr-2" />Delete User</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Expert */}
      <Dialog open={!!selectedExpert} onOpenChange={o => !o && setSelectedExpert(null)}>
        <DialogContent className="max-w-[420px] rounded-3xl p-0 overflow-hidden bg-card max-h-[90vh] overflow-y-auto">
          {selectedExpert && (
            <>
              <div className="bg-[#1e5a32] p-6 text-center sticky top-0 z-10">
                <button onClick={() => setSelectedExpert(null)} className="absolute top-4 right-4 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"><X size={15} /></button>
                <div className="w-16 h-16 rounded-full border-2 border-white/20 bg-white/10 flex items-center justify-center mx-auto mb-3 overflow-hidden">
                  {selectedExpert.profile?.avatar_url ? <img src={selectedExpert.profile.avatar_url} alt="" className="w-full h-full object-cover" /> : <User size={26} className="text-white/80" />}
                </div>
                <h2 className="text-lg font-black text-white">{selectedExpert.profile?.full_name}</h2>
                <p className="text-white/60 text-xs">{selectedExpert.specialization}</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/40 rounded-xl p-3 text-center"><p className="text-xl font-black text-foreground">{selectedExpert.experience_years}</p><p className="text-[10px] text-muted-foreground">Years Exp.</p></div>
                  <div className="bg-muted/40 rounded-xl p-3 text-center"><p className="text-sm font-bold text-foreground truncate">{selectedExpert.profile?.phone_number ?? '—'}</p><p className="text-[10px] text-muted-foreground">Phone</p></div>
                </div>
                <p className="text-[12px] font-bold text-foreground flex items-center gap-1.5"><FileText size={13} className="text-[#1e5a32]" />Documents</p>
                {selectedExpert.document_url && (
                  <div className="w-full h-40 bg-muted/30 rounded-xl overflow-hidden border border-border/50 relative group cursor-pointer" onClick={() => setFullscreenImage(selectedExpert.document_url!)}>
                    <img src={selectedExpert.document_url} alt="" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center"><Eye size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                  </div>
                )}
                {selectedExpert.selfie_url && (
                  <div className="w-full h-40 bg-muted/30 rounded-xl overflow-hidden border border-border/50 relative group cursor-pointer" onClick={() => setFullscreenImage(selectedExpert.selfie_url!)}>
                    <img src={selectedExpert.selfie_url} alt="" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center"><Eye size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                  </div>
                )}
                {!selectedExpert.document_url && !selectedExpert.selfie_url && (
                  <div className="bg-muted/40 rounded-xl p-5 text-center border border-dashed border-border/60"><p className="text-xs text-muted-foreground">No documents uploaded</p></div>
                )}
                {selectedExpert.verification_status === 'pending' && (
                  <div className="grid grid-cols-2 gap-3"><Button variant="destructive" className="h-11 font-bold rounded-xl" onClick={() => handleVerifyExpert(selectedExpert.id, 'rejected')}><XCircle size={14} className="mr-1.5" />Reject</Button><Button className="h-11 font-bold rounded-xl bg-[#1e5a32] hover:bg-[#1e5a32]/90" onClick={() => handleVerifyExpert(selectedExpert.id, 'verified')}><CheckCircle size={14} className="mr-1.5" />Verify</Button></div>
                )}
                {selectedExpert.verification_status !== 'pending' && (
                  <div className="text-center p-3 bg-muted/40 rounded-xl">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[12px] font-bold border ${STATUS_COLORS[selectedExpert.verification_status ?? 'unverified']}`}>{selectedExpert.verification_status}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Issue */}
      <Dialog open={!!selectedIssue} onOpenChange={o => !o && setSelectedIssue(null)}>
        <DialogContent className="max-w-[420px] rounded-3xl p-0 overflow-hidden bg-card max-h-[90vh] overflow-y-auto">
          {selectedIssue && (
            <>
              <DialogHeader className="bg-[#1e5a32] p-6 text-center">
                <DialogTitle className="text-lg font-black text-white">{selectedIssue.crop_name || 'Crop Issue'}</DialogTitle>
                <DialogDescription className="text-white/60 text-xs">by {selectedIssue.farmer?.full_name || 'Unknown'}</DialogDescription>
              </DialogHeader>
              <div className="p-6 space-y-4">
                {selectedIssue.image_url && (
                  <div className="w-full h-48 bg-muted/30 rounded-xl overflow-hidden border border-border/50 relative group cursor-pointer" onClick={() => setFullscreenImage(selectedIssue.image_url!)}>
                    <img src={selectedIssue.image_url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center"><Eye size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                  </div>
                )}
                <div className="p-3 bg-muted/30 rounded-xl text-[13px] text-foreground">{selectedIssue.description}</div>
                <div>
                  <Label className="text-[12px] font-semibold mb-1.5 block">Update Status</Label>
                  <Select value={editIssueStatus} onValueChange={v => setEditIssueStatus(v as IssueStatus)}>
                    <SelectTrigger className="h-11 bg-muted/30 border-border/50 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="resolved">Resolved</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="flex gap-3"><Button variant="outline" className="flex-1 h-11 rounded-xl" onClick={() => setSelectedIssue(null)}>Cancel</Button><Button className="flex-1 h-11 font-bold rounded-xl bg-[#1e5a32] hover:bg-[#1e5a32]/90" onClick={handleUpdateIssue} disabled={savingModal}><Save size={14} className="mr-2" />{savingModal ? 'Saving...' : 'Update'}</Button></div>
                <Button variant="destructive" className="w-full h-11 rounded-xl" onClick={() => handleDeleteIssue(selectedIssue.id)}><Trash2 size={14} className="mr-2" />Delete Issue</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Product */}
      <Dialog open={!!selectedProduct} onOpenChange={o => !o && setSelectedProduct(null)}>
        <DialogContent className="max-w-[420px] rounded-3xl p-0 overflow-hidden bg-card max-h-[90vh] overflow-y-auto">
          {selectedProduct && (
            <>
              <DialogHeader className="bg-[#1e5a32] p-6 text-center">
                <DialogTitle className="text-lg font-black text-white">{selectedProduct.name}</DialogTitle>
                <DialogDescription className="text-white/60 text-xs">by {selectedProduct.farmer?.full_name || 'Unknown'}</DialogDescription>
              </DialogHeader>
              <div className="p-6 space-y-4">
                {selectedProduct.photo_url && (
                  <div className="w-full h-48 bg-muted/30 rounded-xl overflow-hidden border border-border/50 relative group cursor-pointer" onClick={() => setFullscreenImage(selectedProduct.photo_url!)}>
                    <img src={selectedProduct.photo_url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center"><Eye size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                  </div>
                )}
                <div><Label className="text-[12px] font-semibold mb-1.5 block">Name</Label><Input value={editProductName} onChange={e => setEditProductName(e.target.value)} className="h-11 bg-muted/30 border-border/50 rounded-xl" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-[12px] font-semibold mb-1.5 block">Price (Rs.)</Label><Input type="number" value={editProductPrice} onChange={e => setEditProductPrice(e.target.value)} className="h-11 bg-muted/30 border-border/50 rounded-xl" /></div>
                  <div><Label className="text-[12px] font-semibold mb-1.5 block">Quantity</Label><Input value={editProductQuantity} onChange={e => setEditProductQuantity(e.target.value)} className="h-11 bg-muted/30 border-border/50 rounded-xl" /></div>
                </div>
                <div><Label className="text-[12px] font-semibold mb-1.5 block">Description</Label><Textarea value={editProductDescription} onChange={e => setEditProductDescription(e.target.value)} className="min-h-[80px] bg-muted/30 border-border/50 rounded-xl resize-none" /></div>
                <div>
                  <Label className="text-[12px] font-semibold mb-1.5 block">Status</Label>
                  <Select value={editProductStatus} onValueChange={v => setEditProductStatus(v as ProductStatus)}>
                    <SelectTrigger className="h-11 bg-muted/30 border-border/50 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="sold">Sold</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="flex gap-3"><Button variant="outline" className="flex-1 h-11 rounded-xl" onClick={() => setSelectedProduct(null)}>Cancel</Button><Button className="flex-1 h-11 font-bold rounded-xl bg-[#1e5a32] hover:bg-[#1e5a32]/90" onClick={handleUpdateProduct} disabled={savingModal}><Save size={14} className="mr-2" />{savingModal ? 'Saving...' : 'Update'}</Button></div>
                <Button variant="destructive" className="w-full h-11 rounded-xl" onClick={() => handleDeleteProduct(selectedProduct.id)}><Trash2 size={14} className="mr-2" />Delete Product</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Fullscreen image */}
      <Dialog open={!!fullscreenImage} onOpenChange={o => !o && setFullscreenImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-0">
          <button onClick={() => setFullscreenImage(null)} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-50 transition-colors"><X size={16} /></button>
          {fullscreenImage && <img src={fullscreenImage} alt="" className="max-w-full max-h-[90vh] object-contain mx-auto" />}
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default AdminDashboard;
