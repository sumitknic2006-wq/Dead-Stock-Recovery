import React, { useState } from 'react';
import { Upload, Sparkles, CalendarRange, MessageSquare, ChevronRight, CheckCircle2 } from 'lucide-react';

export default function QuickActions({ onSelectAction }) {
  const [activeToast, setActiveToast] = useState(null);

  const triggerAction = (title, description) => {
    setActiveToast(`${title}: Action initiated in preview mode.`);
    setTimeout(() => setActiveToast(null), 3000);
    if (onSelectAction) onSelectAction(title);
  };

  const actions = [
    {
      id: 'upload',
      title: 'Upload Inventory (CSV)',
      desc: 'Bulk import products and stock numbers',
      icon: Upload,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      id: 'analyze',
      title: 'Run AI Dead Stock Analysis',
      desc: 'Scan velocity and identify holding losses',
      icon: Sparkles,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      id: 'plan',
      title: 'Generate 7-Day Recovery Plan',
      desc: 'Automated step-by-step cash recovery blueprint',
      icon: CalendarRange,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      id: 'whatsapp',
      title: 'Create WhatsApp Offers',
      desc: 'Ready-to-broadcast discounts for VIP customers',
      icon: MessageSquare,
      color: 'bg-green-50 text-green-600',
    },
  ];

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-2xs space-y-3.5">
      <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Quick Actions
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Key operations to accelerate dead stock recovery
          </p>
        </div>
      </div>

      {/* Toast Notice */}
      {activeToast && (
        <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span>{activeToast}</span>
        </div>
      )}

      {/* Action Rows */}
      <div className="space-y-2">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.id}
              type="button"
              onClick={() => triggerAction(act.title, act.desc)}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-slate-50/80 transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${act.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                    {act.title}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {act.desc}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
