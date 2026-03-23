// ═══════════════════════════════════════════════════════════════════════════
// BUYER DASHBOARD (Web Optimized)
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Search, MapPin, Package, Phone, Leaf, User, Home, Store,
  MessageCircle, Bug, LogOut, CheckCircle, X, Clock, Camera, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const productCategories = ['Vegetables', 'Fruits', 'Grains', 'Spices', 'Dairy', 'Livestock', 'Other'];

// --- TYPES & HELPERS ---
interface WeatherData { location: string; temperature: number; humidity: number; wind_speed: number; description: string; icon: string; high: number; low: number; precipitation: number; pressure: number; sunrise: string; sunset: string; }
interface NewsItem { title: string; summary: string; source: string; date: string; }
interface Coordinates { lat: number; lng: number; }

const GEOCODE_CACHE_KEY = 'hk_geocode_cache';
const getGeocodeCache = (): Record<string, Coordinates> => { try { const cached = localStorage.getItem(GEOCODE_CACHE_KEY); return cached ? JSON.parse(cached) : {}; } catch { return {}; } };
const setGeocodeCache = (location: string, coords: Coordinates) => { try { const cache = getGeocodeCache(); cache[location] = coords; localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache)); } catch (e) { console.error(e); } };

const geocodeLocation = async (municipality: string, district: string, province: string): Promise<Coordinates | null> => {
  const cacheKey = `${municipality}, ${district}, ${province}`;
  const cache = getGeocodeCache();
  if (cache[cacheKey]) return cache[cacheKey];
  try {
    const query = `${municipality}, ${district}, ${province}, Nepal`;
    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=np`, { headers: { 'User-Agent': 'HamroKisan/1.0' } });
    if (!response.ok) throw new Error('Geocoding failed');
    const data = await response.json();
    if (data && data.length > 0) {
      const coords: Coordinates = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      setGeocodeCache(cacheKey, coords);
      return coords;
    }
    return null;
  } catch (error) { return null; }
};

const calculateDistance = (c1: Coordinates, c2: Coordinates): number => {
  const R = 6371; const dLat = (c2.lat - c1.lat) * Math.PI / 180; const dLng = (c2.lng - c1.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(c1.lat * Math.PI / 180) * Math.cos(c2.lat * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return Math.round(R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))));
};

const formatDistance = (d: number): string => {
  if (d < 1) return 'Less than 1 km'; if (d < 5) return `${d} km away`;
  if (d < 50) return `~${Math.round(d / 5) * 5} km away`; if (d < 100) return `~${Math.round(d / 10) * 10} km away`;
  return '100+ km away';
};

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

export const BuyerDashboard: React.FC = () => {
  const { user, profile, buyerProfile, loading, logout, refreshProfile } = useAuth();

  const [currentTab, setCurrentTab] = useState<'home' | 'market' | 'profile'>('home');
  const [marketView, setMarketView] = useState<'browse' | 'requests'>('browse');

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [requestFilter, setRequestFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected' | 'completed'>('all');

  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [quantity, setQuantity] = useState('');
  const [proposedPrice, setProposedPrice] = useState('');
  const [buyerMessage, setBuyerMessage] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);

  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBusiness, setEditBusiness] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [bugDesc, setBugText] = useState('');
  const [showBugDialog, setShowBugDialog] = useState(false);

  const userLocation = buyerProfile?.district ?? buyerProfile?.municipality ?? 'Kathmandu';
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good Morning' : currentHour < 18 ? 'Good Afternoon' : 'Good Evening';

  // ── Fetchers ─────────────────────────────────────────────────────────────
  const fetchWeather = async () => {
    setWeatherLoading(true);
    try {
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${userLocation}&count=1&language=en&format=json`);
      const geoData = await geoRes.json();
      if (!geoData.results?.length) throw new Error('Location not found');
      const { latitude, longitude, name } = geoData.results[0];
      const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,surface_pressure,weather_code&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto`);
      const wData = await wRes.json();
      const fmt = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
      setWeather({ location: name, temperature: wData.current.temperature_2m, humidity: wData.current.relative_humidity_2m, wind_speed: wData.current.wind_speed_10m, precipitation: wData.current.precipitation, pressure: wData.current.surface_pressure, high: wData.daily.temperature_2m_max[0], low: wData.daily.temperature_2m_min[0], sunrise: fmt(wData.daily.sunrise[0]), sunset: fmt(wData.daily.sunset[0]), description: 'Clear', icon: '☀️' });
    } catch { setWeather({ location: userLocation, temperature: 22, humidity: 55, wind_speed: 10, precipitation: 0, pressure: 1012, high: 26, low: 18, sunrise: '6:10 am', sunset: '5:45 pm', description: 'Clear', icon: '☀️' }); } 
    finally { setWeatherLoading(false); }
  };

  const fetchNews = async () => {
    setNewsLoading(true);
    try {
      const { data } = await supabase.functions.invoke('get-agri-news');
      if (data?.news) setNews(data.news.slice(0, 4)); else throw new Error('No news');
    } catch {
      setNews([{ title: 'Local organic markets see 20% growth.', summary: 'Demand for fresh vegetables is rising among city buyers.', source: 'Agri Business', date: 'Today' }, { title: 'Transport subsidies announced', summary: 'Government to cover 10% of logistics costs.', source: 'National News', date: 'Yesterday' }]);
    } finally { setNewsLoading(false); }
  };

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase.from('products').select(`*, farmer:profiles(id, full_name, phone_number, avatar_url, farmer_profile:farmer_profiles(province, district, municipality, ward_number, tole_name, farm_name, farm_type))`).eq('status', 'active');
      if (error) throw error;

      const myMuni = buyerProfile?.municipality; const myDist = buyerProfile?.district; const myProv = buyerProfile?.province;
      let buyerCoords: Coordinates | null = null;
      if (myMuni && myDist && myProv) buyerCoords = await geocodeLocation(myMuni, myDist, myProv);

      const processedPromises = (data ?? []).map(async (p) => {
        const farmerData = Array.isArray(p.farmer) ? p.farmer[0] : p.farmer;
        const fp = Array.isArray(farmerData?.farmer_profile) ? farmerData?.farmer_profile[0] : farmerData?.farmer_profile;
        const fMuni = fp?.municipality; const fDist = fp?.district; const fProv = fp?.province;
        
        let distVal = 999; let distText = 'Distance unknown';
        if (buyerCoords && fMuni && fDist && fProv) {
          const farmerCoords = await geocodeLocation(fMuni, fDist, fProv);
          if (farmerCoords) { distVal = calculateDistance(buyerCoords, farmerCoords); distText = formatDistance(distVal); } 
          else { if (myMuni === fMuni) { distVal = 3; distText = 'Same municipality'; } else if (myDist === fDist) { distVal = 15; distText = 'Same district (~15 km)'; } else if (myProv === fProv) { distVal = 50; distText = 'Same province (~50 km)'; } else { distVal = 150; distText = '100+ km away'; } }
        } else if (fMuni && fDist) { distText = `${fMuni}, ${fDist}`; distVal = 100; }

        return { ...p, farmerName: farmerData?.full_name ?? 'Unknown Farmer', farmerPhone: farmerData?.phone_number ?? null, farmerAvatar: farmerData?.avatar_url ?? null, farmerProfile: fp, locationText: fMuni ? `${fMuni}, ${fDist}` : 'Unknown Location', distanceValue: distVal, distanceText: distText };
      });

      const processed = await Promise.all(processedPromises);
      processed.sort((a, b) => a.distanceValue - b.distanceValue);
      setProducts(processed);
    } catch (e) { toast.error('Failed to load products'); } finally { setLoadingProducts(false); }
  };

  const fetchRequests = async () => {
    if (!user?.id) return;
    setLoadingRequests(true);
    try {
      const { data, error } = await supabase.from('purchase_requests').select(`*, product:products(id, name, price, photo_url, farmer:profiles(id, full_name, phone_number, farmer_profile:farmer_profiles(province, district, municipality, farm_name)))`).eq('buyer_id', user.id).order('created_at', { ascending: false });
      if (error) throw error;
      setRequests(data ?? []);
    } catch (e) { toast.error('Failed to load requests'); } finally { setLoadingRequests(false); }
  };

  useEffect(() => { if (!loading && user?.id) { fetchWeather(); fetchNews(); fetchProducts(); fetchRequests(); } }, [loading, user?.id]);
  useEffect(() => { if (profile) { setEditName(profile.full_name ?? ''); setEditPhone(profile.phone_number ?? ''); } if (buyerProfile) { setEditBusiness(buyerProfile.business_name ?? ''); } }, [profile, buyerProfile]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleSendRequest = async () => {
    if (!selectedProduct || !quantity || !user) return;
    const parsedPrice = parseFloat(proposedPrice);
    if (!proposedPrice || isNaN(parsedPrice) || parsedPrice <= 0) return toast.error('Please enter a valid offer price.');

    const { data: existing } = await supabase.from('purchase_requests').select('id').eq('product_id', selectedProduct.id).eq('buyer_id', user.id).in('status', ['pending', 'accepted']).single();
    if (existing) return toast.error('You already have an active request for this product');

    setSendingRequest(true);
    try {
      await supabase.from('purchase_requests').insert({ product_id: selectedProduct.id, buyer_id: user.id, quantity_requested: quantity, proposed_price: parsedPrice, buyer_message: buyerMessage || null, status: 'pending' });
      toast.success('Request sent to farmer!');
      setSelectedProduct(null); setQuantity(''); setProposedPrice(''); setBuyerMessage(''); fetchRequests(); setMarketView('requests');
    } catch (e) { toast.error('Failed to send request'); } finally { setSendingRequest(false); }
  };

  const handleCompleteOrder = async (requestId: string) => {
    try {
      const { data: request } = await supabase.from('purchase_requests').select('product_id').eq('id', requestId).eq('buyer_id', user!.id).single();
      if (!request) return toast.error('Request not found');
      await supabase.from('purchase_requests').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', requestId).eq('buyer_id', user!.id);
      await supabase.from('products').update({ status: 'sold' }).eq('id', request.product_id);
      toast.success('Order marked as completed!'); fetchRequests(); fetchProducts();
    } catch (e) { toast.error('Failed to complete order'); }
  };

  const handleCancelRequest = async (requestId: string) => {
    try { await supabase.from('purchase_requests').update({ status: 'cancelled' }).eq('id', requestId).eq('buyer_id', user!.id).eq('status', 'pending'); toast.success('Request cancelled'); fetchRequests(); } catch (e) { toast.error('Failed to cancel request'); }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingAvatar(true);
      if (!event.target.files?.length) throw new Error('Select an image');
      const file = event.target.files[0];
      const path = `${user?.id}-${Math.random()}.${file.name.split('.').pop()}`;
      await supabase.storage.from('avatars').upload(path, file);
      const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', user?.id);
      toast.success('Profile picture updated!'); await refreshProfile();
    } catch (err: any) { toast.error(err.message); } finally { setUploadingAvatar(false); }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      await supabase.from('profiles').update({ full_name: editName, phone_number: editPhone }).eq('id', user.id);
      await supabase.from('buyer_profiles').update({ business_name: editBusiness }).eq('profile_id', user.id);
      await refreshProfile(); toast.success('Profile updated!');
    } catch (e) { toast.error('Error updating profile'); } finally { setSavingProfile(false); }
  };

  const submitBugReport = () => {
    if (!bugDesc) return;
    window.location.href = `mailto:nischalpandey.dev@gmail.com?subject=Hamro Kisan Bug Report&body=Buyer ID: ${user?.id}%0D%0A%0D%0ADescription:%0D%0A${encodeURIComponent(bugDesc)}`;
    setShowBugDialog(false); setBugText('');
  };

  const filteredProducts = products.filter(p => (category === 'All' || p.category === category) && (p.name.toLowerCase().includes(search.toLowerCase()) || p.locationText.toLowerCase().includes(search.toLowerCase())));
  const filteredRequests = requests.filter(r => requestFilter === 'all' || r.status === requestFilter);
  const requestCounts = { pending: requests.filter(r => r.status === 'pending').length, accepted: requests.filter(r => r.status === 'accepted').length, completed: requests.filter(r => r.status === 'completed').length, rejected: requests.filter(r => r.status === 'rejected').length };

  if (loading && !buyerProfile) return <div className="min-h-screen flex items-center justify-center"><Skeleton className="w-24 h-24 rounded-full" /></div>;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12 flex flex-col md:flex-row gap-6">
      
      {/* ── WEB SIDEBAR ── */}
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
          <h2 className="text-lg font-black text-slate-800">{profile?.full_name}</h2>
          <p className="text-emerald-600 font-bold text-xs mt-1 uppercase tracking-widest">{buyerProfile?.business_name ?? 'Registered Buyer'}</p>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex flex-col gap-2 mt-6">
          <button onClick={() => setCurrentTab('home')} className={`flex items-center gap-3 w-full text-left px-4 py-3.5 rounded-2xl font-bold transition-all ${currentTab === 'home' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'}`}>
            <Home size={20} className={currentTab === 'home' ? 'text-emerald-500' : 'text-slate-400'} /> Dashboard
          </button>
          <button onClick={() => { setCurrentTab('market'); setMarketView('browse'); }} className={`flex items-center justify-between w-full text-left px-4 py-3.5 rounded-2xl font-bold transition-all ${currentTab === 'market' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'}`}>
            <div className="flex items-center gap-3"><Store size={20} className={currentTab === 'market' ? 'text-emerald-500' : 'text-slate-400'} /> Shop Produce</div>
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
          {(['home', 'market', 'profile'] as const).map(t => (
            <button key={t} onClick={() => setCurrentTab(t)} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all capitalize ${currentTab === t ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── WEB MAIN CONTENT AREA ── */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 md:py-8 space-y-6">

        {/* =================== HOME TAB =================== */}
        {currentTab === 'home' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-900 p-8 md:p-12 rounded-[2.5rem] shadow-lg text-white flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -z-10" />
              <div>
                <p className="text-emerald-100/80 font-bold mb-1 uppercase tracking-widest">{greeting}</p>
                <h1 className="text-3xl md:text-5xl font-black tracking-tight">{profile?.full_name}</h1>
                <p className="text-emerald-200 mt-2 text-sm md:text-base font-medium max-w-lg">Find fresh, local produce directly from farmers across Nepal. No middlemen, better prices.</p>
              </div>
              <div className="mt-6 md:mt-0 flex gap-3 w-full md:w-auto">
                <Button className="flex-1 md:flex-none h-12 bg-white text-emerald-800 hover:bg-slate-50 font-black rounded-xl" onClick={() => { setCurrentTab('market'); setMarketView('browse'); }}>
                  Start Shopping
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Quick Summary Cards */}
              <div className="md:col-span-2 grid grid-cols-2 gap-4">
                <Card onClick={() => { setCurrentTab('market'); setMarketView('browse'); }} className="border-none shadow-md rounded-3xl cursor-pointer hover:-translate-y-1 transition-all bg-gradient-to-br from-indigo-50 to-blue-50 group">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm text-indigo-500 group-hover:scale-110 transition-transform"><Store size={24} /></div>
                    <p className="text-4xl font-black text-slate-800 mb-1">{products.length}</p>
                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Active Listings</p>
                  </CardContent>
                </Card>
                <Card onClick={() => { setCurrentTab('market'); setMarketView('requests'); }} className="border-none shadow-md rounded-3xl cursor-pointer hover:-translate-y-1 transition-all bg-gradient-to-br from-amber-50 to-orange-50 group relative overflow-hidden">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm text-amber-500 group-hover:scale-110 transition-transform"><Package size={24} /></div>
                    <p className="text-4xl font-black text-slate-800 mb-1">{requestCounts.pending + requestCounts.accepted}</p>
                    <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">Active Requests</p>
                  </CardContent>
                </Card>
              </div>

              {/* Weather Widget */}
              <Card className="border-none shadow-lg rounded-3xl bg-white overflow-hidden md:col-span-1">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4 text-slate-400 font-bold text-xs uppercase tracking-widest">
                    <MapPin size={16} className="text-slate-800" /> {weather?.location || 'Loading...'}
                  </div>
                  {weatherLoading ? (
                    <Skeleton className="h-32 w-full rounded-2xl" />
                  ) : weather ? (
                    <div>
                      <div className="flex justify-between items-center pb-5 mb-5 border-b border-slate-100">
                        <h2 className="text-6xl font-black text-slate-800 tracking-tighter">{Math.round(weather.temperature)}°</h2>
                        <span className="text-6xl drop-shadow-md">{weather.icon}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="bg-slate-50 p-3 rounded-2xl"><p className="text-[10px] font-bold text-slate-400 uppercase">Humidity</p><p className="text-lg font-black text-slate-700">{weather.humidity}%</p></div>
                        <div className="bg-slate-50 p-3 rounded-2xl"><p className="text-[10px] font-bold text-slate-400 uppercase">Rain</p><p className="text-lg font-black text-slate-700">{weather.precipitation}mm</p></div>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            {/* News Feed (Web Style) */}
            <Card className="border-none shadow-lg rounded-3xl bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <CardTitle className="text-lg text-slate-800 flex items-center gap-2"><MessageCircle size={20} className="text-blue-500" /> Market Insights & News</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {newsLoading ? (
                    <div className="p-6 space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
                  ) : news.map((item, idx) => (
                    <div key={idx} className="p-5 hover:bg-slate-50 transition-colors flex justify-between items-center gap-4 group">
                      <div className="flex-1">
                        <p className="font-black text-slate-800 group-hover:text-blue-600 transition-colors leading-tight">{item.title}</p>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{item.summary}</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] uppercase font-bold bg-blue-50 text-blue-700 border-none shrink-0">{item.source}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* =================== MARKET TAB =================== */}
        {currentTab === 'market' && (
          <div className="space-y-6">
            {/* Header & Controls */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex gap-2 bg-slate-50 p-1.5 rounded-2xl w-full md:w-auto">
                <button onClick={() => setMarketView('browse')} className={`flex-1 md:px-8 py-2.5 text-sm font-bold rounded-xl transition-all ${marketView === 'browse' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Browse Produce</button>
                <button onClick={() => setMarketView('requests')} className={`flex-1 md:px-8 py-2.5 text-sm font-bold rounded-xl transition-all relative ${marketView === 'requests' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  My Requests
                  {requestCounts.pending > 0 && <span className="absolute top-2 right-4 w-2 h-2 bg-amber-500 rounded-full" />}
                </button>
              </div>

              {marketView === 'browse' && (
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <Input placeholder="Search potato, tomato..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-12 bg-slate-50 border-none rounded-xl" />
                </div>
              )}
            </div>

            {/* Content Area */}
            {marketView === 'browse' ? (
              <div className="space-y-6">
                <div className="flex gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
                  {['All', ...productCategories].map(c => (
                    <button key={c} onClick={() => setCategory(c)} className={`px-5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${category === c ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}>
                      {c}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {loadingProducts ? (
                    [1,2,3,4].map(i => <Skeleton key={i} className="h-64 w-full rounded-[2rem]" />)
                  ) : filteredProducts.length === 0 ? (
                    <div className="col-span-full text-center py-20 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                      <Search className="mx-auto text-slate-300 mb-4" size={48} />
                      <p className="text-slate-500 font-bold text-lg">No produce found.</p>
                    </div>
                  ) : (
                    filteredProducts.map(product => (
                      <Card key={product.id} className="border-none shadow-md overflow-hidden rounded-[2rem] bg-white group hover:shadow-xl transition-all cursor-pointer" onClick={() => { setSelectedProduct(product); setProposedPrice(product.price.toString()); setQuantity(''); setBuyerMessage(''); }}>
                        <div className="h-48 bg-slate-100 relative overflow-hidden">
                          {product.photo_url ? <LazyImage src={product.photo_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center bg-emerald-50"><Leaf className="text-emerald-200" size={48} /></div>}
                          <Badge className="absolute top-4 left-4 text-[10px] shadow-sm uppercase font-black px-3 py-1 bg-white/90 text-slate-800 border-none backdrop-blur-md">{product.category}</Badge>
                        </div>
                        <CardContent className="p-5">
                          <h3 className="font-black text-lg text-slate-800 line-clamp-1">{product.name}</h3>
                          <div className="flex justify-between items-end mt-4 pt-4 border-t border-slate-100">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><MapPin size={10} className="text-emerald-500"/> {product.locationText}</p>
                              <p className="text-xs font-black text-emerald-600 mt-0.5">{product.distanceText}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-xl text-slate-800">Rs.{product.price}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Per KG</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
                  {([['all', 'All'], ['pending', `Pending (${requestCounts.pending})`], ['accepted', `Accepted (${requestCounts.accepted})`], ['completed', `Completed (${requestCounts.completed})`], ['rejected', `Rejected (${requestCounts.rejected})`]] as const).map(([status, label]) => (
                    <button key={status} onClick={() => setRequestFilter(status)} className={`px-5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${requestFilter === status ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}>
                      {label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {loadingRequests ? (
                    [1,2].map(i => <Skeleton key={i} className="h-48 w-full rounded-[2rem]" />)
                  ) : filteredRequests.length === 0 ? (
                    <div className="col-span-full text-center py-20 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                      <Package className="mx-auto text-slate-300 mb-4" size={48} />
                      <p className="text-slate-500 font-bold text-lg">No {requestFilter === 'all' ? '' : requestFilter} requests found.</p>
                    </div>
                  ) : (
                    filteredRequests.map(req => {
                      const isAccepted = req.status === 'accepted'; const isPending = req.status === 'pending'; const isCompleted = req.status === 'completed';
                      const farmerData = Array.isArray(req.product?.farmer) ? req.product?.farmer[0] : req.product?.farmer;

                      return (
                        <Card key={req.id} className={`rounded-[2rem] shadow-sm border border-slate-100 bg-white hover:shadow-md transition-shadow ${isCompleted ? 'bg-slate-50/50' : ''}`}>
                          <CardContent className="p-6">
                            <div className="flex gap-5">
                              <div className="w-24 h-24 bg-slate-100 rounded-2xl overflow-hidden shrink-0 border border-slate-200">
                                {req.product?.photo_url ? <img src={req.product.photo_url} alt="Crop" className="w-full h-full object-cover" /> : <Package className="m-8 text-slate-300" />}
                              </div>
                              <div className="flex-1 min-w-0 flex flex-col justify-between">
                                <div>
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h4 className="font-black text-slate-800 text-lg line-clamp-1">{req.product?.name}</h4>
                                      <p className="text-sm font-bold text-emerald-600 mt-0.5">{req.quantity_requested}kg @ Rs.{req.proposed_price}/kg</p>
                                    </div>
                                    <Badge variant="outline" className={`text-[10px] uppercase font-black px-2 py-1 border-none ${isPending ? 'bg-amber-100 text-amber-700' : isAccepted ? 'bg-blue-100 text-blue-700' : isCompleted ? 'bg-slate-200 text-slate-600' : 'bg-red-100 text-red-700'}`}>
                                      {req.status}
                                    </Badge>
                                  </div>
                                  
                                  {farmerData && (
                                    <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><User size={14} /></div>
                                      <div>
                                        <p className="text-xs font-bold text-slate-700">{farmerData.full_name}</p>
                                        {(isAccepted || isCompleted) ? (
                                          <a href={`tel:${farmerData.phone_number}`} className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1 mt-0.5"><Phone size={10} />{farmerData.phone_number}</a>
                                        ) : (
                                          <p className="text-[10px] text-slate-400 mt-0.5 italic">Contact hidden until accepted</p>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {(req.buyer_message || req.farmer_response) && (
                              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                                {req.buyer_message && <div><p className="text-[9px] font-bold text-slate-400 uppercase">Your Message</p><p className="text-xs text-slate-600 italic">"{req.buyer_message}"</p></div>}
                                {req.farmer_response && <div className="bg-blue-50 p-3 rounded-xl"><p className="text-[9px] font-bold text-blue-500 uppercase">Farmer's Response</p><p className="text-xs text-blue-900 font-medium">"{req.farmer_response}"</p></div>}
                              </div>
                            )}

                            <div className="mt-5 flex gap-3">
                              {isPending && <Button variant="outline" onClick={() => handleCancelRequest(req.id)} className="h-10 text-red-600 border-red-200 hover:bg-red-50 rounded-xl text-xs font-bold"><X size={14} className="mr-1" /> Cancel Offer</Button>}
                              {isAccepted && <Button onClick={() => handleCompleteOrder(req.id)} className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-sm"><CheckCircle size={16} className="mr-2" /> Mark as Received</Button>}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================== PROFILE TAB =================== */}
        {currentTab === 'profile' && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <Card className="rounded-[2rem] border-none shadow-md overflow-hidden bg-white">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <CardTitle className="text-lg text-slate-800 flex items-center gap-2"><User size={20} className="text-emerald-600"/> Edit Profile</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2"><Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Full Name</Label><Input value={editName} onChange={e => setEditName(e.target.value)} className="h-12 bg-slate-50 border-none rounded-xl font-medium" /></div>
                  <div className="space-y-2"><Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Phone Number</Label><Input value={editPhone} onChange={e => setEditPhone(e.target.value)} className="h-12 bg-slate-50 border-none rounded-xl font-medium" inputMode="tel" /></div>
                  <div className="md:col-span-2 space-y-2"><Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Business / Shop Name</Label><Input value={editBusiness} onChange={e => setEditBusiness(e.target.value)} className="h-12 bg-slate-50 border-none rounded-xl font-medium" /></div>
                </div>
                <Button onClick={handleSaveProfile} disabled={savingProfile} className="w-full h-14 font-black rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200">
                  {savingProfile ? 'Saving...' : 'Save Profile Changes'}
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] shadow-md border-none bg-white">
              <CardContent className="p-6 space-y-4">
                <p className="font-black text-slate-800 border-b border-slate-100 pb-4 text-sm uppercase tracking-widest">Support & Contact</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <a href="tel:+9779865060952" className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-emerald-50 transition-colors group border border-slate-100">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform"><Phone size={20} /></div>
                    <div><p className="font-bold text-sm text-slate-800">Call Support</p><p className="text-xs text-slate-500">+977-9865060952</p></div>
                  </a>
                  <a href="https://wa.me/9779865060952" target="_blank" rel="noreferrer" className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-green-50 transition-colors group border border-slate-100">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform"><MessageCircle size={20} /></div>
                    <div><p className="font-bold text-sm text-slate-800">WhatsApp</p><p className="text-xs text-slate-500">Chat with our team</p></div>
                  </a>
                  <button onClick={() => setShowBugDialog(true)} className="sm:col-span-2 flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-red-50 transition-colors group border border-slate-100 text-left">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform"><Bug size={20} /></div>
                    <div><p className="font-bold text-sm text-slate-800">Report a Bug</p><p className="text-xs text-slate-500">Let the developer know</p></div>
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* ── PRODUCT ORDER MODAL (Web Enhanced) ── */}
      <Dialog open={!!selectedProduct} onOpenChange={o => !o && setSelectedProduct(null)}>
        <DialogContent className="max-w-2xl w-[95%] rounded-[2rem] p-0 overflow-hidden bg-white border-none shadow-2xl flex flex-col md:flex-row h-[90vh] md:h-auto">
          {selectedProduct && (
            <>
              {/* Image Side */}
              <div className="w-full md:w-1/2 h-48 md:h-auto bg-slate-100 relative shrink-0">
                {selectedProduct.photo_url ? <img src={selectedProduct.photo_url} alt={selectedProduct.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-emerald-50"><Leaf className="text-emerald-300" size={64} /></div>}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
                <Badge className="absolute top-4 left-4 shadow-sm text-[10px] font-black uppercase tracking-widest bg-white/90 text-slate-800 border-none backdrop-blur-md">{selectedProduct.category}</Badge>
                
                <div className="absolute bottom-6 left-6 text-white">
                  <h2 className="text-3xl font-black leading-tight drop-shadow-md">{selectedProduct.name}</h2>
                  <p className="text-emerald-300 font-bold text-lg mt-1 flex items-center gap-1 drop-shadow-md"><MapPin size={16}/> {selectedProduct.locationText}</p>
                </div>
              </div>

              {/* Form Side */}
              <div className="p-6 md:p-8 flex-1 flex flex-col overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <div className="bg-slate-50 px-4 py-2 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest">Base Price</span>
                    <span className="font-black text-emerald-600 text-xl">Rs.{selectedProduct.price} <span className="text-xs text-slate-500 font-medium">/kg</span></span>
                  </div>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">{selectedProduct.distanceText}</Badge>
                </div>

                <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-white shadow-sm flex items-center justify-center shrink-0 border border-slate-200">
                      {selectedProduct.farmerAvatar ? <img src={selectedProduct.farmerAvatar} alt={selectedProduct.farmerName} className="w-full h-full object-cover" /> : <User size={20} className="text-slate-400" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Grown by</p>
                      <p className="text-sm font-black text-slate-800">{selectedProduct.farmerName}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Quantity (kg)</Label>
                    <Input type="text" inputMode="numeric" placeholder="e.g. 50" value={quantity} onChange={e => setQuantity(e.target.value.replace(/\D/g, ''))} className="h-14 rounded-2xl bg-slate-50 border-none px-4 font-bold text-lg" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Your Offer (Rs)</Label>
                    <Input type="text" inputMode="decimal" placeholder={selectedProduct.price.toString()} value={proposedPrice} onChange={e => setProposedPrice(e.target.value.replace(/[^0-9.]/g, ''))} className="h-14 rounded-2xl bg-slate-50 border-none px-4 font-bold text-lg text-emerald-600 focus:text-emerald-700" />
                  </div>
                </div>
                
                <div className="space-y-2 mb-6">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Message to Farmer</Label>
                  <Textarea placeholder="Ask about quality, delivery, etc..." value={buyerMessage} onChange={e => setBuyerMessage(e.target.value)} className="resize-none h-24 rounded-2xl bg-slate-50 border-none p-4" maxLength={200} />
                </div>

                <Button onClick={handleSendRequest} disabled={!quantity || sendingRequest} className="w-full h-14 text-lg font-black shadow-lg shadow-emerald-200 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white mt-auto">
                  {sendingRequest ? 'Sending Offer...' : 'Send Offer to Farmer'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── BUG REPORT MODAL ── */}
      <Dialog open={showBugDialog} onOpenChange={setShowBugDialog}>
        <DialogContent className="max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center">
            <DialogTitle className="font-black text-xl text-slate-800 flex items-center gap-2"><Bug className="text-red-500" /> Report Issue</DialogTitle>
            <button onClick={() => setShowBugDialog(false)} className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-full shadow-sm"><X size={18} /></button>
          </div>
          <div className="p-6 space-y-6 bg-white">
            <p className="text-sm font-semibold text-slate-500">Describe what went wrong. This will open your email client to send a message directly to our developers.</p>
            <Textarea placeholder="I tried to make an offer but..." value={bugDesc} onChange={e => setBugText(e.target.value)} className="bg-slate-50 border-slate-200 resize-none h-32 rounded-2xl focus-visible:ring-emerald-500 p-4" />
            <Button onClick={submitBugReport} disabled={!bugDesc} className="w-full h-14 font-black rounded-2xl bg-slate-900 hover:bg-slate-800 text-white shadow-lg">Draft Email Report</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BuyerDashboard;