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
  Home, Settings, LayoutDashboard, UserCheck, UserX, Sprout,
  Building2, Star, Filter, MoreHorizontal, Bell, ChevronDown,
  ArrowUpRight, CircleDot, SlidersHorizontal
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from '@/components/ui/select';
import { toast } from '@/utils/toast';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';

// ─── Type aliases from DB ──────────────────────────────────────────────────────
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

// ─── Nav config ───────────────────────────────────────────────────────────────
type NavSection =
  | 'overview'
  | 'users-all'
  | 'users-farmers'
  | 'users-buyers'
  | 'users-experts'
  | 'issues'
  | 'products'
  | 'notifications'
  | 'profile';

interface NavItem {
  id: NavSection;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  group: string;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard: React.FC<{
  label: string; value: number | string; sub?: string;
  icon: React.ReactNode; color: string; trend?: string;
}> = ({ label, value, sub, icon, color, trend }) => (
  <Card className="rounded-2xl border-border/50 shadow-sm hover:shadow-md transition-shadow bg-card">
    <CardContent className="p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: `${color}18` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        {trend && (
          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-500">
            <ArrowUpRight size={12} />{trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-black text-foreground">{value}</p>
      <p className="text-xs font-semibold text-foreground mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </CardContent>
  </Card>
);

// ─── User Table Row ───────────────────────────────────────────────────────────
const UserRow: React.FC<{
  user: ProfileWithExtras;
  onClick: () => void;
  onDelete: () => void;
}> = ({ user, onClick, onDelete }) => {
  const roleColors: Record<UserRole, string> = {
    farmer: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    buyer:  'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    expert: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    admin:  'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  };

  const verificationStatus = user.expert_profile?.verification_status;

  return (
    <tr className="border-b border-border/40 hover:bg-muted/30 transition-colors group">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
            {user.avatar_url
              ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              : <User size={16} className="text-primary" />}
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{user.full_name || '—'}</p>
            <p className="text-[11px] text-muted-foreground">{user.phone_number || '—'}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border capitalize ${roleColors[user.role]}`}>
          {user.role}
        </span>
      </td>
      <td className="px-4 py-3 text-[12px] text-muted-foreground">
        {user.farmer_profile?.district || user.buyer_profile?.district || '—'}
      </td>
      <td className="px-4 py-3">
        {user.role === 'expert' && verificationStatus ? (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${
            verificationStatus === 'verified'  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
            verificationStatus === 'pending'   ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' :
            verificationStatus === 'rejected'  ? 'bg-red-500/10 text-red-600 border-red-500/20' :
            'bg-muted text-muted-foreground border-border/50'
          }`}>
            <CircleDot size={9} />{verificationStatus}
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-[12px] text-muted-foreground">
        {user.created_at ? new Date(user.created_at).toLocaleDateString('en-GB') : '—'}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" onClick={onClick}
            className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary rounded-lg">
            <Eye size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}
            className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive rounded-lg">
            <Trash2 size={14} />
          </Button>
        </div>
      </td>
    </tr>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const AdminDashboard: React.FC = () => {
  const { user, profile, loading, logout, refreshProfile } = useAuth();

  // Nav
  const [section, setSection]             = useState<NavSection>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Stats
  const [stats, setStats]             = useState<{
    totalUsers: number; farmers: number; buyers: number; experts: number;
    pendingVerifications: number; activeProducts: number;
    openIssues: number; resolvedIssues: number;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [growthData, setGrowthData]     = useState<any[]>([]);
  const [issueData, setIssueData]       = useState<any[]>([]);
  const [farmersByDistrict, setFarmersByDistrict] = useState<Record<string, number>>({});

  // Data tables
  const [users, setUsers]       = useState<ProfileWithExtras[]>([]);
  const [experts, setExperts]   = useState<ExpertWithProfile[]>([]);
  const [issues, setIssues]     = useState<IssueWithFarmer[]>([]);
  const [products, setProducts] = useState<ProductWithFarmer[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Search / filter
  const [search, setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');

  // Modals
  const [selectedUser,    setSelectedUser]    = useState<ProfileWithExtras | null>(null);
  const [selectedExpert,  setSelectedExpert]  = useState<ExpertWithProfile | null>(null);
  const [selectedIssue,   setSelectedIssue]   = useState<IssueWithFarmer | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithFarmer | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Edit state
  const [editUserName,  setEditUserName]  = useState('');
  const [editUserPhone, setEditUserPhone] = useState('');
  const [editUserRole,  setEditUserRole]  = useState<UserRole>('farmer');
  const [editIssueStatus,       setEditIssueStatus]       = useState<IssueStatus>('pending');
  const [editProductName,       setEditProductName]       = useState('');
  const [editProductPrice,      setEditProductPrice]      = useState('');
  const [editProductQuantity,   setEditProductQuantity]   = useState('');
  const [editProductStatus,     setEditProductStatus]     = useState<ProductStatus>('active');
  const [editProductDescription,setEditProductDescription]= useState('');

  // Profile
  const [editName,      setEditName]      = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingModal,   setSavingModal]   = useState(false);

  // Push notification
  const [pushTitle,     setPushTitle]     = useState('');
  const [pushMessage,   setPushMessage]   = useState('');
  const [pushTarget,    setPushTarget]    = useState<string>('all');
  const [pushFarmers,   setPushFarmers]   = useState<Profile[]>([]);
  const [pushSending,   setPushSending]   = useState(false);

  const PUSH_TEMPLATES = [
    { label: '🌧️ Heavy Rain',  title: 'Heavy Rain Alert!',       message: 'Heavy rainfall expected in your area in the next 24 hours. Ensure proper drainage.' },
    { label: '🐛 Pest Warning', title: 'Pest Outbreak Warning',   message: 'A pest outbreak has been reported nearby. Inspect your fields and apply preventive measures.' },
    { label: '💰 Price Drop',   title: 'Market Price Fluctuation',message: 'Prices have dropped slightly today. Check the Market Trends tab before selling.' },
    { label: '🎁 Subsidy',      title: 'New Fertilizer Subsidy',  message: 'The government announced a new subsidy for organic fertilizers. Contact your ward office.' },
  ];

  const displayDate = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });

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

      const roles     = profilesRes.data ?? [];
      const allIssues = issuesRes.data    ?? [];

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
      setIssueData([
        { name: 'Open',     value: s.openIssues,     fill: 'hsl(var(--destructive))' },
        { name: 'Resolved', value: s.resolvedIssues, fill: 'hsl(var(--primary))' },
        { name: 'Products', value: s.activeProducts, fill: 'hsl(45 97% 50%)' },
      ]);
    } catch {
      toast.error('Failed to load stats');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ── Load Users ──────────────────────────────────────────────────────────────
  const loadUsers = useCallback(async (roleOverride?: UserRole | 'all') => {
    setDataLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select(`
          *,
          farmer_profile:farmer_profiles(district, province, farm_name, farm_type),
          buyer_profile:buyer_profiles(district, province, business_name),
          expert_profile:expert_profiles(specialization, experience_years, verification_status)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      const r = roleOverride ?? roleFilter;
      if (r !== 'all') query = query.eq('role', r);

      const { data, error } = await query;
      if (error) throw error;
      setUsers((data ?? []) as ProfileWithExtras[]);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setDataLoading(false);
    }
  }, [roleFilter]);

  // ── Load Experts ─────────────────────────────────────────────────────────────
  const loadExperts = useCallback(async () => {
    setDataLoading(true);
    try {
      const { data, error } = await supabase
        .from('expert_profiles')
        .select('*, profile:profiles(id, full_name, phone_number, avatar_url, created_at)')
        .limit(100);
      if (error) throw error;
      setExperts((data ?? []) as ExpertWithProfile[]);
    } catch { toast.error('Failed to load experts'); }
    finally { setDataLoading(false); }
  }, []);

  // ── Load Issues ───────────────────────────────────────────────────────────────
  const loadIssues = useCallback(async () => {
    setDataLoading(true);
    try {
      const { data, error } = await supabase
        .from('crop_issues')
        .select('*, farmer:profiles(full_name, phone_number)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setIssues((data ?? []) as IssueWithFarmer[]);
    } catch { toast.error('Failed to load issues'); }
    finally { setDataLoading(false); }
  }, []);

  // ── Load Products ─────────────────────────────────────────────────────────────
  const loadProducts = useCallback(async () => {
    setDataLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, farmer:profiles(full_name, phone_number)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setProducts((data ?? []) as ProductWithFarmer[]);
    } catch { toast.error('Failed to load products'); }
    finally { setDataLoading(false); }
  }, []);

  // ── Load push farmer list ────────────────────────────────────────────────────
  useEffect(() => {
    supabase.from('profiles').select('id, full_name').eq('role', 'farmer')
      .then(({ data }) => { if (data) setPushFarmers(data as Profile[]); });
  }, []);

  // ── Section routing ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (section === 'overview') return;
    if (section === 'users-all')     { setRoleFilter('all');    loadUsers('all'); }
    if (section === 'users-farmers') { setRoleFilter('farmer'); loadUsers('farmer'); }
    if (section === 'users-buyers')  { setRoleFilter('buyer');  loadUsers('buyer'); }
    if (section === 'users-experts') { loadExperts(); }
    if (section === 'issues')        { loadIssues(); }
    if (section === 'products')      { loadProducts(); }
  }, [section]);

  useEffect(() => { if (!loading && user?.id) loadStats(); }, [loading, user?.id]);
  useEffect(() => { if (profile) setEditName(profile.full_name ?? ''); }, [profile]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const openUserModal = (u: ProfileWithExtras) => {
    setSelectedUser(u);
    setEditUserName(u.full_name || '');
    setEditUserPhone(u.phone_number || '');
    setEditUserRole(u.role);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    setSavingModal(true);
    try {
      await supabase.from('profiles').update({
        full_name: editUserName, phone_number: editUserPhone, role: editUserRole,
      }).eq('id', selectedUser.id);
      toast.success('User updated');
      setSelectedUser(null);
      loadUsers();
      loadStats();
    } catch { toast.error('Failed to update user'); }
    finally { setSavingModal(false); }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Delete this user permanently? This cannot be undone.')) return;
    try {
      await supabase.from('profiles').delete().eq('id', id);
      setUsers(p => p.filter(u => u.id !== id));
      setSelectedUser(null);
      toast.success('User deleted');
      loadStats();
    } catch { toast.error('Failed to delete user'); }
  };

  const handleVerifyExpert = async (expertId: string, status: 'verified' | 'rejected') => {
    try {
      await supabase.from('expert_profiles')
        .update({ verification_status: status } as any)
        .eq('id', expertId);
      toast.success(`Expert ${status}`);
      setSelectedExpert(null);
      loadExperts();
      loadStats();
    } catch { toast.error('Update failed'); }
  };

  const handleUpdateIssue = async () => {
    if (!selectedIssue) return;
    setSavingModal(true);
    try {
      await supabase.from('crop_issues')
        .update({ status: editIssueStatus })
        .eq('id', selectedIssue.id);
      toast.success('Issue updated');
      setSelectedIssue(null);
      loadIssues(); loadStats();
    } catch { toast.error('Failed to update issue'); }
    finally { setSavingModal(false); }
  };

  const handleDeleteIssue = async (id: string) => {
    if (!confirm('Delete this issue permanently?')) return;
    try {
      await supabase.from('crop_issues').delete().eq('id', id);
      setIssues(p => p.filter(i => i.id !== id));
      setSelectedIssue(null);
      toast.success('Issue deleted'); loadStats();
    } catch { toast.error('Failed to delete issue'); }
  };

  const handleUpdateProduct = async () => {
    if (!selectedProduct) return;
    setSavingModal(true);
    try {
      await supabase.from('products').update({
        name: editProductName, price: parseFloat(editProductPrice),
        quantity: editProductQuantity, status: editProductStatus,
        description: editProductDescription,
      }).eq('id', selectedProduct.id);
      toast.success('Product updated');
      setSelectedProduct(null);
      loadProducts(); loadStats();
    } catch { toast.error('Failed to update product'); }
    finally { setSavingModal(false); }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Delete this product permanently?')) return;
    try {
      await supabase.from('products').delete().eq('id', id);
      setProducts(p => p.filter(x => x.id !== id));
      setSelectedProduct(null);
      toast.success('Product deleted'); loadStats();
    } catch { toast.error('Failed to delete product'); }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      await supabase.from('profiles').update({ full_name: editName }).eq('id', user.id);
      await refreshProfile();
      toast.success('Profile updated!');
    } catch { toast.error('Failed to update profile'); }
    finally { setSavingProfile(false); }
  };

  const handleSendPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushTitle || !pushMessage) return toast.warning('Fill in title and message.');
    setPushSending(true);
    try {
      const targetIds = pushTarget === 'all'
        ? pushFarmers.map(f => f.id)
        : [pushTarget];
      if (!targetIds.length) { toast.error('No recipients found.'); return; }
      const { error } = await supabase.from('notifications').insert(
        targetIds.map(id => ({ user_id: id, title: pushTitle, message: pushMessage, type: 'admin_alert', is_read: false }))
      );
      if (error) throw error;
      toast.success(`Sent to ${targetIds.length} farmer(s)!`);
      setPushTitle(''); setPushMessage('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send');
    } finally { setPushSending(false); }
  };

  // ── Filtered data ────────────────────────────────────────────────────────────
  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.phone_number?.includes(search)
  );

  // ── Nav items ────────────────────────────────────────────────────────────────
  const navItems: NavItem[] = [
    { id: 'overview',       label: 'Overview',      icon: <LayoutDashboard size={16} />, group: 'main' },
    { id: 'users-all',      label: 'All Users',     icon: <Users size={16} />,           group: 'users', badge: stats?.totalUsers },
    { id: 'users-farmers',  label: 'Farmers',       icon: <Sprout size={16} />,          group: 'users', badge: stats?.farmers },
    { id: 'users-buyers',   label: 'Buyers',        icon: <Building2 size={16} />,       group: 'users', badge: stats?.buyers },
    { id: 'users-experts',  label: 'Experts',       icon: <Star size={16} />,            group: 'users', badge: stats?.experts },
    { id: 'issues',         label: 'Crop Issues',   icon: <AlertTriangle size={16} />,   group: 'data',  badge: stats?.openIssues },
    { id: 'products',       label: 'Products',      icon: <Package size={16} />,         group: 'data',  badge: stats?.activeProducts },
    { id: 'notifications',  label: 'Push Alerts',   icon: <Bell size={16} />,            group: 'data' },
    { id: 'profile',        label: 'Profile',       icon: <Settings size={16} />,        group: 'system' },
  ];

  const groups = [
    { key: 'main',   label: null },
    { key: 'users',  label: 'User Management' },
    { key: 'data',   label: 'Content' },
    { key: 'system', label: 'System' },
  ];

  if (loading && !profile) {
    return (
      <div className="h-screen flex items-center justify-center bg-muted/20">
        <div className="space-y-3 text-center">
          <Skeleton className="w-16 h-16 rounded-2xl mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
          <Skeleton className="h-3 w-24 mx-auto" />
        </div>
      </div>
    );
  }

  const sectionTitle: Record<NavSection, string> = {
    'overview':      'Dashboard Overview',
    'users-all':     'All Users',
    'users-farmers': 'Farmers',
    'users-buyers':  'Buyers',
    'users-experts': 'Expert Verification',
    'issues':        'Crop Issues',
    'products':      'Products',
    'notifications': 'Push Notifications',
    'profile':       'Admin Profile',
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-muted/20 overflow-hidden font-sans">

      {/* ══════════════════ SIDEBAR ══════════════════ */}
      <aside
        className="flex flex-col bg-card border-r border-border/50 h-full shrink-0 transition-all duration-300 z-20"
        style={{ width: sidebarCollapsed ? '64px' : '240px' }}
      >
        {/* Header */}
        <div className={`flex items-center border-b border-border/50 h-14 px-3 shrink-0 ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
          <button
            onClick={() => setSidebarCollapsed(v => !v)}
            className="w-8 h-8 rounded-lg bg-muted/60 hover:bg-muted flex items-center justify-center shrink-0 transition-colors"
          >
            <Menu size={15} className="text-muted-foreground" />
          </button>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <Leaf size={14} className="text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-black text-foreground leading-tight">Hamro Kisan</p>
                <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-widest">Admin</p>
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 [&::-webkit-scrollbar]:hidden">
          {groups.map(group => {
            const items = navItems.filter(n => n.group === group.key);
            return (
              <div key={group.key} className={group.label ? 'mt-3' : ''}>
                {group.label && !sidebarCollapsed && (
                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest px-2 mb-1">
                    {group.label}
                  </p>
                )}
                {items.map(item => {
                  const active = section === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSection(item.id)}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-semibold transition-all relative
                        ${active
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                        }
                        ${sidebarCollapsed ? 'justify-center' : ''}
                      `}
                    >
                      <span className="shrink-0">{item.icon}</span>
                      {!sidebarCollapsed && (
                        <>
                          <span className="flex-1 text-left truncate">{item.label}</span>
                          {item.badge !== undefined && item.badge > 0 && (
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none
                              ${active ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'}`}>
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                      {sidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-white text-[9px] font-black rounded-full flex items-center justify-center">
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-border/50 p-2 shrink-0 space-y-1">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-muted/60 cursor-pointer transition-colors" onClick={() => setSection('profile')}>
              <div className="w-7 h-7 rounded-full bg-primary/10 overflow-hidden shrink-0 flex items-center justify-center">
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  : <User size={13} className="text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{profile?.full_name || 'Admin'}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
          ) : (
            <button onClick={() => setSection('profile')} title="Profile"
              className="w-full flex justify-center py-2 rounded-lg hover:bg-muted/60 transition-colors">
              <User size={16} className="text-muted-foreground" />
            </button>
          )}
          <button
            onClick={logout}
            title="Logout"
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-all font-semibold ${sidebarCollapsed ? 'justify-center' : ''}`}
          >
            <LogOut size={15} className="shrink-0" />
            {!sidebarCollapsed && 'Logout'}
          </button>
        </div>
      </aside>

      {/* ══════════════════ MAIN ══════════════════ */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">

        {/* Top bar */}
        <header className="h-14 bg-card border-b border-border/50 flex items-center justify-between px-6 shrink-0">
          <div>
            <h1 className="text-base font-black text-foreground">{sectionTitle[section]}</h1>
            <p className="text-[11px] text-muted-foreground">{displayDate}</p>
          </div>
          <div className="flex items-center gap-2">
            {stats?.pendingVerifications ? (
              <button
                onClick={() => setSection('users-experts')}
                className="flex items-center gap-1.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-yellow-500/20 transition-colors"
              >
                <ShieldX size={12} />{stats.pendingVerifications} pending verifications
              </button>
            ) : null}
            <Button variant="outline" size="sm" onClick={loadStats} className="h-8 gap-1.5 text-xs font-bold rounded-xl border-border/50">
              <RefreshCw size={12} />Refresh
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 [&::-webkit-scrollbar]:hidden">

          {/* ═══════════ OVERVIEW ═══════════ */}
          {section === 'overview' && (
            <div className="space-y-6">

              {/* Stat cards */}
              {statsLoading
                ? <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
                : (
                  <div className="grid grid-cols-4 gap-4">
                    <StatCard label="Total Users"    value={stats?.totalUsers ?? 0}    icon={<Users size={18} />}        color="hsl(var(--primary))"   sub={`${stats?.farmers} farmers · ${stats?.buyers} buyers`} trend="+12%" />
                    <StatCard label="Active Products" value={stats?.activeProducts ?? 0} icon={<ShoppingBag size={18} />}  color="hsl(45 97% 50%)"       sub="listed products" />
                    <StatCard label="Pending Experts" value={stats?.pendingVerifications ?? 0} icon={<ShieldCheck size={18} />} color="hsl(var(--destructive))" sub="awaiting review" />
                    <StatCard label="Issues Resolved" value={stats?.resolvedIssues ?? 0} icon={<Activity size={18} />}     color="hsl(122 46% 40%)"      sub="all time" />
                  </div>
                )}

              {/* Charts row */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="rounded-2xl border-border/50 shadow-sm bg-card col-span-2">
                  <CardHeader className="pb-2 pt-5 px-5">
                    <CardTitle className="text-sm font-bold flex items-center gap-2"><TrendingUp size={14} className="text-primary" />User Growth (6 months)</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={growthData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gF" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(122 46% 40%)" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="hsl(122 46% 40%)" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gB" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(45 97% 50%)" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="hsl(45 97% 50%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
                        <Area type="monotone" dataKey="farmers" stroke="hsl(122 46% 40%)" strokeWidth={2.5} fill="url(#gF)" name="Farmers" />
                        <Area type="monotone" dataKey="buyers"  stroke="hsl(45 97% 50%)"  strokeWidth={2.5} fill="url(#gB)" name="Buyers" />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div className="flex gap-5 mt-2 justify-center">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><div className="w-3 h-1.5 rounded-full bg-[hsl(122_46%_40%)]" />Farmers</span>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><div className="w-3 h-1.5 rounded-full" style={{ background: 'hsl(45 97% 50%)' }} />Buyers</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-border/50 shadow-sm bg-card">
                  <CardHeader className="pb-2 pt-5 px-5">
                    <CardTitle className="text-sm font-bold flex items-center gap-2"><BarChart3 size={14} className="text-primary" />Platform Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={issueData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                          {issueData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Map + Quick Actions */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="rounded-2xl border-border/50 shadow-sm bg-card">
                  <CardHeader className="pb-2 pt-5 px-5">
                    <CardTitle className="text-sm font-bold flex items-center gap-2"><MapPin size={14} className="text-primary" />Farmer Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <NepalMap farmersByDistrict={farmersByDistrict} />
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {Object.entries(farmersByDistrict).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([d,c])=>(
                        <span key={d} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold capitalize">
                          {d}: {c}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-border/50 shadow-sm bg-card">
                  <CardHeader className="pb-2 pt-5 px-5">
                    <CardTitle className="text-sm font-bold">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-1.5">
                    {[
                      { label: 'Pending Expert Verifications', sub: `${stats?.pendingVerifications ?? 0} awaiting`, icon: <ShieldCheck size={15} />, color: 'hsl(var(--destructive))', go: 'users-experts' as NavSection },
                      { label: 'Open Crop Issues',            sub: `${stats?.openIssues ?? 0} unresolved`,        icon: <AlertTriangle size={15} />, color: 'hsl(122 46% 40%)',         go: 'issues' as NavSection },
                      { label: 'Manage Products',             sub: `${stats?.activeProducts ?? 0} active`,        icon: <Package size={15} />,       color: 'hsl(45 97% 50%)',           go: 'products' as NavSection },
                      { label: 'Broadcast Notification',      sub: 'Send push alert to farmers',                  icon: <BellRing size={15} />,      color: 'hsl(var(--primary))',       go: 'notifications' as NavSection },
                    ].map(a => (
                      <button key={a.label} onClick={() => setSection(a.go)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 hover:bg-muted/60 transition-all text-left group">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${a.color}18`, color: a.color }}>{a.icon}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{a.label}</p>
                          <p className="text-[10px] text-muted-foreground">{a.sub}</p>
                        </div>
                        <ChevronRight size={13} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                      </button>
                    ))}
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-border/50 shadow-sm bg-card">
                  <CardHeader className="pb-2 pt-5 px-5">
                    <CardTitle className="text-sm font-bold">User Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5 space-y-3">
                    {[
                      { label: 'Farmers', value: stats?.farmers ?? 0, color: 'hsl(122 46% 40%)', total: stats?.totalUsers ?? 1 },
                      { label: 'Buyers',  value: stats?.buyers  ?? 0, color: 'hsl(45 97% 50%)',  total: stats?.totalUsers ?? 1 },
                      { label: 'Experts', value: stats?.experts ?? 0, color: 'hsl(var(--primary))', total: stats?.totalUsers ?? 1 },
                    ].map(r => (
                      <div key={r.label}>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-muted-foreground">{r.label}</span>
                          <span className="text-foreground font-black">{r.value}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${(r.value / r.total) * 100}%`, background: r.color }} />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ═══════════ USER TABLE (All / Farmers / Buyers) ═══════════ */}
          {(section === 'users-all' || section === 'users-farmers' || section === 'users-buyers') && (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                  <Input
                    placeholder="Search by name or phone..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 h-9 bg-card border-border/50 rounded-xl text-sm"
                  />
                </div>
                <div className="text-xs text-muted-foreground font-semibold">
                  {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Table */}
              <Card className="rounded-2xl border-border/50 shadow-sm bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/30">
                        {['User', 'Role', 'District', 'Status', 'Joined', 'Actions'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dataLoading
                        ? Array.from({ length: 8 }).map((_, i) => (
                          <tr key={i} className="border-b border-border/30">
                            {Array.from({ length: 6 }).map((_, j) => (
                              <td key={j} className="px-4 py-3"><Skeleton className="h-5 rounded-lg" /></td>
                            ))}
                          </tr>
                        ))
                        : filteredUsers.length === 0
                          ? (
                            <tr>
                              <td colSpan={6} className="text-center py-16 text-muted-foreground text-sm">
                                No users found
                              </td>
                            </tr>
                          )
                          : filteredUsers.map(u => (
                            <UserRow
                              key={u.id}
                              user={u}
                              onClick={() => openUserModal(u)}
                              onDelete={() => handleDeleteUser(u.id)}
                            />
                          ))
                      }
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* ═══════════ EXPERTS ═══════════ */}
          {section === 'users-experts' && (
            <div className="space-y-4">
              {experts.filter(e => e.verification_status === 'pending').length > 0 && (
                <div className="flex items-center gap-2.5 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                  <ShieldX size={15} className="text-yellow-600 dark:text-yellow-400 shrink-0" />
                  <p className="text-xs font-bold text-yellow-600 dark:text-yellow-400">
                    {experts.filter(e => e.verification_status === 'pending').length} expert(s) awaiting verification
                  </p>
                </div>
              )}
              <Card className="rounded-2xl border-border/50 shadow-sm bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/30">
                        {['Expert', 'Specialization', 'Experience', 'Status', 'Actions'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dataLoading
                        ? Array.from({ length: 6 }).map((_, i) => (
                          <tr key={i} className="border-b border-border/30">
                            {Array.from({ length: 5 }).map((_, j) => (
                              <td key={j} className="px-4 py-3"><Skeleton className="h-5 rounded-lg" /></td>
                            ))}
                          </tr>
                        ))
                        : experts.map(exp => {
                          const status = exp.verification_status ?? 'unverified';
                          return (
                            <tr key={exp.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors group">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0 overflow-hidden">
                                    {exp.profile?.avatar_url
                                      ? <img src={exp.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                      : <User size={16} className="text-purple-500" />}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-foreground">{exp.profile?.full_name || '—'}</p>
                                    <p className="text-[11px] text-muted-foreground">{exp.profile?.phone_number || '—'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-muted-foreground">{exp.specialization || '—'}</td>
                              <td className="px-4 py-3 text-sm text-muted-foreground">{exp.experience_years ? `${exp.experience_years} yrs` : '—'}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                  status === 'verified'   ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                  status === 'pending'    ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' :
                                  status === 'rejected'   ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                                  'bg-muted text-muted-foreground border-border/50'
                                }`}>
                                  <CircleDot size={9} />{status}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="sm" onClick={() => setSelectedExpert(exp)}
                                    className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary rounded-lg"><Eye size={14} /></Button>
                                  {status === 'pending' && (
                                    <>
                                      <Button variant="ghost" size="sm" onClick={() => handleVerifyExpert(exp.id, 'verified')}
                                        className="h-7 w-7 p-0 hover:bg-emerald-500/10 hover:text-emerald-600 rounded-lg"><CheckCircle size={14} /></Button>
                                      <Button variant="ghost" size="sm" onClick={() => handleVerifyExpert(exp.id, 'rejected')}
                                        className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive rounded-lg"><XCircle size={14} /></Button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      }
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* ═══════════ ISSUES ═══════════ */}
          {section === 'issues' && (
            <div className="space-y-4">
              <Card className="rounded-2xl border-border/50 shadow-sm bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/30">
                        {['Crop', 'Farmer', 'Status', 'Reported', 'Actions'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dataLoading
                        ? Array.from({ length: 6 }).map((_, i) => (
                          <tr key={i} className="border-b border-border/30">
                            {Array.from({ length: 5 }).map((_, j) => (
                              <td key={j} className="px-4 py-3"><Skeleton className="h-5 rounded-lg" /></td>
                            ))}
                          </tr>
                        ))
                        : issues.length === 0
                          ? <tr><td colSpan={5} className="text-center py-16 text-muted-foreground text-sm">No issues found</td></tr>
                          : issues.map(issue => (
                            <tr key={issue.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors group">
                              <td className="px-4 py-3">
                                <p className="text-sm font-bold text-foreground">{issue.crop_name || 'Unknown Crop'}</p>
                                <p className="text-[11px] text-muted-foreground line-clamp-1 max-w-xs">{issue.description}</p>
                              </td>
                              <td className="px-4 py-3 text-sm text-muted-foreground">{issue.farmer?.full_name || '—'}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                  issue.status === 'resolved'
                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                    : 'bg-red-500/10 text-red-600 border-red-500/20'
                                }`}>
                                  <CircleDot size={9} />{issue.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-[12px] text-muted-foreground">
                                {issue.created_at ? new Date(issue.created_at).toLocaleDateString('en-GB') : '—'}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="sm" onClick={() => { setSelectedIssue(issue); setEditIssueStatus(issue.status ?? 'pending'); }}
                                    className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary rounded-lg"><Eye size={14} /></Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleDeleteIssue(issue.id)}
                                    className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive rounded-lg"><Trash2 size={14} /></Button>
                                </div>
                              </td>
                            </tr>
                          ))
                      }
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* ═══════════ PRODUCTS ═══════════ */}
          {section === 'products' && (
            <div className="space-y-4">
              <Card className="rounded-2xl border-border/50 shadow-sm bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/30">
                        {['Product', 'Farmer', 'Price', 'Quantity', 'Status', 'Actions'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dataLoading
                        ? Array.from({ length: 6 }).map((_, i) => (
                          <tr key={i} className="border-b border-border/30">
                            {Array.from({ length: 6 }).map((_, j) => (
                              <td key={j} className="px-4 py-3"><Skeleton className="h-5 rounded-lg" /></td>
                            ))}
                          </tr>
                        ))
                        : products.length === 0
                          ? <tr><td colSpan={6} className="text-center py-16 text-muted-foreground text-sm">No products found</td></tr>
                          : products.map(prod => (
                            <tr key={prod.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors group">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-muted shrink-0">
                                    {prod.photo_url
                                      ? <img src={prod.photo_url} alt={prod.name} className="w-full h-full object-cover" />
                                      : <Leaf className="m-2.5 text-muted-foreground/40" size={20} />}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-foreground">{prod.name}</p>
                                    <p className="text-[11px] text-muted-foreground">{prod.category || '—'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-muted-foreground">{prod.farmer?.full_name || '—'}</td>
                              <td className="px-4 py-3 text-sm font-bold text-foreground">Rs.{prod.price}/kg</td>
                              <td className="px-4 py-3 text-sm text-muted-foreground">{prod.quantity || '—'}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                  prod.status === 'active'
                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                    : 'bg-muted text-muted-foreground border-border/50'
                                }`}>
                                  <CircleDot size={9} />{prod.status}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="sm"
                                    onClick={() => {
                                      setSelectedProduct(prod);
                                      setEditProductName(prod.name);
                                      setEditProductPrice(String(prod.price));
                                      setEditProductQuantity(prod.quantity || '');
                                      setEditProductStatus(prod.status ?? 'active');
                                      setEditProductDescription(prod.description || '');
                                    }}
                                    className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary rounded-lg"><Eye size={14} /></Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleDeleteProduct(prod.id)}
                                    className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive rounded-lg"><Trash2 size={14} /></Button>
                                </div>
                              </td>
                            </tr>
                          ))
                      }
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* ═══════════ PUSH NOTIFICATIONS ═══════════ */}
          {section === 'notifications' && (
            <div className="max-w-2xl space-y-5">
              {/* Templates */}
              <Card className="rounded-2xl border-border/50 shadow-sm bg-card">
                <CardHeader className="pt-5 pb-3 px-5">
                  <CardTitle className="text-sm font-bold">Quick Templates</CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <div className="grid grid-cols-2 gap-2">
                    {PUSH_TEMPLATES.map((t, i) => (
                      <button key={i} onClick={() => { setPushTitle(t.title); setPushMessage(t.message); }}
                        className="flex items-start gap-2 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 border border-border/40 hover:border-border transition-all text-left group">
                        <span className="text-lg shrink-0">{t.label.split(' ')[0]}</span>
                        <div>
                          <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">{t.title}</p>
                          <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{t.message}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Compose */}
              <Card className="rounded-2xl border-border/50 shadow-sm bg-card">
                <CardHeader className="pt-5 pb-3 px-5">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <BellRing size={14} className="text-primary" />Compose Alert
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <form onSubmit={handleSendPush} className="space-y-4">
                    <div>
                      <Label className="text-xs font-bold mb-1.5 block">Recipient</Label>
                      <Select value={pushTarget} onValueChange={setPushTarget}>
                        <SelectTrigger className="h-10 bg-muted/30 border-border/50 rounded-xl text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">📢 All Farmers ({pushFarmers.length})</SelectItem>
                          {pushFarmers.map(f => <SelectItem key={f.id} value={f.id}>👤 {f.full_name || 'Unnamed'}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-bold mb-1.5 block">Title</Label>
                      <Input value={pushTitle} onChange={e => setPushTitle(e.target.value)} placeholder="Notification title..." className="h-10 bg-muted/30 border-border/50 rounded-xl" disabled={pushSending} />
                    </div>
                    <div>
                      <Label className="text-xs font-bold mb-1.5 block">Message</Label>
                      <Textarea value={pushMessage} onChange={e => setPushMessage(e.target.value)} placeholder="Write your message..." className="min-h-[100px] bg-muted/30 border-border/50 rounded-xl resize-none" disabled={pushSending} />
                    </div>
                    <Button type="submit" disabled={pushSending} className="w-full h-10 font-bold rounded-xl gap-2">
                      {pushSending ? <><span className="animate-spin">⏳</span>Sending...</> : <><Send size={14} />Send Notification</>}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ═══════════ PROFILE ═══════════ */}
          {section === 'profile' && (
            <div className="max-w-3xl space-y-5">
              <Card className="rounded-2xl border-border/50 shadow-sm bg-card overflow-hidden">
                <div className="bg-[#1e5a32] px-8 py-8 flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full border-4 border-white/30 overflow-hidden bg-white/10 flex items-center justify-center shadow-lg shrink-0">
                    {profile?.avatar_url
                      ? <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                      : <User className="w-9 h-9 text-white/80" />}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white">{profile?.full_name || 'Admin'}</h2>
                    <p className="text-white/70 text-sm">{user?.email}</p>
                    <div className="inline-flex items-center gap-1.5 mt-2 bg-white/10 px-3 py-1 rounded-full">
                      <ShieldCheck size={12} className="text-yellow-300" />
                      <span className="text-xs font-bold text-yellow-200">Administrator</span>
                    </div>
                  </div>
                  <div className="ml-auto flex gap-4">
                    {[
                      { label: 'Total Users', value: stats?.totalUsers ?? '—' },
                      { label: 'Farmers',     value: stats?.farmers     ?? '—' },
                      { label: 'Experts',     value: stats?.experts     ?? '—' },
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
                <Card className="rounded-2xl border-border/50 shadow-sm bg-card">
                  <CardHeader className="pt-5 pb-3 px-5">
                    <CardTitle className="text-sm font-bold text-primary">Edit Profile</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5 space-y-4">
                    <div>
                      <Label className="text-xs font-semibold mb-1.5 block">Display Name</Label>
                      <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-11 bg-muted/30 border-border/50 rounded-xl" />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold mb-1.5 block">Email</Label>
                      <Input value={user?.email ?? ''} disabled className="h-11 bg-muted/20 border-border/30 rounded-xl opacity-60" />
                    </div>
                    <Button onClick={handleSaveProfile} disabled={savingProfile} className="w-full h-11 font-bold rounded-xl">
                      {savingProfile ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border-border/50 shadow-sm bg-card">
                  <CardHeader className="pt-5 pb-3 px-5">
                    <CardTitle className="text-sm font-bold text-primary">Quick Links</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-1">
                    {[
                      { label: 'View All Farmers', sub: `${stats?.farmers ?? '—'} registered`, icon: <Sprout size={15} />, go: 'users-farmers' as NavSection },
                      { label: 'Expert Verifications', sub: `${stats?.pendingVerifications ?? '—'} pending`, icon: <ShieldCheck size={15} />, go: 'users-experts' as NavSection },
                      { label: 'Broadcast Alert', sub: 'Send push notification', icon: <BellRing size={15} />, go: 'notifications' as NavSection },
                    ].map(a => (
                      <button key={a.label} onClick={() => setSection(a.go)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/40 transition-all text-left group">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">{a.icon}</div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-foreground">{a.label}</p>
                          <p className="text-[10px] text-muted-foreground">{a.sub}</p>
                        </div>
                        <ChevronRight size={13} className="text-muted-foreground" />
                      </button>
                    ))}
                    <Button variant="destructive" onClick={logout} className="w-full h-10 font-bold rounded-xl mt-3 gap-2">
                      <LogOut size={14} />Logout
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ══════════ USER MODAL ══════════ */}
      <Dialog open={!!selectedUser} onOpenChange={o => !o && setSelectedUser(null)}>
        <DialogContent className="max-w-[440px] rounded-3xl p-0 overflow-hidden bg-card">
          {selectedUser && (
            <>
              <div className="bg-[#1e5a32] p-6 text-center">
                <div className="w-20 h-20 rounded-full border-2 border-white/30 bg-white/10 flex items-center justify-center mx-auto mb-3 overflow-hidden">
                  {selectedUser.avatar_url ? <img src={selectedUser.avatar_url} alt="" className="w-full h-full object-cover" /> : <User size={32} className="text-white/80" />}
                </div>
                <h2 className="text-xl font-black text-white">{selectedUser.full_name || 'User'}</h2>
                <p className="text-white/70 text-sm">{selectedUser.phone_number || '—'}</p>
                {selectedUser.farmer_profile?.district && (
                  <p className="text-white/50 text-xs mt-1">📍 {selectedUser.farmer_profile.district}</p>
                )}
              </div>
              <div className="p-6 space-y-4">
                <div><Label className="text-xs font-semibold mb-1.5 block">Full Name</Label><Input value={editUserName} onChange={e => setEditUserName(e.target.value)} className="h-11 bg-muted/30 border-border/50 rounded-xl" /></div>
                <div><Label className="text-xs font-semibold mb-1.5 block">Phone Number</Label><Input value={editUserPhone} onChange={e => setEditUserPhone(e.target.value)} className="h-11 bg-muted/30 border-border/50 rounded-xl" /></div>
                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">Role</Label>
                  <Select value={editUserRole} onValueChange={v => setEditUserRole(v as UserRole)}>
                    <SelectTrigger className="h-11 bg-muted/30 border-border/50 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="farmer">🌾 Farmer</SelectItem>
                      <SelectItem value="buyer">🏢 Buyer</SelectItem>
                      <SelectItem value="expert">⭐ Expert</SelectItem>
                      <SelectItem value="admin">🛡️ Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-3 pt-1">
                  <Button variant="outline" className="flex-1 h-11 font-bold rounded-xl" onClick={() => setSelectedUser(null)}>Cancel</Button>
                  <Button className="flex-1 h-11 font-bold rounded-xl" onClick={handleUpdateUser} disabled={savingModal}><Save size={15} className="mr-2" />{savingModal ? 'Saving...' : 'Save'}</Button>
                </div>
                <Button variant="destructive" className="w-full h-11 font-bold rounded-xl" onClick={() => handleDeleteUser(selectedUser.id)}><Trash2 size={15} className="mr-2" />Delete User</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ══════════ EXPERT MODAL ══════════ */}
      <Dialog open={!!selectedExpert} onOpenChange={o => !o && setSelectedExpert(null)}>
        <DialogContent className="max-w-[440px] rounded-3xl p-0 overflow-hidden bg-card max-h-[90vh] overflow-y-auto">
          {selectedExpert && (
            <>
              <div className="bg-[#1e5a32] p-6 text-center sticky top-0 z-10">
                <button onClick={() => setSelectedExpert(null)} className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/10 hover:bg-black/30 p-1.5 rounded-full transition-all"><X size={16} /></button>
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
                {/* Documents */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><FileText size={13} className="text-primary" />Verification Documents</p>
                  {selectedExpert.document_url ? (
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold mb-1">Credential Document</p>
                      <div className="w-full h-44 bg-muted/30 rounded-xl overflow-hidden border border-border/50 relative group cursor-pointer" onClick={() => setFullscreenImage(selectedExpert.document_url!)}>
                        <img src={selectedExpert.document_url} alt="Document" className="w-full h-full object-contain" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center"><Eye size={22} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                      </div>
                    </div>
                  ) : null}
                  {selectedExpert.selfie_url ? (
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold mb-1">Verification Selfie</p>
                      <div className="w-full h-44 bg-muted/30 rounded-xl overflow-hidden border border-border/50 relative group cursor-pointer" onClick={() => setFullscreenImage(selectedExpert.selfie_url!)}>
                        <img src={selectedExpert.selfie_url} alt="Selfie" className="w-full h-full object-contain" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center"><Eye size={22} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                      </div>
                    </div>
                  ) : null}
                  {!selectedExpert.document_url && !selectedExpert.selfie_url && (
                    <div className="bg-muted/40 rounded-xl p-5 text-center border border-dashed border-border/60">
                      <FileText size={22} className="mx-auto mb-2 text-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground font-semibold">No documents uploaded.</p>
                    </div>
                  )}
                </div>
                {selectedExpert.verification_status === 'pending' && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <Button variant="destructive" className="h-11 font-bold rounded-xl" onClick={() => handleVerifyExpert(selectedExpert.id, 'rejected')}><XCircle size={15} className="mr-1" />Reject</Button>
                    <Button className="h-11 font-bold rounded-xl" onClick={() => handleVerifyExpert(selectedExpert.id, 'verified')}><CheckCircle size={15} className="mr-1" />Verify</Button>
                  </div>
                )}
                {selectedExpert.verification_status !== 'pending' && (
                  <div className="text-center p-3 bg-muted/40 rounded-xl">
                    <Badge className={`capitalize ${selectedExpert.verification_status === 'verified' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'}`}>{selectedExpert.verification_status}</Badge>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ══════════ ISSUE MODAL ══════════ */}
      <Dialog open={!!selectedIssue} onOpenChange={o => !o && setSelectedIssue(null)}>
        <DialogContent className="max-w-[440px] rounded-3xl p-0 overflow-hidden bg-card max-h-[90vh] overflow-y-auto">
          {selectedIssue && (
            <>
              <DialogHeader className="bg-[#1e5a32] p-6 text-center">
                <DialogTitle className="text-xl font-black text-white">{selectedIssue.crop_name || 'Crop Issue'}</DialogTitle>
                <DialogDescription className="text-white/70 text-sm">by {selectedIssue.farmer?.full_name || 'Unknown'}</DialogDescription>
              </DialogHeader>
              <div className="p-6 space-y-4">
                {selectedIssue.image_url && (
                  <div className="w-full h-52 bg-muted/30 rounded-xl overflow-hidden border border-border/50 relative group cursor-pointer" onClick={() => setFullscreenImage(selectedIssue.image_url!)}>
                    <img src={selectedIssue.image_url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center"><Eye size={22} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                  </div>
                )}
                <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Description</Label><div className="p-3 bg-muted/30 rounded-xl text-sm text-foreground">{selectedIssue.description}</div></div>
                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">Update Status</Label>
                  <Select value={editIssueStatus} onValueChange={v => setEditIssueStatus(v as IssueStatus)}>
                    <SelectTrigger className="h-11 bg-muted/30 border-border/50 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="resolved">Resolved</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="flex gap-3 pt-1">
                  <Button variant="outline" className="flex-1 h-11 font-bold rounded-xl" onClick={() => setSelectedIssue(null)}>Cancel</Button>
                  <Button className="flex-1 h-11 font-bold rounded-xl" onClick={handleUpdateIssue} disabled={savingModal}><Save size={15} className="mr-2" />{savingModal ? 'Saving...' : 'Update'}</Button>
                </div>
                <Button variant="destructive" className="w-full h-11 font-bold rounded-xl" onClick={() => handleDeleteIssue(selectedIssue.id)}><Trash2 size={15} className="mr-2" />Delete Issue</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ══════════ PRODUCT MODAL ══════════ */}
      <Dialog open={!!selectedProduct} onOpenChange={o => !o && setSelectedProduct(null)}>
        <DialogContent className="max-w-[440px] rounded-3xl p-0 overflow-hidden bg-card max-h-[90vh] overflow-y-auto">
          {selectedProduct && (
            <>
              <DialogHeader className="bg-[#1e5a32] p-6 text-center">
                <DialogTitle className="text-xl font-black text-white">{selectedProduct.name}</DialogTitle>
                <DialogDescription className="text-white/70 text-sm">by {selectedProduct.farmer?.full_name || 'Unknown'}</DialogDescription>
              </DialogHeader>
              <div className="p-6 space-y-4">
                {selectedProduct.photo_url && (
                  <div className="w-full h-52 bg-muted/30 rounded-xl overflow-hidden border border-border/50 relative group cursor-pointer" onClick={() => setFullscreenImage(selectedProduct.photo_url!)}>
                    <img src={selectedProduct.photo_url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center"><Eye size={22} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                  </div>
                )}
                <div><Label className="text-xs font-semibold mb-1.5 block">Product Name</Label><Input value={editProductName} onChange={e => setEditProductName(e.target.value)} className="h-11 bg-muted/30 border-border/50 rounded-xl" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs font-semibold mb-1.5 block">Price (Rs./kg)</Label><Input type="number" value={editProductPrice} onChange={e => setEditProductPrice(e.target.value)} className="h-11 bg-muted/30 border-border/50 rounded-xl" /></div>
                  <div><Label className="text-xs font-semibold mb-1.5 block">Quantity</Label><Input value={editProductQuantity} onChange={e => setEditProductQuantity(e.target.value)} className="h-11 bg-muted/30 border-border/50 rounded-xl" /></div>
                </div>
                <div><Label className="text-xs font-semibold mb-1.5 block">Description</Label><Textarea value={editProductDescription} onChange={e => setEditProductDescription(e.target.value)} className="min-h-[80px] bg-muted/30 border-border/50 rounded-xl resize-none" /></div>
                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">Status</Label>
                  <Select value={editProductStatus} onValueChange={v => setEditProductStatus(v as ProductStatus)}>
                    <SelectTrigger className="h-11 bg-muted/30 border-border/50 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="sold">Sold</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="flex gap-3 pt-1">
                  <Button variant="outline" className="flex-1 h-11 font-bold rounded-xl" onClick={() => setSelectedProduct(null)}>Cancel</Button>
                  <Button className="flex-1 h-11 font-bold rounded-xl" onClick={handleUpdateProduct} disabled={savingModal}><Save size={15} className="mr-2" />{savingModal ? 'Saving...' : 'Update'}</Button>
                </div>
                <Button variant="destructive" className="w-full h-11 font-bold rounded-xl" onClick={() => handleDeleteProduct(selectedProduct.id)}><Trash2 size={15} className="mr-2" />Delete Product</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ══════════ FULLSCREEN IMAGE ══════════ */}
      <Dialog open={!!fullscreenImage} onOpenChange={o => !o && setFullscreenImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-0">
          <button onClick={() => setFullscreenImage(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-50 transition-colors"><X size={18} /></button>
          {fullscreenImage && <img src={fullscreenImage} alt="" className="max-w-full max-h-[90vh] object-contain mx-auto" />}
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default AdminDashboard;
