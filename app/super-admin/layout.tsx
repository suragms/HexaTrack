'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import {
  LayoutDashboard, Building2, GitBranch, Users, UserCog, CreditCard,
  Layers, Settings, ShieldCheck, BarChart3, Lock, Cpu, ChevronLeft,
  ChevronRight, LogOut, Menu, X, BellRing
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/super-admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/super-admin/workspaces', label: 'Workspaces', icon: Layers },
  { href: '/super-admin/organizations', label: 'Organizations', icon: Building2 },
  { href: '/super-admin/branches', label: 'Branches', icon: GitBranch },
  { href: '/super-admin/users', label: 'Users', icon: Users },
  { href: '/super-admin/staff', label: 'Staff', icon: UserCog },
  { href: '/super-admin/plans', label: 'Plans', icon: CreditCard },
  { href: '/super-admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { href: '/super-admin/permissions', label: 'Permissions', icon: ShieldCheck },
  { href: '/super-admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/super-admin/alerts', label: 'Alerts', icon: BellRing },
  { href: '/super-admin/security', label: 'Security', icon: Lock },
  { href: '/super-admin/settings', label: 'Settings', icon: Settings },
  { href: '/super-admin/system-config', label: 'System Config', icon: Cpu },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isSuperAdmin, hydrated, hydrate, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { if (!hydrated) hydrate(); }, [hydrated, hydrate]);

  useEffect(() => {
    if (hydrated && (!user || !isSuperAdmin)) {
      router.replace('/');
    }
  }, [hydrated, user, isSuperAdmin, router]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  if (!hydrated || !user || !isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#050816]">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isActive = (href: string) => {
    if (href === '/super-admin') return pathname === '/super-admin';
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-screen bg-[#050816] overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative z-50 h-full flex flex-col
          bg-[#0A0E1A] border-r border-white/[0.06]
          transition-all duration-300 ease-out
          ${collapsed ? 'lg:w-[72px]' : 'lg:w-[260px]'}
          ${mobileOpen ? 'w-[280px] translate-x-0' : 'w-[280px] -translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-white/[0.06] shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
            H
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate">HexaTrack</p>
              <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Super Admin</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto hidden lg:flex w-7 h-7 items-center justify-center rounded-md hover:bg-white/[0.06] text-gray-400"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto lg:hidden w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/[0.06] text-gray-400"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 hide-scrollbar">
          <div className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium
                    transition-all duration-200 group
                    ${active
                      ? 'bg-emerald-500/10 text-emerald-400 shadow-[0_0_20px_-5px_rgba(16,185,129,0.15)]'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
                    }
                  `}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={18} className={`shrink-0 ${active ? 'text-emerald-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {active && !collapsed && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-white/[0.06] shrink-0">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/[0.06] transition-all duration-200"
            title={collapsed ? 'Sign Out' : undefined}
          >
            <LogOut size={18} className="shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 flex items-center gap-4 px-4 lg:px-8 border-b border-white/[0.06] bg-[#0A0E1A]/50 backdrop-blur-xl shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg bg-white/[0.04] text-gray-400"
          >
            <Menu size={18} />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-white">{user.displayName}</p>
              <p className="text-[10px] text-gray-500">{user.email}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-xs font-bold">
              {user.displayName?.charAt(0)?.toUpperCase() ?? 'A'}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
