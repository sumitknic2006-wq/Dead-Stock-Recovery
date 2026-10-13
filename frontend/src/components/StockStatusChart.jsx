import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import { fetchDeadStockSummary } from '../services/analysisApi.js';

export default function StockStatusChart() {
  const [chartData, setChartData] = useState([
    { name: 'Fast Moving', value: 0, percentage: '0%', color: '#10b981' },
    { name: 'Slow Moving', value: 0, percentage: '0%', color: '#f59e0b' },
    { name: 'Dead Stock', value: 0, percentage: '0%', color: '#ef4444' },
    { name: 'Not Tracked', value: 0, percentage: '0%', color: '#64748b' },
  ]);
  const [totalProducts, setTotalProducts] = useState(0);

  useEffect(() => {
    let isMounted = true;

    fetchDeadStockSummary()
      .then((res) => {
        if (!isMounted) return;
        const summary = res.data.summary;
        if (!summary) return;

        const total = summary.totalProducts || 0;
        const healthyCount = summary.classifications?.healthy?.count || 0;
        const slowCount = summary.classifications?.slow_moving?.count || 0;
        const deadCount =
          (summary.classifications?.critical_dead_stock?.count || 0) +
          (summary.classifications?.at_risk?.count || 0);
        const unTrackedCount = summary.classifications?.insufficient_data?.count || 0;

        const calcPercent = (val) => (total > 0 ? `${Math.round((val / total) * 100)}%` : '0%');

        const liveData = [
          { name: 'Fast Moving', value: healthyCount, percentage: calcPercent(healthyCount), color: '#10b981' },
          { name: 'Slow Moving', value: slowCount, percentage: calcPercent(slowCount), color: '#f59e0b' },
          { name: 'Dead Stock', value: deadCount, percentage: calcPercent(deadCount), color: '#ef4444' },
          { name: 'Not Tracked', value: unTrackedCount, percentage: calcPercent(unTrackedCount), color: '#64748b' },
        ];

        setChartData(liveData);
        setTotalProducts(total);
      })
      .catch(() => {
        // Fallback gracefully without throwing
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
      {/* Header */}
      <div className="border-b border-slate-100 pb-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <PieIcon className="w-4 h-4 text-emerald-600" />
          Stock Status Breakdown
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Health classification across product catalog
        </p>
      </div>

      {/* Donut Chart with Center Text */}
      <div className="relative h-48 w-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              formatter={(value, name) => [`${value} Items`, name]}
              contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
            />
            <Pie
              data={totalProducts > 0 ? chartData.filter((d) => d.value > 0) : [{ name: 'No Products', value: 1, color: '#e2e8f0' }]}
              innerRadius={55}
              outerRadius={75}
              paddingAngle={totalProducts > 0 ? 3 : 0}
              dataKey="value"
            >
              {(totalProducts > 0 ? chartData.filter((d) => d.value > 0) : [{ color: '#e2e8f0' }]).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center Text in Donut Hole */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold text-slate-900 tracking-tight leading-none">
            {totalProducts.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">
            Total Items
          </span>
        </div>
      </div>

      {/* Compact Legend matching screenshot layout */}
      <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100 text-xs">
        {chartData.map((item) => (
          <div key={item.name} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-slate-600 font-medium text-[11px] truncate">{item.name}</span>
            </div>
            <span className="font-semibold text-slate-800 text-[11px]">{item.percentage}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
