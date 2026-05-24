'use client';

import { ChevronDown, Layers, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { CreateWorkspaceModal } from '@/components/workspace/create-workspace-modal';
import { useFinanceStore } from '@/store/finance-store';
import { useWorkspaceStore } from '@/store/workspace-store';
import type { Workspace } from '@/lib/types';

export function WorkspaceSwitcher() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const setActiveWorkspaceId = useWorkspaceStore((s) => s.setActiveWorkspaceId);
  const refreshWorkspaces = useWorkspaceStore((s) => s.refreshWorkspaces);

  const loadWorkspace = useFinanceStore((s) => s.loadWorkspace);

  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const active = workspaces.find((w) => w.id === activeWorkspaceId);

  useEffect(() => {
    if (!menuOpen) return;
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const el = wrapRef.current;
      if (!el || el.contains(event.target as Node)) return;
      setMenuOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    void refreshWorkspaces();
  }, [menuOpen, refreshWorkspaces]);

  function handleSelect(id: string) {
    if (id === activeWorkspaceId) {
      setMenuOpen(false);
      return;
    }
    setActiveWorkspaceId(id);
    setMenuOpen(false);
    void loadWorkspace();
  }

  async function handleCreated(created: Workspace) {
    setActiveWorkspaceId(created.id);
    await refreshWorkspaces();
    await loadWorkspace();
  }

  return (
    <>
      <div className="relative" ref={wrapRef}>
        <button
          aria-expanded={menuOpen}
          aria-haspopup="listbox"
          className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-[18px] border border-gray-200 bg-white px-3 py-2.5 text-left text-sm font-semibold text-[#111827] shadow-sm transition hover:bg-gray-50/50 hover:border-gray-300 focus:outline-none"
          onClick={() => setMenuOpen((open) => !open)}
          type="button"
        >
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <Layers aria-hidden className="h-[18px] w-[18px] shrink-0 text-[#10B981]" />
            <span className="truncate">{active?.name ?? 'Workspace'}</span>
          </span>
          <ChevronDown aria-hidden className={`h-[18px] w-[18px] shrink-0 text-gray-400 transition ${menuOpen ? 'rotate-180' : ''}`} />
        </button>

        {menuOpen ? (
          <div
            className="absolute left-0 right-0 top-[calc(100%+8px)] z-[45] max-h-[min(320px,70vh)] overflow-auto rounded-2xl border border-gray-200 bg-white py-2 shadow-[0_12px_30px_rgba(0,0,0,0.08)]"
            role="listbox"
          >
            {workspaces.map((w) => (
              <button
                className={`flex w-full min-h-[44px] items-center px-4 py-3 text-left text-sm transition-colors ${
                  w.id === activeWorkspaceId ? 'bg-[#10B981]/10 font-bold text-[#10B981]' : 'text-[#374151] hover:bg-gray-50'
                }`}
                key={w.id}
                onClick={() => handleSelect(w.id)}
                role="option"
                aria-selected={w.id === activeWorkspaceId}
                type="button"
              >
                <span className="truncate">{w.name}</span>
                {w.isDefault ? <span className="ml-2 shrink-0 text-xs text-gray-400">Default</span> : null}
              </button>
            ))}
            <div className="my-2 border-t border-gray-100" />
            <button
              className="flex w-full min-h-[44px] items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-[#10B981] transition-colors hover:bg-emerald-50/50"
              onClick={() => {
                setMenuOpen(false);
                setCreateOpen(true);
              }}
              type="button"
            >
              <Plus className="h-[18px] w-[18px]" aria-hidden />
              Create Workspace
            </button>
          </div>
        ) : null}
      </div>

      <CreateWorkspaceModal open={createOpen} onCreated={handleCreated} onOpenChange={setCreateOpen} />
    </>
  );
}
