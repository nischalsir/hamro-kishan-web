import React from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { Home, Store, Leaf, User, Bell, Search } from 'lucide-react';
import { FloatingChatbot } from '@/components/FloatingChatbot';
import logo from '@/assets/logo.png';

const tabs = [
  { to: '/farmer',         icon: Home,  label: 'Home',     end: true  },
  { to: '/farmer/market',  icon: Store, label: 'Market',   end: false },
  { to: '/farmer/advisory', icon: Leaf,  label: 'Advisory', end: false },
  { to: '/farmer/profile',  icon: User,  label: 'Profile',  end: false },
];

const FarmerLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      {/* --- WEB TOP NAVIGATION BAR --- */}
      <header className="sticky top-0 z-[100] w-full bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Left: Logo & Brand */}
            <Link to="/farmer" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                <img src={logo} alt="Hamro Kishan" className="w-8 h-8 object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold leading-tight text-slate-900">Hamro Kishan</span>
                <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">हाम्रो किसान</span>
              </div>
            </Link>

            {/* Center: Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {tabs.map((tab) => (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  end={tab.end}
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                      isActive 
                        ? 'bg-primary/10 text-primary' 
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  <tab.icon size={18} />
                  {tab.label}
                </NavLink>
              ))}
            </nav>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative">
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
              
              <div className="h-8 w-[1px] bg-slate-200 mx-1 hidden sm:block"></div>
              
              <Link to="/farmer/profile" className="flex items-center gap-2 p-1 pl-3 rounded-full border border-slate-200 hover:border-primary/30 transition-all bg-slate-50">
                <span className="hidden sm:block text-xs font-bold text-slate-700">Nischal Pandey</span>
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                  NP
                </div>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1">
        {/* max-w-7xl ensures your app doesn't look stretched on huge monitors */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>

      {/* 🤖 AI CHATBOT */}
      <FloatingChatbot />

      {/* --- MOBILE-ONLY BOTTOM NAV --- */}
      {/* This only shows up on screens smaller than 'md' (768px) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center z-[100] pb-safe">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 ${
                isActive ? 'text-primary' : 'text-slate-400'
              }`
            }
          >
            {/* 🟢 THE FIX: Wrap the content in a function to access isActive here too */}
            {({ isActive }) => (
              <>
                <tab.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-bold">{tab.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default FarmerLayout;