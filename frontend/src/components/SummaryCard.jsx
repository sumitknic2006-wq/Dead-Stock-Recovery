import React from 'react';
import { TrendingUp, TrendingDown, AlertCircle, Sparkles } from 'lucide-react';

export default function SummaryCard({
  title,
  value,
  sublabel,
  trend,
  isPositive,
  badgeText,
  badgeType = 'default', // 'success', 'danger', 'info', 'amber'
  icon: Icon,
  iconBg = 'bg-blue-50 text-blue-600',
  isProjection = false,
}) {
  const getBadgeStyle = () => {
    switch (badgeType) {
      case 'danger':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'success':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'amber':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'info':
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow space-y-3">
      {/* Top Header Row with Icon & Badge */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {title}
        </span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      {/* Main Metric Value */}
      <div className="space-y-0.5">
        <div className="text-2xl font-bold tracking-tight text-slate-900">
          {value}
        </div>
        {sublabel && (
          <div className="text-xs text-slate-500 font-medium">
            {sublabel}
          </div>
        )}
      </div>

      {/* Bottom Trend / Projection Row */}
      <div className="pt-1 flex items-center justify-between border-t border-slate-100 text-xs">
        {trend && (
          <div className={`flex items-center gap-1 font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
            {isPositive ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            <span>{trend}</span>
          </div>
        )}

        {badgeText && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getBadgeStyle()}`}>
            {isProjection && <Sparkles className="w-2.5 h-2.5" />}
            {badgeText}
          </span>
        )}
      </div>
    </div>
  );
}
