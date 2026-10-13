import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  ArrowUpRight,
  Headphones,
  Watch,
  Keyboard,
  BatteryCharging,
  Laptop,
  Music,
  CheckCircle2,
} from 'lucide-react';
import { fetchDeadStockSummary } from '../services/analysisApi.js';

// Helper icon selector based on category/name
const getProductIcon = (name = '') => {
  if (name.includes('Headphones') || name.includes('Earbuds')) return Headphones;
  if (name.includes('Fitness') || name.includes('Watch') || name.includes('Band')) return Watch;
  if (name.includes('Keyboard')) return Keyboard;
  if (name.includes('Charger') || name.includes('Power')) return BatteryCharging;
  if (name.includes('Laptop') || name.includes('Stand')) return Laptop;
  return Music;
};

export default function DeadStockTable({ onSelectProduct }) {
  const [items, setItems] = useState([]);
  const [totalDeadCount, setTotalDeadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetchDeadStockSummary()
      .then((res) => {
        if (!isMounted) return;
        const summary = res.data.summary;
        const topItems = res.data.topPriorityItems || [];
        const count =
          (summary?.classifications?.critical_dead_stock?.count || 0) +
          (summary?.classifications?.at_risk?.count || 0);

        setItems(topItems);
        setTotalDeadCount(count);
      })
      .catch(() => {
        // Fallback gracefully without throwing
        if (isMounted) setItems([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'Critical':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'High':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Low':
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
      {/* Table Header Row */}
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-red-500" />
            Dead Stock Priority Analysis
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Top stagnant inventory items ranked by holding cost and liquidation urgency
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">
            Total Dead Stock Items:{' '}
            <strong className="text-slate-800">
              {isLoading ? '…' : totalDeadCount}
            </strong>
          </span>
        </div>
      </div>

      {/* Selected Action Modal/Alert */}
      {selectedItem && (
        <div className="bg-blue-50 border-b border-blue-100 px-5 py-2.5 text-xs text-blue-900 flex items-center justify-between">
          <span>
            Selected: <strong>{selectedItem.name}</strong> (Qty: {selectedItem.quantity || selectedItem.qty} • ₹
            {((selectedItem.inventoryCostValue || selectedItem.stockValue) || 0).toLocaleString('en-IN')})
          </span>
          <button
            type="button"
            onClick={() => setSelectedItem(null)}
            className="text-blue-700 hover:text-blue-900 font-bold ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Responsive Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200 font-semibold uppercase text-[10px] tracking-wider">
            <tr>
              <th className="py-3 px-4 sm:px-6">Product</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4 text-center">Qty</th>
              <th className="py-3 px-4 text-center">Days Stagnant</th>
              <th className="py-3 px-4 text-right">Stock Value</th>
              <th className="py-3 px-4 text-center">Priority</th>
              <th className="py-3 px-4 sm:px-6 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 px-6"><div className="h-4 bg-slate-100 rounded w-44" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-20" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-8 mx-auto" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-12 mx-auto" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-16 ml-auto" /></td>
                  <td className="py-4 px-4"><div className="h-5 bg-slate-100 rounded w-16 mx-auto" /></td>
                  <td className="py-4 px-6"><div className="h-6 bg-slate-100 rounded w-16 ml-auto" /></td>
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-10 text-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-2">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-semibold text-slate-800">
                    No Dead Stock Detected
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Your active product catalog currently contains zero items over 60 days stagnant.
                  </p>
                </td>
              </tr>
            ) : (
              items.map((prod) => {
                const Icon = getProductIcon(prod.name);
                const qty = prod.quantity ?? prod.qty ?? 0;
                const stockVal = prod.inventoryCostValue ?? prod.stockValue ?? 0;
                const priority = prod.severity ?? prod.priority ?? 'Medium';
                const daysDisplay =
                  prod.daysSinceLastSale !== null && prod.daysSinceLastSale !== undefined
                    ? `${prod.daysSinceLastSale}d`
                    : 'No data';

                return (
                  <tr key={prod.productId || prod.id || prod.sku} className="hover:bg-slate-50/70 transition-colors">
                    {/* Product Details & Thumbnail */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 flex-shrink-0">
                          <Icon className="w-4 h-4 text-slate-500" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate max-w-[200px] sm:max-w-xs">
                            {prod.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {prod.sku}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {prod.category}
                    </td>

                    {/* Quantity */}
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                      {qty}
                    </td>

                    {/* Days Since Last Sale */}
                    <td className="py-3.5 px-4 text-center font-semibold text-red-600">
                      {daysDisplay}
                    </td>

                    {/* Stock Value */}
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono">
                      ₹{stockVal.toLocaleString('en-IN')}
                    </td>

                    {/* Priority Badge */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${getPriorityBadge(
                          priority
                        )}`}
                      >
                        {priority}
                      </span>
                    </td>

                    {/* Action Button */}
                    <td className="py-3.5 px-4 sm:px-6 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedItem(prod);
                          if (onSelectProduct) onSelectProduct(prod);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        <span>View Plan</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
