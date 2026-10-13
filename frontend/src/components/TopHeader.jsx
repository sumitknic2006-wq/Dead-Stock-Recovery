import React from 'react';
import { Search, Bell, Globe, Menu, ShieldCheck, Database, AlertTriangle, LogOut } from 'lucide-react';

export default function TopHeader({ 
  onToggleMobile, 
  language, 
  onToggleLanguage, 
  apiHealth,
  merchant,
  onLogout,
}) {
  const displayName = merchant?.name || 'Retailer';
  const displayStore = merchant?.businessName || merchant?.email || 'StockSaathi Kirana';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'MK';

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 shadow-2xs">
      {/* Left: Mobile Toggle & Global Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          type="button"
          onClick={onToggleMobile}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 lg:hidden cursor-pointer"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Input */}
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search products, dead stock SKU, categories..."
            className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs text-slate-800 placeholder-slate-400 pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Right: Language Selector, System Health, Notifications, User */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Language Switcher */}
        <button
          type="button"
          onClick={onToggleLanguage}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          title="Change display language"
        >
          <Globe className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">{language === 'en' ? 'English (EN)' : 'हिंदी (HI)'}</span>
          <span className="sm:hidden font-bold">{language === 'en' ? 'EN' : 'HI'}</span>
        </button>

        {/* System & DB Status Pill (Preserving Phase 2 & 3 Health Visibility) */}
        {apiHealth && (
          <div 
            className={`hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
              apiHealth.status === 'ok' && apiHealth.database?.status === 'connected'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
            title={`Backend: ${apiHealth.status} | DB: ${apiHealth.database?.status || 'not_configured'}`}
          >
            <Database className="w-3 h-3" />
            <span>
              {apiHealth.database?.status === 'connected' ? 'DB Connected' : 'DB Offline'}
            </span>
          </div>
        )}

        {/* Notifications Bell with unread dot */}
        <div className="relative">
          <button 
            type="button" 
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors relative cursor-pointer"
            title="Notifications (18 items need clearance)"
          >
            <Bell className="w-4 h-4 text-slate-600" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
          </button>
        </div>

        {/* User Avatar & Store Info */}
        <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-semibold text-xs flex items-center justify-center ring-2 ring-blue-100 shadow-xs">
            {initials}
          </div>
          <div className="hidden sm:block text-left">
            <span className="text-xs font-semibold text-slate-800 block leading-tight">{displayName}</span>
            <span className="text-[10px] text-slate-400 font-medium block truncate max-w-[130px]">{displayStore}</span>
          </div>

          {/* Logout Action */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors ml-1 cursor-pointer"
              title="Log out of merchant account"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
