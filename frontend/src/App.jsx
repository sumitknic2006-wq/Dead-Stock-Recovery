import React, { useState, useEffect } from 'react';
import {
  IndianRupee,
  AlertOctagon,
  TrendingUp,
  Package,
} from 'lucide-react';

// Layout & navigation
import Sidebar from './components/Sidebar.jsx';
import TopHeader from './components/TopHeader.jsx';

// Dashboard section components
import WelcomeBanner from './components/WelcomeBanner.jsx';
import SummaryCard from './components/SummaryCard.jsx';
import InventoryOverviewChart from './components/InventoryOverviewChart.jsx';
import StockStatusChart from './components/StockStatusChart.jsx';
import QuickActions from './components/QuickActions.jsx';
import DeadStockTable from './components/DeadStockTable.jsx';
import SevenDayPlanPreview from './components/SevenDayPlanPreview.jsx';
import WhatsAppOfferPreview from './components/WhatsAppOfferPreview.jsx';

// Phase 5 — Inventory management page
import InventoryPage from './components/InventoryPage.jsx';

// Phase 6 — Dead Stock Analysis page
import DeadStockAnalysisPage from './components/DeadStockAnalysisPage.jsx';

// Phase 7 — Profit-Safe Discount Optimizer
import DiscountCalculatorPage from './components/DiscountCalculatorPage.jsx';
import DiscountCalculatorCard from './components/DiscountCalculatorCard.jsx';
import DiscountCalculatorModal from './components/DiscountCalculatorModal.jsx';

// Phase 8 — 7-Day Dead Stock Recovery Action Planner
import RecoveryPlanPage from './components/RecoveryPlanPage.jsx';

// Phase 9 — WhatsApp Clearance Campaign Generator
import WhatsAppCampaignPage from './components/WhatsAppCampaignPage.jsx';

// API services
import { getBackendHealth } from './services/api.js';
import { fetchDeadStockSummary } from './services/analysisApi.js';

// Phase 11 — Authentication & Multi-Merchant Isolation
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import AuthPage from './components/AuthPage.jsx';

// ─── Summary card data ────────────────────────────────────────────────────────
const SUMMARY_CARDS = [
  {
    id: 'dead-stock-value',
    title: 'Dead Stock Value',
    value: '₹2,45,000',
    sublabel: 'Across 174 stagnant items',
    trend: '+12% vs last month',
    isPositive: false,
    badgeText: 'Urgent Action',
    badgeType: 'danger',
    icon: IndianRupee,
    iconBg: 'bg-red-50 text-red-600',
  },
  {
    id: 'recovery-potential',
    title: 'Recovery Potential',
    value: '₹1,91,100',
    sublabel: 'Est. at 78% liquidation',
    trend: '+5.2% this week',
    isPositive: true,
    badgeText: 'AI Projection',
    badgeType: 'success',
    icon: TrendingUp,
    iconBg: 'bg-emerald-50 text-emerald-600',
    isProjection: true,
  },
  {
    id: 'total-sku',
    title: 'Total SKUs Tracked',
    value: '1,248',
    sublabel: '14% flagged as dead stock',
    trend: '−3 SKUs removed',
    isPositive: false,
    badgeText: '174 Dead',
    badgeType: 'amber',
    icon: Package,
    iconBg: 'bg-amber-50 text-amber-600',
  },
  {
    id: 'clearance-rate',
    title: '30-Day Clearance Rate',
    value: '62.4%',
    sublabel: 'Last cycle: 47.8%',
    trend: '+14.6% improvement',
    isPositive: true,
    badgeText: 'Trending Up',
    badgeType: 'success',
    icon: AlertOctagon,
    iconBg: 'bg-blue-50 text-blue-600',
  },
];

