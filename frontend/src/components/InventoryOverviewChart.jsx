import React from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { inventoryOverviewData } from '../utils/dashboardFixtures.js';

// Custom Indian Rupee Formatter for Y-Axis (Lakhs)
const formatRupee = (value) => {
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(1)}L`;
  }
  return `₹${(value / 1000).toFixed(0)}k`;
};

// Custom Tooltip component
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white p-3 rounded-lg shadow-lg border border-slate-700 text-xs space-y-1.5 z-50">
        <div className="font-bold text-slate-300 border-b border-slate-800 pb-1">{label} Overview</div>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}:
            </span>
            <span className="font-semibold font-mono">
              ₹{entry.value.toLocaleString('en-IN')}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function InventoryOverviewChart() {
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            Inventory & Dead Stock Overview
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Total inventory vs dead stock trends and recovered value (Jan – Jun)
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600" /> Total Stock
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 ml-2" /> Dead Stock
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-500 ml-2" /> Recovered
        </div>
      </div>

      {/* Chart Area */}
      <div className="h-64 sm:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={inventoryOverviewData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="month" 
              stroke="#64748b" 
              fontSize={11} 
              tickLine={false} 
              axisLine={{ stroke: '#e2e8f0' }} 
            />
            <YAxis 
              stroke="#64748b" 
              fontSize={11} 
              tickFormatter={formatRupee} 
              tickLine={false} 
              axisLine={false} 
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Green Recovered Bars */}
            <Bar 
              dataKey="recovered" 
              name="Recovered Cash" 
              fill="#10b981" 
              radius={[4, 4, 0, 0]} 
              barSize={20} 
            />

            {/* Blue Total Stock Line */}
            <Line 
              type="monotone" 
              dataKey="totalStock" 
              name="Total Stock Value" 
              stroke="#2563eb" 
              strokeWidth={2.5} 
              dot={{ r: 3, fill: '#2563eb' }} 
              activeDot={{ r: 5 }} 
            />

            {/* Red Dead Stock Line */}
            <Line 
              type="monotone" 
              dataKey="deadStock" 
              name="Dead Stock Value" 
              stroke="#ef4444" 
              strokeWidth={2.5} 
              strokeDasharray="4 4"
              dot={{ r: 3, fill: '#ef4444' }} 
              activeDot={{ r: 5 }} 
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
