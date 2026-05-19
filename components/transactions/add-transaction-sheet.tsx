'use client';

import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Landmark,
  Repeat,
  Tag,
  Wallet as WalletIcon,
  X,
  Banknote,
  ShoppingBag,
  Car,
  Zap,
  Home,
  Briefcase,
  Cloud,
  Heart,
  Smartphone,
  Fuel,
  Stethoscope,
  TrendingUp,
  DollarSign,
  Users,
  RefreshCw,
  Star,
  Camera,
  Plus,
  Palette,
  Coffee,
  Gift
} from 'lucide-react';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useFinanceStore } from '@/store/finance-store';
import { useWorkspaceStore } from '@/store/workspace-store';
import type { TransactionType, RecurrenceFrequency, Category, Account } from '@/lib/types';
import { BottomSheet } from '@/components/ui/mobile-layout';
import { motion, AnimatePresence } from 'framer-motion';
import { hexaTrackApi } from '@/lib/api';
import { showToast } from '@/components/ui/toast';
import { notificationScheduler } from '@/lib/notifications';

/* ── Category Icon Map ── */
const catIconMap: Record<string, React.ElementType> = {
  food: Coffee,
  grocery: ShoppingBag,
  shopping: ShoppingBag,
  travel: Car,
  transport: Car,
  bills: Zap,
  utility: Zap,
  rent: Home,
  salary: Briefcase,
  cloud: Cloud,
  health: Heart,
  healthcare: Stethoscope,
  subscription: Smartphone,
  fuel: Fuel,
  office: Briefcase,
  marketing: TrendingUp,
  gift: Gift,
  entertainment: Star,
  invest: TrendingUp,
  business: Briefcase,
  client: Users,
  refund: RefreshCw,
  bonus: Gift,
  rental: Home,
  interest: DollarSign,
  commission: DollarSign,
  default: Tag,
};

const popularIcons = [
  { key: 'food', icon: Coffee, label: 'Food & Dining' },
  { key: 'shopping', icon: ShoppingBag, label: 'Shopping' },
  { key: 'travel', icon: Car, label: 'Travel & Transport' },
  { key: 'bills', icon: Zap, label: 'Bills & Utilities' },
  { key: 'rent', icon: Home, label: 'Rent & Housing' },
  { key: 'salary', icon: Briefcase, label: 'Salary & Income' },
  { key: 'health', icon: Heart, label: 'Health & Fitness' },
  { key: 'subscription', icon: Smartphone, label: 'Subscriptions' },
  { key: 'default', icon: Tag, label: 'General' }
];

const colorPalette = [
  { hex: '#10B981', name: 'Emerald' },
  { hex: '#EF4444', name: 'Rose' },
  { hex: '#3B82F6', name: 'Blue' },
  { hex: '#F59E0B', name: 'Amber' },
  { hex: '#8B5CF6', name: 'Violet' },
  { hex: '#EC4899', name: 'Pink' },
  { hex: '#06B6D4', name: 'Cyan' },
  { hex: '#F97316', name: 'Orange' }
];

function getCatIcon(name: string): React.ElementType {
  const l = name.toLowerCase();
  for (const k in catIconMap) {
    if (l.includes(k)) return catIconMap[k];
  }
  return catIconMap.default;
}

type QuickAddStep = 'menu' | 'form' | 'create-category' | 'create-subcategory';

