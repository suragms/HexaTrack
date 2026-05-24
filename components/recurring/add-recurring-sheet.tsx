import { X } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { useFinanceStore } from '@/store/finance-store';
import { useWorkspaceStore } from '@/store/workspace-store';
import type { RecurrenceFrequency, TransactionType } from '@/lib/types';
import { BottomSheet } from '@/components/ui/mobile-layout';

const recurringSchema = z.object({
  type: z.enum(['Income', 'Expense']),
  frequency: z.enum(['Daily', 'Weekly', 'Monthly', 'Yearly']),
  amount: z.coerce.number().positive('Enter an amount greater than zero'),
  accountId: z.string().min(1, 'Choose an account'),
  nextRunOn: z.string().min(1, 'Choose a start date'),
  endsOn: z.string().optional(),
  note: z.string().max(240).optional(),
});

type Errors = Partial<Record<keyof z.infer<typeof recurringSchema> | 'category' | 'subcategory', string>>;

export function AddRecurringSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const accounts = useFinanceStore((state) => state.accounts);
  const categories = useFinanceStore((state) => state.categories);
  const addRecurring = useFinanceStore((state) => state.addRecurring);
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const loading = useFinanceStore((state) => state.loading);
  const clearFinanceError = useFinanceStore((state) => state.clearError);
  const [type, setType] = useState<TransactionType>('Expense');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('Monthly');
  const [parentCategoryId, setParentCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [errors, setErrors] = useState<Errors>({});

  const filteredByType = useMemo(() => categories.filter((category) => category.type === type), [categories, type]);

  const rootCategories = useMemo(
    () => filteredByType.filter((category) => !category.parentCategoryId),
    [filteredByType],
  );

  const subcategories = useMemo(
    () => filteredByType.filter((category) => category.parentCategoryId === parentCategoryId),
    [filteredByType, parentCategoryId],
  );

  useEffect(() => {
    if (!open) return;
    setParentCategoryId((previous) => {
      const valid = rootCategories.some((c) => c.id === previous);
      if (valid && previous) return previous;
      return rootCategories[0]?.id ?? '';
    });
  }, [open, rootCategories]);

  useEffect(() => {
    if (!open || !parentCategoryId) return;
    setSubcategoryId((previous) => {
      if (subcategories.length === 0) return '';
      const valid = subcategories.some((c) => c.id === previous);
      if (valid && previous) return previous;
      return subcategories[0]?.id ?? '';
    });
  }, [open, parentCategoryId, subcategories]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = recurringSchema.safeParse({
      type,
      frequency,
      amount: formData.get('amount'),
      accountId: formData.get('accountId'),
      nextRunOn: formData.get('nextRunOn'),
      endsOn: formData.get('endsOn')?.toString(),
      note: formData.get('note')?.toString(),
    });

    if (!result.success) {
      setErrors(Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message])) as Errors);
      return;
    }

    const resolvedCategoryId =
      subcategories.length > 0 ? subcategoryId : parentCategoryId;

    if (!resolvedCategoryId) {
      setErrors({ category: 'Choose a category' });
      return;
    }

    if (subcategories.length > 0 && !subcategoryId) {
      setErrors({ subcategory: 'Choose a subcategory' });
      return;
    }

    const chosenAccount = accounts.find((a) => a.id === result.data.accountId);
    const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
    const resolvedCurrency = chosenAccount?.currency || activeWorkspace?.currency || 'INR';

    setErrors({});
    clearFinanceError();
    await addRecurring({
      accountId: result.data.accountId,
      categoryId: resolvedCategoryId,
      type: result.data.type,
      frequency: result.data.frequency,
      amount: result.data.amount,
      currency: resolvedCurrency,
      note: result.data.note,
      nextRunOn: result.data.nextRunOn,
      endsOn: result.data.endsOn,
    });
    if (useFinanceStore.getState().error) return;
    onOpenChange(false);
  }

  return (
    <BottomSheet open={open} onClose={() => onOpenChange(false)} labelledBy="add-recurring-title">
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-4 pt-3">
        <div>
          <p className="eyebrow">Automation</p>
          <h2 id="add-recurring-title" className="text-xl font-semibold text-[#F5F7FA]">
            Add recurring
          </h2>
        </div>
        <button aria-label="Close" className="icon-button" onClick={() => onOpenChange(false)} type="button">
          <X size={20} />
        </button>
      </div>

      {accounts.length === 0 || categories.length === 0 ? (
        <div className="mx-4 mb-4 rounded-2xl border border-white/[0.06] bg-[#0B1015] px-4 py-4 text-sm text-[#8B9BB4]">
          Load your workspace first (accounts/categories). If the API is down or you are not signed in, recurring schedules cannot be created.
        </div>
      ) : (
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={(e) => void handleSubmit(e)}>
          <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
            <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[#8B9BB4]">Type</span>
                <select className="field" onChange={(e) => setType(e.target.value as TransactionType)} value={type}>
                  <option value="Expense">Expense</option>
                  <option value="Income">Income</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[#8B9BB4]">Frequency</span>
                <select className="field" onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)} value={frequency}>
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[#8B9BB4]">Amount</span>
              <input className="field text-2xl font-semibold" inputMode="decimal" name="amount" placeholder="0.00" />
              {errors.amount && <span className="mt-1 block text-xs text-[#FF5C75]">{errors.amount}</span>}
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[#8B9BB4]">Account</span>
                <select className="field" defaultValue={accounts[0]?.id} name="accountId">
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
                {errors.accountId && <span className="mt-1 block text-xs text-[#FF5C75]">{errors.accountId}</span>}
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[#8B9BB4]">Category</span>
                <select
                  className="field"
                  name="parentCategoryId"
                  onChange={(event) => setParentCategoryId(event.target.value)}
                  value={parentCategoryId}
                >
                  {rootCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.category && <span className="mt-1 block text-xs text-[#FF5C75]">{errors.category}</span>}
              </label>
            </div>

            {subcategories.length > 0 ? (
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[#8B9BB4]">Subcategory</span>
                <select
                  className="field"
                  name="subcategoryId"
                  onChange={(event) => setSubcategoryId(event.target.value)}
                  value={subcategoryId}
                >
                  {subcategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.subcategory && <span className="mt-1 block text-xs text-[#FF5C75]">{errors.subcategory}</span>}
              </label>
            ) : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[#8B9BB4]">Start date</span>
                <input className="field" defaultValue={new Date().toISOString().slice(0, 10)} name="nextRunOn" type="date" />
                {errors.nextRunOn && <span className="mt-1 block text-xs text-[#FF5C75]">{errors.nextRunOn}</span>}
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[#8B9BB4]">Ends on (optional)</span>
                <input className="field" name="endsOn" type="date" />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[#8B9BB4]">Note</span>
              <textarea className="field min-h-20 resize-none" name="note" placeholder="Optional note" />
            </label>
          </div>

          <div className="keyboard-safe-padding shrink-0 border-t border-white/[0.06] bg-[#0B1015] px-4 pt-3">
            <button className="primary-button min-h-14 w-full py-4" disabled={loading} type="submit">
              {loading ? 'Working...' : 'Create schedule'}
            </button>
          </div>
        </form>
      )}
    </BottomSheet>
  );
}
