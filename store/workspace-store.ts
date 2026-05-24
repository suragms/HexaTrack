import { create } from 'zustand';
import { hexaTrackApi } from '@/lib/api';
import type { Workspace } from '@/lib/types';

const WORKSPACE_STORAGE_KEY = 'hexatrack.active-workspace.v1';

type WorkspaceState = {
  activeWorkspaceId: string | null;
  workspaces: Workspace[];
  hydrated: boolean;
  hydrate: () => void;
  clear: () => void;
  ensureActiveWorkspace: () => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
  setActiveWorkspaceId: (id: string) => void;
};

function readStoredWorkspaceId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  activeWorkspaceId: null,
  workspaces: [],
  hydrated: false,
  hydrate: () => {
    set({ activeWorkspaceId: readStoredWorkspaceId(), hydrated: true });
  },
  clear: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    }
    set({ activeWorkspaceId: null, workspaces: [] });
  },
  ensureActiveWorkspace: async () => {
    const list = await hexaTrackApi.workspaces.list();
    const persisted = get().activeWorkspaceId;
    const match = persisted ? list.find((w) => w.id === persisted) : undefined;
    const picked = match ?? list.find((w) => w.isDefault) ?? list[0];
    if (!picked) {
      set({ workspaces: list, activeWorkspaceId: null });
      throw new Error('No workspaces available.');
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(WORKSPACE_STORAGE_KEY, picked.id);
    }
    set({ workspaces: list, activeWorkspaceId: picked.id });
  },
  refreshWorkspaces: async () => {
    const list = await hexaTrackApi.workspaces.list();
    set((state) => {
      let nextActive = state.activeWorkspaceId;
      if (!nextActive || !list.some((w) => w.id === nextActive)) {
        nextActive = list.find((w) => w.isDefault)?.id ?? list[0]?.id ?? null;
      }
      if (nextActive && typeof window !== 'undefined') {
        window.localStorage.setItem(WORKSPACE_STORAGE_KEY, nextActive);
      }
      return { workspaces: list, activeWorkspaceId: nextActive };
    });
  },
  setActiveWorkspaceId: (id: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(WORKSPACE_STORAGE_KEY, id);
    }
    set({ activeWorkspaceId: id });
  },
}));
