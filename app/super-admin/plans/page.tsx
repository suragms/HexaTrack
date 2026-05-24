'use client';

import React, { useEffect, useState } from 'react';
import { Check, Zap, Building2, Crown, Star, Edit3, X, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { hexaTrackApi } from '@/lib/api';
import type { PricingConfiguration } from '@/lib/types';
import { useAuthStore } from '@/store/auth-store';
import { showToast } from '@/components/ui/toast';

const PLAN_ICONS: Record<string, any> = {
  Free: Star,
  Basic: Zap,
  Pro: Building2,
  Enterprise: Crown,
};

const PLAN_COLORS: Record<string, string> = {
  Free: '#6B7280', // Gray
  Basic: '#3B82F6', // Blue
  Pro: '#10B981', // Emerald
  Enterprise: '#8B5CF6', // Purple
};

export default function PlansPage() {
  const { accessToken } = useAuthStore();
  const [plans, setPlans] = useState<PricingConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<PricingConfiguration | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [planName, setPlanName] = useState('');
  const [monthlyPrice, setMonthlyPrice] = useState(0);
  const [yearlyPrice, setYearlyPrice] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [trialDays, setTrialDays] = useState(14);
  const [maxUsers, setMaxUsers] = useState(5);
  const [maxBranches, setMaxBranches] = useState(1);
  const [maxTransactions, setMaxTransactions] = useState(1000);
  const [isActive, setIsActive] = useState(true);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const data = await hexaTrackApi.admin.pricing.list();
      setPlans(data);
    } catch (err) {
      console.error('Failed to load plans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchPlans();
    }
  }, [accessToken]);

  const openEdit = (plan: PricingConfiguration) => {
    setEditingPlan(plan);
    setPlanName(plan.planName);
    setMonthlyPrice(plan.monthlyPrice);
    setYearlyPrice(plan.yearlyPrice);
    setCurrency(plan.currency);
    setTrialDays(plan.trialDays);
    setMaxUsers(plan.maxUsers);
    setMaxBranches(plan.maxBranches);
    setMaxTransactions(plan.maxTransactionsPerMonth);
    setIsActive(plan.isActive);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    setSaving(true);
    try {
      const updated = await hexaTrackApi.admin.pricing.update(editingPlan.id, {
        planName,
        monthlyPrice,
        yearlyPrice,
        currency,
        trialDays,
        maxUsers,
        maxBranches,
        maxTransactionsPerMonth: maxTransactions,
        isActive,
      });

      setPlans(plans.map((p) => (p.id === editingPlan.id ? updated : p)));
      showToast('success', `Plan "${planName}" updated successfully!`);
      setEditingPlan(null);
    } catch (err: any) {
      console.error('Failed to save plan:', err);
      showToast('error', err?.message || 'Failed to save plan configuration.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-violet-400 uppercase tracking-[0.2em] mb-1">Super Admin Dashboard</p>
          <h1 className="text-2xl font-bold text-white tracking-tight">SaaS Subscription Plans</h1>
          <p className="text-sm text-gray-500 mt-1">Manage global subscription plans, limits, trial policies, and real-time pricing.</p>
        </div>
        <button
          onClick={fetchPlans}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/[0.02] transition-all"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh Plans
        </button>
      </div>

      {loading ? (
        <div className="py-24 text-center">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-500 mt-3">Loading SaaS configuration tiers...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((plan, i) => {
            const Icon = PLAN_ICONS[plan.planName] || Star;
            const color = PLAN_COLORS[plan.planName] || '#FFFFFF';
            const isPopular = plan.planName === 'Pro';

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`relative rounded-2xl border p-6 flex flex-col justify-between overflow-hidden transition-all ${
                  isPopular
                    ? 'border-emerald-500/30 bg-emerald-500/[0.02]'
                    : plan.isActive
                    ? 'border-white/[0.06] bg-[#0E1425]'
                    : 'border-white/[0.03] bg-white/[0.01] opacity-60'
                }`}
              >
                {isPopular && (
                  <div className="absolute top-0 right-0 bg-emerald-500 text-[9px] font-bold text-white uppercase px-3 py-1 rounded-bl-xl tracking-wider flex items-center gap-1 shadow-md">
                    <Sparkles size={10} />
                    Popular
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
                      <Icon size={18} style={{ color }} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">{plan.planName}</h3>
                      <p className="text-[10px] text-gray-500">
                        {plan.isActive ? 'Active Plan' : 'Inactive'} • {plan.trialDays}d Trial
                      </p>
                    </div>
                  </div>

                  <div className="mb-5 bg-white/[0.02] rounded-xl p-3.5 border border-white/[0.03]">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-extrabold text-white">
                        {plan.currency === 'USD' ? '$' : plan.currency === 'INR' ? '₹' : plan.currency}
                        {plan.monthlyPrice}
                      </span>
                      <span className="text-[10px] text-gray-500 font-medium">/mo</span>
                    </div>
                    <div className="flex items-baseline gap-1 mt-0.5 text-xs text-gray-400">
                      <span>Annual:</span>
                      <span className="font-semibold text-white">
                        {plan.currency === 'USD' ? '$' : plan.currency === 'INR' ? '₹' : plan.currency}
                        {plan.yearlyPrice}
                      </span>
                      <span className="text-[9px] text-gray-500">/ yr</span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-6">
                    <div className="flex items-center justify-between text-xs border-b border-white/[0.03] pb-1.5">
                      <span className="text-gray-500">User Seats</span>
                      <span className="font-semibold text-white">{plan.maxUsers === -1 || plan.maxUsers >= 100 ? 'Unlimited' : plan.maxUsers}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs border-b border-white/[0.03] pb-1.5">
                      <span className="text-gray-500">Branches</span>
                      <span className="font-semibold text-white">{plan.maxBranches === 0 ? 'Not Supported' : plan.maxBranches === -1 || plan.maxBranches >= 50 ? 'Unlimited' : plan.maxBranches}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Transactions/mo</span>
                      <span className="font-semibold text-white">
                        {plan.maxTransactionsPerMonth >= 100000 ? 'Unlimited' : plan.maxTransactionsPerMonth.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => openEdit(plan)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-xs font-bold text-white transition-all duration-200 mt-2"
                >
                  <Edit3 size={13} className="text-violet-400" />
                  Edit Configuration
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Editing Sliding Drawer / Modal */}
      <AnimatePresence>
        {editingPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingPlan(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 20 }}
              className="relative w-full max-w-md h-full bg-[#070C19] border-l border-white/[0.08] p-6 overflow-y-auto flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-white">Configure {planName}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Modify parameters, pricing, and resource allocation limits.</p>
                  </div>
                  <button onClick={() => setEditingPlan(null)} className="p-1.5 rounded-lg hover:bg-white/[0.04] text-gray-400 hover:text-white transition-all">
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Plan Name</label>
                    <input
                      type="text"
                      value={planName}
                      onChange={(e) => setPlanName(e.target.value)}
                      required
                      className="w-full bg-[#0E1425] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-all font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Monthly Price</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                          {currency === 'USD' ? '$' : currency === 'INR' ? '₹' : currency}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          value={monthlyPrice}
                          onChange={(e) => setMonthlyPrice(parseFloat(e.target.value) || 0)}
                          required
                          className="w-full bg-[#0E1425] border border-white/10 rounded-xl pl-7 pr-3.5 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Yearly Price</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                          {currency === 'USD' ? '$' : currency === 'INR' ? '₹' : currency}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          value={yearlyPrice}
                          onChange={(e) => setYearlyPrice(parseFloat(e.target.value) || 0)}
                          required
                          className="w-full bg-[#0E1425] border border-white/10 rounded-xl pl-7 pr-3.5 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Currency</label>
                      <input
                        type="text"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        required
                        className="w-full bg-[#0E1425] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Trial Duration (Days)</label>
                      <input
                        type="number"
                        value={trialDays}
                        onChange={(e) => setTrialDays(parseInt(e.target.value) || 0)}
                        required
                        className="w-full bg-[#0E1425] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Max Users</label>
                      <input
                        type="number"
                        value={maxUsers}
                        onChange={(e) => setMaxUsers(parseInt(e.target.value) || 0)}
                        required
                        className="w-full bg-[#0E1425] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Max Branches</label>
                      <input
                        type="number"
                        value={maxBranches}
                        onChange={(e) => setMaxBranches(parseInt(e.target.value) || 0)}
                        required
                        className="w-full bg-[#0E1425] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Max Tx / mo</label>
                      <input
                        type="number"
                        value={maxTransactions}
                        onChange={(e) => setMaxTransactions(parseInt(e.target.value) || 0)}
                        required
                        className="w-full bg-[#0E1425] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 rounded border-white/10 bg-[#0E1425] text-violet-500 focus:ring-violet-500 focus:ring-offset-0"
                    />
                    <label htmlFor="isActive" className="text-xs font-bold text-white cursor-pointer select-none">
                      Enable subscription tier active status
                    </label>
                  </div>
                </form>
              </div>

              <div className="flex items-center gap-3 pt-6 border-t border-white/[0.06] mt-6">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/[0.02] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white transition-all shadow-lg flex items-center justify-center gap-1.5"
                >
                  {saving && <RefreshCw size={12} className="animate-spin" />}
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
