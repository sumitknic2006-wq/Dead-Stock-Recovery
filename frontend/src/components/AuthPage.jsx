/**
 * StockSaathi AI — Merchant Authentication Screen (Phase 11)
 *
 * Implements a high-aesthetic, production-ready login & registration experience
 * strictly following the Navy/Cyan design tokens and retail branding.
 *
 * Tagline: Recover Cash. Protect Profit. Grow Smarter.
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  Store,
  User,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Package,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function AuthPage() {
  const { login, register, authError, clearError } = useAuth();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    businessName: '',
    storeCategory: 'General Retail',
  });
  const [localErrors, setLocalErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTabSwitch = (newMode) => {
    setMode(newMode);
    setLocalErrors({});
    clearError();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (localErrors[name]) {
      setLocalErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const errors = {};
    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    }

    if (mode === 'register') {
      if (!formData.name.trim()) {
        errors.name = 'Retailer / owner name is required';
      }
      if (!formData.businessName.trim()) {
        errors.businessName = 'Store / business name is required';
      }
    }

    setLocalErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await login({
          email: formData.email.trim(),
          password: formData.password,
        });
      } else {
        await register({
          email: formData.email.trim(),
          password: formData.password,
          name: formData.name.trim(),
          businessName: formData.businessName.trim(),
          storeCategory: formData.storeCategory,
        });
      }
    } catch {
      // Error handled by AuthContext (authError state)
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillDemo = (type) => {
    clearError();
    setLocalErrors({});
    if (type === 'kirana') {
      setFormData({
        email: 'kirana.store@example.com',
        password: 'Password123!',
        name: 'Rajesh Sharma',
        businessName: 'Sharma General Kirana',
        storeCategory: 'Grocery & Kirana',
      });
    } else {
      setFormData({
        email: 'electronics.hub@example.com',
        password: 'Password123!',
        name: 'Pooja Verma',
        businessName: 'Verma Digital Electronics',
        storeCategory: 'Electronics',
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      {/* Background radial gradients for rich dark aesthetic */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white shadow-xl shadow-blue-500/20 mb-3 ring-4 ring-blue-500/10">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            StockSaathi <span className="text-cyan-400">AI</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
            Recover Cash. Protect Profit. Grow Smarter.
          </p>
        </div>

        {/* Feature Badges */}
        <div className="flex items-center justify-center gap-2 mb-6 text-[11px] font-medium text-slate-300 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-emerald-400 shadow-xs">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Multi-Tenant Isolated
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-cyan-400 shadow-xs">
            <TrendingUp className="w-3 h-3 text-cyan-400" /> Price Floor Protected
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-blue-400 shadow-xs">
            <Package className="w-3 h-3 text-blue-400" /> 7-Day Recovery
          </span>
        </div>

        {/* Authentication Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/90 rounded-2xl shadow-2xl p-6 sm:p-8">
          {/* Tabs */}
          <div className="flex p-1 bg-slate-950/80 rounded-xl mb-6 border border-slate-800">
            <button
              type="button"
              onClick={() => handleTabSwitch('login')}
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch('register')}
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Register Store
            </button>
          </div>

          {/* Error Banner */}
          {authError && (
            <div className="mb-5 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">Authentication Error</span>
                <span>{authError}</span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                {/* Retailer Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Owner / Retailer Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Rajesh Sharma"
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  {localErrors.name && (
                    <p className="text-[11px] text-red-400 mt-1">{localErrors.name}</p>
                  )}
                </div>

                {/* Business / Store Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Store / Business Name
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleChange}
                      placeholder="e.g. Sharma General Kirana"
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  {localErrors.businessName && (
                    <p className="text-[11px] text-red-400 mt-1">{localErrors.businessName}</p>
                  )}
                </div>

                {/* Store Category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Store Category
                  </label>
                  <select
                    name="storeCategory"
                    value={formData.storeCategory}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs sm:text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="Grocery & Kirana">Grocery & Kirana</option>
                    <option value="Electronics">Electronics & Appliances</option>
                    <option value="Clothing & Apparel">Clothing & Apparel</option>
                    <option value="Footwear">Footwear</option>
                    <option value="Hardware & Sanitary">Hardware & Sanitary</option>
                    <option value="General Retail">General Retail</option>
                  </select>
                </div>
              </>
            )}

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@store.com"
                  autoComplete="email"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              {localErrors.email && (
                <p className="text-[11px] text-red-400 mt-1">{localErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Minimum 8 characters"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              {localErrors.password && (
                <p className="text-[11px] text-red-400 mt-1">{localErrors.password}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {mode === 'login' ? 'Authenticating...' : 'Creating Merchant Account...'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  {mode === 'login' ? 'Access Merchant Dashboard' : 'Complete Registration'}
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </button>
          </form>

          {/* Quick Demo Pre-fill helper */}
          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <span className="text-[11px] text-slate-500 uppercase font-semibold tracking-wider block mb-2.5">
              Quick Test Accounts
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleFillDemo('kirana')}
                className="flex-1 py-1.5 px-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-[11px] text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-cyan-400" /> Kirana Demo
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('electronics')}
                className="flex-1 py-1.5 px-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-[11px] text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-blue-400" /> Electronics Demo
              </button>
            </div>
          </div>
        </div>

        {/* Security Footer Note */}
        <p className="text-center text-[11px] text-slate-500 mt-6 font-medium">
          Protected by Argon2/Bcrypt password hashing & scoped multi-merchant tenancy.
        </p>
      </div>
    </div>
  );
}
