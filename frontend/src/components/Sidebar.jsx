import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  AlertOctagon, 
  Percent, 
  CalendarRange, 
  MessageSquare, 
  BarChart3, 
  Settings, 
  Sparkles, 
  TrendingUp, 
  X 
} from 'lucide-react';

export default function Sidebar({ activeTab, onSelectTab, mobileOpen, onCloseMobile }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'dead-stock', label: 'Dead Stock Analysis', icon: AlertOctagon },
    { id: 'discount-calculator', label: 'Discount Calculator', icon: Percent },
    { id: 'recovery-plan', label: '7-Day Recovery Plan', icon: CalendarRange },
    { id: 'whatsapp-offers', label: 'WhatsApp Offers', icon: MessageSquare },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/70 z-40 lg:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-blue-500/20">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-white text-base tracking-tight block">StockSaathi AI</span>
              <span className="text-[10px] text-blue-400 font-medium tracking-wide uppercase">Retail Cash Recovery</span>
            </div>
          </div>
          {/* Close button on mobile */}
          <button 
            type="button" 
            onClick={onCloseMobile} 
            className="p-1 rounded-lg text-slate-400 hover:text-white lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto py-5 px-3 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Main Menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all text-left
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-semibold' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}
                `}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
                {item.id === 'dead-stock' && (
                  <span className="ml-auto px-1.5 py-0.5 text-[10px] rounded-full bg-red-500/20 text-red-300 font-bold border border-red-500/30">
                    174
                  </span>
                )}
                {item.id === 'recovery-plan' && (
                  <span className="ml-auto px-1.5 py-0.5 text-[10px] rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    7d
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Promotional AI Panel (Bottom of Sidebar) */}
        <div className="p-3 m-3 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/70 rounded-xl">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-6 h-6 rounded-md bg-blue-500/20 flex items-center justify-center text-blue-400">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <span className="text-xs font-semibold text-white">StockSaathi Pro</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
            AI-driven dead stock liquidation recommendations tailored for Indian retail stores.
          </p>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 text-[10px] text-blue-300 flex items-center justify-between font-mono">
            <span>Recovery Rate:</span>
            <span className="font-bold text-white">78.4%</span>
          </div>
        </div>

        {/* User Mini Profile in Sidebar */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold text-xs ring-1 ring-slate-700">
            RS
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white truncate">Rajesh Store</div>
            <div className="text-[10px] text-slate-400 truncate">Store Owner • Jaipur</div>
          </div>
        </div>
      </aside>
    </>
  );
}
