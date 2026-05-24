'use client';

import React from 'react';
import { useBranchAccounts } from '@/hooks/use-accounts';
import { useCategories } from '@/hooks/use-categories';
import { Loader2, AlertCircle, Plus } from 'lucide-react';
import { money } from '@/lib/format';
import type { TransactionType } from '@/lib/types';

interface AccountSelectorProps {
  value: string;
  onChange: (value: string) => void;
  branchId?: string;
  className?: string;
  disabled?: boolean;
}

export function AccountSelector({ value, onChange, branchId, className, disabled }: AccountSelectorProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const { data: accounts, isLoading, error } = useBranchAccounts(branchId);

  if (!mounted || isLoading) {
    return (
      <div className="flex h-12 items-center gap-2 rounded-xl border border-white/[0.06] bg-[#121A22] px-4 text-sm font-medium text-[#8B9BB4]">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading accounts...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-12 items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 text-sm font-medium text-red-400">
        <AlertCircle className="h-4 w-4" />
        <span>Error loading accounts</span>
      </div>
    );
  }

  if (!accounts || accounts.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex h-12 items-center justify-between rounded-xl border border-dashed border-white/10 bg-[#121A22] px-4 text-xs font-medium text-[#8B9BB4]">
          <span>No branch accounts available.</span>
        </div>
        <button
          type="button"
          onClick={() => window.location.href = '/owner/accounts'}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#4F8CFF]/10 py-2 text-xs font-bold text-[#4F8CFF] hover:bg-[#4F8CFF]/20"
        >
          <Plus size={12} /> Create Account
        </button>
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`input-finance w-full bg-[#121A22] text-white ${className || ''}`}
    >
      <option value="" disabled>Select Account</option>
      {accounts.map((acc) => (
        <option key={acc.id} value={acc.id}>
          {acc.name} • {money(acc.balance, acc.currency)}
        </option>
      ))}
    </select>
  );
}

interface CategorySelectorProps {
  value: string;
  onChange: (value: string) => void;
  type: TransactionType;
  branchId?: string;
  className?: string;
  disabled?: boolean;
}

export function CategorySelector({ value, onChange, type, branchId, className, disabled }: CategorySelectorProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const { data: categories, isLoading, error } = useCategories({ branchId, type });

  if (!mounted || isLoading) {
    return (
      <div className="flex h-12 items-center gap-2 rounded-xl border border-white/[0.06] bg-[#121A22] px-4 text-sm font-medium text-[#8B9BB4]">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading categories...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-12 items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 text-sm font-medium text-red-400">
        <AlertCircle className="h-4 w-4" />
        <span>Error fetching categories</span>
      </div>
    );
  }

  if (!categories || categories.length === 0) {
    return (
      <select
        value=""
        disabled
        className={`input-finance w-full bg-[#121A22] opacity-60 ${className || ''}`}
      >
        <option>No categories defined.</option>
      </select>
    );
  }

  // Organize into hierarchical structure (Parent -> Children)
  const parentCategories = categories.filter(c => !c.parentCategoryId);
  
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`input-finance w-full bg-[#121A22] text-white ${className || ''}`}
    >
      <option value="" disabled>Select Category</option>
      {parentCategories.map((parent) => {
        const children = categories.filter(c => c.parentCategoryId === parent.id);
        if (children.length === 0) {
          return <option key={parent.id} value={parent.id}>{parent.name}</option>;
        }
        return (
          <optgroup key={parent.id} label={parent.name}>
            {children.map((child) => (
              <option key={child.id} value={child.id}>{child.name}</option>
            ))}
          </optgroup>
        );
      })}
    </select>
  );
}

export const PAYMENT_METHODS = [
  { id: 'Cash', label: 'Cash' },
  { id: 'UPI', label: 'UPI' },
  { id: 'Bank Transfer', label: 'Bank Transfer' },
  { id: 'Credit Card', label: 'Credit Card' },
  { id: 'Debit Card', label: 'Debit Card' },
  { id: 'Wallet', label: 'Wallet' },
];

interface PaymentMethodSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export function PaymentMethodSelector({ value, onChange, className, disabled }: PaymentMethodSelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`input-finance w-full bg-[#121A22] text-white ${className || ''}`}
    >
      <option value="" disabled>Select Method</option>
      {PAYMENT_METHODS.map((method) => (
        <option key={method.id} value={method.id}>
          {method.label}
        </option>
      ))}
    </select>
  );
}
