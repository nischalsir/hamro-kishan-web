// ═══════════════════════════════════════════════════════════════════════════
// FARMER DASHBOARD (Web Optimized)
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { fallbackCropPriceData, seasonalCropsCarousel } from '@/data/mock';
import {
  MapPin, AlertTriangle, Leaf, ChevronRight, ChevronLeft,
  Package, User, TrendingUp, Newspaper, RefreshCw,
  Activity, X, History, Clock, BellRing, Sunrise, Store, Sunset, Wind, Droplets
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// --- INTERFACES & LOCAL CACHE ---
interface WeatherData { location: string; temperature: number; humidity: number; wind_speed: number; description: string; icon: string; high: number; low: number; precipitation: number; pressure: number; sunrise: string; sunset: string; }
interface NewsItem { title: string; summary: string; source: string; date: string; isNepali?: boolean; }
interface ActivityLogItem { id: string; type: 'market' | 'advisory'; title: string; description: string; date: Date; status: string; }

const safeParse = <T,>(key: string, fallback: T): T => { try { const val = localStorage.getItem(key); return val ? (JSON.parse(val) as T) : fallback; } catch { return fallback; } };

let globalWeatherCache: WeatherData | null = safeParse('hk_weather_cache', null);
let globalNewsCache: NewsItem[] = safeParse('hk_news_cache', []);
let globalPricesCache: Record<string, { month: string; price: number }[]> | null = safeParse('hk_prices_cache', null);

const agriKeywords = ['agriculture', 'farming', 'crop', 'farmer', 'harvest', 'fertilizer', 'seed', 'pesticide', 'irrigation', 'livestock', 'dairy', 'poultry', 'rice', 'wheat', 'maize', 'vegetable', 'fruit', 'soil', 'organic', 'sustainable', 'agritech', 'food security', 'climate', 'drought', 'monsoon', 'export', 'subsidy', 'कृषि', 'खेती', 'बाली', 'किसान', 'फसल', 'मल', 'बीउ', 'सिंचाई', 'पशुपालन', 'धान', 'गहुँ', 'मकै', 'तरकारी', 'फलफूल'];

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

export const FarmerHome: React.FC = () => {
  const { user, profile, farmerProfile } = useAuth();
  const navigate = useNavigate();
  const carouselRef = useRef<HTMLDivElement>(null);

  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logsLoading, setLogsLoading] = useState(true);
  const [latestAlert, setLatestAlert] = useState<any>(null);

  const [weather, setWeather] = useState<WeatherData | null>(globalWeatherCache);
  const [weatherLoading, setWeatherLoading] = useState(!globalWeatherCache);
  const [news, setNews] = useState<NewsItem[]>(globalNewsCache);
  const [newsLoading, setNewsLoading] = useState(globalNewsCache.length === 0);
  const [cropPriceData, setCropPriceData] = useState(globalPricesCache ?? fallbackCropPriceData);
  const [priceCategory, setPriceCategory] = useState('Vegetables');
  
  const [activeCount, setActiveCount] = useState(0);
  const [requestCount, setRequestCount] = useState(0);
  const [soldCount, setSoldCount] = useState(0);
  const [marketSummaryLoading, setMarketSummaryLoading] = useState(true);

  const safeLocation = useMemo(() => farmerProfile?.district ?? farmerProfile?.municipality ?? 'Kathmandu', [farmerProfile]);
  const greeting = useMemo(() => { const hr = new Date().getHours(); return hr < 12 ? 'Good Morning' : hr < 18 ? 'Good Afternoon' : 'Good Evening'; }, []);
  const displayDate = useMemo(() => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }), []);
  const currentSeasonalCrops = useMemo(() => seasonalCropsCarousel[new Date().getMonth()]?.crops ?? [], []);

  const scrollCarousel = (dir: 'left' | 'right') => carouselRef.current?.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });

  // --- FETCHERS ---
  const fetchLatestAlert = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await (supabase as any).from('notifications').select('*').eq('user_id', user.id).eq('is_read', false).order('created_at', { ascending: false }).limit(1).single();
      if (data) setLatestAlert(data);
    } catch (e) { /* Ignore */ }
  }, [user?.id]);

  const handleDismissAlert = async () => {
    if (!latestAlert) return;
    const alertId = latestAlert.id;
    setLatestAlert(null); 
    try { await (supabase as any).from('notifications').update({ is_read: true }).eq('id', alertId); } catch (e) { console.error('Failed to dismiss alert'); }
  };

  const fetchActivityLogs = useCallback(async (silent = false) => {
    if (!user?.id) return;
    if (!silent) setLogsLoading(true);
    try {
      const { data: products } = await (supabase as any).from('products').select('id, name, status, price, created_at').eq('farmer_id', user.id);
      const { data: issues } = await (supabase as any).from('crop_issues').select('id, crop_name, status, description, created_at').eq('user_id', user.id);
      const combinedLogs: ActivityLogItem[] = [];
      if (products) combinedLogs.push(...products.map((p: any) => ({ id: `prod_${p.id}`, type: 'market' as const, title: `Listed ${p.name}`, description: `Rs. ${p.price}/kg`, status: p.status, date: new Date(p.created_at) })));
      if (issues) combinedLogs.push(...issues.map((i: any) => ({ id: `issue_${i.id}`, type: 'advisory' as const, title: `Reported ${i.crop_name} issue`, description: i.description?.slice(0, 50) + '...', status: i.status, date: new Date(i.created_at) })));
      combinedLogs.sort((a, b) => b.date.getTime() - a.date.getTime());
      setActivityLogs(combinedLogs);
    } catch (e) { console.error('Failed to load activity logs:', e); } finally { if (!silent) setLogsLoading(false); }
  }, [user?.id]);

  const fetchMarketSummary = useCallback(async (silent = false) => {
    if (!user?.id) return;
    if (!silent) setMarketSummaryLoading(true);
    try {
      const { data: products } = await (supabase as any).from('products').select('id, status, purchase_requests ( id, status )').eq('farmer_id', user.id);
      if (products) {
        setActiveCount(products.filter((p: any) => p.status === 'active').length);
        setSoldCount(products.filter((p: any) => p.status === 'sold').length);
        setRequestCount(products.reduce((acc: number, p: any) => acc + (p.purchase_requests?.filter((r: any) => r.status === 'pending').length ?? 0), 0));
      }
    } catch (e) { console.error(e); } finally { if (!silent) setMarketSummaryLoading(false); }
  }, [user?.id]);

  const fetchWeather = useCallback(async (loc: string, force = false) => {
    if (globalWeatherCache && !force) return;
    if (!force) setWeatherLoading(true);
    try {
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${loc}&count=1&language=en&format=json`);
      const geoData = await geoRes.json();
      if (!geoData.results?.length) throw new Error('Location not found');
      const { latitude, longitude, name } = geoData.results[0];
      const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,surface_pressure,weather_code&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto`);
      const wData = await wRes.json();
      const { current, daily } = wData;
      const wmoMap: Record<number, { desc: string; icon: string }> = { 0: { desc: 'Clear sky', icon: '☀️' }, 1: { desc: 'Mainly clear', icon: '🌤️' }, 2: { desc: 'Partly cloudy', icon: '⛅' }, 3: { desc: 'Overcast', icon: '☁️' }, 45: { desc: 'Fog', icon: '🌫️' }, 48: { desc: 'Rime fog', icon: '🌫️' }, 51: { desc: 'Light drizzle', icon: '🌦️' }, 53: { desc: 'Mod. drizzle', icon: '🌦️' }, 61: { desc: 'Slight rain', icon: '🌧️' }, 63: { desc: 'Mod. rain', icon: '🌧️' }, 65: { desc: 'Heavy rain', icon: '🌧️' }, 71: { desc: 'Snow', icon: '❄️' }, 95: { desc: 'Thunderstorm', icon: '⛈️' } };
      const { desc, icon } = wmoMap[current.weather_code] ?? { desc: 'Unknown', icon: '🌡️' };
      const fmt = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
      const newWeather: WeatherData = { location: name, temperature: current.temperature_2m, humidity: current.relative_humidity_2m, wind_speed: current.wind_speed_10m, precipitation: current.precipitation, pressure: current.surface_pressure, high: daily.temperature_2m_max[0], low: daily.temperature_2m_min[0], sunrise: fmt(daily.sunrise[0]), sunset: fmt(daily.sunset[0]), description: desc, icon };
      globalWeatherCache = newWeather; setWeather(newWeather);
    } catch (err) { console.error(err); toast.error('Failed to load weather data'); } finally { if (!force) setWeatherLoading(false); }
  }, []);

  const fetchNews = useCallback(async (force = false) => {
    if (globalNewsCache.length > 0 && !force) return;
    if (!force) setNewsLoading(true);
    try {
      const newsItems: NewsItem[] = [];
      try {
        const nepaliRes = await fetch('https://raw.githubusercontent.com/gaurovgiri/newsapi/master/data/today.json');
        if (nepaliRes.ok) {
          const nepaliData = await nepaliRes.json();
          const nepaliAgri = nepaliData.articles?.filter((a: any) => agriKeywords.some(kw => a.title?.toLowerCase().includes(kw.toLowerCase()) || a.description?.toLowerCase().includes(kw.toLowerCase()))).map((a: any) => ({ title: a.title ?? 'No title', summary: a.description ?? 'No summary', source: a.source?.name ?? 'Nepali News', date: a.publishedAt ? new Date(a.publishedAt).toLocaleDateString('en-GB') : 'आज', isNepali: true })).slice(0, 4) || [];
          newsItems.push(...nepaliAgri);
        }
      } catch (e) { /* Ignore */ }
      try {
        const intlRes = await fetch('https://rss.app/feeds/v1.1/mBZRjwJGUFuNazCU.json');
        if (intlRes.ok) {
          const intlData = await intlRes.json();
          const intlAgri = intlData.items?.map((item: any) => ({ title: item.title ?? 'No title', summary: item.description ? item.description.replace(/<[^>]*>/g, '').slice(0, 150) + '...' : 'No summary', source: 'Agriculture News', date: item.date_published ? new Date(item.date_published).toLocaleDateString('en-GB') : 'Today', isNepali: false })).slice(0, 4) || [];
          newsItems.push(...intlAgri);
        }
      } catch (e) { /* Ignore */ }
      if (newsItems.length === 0) {
        newsItems.push({ title: 'सरकारले रासायनिक मलको अनुदान बढायो', summary: 'कृषि मन्त्रालयले यस वर्ष युरिया र DAP मलमा अनुदानमा वृद्धि गरेको छ।', source: 'कृषि समाचार', date: 'आज', isNepali: true }, { title: 'New Technology Boosts Rice Yields by 30%', summary: 'Researchers develop drought-resistant rice varieties.', source: 'AgriTech Today', date: 'Today', isNepali: false });
      }
      const mixedNews = newsItems.sort(() => Math.random() - 0.5).slice(0, 6);
      globalNewsCache = mixedNews; setNews(mixedNews);
    } catch (error) { /* Ignore */ } finally { if (!force) setNewsLoading(false); }
  }, []);

  const fetchCropPrices = useCallback(async () => {
    if (globalPricesCache) return;
    const simulated: Record<string, { month: string; priceInr: number }[]> = { Vegetables: [{ month: 'Sep', priceInr: 25 }, { month: 'Oct', priceInr: 28 }, { month: 'Nov', priceInr: 32 }, { month: 'Dec', priceInr: 36 }, { month: 'Jan', priceInr: 38 }, { month: 'Feb', priceInr: 34 }], Grains: [{ month: 'Sep', priceInr: 52 }, { month: 'Oct', priceInr: 54 }, { month: 'Nov', priceInr: 58 }, { month: 'Dec', priceInr: 61 }, { month: 'Jan', priceInr: 63 }, { month: 'Feb', priceInr: 62 }], Fruits: [{ month: 'Sep', priceInr: 45 }, { month: 'Oct', priceInr: 42 }, { month: 'Nov', priceInr: 50 }, { month: 'Dec', priceInr: 55 }, { month: 'Jan', priceInr: 48 }, { month: 'Feb', priceInr: 52 }] };
    const converted: Record<string, { month: string; price: number }[]> = {};
    for (const [cat, data] of Object.entries(simulated)) converted[cat] = data.map(d => ({ month: d.month, price: Math.round(d.priceInr * 1.6 * 1.13) }));
    globalPricesCache = converted; setCropPriceData(converted);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([fetchMarketSummary(), fetchActivityLogs(), fetchNews(), fetchCropPrices(), fetchLatestAlert(), safeLocation ? fetchWeather(safeLocation) : Promise.resolve()]);
    const fast = setInterval(() => { fetchMarketSummary(true); fetchActivityLogs(true); fetchLatestAlert(); }, 60_000);
    const slow = setInterval(() => { if (safeLocation) fetchWeather(safeLocation, true); fetchNews(true); }, 600_000);
    return () => { clearInterval(fast); clearInterval(slow); };
  }, [user?.id, safeLocation, fetchMarketSummary, fetchActivityLogs, fetchWeather, fetchNews, fetchCropPrices, fetchLatestAlert]);


  return (
    <div className="min-h-full bg-slate-50/50 pb-20 lg:pb-8">
      
      {/* ── HERO BANNER ── */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 pt-12 pb-32 px-6 shadow-lg relative overflow-hidden">
        {/* Subtle grid pattern for web feel */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-700/50 border border-emerald-600/50 rounded-full text-emerald-50 text-xs font-bold mb-4 uppercase tracking-widest backdrop-blur-sm">
               <Clock size={12} /> {displayDate}
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
              {greeting}, <span className="text-emerald-300">{profile?.full_name?.split(' ')[0] || 'Farmer'}</span>
            </h1>
            <p className="text-emerald-100/80 text-sm md:text-base font-medium mt-2 max-w-xl">
              Welcome back to your digital farm. Here's what's happening today.
            </p>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto mt-4 md:mt-0">
             <Button variant="outline" className="flex-1 md:flex-none h-12 bg-white/10 hover:bg-white/20 border-white/20 text-white font-bold rounded-2xl backdrop-blur-md" onClick={() => setShowLogModal(true)}>
               <History size={18} className="mr-2" /> View Logs
             </Button>
             <button onClick={() => navigate('/farmer/profile')} className="w-12 h-12 rounded-2xl border-2 border-white/20 overflow-hidden bg-white/10 flex items-center justify-center shrink-0 shadow-lg hover:scale-105 transition-transform backdrop-blur-md">
               {profile?.avatar_url ? <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : <User className="w-6 h-6 text-white" />}
             </button>
          </div>
        </div>
      </div>

      {/* ── MAIN DASHBOARD GRID ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-20 relative z-20 space-y-6">

        {/* 🚀 Admin Alert Banner */}
        {latestAlert && (
          <div className="bg-amber-500 text-white rounded-2xl p-4 md:p-5 flex items-start md:items-center gap-4 shadow-xl border border-amber-400 relative overflow-hidden animate-in slide-in-from-top-4">
             <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mt-10 -mr-10"></div>
             <div className="w-12 h-12 rounded-full bg-amber-600/50 flex items-center justify-center shrink-0 shadow-inner">
               <BellRing size={24} className="text-amber-50" />
             </div>
             <div className="flex-1 min-w-0 pr-8">
               <h4 className="font-black text-lg leading-tight">{latestAlert.title}</h4>
               <p className="text-amber-100 text-sm font-medium mt-0.5 line-clamp-2 md:line-clamp-1">{latestAlert.message}</p>
             </div>
             <button onClick={handleDismissAlert} className="absolute top-4 right-4 p-1.5 rounded-full bg-black/10 hover:bg-black/20 text-white transition-colors">
               <X size={16} />
             </button>
          </div>
        )}

        {/* TOP ROW: Summary, Actions, Weather */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Quick Actions (Web Cards) */}
          <div className="space-y-4">
            <Card onClick={() => navigate('/farmer/advisory')} className="border-none shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer bg-gradient-to-br from-red-50 to-orange-50 rounded-3xl overflow-hidden group">
              <CardContent className="p-6 flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform"><AlertTriangle size={28} /></div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">Report Issue</h3>
                  <p className="text-xs font-bold text-red-600 uppercase tracking-widest mt-1">Get Expert Help</p>
                </div>
              </CardContent>
            </Card>
            <Card onClick={() => navigate('/farmer/market')} className="border-none shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl overflow-hidden group">
              <CardContent className="p-6 flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform"><Package size={28} /></div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">Sell Produce</h3>
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-1">List on Market</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Market Summary */}
          <Card className="border-none shadow-lg rounded-3xl bg-white lg:col-span-1">
            <CardHeader className="pb-2">
               <CardTitle className="text-base text-slate-800 flex items-center gap-2"><Store size={18} className="text-indigo-500"/> Digital Market</CardTitle>
               <CardDescription>Your current inventory status.</CardDescription>
            </CardHeader>
            <CardContent>
              {marketSummaryLoading ? (
                <div className="grid grid-cols-2 gap-4"><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-24 rounded-2xl" /></div>
              ) : (
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex flex-col items-center justify-center">
                    <p className="text-3xl font-black text-indigo-600">{activeCount}</p>
                    <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mt-1">Active</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex flex-col items-center justify-center relative">
                    {requestCount > 0 && <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full animate-pulse" />}
                    <p className="text-3xl font-black text-amber-600">{requestCount}</p>
                    <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mt-1">Requests</p>
                  </div>
                  <div className="col-span-2 p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center">
                    <p className="text-2xl font-black text-slate-600">{soldCount}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Total Crops Sold</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Weather Widget (Web Styled) */}
          <Card className="border-none shadow-lg rounded-3xl overflow-hidden bg-white">
            <CardContent className="p-0 h-full flex flex-col">
              {weatherLoading && !weather ? (
                <div className="p-6 space-y-4"><Skeleton className="h-8 w-1/2" /><Skeleton className="h-20 w-full" /><Skeleton className="h-16 w-full" /></div>
              ) : weather ? (
                <>
                  <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-6 text-white flex-1 relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 text-9xl opacity-20 drop-shadow-2xl select-none">{weather.icon}</div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-1.5 text-blue-100 font-bold text-sm uppercase tracking-widest mb-4">
                        <MapPin size={14} /> {weather.location}
                      </div>
                      <div className="flex justify-between items-end">
                        <div>
                          <h2 className="text-6xl font-black tracking-tighter leading-none">
                            {weather.temperature > 0 ? '+' : ''}{Math.round(weather.temperature)}°
                          </h2>
                          <p className="text-blue-100 font-bold text-lg mt-1">{weather.description}</p>
                        </div>
                        <div className="text-right text-blue-100 font-semibold text-sm">
                          <p>H: {Math.round(weather.high)}°</p>
                          <p>L: {Math.round(weather.low)}°</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-5">
                    <div className="grid grid-cols-4 gap-2 text-center divide-x divide-slate-100">
                      <div><Droplets size={16} className="mx-auto text-slate-400 mb-1" /><p className="text-sm font-black text-slate-700">{weather.humidity}%</p></div>
                      <div><Wind size={16} className="mx-auto text-slate-400 mb-1" /><p className="text-sm font-black text-slate-700">{weather.wind_speed}</p></div>
                      <div><Sunrise size={16} className="mx-auto text-amber-400 mb-1" /><p className="text-sm font-black text-slate-700">{weather.sunrise.split(' ')[0]}</p></div>
                      <div><Sunset size={16} className="mx-auto text-orange-500 mb-1" /><p className="text-sm font-black text-slate-700">{weather.sunset.split(' ')[0]}</p></div>
                    </div>
                  </div>
                </>
              ) : <div className="p-6 text-center text-slate-500">Weather unavailable</div>}
            </CardContent>
          </Card>

        </div>

        {/* ── SEASONAL CROP CAROUSEL ── */}
        <div className="pt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><Leaf size={20} className="text-emerald-500" /> Seasonal Suggestions</h3>
            <div className="hidden md:flex gap-2">
              <Button variant="outline" size="icon" className="rounded-full shadow-sm" onClick={() => scrollCarousel('left')}><ChevronLeft size={16} /></Button>
              <Button variant="outline" size="icon" className="rounded-full shadow-sm" onClick={() => scrollCarousel('right')}><ChevronRight size={16} /></Button>
            </div>
          </div>
          <div ref={carouselRef} className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 [&::-webkit-scrollbar]:hidden">
            {currentSeasonalCrops.map((crop: any, idx: number) => (
              <Card key={idx} className="snap-start shrink-0 w-48 rounded-[2rem] border-none shadow-md overflow-hidden bg-white group cursor-pointer">
                <div className="h-32 relative overflow-hidden">
                  <LazyImage src={crop.img} alt={crop.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                  <span className="absolute bottom-3 left-3 text-3xl drop-shadow-xl bg-white/20 backdrop-blur-md p-1 rounded-xl">{crop.emoji}</span>
                </div>
                <CardContent className="p-4 text-center">
                  <p className="text-sm font-black text-slate-800">{crop.name}</p>
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-1">{crop.np}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* BOTTOM ROW: Trends & News */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Market Trends Chart */}
          <Card className="border-none shadow-lg rounded-3xl bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base text-slate-800 flex items-center gap-2"><TrendingUp size={18} className="text-emerald-500" /> Market Trends</CardTitle>
                <CardDescription>Average prices in NPR per kg.</CardDescription>
              </div>
              <Select value={priceCategory} onValueChange={setPriceCategory}>
                <SelectTrigger className="w-[130px] rounded-xl bg-slate-50 border-none font-bold text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.keys(cropPriceData).map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <div className="h-64 mt-4 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={(cropPriceData as any)[priceCategory] ?? []} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: 'none', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', fontSize: '12px', fontWeight: 'bold', color: '#1e293b' }} formatter={(value: number) => [`Rs. ${value}/kg`, priceCategory]} />
                    <Line type="monotone" dataKey="price" stroke="#10b981" strokeWidth={4} dot={{ fill: '#10b981', r: 5, strokeWidth: 3, stroke: '#ffffff' }} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Agri News Feed */}
          <Card className="border-none shadow-lg rounded-3xl bg-white overflow-hidden flex flex-col">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-base text-slate-800 flex items-center gap-2"><Newspaper size={18} className="text-blue-500" /> Agriculture News</CardTitle>
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-slate-200 hover:bg-slate-100" onClick={() => { globalNewsCache = []; fetchNews(true); }}>
                <RefreshCw size={14} className={`text-slate-500 ${newsLoading ? 'animate-spin text-blue-500' : ''}`} />
              </Button>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto max-h-[300px]">
              {newsLoading && news.length === 0 ? (
                <div className="p-6 space-y-6">{[1, 2, 3].map(i => <div key={i} className="space-y-2"><Skeleton className="h-5 w-3/4 rounded-lg" /><Skeleton className="h-4 w-full rounded-lg" /></div>)}</div>
              ) : news.length === 0 ? (
                <p className="text-sm text-slate-400 font-bold text-center py-10">No news available</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {news.map((item, idx) => (
                    <a key={idx} href="#" className="block p-5 hover:bg-slate-50 transition-colors group cursor-default">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <h4 className="text-sm font-black text-slate-800 leading-snug group-hover:text-blue-600 transition-colors">{item.title}</h4>
                          <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">{item.summary}</p>
                        </div>
                        {item.isNepali ? (
                           <span className="shrink-0 bg-green-100 text-green-700 text-[10px] font-black px-2 py-1 rounded-lg">🇳🇵 NP</span>
                        ) : (
                           <span className="shrink-0 bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-1 rounded-lg">🌍 INT</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>{item.source}</span> • <span>{item.date}</span>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>

      {/* ── ACTIVITY LOG DIALOG (Web Styled) ── */}
      <Dialog open={showLogModal} onOpenChange={setShowLogModal}>
        <DialogContent className="max-w-xl rounded-[2rem] p-0 border-none shadow-2xl overflow-hidden bg-slate-50">
          <div className="bg-white p-6 border-b border-slate-100 flex justify-between items-center">
            <DialogTitle className="font-black text-xl text-slate-800 flex items-center gap-2"><History className="text-slate-400"/> Account History</DialogTitle>
            <button onClick={() => setShowLogModal(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full"><X size={16} /></button>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
            {logsLoading && activityLogs.length === 0 ? (
              <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl bg-white" />)}</div>
            ) : activityLogs.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
                <History className="mx-auto text-slate-300 mb-3" size={32} />
                <p className="text-slate-500 font-bold">No activity recorded yet.</p>
              </div>
            ) : activityLogs.map(log => (
              <div key={log.id} className="bg-white rounded-2xl border border-slate-100 p-5 flex gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center shadow-inner ${log.type === 'market' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                  {log.type === 'market' ? <Package size={20} /> : <AlertTriangle size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-black text-slate-800 truncate">{log.title}</p>
                    <Badge variant="outline" className={`text-[10px] uppercase font-black px-2 py-0.5 border-none shrink-0 ${log.status === 'resolved' || log.status === 'sold' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {log.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed mb-3 line-clamp-2">{log.description}</p>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <Clock size={12} />
                    {log.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};