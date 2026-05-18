'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect, ReactNode } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { useWorkspaceStore } from '@/store/workspace-store';

export default function QueryProvider({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  // Listen for finance store invalidation events to keep TanStack Query caches
  // in sync after Zustand-driven mutations (transactions, income, expenses).
  useEffect(() => {
    function handleInvalidate() {
      // Invalidate all finance-related query keys
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['recurring'] });
    }

    window.addEventListener('hexatrack:invalidate-queries', handleInvalidate);
    return () => window.removeEventListener('hexatrack:invalidate-queries', handleInvalidate);
  }, [queryClient]);

  useEffect(() => {
    if (!accessToken) return;

    let stopped = false;
    let retryHandle: ReturnType<typeof setTimeout> | null = null;
    let controller: AbortController | null = null;

    const processEvent = (eventName: string, data: string) => {
      if (eventName !== 'updated' && eventName !== 'snapshot') return;

      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'feature-flags'] });
      window.dispatchEvent(
        new CustomEvent('hexatrack:feature-flags-updated', {
          detail: data ? safeParseJson(data) : null,
        }),
      );
    };

    const connect = async () => {
      controller = new AbortController();

      try {
        const headers = new Headers({
          Accept: 'text/event-stream',
          Authorization: `Bearer ${accessToken}`,
        });

        if (activeWorkspaceId) {
          headers.set('X-Workspace-Id', activeWorkspaceId);
        }

        const response = await fetch(`${API_BASE_URL}/api/feature-flags/stream`, {
          headers,
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error('Feature flag stream unavailable.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let eventName = 'message';
        let dataLines: string[] = [];

        const flush = () => {
          if (dataLines.length === 0) return;
          processEvent(eventName, dataLines.join('\n'));
          eventName = 'message';
          dataLines = [];
        };

        while (!stopped) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (line.length === 0) {
              flush();
            } else if (line.startsWith('event:')) {
              eventName = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              dataLines.push(line.slice(5).trimStart());
            }
          }
        }
      } catch {
        if (!stopped) {
          retryHandle = setTimeout(connect, 5000);
        }
      }
    };

    void connect();

    return () => {
      stopped = true;
      controller?.abort();
      if (retryHandle) clearTimeout(retryHandle);
    };
  }, [accessToken, activeWorkspaceId, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

function safeParseJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
