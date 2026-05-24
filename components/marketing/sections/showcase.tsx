'use client';

import { motion } from 'framer-motion';
import { 
  GitBranch, Users, BarChart3, MapPin, TrendingUp, Wallet, 
  Smartphone, Home, PieChart, Bell, ArrowUpDown, Check, X, ShieldAlert 
} from 'lucide-react';

/* ── 1. Trusted By Section ──────────────────────── */
export function TrustedSection() {
  const logos = ['STRIPE', 'MERCURY', 'RAMP', 'BREX', 'LINEAR', 'VERCEL'];
  return (
    <section className="py-12 bg-white border-y border-gray-100">
      <div className="max-w-[1200px] mx-auto px-5 md:px-8">
        <p className="text-center text-[10px] font-bold tracking-[0.2em] text-[#9CA3AF] uppercase mb-8">
          Trusted by fast-growing operations worldwide
        </p>
        <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6">
          {logos.map(s => (
            <span 
              key={s} 
              className="text-[15px] font-extrabold tracking-[0.12em] text-[#9CA3AF]/40 hover:text-[#6B7280]/80 transition-colors cursor-default select-none"
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 2. Why HexaTrack (Comparison Section) ───────── */
export function BranchSection() {
  const comparisonItems = [
    { feature: 'Multi-Branch Ledger Scopes', traditional: false, hexatrack: true },
    { feature: 'AI-Powered Cashflow Forecasts', traditional: false, hexatrack: true },
    { feature: 'Real-Time Sync (Offline Capable)', traditional: false, hexatrack: true },
    { feature: 'Granular Role-Based Permissions (RBAC)', traditional: true, hexatrack: true },
    { feature: 'PWA Mobile App (Zero Viewport Overlaps)', traditional: false, hexatrack: true },
    { feature: 'Workspace Isolation context headers', traditional: false, hexatrack: true },
    { feature: 'Calm, High-Contrast Light Aesthetic', traditional: true, hexatrack: true },
  ];

  return (
    <section id="why-hexatrack" className="py-24 lg:py-32 px-5 md:px-8 bg-white border-b border-gray-100">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text Info */}
          <motion.div 
            initial={{ opacity: 0, y: 16 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true }}
          >
            <p className="text-[11px] font-bold text-[#10B981] uppercase tracking-[0.2em] mb-3">Comparison</p>
            <h2 className="text-[32px] sm:text-[42px] font-extrabold text-[#111827] tracking-tight mb-4">
              Designed to Scale Operations
            </h2>
            <p className="text-[16px] sm:text-[17px] text-[#6B7280] mb-8 max-w-md">
              Unlike traditional spreadsheets or basic single-user trackers, HexaTrack is built as a multi-tenant business operating engine.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-[#F0FDF4] flex items-center justify-center border border-emerald-100">
                  <Check size={13} className="text-[#10B981]" />
                </div>
                <span className="text-[14px] font-bold text-[#111827]">Fully logical workspace context boundaries</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-[#F0FDF4] flex items-center justify-center border border-emerald-100">
                  <Check size={13} className="text-[#10B981]" />
                </div>
                <span className="text-[14px] font-bold text-[#111827]">Zero silent balance calculations drift</span>
              </div>
            </div>
          </motion.div>

          {/* Comparison Table Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true }} 
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-gray-200 bg-[#F9FAFB] p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
              <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Features Grid Comparison</span>
              <span className="text-xs font-black text-[#10B981] bg-[#F0FDF4] px-2.5 py-1 rounded-lg border border-[#10B981]/15">
                V2 Core Engine
              </span>
            </div>

            <div className="space-y-3.5">
              {comparisonItems.map(item => (
                <div 
                  key={item.feature} 
                  className="grid grid-cols-12 items-center gap-2 py-2 border-b border-gray-200/50 last:border-0"
                >
                  <span className="col-span-8 text-[12.5px] font-bold text-[#374151]">{item.feature}</span>
                  
                  {/* Traditional column */}
                  <div className="col-span-2 flex justify-center">
                    {item.traditional ? (
                      <Check size={14} className="text-gray-400" />
                    ) : (
                      <X size={14} className="text-red-400" />
                    )}
                  </div>

                  {/* HexaTrack column */}
                  <div className="col-span-2 flex justify-center">
                    {item.hexatrack ? (
                      <div className="w-6 h-6 rounded-full bg-[#F0FDF4] border border-[#10B981]/20 flex items-center justify-center shadow-sm">
                        <Check size={12} className="text-[#10B981] stroke-[3]" />
                      </div>
                    ) : (
                      <X size={14} className="text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ── 3. Mobile App Preview (iPhone 14 Pro Mockup) ── */
export function MobileShowcaseSection() {
  return (
    <section id="mobile-app" className="py-24 lg:py-32 px-5 md:px-8 bg-[#F9FAFB]">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Phone Mockup (Left on Desktop) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true }} 
            className="flex justify-center order-2 lg:order-1 relative"
          >
            {/* Ambient background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-96 bg-[#10B981]/5 blur-3xl rounded-full" />
            
            {/* Phone Case Bezel */}
            <div className="w-[290px] rounded-[48px] border-[6px] border-[#111827] bg-[#111827] p-2.5 shadow-2xl relative z-10">
              {/* Dynamic Island Screen notch */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-5 rounded-full bg-[#111827] z-30" />
              
              <div className="rounded-[38px] overflow-hidden bg-[#F9FAFB] border border-gray-100">
                {/* Mobile Screen Header */}
                <div className="px-5 pt-8 pb-4 bg-white border-b border-gray-100">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-[#9CA3AF]">HQ Personal Workspace</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                  </div>
                  <p className="text-[11px] font-bold text-[#6B7280]">Available Balance</p>
                  <p className="text-2xl font-black text-[#111827] tracking-tight">$24,580</p>
                  <p className="text-[10px] text-[#10B981] font-bold mt-0.5">▲ +$1,240 today</p>
                </div>

                {/* Mobile Quick Action Circles */}
                <div className="flex justify-around px-5 py-4 bg-white border-b border-gray-100">
                  {[
                    { icon: TrendingUp, label: 'Income', c: 'text-[#10B981]', bg: 'bg-[#F0FDF4]' }, 
                    { icon: Wallet, label: 'Expense', c: 'text-red-500', bg: 'bg-red-50' }, 
                    { icon: ArrowUpDown, label: 'Transfer', c: 'text-teal-600', bg: 'bg-teal-50' }
                  ].map(a => (
                    <div key={a.label} className="flex flex-col items-center gap-1.5">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center ${a.bg} border border-gray-100 shadow-sm`}>
                        <a.icon size={16} className={a.c} />
                      </div>
                      <span className="text-[10px] font-bold text-[#374151]">{a.label}</span>
                    </div>
                  ))}
                </div>

                {/* Mobile Transaction List */}
                <div className="px-4 py-4 bg-[#F9FAFB] h-[190px]">
                  <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-2 px-1">Recent Feed</p>
                  {[
                    { n: 'Monthly Salary', a: '+$8,500', c: 'text-[#10B981]' },
                    { n: 'Studio Rental', a: '-$2,500', c: 'text-red-500' },
                    { n: 'Organic Groceries', a: '-$320', c: 'text-red-500' },
                  ].map(t => (
                    <div key={t.n} className="flex items-center justify-between px-3 py-2 rounded-xl mb-1.5 bg-white border border-gray-200/60 shadow-[0_2px_4px_rgba(0,0,0,0.01)]">
                      <span className="text-[11.5px] font-bold text-[#111827]">{t.n}</span>
                      <span className={`text-[11px] font-mono font-bold ${t.c}`}>{t.a}</span>
                    </div>
                  ))}
                </div>

                {/* Mobile Bottom Navigation with centered FAB placeholder */}
                <div className="flex justify-around items-center py-3 bg-white border-t border-gray-200 relative">
                  <div className="flex flex-col items-center gap-0.5">
                    <Home size={16} className="text-[#10B981]" />
                    <span className="text-[8px] font-bold text-[#10B981]">Home</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <BarChart3 size={16} className="text-gray-400" />
                    <span className="text-[8px] font-bold text-gray-400">Reports</span>
                  </div>
                  
                  {/* Floating Action Button (FAB) indicator */}
                  <div className="w-8 h-8 rounded-full bg-[#10B981] flex items-center justify-center text-white shadow-md shadow-emerald-500/20 translate-y-[-6px]">
                    <span className="text-base font-bold">+</span>
                  </div>

                  <div className="flex flex-col items-center gap-0.5">
                    <PieChart size={16} className="text-gray-400" />
                    <span className="text-[8px] font-bold text-gray-400">Analytics</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <Bell size={16} className="text-gray-400" />
                    <span className="text-[8px] font-bold text-gray-400">Alerts</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Text Description (Right on Desktop) */}
          <motion.div 
            initial={{ opacity: 0, y: 16 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true }} 
            className="order-1 lg:order-2"
          >
            <p className="text-[11px] font-bold text-[#10B981] uppercase tracking-[0.2em] mb-3">Mobile First PWA</p>
            <h2 className="text-[32px] sm:text-[42px] font-extrabold text-[#111827] tracking-tight mb-4">
              Your Finances, Everywhere
            </h2>
            <p className="text-[16px] sm:text-[17px] text-[#6B7280] mb-8 max-w-md">
              A fully optimized mobile application experience. Install it as a PWA, add transactions offline with physical feedback, and sync instantly when network coverage resumes.
            </p>
            <div className="space-y-4">
              {[
                'Offline-first core cache with automatic sync queues',
                'Bottom navigation layout optimized for thumb-reachability',
                'Z-index isolated sheets to avoid keyboard overlap conflicts',
                'Safe area boundary inset padding dynamically calculated'
              ].map(f => (
                <div key={f} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-md bg-[#F0FDF4] flex items-center justify-center shrink-0 border border-[#10B981]/15">
                    <Smartphone size={11} className="text-[#10B981]" />
                  </div>
                  <span className="text-[13.5px] font-bold text-[#374151]">{f}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ── 4. Dashboard Showcase Section ──────────────── */
export function AnalyticsShowcaseSection() {
  return (
    <section id="showcase" className="py-24 lg:py-32 px-5 md:px-8 bg-white border-t border-gray-150">
      <div className="max-w-[1200px] mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 16 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true }} 
          className="text-center mb-16"
        >
          <p className="text-[11px] font-bold text-[#10B981] uppercase tracking-[0.2em] mb-3">Interactive Showcase</p>
          <h2 className="text-[32px] sm:text-[42px] font-extrabold text-[#111827] tracking-tight mb-4">
            Insights That Drive Decisions
          </h2>
          <p className="text-[16px] sm:text-[18px] text-[#6B7280] max-w-xl mx-auto">
            Real-time spending analytics, monthly growth trajectories, and automated branch performance metrics.
          </p>
        </motion.div>

        {/* Analytics Showcase Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card 1: Category breakdown Donut */}
          <motion.div 
            initial={{ opacity: 0, y: 16 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true }} 
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-4">Spending by Category</p>
            <div className="flex justify-center mb-6">
              <svg viewBox="0 0 120 120" className="w-28 h-28">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#10B981" strokeWidth="10" strokeDasharray="140 174" strokeLinecap="round" transform="rotate(-90 60 60)" />
                <circle cx="60" cy="60" r="50" fill="none" stroke="#059669" strokeWidth="10" strokeDasharray="75 239" strokeDashoffset="-140" strokeLinecap="round" transform="rotate(-90 60 60)" />
                <circle cx="60" cy="60" r="50" fill="none" stroke="#34D399" strokeWidth="10" strokeDasharray="50 264" strokeDashoffset="-215" strokeLinecap="round" transform="rotate(-90 60 60)" />
                <circle cx="60" cy="60" r="50" fill="none" stroke="#047857" strokeWidth="10" strokeDasharray="30 284" strokeDashoffset="-265" strokeLinecap="round" transform="rotate(-90 60 60)" />
              </svg>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-3 border-t border-gray-100 pt-4">
              {[
                { l: 'Operations', c: '#10B981', p: '45%' }, 
                { l: 'Staff Costs', c: '#059669', p: '24%' }, 
                { l: 'Growth', c: '#34D399', p: '18%' }, 
                { l: 'Neutral/Misc', c: '#047857', p: '13%' }
              ].map(i => (
                <div key={i.l} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: i.c }} />
                  <span className="text-[11.5px] font-bold text-[#475569]">{i.l} ({i.p})</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Card 2: Monthly Growth Line Chart */}
          <motion.div 
            initial={{ opacity: 0, y: 16 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true }} 
            transition={{ delay: 0.05 }} 
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Monthly Growth</p>
            <p className="text-3xl font-extrabold text-[#111827] tracking-tight mb-4">+23.5%</p>
            <svg viewBox="0 0 200 80" className="w-full h-24">
              <defs>
                <linearGradient id="growthGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <polygon points="0,80 20,65 40,60 60,55 80,50 100,42 120,38 140,28 160,22 180,16 200,10 200,80" fill="url(#growthGlow)" />
              <polyline points="20,65 40,60 60,55 80,50 100,42 120,38 140,28 160,22 180,16 200,10" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="flex justify-between items-center text-[10px] font-bold text-[#9CA3AF] uppercase mt-2">
              <span>Q1</span><span>Q2</span><span>Q3</span><span>Q4 (Projected)</span>
            </div>
          </motion.div>

          {/* Card 3: Branch Performance List */}
          <motion.div 
            initial={{ opacity: 0, y: 16 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true }} 
            transition={{ delay: 0.1 }} 
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-4">Branch Performance Index</p>
            <div className="space-y-3.5">
              {[
                { n: 'Mumbai Hub', w: '90%', c: 'bg-[#10B981]', cap: 'Excellent' }, 
                { n: 'Delhi HQ Operations', w: '75%', c: 'bg-[#059669]', cap: 'Optimal' }, 
                { n: 'Bangalore Office', w: '60%', c: 'bg-[#34D399]', cap: 'Healthy' }, 
                { n: 'Chennai Branch', w: '45%', c: 'bg-[#047857]', cap: 'Auditing' }
              ].map(b => (
                <div key={b.n} className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-[#374151]">{b.n}</span>
                    <span className="text-[#111827]">{b.cap} ({b.w})</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className={`h-full rounded-full ${b.c}`} style={{ width: b.w }} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
