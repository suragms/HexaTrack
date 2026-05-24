'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';

interface SmartBackButtonProps {
  fallbackHref: string;
  label?: string;
  className?: string;
}

export function SmartBackButton({ fallbackHref, label, className = '' }: SmartBackButtonProps) {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    // Simple heuristic to see if there is history beyond direct entry
    if (typeof window !== 'undefined' && window.history.length > 1) {
      setCanGoBack(true);
    }
  }, []);

  const handleBack = () => {
    if (canGoBack) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  return (
    <button
      onClick={handleBack}
      type="button"
      className={`group flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.06] bg-white/[0.02] text-[#8B9BB4] hover:text-white hover:bg-white/[0.06] hover:border-white/[0.1] backdrop-blur-sm transition-all duration-200 active:scale-95 ${className}`}
      aria-label="Go Back"
    >
      <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
      {label && <span className="text-sm font-bold tracking-tight">{label}</span>}
    </button>
  );
}

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface AdminBreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function AdminBreadcrumbs({ items, className = '' }: AdminBreadcrumbsProps) {
  return (
    <nav className={`flex items-center flex-wrap gap-2 text-xs font-medium ${className}`} aria-label="Breadcrumb">
      <Link 
        href="/admin" 
        className="text-[#8B9BB4] hover:text-[#4F8CFF] transition-colors flex items-center gap-1"
      >
        <Home size={14} />
      </Link>
      
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <React.Fragment key={item.href}>
            <ChevronRight size={12} className="text-white/20 shrink-0" />
            {isLast ? (
              <span className="text-white font-bold truncate max-w-[200px]">
                {item.label}
              </span>
            ) : (
              <Link 
                href={item.href} 
                className="text-[#8B9BB4] hover:text-[#4F8CFF] transition-colors truncate max-w-[150px]"
              >
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

interface OrganizationNavigationHeaderProps {
  title: string;
  subtext?: string;
  fallbackHref: string;
  breadcrumbs: BreadcrumbItem[];
  actions?: React.ReactNode;
  iconLetter?: string;
}

export function OrganizationNavigationHeader({
  title,
  subtext = 'Operational Matrix',
  fallbackHref,
  breadcrumbs,
  actions,
  iconLetter
}: OrganizationNavigationHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-[#0B1015]/80 backdrop-blur-md border-b border-white/[0.04] px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 safe-area-top">
      <div className="flex items-center gap-3 sm:gap-4">
        <SmartBackButton fallbackHref={fallbackHref} className="shrink-0" />
        
        <div className="flex flex-col gap-0.5 min-w-0">
          <AdminBreadcrumbs items={breadcrumbs} className="mb-0.5" />
          <div className="flex items-center gap-2.5">
            {iconLetter && (
              <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-600 to-primary flex items-center justify-center font-bold text-white text-[10px] shadow-lg shrink-0">
                {iconLetter}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-black text-white text-sm sm:text-base leading-tight truncate">{title}</h1>
              {subtext && (
                <div className="text-[9px] text-[#8B9BB4] uppercase tracking-wider font-black flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-emerald-500"></span> {subtext}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          {actions}
        </div>
      )}
    </header>
  );
}

