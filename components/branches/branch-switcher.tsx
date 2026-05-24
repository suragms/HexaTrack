'use client';

import { 
  Building2, 
  Check, 
  ChevronDown, 
  Search, 
  MapPin,
  Plus
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { hexaTrackApi } from '@/lib/api';
import { useWorkspaceStore } from '@/store/workspace-store';
import { useFinanceStore } from '@/store/finance-store';
import type { LightBranch } from '@/lib/types';

export function BranchSwitcher() {
  const [open, setOpen] = useState(false);
  const [branches, setBranches] = useState<LightBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const setActiveWorkspaceId = useWorkspaceStore((s) => s.setActiveWorkspaceId);
  const loadFinanceWorkspace = useFinanceStore((s) => s.loadWorkspace);

  useEffect(() => {
     const load = async () => {
        try {
           const res = await hexaTrackApi.owner.listBranches();
           setBranches(res);
           if (res.length > 0 && !activeWorkspaceId && res[0].workspaceId) {
              setActiveWorkspaceId(res[0].workspaceId);
              void loadFinanceWorkspace();
           }
        } catch (e) {
           console.error(e);
        } finally {
           setLoading(false);
        }
     };
     void load();
  }, [activeWorkspaceId, setActiveWorkspaceId, loadFinanceWorkspace]);

  const activeBranch = branches.find(b => b.workspaceId === activeWorkspaceId) || branches[0];

  const handleSwitch = async (branch: any) => {
     if (!branch.workspaceId) return;
     setActiveWorkspaceId(branch.workspaceId);
     setOpen(false);
     await loadFinanceWorkspace();
  };

  const filtered = branches.filter(b => 
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading && branches.length === 0) {
     return (
        <div className="h-11 px-4 bg-white border border-gray-200 rounded-[18px] flex items-center gap-3 animate-pulse w-[160px] shadow-sm">
           <div className="w-4 h-4 bg-gray-100 rounded-lg" />
           <div className="w-16 h-2.5 bg-gray-100 rounded-md" />
        </div>
     );
  }

  if (branches.length === 0) return null;

  return (
    <div className="relative font-sans select-none">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 rounded-[18px] border border-gray-200 bg-white px-3.5 py-2 transition hover:bg-gray-50/50 hover:border-gray-300 active:scale-[0.98] shadow-sm w-full sm:w-auto group outline-none select-none"
      >
        <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-[#10B981] border border-emerald-100 shrink-0 group-hover:scale-105 transition-transform">
          <Building2 size={15} />
        </div>
        <div className="min-w-0 flex-1 text-left hidden sm:block pr-1.5">
          <p className="text-[9px] font-black text-[#10B981] uppercase tracking-[0.18em] font-label-caps leading-none mb-0.5">Active Node</p>
          <p className="truncate text-[13px] font-semibold text-[#111827] tracking-wide">{activeBranch?.name || 'Select Unit'}</p>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-300 shrink-0 ${open ? 'rotate-180 text-[#10B981]' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ type: "spring", damping: 22, stiffness: 280 }}
              className="absolute left-0 top-full mt-3 z-50 w-[310px] bg-white border border-gray-200 rounded-[24px] shadow-2xl overflow-hidden shadow-black/10"
            >
              <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                 <div className="text-[9px] font-black text-gray-400 uppercase tracking-[0.22em] mb-3 font-label-caps">Cluster Registry</div>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 h-3.5 w-3.5" />
                  <input 
                    type="text"
                    autoFocus
                    placeholder="Locate operational node..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-[14px] py-2 pl-9 pr-4 text-xs font-semibold text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#10B981]/30 transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="max-h-[260px] overflow-y-auto p-2 space-y-1 custom-scrollbar bg-white">
                {filtered.map(branch => {
                  const isActive = branch.workspaceId === activeWorkspaceId;
                  return (
                    <button
                      key={branch.id}
                      disabled={!branch.workspaceId}
                      onClick={() => handleSwitch(branch)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-[16px] transition-all text-left group relative ${
                        isActive ? 'bg-[#10B981]/10 font-bold' : 'hover:bg-gray-50'
                      } ${!branch.workspaceId ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-all border ${
                        isActive ? 'bg-[#10B981]/10 border-transparent text-[#10B981]' : 'bg-gray-50 border-gray-100 text-gray-500 group-hover:text-gray-900'
                      }`}>
                         <MapPin size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                         <p className={`text-[13px] font-bold truncate tracking-wide ${isActive ? 'text-[#10B981]' : 'text-gray-800'}`}>
                           {branch.name}
                         </p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1.5 font-label-caps">
                           {branch.code || 'UNIT'} • {branch.currency || 'USD'}
                        </p>
                      </div>
                      {isActive && <Check size={16} className="text-[#10B981] shrink-0 mr-1" />}
                    </button>
                  );
                })}

                {filtered.length === 0 && (
                  <div className="py-10 text-center text-[10px] text-gray-400 font-bold uppercase tracking-[0.15em] flex flex-col items-center gap-2.5 font-label-caps">
                     <div className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-[#10B981] opacity-60"><Search size={15} /></div>
                     Signal Lost
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-gray-100 bg-gray-50/50">
                <button className="w-full flex items-center justify-center gap-2 h-9 rounded-[14px] border border-dashed border-[#10B981]/30 text-[9px] font-bold font-label-caps text-[#10B981] uppercase tracking-[0.18em] hover:bg-[#10B981]/5 active:scale-98 transition-all outline-none">
                   <Plus size={13} /> Provision Subnode
                </button>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
