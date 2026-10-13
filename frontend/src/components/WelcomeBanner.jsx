import React from 'react';
import { Sparkles, ArrowRight, Zap, TrendingUp } from 'lucide-react';

export default function WelcomeBanner({ onActionClick }) {
  return (
    <div className="bg-slate-900 rounded-xl p-5 sm:p-6 text-white shadow-sm border border-slate-800 relative overflow-hidden">
      {/* Subtle background glow effect matching dark navy theme */}
      <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
        {/* Left greeting and message */}
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-wider">
            <Zap className="w-3 h-3 text-blue-400" />
            AI-Powered Dead Stock Recovery
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Welcome back, Sharma Electronics! 👋
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            You have <strong className="text-emerald-400 font-semibold">₹2,45,000</strong> in potential dead stock recovery across 18 stagnant items. Launch your customized 7-day liquidation plan to recover liquid cash today.
          </p>
        </div>

        {/* Right side promotional recovery badge */}
        <div className="flex-shrink-0 bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs text-blue-400 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Recovery Engine</span>
            </div>
            <div className="text-xl font-bold text-white tracking-tight">
              78% <span className="text-xs text-slate-400 font-normal">Est. Potential</span>
            </div>
            <div className="text-[10px] text-slate-400">
              ₹85,500 Protected Margin
            </div>
          </div>

          <button
            type="button"
            onClick={onActionClick}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-blue-500/20 transition-colors cursor-pointer"
          >
            <span>Execute 7-Day Plan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