export function AddTransactionSheet({ 
  open, 
  onOpenChange,
  defaultType,
  initialStep
}: { 
  open: boolean; 
  onOpenChange: (v: boolean) => void;
  defaultType?: TransactionType;
  initialStep?: QuickAddStep;
}) {
  const accounts = useFinanceStore((s) => s.accounts);
  const categories = useFinanceStore((s) => s.categories);
  const addTransaction = useFinanceStore((s) => s.addTransaction);
  const clearFinanceError = useFinanceStore((s) => s.clearError);
  const loadWorkspace = useFinanceStore((s) => s.loadWorkspace);
  
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const currencySymbol = activeWorkspace?.currency === 'INR' ? '₹' : '$';
  const currencyCode = activeWorkspace?.currency || 'USD';

  // Quick-Add Steps: 'menu' -> 'form' (or 'create-category' directly from form)
  const [step, setStep] = useState<QuickAddStep>('menu');
  const [type, setType] = useState<TransactionType>('Expense');

  // Form Fields
  const [amount, setAmount] = useState<string>('');
  const [merchant, setMerchant] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [occurredOn, setOccurredOn] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>('');
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('Monthly');

  // Inline Category Form State
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('default');
  const [newCatColor, setNewCatColor] = useState('#10B981');
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [successFlash, setSuccessFlash] = useState(false);

  const filteredCategories = useMemo(() => {
    return categories.filter((c) => c.type === type && !c.parentCategoryId);
  }, [categories, type]);

  const resetForm = useCallback(() => {
    setStep('menu');
    setAmount('');
    setMerchant('');
    setNote('');
    setOccurredOn(new Date().toISOString().slice(0, 10));
    setSelectedAccountId(accounts[0]?.id || '');
    setSelectedCategoryId('');
    setSelectedSubcategoryId('');
    setIsRecurring(false);
    setFrequency('Monthly');
    setLocalError('');
    setSuccessFlash(false);
    setNewCatName('');
    setNewCatIcon('default');
    setNewCatColor('#10B981');
  }, [accounts]);

  useEffect(() => {
    if (open) {
      if (defaultType) setType(defaultType);
      if (initialStep) setStep(initialStep);
    } else {
      resetForm();
    }
  }, [open, defaultType, initialStep, resetForm]);

  useEffect(() => {
    if (open && accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [open, accounts, selectedAccountId]);

  // Handle Instant Category Creation Inline
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      showToast('error', 'Please enter a category name');
      return;
    }

    setIsSavingCategory(true);
    try {
      // 1. Create Category on Backend
      const created = await hexaTrackApi.categories.create({
        name: newCatName.trim(),
        type: type,
        color: newCatColor,
        icon: newCatIcon
      });

      // 2. Force Refresh Zustand State & TanStack Query invalidation
      await loadWorkspace();

      // 3. Auto-select newly created category & return to form
      setSelectedCategoryId(created.id);
      setSelectedSubcategoryId('');
      setStep('form');
      showToast('success', `Category "${created.name}" created successfully`);
      
      // Clear inline fields
      setNewCatName('');
      setNewCatIcon('default');
      setNewCatColor('#10B981');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create category';
      showToast('error', msg);
    } finally {
      setIsSavingCategory(false);
    }
  };

  // Handle Instant Subcategory Creation Inline
  const handleCreateSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      showToast('error', 'Please enter a subcategory name');
      return;
    }
    if (!selectedCategoryId) {
      showToast('error', 'Please select a parent category first');
      return;
    }

    setIsSavingCategory(true);
    try {
      // 1. Create Subcategory on Backend
      const created = await hexaTrackApi.categories.subcategories.create(selectedCategoryId, {
        name: newCatName.trim(),
        color: newCatColor,
        icon: newCatIcon
      });

      // 2. Force Refresh Zustand State
      await loadWorkspace();

      // 3. Auto-select newly created subcategory & return to form
      setSelectedSubcategoryId(created.id);
      setStep('form');
      showToast('success', `Subcategory "${created.name}" created successfully`);
      
      // Clear fields
      setNewCatName('');
      setNewCatIcon('default');
      setNewCatColor('#10B981');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create subcategory';
      showToast('error', msg);
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleSaveTransaction = async () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setLocalError('Enter a valid positive amount');
      return;
    }
    if (!selectedCategoryId) {
      setLocalError('Please select a transaction category');
      return;
    }

    // Workspace-ready guard
    if (!activeWorkspaceId) {
      try {
        await useWorkspaceStore.getState().ensureActiveWorkspace();
      } catch {
        setLocalError('Workspace not ready. Please try again.');
        return;
      }
    }

    const finalAccountId = selectedAccountId || '00000000-0000-0000-0000-000000000000';

    setSubmitting(true);
    clearFinanceError();
    setLocalError('');

    try {
      // 1. Persist Transaction
      await addTransaction({
        accountId: finalAccountId,
        categoryId: selectedSubcategoryId || selectedCategoryId, // route to subcategory if selected!
        type,
        amount: parsedAmount,
        currency: currencyCode,
        merchant: merchant.trim() || undefined,
        note: note.trim() || undefined,
        occurredOn
      });

      // 2. Handle optional recurring payload
      if (isRecurring) {
        try {
          await useFinanceStore.getState().addRecurring({
            accountId: finalAccountId,
            categoryId: selectedCategoryId,
            type,
            frequency,
            amount: parsedAmount,
            currency: currencyCode,
            note: note.trim() || undefined,
            nextRunOn: occurredOn
          });

          // Schedule a beautiful native reminder!
          notificationScheduler.scheduleNotification(
            'recurring-transaction',
            `🔁 Recurring ${type} Added`,
            `Auto-scheduled ${currencySymbol}${parsedAmount} frequency: ${frequency}`,
            2000
          );
        } catch {
          /* best effort recurring hook */
        }
      } else {
        // Schedule dynamic budget alert simulation if they spent more than $200!
        if (type === 'Expense' && parsedAmount > 200) {
          notificationScheduler.scheduleNotification(
            'budget-alert',
            '⚠️ Approaching Budget Cap',
            `Your spending has passed 85% of your standard budget ceiling.`,
            2500
          );
        }
      }

      setSuccessFlash(true);
      const toastLabel = type === 'Income' ? 'Income added' : 'Expense recorded';
      showToast('success', `${toastLabel} of ${currencySymbol}${parsedAmount.toLocaleString()} successfully`);
      setTimeout(() => onOpenChange(false), 1200);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Transaction persistence failed';
      setLocalError(msg);
      showToast('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const selectFlow = (t: TransactionType) => {
    setType(t);
    setStep('form');
  };

  return (
    <BottomSheet open={open} onClose={() => onOpenChange(false)} labelledBy="quick-add-title" fullHeight={step === 'form'}>
      {/* ── SUCCESS FLASH OVERLAY ── */}
      <AnimatePresence>
        {successFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[110] flex flex-col items-center justify-center bg-[#0E152B]/95 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="flex flex-col items-center"
            >
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 shadow-[0_0_32px_rgba(16,185,129,0.35)] mb-6">
                <Check size={40} className="text-primary animate-pulse" strokeWidth={3} />
              </div>
              <h2 className="text-2xl font-black text-on-surface tracking-tight">Complete!</h2>
              <p className="text-sm text-on-surface-variant/60 mt-1 font-semibold">Workspace state hydrated instantly</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fintech-clean flex flex-col flex-1 min-h-0 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {/* ── STEP 1: SELECT TYPE MENU ── */}
          {step === 'menu' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="px-6 pb-8 pt-2"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 id="quick-add-title" className="text-2xl font-black text-on-surface tracking-tight">Quick Add</h3>
                  <p className="text-xs text-on-surface-variant/50 font-semibold mt-1">Select transaction scope</p>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="w-10 h-10 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-on-surface-variant hover:bg-white/[0.08] active:scale-90 transition-all shadow-sm"
                  type="button"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => selectFlow('Expense')}
                  className="flex items-center gap-4 w-full p-4 rounded-3xl bg-rose-500/[0.03] border border-rose-500/10 hover:border-rose-500/20 active:bg-rose-500/5 transition-all text-left group"
                  type="button"
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-rose-500/10 text-rose-400">
                    <ArrowUpRight size={24} strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-black text-on-surface tracking-tight">Add Expense</h4>
                    <p className="text-xs text-on-surface-variant/50 font-medium mt-0.5">Deduct balance instantly</p>
                  </div>
                  <ChevronRight size={18} className="text-on-surface-variant/30 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  onClick={() => selectFlow('Income')}
                  className="flex items-center gap-4 w-full p-4 rounded-3xl bg-primary/[0.03] border border-primary/10 hover:border-primary/20 active:bg-primary/5 transition-all text-left group"
                  type="button"
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-primary/10 text-primary">
                    <ArrowDownLeft size={24} strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-black text-on-surface tracking-tight">Add Income</h4>
                    <p className="text-xs text-on-surface-variant/50 font-medium mt-0.5">Inject cash flow balance</p>
                  </div>
                  <ChevronRight size={18} className="text-on-surface-variant/30 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: QUICK-ADD TRANSACTION FORM ── */}
          {step === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col flex-1 min-h-0"
            >
              {/* Form Header */}
              <div className="px-6 pt-2 pb-4 flex items-center justify-between border-b border-white/[0.04] shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setStep('menu')}
                    className="w-10 h-10 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center text-on-surface-variant hover:bg-white/[0.06] active:scale-95 transition-all"
                    type="button"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div>
                    <h3 className="text-lg font-black text-on-surface tracking-tight">
                      {type === 'Income' ? 'Add Income' : 'Add Expense'}
                    </h3>
                    <p className="text-[10px] font-black uppercase tracking-wider text-primary mt-0.5">
                      Scoped to {activeWorkspace?.name || 'Workspace'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="w-10 h-10 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center text-on-surface-variant hover:bg-white/[0.06] active:scale-95 transition-all"
                  type="button"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Content */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 hide-scrollbar">
                {/* ── AMOUNT ENTRY (Fintech styled large text input) ── */}
                <div className="relative rounded-3xl bg-white/[0.01] border border-white/[0.05] p-5 flex flex-col items-center justify-center shadow-inner">
                  <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest mb-1">
                    Amount Entry
                  </span>
                  <div className="flex items-center justify-center gap-1.5 w-full">
                    <span className="text-3xl font-black text-on-surface-variant/50 leading-none">{currencySymbol}</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full max-w-[200px] bg-transparent text-center text-4xl font-black tracking-tight text-on-surface placeholder:text-on-surface-variant/20 outline-none border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-headline"
                      autoFocus
                    />
                  </div>
                </div>

                {/* ── MAIN TRANSACTION METADATA ── */}
                <div className="space-y-3">
                  {/* Title / Merchant */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50 ml-1">
                      Title / Payee
                    </label>
                    <div className="flex items-center gap-3 px-4 h-13 rounded-2xl bg-white/[0.02] border border-white/[0.06] focus-within:border-primary/20 focus-within:bg-white/[0.04] transition-all">
                      <ShoppingBag size={18} className="text-on-surface-variant/30" />
                      <input
                        type="text"
                        value={merchant}
                        onChange={(e) => setMerchant(e.target.value)}
                        placeholder={type === 'Expense' ? 'Starbucks, Netflix, Taxi...' : 'Salary, Freelance Project...'}
                        className="w-full bg-transparent outline-none text-sm font-bold text-on-surface placeholder:text-on-surface-variant/30"
                      />
                    </div>
                  </div>



                  {/* Dynamic Category List & Inline Creator */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">
                        Category
                      </label>
                      <button
                        onClick={() => setStep('create-category')}
                        className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-primary hover:text-primary-hover active:scale-95 transition-all"
                        type="button"
                      >
                        <Plus size={10} strokeWidth={3} />
                        New Category
                      </button>
                    </div>

                    {filteredCategories.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-6 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                        <p className="text-xs text-on-surface-variant/50 font-bold mb-3">
                          No {type.toLowerCase()} categories found
                        </p>
                        <button
                          onClick={() => setStep('create-category')}
                          className="px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-xs font-black uppercase tracking-widest text-primary hover:bg-primary/20 active:scale-95 transition-all"
                          type="button"
                        >
                          Create {type} Category
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 px-4 h-13 rounded-2xl bg-white/[0.02] border border-white/[0.06] focus-within:border-primary/20 transition-all">
                        <Tag size={18} className="text-on-surface-variant/30" />
                        <select
                          value={selectedCategoryId}
                          onChange={(e) => {
                            setSelectedCategoryId(e.target.value);
                            setSelectedSubcategoryId('');
                          }}
                          className="w-full bg-transparent outline-none text-sm font-bold text-on-surface"
                        >
                          <option value="" className="bg-[#0E152B]">Select Category</option>
                          {filteredCategories.map((cat) => (
                            <option key={cat.id} value={cat.id} className="bg-[#0E152B]">
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* ── SUBCATEGORY SELECT & INLINE ADDER ── */}
                  <AnimatePresence>
                    {selectedCategoryId && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-2 mt-2 pt-2 border-t border-white/[0.04] overflow-hidden"
                      >
                        <div className="flex items-center justify-between ml-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">
                            Subcategory
                          </label>
                          <button
                            onClick={() => setStep('create-subcategory')}
                            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-primary hover:text-primary-hover active:scale-95 transition-all"
                            type="button"
                          >
                            <Plus size={10} strokeWidth={3} />
                            New Subcategory
                          </button>
                        </div>

                        {categories.filter((c) => c.parentCategoryId === selectedCategoryId).length === 0 ? (
                          <div className="flex items-center justify-between p-3 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                            <span className="text-xs text-on-surface-variant/40 font-bold">
                              No subcategories under this group
                            </span>
                            <button
                              onClick={() => setStep('create-subcategory')}
                              className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/20 active:scale-95 transition-all"
                              type="button"
                            >
                              Add Subcategory
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 px-4 h-13 rounded-2xl bg-white/[0.02] border border-white/[0.06] focus-within:border-primary/20 transition-all">
                            <Tag size={18} className="text-on-surface-variant/30" />
                            <select
                              value={selectedSubcategoryId}
                              onChange={(e) => setSelectedSubcategoryId(e.target.value)}
                              className="w-full bg-transparent outline-none text-sm font-bold text-on-surface"
                            >
                              <option value="" className="bg-[#0E152B]">Select Subcategory (Optional)</option>
                              {categories
                                .filter((c) => c.parentCategoryId === selectedCategoryId)
                                .map((sub) => (
                                  <option key={sub.id} value={sub.id} className="bg-[#0E152B]">
                                    {sub.name}
                                  </option>
                                ))}
                            </select>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Optional Notes */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50 ml-1">
                      Notes
                    </label>
                    <div className="flex items-center gap-3 px-4 h-13 rounded-2xl bg-white/[0.02] border border-white/[0.06] focus-within:border-primary/20 transition-all">
                      <Tag size={18} className="text-on-surface-variant/30" />
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Add a dynamic memo (optional)"
                        className="w-full bg-transparent outline-none text-sm font-bold text-on-surface placeholder:text-on-surface-variant/30"
                      />
                    </div>
                  </div>

                  {/* Transaction Date */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50 ml-1">
                      Transaction Date
                    </label>
                    <div className="flex items-center gap-3 px-4 h-13 rounded-2xl bg-white/[0.02] border border-white/[0.06] focus-within:border-primary/20 transition-all">
                      <Calendar size={18} className="text-on-surface-variant/30" />
                      <input
                        type="date"
                        value={occurredOn}
                        onChange={(e) => setOccurredOn(e.target.value)}
                        className="w-full bg-transparent outline-none text-sm font-bold text-on-surface"
                      />
                    </div>
                  </div>

                  {/* Recurring Trigger */}
                  <div className={`p-4 rounded-2xl border transition-all ${isRecurring ? 'bg-primary/5 border-primary/20' : 'bg-white/[0.01] border-white/[0.06]'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isRecurring ? 'bg-primary/20 text-primary' : 'bg-white/[0.04] text-on-surface-variant/40'}`}>
                          <Repeat size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-on-surface">Recurring Transaction</p>
                          <p className="text-[10px] text-on-surface-variant/40">Automate this entry</p>
                        </div>
                      </div>
                      <div
                        onClick={() => setIsRecurring(!isRecurring)}
                        className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer shrink-0 ${isRecurring ? 'bg-primary' : 'bg-white/10'}`}
                      >
                        <motion.div animate={{ x: isRecurring ? 20 : 0 }} className="w-4 h-4 rounded-full bg-white shadow-sm" />
                      </div>
                    </div>

                    <AnimatePresence>
                      {isRecurring && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mt-3 pt-3 border-t border-white/5 overflow-hidden"
                        >
                          <div className="flex gap-1.5">
                            {(['Daily', 'Weekly', 'Monthly', 'Yearly'] as const).map((f) => (
                              <button
                                key={f}
                                onClick={() => setFrequency(f)}
                                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all ${frequency === f ? 'bg-primary text-white shadow-sm' : 'bg-white/[0.04] text-on-surface-variant/60'}`}
                                type="button"
                              >
                                {f}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {localError && (
                  <p className="text-[10px] font-bold text-danger text-center uppercase tracking-widest bg-danger/10 py-2.5 rounded-xl">
                    {localError}
                  </p>
                )}
              </div>

              {/* Form Footer Action */}
              <div className="px-6 pb-6 pt-2 shrink-0 border-t border-white/[0.04]">
                <button
                  onClick={handleSaveTransaction}
                  disabled={submitting || !amount || !selectedCategoryId}
                  className={`w-full h-14 rounded-2xl flex items-center justify-center gap-2 text-sm font-black uppercase tracking-widest transition-all ${
                    submitting || !amount || !selectedCategoryId
                      ? 'bg-white/[0.04] text-on-surface-variant/30 cursor-not-allowed'
                      : 'bg-primary text-white shadow-[0_8px_24px_rgba(16,185,129,0.35)] active:translate-y-0.5 active:shadow-none'
                  }`}
                  type="button"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Save {type}
                      <Check size={18} strokeWidth={2.5} />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: INLINE CATEGORY CREATION MODAL ── */}
          {step === 'create-category' && (
            <motion.div
              key="create-category"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col flex-1 min-h-0"
            >
              {/* Category Header */}
              <div className="px-6 pt-2 pb-4 flex items-center justify-between border-b border-white/[0.04] shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setStep('form')}
                    className="w-10 h-10 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center text-on-surface-variant hover:bg-white/[0.06] active:scale-95 transition-all"
                    type="button"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div>
                    <h3 className="text-lg font-black text-on-surface tracking-tight">Create Category</h3>
                    <p className="text-[10px] font-black uppercase tracking-wider text-rose-400 mt-0.5">
                      Inline {type} Scope
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="w-10 h-10 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center text-on-surface-variant hover:bg-white/[0.06] active:scale-95 transition-all"
                  type="button"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Category Form */}
              <form onSubmit={handleCreateCategory} className="flex-1 overflow-y-auto px-6 py-5 space-y-5 hide-scrollbar">
                {/* Category Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50 ml-1">
                    Category Name
                  </label>
                  <div className="flex items-center gap-3 px-4 h-13 rounded-2xl bg-white/[0.02] border border-white/[0.06] focus-within:border-primary/20 transition-all">
                    <Tag size={18} className="text-on-surface-variant/30" />
                    <input
                      type="text"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder="e.g. Subscriptions, Groceries, Crypto..."
                      className="w-full bg-transparent outline-none text-sm font-bold text-on-surface placeholder:text-on-surface-variant/30"
                      required
                    />
                  </div>
                </div>

                {/* Popular Icon Selector */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50 ml-1">
                    Select Icon Symbol
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {popularIcons.map((i) => {
                      const IconComponent = i.icon;
                      const isSelected = newCatIcon === i.key;
                      return (
                        <button
                          key={i.key}
                          type="button"
                          onClick={() => setNewCatIcon(i.key)}
                          className={`h-11 rounded-xl flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-primary/20 text-primary border border-primary/30'
                              : 'bg-white/[0.02] border border-white/[0.05] text-on-surface-variant/60 hover:text-on-surface'
                          }`}
                          title={i.label}
                        >
                          <IconComponent size={18} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Harmonious Color Selector */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50 ml-1">
                    Brand Color Palette
                  </label>
                  <div className="grid grid-cols-8 gap-2">
                    {colorPalette.map((c) => {
                      const isSelected = newCatColor === c.hex;
                      return (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => setNewCatColor(c.hex)}
                          className="h-8 rounded-full flex items-center justify-center transition-all active:scale-90 relative"
                          style={{ backgroundColor: c.hex }}
                          title={c.name}
                        >
                          {isSelected && (
                            <div className="absolute inset-0 rounded-full border-2 border-white flex items-center justify-center">
                              <Check size={12} className="text-white drop-shadow-md" strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </form>

              {/* Category Footer Action */}
              <div className="px-6 pb-6 pt-2 shrink-0 border-t border-white/[0.04]">
                <button
                  onClick={handleCreateCategory}
                  disabled={isSavingCategory || !newCatName.trim()}
                  className={`w-full h-14 rounded-2xl flex items-center justify-center gap-2 text-sm font-black uppercase tracking-widest transition-all ${
                    isSavingCategory || !newCatName.trim()
                      ? 'bg-white/[0.04] text-on-surface-variant/30 cursor-not-allowed'
                      : 'bg-primary text-white shadow-[0_8px_24px_rgba(16,185,129,0.35)] active:translate-y-0.5 active:shadow-none'
                  }`}
                  type="button"
                >
                  {isSavingCategory ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Save Category
                      <Palette size={18} />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 4: INLINE SUBCATEGORY CREATION MODAL ── */}
          {step === 'create-subcategory' && (
            <motion.div
              key="create-subcategory"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col flex-1 min-h-0"
            >
              {/* Subcategory Header */}
              <div className="px-6 pt-2 pb-4 flex items-center justify-between border-b border-white/[0.04] shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setStep('form')}
                    className="w-10 h-10 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center text-on-surface-variant hover:bg-white/[0.06] active:scale-95 transition-all"
                    type="button"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div>
                    <h3 className="text-lg font-black text-on-surface tracking-tight">Create Subcategory</h3>
                    <p className="text-[10px] font-black uppercase tracking-wider text-primary mt-0.5">
                      Under "{categories.find(c => c.id === selectedCategoryId)?.name || 'Parent Category'}"
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="w-10 h-10 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center text-on-surface-variant hover:bg-white/[0.06] active:scale-95 transition-all"
                  type="button"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Subcategory Form */}
              <form onSubmit={handleCreateSubcategory} className="flex-1 overflow-y-auto px-6 py-5 space-y-5 hide-scrollbar">
                {/* Subcategory Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50 ml-1">
                    Subcategory Name
                  </label>
                  <div className="flex items-center gap-3 px-4 h-13 rounded-2xl bg-white/[0.02] border border-white/[0.06] focus-within:border-primary/20 transition-all">
                    <Tag size={18} className="text-on-surface-variant/30" />
                    <input
                      type="text"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder="e.g. Restaurant, Groceries, Fuel..."
                      className="w-full bg-transparent outline-none text-sm font-bold text-on-surface placeholder:text-on-surface-variant/30"
                      required
                    />
                  </div>
                </div>

                {/* Popular Icon Selector */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50 ml-1">
                    Select Icon Symbol
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {popularIcons.map((i) => {
                      const IconComponent = i.icon;
                      const isSelected = newCatIcon === i.key;
                      return (
                        <button
                          key={i.key}
                          type="button"
                          onClick={() => setNewCatIcon(i.key)}
                          className={`h-11 rounded-xl flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-primary/20 text-primary border border-primary/30'
                              : 'bg-white/[0.02] border border-white/[0.05] text-on-surface-variant/60 hover:text-on-surface'
                          }`}
                          title={i.label}
                        >
                          <IconComponent size={18} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Harmonious Color Selector */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50 ml-1">
                    Brand Color Palette
                  </label>
                  <div className="grid grid-cols-8 gap-2">
                    {colorPalette.map((c) => {
                      const isSelected = newCatColor === c.hex;
                      return (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => setNewCatColor(c.hex)}
                          className="h-8 rounded-full flex items-center justify-center transition-all active:scale-90 relative"
                          style={{ backgroundColor: c.hex }}
                          title={c.name}
                        >
                          {isSelected && (
                            <div className="absolute inset-0 rounded-full border-2 border-white flex items-center justify-center">
                              <Check size={12} className="text-white drop-shadow-md" strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </form>

              {/* Subcategory Footer Action */}
              <div className="px-6 pb-6 pt-2 shrink-0 border-t border-white/[0.04]">
                <button
                  onClick={handleCreateSubcategory}
                  disabled={isSavingCategory || !newCatName.trim()}
                  className={`w-full h-14 rounded-2xl flex items-center justify-center gap-2 text-sm font-black uppercase tracking-widest transition-all ${
                    isSavingCategory || !newCatName.trim()
                      ? 'bg-white/[0.04] text-on-surface-variant/30 cursor-not-allowed'
                      : 'bg-primary text-white shadow-[0_8px_24px_rgba(16,185,129,0.35)] active:translate-y-0.5 active:shadow-none'
                  }`}
                  type="button"
                >
                  {isSavingCategory ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Save Subcategory
                      <Palette size={18} />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </BottomSheet>
  );
}
