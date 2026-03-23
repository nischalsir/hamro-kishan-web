import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  X, Send, Loader2, ChevronDown, Trash2, Info, Sparkles, MessageSquare 
} from 'lucide-react';
import { chatWithAI, waitForRateLimit } from '@/utils/nvidia-api';
import { toast } from 'sonner';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const STORAGE_KEY = 'hk_ai_chat_history';
const MAX_MESSAGES = 30; // Increased for Web

const loadChatHistory = (): Message[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
};

const saveChatHistory = (messages: Message[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_MESSAGES)));
  } catch (e) { console.error('History Error:', e); }
};

export const FloatingChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>(loadChatHistory());
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(messages.length === 0);
  const [bubbleText, setBubbleText] = useState<string | null>("Namaste! 🙏\nHow may I help you?");

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌨️ WEB: Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // ⏱️ DYNAMIC BUBBLE CYCLE
  useEffect(() => {
    const cycleBubble = () => {
      setBubbleText("Namaste! 🙏\nAsk me about Agriculture!");
      setTimeout(() => {
        setBubbleText("नमस्ते! 🙏\nकृषिको बारेमा मलाई सोध्नुहोस्!");
        setTimeout(() => setBubbleText(null), 6000);
      }, 6000);
    };
    cycleBubble();
    const interval = setInterval(cycleBubble, 35000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  useEffect(() => { saveChatHistory(messages); }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputValue.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setShowWelcome(false);

    try {
      await waitForRateLimit();
      const aiResponse = await chatWithAI(userMessage.content, messages.map(m => ({ role: m.role, content: m.content })));
      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse, timestamp: Date.now() }]);
    } catch (error) {
      toast.error('Connection error. Please try again.');
    } finally { setIsLoading(false); }
  };

  return (
    <>
      {/* --- FLOATING TRIGGER BUTTON --- */}
      {!isOpen && (
        <div className="fixed bottom-8 right-8 z-[110] flex items-center justify-end">
          {bubbleText && (
            <div className="mr-6 relative bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl animate-in fade-in zoom-in slide-in-from-right-4 duration-500 hidden lg:block">
              <p className="whitespace-pre-line leading-relaxed">{bubbleText}</p>
              <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-white/90 dark:bg-slate-900/90 border-r border-t border-slate-200 dark:border-slate-700 rotate-45"></div>
            </div>
          )}

          <button
            onClick={() => setIsOpen(true)}
            className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-full shadow-[0_10px_40px_rgba(16,185,129,0.3)] flex items-center justify-center transition-all active:scale-90 hover:scale-110 group relative border-4 border-white dark:border-slate-800"
          >
            <Sparkles size={28} className="group-hover:rotate-12 transition-transform" />
            {messages.length > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-2 border-white flex items-center justify-center">
                <span className="text-[10px] font-black text-white">!</span>
              </div>
            )}
          </button>
        </div>
      )}

      {/* --- CHAT WINDOW --- */}
      {isOpen && (
        <Card className={`fixed bottom-8 right-8 w-[420px] max-w-[calc(100vw-4rem)] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] z-[120] flex flex-col border-none bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl overflow-hidden transition-all duration-500 ease-in-out ${
          isMinimized ? 'h-16' : 'h-[650px]'
        }`}>
          
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20">
                <MessageSquare size={20} />
              </div>
              <div>
                <p className="font-bold text-sm tracking-tight">Kishan AI Expert</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                  <span className="text-[10px] text-white/80 font-bold uppercase tracking-widest">Active Now</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setIsMinimized(!isMinimized)} className="h-8 w-8 text-white hover:bg-white/10">
                <ChevronDown size={18} className={`transition-transform duration-300 ${isMinimized ? 'rotate-180' : ''}`} />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8 text-white hover:bg-white/10">
                <X size={18} />
              </Button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages Area */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/50 dark:bg-slate-950/20">
                {showWelcome && (
                  <div className="text-center py-10 space-y-4">
                    <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                      <Sparkles size={36} />
                    </div>
                    <div className="px-6">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white">Namaste! Welcome! 🙏</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">I am your dedicated farming expert. Ask me about crop protection, local seeds, or modern irrigation techniques.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-2 px-6 mt-6">
                      {["Best rice varieties for Terai?", "How to cure tomato blight?", "Tomato leaf turning yellow?"].map((q, i) => (
                        <button key={i} onClick={() => { setInputValue(q); setShowWelcome(false); }} className="text-left px-4 py-3 bg-white dark:bg-slate-800 hover:border-emerald-500 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all shadow-sm">
                          🌱 {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-5 py-3.5 shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-emerald-600 text-white rounded-br-none' 
                        : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none'
                    }`}>
                      <p className="text-[14px] leading-relaxed whitespace-pre-line">{msg.content}</p>
                      <p className={`text-[9px] mt-2 font-bold uppercase tracking-widest ${msg.role === 'user' ? 'text-white/60' : 'text-slate-400'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start items-center gap-3">
                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-3 flex items-center gap-3 shadow-sm">
                      <Loader2 size={16} className="animate-spin text-emerald-500" />
                      <span className="text-[13px] font-bold text-slate-500">Expert is typing...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                <div className="flex gap-3 items-center">
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Describe your farming issue..."
                    className="flex-1 min-h-[50px] rounded-2xl bg-slate-100 dark:bg-slate-800 border-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isLoading}
                    className="h-[50px] w-[50px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg transition-all"
                  >
                    <Send size={20} />
                  </Button>
                </div>
                <div className="flex justify-between mt-3 px-1 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                  <div className="flex items-center gap-1"><Info size={12}/> AI can make mistakes.</div>
                  {messages.length > 0 && <button onClick={() => { setMessages([]); localStorage.removeItem(STORAGE_KEY); }} className="hover:text-red-500 transition-colors">Clear Chat</button>}
                </div>
              </div>
            </>
          )}
        </Card>
      )}
    </>
  );
};