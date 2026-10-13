/**
 * StockSaathi AI — Dashboard Presentation Fixtures
 * 
 * Illustrative presentation data strictly adhering to the user's authoritative dashboard screenshot.
 * Separated cleanly from API services and MongoDB persistence.
 */

export const summaryMetrics = {
  totalStockValue: {
    amount: '₹12,40,000',
    itemCount: '1,248 Products',
    trend: '+2.4% vs last month',
    isPositive: true,
  },
  deadStockValue: {
    amount: '₹3,15,000',
    itemCount: '174 Items (25.4% of total stock)',
    trend: '-5.1% this month',
    isPositive: false,
    alert: 'Critical Attention Needed',
  },
  potentialRecovery: {
    amount: '₹2,45,000',
    badge: 'Target 78% Recovery',
    subtext: 'Projected cash unlock via 7-day plan',
    isProjection: true,
  },
  estimatedProfit: {
    amount: '₹85,500',
    badge: 'Protected Margin: 18%',
    subtext: 'Estimated net profit after discounted clearance',
    isProjection: true,
  },
};

export const inventoryOverviewData = [
  { month: 'Jan', totalStock: 980000, deadStock: 380000, recovered: 45000 },
  { month: 'Feb', totalStock: 1050000, deadStock: 360000, recovered: 70000 },
  { month: 'Mar', totalStock: 1120000, deadStock: 340000, recovered: 110000 },
  { month: 'Apr', totalStock: 1180000, deadStock: 330000, recovered: 140000 },
  { month: 'May', totalStock: 1220000, deadStock: 320000, recovered: 155000 },
  { month: 'Jun', totalStock: 1240000, deadStock: 315000, recovered: 165000 },
];

export const stockStatusData = [
  { name: 'Fast Moving', value: 724, percentage: '58%', color: '#10b981' },
  { name: 'Slow Moving', value: 300, percentage: '24%', color: '#f59e0b' },
  { name: 'Dead Stock', value: 174, percentage: '14%', color: '#ef4444' },
  { name: 'Not Tracked', value: 50, percentage: '4%', color: '#64748b' },
];

export const deadStockProducts = [
  {
    id: 'prod-001',
    name: 'Wireless Bluetooth Headphones Pro',
    sku: 'AUDIO-HP-09',
    category: 'Audio & Sound',
    qty: 42,
    daysSinceLastSale: 120,
    stockValue: 84000,
    originalPrice: 2499,
    costPrice: 1200,
    priority: 'High',
  },
  {
    id: 'prod-002',
    name: 'Smart Fitness Band v2 (Black)',
    sku: 'WEAR-FB-22',
    category: 'Wearables',
    qty: 65,
    daysSinceLastSale: 95,
    stockValue: 78000,
    originalPrice: 1599,
    costPrice: 800,
    priority: 'High',
  },
  {
    id: 'prod-003',
    name: 'RGB Mechanical Gaming Keyboard',
    sku: 'ACC-KB-77',
    category: 'Computer Accessories',
    qty: 28,
    daysSinceLastSale: 85,
    stockValue: 56000,
    originalPrice: 2899,
    costPrice: 1400,
    priority: 'Medium',
  },
  {
    id: 'prod-004',
    name: 'Type-C 65W GaN Fast Charger',
    sku: 'CHG-GAN-65',
    category: 'Mobile Accessories',
    qty: 80,
    daysSinceLastSale: 72,
    stockValue: 48000,
    originalPrice: 999,
    costPrice: 450,
    priority: 'Medium',
  },
  {
    id: 'prod-005',
    name: 'Aluminum Ergonomic Laptop Stand',
    sku: 'ACC-LS-04',
    category: 'Office & Desk',
    qty: 35,
    daysSinceLastSale: 60,
    stockValue: 24500,
    originalPrice: 1299,
    costPrice: 550,
    priority: 'Low',
  },
  {
    id: 'prod-006',
    name: 'Active Noise Cancelling TWS Earbuds',
    sku: 'AUDIO-TWS-55',
    category: 'Audio & Sound',
    qty: 20,
    daysSinceLastSale: 58,
    stockValue: 24500,
    originalPrice: 1999,
    costPrice: 850,
    priority: 'Low',
  },
];

