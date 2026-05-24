'use client';

import { motion } from 'framer-motion';
import { User, Building2, GitBranch, Crown, Check } from 'lucide-react';

const MODES = [
  { 
    icon: User, 
    title: 'Individual', 
    audience: 'Personal finance users', 
    color: '#10B981',
    features: ['Personal dashboard', 'Expense & income tracking', 'Savings goals', 'Budget reports', 'Receipt capture'] 
  },
  { 
    icon: Building2, 
    title: 'Organization', 
    audience: 'Companies without branches', 
    color: '#059669',
    features: ['Owner dashboard', 'Staff management', 'Approval workflows', 'Team analytics', 'Role permissions'] 
  },
  { 
    icon: GitBranch, 
    title: 'Branch Mode', 
    audience: 'Multi-location businesses', 
    color: '#34D399',
    features: ['Branch selector', 'Branch-level reports', 'Staff per branch', 'Branch analytics', 'Cross-branch overview'] 
  },
  { 
    icon: Crown, 
    title: 'Enterprise', 
    audience: 'Large organizations', 
    color: '#047857',
    features: ['Department hierarchy', 'Advanced permissions', 'Audit logging', 'API access', 'Custom integrations'] 
  },
];

const ROLES = [
  { 
    role: 'Super Admin', 
    desc: 'Platform-level control over all organizations, users, billing, and system configuration.', 
    color: 'bg-red-500' 
  },
  { 
    role: 'Owner', 
    desc: 'Organization owner with full access to staff, branches, finance, and settings.', 
    color: 'bg-[#10B981]' 
  },
  { 
    role: 'Staff', 
    desc: 'Team member with scoped access to assigned branches, categories, and transactions.', 
    color: 'bg-[#34D399]' 
  },
  { 
    role: 'Individual', 
    desc: 'Personal user managing their own finance workspace independently.', 
    color: 'bg-[#059669]' 
  },
];

export function WorkspaceModesSection() {
  return (
    <section className="py-24 lg:py-32 px-5 md:px-8 bg-white">
      <div className="max-w-[1200px] mx-auto">
        {/* Section Heading */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true }} 
          className="text-center mb-16"
        >
          <p className="text-[11px] font-bold text-[#10B981] uppercase tracking-[0.2em] mb-3">Workspace Types</p>
          <h2 className="text-[32px] sm:text-[42px] font-extrabold text-[#111827] tracking-tight mb-4">One Platform, Every Mode</h2>
          <p className="text-[16px] sm:text-[18px] text-[#6B7280] max-w-xl mx-auto">
            HexaTrack dynamically adapts based on your workspace type. No separate apps needed.
          </p>
        </motion.div>

        {/* Workspace Modes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-24">
          {MODES.map((m, i) => (
            <motion.div 
              key={m.title} 
              initial={{ opacity: 0, y: 16 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }} 
              transition={{ delay: i * 0.06 }}
              className="rounded-2xl border border-gray-200 bg-[#F9FAFB] p-6 hover:shadow-md hover:border-gray-300 transition-all duration-300"
            >
              <div 
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 border border-emerald-100" 
                style={{ background: '#F0FDF4', color: '#10B981' }}
              >
                <m.icon size={20} />
              </div>
              <h3 className="text-[17px] font-bold text-[#111827] mb-1">{m.title}</h3>
              <p className="text-[12.5px] text-[#6B7280] mb-5">{m.audience}</p>
              <div className="space-y-3">
                {m.features.map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <Check size={14} className="text-[#10B981] shrink-0" />
                    <span className="text-[12.5px] text-[#374151]">{f}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Role Architecture Heading */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true }} 
          className="text-center mb-16"
        >
          <p className="text-[11px] font-bold text-[#10B981] uppercase tracking-[0.2em] mb-3">Role Architecture</p>
          <h2 className="text-[32px] sm:text-[42px] font-extrabold text-[#111827] tracking-tight mb-4">Built for Every Role</h2>
        </motion.div>

        {/* Roles Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {ROLES.map((r, i) => (
            <motion.div 
              key={r.role} 
              initial={{ opacity: 0, y: 12 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }} 
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm hover:shadow-md transition-shadow duration-300"
            >
              <div className={`w-3.5 h-3.5 rounded-full mx-auto mb-4 ${r.color}`} />
              <h3 className="text-[15px] font-bold text-[#111827] mb-2">{r.role}</h3>
              <p className="text-[12.5px] text-[#6B7280] leading-relaxed">{r.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
