/**
 * StockSaathi AI — 7-Day Dead Stock Recovery Action Planner Page (Phase 8)
 *
 * Full-screen dedicated workspace for executing daily recovery actions,
 * tracking real-time liquidation progress, and protecting retailer margin floors.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarRange,
  Target,
  TrendingUp,
  AlertOctagon,
  CheckCircle2,
  Clock,
  RotateCcw,
  ShieldCheck,
  Package,
  Layers,
  Sparkles,
  ArrowRight,
  Filter,
  Check,
  Ban,
  FileText,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  getActiveRecoveryPlan,
  getRecoverySummary,
  generateRecoveryPlan,
  updateRecoveryActionStatus,
} from '../services/recoveryApi.js';

export default function RecoveryPlanPage({ onNavigate }) {
  const [plan, setPlan] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingActionId, setUpdatingActionId] = useState(null);
  const [error, setError] = useState(null);

  // Filters
  const [selectedDay, setSelectedDay] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Confirmation Modals
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [regeneratePreserve, setRegeneratePreserve] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  const [confirmCompleteAction, setConfirmCompleteAction] = useState(null);
  const [actionNotes, setActionNotes] = useState({});
  const [savingNotesId, setSavingNotesId] = useState(null);

  // Load active plan and summary
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [planRes, summaryRes] = await Promise.all([
        getActiveRecoveryPlan(),
        getRecoverySummary(),
      ]);

      if (planRes.success) setPlan(planRes.data);
      if (summaryRes.success) setSummary(summaryRes.data);
    } catch (err) {
      setError(err.message || 'Failed to connect to recovery planning service');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Action Status Transition
  const handleStatusChange = async (action, newStatus) => {
    if (newStatus === 'completed' && action.status !== 'completed') {
      // Prompt confirmation before marking complete
      setConfirmCompleteAction({ action, newStatus });
      return;
    }

    executeStatusUpdate(action._id, newStatus);
  };

  const executeStatusUpdate = async (actionId, newStatus, notes = null) => {
    setUpdatingActionId(actionId);
    try {
      const payload = { status: newStatus };
      if (notes !== null) {
        payload.notes = notes;
      } else if (actionNotes[actionId] !== undefined) {
        payload.notes = actionNotes[actionId];
      }

      const res = await updateRecoveryActionStatus(actionId, payload);
      if (res.success) {
        // Refresh local plan state
        setPlan((prev) => {
          if (!prev) return prev;
          const updatedActions = prev.actions.map((act) =>
            act._id === actionId ? { ...act, ...res.data } : act
          );
          return { ...prev, actions: updatedActions };
        });

        // Refresh summary
        getRecoverySummary().then((sRes) => {
          if (sRes.success) setSummary(sRes.data);
        });
      }
    } catch (err) {
      alert(`Could not update action: ${err.message}`);
    } finally {
      setUpdatingActionId(null);
      setConfirmCompleteAction(null);
    }
  };

  // Handle Save Note
  const handleSaveNote = async (actionId) => {
    setSavingNotesId(actionId);
    try {
      const noteContent = actionNotes[actionId] ?? '';
      const action = plan.actions.find((a) => a._id === actionId);
      if (!action) return;

      await updateRecoveryActionStatus(actionId, {
        status: action.status,
        notes: noteContent,
      });

      setPlan((prev) => {
        if (!prev) return prev;
        const updated = prev.actions.map((act) =>
          act._id === actionId ? { ...act, notes: noteContent } : act
        );
        return { ...prev, actions: updated };
      });
    } catch (err) {
      alert(`Failed to save note: ${err.message}`);
    } finally {
      setSavingNotesId(null);
    }
  };

  // Handle Plan Regeneration
  const handleConfirmRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await generateRecoveryPlan({
        preserveCompleted: regeneratePreserve,
        forceReset: !regeneratePreserve,
      });
      if (res.success) {
        setPlan(res.data);
        setShowRegenerateModal(false);
        const sRes = await getRecoverySummary();
        if (sRes.success) setSummary(sRes.data);
      }
    } catch (err) {
      alert(`Plan regeneration failed: ${err.message}`);
    } finally {
      setRegenerating(false);
    }
  };

  // Filter actions for display
  const filteredActions = (plan?.actions || []).filter((action) => {
    if (selectedDay !== 'all' && action.day !== Number(selectedDay)) return false;
    if (statusFilter !== 'all' && action.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && action.priority !== priorityFilter) return false;
    return true;
  });

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-screen-2xl mx-auto">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
              Phase 8 • Seven-Day Recovery
            </span>
            <span className="text-xs text-slate-400 font-medium">• Live MongoDB Records</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <CalendarRange className="w-6 h-6 text-purple-600" />
            7-Day Dead Stock Recovery Action Planner
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Deterministic liquidation playbook designed to convert dead inventory into liquid cash while protecting unit price floors.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors flex items-center gap-1.5"
            title="Refresh plan data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowRegenerateModal(true)}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-sm shadow-purple-600/30 transition-all flex items-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Regenerate Schedule
          </button>
        </div>
      </div>

      {/* ── Error Banner ─────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-bold text-rose-900">Service Connectivity Notice</h4>
            <p className="text-xs text-rose-700 mt-0.5">{error}</p>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="px-3 py-1 rounded-md text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Summary KPI Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cost Exposure */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Inventory Cost Exposure</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            ₹{(summary?.totalCostExposure ?? plan?.totalCostExposure ?? 0).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-400">
            Purchase capital tied up in scheduled items
          </p>
        </div>

        {/* Estimated Recovery Value */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Est. Recovery Value</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            ₹{(summary?.estimatedTotalRecoveryValue ?? plan?.estimatedTotalRecoveryValue ?? 0).toLocaleString('en-IN')}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
            <Target className="w-3.5 h-3.5" />
            <span>Target ~{summary?.targetRecoveryRatePercent ?? 78}% cash recovery</span>
          </div>
        </div>

        {/* Progress & Completed Actions */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Action Execution Rate</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {summary?.progressPercentage ?? 0}%
            </span>
            <span className="text-xs text-slate-500">
              ({summary?.completedActions ?? 0} of {summary?.totalActions ?? 7} completed)
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-purple-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, summary?.progressPercentage ?? 0)}%` }}
            />
          </div>
        </div>

        {/* Cash Realized from Completed Actions */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Confirmed Recovered</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            ₹{(summary?.actualRecoveredValue ?? 0).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-400">
            Recovered value from {summary?.completedActions ?? 0} confirmed actions
          </p>
        </div>
      </div>

      {/* ── Filters Bar ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mr-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            Filter By:
          </span>

          {/* Day Filter */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setSelectedDay('all')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                selectedDay === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Days
            </button>
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDay(String(d))}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  selectedDay === String(d)
                    ? 'bg-purple-600 text-white font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                D{d}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="skipped">Skipped</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-900">{filteredActions.length}</span> of{' '}
          {plan?.actions?.length || 7} scheduled items
        </div>
      </div>

      {/* ── Daily Action Items Timeline / List ──────────────────────────────── */}
      {loading ? (
        <div className="bg-white rounded-xl p-12 border border-slate-200 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-700">Loading 7-Day Action Plan...</p>
          <p className="text-xs text-slate-400">Computing profit-safe clearance pricing across inventory records</p>
        </div>
      ) : filteredActions.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-slate-200 text-center space-y-3">
          <CalendarRange className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Action Items Match Selected Filters</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try adjusting your day or status filters, or regenerate the plan with updated inventory parameters.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedDay('all');
              setStatusFilter('all');
              setPriorityFilter('all');
            }}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredActions.map((action) => {
            const isUpdating = updatingActionId === action._id;
            const isCompleted = action.status === 'completed';
            const isInProgress = action.status === 'in_progress';
            const isSkipped = action.status === 'skipped';

            // Priority badge styling
            let priorityBadge = 'bg-slate-100 text-slate-700 border-slate-200';
            if (action.priority === 'critical') {
              priorityBadge = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
            } else if (action.priority === 'high') {
              priorityBadge = 'bg-amber-50 text-amber-700 border-amber-200 font-semibold';
            } else if (action.priority === 'medium') {
              priorityBadge = 'bg-blue-50 text-blue-700 border-blue-200';
            }

            // Planned action date formatted
            const plannedDateStr = action.plannedActionDate
              ? new Date(action.plannedActionDate).toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : `Day ${action.day}`;

            return (
              <div
                key={action._id}
                className={`
                  bg-white rounded-xl border transition-all p-5 shadow-2xs space-y-4
                  ${isCompleted ? 'border-emerald-200/90 bg-emerald-50/20' : 'border-slate-200/90'}
                  ${isSkipped ? 'opacity-70 bg-slate-50/40' : ''}
                `}
              >
                {/* Header Row: Day Pill, Date, Action Title & Status */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`
                        w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 border font-bold
                        ${
                          isCompleted
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : isInProgress
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-900 text-white border-slate-900'
                        }
                      `}
                    >
                      <span className="text-[10px] uppercase tracking-wider font-semibold opacity-80">Day</span>
                      <span className="text-base leading-none font-extrabold">{action.day}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-slate-500">{plannedDateStr}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase border ${priorityBadge}`}>
                          {action.priority} Priority
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200 capitalize">
                          {action.actionType.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-1">{action.title}</h3>
                    </div>
                  </div>

                  {/* Status Pills / Quick Controls */}
                  <div className="flex items-center gap-1.5 self-start shrink-0">
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleStatusChange(action, 'pending')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        action.status === 'pending'
                          ? 'bg-slate-800 text-white font-bold'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Pending
                    </button>
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleStatusChange(action, 'in_progress')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        action.status === 'in_progress'
                          ? 'bg-blue-600 text-white font-bold'
                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                      }`}
                    >
                      In Progress
                    </button>
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleStatusChange(action, 'completed')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                        action.status === 'completed'
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      <Check className="w-3 h-3" />
                      Completed
                    </button>
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleStatusChange(action, 'skipped')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        action.status === 'skipped'
                          ? 'bg-amber-600 text-white font-bold'
                          : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                      }`}
                    >
                      Skip
                    </button>
                  </div>
                </div>

                {/* Instructions & Rationale */}
                <div className="bg-slate-50/80 rounded-lg p-3.5 border border-slate-200/70 space-y-2">
                  <div className="text-xs text-slate-800 leading-relaxed font-medium">
                    <span className="font-bold text-slate-900 mr-1.5">Action Plan:</span>
                    {action.instructions}
                  </div>
                  {action.rationale && (
                    <div className="text-[11px] text-slate-500 leading-relaxed italic">
                      <span className="font-semibold text-slate-600 not-italic mr-1">Strategic Rationale:</span>
                      {action.rationale}
                    </div>
                  )}
                </div>

                {/* Product Snapshot & Financial Safeguards Matrix */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white rounded-lg p-3 border border-slate-200 text-xs">
                  {/* Target Product */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Product</span>
                    <div className="font-bold text-slate-900 truncate" title={action.productName}>
                      {action.productName}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      SKU: {action.sku} • {action.quantity} units
                    </div>
                  </div>

                  {/* Financial Floor Safeguards */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Minimum Safe Price
                    </span>
                    <div className="font-bold text-slate-900">
                      ₹{action.minimumSafePrice.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[11px] text-emerald-700 font-medium">
                      Profit & Margin Protected
                    </div>
                  </div>

                  {/* Clearance Proposal */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Proposed Price
                    </span>
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span>₹{action.proposedSellingPrice.toLocaleString('en-IN')}</span>
                      {action.suggestedDiscountPercent > 0 && (
                        <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 font-semibold text-[10px] border border-purple-200">
                          {action.suggestedDiscountPercent}% off
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Cost: ₹{action.inventoryCostValue.toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Estimated Recovery Cash */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Est. Recovery Cash
                    </span>
                    <div className="font-bold text-emerald-600 text-sm">
                      ₹{action.expectedRecoveryValue.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-slate-400 italic">
                      Conservative absorption estimate
                    </div>
                  </div>
                </div>

                {/* Retailer Notes & Audit Timestamp */}
                <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
                  <div className="flex-1 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Add retailer execution notes (e.g. Sold 5 units via counter display)..."
                      value={actionNotes[action._id] !== undefined ? actionNotes[action._id] : action.notes || ''}
                      onChange={(e) =>
                        setActionNotes({ ...actionNotes, [action._id]: e.target.value })
                      }
                      className="flex-1 text-xs border border-slate-200 rounded-md px-2.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      disabled={savingNotesId === action._id}
                      onClick={() => handleSaveNote(action._id)}
                      className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors shrink-0"
                    >
                      {savingNotesId === action._id ? 'Saving...' : 'Save Note'}
                    </button>
                  </div>

                  {action.completedAt && (
                    <div className="text-[11px] text-emerald-700 font-medium shrink-0 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Completed: {new Date(action.completedAt).toLocaleDateString('en-IN')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Regenerate Confirmation Modal ────────────────────────────────────── */}
      {showRegenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Regenerate Recovery Plan?</h3>
                <p className="text-xs text-slate-500">Recalculate 7-day schedule with current inventory</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200/70">
              The recovery planner will analyze live inventory risk scores and Phase 7 price floors to build an updated schedule.
            </p>

            {/* Preservation Policy Toggle */}
            <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-purple-50/30">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={regeneratePreserve}
                  onChange={(e) => setRegeneratePreserve(e.target.checked)}
                  className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Preserve Completed Actions (Recommended)
                  </span>
                  <span className="text-[11px] text-slate-500 leading-snug block">
                    Keeps confirmed actions and notes intact, updating only pending and future actions with fresh data.
                  </span>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowRegenerateModal(false)}
                disabled={regenerating}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRegenerate}
                disabled={regenerating}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition-all flex items-center gap-1.5"
              >
                {regenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Confirm & Regenerate'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Complete Action Confirmation Modal ──────────────────────────────── */}
      {confirmCompleteAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Mark Action as Completed?</h3>
                <p className="text-xs text-slate-500">Day {confirmCompleteAction.action.day}: {confirmCompleteAction.action.title}</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200/70 space-y-1.5">
              <div>
                <span className="font-semibold text-slate-800">Target Product:</span> {confirmCompleteAction.action.productName}
              </div>
              <div>
                <span className="font-semibold text-slate-800">Est. Cash Unlocked:</span> ₹
                {confirmCompleteAction.action.expectedRecoveryValue.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Optional Execution Note:</label>
              <textarea
                rows={2}
                placeholder="e.g. Executed flash sale; 6 units sold at ₹1,800, remaining stock relocated."
                defaultValue={confirmCompleteAction.action.notes || ''}
                id="complete-note-input"
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmCompleteAction(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const note = document.getElementById('complete-note-input')?.value ?? '';
                  executeStatusUpdate(confirmCompleteAction.action._id, 'completed', note);
                }}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
              >
                Confirm Completion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
