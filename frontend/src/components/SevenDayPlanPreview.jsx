import React, { useState, useEffect } from 'react';
import { CalendarRange, ArrowRight, Zap, Target, CheckCircle2 } from 'lucide-react';
import { sevenDayPlan as fixturePlan } from '../utils/dashboardFixtures.js';
import { getActiveRecoveryPlan, getRecoverySummary } from '../services/recoveryApi.js';

export default function SevenDayPlanPreview({ onNavigate }) {
  const [livePlan, setLivePlan] = useState(null);
  const [liveSummary, setLiveSummary] = useState(null);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      getActiveRecoveryPlan().catch(() => null),
      getRecoverySummary().catch(() => null),
    ]).then(([planRes, summaryRes]) => {
      if (!isMounted) return;
      if (planRes?.success && planRes.data?.actions?.length === 7) {
        setLivePlan(planRes.data);
      }
      if (summaryRes?.success) {
        setLiveSummary(summaryRes.data);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Merge fixture visual styles with live action data
  const displayedSteps = fixturePlan.map((fixture, idx) => {
    const liveAction = livePlan?.actions?.[idx];
    if (!liveAction) return fixture;

    return {
      ...fixture,
      day: liveAction.day,
      title: liveAction.title.replace(/^Day \d+:\s*/, ''),
      description: `${liveAction.productName} • ₹${liveAction.proposedSellingPrice.toLocaleString('en-IN')}${
        liveAction.suggestedDiscountPercent > 0 ? ` (${liveAction.suggestedDiscountPercent}% off)` : ''
      }`,
      target:
        liveAction.status === 'completed'
          ? 'Done'
          : liveAction.status === 'in_progress'
          ? 'Active'
          : fixture.target,
      status: liveAction.status,
    };
  });

  const recoveryRate = liveSummary?.targetRecoveryRatePercent ?? 78;

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-purple-600" />
            7-Day Cash Recovery Action Plan
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Step-by-step liquidation sequence engineered to clear dead stock without eroding margin
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Target className="w-3.5 h-3.5" />
            <span>{recoveryRate}% Recovery Target</span>
          </div>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('recovery-plan')}
              className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-purple-50"
            >
              <span>Manage Plan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Cards Sequence with Connecting Arrows */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {displayedSteps.map((step, idx) => (
          <div
            key={step.day}
            onClick={() => onNavigate?.('recovery-plan')}
            className={`
              relative rounded-xl p-3.5 border transition-all flex flex-col justify-between space-y-2.5 cursor-pointer hover:shadow-xs hover:border-purple-300
              ${step.bgLight}
            `}
          >
            {/* Top Row: Day Pill & Target */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/80 shadow-2xs">
                Day {step.day}
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${step.badgeBg}`}>
                {step.target}
              </span>
            </div>

            {/* Title & Description */}
            <div className="space-y-1">
              <h4 className="text-xs font-bold leading-tight">
                {step.title}
              </h4>
              <p className="text-[11px] opacity-80 leading-snug line-clamp-2" title={step.description}>
                {step.description}
              </p>
            </div>

            {/* Small Indicator */}
            <div className="pt-1 flex items-center justify-between text-[10px] font-medium opacity-70">
              <span className="flex items-center gap-1">
                {step.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                Step 0{step.day}
              </span>
              {idx < displayedSteps.length - 1 && (
                <ArrowRight className="w-3 h-3 hidden lg:block" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
