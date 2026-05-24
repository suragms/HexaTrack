'use client';

import { motion } from 'framer-motion';
import { 
  Wallet, TrendingUp, Users, GitBranch, BarChart3, ShieldCheck, 
  Layers, ClipboardCheck, FileText, Camera, RefreshCw, Smartphone 
} from 'lucide-react';

const FEATURES = [
  { icon: Wallet, title: 'Expense Tracking', desc: 'Categorize and track every transaction with smart tagging and merchant detection.' },
  { icon: TrendingUp, title: 'Income Management', desc: 'Monitor revenue streams across accounts, branches, and team members.' },
  { icon: Users, title: 'Team Collaboration', desc: 'Invite staff, assign roles, and collaborate on financial operations.' },
  { icon: GitBranch, title: 'Branch Management', desc: 'Track finances per branch with independent dashboards and reports.' },
  { icon: BarChart3, title: 'Analytics', desc: 'Real-time insights with trend analysis, spending breakdowns, and forecasts.' },
  { icon: ShieldCheck, title: 'Role Permissions', desc: 'Granular access control for owners, staff, and viewers across workspaces.' },
  { icon: Layers, title: 'Multi Workspace', desc: 'Manage personal, business, and family finances in isolated workspaces.' },
  { icon: ClipboardCheck, title: 'Approval Workflow', desc: 'Staff submit expenses for owner approval before finalizing.' },
  { icon: FileText, title: 'Reports', desc: 'Generate P&L, cashflow, and category reports for any date range.' },
  { icon: Camera, title: 'Receipt Uploads', desc: 'Capture and attach receipts to transactions for audit trails.' },
  { icon: RefreshCw, title: 'Recurring Entries', desc: 'Automate monthly rent, salaries, subscriptions, and repeating costs.' },
  { icon: Smartphone, title: 'Mobile App', desc: 'Native mobile experience that works offline with instant sync.' },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 lg:py-32 px-5 md:px-8 bg-gray-50/50 border-y border-gray-100">
      <div className="max-w-[1200px] mx-auto">
        {/* Section Title */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true }} 
          className="text-center mb-16"
        >
          <p className="text-[11px] font-bold text-[#10B981] uppercase tracking-[0.2em] mb-3">Capabilities</p>
          <h2 className="text-[32px] sm:text-[42px] font-extrabold text-[#111827] tracking-tight mb-4">Everything You Need</h2>
          <p className="text-[16px] sm:text-[18px] text-[#6B7280] max-w-xl mx-auto">
            A complete financial operating system built for how modern teams and individuals actually work.
          </p>
        </motion.div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {FEATURES.map((f, i) => (
            <motion.div 
              key={f.title} 
              initial={{ opacity: 0, y: 16 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }} 
              transition={{ delay: i * 0.03 }}
              className="group rounded-2xl border border-gray-200 bg-white p-6 hover:-translate-y-1 hover:shadow-md hover:shadow-emerald-500/5 transition-all duration-300 cursor-default"
            >
              {/* Icon Container */}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5 bg-[#F0FDF4] text-[#10B981] transition-transform group-hover:scale-105 border border-[#10B981]/10">
                <f.icon size={18} />
              </div>
              <h3 className="text-[15px] font-bold text-[#111827] mb-2">{f.title}</h3>
              <p className="text-[13px] text-[#6B7280] leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
