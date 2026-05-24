'use client';

import { hexaTrackApi } from '@/lib/api';
import { showToast } from '@/components/ui/toast';

export interface QueuedTransaction {
  id: string;
  accountId: string;
  categoryId: string;
  type: 'Income' | 'Expense';
  amount: number;
  currency: string;
  merchant?: string;
  note?: string;
  occurredOn: string;
  tagNames?: string[];
  retryCount: number;
}

const OFFLINE_QUEUE_KEY = 'hexatrack.offline-queue.v1';

export const offlineQueue = {
  getQueue(): QueuedTransaction[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(OFFLINE_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveQueue(queue: QueuedTransaction[]): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.error('Failed to save offline queue', e);
    }
  },

  enqueue(tx: Omit<QueuedTransaction, 'id' | 'retryCount'>): QueuedTransaction {
    const queue = this.getQueue();
    const newTx: QueuedTransaction = {
      ...tx,
      id: `offline-${crypto.randomUUID()}`,
      retryCount: 0
    };
    queue.push(newTx);
    this.saveQueue(queue);
    return newTx;
  },

  remove(id: string): void {
    const queue = this.getQueue();
    const filtered = queue.filter(item => item.id !== id);
    this.saveQueue(filtered);
  },

  async processQueue(onSyncSuccess?: () => Promise<void>): Promise<void> {
    const queue = this.getQueue();
    if (queue.length === 0) return;

    // Guard if actually offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
    }

    showToast('success', `Syncing ${queue.length} offline transactions...`);

    const failed: QueuedTransaction[] = [];

    for (const tx of queue) {
      try {
        // 1. Resolve tags if present
        const tagIds =
          tx.tagNames && tx.tagNames.length
            ? await Promise.all(
                tx.tagNames.map(async (name) => {
                  try {
                    const tag = await hexaTrackApi.tags.upsert(name);
                    return tag.id;
                  } catch {
                    return '';
                  }
                })
              ).then(ids => ids.filter(Boolean))
            : [];

        // 2. Submit transaction to Server
        await hexaTrackApi.createTransaction({
          accountId: tx.accountId,
          categoryId: tx.categoryId,
          type: tx.type,
          amount: tx.amount,
          currency: tx.currency,
          merchant: tx.merchant,
          note: tx.note,
          occurredOn: tx.occurredOn,
          tagIds,
          idempotencyKey: tx.id,
        });
      } catch (err) {
        console.error(`Failed to sync transaction ${tx.id}`, err);
        tx.retryCount += 1;
        // Keep retrying unless it failed more than 5 times
        if (tx.retryCount < 5) {
          failed.push(tx);
        }
      }
    }

    this.saveQueue(failed);

    if (failed.length === 0) {
      showToast('success', 'All offline transactions synchronized perfectly!');
    } else {
      showToast('error', `Sync partially succeeded. ${failed.length} items queued for retry.`);
    }

    // Refresh the workspace store to align real server balances
    if (onSyncSuccess) {
      await onSyncSuccess();
    }
  }
};
