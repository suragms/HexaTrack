import { create } from 'zustand';
import { configureApiClient, hexaTrackApi } from '@/lib/api';
import type {
  AuthMeResponse,
  AuthResponse,
  InviteAcceptRequest,
  LoginRequest,
  RegisterRequest,
  User,
} from '@/lib/types';
import { useWorkspaceStore } from '@/store/workspace-store';

const AUTH_STORAGE_KEY = 'hexatrack.auth.v1';
const LEGACY_AUTH_STORAGE_KEY = 'HexaTrack.auth.v1';

type PersistedAuth = {
  accessToken: string;
  expiresAt: string;
  user: User;
  isSuperAdmin: boolean;
};

type AuthState = {
  accessToken: string | null;
  expiresAt: string | null;
  user: User | null;
  isSuperAdmin: boolean;
  loading: boolean;
  error: string | null;
  hydrated: boolean;
  hydrate: () => void;
  /** Reconcile role flags with server (e.g. after demotion). Updates persisted session when tokens exist. */
  applyMeResponse: (me: AuthMeResponse) => void;
  login: (request: LoginRequest) => Promise<void>;
  register: (request: RegisterRequest) => Promise<void>;
  acceptInvite: (request: InviteAcceptRequest) => Promise<void>;
  logout: () => void;
};

function readPersistedAuth(): PersistedAuth | null {
  if (typeof window === 'undefined') return null;

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PersistedAuth;
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
    return {
      ...parsed,
      isSuperAdmin: parsed.isSuperAdmin ?? false,
    };
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

function persistAuth(auth: PersistedAuth) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
  window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
}

function clearPersistedAuth() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
  }
}

export const useAuthStore = create<AuthState>((set, get) => {
  async function applyAuthResponse(response: AuthResponse) {
    const me = await hexaTrackApi.auth.me(response.accessToken);
    const persisted: PersistedAuth = {
      accessToken: response.accessToken,
      expiresAt: response.expiresAt,
      user: me.user,
      isSuperAdmin: me.isSuperAdmin,
    };
    persistAuth(persisted);
    set({
      accessToken: persisted.accessToken,
      expiresAt: persisted.expiresAt,
      user: persisted.user,
      isSuperAdmin: persisted.isSuperAdmin,
      loading: false,
      error: null,
    });
    // Dynamically retrieve and seed active workspace ID upon successful login
    try {
      await useWorkspaceStore.getState().ensureActiveWorkspace();
    } catch (e) {
      console.warn("Failed to automatically assign active workspace on session start:", e);
    }
  }

  return {
    accessToken: null,
    expiresAt: null,
    user: null,
    isSuperAdmin: false,
    loading: false,
    error: null,
    hydrated: false,
    hydrate: () => {
      const auth = readPersistedAuth();
      set({
        accessToken: auth?.accessToken ?? null,
        expiresAt: auth?.expiresAt ?? null,
        user: auth?.user ?? null,
        isSuperAdmin: auth?.isSuperAdmin ?? false,
        hydrated: true,
      });
    },
    applyMeResponse: (me) => {
      const token = get().accessToken;
      const expiresAt = get().expiresAt;
      if (token && expiresAt) {
        persistAuth({
          accessToken: token,
          expiresAt,
          user: me.user,
          isSuperAdmin: me.isSuperAdmin,
        });
      }
      set({
        user: me.user,
        isSuperAdmin: me.isSuperAdmin,
      });
    },
    login: async (request) => {
      set({ loading: true, error: null });
      try {
        const response = await hexaTrackApi.auth.login(request);
        await applyAuthResponse(response);
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Unable to sign in', loading: false });
      }
    },
    register: async (request) => {
      set({ loading: true, error: null });
      try {
        const response = await hexaTrackApi.auth.register(request);
        await applyAuthResponse(response);
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Unable to create account', loading: false });
      }
    },
    acceptInvite: async (request) => {
      set({ loading: true, error: null });
      try {
        const response = await hexaTrackApi.auth.acceptInvite(request);
        await applyAuthResponse(response);
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Unable to accept invite', loading: false });
      }
    },
    logout: () => {
      clearPersistedAuth();
      useWorkspaceStore.getState().clear();
      set({
        accessToken: null,
        expiresAt: null,
        user: null,
        isSuperAdmin: false,
        error: null,
        loading: false,
      });
    },
  };
});

configureApiClient({
  getAccessToken: () => useAuthStore.getState().accessToken,
  getWorkspaceId: () => {
    const workspaceStore = useWorkspaceStore.getState();
    if (!workspaceStore.hydrated) {
      workspaceStore.hydrate();
    }
    return useWorkspaceStore.getState().activeWorkspaceId;
  },
  onUnauthorized: () => useAuthStore.getState().logout(),
});