export const sevenDayPlan = [
  {
    day: 1,
    title: 'Announce Flash Sale',
    description: 'Broadcast exclusive teaser to VIP & loyal customer base.',
    target: '15% Cleared',
    accent: '#3b82f6',
    bgLight: 'bg-blue-50 border-blue-200 text-blue-900',
    badgeBg: 'bg-blue-100 text-blue-800',
  },
  {
    day: 2,
    title: 'Bundle Offers',
    description: 'Pair stagnant accessories with high-velocity bestselling smartphones.',
    target: '25% Cleared',
    accent: '#8b5cf6',
    bgLight: 'bg-purple-50 border-purple-200 text-purple-900',
    badgeBg: 'bg-purple-100 text-purple-800',
  },
  {
    day: 3,
    title: 'WhatsApp Campaign',
    description: 'Direct 1-click WhatsApp order link with limited-time promotional pricing.',
    target: '40% Cleared',
    accent: '#10b981',
    bgLight: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    badgeBg: 'bg-emerald-100 text-emerald-800',
  },
  {
    day: 4,
    title: 'Reseller Outreach',
    description: 'Offer volume lot discounts to local sub-retailers at wholesale rates.',
    target: '55% Cleared',
    accent: '#f59e0b',
    bgLight: 'bg-amber-50 border-amber-200 text-amber-900',
    badgeBg: 'bg-amber-100 text-amber-800',
  },
  {
    day: 5,
    title: 'Limited Time Deals',
    description: 'Create urgency with a 24-hour flash markdown counter in-store.',
    target: '70% Cleared',
    accent: '#f43f5e',
    bgLight: 'bg-rose-50 border-rose-200 text-rose-900',
    badgeBg: 'bg-rose-100 text-rose-800',
  },
  {
    day: 6,
    title: 'Best Seller Focus',
    description: 'Cross-merchandise display near checkout counter to capture footfall.',
    target: '85% Cleared',
    accent: '#6366f1',
    bgLight: 'bg-indigo-50 border-indigo-200 text-indigo-900',
    badgeBg: 'bg-indigo-100 text-indigo-800',
  },
  {
    day: 7,
    title: 'Final Clearance',
    description: 'Maximum profit-safe markdown to liquidate remaining units.',
    target: '100% Target',
    accent: '#475569',
    bgLight: 'bg-slate-50 border-slate-300 text-slate-900',
    badgeBg: 'bg-slate-200 text-slate-800',
  },
];

export const whatsAppTemplates = {
  en: `🔥 *Flash Deal from Sharma Electronics!*
We have a special weekend offer for our valued customers.

✨ *Wireless Bluetooth Headphones Pro*
🏷️ Was: ₹2,499 | *Now Only: ₹1,699* (Save 32%!)
⚡ Limited stock remaining (Only 42 units left).

Reply *'BUY'* or tap below to reserve yours now! 👇
https://wa.me/919876543210?text=I+want+to+order+Headphones`,
  hi: `🔥 *शर्मा इलेक्ट्रॉनिक्स की ओर से स्पेशल ऑफर!*
हमारे सम्मानित ग्राहकों के लिए इस वीकेंड खास डिस्काउंट!

✨ *वायरलेस ब्लूटूथ हेडफ़ोन प्रो*
🏷️ पहले: ₹2,499 | *अब सिर्फ: ₹1,699* (32% की भारी छूट!)
⚡ सीमित स्टॉक (सिर्फ 42 पीस बचे हैं)।

ऑर्डर करने के लिए अभी *'BUY'* रिप्लाई करें या लिंक पर क्लिक करें! 👇
https://wa.me/919876543210?text=I+want+to+order+Headphones`,
};

export const recoveryProgressData = [
  { day: 'Day 1', recovered: 25000, remaining: 290000 },
  { day: 'Day 2', recovered: 55000, remaining: 260000 },
  { day: 'Day 3', recovered: 90000, remaining: 225000 },
  { day: 'Day 4', recovered: 120000, remaining: 195000 },
  { day: 'Day 5', recovered: 145000, remaining: 170000 },
  { day: 'Day 6', recovered: 158000, remaining: 157000 },
  { day: 'Day 7', recovered: 165000, remaining: 150000 },
];