// ─── Authenticated App Layout ───────────────────────────────────────────────
function AuthenticatedApp() {
  const { merchant, isAuthenticated, isLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [language, setLanguage] = useState('en');
  const [apiHealth, setApiHealth] = useState(null);

  // Silently probe backend health — preserves Phase 2 & 3 connectivity check
  useEffect(() => {
    getBackendHealth()
      .then(setApiHealth)
      .catch(() => setApiHealth(null));
  }, []);

  const toggleLanguage = () =>
    setLanguage((prev) => (prev === 'en' ? 'hi' : 'en'));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
        <span className="text-sm font-semibold tracking-wide text-slate-300">
          Loading Merchant Workspace...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView onNavigate={setActiveTab} />;
      case 'inventory':
        return <InventoryPage />;
      case 'dead-stock':
        return <DeadStockAnalysisPage onNavigate={setActiveTab} />;
      case 'discount-calculator':
        return <DiscountCalculatorPage />;
      case 'recovery-plan':
        return <RecoveryPlanPage onNavigate={setActiveTab} />;
      case 'whatsapp-offers':
        return <WhatsAppCampaignPage onNavigate={setActiveTab} />;
      default:
        return (
          <PlaceholderView
            tab={activeTab}
            onBack={() => setActiveTab('dashboard')}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <div className="flex flex-col flex-1 min-w-0 lg:ml-64">
        <TopHeader
          onToggleMobile={() => setMobileSidebarOpen(true)}
          language={language}
          onToggleLanguage={toggleLanguage}
          apiHealth={apiHealth}
          merchant={merchant}
          onLogout={logout}
        />
        <main className="flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

// ─── Main App Entry ──────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

// ─── Dashboard view ───────────────────────────────────────────────────────────
function DashboardView({ onNavigate }) {
  const [liveCards, setLiveCards] = useState(SUMMARY_CARDS);
  const [liveSummary, setLiveSummary] = useState(null);
  const [activeDiscountModalProduct, setActiveDiscountModalProduct] = useState(null);

  useEffect(() => {
    let isMounted = true;
    fetchDeadStockSummary()
      .then((res) => {
        if (!isMounted) return;
        const summary = res.data.summary;
        if (!summary) return;
        setLiveSummary(summary);

        const deadVal = summary.deadStockTotalCostValue || 0;
        const recoveryEst = Math.round(deadVal * 0.78);
        const totalSKUs = summary.totalProducts || 0;
        const deadCount =
          (summary.classifications?.critical_dead_stock?.count || 0) +
          (summary.classifications?.at_risk?.count || 0);

        setLiveCards([
          {
            id: 'dead-stock-value',
            title: 'Dead Stock Value',
            value: `₹${deadVal.toLocaleString('en-IN')}`,
            sublabel: `Across ${deadCount} stagnant items`,
            trend: '+12% vs last month',
            isPositive: false,
            badgeText: 'Urgent Action',
            badgeType: 'danger',
            icon: IndianRupee,
            iconBg: 'bg-red-50 text-red-600',
          },
          {
            id: 'recovery-potential',
            title: 'Recovery Potential',
            value: `₹${recoveryEst.toLocaleString('en-IN')}`,
            sublabel: 'Est. at 78% liquidation',
            trend: '+5.2% this week',
            isPositive: true,
            badgeText: 'AI Projection',
            badgeType: 'success',
            icon: TrendingUp,
            iconBg: 'bg-emerald-50 text-emerald-600',
            isProjection: true,
          },
          {
            id: 'total-sku',
            title: 'Total SKUs Tracked',
            value: `${totalSKUs.toLocaleString('en-IN')}`,
            sublabel: `${deadCount} flagged as dead stock`,
            trend: '−3 SKUs removed',
            isPositive: false,
            badgeText: `${deadCount} Dead`,
            badgeType: 'amber',
            icon: Package,
            iconBg: 'bg-amber-50 text-amber-600',
          },
          {
            id: 'clearance-rate',
            title: '30-Day Clearance Rate',
            value: '62.4%',
            sublabel: 'Last cycle: 47.8%',
            trend: '+14.6% improvement',
            isPositive: true,
            badgeText: 'Trending Up',
            badgeType: 'success',
            icon: AlertOctagon,
            iconBg: 'bg-blue-50 text-blue-600',
          },
        ]);
      })
      .catch(() => {
        // Fallback to initial constants gracefully
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleQuickAction = (title) => {
    if (title.toLowerCase().includes('upload') || title.toLowerCase().includes('inventory')) {
      onNavigate('inventory');
    } else if (title.toLowerCase().includes('plan')) {
      onNavigate('recovery-plan');
    } else if (title.toLowerCase().includes('dead stock') || title.toLowerCase().includes('analyze')) {
      onNavigate('dead-stock');
    } else if (title.toLowerCase().includes('whatsapp')) {
      onNavigate('whatsapp-offers');
    } else if (title.toLowerCase().includes('discount') || title.toLowerCase().includes('calculator')) {
      onNavigate('discount-calculator');
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-screen-2xl mx-auto">
      <WelcomeBanner onActionClick={() => onNavigate('recovery-plan')} />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {liveCards.map((card) => (
          <SummaryCard key={card.id} {...card} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <InventoryOverviewChart />
        </div>
        <div className="lg:col-span-1">
          <StockStatusChart />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <QuickActions onSelectAction={handleQuickAction} />
        <DiscountCalculatorCard onOpenFullCalculator={() => onNavigate('discount-calculator')} />
      </div>
      <SevenDayPlanPreview onNavigate={onNavigate} />
      <DeadStockTable
        onSelectProduct={(prod) => {
          setActiveDiscountModalProduct({
            _id: prod._id || prod.productId || prod.id,
            name: prod.name,
            sku: prod.sku,
            category: prod.category,
            purchaseCost: prod.purchaseCost ?? prod.costPrice,
            sellingPrice: prod.sellingPrice ?? prod.originalPrice,
            quantity: prod.quantity ?? prod.qty,
            minimumGrossMarginPercent: prod.minimumGrossMarginPercent,
            minimumDesiredProfitPerUnit: prod.minimumDesiredProfitPerUnit,
          });
        }}
      />
      <WhatsAppOfferPreview onNavigate={onNavigate} />

      {/* Interactive Modal from Dead Stock selection */}
      {activeDiscountModalProduct && (
        <DiscountCalculatorModal
          product={activeDiscountModalProduct}
          onClose={() => setActiveDiscountModalProduct(null)}
        />
      )}
    </div>
  );
}

// ─── Placeholder for future phases ───────────────────────────────────────────
function PlaceholderView({ tab, onBack }) {
  const labelMap = {
    'recovery-plan': '7-Day Recovery Plan',
    'whatsapp-offers': 'WhatsApp Offers',
    reports: 'Reports & Insights',
    settings: 'Settings',
  };
  const label = labelMap[tab] || tab;

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="w-16 h-16 rounded-2xl bg-blue-600/10 flex items-center justify-center mb-4">
        <Package className="w-8 h-8 text-blue-600" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-1">{label}</h2>
      <p className="text-sm text-slate-500 max-w-sm mb-6">
        This section is coming in a future phase. Return to the Dashboard to explore live features.
      </p>
      <button
        type="button"
        onClick={onBack}
        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer shadow-sm"
      >
        ← Back to Dashboard
      </button>
    </div>
  );
}
