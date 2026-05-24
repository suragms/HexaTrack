'use client';

import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, Users, GitBranch, Wallet, Zap, TrendingUp, CheckCircle } from 'lucide-react';

export function HeroSection({ onGetStarted, onLogin }: { onGetStarted: () => void; onLogin: () => void }) {
  return (
    <section className="relative pt-32 pb-20 lg:pt-44 lg:pb-28 px-5 md:px-8 overflow-hidden bg-white">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[700px] bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.06)_0%,transparent_75%)]" />
        <div className="absolute top-40 right-0 w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(52,211,153,0.04)_0%,transparent_70%)]" />
        <div className="absolute top-20 left-0 w-[300px] h-[300px] bg-[radial-gradient(circle,rgba(16,185,129,0.03)_0%,transparent_70%)]" />
      </div>

      <div className="max-w-[1200px] mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Column */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F0FDF4] border border-[#34D399]/30 mb-6">
              <Zap size={12} className="text-[#059669]" />
              <span className="text-[11px] font-bold text-[#059669] tracking-wider uppercase">Unified Finance Operations</span>
            </div>

            <h1 className="text-[44px] sm:text-[54px] lg:text-[62px] font-extrabold leading-[1.08] tracking-[-0.03em] text-[#111827] mb-6">
              Smart Finance Management for{' '}
              <span className="bg-gradient-to-r from-[#10B981] via-[#059669] to-[#34D399] bg-clip-text text-transparent">
                Modern Businesses
              </span>
            </h1>

            <p className="text-[16px] sm:text-[18px] leading-[1.65] text-[#475569] max-w-[520px] mb-8">
              Track income, expenses, branches, teams, recurring payments, and analytics from one intelligent platform.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 mb-10">
              <button 
                onClick={onGetStarted}
                className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#10B981] to-[#059669] text-white text-[15px] font-bold transition-all hover:brightness-105 active:scale-[0.98] shadow-md shadow-emerald-500/10"
              >
                Get Started
                <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
              
              <button 
                onClick={onLogin}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#F0FDF4] border border-[#10B981]/20 text-[#059669] text-[15px] font-bold transition-all hover:bg-emerald-100/50 active:scale-[0.98]"
              >
                Launch App
              </button>
            </div>

            {/* Micro Feature Bullet Points */}
            <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-8">
              {[
                { title: 'AI Insights Included', desc: 'Predictive cashflow metrics' },
                { title: 'Multi-Branch Support', desc: 'Segment operations dynamically' },
                { title: 'Real-Time Sync', desc: 'Zero ledger latency' },
                { title: 'Granular Permissions', desc: 'Role-based access control' },
              ].map(f => (
                <div key={f.title} className="flex gap-2.5">
                  <CheckCircle size={16} className="text-[#10B981] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-[13px] font-bold text-[#111827]">{f.title}</h4>
                    <p className="text-[11px] text-[#6B7280]">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right Column — Premium Mockup */}
          <motion.div 
            initial={{ opacity: 0, y: 30, scale: 0.98 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            transition={{ duration: 0.7, delay: 0.1 }} 
            className="relative"
          >
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_20px_50px_rgba(16,42,67,0.06)] relative z-10">
              {/* Window Header */}
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
                </div>
                <span className="text-[10px] font-bold text-[#9CA3AF] tracking-wider uppercase">Live Operations Workspace</span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: 'Total Inflow', value: '$12,450', color: 'text-[#10B981]', bg: 'bg-[#F0FDF4]', icon: TrendingUp },
                  { label: 'Total Outflow', value: '$8,210', color: 'text-red-500', bg: 'bg-red-50/50', icon: Wallet },
                  { label: 'Net Profit', value: '$4,240', color: 'text-emerald-700', bg: 'bg-emerald-50/30', icon: BarChart3 },
                ].map(m => (
                  <div key={m.label} className={`rounded-xl border border-gray-100 p-3 ${m.bg}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <m.icon size={12} className={m.color} />
                      <span className="text-[10px] font-bold text-[#6B7280]">{m.label}</span>
                    </div>
                    <p className={`text-base font-extrabold ${m.color} tracking-tight`}>{m.value}</p>
                  </div>
                ))}
              </div>

              {/* Cash Flow Line Chart */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/30 p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold text-[#374151]">Cash Flow Health</span>
                  <span className="text-[11px] text-[#10B981] font-bold flex items-center gap-1">
                    <TrendingUp size={12} /> +18.3% this month
                  </span>
                </div>
                {/* SVG Curve chart */}
                <svg viewBox="0 0 200 60" className="w-full h-14">
                  <defs>
                    <linearGradient id="emeraldGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <polygon points="0,60 10,48 30,42 50,35 70,38 90,26 110,32 130,18 150,14 170,22 190,8 200,10 200,60" fill="url(#emeraldGlow)" />
                  <polyline points="10,48 30,42 50,35 70,38 90,26 110,32 130,18 150,14 170,22 190,8" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              {/* Transaction list mock */}
              <div className="space-y-2">
                {[
                  { desc: 'Office Lease Payment', amt: '-$2,100', col: 'text-red-500', sub: 'Finance Dept • Operations' },
                  { desc: 'Acme Corp Subscription', amt: '+$8,500', col: 'text-[#10B981]', sub: 'Invoice paid • Standard' },
                  { desc: 'Software Licenses', amt: '-$420', col: 'text-red-500', sub: 'Auto payment • Monthly' },
                ].map(t => (
                  <div key={t.desc} className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 bg-white">
                    <div>
                      <h5 className="text-[12px] font-bold text-[#111827]">{t.desc}</h5>
                      <span className="text-[10px] text-[#6B7280]">{t.sub}</span>
                    </div>
                    <span className={`text-[13px] font-mono font-bold ${t.col}`}>{t.amt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating Overlays */}
            <motion.div 
              initial={{ x: 15, opacity: 0 }} 
              animate={{ x: 0, opacity: 1 }} 
              transition={{ delay: 0.6, duration: 0.4 }}
              className="absolute -top-4 -right-4 hidden md:flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white shadow-md shadow-gray-100 z-20"
            >
              <div className="w-8 h-8 rounded-lg bg-[#F0FDF4] flex items-center justify-center text-[#10B981]">
                <GitBranch size={16} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Branches</p>
                <p className="text-xs font-black text-[#111827]">12 Active Nodes</p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ x: -15, opacity: 0 }} 
              animate={{ x: 0, opacity: 1 }} 
              transition={{ delay: 0.8, duration: 0.4 }}
              className="absolute -bottom-4 -left-4 hidden md:flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white shadow-md shadow-gray-100 z-20"
            >
              <div className="w-8 h-8 rounded-lg bg-[#F0FDF4] flex items-center justify-center text-[#10B981]">
                <Users size={16} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Staff</p>
                <p className="text-xs font-black text-[#111827]">48 Operators</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
