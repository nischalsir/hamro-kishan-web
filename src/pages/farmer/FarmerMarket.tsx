// ═══════════════════════════════════════════════════════════════════════════
// FARMER MARKET PAGE (Web Optimized)
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types';
import { productCategories } from '@/data/mock';
import {
  Plus, Package, Leaf, User, CheckCircle, Clock, ThumbsDown, Phone, X, Store, Inbox, Search, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

// --- COMPRESS IMAGE UTILITY ---
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
    <div className="relative w-full h-full bg-slate-100 overflow-hidden rounded-t-xl">
      {!loaded && !errored && <div className="absolute inset-0 bg-slate-200 animate-pulse" />}
      <img
        src={errored ? fallback : src}
        alt={alt}
        loading={isLocal ? "eager" : "lazy"}
        decoding={isLocal ? "auto" : "async"}
        onLoad={() => setLoaded(true)}
        onError={() => { setErrored(true); setLoaded(true); }}
        className={`${className} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
};

export const FarmerMarket: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<'crops' | 'requests'>('crops');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // New Product State
  const [newProductName, setNewProductName] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductQty, setNewProductQty] = useState('');
  const [newProductDesc, setNewProductDesc] = useState('');
  const [productFile, setProductFile] = useState<File | null>(null);
  const [submittingProduct, setSubmittingProduct] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [requestFilter, setRequestFilter] = useState<'all' | 'pending' | 'accepted' | 'completed' | 'rejected'>('all');
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [farmerResponse, setFarmerResponse] = useState('');
  const [respondingToRequest, setRespondingToRequest] = useState(false);

  const fetchProducts = useCallback(async (silent = false) => {
    if (!user?.id) return;
    if (!silent) setProductsLoading(true);
    try {
      const { data, error } = await (supabase as any).from('products').select('*').eq('farmer_id', user.id).order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      setMyProducts(data ?? []);
    } catch (e) { console.error(e); }
    finally { if (!silent) setProductsLoading(false); }
  }, [user?.id]);

  const fetchRequests = useCallback(async (silent = false) => {
    if (!user?.id) return;
    if (!silent) setRequestsLoading(true);
    try {
      const { data: productData } = await (supabase as any).from('products').select('id').eq('farmer_id', user.id);
      const productIds: string[] = (productData ?? []).map((p: any) => p.id);
      if (!productIds.length) { setRequests([]); setRequestsLoading(false); return; }

      const { data, error } = await (supabase as any).from('purchase_requests').select(`*, product:products(id, name, price, photo_url), buyer:profiles!buyer_id(id, full_name, phone_number, buyer_profile:buyer_profiles(business_name, province, district, municipality))`).in('product_id', productIds).order('created_at', { ascending: false });
      if (error) throw error;
      setRequests(data ?? []);
    } catch (e) { console.error(e); }
    finally { if (!silent) setRequestsLoading(false); }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([fetchProducts(), fetchRequests()]);
    const interval = setInterval(() => { fetchProducts(true); fetchRequests(true); }, 60_000);
    return () => clearInterval(interval);
  }, [user?.id, fetchProducts, fetchRequests]);

  const handleAddProduct = async () => {
    if (!user?.id) return;
    if (!newProductName || !newProductCategory || !newProductPrice) { toast.error('Please fill required fields'); return; }
    setSubmittingProduct(true);
    setUploadProgress(0);
    let photoUrl: string | null = null;
    try {
      if (productFile) {
        const progressInterval = setInterval(() => setUploadProgress(p => Math.min(p + 15, 90)), 300);
        const compressed = await compressImage(productFile);
        const ext = compressed.type.split('/')[1] ?? 'jpg';
        const fileName = `${user.id}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('product_images').upload(`products/${fileName}`, compressed);
        clearInterval(progressInterval);
        setUploadProgress(100);
        if (upErr) throw upErr;
        photoUrl = supabase.storage.from('product_images').getPublicUrl(`products/${fileName}`).data.publicUrl;
      }
      await (supabase as any).from('products').insert([{ farmer_id: user.id, name: newProductName, category: newProductCategory, price: parseFloat(newProductPrice), quantity: newProductQty, description: newProductDesc, photo_url: photoUrl }]);
      toast.success('Product listed successfully');
      setShowAddDialog(false);
      fetchProducts();
    } catch (e) { toast.error('Failed to add product'); }
    finally {
      setSubmittingProduct(false); setNewProductName(''); setNewProductCategory(''); setNewProductPrice('');
      setNewProductQty(''); setNewProductDesc(''); setProductFile(null); setTimeout(() => setUploadProgress(0), 500);
    }
  };

  const handleAcceptRequest = async () => {
    if (!selectedRequest) return;
    setRespondingToRequest(true);
    try {
      await (supabase as any).from('purchase_requests').update({ status: 'accepted', responded_at: new Date().toISOString(), farmer_response: farmerResponse || 'Request accepted. Please contact me to arrange pickup.' }).eq('id', selectedRequest.id);
      toast.success('Request accepted! Buyer can now see your contact details.');
      setSelectedRequest(null); setFarmerResponse(''); fetchRequests();
    } catch (e) { toast.error('Failed to accept request'); } 
    finally { setRespondingToRequest(false); }
  };

  const handleRejectRequest = async (reason?: string) => {
    if (!selectedRequest) return;
    setRespondingToRequest(true);
    try {
      await (supabase as any).from('purchase_requests').update({ status: 'rejected', responded_at: new Date().toISOString(), farmer_response: reason || 'Request rejected.' }).eq('id', selectedRequest.id);
      toast.success('Request rejected.');
      setSelectedRequest(null); setFarmerResponse(''); fetchRequests();
    } catch (e) { toast.error('Failed to reject request'); } 
    finally { setRespondingToRequest(false); }
  };

  const handleCompleteOrder = async (requestId: string) => {
    try {
      const { data: request } = await (supabase as any).from('purchase_requests').select('product_id').eq('id', requestId).single();
      if (!request) return toast.error('Request not found');
      await (supabase as any).from('purchase_requests').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', requestId);
      await (supabase as any).from('products').update({ status: 'sold' }).eq('id', request.product_id).eq('farmer_id', user!.id);
      toast.success('Order completed! Your product is marked as sold.');
      fetchRequests(); fetchProducts();
    } catch (e) { toast.error('Failed to complete order.'); }
  };

  const filteredProducts = myProducts.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredRequests = requests.filter(r => requestFilter === 'all' || r.status === requestFilter);
  
  const requestCounts = {
    pending: requests.filter(r => r.status === 'pending').length,
    accepted: requests.filter(r => r.status === 'accepted').length,
    completed: requests.filter(r => r.status === 'completed').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  return (
    <div className="min-h-full bg-slate-50/50 pb-20 lg:pb-8 flex flex-col md:flex-row gap-6">
      
      {/* ── WEB SIDEBAR (Tabs & Filters) ── */}
      <div className="w-full md:w-64 lg:w-72 shrink-0 space-y-6">
        
        {/* Header Block */}
        <div className="bg-gradient-to-br from-emerald-700 to-teal-800 p-6 rounded-3xl shadow-lg text-white">
          <h1 className="text-3xl font-black tracking-tight">Market</h1>
          <p className="text-emerald-100/80 text-sm font-bold mt-1 uppercase tracking-widest">बजार व्यवस्थापन</p>
        </div>

        {/* Desktop Navigation */}
        <Card className="rounded-3xl shadow-sm border-none bg-white overflow-hidden hidden md:block">
          <div className="p-2 flex flex-col gap-1">
            <button onClick={() => setTab('crops')} className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-2xl font-bold transition-all ${tab === 'crops' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'}`}>
              <Store size={20} className={tab === 'crops' ? 'text-emerald-500' : 'text-slate-400'} />
              My Crops Inventory
            </button>
            <button onClick={() => setTab('requests')} className={`flex items-center justify-between w-full text-left px-4 py-3 rounded-2xl font-bold transition-all ${tab === 'requests' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <Inbox size={20} className={tab === 'requests' ? 'text-emerald-500' : 'text-slate-400'} />
                Buy Requests
              </div>
              {requestCounts.pending > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{requestCounts.pending} New</span>
              )}
            </button>
          </div>
        </Card>

        {/* Mobile Navigation (Pill Selector) */}
        <div className="md:hidden flex gap-2 bg-white p-2 rounded-2xl shadow-sm">
            <button onClick={() => setTab('crops')} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${tab === 'crops' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500'}`}>My Crops</button>
            <button onClick={() => setTab('requests')} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all relative ${tab === 'requests' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500'}`}>
              Buy Requests
              {requestCounts.pending > 0 && <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full" />}
            </button>
        </div>

        {/* Filters (Only visible when on specific tabs) */}
        {tab === 'requests' && (
           <Card className="rounded-3xl shadow-sm border-none bg-white p-4">
             <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Filter size={14}/> Filter Status</Label>
             <div className="flex flex-col gap-1">
               {([['all', 'All Requests'], ['pending', `Pending (${requestCounts.pending})`], ['accepted', `Accepted (${requestCounts.accepted})`], ['completed', `Completed (${requestCounts.completed})`], ['rejected', `Rejected (${requestCounts.rejected})`]] as const).map(([status, label]) => (
                 <button key={status} onClick={() => setRequestFilter(status as any)} className={`text-left px-3 py-2 rounded-xl text-sm font-bold transition-all ${requestFilter === status ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                   {label}
                 </button>
               ))}
             </div>
           </Card>
        )}
      </div>

      {/* ── WEB MAIN CONTENT AREA ── */}
      <div className="flex-1 space-y-6">
        
        {/* --- CROPS TAB --- */}
        {tab === 'crops' && (
          <>
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-center bg-white p-4 rounded-3xl shadow-sm">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search your crops..." className="pl-10 h-12 bg-slate-50 border-none rounded-2xl w-full" />
              </div>
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto h-12 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-200">
                    <Plus size={18} className="mr-2" /> Add New Crop
                  </Button>
                </DialogTrigger>
                {/* Desktop Dialog Content */}
                <DialogContent className="max-w-md rounded-[2rem] p-8 border-none shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                    <DialogTitle className="text-2xl font-black text-slate-800">Add Product</DialogTitle>
                    <button onClick={() => setShowAddDialog(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full"><X size={16} /></button>
                  </div>
                  <div className="space-y-5">
                    <div><Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Product Name *</Label><Input value={newProductName} onChange={e => setNewProductName(e.target.value)} placeholder="e.g. Organic Tomatoes" className="mt-1.5 h-12 rounded-xl bg-slate-50 border-none" /></div>
                    <div>
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Category *</Label>
                      <Select value={newProductCategory} onValueChange={setNewProductCategory}>
                        <SelectTrigger className="mt-1.5 h-12 rounded-xl bg-slate-50 border-none"><SelectValue placeholder="Select Category" /></SelectTrigger>
                        <SelectContent>{productCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Price (Rs/kg) *</Label><Input value={newProductPrice} onChange={e => setNewProductPrice(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="80" className="mt-1.5 h-12 rounded-xl bg-slate-50 border-none" /></div>
                      <div><Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Qty (kg)</Label><Input value={newProductQty} onChange={e => setNewProductQty(e.target.value.replace(/\D/g, ''))} placeholder="50" className="mt-1.5 h-12 rounded-xl bg-slate-50 border-none" /></div>
                    </div>
                    <div><Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Upload Photo</Label><Input type="file" accept="image/*" onChange={e => setProductFile(e.target.files?.[0] ?? null)} className="mt-1.5 h-12 pt-3 rounded-xl bg-slate-50 border-none cursor-pointer" /></div>
                    <div><Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Description</Label><Textarea value={newProductDesc} onChange={e => setNewProductDesc(e.target.value)} placeholder="Describe condition, variety, etc." className="mt-1.5 resize-none h-24 rounded-xl bg-slate-50 border-none p-3" /></div>
                    {submittingProduct && <Progress value={uploadProgress} className="w-full h-2 bg-slate-100 [&>div]:bg-emerald-500" />}
                    <Button disabled={submittingProduct} className="w-full h-14 text-lg font-black shadow-lg rounded-2xl bg-slate-900 hover:bg-slate-800 text-white mt-4" onClick={handleAddProduct}>
                      {submittingProduct ? 'Posting Product...' : 'List on Market'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Products Web Grid */}
            {productsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"><Skeleton className="h-64 rounded-3xl" /><Skeleton className="h-64 rounded-3xl" /></div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-slate-100">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4"><Package className="text-slate-300" size={32} /></div>
                <h3 className="text-lg font-bold text-slate-700">No crops found</h3>
                <p className="text-slate-500 mt-1">Add a new crop to start selling on the market.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 pb-12">
                {filteredProducts.map(product => (
                  <Card key={product.id} className={`border-none shadow-md overflow-hidden rounded-[2rem] bg-white group hover:shadow-xl transition-all ${product.status === 'sold' ? 'opacity-70 grayscale-[50%]' : ''}`}>
                    <div className="h-48 bg-slate-100 relative overflow-hidden">
                      {product.photo_url 
                        ? <LazyImage src={product.photo_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        : <div className="w-full h-full flex items-center justify-center bg-emerald-50"><Leaf className="text-emerald-200" size={48} /></div>}
                      
                      {/* Web Badges */}
                      <div className="absolute top-4 left-4 flex gap-2">
                         <span className="bg-white/90 backdrop-blur-sm text-slate-800 text-[10px] font-black uppercase px-3 py-1.5 rounded-full shadow-sm">{product.category}</span>
                      </div>
                      
                      {product.status === 'sold' && (
                        <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center backdrop-blur-[2px]">
                          <span className="bg-red-500 text-white text-sm font-black uppercase tracking-widest px-4 py-2 rounded-xl shadow-2xl transform -rotate-6 border border-red-400/50">Sold Out</span>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-black text-lg text-slate-800 line-clamp-1">{product.name}</h3>
                        <Badge variant={product.status === 'active' ? 'default' : 'secondary'} className={`text-[10px] uppercase shadow-sm ${product.status === 'active' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : ''}`}>{product.status}</Badge>
                      </div>
                      <p className="text-sm text-slate-500 line-clamp-2 min-h-[40px]">{product.description || 'No description provided.'}</p>
                      
                      <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-end">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Stock</p>
                          <p className="font-bold text-slate-700">{product.quantity ? `${product.quantity} kg` : 'N/A'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Price</p>
                          <p className={`font-black text-xl ${product.status === 'sold' ? 'text-slate-500' : 'text-emerald-600'}`}>Rs. {product.price}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* --- BUY REQUESTS TAB --- */}
        {tab === 'requests' && (
          <div className="space-y-4 pb-12">
            {requestsLoading ? (
              <div className="space-y-4"><Skeleton className="h-32 rounded-3xl" /><Skeleton className="h-32 rounded-3xl" /></div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-slate-100">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4"><Inbox className="text-slate-300" size={32} /></div>
                <h3 className="text-lg font-bold text-slate-700">No requests here</h3>
                <p className="text-slate-500 mt-1">When buyers want your crops, their requests will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredRequests.map(req => {
                  const isPending = req.status === 'pending';
                  const isAccepted = req.status === 'accepted';
                  const isCompleted = req.status === 'completed';
                  const isRejected = req.status === 'rejected';
                  const buyerData = Array.isArray(req.buyer) ? req.buyer[0] : req.buyer;

                  return (
                    <Card key={req.id} className={`rounded-3xl shadow-sm border border-slate-100 bg-white hover:shadow-md transition-shadow ${isCompleted ? 'bg-slate-50/50' : ''}`}>
                      <CardContent className="p-6">
                        <div className="flex gap-5">
                          {/* Left: Product Thumbnail */}
                          <div className="w-24 h-24 bg-slate-100 rounded-2xl overflow-hidden shrink-0 border border-slate-200">
                            {req.product?.photo_url ? <img src={req.product.photo_url} alt="Crop" className="w-full h-full object-cover" /> : <Package className="m-8 text-slate-300" />}
                          </div>

                          {/* Right: Request Details */}
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-black text-slate-800 line-clamp-1">{req.product?.name}</h4>
                                  <p className="text-sm font-bold text-emerald-600 mt-1">{req.quantity_requested}kg @ Rs.{req.proposed_price}/kg</p>
                                </div>
                                <Badge variant="outline" className={`text-[10px] uppercase font-black px-2 py-1 border-none ${isPending ? 'bg-amber-100 text-amber-700' : isAccepted ? 'bg-blue-100 text-blue-700' : isCompleted ? 'bg-slate-200 text-slate-600' : 'bg-red-100 text-red-700'}`}>
                                  {req.status}
                                </Badge>
                              </div>
                              
                              {/* Buyer Info Card inside Request */}
                              <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500"><User size={14} /></div>
                                <div>
                                  <p className="text-xs font-bold text-slate-700">{buyerData?.full_name}</p>
                                  {(isAccepted || isCompleted) ? (
                                    <a href={`tel:${buyerData?.phone_number}`} className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1 mt-0.5"><Phone size={10} />{buyerData?.phone_number}</a>
                                  ) : (
                                    <p className="text-[10px] text-slate-400 mt-0.5 italic">Contact hidden until accepted</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-5 pt-5 border-t border-slate-100 flex gap-3">
                          {isPending && (
                            <>
                              <Button onClick={() => { setSelectedRequest(req); setFarmerResponse(''); }} className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm">Accept Offer</Button>
                              <Button variant="outline" onClick={() => { setSelectedRequest(req); setFarmerResponse(''); }} className="h-10 text-red-600 border-red-200 hover:bg-red-50 rounded-xl">Reject</Button>
                            </>
                          )}
                          {isAccepted && (
                            <Button onClick={() => handleCompleteOrder(req.id)} className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-sm">
                              <CheckCircle size={16} className="mr-2" /> Mark as Completed & Sold
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── ACTION DIALOG (For Accepting/Rejecting Requests) ── */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-md rounded-[2rem] p-8 border-none shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <DialogTitle className="text-xl font-black text-slate-800">Respond to Buyer</DialogTitle>
            <button onClick={() => setSelectedRequest(null)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full"><X size={16} /></button>
          </div>

          {selectedRequest && (
            <div className="space-y-6">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Offer Summary</p>
                <p className="font-black text-lg text-slate-800">{selectedRequest.product?.name}</p>
                <p className="text-sm font-bold text-emerald-600 mt-1">{selectedRequest.quantity_requested}kg at Rs.{selectedRequest.proposed_price}/kg</p>
                {selectedRequest.buyer_message && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <p className="text-xs italic text-slate-600">"{selectedRequest.buyer_message}"</p>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Message to Buyer (Optional)</Label>
                <Textarea
                  value={farmerResponse}
                  onChange={(e) => setFarmerResponse(e.target.value)}
                  placeholder="e.g., You can pick it up tomorrow morning."
                  className="mt-1.5 resize-none h-24 rounded-xl bg-slate-50 border-none p-4"
                  maxLength={200}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button onClick={handleAcceptRequest} disabled={respondingToRequest} className="h-14 font-black rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg">
                  {respondingToRequest ? 'Processing...' : 'Accept Offer'}
                </Button>
                <Button variant="outline" onClick={() => handleRejectRequest(farmerResponse)} disabled={respondingToRequest} className="h-14 font-black rounded-2xl text-red-600 border-red-200 hover:bg-red-50">
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};