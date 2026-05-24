'use client';

import { X } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { z } from 'zod';
import { BottomSheet } from '@/components/ui/mobile-layout';
import { hexaTrackApi } from '@/lib/api';
import type { Workspace } from '@/lib/types';

const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(120),
  type: z.enum(['Personal', 'Business', 'Family']),
  currency: z.enum(['USD', 'INR', 'EUR', 'AED']),
});

type Errors = Partial<Record<keyof z.infer<typeof createWorkspaceSchema>, string>>;

type CreateWorkspaceModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (workspace: Workspace) => void | Promise<void>;
};

export function CreateWorkspaceModal({ open, onOpenChange, onCreated }: CreateWorkspaceModalProps) {
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = createWorkspaceSchema.safeParse({
      name: formData.get('name'),
      type: formData.get('type'),
      currency: formData.get('currency'),
    });

    if (!result.success) {
      setErrors(Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message])) as Errors);
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      const workspace = await hexaTrackApi.workspaces.create({
        name: result.data.name,
        type: result.data.type,
        currency: result.data.currency,
      });
      await Promise.resolve(onCreated(workspace));
      onOpenChange(false);
    } catch {
      setErrors({ name: 'Could not create workspace. Try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={() => onOpenChange(false)} labelledBy="create-workspace-title">
      <div className="fintech-clean flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-4 pt-3">
          <div>
            <p className="eyebrow">Workspace</p>
            <h2 id="create-workspace-title" className="text-xl font-bold text-[#F5F7FA]">
              New workspace
            </h2>
          </div>
          <button aria-label="Close" className="icon-button" onClick={() => onOpenChange(false)} type="button">
            <X size={20} />
          </button>
        </div>

        <form className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]" onSubmit={(e) => void handleSubmit(e)}>
          <label className="block text-sm font-medium text-[#F5F7FA]">
            Name
            <input
              autoComplete="organization"
              className="field mt-2 text-base animate-none"
              defaultValue=""
              name="name"
              placeholder="e.g. Freelance"
              type="text"
            />
            {errors.name ? <p className="mt-1 text-sm text-[#FF5C75]">{errors.name}</p> : null}
          </label>

          <label className="block text-sm font-medium text-[#F5F7FA]">
            Type
            <select
              className="field mt-2 text-base animate-none"
              defaultValue="Personal"
              name="type"
            >
              <option value="Personal">Personal</option>
              <option value="Business">Business</option>
              <option value="Family">Family</option>
            </select>
            {errors.type ? <p className="mt-1 text-sm text-[#FF5C75]">{errors.type}</p> : null}
          </label>

          <label className="block text-sm font-medium text-[#F5F7FA]">
            Currency
            <select
              className="field mt-2 text-base animate-none"
              defaultValue="USD"
              name="currency"
            >
              <option value="USD">USD</option>
              <option value="INR">INR</option>
              <option value="EUR">EUR</option>
              <option value="AED">AED</option>
            </select>
            {errors.currency ? <p className="mt-1 text-sm text-[#FF5C75]">{errors.currency}</p> : null}
          </label>

          <button
            className="primary-button mt-2 w-full min-h-[44px]"
            disabled={submitting}
            type="submit"
          >
            {submitting ? 'Creating…' : 'Create workspace'}
          </button>
        </form>
      </div>
    </BottomSheet>
  );
}
