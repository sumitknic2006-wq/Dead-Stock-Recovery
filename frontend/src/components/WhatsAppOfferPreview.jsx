import React, { useState } from 'react';
import { MessageSquare, Copy, Check, Sparkles, ExternalLink, Smartphone } from 'lucide-react';
import { whatsAppTemplates } from '../utils/dashboardFixtures.js';

export default function WhatsAppOfferPreview({ onNavigate }) {
  const [activeLang, setActiveLang] = useState('en');
  const [copied, setCopied] = useState(false);

  const currentMessage = whatsAppTemplates[activeLang] || whatsAppTemplates.en;

  const handleCopy = async () => {
    try {
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(currentMessage);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (err) {
      console.warn('Clipboard write failed, using fallback copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white shadow-xs">
            <MessageSquare className="w-4 h-4 fill-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              WhatsApp Flash Sale Generator
            </h3>
            <p className="text-xs text-slate-500">
              Personalized customer broadcasts designed to liquidate dead inventory quickly
            </p>
          </div>
        </div>

        {/* Right header controls */}
        <div className="flex items-center gap-2">
          {/* Language Tabs */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveLang('en')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                activeLang === 'en' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setActiveLang('hi')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                activeLang === 'hi' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              हिंदी
            </button>
          </div>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('whatsapp-offers')}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Full Generator →</span>
            </button>
          )}
        </div>
      </div>

      {/* Content Composition: Message Bubble on Left, Promotional Graphic on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Chat Bubble Style Message Container */}
        <div className="lg:col-span-8 bg-emerald-50/50 border border-emerald-200/80 rounded-xl p-4 flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-emerald-800 font-semibold border-b border-emerald-200/50 pb-1.5">
              <span>Preview Draft Message (Ready to Send)</span>
              <span className="text-[10px] bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded-full">
                {activeLang === 'en' ? 'English Template' : 'हिंदी टेम्पलेट'}
              </span>
            </div>
            
            {/* Formatted Message Bubble */}
            <div className="bg-white border border-emerald-200 rounded-lg p-3.5 text-xs text-slate-800 font-mono whitespace-pre-wrap leading-relaxed shadow-2xs">
              {currentMessage}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-500">
              * Draft preview only. Messages are not broadcast automatically.
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className={`
                inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs
                ${copied 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white'}
              `}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Message</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Promotional Product Image Area */}
        <div className="lg:col-span-4 bg-slate-900 text-white rounded-xl p-4 flex flex-col justify-between border border-slate-800 shadow-xs relative overflow-hidden">
          <div className="space-y-1 z-10">
            <span className="inline-block px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] font-bold rounded uppercase">
              Featured Deal
            </span>
            <h4 className="text-sm font-bold text-white">
              Wireless Headphones Pro
            </h4>
            <p className="text-[11px] text-slate-400">
              Clearance target: 42 stagnant units
            </p>
          </div>

          {/* Visual Deal Badge */}
          <div className="my-4 py-4 px-3 bg-slate-800/80 rounded-lg border border-slate-700 text-center space-y-1 z-10">
            <div className="text-xs text-slate-400 line-through">MRP: ₹2,499</div>
            <div className="text-2xl font-black text-emerald-400">₹1,699</div>
            <div className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/20 py-0.5 px-2 rounded inline-block">
              Save ₹800 (32% OFF)
            </div>
          </div>

          <div className="text-[10px] text-slate-400 text-center z-10">
            Simulated VIP campaign for retail customer base
          </div>
        </div>
      </div>
    </div>
  );
}
