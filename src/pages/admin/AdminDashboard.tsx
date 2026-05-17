import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import NepalMap from '@/components/NepalMap';
import {
  Users, ShieldCheck, ShieldX, Leaf, ShoppingBag, BarChart3,
  Edit3, User, CheckCircle, XCircle, Send, BellRing,
  MapPin, TrendingUp, AlertTriangle, Package, ChevronRight,
  Eye, Trash2, Search, LogOut, Activity, RefreshCw, X,
  FileText, Save, Menu, ChevronLeft, LayoutDashboard,
  Bell, Settings, Home
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
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────
type Section = 'dashboard' | 'users' | 'experts' | 'issues' | 'products' | 'notifications' | 'profile';

interface Stats {
  totalUsers: number; farmers: number; buyers: number; experts: number;
  pendingVerifications: number; activeProducts: number;
  openIssues: number; resolvedIssues: number;
}

// ─── Sidebar Nav Items ────────────────────────────────────────────────────────
const NAV_ITEMS: { id: Section; label: string; icon: React.ReactNode; badge?: (s: Stats | null) => number | undefined }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'users', label: 'Users', icon: <Users size={18} /> },
  { id: 'experts', label: 'Experts', icon: <ShieldCheck size={18} />, badge: (s) => s?.pendingVerifications ?? undefined },
  { id: 'issues', label: 'Crop Issues', icon: <AlertTriangle size={18} />, badge: (s) => s?.openIssues ?? undefined },
  { id: 'products', label: 'Products', icon: <Package size={18} /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
  { id: 'profile', label: 'Profile', icon: <User size={18} /> },
];

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard: React.FC<{ label: string; value: number | string; icon: React.ReactNode; color: string; sub?: string; trend?: string }> = ({ label, value, icon, color, sub, trend }) => (
  <Card className="border border-border/60 shadow-sm hover:shadow-md transition-shadow">
    <CardContent className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        {trend && <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">{trend}</span>}
      </div>
      <p className="text-2xl font-black text-foreground">{value}</p>
      <p className="text-sm font-medium text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
    </CardContent>
  </Card>
);

// ─── Data Table ───────────────────────────────────────────────────────────────
const DataTable: React.FC<{ headers: string[]; rows: React.ReactNode[][]; loading: boolean; emptyText?: string }> = ({ headers, rows, loading, emptyText = 'No data found' }) => (
  <div className="overflow-x-auto rounded-xl border border-border/60">
    <table className="w-full text-sm">
      <thead className="bg-muted/50">
        <tr>
          {headers.map(h => (
            <th key={h} className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border/40">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <tr key={i}>
              {headers.map((_, j) => (
                <td key={j} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td>
              ))}
            </tr>
          ))
        ) : rows.length === 0 ? (
          <tr>
            <td colSpan={headers.length} className="px-4 py-12 text-center text-muted-foreground text-sm">{emptyText}</td>
          </tr>
        ) : rows.map((row, i) => (
          <tr key={i} className="hover:bg-muted/30 transition-colors">
            {row.map((cell, j) => (
              <td key={j} className="px-4 py-3 whitespace-nowrap">{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ─── Push Notification Component ──────────────────────────────────────────────
const NotificationsPanel: React.FC = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [farmers, setFarmers] = useState<any[]>([]);
  const [selectedFarmer, setSelectedFarmer] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ALERT_TEMPLATES = [
    { label: '🌧️ Heavy Rain', title: 'Heavy Rain Alert!', message: 'Heavy rainfall is expected in your area over the next 24 hours. Please ensure adequate drainage for your crops and avoid spraying fertilizers today.' },
    { label: '🐛 Pest Warning', title: 'Pest Outbreak Warning', message: 'A recent pest outbreak has been reported in nearby districts. Please inspect your fields and apply preventive organic measures if necessary.' },
    { label: '💰 Price Drop', title: 'Market Price Fluctuation', message: 'Market prices for seasonal vegetables have dropped slightly today. Please check the Market Trends tab before selling your produce.' },
    { label: '🎁 Subsidy', title: 'New Fertilizer Subsidy', message: 'The local government has announced a new subsidy for organic fertilizers. Please contact your ward office for more details.' },
  ];

  useEffect(() => {
    supabase.from('profiles').select('id, full_name').eq('role', 'farmer').then(({ data }) => {
      if (data) setFarmers(data);
    });
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return toast.warning('Fill in both title and message.');
    setIsSubmitting(true);
    try {
      const targetIds = selectedFarmer === 'all' ? farmers.map(f => f.id) : [selectedFarmer];
      if (targetIds.length === 0) { toast.error('No farmers found.'); return; }
      const { error } = await supabase.from('notifications').insert(
        targetIds.map(id => ({ user_id: id, title, message, type: 'admin_alert', is_read: false }))
      );
      if (error) throw error;
      toast.success(`Notification sent to ${targetIds.length} user(s)!`);
      setTitle(''); setMessage('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Broadcast Notifications</h2>
        <p className="text-sm text-muted-foreground mt-1">Send push alerts to farmers</p>
      </div>
      <Card className="border border-border/60">
        <CardContent className="p-6 space-y-5">
          <div>
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Quick Templates</Label>
            <div className="flex flex-wrap gap-2">
              {ALERT_TEMPLATES.map((tpl, i) => (
                <button key={i} type="button" onClick={() => { setTitle(tpl.title); setMessage(tpl.message); }}
                  className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-xs font-semibold transition-colors border border-primary/20">
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">Recipients</Label>
              <Select value={selectedFarmer} onValueChange={setSelectedFarmer}>
                <SelectTrigger className="h-10 bg-muted/30 border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">📢 All Farmers ({farmers.length})</SelectItem>
                  {farmers.map(f => <SelectItem key={f.id} value={f.id}>👤 {f.full_name || 'Unnamed'}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">Title</Label>
              <Input placeholder="Alert title..." value={title} onChange={e => setTitle(e.target.value)} className="h-10 bg-muted/30 border-border/60" disabled={isSubmitting} />
            </div>
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">Message</Label>
              <Textarea placeholder="Notification message..." value={message} onChange={e => setMessage(e.target.value)} className="min-h-[100px] bg-muted/30 border-border/60 resize-none" disabled={isSubmitting} />
            </div>
            <Button type="submit" disabled={isSubmitting} className="h-10 px-6 font-semibold">
              {isSubmitting ? <><RefreshCw size={14} className="mr-2 animate-spin" />Sending...</> : <><Send size={14} className="mr-2" />Send Notification</>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

// ═══════════════════════════ Main AdminDashboard ═══════════════════════════════
export const AdminDashboard: React.FC = () => {
  const { user, profile, loading, logout, refreshProfile } = useAuth();

  const [section, setSection] = useState<Section>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Stats
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [growthData, setGrowthData] = useState<any[]>([]);
  const [issueData, setIssueData] = useState<any[]>([]);
  const [farmersByDistrict, setFarmersByDistrict] = useState<Record<string, number>>({});

  // Section data
  const [users, setUsers] = useState<any[]>([]);
  const [experts, setExperts] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [sectionLoading, setSectionLoading] = useState(false);

  // Modals
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [selectedExpert, setSelectedExpert] = useState<any | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Edit state
  const [editUserName, setEditUserName] = useState('');
  const [editUserPhone, setEditUserPhone] = useState('');
  const [editUserRole, setEditUserRole] = useState('');
  const [editIssueStatus, setEditIssueStatus] = useState('');
  const [editProductName, setEditProductName] = useState('');
  const [editProductPrice, setEditProductPrice] = useState('');
  const [editProductQuantity, setEditProductQuantity] = useState('');
  const [editProductStatus, setEditProductStatus] = useState('');
  const [editProductDescription, setEditProductDescription] = useState('');
  const [editName, setEditName] = useState('');
  const [savingModal, setSavingModal] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Filters
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // ── Load Stats ────────────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
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
        openIssues: allIssues.filter(i => i.status === 'open' || i.status === 'pending').length,
        resolvedIssues: allIssues.filter(i => i.status === 'resolved').length,
      };
      setStats(s);

      const districtMap: Record<string, number> = {};
      for (const fp of farmerLocRes.data ?? []) {
        if (fp.district) {
          const d = fp.district.trim();
          districtMap[d] = (districtMap[d] || 0) + 1;
        }
      }
      setFarmersByDistrict(districtMap);

      const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
      setGrowthData(months.map((m, i) => ({
        month: m,
        farmers: Math.round(s.farmers * (0.5 + i * 0.1)),
        buyers: Math.round(s.buyers * (0.4 + i * 0.12)),
      })));
      setIssueData([
        { name: 'Open Issues', value: s.openIssues, fill: 'hsl(var(--destructive))' },
        { name: 'Resolved', value: s.resolvedIssues, fill: '#1e5a32' },
        { name: 'Active Products', value: s.activeProducts, fill: 'hsl(45 97% 50%)' },
      ]);
    } catch (e) {
      toast.error('Failed to load stats');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ── Load Section Data ─────────────────────────────────────────────────────
  const loadSection = useCallback(async (sec: Section) => {
    if (!['users', 'experts', 'issues', 'products'].includes(sec)) return;
    setSectionLoading(true);
    try {
      if (sec === 'users') {
        const { data, error } = await supabase.from('profiles').select('id, full_name, phone_number, role, created_at, avatar_url').order('created_at', { ascending: false }).limit(100);
        if (error) throw error;
        setUsers(data ?? []);
      }
      if (sec === 'experts') {
        const { data, error } = await supabase.from('expert_profiles').select('*, profile:profiles(full_name, phone_number, avatar_url)').limit(60);
        if (error) throw error;
        setExperts(data ?? []);
      }
      if (sec === 'issues') {
        const { data, error } = await supabase.from('crop_issues').select('*, farmer:profiles(full_name, phone_number)').order('created_at', { ascending: false }).limit(60);
        if (error) throw error;
        setIssues(data ?? []);
      }
      if (sec === 'products') {
        const { data, error } = await supabase.from('products').select('*, farmer:profiles(full_name, phone_number)').order('created_at', { ascending: false }).limit(60);
        if (error) throw error;
        setProducts(data ?? []);
      }
    } catch {
      toast.error('Failed to load data');
    } finally {
      setSectionLoading(false);
    }
  }, []);

  // ── User handlers ─────────────────────────────────────────────────────────
  const openUserModal = (u: any) => {
    setSelectedUser(u);
    setEditUserName(u.full_name || '');
    setEditUserPhone(u.phone_number || '');
    setEditUserRole(u.role || 'farmer');
  };
  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    setSavingModal(true);
    try {
      await supabase.from('profiles').update({ full_name: editUserName, phone_number: editUserPhone, role: editUserRole as any }).eq('id', selectedUser.id);
      toast.success('User updated');
      setSelectedUser(null);
      loadSection('users'); loadStats();
    } catch { toast.error('Failed to update user'); }
    finally { setSavingModal(false); }
  };
  const handleDeleteUser = async (id: string) => {
    if (!confirm('Delete this user permanently?')) return;
    try {
      await supabase.from('profiles').delete().eq('id', id);
      setUsers(prev => prev.filter(u => u.id !== id));
      setSelectedUser(null);
      toast.success('User deleted'); loadStats();
    } catch { toast.error('Failed to delete user'); }
  };

  // ── Issue handlers ────────────────────────────────────────────────────────
  const openIssueModal = (issue: any) => {
    setSelectedIssue(issue);
    setEditIssueStatus(issue.status || 'pending');
  };
  const handleUpdateIssue = async () => {
    if (!selectedIssue) return;
    setSavingModal(true);
    try {
      await supabase.from('crop_issues').update({ status: editIssueStatus as any }).eq('id', selectedIssue.id);
      toast.success('Issue updated');
      setSelectedIssue(null);
      loadSection('issues'); loadStats();
    } catch { toast.error('Failed to update issue'); }
    finally { setSavingModal(false); }
  };
  const handleDeleteIssue = async (id: string) => {
    if (!confirm('Delete this issue permanently?')) return;
    try {
      await supabase.from('crop_issues').delete().eq('id', id);
      setIssues(prev => prev.filter(i => i.id !== id));
      setSelectedIssue(null);
      toast.success('Issue deleted'); loadStats();
    } catch { toast.error('Failed to delete issue'); }
  };

  // ── Product handlers ──────────────────────────────────────────────────────
  const openProductModal = (prod: any) => {
    setSelectedProduct(prod);
    setEditProductName(prod.name || '');
    setEditProductPrice(String(prod.price || ''));
    setEditProductQuantity(prod.quantity || '');
    setEditProductStatus(prod.status || 'active');
    setEditProductDescription(prod.description || '');
  };
  const handleUpdateProduct = async () => {
    if (!selectedProduct) return;
    setSavingModal(true);
    try {
      await supabase.from('products').update({ name: editProductName, price: parseFloat(editProductPrice), quantity: editProductQuantity, status: editProductStatus as any, description: editProductDescription }).eq('id', selectedProduct.id);
      toast.success('Product updated');
      setSelectedProduct(null);
      loadSection('products'); loadStats();
    } catch { toast.error('Failed to update product'); }
    finally { setSavingModal(false); }
  };
  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Delete this product permanently?')) return;
    try {
      await supabase.from('products').delete().eq('id', id);
      setProducts(prev => prev.filter(p => p.id !== id));
      setSelectedProduct(null);
      toast.success('Product deleted'); loadStats();
    } catch { toast.error('Failed to delete product'); }
  };

  // ── Expert verification ───────────────────────────────────────────────────
  const handleVerify = async (expertId: string, status: 'verified' | 'rejected') => {
    try {
      await supabase.from('expert_profiles').update({ verification_status: status } as any).eq('id', expertId);
      toast.success(`Expert ${status}`);
      setSelectedExpert(null);
      loadSection('experts'); loadStats();
    } catch { toast.error('Update failed'); }
  };

  // ── Profile save ──────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      await supabase.from('profiles').update({ full_name: editName }).eq('id', user.id);
      await refreshProfile();
      toast.success('Profile updated!');
    } catch { toast.error('Failed'); }
    finally { setSavingProfile(false); }
  };

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => { if (!loading && user?.id) loadStats(); }, [loading, user?.id]);
  useEffect(() => { if (profile) setEditName(profile.full_name ?? ''); }, [profile]);
  useEffect(() => { loadSection(section); }, [section]);

  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="w-16 h-16 rounded-full" />
      </div>
    );
  }

  const filteredUsers = users.filter(u =>
    (roleFilter === 'all' || u.role === roleFilter) &&
    (u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) || u.phone_number?.includes(userSearch))
  );

  const BRAND = '#1e5a32';
  const sidebarW = sidebarCollapsed ? 'w-16' : 'w-60';

  // ── Role badge color ──────────────────────────────────────────────────────
  const roleBadge = (role: string) => {
    const map: Record<string, string> = { farmer: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', buyer: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', expert: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' };
    return <span className={`px-2 py-0.5 rounded-md text-xs font-semibold capitalize ${map[role] ?? 'bg-muted text-muted-foreground'}`}>{role}</span>;
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = { pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', resolved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', open: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', sold: 'bg-muted text-muted-foreground', verified: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' };
    return <span className={`px-2 py-0.5 rounded-md text-xs font-semibold capitalize ${map[status] ?? 'bg-muted text-muted-foreground'}`}>{status}</span>;
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-muted/30 overflow-hidden font-sans">

      {/* ══════════════════ SIDEBAR ══════════════════ */}
      <aside className={`${sidebarW} flex-shrink-0 bg-white dark:bg-card border-r border-border/60 flex flex-col transition-all duration-300 ease-in-out overflow-hidden`}>
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-4 border-b border-border/60 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: BRAND }}>
            <Leaf size={16} className="text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-black text-foreground leading-tight whitespace-nowrap">Hamro Kisan</p>
              <p className="text-[10px] text-muted-foreground whitespace-nowrap">Admin Console</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const badgeCount = item.badge?.(stats);
            const active = section === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative group
                  ${active ? 'text-white shadow-sm' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}`}
                style={active ? { background: BRAND } : {}}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!sidebarCollapsed && <span className="flex-1 text-left whitespace-nowrap">{item.label}</span>}
                {!sidebarCollapsed && badgeCount !== undefined && badgeCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white leading-none">{badgeCount}</span>
                )}
                {sidebarCollapsed && badgeCount !== undefined && badgeCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
                )}
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-popover border border-border rounded-md text-xs font-medium text-foreground whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-md">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-2 border-t border-border/60 flex-shrink-0">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-all"
          >
            <LogOut size={18} className="flex-shrink-0" />
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ══════════════════ MAIN ══════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Top Header ── */}
        <header className="h-16 bg-white dark:bg-card border-b border-border/60 flex items-center gap-4 px-6 flex-shrink-0">
          <button onClick={() => setSidebarCollapsed(p => !p)} className="w-8 h-8 rounded-lg hover:bg-muted/60 flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground">
            {sidebarCollapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
          </button>
          <div className="flex-1">
            <h1 className="text-sm font-bold text-foreground capitalize">
              {NAV_ITEMS.find(n => n.id === section)?.label ?? 'Dashboard'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button onClick={loadStats} className="w-8 h-8 rounded-lg hover:bg-muted/60 flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground">
            <RefreshCw size={16} className={statsLoading ? 'animate-spin' : ''} />
          </button>
          <div className="flex items-center gap-2.5 pl-3 border-l border-border/60">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : <User size={16} className="text-muted-foreground" />}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold text-foreground leading-tight">{profile?.full_name ?? 'Admin'}</p>
              <p className="text-[10px] text-muted-foreground">Administrator</p>
            </div>
          </div>
        </header>

        {/* ── Scrollable Content ── */}
        <main className="flex-1 overflow-y-auto p-6">

          {/* ════════════ DASHBOARD ════════════ */}
          {section === 'dashboard' && (
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statsLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />) : (
                  <>
                    <StatCard label="Total Users" value={stats?.totalUsers ?? 0} icon={<Users size={18} />} color="#1e5a32" sub={`${stats?.farmers} farmers · ${stats?.buyers} buyers`} />
                    <StatCard label="Active Products" value={stats?.activeProducts ?? 0} icon={<ShoppingBag size={18} />} color="#d97706" sub="marketplace listings" />
                    <StatCard label="Pending Verifications" value={stats?.pendingVerifications ?? 0} icon={<ShieldCheck size={18} />} color="#dc2626" sub="experts awaiting review" />
                    <StatCard label="Issues Resolved" value={stats?.resolvedIssues ?? 0} icon={<Activity size={18} />} color="#1e5a32" sub={`${stats?.openIssues} still open`} />
                  </>
                )}
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2 border border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2"><TrendingUp size={14} style={{ color: BRAND }} /> User Growth (6 Months)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={growthData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gFarmer" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#1e5a32" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#1e5a32" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gBuyer" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#d97706" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                        <Area type="monotone" dataKey="farmers" stroke="#1e5a32" strokeWidth={2} fill="url(#gFarmer)" name="Farmers" />
                        <Area type="monotone" dataKey="buyers" stroke="#d97706" strokeWidth={2} fill="url(#gBuyer)" name="Buyers" />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div className="flex gap-4 mt-2">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><div className="w-3 h-1.5 rounded-full" style={{ background: '#1e5a32' }} />Farmers</div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><div className="w-3 h-1.5 rounded-full bg-amber-500" />Buyers</div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2"><BarChart3 size={14} style={{ color: BRAND }} /> Platform Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={issueData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                          {issueData.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Map + Quick Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2 border border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2"><MapPin size={14} style={{ color: BRAND }} /> Farmer Distribution by District</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <NepalMap farmersByDistrict={farmersByDistrict} />
                    <div className="flex flex-wrap gap-2 mt-3">
                      {Object.entries(farmersByDistrict).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([district, count]) => (
                        <span key={district} className="px-2.5 py-1 bg-muted text-xs font-semibold rounded-full text-foreground">
                          {district}: {count}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {[
                      { label: 'Review Expert Verifications', sub: `${stats?.pendingVerifications ?? 0} pending`, icon: <ShieldCheck size={15} />, color: '#dc2626', sec: 'experts' as Section },
                      { label: 'Open Crop Issues', sub: `${stats?.openIssues ?? 0} unresolved`, icon: <AlertTriangle size={15} />, color: '#1e5a32', sec: 'issues' as Section },
                      { label: 'Manage Users', sub: `${stats?.totalUsers ?? 0} registered`, icon: <Users size={15} />, color: '#2563eb', sec: 'users' as Section },
                      { label: 'Send Notifications', sub: 'Broadcast to farmers', icon: <Bell size={15} />, color: '#7c3aed', sec: 'notifications' as Section },
                    ].map(a => (
                      <button key={a.label} onClick={() => setSection(a.sec)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors text-left">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${a.color}18`, color: a.color }}>{a.icon}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{a.label}</p>
                          <p className="text-xs text-muted-foreground">{a.sub}</p>
                        </div>
                        <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />
                      </button>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ════════════ USERS ════════════ */}
          {section === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
                  <Input placeholder="Search name or phone..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="pl-9 h-9 bg-white dark:bg-card border-border/60" />
                </div>
                <div className="flex gap-1.5">
                  {['all', 'farmer', 'buyer', 'expert', 'admin'].map(r => (
                    <button key={r} onClick={() => setRoleFilter(r)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${roleFilter === r ? 'text-white shadow-sm' : 'bg-white dark:bg-card text-muted-foreground border border-border/60 hover:bg-muted/40'}`}
                      style={roleFilter === r ? { background: BRAND } : {}}>
                      {r}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground ml-auto">{filteredUsers.length} users</span>
              </div>
              <DataTable
                headers={['User', 'Phone', 'Role', 'Joined', 'Actions']}
                loading={sectionLoading}
                rows={filteredUsers.map(u => [
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                      {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : <User size={14} className="text-muted-foreground" />}
                    </div>
                    <span className="font-medium text-foreground">{u.full_name || '—'}</span>
                  </div>,
                  <span className="text-muted-foreground">{u.phone_number || '—'}</span>,
                  roleBadge(u.role),
                  <span className="text-muted-foreground text-xs">{new Date(u.created_at).toLocaleDateString()}</span>,
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => openUserModal(u)} className="p-1.5 rounded-md hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"><Edit3 size={14} /></button>
                    <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                  </div>
                ])}
              />
            </div>
          )}

          {/* ════════════ EXPERTS ════════════ */}
          {section === 'experts' && (
            <div className="space-y-4">
              {(stats?.pendingVerifications ?? 0) > 0 && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-lg text-sm text-red-700 dark:text-red-400">
                  <ShieldX size={15} className="flex-shrink-0" />
                  {stats?.pendingVerifications} expert(s) awaiting verification
                </div>
              )}
              <DataTable
                headers={['Expert', 'Specialization', 'Experience', 'Status', 'Actions']}
                loading={sectionLoading}
                rows={experts.map((exp: any) => [
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                      {exp.profile?.avatar_url ? <img src={exp.profile.avatar_url} alt="" className="w-full h-full object-cover" /> : <User size={14} className="text-muted-foreground" />}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{exp.profile?.full_name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{exp.profile?.phone_number ?? '—'}</p>
                    </div>
                  </div>,
                  <span className="text-muted-foreground">{exp.specialization ?? '—'}</span>,
                  <span className="text-muted-foreground">{exp.experience_years ?? '—'} yrs</span>,
                  statusBadge(exp.verification_status ?? 'unverified'),
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setSelectedExpert(exp)} className="p-1.5 rounded-md hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"><Eye size={14} /></button>
                    {exp.verification_status === 'pending' && (
                      <>
                        <button onClick={() => handleVerify(exp.id, 'verified')} className="p-1.5 rounded-md hover:bg-green-50 dark:hover:bg-green-950/30 text-muted-foreground hover:text-green-600 transition-colors"><CheckCircle size={14} /></button>
                        <button onClick={() => handleVerify(exp.id, 'rejected')} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-600 transition-colors"><XCircle size={14} /></button>
                      </>
                    )}
                  </div>
                ])}
              />
            </div>
          )}

          {/* ════════════ ISSUES ════════════ */}
          {section === 'issues' && (
            <DataTable
              headers={['Crop', 'Farmer', 'Description', 'Status', 'Reported', 'Actions']}
              loading={sectionLoading}
              emptyText="No crop issues found"
              rows={issues.map((issue: any) => [
                <span className="font-medium text-foreground">{issue.crop_name || '—'}</span>,
                <span className="text-muted-foreground">{issue.farmer?.full_name ?? '—'}</span>,
                <span className="text-muted-foreground text-xs max-w-[200px] line-clamp-2 block">{issue.description}</span>,
                statusBadge(issue.status),
                <span className="text-xs text-muted-foreground">{new Date(issue.created_at).toLocaleDateString()}</span>,
                <div className="flex items-center gap-1.5">
                  <button onClick={() => openIssueModal(issue)} className="p-1.5 rounded-md hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"><Eye size={14} /></button>
                  <button onClick={() => handleDeleteIssue(issue.id)} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                </div>
              ])}
            />
          )}

          {/* ════════════ PRODUCTS ════════════ */}
          {section === 'products' && (
            <DataTable
              headers={['Product', 'Farmer', 'Price', 'Quantity', 'Status', 'Actions']}
              loading={sectionLoading}
              emptyText="No products found"
              rows={products.map((prod: any) => [
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                    {prod.photo_url ? <img src={prod.photo_url} alt="" className="w-full h-full object-cover" /> : <Leaf size={16} className="m-2.5 text-muted-foreground/40" />}
                  </div>
                  <span className="font-medium text-foreground">{prod.name}</span>
                </div>,
                <span className="text-muted-foreground">{prod.farmer?.full_name ?? '—'}</span>,
                <span className="font-semibold text-foreground">Rs.{prod.price}/kg</span>,
                <span className="text-muted-foreground">{prod.quantity || '—'}</span>,
                statusBadge(prod.status),
                <div className="flex items-center gap-1.5">
                  <button onClick={() => openProductModal(prod)} className="p-1.5 rounded-md hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"><Edit3 size={14} /></button>
                  <button onClick={() => handleDeleteProduct(prod.id)} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                </div>
              ])}
            />
          )}

          {/* ════════════ NOTIFICATIONS ════════════ */}
          {section === 'notifications' && <NotificationsPanel />}

          {/* ════════════ PROFILE ════════════ */}
          {section === 'profile' && (
            <div className="max-w-lg space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">Profile Settings</h2>
                <p className="text-sm text-muted-foreground mt-1">Manage your admin account</p>
              </div>
              <Card className="border border-border/60">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border/60">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 ring-2" style={{ ringColor: BRAND }}>
                      {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : <User size={28} className="text-muted-foreground" />}
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{profile?.full_name ?? 'Admin'}</p>
                      <p className="text-sm text-muted-foreground">{user?.email}</p>
                      <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                        <ShieldCheck size={11} /> Administrator
                      </span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3 text-center mb-2">
                      {[{ label: 'Total Users', value: stats?.totalUsers ?? '—' }, { label: 'Farmers', value: stats?.farmers ?? '—' }, { label: 'Experts', value: stats?.experts ?? '—' }].map(s => (
                        <div key={s.label} className="bg-muted/40 rounded-xl p-3">
                          <p className="text-lg font-black text-foreground">{s.value}</p>
                          <p className="text-xs text-muted-foreground">{s.label}</p>
                        </div>
                      ))}
                    </div>
                    <div>
                      <Label className="text-sm font-semibold mb-1.5 block">Display Name</Label>
                      <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-10 bg-muted/30 border-border/60" />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold mb-1.5 block">Email</Label>
                      <Input value={user?.email ?? ''} disabled className="h-10 bg-muted/20 border-border/60 opacity-60" />
                    </div>
                    <Button onClick={handleSaveProfile} disabled={savingProfile} className="h-10 font-semibold" style={{ background: BRAND }}>
                      {savingProfile ? 'Saving...' : <><Save size={14} className="mr-2" />Save Changes</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

        </main>
      </div>

      {/* ══════════════════ MODALS ══════════════════ */}

      {/* User Modal */}
      <Dialog open={!!selectedUser} onOpenChange={o => !o && setSelectedUser(null)}>
        <DialogContent className="max-w-md rounded-2xl bg-card">
          {selectedUser && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                    {selectedUser.avatar_url ? <img src={selectedUser.avatar_url} alt="" className="w-full h-full object-cover" /> : <User size={22} className="text-muted-foreground" />}
                  </div>
                  <div>
                    <DialogTitle className="text-base font-bold">{selectedUser.full_name || 'User'}</DialogTitle>
                    <DialogDescription>{selectedUser.phone_number || 'No phone'}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-3">
                <div><Label className="text-xs font-semibold mb-1 block">Full Name</Label><Input value={editUserName} onChange={e => setEditUserName(e.target.value)} className="h-10 bg-muted/30 border-border/60" /></div>
                <div><Label className="text-xs font-semibold mb-1 block">Phone Number</Label><Input value={editUserPhone} onChange={e => setEditUserPhone(e.target.value)} className="h-10 bg-muted/30 border-border/60" /></div>
                <div>
                  <Label className="text-xs font-semibold mb-1 block">Role</Label>
                  <Select value={editUserRole} onValueChange={setEditUserRole}>
                    <SelectTrigger className="h-10 bg-muted/30 border-border/60"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['farmer', 'buyer', 'expert', 'admin'].map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1 h-10" onClick={() => setSelectedUser(null)}>Cancel</Button>
                <Button className="flex-1 h-10 font-semibold" onClick={handleUpdateUser} disabled={savingModal} style={{ background: BRAND }}>
                  <Save size={14} className="mr-1.5" />{savingModal ? 'Saving...' : 'Save'}
                </Button>
              </div>
              <Button variant="destructive" className="w-full h-10" onClick={() => handleDeleteUser(selectedUser.id)}>
                <Trash2 size={14} className="mr-1.5" />Delete User
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Expert Modal */}
      <Dialog open={!!selectedExpert} onOpenChange={o => !o && setSelectedExpert(null)}>
        <DialogContent className="max-w-md rounded-2xl bg-card max-h-[90vh] overflow-y-auto">
          {selectedExpert && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                    {selectedExpert.profile?.avatar_url ? <img src={selectedExpert.profile.avatar_url} alt="" className="w-full h-full object-cover" /> : <User size={22} className="text-muted-foreground" />}
                  </div>
                  <div>
                    <DialogTitle className="text-base font-bold">{selectedExpert.profile?.full_name ?? 'Expert'}</DialogTitle>
                    <DialogDescription>{selectedExpert.specialization ?? '—'} · {selectedExpert.experience_years} yrs exp</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><FileText size={12} />Verification Documents</p>
                {selectedExpert.document_url ? (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Credential Document</p>
                    <div className="w-full h-44 bg-muted/30 rounded-xl overflow-hidden border border-border/60 relative group cursor-pointer" onClick={() => setFullscreenImage(selectedExpert.document_url)}>
                      <img src={selectedExpert.document_url} alt="Document" className="w-full h-full object-contain" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                        <Eye size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </div>
                ) : null}
                {selectedExpert.selfie_url ? (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Verification Selfie</p>
                    <div className="w-full h-44 bg-muted/30 rounded-xl overflow-hidden border border-border/60 relative group cursor-pointer" onClick={() => setFullscreenImage(selectedExpert.selfie_url)}>
                      <img src={selectedExpert.selfie_url} alt="Selfie" className="w-full h-full object-contain" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                        <Eye size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </div>
                ) : null}
                {!selectedExpert.document_url && !selectedExpert.selfie_url && (
                  <div className="bg-muted/40 rounded-xl p-6 text-center border border-dashed border-border/60">
                    <FileText size={20} className="mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground">No documents uploaded</p>
                  </div>
                )}
              </div>
              <div className="pt-1">
                {statusBadge(selectedExpert.verification_status ?? 'unverified')}
              </div>
              {selectedExpert.verification_status === 'pending' && (
                <div className="flex gap-2">
                  <Button variant="destructive" className="flex-1 h-10 font-semibold" onClick={() => handleVerify(selectedExpert.id, 'rejected')}>
                    <XCircle size={14} className="mr-1.5" />Reject
                  </Button>
                  <Button className="flex-1 h-10 font-semibold" onClick={() => handleVerify(selectedExpert.id, 'verified')} style={{ background: BRAND }}>
                    <CheckCircle size={14} className="mr-1.5" />Verify
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Issue Modal */}
      <Dialog open={!!selectedIssue} onOpenChange={o => !o && setSelectedIssue(null)}>
        <DialogContent className="max-w-md rounded-2xl bg-card max-h-[90vh] overflow-y-auto">
          {selectedIssue && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>{selectedIssue.crop_name || 'Crop Issue'}</DialogTitle>
                <DialogDescription>Reported by {selectedIssue.farmer?.full_name ?? 'Unknown'}</DialogDescription>
              </DialogHeader>
              {selectedIssue.image_url && (
                <div className="w-full h-48 bg-muted/30 rounded-xl overflow-hidden border border-border/60 relative group cursor-pointer" onClick={() => setFullscreenImage(selectedIssue.image_url)}>
                  <img src={selectedIssue.image_url} alt="Issue" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                    <Eye size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              )}
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p className="text-sm text-foreground">{selectedIssue.description}</p>
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Update Status</Label>
                <Select value={editIssueStatus} onValueChange={setEditIssueStatus}>
                  <SelectTrigger className="h-10 bg-muted/30 border-border/60"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 h-10" onClick={() => setSelectedIssue(null)}>Cancel</Button>
                <Button className="flex-1 h-10 font-semibold" onClick={handleUpdateIssue} disabled={savingModal} style={{ background: BRAND }}>
                  <Save size={14} className="mr-1.5" />{savingModal ? 'Saving...' : 'Update'}
                </Button>
              </div>
              <Button variant="destructive" className="w-full h-10" onClick={() => handleDeleteIssue(selectedIssue.id)}>
                <Trash2 size={14} className="mr-1.5" />Delete Issue
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Product Modal */}
      <Dialog open={!!selectedProduct} onOpenChange={o => !o && setSelectedProduct(null)}>
        <DialogContent className="max-w-md rounded-2xl bg-card max-h-[90vh] overflow-y-auto">
          {selectedProduct && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>{selectedProduct.name}</DialogTitle>
                <DialogDescription>By {selectedProduct.farmer?.full_name ?? 'Unknown'}</DialogDescription>
              </DialogHeader>
              {selectedProduct.photo_url && (
                <div className="w-full h-48 bg-muted/30 rounded-xl overflow-hidden border border-border/60 relative group cursor-pointer" onClick={() => setFullscreenImage(selectedProduct.photo_url)}>
                  <img src={selectedProduct.photo_url} alt="Product" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                    <Eye size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              )}
              <div><Label className="text-xs font-semibold mb-1.5 block">Product Name</Label><Input value={editProductName} onChange={e => setEditProductName(e.target.value)} className="h-10 bg-muted/30 border-border/60" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs font-semibold mb-1.5 block">Price (Rs./kg)</Label><Input type="number" value={editProductPrice} onChange={e => setEditProductPrice(e.target.value)} className="h-10 bg-muted/30 border-border/60" /></div>
                <div><Label className="text-xs font-semibold mb-1.5 block">Quantity</Label><Input value={editProductQuantity} onChange={e => setEditProductQuantity(e.target.value)} className="h-10 bg-muted/30 border-border/60" /></div>
              </div>
              <div><Label className="text-xs font-semibold mb-1.5 block">Description</Label><Textarea value={editProductDescription} onChange={e => setEditProductDescription(e.target.value)} className="min-h-[80px] bg-muted/30 border-border/60 resize-none" /></div>
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Status</Label>
                <Select value={editProductStatus} onValueChange={setEditProductStatus}>
                  <SelectTrigger className="h-10 bg-muted/30 border-border/60"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 h-10" onClick={() => setSelectedProduct(null)}>Cancel</Button>
                <Button className="flex-1 h-10 font-semibold" onClick={handleUpdateProduct} disabled={savingModal} style={{ background: BRAND }}>
                  <Save size={14} className="mr-1.5" />{savingModal ? 'Saving...' : 'Update'}
                </Button>
              </div>
              <Button variant="destructive" className="w-full h-10" onClick={() => handleDeleteProduct(selectedProduct.id)}>
                <Trash2 size={14} className="mr-1.5" />Delete Product
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Fullscreen Image */}
      <Dialog open={!!fullscreenImage} onOpenChange={o => !o && setFullscreenImage(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-black/95 border-0">
          <button onClick={() => setFullscreenImage(null)} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-50 transition-colors">
            <X size={18} />
          </button>
          {fullscreenImage && <img src={fullscreenImage} alt="Fullscreen" className="max-w-full max-h-[90vh] object-contain m-auto block" />}
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default AdminDashboard;
